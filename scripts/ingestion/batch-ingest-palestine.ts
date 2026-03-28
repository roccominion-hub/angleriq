import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Palestine'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PALESTINE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Palestine current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PALESTINE&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Palestine 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PALESTINE&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Palestine 2023 archive' },
  {
    rawText: `Lake Palestine, Texas Bass Fishing Guide

Lake Palestine is a 25,560-acre reservoir on the Neches River in Cherokee, Henderson, Smith, and Anderson counties, East Texas, near Tyler. A major East Texas impoundment with stained water typical of the Piney Woods region. Excellent largemouth bass fishery with abundant structure including standing timber, hydrilla, milfoil, and laydowns. Crappie, catfish, and white bass also present.

KEY PATTERNS:
- Spring (Mar-May): Premier season. Largemouth spawning in 2-8 feet — heavy timber/brush coves and vegetation edges. Hollow-body frogs over grass mats, Texas-rigged lizards (green pumpkin/chartreuse, watermelon), spinnerbaits (chartreuse/white) through timber. Swim jigs with paddle tails along timber edges. Current TPWD report (Feb 2026): crappie and bass good, fish spawning along banks — bass biting rattletraps and spoons.
- Summer: Punch rigs through hydrilla mats (1-2oz tungsten, black/blue or watermelon craw), swim jigs in mid-depth timber (10-15 feet), Carolina rigs dragged through timber lanes.
- Fall: Excellent shad-following bass on main lake points and creek mouths — lipless cranks (Red Eye Shad, chrome/red), spinnerbaits, walking topwater. One of TX's best fall bites.
- Winter: Deep timber adjacent to creek channels — jigs, blade baits, suspending jerkbaits (natural shad colors).

KEY STRUCTURES: Standing timber throughout all major arms, hydrilla and milfoil flats, Neches River main channel, Flat Creek arm, King's Creek arm, beaver dam areas, laydowns along shorelines.

TOP BAITS: Hollow-body frog (black/blue, white), punch rig 1.5oz (black/blue craw), spinnerbait (chartreuse/white), Strike King KVD 1.5 rattletrap (chrome/blue), lipless crankbait (Red Eye Shad sexy shad), swim jig (white shad, black/blue), Texas rig lizard (green pumpkin/chartreuse), 1/2oz jigging spoon (chrome) for crappie/bass schools.

NOTES: Rated as one of the top 10 largemouth bass lakes in Texas. Hydrilla coverage shifts — check current conditions. Public boat ramps at multiple locations. Slot limit on bass — check TPWD regulations. Spring and fall are peak seasons.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Palestine knowledge — top East TX bass lake, hydrilla mats, timber, excellent season'
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
