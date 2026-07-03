import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('body_of_water')
    .select('name, lat, lng, usgs_lake_site_no, wdft_slug')
    .eq('state', 'OK')
    .order('name')
  
  console.log(`\nOK lakes in DB (${data?.length}):\n`)
  for (const l of data ?? []) {
    const usgs = l.usgs_lake_site_no ? `USGS:${l.usgs_lake_site_no}` : 'no USGS'
    const wdft = l.wdft_slug ? `WDFT:${l.wdft_slug}` : ''
    console.log(`  ${l.name.padEnd(35)} ${usgs} ${wdft}`)
  }
}
main().catch(console.error)
