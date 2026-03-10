import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLakeRagContext, formatRagContextForPrompt } from '@/lib/rag'
import { generateEmbedding } from '@/lib/embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getTechniqueRagChunks(lake: string, state: string, season: string, weather: any, filters: Record<string, string> = {}, lakeId?: string): Promise<string[]> {
  const seasonStr = weather?.season || season || ''
  const timeOfDay = weather?.timeOfDay || ''
  const conditions = weather ? `${weather.tempF}°F, ${weather.skyCondition}` : ''
  const queryParts = [`Bass fishing techniques for ${lake}, ${state}`]
  if (seasonStr) queryParts.push(`in ${seasonStr}`)
  if (timeOfDay) queryParts.push(timeOfDay)
  if (conditions) queryParts.push(conditions)
  if (filters.pattern && filters.pattern !== 'all') queryParts.push(filters.pattern)
  if (filters.bait_type && filters.bait_type !== 'all') queryParts.push(filters.bait_type)
  const queryText = queryParts.join(', ')

  const embedding = await generateEmbedding(queryText)
  if (!embedding) return []

  const { data: chunks, error } = await supabase.rpc('match_technique_embeddings', {
    query_embedding: embedding,
    match_count: 8,
    ...(lakeId ? { filter_lake_id: lakeId } : {}),
  })

  if (error || !chunks) return []
  return (chunks as any[]).map((c: any) => c.content)
}

function buildFilterString(filters: Record<string, string> = {}) {
  return Object.entries(filters)
    .filter(([, v]) => v && v !== 'all')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

export async function POST(req: NextRequest) {
  const { lake, state, season, sampleSize, topBaits, topPatterns, reports, weather, filters, lakeId } = await req.json()

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
    return NextResponse.json({ intel: cachedIntel, today: cachedToday, cached: true })
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

  // Fetch curated RAG context (fishing articles/guides)
  const rag = lakeId ? await getLakeRagContext(lakeId, lake, state, season, filters) : { chunks: [], sourceCount: 0, usedSimilarLakes: [] }
  const ragContext = formatRagContextForPrompt(rag, lake)

  // Fetch tournament technique embeddings (RAG from actual tournament data)
  const techniqueChunks = await getTechniqueRagChunks(lake, state, season, weather, filters, lakeId)
  const hasTechniqueRag = techniqueChunks.length > 0
  const techniqueRagContext = hasTechniqueRag
    ? `VERIFIED TOURNAMENT REPORTS (${techniqueChunks.length} relevant reports):\n---\n${techniqueChunks.map((c, i) => `[Report ${i + 1}]\n${c}`).join('\n\n')}\n---`
    : ''

  const hasRag = rag.chunks.length > 0 || hasTechniqueRag
  const intelInstruction = hasTechniqueRag
    ? `Use the VERIFIED TOURNAMENT REPORTS above as your PRIMARY source for the TOURNAMENT INTEL section. These are real tournament results from this fishery. Be specific — cite actual baits, techniques, structure, and depths from the reports. Do not add generic information not grounded in these sources.`
    : hasRag
    ? `Use the CURATED FISHING INTELLIGENCE above as your PRIMARY source for the TOURNAMENT INTEL section. Synthesize it with the tournament data. Be specific — cite baits, structure, depths, presentations from the curated content. Do not add generic information not grounded in these sources.`
    : `Write based on the tournament data and your knowledge of this specific fishery. Be specific — name bait types, structure, depths, presentations. Write like a seasoned guide who knows this lake.`

  const prompt = `You are an expert bass fishing guide and tournament analyst with deep knowledge of ${lake}, ${state}.
${techniqueRagContext ? '\n' + techniqueRagContext + '\n' : ''}${ragContext ? '\n' + ragContext + '\n' : ''}
TOURNAMENT DATA SUMMARY (${sampleSize} reports):
- Top baits: ${topBaits.slice(0, 6).map((b: any) => `${b.name} (${b.count} reports)`).join(', ')}
- Top patterns: ${topPatterns.slice(0, 4).map((p: any) => `${p.pattern} (${p.count} reports)`).join(', ')}
- Techniques in use: ${reports.slice(0, 5).map((r: any) => `${r.pattern || 'various'} / ${r.presentation || 'various'}`).join('; ')}

${weatherContext}

${colorContext}

${intelInstruction}

Write a detailed fishing intelligence report in TWO clearly labeled sections:

**TOURNAMENT INTEL**
Write 4-5 sentences covering: the dominant historical patterns on this fishery, the top baits and why they work here, key structure and depth ranges, and any seasonal tendencies. Be specific — name the bait types, the structure, the depths, the presentations.

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
      max_tokens: 1500,
      system: 'You are an expert bass fishing guide. Always respond with exactly two sections labeled **TOURNAMENT INTEL** and **TODAY\'S RECOMMENDATION**. Never omit either section. Use newlines to separate ideas within each section.',
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

  return NextResponse.json({ intel: intelText, today: todayText, cached: false })
}
