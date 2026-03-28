/**
 * Texas Fishing Forum — authenticated fetch utility
 * Logs in once, stores session cookie, reuses for all subsequent requests
 */
import * as fs from 'fs'
import * as path from 'path'
import * as cheerio from 'cheerio'

const TFF_BASE = 'https://www.texasfishingforum.com'
const COOKIE_FILE = path.resolve(process.cwd(), 'scripts/ingestion/.tff-session.json')
const CREDENTIALS = { login: 'roccominion@gmail.com', password: 'roccominion2026' }

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

function loadCookies(): string {
  try { return JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8')).cookie || '' }
  catch { return '' }
}

function saveCookies(cookie: string) {
  fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie, saved: new Date().toISOString() }))
}

async function fetchWithCookies(url: string, cookie: string): Promise<Response> {
  return fetch(url, { headers: { ...HEADERS, Cookie: cookie }, redirect: 'follow' })
}

async function isLoggedIn(cookie: string): Promise<boolean> {
  const res = await fetchWithCookies(`${TFF_BASE}/account/`, cookie)
  const html = await res.text()
  return html.includes('Log Out') || html.includes('logout') || html.includes('account_name')
}

export async function getTffSession(): Promise<string> {
  // Try cached cookie first
  const cached = loadCookies()
  if (cached && await isLoggedIn(cached)) {
    console.log('  ✓ Using cached TFF session')
    return cached
  }

  console.log('  🔐 Logging in to Texas Fishing Forum...')

  // Step 1: Get login page for _xfToken
  const loginPage = await fetch(`${TFF_BASE}/login/`, { headers: HEADERS })
  const setCookieHeader = loginPage.headers.get('set-cookie') || ''
  const initialCookies = setCookieHeader.split(',').map(c => c.split(';')[0].trim()).join('; ')
  const html = await loginPage.text()
  const $ = cheerio.load(html)
  const xfToken = $('input[name="_xfToken"]').val() as string || ''

  // Step 2: POST credentials
  const formData = new URLSearchParams({
    login: CREDENTIALS.login,
    password: CREDENTIALS.password,
    remember: '1',
    _xfToken: xfToken,
    _xfRedirect: TFF_BASE,
  })

  const loginRes = await fetch(`${TFF_BASE}/login/login`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initialCookies,
      'Referer': `${TFF_BASE}/login/`,
    },
    body: formData.toString(),
    redirect: 'manual',
  })

  // Collect all cookies from response
  const allSetCookies = loginRes.headers.getSetCookie?.() || []
  const sessionCookie = [...initialCookies.split('; '), ...allSetCookies.map((c: string) => c.split(';')[0].trim())]
    .filter(Boolean)
    .join('; ')

  if (await isLoggedIn(sessionCookie)) {
    console.log('  ✅ Logged in to TFF successfully')
    saveCookies(sessionCookie)
    return sessionCookie
  }

  throw new Error('TFF login failed — check credentials')
}

export async function fetchTff(url: string): Promise<string> {
  const cookie = await getTffSession()
  const res = await fetchWithCookies(url, cookie)
  if (!res.ok) throw new Error(`TFF fetch failed ${res.status}: ${url}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, .p-nav, .p-footer, .p-header, .bbCodeBlock--unfurl, .adContainer').remove()
  const content = $('.p-body-content, .block-body, main, article').text() || $('body').text()
  return content.replace(/\s+/g, ' ').trim()
}

export async function searchTff(query: string): Promise<{ title: string; url: string }[]> {
  const cookie = await getTffSession()
  const searchUrl = `${TFF_BASE}/search/?q=${encodeURIComponent(query)}&t=post&c[node]=2&o=date`
  const res = await fetchWithCookies(searchUrl, cookie)
  const html = await res.text()
  const $ = cheerio.load(html)

  const results: { title: string; url: string }[] = []
  $('.contentRow-title a, .search-result a[href*="threads"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const title = $(el).text().trim()
    if (href && title) {
      results.push({ title, url: href.startsWith('http') ? href : `${TFF_BASE}${href}` })
    }
  })
  return results.slice(0, 10)
}
