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
  // ── Previously ingested ──────────────────────────────────────────────────
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

  // ── New sources ───────────────────────────────────────────────────────────
  {
    url: 'https://www.wired2fish.com/news/hehr-and-johnston-win-bassmaster-college-series-event-at-sam-rayburn-reservoir',
    sourceType: 'tournament',
    tournament: 'Bassmaster College Series Sam Rayburn',
    org: 'Bassmaster',
    date: '2023-04-01',
    notes: 'College Series win — techniques and baits used at Sam Rayburn',
  },
  {
    url: 'https://www.wired2fish.com/news/murray-wins-2017-elite-series-on-toledo-bend',
    sourceType: 'tournament',
    tournament: '2017 Bassmaster Elite Toledo Bend',
    org: 'Bassmaster',
    date: '2017-03-01',
    notes: 'Skeet Reese / Shannon Murray Elite win — techniques applicable to Rayburn/Toledo region',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/sam-rayburn-reservoir-fishing-tips',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-06-01',
    notes: 'General Rayburn tips — seasonal patterns, structure fishing',
  },
  {
    url: 'https://www.wired2fish.com/news/bassmaster-open-at-sam-rayburn-reservoir-day-1-report',
    sourceType: 'tournament',
    tournament: 'Bassmaster Open Sam Rayburn',
    org: 'Bassmaster',
    date: '2023-03-01',
    notes: 'Day 1 open report — early tournament techniques and conditions',
  },
  {
    url: 'https://www.wired2fish.com/news/combs-wins-2023-mlf-pro-circuit-on-sam-rayburn',
    sourceType: 'tournament',
    tournament: '2023 MLF Pro Circuit Sam Rayburn',
    org: 'MLF',
    date: '2023-02-01',
    notes: 'Keith Combs MLF Pro Circuit win — deep water patterns',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/how-to-fish-sam-rayburn-reservoir-in-spring',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2023-03-01',
    notes: 'Spring fishing guide for Sam Rayburn — prespawn through postspawn patterns',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/how-to-fish-sam-rayburn-in-the-summer',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-07-01',
    notes: 'Summer tactics at Sam Rayburn — offshore, deep timber, topwater',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/sam-rayburn-fall-fishing-patterns',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-10-01',
    notes: 'Fall fishing patterns on Rayburn — shad spawns, flats, crankbaits',
  },
  {
    url: 'https://www.wired2fish.com/news/mlf-pro-circuit-sam-rayburn-reservoir-2024',
    sourceType: 'tournament',
    tournament: '2024 MLF Pro Circuit Sam Rayburn',
    org: 'MLF',
    date: '2024-02-01',
    notes: '2024 Pro Circuit event — current techniques and winning patterns',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/how-elite-anglers-approach-sam-rayburn-reservoir',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2024-01-01',
    notes: 'Elite angler perspectives on Sam Rayburn — structure, bait selection, depth',
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
