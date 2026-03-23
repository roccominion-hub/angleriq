import 'dotenv/config'
// dotenv loads .env — point at .env.local for local dev
import { config } from 'dotenv'
config({ path: '.env.local' })

import { ingestYouTubeForLake } from '../src/lib/youtube-ingest'

const LAKE_ID = '56e7af84-c761-4ece-a13f-748bf048efcf'
const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(`\n🎣 YouTube Ingestion — Lake Fork TX ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`)

  const results = await ingestYouTubeForLake({
    lakeId: LAKE_ID,
    lakeName: 'Lake Fork',
    state: 'TX',
    maxResults: 30,
    minScore: 25,
    publishedAfter: '2022-01-01T00:00:00Z',
    dryRun: DRY_RUN,
  })

  console.log('\n── Results ──────────────────────────────────────────────')
  for (const r of results) {
    const chunks = r.chunksCreated !== undefined ? ` (${r.chunksCreated} chunks)` : ''
    const reason = r.reason ? ` — ${r.reason}` : ''
    console.log(`${r.status.padEnd(14)} ${(r.title || '').slice(0, 65)}${chunks}${reason}`)
  }

  const ingested = results.filter(r => r.status === 'ingested')
  const skipped  = results.filter(r => r.status === 'skipped')
  const errors   = results.filter(r => r.status === 'error')
  const totalChunks = ingested.reduce((a, r) => a + (r.chunksCreated || 0), 0)

  console.log('\n── Summary ──────────────────────────────────────────────')
  console.log(`  Ingested : ${ingested.length} videos, ${totalChunks} chunks embedded`)
  console.log(`  Skipped  : ${skipped.length}`)
  console.log(`  Errors   : ${errors.length}`)
  if (errors.length) errors.forEach(e => console.log(`    ✗ ${e.title} — ${e.reason}`))
  console.log('')
}

main().catch(e => { console.error(e); process.exit(1) })
