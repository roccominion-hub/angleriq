import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Whitney'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WHITNEY&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Whitney current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WHITNEY&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Whitney 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WHITNEY&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Whitney 2023 archive' },
  {
    rawText: `Lake Whitney, Texas Bass Fishing Guide

Lake Whitney is a 23,500-acre reservoir on the Brazos River in Hill, Bosque, and Johnson counties, central Texas near Hillsboro and Whitney. An Army Corps of Engineers lake. Clear to slightly stained water — clearer than most Central TX lakes. Features rocky points, limestone bluffs, submerged timber in upper arms, sandy flats, and some aquatic vegetation. Largemouth bass, white bass (excellent), striped bass, catfish, and crappie present. The white bass run is legendary.

KEY PATTERNS:
- White bass spring run: February-April. Massive spawning run up Brazos River arm — fish stacked in river sections above lake. Jigging small spoons (1/4-3/8oz chrome, gold), tail spinners, white curly-tail grubs on jig heads. One of Texas's best white bass spectacles.
- Largemouth: Spring spawn (Mar-May) in rocky coves and timber areas (3-8 feet). Crankbaits (squarebill — chartreuse/crawfish, sexy shad) along rocky points, Texas-rigged worms (watermelon, green pumpkin), spinnerbaits (white/chartreuse). Jerkbaits on main lake.
- Summer: Bass move to 15-25 feet on rocky ledges and bluff walls. Drop shots (finesse worm), deep crankbaits, Carolina rigs. Night fishing with dark swimjigs on rocky points. Striper action excellent with live bait.
- Fall: Best reaction bait season — crankbaits and swimbaits along rocky points as bass feed on shad. White bass schooling on main lake.
- Winter: Slow but productive — drop shots and blade baits near rocky 20+ foot structure.

KEY STRUCTURES: Brazos River arm (white bass run area), rocky main lake points and bluffs, limestone ledges, upper lake timber, main lake humps and ridges, Whitney Dam tailrace.

TOP BAITS: White bass run — 1/4oz chrome spoon, white 1/8oz jig with white curly tail; Largemouth — squarebill crankbait (sexy shad, chartreuse crawfish), drop shot Roboworm (morning dawn, green pumpkin), Texas rig worm (watermelon, green pumpkin), spinnerbait (chartreuse/white), swimjig (white shad), jerkbait (natural shad colors).

NOTES: World-class white bass run in spring — worth the trip just for that. Rocky terrain — footwear matters on steep limestone banks. Army Corps recreation areas provide excellent camp and ramp access. Water clarity allows for longer leader drop shots. Underrated largemouth lake with quality fish.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Whitney TX knowledge — Brazos River, legendary white bass run, rocky largemouth lake'
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
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
