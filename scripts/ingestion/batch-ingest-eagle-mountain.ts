import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Eagle Mountain Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=EAGLE+MOUNTAIN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Eagle Mountain current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=EAGLE+MOUNTAIN&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Eagle Mountain 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=EAGLE+MOUNTAIN&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Eagle Mountain 2023 archive' },
  {
    rawText: `Eagle Mountain Lake, Texas Bass Fishing Guide

Eagle Mountain Lake is a 9,200-acre reservoir on the West Fork of the Trinity River in Tarrant County, northwest Fort Worth. One of the primary DFW-area bass lakes. Stained to slightly murky water with heavy recreational boat traffic in summer. Features hydrilla and milfoil flats, riprap banks, submerged timber in upper arms, and dock-lined shores. Largemouth bass are primary; white bass, crappie, and catfish also present.

KEY PATTERNS:
- Spring (Mar-May): Outstanding spawn bite. Largemouth in shallow hydrilla edges, coves, and dock areas (2-8 feet). Hollow-body frogs and punch rigs over hydrilla mats. Spinnerbaits (chartreuse/white) and swim jigs (white shad) along grass edges. Dock-flipping with jigs (black/blue, green pumpkin). Wacky Senkos on bedding areas.
- Summer: Fish move to hydrilla mats (punch) and deeper structure (12-20 feet) to escape boat pressure. Early morning topwater on calm flats. Night fishing extremely productive — dark swim jigs, worms on dock pilings and riprap edges.
- Fall: Best topwater season — walking baits and poppers at dawn. Spinnerbaits and lipless cranks as shad balls develop on main lake. Schooling action on main lake points.
- Winter: Finesse near riprap, dock pilings, and channel edges — drop shots (Roboworm), blade baits (silver buddy), shakey heads.

KEY STRUCTURES: Hydrilla flats (main lake and upper arms), dock lines throughout, riprap along dam and highway bridges, submerged timber in West Fork arm, creek channel bends, main lake humps.

TOP BAITS: Hollow-body frog (black/blue or white/chartreuse — over hydrilla), punch rig 1.5oz (black/blue craw), spinnerbait (chartreuse/white or black/blue), wacky Senko (green pumpkin, watermelon), swim jig (white shad), drop shot (Roboworm Straight Tail, morning dawn), lipless crank (Red Eye Shad, chrome/blue), buzzbait.

NOTES: Heavy boat traffic on summer weekends — fish early morning or weekdays. Zebra mussels present. Hydrilla is key structure — monitor TPWD reports for current coverage. Strong DFW bass club fishery. Night fishing in summer is excellent for larger fish.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Eagle Mountain Lake knowledge — DFW area, hydrilla, dock fishing, summer night bite'
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
      await new Promise(r => setTimeout(r, 8000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
