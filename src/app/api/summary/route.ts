import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/embeddings'
import { getUserIdFromRequest, getPersonalIntelSection, getMyIntelData } from '@/lib/personalIntel'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getLakeStructureTags(lakeId: string): Promise<string[] | null> {
  const { data } = await supabase
    .from('body_of_water')
    .select('structure_tags')
    .eq('id', lakeId)
    .single()
  return data?.structure_tags ?? null
}

async function getTechniqueRagChunks(lake: string, state: string, season: string, weather: any, filters: Record<string, string> = {}, lakeId?: string): Promise<{ chunks: string[]; similarLakes: string[] }> {
  const seasonStr = weather?.season || season || ''
  const timeOfDay = weather?.timeOfDay || ''
  const conditions = weather ? `${weather.tempF}°F, ${weather.skyCondition}` : ''
  const queryParts = [`Bass fishing techniques for ${lake}, ${state}`]
  if (seasonStr) queryParts.push(`in ${seasonStr}`)
  if (timeOfDay) queryParts.push(timeOfDay)
  if (conditions) queryParts.push(conditions)
  if (filters.pattern && filters.pattern !== 'all') queryParts.push(filters.pattern)
  const baitTypes = filters.baitType && filters.baitType !== 'all' ? filters.baitType.split(',').map((s: string) => s.trim()) : []
  if (baitTypes.length > 0) queryParts.push(baitTypes.join(' OR '))
  if (filters.bait_type && filters.bait_type !== 'all') queryParts.push(filters.bait_type)
  const queryText = queryParts.join(', ')

  const embedding = await generateEmbedding(queryText)
  if (!embedding) return { chunks: [], similarLakes: [] }

  // Fetch structure tags so the SQL function can blend in matching generic articles
  const structureTags = lakeId ? await getLakeStructureTags(lakeId) : null

  const { data: rows, error } = await supabase.rpc('match_technique_embeddings', {
    query_embedding: embedding,
    match_count: 12,  // slightly higher to allow room for generic blending
    ...(lakeId ? { filter_lake_id: lakeId } : {}),
    ...(structureTags?.length ? { structure_tags: structureTags } : {}),
  })

  if (error || !rows) return { chunks: [], similarLakes: [] }

  const chunks = (rows as any[]).map((c: any) => c.content)

  // Fallback: if this lake has thin first-hand coverage of its own, borrow
  // reports from the most structurally-similar fisheries (by structure_tags
  // overlap). Keeps thin/new lakes from returning near-empty intel.
  const lakeSpecific = lakeId
    ? (rows as any[]).filter((r: any) => !r.is_generic && r.body_of_water_id === lakeId).length
    : 0
  const similarLakes: string[] = []
  if (lakeId && lakeSpecific < 3) {
    const { data: sims } = await supabase.rpc('get_similar_lakes_by_structure', {
      target_lake_id: lakeId,
      limit_count: 3,
    })
    for (const sim of (sims as any[]) ?? []) {
      const { data: simRows } = await supabase.rpc('match_technique_embeddings', {
        query_embedding: embedding,
        match_count: 4,
        filter_lake_id: sim.lake_id,
      })
      if (simRows?.length) {
        chunks.push(...(simRows as any[]).map((r: any) => `[From similar fishery: ${sim.lake_name}] ${r.content}`))
        similarLakes.push(sim.lake_name)
      }
      if (similarLakes.length >= 2) break
    }
  }

  return { chunks, similarLakes }
}

function buildFilterString(filters: Record<string, string> = {}) {
  return Object.entries(filters)
    .filter(([, v]) => v && v !== 'all')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

async function trackUsage(req: NextRequest) {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const userSupabase = await createServerClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return
    await supabase.rpc('increment_user_reports', { uid: user.id })
  } catch {
    // Non-critical — never block the response
  }
}

