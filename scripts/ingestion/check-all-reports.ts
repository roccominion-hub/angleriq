import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data: waters } = await supabase.from('body_of_water').select('id, name, state').order('state').order('name')
  for (const w of waters || []) {
    const { count } = await supabase.from('technique_report').select('*', { count: 'exact', head: true }).eq('body_of_water_id', w.id)
    console.log(`${w.state}  ${(count ?? 0).toString().padStart(4)}  ${w.name}`)
  }
}
main()
