/**
 * Batch ingestion — Lake Lewisville, TX
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Lewisville'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/lewisville/', sourceType: 'article', org: 'TPWD', date: '2024-01-01', notes: 'TPWD Lewisville — LM, spotted, hybrid striper, timber structure' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LEWISVILLE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-01-01', notes: 'TPWD Lewisville current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LEWISVILLE&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Lewisville 2023 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LEWISVILLE&archive=all&yearcat=2022&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2022-06-01', notes: 'TPWD Lewisville 2022 archive' },
  {
    rawText: `Lake Lewisville, Texas Bass Fishing Guide

Lake Lewisville is a 29,592-acre impoundment on the Elm Fork of the Trinity River in Denton County. Stained water. Max depth 67 feet. Standing timber in multiple coves. Holds largemouth, spotted bass, hybrid striped bass (excellent), white bass, and crappie.

KEY PATTERNS:
- Spring prespawn: Largemouth move to standing timber coves and secondary points. Swim jigs (black/blue, white/chartreuse), spinnerbaits, jerkbaits along timber lines. Spotted bass on deeper points — drop shots, small swimbaits. Depths: 8-18 feet.
- Spawn: Largemouth on shallow flats adjacent to timber, especially in upper creek arms. Wacky-rigged Senkos, Texas-rigged Zoom Trick Worms. Soft plastics in green pumpkin and watermelon red.
- Summer: Two-story fishery. Largemouth suspend in timber (8-15 feet) — flutter spoons, bladed jigs, soft swimbaits alongside timber. Hybrid stripers roam open water following shad — 1oz white bucktail jigs, topwater (Zara Spook). White bass school on main lake — follow birds.
- Fall: Best topwater season. Whopper Ploppers and walking baits at dawn/dusk on main lake points. Largemouth pack into timber coves with shad — spinnerbaits, lipless cranks (chrome, sexy shad). Stripers and hybrids surface feeding — match the shad.
- Winter: Deepest timber holds suspended largemouth — jigging spoons (chrome/gold), blade baits, drop shots with finesse worms. Crappie excellent under highway bridges.

KEY STRUCTURES: Standing timber (multiple coves — main bass location year-round), main lake humps and ridges on Hickory Creek arm, highway bridges (crappie), old Lake Dallas area (catfish and bass), channel edges.

TOP BAITS: Strike King Swim Jig (black/blue or white), Zoom Trick Worm (watermelon red, green pumpkin), 1oz jigging spoon (chrome), lipless crankbait (Chrome Red Eye Shad), Whopper Plopper (bone, chrome), drop shot with Roboworm (morning dawn, Aaron's magic), 3/8oz bladed jig (white/chartreuse shad). For hybrids/stripers: white 1oz bucktail, Heddon Zara Spook (chrome).

NOTES: Zebra mussels present — mandatory drain/dry. Good size largemouth available (8lb+ fish caught regularly). Slot limit on bass. Primary bass structure is timber — learn the timber and you learn the lake.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lewisville knowledge — timber fishing, hybrid striper, stained water patterns'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.ANTHROPIC_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    const label = s.url?.slice(0, 60) || 'rawText'
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
