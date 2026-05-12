/**
 * AnglerIQ — Seed TX tournament article URLs
 * Adds real Bassmaster slideshow and BassBlaster pro technique articles
 * that are publicly scrapeable and contain detailed technique data.
 *
 * Usage: npx tsx scripts/ingestion/seed-tx-articles.ts
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
  // ── Lake Fork ────────────────────────────────────────────────────────────
  {
    lake_name: 'Lake Fork', state: 'TX', source_type: 'tournament',
    url: 'https://www.bassmaster.com/elite/slideshow/top-lures-from-lake-fork-2025/',
    organization: 'B.A.S.S.', reported_date: '2025-02-01',
    notes: 'Bassmaster Elite Lake Fork 2025 (February prespawn) — top lures slideshow',
  },
  {
    lake_name: 'Lake Fork', state: 'TX', source_type: 'tournament',
    url: 'https://www.bassmaster.com/elite/slideshow/top-lures-at-lake-fork-2024/',
    organization: 'B.A.S.S.', reported_date: '2024-02-01',
    notes: 'Bassmaster Elite Lake Fork 2024 (February prespawn) — top lures slideshow',
  },
  {
    lake_name: 'Lake Fork', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/brandon-cobbs-lake-fork-winning-baits-and-pattern',
    organization: 'BassBlaster', reported_date: '2023-02-01',
    notes: 'BassBlaster — Brandon Cobb winning baits and pattern, Lake Fork 2023',
  },

  // ── Toledo Bend Reservoir ─────────────────────────────────────────────────
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://www.bassmaster.com/gear/slideshow/top-lures-at-toledo-bend-2023/',
    organization: 'B.A.S.S.', reported_date: '2023-02-01',
    notes: 'Bassmaster Elite Toledo Bend 2023 (February spawn) — top lures slideshow',
  },
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/john-murrays-winning-toledo-bend-baits-and-pattern',
    organization: 'BassBlaster', reported_date: '2022-02-01',
    notes: 'BassBlaster — John Murray winning Toledo Bend baits and pattern 2022',
  },
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/lanes-combs-and-muellers-patterns-from-t-bend',
    organization: 'BassBlaster', reported_date: '2023-02-01',
    notes: 'BassBlaster — Lane, Combs, and Mueller patterns from Toledo Bend 2023',
  },
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/jason-christies-2nd-place-toledo-bend-bait-and-pattern',
    organization: 'BassBlaster', reported_date: '2023-02-01',
    notes: 'BassBlaster — Jason Christie 2nd place Toledo Bend bait and pattern 2023',
  },
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/jamie-hartmans-3rd-place-toledo-bend-pattern',
    organization: 'BassBlaster', reported_date: '2023-02-01',
    notes: 'BassBlaster — Jamie Hartman 3rd place Toledo Bend pattern 2023',
  },
  {
    lake_name: 'Toledo Bend Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://bassblaster.rocks/t-bend-elite-baits-wrong-assumptions-february-top-baits',
    organization: 'BassBlaster', reported_date: '2024-02-01',
    notes: 'BassBlaster — Toledo Bend Elite February top baits 2024 (wrong assumptions)',
  },

  // ── Sam Rayburn Reservoir ─────────────────────────────────────────────────
  {
    lake_name: 'Sam Rayburn Reservoir', state: 'TX', source_type: 'tournament',
    url: 'https://www.bassmaster.com/gear/slideshow/top-lures-from-sam-rayburn-open-2025/',
    organization: 'B.A.S.S.', reported_date: '2025-01-01',
    notes: 'Bassmaster Opens Sam Rayburn 2025 (January) — top lures slideshow',
  },

  // ── Multi-lake / Regional ─────────────────────────────────────────────────
  {
    lake_name: 'Lake Fork', state: 'TX', source_type: 'article',
    url: 'https://www.bassmaster.com/best-bass-lakes/slideshow/best-bass-lakes-2024-central/',
    organization: 'B.A.S.S.', reported_date: '2024-01-01',
    notes: 'Bassmaster Best Bass Lakes 2024 Central — covers TX lakes including Fork, Sam Rayburn, O.H. Ivie',
  },
  {
    lake_name: 'Sam Rayburn Reservoir', state: 'TX', source_type: 'article',
    url: 'https://www.bassmaster.com/best-bass-lakes/slideshow/best-bass-lakes-2023-central/',
    organization: 'B.A.S.S.', reported_date: '2023-01-01',
    notes: 'Bassmaster Best Bass Lakes 2023 Central — covers TX lakes',
  },
  {
    lake_name: 'O.H. Ivie Reservoir', state: 'TX', source_type: 'article',
    url: 'https://www.bassmaster.com/travel-guides/news/top-10-bass-lakes-a-travel-guide-to-o-h-ivie/',
    organization: 'B.A.S.S.', reported_date: '2024-01-01',
    notes: 'Bassmaster travel guide to O.H. Ivie — techniques, seasons, patterns',
  },
]

async function main() {
  console.log(`\n🎣 Seeding ${ARTICLES.length} TX tournament articles into ingest_queue...\n`)

  const { data: existing } = await supabase
    .from('ingest_queue')
    .select('url')
    .eq('state', 'TX')
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
