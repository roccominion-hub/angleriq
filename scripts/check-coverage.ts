import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { count: totalReports } = await sb.from('technique_report').select('*', { count: 'exact', head: true });
  console.log('Total technique reports:', totalReports);

  // Check column names on technique_report
  const { data: sample } = await sb.from('technique_report').select('*').limit(1);
  console.log('Sample report keys:', sample ? Object.keys(sample[0]) : 'none');

  // Check distinct water IDs with reports
  const { data: withData } = await sb.from('technique_report').select('water_id').limit(1000);
  const covered = new Set(withData?.map(r => r.water_id));
  console.log('Lakes with at least 1 report:', covered.size);
}
main();
