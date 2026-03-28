/**
 * Texas Fishing Forum (TFF) Utilities
 * Fetches threads from TFF forums and filters by lake name
 * TFF forums accessible without login:
 *   Forum 24 = freshwater reports
 *   Forum 2  = bass fishing
 */

const TFF_BASE = 'https://texasfishingforum.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function fetchTffPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  // Extract readable text from thread
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return textContent
}

export async function findTffThreadsForLake(lakeName: string, maxPages = 10): Promise<string[]> {
  const keywords = lakeName.toLowerCase().split(' ').filter(w => w.length > 3 && !['lake', 'reservoir', 'creek', 'river', 'bend'].includes(w))
  const fullKeywords = [lakeName.toLowerCase().replace(/\s+/g, '-'), ...keywords]
  
  const found: Set<string> = new Set()
  
  for (const forumId of [24, 2, 1]) {
    for (let page = 1; page <= maxPages; page++) {
      try {
        const res = await fetch(`${TFF_BASE}/forums/ubbthreads.php/forums/${forumId}/${page}/`, {
          headers: { 'User-Agent': UA }
        })
        if (!res.ok) break
        const html = await res.text()
        
        // Find thread links where slug contains lake keywords
        const threadMatches = html.matchAll(/href="(\/forums\/ubbthreads\.php\/topics\/(\d+)\/[^"#]*)[#"]/g)
        for (const match of threadMatches) {
          const path = match[1]
          const slug = path.toLowerCase()
          if (fullKeywords.some(kw => slug.includes(kw))) {
            // Normalize to base thread URL (page 1 or direct)
            const normalized = path.replace(/\/\d+\/$/, '/').replace(/\/all\/$/, '/')
            found.add(`${TFF_BASE}${normalized}`)
          }
        }
        await new Promise(r => setTimeout(r, 300))
      } catch { break }
    }
  }
  
  return [...found]
}
