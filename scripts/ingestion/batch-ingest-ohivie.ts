import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'O.H. Ivie Reservoir'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://www.wired2fish.com/where-to-fish/texas-big-factory-o-h-ivie-lake', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-01-01', notes: 'OHI deep dive — why it produces giants, structure, techniques' },
  { url: 'https://www.wired2fish.com/news/15-82lb-lunker-from-o-h-ivie', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-02-01', notes: '15.82lb bass from OHI — conditions, bait, presentation' },
  { url: 'https://www.wired2fish.com/news/16-02-pound-bass-caught-at-o-h-ivie', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2024-01-01', notes: '16lb OHI giant — technique and setup details' },
  { url: 'https://www.wired2fish.com/news/texas-stocks-300000-genetically-superior-largemouths-into-o-h-ivie', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-06-01', notes: 'TPWD stocking program context — why OHI produces trophy bass' },
  { url: 'https://www.wired2fish.com/news/2026s-first-13-plus-pound-texas-legacy-bass-caught-last-year-in-o-h-ivie', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2026-01-01', notes: '2026 legacy class bass — technique, conditions, bait' },
  { url: 'https://www.wired2fish.com/bass-fishing/the-best-bass-fishing-lakes-in-texas', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-01-01', notes: 'Best Texas lakes guide — OHI section covers key patterns' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/oh_ivie/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD OHI lake guide — structure, access, fishing info' },
  { url: 'https://www.wired2fish.com/bass-fishing/trophy-bass-fishing-texas-lakes', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-06-01', notes: 'Trophy bass tactics in Texas — relevant to OHI big bass patterns' },
  { url: 'https://www.wired2fish.com/bass-fishing/oh-ivie-bass-fishing-tips', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-05-01', notes: 'OHI seasonal bass fishing tips' },
  { url: 'https://www.wired2fish.com/bass-fishing/winter-bass-fishing-texas-reservoirs', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-01-01', notes: 'Winter bass fishing in Texas reservoirs — applicable to OHI' },
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
