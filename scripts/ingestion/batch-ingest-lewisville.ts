import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Lewisville'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://www.wired2fish.com/news/chapman-wins-fish-off-at-bassmaster-open', sourceType: 'tournament', tournament: 'Bassmaster Central Open Lewisville', org: 'B.A.S.S.', date: '2013-02-01', notes: 'Brent Chapman wins Bassmaster Central Open at Lewisville — wacky rig, umbrella rig patterns' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/lewisville/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Lewisville fishing guide — structure, species, tips and tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LEWISVILLE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2026-02-25', notes: 'TPWD Lewisville weekly fishing report — current conditions and techniques' },
  { url: 'https://tpwd.texas.gov/publications/pwdpubs/lake_survey/pwd_rp_t3200_1324/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2024-01-01', notes: 'TPWD Lewisville Reservoir 2023-2024 fishery survey report — bass population and habitat' },
  { url: 'https://www.wired2fish.com/news/bassmaster-central-open-at-lewisville-lake-postponed', sourceType: 'tournament', tournament: 'Bassmaster Central Open Lewisville', org: 'B.A.S.S.', date: '2020-03-01', notes: 'Bassmaster Central Open at Lewisville 2020 — event details and lake preview' },
  { url: 'https://www.bassmaster.com/opens/news/central-open-lewisville-lake-day-1/', sourceType: 'tournament', tournament: 'Bassmaster Central Open Lewisville', org: 'B.A.S.S.', date: '2013-02-01', notes: 'Bassmaster Central Open Lewisville Day 1 coverage — early patterns and leaders' },
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
