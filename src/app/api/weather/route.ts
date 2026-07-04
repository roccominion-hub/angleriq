import { NextRequest, NextResponse } from 'next/server'
import { getMoonData } from '@/lib/moonphase'
import { getNwsCurrent, getNwsForecast } from '@/lib/weather-nws'

function getSeasonFromMonth(month: number) {
  return month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
    : month >= 9 && month <= 11 ? 'fall'
    : 'winter'
}

const SEASONAL_AVERAGES: Record<string, { airTemp: string; wind: string; waterTemp: string }> = {
  spring: { airTemp: 'mild', wind: 'moderate', waterTemp: 'cool' },
  summer: { airTemp: 'hot', wind: 'light', waterTemp: 'hot' },
  fall: { airTemp: 'cool', wind: 'moderate', waterTemp: 'warm' },
  winter: { airTemp: 'cold', wind: 'light', waterTemp: 'cold' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const dateParam = searchParams.get('date') // YYYY-MM-DD for future forecast

  if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })

  const latF = parseFloat(lat)
  const lngF = parseFloat(lng)

  const now = new Date()
  const targetDate = dateParam ? new Date(dateParam + 'T12:00:00Z') : now
  const daysOut = Math.round((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  try {
    // --- Future forecast mode ---
    if (dateParam && daysOut > 0) {
      const month = targetDate.getUTCMonth() + 1
      const season = getSeasonFromMonth(month)
      const moon = getMoonData(targetDate, latF, lngF, 0)

      // NWS forecast covers ~7 days; beyond that (or on a miss) fall back to
      // season + moon + qualitative seasonal averages.
      const fc = daysOut <= 7 ? await getNwsForecast(latF, lngF, dateParam) : null
      if (fc) {
        return NextResponse.json({
          tempF: fc.tempF,
          tempLowF: fc.tempLowF,
          windMph: fc.windMph,
          cloudCoverPct: fc.cloudCoverPct,
          precipitation: fc.precipitation,
          weatherDesc: fc.weatherDesc,
          skyCondition: fc.skyCondition,
          weatherConditions: fc.weatherConditions,
          season,
          moon,
          forecastAvailable: true,
          forecastDate: dateParam,
        })
      }

      return NextResponse.json({
        season,
        moon,
        forecastAvailable: false,
        forecastDate: dateParam,
        seasonalAverages: SEASONAL_AVERAGES[season] || null,
      })
    }

    // --- Current conditions (default) ---
    const cur = await getNwsCurrent(latF, lngF)
    if (!cur) return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })

    const timeOfDay = cur.localHour < 10 ? 'morning'
      : cur.localHour < 14 ? 'midday'
      : cur.localHour < 18 ? 'afternoon'
      : 'evening'

    const localMs = Date.now() + cur.tzOffsetHours * 3600 * 1000
    const month = new Date(localMs).getUTCMonth() + 1
    const season = getSeasonFromMonth(month)
    const moon = getMoonData(new Date(), latF, lngF, cur.tzOffsetHours)

    return NextResponse.json({
      tempF: cur.tempF,
      feelsLikeF: cur.feelsLikeF,
      precipitation: cur.precipitation,
      cloudCoverPct: cur.cloudCoverPct,
      windMph: cur.windMph,
      windDirection: cur.windDirection,
      humidity: cur.humidity,
      weatherDesc: cur.weatherDesc,
      skyCondition: cur.skyCondition,
      timeOfDay,
      season,
      moon,
      stale: cur.stale ?? false,
    })
  } catch {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 })
  }
}
