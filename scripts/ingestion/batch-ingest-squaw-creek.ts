import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Squaw Creek Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=SQUAW+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Squaw Creek current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=SQUAW+CREEK&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Squaw Creek 2024 archive' },
  {
    rawText: `Squaw Creek Reservoir, Texas Bass Fishing Guide

Squaw Creek Reservoir is a 3,272-acre cooling lake for the Comanche Peak Nuclear Power Plant in Hood County, Texas, near Glen Rose. It is owned by Luminant (formerly TXU). The warm water discharge from the power plant keeps the lake warmer than typical in winter, creating unique year-round fishing opportunities. Known as one of Texas's best largemouth bass fisheries with exceptional numbers and size due to warm water. Also holds excellent Florida-strain largemouth, blue catfish, and alligator gar.

KEY PATTERNS:
- Year-round warm water advantage: Bass remain active even in January due to thermal discharge — fish near the warm water outflow areas for year-round action. This is the lake's defining characteristic.
- Spring (Feb-Apr): Bass spawn earlier than most Texas lakes due to warm water. Bedding fish in 2-6 feet near vegetation and structure. Wacky Senkos (green pumpkin), Texas-rigged lizards, spinnerbaits (white/chartreuse).
- Summer: Active topwater fishing — Whopper Plopper, walking baits. Heavy vegetation mats — punch rigs or frogs. Deep structure adjacent to warm discharge channels.
- Fall/Winter: Fish near warm water discharge — bass remain active. Swimbaits, crankbaits, spinnerbaits all effective due to active fish.

KEY STRUCTURES: Warm water discharge channel and outflow area (key location), vegetation mats, points adjacent to deep water, rocky/riprap sections near dam, main lake points.

TOP BAITS: Wacky Senko (green pumpkin, watermelon), hollow-body frog (black/blue, white), Whopper Plopper (bone, chrome), spinnerbait (white/chartreuse), Texas rig (black/blue craw), punch rig for mats, swimjig (white shad), Zoom Trick Worm (watermelon/red).

NOTES: Access is controlled — call Luminant Energy for current access status and permit requirements. The warm water discharge is the defining feature — always fish near it. Known for trophy largemouth. Significant alligator gar population. Very limited public pressure due to access restrictions.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Squaw Creek Reservoir knowledge — nuclear plant cooling lake, warm water, trophy bass'
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
