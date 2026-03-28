import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = "Lake O' the Pines"; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/lake_o_the_pines/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: "TPWD Lake O' the Pines fishing guide — species, structure, tactics" },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=O+THE+PINES&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: "TPWD Lake O' the Pines current fishing report" },
  { url: 'https://www.wired2fish.com/bass-fishing/east-texas-bass-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2023-04-01', notes: 'East Texas bass tactics applicable to Lake O the Pines' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — East TX reservoir tactics' },
  {
    rawText: `Lake O' the Pines, Texas Bass Fishing Guide

Lake O' the Pines is an 18,700-acre reservoir in Marion and Upshur counties in Northeast Texas, near Jefferson. Formed by Ferrell's Bridge Dam on Big Cypress Bayou. One of Texas's finest bass lakes — consistently produces quality largemouth. Tannin-stained water, classic East Texas character. Features extensive timber, flooded brush, aquatic vegetation, and scenic piney woods setting. Also holds excellent crappie, white bass, and catfish.

KEY PATTERNS:
- Spring (Mar-May): Peak season. Pre-spawn bass stack on main lake timber edges and secondary points (4-10 feet). Texas-rigged worms (Zoom Trick Worm watermelon/red, junebug), spinnerbaits (double willow chartreuse/white), squarebill crankbaits. Spawn: shallow coves near timber, wacky-rigged Senkos (green pumpkin, watermelon), swim jigs.
- Summer: Bass move to deeper timber structure (12-25 feet) and hydrilla. Punch rigs for matted grass, deep jigging in timber with 3/4oz football jig, drop shots near timber columns. Evening topwater along timber edges.
- Fall: Excellent schooling bite as white bass and largemouth chase shad. Lipless cranks (Red Eye Shad chrome/blue), spinnerbaits, topwater walkers (Spook, Whopper Plopper). Big Cypress Bayou arm productive.
- Winter: Tough but rewarding — jigging spoons (1oz chrome) vertically in timber 20-30 feet, blade baits, slow-rolled swimbaits. Bass group tightly in winter timber.

KEY STRUCTURES: Big Cypress Bayou main channel, Little Cypress Bayou arm, Ellison Creek arm, Standing timber throughout, aquatic vegetation in upper arms, main lake humps, Highway 49 bridge area.

TOP BAITS: Spinnerbait (chartreuse/white double willow), Texas rig Zoom Trick Worm (watermelon/red, junebug), squarebill crankbait (sexy shad), punch rig (black/blue), wacky Senko (green pumpkin), lipless crank (Red Eye Shad), 3/4oz football jig (green pumpkin), jigging spoon (chrome).

NOTES: Lake O' the Pines is one of the most beautiful bass lakes in Texas — piney woods setting, clear to lightly stained water. Excellent crappie fishing in timber with jigs and minnows. Consistent trophy largemouth potential. Jefferson, TX area provides good lodging/services.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: "Curated Lake O' the Pines knowledge — NE TX, Big Cypress Bayou, timber, trophy largemouth"
  },
  { url: 'https://www.wired2fish.com/bass-fishing/spinnerbait-fishing-tips-and-tricks', sourceType: 'article', org: 'Wired2Fish', date: '2022-06-01', notes: "Spinnerbait tactics — core technique for Lake O' the Pines timber edges" },
  { url: 'https://www.wired2fish.com/bass-fishing/how-to-fish-a-football-jig', sourceType: 'article', org: 'Wired2Fish', date: '2023-02-01', notes: "Football jig in deep timber — key summer tactic for Lake O' the Pines" },
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
