/**
 * Generates batch-ingest-tff-*.ts scripts for all TX lakes
 * Run: npx tsx scripts/ingestion/generate-tff-scripts.ts
 */
import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE = 'https://texasfishingforum.com/forums/ubbthreads.php/topics'

interface LakeConfig {
  slug: string
  lake: string
  state: string
  threads: Array<{ id: string; slug: string; notes: string }>
}

const LAKES: LakeConfig[] = [
  {
    slug: 'fork',
    lake: 'Lake Fork',
    state: 'TX',
    threads: [
      { id: '15617507', slug: '10-03-of-unders-on-fork', notes: 'Lake Fork 10-0 bass catch report' },
      { id: '15619562', slug: 'fishing-at-fork', notes: 'Fishing at Lake Fork - techniques and patterns' },
      { id: '15620513', slug: '10-13-on-fork-in-30-mph-winds', notes: '10-13lb on Lake Fork in 30 mph winds' },
      { id: '15623126', slug: 'fork-and-bed-fishing', notes: 'Lake Fork bed fishing patterns' },
      { id: '15625025', slug: 'fork-on-monday', notes: 'Lake Fork Monday trip report' },
      { id: '15627091', slug: 'lake-fork-lure-tourn', notes: 'Lake Fork lure tournament info' },
      { id: '15630253', slug: 'bass-stache-s-first-time-on-lake-fork-double-digit', notes: 'Lake Fork double-digit bass - techniques' },
    ]
  },
  {
    slug: 'sam-rayburn',
    lake: 'Sam Rayburn Reservoir',
    state: 'TX',
    threads: [
      { id: '15615144', slug: '6-of-the-top-10-in-the-rayburn-bass-open-23-years-old-and-under', notes: 'Rayburn Bass Open - top 10 patterns' },
      { id: '15619699', slug: 'local-kid-leading-bass-collegient-tourney-on-rayburn', notes: 'College tournament on Sam Rayburn - patterns' },
      { id: '15630138', slug: 'sam-rayburn-or-toledo-bend', notes: 'Sam Rayburn vs Toledo Bend comparison - techniques' },
    ]
  },
  {
    slug: 'toledo-bend',
    lake: 'Toledo Bend Reservoir',
    state: 'TX',
    threads: [
      { id: '15625500', slug: 'toledo-bend-sharelunker', notes: 'Toledo Bend ShareLunker program - big bass report' },
      { id: '15630138', slug: 'sam-rayburn-or-toledo-bend', notes: 'Toledo Bend comparison - techniques and patterns' },
      { id: '15634942', slug: 'toledo-bend-sharelunker', notes: 'Toledo Bend ShareLunker - techniques' },
    ]
  },
  {
    slug: 'cedar-creek',
    lake: 'Cedar Creek Reservoir',
    state: 'TX',
    threads: [
      { id: '15601939', slug: 'no-ffs-open-cedar-creek-3-7', notes: 'No FFS Open Cedar Creek - patterns and techniques' },
      { id: '15623929', slug: 'cedar-creek-march-27th-30', notes: 'Cedar Creek fishing report March 27-30' },
      { id: '15628223', slug: 'no-ffs-open-cedar-creek-3-7', notes: 'No FFS Open Cedar Creek tournament report' },
    ]
  },
  {
    slug: 'oh-ivie',
    lake: 'O.H. Ivie Reservoir',
    state: 'TX',
    threads: [
      { id: '15616224', slug: 'oh-ivie-bass-2-21-25', notes: 'O.H. Ivie bass report 2/21/25' },
      { id: '15623585', slug: 'fished-oh-ivie', notes: 'Fished O.H. Ivie - patterns and baits' },
      { id: '15640106', slug: 'mlf-stage-4-oh-ivie-brownwood', notes: 'MLF Stage 4 O.H. Ivie - tournament patterns' },
      { id: '15640601', slug: 'amistad-oh-ivie-3-27-26', notes: 'Amistad/O.H. Ivie fishing report 3/27/26' },
    ]
  },
  {
    slug: 'amistad',
    lake: 'Lake Amistad',
    state: 'TX',
    threads: [
      { id: '15575979', slug: 'amistad-bass-1-6-26', notes: 'Lake Amistad bass report January 2026' },
      { id: '15640601', slug: 'amistad-oh-ivie-3-27-26', notes: 'Lake Amistad fishing report 3/27/26' },
    ]
  },
  {
    slug: 'whitney',
    lake: 'Lake Whitney',
    state: 'TX',
    threads: [
      { id: '15624394', slug: 'mlf-lake-whitney-and-waco', notes: 'MLF Lake Whitney tournament - patterns' },
      { id: '15627913', slug: 'mlf-lake-whitney-and-waco', notes: 'MLF Lake Whitney and Waco - techniques' },
    ]
  },
  {
    slug: 'squaw-creek',
    lake: 'Squaw Creek Reservoir',
    state: 'TX',
    threads: [
      { id: '15627692', slug: 'squaw-creek', notes: 'Squaw Creek fishing report' },
      { id: '15636288', slug: 'squaw-creek-advice', notes: 'Squaw Creek fishing advice - patterns' },
      { id: '15637017', slug: 'squaw-creek-closes-march-29-2026', notes: 'Squaw Creek closure notice and fishing update' },
    ]
  },
  {
    slug: 'arlington',
    lake: 'Lake Arlington',
    state: 'TX',
    threads: [
      { id: '15627030', slug: 'no-live-scope-open-arlington-3-14-is-on', notes: 'Lake Arlington No Live-Scope Open tournament' },
      { id: '15631104', slug: 'no-live-scope-open-arlington-3-14-is-on', notes: 'Lake Arlington tournament - patterns and techniques' },
    ]
  },
  {
    slug: 'joe-pool',
    lake: 'Joe Pool Lake',
    state: 'TX',
    threads: [
      { id: '15629800', slug: 'advice-for-navigating-joe-pool', notes: 'Joe Pool navigation and fishing advice' },
    ]
  },
  {
    slug: 'lake-worth',
    lake: 'Lake Worth',
    state: 'TX',
    threads: [
      { id: '15637636', slug: 'lake-worth-workingmans-start-this-week-3-25', notes: 'Lake Worth Workingman tournament - patterns' },
    ]
  },
  {
    slug: 'purtis-creek',
    lake: 'Purtis Creek State Park Lake',
    state: 'TX',
    threads: [
      { id: '15612680', slug: 'purtis-creek', notes: 'Purtis Creek fishing report' },
      { id: '15621771', slug: 'purtis-creek', notes: 'Purtis Creek bass fishing' },
    ]
  },
  {
    slug: 'bridgeport',
    lake: 'Lake Bridgeport',
    state: 'TX',
    threads: [
      { id: '15618657', slug: '5th-annual-pops-open-bridgeport-4-4', notes: 'Lake Bridgeport 5th Annual Pops Open' },
      { id: '15640512', slug: '5th-annual-pops-open-bridgeport-4-4', notes: 'Lake Bridgeport Pops Open tournament patterns' },
    ]
  },
  {
    slug: 'naconiche',
    lake: 'Lake Naconiche',
    state: 'TX',
    threads: [
      { id: '15639123', slug: 'lake-naconiche', notes: 'Lake Naconiche fishing report' },
      { id: '15639882', slug: 'lake-naconiche', notes: 'Lake Naconiche bass fishing patterns' },
    ]
  },
  {
    slug: 'mill-creek',
    lake: 'Mill Creek Lake',
    state: 'TX',
    threads: [
      { id: '15621867', slug: 'mill-creek-reservoir-canton-tx', notes: 'Mill Creek Reservoir Canton TX fishing report' },
      { id: '15622420', slug: 'mill-creek-reservoir-canton-tx', notes: 'Mill Creek Reservoir bass techniques' },
    ]
  },
  {
    slug: 'choke-canyon',
    lake: 'Choke Canyon Reservoir',
    state: 'TX',
    threads: [
      { id: '15620437', slug: 'lake-corpus-and-choke', notes: 'Choke Canyon and Corpus bass patterns' },
      { id: '15623969', slug: 'lake-corpus-and-choke', notes: 'Choke Canyon fishing techniques' },
    ]
  },
  // Lakes without specific threads found - will use dynamic search
  { slug: 'conroe', lake: 'Lake Conroe', state: 'TX', threads: [] },
  { slug: 'texoma', lake: 'Lake Texoma', state: 'TX', threads: [] },
  { slug: 'tawakoni', lake: 'Lake Tawakoni', state: 'TX', threads: [] },
  { slug: 'livingston', lake: 'Lake Livingston', state: 'TX', threads: [] },
  { slug: 'travis', lake: 'Lake Travis', state: 'TX', threads: [] },
  { slug: 'lavon', lake: 'Lake Lavon', state: 'TX', threads: [] },
  { slug: 'richland-chambers', lake: 'Richland Chambers Reservoir', state: 'TX', threads: [] },
  { slug: 'caddo', lake: 'Caddo Lake', state: 'TX', threads: [] },
  { slug: 'falcon', lake: 'Falcon Lake', state: 'TX', threads: [] },
  { slug: 'buchanan', lake: 'Lake Buchanan', state: 'TX', threads: [] },
  { slug: 'belton', lake: 'Lake Belton', state: 'TX', threads: [] },
  { slug: 'graham', lake: 'Lake Graham', state: 'TX', threads: [] },
  { slug: 'eddleman', lake: 'Lake Eddleman', state: 'TX', threads: [] },
  { slug: 'possum-kingdom', lake: 'Possum Kingdom Lake', state: 'TX', threads: [] },
  { slug: 'granbury', lake: 'Lake Granbury', state: 'TX', threads: [] },
  { slug: 'amon-carter', lake: 'Lake Amon G. Carter', state: 'TX', threads: [] },
  { slug: 'bois-darc', lake: 'Bois d\'Arc Lake', state: 'TX', threads: [] },
  { slug: 'bob-sandlin', lake: 'Lake Bob Sandlin', state: 'TX', threads: [] },
  { slug: 'cypress-springs', lake: 'Cypress Springs Lake', state: 'TX', threads: [] },
  { slug: 'hubbard-creek', lake: 'Hubbard Creek Reservoir', state: 'TX', threads: [] },
  { slug: 'aquilla', lake: 'Lake Aquilla', state: 'TX', threads: [] },
  { slug: 'pat-cleburne', lake: 'Lake Pat Cleburne', state: 'TX', threads: [] },
  { slug: 'waxahachie', lake: 'Lake Waxahachie', state: 'TX', threads: [] },
  { slug: 'palestine', lake: 'Lake Palestine', state: 'TX', threads: [] },
  { slug: 'athens', lake: 'Lake Athens', state: 'TX', threads: [] },
  { slug: 'tyler', lake: 'Lake Tyler', state: 'TX', threads: [] },
  { slug: 'eagle-mountain', lake: 'Eagle Mountain Lake', state: 'TX', threads: [] },
  { slug: 'ray-hubbard', lake: 'Lake Ray Hubbard', state: 'TX', threads: [] },
  { slug: 'ray-roberts', lake: 'Lake Ray Roberts', state: 'TX', threads: [] },
  { slug: 'sabine-river', lake: 'Sabine River', state: 'TX', threads: [] },
  { slug: 'nocona', lake: 'Lake Nocona', state: 'TX', threads: [] },
  { slug: 'canyon-lake', lake: 'Canyon Lake', state: 'TX', threads: [] },
  { slug: 'lbj', lake: 'Lake LBJ', state: 'TX', threads: [] },
  { slug: 'gibbons-creek', lake: 'Gibbons Creek Reservoir', state: 'TX', threads: [] },
  { slug: 'daniel', lake: 'Lake Daniel', state: 'TX', threads: [] },
  { slug: 'pinkston', lake: 'Lake Pinkston', state: 'TX', threads: [] },
]

