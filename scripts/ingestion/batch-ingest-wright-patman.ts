import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Wright Patman Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/wright_patman/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Wright Patman Lake fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WRIGHT+PATMAN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Wright Patman current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/east-texas-bass-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2023-04-01', notes: 'East Texas bass tactics applicable to Wright Patman Lake' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — NE TX reservoir tactics' },
  {
    rawText: `Wright Patman Lake, Texas Bass Fishing Guide

Wright Patman Lake (formerly Lake Texarkana) is a 20,300-acre U.S. Army Corps of Engineers reservoir on the Sulphur River in Cass and Bowie counties in Northeast Texas, near Texarkana. One of the larger East Texas reservoirs. Shallow, stained water. Renowned for outstanding crappie fishing and good largemouth bass. Features shallow flats, extensive timber, aquatic vegetation, and numerous creek arms. The lake is notably shallow — averaging about 8 feet.

KEY PATTERNS:
- Spring (Mar-May): Peak season for largemouth. Bass spawn in shallow timber and flooded brush (2-5 feet). Spinnerbaits (chartreuse/white), Texas-rigged plastics (Zoom Trick Worm watermelon/red, junebug), crankbaits along timber edges. The Sulphur River arm is prime staging area.
- Summer: Bass seek deepest available water (8-15 feet in creek channels) and shade of timber. Swim jigs alongside timber, Texas-rigged worms in brush, topwater at dawn/dusk along grass edges.
- Fall: Good schooling action — spinnerbaits, lipless cranks, topwater walkers along main lake flats. White bass active in open water.
- Winter: Tough due to shallow water — blade baits and jigs near old channel edges, warmest water in mid-lake.

KEY STRUCTURES: Sulphur River main channel, Standing timber, Little Pine Island Bayou arm, Piney Creek arm, main lake shallow flats, brushy coves throughout.

TOP BAITS: Spinnerbait (chartreuse/white, black/blue), Texas rig Zoom Trick Worm (watermelon/red, junebug), squarebill crankbait (chartreuse crawfish), swim jig (white), lipless crank (Red Eye Shad), buzzbait (chartreuse/white), jig with chunk (black/blue).

NOTES: Wright Patman is famous for crappie — some of the best in Texas. The shallow nature means bass stay shallower year-round than deeper impoundments. Best largemouth fishing in spring. Army Corps recreation areas. Texarkana provides full services.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Wright Patman Lake knowledge — NE TX, Sulphur River, shallow, crappie/largemouth'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/shallow-water-bass-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2022-05-01', notes: 'Shallow water bass tactics — critical for Wright Patman shallow flats' },
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
