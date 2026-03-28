import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Amistad'; const STATE = 'TX'

// Amistad — international US/Mexico reservoir, legendary for big smallmouth and largemouth, clear water, rock structure
const SOURCES = [
  { url: 'https://www.wired2fish.com/news/perkins-wins-2024-npfl-championship-at-amistad', sourceType: 'tournament', tournament: '2024 NPFL Championship Amistad', org: 'NPFL', date: '2024-10-01', notes: 'Perkins wins 2024 NPFL Championship at Amistad — techniques and key baits' },
  { url: 'https://www.wired2fish.com/news/williamson-wins-with-big-day-at-amistad', sourceType: 'tournament', tournament: 'Amistad Bass Open', org: 'Independent', date: '2023-03-01', notes: 'Williamson big day win on Amistad — patterns and presentation' },
  { url: 'https://www.wired2fish.com/news/allen-leads-2014-bass-open-on-amistad', sourceType: 'tournament', tournament: '2014 Bass Open Amistad', org: 'Bassmaster', date: '2014-03-01', notes: 'Bass Open on Amistad — clear water patterns and techniques' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/amistad/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Amistad guide — smallmouth, largemouth, rocky structure, clear water' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-amistad-fishing-guide', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-02-01', notes: 'Comprehensive Amistad fishing guide — tactics for clear water rocky terrain' },
  { url: 'https://www.wired2fish.com/bass-fishing/smallmouth-bass-fishing-tips', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-04-01', notes: 'Smallmouth bass tactics — Amistad has trophy smallmouth population' },
  { url: 'https://www.wired2fish.com/bass-fishing/how-to-catch-bass-on-clear-water-lakes', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-09-01', notes: 'Clear water bass tactics — critical for Amistad approach' },
  { url: 'https://www.wired2fish.com/bass-fishing/rock-structure-bass-fishing-tips', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-05-01', notes: 'Rock structure bass tactics — core Amistad pattern year-round' },
  { url: 'https://www.wired2fish.com/bass-fishing/amistad-reservoir-spring-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Spring fishing on Amistad — prespawn on flats, rocky points, bluffs' },
  { url: 'https://www.wired2fish.com/bass-fishing/drop-shot-fishing-clear-water', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-07-01', notes: 'Drop shot in clear water — go-to finesse technique on Amistad' },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.GEMINI_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    console.log(`\n[${i+1}/${SOURCES.length}] ${s.url.slice(0,70)}\n     ${s.notes}`)
    try {
      const text = await fetchArticleText(s.url)
      if (!text || text.length < 200) { console.log('     ⚠️  Too short — skipping'); continue }
      console.log(`     ✓ ${text.length} chars`)
      const extracted = await extractFishingData(text, apiKey)
      if (!extracted.length) { console.log('     ⚠️  No data — skipping'); continue }
      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(`       [${j+1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
      })
      await insertTechniqueReport({ bodyOfWaterName: LAKE, state: STATE, sourceType: s.sourceType as any, sourceUrl: s.url, reportedDate: s.date, tournamentName: s.tournament, organization: s.org, extracted })
      total += extracted.length; console.log('     ✅ Inserted')
      await new Promise(r => setTimeout(r, 5000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
