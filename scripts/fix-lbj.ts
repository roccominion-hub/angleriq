import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await sb.from('body_of_water').select('id, name, lat, lng').ilike('name', '%lbj%');
  console.log(data);
}
main();
