/**
 * Adds cwms_location_code and cwms_office columns to body_of_water
 * and populates CWMS pool-elevation location codes for all OK lakes.
 *
 * CWMS = Army Corps Water Management System
 * Office SWT = Tulsa District (manages most OK reservoirs)
 * Timeseries used: {CODE}.Elev.Inst.1Hour.0.Ccp-Rev  (pool elevation in ft above NGVD29)
 *
 * Usage: npx tsx scripts/run-migrate-cwms-codes.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CWMS location codes verified against live data (2026-05-12)
// Office SWT = Tulsa District (Oklahoma + parts of AR/KS/TX)
// Pool elevation in feet above NGVD29 (sea level datum)
const OK_CWMS_SITES: Array<{ name: string; code: string; office?: string }> = [
  // ── Original 15 OK lakes ─────────────────────────────────────────────────
  { name: 'Lake Eufaula',                  code: 'EUFA' },
  { name: "Grand Lake o' the Cherokees",   code: 'PENS' },  // Pensacola Dam
  { name: 'Lake Tenkiller',                code: 'TENK' },
  { name: 'Keystone Lake',                 code: 'KEYS' },
  { name: 'Fort Gibson Lake',              code: 'FGIB' },
  { name: 'Oologah Lake',                  code: 'OOLO' },
  { name: 'Lake Thunderbird',              code: 'THUN' },
  // Lake Hefner → USGS 07159550 (city utility, not CWMS)
  { name: 'Broken Bow Lake',               code: 'BROK' },
  // Lake Murray → USGS 07316100 (state park, not CWMS)
  { name: 'Lake Hudson',                   code: 'HUDS' },
  { name: 'Skiatook Lake',                 code: 'SKIA' },
  { name: 'Kaw Lake',                      code: 'KAWL' },
  { name: 'Sardis Lake',                   code: 'SARD' },
  { name: 'McGee Creek Reservoir',         code: 'MCGE' },

  // ── Phase 2 OK lakes ──────────────────────────────────────────────────────
  { name: 'Robert S. Kerr Reservoir',      code: 'ROBE' },
  { name: 'Lake of the Arbuckles',         code: 'ARBU' },
  { name: 'Waurika Lake',                  code: 'WAUR' },
  // Lake Carl Blackwell → OSU-managed, no CWMS or active USGS gauge
  { name: 'Lake Canton',                   code: 'CANT' },
  { name: 'Arcadia Lake',                  code: 'ARCA' },
  { name: 'Fort Supply Lake',              code: 'FSUP' },
  { name: 'Lake Heyburn',                  code: 'HEYB' },
  { name: 'Lake Lawtonka',                 code: 'LAWT' },
  { name: 'Tom Steed Reservoir',           code: 'TOMS' },
  // Lake Overholser → USGS 07240500 (city utility, not CWMS)
]

// Lakes that should use USGS instead of CWMS (already populated in usgs_lake_site_no)
// Lake Hefner: 07159550, Lake Murray: 07316100, Lake Overholser: 07240500
const USGS_ONLY: Record<string, string> = {
  'Lake Overholser': '07240500',
}

async function main() {
  console.log('\n🏗️  Checking for cwms_location_code column...\n')

  // Verify column exists (DDL must be run in Supabase SQL Editor)
  const { data: sample, error: colErr } = await supabase
    .from('body_of_water')
    .select('cwms_location_code, cwms_office')
    .limit(1)

  if (colErr) {
    console.log('⚠️  Column does not exist yet.')
    console.log('Please run this SQL in the Supabase SQL Editor first:\n')
    console.log('  ALTER TABLE body_of_water ADD COLUMN IF NOT EXISTS cwms_location_code text;')
    console.log('  ALTER TABLE body_of_water ADD COLUMN IF NOT EXISTS cwms_office text;\n')
    process.exit(1)
  }

  // Populate CWMS codes for OK lakes
  console.log('📍 Updating OK lakes with CWMS pool-elevation codes...\n')
  let updated = 0, skipped = 0

  for (const { name, code, office = 'SWT' } of OK_CWMS_SITES) {
    const { error, count } = await supabase
      .from('body_of_water')
      .update({ cwms_location_code: code, cwms_office: office })
      .eq('name', name)
      .eq('state', 'OK')

    if (error) {
      console.error(`  ❌ ${name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${name.padEnd(38)} → CWMS ${office}:${code}`)
      updated++
    }
  }

  // Add Lake Overholser USGS site (no CWMS available)
  for (const [name, siteNo] of Object.entries(USGS_ONLY)) {
    const { error } = await supabase
      .from('body_of_water')
      .update({ usgs_lake_site_no: siteNo })
      .eq('name', name)
      .eq('state', 'OK')
      .is('usgs_lake_site_no', null)

    if (error) {
      console.error(`  ❌ ${name} USGS: ${error.message}`)
    } else {
      console.log(`  ✅ ${name.padEnd(38)} → USGS ${siteNo}`)
      updated++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done: ${updated} lakes updated`)
  console.log('\nNote: Lake Hefner (07159550) and Lake Murray (07316100) already')
  console.log('have USGS sites set. Lake Carl Blackwell has no active gauge data.')
}

main().catch(console.error)
