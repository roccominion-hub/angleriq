import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { count } = await sb.from('technique_report').select('*', { count: 'exact', head: true });
  console.log('Total reports:', count);
}
main();
