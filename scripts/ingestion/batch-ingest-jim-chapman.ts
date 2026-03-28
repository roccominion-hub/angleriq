import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Jim Chapman Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/jim_chapman/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Jim Chapman Lake fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=JIM+CHAPMAN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Jim Chapman current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/east-texas-bass-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2023-04-01', notes: 'East Texas bass fishing tactics applicable to Jim Chapman Lake' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-03-01', notes: 'Texas bass fishing overview with tactics for East TX reservoirs' },
  {
    rawText: `Jim Chapman Lake, Texas Bass Fishing Guide

Jim Chapman Lake (also known as Lake Bob Sandlin... wait, these are separate. Jim Chapman Lake is a 19,300-acre reservoir in Camp, Morris, and Titus counties in Northeast Texas, near Mount Pleasant. Formed by the Cypress Creek drainage. Stained water typical of East Texas — tannin-stained, productive fishery. Excellent largemouth bass population. Also holds crappie, catfish, and white bass. Features extensive timber, aquatic vegetation (hydrilla, milfoil), flooded brush, and creek arms.

KEY PATTERNS:
- Spring (Mar-May): Pre-spawn and spawn period is peak. Bass move to shallow coves and timbered flats (2-8 feet). Spinnerbaits (chartreuse/white, double willow), Texas-rigged soft plastics (Zoom Trick Worm watermelon/red, Junebug), squarebill crankbaits along timber edges. Topwater (buzzbait, Pop-R) on calm mornings.
- Summer: Bass concentrate in hydrilla mats and deep timber (12-20 feet). Punch rigs through matted vegetation (1oz+ tungsten, black/blue craw), swim jigs alongside timber, drop shots near timber columns in deeper areas.
- Fall: Outstanding schooling action as bass chase shad — lipless crankbaits (Red Eye Shad, chrome/blue), spinnerbaits, topwater (Spook, Whopper Plopper). One of Northeast Texas's most productive fall lakes.
- Winter: Slow down — jigs on deeper brush piles and timber, drop shots, blade baits near channel edges (15-25 feet).

KEY STRUCTURES: Cypress Creek arm, Dry Creek arm, Big Cypress Creek main channel, hydrilla flats in upper lake, flooded timber throughout, riprap at dam, main lake points.

TOP BAITS: Spinnerbait (chartreuse/white), punch rig (black/blue, 1oz tungsten), Zoom Trick Worm (watermelon/red, junebug), squarebill crankbait (sexy shad, chartreuse crawfish), lipless crank (Red Eye Shad chrome/blue), hollow-body frog (black/blue), jig with Zoom Super Chunk (black/blue).

NOTES: Jim Chapman is one of Northeast Texas's underrated big-bass lakes. Hydrilla is present but managed. Access via Mount Pleasant. Good crappie fishing in timber with minnows/jigs.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Jim Chapman Lake knowledge — NE TX, hydrilla, timber, strong largemouth fishery'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/punching-through-matted-vegetation', sourceType: 'article', org: 'Wired2Fish', date: '2022-08-01', notes: 'Punch rig techniques for matted vegetation — key tactic for Jim Chapman summer fishing' },
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
