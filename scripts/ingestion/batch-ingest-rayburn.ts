/**
 * Batch ingestion for Sam Rayburn Reservoir
 * Run: npx tsx scripts/ingestion/batch-ingest-rayburn.ts
 */
import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Sam Rayburn Reservoir'
const STATE = 'TX'

const SOURCES = [
  {
    url: 'https://www.wired2fish.com/where-to-fish/an-inside-look-at-sam-rayburn-reservoir',
    sourceType: 'article',
    tournament: undefined,
    org: undefined,
    date: '2023-01-01',
    notes: 'Comprehensive lake guide — structure, patterns, seasonal tendencies',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/truth-behind-41-pound-bag-sam-rayburn',
    sourceType: 'tournament',
    tournament: 'Sam Rayburn Big Bag',
    org: 'Wired2Fish',
    date: '2023-06-01',
    notes: 'Technique breakdown for a 41lb bag on Sam Rayburn',
  },
  {
    url: 'https://www.wired2fish.com/news/gill-wins-2024-mlf-invitational-on-sam-rayburn',
    sourceType: 'tournament',
    tournament: '2024 MLF Invitational Sam Rayburn',
    org: 'MLF',
    date: '2024-01-01',
    notes: 'MLF Invitational win — techniques and baits',
  },
  {
    url: 'https://www.wired2fish.com/news/keith-combs-wins-toyota-series-event-on-sam-rayburn-reservoir',
    sourceType: 'tournament',
    tournament: 'Toyota Series Sam Rayburn',
    org: 'MLF Toyota Series',
    date: '2022-03-01',
    notes: 'Keith Combs win — deep cranking patterns',
  },
  {
    url: 'https://www.bassmaster.com/column/darold-gleason/tips-to-find-offshore-confidence/',
    sourceType: 'article',
    tournament: undefined,
    org: 'Bassmaster',
    date: '2022-07-01',
    notes: 'Darold Gleason (Sam Rayburn/Toledo Bend guide) — offshore technique column',
  },
  {
    url: 'https://www.bassmaster.com/member-how-to/member-news/oversized-baits-for-oversized-bass/',
    sourceType: 'article',
    tournament: undefined,
    org: 'Bassmaster',
    date: '2022-01-01',
    notes: 'Darold Gleason on big baits for Sam Rayburn/Toledo Bend',
  },
]

async function main() {
  console.log(`\n🎣 Batch Ingestion — ${LAKE}, ${STATE}`)
  console.log(`📦 ${SOURCES.length} sources queued\n`)

  const apiKey = process.env.ANTHROPIC_API_KEY!
  let totalReports = 0
  let errors = 0

  for (const [i, source] of SOURCES.entries()) {
    console.log(`\n[${i + 1}/${SOURCES.length}] ${source.url.slice(0, 70)}`)
    console.log(`     Type: ${source.sourceType} | ${source.notes}`)

    try {
      const text = await fetchArticleText(source.url)
      if (!text || text.length < 200) {
        console.log(`     ⚠️  Too short or empty — skipping`)
        continue
      }
      console.log(`     ✓ Fetched ${text.length} chars`)

      const extracted = await extractFishingData(text, apiKey)
      console.log(`     ✓ Extracted ${extracted.length} technique records`)

      if (extracted.length === 0) {
        console.log(`     ⚠️  No fishing data found — skipping`)
        continue
      }

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

      // Rate limit AI calls
      await new Promise(r => setTimeout(r, 2000))

    } catch (e: any) {
      console.error(`     ❌ Error: ${e.message?.slice(0, 100)}`)
      errors++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done — ${totalReports} technique reports inserted, ${errors} errors`)
  console.log(`   Lake: ${LAKE} | Sources processed: ${SOURCES.length - errors}`)
}

main().catch(console.error)
