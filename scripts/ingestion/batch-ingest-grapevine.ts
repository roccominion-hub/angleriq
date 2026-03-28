import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Grapevine'; const STATE = 'TX'

const SOURCES = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/grapevine/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Grapevine fishing guide — largemouth, smallmouth, spotted bass info and tactics' },
  { url: 'https://tpwd.texas.gov/publications/pwdpubs/lake_survey/pwd_rp_t3200_1302/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2024-01-01', notes: 'TPWD Grapevine Reservoir 2023 fishery survey — bass populations, habitat, management' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=GRAPEVINE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2026-02-25', notes: 'TPWD Grapevine weekly fishing report — current conditions and techniques' },
  { url: 'https://www.wired2fish.com/news/hanselman-wins-record-third-straight-rayovac', sourceType: 'tournament', tournament: 'Rayovac FLW Series Texas Division', org: 'FLW', date: '2014-03-01', notes: 'Rayovac FLW Series Texas Division — bass patterns with Strike King Sexy Frog' },
  { url: 'https://www.bassmaster.com/opens/news/lewisville-grapevine-bass-fishing/', sourceType: 'article', tournament: undefined, org: 'B.A.S.S.', date: '2022-06-01', notes: 'DFW area lake bass fishing overview — Grapevine and Lewisville patterns' },
  { url: 'https://www.wired2fish.com/bass-fishing/smallmouth-bass-texas-lake-grapevine', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-05-01', notes: 'Smallmouth bass fishing at Lake Grapevine Texas — techniques and locations' },
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
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
