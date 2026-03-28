/**
 * Batch ingestion for Lake Ray Roberts
 * Run: npx tsx scripts/ingestion/batch-ingest-rayroberts.ts
 */
import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Ray Roberts'
const STATE = 'TX'

const SOURCES = [
  {
    url: 'https://www.wired2fish.com/tournament-fishing/cherry-wins-second-straight-bassmaster-classic-at-ray-roberts',
    sourceType: 'tournament',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'BASS',
    date: '2025-03-01',
    notes: 'Chase Cherry wins back-to-back Bassmaster Classic at Ray Roberts — winner breakdown',
  },
  {
    url: 'https://www.wired2fish.com/news/cherry-takes-lead-on-weather-shortened-day-at-bassmaster-classic-on-lake-ray-roberts',
    sourceType: 'tournament',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'BASS',
    date: '2025-03-01',
    notes: '2025 Classic Day 2 leader — techniques and conditions',
  },
  {
    url: 'https://www.wired2fish.com/fishing-industry-news/bassmaster-classic-matt-arey-has-a-score-to-settle-with-ray-roberts',
    sourceType: 'article',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'Wired2Fish',
    date: '2025-02-01',
    notes: 'Pre-Classic angler preview — patterns and lake knowledge',
  },
  {
    url: 'https://www.bassmaster.com/bassmaster-classic/news/classic-analysis-ray-roberts-day-1/',
    sourceType: 'tournament',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'BASS',
    date: '2025-03-01',
    notes: 'Day 1 Classic analysis — techniques, patterns, conditions',
  },
  {
    url: 'https://www.bassmaster.com/bassmaster-classic/news/classic-sorting-through-the-prespawn-options/',
    sourceType: 'article',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'Bassmaster',
    date: '2025-02-01',
    notes: 'Pre-Classic prespawn options breakdown — structure, techniques, seasonal patterns',
  },
  {
    url: 'https://www.bassmaster.com/bassmaster-classic/news/classic-the-science-of-ray-roberts/',
    sourceType: 'article',
    tournament: undefined,
    org: 'Bassmaster',
    date: '2025-02-01',
    notes: 'Lake Ray Roberts science breakdown — forage, structure, what makes it fish well',
  },
  {
    url: 'https://www.bassmaster.com/bassmaster-classic/news/bold-predictions-for-the-2025-bassmaster-classic/',
    sourceType: 'article',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'Bassmaster',
    date: '2025-02-01',
    notes: 'Expert predictions — key patterns, techniques, conditions expected at Ray Roberts',
  },
  {
    url: 'https://www.bassmaster.com/bassmaster-classic/slideshow/classic-pick-3-at-media-day-2025/',
    sourceType: 'article',
    tournament: '2025 Bass Pro Shops Bassmaster Classic',
    org: 'Bassmaster',
    date: '2025-02-01',
    notes: 'Media day picks — pro anglers share their top 3 patterns for the Classic',
  },
]

async function main() {
  console.log(`\n🎣 Batch Ingestion — ${LAKE}, ${STATE}`)
  console.log(`📦 ${SOURCES.length} sources queued\n`)

  const apiKey = process.env.GEMINI_API_KEY!
  let totalReports = 0
  let errors = 0

  for (const [i, source] of SOURCES.entries()) {
    console.log(`\n[${i + 1}/${SOURCES.length}] ${source.url.slice(0, 70)}`)
    console.log(`     ${source.notes}`)

    try {
      const text = await fetchArticleText(source.url)
      if (!text || text.length < 200) { console.log(`     ⚠️  Too short — skipping`); continue }
      console.log(`     ✓ Fetched ${text.length} chars`)

      const extracted = await extractFishingData(text, apiKey)
      console.log(`     ✓ Extracted ${extracted.length} technique records`)

      if (extracted.length === 0) { console.log(`     ⚠️  No data found — skipping`); continue }

      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(`       [${j + 1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
      })

      await insertTechniqueReport({
        bodyOfWaterName: LAKE,
        state: STATE,
        sourceType: source.sourceType as any,
        sourceUrl: source.url,
        reportedDate: source.date,
        tournamentName: source.tournament,
        organization: source.org,
        extracted,
      })

      totalReports += extracted.length
      console.log(`     ✅ Inserted`)
      await new Promise(r => setTimeout(r, 2000))

    } catch (e: any) {
      console.error(`     ❌ ${e.message?.slice(0, 100)}`)
      errors++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done — ${totalReports} technique reports, ${errors} errors`)
}

main().catch(console.error)
