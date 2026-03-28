import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake B.A. Steinhagen'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/ba_steinhagen/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD B.A. Steinhagen fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=STEINHAGEN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Steinhagen current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/east-texas-bass-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2023-04-01', notes: 'East Texas bass tactics applicable to B.A. Steinhagen' },
  {
    rawText: `Lake B.A. Steinhagen, Texas Bass Fishing Guide

Lake B.A. Steinhagen (also known as Town Bluff Reservoir) is a 13,700-acre U.S. Army Corps of Engineers reservoir on the Neches River in Jasper and Tyler counties in Deep East Texas. Forms the boundary between the Big Thicket National Preserve. Tannin-stained, dark water — classic Deep East Texas swamp/lake character. Excellent largemouth bass, crappie, and catfish fishery. Features massive standing timber, flooded forests, cypress trees in the upper reaches, and the Neches River channel.

KEY PATTERNS:
- Spring (Mar-May): Phenomenal spawn period in the flooded timber and cypress flats (2-6 feet). Spinnerbaits (black/blue, chartreuse/white), Texas-rigged plastics (Zoom Lizard black/blue, Trick Worm junebug), hollow-body frogs around cypress trees, squarebill crankbaits along timber. Dark colors work well in stained water.
- Summer: Bass in deep timber, river channel edges (10-20 feet), and under shade of cypress canopy. Swim jigs alongside timber, punch rigs through any surface vegetation, jigging spoons in river channel timber.
- Fall: Productive schooling around timber edges and river channel — lipless cranks, spinnerbaits. Neches River arm excellent in fall for suspended bass.
- Winter: Tight to deep timber and river channel. Slow jigs (black/blue, brown), blade baits near channel drops.

KEY STRUCTURES: Neches River main channel, standing timber throughout, cypress trees in upper lake, Big Sandy Creek arm, Bevilport area, Martin Dies Jr. State Park area.

TOP BAITS: Spinnerbait (black/blue, chartreuse/white), Texas rig lizard (black/blue, watermelon), hollow-body frog (black/blue), punch rig (black/blue), squarebill crank (black/blue craw, sexy shad), swim jig (black/blue), jigging spoon (chrome).

NOTES: B.A. Steinhagen is one of the most scenic, swampy bass lakes in Texas. Big Thicket National Preserve borders add natural beauty. Access via Jasper County. Martin Dies Jr. State Park on the lake provides camping. Best in spring and fall. Dark water requires darker bait colors.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated B.A. Steinhagen knowledge — Deep East TX, Neches River, cypress, swamp bass'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/frog-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2022-07-01', notes: 'Hollow-body frog tactics — key technique around Steinhagen cypress trees' },
  { url: 'https://www.wired2fish.com/bass-fishing/dark-stained-water-bass-fishing', sourceType: 'article', org: 'Wired2Fish', date: '2023-05-01', notes: 'Dark stained water bass tactics — essential for Steinhagen approach' },
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
