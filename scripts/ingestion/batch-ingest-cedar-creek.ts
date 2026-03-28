import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Cedar Creek Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CEDAR+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Cedar Creek current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CEDAR+CREEK&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Cedar Creek 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CEDAR+CREEK&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Cedar Creek 2023 archive' },
  {
    rawText: `Cedar Creek Reservoir, Texas Bass Fishing Guide

Cedar Creek Reservoir is a 33,750-acre impoundment on Cedar Creek in Henderson and Kaufman counties, East Texas, southeast of Dallas near Seven Points and Tool. One of the largest lakes near DFW. Stained water. A versatile bass lake that consistently produces numbers and quality. Features extensive hydrilla coverage, submerged timber, flats, and channel structure. Largemouth bass are primary; white bass, crappie, catfish also excellent.

KEY PATTERNS:
- Spring (Mar-May): Peak season. Largemouth spawn throughout coves, hydrilla edges, and timber areas (2-8 feet). Hollow-body frogs over early-forming hydrilla mats (black/blue, white/chartreuse), spinnerbaits (chartreuse/white) along timber edges, Texas-rigged lizards (watermelon/red, green pumpkin). Swim jigs with swimbait trailers on main lake points.
- Summer: Hydrilla mats dominate — punch rigs (1.5oz, black/blue craw), frog fishing at dawn/dusk. Night fishing on main lake with dark-colored swim jigs and worms along timber. Bass retreat to mats and deeper structure during heat.
- Fall: Excellent schooling season — lipless cranks (Red Eye Shad, chrome/blue), topwater walking baits, spinnerbaits, swimbaits on main lake as shad schools surface. One of the best fall DFW-area lakes.
- Winter: Finesse near channel edges and riprap — drop shots (Roboworm), blade baits, shakey heads.

KEY STRUCTURES: Hydrilla flats and mats (primary — very extensive), submerged timber throughout, Long Creek arm, Caney Creek arm, main lake humps, tributary mouths, channel edges.

TOP BAITS: Hollow-body frog (black/blue, white/chartreuse — over mats), punch rig 1.5oz (black/blue or watermelon craw), Strike King Red Eye Shad (chrome/red, sexy shad), spinnerbait (chartreuse/white double willow), swim jig (white shad, black/blue), Texas rig lizard (watermelon/red), drop shot Roboworm (morning dawn, green pumpkin), Ned rig (green pumpkin).

NOTES: One of East Texas's top bass lakes. Hydrilla coverage extensive — monitor TPWD reports. Good public access at multiple ramps around lake. Zebra mussels present — drain/dry required. Strong crappie population in timber makes it a versatile lake. Spring and fall peak seasons.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Cedar Creek Reservoir TX knowledge — large East TX lake, hydrilla, frogs, punch rigs, strong fishery'
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
