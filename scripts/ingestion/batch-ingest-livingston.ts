/**
 * Batch ingestion — Lake Livingston, TX
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Livingston'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/livingston/', sourceType: 'article', org: 'TPWD', date: '2024-01-01', notes: 'TPWD Livingston — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LIVINGSTON&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-01-01', notes: 'TPWD Livingston current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LIVINGSTON&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Livingston 2023 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LIVINGSTON&archive=all&yearcat=2022&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2022-06-01', notes: 'TPWD Livingston 2022 archive' },
  { url: 'https://www.wired2fish.com/bass-fishing/the-best-bass-fishing-lakes-in-texas', sourceType: 'article', org: 'Wired2Fish', date: '2023-01-01', notes: 'Best TX lakes — Livingston section' },
  {
    rawText: `Lake Livingston, Texas Bass Fishing Guide

Lake Livingston is a 90,000-acre reservoir on the Trinity River in East Texas — one of the largest lakes in Texas by surface area. Stained water typical. The lake is a favorite for local Houston-area anglers and is known for quality largemouth bass in standing timber and brush pile fisheries.

KEY PATTERNS:
- Spring prespawn (Feb-March): Largemouth stage in standing timber adjacent to spawning flats. Swim jigs (black/blue, white) through timber. Spinnerbaits along wood and grass edges. Texas-rigged creature baits (Zoom Brush Hog, Strike King Rage Bug — black/blue) flipped into standing timber. Depths: 6-15 feet.
- Spawn (March-April): Bass move shallow into coves and back ends. Wacky-rigged Senkos and Neko rigs around timber bases. Texas rigs in pea gravel/sand pockets. Soft plastics: watermelon red, green pumpkin, junebug.
- Summer: Key pattern is brush piles (both natural and man-made) in 15-25 feet. Drop shots with finesse worms, shaky head rigs, and football jigs on deeper brush. Early morning topwater (walking baits, buzzbaits) before 8am in coves. Bladed jigs through standing timber in 10-15 feet.
- Fall: Shad push bass shallow. Topwater lures (Whopper Plopper, Zara Spook) at daybreak. Lipless crankbaits along grass lines and timber. Spinnerbaits (tandem willow, white/chartreuse) around baitfish. One of the best topwater fisheries in Texas in October.
- Winter: Slow down. Football jigs (3/4oz, green pumpkin/brown) on main lake points. Blade baits and jigging spoons on timber schools. Bass cluster near bottom in 18-30 feet.

KEY STRUCTURES: Standing timber (most bass are near wood year-round), man-made brush piles (GPS them or ask locals), main Trinity River channel edges, shallow coves with gravel/sand for spawning, grass/hydrilla pockets in upper lake.

TOP BAITS: Strike King Swim Jig (black/blue), Zoom Brush Hog (black/blue, green pumpkin), 3/4oz football jig (brown/green pumpkin), lipless crankbait (chrome/red, sexy shad), Zoom Trick Worm (watermelon, junebug), drop shot worm (Roboworm, morning dawn), Whopper Plopper 110 (bone/chrome). Big bass have been caught on large swimbaits (6-8") near main lake timber.

NOTES: A massive lake — electronics are important to locate structure. Local tournament circuits hold events regularly. Very good white bass and striper fishery in spring. The Trinity River tailwater below the dam occasionally produces excellent fishing.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Livingston knowledge — timber/brush, Trinity River, East TX patterns'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.GEMINI_API_KEY!
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
