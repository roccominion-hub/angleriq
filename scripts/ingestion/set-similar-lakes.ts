/**
 * Add similar_lake_id column to body_of_water and set associations
 * for lakes with zero tournament data.
 * Run: npx tsx scripts/ingestion/set-similar-lakes.ts
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Associations: [lake name, similar lake name]
// Logic: geography, fishery type, structure, size — not just proximity
const ASSOCIATIONS: [string, string][] = [
  ['Lake Worth',       'Eagle Mountain Lake'],      // Same metro, similar open-water impoundment
  ['Lake Tawakoni',    'Richland Chambers Reservoir'], // Both open-water, rocky/point fisheries, no heavy vegetation
  ['Lake Pinkston',    'Lake Bob Sandlin'],          // East TX timber/brush lakes
  ['Lake Nocona',      'Lake Bridgeport'],           // N. TX, similar size, rocky structure
  ['Lake Naconiche',   'Lake Bob Sandlin'],          // East TX, timber-heavy
  ['Lake Lavon',       'Lake Ray Hubbard'],          // DFW metro, similar open impoundments
  ['Lake LBJ',         'Canyon Lake'],               // Highland Lakes chain, Guadalupe/LMB fishery
  ['Lake Granbury',    'Possum Kingdom Lake'],       // Brazos River impoundments, similar character
  ['Lake Eddleman',    'Lake Graham'],               // Same watershed, effectively same fishery
  ['Lake Bridgeport',  'Eagle Mountain Lake'],       // N. TX, similar structure and species mix
  ['Lake Belton',      'Lake Whitney'],              // Central TX, Guadalupe bass, similar impoundment type
  ['Lake Arlington',   'Joe Pool Lake'],             // DFW metro neighbors, very similar character
  ['Lake Aquilla',     'Lake Waxahachie'],           // Small central TX impoundments
  ['Canyon Lake',      'Lake LBJ'],                  // Highland Lakes, clear water, Guadalupe bass
]

async function getLakeId(name: string): Promise<string | null> {
  const { data } = await supabase.from('body_of_water').select('id').ilike('name', name).maybeSingle()
  return data?.id || null
}

async function main() {
  console.log('🔗 Setting similar lake associations...\n')

  // First ensure column exists — attempt via raw SQL through RPC if available,
  // otherwise we'll catch the error and prompt for manual migration
  const { error: colError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE body_of_water ADD COLUMN IF NOT EXISTS similar_lake_id uuid REFERENCES body_of_water(id);'
  }).single()

  if (colError) {
    console.log('⚠️  Could not auto-add column via RPC. You may need to run this SQL manually in Supabase:')
    console.log('   ALTER TABLE body_of_water ADD COLUMN IF NOT EXISTS similar_lake_id uuid REFERENCES body_of_water(id);\n')
    console.log('   Then re-run this script.\n')
    // Still attempt updates in case column already exists
  } else {
    console.log('✅ Column similar_lake_id ensured\n')
  }

  let set = 0, errors = 0
  for (const [lakeName, similarName] of ASSOCIATIONS) {
    const lakeId = await getLakeId(lakeName)
    const similarId = await getLakeId(similarName)

    if (!lakeId) { console.log(`  ❌ Not found: ${lakeName}`); errors++; continue }
    if (!similarId) { console.log(`  ❌ Not found: ${similarName}`); errors++; continue }

    const { error } = await supabase
      .from('body_of_water')
      .update({ similar_lake_id: similarId })
      .eq('id', lakeId)

    if (error) {
      console.error(`  ❌ ${lakeName} → ${similarName}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✅ ${lakeName} → ${similarName}`)
      set++
    }
  }

  console.log(`\nDone. Set: ${set} | Errors: ${errors}`)
}
main().catch(console.error)
