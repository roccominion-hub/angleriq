/**
 * Populates water-level data sources for TX lakes that currently have none.
 *
 * Strategy:
 *   1. WDFT (waterdatafortexas.org) — preferred; has % full + conservation pool data
 *   2. CWMS (Army Corps CWMS API, SWF office) — fallback when WDFT unavailable
 *
 * All WDFT slugs were verified with HTTP 200 against the 30-day CSV endpoint.
 * All CWMS codes were verified with live elevation data (2026-05-12).
 *
 * Usage: npx tsx scripts/run-migrate-tx-water-levels.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TX lakes that have WDFT data but weren't previously configured
// Slugs verified 200 OK against https://www.waterdatafortexas.org/reservoirs/individual/{slug}-30day.csv
const WDFT_UPDATES: Array<{ name: string; slug: string }> = [
  { name: 'Lake Waco',                   slug: 'waco' },
  { name: 'Lake Aquilla',                slug: 'aquilla' },
  { name: 'Benbrook Lake',               slug: 'benbrook' },
  { name: 'Navarro Mills Lake',          slug: 'navarro-mills' },
  { name: 'Somerville Lake',             slug: 'somerville' },
  { name: 'Granger Lake',                slug: 'granger' },
  { name: 'Stillhouse Hollow Lake',      slug: 'stillhouse-hollow' },
  { name: 'Lake Georgetown',             slug: 'georgetown' },
  { name: 'Proctor Lake',               slug: 'proctor' },
  { name: 'Pat Mayse Lake',             slug: 'pat-mayse' },
  { name: 'Lake Limestone',             slug: 'limestone' },
  { name: 'Wright Patman Lake',         slug: 'wright-patman' },
  { name: 'Jim Chapman Lake',           slug: 'jim-chapman' },
  { name: 'Lake Kemp',                  slug: 'kemp' },
  { name: 'Lake Amon G. Carter',        slug: 'amon-g-carter' },
  { name: 'E.V. Spence Reservoir',      slug: 'e-v-spence' },
  { name: 'Coleto Creek Reservoir',     slug: 'coleto-creek' },
  { name: 'Lake Brownwood',             slug: 'brownwood' },
  { name: 'Lake Arrowhead',             slug: 'arrowhead' },
  { name: 'Lake Corpus Christi',        slug: 'corpus-christi' },
  { name: 'Lake Houston',               slug: 'houston' },
  { name: 'Lake Nacogdoches',           slug: 'nacogdoches' },
]

// TX lakes that only have CWMS data (WDFT not available)
// Office SWF = Fort Worth District; codes verified live 2026-05-12
const CWMS_UPDATES: Array<{ name: string; code: string; office: string }> = [
  { name: 'Lake B.A. Steinhagen',       code: 'TBLT2', office: 'SWF' },  // 82.6 ft (pool: 83 ft)
  { name: "Lake O' the Pines",          code: 'JFNT2', office: 'SWF' },  // 228.5 ft (pool: 228 ft)
  { name: 'Squaw Creek Reservoir',      code: 'GQQT2', office: 'SWF' },  // 292.9 ft
]

// Lakes with no available data source (small city utilities, closed power plants, private)
// Lake Eddleman, Lake Daniel, Lake Naconiche, Fairfield Lake, Gibbons Creek, Lake Pinkston,
// Mill Creek Lake, Purtis Creek State Park Lake — no WDFT or CWMS coverage

async function main() {
  console.log('\n💧 Migrating TX lake water-level data sources...\n')
  let updated = 0

  // ── WDFT slugs ───────────────────────────────────────────────────────────
  console.log('📊 Adding WDFT slugs (% full + conservation pool data):\n')
  for (const { name, slug } of WDFT_UPDATES) {
    const { error } = await supabase
      .from('body_of_water')
      .update({ wdft_slug: slug })
      .eq('name', name)
      .eq('state', 'TX')
      .is('wdft_slug', null)   // only update if not already set

    if (error) {
      console.error(`  ❌ ${name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${name.padEnd(35)} → WDFT: ${slug}`)
      updated++
    }
  }

  // ── CWMS codes ───────────────────────────────────────────────────────────
  console.log('\n📡 Adding CWMS codes (pool elevation, hourly):\n')
  for (const { name, code, office } of CWMS_UPDATES) {
    const { error } = await supabase
      .from('body_of_water')
      .update({ cwms_location_code: code, cwms_office: office })
      .eq('name', name)
      .eq('state', 'TX')
      .is('cwms_location_code', null)

    if (error) {
      console.error(`  ❌ ${name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${name.padEnd(35)} → CWMS ${office}:${code}`)
      updated++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done: ${updated} TX lakes updated with water-level sources`)
  console.log('\nStill no data source (not in WDFT or CWMS):')
  console.log('  - Lake Eddleman (City of Graham, paired with Lake Graham)')
  console.log('  - Lake Daniel (City of Abilene utility)')
  console.log('  - Lake Naconiche (City of Nacogdoches utility)')
  console.log('  - Fairfield Lake (Luminant power plant, server error on WDFT)')
  console.log('  - Gibbons Creek Reservoir (TMPA, closed 2022)')
  console.log('  - Lake Pinkston (City of Center)')
  console.log('  - Mill Creek Lake (small, not tracked)')
  console.log('  - Purtis Creek State Park Lake (TPWD, very small)')
  console.log('  - Sabine River (river, not reservoir)')
}

main().catch(console.error)
