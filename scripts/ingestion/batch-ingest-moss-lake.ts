import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Moss Lake'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/moss/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2024-01-01', notes: 'TPWD Moss Lake fishing guide — structure, species, tips & tactics' },
  { url: 'https://tpwd.texas.gov/publications/pwdpubs/lake_survey/pwd_rp_t3200_1342/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Moss Lake survey report' },
  { url: 'https://www.takemefishing.org/texas/fishing/lakes-rivers/moss-lake/', sourceType: 'article', tournament: undefined, org: 'TakeMeFishing', date: '2023-01-01', notes: 'Moss Lake fishing overview' },
  { url: 'https://www.texasfishingforum.com/search/?q=moss+lake+bass&o=date', sourceType: 'forum', tournament: undefined, org: 'Texas Fishing Forum', date: '2024-01-01', notes: 'TFF forum search — Moss Lake bass fishing reports' },
  { url: 'https://www.texasfishingforum.com/search/?q=hubert+moss+bass&o=date', sourceType: 'forum', tournament: undefined, org: 'Texas Fishing Forum', date: '2024-01-01', notes: 'TFF forum search — Hubert Moss Lake bass fishing' },
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
