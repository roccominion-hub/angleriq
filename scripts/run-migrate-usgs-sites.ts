/**
 * Adds usgs_lake_site_no column to body_of_water and populates
 * USGS gauge site numbers for Oklahoma lakes.
 *
 * Usage: npx tsx scripts/run-migrate-usgs-sites.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// USGS lake stage gauge site numbers (parameter 00065 = gauge height in ft)
// Source: USGS NWIS https://waterservices.usgs.gov/nwis/site/?stateCd=OK&siteType=LK
const OK_USGS_SITES: Record<string, string> = {
  'Lake Eufaula':                  '07244800',
  "Grand Lake o' the Cherokees":   '07190000',
  'Lake Tenkiller':                '07197500',
  'Keystone Lake':                 '07153150',
  'Fort Gibson Lake':              '07193000',
  'Oologah Lake':                  '07171300',
  'Lake Thunderbird':              '07229900',
  'Lake Hefner':                   '07159550',
  'Broken Bow Lake':               '07338900',
  'Lake Murray':                   '07316100',
  'Lake Hudson':                   '07191400',
  'Skiatook Lake':                 '07177400',
  'Kaw Lake':                      '07148130',
  'Sardis Lake':                   '07335775',
  'McGee Creek Reservoir':         '07333900',
}

async function main() {
  console.log('\n📍 Populating USGS lake gauge site numbers for OK lakes...\n')

  // First: add the column if it doesn't exist (will error gracefully if it does)
  // We can't run DDL via supabase-js, so check if data already has the field by querying
  const { data: sample } = await supabase
    .from('body_of_water')
    .select('usgs_lake_site_no')
    .limit(1)

  if (sample === null) {
    console.log('⚠️  usgs_lake_site_no column does not exist yet.')
    console.log('Please run this SQL in the Supabase SQL Editor first:\n')
    console.log('  ALTER TABLE body_of_water ADD COLUMN IF NOT EXISTS usgs_lake_site_no text;\n')
    process.exit(1)
  }

  // Update each OK lake with its USGS site number
  let updated = 0
  for (const [name, siteNo] of Object.entries(OK_USGS_SITES)) {
    const { error, count } = await supabase
      .from('body_of_water')
      .update({ usgs_lake_site_no: siteNo })
      .eq('name', name)
      .eq('state', 'OK')

    if (error) {
      console.error(`  ❌ ${name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${name} → USGS ${siteNo}`)
      updated++
    }
  }

  console.log(`\n✅ Done: ${updated} lakes updated with USGS gauge site numbers`)
}

main().catch(console.error)
