import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Waxahachie'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WAXAHACHIE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Waxahachie current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=WAXAHACHIE&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Waxahachie 2024 archive' },
  {
    rawText: `Lake Waxahachie, Texas Bass Fishing Guide

Lake Waxahachie is a small reservoir of approximately 690 acres in Ellis County, north-central Texas, near Waxahachie. It serves as the city of Waxahachie's water supply. Stained to slightly murky water. Largemouth bass are the primary target species. Also holds crappie and catfish. Features riprap, timber, aquatic vegetation, and dock structure. A local community lake.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in shallow coves and along vegetated banks (2-6 feet). Soft plastics dominant — Zoom Senko (watermelon, natural shad), Texas-rigged Zoom Trick Worm (watermelon/red). Spinnerbaits (chartreuse/white) along grass and timber edges. Topwater (buzzbait, popper) in early morning.
- Summer: Bass retreat to shaded dock structure, riprap, and deeper timber/brush (8-15 feet). Carolina rig with lizard (green pumpkin), Texas-rigged worm (black/blue, purple). Evening topwater action near docks.
- Fall: Excellent shad-following action — spinnerbaits, lipless cranks (1/2oz Red Eye Shad, chrome/blue), walking baits at dawn.
- Winter: Finesse only — drop shot, shakey head, small jig on deeper structure near channel.

KEY STRUCTURES: Dock lines, aquatic vegetation patches in coves, riprap banks, submerged timber, creek channel bends, main lake humps.

TOP BAITS: Zoom Senko (watermelon, green pumpkin), spinnerbait (chartreuse/white), lipless crankbait (chrome/red), Texas rig worm (watermelon/red), popper (bone, white), buzzbait (white/chartreuse), drop shot with 4" finesse worm.

NOTES: Small pressure lake — access limited, check city regulations for fishing permits. Best largemouth fishing is spring spawn and fall turnover. A productive community lake for local anglers.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Waxahachie knowledge — small Ellis County TX city lake, largemouth'
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
