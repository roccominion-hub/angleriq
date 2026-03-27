import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Conroe'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://www.wired2fish.com/news/combs-wins-second-ttbc-on-lake-conroe', sourceType: 'tournament', tournament: 'TTBC Lake Conroe', org: 'TTBC', date: '2023-03-01', notes: 'Keith Combs wins TTBC on Conroe — patterns and baits' },
  { url: 'https://www.wired2fish.com/news/evers-wins-toyota-bonus-bucks-on-conroe', sourceType: 'tournament', tournament: 'Toyota Bonus Bucks Conroe', org: 'Toyota', date: '2022-03-01', notes: 'Edwin Evers wins on Conroe — technique breakdown' },
  { url: 'https://www.wired2fish.com/news/mlf-names-conroe-as-second-bass-pro-tour-event', sourceType: 'article', tournament: undefined, org: 'MLF', date: '2023-01-01', notes: 'MLF Bass Pro Tour Conroe preview — lake overview and patterns' },
  { url: 'https://www.wired2fish.com/where-to-fish/lake-conroe-fishing-guide', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-02-01', notes: 'Comprehensive Conroe fishing guide' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-conroe-spring-bass-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Spring bass fishing on Lake Conroe' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-conroe-summer-fishing-patterns', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-07-01', notes: 'Summer patterns on Conroe — offshore, timber, hydrilla' },
  { url: 'https://www.wired2fish.com/bass-fishing/lake-conroe-fall-bass-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-10-01', notes: 'Fall fishing on Lake Conroe' },
  { url: 'https://www.bassmaster.com/tournament-coverage/bass-pro-tour-lake-conroe', sourceType: 'tournament', tournament: 'Bass Pro Tour Lake Conroe', org: 'MLF', date: '2023-03-01', notes: 'MLF BPT Conroe event coverage — techniques and patterns' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/conroe/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Conroe fishing guide — structure, species, seasonal info' },
  { url: 'https://www.wired2fish.com/bass-fishing/how-to-fish-hydrilla-lake-conroe', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-05-01', notes: 'Hydrilla fishing tactics on Conroe — punching, frogs, swim jigs' },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.ANTHROPIC_API_KEY!
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
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
