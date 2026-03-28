import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Gibbons Creek Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=GIBBONS+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Gibbons Creek current fishing report' },
  {
    rawText: `Gibbons Creek Reservoir, Texas Bass Fishing Guide

Gibbons Creek Reservoir is an approximately 2,600-acre cooling lake for the Gibbons Creek Steam Electric Station in Grimes County, southeast Texas, near Carlos. A power plant cooling reservoir with warm water discharge maintaining elevated temperatures year-round — similar to Squaw Creek in this regard. The warm water effects attract bass to remain active in winter. Largemouth bass are the primary game fish; also holds catfish and crappie. Features timber, brush, and the warm discharge channel.

KEY PATTERNS:
- Year-round warm water: Power plant discharge keeps water temps elevated — fish active even in January and February when other Texas lakes slow.
- Spring (Feb-Apr): Bass spawn earlier than surrounding lakes. Soft plastics excel — Texas-rigged lizards (watermelon, green pumpkin), wacky Senkos. Spinnerbaits (white/chartreuse) along timber. Topwater begins earlier due to warm water.
- Summer: Fish near warm discharge channel and adjacent structure. Topwater at dawn — Whopper Plopper, walking baits. Frogs and swim jigs in timber.
- Fall/Winter: Key season — bass congregate near warm discharge. Lipless cranks (Red Eye Shad), swimbaits, spinnerbaits all effective. Fish are active and aggressive near discharge areas.

KEY STRUCTURES: Warm water discharge channel (priority location), standing timber throughout, creek arm bends, main lake points, any brush piles near the discharge.

TOP BAITS: Lipless crankbait (chrome/red, sexy shad), swim jig (white shad) with paddle tail, Whopper Plopper (bone, chrome), spinnerbait (white/chartreuse), Texas rig lizard (watermelon, green pumpkin), wacky Senko, buzzbait (white).

NOTES: Power plant cooling reservoir — access controlled by utility (LCRA or private operator). Check current access policies before visiting. The warm water discharge is the defining advantage — fish near it in cooler months. Under-pressured due to access limitations. An excellent winter destination when other lakes are cold.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Gibbons Creek Reservoir knowledge — SE TX cooling lake, warm water advantage, year-round bass'
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
