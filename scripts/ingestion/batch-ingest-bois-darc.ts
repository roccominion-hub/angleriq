import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = "Bois d'Arc Lake"; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: "https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BOIS+D'ARC&archive=latest&yearcat=current&Submit=Go", sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: "TPWD Bois d'Arc current fishing report" },
  { url: "https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BOIS+D'ARC&archive=all&yearcat=2024&Submit=Go", sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: "TPWD Bois d'Arc 2024 archive" },
  {
    rawText: `Bois d'Arc Lake, Texas Bass Fishing Guide

Bois d'Arc Lake is Texas's newest major reservoir, completed in 2019 in Fannin County northeast of Dallas. Approximately 16,641 acres. It was specifically designed to provide water supply for the DFW metroplex. The lake features excellent bass habitat with flooded timber, brush, and creek channels from when it was first filled. Water tends to be slightly stained/green. Largemouth bass are the primary target with a strong population boosted by managed stocking.

KEY PATTERNS:
- Post-fill boom fishery: Exceptional bass numbers due to new lake effect (flooded vegetation and terrestrial habitat). Bass grow quickly with abundant forage.
- Spring (Mar-May): Largemouth spawn extensively in flooded timber, brush, and cove flats 2-8 feet. Soft plastics dominant — Zoom Senko (watermelon red, natural), wacky rigs, Texas-rigged lizards. Spinnerbaits and shallow crankbaits along timber edges.
- Summer: Bass push to deeper timber structure (10-18 feet) and channel bends. Texas-rigged worms (black/blue, green pumpkin), swim jigs with trailers in timber. Morning topwater in flooded timber coves.
- Fall: Excellent shad-chasing bite — lipless crankbaits (Red Eye Shad, chrome/red), spinnerbaits, and squarebill cranks along timbered points.
- Winter: Finesse fishing on channel edges — drop shots, Ned rigs, shakey heads. Bass congregate on main lake structure in 15-25 feet.

KEY STRUCTURES: Flooded standing timber (abundant throughout), submerged creek channels, cove flats, main lake points, roadbeds.

TOP BAITS: Zoom Senko (watermelon, natural), wacky rig (green pumpkin), spinnerbait (white/chartreuse, double willow), squarebill crankbait (sexy shad, chartreuse crawfish), Texas-rigged worm (black/blue, watermelon red), swim jig (white/pearl), lipless crankbait, buzzbait (white/chartreuse).

NOTES: New lake effect — excellent bass growth rates and numbers. Lake is still maturing and improving. Watch for TPWD slot limit regulations. Access ramps are established. Excellent fishery that should continue to grow in quality.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: "Curated Bois d'Arc Lake knowledge — new Texas reservoir, new lake effect, flooded timber"
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
