/**
 * Moon phase and solunar calculations — no API needed, fully deterministic.
 * Moon phase algorithm based on Conway's method / astronomical approximation.
 * Solunar periods based on moon transit times.
 */

export interface MoonData {
  phase: string           // e.g. "Waxing Gibbous"
  illumination: number    // 0–100%
  emoji: string
  solunarRating: 'excellent' | 'good' | 'fair' | 'poor'
  solunarLabel: string    // e.g. "Major Bite Window"
  majorPeriods: string[]  // e.g. ["06:14 AM – 08:14 AM", "06:42 PM – 08:42 PM"]
  minorPeriods: string[]  // e.g. ["12:28 PM – 01:28 PM", "12:56 AM – 01:56 AM"]
  moonrise: string
  moonset: string
  daysUntilNewMoon: number
  daysUntilFullMoon: number
}

// Julian Day Number from calendar date
function julianDay(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

// Moon age in days (0 = new moon, ~14.77 = full moon, ~29.53 = next new moon)
export function getMoonAge(date: Date): number {
  const jd = julianDay(date)
  // Known new moon: Jan 6, 2000 18:14 UTC → JD 2451550.259
  const knownNewMoon = 2451550.259
  const synodicPeriod = 29.53058867
  const age = ((jd - knownNewMoon) % synodicPeriod + synodicPeriod) % synodicPeriod
  return age
}

export function getMoonIllumination(age: number): number {
  // Approximate illumination from age
  return Math.round((1 - Math.cos((age / 29.53058867) * 2 * Math.PI)) / 2 * 100)
}

export function getMoonPhaseLabel(age: number): { phase: string; emoji: string } {
  if (age < 1.85)  return { phase: 'New Moon',        emoji: '🌑' }
  if (age < 5.55)  return { phase: 'Waxing Crescent', emoji: '🌒' }
  if (age < 9.22)  return { phase: 'First Quarter',   emoji: '🌓' }
  if (age < 12.91) return { phase: 'Waxing Gibbous',  emoji: '🌔' }
  if (age < 16.61) return { phase: 'Full Moon',        emoji: '🌕' }
  if (age < 20.30) return { phase: 'Waning Gibbous',  emoji: '🌖' }
  if (age < 23.99) return { phase: 'Last Quarter',    emoji: '🌗' }
  if (age < 27.68) return { phase: 'Waning Crescent', emoji: '🌘' }
  return { phase: 'New Moon', emoji: '🌑' }
}

// Solunar rating based on moon phase proximity to new/full moon
// Best fishing: 1–2 days before/after new or full moon
export function getSolunarRating(age: number): { rating: 'excellent' | 'good' | 'fair' | 'poor'; label: string } {
  const synodicPeriod = 29.53058867
  const distFromNew = Math.min(age, synodicPeriod - age)
  const distFromFull = Math.abs(age - synodicPeriod / 2)
  const minDist = Math.min(distFromNew, distFromFull)

  if (minDist <= 1.5) return { rating: 'excellent', label: 'Peak Solunar Activity' }
  if (minDist <= 3)   return { rating: 'good',      label: 'Strong Solunar Activity' }
  if (minDist <= 5)   return { rating: 'fair',       label: 'Moderate Solunar Activity' }
  return { rating: 'poor', label: 'Low Solunar Activity' }
}

// Calculate moon transit time (when moon is highest in sky) for a given date and longitude
// Returns approximate UTC hour of moon's upper transit
function moonTransitHour(date: Date, lngDeg: number): number {
  const age = getMoonAge(date)
  // Moon moves ~12.19° per day (360° / 29.53 days)
  // Moon transits meridian approximately when it is opposite the sun in RA
  // Simplified: new moon transits ~noon local, full moon ~midnight local
  // Moon transits 50 min later each day
  const transitHourUTC = (12 + (age * (12.41667 / 15)) + (lngDeg / 15)) % 24
  return (transitHourUTC + 24) % 24
}

function formatHour(h: number, tzOffsetHours: number): string {
  const local = (h + tzOffsetHours + 24) % 24
  const hrs = Math.floor(local)
  const mins = Math.round((local - hrs) * 60)
  const hDisplay = hrs % 12 === 0 ? 12 : hrs % 12
  const ampm = hrs < 12 ? 'AM' : 'PM'
  return `${hDisplay}:${mins.toString().padStart(2, '0')} ${ampm}`
}

function formatPeriod(centerHour: number, durationHours: number, tzOffsetHours: number): string {
  const start = (centerHour - durationHours / 2 + 24) % 24
  const end = (centerHour + durationHours / 2 + 24) % 24
  return `${formatHour(start, 0)} – ${formatHour(end, 0)}`
}

export function getMoonData(date: Date, lat: number, lng: number, tzOffsetHours = 0): MoonData {
  const age = getMoonAge(date)
  const illumination = getMoonIllumination(age)
  const { phase, emoji } = getMoonPhaseLabel(age)
  const { rating: solunarRating, label: solunarLabel } = getSolunarRating(age)

  // Solunar periods — 2 major (moon overhead/underfoot, ~2hr windows) + 2 minor (~1hr)
  const transitH = moonTransitHour(date, lng)
  const opposite = (transitH + 12) % 24

  const majorPeriods = [
    formatPeriod(transitH + tzOffsetHours, 2, 0),
    formatPeriod(opposite + tzOffsetHours, 2, 0),
  ]
  const minorH1 = (transitH + 6) % 24
  const minorH2 = (transitH + 18) % 24
  const minorPeriods = [
    formatPeriod(minorH1 + tzOffsetHours, 1, 0),
    formatPeriod(minorH2 + tzOffsetHours, 1, 0),
  ]

  // Approximate moonrise/moonset (very rough — ±30 min accuracy)
  const moonriseH = (transitH - 6 + 24) % 24
  const moonsetH = (transitH + 6) % 24

  const synodicPeriod = 29.53058867
  const daysUntilNewMoon = age < 1 ? 0 : Math.round(synodicPeriod - age)
  const daysUntilFullMoon = age < synodicPeriod / 2
    ? Math.round(synodicPeriod / 2 - age)
    : Math.round(synodicPeriod - age + synodicPeriod / 2)

  return {
    phase,
    illumination,
    emoji,
    solunarRating,
    solunarLabel,
    majorPeriods,
    minorPeriods,
    moonrise: formatHour(moonriseH + tzOffsetHours, 0),
    moonset: formatHour(moonsetH + tzOffsetHours, 0),
    daysUntilNewMoon,
    daysUntilFullMoon,
  }
}

export function solunarRatingColor(rating: MoonData['solunarRating']): string {
  switch (rating) {
    case 'excellent': return 'text-green-700 bg-green-50 border-green-200'
    case 'good':      return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'fair':      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'poor':      return 'text-slate-500 bg-slate-50 border-slate-200'
  }
}
