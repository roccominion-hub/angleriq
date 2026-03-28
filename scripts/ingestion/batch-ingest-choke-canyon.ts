import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Choke Canyon Reservoir'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CHOKE+CANYON&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Choke Canyon current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CHOKE+CANYON&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Choke Canyon 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CHOKE+CANYON&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Choke Canyon 2023 archive' },
  {
    rawText: `Choke Canyon Reservoir, Texas Bass Fishing Guide

Choke Canyon Reservoir is a 26,000-acre impoundment on the Frio River in McMullen and Live Oak counties, South Texas, near Three Rivers. One of Texas's premier bass lakes — consistently ranked among the top 10. Warm South Texas climate allows year-round bass activity. Features abundant submerged timber, brush, standing dead trees, prickly pear flats, mesquite, and aquatic vegetation. Largemouth bass (Florida-strain) grow exceptionally large here.

KEY PATTERNS:
- Year-round warmth: South Texas location means bass are active even in winter. Unlike North TX, fish move shallow year-round when conditions allow.
- Winter/Spring (Nov-Mar): Bass actively feeding in 5-15 feet of submerged timber. Lipless crankbaits (1/2oz Red Eye Shad, chrome/red), swim jigs with trailers alongside timber, jerkbaits (suspending, natural shad). Winter brings some of the best fishing — bass pack against timber in predictable spots.
- Spring spawn (Feb-Apr): Earlier than most TX lakes due to South TX climate. Females 8-13 lbs caught during spawn. Soft plastics on beds — wacky Senkos, Zoom Finesse Worm, lizards. Spinnerbaits (white/chartreuse) and swim jigs along timber edges.
- Summer: Bass stay shallow due to warm nights and active shad. Topwater (Whopper Plopper, Zara Spook) at dawn/dusk on timber flats. Frogs and punch rigs in vegetation. Late evening swim jigs.
- Fall: Excellent all-around season — spinnerbaits, lipless cranks, swim jigs through timber. Shad-following bass hit everything.

KEY STRUCTURES: Submerged timber throughout (dominant feature), main lake points, Frio River channel, South Shore area, Calliham unit, North Shore brush flats, prickly pear and mesquite brush.

TOP BAITS: Strike King Red Eye Shad (chrome/red, sexiest shad), swim jig (white shad, black/blue) with paddle tail, Whopper Plopper (bone), suspending jerkbait (Megabass Vision 110 — natural shad), wacky Senko (green pumpkin, watermelon), hollow-body frog (black/blue), spinnerbait (chartreuse/white double willow), Zoom Finesse Worm (green pumpkin).

NOTES: One of Texas's best chances at a 10+ lb largemouth. South Texas location means less pressure than DFW-area lakes. Choke Canyon State Park provides access (camping, ramps). Check water levels — drought impacts this lake. Bring sunscreen — South Texas sun is intense. Bass grow larger and faster here than most TX lakes.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Choke Canyon knowledge — South TX trophy bass lake, timber, year-round bite, 10+ lb largemouth'
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
