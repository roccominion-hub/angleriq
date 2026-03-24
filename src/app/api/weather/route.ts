import { NextRequest, NextResponse } from 'next/server'
import { getMoonData } from '@/lib/moonphase'

function getSeasonFromMonth(month: number) {
  return month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
    : month >= 9 && month <= 11 ? 'fall'
    : 'winter'
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'sunny'
  if (code <= 3) return 'overcast'
  if (code <= 9) return 'overcast'
  if (code <= 59) return 'overcast'
  if (code <= 69) return 'rainy'
  if (code <= 79) return 'overcast'
  if (code <= 84) return 'rainy'
  return 'overcast'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const dateParam = searchParams.get('date') // YYYY-MM-DD for future forecast

  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const latF = parseFloat(lat)
  const lngF = parseFloat(lng)

  // Determine target date
  const now = new Date()
  const targetDate = dateParam ? new Date(dateParam + 'T12:00:00Z') : now
  const daysOut = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isFutureForecast = daysOut > 0 && daysOut <= 16
  const isTooFarOut = daysOut > 16

  try {
    // --- Future forecast mode (up to 16 days) ---
    if (isFutureForecast && dateParam) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,cloud_cover_mean,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&start_date=${dateParam}&end_date=${dateParam}`
      const res = await fetch(url)
      const data = await res.json() as any
      const d = data.daily
      const tempMax = Math.round(d.temperature_2m_max?.[0] ?? 70)
      const tempMin = Math.round(d.temperature_2m_min?.[0] ?? 55)
      const windMph = Math.round(d.wind_speed_10m_max?.[0] ?? 0)
      const cloudPct = Math.round(d.cloud_cover_mean?.[0] ?? 0)
      const precipitation = d.precipitation_sum?.[0] ?? 0
      const weatherCode = d.weather_code?.[0] ?? 0

      const skyCondition = cloudPct < 25 ? 'sunny' : cloudPct < 60 ? 'partly cloudy' : 'overcast'
      const weatherConditions = weatherCode >= 51 ? 'rainy'
        : windMph >= 15 ? 'windy'
        : cloudPct < 25 ? 'sunny'
        : 'overcast'
      const weatherDesc = interpretWeatherCode(weatherCode)

      const month = targetDate.getUTCMonth() + 1
      const season = getSeasonFromMonth(month)
      const moon = getMoonData(targetDate, latF, lngF, 0)

      return NextResponse.json({
        tempF: tempMax,
        tempLowF: tempMin,
        windMph,
        cloudCoverPct: cloudPct,
        precipitation,
        weatherCode,
        weatherDesc,
        skyCondition,
        weatherConditions,
        season,
        moon,
        forecastAvailable: true,
        forecastDate: dateParam,
      })
    }

    // --- Too far out — return season + moon only ---
    if (isTooFarOut && dateParam) {
      const month = targetDate.getUTCMonth() + 1
      const season = getSeasonFromMonth(month)
      const moon = getMoonData(targetDate, latF, lngF, 0)
      return NextResponse.json({ season, moon, forecastAvailable: false, forecastDate: dateParam })
    }

    // --- Current conditions (default) ---
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&timeformat=unixtime`
    const res = await fetch(url)
    const data = await res.json() as any
    const c = data.current

    // Interpret weather code into plain description
    const weatherDesc = interpretWeatherCode(c.weather_code)
    
    // Derive sky/light conditions
    const cloudPct = c.cloud_cover
    const skyCondition = cloudPct < 25 ? 'sunny' : cloudPct < 60 ? 'partly cloudy' : 'overcast'
    
    // Derive time of day using UTC offset from Open-Meteo (correct local time)
    const utcOffsetSeconds = data.utc_offset_seconds ?? 0
    const nowUtcMs = Date.now()
    const localMs = nowUtcMs + utcOffsetSeconds * 1000
    const hour = new Date(localMs).getUTCHours()
    const timeOfDay = hour < 10 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : 'evening'

    // Derive season from month (using local time)
    const month = new Date(localMs).getUTCMonth() + 1
    const season = getSeasonFromMonth(month)

    const tzOffsetHours = utcOffsetSeconds / 3600
    const moon = getMoonData(new Date(), latF, lngF, tzOffsetHours)

    return NextResponse.json({
      tempF: Math.round(c.temperature_2m),
      feelsLikeF: Math.round(c.apparent_temperature),
      precipitation: c.precipitation,
      cloudCoverPct: cloudPct,
      windMph: Math.round(c.wind_speed_10m),
      windDirection: c.wind_direction_10m,
      humidity: c.relative_humidity_2m,
      weatherCode: c.weather_code,
      weatherDesc,
      skyCondition,
      timeOfDay,
      season,
      moon,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 })
  }
}

function interpretWeatherCode(code: number): string {
  if (code === 0) return 'clear sky'
  if (code <= 3) return 'partly cloudy'
  if (code <= 9) return 'foggy'
  if (code <= 19) return 'drizzle'
  if (code <= 29) return 'precipitation'
  if (code <= 39) return 'dusty'
  if (code <= 49) return 'foggy'
  if (code <= 59) return 'drizzle'
  if (code <= 69) return 'rain'
  if (code <= 79) return 'snow'
  if (code <= 84) return 'rain showers'
  if (code <= 94) return 'thunderstorms'
  return 'severe weather'
}
