import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Ray Hubbard'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RAY+HUBBARD&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Ray Hubbard current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RAY+HUBBARD&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Ray Hubbard 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=RAY+HUBBARD&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Ray Hubbard 2023 archive' },
  {
    rawText: `Lake Ray Hubbard, Texas Bass Fishing Guide

Lake Ray Hubbard is a 22,745-acre reservoir on the East Fork of the Trinity River in Collin, Dallas, Kaufman, and Rockwall counties, east of Dallas. One of the largest urban bass lakes in the nation. Stained water, very high fishing pressure year-round. Features extensive hydrilla coverage, riprap seawalls, dock lines, and shallow flats. Largemouth bass are primary; white bass, hybrid stripers, crappie present.

KEY PATTERNS:
- Spring (Mar-May): Best season. Largemouth spawn in hydrilla edges, riprap, and cove flats (2-8 feet). Hollow-body frogs over hydrilla mats (black/blue, white/chartreuse), punch rigs (1.5oz, black/blue craw), spinnerbaits (chartreuse/white), wacky Senkos near riprap. Prespawn: crankbaits (squarebill, sexy shad or chartreuse/crawfish) along riprap seawalls.
- Summer: Bass buried in hydrilla mats — punching is the dominant technique. Heavy punch rigs (1.5-2oz) with creature baits. Night fishing along riprap and dock pilings. Heat drives fish deep by midday.
- Fall: Schooling action on main lake with lipless cranks, topwater walking baits, swimbaits. Spinnerbaits along hydrilla edges as grass begins dying. One of DFW's best fall lakes.
- Winter: Deep finesse — drop shots, Ned rigs, shakey heads near riprap and channel structure. Hybrids active on main lake — jigging spoons.

KEY STRUCTURES: Hydrilla flats (primary structure), riprap seawalls (all around lake), dock lines in coves, Muddy Creek arm, Rowlett Creek arm, main lake humps, I-30 bridge areas.

TOP BAITS: Hollow-body frog (black/blue, white/chartreuse), punch rig 1.5-2oz (black/blue craw, watermelon craw), squarebill crankbait (chartreuse/crawfish, sexy shad), spinnerbait (chartreuse/white), lipless crank (Red Eye Shad chrome/blue), wacky Senko (green pumpkin), drop shot (Roboworm), Ned rig (green pumpkin).

NOTES: Extremely high fishing pressure — unique fish patterns develop. Fish hydrilla mats with punch rigs (signature Ray Hubbard technique). Zebra mussels present. Early morning and evening best. Urban lake — 24/7 access at most ramps. One of DFW's most-fished lakes.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Ray Hubbard knowledge — DFW urban lake, punch rigs, hydrilla mats, heavy pressure'
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
