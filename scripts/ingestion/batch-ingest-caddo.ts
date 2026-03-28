/**
 * Batch ingestion — Caddo Lake, TX
 * Sources: TPWD lake page, TPWD fishing reports (multi-year), verified Wired2Fish, curated rawText
 */
import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Caddo Lake'; const STATE = 'TX'

type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  // ── TPWD (guaranteed content) ────────────────────────────────────────────
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/caddo/', sourceType: 'article', org: 'TPWD', date: '2024-01-01', notes: 'TPWD Caddo Lake page — tips & tactics, cover/structure, species' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CADDO&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-01-01', notes: 'TPWD Caddo current fishing report — guide data, baits, conditions' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CADDO&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Caddo 2023 archive fishing reports' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=CADDO&archive=all&yearcat=2022&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2022-06-01', notes: 'TPWD Caddo 2022 archive fishing reports' },
  // ── Confirmed Wired2Fish ─────────────────────────────────────────────────
  { url: 'https://www.wired2fish.com/bass-fishing/the-best-bass-fishing-lakes-in-texas', sourceType: 'article', org: 'Wired2Fish', date: '2023-01-01', notes: 'Best TX lakes — Caddo section: swamp patterns, cypress, vegetation' },
  { url: 'https://www.wired2fish.com/winter-fishing/southern-grass-winter-bass-fishing-refuge', sourceType: 'article', org: 'Wired2Fish', date: '2022-12-01', notes: 'Southern grass winter bass fishing — core Caddo pattern' },
  // ── Curated rawText — lake-specific knowledge ────────────────────────────
  {
    rawText: `Caddo Lake, Texas Bass Fishing Guide

Caddo Lake is a 26,800-acre natural cypress swamp lake on the Texas-Louisiana border. It is unlike any other Texas bass fishery — shallow (max 20 feet), heavily vegetated (95% cover), dominated by bald cypress trees, lily pads, hydrilla, and emergent vegetation.

KEY PATTERNS:
- Spring (Feb-April): Trophy bass fishing peaks in March. Bass spawn in cypress flats and pad-laden coves. Best baits: hollow body frogs, punch rigs into hydrilla, wacky-rigged Senkos around cypress trees. Colors: watermelon red, black/blue. Water temps 58-68°F.
- Summer: Early morning topwater with frogs around pads. Swim jigs and bladed jigs through hydrilla edges. Punching mats with 1.5-2oz weights and creature baits (black/blue, green pumpkin). Fish shade — cypress trees mid-day.
- Fall: Bass move to grass edges and open pockets. Spinnerbaits (white/chartreuse) along grass lines. Swimbaits and paddle tails. Reaction baits at grass edges.
- Winter: Senkos (Texas rig or wacky), flukes, and swimbaits. Slow presentations near cypress roots and deep grass edges. Best colors: watermelon red (clear conditions), black/blue (stained).

KEY STRUCTURES: Cypress tree root systems, lily pad fields, hydrilla mats, duck blinds (fish attract bass), grass points, and pocket entrances.

WATER CONDITIONS: Stained to moderately clear, 8-20 feet max depth, most bass caught in 2-8 feet. pH and clarity affect bait choice — clear water = natural colors, stained = dark/chartreuse.

TOP BAITS: Zoom Trick Worm (watermelon red), Strike King Rage Bug (black/blue), Zoom Super Fluke (white/pearl), Strike King Swim Jig (black/blue or green pumpkin), Z-Man ChatterBait (black/blue), Zoom Horny Toad (black), hollow body frogs (black, white). Punch rigs: 1.5-2oz tungsten with Rage Bug or D-Bomb.

LOCAL GUIDE: Vince Richards (Caddo Lake Fishing & Fellowship) — moon phases are critical here. Big bass move during new and full moon periods. Multiple 10-12lb bass caught on correct moon tides.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Caddo Lake knowledge — patterns, baits, structure, seasonal tactics'
  },
]

async function main() {
  console.log(`\n🎣 ${LAKE} — ${SOURCES.length} sources`)
  const apiKey = process.env.GEMINI_API_KEY!
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
      await new Promise(r => setTimeout(r, 8000))
    } catch (e: any) { console.error(`     ❌ ${e.message?.slice(0,100)}`); errors++ }
  }
  console.log(`\n${'─'.repeat(50)}\n✅ ${LAKE}: ${total} reports, ${errors} errors`)
}
main().catch(console.error)
