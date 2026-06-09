/**
 * AnglerIQ — State-Level Queue Seeder
 *
 * For each lake in a given state (or list of states):
 *   1. Brave Search → find fishing article / tournament URLs
 *   2. HEAD-verify  → confirm URL resolves (skip 404s before GH Actions wastes Gemini on them)
 *   3. ingest_queue → insert as 'pending' (GH Actions run-queue.ts handles fetch + Gemini)
 *
 * Usage:
 *   npx tsx scripts/ingestion/seed-state-queue.ts TN
 *   npx tsx scripts/ingestion/seed-state-queue.ts TN MS MO
 *   npx tsx scripts/ingestion/seed-state-queue.ts --all-remaining
 *   npx tsx scripts/ingestion/seed-state-queue.ts TN --dry-run
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRAVE_KEY = process.env.BRAVE_API_KEY!

// All remaining states not yet well-seeded
const REMAINING_STATES = ['TN', 'MS', 'MO', 'CA', 'AL', 'GA', 'FL', 'NY', 'MI']

// State-specific quality domains (fish & wildlife agency pages per state)
const STATE_AGENCY_DOMAINS: Record<string, string> = {
  TN: 'tnwildlife.org',
  MS: 'mdwfp.com',
  MO: 'mdc.mo.gov',
  CA: 'wildlife.ca.gov',
  AL: 'outdooralabama.com',
  GA: 'georgiawildlife.com',
  FL: 'myfwc.com',
  NY: 'dec.ny.gov',
  MI: 'michigan.gov/dnr',
  AR: 'agfc.com',
  LA: 'wlf.louisiana.gov',
  OK: 'wildlifedepartment.com',
  TX: 'tpwd.texas.gov',
}

// Domains with real technique content
const QUALITY_DOMAINS = [
  'bassmaster.com',
  'bassblaster.rocks',
  'wired2fish.com',
  'monsterbass.com',
  'westernbass.com',
  'bassresource.com',
  'gameandfishmag.com',
  'in-fisherman.com',
  'bassangler.com',
  'takemefishing.org',
  'flwfishing.com',
  'majorleaguefishing.com', // blocked for fetching but Brave may find good articles on mirror sites
]

// Domains to skip entirely — low signal, paywalled, or blocked
const SKIP_DOMAINS = [
  'youtube.com', 'youtu.be',
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'reddit.com', 'tiktok.com',
  'amazon.com', 'ebay.com', 'walmart.com',
  'basspro.com', 'cabelas.com', 'tacklewarehouse.com',
  'wikipedia.org', 'wikimapia.org',
  'yelp.com', 'tripadvisor.com',
  'maps.google.com', 'google.com/maps',
  'majorleaguefishing.com', 'mlf.fish',  // blocked scraper
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const allRemaining = args.includes('--all-remaining')
const stateArgs = args.filter(a => !a.startsWith('--') && a.length === 2 && a === a.toUpperCase())
const targetStates = allRemaining ? REMAINING_STATES : stateArgs

if (targetStates.length === 0) {
  console.error('Usage: npx tsx seed-state-queue.ts STATE [STATE...] [--dry-run]')
  console.error('       npx tsx seed-state-queue.ts --all-remaining')
  process.exit(1)
}

// ── Brave Search ─────────────────────────────────────────────────────────────

async function braveSearch(query: string, count = 8): Promise<{ url: string; title: string }[]> {
  const params = new URLSearchParams({ q: query, count: String(count), search_lang: 'en', country: 'US' })
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) { console.warn(`  ⚠️  Brave ${res.status} for: ${query.slice(0, 60)}`); return [] }
    const data = await res.json() as any
    return (data.web?.results || []).map((r: any) => ({ url: r.url, title: r.title || '' }))
  } catch (e: any) {
    console.warn(`  ⚠️  Brave error: ${e.message?.slice(0, 60)}`)
    return []
  }
}

function isUsableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (SKIP_DOMAINS.some(d => host === d || host.endsWith('.' + d))) return false
    if (url.endsWith('.pdf') || url.endsWith('.doc')) return false
    return true
  } catch { return false }
}

function domainScore(url: string): number {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const idx = QUALITY_DOMAINS.findIndex(d => host.includes(d))
    return idx >= 0 ? QUALITY_DOMAINS.length - idx : 0
  } catch { return 0 }
}

async function findUrlsForLake(lakeName: string, state: string): Promise<{ url: string; title: string }[]> {
  const agencyDomain = STATE_AGENCY_DOMAINS[state] ?? ''
  const queries = [
    `"${lakeName}" bass fishing technique tips ${state}`,
    `"${lakeName}" bass fishing tournament pattern`,
    `"${lakeName}" largemouth bass fishing tips lure`,
    `"${lakeName}" bass fishing report crankbait jig`,
    `site:bassmaster.com "${lakeName}"`,
    `site:bassblaster.rocks "${lakeName}"`,
    `site:wired2fish.com "${lakeName}" bass`,
    ...(agencyDomain ? [`site:${agencyDomain} "${lakeName}"`] : []),
  ]

  const seen = new Set<string>()
  const results: { url: string; title: string; score: number }[] = []

  for (const q of queries) {
    const hits = await braveSearch(q, 8)
    for (const h of hits) {
      if (!seen.has(h.url) && isUsableUrl(h.url)) {
        seen.add(h.url)
        results.push({ url: h.url, title: h.title, score: domainScore(h.url) })
      }
    }
    await sleep(1200) // stay well under Brave rate limit
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ url, title }) => ({ url, title }))
}

// ── URL Verification ──────────────────────────────────────────────────────────

async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AnglerIQ-bot/1.0)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    // Accept 200-399; treat 403/429 as "probably there" (bot-blocked but exists)
    return res.status < 404 || res.status === 403 || res.status === 429
  } catch {
    return false
  }
}

// ── Duplicate Checks ──────────────────────────────────────────────────────────

async function alreadyQueued(url: string): Promise<boolean> {
  const { data } = await supabase
    .from('ingest_queue')
    .select('id')
    .eq('url', url)
    .limit(1)
    .maybeSingle()
  return !!data
}

async function alreadyIngested(url: string): Promise<boolean> {
  const { data } = await supabase
    .from('technique_report')
    .select('id')
    .eq('source_url', url)
    .limit(1)
    .maybeSingle()
  return !!data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedLake(lake: { id: string; name: string; state: string }): Promise<{ queued: number; skipped: number; failed: number }> {
  const stats = { queued: 0, skipped: 0, failed: 0 }

  console.log(`\n  🔍 ${lake.name}, ${lake.state}`)
  const candidates = await findUrlsForLake(lake.name, lake.state)
  console.log(`     ${candidates.length} candidates from Brave`)

  for (const { url, title } of candidates) {
    // Skip if already in queue or already ingested
    if (await alreadyQueued(url) || await alreadyIngested(url)) {
      stats.skipped++
      continue
    }

    // HEAD-verify before inserting
    const resolves = await urlResolves(url)
    if (!resolves) {
      console.log(`     ✗ 404/dead: ${url.slice(0, 80)}`)
      stats.failed++
      continue
    }

    if (dryRun) {
      console.log(`     [DRY RUN] would queue: ${url.slice(0, 80)}`)
      stats.queued++
      continue
    }

    const { error } = await supabase.from('ingest_queue').insert({
      lake_name: lake.name,
      state: lake.state,
      source_type: url.includes('bassmaster.com') || url.includes('bassblaster.rocks') || url.includes('flwfishing') ? 'tournament' : 'article',
      url,
      notes: title.slice(0, 200),
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
    })

    if (error) {
      console.warn(`     ⚠️  Insert error: ${error.message?.slice(0, 80)}`)
      stats.failed++
    } else {
      console.log(`     ✓ queued: ${url.slice(0, 80)}`)
      stats.queued++
    }

    await sleep(300)
  }

  return stats
}

async function main() {
  console.log(`\n🎣 AnglerIQ Queue Seeder`)
  console.log(`   States: ${targetStates.join(', ')}`)
  console.log(`   Mode:   ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  let totalQueued = 0, totalSkipped = 0, totalFailed = 0

  for (const state of targetStates) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`  STATE: ${state}`)
    console.log(`${'═'.repeat(60)}`)

    // Get all lakes for this state (including border lakes)
    const { data: lakes, error } = await supabase
      .from('body_of_water')
      .select('id, name, state')
      .or(`state.eq.${state},state.ilike.${state}/%,state.ilike.%/${state}`)
      .order('name')

    if (error || !lakes?.length) {
      console.warn(`  ⚠️  No lakes found for ${state}`)
      continue
    }

    console.log(`  ${lakes.length} lakes to process\n`)

    for (const lake of lakes) {
      const stats = await seedLake(lake)
      totalQueued  += stats.queued
      totalSkipped += stats.skipped
      totalFailed  += stats.failed

      // Brief pause between lakes to be a polite Brave API citizen
      await sleep(2000)
    }

    console.log(`\n  ── ${state} done: +${totalQueued} queued so far ──`)
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✅ COMPLETE`)
  console.log(`   URLs queued:  ${totalQueued}`)
  console.log(`   Skipped:      ${totalSkipped} (already queued/ingested)`)
  console.log(`   Dead links:   ${totalFailed}`)
  console.log(`\n   GH Actions will process the queue every 6 hours.`)
  console.log(`   Trigger manually: GitHub → Actions → "Ingest Queue Runner" → Run workflow`)
  console.log(`${'═'.repeat(60)}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
