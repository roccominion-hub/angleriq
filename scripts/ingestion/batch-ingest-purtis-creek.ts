import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Purtis Creek State Park Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PURTIS+CREEK&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Purtis Creek current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=PURTIS+CREEK&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Purtis Creek 2024 archive' },
  {
    rawText: `Purtis Creek State Park Lake, Texas Bass Fishing Guide

Purtis Creek State Park Lake is a 355-acre lake in Van Zandt County, East Texas, near Eustace. Managed by Texas Parks & Wildlife as part of Purtis Creek State Park. Known as one of Texas's premier catch-and-release bass fisheries with strict regulations — 5-fish daily limit, 16-inch minimum length, no culling allowed. This results in exceptional bass numbers and size. Water is typically stained to clear for an East Texas lake. Features aquatic vegetation, timber, and dock structure.

KEY PATTERNS:
- All seasons — unique quality fishery: The strict slot/size/limit regulations make this lake exceptional. Expect to catch numbers of 2-4 lb bass and encounter fish over 8 lbs.
- Spring (Mar-May): Outstanding spawn. Bedding fish visible in 2-5 feet. Sight fishing with Zoom Finesse Worm (green pumpkin, watermelon), wacky Senkos, tube baits. Finesse is key — fish are pressured and learn quickly. Also: small swim jigs and underspin lures.
- Summer: Bass hold near vegetation edges, docks, and timber. Drop shots (Roboworm, morning dawn), Ned rigs (green pumpkin), small swim jigs. Finesse presentations outperform power fishing.
- Fall: Excellent topwater early morning — small Zara Spooks, Pop-Rs, walking baits. Lipless cranks along vegetation edges.
- Winter: Bass still active due to East TX mild winters. Drop shots, blade baits near timber.

KEY STRUCTURES: Aquatic vegetation edges, submerged timber, dock areas, creek channel bends, main lake humps (limited due to small size), shoreline brushpiles.

TOP BAITS: Zoom Finesse Worm (green pumpkin, watermelon, black/blue — 4"), wacky Senko (green pumpkin, natural), drop shot with Roboworm Straight Tail (morning dawn, green pumpkin), Ned rig (green pumpkin Z-Man), small swim jig (white shad, 1/4oz), small Zara Spook, Pop-R.

NOTES: One of Texas's best managed bass lakes — catch numbers of quality fish. Strict regulations enforced by TPWD. No boat motors over 9.9 hp (electric motors encouraged). State park fees apply. Crowded on spring weekends — arrive early. Finesse techniques outperform here. A must-visit for quality East Texas largemouth.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Purtis Creek SP Lake knowledge — managed catch-release lake, quality bass, strict regs, finesse'
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
