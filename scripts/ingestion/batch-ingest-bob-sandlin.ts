import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Bob Sandlin'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BOB+SANDLIN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Bob Sandlin current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BOB+SANDLIN&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Bob Sandlin 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BOB+SANDLIN&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Bob Sandlin 2023 archive' },
  {
    rawText: `Lake Bob Sandlin, Texas Bass Fishing Guide

Lake Bob Sandlin is a 9,460-acre reservoir on Cypress Creek in Titus and Camp counties in northeast Texas, near Mount Pleasant. Stained water typical of East Texas Piney Woods. Excellent largemouth bass fishery known for producing quality fish. Also holds crappie, catfish, and hybrid striped bass. Features abundant aquatic vegetation, timber, and brush.

KEY PATTERNS:
- Spring (Mar-May): Prime season. Largemouth bed in hydrilla and grassline edges 3-8 feet. Soft plastics excel — Texas-rigged lizards (watermelon/chartreuse), Zoom Trick Worms, wacky Senkos. Spinnerbaits along grass edges (chartreuse/white, double willow). Hollow-body frogs over matted hydrilla in late spring. Prespawn: crankbaits along flats (chartreuse/crawfish).
- Summer: Bass bury in hydrilla (punching mats with 1-2oz tungsten sinker), or move to 10-15 feet on timber/brush. Punch rigs (black/blue craw, heavy tungsten), swim jigs with hydrilla trailers. Dawn/dusk topwater.
- Fall: Hydrilla bite continues, plus schooling action on main lake points — lipless cranks, spinnerbaits, swimbaits. Best all-around season.
- Winter: Slow presentations near deep brush and channel bends — jigs, drop shots, suspending jerkbaits.

KEY STRUCTURES: Hydrilla and milfoil flats, submerged timber (especially Cypress Creek arm), dock pilings, creek channel bends, main lake points with brush.

TOP BAITS: Hollow-body frog (black, white, or yellow — for mat fishing), 1-1/2oz punch rig with craw (black/blue or watermelon red), Strike King Tour Grade Swim Jig (white or black/blue), spinnerbait (chartreuse/white), 10-inch Zoom Worm (black/blue, watermelon), lipless crankbait (chrome/red), jig with Zoom Super Chunk (black/blue).

NOTES: Known for producing 7-10+ lb largemouth. Hydrilla is the key — find it and you find the fish. Lake Bob Sandlin State Park provides access. Check current hydrilla coverage as it shifts seasonally. Catch-and-release ethic strong among local bass clubs.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Bob Sandlin knowledge — East TX hydrilla lake, big largemouth, punching mats'
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
