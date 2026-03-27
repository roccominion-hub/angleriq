/**
 * Batch ingestion — Lake of the Pines, TX
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake of the Pines'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  // TPWD fishing reports (lake page 404s — using report URL which works)
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LAKE+O%27+THE+PINES&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-01-01', notes: 'TPWD Lake of the Pines current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LAKE+O%27+THE+PINES&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Lake of the Pines 2023 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LAKE+O%27+THE+PINES&archive=all&yearcat=2022&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2022-06-01', notes: 'TPWD Lake of the Pines 2022 archive' },
  { url: 'https://www.wired2fish.com/bass-fishing/the-best-bass-fishing-lakes-in-texas', sourceType: 'article', org: 'Wired2Fish', date: '2023-01-01', notes: 'Best TX lakes — covers East TX piney woods lakes' },
  {
    rawText: `Lake of the Pines (Lake O' the Pines), Texas Bass Fishing Guide

Lake O' the Pines is a 27,264-acre reservoir on Big Cypress Creek in East Texas (Marion and Upshur counties), managed by the Army Corps of Engineers. Stained water typical. Max depth 70 feet. Known for a strong largemouth bass fishery, abundant crappie, and good catfishing. A regular stop on the MLF BFL Texas circuit.

KEY PATTERNS:
- Spring prespawn (Feb-March): Bass move up from deep timber to staging areas on secondary points and channel edges adjacent to spawning flats. Swim jigs (black/blue, white/chartreuse) and spinnerbaits along timber and brush. Texas-rigged lizards and creature baits in green pumpkin or junebug. Crankbaits (medium-diving, shad patterns) along channel banks.
- Spawn (March-April): Shallow coves with sandy/gravel bottoms. Wacky-rigged Senkos (watermelon red, green pumpkin), Neko rigs, and soft-plastic lizards. Fish visible in 2-4 feet. Punching mats where hydrilla or pads exist in upper creek arms.
- Summer: Deep timber is key. Drop shots and shaky heads on 15-25 foot timber schools. Football jigs (3/4oz, green pumpkin/brown) on main lake points. Early morning buzzbait and topwater through shallow timber and dock areas. Brush piles in 20-30 feet hold good bass numbers.
- Fall: Shad migration pushes bass shallow. Lipless crankbaits (Red Eye Shad, chrome or sexy shad) along grass lines and timber. Spinnerbaits in white or chartreuse/white on flat areas. Walking baits (Zara Spook) and Whopper Ploppers at dawn.
- Winter: Suspended bass in timber. Jigging spoons and blade baits vertical off brush and timber. Slow-rolled swimbait through deep timber structure.

KEY STRUCTURES: Standing and submerged timber (primary year-round holding structure), main creek channel edges (Big Cypress Creek), man-made brush piles throughout the lake, dock and pier complexes, upper lake hydrilla pockets.

TOP BAITS: Strike King Swim Jig (black/blue, white), 3/4oz football jig (green pumpkin, brown), Zoom Trick Worm (watermelon, junebug), Rat-L-Trap (chrome/blue back, sexy shad), spinnerbait (3/8oz tandem willow, white/chartreuse), Zoom Super Fluke (white, pearl), jigging spoon (chrome, 3/4-1oz), buzzbait (black), drop shot with finesse worm (green pumpkin, oxblood).

NOTES: BFL tournament trail events regularly held here — local knowledge important. East Texas stained water = reaction baits and dark/chartreuse colors effective. Timber is everywhere — use electronics to find concentrations with fish holding. Very good crappie fishery in timber year-round.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake of the Pines knowledge — BFL lake, timber, stained water East TX patterns'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.ANTHROPIC_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    const label = s.url?.slice(0, 60) || 'rawText'
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
