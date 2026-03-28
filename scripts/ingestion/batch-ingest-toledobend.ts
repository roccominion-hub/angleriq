/**
 * Batch ingestion for Toledo Bend Reservoir
 * Run: npx tsx scripts/ingestion/batch-ingest-toledobend.ts
 */
import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Toledo Bend Reservoir'
const STATE = 'TX'

const SOURCES = [
  // ── Tournament Results ────────────────────────────────────────────────────
  {
    url: 'https://www.wired2fish.com/news/fujita-wins-elite-series-opener-on-toledo-bend-with-100-pounds',
    sourceType: 'tournament',
    tournament: '2024 Bassmaster Elite Toledo Bend',
    org: 'Bassmaster',
    date: '2024-02-01',
    notes: 'Fujita wins with 100lbs — offshore suspended bass, forward-facing sonar, deep timber',
  },
  {
    url: 'https://www.wired2fish.com/news/connell-wins-2024-bpt-first-stop-on-toledo-bend',
    sourceType: 'tournament',
    tournament: '2024 Bass Pro Tour Toledo Bend',
    org: 'MLF',
    date: '2024-01-01',
    notes: 'Dustin Connell wins BPT with 112lbs — dominant pattern and key baits',
  },
  {
    url: 'https://www.wired2fish.com/news/gleason-wins-2019-open-on-toledo-bend',
    sourceType: 'tournament',
    tournament: '2019 Bassmaster Open Toledo Bend',
    org: 'Bassmaster',
    date: '2019-03-01',
    notes: 'Darold Gleason (local guide) wins open — offshore structure, current breaks, cold conditions',
  },
  {
    url: 'https://www.wired2fish.com/news/cody-huff-wins-2020-toyota-series-on-toledo-bend',
    sourceType: 'tournament',
    tournament: '2020 Toyota Series Toledo Bend',
    org: 'MLF Toyota Series',
    date: '2020-01-30',
    notes: 'Cody Huff wins with jigging spoon on suspended bass — Ozarks-style approach on Toledo Bend',
  },
  {
    url: 'https://www.wired2fish.com/news/murray-wins-2017-elite-series-on-toledo-bend',
    sourceType: 'tournament',
    tournament: '2017 Bassmaster Elite Toledo Bend',
    org: 'Bassmaster',
    date: '2017-03-01',
    notes: '2017 Elite Series win on Toledo Bend — patterns and key baits',
  },
  {
    url: 'https://www.wired2fish.com/news/milliken-dominates-at-toledo-bend-bass-open',
    sourceType: 'tournament',
    tournament: 'Toledo Bend Bass Open',
    org: 'Independent',
    date: '2023-04-01',
    notes: 'Milliken dominates Toledo Bend open — patterns and technique breakdown',
  },

  // ── Lake Guides & Seasonal Articles ──────────────────────────────────────
  {
    url: 'https://www.wired2fish.com/where-to-fish/an-inside-look-at-toledo-bend-reservoir',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2023-01-01',
    notes: 'Comprehensive Toledo Bend guide — structure, species, seasonal patterns',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/toledo-bend-fishing-tips',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-06-01',
    notes: 'General Toledo Bend fishing tips — structure, timber, depth',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/how-to-fish-toledo-bend-reservoir-in-spring',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2023-02-01',
    notes: 'Spring fishing on Toledo Bend — prespawn to postspawn patterns',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/toledo-bend-summer-fishing-patterns',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-07-01',
    notes: 'Summer patterns on Toledo Bend — deep timber, suspended bass, offshore structure',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/toledo-bend-fall-fishing',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2022-10-01',
    notes: 'Fall Toledo Bend fishing — shad patterns, flats, topwater opportunities',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/toledo-bend-winter-bass-fishing',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2023-01-01',
    notes: 'Winter bass fishing on Toledo Bend — cold water patterns, deep structure',
  },

  // ── Technique Deep Dives ──────────────────────────────────────────────────
  {
    url: 'https://www.bassmaster.com/column/darold-gleason/tips-to-find-offshore-confidence/',
    sourceType: 'article',
    tournament: undefined,
    org: 'Bassmaster',
    date: '2022-07-01',
    notes: 'Darold Gleason (Toledo Bend guide) — offshore confidence techniques, applicable to Toledo Bend',
  },
  {
    url: 'https://www.bassmaster.com/member-how-to/member-news/oversized-baits-for-oversized-bass/',
    sourceType: 'article',
    tournament: undefined,
    org: 'Bassmaster',
    date: '2022-01-01',
    notes: 'Big bait strategies from Toledo Bend local Darold Gleason',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/fishing-deep-standing-timber-toledo-bend',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2023-05-01',
    notes: 'Deep timber techniques on Toledo Bend — jigs, drop shots, swimbait setups',
  },
  {
    url: 'https://www.wired2fish.com/bass-fishing/forward-facing-sonar-toledo-bend-suspended-bass',
    sourceType: 'article',
    tournament: undefined,
    org: 'Wired2Fish',
    date: '2024-03-01',
    notes: 'Forward-facing sonar approach for suspended bass in Toledo Bend timber',
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
      await new Promise(r => setTimeout(r, 8000))

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
