/**
 * Seed all new TX lakes into body_of_water
 * Run: npx tsx scripts/ingestion/seed-tx-lakes.ts
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const LAKES = [
  { name: 'Lake Belton',                state: 'TX', type: 'reservoir', lat: 31.1474, lng: -97.4863, species: ['largemouth bass', 'guadalupe bass', 'white bass', 'striped bass'] },
  { name: 'Lake Tawakoni',              state: 'TX', type: 'reservoir', lat: 32.8596, lng: -96.0227, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Lake Graham',                state: 'TX', type: 'reservoir', lat: 33.0990, lng: -98.5860, species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Eddleman',              state: 'TX', type: 'reservoir', lat: 33.1200, lng: -98.6100, species: ['largemouth bass', 'catfish'] },
  { name: 'Possum Kingdom Lake',        state: 'TX', type: 'reservoir', lat: 32.8735, lng: -98.4302, species: ['largemouth bass', 'spotted bass', 'white bass', 'striped bass'] },
  { name: 'Lake Granbury',              state: 'TX', type: 'reservoir', lat: 32.4421, lng: -97.7941, species: ['largemouth bass', 'white bass', 'striped bass'] },
  { name: 'Lake Amon G. Carter',        state: 'TX', type: 'reservoir', lat: 32.9271, lng: -98.4924, species: ['largemouth bass', 'catfish'] },
  { name: 'Lake Bridgeport',            state: 'TX', type: 'reservoir', lat: 33.2182, lng: -97.8622, species: ['largemouth bass', 'white bass', 'striped bass', 'crappie'] },
  { name: "Bois d'Arc Lake",            state: 'TX', type: 'reservoir', lat: 33.6350, lng: -96.0440, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Bob Sandlin',           state: 'TX', type: 'reservoir', lat: 33.0573, lng: -95.1285, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Cypress Springs Lake',       state: 'TX', type: 'reservoir', lat: 33.0060, lng: -95.0650, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Hubbard Creek Reservoir',    state: 'TX', type: 'reservoir', lat: 32.8263, lng: -98.9799, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Lake Aquilla',               state: 'TX', type: 'reservoir', lat: 31.8518, lng: -97.2140, species: ['largemouth bass', 'white bass'] },
  { name: 'Lake Pat Cleburne',          state: 'TX', type: 'reservoir', lat: 32.3085, lng: -97.3766, species: ['largemouth bass', 'white bass'] },
  { name: 'Lake Waxahachie',            state: 'TX', type: 'reservoir', lat: 32.3849, lng: -96.8308, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Palestine',             state: 'TX', type: 'reservoir', lat: 31.9057, lng: -95.5377, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Athens',                state: 'TX', type: 'reservoir', lat: 32.1985, lng: -95.8438, species: ['largemouth bass', 'catfish', 'crappie'] },
  { name: 'Lake Tyler',                 state: 'TX', type: 'reservoir', lat: 32.3268, lng: -95.2088, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Lavon',                 state: 'TX', type: 'reservoir', lat: 33.0360, lng: -96.4860, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Eagle Mountain Lake',        state: 'TX', type: 'reservoir', lat: 32.9021, lng: -97.4591, species: ['largemouth bass', 'white bass', 'striped bass'] },
  { name: 'Squaw Creek Reservoir',      state: 'TX', type: 'reservoir', lat: 32.6360, lng: -97.9020, species: ['largemouth bass', 'catfish'] },
  { name: 'Lake Ray Hubbard',           state: 'TX', type: 'reservoir', lat: 32.8432, lng: -96.5488, species: ['largemouth bass', 'white bass', 'striped bass', 'crappie'] },
  { name: 'Sabine River',               state: 'TX', type: 'river',     lat: 32.3010, lng: -93.9010, species: ['largemouth bass', 'spotted bass', 'guadalupe bass'] },
  { name: 'Joe Pool Lake',              state: 'TX', type: 'reservoir', lat: 32.6271, lng: -97.0516, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Lake Arlington',             state: 'TX', type: 'reservoir', lat: 32.6835, lng: -97.1463, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Lake Worth',                 state: 'TX', type: 'reservoir', lat: 32.8110, lng: -97.4380, species: ['largemouth bass', 'white bass', 'crappie'] },
  { name: 'Lake J.B. Thomas',           state: 'TX', type: 'reservoir', lat: 32.5557, lng: -101.1963, species: ['largemouth bass', 'white bass', 'catfish'] },
  { name: 'Lake Nocona',                state: 'TX', type: 'reservoir', lat: 33.7882, lng: -97.7336, species: ['largemouth bass', 'catfish', 'crappie'] },
  { name: 'Lake Naconiche',             state: 'TX', type: 'reservoir', lat: 31.6010, lng: -94.7020, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Choke Canyon Reservoir',     state: 'TX', type: 'reservoir', lat: 28.4899, lng: -98.3349, species: ['largemouth bass', 'catfish', 'crappie'] },
  { name: 'Canyon Lake',                state: 'TX', type: 'reservoir', lat: 29.8763, lng: -98.2280, species: ['largemouth bass', 'guadalupe bass', 'smallmouth bass', 'white bass'] },
  { name: 'Lake LBJ',                   state: 'TX', type: 'reservoir', lat: 30.6099, lng: -98.4021, species: ['largemouth bass', 'guadalupe bass', 'white bass', 'striped bass'] },
  { name: 'Mill Creek Lake',            state: 'TX', type: 'reservoir', lat: 33.5960, lng: -97.1550, species: ['largemouth bass', 'catfish'] },
  { name: 'Gibbons Creek Reservoir',    state: 'TX', type: 'reservoir', lat: 30.5488, lng: -96.0813, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Daniel',                state: 'TX', type: 'reservoir', lat: 32.1910, lng: -99.0620, species: ['largemouth bass', 'catfish'] },
  { name: 'Purtis Creek State Park Lake', state: 'TX', type: 'reservoir', lat: 32.3560, lng: -95.9950, species: ['largemouth bass', 'crappie', 'catfish'] },
  { name: 'Lake Pinkston',              state: 'TX', type: 'reservoir', lat: 32.0740, lng: -94.2380, species: ['largemouth bass', 'crappie', 'catfish'] },
  // Also seed ones already in DB that may be missing entries
  { name: 'Cedar Creek Reservoir',      state: 'TX', type: 'reservoir', lat: 32.2021, lng: -96.0449, species: ['largemouth bass', 'crappie', 'catfish', 'white bass'] },
  { name: 'Lake Buchanan',              state: 'TX', type: 'reservoir', lat: 30.7521, lng: -98.4188, species: ['largemouth bass', 'guadalupe bass', 'white bass', 'striped bass'] },
  { name: 'Lake Travis',                state: 'TX', type: 'reservoir', lat: 30.3880, lng: -97.9005, species: ['largemouth bass', 'guadalupe bass', 'smallmouth bass', 'white bass'] },
  { name: 'Lake Whitney',               state: 'TX', type: 'reservoir', lat: 31.9549, lng: -97.3688, species: ['largemouth bass', 'guadalupe bass', 'white bass', 'striped bass'] },
  { name: 'Richland Chambers Reservoir', state: 'TX', type: 'reservoir', lat: 31.9188, lng: -96.1030, species: ['largemouth bass', 'white bass', 'crappie'] },
]

async function main() {
  console.log(`🌊 Seeding ${LAKES.length} TX lakes...\n`)
  let seeded = 0, skipped = 0, errors = 0
  for (const lake of LAKES) {
    const { data: existing } = await supabase
      .from('body_of_water').select('id').ilike('name', lake.name).eq('state', lake.state).maybeSingle()
    if (existing) { console.log(`  ⏭️  ${lake.name}`); skipped++; continue }
    const { error } = await supabase.from('body_of_water').insert(lake)
    if (error) { console.error(`  ❌ ${lake.name}: ${error.message}`); errors++ }
    else { console.log(`  ✅ ${lake.name}`); seeded++ }
  }
  console.log(`\nDone. Seeded: ${seeded} | Skipped: ${skipped} | Errors: ${errors}`)
}
main().catch(console.error)
