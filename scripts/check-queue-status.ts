import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: summary } = await sb.from('ingest_queue').select('status, state').order('state')
  const counts: Record<string, Record<string, number>> = {}
  for (const r of summary ?? []) {
    if (!counts[r.state]) counts[r.state] = {}
    counts[r.state][r.status] = (counts[r.state][r.status] || 0) + 1
  }
  console.log('\nQueue status by state:')
  console.log(JSON.stringify(counts, null, 2))

  const { count } = await sb.from('technique_report').select('*', { count: 'exact', head: true })
  console.log('\nTotal technique_reports:', count)

  // Show any failed/skipped items with errors
  const { data: failed } = await sb.from('ingest_queue')
    .select('lake_name, state, url, status, error')
    .in('status', ['failed', 'skipped'])
    .order('state')
    .limit(40)
  if (failed?.length) {
    console.log('\nFailed/skipped items:')
    for (const f of failed) {
      console.log(`  [${f.state}] ${f.lake_name} — ${f.status}: ${(f.error ?? 'no error').slice(0,120)}`)
    }
  }
}
main().catch(console.error)
