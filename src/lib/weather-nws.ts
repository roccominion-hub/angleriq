/**
 * Weather via the US National Weather Service (api.weather.gov).
 *
 * Replaces Open-Meteo, which silently drops traffic from cloud-provider IP
 * ranges (connect-timeout from Vercel). NWS is government-run, key-free, and
 * reliable from serverless — US-only, which matches AnglerIQ's coverage.
 *
 * Every fetch is wrapped in a Supabase-backed cache (weather_cache): a fresh
 * hit (< TTL) skips the network entirely, and on any upstream failure we serve
 * the last-known-good payload (marked stale) so conditions never hard-blank.
 */

import { createClient } from '@supabase/supabase-js'

// NWS requires a descriptive User-Agent with contact info or it returns 403.
const UA = 'AnglerIQ/1.0 (angleriq-app.vercel.app; roccominion@gmail.com)'
const NWS = 'https://api.weather.gov'

const CURRENT_TTL_MS = 60 * 60 * 1000       // 1 hour
const FORECAST_TTL_MS = 3 * 60 * 60 * 1000  // 3 hours

const COMPASS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
}

export interface NwsCurrent {
  tempF: number
  feelsLikeF: number
  windMph: number
  windDirection: number
  cloudCoverPct: number
  skyCondition: string
  weatherDesc: string
  humidity: number | null
  precipitation: number
  localHour: number
  tzOffsetHours: number
  stale?: boolean
}

export interface NwsForecast {
  tempF: number
  tempLowF: number | null
  windMph: number
  cloudCoverPct: number
  skyCondition: string
  weatherConditions: string
  weatherDesc: string
  precipitation: number
  stale?: boolean
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function nwsFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/geo+json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`NWS ${res.status} for ${url}`)
  return res.json()
}

