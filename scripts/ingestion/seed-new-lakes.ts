import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const NEW_LAKES = [
  // ── HIGH PRIORITY ──────────────────────────────────────────────────────────
  { name: 'Jim Chapman Lake',        state: 'TX', lat: 33.3007, lng: -95.6274, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: "Lake O' the Pines",       state: 'TX', lat: 32.7626, lng: -94.6807, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Limestone',          state: 'TX', lat: 31.4083, lng: -96.3836, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Wright Patman Lake',      state: 'TX', lat: 33.3043, lng: -94.1571, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake B.A. Steinhagen',    state: 'TX', lat: 30.8794, lng: -94.1738, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Stillhouse Hollow Lake',  state: 'TX', lat: 30.9946, lng: -97.5386, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Brownwood',          state: 'TX', lat: 31.8654, lng: -99.0072, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Waco',               state: 'TX', lat: 31.6035, lng: -97.2155, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'E.V. Spence Reservoir',   state: 'TX', lat: 31.8618, lng: -100.4253, type: 'reservoir', species: ['largemouth bass', 'smallmouth bass', 'catfish'] },
  { name: 'Lake Alan Henry',         state: 'TX', lat: 33.1276, lng: -101.0472, type: 'reservoir', species: ['largemouth bass', 'smallmouth bass', 'catfish'] },
  { name: 'Coleto Creek Reservoir',  state: 'TX', lat: 28.7202, lng: -97.1774, type: 'reservoir', species: ['largemouth bass', 'catfish'] },
  { name: 'Lake Corpus Christi',     state: 'TX', lat: 27.8349, lng: -97.8602, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Pat Mayse Lake',          state: 'TX', lat: 33.8571, lng: -95.5391, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Proctor Lake',            state: 'TX', lat: 31.9688, lng: -98.4907, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Somerville Lake',         state: 'TX', lat: 30.3508, lng: -96.5336, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  // ── MID PRIORITY ───────────────────────────────────────────────────────────
  { name: 'Benbrook Lake',           state: 'TX', lat: 32.6343, lng: -97.4642, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Arrowhead',          state: 'TX', lat: 33.5762, lng: -98.7978, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Houston',            state: 'TX', lat: 29.9960, lng: -95.1077, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Georgetown',         state: 'TX', lat: 30.6821, lng: -97.7308, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Navarro Mills Lake',      state: 'TX', lat: 31.9232, lng: -96.6971, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Kemp',               state: 'TX', lat: 33.7543, lng: -99.1421, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Nacogdoches',        state: 'TX', lat: 31.6985, lng: -94.7238, type: 'reservoir', species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Fairfield Lake',          state: 'TX', lat: 31.7615, lng: -96.0683, type: 'reservoir', species: ['largemouth bass', 'catfish'] },
  { name: 'Granger Lake',            state: 'TX', lat: 30.6985, lng: -97.3827, type: 'reservoir', species: ['largemouth bass', 'white bass', 'catfish'] },
]

async function main() {
  console.log(`\nSeeding ${NEW_LAKES.length} new TX lakes...\n`)
  let inserted = 0, skipped = 0

  for (const lake of NEW_LAKES) {
    const { data: existing } = await supabase
      .from('body_of_water')
      .select('id')
      .eq('name', lake.name)
      .eq('state', lake.state)
      .maybeSingle()

    if (existing) {
      console.log(`  ⏭  Already exists: ${lake.name}`)
      skipped++
      continue
    }

    const { error } = await supabase.from('body_of_water').insert(lake)
    if (error) {
      console.error(`  ✗ ${lake.name}: ${error.message}`)
    } else {
      console.log(`  ✓ ${lake.name}`)
      inserted++
    }
  }

  console.log(`\nDone — ${inserted} inserted, ${skipped} skipped`)
}
main().catch(console.error)
