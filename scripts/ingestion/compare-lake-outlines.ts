/**
 * AnglerIQ — Compare lake outlines: OSM (current) vs NHD (candidate)
 *
 * The map draws waterbody outlines from OSM via Nominatim, but OSM coverage of
 * US reservoirs is uneven — Lake Eufaula's polygon covers 246 km² of a 415 km²
 * lake, which is why its shoreline renders incomplete. NHD is the USGS
 * hydrography dataset we already query for flowlines, and its waterbody layer
 * is authoritative for US waters.
 *
 * This measures both sources side by side so the swap can be judged on real
 * numbers before anything changes. Read-only.
 *
 * Usage:
 *   npx tsx scripts/ingestion/compare-lake-outlines.ts
 *   npx tsx scripts/ingestion/compare-lake-outlines.ts --lake "Lake Eufaula"
 *   npx tsx scripts/ingestion/compare-lake-outlines.ts --all   # whole catalog
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { getLakeFeatures } from '../../src/lib/lake-conditions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Sample chosen to span the shapes that behave differently: sprawling
// reservoirs, dendritic lakes, a small municipal lake and a river-like one.
const SAMPLE = [
  'Lake Eufaula', 'Toledo Bend Reservoir', 'Sam Rayburn Reservoir', 'Lake Fork',
  'Table Rock Lake', 'Lake Minnetonka', 'Grand Lake o\' the Cherokees', 'Lake Crook',
]

type Ring = number[][]

function ringsOf(g: any): Ring[] {
  const out: Ring[] = []
  if (!g) return out
  if (g.type === 'Polygon') out.push(g.coordinates[0])
  if (g.type === 'MultiPolygon') for (const p of g.coordinates) out.push(p[0])
  return out
}

// Shoelace on an equirectangular projection about the ring's mean latitude —
// accurate enough at lake scale to compare two sources.
function areaKm2(ring: Ring): number {
  if (ring.length < 3) return 0
  // Looped rather than Math.min(...lats): these rings reach 100k vertices and
  // the spread overflows the call stack.
  let loLat = Infinity, hiLat = -Infinity
  for (const c of ring) { if (c[1] < loLat) loLat = c[1]; if (c[1] > hiLat) hiLat = c[1] }
  const lat0 = ((loLat + hiLat) / 2) * Math.PI / 180
  const kx = 111.320 * Math.cos(lat0), ky = 110.574
  let a = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[j][1] * ky)
  }
  return Math.abs(a / 2)
}

function extent(rings: Ring[]) {
  let mn = [9e9, 9e9], mx = [-9e9, -9e9], n = 0
  for (const r of rings) for (const c of r) {
    mn[0] = Math.min(mn[0], c[0]); mn[1] = Math.min(mn[1], c[1])
    mx[0] = Math.max(mx[0], c[0]); mx[1] = Math.max(mx[1], c[1]); n++
  }
  return { mn, mx, verts: n }
}

function pointInRings(lng: number, lat: number, rings: Ring[]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

const norm = (s: string) => s.toLowerCase().replace(/^lake\s+/, '').replace(/\s+(lake|reservoir)$/, '').trim()

/**
 * NHD waterbodies for a lake. Prefers polygons whose GNIS_NAME matches the lake,
 * and otherwise falls back to whichever polygon actually contains the stored
 * point — reservoirs are frequently unnamed in NHD even when mapped precisely.
 */