// Derive the bass spawn stage from actual water temperature + state.
// This is the single most important context item for spring fishing advice.
function inferSpawnStage(waterTempF: number | null, state: string): string {
  if (waterTempF === null) return ''
  const t = waterTempF
  // The temp-based thresholds hold regardless of region or state — south FL, south TX
  // (Falcon, Amistad), and south LA naturally reach spawn temps 2–4 weeks before north TX/OK,
  // while NY/MI are 4–6 weeks behind. Water temp is the ground truth; ignore the calendar.
  if (t < 50) return `WINTER PATTERN — ${t}°F water. Bass are lethargic, holding tight to deep main-lake structure: channel swings, submerged points, humps. Slow, subtle presentations essential. Do NOT suggest pre-spawn, spawning, or shallow patterns.`
  if (t < 55) return `LATE WINTER / EARLY PRE-SPAWN — ${t}°F water. Bass beginning first movements toward secondary points and channel edges adjacent to spawning flats, but NOT staging yet. Feeding windows opening on warm afternoons. Slow presentations near transition structure.`
  if (t < 62) return `PRE-SPAWN — ${t}°F water. Bass are actively staging on points, secondary channel swings, bluff ends, and structure leading into spawning flats. They are feeding aggressively before the spawn — this is a prime feeding window. Bass are NOT on beds yet. Do NOT recommend bed fishing or spawning patterns. Recommend staging-area techniques.`
  if (t < 68) return `SPAWN TRANSITION — ${t}°F water. Bass are actively moving onto spawning flats and beds in protected shallow pockets, coves, and chunk rock banks. Sight fishing opportunities for bedding fish. Some fish still staging in transition zones. Males actively guarding; larger females may have already vacated beds and moved to post-spawn recovery areas.`
  if (t < 75) return `POST-SPAWN — ${t}°F water. Spawn is complete or wrapping up. Females have vacated beds and are recovering in nearby deeper cover — docks, laydowns, first break lines off spawning flats. Males still guarding fry shallow. Target recovering females near the first deep structure adjacent to spawning areas. Do NOT recommend spawning or pre-spawn patterns.`
  if (t < 83) return `EARLY SUMMER — ${t}°F water. Bass fully transitioned to summer patterns. Fish are following shad schools to main lake points, channel ledges, and offshore humps. Morning and evening topwater bite developing. Deeper presentations more productive midday.`
  return `SUMMER — ${t}°F water. Bass in full summer mode. Deep on offshore structure and channel ledges during midday. Pushed to shade and cover early and late. Bite concentrated in low-light windows. Target ledges, offshore humps, and deep points.`
}

