import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Hubbard Creek Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=HUBBARD+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Hubbard Creek current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=HUBBARD+CREEK&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Hubbard Creek 2024 archive' },
  {
    rawText: `Hubbard Creek Reservoir, Texas Bass Fishing Guide

Hubbard Creek Reservoir is an 15,250-acre impoundment on Hubbard Creek in Stephens County, west-central Texas, near Breckenridge. One of the larger reservoirs in the Cross Timbers region. Highly variable water levels due to drought conditions and West Texas climate. Water clarity varies widely — often turbid/stained. Holds largemouth bass, white bass, catfish, and crappie. Rocky and sandy terrain with some cedar/mesquite brush along shores.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in coves with sandy/gravel flats when water is stable. Crankbaits (chartreuse/crawfish, rocky bottom patterns), spinnerbaits (white/chartreuse), swimbaits along points. Soft plastics: Zoom Trick Worm, Senko.
- Summer: Bass move to any available structure — rocky points, submerged brush, dam face. Texas-rigged worms (watermelon/red, black/blue), drop shots near rocky structure. White bass schooling on main lake — spoons, small swimbaits.
- Fall: Good shad-following bite on main lake — lipless crankbaits, topwater schooling action at dawn. Spinnerbaits along shorelines.
- Winter: Finesse fishing on deeper rocky structure — blade baits, drop shots. Catfish excellent.

KEY STRUCTURES: Rocky main lake points, submerged creek channels, dam face (largemouth suspend here), brush piles, sandy cove flats during spring, any submerged timber/brush.

TOP BAITS: Spinnerbait (white/chartreuse double willow), crankbait (chartreuse/crawfish, Chart/blue), Texas-rigged worm (watermelon/red, black/blue), drop shot with finesse worm, 1/2oz jigging spoon (chrome), lipless crankbait (chrome/red), Carolina rig with lizard (green pumpkin).

NOTES: Water levels fluctuate significantly — call ahead for current conditions. Low lake levels can concentrate fish near remaining structure and creek channels. White bass can provide non-stop action when schooling. A productive but under-pressured reservoir.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Hubbard Creek Reservoir knowledge — West TX cross timbers, variable levels, largemouth'
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
