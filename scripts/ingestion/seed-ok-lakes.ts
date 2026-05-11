/**
 * AnglerIQ — Seed Oklahoma Lakes
 * Inserts major OK bass lakes into body_of_water (skips if already exists).
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-lakes.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OK_LAKES = [
  { name: 'Lake Eufaula',                   state: 'OK', type: 'reservoir', lat: 35.29, lng: -95.62, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Grand Lake o\' the Cherokees',   state: 'OK', type: 'reservoir', lat: 36.53, lng: -95.02, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Lake Tenkiller',                  state: 'OK', type: 'reservoir', lat: 35.61, lng: -94.98, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Keystone Lake',                   state: 'OK', type: 'reservoir', lat: 36.13, lng: -96.35, species: ['largemouth', 'smallmouth'] },
  { name: 'Fort Gibson Lake',                state: 'OK', type: 'reservoir', lat: 35.87, lng: -95.22, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Oologah Lake',                    state: 'OK', type: 'reservoir', lat: 36.44, lng: -95.70, species: ['largemouth', 'smallmouth'] },
  { name: 'Lake Thunderbird',                state: 'OK', type: 'reservoir', lat: 35.24, lng: -97.25, species: ['largemouth', 'smallmouth'] },
  { name: 'Lake Hefner',                     state: 'OK', type: 'reservoir', lat: 35.57, lng: -97.61, species: ['largemouth'] },
  { name: 'Broken Bow Lake',                 state: 'OK', type: 'reservoir', lat: 34.15, lng: -94.73, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Lake Murray',                     state: 'OK', type: 'reservoir', lat: 34.08, lng: -97.06, species: ['largemouth', 'smallmouth'] },
  { name: 'Lake Hudson',                     state: 'OK', type: 'reservoir', lat: 36.49, lng: -95.14, species: ['largemouth', 'smallmouth', 'spotted'] },
  { name: 'Skiatook Lake',                   state: 'OK', type: 'reservoir', lat: 36.37, lng: -96.07, species: ['largemouth', 'smallmouth'] },
  { name: 'Kaw Lake',                        state: 'OK', type: 'reservoir', lat: 36.77, lng: -97.01, species: ['largemouth', 'smallmouth'] },
  { name: 'Sardis Lake',                     state: 'OK', type: 'reservoir', lat: 34.72, lng: -95.47, species: ['largemouth', 'smallmouth'] },
  { name: 'McGee Creek Reservoir',           state: 'OK', type: 'reservoir', lat: 34.36, lng: -95.89, species: ['largemouth', 'smallmouth'] },
]

async function main() {
  console.log(`\n🎣 Seeding ${OK_LAKES.length} Oklahoma lakes...`)

  // Get existing lakes to avoid duplicates
  const { data: existing } = await supabase
    .from('body_of_water')
    .select('name, state')
    .eq('state', 'OK')

  const existingNames = new Set((existing || []).map(l => l.name))
  console.log(`   ${existingNames.size} OK lakes already in DB`)

  let inserted = 0, skipped = 0
  for (const lake of OK_LAKES) {
    if (existingNames.has(lake.name)) {
      console.log(`   ⏭  Skip: ${lake.name} (already exists)`)
      skipped++
      continue
    }
    const { error } = await supabase.from('body_of_water').insert(lake)
    if (error) {
      console.error(`   ❌ ${lake.name}: ${error.message}`)
    } else {
      console.log(`   ✅ ${lake.name}`)
      inserted++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped`)
}

main().catch(console.error)
