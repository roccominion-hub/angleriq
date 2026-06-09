/**
 * AnglerIQ — Generic Technique Article Seeder
 *
 * Seeds ingest_queue with structure-tagged technique articles that are NOT
 * lake-specific. These get matched to lakes at query time based on
 * body_of_water.structure_tags overlap.
 *
 * Sources: Bassmaster Tips/Techniques, Wired2Fish, BassFishingHQ,
 *          BassResource, GameAndFishMag, In-Fisherman, MonsterBass
 *
 * Usage:
 *   npx tsx scripts/ingestion/seed-generic-articles.ts
 *   npx tsx scripts/ingestion/seed-generic-articles.ts --dry-run
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { CANONICAL_TAGS } from './derive-structure-tags'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRAVE_KEY = process.env.BRAVE_API_KEY!
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// ── Search queries targeting generic technique content ───────────────────────
// Each query is designed to find technique articles, NOT lake-specific reports.
// Paired with the structure tag(s) the results will likely cover.

const GENERIC_QUERIES: { query: string; tags: string[] }[] = [
  // Timber / wood
  { query: 'bass fishing flooded timber techniques tips largemouth', tags: ['timber'] },
  { query: 'fishing laydowns fallen trees bass tips', tags: ['timber', 'laydowns'] },
  { query: 'bass fishing standing timber deep', tags: ['timber', 'deep_water'] },
  // Brush / stake beds
  { query: 'bass fishing brush piles techniques depth', tags: ['brush'] },
  { query: 'fishing stake beds bass tips offshore', tags: ['brush', 'offshore'] },
  // Docks
  { query: 'bass fishing boat docks technique tips skipping', tags: ['docks'] },
  { query: 'dock fishing bass summer patterns', tags: ['docks'] },
  { query: 'flipping pitching docks bass fishing', tags: ['docks'] },
  // Grass / vegetation
  { query: 'hydrilla bass fishing techniques tips largemouth', tags: ['grass'] },
  { query: 'bass fishing grass mats frog punch rig', tags: ['grass', 'pads'] },
  { query: 'milfoil coontail bass fishing technique', tags: ['grass', 'vegetation'] },
  { query: 'lily pads bass fishing frog buzzbait', tags: ['pads'] },
  // Rock / bluffs
  { query: 'bass fishing chunk rock techniques tips', tags: ['rock'] },
  { query: 'bluff wall bass fishing technique jerkbait', tags: ['bluffs', 'rock'] },
  { query: 'riprap bass fishing crankbait spinnerbait', tags: ['riprap'] },
  // Ledges / offshore
  { query: 'bass fishing channel ledges techniques summer', tags: ['ledges', 'offshore'] },
  { query: 'offshore bass fishing humps and ledges', tags: ['offshore', 'ledges'] },
  { query: 'deep water bass fishing drop shot football jig ledge', tags: ['ledges', 'deep_water'] },
  // Points
  { query: 'bass fishing points technique lake points tips', tags: ['points'] },
  { query: 'secondary points bass pre-spawn fishing tips', tags: ['points', 'spawning_flats'] },
  // Flats / spawning
  { query: 'bass fishing shallow flats technique tips', tags: ['flats'] },
  { query: 'spawning bass fishing sight fishing technique', tags: ['spawning_flats', 'flats'] },
  { query: 'pre-spawn bass staging techniques patterns', tags: ['points', 'flats', 'spawning_flats'] },
  // Creek channels / coves
  { query: 'bass fishing creek channels ditches technique', tags: ['creek_channels'] },
  { query: 'bass fishing coves pockets technique tips', tags: ['coves'] },
  { query: 'tributary mouth bass fishing technique fall', tags: ['tributary'] },
  // Current
  { query: 'bass fishing river current technique tips', tags: ['current'] },
  { query: 'bass fishing current seams eddies technique', tags: ['current'] },
  // Cypress
  { query: 'cypress tree bass fishing technique tips', tags: ['cypress'] },
  // Bridges / pilings
  { query: 'bass fishing bridge pilings technique tips', tags: ['bridges'] },
  // Dam
  { query: 'bass fishing dam face tailwater technique', tags: ['dam'] },
  // Seasonal cross-structure
  { query: 'winter bass fishing deep structure technique tips', tags: ['ledges', 'deep_water', 'offshore'] },
  { query: 'fall bass fishing shad migration technique tips', tags: ['points', 'flats', 'tributary'] },
  { query: 'topwater bass fishing technique tips summer morning', tags: ['flats', 'grass', 'points'] },
  { query: 'finesse bass fishing technique ned rig drop shot', tags: ['ledges', 'rock', 'deep_water'] },
  { query: 'jig fishing bass technique tips structure', tags: ['timber', 'rock', 'brush', 'ledges'] },
  { query: 'crankbait bass fishing technique depth structure', tags: ['ledges', 'points', 'rock', 'riprap'] },
  { query: 'swimbait bass fishing technique tips open water', tags: ['offshore', 'ledges', 'deep_water'] },
]

const SKIP_DOMAINS = [
  'youtube.com', 'youtu.be', 'facebook.com', 'instagram.com',
  'twitter.com', 'x.com', 'reddit.com', 'tiktok.com',
  'amazon.com', 'ebay.com', 'wikipedia.org',
  'majorleaguefishing.com', 'mlf.fish',
]

const QUALITY_DOMAINS = [
  'bassmaster.com', 'wired2fish.com', 'bassresource.com',
  'gameandfishmag.com', 'in-fisherman.com', 'monsterbass.com',
  'westernbass.com', 'bassangler.com', 'flwfishing.com',
  'takemefishing.org', 'bassblaster.rocks',
]

function isUsable(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return !SKIP_DOMAINS.some(d => host === d || host.endsWith('.' + d)) && !url.endsWith('.pdf')
  } catch { return false }
}

function domainScore(url: string): number {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const idx = QUALITY_DOMAINS.findIndex(d => host.includes(d))
    return idx >= 0 ? QUALITY_DOMAINS.length - idx : 0
  } catch { return 0 }
}

async function braveSearch(query: string): Promise<{ url: string; title: string }[]> {
  const params = new URLSearchParams({ q: query, count: '8', search_lang: 'en', country: 'US' })
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) { console.warn(`  ⚠️  Brave ${res.status}`); return [] }
    const data: any = await res.json()
    return (data.web?.results || []).map((r: any) => ({ url: r.url, title: r.title || '' }))
  } catch (e: any) { console.warn(`  ⚠️  ${e.message?.slice(0, 60)}`); return [] }
}

async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AnglerIQ-bot/1.0)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    return res.status < 404 || res.status === 403 || res.status === 429
  } catch { return false }
}

async function alreadyQueued(url: string): Promise<boolean> {
  const { data } = await supabase.from('ingest_queue').select('id').eq('url', url).limit(1).maybeSingle()
  return !!data
}

async function alreadyIngested(url: string): Promise<boolean> {
  const { data } = await supabase.from('technique_report').select('id').eq('source_url', url).limit(1).maybeSingle()
  return !!data
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('\n📚 AnglerIQ — Generic Technique Article Seeder')
  console.log(`   ${GENERIC_QUERIES.length} search queries · ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const seen = new Set<string>()
  let queued = 0, skipped = 0, dead = 0

  for (const { query, tags } of GENERIC_QUERIES) {
    console.log(`\n  🔍 [${tags.join('+')}] ${query.slice(0, 70)}`)
    const hits = await braveSearch(query)

    const candidates = hits
      .filter(h => isUsable(h.url) && !seen.has(h.url))
      .sort((a, b) => domainScore(b.url) - domainScore(a.url))
      .slice(0, 6)

    for (const { url, title } of candidates) {
      seen.add(url)

      if (await alreadyQueued(url) || await alreadyIngested(url)) {
        skipped++
        continue
      }

      const resolves = await urlResolves(url)
      if (!resolves) {
        console.log(`     ✗ dead: ${url.slice(0, 80)}`)
        dead++
        continue
      }

      if (dryRun) {
        console.log(`     [DRY] ${url.slice(0, 80)}`)
        console.log(`           tags: [${tags.join(', ')}]`)
        queued++
        continue
      }

      const { error } = await supabase.from('ingest_queue').insert({
        lake_name: null,          // generic — not lake-specific
        state: null,
        source_type: 'article',
        url,
        notes: `[GENERIC] ${tags.join(',')} | ${title.slice(0, 180)}`,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      })

      if (error) {
        console.warn(`     ⚠️  Insert error: ${error.message?.slice(0, 80)}`)
      } else {
        console.log(`     ✓ queued [${tags.join(',')}]: ${url.slice(0, 72)}`)
        queued++
      }

      await sleep(300)
    }

    await sleep(1200) // Brave rate limit
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✅ Done — ${queued} queued, ${skipped} already present, ${dead} dead links`)
  console.log(`\n   GH Actions will process these automatically.`)
  console.log(`   The run-queue processor needs updating to handle lake_name=null rows.`)
  console.log(`${'═'.repeat(60)}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
