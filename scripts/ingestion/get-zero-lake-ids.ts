import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const zeroLakes = ['Lake Worth','Lake Tawakoni','Lake Pinkston','Lake Nocona','Lake Naconiche','Lake Lavon','Lake LBJ','Lake Granbury','Lake Graham','Lake Eddleman','Lake Bridgeport','Lake Belton','Lake Arlington','Lake Aquilla','Canyon Lake']
  for (const name of zeroLakes) {
    const { data } = await supabase.from('body_of_water').select('id,name').ilike('name', name).single()
    if (data) console.log(`${data.id}  ${data.name}`)
  }
}
main()
