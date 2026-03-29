import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: lakes } = await sb.from('body_of_water').select('id, name');
  const { data: reports } = await sb.from('technique_report').select('body_of_water_id');
  const covered = new Set(reports?.map(r => r.body_of_water_id));
  const empty = lakes?.filter(l => !covered.has(l.id)) || [];
  const hasData = lakes?.filter(l => covered.has(l.id)) || [];
  console.log(`Total lakes: ${lakes?.length}`);
  console.log(`Lakes WITH data: ${hasData.length}`);
  console.log(`Lakes with NO data: ${empty.length}`);
  console.log('\nNo-data lakes:');
  empty.forEach(l => console.log(`  ${l.name}`));
}
main();
