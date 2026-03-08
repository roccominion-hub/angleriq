import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lake, state, season, sampleSize, topBaits, topPatterns, reports, weather } = await req.json()

  // Extract all colors from real data
  const colorsFromData: string[] = []
  reports?.forEach((r: any) => {
    r.bait_used?.forEach((b: any) => {
      if (b.color) colorsFromData.push(`${b.bait_name || b.bait_type}: ${b.color}`)
    })
  })

  const weatherContext = weather ? `
Current conditions at ${lake}:
- Temperature: ${weather.tempF}°F (feels like ${weather.feelsLikeF}°F)
- Sky: ${weather.skyCondition} (${weather.cloudCoverPct}% cloud cover)
- Wind: ${weather.windMph} mph
- Precipitation: ${weather.precipitation > 0 ? weather.precipitation + 'mm' : 'none'}
- Time of day: ${weather.timeOfDay}
- Season: ${weather.season}
` : `Current season: ${season || 'unknown'}`

  const colorContext = colorsFromData.length > 0
    ? `Known winning colors from tournament data:\n${[...new Set(colorsFromData)].slice(0, 10).join('\n')}`
    : 'No specific color data available from tournament records — recommend colors based on conditions.'

  const prompt = `You are an expert bass fishing guide and tournament analyst. Generate a fishing intelligence report for ${lake}, ${state}.

TOURNAMENT DATA:
- Sample size: ${sampleSize} tournament technique reports
- Top producing baits: ${topBaits.slice(0, 6).map((b: any) => `${b.name} (${b.count} reports)`).join(', ')}
- Top patterns: ${topPatterns.slice(0, 4).map((p: any) => `${p.pattern} (${p.count} reports)`).join(', ')}
- Recent techniques: ${reports.slice(0, 4).map((r: any) => `${r.pattern || 'various'} / ${r.presentation || 'various'}`).join('; ')}

${weatherContext}

${colorContext}

Write the report in TWO clearly labeled sections:

**TOURNAMENT INTEL**
2-3 sentences covering the dominant historical patterns, top baits, and key structure on this fishery. Be specific and actionable.

**TODAY'S RECOMMENDATION**
2-3 sentences giving a specific recommendation for RIGHT NOW based on the current conditions (time of day, temperature, sky conditions, season). Include:
- The best technique and presentation for these conditions
- Top 3 specific bait color recommendations — use tournament data colors if available, otherwise recommend colors based on water clarity, sky/light conditions, water temp, and season. Explain briefly why each color works in these conditions.
- Any condition-specific adjustments (e.g. slow down in cold fronts, go topwater in low light, etc.)

Be direct, confident, and specific. Write like a knowledgeable local guide, not a generic fishing article.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json() as any
  const summary = data.content?.[0]?.text?.trim() || ''

  return NextResponse.json({ summary })
}
