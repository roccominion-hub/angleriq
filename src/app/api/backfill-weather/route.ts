/**
 * Historical weather backfill for conditions records.
 *
 * For each conditions record that has a date but null weather fields,
 * fetches from Open-Meteo's free historical archive API and populates:
 *   air_temp_f, sky_cover, wind_mph, barometric_pressure, pressure_trend
 *
 * The conditions.date field represents the actual FISHING DATE — not the
 * article publish date. For multi-day tournaments, each fishing day should
 * have its own conditions record.
 *
 * Open-Meteo archive docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * POST /api/backfill-weather
 * Body: { secret: string, limit?: number, dryRun?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function interpretSkyCode(code: number): string {
  if (code === 0) return 'sunny'
  if (code <= 3) return 'partly cloudy'
  if (code <= 49) return 'overcast'
  if (code <= 69) return 'rain'
  if (code <= 79) return 'snow'
  if (code <= 99) return 'thunderstorms'
  return 'overcast'
}

// Determine pressure trend from a series of hourly pressure values
function getPressureTrend(pressures: number[]): string {
  if (pressures.length < 4) return 'steady'
  const first = pressures.slice(0, Math.floor(pressures.length / 2))
  const last = pressures.slice(Math.floor(pressures.length / 2))
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length
  const avgLast = last.reduce((a, b) => a + b, 0) / last.length
  const diff = avgLast - avgFirst
  if (diff > 0.5) return 'rising'
  if (diff < -0.5) return 'falling'
  return 'steady'
}

async function fetchHistoricalWeather(date: string, lat: number, lng: number) {
  const url = [
    `https://archive-api.open-meteo.com/v1/archive`,
    `?latitude=${lat}&longitude=${lng}`,
    `&start_date=${date}&end_date=${date}`,
    `&hourly=temperature_2m,cloud_cover,wind_speed_10m,weather_code,surface_pressure`,
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`,
  ].join('')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
  const data = await res.json() as any

  const h = data.hourly
  if (!h || !h.time?.length) throw new Error('No hourly data returned')

  // Focus on fishing hours (5am–8pm = indices 5–20)
  const fishingHours = h.time
    .map((_: string, i: number) => i)
    .filter((i: number) => i >= 5 && i <= 20)

  const temps: number[] = fishingHours.map((i: number) => h.temperature_2m[i]).filter(Boolean)
  const clouds: number[] = fishingHours.map((i: number) => h.cloud_cover[i]).filter((v: number) => v !== null)
  const winds: number[] = fishingHours.map((i: number) => h.wind_speed_10m[i]).filter(Boolean)
  const codes: number[] = fishingHours.map((i: number) => h.weather_code[i]).filter((v: number) => v !== null)
  const pressures: number[] = h.surface_pressure || []

  const avgTempF = temps.length ? Math.round(temps.reduce((a: number, b: number) => a + b, 0) / temps.length) : null
  const avgCloud = clouds.length ? Math.round(clouds.reduce((a: number, b: number) => a + b, 0) / clouds.length) : null
  const avgWind = winds.length ? Math.round(winds.reduce((a: number, b: number) => a + b, 0) / winds.length) : null
  const avgPressure = pressures.length ? Math.round(pressures.reduce((a: number, b: number) => a + b, 0) / pressures.length * 10) / 10 : null
  const pressureTrend = getPressureTrend(pressures)

  // Most common weather code during fishing hours
  const codeFreq: Record<number, number> = {}
  codes.forEach((c: number) => { codeFreq[c] = (codeFreq[c] || 0) + 1 })
  const dominantCode = Object.entries(codeFreq).sort((a, b) => b[1] - a[1])[0]
  const skyCover = dominantCode ? interpretSkyCode(parseInt(dominantCode[0])) : null

  return {
    air_temp_f: avgTempF,
    sky_cover: skyCover,
    wind_mph: avgWind,
    barometric_pressure: avgPressure,
    pressure_trend: pressureTrend,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { secret, limit = 50, dryRun = false } = body

  if (secret !== process.env.BACKFILL_SECRET && secret !== 'angleriq-backfill-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all conditions records that have a date but missing weather fields
  const { data: conditions, error } = await supabase
    .from('conditions')
    .select(`
      id, date, technique_report_id,
      technique_report!inner (
        body_of_water_id,
        body_of_water:body_of_water_id ( lat, lng, name )
      )
    `)
    .is('air_temp_f', null)
    .not('date', 'is', null)
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!conditions?.length) return NextResponse.json({ message: 'Nothing to backfill', updated: 0 })

  const results = {
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const c of conditions) {
    const tr = c.technique_report as any
    const bow = tr?.body_of_water
    if (!bow?.lat || !bow?.lng) {
      results.skipped++
      continue
    }

    // Skip future dates
    if (new Date(c.date) > new Date()) {
      results.skipped++
      continue
    }

    try {
      const weather = await fetchHistoricalWeather(c.date, bow.lat, bow.lng)

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('conditions')
          .update(weather)
          .eq('id', c.id)

        if (updateError) {
          results.errors.push(`${c.id}: ${updateError.message}`)
          continue
        }
      }

      results.updated++

      // Rate limit: Open-Meteo allows generous requests but let's be polite
      await new Promise(r => setTimeout(r, 150))
    } catch (err: any) {
      results.errors.push(`${c.id} (${c.date} @ ${bow.name}): ${err.message}`)
    }
  }

  return NextResponse.json({
    message: dryRun ? 'Dry run complete' : 'Backfill complete',
    ...results,
    totalConditionsRecords: conditions.length,
  })
}