// "5 mph" / "0 to 5 mph" / "10 to 15 mph" → representative mph (midpoint of range)
function parseWindMph(s: string | undefined): number {
  if (!s) return 0
  const nums = s.match(/\d+/g)
  if (!nums?.length) return 0
  const vals = nums.map(Number)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

// NWS reports sky via text, not a percentage. Map the shortForecast phrase to
// an approximate cloud-cover percent, then to the app's sky buckets.
function cloudPctFromShort(short: string): number {
  const s = (short || '').toLowerCase()
  if (/(sunny|clear)/.test(s) && !/(mostly|partly|slight chance|chance)/.test(s)) return 5
  if (/mostly (sunny|clear)/.test(s)) return 25
  if (/partly (sunny|cloudy|clear)/.test(s)) return 45
  if (/mostly cloudy/.test(s)) return 75
  if (/(cloudy|overcast)/.test(s)) return 90
  if (/(rain|shower|thunder|storm|snow|drizzle|fog|sleet)/.test(s)) return 85
  return 50
}

function skyFromPct(pct: number): string {
  return pct < 25 ? 'sunny' : pct < 60 ? 'partly cloudy' : 'overcast'
}

function weatherConditionsFromShort(short: string, windMph: number, pct: number): string {
  const s = (short || '').toLowerCase()
  // Only call it rainy for likely/definite precip, not a "slight chance".
  if (/(rain|shower|thunder|storm|drizzle|sleet|snow)/.test(s) && !/(slight chance|chance of)/.test(s)) return 'rainy'
  if (windMph >= 15) return 'windy'
  if (pct < 25) return 'sunny'
  return 'overcast'
}

// Heat-index approximation (Rothfusz) — only meaningful when warm and humid.
function feelsLike(tempF: number, rh: number | null): number {
  if (rh == null || tempF < 80) return tempF
  const T = tempF, R = rh
  const hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
    - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
    + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R
  return Math.round(hi)
}

async function readCache(key: string): Promise<{ payload: any; ageMs: number } | null> {
  try {
    const { data } = await admin()
      .from('weather_cache')
      .select('payload, fetched_at')
      .eq('cache_key', key)
      .maybeSingle()
    if (!data) return null
    return { payload: data.payload, ageMs: Date.now() - new Date(data.fetched_at).getTime() }
  } catch { return null }
}

async function writeCache(key: string, payload: any): Promise<void> {
  try {
    await admin().from('weather_cache').upsert({
      cache_key: key, payload, fetched_at: new Date().toISOString(),
    })
  } catch { /* cache write is best-effort */ }
}

const roundCoord = (n: number) => n.toFixed(2)

// Resolve the NWS grid endpoints for a point (cached long — grid is stable).
async function getGrid(lat: number, lng: number): Promise<{ forecast: string; forecastHourly: string }> {
  const key = `grid:${roundCoord(lat)},${roundCoord(lng)}`
  const cached = await readCache(key)
  if (cached && cached.ageMs < 30 * 24 * 60 * 60 * 1000) return cached.payload
  const p = await nwsFetch(`${NWS}/points/${lat.toFixed(4)},${lng.toFixed(4)}`)
  const grid = { forecast: p.properties.forecast, forecastHourly: p.properties.forecastHourly }
  await writeCache(key, grid)
  return grid
}

/**
 * Current conditions for a point, cache-backed with stale fallback.
 * Sourced from the NWS hourly forecast's current period (always populated,
 * unlike station observations which frequently report null fields).
 */
export async function getNwsCurrent(lat: number, lng: number): Promise<NwsCurrent | null> {
  const key = `cur:${roundCoord(lat)},${roundCoord(lng)}`
  const cached = await readCache(key)
  if (cached && cached.ageMs < CURRENT_TTL_MS) return cached.payload as NwsCurrent

  try {
    const { forecastHourly } = await getGrid(lat, lng)
    const h = (await nwsFetch(forecastHourly)).properties.periods[0]
    const tempF = Math.round(h.temperature)
    const windMph = parseWindMph(h.windSpeed)
    const cloudCoverPct = cloudPctFromShort(h.shortForecast)
    const rh = h.relativeHumidity?.value ?? null
    // startTime carries the local offset, e.g. 2026-07-03T20:00:00-05:00
    const offsetMatch = String(h.startTime).match(/([+-]\d{2}):(\d{2})$/)
    const tzOffsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : 0
    const localHour = parseInt(String(h.startTime).slice(11, 13), 10)

    const payload: NwsCurrent = {
      tempF,
      feelsLikeF: feelsLike(tempF, rh),
      windMph,
      windDirection: COMPASS[(h.windDirection || '').toUpperCase()] ?? 0,
      cloudCoverPct,
      skyCondition: skyFromPct(cloudCoverPct),
      weatherDesc: h.shortForecast || 'unknown',
      humidity: rh != null ? Math.round(rh) : null,
      precipitation: 0, // NWS gives probability, not accumulation
      localHour,
      tzOffsetHours,
    }
    await writeCache(key, payload)
    return payload
  } catch {
    if (cached) return { ...(cached.payload as NwsCurrent), stale: true }
    return null
  }
}

/**
 * Daily forecast for a specific date (YYYY-MM-DD), cache-backed with stale
 * fallback. Returns null when the date is outside the NWS window (~7 days).
 */
export async function getNwsForecast(lat: number, lng: number, dateISO: string): Promise<NwsForecast | null> {
  const key = `fc:${roundCoord(lat)},${roundCoord(lng)}:${dateISO}`
  const cached = await readCache(key)
  if (cached && cached.ageMs < FORECAST_TTL_MS) return cached.payload as NwsForecast

  try {
    const { forecast } = await getGrid(lat, lng)
    const periods = (await nwsFetch(forecast)).properties.periods as any[]
    const dayP = periods.find(p => p.isDaytime && String(p.startTime).slice(0, 10) === dateISO)
    if (!dayP) return null // outside NWS forecast range
    const nightP = periods.find(p => !p.isDaytime && String(p.startTime).slice(0, 10) === dateISO)
    const cloudCoverPct = cloudPctFromShort(dayP.shortForecast)
    const windMph = parseWindMph(dayP.windSpeed)

    const payload: NwsForecast = {
      tempF: Math.round(dayP.temperature),
      tempLowF: nightP ? Math.round(nightP.temperature) : null,
      windMph,
      cloudCoverPct,
      skyCondition: skyFromPct(cloudCoverPct),
      weatherConditions: weatherConditionsFromShort(dayP.shortForecast, windMph, cloudCoverPct),
      weatherDesc: dayP.shortForecast || 'unknown',
      precipitation: dayP.probabilityOfPrecipitation?.value ?? 0,
    }
    await writeCache(key, payload)
    return payload
  } catch {
    if (cached) return { ...(cached.payload as NwsForecast), stale: true }
    return null
  }
}
