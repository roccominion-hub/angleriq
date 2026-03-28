import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const STATE = 'TX'

const LAKES = [
  {
    name: 'Lake Graham',
    sources: [
      { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/graham/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Graham fishing guide' },
      { url: 'https://www.bassresource.com/lakes/graham-texas/', sourceType: 'article', tournament: undefined, org: 'BassResource', date: '2022-06-01', notes: 'BassResource Lake Graham guide' },
      { url: 'https://www.takemefishing.org/texas/fishing/lakes-rivers/lake-graham/', sourceType: 'article', tournament: undefined, org: 'TakeMeFishing', date: '2022-01-01', notes: 'Lake Graham fishing overview' },
      { url: 'https://www.wired2fish.com/bass-fishing/lake-graham-texas-bass-fishing', sourceType: 'article', tournament: undefined, org: 'Wired2Fish', date: '2022-05-01', notes: 'Bass fishing tips for Lake Graham TX' },
    ]
  },
  {
    name: 'Lake Eddleman',
    sources: [
      { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/eddleman/', sourceType: 'article', tournament: undefined, org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Eddleman fishing guide' },
      { url: 'https://www.takemefishing.org/texas/fishing/lakes-rivers/lake-eddleman/', sourceType: 'article', tournament: undefined, org: 'TakeMeFishing', date: '2022-01-01', notes: 'Lake Eddleman fishing overview' },
      { url: 'https://www.bassresource.com/lakes/eddleman-texas/', sourceType: 'article', tournament: undefined, org: 'BassResource', date: '2022-06-01', notes: 'BassResource Lake Eddleman guide' },
    ]
  }
]

async function main() {
  const apiKey = process.env.GEMINI_API_KEY!
  for (const lake of LAKES) {
    console.log(`\n🎣 ${lake.name} — ${lake.sources.length} sources`)
    let total = 0, errors = 0
    for (const [i, s] of lake.sources.entries()) {
      console.log(`\n[${i+1}/${lake.sources.length}] ${s.url.slice(0,70)}\n     ${s.notes}`)
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
        await insertTechniqueReport({ bodyOfWaterName: lake.name, state: STATE, sourceType: s.sourceType as any, sourceUrl: s.url, reportedDate: s.date, tournamentName: s.tournament, organization: s.org, extracted })
        total += extracted.length; console.log('     ✅ Inserted')
        await new Promise(r => setTimeout(r, 2000))
      } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
    }
    console.log(`\n${'─'.repeat(50)}\n✅ ${lake.name}: ${total} reports, ${errors} errors`)
  }
}
main().catch(console.error)
