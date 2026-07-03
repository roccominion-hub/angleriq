import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const pattern = process.argv[2]
  if (!pattern) {
    console.error('Usage: npx tsx scripts/clear-cache.ts <pattern>\nExample: npx tsx scripts/clear-cache.ts lake-murray')
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('summary_cache')
    .delete()
    .ilike('cache_key', `%${pattern}%`)
    .select('cache_key')

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`Deleted ${data?.length ?? 0} cache entries for pattern "${pattern}":`)
  data?.forEach((r: any) => console.log(' ', r.cache_key))
}

main().catch(console.error)
