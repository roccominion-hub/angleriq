/**
 * AnglerIQ — Eastern/Midwest lake seeder
 *
 * Adds marquee bass fisheries for SC, NC, VA, OH, WV, KY, PA, IN, IL into
 * body_of_water. Dedupes by name (case-insensitive) so shared-border waters
 * already present (Lake Erie, Kentucky Lake, Hartwell, etc.) are skipped, and
 * shared lakes below are listed once with a combined state code.
 *
 * Usage:
 *   npx tsx scripts/ingestion/seed-eastern-lakes.ts [--dry-run]
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type L = { name: string; state: string; type: string; lat: number; lng: number; species: string[] }
const LM = 'largemouth bass', SM = 'smallmouth bass', SP = 'spotted bass', ST = 'striped bass', WB = 'white bass', CR = 'crappie', MU = 'muskie', WE = 'walleye'

const LAKES: L[] = [
  // ── South Carolina (Hartwell / Clarks Hill / Russell already in as GA/SC) ──
  { name: 'Lake Murray', state: 'SC', type: 'reservoir', lat: 34.07, lng: -81.23, species: [LM, ST, SP] },
  { name: 'Lake Marion', state: 'SC', type: 'reservoir', lat: 33.50, lng: -80.35, species: [LM, ST, CR] },
  { name: 'Lake Moultrie', state: 'SC', type: 'reservoir', lat: 33.30, lng: -80.05, species: [LM, ST, CR] },
  { name: 'Lake Wateree', state: 'SC', type: 'reservoir', lat: 34.43, lng: -80.88, species: [LM, ST] },
  { name: 'Lake Greenwood', state: 'SC', type: 'reservoir', lat: 34.18, lng: -82.00, species: [LM, SP] },
  { name: 'Lake Keowee', state: 'SC', type: 'reservoir', lat: 34.83, lng: -82.88, species: [LM, SP, SM] },
  { name: 'Lake Jocassee', state: 'SC', type: 'reservoir', lat: 35.00, lng: -82.92, species: [SM, SP, LM] },
  { name: 'Lake Wylie', state: 'SC/NC', type: 'reservoir', lat: 35.07, lng: -81.05, species: [LM, SP] },

  // ── North Carolina ──
  { name: 'Lake Norman', state: 'NC', type: 'reservoir', lat: 35.55, lng: -80.95, species: [LM, SP] },
  { name: 'Falls Lake', state: 'NC', type: 'reservoir', lat: 36.02, lng: -78.68, species: [LM, CR] },
  { name: 'Jordan Lake', state: 'NC', type: 'reservoir', lat: 35.72, lng: -79.00, species: [LM, CR] },
  { name: 'High Rock Lake', state: 'NC', type: 'reservoir', lat: 35.63, lng: -80.23, species: [LM, SP] },
  { name: 'Shearon Harris Lake', state: 'NC', type: 'reservoir', lat: 35.63, lng: -78.95, species: [LM] },
  { name: 'Badin Lake', state: 'NC', type: 'reservoir', lat: 35.42, lng: -80.10, species: [LM, SP] },
  { name: 'Lake Tillery', state: 'NC', type: 'reservoir', lat: 35.25, lng: -80.05, species: [LM, SP] },
  { name: 'Fontana Lake', state: 'NC', type: 'reservoir', lat: 35.43, lng: -83.75, species: [SM, LM, SP] },
  { name: 'Mountain Island Lake', state: 'NC', type: 'reservoir', lat: 35.37, lng: -80.98, species: [LM, SP] },
  { name: 'Kerr Lake', state: 'NC/VA', type: 'reservoir', lat: 36.60, lng: -78.30, species: [LM, ST, CR] },
  { name: 'Lake Gaston', state: 'NC/VA', type: 'reservoir', lat: 36.52, lng: -77.95, species: [LM, ST] },
  { name: 'Lake Chatuge', state: 'NC/GA', type: 'reservoir', lat: 34.99, lng: -83.78, species: [LM, SP] },

  // ── Virginia ──
  { name: 'Smith Mountain Lake', state: 'VA', type: 'reservoir', lat: 37.05, lng: -79.62, species: [LM, SM, ST] },
  { name: 'Lake Anna', state: 'VA', type: 'reservoir', lat: 38.02, lng: -77.80, species: [LM, ST] },
  { name: 'Claytor Lake', state: 'VA', type: 'reservoir', lat: 37.05, lng: -80.63, species: [SM, LM, SP] },
  { name: 'Philpott Lake', state: 'VA', type: 'reservoir', lat: 36.78, lng: -80.03, species: [LM, SM] },
  { name: 'Lake Chesdin', state: 'VA', type: 'reservoir', lat: 37.22, lng: -77.62, species: [LM, CR] },
  { name: 'Leesville Lake', state: 'VA', type: 'reservoir', lat: 37.10, lng: -79.50, species: [LM, ST] },
  { name: 'Briery Creek Lake', state: 'VA', type: 'lake', lat: 37.20, lng: -78.35, species: [LM] },
  { name: 'Chickahominy Lake', state: 'VA', type: 'lake', lat: 37.35, lng: -77.10, species: [LM, CR] },

  // ── Ohio (Lake Erie already in as NY/PA/OH/MI) ──
  { name: 'Mosquito Creek Lake', state: 'OH', type: 'reservoir', lat: 41.30, lng: -80.76, species: [LM, WE] },
  { name: 'West Branch Reservoir', state: 'OH', type: 'reservoir', lat: 41.15, lng: -81.17, species: [LM, MU] },
  { name: 'Alum Creek Lake', state: 'OH', type: 'reservoir', lat: 40.18, lng: -82.98, species: [LM, SM] },
  { name: 'Delaware Lake', state: 'OH', type: 'reservoir', lat: 40.37, lng: -83.07, species: [LM] },
  { name: 'Indian Lake', state: 'OH', type: 'lake', lat: 40.48, lng: -83.90, species: [LM, CR] },
  { name: 'Grand Lake St. Marys', state: 'OH', type: 'lake', lat: 40.53, lng: -84.50, species: [LM, CR] },
  { name: 'Berlin Lake', state: 'OH', type: 'reservoir', lat: 41.03, lng: -81.00, species: [LM, WE] },
  { name: 'Caesar Creek Lake', state: 'OH', type: 'reservoir', lat: 39.48, lng: -84.05, species: [LM, SM] },
  { name: 'Deer Creek Lake', state: 'OH', type: 'reservoir', lat: 39.63, lng: -83.22, species: [LM] },
  { name: 'Pymatuning Reservoir', state: 'OH/PA', type: 'reservoir', lat: 41.60, lng: -80.50, species: [LM, WE, MU] },

  // ── West Virginia ──
  { name: 'Summersville Lake', state: 'WV', type: 'reservoir', lat: 38.23, lng: -80.90, species: [LM, SM, SP] },
  { name: 'Stonewall Jackson Lake', state: 'WV', type: 'reservoir', lat: 39.00, lng: -80.50, species: [LM, MU] },
  { name: 'Cheat Lake', state: 'WV', type: 'reservoir', lat: 39.72, lng: -79.85, species: [LM, SM, WE] },
  { name: 'Burnsville Lake', state: 'WV', type: 'reservoir', lat: 38.85, lng: -80.62, species: [LM, MU] },
  { name: 'Sutton Lake', state: 'WV', type: 'reservoir', lat: 38.65, lng: -80.70, species: [LM, SM] },
  { name: 'East Lynn Lake', state: 'WV', type: 'reservoir', lat: 38.15, lng: -82.30, species: [LM] },
  { name: 'Beech Fork Lake', state: 'WV', type: 'reservoir', lat: 38.28, lng: -82.35, species: [LM, CR] },
  { name: 'Tygart Lake', state: 'WV', type: 'reservoir', lat: 39.30, lng: -80.03, species: [LM, SM, WE] },

  // ── Kentucky (Kentucky Lake / Barkley / Dale Hollow already in as TN/KY) ──
  { name: 'Lake Cumberland', state: 'KY', type: 'reservoir', lat: 36.92, lng: -85.15, species: [LM, SM, ST, SP] },
  { name: 'Green River Lake', state: 'KY', type: 'reservoir', lat: 37.27, lng: -85.35, species: [LM, SM] },
  { name: 'Laurel River Lake', state: 'KY', type: 'reservoir', lat: 37.10, lng: -84.20, species: [SM, LM, SP] },
  { name: 'Cave Run Lake', state: 'KY', type: 'reservoir', lat: 38.12, lng: -83.53, species: [LM, MU] },
  { name: 'Taylorsville Lake', state: 'KY', type: 'reservoir', lat: 38.02, lng: -85.28, species: [LM, CR] },
  { name: 'Nolin River Lake', state: 'KY', type: 'reservoir', lat: 37.28, lng: -86.25, species: [LM, SM] },
  { name: 'Rough River Lake', state: 'KY', type: 'reservoir', lat: 37.62, lng: -86.50, species: [LM, CR] },
  { name: 'Herrington Lake', state: 'KY', type: 'reservoir', lat: 37.80, lng: -84.72, species: [LM, SM, WB] },

  // ── Pennsylvania (Lake Erie already in) ──
  { name: 'Raystown Lake', state: 'PA', type: 'reservoir', lat: 40.40, lng: -78.07, species: [SM, LM, ST] },
  { name: 'Lake Wallenpaupack', state: 'PA', type: 'reservoir', lat: 41.42, lng: -75.22, species: [LM, SM, ST] },
  { name: 'Lake Arthur', state: 'PA', type: 'lake', lat: 40.95, lng: -80.12, species: [LM, MU] },
  { name: 'Blue Marsh Lake', state: 'PA', type: 'reservoir', lat: 40.40, lng: -76.05, species: [LM, SM] },
  { name: 'Beltzville Lake', state: 'PA', type: 'reservoir', lat: 40.85, lng: -75.62, species: [LM, SM] },
  { name: 'Shenango River Lake', state: 'PA', type: 'reservoir', lat: 41.30, lng: -80.42, species: [LM, WE] },
  { name: 'Allegheny Reservoir', state: 'PA', type: 'reservoir', lat: 41.85, lng: -78.90, species: [SM, WE, MU] },
  { name: 'Conneaut Lake', state: 'PA', type: 'lake', lat: 41.63, lng: -80.30, species: [LM, MU] },

  // ── Indiana ──
  { name: 'Monroe Lake', state: 'IN', type: 'reservoir', lat: 39.05, lng: -86.42, species: [LM, SM] },
  { name: 'Patoka Lake', state: 'IN', type: 'reservoir', lat: 38.42, lng: -86.65, species: [LM, SP] },
  { name: 'Lake Wawasee', state: 'IN', type: 'lake', lat: 41.40, lng: -85.72, species: [LM, SM] },
  { name: 'Brookville Lake', state: 'IN', type: 'reservoir', lat: 39.43, lng: -84.98, species: [LM, SM] },
  { name: 'Geist Reservoir', state: 'IN', type: 'reservoir', lat: 39.93, lng: -85.95, species: [LM, CR] },
  { name: 'Morse Reservoir', state: 'IN', type: 'reservoir', lat: 40.10, lng: -86.03, species: [LM, CR] },
  { name: 'Cagles Mill Lake', state: 'IN', type: 'reservoir', lat: 39.48, lng: -86.90, species: [LM] },
  { name: 'Lake Freeman', state: 'IN', type: 'reservoir', lat: 40.65, lng: -86.75, species: [LM, SM] },
  { name: 'Lake Shafer', state: 'IN', type: 'reservoir', lat: 40.75, lng: -86.77, species: [LM] },
  { name: 'Summit Lake', state: 'IN', type: 'reservoir', lat: 40.02, lng: -85.30, species: [LM] },

  // ── Illinois ──
  { name: 'Lake Shelbyville', state: 'IL', type: 'reservoir', lat: 39.45, lng: -88.77, species: [LM, CR] },
  { name: 'Rend Lake', state: 'IL', type: 'reservoir', lat: 38.05, lng: -88.95, species: [LM, CR] },
  { name: 'Carlyle Lake', state: 'IL', type: 'reservoir', lat: 38.62, lng: -89.35, species: [LM, WB] },
  { name: 'Lake of Egypt', state: 'IL', type: 'reservoir', lat: 37.62, lng: -88.95, species: [LM, SP] },
  { name: 'Clinton Lake', state: 'IL', type: 'reservoir', lat: 40.15, lng: -88.83, species: [LM, SM] },
  { name: 'Lake Springfield', state: 'IL', type: 'reservoir', lat: 39.72, lng: -89.62, species: [LM, CR] },
  { name: 'Evergreen Lake', state: 'IL', type: 'lake', lat: 40.57, lng: -88.98, species: [LM, MU] },
  { name: 'Kinkaid Lake', state: 'IL', type: 'reservoir', lat: 37.78, lng: -89.42, species: [LM, MU] },
  { name: 'Sangchris Lake', state: 'IL', type: 'reservoir', lat: 39.62, lng: -89.47, species: [LM] },
  { name: 'Powerton Lake', state: 'IL', type: 'lake', lat: 40.50, lng: -89.68, species: [LM] },
]

const dryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n🌊 Eastern/Midwest lake seeder — ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   ${LAKES.length} candidate lakes across 9 states\n`)

  let inserted = 0, skipped = 0
  for (const lake of LAKES) {
    // Dedupe only when it's the SAME physical water: name match AND an
    // overlapping state token. A same-name lake in a non-overlapping state
    // (e.g. Lake Murray SC vs Lake Murray OK) is a distinct fishery — keep it.
    const stateTokens = lake.state.split('/')
    const { data: existingRows } = await supabase
      .from('body_of_water')
      .select('id, state')
      .ilike('name', lake.name)

    const dup = (existingRows ?? []).find(r =>
      r.state.split('/').some((t: string) => stateTokens.includes(t))
    )
    if (dup) {
      console.log(`  ⏭  ${lake.name} — same lake already exists (${dup.state})`)
      skipped++
      continue
    }

    if (dryRun) { console.log(`  +  ${lake.name} (${lake.state})`); inserted++; continue }

    const { error } = await supabase.from('body_of_water').insert({
      name: lake.name, state: lake.state, type: lake.type,
      lat: lake.lat, lng: lake.lng, species: lake.species,
    })
    if (error) { console.warn(`  ❌ ${lake.name}: ${error.message}`); continue }
    console.log(`  ✓  ${lake.name} (${lake.state})`)
    inserted++
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ ${inserted} ${dryRun ? 'would be inserted' : 'inserted'}, ${skipped} skipped (already present)`)
}

main().catch(e => { console.error(e); process.exit(1) })
