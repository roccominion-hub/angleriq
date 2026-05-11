/**
 * AnglerIQ — Queue Runner
 *
 * Picks up one pending item from ingest_queue, processes it, marks it done or failed.
 * Safe to interrupt at any time and re-run — no source is processed twice.
 *
 * Usage:
 *   npx tsx scripts/ingestion/run-queue.ts           # process 1 item
 *   npx tsx scripts/ingestion/run-queue.ts --batch 5 # process up to 5 items
 *   npx tsx scripts/ingestion/run-queue.ts --state OK # only OK items
 *   npx tsx scripts/ingestion/run-queue.ts --lake "Grand Lake"
 *   npx tsx scripts/ingestion/run-queue.ts --retry   # retry failed items too
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { fetchArticleText, isBlockedDomain } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Parse CLI flags
const args = process.argv.slice(2)
const batchSize  = parseInt(args[args.indexOf('--batch') + 1] || '1')
const filterState = args.includes('--state') ? args[args.indexOf('--state') + 1] : null
const filterLake  = args.includes('--lake')  ? args[args.indexOf('--lake')  + 1] : null
const retryFailed = args.includes('--retry')

async function claimNext(): Promise<any | null> {
  const statusFilter = retryFailed ? ['pending', 'failed'] : ['pending']

  let query = supabase
    .from('ingest_queue')
    .select('*')
    .in('status', statusFilter)
    .filter('attempts', 'lt', 3)
    .order('created_at', { ascending: true })
    .limit(1)

  if (filterState) query = query.eq('state', filterState)
  if (filterLake)  query = query.eq('lake_name', filterLake)

  const { data, error } = await query
  if (error || !data?.length) return null

  const item = data[0]

  // Mark as processing
  await supabase.from('ingest_queue').update({
    status: 'processing',
    attempts: item.attempts + 1,
    updated_at: new Date().toISOString(),
  }).eq('id', item.id)

  return item
}

async function processItem(item: any): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY!
  const label  = item.url?.slice(0, 70) || 'rawText'
  console.log(`\n📍 ${item.lake_name}, ${item.state}`)
  console.log(`   Source: ${label}`)
  if (item.notes) console.log(`   Notes:  ${item.notes}`)

  // Auto-skip domains known to block scrapers — use YouTube or curated rawText instead
  if (item.url && isBlockedDomain(item.url)) {
    throw new Error(`Blocked domain — use YouTube or rawText source instead: ${new URL(item.url).hostname}`)
  }

  const text = item.raw_text ?? await fetchArticleText(item.url!)
  if (!text || text.length < 100) throw new Error('Content too short — skipped')
  console.log(`   ✓ ${text.length} chars fetched`)

  const extracted = await extractFishingData(text, apiKey)
  if (!extracted.length) throw new Error('No qualifying bass data found')
  console.log(`   ✓ ${extracted.length} technique(s) extracted`)

  extracted.forEach((r: any, i: number) => {
    const baits = r.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
    console.log(`     [${i+1}] ${r.angler_name || 'Unknown'} | ${r.pattern || '?'} | ${baits}`)
  })

  await insertTechniqueReport({
    bodyOfWaterName: item.lake_name,
    state:           item.state,
    sourceType:      item.source_type as any,
    sourceUrl:       item.url || 'curated',
    reportedDate:    item.reported_date || null,
    tournamentName:  item.tournament,
    organization:    item.organization,
    extracted,
  })

  console.log('   ✅ Inserted')
}

async function main() {
  console.log(`\n🎣 AnglerIQ Queue Runner`)
  console.log(`   Batch: ${batchSize} | State: ${filterState || 'any'} | Lake: ${filterLake || 'any'} | Retry failed: ${retryFailed}`)

  const { count } = await supabase
    .from('ingest_queue')
    .select('*', { count: 'exact', head: true })
    .in('status', retryFailed ? ['pending', 'failed'] : ['pending'])
    .filter('attempts', 'lt', 3)

  console.log(`   Pending in queue: ${count ?? '?'}`)

  let processed = 0, succeeded = 0, failed = 0

  for (let i = 0; i < batchSize; i++) {
    const item = await claimNext()
    if (!item) { console.log('\n✓ Queue empty — nothing to process'); break }

    processed++
    try {
      await processItem(item)
      await supabase.from('ingest_queue').update({
        status: 'done',
        error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)
      succeeded++
    } catch (e: any) {
      const msg = e.message?.slice(0, 300) || 'Unknown error'
      const isSkip = msg.includes('too short') || msg.includes('No qualifying') || msg.includes('Blocked domain')
      console.error(`   ❌ ${msg}`)
      await supabase.from('ingest_queue').update({
        status: isSkip ? 'skipped' : (item.attempts >= 2 ? 'failed' : 'pending'),
        error: msg,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)
      failed++
    }

    // Rate-limit pause between items
    if (i < batchSize - 1) await new Promise(r => setTimeout(r, 6000))
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Done: ${processed} processed | ${succeeded} succeeded | ${failed} failed/skipped`)
}

main().catch(console.error)
