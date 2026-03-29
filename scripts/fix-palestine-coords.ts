import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await sb.from('body_of_water').update({ lat: 32.0, lng: -95.47 }).eq('name', 'Lake Palestine');
  if (error) throw error;
  console.log('Updated Lake Palestine coords to 32.0, -95.47');
}
main();
