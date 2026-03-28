import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data, error } = await supabase.from('body_of_water').select('name').eq('state', 'TX').order('name')
  if (error) console.error(error)
  else data?.forEach(l => console.log(l.name))
}
main()
