/**
 * AnglerIQ - Article Fetcher
 * Fetches a URL and returns clean text content for AI extraction.
 * Supports regular articles and YouTube transcripts.
 */

import * as cheerio from 'cheerio'
import { YoutubeTranscript } from 'youtube-transcript'

// Domains known to block scrapers — callers should skip these or use an alternate source
export const BLOCKED_DOMAINS = [
  'bassmaster.com',
  'majorleaguefishing.com',
  'mlf.fish',
]

export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
  } catch {}
  return null
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeId(url)
  if (!videoId) throw new Error(`Could not extract YouTube video ID from: ${url}`)

  const transcript = await YoutubeTranscript.fetchTranscript(videoId)
  if (!transcript?.length) throw new Error(`No transcript available for video: ${videoId}`)

  const text = transcript.map(t => t.text).join(' ').replace(/\s+/g, ' ').trim()
  return text
}

export async function fetchArticleText(url: string): Promise<string> {
  // YouTube — use transcript API instead of scraping
  if (extractYouTubeId(url)) {
    return fetchYouTubeTranscript(url)
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
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
