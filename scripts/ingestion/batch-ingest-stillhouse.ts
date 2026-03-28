import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Stillhouse Hollow Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/stillhouse_hollow/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Stillhouse Hollow Lake fishing guide — species, structure, tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=STILLHOUSE+HOLLOW&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Stillhouse Hollow current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/central-texas-highland-lakes-bass-fishing', sourceType: 'article', org: 'Wired2Fish', date: '2023-03-01', notes: 'Central Texas lakes bass tactics applicable to Stillhouse Hollow' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — Central TX reservoir tactics' },
  {
    rawText: `Stillhouse Hollow Lake, Texas Bass Fishing Guide

Stillhouse Hollow Lake is an 6,430-acre U.S. Army Corps of Engineers reservoir on the Lampasas River in Bell County, Central Texas, near Killeen and Belton. One of the Central Texas Highland-adjacent lakes. Clear to slightly stained water. Good largemouth bass fishery with quality fish. Also holds white bass, striped bass, catfish. Features rocky points, submerged timber in creek arms, riprap, and brush piles.

KEY PATTERNS:
- Spring (Mar-May): Bass spawn on rocky gravel flats and creek arm shallows (3-8 feet). Spinnerbaits (chartreuse/white), Texas-rigged Zoom Lizard (green pumpkin, watermelon), jerkbaits on main lake rocky points. Good topwater bite early mornings.
- Summer: Bass move to 15-25 feet on main lake rocky structure. Drop shots (finesse worm, natural shad colors), deep crankbaits (DT10-DT16 in natural shad), Carolina rigs. White bass and stripers roam open water.
- Fall: Excellent schooling bite as bass chase shad on main lake points and flats. Medium crankbaits (shad colors), spinnerbaits, topwater. Stripers very active.
- Winter: Rocky main lake structure at 20-30 feet. Blade baits, jigging spoons, slow-rolled swimbaits.

KEY STRUCTURES: Lampasas River arm (upper lake timber), rocky main lake points, riprap near dam, secondary creek arms, main lake humps and ledges, dam face.

TOP BAITS: Drop shot (Roboworm, natural shad/morning dawn), jerkbait (Rapala Ghost, natural shad), spinnerbait (chartreuse/white 3/8oz), Texas rig lizard (green pumpkin), deep crankbait (DT10 natural shad), Carolina rig (green pumpkin), blade bait (silver).

NOTES: Stillhouse Hollow is paired with nearby Belton Lake — both are Army Corps lakes. Good striper fishing with live shad. Rocky terrain means footwear matters on bank fishing. Killeen/Belton area provides services. Quality largemouth with potential for big fish on rocky main lake structure.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Stillhouse Hollow knowledge — Central TX, Lampasas River, rocky structure, quality largemouth'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/drop-shot-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2022-09-01', notes: 'Drop shot tactics — key technique for Stillhouse Hollow deep rocky structure' },
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
