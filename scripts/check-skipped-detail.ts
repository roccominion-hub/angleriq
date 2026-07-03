import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('ingest_queue')
    .select('id, lake_name, state, url, status, error, updated_at')
    .in('status', ['failed', 'skipped', 'done'])
    .order('updated_at', { ascending: false })
    .limit(30)

  console.log('\nRecently processed items:')
  for (const r of data ?? []) {
    console.log(`  [${r.state}] ${r.lake_name} — ${r.status}  (${r.updated_at})`)
    if (r.url) console.log(`    URL: ${r.url.slice(0, 100)}`)
    if (r.error) console.log(`    ERR: ${r.error.slice(0, 120)}`)
  }

  // Check pending items
  const { data: pending } = await sb.from('ingest_queue')
    .select('id, lake_name, state, url, source_type')
    .eq('status', 'pending')
    .order('state')
    .limit(20)
  console.log('\nSample pending items:')
  for (const r of pending ?? []) {
    const src = r.url ? r.url.slice(0,80) : `[rawText ${r.source_type}]`
    console.log(`  [${r.state}] ${r.lake_name}: ${src}`)
  }
}
main().catch(console.error)
