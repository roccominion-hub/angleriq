import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Limestone'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/recreational/lakes/limestone/', sourceType: 'article', org: 'TPWD', date: '2023-01-01', notes: 'TPWD Lake Limestone fishing guide — species, structure, seasonal tactics' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=LIMESTONE&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Limestone current fishing report' },
  { url: 'https://www.wired2fish.com/bass-fishing/central-texas-bass-fishing', sourceType: 'article', org: 'Wired2Fish', date: '2023-03-01', notes: 'Central Texas bass fishing tactics applicable to Lake Limestone' },
  { url: 'https://www.bassmaster.com/bass-fishing/texas-bass-fishing/', sourceType: 'article', org: 'Bassmaster', date: '2023-01-01', notes: 'Texas bass fishing overview — Central TX reservoir tactics' },
  {
    rawText: `Lake Limestone, Texas Bass Fishing Guide

Lake Limestone is a 13,300-acre reservoir on the Navasota River in Limestone and Robertson counties in Central Texas, near Mexia and Groesbeck. A utility reservoir (Luminant/power generation). Stained to murky water. Known as an excellent largemouth bass fishery with strong populations. Also holds crappie, white bass, catfish. Features flooded timber, aquatic vegetation (hydrilla, milfoil), brush, riprap, and shallow coves.

KEY PATTERNS:
- Spring (Mar-May): Outstanding spawn period. Bass congregate in shallow timber and brush in coves (2-6 feet). Spinnerbaits (chartreuse/white, black/blue), Texas-rigged Zoom Trick Worm (watermelon/red, junebug), squarebill crankbaits (chartreuse crawfish). Topwater (buzzbait) at dawn.
- Summer: Bass seek hydrilla mats and deeper timber (10-18 feet). Punch rigs (black/blue, 3/4oz tungsten), swim jigs alongside timber. Power plant discharge area can concentrate fish in cooler months — or warm water in winter.
- Fall: Aggressive shad-chasing bite — lipless cranks (Red Eye Shad chrome/blue, chartreuse), spinnerbaits along timber lines. Navasota River arm productive for staging fish.
- Winter: Power plant warm water discharge attracts fish December-February. Blade baits, jigging spoons, swimbaits near warm water outflows. Rest of lake: deep jigs and drop shots.

KEY STRUCTURES: Navasota River main channel, Keechi Creek arm, Standing timber throughout, hydrilla flats, power plant discharge area, dam riprap, main lake points.

TOP BAITS: Spinnerbait (chartreuse/white), punch rig (black/blue), Zoom Trick Worm (watermelon/red), squarebill crank (chartreuse crawfish, sexy shad), lipless crank (Red Eye Shad), buzzbait (chartreuse), swim jig (white/chartreuse), blade bait (silver/chrome) near discharge.

NOTES: Power plant warm water discharge is unique asset — can extend bass activity in winter. Access near Groesbeck and Mexia. Check current power plant operating status as it affects water temps. Consistently good largemouth population with quality fish.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Limestone knowledge — Central TX, Navasota River, power plant, strong largemouth'
  },
  { url: 'https://www.wired2fish.com/bass-fishing/lipless-crankbait-fishing-tips', sourceType: 'article', org: 'Wired2Fish', date: '2022-10-01', notes: 'Lipless crankbait tactics — key fall technique for Lake Limestone' },
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
