import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Texoma'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://www.wired2fish.com/where-to-fish/where2fish-lake-texoma', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-01-01', notes: 'Comprehensive Texoma guide — striper, largemouth, spotted bass patterns' },
  { url: 'https://www.wired2fish.com/news/hackney-wins-2016-bassfest-on-lake-texoma', sourceType: 'tournament', tournament: '2016 Bassfest Lake Texoma', org: 'Bassmaster', date: '2016-06-01', notes: 'Hackney wins Bassfest — techniques and key areas' },
  { url: 'https://www.wired2fish.com/fishing-tips/ashley-leads-bassfest-on-day-three-on-texoma', sourceType: 'tournament', tournament: '2016 Bassfest Lake Texoma', org: 'Bassmaster', date: '2016-06-02', notes: 'Day 3 Bassfest report — patterns and conditions' },
  { url: 'https://www.wired2fish.com/fishing-tips/flipfest-pitchfest-and-bassfest-on-texoma', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2016-06-01', notes: 'Flipping and pitching tactics on Texoma — structure and bait breakdown' },
  { url: 'https://www.wired2fish.com/news/ashley-leads-2016-bassfest-on-texoma', sourceType: 'tournament', tournament: '2016 Bassfest Lake Texoma', org: 'Bassmaster', date: '2016-06-01', notes: 'Ashley leads Bassfest — early tournament patterns' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/texoma/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Texoma guide — largemouth, spotted, striper, hybrid bass' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-texoma-bass-fishing-guide', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Full Texoma bass fishing guide — structure, patterns, seasonal tactics' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-texoma-spring-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Spring bass fishing on Texoma — prespawn and spawn patterns' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-texoma-fall-bass-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-10-01', notes: 'Fall bass fishing on Texoma — shad schools, topwater, reaction baits' },
  { url: 'https://www.wired2fish.com/bass-fishing/spotted-bass-lake-texoma', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-05-01', notes: 'Spotted bass on Texoma — finesse techniques and key areas' },
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
      await new Promise(r => setTimeout(r, 8000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
