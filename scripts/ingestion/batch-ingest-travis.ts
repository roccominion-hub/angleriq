import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Travis'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=TRAVIS&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Travis current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=TRAVIS&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Travis 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=TRAVIS&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Travis 2023 archive' },
  {
    rawText: `Lake Travis, Texas Bass Fishing Guide

Lake Travis is a 19,000-acre impoundment on the Colorado River in Travis and Burnet counties, in the Texas Hill Country west of Austin. Part of the Highland Lakes chain. Clear to very clear water — typically 10-20+ foot visibility in good conditions. Rocky, craggy terrain with limestone bluffs, points, and creek arms. Features largemouth bass, smallmouth bass, spotted bass, Guadalupe bass, striped bass, white bass, and catfish. The clear water requires finesse approaches.

KEY PATTERNS:
- Clear water demands: High visibility means finesse presentations dominate. Natural colors, light line, and subtle presentations outperform power fishing.
- Spring (Mar-May): Largemouth spawn in rocky coves and creek arms with gravel/sand bottom (4-10 feet). Drop shots with finesse worms (Roboworm, natural shad, morning dawn), shakey heads (green pumpkin), jerkbaits (natural shad, ghost minnow). Light spinnerbaits (1/4oz, chartreuse/silver).
- Summer: Bass retreat to deep rocky structure (20-40 feet) during heat. Deep drop shots, Carolina rigs with subtle colors, swimbaits on main lake bluff walls. Night fishing with dark swimjigs on rocky points. Stripers roam main lake.
- Fall: Best all-around season. Reaction baits on rocky main lake points — medium-diving crankbaits (natural shad), swimbaits, jerkbaits. Topwater early morning on bluff walls.
- Winter: Spotted bass and largemouth active on rocky 20-30 foot structure. Blade baits, jigging spoons, drop shots.

KEY STRUCTURES: Rocky main lake bluff walls and points, limestone ledges, secondary points in creek arms (Hudson Bend, Volente arm, Starnes Island area), Pedernales River arm, Colorado River main channel, submerged roadbeds.

TOP BAITS: Drop shot with Roboworm Straight Tail (natural shad, morning dawn, margarita mutilator) on 6-8lb fluorocarbon, shakey head with Zoom Trick Worm (smoke/purple, green pumpkin), jerkbait (Megabass Vision 110 ghost, natural shad), medium crankbait (Rapala DT10 — natural shad, olive/chartreuse), swimbait (4-5" — natural shad colors), blade bait (chrome, silver), 1/4oz spinnerbait (silver/white).

NOTES: Heavy recreational boat traffic in summer — fish early or weekdays. Clear water requires light line (8-10lb fluoro for drop shot). Night fishing excellent in summer on bluff walls with dark baits. Level fluctuates significantly with drought/LCRA releases. One of Texas's most scenic bass lakes.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Travis TX knowledge — clear Hill Country lake, finesse required, bluff walls, drop shots'
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
