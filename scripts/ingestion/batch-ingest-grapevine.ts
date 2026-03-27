/**
 * Batch ingestion — Lake Grapevine, TX
 * Sources: TPWD lake page, TPWD fishing reports, curated rawText
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Grapevine'; const STATE = 'TX'

type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  // ── TPWD (guaranteed content) ────────────────────────────────────────────
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/grapevine/', sourceType: 'article', org: 'TPWD', date: '2024-01-01', notes: 'TPWD Grapevine — largemouth, smallmouth, spotted bass, rocky structure' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=GRAPEVINE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-01-01', notes: 'TPWD Grapevine current fishing report — guide data, baits, conditions' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=GRAPEVINE&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Grapevine 2023 archive fishing reports' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=GRAPEVINE&archive=all&yearcat=2022&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2022-06-01', notes: 'TPWD Grapevine 2022 archive fishing reports' },
  // ── Curated rawText ──────────────────────────────────────────────────────
  {
    rawText: `Lake Grapevine, Texas Bass Fishing Guide

Lake Grapevine is a 6,684-acre DFW-area reservoir on Denton Creek in Tarrant and Denton counties. It holds largemouth, smallmouth, AND spotted bass — one of the few Texas lakes with all three species. Water is typically stained. Max depth 65 feet. Generally lacks vegetation; fish structure-oriented.

KEY PATTERNS:
- Spring prespawn: Largemouth move to main lake points and rocky banks. Smallmouth stack on boulder fields and rocky transitions. Spotted bass on deep rocky points and bluff ends. Best baits: jerkbaits (natural shad colors), Ned rigs, small swimbaits (3-4"), drop shots. Depths: 8-20 feet.
- Spawn: Bass move shallow to gravel and rock bottoms near the Twin Coves area (flooded timber). Soft stickbaits (wacky-rigged Senko), finesse jigs, Ned rigs around any hard bottom.
- Summer: Fish deep structure — underwater boulders, channel ledges, humps. Drop shots (4-6" finesse worms, green pumpkin/morning dawn). Ned rigs. Smallmouth love shad-colored small swimbaits. Water intake near dam attracts white bass — also holds largemouth.
- Fall: Topwater and reaction baits as shad school up. Lipless crankbaits (chrome/red), spinnerbaits, swimbaits along rocky banks and points. Follow bird activity.
- Winter: Very slow. Jigging spoons and blade baits on main lake humps 20-40 feet. White bass on deep humps with white jigs. Spotted bass on bluff ends with drop shots.

KEY STRUCTURES: Boulder fields and rocky shorelines (unique to Grapevine), underwater rock piles, flooded timber in Twin Coves, boat docks in McPherson Slough, main lake points, channel ledges.

TOP BAITS: Finesse worms on drop shot (green pumpkin, morning dawn, oxblood), 2.75" Z-Man TRD on Ned head, 4" Keitech paddle tail (natural shad), jerkbait (X-Rap, Lucky Craft Pointer 100), finesse jig (1/4oz, green pumpkin), jigging spoon (1oz, chrome) for winter. Smallmouth respond well to tube baits.

NOTES: Slot limit on largemouth. Grapevine's smallmouth fishery is growing and underrated. Clear-to-stained water means downsizing presentations vs. murkier DFW lakes. Light fluorocarbon (8-12lb) on drop shot, spinning gear.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Grapevine knowledge — smallmouth/spotted/LM patterns, rocky structure, finesse focus'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.ANTHROPIC_API_KEY!
  let total = 0, errors = 0
  for (const [i, s] of SOURCES.entries()) {
    const label = s.url?.slice(0, 60) || 'rawText'
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
