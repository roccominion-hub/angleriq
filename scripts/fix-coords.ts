import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'; import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // Toledo Bend center is ~31.85°N (lake runs 31.0–32.7°N)
  await sb.from('body_of_water').update({ lat: 31.85, lng: -93.56 }).eq('name', 'Toledo Bend Reservoir');
  // Sabine River — center of TX portion
  await sb.from('body_of_water').update({ lat: 32.5, lng: -93.9 }).eq('name', 'Sabine River');
  console.log('Updated Toledo Bend and Sabine River coords');
}
main();
