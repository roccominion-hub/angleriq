import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await sb.from('body_of_water').update({ wdft_slug: 'o-h-ivie' }).ilike('name', '%ivie%');
  if (error) throw error;
  console.log('Fixed wdft_slug for O.H. Ivie → o-h-ivie');
  // Verify
  const { data } = await sb.from('body_of_water').select('name, wdft_slug').ilike('name', '%ivie%');
  console.log(data);
}
main();
