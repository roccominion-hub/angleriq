/**
 * AnglerIQ - Bait URL Enrichment Script
 * Re-fetches source articles, extracts bait product links,
 * and updates matching bait_used records in Supabase.
 *
 * Usage: npx tsx scripts/ingestion/enrich-bait-urls.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// All known top-lures source articles with product links
const SOURCE_ARTICLES = [
  'https://www.bassmaster.com/elite/slideshow/top-lures-at-lake-fork-2024/',
  'https://www.bassmaster.com/elite/slideshow/top-lures-from-lake-fork-2025/',
  'https://www.bassmaster.com/elite/slideshow/top-lures-at-lake-fork-2021/',
  'https://www.bassmaster.com/elite/slideshow/top-lures-at-lake-fork-2019/',
  'https://www.bassmaster.com/elite/slideshow/top-lures-at-lake-fork-2022/',
]

async function extractBaitLinks(url: string): Promise<Map<string, { productUrl: string; retailer: string }>> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  const baitLinks = new Map<string, { productUrl: string; retailer: string }>()

  // Extract all links with product URLs
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const text = $(el).text().trim()

    if (!text || text.length < 3) return

    // Bass Pro Shops
    if (href.includes('basspro.com') && text.length > 3) {
      // Clean the URL — remove tracking params we don't need
      const cleanUrl = href.split('?')[0]
      if (cleanUrl.includes('/shop/en/') || cleanUrl.includes('/l/')) {
        baitLinks.set(normalizeKey(text), { productUrl: href, retailer: 'Bass Pro Shops' })
      }
    }

    // TackleDirect
    if (href.includes('tackledirect.com')) {
      baitLinks.set(normalizeKey(text), { productUrl: href, retailer: 'TackleDirect' })
    }

    // Amazon
    if (href.includes('amazon.com')) {
      baitLinks.set(normalizeKey(text), { productUrl: href, retailer: 'Amazon' })
    }
  })

  return baitLinks
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string): number {
  const aKey = normalizeKey(a)
  const bKey = normalizeKey(b)
  if (aKey === bKey) return 1
  if (aKey.includes(bKey) || bKey.includes(aKey)) return 0.9
  // Word overlap score
  const aWords = new Set(aKey.split(' '))
  const bWords = new Set(bKey.split(' '))
  const overlap = [...aWords].filter(w => bWords.has(w) && w.length > 2).length
  return overlap / Math.max(aWords.size, bWords.size)
}

async function main() {
  console.log('\n🔗 AnglerIQ Bait URL Enrichment\n')

  // 1. Collect all product links from source articles
  const allBaitLinks = new Map<string, { productUrl: string; retailer: string }>()
  
  for (const url of SOURCE_ARTICLES) {
    console.log(`📄 Scanning: ${url}`)
    try {
      const links = await extractBaitLinks(url)
      console.log(`   Found ${links.size} product links`)
      links.forEach((v, k) => allBaitLinks.set(k, v))
    } catch (e) {
      console.log(`   ⚠️  Failed: ${e}`)
    }
  }

  console.log(`\n✓ Total unique product links collected: ${allBaitLinks.size}`)
  console.log('\nSample links found:')
  let i = 0
  for (const [name, data] of allBaitLinks) {
    if (i++ > 5) break
    console.log(`  "${name}" → ${data.retailer}: ${data.productUrl.slice(0, 60)}...`)
  }

  // 2. Fetch all bait_used records missing product_url
  const { data: baits, error } = await supabase
    .from('bait_used')
    .select('id, bait_name, bait_type, product_url')
    .is('product_url', null)
    .not('bait_name', 'is', null)

  if (error) { console.error('Supabase error:', error); return }
  console.log(`\n🎣 Baits needing enrichment: ${baits?.length || 0}`)

  // 3. Match and update
  let updated = 0
  let skipped = 0

  for (const bait of baits || []) {
    const baitKey = normalizeKey(bait.bait_name)
    let bestMatch: { productUrl: string; retailer: string } | null = null
    let bestScore = 0

    for (const [linkKey, linkData] of allBaitLinks) {
      const score = similarity(baitKey, linkKey)
      if (score > bestScore) {
        bestScore = score
        bestMatch = linkData
      }
    }

    if (bestMatch && bestScore >= 0.7) {
      const { error: updateError } = await supabase
        .from('bait_used')
        .update({ product_url: bestMatch.productUrl, retailer: bestMatch.retailer })
        .eq('id', bait.id)

      if (!updateError) {
        console.log(`  ✓ [${(bestScore * 100).toFixed(0)}%] "${bait.bait_name}" → ${bestMatch.retailer}`)
        updated++
      }
    } else {
      skipped++
    }
  }

  console.log(`\n✅ Enrichment complete: ${updated} updated, ${skipped} skipped (no confident match)`)

  // 4. Also try to find BPS search URLs for skipped baits
  if (skipped > 0) {
    console.log(`\n🔍 Generating search fallback links for remaining baits...`)
    const { data: remaining } = await supabase
      .from('bait_used')
      .select('id, bait_name')
      .is('product_url', null)
      .not('bait_name', 'is', null)

    let searchLinked = 0
    for (const bait of remaining || []) {
      const searchUrl = `https://www.basspro.com/shop/SearchDisplay?searchTerm=${encodeURIComponent(bait.bait_name)}`
      await supabase
        .from('bait_used')
        .update({ product_url: searchUrl, retailer: 'Bass Pro Shops' })
        .eq('id', bait.id)
      searchLinked++
    }
    console.log(`  ✓ Generated search links for ${searchLinked} baits`)
  }
}

main().catch(console.error)
