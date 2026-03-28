import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Athens'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=ATHENS&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Athens current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=ATHENS&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Athens 2024 archive' },
  {
    rawText: `Lake Athens, Texas Bass Fishing Guide

Lake Athens is a 1,800-acre reservoir in Henderson County, East Texas, near Athens (the "Black Bass Capital of the World"). Developed by the city of Athens primarily for water supply. Stained water. Athens is famous as the birthplace of the Florida-strain largemouth bass introduced to Texas waters. The lake holds excellent largemouth bass, crappie, catfish, and white bass. Features timber, aquatic vegetation, and dock structure.

KEY PATTERNS:
- Spring (Mar-May): Outstanding spawning bass in shallow timber and vegetation (2-8 feet). Spinnerbaits (white/chartreuse), Texas-rigged lizards and Senkos (watermelon, junebug), crankbaits (chartreuse/crawfish) along shoreline timber. Morning topwater (Zara Spook, popper) on flat calm days.
- Summer: Bass move to dock shade and deeper timber/brush (8-18 feet). Texas-rigged worms (black/blue, watermelon), Carolina rigs dragged through timber lanes, swim jigs near docks. Dawn and dusk topwater.
- Fall: Schooling action with lipless cranks, swimbaits, spinnerbaits. Bass chase shad to main lake points and cove mouths.
- Winter: Finesse fishing near deeper structure — drop shots, blade baits, shakey heads (green pumpkin, brown).

KEY STRUCTURES: Shoreline timber throughout, dock pilings, aquatic grass patches in back coves, creek channel bends, main lake humps.

TOP BAITS: Spinnerbait (chartreuse/white double willow), Texas rig Senko (watermelon, junebug), crankbait (chartreuse/crawfish), Texas rig worm (black/blue, watermelon), lipless crank (Red Eye Shad, chrome), swim jig (white shad), buzzbait (white/chartreuse), drop shot finesse worm.

NOTES: Athens is historically important as the birthplace of Florida-strain bass in Texas. The Florida-strain genetics spread to lakes across the state from here. City-managed lake — check access hours and any permit requirements. Good local bass club activity.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Athens knowledge — birthplace of Florida-strain bass in TX, historic East TX lake'
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
