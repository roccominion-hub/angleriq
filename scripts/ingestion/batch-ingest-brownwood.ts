import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Brownwood'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/brownwood/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Brownwood fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BROWNWOOD&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Lake Brownwood current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/west-central-texas-bass-fishing', sourceType: 'article', org: 'Wired2Fish', date: '2023-03-01', notes: 'West-Central Texas bass tactics applicable to Lake Brownwood' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — Central TX reservoir tactics' },
  {
    rawText: `Lake Brownwood, Texas Bass Fishing Guide

Lake Brownwood is a 7,300-acre impoundment on Pecan Bayou in Brown County in West-Central Texas, near Brownwood. City and county water supply. Moderately stained to clear water. Good largemouth and white bass fishery. Also holds catfish, crappie, striped bass. Features rocky banks, creek timber, brush piles, aquatic vegetation in upper arms, and red sandy bottom typical of West Texas lakes.

KEY PATTERNS:
- Spring (Mar-May): Bass spawn in shallow creek coves and rocky flats (3-8 feet). Spinnerbaits (chartreuse/white), Texas-rigged Zoom Trick Worm (watermelon/red), crankbaits along rocky banks. White bass spring run up Pecan Bayou excellent.
- Summer: Bass seek 12-20 foot structure — rocky ledges, brush piles, deep points. Drop shots (finesse worm), deep crankbaits (DT10, sexy shad), Carolina rigs. White bass and stripers in open water.
- Fall: Excellent reaction bait fishing — lipless cranks, crankbaits, and spinnerbaits along rocky points and flats. Shad schooling patterns.
- Winter: Rocky main lake structure at depth. Blade baits, jigging spoons, slow presentations.

KEY STRUCTURES: Pecan Bayou arm (spring white bass run), rocky main lake points and banks, creek arms with timber, brush piles throughout, main lake ledges.

TOP BAITS: Spinnerbait (chartreuse/white), Texas rig Trick Worm (watermelon/red), crankbait (sexy shad, chartreuse crawfish), drop shot (natural shad), lipless crank (Red Eye Shad), Carolina rig (green pumpkin), blade bait (silver).

NOTES: Lake Brownwood State Park on the lake provides camping and access. White bass spring run in Pecan Bayou is a local highlight. Drought affects level significantly — check current pool status. Good all-around fishery for Central Texas.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Brownwood knowledge — West-Central TX, Pecan Bayou, rocky structure, white bass run'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/white-bass-fishing-tips-spring-run', sourceType: 'article', org: 'Wired2Fish', date: '2022-03-01', notes: 'White bass spring run tactics — excellent at Pecan Bayou/Lake Brownwood' },
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
