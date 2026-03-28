import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Mill Creek Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=MILL+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Mill Creek current fishing report' },
  {
    rawText: `Mill Creek Lake, Texas Bass Fishing Guide

Mill Creek Lake (also known as Lake Eddleman or associated with Eddleman Lake) is a smaller reservoir in Young County, North Texas. It is a relatively small impoundment with characteristic North Texas geography — rolling hills, clay banks, mesquite, and cedar brush. Water tends to be stained to turbid. Holds largemouth bass, white bass, crappie, and catfish. Limited public access; often used by local anglers.

KEY PATTERNS:
- Spring (Mar-May): Best season. Largemouth spawn in shallow coves with clay banks and any available brush (2-6 feet). Spinnerbaits (chartreuse/white), shallow-diving crankbaits (chartreuse/crawfish), Texas-rigged Zoom Trick Worms (watermelon/red, junebug). Morning topwater (buzzbait, walker).
- Summer: Bass move to deeper structure — channel edges, submerged brush (8-15 feet). Texas-rigged worms (black/blue, watermelon), drop shots, Carolina rigs with lizards. Early morning topwater.
- Fall: Shad-following bass hit lipless cranks and spinnerbaits along shorelines and points. Good topwater in mornings.
- Winter: Finesse near channel structure — jigging spoons, drop shots, shakey heads.

KEY STRUCTURES: Clay point banks, cove flats, submerged brush piles, main creek channel, dam face, any rocky structure.

TOP BAITS: Spinnerbait (chartreuse/white double willow), Zoom Trick Worm (watermelon/red), shallow crankbait (chartreuse/crawfish), Texas rig worm (black/blue), buzzbait (white), drop shot finesse worm, jigging spoon (chrome/gold).

NOTES: Small, relatively underpressured lake. Limited public information available — best approached as a local discovery. Typical North Texas largemouth lake — spinnerbaits and worms are reliable. Check with local bait shops in Graham, TX for current conditions.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Mill Creek Lake TX knowledge — small North TX reservoir, largemouth, local fishing'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.GEMINI_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    const label = s.url?.slice(0, 70) || 'rawText'
    console.log(`\n[${i+1}/${SOURCES.length}] ${label}\n     ${s.notes}`)
    try {
      const text = s.rawText ?? await fetchArticleText(s.url!)
      if (!text || text.length < 100) { console.log('     ⚠️  Too short — skipping'); continue }
      console.log(`     ✓ ${text.length} chars`)
      const extracted = await extractFishingData(text, apiKey)
      if (!extracted.length) { console.log('     ⚠️  No data — skipping'); continue }
      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(`       [${j+1}] ${item.angler_name || 'Unknown'} | ${item.pattern || '?'} | ${baits}`)
      })
      await insertTechniqueReport({ bodyOfWaterName: LAKE, state: STATE, sourceType: s.sourceType as any, sourceUrl: s.url || 'curated', reportedDate: s.date, tournamentName: s.tournament, organization: s.org, extracted })
      total += extracted.length; console.log('     ✅ Inserted')
      await new Promise(r => setTimeout(r, 5000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