export async function POST(req: NextRequest) {
  const { lake, state, season, sampleSize, topBaits, topPatterns, reports, weather, waterTempF, waterTempSource, filters, lakeId, _secondary } = await req.json()

  // "My Intel" — structured personal-history data for the report UI. Per-user,
  // so it's computed fresh regardless of the (shared) AI-summary cache state,
  // and included in every response path below.
  const myIntelUserId = _secondary ? null : await getUserIdFromRequest()
  const myIntel = myIntelUserId ? await getMyIntelData(myIntelUserId, lake, {
    waterTempF: waterTempF ?? null,
    season: season ?? null,
    clarity: filters?.waterClarity && filters.waterClarity !== 'all' ? filters.waterClarity : null,
  }) : null

  // Secondary / alternative recommendation — separate prompt, no cache
  if (_secondary) {
    const spawnStageAlt = inferSpawnStage(waterTempF ?? null, state)
    const waterAlt = waterTempF != null
      ? `${waterTempF}°F${waterTempSource === 'estimated' ? ' est.' : ''}`
      : 'unknown'
    const conditionSummary = weather
      ? `Air: ${weather.tempF}°F, Water: ${waterAlt}, ${weather.skyCondition}, ${weather.timeOfDay}, ${weather.season}${spawnStageAlt ? ' — ' + spawnStageAlt.split('—')[0].trim() : ''}`
      : season || 'current conditions'
    const altPrompt = `You are an expert bass fishing guide for ${lake}, ${state}.

Current conditions: ${conditionSummary}
Top baits from tournament data: ${topBaits?.slice(0, 6).map((b: any) => `${b.name} (${b.count}x)`).join(', ')}
Top patterns: ${topPatterns?.slice(0, 4).map((p: any) => p.pattern).join(', ')}

The angler already has a primary recommendation. Suggest a COMPLETELY DIFFERENT alternative approach — different bait category, different technique style, different part of the water column or structure. Do NOT repeat or restate the primary recommendation.

Format your response as:

**Alternative Technique:** [technique name — must differ from a jig/Texas rig/power approach if that was primary]

[One sentence on why this alternative suits the current conditions.]

**Key Adjustments:**
- [Specific adjustment 1]
- [Specific adjustment 2]
- [Specific adjustment 3]

**Color Call:** [One specific color recommendation and why for these conditions]

Be direct, specific, and confident. No filler.`

    const altRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system: 'You are an expert bass fishing guide. Always suggest a technique that is clearly different from a standard power fishing jig/Texas rig approach. Be specific and confident.',
        messages: [{ role: 'user', content: altPrompt }]
      })
    })
    const altData = await altRes.json() as any
    return NextResponse.json({ today: altData.content?.[0]?.text?.trim() || '', intel: '' })
  }

  // Build cache key. The TOURNAMENT INTEL section is condition-independent
  // (it summarizes the fishery's history), so it's keyed only on lake+filters
  // with a long TTL. Today's actionable plan is generated separately by
  // /api/milk-run, so this route no longer produces a "today" section.
  const filterStr = buildFilterString(filters)
  const lakePart = lake.toLowerCase().replace(/\s+/g, '-')
  const intelKey = `intel:${lakePart}:${filterStr}`

  const now = new Date().toISOString()

  // Check cache
  const { data: intelCache } = await supabase
    .from('summary_cache')
    .select('intel')
    .eq('cache_key', intelKey)
    .gt('expires_at', now)
    .maybeSingle()

  // Cached intel → return immediately (no usage charge). myIntel is per-user
  // so it's always computed fresh above.
  if (intelCache?.intel) {
    return NextResponse.json({ intel: intelCache.intel, myIntel, cached: true })
  }

  // Track usage — only on real AI calls (cache miss)
  trackUsage(req)

  // Personal Intel — the angler's own logged trips to this lake (if any).
  // Surfaces what's actually worked for THEM, woven alongside the broader
  // tournament intel rather than replacing it.
  const personalIntelSection = await getPersonalIntelSection(myIntelUserId, lake, {
    waterTempF: waterTempF ?? null,
    season: season ?? null,
    clarity: filters?.waterClarity && filters.waterClarity !== 'all' ? filters.waterClarity : null,
  })

  // Extract all colors from real data
  const colorsFromData: string[] = []
  reports?.forEach((r: any) => {
    r.bait_used?.forEach((b: any) => {
      if (b.color) colorsFromData.push(`${b.bait_name || b.bait_type}: ${b.color}`)
    })
  })

  // Build rich historical conditions context from actual tournament data
  const historicalConditions: string[] = []
  reports?.forEach((r: any) => {
    const conds = r.conditions || []
    conds.forEach((c: any) => {
      const parts: string[] = []
      if (c.date) parts.push(c.date)
      if (c.air_temp_f) parts.push(`${c.air_temp_f}°F air`)
      if (c.water_temp_f) parts.push(`${c.water_temp_f}°F water`)
      if (c.sky_cover) parts.push(c.sky_cover)
      if (c.wind_mph) parts.push(`${c.wind_mph}mph wind`)
      if (c.barometric_pressure) parts.push(`${c.barometric_pressure}mb ${c.pressure_trend || ''}`.trim())
      if (c.water_clarity) parts.push(`${c.water_clarity} water`)
      if (parts.length > 1 && r.pattern) {
        historicalConditions.push(`${r.pattern} caught in: ${parts.join(', ')}`)
      }
    })
  })

  const historicalConditionsContext = historicalConditions.length > 0
    ? `\nHISTORICAL FISHING CONDITIONS (actual weather when these fish were caught):\n${historicalConditions.slice(0, 10).join('\n')}\n`
    : ''

  const moonContext = weather?.moon ? `
Moon: ${weather.moon.emoji} ${weather.moon.phase} (${weather.moon.illumination}% illuminated)
Solunar activity: ${weather.moon.solunarLabel}
Major bite windows today: ${weather.moon.majorPeriods.join(', ')}
Minor bite windows: ${weather.moon.minorPeriods.join(', ')}
` : ''

  const spawnStage = inferSpawnStage(waterTempF ?? null, state)

  const waterTempLabel = waterTempF != null
    ? waterTempSource === 'estimated'
      ? `~${waterTempF}°F (estimated ±5°F — inferred from current air temp and ${new Date().toLocaleString('en-US', { month: 'long' })} seasonal norms for ${state}; no sensor data available for this lake)`
      : `${waterTempF}°F (measured)`
    : 'unavailable'

  const weatherContext = weather ? `
Current conditions at ${lake}:
- Air temperature: ${weather.tempF}°F (feels like ${weather.feelsLikeF}°F)
- Water temperature: ${waterTempLabel}
- Sky: ${weather.skyCondition} (${weather.cloudCoverPct}% cloud cover)
- Wind: ${weather.windMph} mph
- Precipitation: ${weather.precipitation > 0 ? weather.precipitation + 'mm' : 'none'}
- Time of day: ${weather.timeOfDay}
- Season: ${weather.season}
${spawnStage ? `- SPAWN STAGE: ${spawnStage}` : ''}
${moonContext}` : `Current season: ${season || 'unknown'}${spawnStage ? `\nSPAWN STAGE: ${spawnStage}` : ''}`

  const colorContext = colorsFromData.length > 0
    ? `Known winning colors from tournament data:\n${[...new Set(colorsFromData)].slice(0, 10).join('\n')}`
    : 'No specific color data available from tournament records — recommend colors based on conditions.'

  // Fetch tournament technique embeddings (RAG from actual tournament data),
  // with a structure-similarity fallback to comparable fisheries for thin lakes.
  const { chunks: techniqueChunks, similarLakes } = await getTechniqueRagChunks(lake, state, season, weather, filters, lakeId)
  const hasTechniqueRag = techniqueChunks.length > 0
  const similarNote = similarLakes.length > 0
    ? ` (includes comparable reports from structurally-similar fisheries: ${similarLakes.join(', ')})`
    : ''
  const techniqueRagContext = hasTechniqueRag
    ? `VERIFIED TOURNAMENT REPORTS (${techniqueChunks.length} relevant reports)${similarNote}:\n---\n${techniqueChunks.map((c, i) => `[Report ${i + 1}]\n${c}`).join('\n\n')}\n---`
    : ''

  // --- Filter-aware prompt sections ---
  const prefLines: string[] = []
  if (filters) {
    // baitType — check against topBaits and reports
    const filterBaitTypes = filters.baitType && filters.baitType !== 'all'
      ? filters.baitType.split(',').map((s: string) => s.trim())
      : []
    if (filterBaitTypes.length > 0) {
      const matchingBaits = (topBaits || []).filter((b: any) =>
        filterBaitTypes.some((bt: string) => b.name.toLowerCase().includes(bt.toLowerCase()))
      )
      if (matchingBaits.length > 0) {
        prefLines.push(`Bait type preference: ${filterBaitTypes.join(', ')} — SUPPORTED by tournament data (${matchingBaits.map((b: any) => `${b.name} ×${b.count}`).join(', ')}). PRIORITIZE these bait types in your recommendation.`)
      } else {
        prefLines.push(`Bait type preference: ${filterBaitTypes.join(', ')} — NOTE: No significant tournament data on this lake specifically for this bait category. Acknowledge this gap and suggest the closest proven alternative. Do NOT ignore this note.`)
      }
    }

    // fishDepth
    if (filters.fishDepth && filters.fishDepth !== 'all') {
      prefLines.push(`Depth preference: ${filters.fishDepth} — Angler wants to fish ${filters.fishDepth}. Adjust structure and technique suggestions accordingly.`)
    }

    // locationType
    const filterLocationTypes = filters.locationType && filters.locationType !== 'all'
      ? filters.locationType.split(',').map((s: string) => s.trim())
      : []
    if (filterLocationTypes.length > 0) {
      prefLines.push(`Location preference: ${filterLocationTypes.join(', ')} — Focus patterns and structure on ${filterLocationTypes.join('/')} areas.`)
    }

    // structure
    const filterStructureVals = filters.structure && filters.structure !== 'all'
      ? filters.structure.split(',').map((s: string) => s.trim())
      : []
    if (filterStructureVals.length > 0) {
      prefLines.push(`Structure preference: ${filterStructureVals.join(', ')} — Prioritize patterns that use ${filterStructureVals.join('/')} structure.`)
    }

    // style
    if (filters.style && filters.style !== 'all') {
      prefLines.push(`Fishing style: ${filters.style === 'power' ? 'POWER FISHING — Prioritize fast-moving, reaction baits and covering water.' : 'FINESSE FISHING — Prioritize slow, subtle presentations, lighter line, and finesse rigs.'}`)
    }
  }

  // Conditions filter context — find historically matching reports
  const condLines: string[] = []
  if (filters) {
    const scenarioConditions: string[] = []
    if (filters.season && filters.season !== 'all') scenarioConditions.push(`Season: ${filters.season}`)
    if (filters.timeOfDay && filters.timeOfDay !== 'all') scenarioConditions.push(`Time: ${filters.timeOfDay}`)
    if (filters.weatherConditions && filters.weatherConditions !== 'all') scenarioConditions.push(`Weather: ${filters.weatherConditions}`)
    if (filters.airTemp && filters.airTemp !== 'all') scenarioConditions.push(`Air temp: ${filters.airTemp}`)
    if (filters.wind && filters.wind !== 'all') scenarioConditions.push(`Wind: ${filters.wind}`)
    if (filters.waterTemp && filters.waterTemp !== 'all') scenarioConditions.push(`Water temp: ${filters.waterTemp}`)
    if (filters.waterClarity && filters.waterClarity !== 'all') scenarioConditions.push(`Water clarity: ${filters.waterClarity}`)

    if (scenarioConditions.length > 0) {
      const matchingReports = (reports || []).filter((r: any) => {
        let score = 0
        if (filters.season && filters.season !== 'all' && r.season === filters.season) score++
        if (filters.waterClarity && filters.waterClarity !== 'all' && r.conditions?.[0]?.water_clarity === filters.waterClarity) score++
        if (filters.waterTemp && filters.waterTemp !== 'all') {
          const wt = r.conditions?.[0]?.water_temp_f
          if (wt) {
            const bucket = wt < 50 ? 'cold' : wt < 60 ? 'cool' : wt < 70 ? 'warm' : 'hot'
            if (bucket === filters.waterTemp) score++
          }
        }
        return score >= 1
      })
      condLines.push(`PLANNED TRIP CONDITIONS: ${scenarioConditions.join(', ')}`)
      if (matchingReports.length > 0) {
        condLines.push(`Historical reports matching these conditions (${matchingReports.length} found): ${matchingReports.slice(0, 4).map((r: any) => `${r.pattern || 'pattern'}${r.season ? ' in ' + r.season : ''}`).join('; ')}`)
        condLines.push(`Use these condition-matched reports as primary reference for the recommendation. These are real tournament results caught in similar conditions.`)
      } else {
        condLines.push(`No exact condition matches found in tournament data. Extrapolate from known patterns on this fishery adjusted for the planned conditions.`)
      }
    }
  }

  const prefFilterSection = prefLines.length > 0
    ? `\nANGLER PREFERENCES — YOU MUST FOLLOW THESE:\n${prefLines.join('\n')}\n`
    : ''
  const condFilterSection = condLines.length > 0
    ? `\nSCENARIO CONDITIONS CONTEXT:\n${condLines.join('\n')}\n`
    : ''

  const intelInstruction = hasTechniqueRag
    ? `Use the VERIFIED TOURNAMENT REPORTS above as your PRIMARY source for the TOURNAMENT INTEL section. These are real tournament results from this fishery (and, where noted, from structurally-similar fisheries). Be specific — cite actual baits, techniques, structure, and depths from the reports. Do not add generic information not grounded in these sources.`
    : `Write based on the tournament data and your knowledge of this specific fishery. Be specific — name bait types, structure, depths, presentations. Write like a seasoned guide who knows this lake.`

  const prompt = `You are an expert bass fishing guide and tournament analyst with deep knowledge of ${lake}, ${state}.

IMPORTANT RULES — follow these in every response without exception:
- ARTIFICIAL LURES ONLY. Never recommend live bait, cut bait, dead bait, or natural bait of any kind. This app is for tournament and serious hobby bass anglers who fish artificial lures exclusively.
- BASS ONLY. This app targets largemouth, smallmouth, spotted, and Guadalupe bass. If you reference other species (crappie, white bass, striper, chain pickerel), only mention them in the context of habitat they share with bass — always clarify you're describing where bass can also be found ("bass relate to the same brush piles that hold crappie," not "target crappie").
- NO TROLLING. Never recommend trolling as a technique. Trolling is prohibited in competitive bass fishing. Where trolling might otherwise apply (e.g. covering open water), recommend cranking instead.
- SOURCE HIERARCHY: Weight sources by reliability — tournament results and pro articles are primary; YouTube transcripts are secondary; forum posts are supplemental background only. Never lead a recommendation with forum-only intel. If tournament or article data contradicts a forum claim, trust the tournament data.
- SEASONAL FRAMING: When the intel describes seasonal tendencies, be specific about spawn phases (pre-spawn staging, active spawn, post-spawn recovery, summer offshore) rather than generalizing "spring" or "summer" as a single pattern. Frame these as what has historically worked here in each phase.
- BAIT-SPECIFIC COLORS. When recommending colors for frogs (hollow body, swimming toads), use color names frogs actually come in: black, white, natural, olive/orange belly, green/brown, shad, bone — NOT soft plastic names like "Watermelon Red" or "Green Pumpkin." For hard baits (crankbaits, jerkbaits, bladed jigs), use manufacturer color names: sexy shad, chartreuse shad, ghost, chrome/blue back, bone, natural shad, fire tiger — NOT soft plastic colors. Soft plastic colors (Green Pumpkin, Watermelon Red, June Bug, Black/Blue, etc.) apply only to soft plastics.
NOTE: "Dice baits" or "fuzzy dice baits" are a newer tournament-winning bait category (2023–present) — compact cube/sphere-shaped soft plastics with rubber tentacles, fished on finesse setups. Examples: Strike King Tumbleweed, Yamamoto Fuzzy Nuki, Geecrack Cue Bomb. Treat them as a legitimate finesse technique when relevant.

${techniqueRagContext ? '\n' + techniqueRagContext + '\n' : ''}${personalIntelSection}
TOURNAMENT DATA SUMMARY (${sampleSize} reports):
- Top baits: ${topBaits.slice(0, 6).map((b: any) => `${b.name} (${b.count} reports)`).join(', ')}
- Top patterns: ${topPatterns.slice(0, 4).map((p: any) => `${p.pattern} (${p.count} reports)`).join(', ')}
- Techniques in use: ${reports.slice(0, 5).map((r: any) => `${r.pattern || 'various'} / ${r.presentation || 'various'}`).join('; ')}
${historicalConditionsContext}
${weatherContext}

${colorContext}
${prefFilterSection}${condFilterSection}
${intelInstruction}

Write a detailed fishing intelligence report as a single section:

**TOURNAMENT INTEL**
Write 5-6 sentences covering: the dominant historical patterns on this fishery, the top artificial lures and why they work here, key structure and depth ranges, and seasonal tendencies across the year (pre-spawn, spawn, post-spawn, summer, fall, winter). Be specific — name the lure types, the structure, the depths, the presentations. Where the intel draws on structurally-similar fisheries, weave that in naturally. Only reference largemouth, smallmouth, spotted, or Guadalupe bass.

Be direct and confident. Write like a knowledgeable local guide describing the fishery to a serious tournament angler, not a generic fishing article. Avoid filler phrases. Do NOT write a "today's recommendation" or current-conditions action plan — that is generated separately. Focus only on the fishery's historical intel.`

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
      system: 'You are an expert bass fishing guide. Respond with a single section labeled **TOURNAMENT INTEL** summarizing the fishery. Do not write a today\'s recommendation. Use newlines to separate ideas.',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json() as any
  const summary = data.content?.[0]?.text?.trim() || ''

  // Strip the section header if present; the body is the intel.
  const intelMatch = summary.match(/\*{0,2}TOURNAMENT INTEL\*{0,2}[:\s]*([\s\S]*)$/im)
  const intelText = (intelMatch ? intelMatch[1] : summary).trim()

  // Cache intel (condition-independent, 7-day TTL).
  if (intelText && intelText.length > 50) {
    await supabase.from('summary_cache').upsert({
      cache_key: intelKey,
      intel: intelText,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  return NextResponse.json({ intel: intelText, myIntel, cached: false })
}
