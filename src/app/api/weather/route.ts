import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  try {
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
    const season = month >= 3 && month <= 5 ? 'spring'
      : month >= 6 && month <= 8 ? 'summer'
      : month >= 9 && month <= 11 ? 'fall'
      : 'winter'

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
