import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

const LAKE = 'Lake Buchanan'; const STATE = 'TX'
type Source = { url?: string; rawText?: string; sourceType: string; tournament?: string; org?: string; date: string; notes: string }

const SOURCES: Source[] = [
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BUCHANAN&archive=latest&yearcat=current&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2026-02-25', notes: 'TPWD Buchanan current fishing report' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BUCHANAN&archive=all&yearcat=2024&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2024-06-01', notes: 'TPWD Buchanan 2024 archive' },
  { url: 'https://tpwd.texas.gov/fishboat/fish/action/reptform2.php?lake=BUCHANAN&archive=all&yearcat=2023&Submit=Go', sourceType: 'article', org: 'TPWD', date: '2023-06-01', notes: 'TPWD Buchanan 2023 archive' },
  {
    rawText: `Lake Buchanan, Texas Bass Fishing Guide

Lake Buchanan is a 23,200-acre reservoir on the Colorado River in Burnet and Llano counties, in the Texas Hill Country, northwest of Austin. The largest of the Highland Lakes chain. Clear to slightly stained water (Hill Country character). Rocky, rugged terrain with granite outcrops, cedar bluffs, and points. Features largemouth bass, smallmouth bass (a Texas rarity), Guadalupe bass, striped bass (excellent), white bass, and catfish. The striper fishery is world-class.

KEY PATTERNS:
- Striped bass (primary fishery): Year-round. Deep water schools following threadfin and gizzard shad. Live bait (shad) under bobbers in 30-60 feet, or large swimbaits (white, 6-8") jigged vertically. Topwater schooling action at dawn on main lake — chrome poppers, slashbaits, 3/4oz chrome spoons.
- Largemouth: Spring spawn (Mar-Apr) in rocky coves and creek arms with gravel/sand bottom (3-8 feet). Crankbaits (squarebill on rocks — chartreuse/crawfish), Texas-rigged worms (watermelon, green pumpkin), swim jigs. Summer: deeper rocky structure — drop shots, finesse, Carolina rigs. Fall: topwater on main lake points at dawn.
- Guadalupe bass and smallmouth: Rocky bluff walls and fast-water areas near upper Colorado River arm. Small crankbaits (Rapala Shad Rap, smoke/chrome), drop shots, inline spinners, tubes (smoke, green pumpkin). These species prefer current and rock.

KEY STRUCTURES: Rocky main lake points and bluffs, Colorado River channel (upper arm), rocky coves and pockets, granite boulders on flats, deep water ledges and bluffs, mid-lake humps.

TOP BAITS: For stripers — live shad (primary), large white swimbait (6-8"), chrome slashbait, 3/4oz Hopkins spoon (chrome); For largemouth — squarebill crankbait (chartreuse/crawfish, rocky bottom), drop shot (Roboworm, morning dawn), swim jig (white, chartreuse); For Guadalupe/smallmouth — small Rapala Shad Rap (#5-7), tube bait (smoke, green pumpkin), drop shot with small finesse worm.

NOTES: World-class striper fishery — best in Central Texas. Guide services available for stripers. Hill Country scenery excellent. Water levels vary — drought affects the Highland Lakes chain. Buchanan Dam marks the lower end. Excellent camping and cabins nearby at Inks Lake SP and Buchanan Dam area.`,
    sourceType: 'article', org: 'AnglerIQ Curated', date: '2024-01-01', notes: 'Curated Lake Buchanan TX knowledge — Highland Lakes, striper fishery, Guadalupe bass, Hill Country'
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
