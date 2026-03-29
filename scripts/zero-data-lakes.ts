import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: lakes } = await sb.from('body_of_water').select('id, name, state');
  const { data: reports } = await sb.from('technique_report').select('water_id');
  const covered = new Set(reports?.map(r => r.water_id));
  const empty = lakes?.filter(l => !covered.has(l.id)) || [];
  console.log(`Lakes with no data: ${empty.length}`);
  empty.forEach(l => console.log(`  ${l.name}, ${l.state}`));
}
main();
