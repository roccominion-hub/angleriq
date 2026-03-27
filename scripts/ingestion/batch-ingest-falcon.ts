import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Falcon Lake'; const STATE = 'TX'

// Falcon is legendary for giant largemouth — big swimbaits, topwater, big crankbaits
const SOURCES = [
  { url: 'https://www.wired2fish.com/news/klein-catches-big-bass-at-falcon-lake', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-02-01', notes: 'Giant bass at Falcon — technique and bait used' },
  { url: 'https://www.wired2fish.com/record-fish-news/new-falcon-lake-record-bass', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-01-01', notes: 'Falcon record bass — setup, bait, conditions' },
  { url: 'https://www.wired2fish.com/opinions-philosophies/the-other-perspective-on-falcon-lake', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-06-01', notes: 'Deep perspective on Falcon fishing — local knowledge, seasonal patterns, tactics' },
  { url: 'https://www.wired2fish.com/bass-fishing/unorthodox-crankbaits-the-ultimate-trophy-bass-trickery', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Trophy bass crankbait tactics — Falcon-style big fish approach' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/falcon/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Falcon Lake guide — species, structure, international lake access' },
  { url: 'https://www.wired2fish.com/bass-fishing/falcon-lake-fishing-guide', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-02-01', notes: 'Comprehensive Falcon Lake fishing guide' },
  { url: 'https://www.wired2fish.com/bass-fishing/swimbait-fishing-for-big-bass', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-04-01', notes: 'Big swimbait tactics for giant bass — essential Falcon Lake pattern' },
  { url: 'https://www.wired2fish.com/bass-fishing/falcon-lake-spring-bass-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-03-01', notes: 'Spring fishing on Falcon — prespawn giants on shallow flats' },
  { url: 'https://www.wired2fish.com/bass-fishing/falcon-lake-winter-big-bass', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-01-01', notes: 'Winter trophy bass on Falcon — deep structure, big swimbaits' },
  { url: 'https://www.wired2fish.com/fishing-videos/tips-for-frog-fishing-bass-on-grass-lakes-modern-approach', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2023-06-01', notes: 'Frog fishing on grass lakes — Falcon has hydrilla and emergent vegetation' },
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
