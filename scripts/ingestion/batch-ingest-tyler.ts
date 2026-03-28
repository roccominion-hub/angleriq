import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Tyler'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=TYLER&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Tyler current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=TYLER&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Tyler 2024 archive' },
  {
    rawText: `Lake Tyler, Texas Bass Fishing Guide

Lake Tyler (and Lake Tyler East) are twin reservoirs totaling approximately 5,400 acres in Smith County, East Texas, near Tyler. Owned and operated by the city of Tyler. Stained water, productive East Texas fishery. Lake Tyler West is the primary bass lake; Lake Tyler East holds excellent crappie. The lake features submerged timber, aquatic vegetation (hydrilla/milfoil), and rocky/gravelly banks in some areas.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in abundant timber and vegetation coves (2-8 feet). Spinnerbaits (chartreuse/white), Texas-rigged Zoom Trick Worms (watermelon/red, junebug), hollow-body frogs over vegetation mats. Crankbaits (squarebill, sexy shad) along timber edges.
- Summer: Bass seek shade of timber canopy and aquatic vegetation. Punch rigs through hydrilla mats (black/blue craw, 1oz tungsten), swim jigs with trailers alongside timber. Dawn/dusk topwater.
- Fall: Outstanding shad schooling bite — lipless cranks (Red Eye Shad, chrome), topwater walkers and poppers, spinnerbaits. One of East Texas's best fall lakes.
- Winter: Deep timber and channel edges — jigs (black/blue, brown/orange), drop shots, suspending jerkbaits.

KEY STRUCTURES: Submerged timber throughout, hydrilla flats in upper arms, main lake humps and ridges, Mud Creek arm, Prairie Creek arm, Highway 31 bridge areas.

TOP BAITS: Spinnerbait (chartreuse/white, black/blue), hollow-body frog (black/blue, white/chartreuse), punch rig (black/blue craw), Zoom Trick Worm (watermelon/red), lipless crank (Red Eye Shad sexy shad), squarebill crankbait (sexy shad, chartreuse crawfish), drop shot (Roboworm, green pumpkin), jig with Zoom Super Chunk.

NOTES: City of Tyler manages access — permits available through city parks. Good crappie fishing on East lake with minnows and small jigs in timber. Both bass and crappie excellent. Spring and fall peak seasons for bass.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Tyler knowledge — East TX twin lakes, hydrilla, timber, strong bass/crappie fishery'
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