export async function nhdWaterbody(name: string, lat: number, lng: number, padDeg = 0.45) {
  const bbox = `${lng - padDeg},${lat - padDeg},${lng + padDeg},${lat + padDeg}`
  const run = async (where: string) => {
    const url = `https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/12/query`
      + `?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
      + `&where=${encodeURIComponent(where)}`
      + `&outFields=GNIS_NAME,AREASQKM,FTYPE&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=2000`
    const r = await fetch(url, { signal: AbortSignal.timeout(60000) })
    if (!r.ok) throw new Error(`NHD HTTP ${r.status}`)
    const fc = await r.json() as any
    if (fc?.error) throw new Error(fc.error?.message ?? 'NHD error')
    return (fc?.features ?? []) as any[]
  }

  // Query by name rather than pulling the bbox and filtering here: a lake-sized
  // box contains thousands of farm ponds (FTYPE 390, ~0.001 km²) and the 2000
  // row cap means the lake itself never comes back. NHD also names lakes in its
  // own order — "Eufaula Lake", not "Lake Eufaula" — so match on the core word.
  const core = norm(name).replace(/'/g, "''")
  // NHD's LIKE is case-sensitive, so compare in upper case.
  let feats = core ? await run(`UPPER(GNIS_NAME) LIKE '%${core.toUpperCase()}%'`) : []
  let named = feats.filter(f => {
    const n = f.properties?.GNIS_NAME
    return n && norm(String(n)) === norm(name)
  })
  if (named.length) return named

  // Unnamed in NHD (common for reservoirs): take real waterbodies only, then
  // the polygon under the stored point plus any large neighbour touching its
  // extent — reservoir arms are often separate features.
  feats = await run('AREASQKM > 0.4')
  const containing = feats.filter(f => pointInRings(lng, lat, ringsOf(f.geometry)))
  if (!containing.length) return []
  const ext = extent(containing.flatMap(f => ringsOf(f.geometry)))
  const touching = feats.filter(f => {
    if (containing.includes(f)) return false
    if (Number(f.properties?.AREASQKM ?? 0) < 1) return false
    const e = extent(ringsOf(f.geometry))
    return e.mn[0] <= ext.mx[0] && e.mx[0] >= ext.mn[0] && e.mn[1] <= ext.mx[1] && e.mx[1] >= ext.mn[1]
  })
  return [...containing, ...touching]
}

type Result = {
  name: string; state: string; osmKm2: number; nhdKm2: number
  ratio: number | null; verdict: string; osmVerts: number; nhdVerts: number
}
const results: Result[] = []

async function compare(lakeName: string, quiet = false) {
  const { data: l } = await supabase
    .from('body_of_water').select('id,name,state,lat,lng')
    .eq('name', lakeName).limit(1).maybeSingle()
  if (!l) { if (!quiet) console.log(`  ? ${lakeName} — not in catalog`); return }

  let osmRings: Ring[] = []
  try {
    const feat = await getLakeFeatures(l.lat, l.lng, l.name, l.state)
    for (const f of (feat?.waterbodies?.features ?? [])) osmRings.push(...ringsOf(f.geometry))
  } catch { /* leave empty */ }

  let nhdRings: Ring[] = []
  let nhdArea = 0
  try {
    const feats = await nhdWaterbody(l.name, l.lat, l.lng)
    for (const f of feats) {
      nhdRings.push(...ringsOf(f.geometry))
      nhdArea += Number(f.properties?.AREASQKM ?? 0)
    }
  } catch (e: any) { if (!quiet) console.log(`     NHD error: ${e.message?.slice(0, 60)}`) }

  const o = extent(osmRings), n = extent(nhdRings)
  const oArea = osmRings.reduce((s, r) => s + areaKm2(r), 0)
  const nArea = nhdRings.reduce((s, r) => s + areaKm2(r), 0)
  const oSpanLat = osmRings.length ? (o.mx[1] - o.mn[1]) : 0
  const nSpanLat = nhdRings.length ? (n.mx[1] - n.mn[1]) : 0
  const ratio = oArea > 0 ? (nArea / oArea) : Infinity

  const verdict = !osmRings.length && nhdRings.length ? 'osm-missing'
    : !nhdRings.length ? 'nhd-unavailable'
    : ratio > 1.15 ? 'osm-short'
    : ratio < 0.85 ? 'osm-larger'
    : 'comparable'
  results.push({
    name: l.name, state: l.state, osmKm2: +oArea.toFixed(1), nhdKm2: +nArea.toFixed(1),
    ratio: oArea > 0 ? +ratio.toFixed(2) : null, verdict,
    osmVerts: o.verts, nhdVerts: n.verts,
  })
  if (quiet) { process.stdout.write(`\r  ${results.length} checked`); return }

  console.log(`\n  ${l.name} (${l.state})`)
  console.log(`     OSM  ${String(osmRings.length).padStart(3)} rings  ${String(Math.round(oArea)).padStart(5)} km²  lat-span ${oSpanLat.toFixed(3)}  ${o.verts} verts`)
  console.log(`     NHD  ${String(nhdRings.length).padStart(3)} rings  ${String(Math.round(nArea)).padStart(5)} km²  lat-span ${nSpanLat.toFixed(3)}  ${n.verts} verts` +
              (nhdArea ? `   (NHD reports ${Math.round(nhdArea)} km²)` : ''))
  console.log(`     → ${verdict}${verdict === 'osm-short' ? ` (NHD ${((ratio - 1) * 100).toFixed(0)}% larger)` : ''}`)
}

async function main() {
  const args = process.argv.slice(2)
  const one = args.includes('--lake') ? args[args.indexOf('--lake') + 1] : null
  const all = args.includes('--all')

  let names = SAMPLE
  if (one) names = [one]
  else if (all) {
    const { data } = await supabase.from('body_of_water').select('name').order('name')
    names = (data ?? []).map((r: any) => r.name)
  }

  console.log(`\n🗺️  Outline comparison — OSM (current) vs NHD (candidate)`)
  console.log(`   ${names.length} lake(s)`)
  for (const n of names) {
    try { await compare(n, all) } catch (e: any) {
      if (!all) console.log(`  ! ${n}: ${e.message?.slice(0, 60)}`)
    }
    await new Promise(r => setTimeout(r, 1200))  // polite to Nominatim
  }

  if (all) {
    const byVerdict: Record<string, Result[]> = {}
    for (const r of results) (byVerdict[r.verdict] ??= []).push(r)
    console.log(`\n\n${'─'.repeat(60)}\nSUMMARY — ${results.length} lakes`)
    for (const [v, rs] of Object.entries(byVerdict).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(rs.length).padStart(4)}  ${v}`)
    }
    const swap = [...(byVerdict['osm-short'] ?? []), ...(byVerdict['osm-missing'] ?? [])]
      .sort((a, b) => (b.ratio ?? 99) - (a.ratio ?? 99))
    console.log(`\nCANDIDATES FOR NHD (${swap.length}) — OSM outline short or absent:`)
    swap.slice(0, 40).forEach(r => console.log(
      `  ${r.ratio ? `${r.ratio}x`.padStart(6) : '  new '}  ${String(Math.round(r.osmKm2)).padStart(4)} → ${String(Math.round(r.nhdKm2)).padStart(4)} km²   ${r.name} (${r.state})`))
    if (swap.length > 40) console.log(`  … and ${swap.length - 40} more`)
    require('fs').writeFileSync('outline-audit.json', JSON.stringify(results, null, 2))
    console.log(`\nFull results → outline-audit.json`)
  }
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
