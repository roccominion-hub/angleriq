/**
 * AnglerIQ — Seed OK tournament article URLs
 * Adds real Bassmaster slideshow and SI.com fishing articles
 * that are publicly scrapeable and contain detailed technique data.
 *
 * Usage: npx tsx scripts/ingestion/seed-ok-articles.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ARTICLES = [
  // ── Lake Eufaula ────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/opens/slideshow/top-lures-at-eufaula-open-2023/',
    organization: 'B.A.S.S.', reported_date: '2023-03-01',
    notes: 'Bassmaster Opens Eufaula 2023 (March prespawn) — top lures slideshow',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/opens/slideshow/top-lures-of-the-eufaula-open/',
    organization: 'B.A.S.S.', reported_date: '2023-06-01',
    notes: 'Bassmaster Opens Eufaula 2023 (June postspawn) — top lures slideshow',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/gear/slideshow/top-lures-at-lake-eufaula-open-2024/',
    organization: 'B.A.S.S.', reported_date: '2024-06-01',
    notes: 'Bassmaster Opens Eufaula 2024 — top lures slideshow',
  },
  {
    lake_name: 'Lake Eufaula', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/gear/slideshow/top-lures-at-lake-eufaula-open-2026/',
    organization: 'B.A.S.S.', reported_date: '2026-04-01',
    notes: 'Bassmaster Opens Eufaula 2026 — top lures slideshow',
  },

  // ── Grand Lake o' the Cherokees ─────────────────────────────────────────
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/bassmaster-classic/slideshow/top-lures-of-the-2024-classic/',
    organization: 'B.A.S.S.', reported_date: '2024-03-01',
    notes: 'Bassmaster Classic Grand Lake 2024 — top lures slideshow (jerkbaits, spinnerbaits, jigs)',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/bassmaster-classic/slideshow/look-at-grand-lake-classic-2024/',
    organization: 'B.A.S.S.', reported_date: '2024-03-01',
    notes: 'Bassmaster Classic Grand Lake 2024 — lake look/conditions slideshow',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/slideshow/top-lures-grand-lake-1',
    organization: 'B.A.S.S.', reported_date: '2021-05-01',
    notes: 'Bassmaster Grand Lake 2021 — top lures slideshow',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/gear/slideshow/top-lures-at-grand-lake-open-2026/',
    organization: 'B.A.S.S.', reported_date: '2026-04-01',
    notes: 'Bassmaster Opens Grand Lake 2026 — top lures slideshow',
  },
  {
    lake_name: "Grand Lake o' the Cherokees", state: 'OK', source_type: 'article',
    url: 'https://www.outdoorlife.com/fishing/tactics-won-the-bassmaster-classic/',
    organization: 'Outdoor Life', reported_date: '2024-03-01',
    notes: 'Outdoor Life — How Hamner won 2024 Classic at Grand Lake (forward-facing sonar + jerkbait)',
  },

  // ── Lake Tenkiller ──────────────────────────────────────────────────────
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/elite/slideshow/top-lures-lake-tenkiller-2025/',
    organization: 'B.A.S.S.', reported_date: '2025-06-01',
    notes: 'Bassmaster Elite Tenkiller 2025 — top lures slideshow (jigs, TX-rig, vibrating jig)',
  },
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'tournament',
    url: 'https://www.si.com/onsi/fishing/bass-fishing/top-3-lures-2025-bassmaster-elite-tournament-lake-tenkiller',
    organization: 'Sports Illustrated', reported_date: '2025-06-01',
    notes: 'SI.com — Top 3 lures 2025 Bassmaster Elite Tenkiller',
  },
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'tournament',
    url: 'https://www.si.com/onsi/fishing/bass-fishing/wes-logan-wins-bassmaster-elite-lake-tenkiller-fathers-day',
    organization: 'Sports Illustrated', reported_date: '2025-06-01',
    notes: 'SI.com — Wes Logan wins 2025 Bassmaster Elite at Tenkiller',
  },
  {
    lake_name: 'Lake Tenkiller', state: 'OK', source_type: 'tournament',
    url: 'https://www.bassmaster.com/elite/slideshow/a-look-at-lake-tenkiller-2025/',
    organization: 'B.A.S.S.', reported_date: '2025-06-01',
    notes: 'Bassmaster — Lake Tenkiller 2025 conditions and patterns slideshow',
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${ARTICLES.length} OK tournament articles into ingest_queue...\n`)

  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('url')
    .eq('state', 'OK')
    .not('url', 'is', null)

  const existingUrls = new Set((existing || []).map(r => r.url))

  let inserted = 0, skipped = 0
  for (const item of ARTICLES) {
    if (existingUrls.has(item.url)) {
      console.log(`  ⏭  Skip: ${item.url.slice(0, 75)}`)
      skipped++
      continue
    }

    const { error } = await supabase.from('ingest_queue').insert({
      lake_name:     item.lake_name,
      state:         item.state,
      source_type:   item.source_type,
      url:           item.url,
      organization:  item.organization,
      reported_date: item.reported_date,
      notes:         item.notes,
    })

    if (error) {
      console.error(`  ❌ ${item.lake_name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${item.lake_name} — ${item.url.slice(0, 75)}`)
      inserted++
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅ Done: ${inserted} inserted, ${skipped} skipped`)
}

main().catch(console.error)
