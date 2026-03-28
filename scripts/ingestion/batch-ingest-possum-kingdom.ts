import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Possum Kingdom Lake'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=POSSUM+KINGDOM&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Possum Kingdom current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=POSSUM+KINGDOM&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Possum Kingdom 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=POSSUM+KINGDOM&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Possum Kingdom 2023 archive' },
  {
    rawText: `Possum Kingdom Lake, Texas Bass Fishing Guide

Possum Kingdom Lake is a 16,716-acre impoundment on the Brazos River in Palo Pinto County. Clear to semi-clear water with dramatic rocky bluffs, cliffs, and submerged timber. One of West Texas's premier bass fisheries. Holds largemouth bass, spotted bass, striped bass, white bass, and catfish. Average depth 60 feet, max 145 feet. Fish thrive in rocky structure.

KEY PATTERNS:
- Spring prespawn (Feb-Mar): Spotted bass move to rocky main lake points and bluff walls 15-25 feet. Drop shots with finesse worms (Roboworm Straight Tail, morning dawn or green pumpkin), shakey heads, Ned rigs. Largemouth move to upper creek arms with flatter banks — jerkbaits, swimbaits, shallow crankbaits.
- Spawn (Apr-May): Largemouth bed in pockets and creek arm flats 3-8 feet. Spotted bass nest on gravel/rocky areas near bluff transitions. Finesse tactics: wacky rigs, Senkos, tubes (green pumpkin, brown). Morning topwater — Sammy, Zara Spook on main lake.
- Summer: Spotted bass stack on deep bluff walls 20-40 feet — drop shots, Carolina rigs, spoons. Early morning topwater on bluff walls. Stripers roam main lake following shad. Night fishing excellent — black/blue swimjigs, dark-colored worms on rocky points.
- Fall: Best season for reaction baits. Squarebill crankbaits and bladed jigs along rocky banks as bass chase shad to points. Topwater in mornings. Stripers surface feed — white/chrome spoons, topwater.
- Winter: Spotted bass remain active on rocky 25-35 foot bluff walls — blade baits, jigging spoons, drop shots. Largemouth inactive — finesse only.

KEY STRUCTURES: Rocky bluff walls (main bass location), secondary points with rocky bottoms, creek arm flats (largemouth spring), submerged timber in creek arms, Costello Creek arm, Hell's Gate area.

TOP BAITS: Drop shot with Roboworm Straight Tail (morning dawn, Aaron's magic), Ned rig (green pumpkin, black/blue), shakey head with Zoom OG Crawler, 1/2oz jigging spoon, Heddon Zara Spook (bone, chrome), Strike King Pro-Model 5XD crankbait (sexy shad), swimjig (black/blue) with craw trailer, tube bait (green pumpkin).

NOTES: Striped bass excellent — use live shad or large swimbaits. Night fishing produces big spotted bass in summer. Boat traffic heavy in summer — fish early mornings. Water clarity usually 8-15 feet.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Possum Kingdom knowledge — rocky bluffs, spotted bass, clear water tactics'
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
