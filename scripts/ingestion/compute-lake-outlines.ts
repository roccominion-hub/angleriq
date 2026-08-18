/**
 * AnglerIQ — Store NHD outlines for lakes where OSM falls short
 *
 * The map draws waterbodies from OSM, which is accurate on most lakes: across
 * the catalogue the two sources agree within 15% on 258 of 415. Where OSM is
 * short the shoreline renders visibly incomplete — Lake Eufaula's polygon
 * covers 246 km² of a 415 km² lake, which is how this started.
 *
 * So NHD is applied selectively. Each lake is measured against both sources and
 * an NHD outline is stored only when OSM is materially short or missing
 * entirely. That keeps NHD's cost off the request path (the geometry is stored,
 * like lake_channels) and avoids replacing 258 good outlines with equivalent
 * ones at 2-3x the vertices.
 *
 * Usage:
 *   npx tsx scripts/ingestion/compute-lake-outlines.ts --dry-run
 *   npx tsx scripts/ingestion/compute-lake-outlines.ts --lake "Lake Eufaula"
 *   npx tsx scripts/ingestion/compute-lake-outlines.ts            # whole catalogue
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { getLakeFeatures } from '../../src/lib/lake-conditions'
import { nhdOutline, ringsOf, simplifyOutline, totalArea, type Ring } from '../../src/lib/nhd-outline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// OSM has to be short by a clear margin before it is worth replacing: below
// this the two sources are describing the same shoreline.
const SHORT_RATIO = 1.15

async function osmOutline(lat: number, lng: number, name: string, state: string): Promise<Ring[]> {
  try {
    const feat = await getLakeFeatures(lat, lng, name, state)
    return (feat?.waterbodies?.features ?? []).flatMap((f: any) => ringsOf(f.geometry))
  } catch { return [] }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const only = args.includes('--lake') ? args[args.indexOf('--lake') + 1] : null

  let q = supabase.from('body_of_water').select('id, name, state, lat, lng').not('lat', 'is', null).order('name')
  if (only) q = q.ilike('name', only)
  const { data: lakes, error } = await q
  if (error || !lakes?.length) { console.error('No lakes', error); return }

  console.log(`\n🗺️  Lake outlines — ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   ${lakes.length} lake(s); NHD stored only where OSM is short or absent\n`)

  let stored = 0, kept = 0, rejected = 0, failed = 0

  for (const lake of lakes) {
    try {
      const osm = await osmOutline(lake.lat, lake.lng, lake.name, lake.state)
      const osmArea = totalArea(osm)

      const nhd = await nhdOutline(lake.name, lake.lat, lake.lng, osmArea || null)
      if (!nhd) {
        if (osm.length) { kept++ } else { rejected++; console.log(`  ·  ${lake.name} (${lake.state}) — no usable outline from either source`) }
        await new Promise(r => setTimeout(r, 900)); continue
      }

      // Keep OSM unless NHD is clearly larger, or OSM has nothing at all.
      const ratio = osmArea > 0 ? nhd.areaKm2 / osmArea : Infinity
      if (osmArea > 0 && ratio < SHORT_RATIO) {
        kept++
        await new Promise(r => setTimeout(r, 900)); continue
      }

      const { rings, tolerance } = simplifyOutline(nhd.rings)
      const verts = rings.reduce((s, r) => s + r.length, 0)
      const keptArea = totalArea(rings)
      const label = osmArea > 0 ? `${Math.round(osmArea)} → ${Math.round(keptArea)} km² (${ratio.toFixed(2)}x)` : `${Math.round(keptArea)} km² (OSM had none)`
      console.log(`  ✓  ${lake.name} (${lake.state}) — ${label}, ${verts} verts${tolerance ? ` @tol ${tolerance.toFixed(5)}` : ''}`)

      if (!dryRun) {
        const { error: e } = await supabase.from('lake_outlines').upsert({
          lake_id: lake.id,
          rings,
          area_km2: +keptArea.toFixed(2),
          vertex_count: verts,
          source: nhd.source,
          matched_name: nhd.matchedName,
          osm_area_km2: osmArea > 0 ? +osmArea.toFixed(2) : null,
          computed_at: new Date().toISOString(),
        })
        if (e) { console.error(`     ✗ ${e.message}`); failed++; continue }
      }
      stored++
    } catch (e: any) {
      console.warn(`  ❌ ${lake.name}: ${e.message?.slice(0, 70)}`)
      failed++
    }
    await new Promise(r => setTimeout(r, 900))  // polite to Nominatim and NHD
  }

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`${dryRun ? 'Would store' : '✅ Stored'} ${stored} · OSM kept ${kept} · no usable outline ${rejected} · failed ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
