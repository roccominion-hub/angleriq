import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function buildFilterString(filters: Record<string, string> = {}) {
  return Object.entries(filters)
    .filter(([, v]) => v && v !== 'all')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

export async function POST(req: NextRequest) {
  const { lake, state, season, sampleSize, topBaits, topPatterns, reports, weather, filters } = await req.json()

  // Build cache keys
  const filterStr = buildFilterString(filters)
  const lakePart = lake.toLowerCase().replace(/\s+/g, '-')
  const intelKey = `intel:${lakePart}:${filterStr}`
  const tempBucket = weather ? Math.round(weather.tempF / 5) * 5 : 0
  const todayKey = `today:${lakePart}:${filterStr}:${tempBucket}:${weather?.timeOfDay || ''}:${weather?.skyCondition || ''}:${weather?.season || season || ''}`

  const now = new Date().toISOString()

  // Check caches
  let cachedIntel: string | null = null
  let cachedToday: string | null = null

  const { data: intelCache } = await supabase
    .from('summary_cache')
    .select('intel')
    .eq('cache_key', intelKey)
    .gt('expires_at', now)
    .maybeSingle()

  if (intelCache) cachedIntel = intelCache.intel

  const { data: todayCache } = await supabase
    .from('summary_cache')
    .select('today')
    .eq('cache_key', todayKey)
    .gt('expires_at', now)
    .maybeSingle()

  if (todayCache) cachedToday = todayCache.today

  // If both cached, return immediately
  if (cachedIntel && cachedToday) {
    return NextResponse.json({
      summary: `**TOURNAMENT INTEL**\n${cachedIntel}\n\n**TODAY'S RECOMMENDATION**\n${cachedToday}`,
      cached: true
    })
  }

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

  const prompt = `You are an expert bass fishing guide and tournament analyst with deep knowledge of ${lake}, ${state}.

TOURNAMENT DATA (${sampleSize} reports):
- Top baits: ${topBaits.slice(0, 6).map((b: any) => `${b.name} (${b.count} reports)`).join(', ')}
- Top patterns: ${topPatterns.slice(0, 4).map((p: any) => `${p.pattern} (${p.count} reports)`).join(', ')}
- Techniques in use: ${reports.slice(0, 5).map((r: any) => `${r.pattern || 'various'} / ${r.presentation || 'various'}`).join('; ')}

${weatherContext}

${colorContext}

Write a detailed fishing intelligence report in TWO clearly labeled sections:

**TOURNAMENT INTEL**
Write 4-5 sentences covering: the dominant historical patterns on this fishery, the top baits and why they work here, key structure and depth ranges, and any seasonal tendencies. Be specific — name the bait types, the structure, the depths, the presentations. Write like a seasoned guide who knows this lake.

**TODAY'S RECOMMENDATION**
Write a detailed, actionable recommendation for fishing RIGHT NOW based on the current conditions. Cover:

1. The primary technique and presentation you'd start with, and why it fits these conditions.

2. Top bait color recommendations:
- [Color 1]: [why it works right now — sky conditions, water clarity, light penetration]
- [Color 2]: [why it works right now]
- [Color 3]: [why it works right now]

3. Key adjustments for current conditions (one per line):
- [Adjustment based on temperature/season]
- [Adjustment based on time of day/light]
- [Any other relevant condition note]

Be direct and confident. Write like a knowledgeable local guide giving advice to a serious angler, not a generic fishing article. Avoid filler phrases.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json() as any
  const summary = data.content?.[0]?.text?.trim() || ''

  // Parse into sections for caching
  const todayMatch = summary.match(/\*{0,2}TODAY['']S RECOMMENDATION\*{0,2}[:\s]*([\s\S]*?)$/im)
  const intelMatch = summary.match(/\*{0,2}TOURNAMENT INTEL\*{0,2}[:\s]*([\s\S]*?)(?=\*{0,2}TODAY|$)/im)
  const intelText = intelMatch ? intelMatch[1].trim() : summary
  const todayText = todayMatch ? todayMatch[1].trim() : ''

  // Cache each section separately
  const intelExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const todayExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  if (!cachedIntel && intelText) {
    await supabase.from('summary_cache').upsert({
      cache_key: intelKey,
      intel: intelText,
      today: todayText || '',
      expires_at: intelExpiry,
    })
  }

  if (!cachedToday && todayText) {
    await supabase.from('summary_cache').upsert({
      cache_key: todayKey,
      intel: intelText || '',
      today: todayText,
      expires_at: todayExpiry,
    })
  }

  return NextResponse.json({ summary })
}
