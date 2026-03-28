/**
 * AnglerIQ — Search-Driven Ingestion
 *
 * The standard repeatable pipeline for any lake:
 *   1. Brave Search  → find real fishing articles for the lake
 *   2. Fetch         → pull article text, filter for quality
 *   3. Gemini        → extract structured technique data
 *   4. Supabase      → insert technique_report + baits
 *
 * Usage:
 *   npx tsx scripts/ingestion/search-and-ingest.ts "Lake Fork" TX
 *   npx tsx scripts/ingestion/search-and-ingest.ts "Wright Patman Lake" TX --dry-run
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Domains known to have quality bass technique content
const QUALITY_DOMAINS = [
  'tpwd.texas.gov',
  'bassmaster.com',
  'wired2fish.com',
  'monsterbass.com',
  'majorleaguefishing.com',
  'flwfishing.com',
  'westernbass.com',
  'bassresource.com',
  'wlf.louisiana.gov',
  'takemefishing.org',
  'gameandfishmag.com',
  'in-fisherman.com',
  'bassangler.com',
  'fishbrain.com',
]

// Domains to skip — low signal or paywalled
const SKIP_DOMAINS = [
  'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'reddit.com',
  'amazon.com', 'ebay.com', 'walmart.com', 'basspro.com', 'cabelas.com',
  'tacklewarehouse.com', 'wikipedia.org',
]

const BRAVE_KEY = process.env.BRAVE_API_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!
const DELAY_MS = 8000  // 8s between Gemini calls → ~7 RPM, safely under free tier

async function braveSearch(query: string, count = 8): Promise<{ url: string; title: string; description: string }[]> {
  const params = new URLSearchParams({ q: query, count: String(count), search_lang: 'en', country: 'US' })
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`Brave API error: ${res.status}`)
  const data = await res.json() as any
  return (data.web?.results || []).map((r: any) => ({ url: r.url, title: r.title, description: r.description || '' }))
}

function isQualityUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (SKIP_DOMAINS.some(d => host.includes(d))) return false
    if (url.endsWith('.pdf')) return false
    // Prefer known quality domains but don't exclude unknown ones
    return true
  } catch { return false }
}

function domainScore(url: string): number {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const idx = QUALITY_DOMAINS.findIndex(d => host.includes(d))
    return idx >= 0 ? QUALITY_DOMAINS.length - idx : 0
  } catch { return 0 }
}

async function searchForLake(lakeName: string, state: string): Promise<{ url: string; title: string }[]> {
  const queries = [
    `"${lakeName}" bass fishing technique pattern`,
    `"${lakeName}" ${state} bass fishing tournament`,
    `"${lakeName}" largemouth bass fishing tips`,
  ]

  const seen = new Set<string>()
  const results: { url: string; title: string; score: number }[] = []

  for (const q of queries) {
    console.log(`  🔍 ${q}`)
    try {
      const hits = await braveSearch(q, 8)
      for (const h of hits) {
        if (!seen.has(h.url) && isQualityUrl(h.url)) {
          seen.add(h.url)
          results.push({ url: h.url, title: h.title, score: domainScore(h.url) })
        }
      }
    } catch (e: any) {
      console.error(`  ⚠️  Search error: ${e.message}`)
    }
    await new Promise(r => setTimeout(r, 1000)) // 1s between search calls
  }

  // Sort: known quality domains first, then others
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // cap at 10 URLs per lake
    .map(({ url, title }) => ({ url, title }))
}

async function getLakeId(lakeName: string, state: string): Promise<string | null> {
  const { data } = await supabase
    .from('body_of_water')
    .select('id')
    .eq('name', lakeName)
    .eq('state', state)
    .maybeSingle()
  return data?.id ?? null
}

async function urlAlreadyIngested(sourceUrl: string): Promise<boolean> {
  const { data } = await supabase
    .from('technique_report')
    .select('id')
    .eq('source_url', sourceUrl)
    .limit(1)
    .maybeSingle()
  return !!data
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const dryRun = process.argv.includes('--dry-run')

  if (args.length < 2) {
    console.error('Usage: npx tsx search-and-ingest.ts "Lake Name" STATE [--dry-run]')
    process.exit(1)
  }

  const [lakeName, state] = args
  console.log(`\n🎣 Search-driven ingestion: ${lakeName}, ${state}${dryRun ? ' (DRY RUN)' : ''}\n`)

  // Verify lake exists in DB
  const lakeId = await getLakeId(lakeName, state)
  if (!lakeId) {
    console.error(`❌ Lake not found in DB: "${lakeName}" / ${state}`)
    process.exit(1)
  }
  console.log(`✓ Lake ID: ${lakeId}\n`)

  // Search for real articles
  console.log('── Searching for articles ──────────────────────────────')
  const candidates = await searchForLake(lakeName, state)
  console.log(`\n  Found ${candidates.length} candidate URLs\n`)

  if (dryRun) {
    console.log('DRY RUN — URLs that would be processed:')
    candidates.forEach((c, i) => console.log(`  [${i+1}] ${c.url}\n       ${c.title}`))
    return
  }

  // Process each URL
  console.log('── Fetching & extracting ───────────────────────────────')
  let total = 0, skipped = 0, errors = 0

  for (const [i, { url, title }] of candidates.entries()) {
    console.log(`\n[${i+1}/${candidates.length}] ${url.slice(0, 80)}`)
    console.log(`     ${title.slice(0, 80)}`)

    // Skip already-ingested URLs
    if (await urlAlreadyIngested(url)) {
      console.log('     ⏭  Already ingested — skipping')
      skipped++
      continue
    }

    // Fetch article text
    let text: string | null = null
    try {
      text = await fetchArticleText(url)
    } catch (e: any) {
      console.log(`     ❌ Fetch failed: ${e.message?.slice(0, 80)}`)
      errors++
      continue
    }

    if (!text || text.length < 400) {
      console.log(`     ⚠️  Too short (${text?.length ?? 0} chars) — skipping`)
      skipped++
      continue
    }
    console.log(`     ✓ ${text.length} chars`)

    // Extract with Gemini
    let extracted: any[] = []
    try {
      extracted = await extractFishingData(text, GEMINI_KEY)
    } catch (e: any) {
      console.log(`     ❌ Extraction failed: ${e.message?.slice(0, 80)}`)
      errors++
      continue
    }

    if (!extracted.length) {
      console.log('     ⚠️  No technique data found — skipping')
      skipped++
      await new Promise(r => setTimeout(r, DELAY_MS))
      continue
    }

    extracted.forEach((item: any, j: number) => {
      const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
      console.log(`       [${j+1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
    })

    // Insert to DB
    try {
      await insertTechniqueReport({
        bodyOfWaterName: lakeName,
        state,
        sourceType: 'article',
        sourceUrl: url,
        reportedDate: new Date().toISOString().slice(0, 10),
        extracted,
      })
      total += extracted.length
      console.log(`     ✅ Inserted ${extracted.length} reports`)
    } catch (e: any) {
      console.log(`     ❌ Insert failed: ${e.message?.slice(0, 80)}`)
      errors++
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`✅ ${lakeName}: ${total} reports inserted, ${skipped} skipped, ${errors} errors`)
}

main().catch(e => { console.error(e); process.exit(1) })
