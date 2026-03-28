import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Waco'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/waco/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Waco fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WACO&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Lake Waco current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/central-texas-bass-fishing', sourceType: 'article', org: 'Wired2Fish', date: '2023-03-01', notes: 'Central Texas bass tactics applicable to Lake Waco' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — Central TX tactics' },
  {
    rawText: `Lake Waco, Texas Bass Fishing Guide

Lake Waco is an 7,270-acre U.S. Army Corps of Engineers reservoir on the North Bosque River in McLennan County, Central Texas. The City of Waco's water supply. Moderately stained water. Solid largemouth bass fishery with some big fish potential. Also holds white bass, catfish, crappie. Features rocky banks, creek timber in upper arms, riprap at dam, brush piles, and emergent vegetation in the upper North Bosque arm.

KEY PATTERNS:
- Spring (Mar-May): Pre-spawn on rocky secondary points and timber coves (4-10 feet). Spinnerbaits (chartreuse/white, 3/8oz), Texas-rigged Zoom Trick Worm (watermelon/red), jerkbaits on main lake points. Spawn in protected coves near riprap and rocky structure.
- Summer: Bass move to 15-25 feet on main lake ledges and brush. Drop shots (finesse worm, natural shad), deep cranks (DT16, sexy shad), Carolina rigs on rocky ledges.
- Fall: Reaction bite along rocky main lake banks and timber edges — medium crankbaits, spinnerbaits, lipless cranks. White bass schooling on open water.
- Winter: Deep structure (20-30 feet) near old creek channels — blade baits, jigging spoons, slow jigs.

KEY STRUCTURES: North Bosque River arm (upper lake timber and vegetation), Hog Creek arm, rocky main lake banks, dam riprap, main lake ledges and humps, marina areas with brush.

TOP BAITS: Spinnerbait (chartreuse/white), Texas rig Trick Worm (watermelon/red), jerkbait (natural shad), deep crankbait (DT10/DT16 sexy shad), drop shot (finesse worm), Carolina rig (green pumpkin), lipless crank (chrome/blue).

NOTES: Lake Waco is the city water supply — some access restrictions apply, check current rules. Good fishing during weekdays when boat traffic is lower. Waco provides full services. Corps of Engineers parks provide good ramp access. Spring pre-spawn on rocky points is peak season.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Waco knowledge — Central TX, North Bosque River, rocky structure, largemouth'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/jerkbait-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2022-11-01', notes: 'Jerkbait tactics — productive technique on Lake Waco rocky main lake points' },
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