function generateScript(cfg: LakeConfig): string {
  const hasThreads = cfg.threads.length > 0
  
  const sourcesCode = hasThreads
    ? cfg.threads.map(t =>
        `  { url: '${BASE}/${t.id}/${t.slug}', notes: '${t.notes.replace(/'/g, "\\'")}' },`
      ).join('\n')
    : `  // No pre-loaded threads; dynamic search will find them`

  return `import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'
import { findTffThreadsForLake } from './tff-utils'

const LAKE = '${cfg.lake}'; const STATE = '${cfg.state}'

const KNOWN_THREADS: { url: string; notes: string }[] = [
${sourcesCode}
]

async function main() {
  console.log(\`\\n🎣 \${LAKE} — TFF ingestion\`)
  const apiKey = process.env.GEMINI_API_KEY!
  let total = 0, errors = 0

  // Gather URLs: pre-loaded + dynamically discovered
  const knownUrls = KNOWN_THREADS.map(t => t.url)
  console.log(\`  🔍 Searching TFF forum pages for \${LAKE}...\`)
  const discovered = await findTffThreadsForLake(LAKE, 8)
  const allUrls = [...new Set([...knownUrls, ...discovered])]
  console.log(\`  Found \${allUrls.length} thread URLs (\${knownUrls.length} known + \${discovered.length} discovered)\`)

  for (const [i, url] of allUrls.entries()) {
    const notes = KNOWN_THREADS.find(t => t.url === url)?.notes || 'TFF forum thread'
    console.log(\`\\n[\${i+1}/\${allUrls.length}] \${url.slice(0,80)}\`)
    console.log(\`     \${notes}\`)
    try {
      const text = await fetchArticleText(url)
      if (!text || text.length < 200) { console.log('     ⚠️  Too short — skipping'); continue }
      console.log(\`     ✓ \${text.length} chars\`)
      const extracted = await extractFishingData(text, apiKey)
      if (!extracted.length) { console.log('     ⚠️  No data — skipping'); continue }
      extracted.forEach((item: any, j: number) => {
        const baits = item.baits?.map((b: any) => b.bait_name || b.bait_type).filter(Boolean).join(', ') || '—'
        console.log(\`       [\${j+1}] \${item.angler_name || 'Unknown'} | \${item.pattern || '?'} | \${baits}\`)
      })
      await insertTechniqueReport({ bodyOfWaterName: LAKE, state: STATE, sourceType: 'forum', sourceUrl: url, reportedDate: new Date().toISOString().slice(0,10), organization: 'Texas Fishing Forum', extracted })
      total += extracted.length; console.log('     ✅ Inserted')
      await new Promise(r => setTimeout(r, 2000))
    } catch (e: any) { console.error(\`     ❌ \${e.message?.slice(0,100)}\`); errors++ }
  }
  console.log(\`\\n\${'─'.repeat(50)}\\n✅ \${LAKE}: \${total} reports, \${errors} errors\`)
}
main().catch(console.error)
`
}

const dir = join(process.cwd(), 'scripts/ingestion')
let generated = 0

for (const lake of LAKES) {
  const filename = `batch-ingest-tff-${lake.slug}.ts`
  const filepath = join(dir, filename)
  writeFileSync(filepath, generateScript(lake))
  console.log(`✅ ${filename}`)
  generated++
}

console.log(`\n🎣 Generated ${generated} TFF ingestion scripts`)
