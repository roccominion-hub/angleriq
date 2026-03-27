/**
 * Seed missing Texas lakes into body_of_water table
 * Run: npx tsx scripts/ingestion/seed-missing-lakes.ts
 */
import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LAKES = [
  { name: 'Lake Grapevine',     state: 'TX', lat: 33.0070,  lng: -97.0712, species: ['Largemouth Bass', 'Spotted Bass', 'White Bass', 'Crappie'] },
  { name: 'Lake Lewisville',    state: 'TX', lat: 33.1126,  lng: -96.9791, species: ['Largemouth Bass', 'Striped Bass', 'White Bass', 'Crappie'] },
  { name: 'Lake of the Pines',  state: 'TX', lat: 32.7789,  lng: -94.5713, species: ['Largemouth Bass', 'Crappie', 'Catfish'] },
]

async function main() {
  console.log('🌊 Seeding missing lakes...\n')
  for (const lake of LAKES) {
    const { data: existing } = await supabase
      .from('body_of_water')
      .select('id')
      .ilike('name', lake.name)
      .eq('state', lake.state)
      .single()

    if (existing) {
      console.log(`  ⏭️  ${lake.name} already exists`)
      continue
    }

    const { error } = await supabase.from('body_of_water').insert({
      name: lake.name,
      state: lake.state,
      lat: lake.lat,
      lng: lake.lng,
      species: lake.species,
    })

    if (error) console.error(`  ❌ ${lake.name}: ${error.message}`)
    else console.log(`  ✅ Seeded ${lake.name}`)
  }
  console.log('\nDone.')
}

main().catch(console.error)
