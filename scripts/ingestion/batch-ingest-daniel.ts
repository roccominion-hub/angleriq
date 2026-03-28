import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Daniel'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=DANIEL&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Daniel current fishing report' },
  {
    rawText: `Lake Daniel, Texas Bass Fishing Guide

Lake Daniel is a small reservoir in Stephens County, West Texas, near Breckenridge. A modest impoundment serving local water supply needs. Characteristic West Texas terrain with mesquite, cedar, and rocky/clay banks. Water tends to be stained to turbid. Holds largemouth bass, white bass, catfish, and sunfish. A relatively undiscovered local fishery.

KEY PATTERNS:
- Spring (Mar-May): Best season. Largemouth move to shallow flats and coves for spawning (2-6 feet). Spinnerbaits (white/chartreuse), shallow crankbaits (chartreuse/crawfish), Texas-rigged Zoom Trick Worm (watermelon/red or junebug). Morning topwater when calm.
- Summer: Bass move to any available depth structure — creek channel edges, dam face, submerged brush in 8-15 feet. Texas-rigged worms (black/blue, watermelon), drop shots in clearer areas. Evening and early morning most productive.
- Fall: Shad-following action with lipless cranks and spinnerbaits. Topwater schooling if shad are present.
- Winter: Very slow — finesse presentations near deepest water. Jigging spoons, blade baits.

KEY STRUCTURES: Shallow cove flats, creek channel bends, main lake points, dam face, any submerged brush or timber, rocky banks.

TOP BAITS: Spinnerbait (chartreuse/white), crankbait (chartreuse/crawfish), Zoom Trick Worm (watermelon/red), Texas rig worm (black/blue), buzzbait (white), drop shot finesse worm, jigging spoon (chrome).

NOTES: Small, remote West Texas lake with limited online information. Contact local bait shops in Breckenridge for current conditions. Light pressure means fish can be naive — basic presentations work. Best fished in spring. Typical West Texas largemouth lake.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Daniel TX knowledge — small West TX reservoir, Stephens County, largemouth bass'
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
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
