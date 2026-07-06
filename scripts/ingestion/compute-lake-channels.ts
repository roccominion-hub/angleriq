/**
 * AnglerIQ — Precompute lake channel geometry
 *
 * Channels (the submerged river/creek beds through a lake) and their inlets are
 * effectively static, so we compute them once from NHD and store the finished
 * geometry in lake_channels. The map then reads one fast row instead of paging
 * the NHD API live on every load.
 *
 * For each lake:
 *   1. bbox from the OSM waterbody (via getLakeFeatures)
 *   2. page all named ftype-460 rivers + ftype-558 artificial paths from NHD
 *   3. pick the lake = the 558 network component that contains the lake center
 *      (so we don't grab the river below the dam)
 *   4. main channel = that component's longest path (graph diameter)
 *   5. minor channels = the rest of that component; inlets = rivers touching it
 *
 * Usage:
 *   npx tsx scripts/ingestion/compute-lake-channels.ts               # all lakes
 *   npx tsx scripts/ingestion/compute-lake-channels.ts --missing     # only uncomputed
 *   npx tsx scripts/ingestion/compute-lake-channels.ts --lake "Lake Granbury"
 *   npx tsx scripts/ingestion/compute-lake-channels.ts --state TX --dry-run
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { getLakeFeatures } from '../../src/lib/lake-conditions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── topology (mirrors LakeMap, refined lake selection) ───────────────────────
type Flow = { coords: number[][]; ftype: number; flowdir: number; name: string | null; wb: string | null; size: number }
type Junction = { lng: number; lat: number; kind: 'inflow' | 'outflow'; size: number; name: string }

const nk = (p: number[]) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`
const ends = (f: Flow): [string, string] => [nk(f.coords[0]), nk(f.coords[f.coords.length - 1])]
const segLen = (f: Flow) => { let w = 0; for (let j = 0; j < f.coords.length - 1; j++) w += Math.hypot(f.coords[j + 1][0] - f.coords[j][0], f.coords[j + 1][1] - f.coords[j][1]); return w }

async function fetchFlowlines(bbox: string): Promise<Flow[]> {
  const where = encodeURIComponent("(ftype=460 AND gnis_name IS NOT NULL) OR ftype=558")
  const base = `https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query`
    + `?geometry=${bbox}&geometryType=esriGeometryEnvelope&inSR=4326`
    + `&spatialRel=esriSpatialRelIntersects&where=${where}&outFields=ftype,flowdir,lengthkm,gnis_name,wbarea_permanent_identifier`
    + `&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=2000`
  const feats: any[] = []
  for (let offset = 0; offset < 30000; offset += 2000) {
    const r = await fetch(`${base}&resultOffset=${offset}`, { signal: AbortSignal.timeout(60000) })
    const fc = await r.json() as any
    const page = (fc?.features ?? []).filter((f: any) => f.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates))
    feats.push(...page)
    if (!fc?.exceededTransferLimit || page.length === 0) break
  }
  const lenByName: Record<string, number> = {}
  for (const f of feats) { const n = f.properties?.gnis_name; if (n) lenByName[n] = (lenByName[n] ?? 0) + (f.properties?.lengthkm ?? 0) }
  return feats.map((f: any) => {
    const name = f.properties?.gnis_name ?? null
    return {
      coords: f.geometry.coordinates as number[][],
      ftype: f.properties?.ftype, flowdir: f.properties?.flowdir, name,
      wb: f.properties?.wbarea_permanent_identifier ?? null,
      size: name ? (lenByName[name] ?? 0) : (f.properties?.lengthkm ?? 0),
    }
  })
}

function pointInRings(lng: number, lat: number, rings: number[][][]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j]
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function buildNetwork(flows: Flow[], rings: number[][][], cLng: number, cLat: number) {
  const empty = { mainChannel: [] as number[][][], minorChannels: [] as number[][][], junctions: [] as Junction[] }
  const paths = flows.filter(f => f.ftype === 558)
  const streams = flows.filter(f => f.ftype === 460)
  if (!paths.length) return empty

  // The lake network = 558 paths that lie inside the lake's OSM outline. Using
  // the polygon (not the center) is robust to off-center stored coordinates and
  // excludes the river above/below the dam, which sits outside the outline.
  const nearCenter = (f: Flow) => f.coords.some(c => Math.hypot(c[0] - cLng, c[1] - cLat) < 0.06)
  const inLake = (f: Flow) => rings.length ? f.coords.some(c => pointInRings(c[0], c[1], rings)) : nearCenter(f)
  const river = paths.filter(inLake)
  if (!river.length) return empty

  // Adjacency over the lake's 558 network.
  const adj = new Map<string, { to: string; idx: number; w: number }[]>()
  river.forEach((f, idx) => {
    const [a, b] = ends(f); const w = segLen(f)
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ to: b, idx, w }); adj.get(b)!.push({ to: a, idx, w })
  })

  // The lake body = the largest connected component of that in-lake network.
  const compId = new Map<string, number>()
  const compW = new Map<number, number>()
  let cid = 0
  for (const start of adj.keys()) {
    if (compId.has(start)) continue
    const id = cid++; const st = [start]; let w = 0
    while (st.length) {
      const u = st.pop()!; if (compId.has(u)) continue; compId.set(u, id)
      for (const e of adj.get(u) ?? []) { w += e.w; if (!compId.has(e.to)) st.push(e.to) }
    }
    compW.set(id, w)
  }
  let lakeComp = -1, lakeW = -1
  for (const [id, w] of compW) if (w > lakeW) { lakeW = w; lakeComp = id }
  if (lakeComp < 0) return empty
  const comp = new Set<string>([...compId.entries()].filter(([, id]) => id === lakeComp).map(([n]) => n))
  const inComp = (i: number) => { const [a, b] = ends(river[i]); return comp.has(a) || comp.has(b) }

  // Diameter of that component = main channel (double BFS, restricted to comp).
  const bfs = (src: string) => {
    const dist = new Map<string, number>([[src, 0]])
    const prev = new Map<string, [string, number]>()
    const q = [src]; let qi = 0
    while (qi < q.length) {
      const u = q[qi++]
      for (const e of adj.get(u) ?? []) if (comp.has(e.to) && !dist.has(e.to)) { dist.set(e.to, (dist.get(u) ?? 0) + e.w); prev.set(e.to, [u, e.idx]); q.push(e.to) }
    }
    let far = src, fd = -1
    for (const [n, d] of dist) if (d > fd) { fd = d; far = n }
    return { far, prev }
  }
  const mainSegs = new Set<number>()
  if (comp.size) {
    const { far: u } = bfs([...comp][0])
    const { far: v, prev } = bfs(u)
    let node = v
    while (prev.has(node)) { const [p, idx] = prev.get(node)!; mainSegs.add(idx); node = p }
  }

  const mainChannel = river.filter((_, i) => mainSegs.has(i)).map(f => f.coords)
  const minorChannels = river.filter((_, i) => inComp(i) && !mainSegs.has(i)).map(f => f.coords)

  // Inlets/outflow: named rivers (460) or impounded rivers (558, other wbarea)
  // touching the lake component at exactly one end. One per name (largest).
  const mouthByName = new Map<string, Junction>()
  for (const f of [...streams, ...paths.filter(p => !inLake(p))]) {
    if (!f.name) continue
    const [a, b] = ends(f)
    const aIn = comp.has(a), bIn = comp.has(b)
    if (aIn === bIn) continue
    const p = bIn ? f.coords[f.coords.length - 1] : f.coords[0]
    const j: Junction = { lng: p[0], lat: p[1], kind: bIn ? 'inflow' : 'outflow', size: f.size, name: f.name }
    const prev = mouthByName.get(f.name)
    if (!prev || j.size > prev.size) mouthByName.set(f.name, j)
  }
  return { mainChannel, minorChannels, junctions: [...mouthByName.values()] }
}

// ── main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const onlyMissing = args.includes('--missing')
const stateFilter = args.includes('--state') ? args[args.indexOf('--state') + 1] : null
const lakeFilter = args.includes('--lake') ? args[args.indexOf('--lake') + 1] : null

async function main() {
  console.log(`\n🗺️  Compute lake channels — ${dryRun ? 'DRY RUN' : 'LIVE'}${onlyMissing ? ' (missing only)' : ''}`)

  let q = supabase.from('body_of_water').select('id, name, state, lat, lng').not('lat', 'is', null).order('name')
  if (stateFilter) q = q.or(`state.eq.${stateFilter},state.ilike.${stateFilter}/%,state.ilike.%/${stateFilter}`)
  if (lakeFilter) q = q.ilike('name', lakeFilter)
  const { data: lakes, error } = await q
  if (error || !lakes?.length) { console.error('No lakes', error); return }

  let done: Set<string> = new Set()
  if (onlyMissing) {
    const { data } = await supabase.from('lake_channels').select('lake_id')
    done = new Set((data ?? []).map((r: any) => r.lake_id))
  }
  const todo = lakes.filter(l => !onlyMissing || !done.has(l.id))
  console.log(`   ${todo.length} lakes to process\n`)

  let ok = 0, empty = 0, failed = 0
  for (const lake of todo) {
    try {
      const feat = await getLakeFeatures(lake.lat, lake.lng, lake.name, lake.state)
      const wb = feat?.waterwayBbox
      const rings: number[][][] = []
      for (const f of (feat?.waterbodies?.features ?? [])) {
        const g = f.geometry
        if (g?.type === 'Polygon') rings.push(g.coordinates[0])
        if (g?.type === 'MultiPolygon') for (const poly of g.coordinates) rings.push(poly[0])
      }

      // Query bbox must cover the whole waterbody. The stored waterwayBbox can be
      // undersized (e.g. Toledo Bend's clipped its southern half), which starves
      // the NHD query of the lake's far reaches — so union it with the polygon
      // extent and pad slightly. Fall back to a box around the center if neither.
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
      if (wb) { minLng = wb.minLng; minLat = wb.minLat; maxLng = wb.maxLng; maxLat = wb.maxLat }
      for (const r of rings) for (const c of r) {
        minLng = Math.min(minLng, c[0]); minLat = Math.min(minLat, c[1])
        maxLng = Math.max(maxLng, c[0]); maxLat = Math.max(maxLat, c[1])
      }
      if (!isFinite(minLng)) { console.log(`  ⚠️  ${lake.name} — no bbox`); empty++; continue }
      const pad = 0.02
      const bbox = `${minLng - pad},${minLat - pad},${maxLng + pad},${maxLat + pad}`
      const flows = await fetchFlowlines(bbox)
      const net = buildNetwork(flows, rings, lake.lng, lake.lat)
      if (!net.mainChannel.length && !net.minorChannels.length) {
        console.log(`  ⚠️  ${lake.name} (${lake.state}) — no channel network found`)
        empty++; continue
      }
      const inlets = net.junctions.filter(j => j.kind === 'inflow').length
      console.log(`  ✓  ${lake.name} (${lake.state}) — main ${net.mainChannel.length} segs, ${net.minorChannels.length} minor, ${inlets} inlets`)
      if (!dryRun) {
        await supabase.from('lake_channels').upsert({
          lake_id: lake.id,
          main_channel: net.mainChannel,
          minor_channels: net.minorChannels,
          junctions: net.junctions,
          computed_at: new Date().toISOString(),
        })
      }
      ok++
    } catch (e: any) {
      console.warn(`  ❌ ${lake.name}: ${e.message?.slice(0, 80)}`)
      failed++
    }
    await new Promise(r => setTimeout(r, 400))  // be polite to NHD + Nominatim
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ ${ok} computed, ${empty} empty, ${failed} failed`)
}

main().catch(e => { console.error(e); process.exit(1) })
