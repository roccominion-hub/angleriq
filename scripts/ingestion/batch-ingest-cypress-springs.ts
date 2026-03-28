import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Cypress Springs Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CYPRESS+SPRINGS&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Cypress Springs current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CYPRESS+SPRINGS&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Cypress Springs 2024 archive' },
  {
    rawText: `Cypress Springs Lake, Texas Bass Fishing Guide

Lake Cypress Springs is an 3,450-acre private lake (Franklin County Water District) in Franklin County, northeast Texas near Mount Vernon. It is one of the few private/restricted access lakes in Texas, though day use permits are available. Clear to slightly stained water. Known as one of Texas's top bass fisheries with excellent largemouth numbers and quality. Surrounded by pine and hardwood forest.

KEY PATTERNS:
- Spring (Mar-May): Exceptional spawning bass in coves and along timbered banks 2-8 feet. Finesse tactics shine in clear water — drop shots, Ned rigs (green pumpkin, black/blue), wacky Senkos. Also spinnerbaits (white/chartreuse) and medium-diving crankbaits (sexy shad) along points.
- Summer: Bass move to 12-20 foot timber and brush structure. Drop shots with finesse worms (Roboworm, Zoom Finesse Worm), Carolina rigs, deep-diving crankbaits on main lake points. Night fishing with dark swimjigs on timber edges.
- Fall: Surface activity returns — buzzbaits, poppers, walking baits along timber banks. Lipless cranks on main lake. Spinnerbaits in coves.
- Winter: Blade baits and jigging spoons on 20-30 foot structure. Finesse drop shots near timber.

KEY STRUCTURES: Standing timber throughout, dock areas (private), creek channel bends, main lake points, submerged brush piles.

TOP BAITS: Drop shot (Roboworm Straight Tail, morning dawn or green pumpkin), Ned rig (green pumpkin), wacky Senko (green pumpkin or watermelon), spinnerbait (white double willow), deep-diving crankbait (sexy shad, chartreuse bluegill), jigging spoon (chrome), buzzbait (white), swimjig (black/blue or white shad).

NOTES: Private lake — obtain day permit from Franklin County Water District. No live wells allowed on some days. Excellent water quality and bass population. Known for producing 8-12 lb largemouth. Pressure is lower than most TX lakes due to access restrictions.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Cypress Springs Lake knowledge — private East TX lake, quality largemouth, clear water'
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
