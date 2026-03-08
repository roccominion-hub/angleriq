/**
 * AnglerIQ - Article Fetcher
 * Fetches a URL and returns clean text content for AI extraction
 */

import * as cheerio from 'cheerio'

export async function fetchArticleText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })

  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // Remove noise
  $('script, style, nav, header, footer, .advertisement, .ad, iframe').remove()

  // Try to get main content
  const content =
    $('article').text() ||
    $('main').text() ||
    $('.entry-content').text() ||
    $('body').text()

  return content.replace(/\s+/g, ' ').trim()
}
