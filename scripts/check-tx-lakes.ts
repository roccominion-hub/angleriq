import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('body_of_water')
    .select('name, lat, lng, wdft_slug, usgs_lake_site_no, cwms_location_code')
    .eq('state', 'TX')
    .order('name')

  console.log(`\nTX lakes in DB (${data?.length}):\n`)
  const noLevel = []
  for (const l of data ?? []) {
    const wdft = l.wdft_slug ? `WDFT:${l.wdft_slug}` : ''
    const usgs = l.usgs_lake_site_no ? `USGS:${l.usgs_lake_site_no}` : ''
    const cwms = l.cwms_location_code ? `CWMS:${l.cwms_location_code}` : ''
    const status = wdft || usgs || cwms || '⚠️ NO DATA SOURCE'
    if (!wdft && !usgs && !cwms) noLevel.push(l.name)
    console.log(`  ${l.name.padEnd(35)} ${status}`)
  }
  if (noLevel.length) {
    console.log(`\n⚠️  ${noLevel.length} lakes with no water level source:`)
    noLevel.forEach(n => console.log(`    - ${n}`))
  }
}
main().catch(console.error)
