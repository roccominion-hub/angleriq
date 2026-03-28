import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Amon G. Carter'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=AMON+G.+CARTER&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Amon G. Carter current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=AMON+G.+CARTER&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Amon G. Carter 2024 archive' },
  {
    rawText: `Lake Amon G. Carter, Texas Bass Fishing Guide

Lake Amon G. Carter is a small reservoir in Bowie County, northeast Texas, near Texarkana. Approximately 600 acres. Stained to murky water typical of East Texas. Holds largemouth bass, crappie, catfish, and bream. The lake features timber, brush piles, and creek channels as primary structure.

KEY PATTERNS:
- Spring (Mar-May): Largemouth move shallow to spawn along timbered banks and brush. Soft plastics (Zoom Trick Worm, lizards in watermelon red or junebug), spinnerbaits (white or chartreuse), and lipless cranks along timber edges. Water temps 60-72°F triggers best activity.
- Summer: Fish move to deeper timber (8-15 feet) and channel edges. Texas-rigged worms (10-inch Zoom Ole Monster, black/blue or tequila sunrise) fished slowly. Early morning topwater in back coves.
- Fall: Shad-following bass hit spinnerbaits and crankbaits on main lake points. Lipless cranks (Red Eye Shad, chrome or sexy shad) and shallow crankbaits effective.
- Winter: Slow finesse fishing on deeper channel structure. Drop shots and shakey heads. Blade baits on channel edges.

KEY STRUCTURES: Standing timber throughout, submerged brush piles, creek channel edges, points where timber meets deeper water.

TOP BAITS: Zoom Trick Worm (watermelon red, junebug), 3/8oz spinnerbait (white/chartreuse), lipless crankbait (chrome/red), Texas-rigged worm (black/blue), jig with craw trailer (black/blue), buzzbait (white), shakey head (green pumpkin).

NOTES: Small lake — pressure can be significant. Best results early morning and evening. Bass tend to hold tight to timber structure year-round.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Amon G. Carter knowledge — East Texas timber lake tactics'
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
