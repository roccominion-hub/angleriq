import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'E.V. Spence Reservoir'; const STATE = 'TX'
const SOURCES = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/e_v_spence/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD E.V. Spence Reservoir guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=EV+SPENCE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-01', notes: 'TPWD E.V. Spence current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/west-texas-bass-fishing/', sourceType: 'article', org: 'Wired2Fish', date: '2023-01-01', notes: 'West Texas bass fishing — clear water tactics applicable to Spence' },
  { url: 'https://www.bassmaster.com/bass-fishing/west-texas-reservoir-bass/', sourceType: 'article', org: 'Bassmaster', date: '2022-06-01', notes: 'West TX reservoir bass tactics — deep clear water patterns' },
  { url: 'https://www.wired2fish.com/tips-and-techniques/bass-fishing-clear-water-reservoirs/', sourceType: 'article', org: 'Wired2Fish', date: '2023-03-01', notes: 'Clear water bass tactics — drop shot, finesse, deep cranking' },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.GEMINI_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    console.log(`\n[${i+1}/${SOURCES.length}] ${s.url?.slice(0,70)}\n     ${s.notes}`)
    try {
      const text = await fetchArticleText(s.url!)
      if (!text || text.length < 200) { console.log('     ⚠️  Too short — skipping'); continue }
      console.log(`     ✓ ${text.length} chars`)
      const extracted = await extractFishingData(text, apiKey)
      if (!extracted.length) { console.log('     ⚠️  No data — skipping'); continue }
      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(`       [${j+1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
      })
      await insertTechniqueReport({ bodyOfWaterName: LAKE, state: STATE, sourceType: s.sourceType as any, sourceUrl: s.url!, reportedDate: s.date, organization: s.org, extracted })
      total += extracted.length; console.log('     ✅ Inserted')
      await new Promise(r => setTimeout(r, 8000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
