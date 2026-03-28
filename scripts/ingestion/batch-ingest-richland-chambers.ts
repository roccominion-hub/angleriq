import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Richland Chambers Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RICHLAND+CHAMBERS&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Richland Chambers current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RICHLAND+CHAMBERS&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Richland Chambers 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RICHLAND+CHAMBERS&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Richland Chambers 2023 archive' },
  {
    rawText: `Richland Chambers Reservoir, Texas Bass Fishing Guide

Richland Chambers Reservoir is a massive 41,400-acre impoundment on Richland Creek and Chambers Creek in Freestone, Navarro, and Limestone counties, Central Texas, near Corsicana. One of Texas's 10 largest lakes. Stained to slightly green water. Features extensive hydrilla coverage, submerged timber (particularly in upper arms), shallow flats, and creek channels. An exceptional largemouth bass fishery consistently producing quality fish and numbers. Also excellent white bass, crappie, and catfish.

KEY PATTERNS:
- Spring (Mar-May): Premier Texas bass lake in spring. Largemouth spawning throughout hydrilla edges, timber coves, and flat areas (2-8 feet). Hollow-body frogs over early hydrilla (black/blue, white/chartreuse), spinnerbaits (chartreuse/white double willow) along timber and grass edges, Texas-rigged lizards (watermelon/chartreuse, green pumpkin), swim jigs with paddle tail. Prespawn crankbaits on points.
- Summer: Punching thick hydrilla mats is THE technique — 1.5-2oz punch rigs with creature baits (black/blue, watermelon craw). Night fishing excellent with dark swim jigs along grass lines and timber. Early morning topwater in back coves.
- Fall: Outstanding schooling season — lipless cranks (Red Eye Shad, chrome/blue), swimbaits, and topwater walking baits as bass target shad on main lake flats and points. Best fall season of any DFW-area lake.
- Winter: Deep finesse on timber edges and channel bends — drop shots, Ned rigs, blade baits. White bass active on main lake.

KEY STRUCTURES: Hydrilla mats (extensive — primary structure), submerged timber in Richland Creek and Chambers Creek arms, main lake humps, creek channel edges, Highway 14 bridge area, Teague area, main lake points.

TOP BAITS: Hollow-body frog (black/blue or white/chartreuse — over mats), punch rig 1.5-2oz (black/blue craw — signature RC technique), Strike King KVD Red Eye Shad (chrome/blue, sexy shad — best fall bait), spinnerbait (chartreuse/white double willow, black/blue), swim jig (white shad, black/blue), Texas rig lizard (watermelon/chartreuse), drop shot Roboworm (morning dawn), Ned rig (green pumpkin).

NOTES: Consistently one of Texas's top-10 largemouth bass lakes. Hydrilla mats are key — extensive coverage makes this a world-class frog and punch rig lake. 41,400 acres means lots of water to explore. Multiple public ramps. Strong local bass club culture. Spring and fall are elite seasons.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Richland Chambers knowledge — massive TX lake, hydrilla, punch rigs, frogs, elite bass fishery'
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
