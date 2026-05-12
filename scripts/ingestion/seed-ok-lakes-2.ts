/**
 * AnglerIQ — Seed Additional Oklahoma Lakes (Phase 2)
 * Adds remaining notable OK bass lakes not in the initial seed.
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-lakes-2.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OK_LAKES_2 = [
  {
    name: 'Robert S. Kerr Reservoir',
    state: 'OK', type: 'reservoir',
    lat: 35.13, lng: -94.79,
    species: ['largemouth', 'spotted', 'smallmouth'],
  },
  {
    name: 'Lake of the Arbuckles',
    state: 'OK', type: 'reservoir',
    lat: 34.52, lng: -97.03,
    species: ['largemouth', 'smallmouth'],
  },
  {
    name: 'Waurika Lake',
    state: 'OK', type: 'reservoir',
    lat: 34.18, lng: -97.99,
    species: ['largemouth', 'spotted'],
  },
  {
    name: 'Lake Carl Blackwell',
    state: 'OK', type: 'reservoir',
    lat: 36.13, lng: -97.22,
    species: ['largemouth', 'smallmouth'],
  },
  {
    name: 'Lake Canton',
    state: 'OK', type: 'reservoir',
    lat: 36.10, lng: -98.58,
    species: ['largemouth', 'spotted'],
  },
  {
    name: 'Arcadia Lake',
    state: 'OK', type: 'reservoir',
    lat: 35.63, lng: -97.29,
    species: ['largemouth'],
  },
  {
    name: 'Fort Supply Lake',
    state: 'OK', type: 'reservoir',
    lat: 36.57, lng: -99.57,
    species: ['largemouth', 'spotted'],
  },
  {
    name: 'Lake Heyburn',
    state: 'OK', type: 'reservoir',
    lat: 35.93, lng: -96.33,
    species: ['largemouth'],
  },
  {
    name: 'Lake Lawtonka',
    state: 'OK', type: 'reservoir',
    lat: 34.73, lng: -98.44,
    species: ['largemouth', 'smallmouth'],
  },
  {
    name: 'Tom Steed Reservoir',
    state: 'OK', type: 'reservoir',
    lat: 34.59, lng: -98.89,
    species: ['largemouth', 'smallmouth'],
  },
  {
    name: 'Lake Overholser',
    state: 'OK', type: 'reservoir',
    lat: 35.49, lng: -97.66,
    species: ['largemouth'],
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${OK_LAKES_2.length} additional Oklahoma lakes...`)

  const { data: existing } = await supabase
    .from('body_of_water')
    .select('name, state')
    .eq('state', 'OK')

  const existingNames = new Set((existing || []).map(l => l.name))
  console.log(`   ${existingNames.size} OK lakes already in DB`)

  let inserted = 0, skipped = 0
  for (const lake of OK_LAKES_2) {
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
