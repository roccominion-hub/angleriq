import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'
import { findTffThreadsForLake } from './tff-utils'

const LAKE = 'Lake Granbury'; const STATE = 'TX'

const KNOWN_THREADS: { url: string; notes: string }[] = [
  // No pre-loaded threads; dynamic search will find them
]

async function main() {
  console.log(`\n🎣 ${LAKE} — TFF ingestion`)
  const apiKey = process.env.GEMINI_API_KEY!
  let total = 0, errors = 0

  // Gather URLs: pre-loaded + dynamically discovered
  const knownUrls = KNOWN_THREADS.map(t => t.url)
  console.log(`  🔍 Searching TFF forum pages for ${LAKE}...`)
  const discovered = await findTffThreadsForLake(LAKE, 8)
  const allUrls = [...new Set([...knownUrls, ...discovered])]
  console.log(`  Found ${allUrls.length} thread URLs (${knownUrls.length} known + ${discovered.length} discovered)`)

  for (const [i, url] of allUrls.entries()) {
    const notes = KNOWN_THREADS.find(t => t.url === url)?.notes || 'TFF forum thread'
    console.log(`\n[${i+1}/${allUrls.length}] ${url.slice(0,80)}`)
    console.log(`     ${notes}`)
    try {
      const text = await fetchArticleText(url)
      if (!text || text.length < 200) { console.log('     ⚠️  Too short — skipping'); continue }
      console.log(`     ✓ ${text.length} chars`)
      const extracted = await extractFishingData(text, apiKey)
      if (!extracted.length) { console.log('     ⚠️  No data — skipping'); continue }
      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(`       [${j+1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
      })
      await insertTechniqueReport({ bodyOfWaterName: LAKE, state: STATE, sourceType: 'forum', sourceUrl: url, reportedDate: new Date().toISOString().slice(0,10), organization: 'Texas Fishing Forum', extracted })
      total += extracted.length; console.log('     ✅ Inserted')
      await new Promise(r => setTimeout(r, 8000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
