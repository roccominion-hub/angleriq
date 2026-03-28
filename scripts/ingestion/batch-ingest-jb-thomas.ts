import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake J.B. Thomas'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=JB+THOMAS&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD JB Thomas current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=JB+THOMAS&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD JB Thomas 2024 archive' },
  {
    rawText: `Lake J.B. Thomas, Texas Bass Fishing Guide

Lake J.B. Thomas is an 11,400-acre reservoir on the Colorado River in Borden and Scurry counties, West Texas, near Snyder. A semi-arid West Texas reservoir that serves as water supply for the Colorado River Municipal Water District. Water clarity varies from turbid to clear depending on conditions. Subject to high evaporation and drought-driven level fluctuations. Holds largemouth bass, white bass, channel catfish, and flathead catfish. Sandy and rocky terrain with mesquite and scrub vegetation.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn on sandy/gravel flats when stable water levels exist. Spinnerbaits (white/chartreuse), crankbaits (chartreuse/gold), swimbaits along points. Soft plastics: Texas-rigged worm (watermelon/red), Senko (natural shad). White bass spawn run in creek arms.
- Summer: Bass relate to any available structure — dam face, riprap, remaining submerged brush, creek channels. Drop shots (finesse worm, morning dawn), Texas-rigged worms (black/blue). White bass school on main lake.
- Fall: Lipless cranks and spinnerbaits along shorelines. Shad schools attract bass to open water.
- Winter: Very slow — finesse near deepest water. Blade baits, jigging spoons.

KEY STRUCTURES: Main lake dam face, rocky points and bluffs, sandy cove flats (spring), submerged creek channels, any remaining brush or timber, riprap.

TOP BAITS: Spinnerbait (white/chartreuse), crankbait (chartreuse/crawfish, natural shad), Texas rig worm (watermelon/red, black/blue), drop shot finesse worm, 1/2oz jigging spoon (chrome, gold), lipless crankbait (chrome/red), Carolina rig with lizard.

NOTES: West Texas lake — call ahead for current conditions and water levels. Drought significantly affects this lake. Relatively underfished compared to East TX lakes. White bass run in spring can be excellent. A remote destination for anglers in the Permian Basin region.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake JB Thomas knowledge — West TX reservoir, drought-prone, largemouth and white bass'
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
