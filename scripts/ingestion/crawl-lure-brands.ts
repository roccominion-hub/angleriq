/**
 * AnglerIQ — Lure Brand Crawler
 *
 * Discovers, fetches, and indexes product catalog data from major bass fishing
 * brand websites directly into the lure_catalog table for RAG accuracy.
 *
 * Pipeline:
 *   Brave Search (site: queries)  →  product page URLs
 *   fetch + Cheerio               →  raw page text
 *   Gemini extraction             →  structured product data
 *   Voyage embed + Supabase upsert →  lure_catalog
 *
 * Usage:
 *   npx tsx scripts/ingestion/crawl-lure-brands.ts              # all brands
 *   npx tsx scripts/ingestion/crawl-lure-brands.ts zman         # single brand
 *   npx tsx scripts/ingestion/crawl-lure-brands.ts --dry-run    # discover URLs only
 *
 * Scheduling: run monthly via cron to pick up new product releases.
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import { extractProductData, type ExtractedProduct } from './extract-product-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRAVE_KEY   = process.env.BRAVE_API_KEY!
const GEMINI_KEY  = process.env.GEMINI_API_KEY!
const VOYAGE_KEY  = process.env.VOYAGE_API_KEY!

const GEMINI_DELAY_MS = 8_000   // ~7 RPM stay under free tier
const MIN_PAGE_CHARS  = 400     // below this, fall back to Brave snippet

// ── Brand definitions ────────────────────────────────────────────────────────
// Each brand lists Brave search queries that find individual product pages.
// productUrlPatterns: URL substrings that indicate a product detail page.
// skipPatterns: URL substrings to discard (collections, blogs, about, etc.)

interface BrandConfig {
  name: string
  domain: string
  queries: string[]
  productUrlPatterns: string[]   // URL must contain at least one of these
  skipPatterns: string[]         // URL must NOT contain any of these
  fetchWorks: boolean            // set false if Cloudflare blocks; use snippet fallback
}

const BRANDS: BrandConfig[] = [
  {
    name: 'Z-Man',
    domain: 'zmanfishing.com',
    queries: [
      'site:zmanfishing.com bass crankbait',
      'site:zmanfishing.com chatterbait bladed jig',
      'site:zmanfishing.com soft plastic finesse',
      'site:zmanfishing.com jig worm',
      'site:zmanfishing.com swimbait topwater',
    ],
    productUrlPatterns: ['/products/'],
    skipPatterns: ['/blogs/', '/pages/', '/collections/', '/account', '/cart', '/policies'],
    fetchWorks: true,
  },
  {
    name: '6th Sense',
    domain: '6thsensefishing.com',
    queries: [
      'site:6thsensefishing.com crankbait bass',
      'site:6thsensefishing.com jig bass fishing',
      'site:6thsensefishing.com soft plastic bass',
      'site:6thsensefishing.com topwater bass',
      'site:6thsensefishing.com swimbait jerkbait',
    ],
    productUrlPatterns: ['/products/'],
    skipPatterns: ['/blogs/', '/pages/', '/collections/', '/account', '/cart', '/policies'],
    fetchWorks: true,
  },
  {
    name: 'Berkley',
    domain: 'berkley-fishing.com',
    queries: [
      'site:berkley-fishing.com bass crankbait jerkbait',
      'site:berkley-fishing.com powerbait bass soft plastic',
      'site:berkley-fishing.com maxscent bass',
      'site:berkley-fishing.com jig swimbait bass',
      'site:berkley-fishing.com topwater frog bass',
    ],
    productUrlPatterns: ['/products/'],
    skipPatterns: ['/blogs/', '/pages/', '/collections/', '/account', '/cart', '/policies'],
    fetchWorks: true,
  },
  {
    name: 'Zoom',
    domain: 'zoombait.com',
    queries: [
      'site:zoombait.com worm soft plastic',
      'site:zoombait.com craw creature bait',
      'site:zoombait.com swimbait fluke',
      'site:zoombait.com grub tube',
      'site:zoombait.com lizard stickbait',
    ],
    productUrlPatterns: ['zoombait.com/'],
    skipPatterns: ['/blog/', '/about', '/contact', '/shop/', 'zoombait.com/?', '#'],
    fetchWorks: true,
  },
  {
    name: 'Rapala',
    domain: 'rapala.com',
    queries: [
      'site:rapala.com us_en bass crankbait DT series',
      'site:rapala.com us_en bass jerkbait X-Rap',
      'site:rapala.com us_en bass topwater',
      'site:rapala.com us_en bass swimbait soft plastic',
      'site:rapala.com us_en bass lipless',
    ],
    productUrlPatterns: ['/us_en/'],
    skipPatterns: ['/blog/', '/news/', '/us_en/blog', '/us_en/campaign', 'rapala.com/us_en/$'],
    fetchWorks: true,
  },
  {
    name: 'Strike King',
    domain: 'strikeking.com',
    queries: [
      'site:strikeking.com crankbait hard bait bass',
      'site:strikeking.com jig bass tournament',
      'site:strikeking.com soft plastic bass',
      'site:strikeking.com topwater spinnerbait bass',
      'site:strikeking.com swimbait finesse bass',
    ],
    productUrlPatterns: ['/en/shop/'],
    skipPatterns: ['/learn/', '/media/', '/account', '/cart', '/en/shop/$'],
    fetchWorks: true,  // thin but worth trying; falls back to snippet
  },
  {
    name: 'Gary Yamamoto',
    domain: 'yamamotobaits.com',
    queries: [
      'site:yamamotobaits.com senko stickbait bass',
      'site:yamamotobaits.com soft plastic bass worm craw',
      'site:yamamotobaits.com jig grub bass',
    ],
    productUrlPatterns: ['/senkos/', '/soft-plastics/', '/jigs/', '/swimbaits/'],
    skipPatterns: ['/blog/', '/about', '/contact', '/cart', '/news'],
    fetchWorks: true,
  },
  {
    name: 'Megabass',
    domain: 'megabassusa.com',
    queries: [
      'site:megabassusa.com bass jerkbait vision',
      'site:megabassusa.com bass crankbait swimbait',
      'site:megabassusa.com bass topwater soft plastic',
    ],
    productUrlPatterns: ['/product/'],
    skipPatterns: ['/blog/', '/about', '/contact', '/cart'],
    fetchWorks: true,
  },
  {
    name: 'River2Sea',
    domain: 'river2seausa.com',
    queries: [
      'site:river2seausa.com whopper plopper topwater bass',
      'site:river2seausa.com frog swimbait crankbait bass',
      'site:river2seausa.com product bass lure',
    ],
    productUrlPatterns: ['/product/'],
    skipPatterns: ['/blog/', '/about', '/contact', '/cart'],
    fetchWorks: true,
  },
  {
    name: 'Missile Baits',
    domain: 'missilebaits.com',
    queries: [
      'site:missilebaits.com soft plastic bass',
      'site:missilebaits.com jig bass tournament',
      'site:missilebaits.com creature bait flipping',
    ],
    productUrlPatterns: ['/product/', '/product-category/'],
    skipPatterns: ['/about', '/contact', '/cart', '/?'],
    fetchWorks: false,   // Cloudflare-blocked — use Brave snippet fallback
  },
  {
    name: 'Spro',
    domain: 'spro.com',
    queries: [
      'site:spro.com bass crankbait squarebill',
      'site:spro.com bass frog topwater',
      'site:spro.com bass jig swimbait',
    ],
    // Spro uses /collections/ and /products/ — collection pages return enough content for extraction
    productUrlPatterns: ['/collections/crankbait', '/collections/frogs', '/collections/jig', '/collections/swimbait', '/products/'],
    skipPatterns: ['/blogs/', '/pages/', '/about', '/cart', '/account', '/collections/$'],
    fetchWorks: true,
  },
  {
    name: 'Jackall',
    domain: 'jackallusa.com',
    queries: [
      'site:jackallusa.com bass crankbait',
      'site:jackallusa.com bass jig soft plastic',
      'site:jackallusa.com bass topwater swimbait',
    ],
    productUrlPatterns: ['/product/', '/products/'],
    skipPatterns: ['/blog/', '/about', '/cart'],
    fetchWorks: true,
  },
  {
    name: 'Booyah',
    domain: 'booyah-baits.com',
    queries: [
      'site:booyah-baits.com spinnerbait buzzbait bass',
      'site:booyah-baits.com jig frog bass',
      'site:booyah-baits.com products bass lure',
    ],
    productUrlPatterns: ['/products/', '/product/'],
    skipPatterns: ['/blogs/', '/pages/', '/about', '/cart'],
    fetchWorks: true,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function braveSearch(query: string, count = 10): Promise<{ url: string; title: string; description: string }[]> {
  const params = new URLSearchParams({ q: query, count: String(count), search_lang: 'en', country: 'US' })
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { 'X-Subscription-Token': BRAVE_KEY, 'Accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`Brave API: ${res.status}`)
  const data = await res.json() as any
  return (data.web?.results ?? []).map((r: any) => ({
    url:         r.url as string,
    title:       (r.title as string) ?? '',
    description: (r.description as string) ?? '',
  }))
}

function isProductUrl(url: string, brand: BrandConfig): boolean {
  if (brand.skipPatterns.some(p => url.includes(p))) return false
  if (!brand.productUrlPatterns.some(p => url.includes(p))) return false
  return true
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, .advertisement, iframe').remove()
  const text = ($('article').text() || $('main').text() || $('.product-description').text() || $('[class*="product"]').text() || $('body').text())
  return text.replace(/\s+/g, ' ').trim()
}

function buildSnippetText(brand: BrandConfig, hit: { title: string; description: string; url: string }): string {
  return `Brand: ${brand.name}\nProduct: ${hit.title}\nURL: ${hit.url}\nDescription: ${hit.description}`
}

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!VOYAGE_KEY) return texts.map(() => null)
  const BATCH = 25
  const results: (number[] | null)[] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    console.log(`  Embedding batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(texts.length / BATCH)} (${batch.length} texts)...`)
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_KEY}` },
      body: JSON.stringify({ model: 'voyage-3-lite', input: batch.map(t => t.slice(0, 8000)) }),
    })
    if (!res.ok) { console.error('Voyage error:', await res.text()); results.push(...batch.map(() => null)); continue }
    const data = await res.json() as any
    const embs = (data.data ?? []).sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding as number[])
    results.push(...embs)
    if (i + BATCH < texts.length) {
      console.log('  Waiting 21s (Voyage rate limit)...')
      await sleep(21_000)
    }
  }
  return results
}

async function alreadyIndexed(brand: string, name: string): Promise<boolean> {
  const { data } = await supabase
    .from('lure_catalog')
    .select('id')
    .eq('brand', brand)
    .eq('name', name)
    .maybeSingle()
  return !!data
}

function buildChunkText(product: ExtractedProduct): string {
  const parts: string[] = []
  parts.push(`${product.name} (brand: ${product.brand}, type: ${product.bait_type}${product.sub_type ? ', sub-type: ' + product.sub_type : ''}):`)
  parts.push(product.description)
  if (product.sizes.length)      parts.push(`Sizes: ${product.sizes.join(', ')}.`)
  if (product.colors.length)     parts.push(`Colors: ${product.colors.join(', ')}.`)
  if (product.depth_ft_min != null && product.depth_ft_max != null) {
    parts.push(`Running depth: ${product.depth_ft_min}–${product.depth_ft_max} feet.`)
  }
  if (product.techniques.length) parts.push(`Techniques: ${product.techniques.join(', ')}.`)
  if (product.structure.length)  parts.push(`Best structure: ${product.structure.join(', ')}.`)
  if (product.seasons.length)    parts.push(`Best seasons: ${product.seasons.join(', ')}.`)
  return parts.join(' ')
}

// ── Main crawler ─────────────────────────────────────────────────────────────

async function crawlBrand(brand: BrandConfig, dryRun: boolean, pageLimit = Infinity): Promise<ExtractedProduct[]> {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Brand: ${brand.name}  (${brand.domain})`)
  console.log('═'.repeat(60))

  // 1. Discover product URLs via Brave
  const seen = new Set<string>()
  const candidates: { url: string; title: string; description: string }[] = []

  for (const query of brand.queries) {
    console.log(`  🔍 ${query}`)
    try {
      const hits = await braveSearch(query, 10)
      for (const hit of hits) {
        if (!seen.has(hit.url) && isProductUrl(hit.url, brand)) {
          seen.add(hit.url)
          candidates.push(hit)
        }
      }
    } catch (e: any) {
      console.error(`  ⚠ Brave error: ${e.message}`)
    }
    await sleep(1_200)  // 1.2s between Brave calls
  }

  console.log(`\n  Found ${candidates.length} product page candidates`)

  if (dryRun) {
    candidates.forEach(c => console.log(`    ${c.url}`))
    return []
  }

  // 2. Fetch + extract each candidate (cap at pageLimit for testing)
  const candidatesToProcess = candidates.slice(0, pageLimit)
  if (pageLimit !== Infinity && candidates.length > pageLimit) {
    console.log(`  (limiting to ${pageLimit} of ${candidates.length} candidates)`)
  }
  const extracted: ExtractedProduct[] = []

  for (const [i, hit] of candidatesToProcess.entries()) {
    console.log(`\n  [${i + 1}/${candidatesToProcess.length}] ${hit.url.slice(0, 80)}`)

    // Skip already-indexed by URL match (brand+name checked after extraction)
    // We can't know the name yet, so we proceed and dedup at upsert time.

    // Fetch page content
    let pageText = ''
    if (brand.fetchWorks) {
      try {
        pageText = await fetchPageText(hit.url)
        console.log(`    Fetched: ${pageText.length} chars`)
      } catch (e: any) {
        console.log(`    Fetch failed: ${e.message.slice(0, 60)}`)
      }
    }

    // Fall back to Brave snippet if page content is thin
    const inputText = pageText.length >= MIN_PAGE_CHARS
      ? pageText
      : buildSnippetText(brand, hit)

    const inputSource = pageText.length >= MIN_PAGE_CHARS ? 'page' : 'snippet'
    console.log(`    Extracting from ${inputSource} (${inputText.length} chars)...`)

    // Gemini extraction
    try {
      const products = await extractProductData(inputText, GEMINI_KEY)
      if (products.length === 0) {
        console.log('    ⚠ No products found')
      } else {
        for (const p of products) {
          // Always force brand name to match the config — Gemini sometimes
          // picks up sub-brand or collab names from product pages (e.g. "Panorama"
          // instead of "6th Sense"). Since we're crawling a brand-specific site,
          // every product belongs to this brand.
          p.brand = brand.name
          console.log(`    ✓ ${p.brand} | ${p.name} [${p.bait_type}]`)
          extracted.push({ ...p, _sourceUrl: hit.url } as any)
        }
      }
    } catch (e: any) {
      console.error(`    ✗ Extraction error: ${e.message.slice(0, 80)}`)
    }

    await sleep(GEMINI_DELAY_MS)
  }

  return extracted
}

async function saveBrandProducts(
  brandProducts: (ExtractedProduct & { _sourceUrl?: string })[],
  brandName: string,
): Promise<{ saved: number; skipped: number; failed: number }> {
  // Deduplicate by brand+name (keep last if duplicates within this batch)
  const dedupMap = new Map<string, ExtractedProduct & { _sourceUrl?: string }>()
  for (const p of brandProducts) dedupMap.set(`${p.brand}|${p.name}`, p)
  const unique = [...dedupMap.values()]

  // Filter out already-indexed entries
  const toInsert: (ExtractedProduct & { _sourceUrl?: string })[] = []
  let skipped = 0
  for (const p of unique) {
    const exists = await alreadyIndexed(p.brand, p.name)
    if (exists) {
      console.log(`  Skip (exists): ${p.brand} | ${p.name}`)
      skipped++
    } else {
      toInsert.push(p)
    }
  }
  console.log(`  New to index: ${toInsert.length} (${skipped} already exist)`)

  if (toInsert.length === 0) return { saved: 0, skipped, failed: 0 }

  // Build chunk_text + embed
  const chunkTexts = toInsert.map(buildChunkText)
  console.log(`\n  Generating embeddings for ${toInsert.length} products...`)
  const embeddings = await embedBatch(chunkTexts)

  // Upsert to lure_catalog
  let saved = 0, failed = 0
  for (let i = 0; i < toInsert.length; i++) {
    const p = toInsert[i]
    const { error } = await supabase.from('lure_catalog').upsert({
      brand:        p.brand,
      name:         p.name,
      aliases:      [],
      bait_type:    p.bait_type,
      sub_type:     p.sub_type ?? null,
      chunk_text:   chunkTexts[i],
      embedding:    embeddings[i] ?? null,
      sizes:        p.sizes ?? [],
      colors:       p.colors ?? [],
      depth_ft_min: p.depth_ft_min ?? null,
      depth_ft_max: p.depth_ft_max ?? null,
      techniques:   p.techniques ?? [],
      structure:    p.structure ?? [],
      seasons:      p.seasons ?? [],
      source_url:   (p as any)._sourceUrl ?? null,
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'brand,name' })

    if (error) {
      console.error(`  ✗ ${p.brand} | ${p.name}: ${error.message}`)
      failed++
    } else {
      console.log(`  ✓ Saved: ${p.brand} | ${p.name}`)
      saved++
    }
  }
  return { saved, skipped, failed }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const brandFilter = args.find(a => !a.startsWith('--'))?.toLowerCase()

  const targetBrands = brandFilter
    ? BRANDS.filter(b => b.name.toLowerCase().includes(brandFilter) || b.domain.includes(brandFilter))
    : BRANDS

  if (targetBrands.length === 0) {
    console.error(`No brands matched "${brandFilter}". Available: ${BRANDS.map(b => b.name).join(', ')}`)
    process.exit(1)
  }

  const limitArg = args.find(a => a.startsWith('--limit='))
  const pageLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity

  console.log(`\n🎣 AnglerIQ Lure Brand Crawler`)
  console.log(`Brands: ${targetBrands.map(b => b.name).join(', ')}`)
  if (dryRun)                  console.log('DRY RUN — discovery only, no DB writes')
  if (pageLimit !== Infinity)  console.log(`LIMIT: ${pageLimit} pages per brand`)
  console.log()

  // Process each brand: crawl → embed → upsert immediately (progress saved per brand)
  let totalSaved = 0, totalSkipped = 0, totalFailed = 0

  for (const [bi, brand] of targetBrands.entries()) {
    const products = await crawlBrand(brand, dryRun, pageLimit)

    if (!dryRun && products.length > 0) {
      console.log(`\n  Saving ${products.length} extracted products for ${brand.name}...`)
      const result = await saveBrandProducts(products, brand.name)
      totalSaved   += result.saved
      totalSkipped += result.skipped
      totalFailed  += result.failed
      console.log(`  Brand done: ${result.saved} saved, ${result.skipped} skipped, ${result.failed} failed`)
    } else if (!dryRun && products.length === 0) {
      console.log(`  No products extracted for ${brand.name}`)
    }

    // Brief pause between brands (Brave + Gemini rate limit buffer)
    if (bi < targetBrands.length - 1 && !dryRun) {
      console.log(`\n  ⏳ Waiting 10s before next brand...`)
      await sleep(10_000)
    }
  }

  if (!dryRun) {
    const { count } = await supabase.from('lure_catalog').select('id', { count: 'exact', head: true })
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`All done. ${totalSaved} saved, ${totalSkipped} already existed, ${totalFailed} failed.`)
    console.log(`lure_catalog total: ${count ?? '?'} entries`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
