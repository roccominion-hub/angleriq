import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Pat Cleburne'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PAT+CLEBURNE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Pat Cleburne current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PAT+CLEBURNE&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Pat Cleburne 2024 archive' },
  {
    rawText: `Lake Pat Cleburne, Texas Bass Fishing Guide

Lake Pat Cleburne is a small city reservoir of approximately 1,516 acres in Johnson County, north-central Texas, near Cleburne. It serves as the water supply for the city of Cleburne. Stained water with moderate clarity. Holds largemouth bass, crappie, white bass, channel catfish, and hybrid striped bass. The lake features rock riprap, timber, and aquatic vegetation in coves.

KEY PATTERNS:
- Spring (Mar-May): Largemouth spawn in shallow coves (2-6 feet) with brush and timber. Soft plastics: Zoom Trick Worm (watermelon/red, junebug), Texas-rigged lizards. Spinnerbaits (chartreuse/white) and crankbaits along rock riprap banks. Morning topwater action.
- Summer: Bass relate to deeper structure — riprap along dam, submerged brush/timber in 10-18 feet. Texas-rigged worms (black/blue, purple), drop shots with finesse worms, Carolina rigs. Hybrid stripers active on main lake with live shad.
- Fall: Schooling white bass and hybrids on main lake — spoons, small swimbaits, tail spinners. Largemouth hit spinnerbaits and crankbaits along riprap.
- Winter: Slow presentation near rock riprap (dam face especially) — blade baits, jigging spoons, finesse drop shots.

KEY STRUCTURES: Rock riprap along dam and shorelines, submerged timber in coves, creek channel bends, main lake points, shallow grass patches in back coves.

TOP BAITS: Spinnerbait (white/chartreuse, 3/8oz), Zoom Trick Worm (watermelon/red), Texas rig with craw (black/blue), drop shot finesse worm, 1/2oz white marabou jig (for hybrids), jigging spoon (chrome), crankbait (chartreuse/crawfish, sexy shad), buzzbait (white).

NOTES: City of Cleburne manages access — check hours and regulations. Good crappie population in timber. White bass and hybrids provide exciting spring spawning run action. Best largemouth fishing is spring and fall. Under-pressured compared to nearby DFW area lakes.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Pat Cleburne knowledge — small North TX city lake, riprap, hybrids'
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
