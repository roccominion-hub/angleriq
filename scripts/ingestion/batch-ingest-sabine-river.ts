import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Sabine River'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=SABINE+RIVER&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Sabine River current fishing report' },
  {
    rawText: `Sabine River, Texas Bass Fishing Guide

The Sabine River forms the eastern border of Texas with Louisiana and offers excellent bass fishing in its lower reaches and major reservoirs (Toledo Bend, Lake Fork headwaters). The lower Sabine River below Toledo Bend Dam — flowing through Sabine and Newton counties — offers outstanding largemouth and spotted bass fishing in natural river setting with oxbow lakes, cutoffs, and adjacent backwater areas.

KEY PATTERNS:
- Spring (Mar-May): Best season for river bass. Largemouth spawn in shallow oxbow lakes and river backwaters connected to main river (2-6 feet). Spinnerbaits (chartreuse/white) along flooded timber banks, Texas-rigged lizards and Senkos (watermelon, junebug). Spotted bass on rocky/current areas — drop shots, swim jigs, crankbaits.
- Summer: Fish early morning and evening. Largemouth in shaded timber, laydowns, and brush in slower backwaters. Texas-rigged worms (black/blue, watermelon), swim jigs. River current edges with crankbaits and spinnerbaits. Bass stack below current breaks.
- Fall: Excellent reaction bait bite — lipless cranks and spinnerbaits along timber. Shad migration downstream.
- Winter: Slow bite — finesse tactics in deepest river holes and oxbow lakes.

KEY STRUCTURES: Flooded timber and laydowns along banks, oxbow lakes and cutoffs (key largemouth habitat), river current seams and eddies, rocky bluffs (spotted bass), logjams and brush piles, sand and gravel bars.

TOP BAITS: Spinnerbait (chartreuse/white double willow), Texas rig Senko (watermelon, junebug), swim jig (white shad, black/blue), Texas rig lizard (green pumpkin), crankbait (squarebill — sexy shad, crawfish), drop shot with finesse worm (spotted bass), buzzbait (white), hollow-body frog (in timber/brush).

NOTES: Check river gauge levels before fishing — Sabine can flood significantly. The lower Sabine (below Toledo Bend) is one of Texas's great undiscovered bass fisheries. Oxbow lake access varies — some require navigation through timber. Excellent for anglers seeking wild river bass experience. Alligator gar and catfish also present.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Sabine River TX knowledge — lower river largemouth, oxbow lakes, timber, river bass'
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
