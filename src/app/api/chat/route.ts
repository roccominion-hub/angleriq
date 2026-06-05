import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/embeddings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface ChatContext {
  mode: 'homepage' | 'report'
  lakeId?: string
  lake?: string
  state?: string
  season?: string
  waterTempF?: number | null
  topBaits?: { name: string; count: number }[]
  topPatterns?: { pattern: string; count: number }[]
  intel?: string
  today?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const {
    message,
    history = [],
    context,
  }: { message: string; history: ChatMessage[]; context: ChatContext } = await req.json()

  if (!message?.trim()) {
    return new Response('message required', { status: 400 })
  }

  const supabase = getSupabase()

  // Current date — injected into every prompt so the model knows the time of year
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── RAG retrieval ────────────────────────────────────────────────────────
  const ragQueryText =
    context.mode === 'report' && context.lake
      ? `${message} bass fishing ${context.lake} ${context.state ?? ''}`
      : `${message} bass fishing Texas Oklahoma lakes`

  const embedding = await generateEmbedding(ragQueryText)
  let ragChunks: string[] = []
  let lureChunks: string[] = []

  if (embedding) {
    // Technique embeddings — lake-filtered in report mode
    const techParams: Record<string, unknown> = { query_embedding: embedding, match_count: 5 }
    if (context.mode === 'report' && context.lakeId) {
      techParams.filter_lake_id = context.lakeId
    }
    const { data: techChunks } = await supabase.rpc('match_technique_embeddings', techParams)
    ragChunks = (techChunks ?? []).map((c: any) => c.content as string)

    // In report mode: also pull curated lake-level chunks (articles / guides)
    if (context.mode === 'report' && context.lakeId) {
      const { data: lakeChunks } = await supabase.rpc('match_lake_chunks', {
        query_embedding: embedding,
        target_lake_id: context.lakeId,
        match_count: 3,
        match_threshold: 0.4,
      })
      if (lakeChunks?.length) {
        ragChunks = [...ragChunks, ...(lakeChunks as any[]).map((c) => c.chunk_text as string)]
      }
    }

    // If short on chunks, always broaden the search (covers nearby lake questions in report mode)
    if (ragChunks.length < 4) {
      const { data: broadChunks } = await supabase.rpc('match_technique_embeddings', {
        query_embedding: embedding,
        match_count: 5,
      })
      ragChunks = [...ragChunks, ...(broadChunks ?? []).map((c: any) => c.content as string)]
    }

    ragChunks = ragChunks.slice(0, 8)

    // ── Lure catalog RAG ─────────────────────────────────────────────────
    // Pull brand/product data when the message or report context references specific baits.
    // Always query with a lower threshold — lure descriptions should be factually exact.
    const lureQueryText = context.topBaits?.length
      ? `${message} ${context.topBaits.slice(0, 5).map(b => b.name).join(' ')}`
      : message

    // Use a fresh embedding scoped to the lure query if it differs meaningfully
    const lureEmbedding = lureQueryText !== ragQueryText
      ? (await generateEmbedding(lureQueryText)) ?? embedding
      : embedding

    const { data: lureData } = await supabase.rpc('match_lure_catalog', {
      query_embedding: lureEmbedding,
      match_count: 4,
      match_threshold: 0.35,
    })
    lureChunks = (lureData ?? []).map((c: any) => c.chunk_text as string)
  }

  const ragSection =
    ragChunks.length > 0
      ? `\nRELEVANT FISHING INTEL (use as primary source):\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n`
      : ''

  const lureSection =
    lureChunks.length > 0
      ? `\nLURE / BAIT CATALOG (authoritative product facts — use these when describing specific baits):\n${lureChunks.map((c, i) => `[L${i + 1}] ${c}`).join('\n\n')}\n`
      : ''

  // ── Spawn stage context ───────────────────────────────────────────────────
  // Mirrors inferSpawnStage() in summary/route.ts.
  // In report mode we have actual water temp — use it exactly.
  // In homepage mode we have the current date — use TX/OK monthly averages to
  // set hard boundaries so the model can't invent spawning activity in June.

  function inferSpawnStageFromTemp(tempF: number): string {
    if (tempF < 50)  return `WINTER PATTERN — ${tempF}°F water. Bass lethargic, holding tight to deep main-lake structure. Slow, subtle presentations essential. Do NOT suggest pre-spawn, spawning, or shallow patterns.`
    if (tempF < 55)  return `LATE WINTER / EARLY PRE-SPAWN — ${tempF}°F water. Bass beginning first movements toward secondary points adjacent to spawning flats, but NOT staging yet. Feeding windows opening on warm afternoons.`
    if (tempF < 62)  return `PRE-SPAWN — ${tempF}°F water. Bass actively staging on points, secondary channel swings, and structure leading to spawning flats. Feeding aggressively. Bass are NOT on beds yet. Do NOT recommend bed fishing or spawning patterns.`
    if (tempF < 68)  return `SPAWN TRANSITION — ${tempF}°F water. Bass moving onto spawning flats and beds. Sight fishing opportunities for bedding fish. Some fish still staging. Males guarding; larger females may have vacated beds.`
    if (tempF < 75)  return `POST-SPAWN — ${tempF}°F water. Spawn complete or wrapping up. Females recovering near first break lines off spawning flats. Males still guarding fry shallow. Do NOT recommend pre-spawn or spawning patterns.`
    if (tempF < 83)  return `EARLY SUMMER — ${tempF}°F water. Bass following shad to main lake points, channel ledges, offshore humps. Morning/evening topwater bite developing. Deeper presentations more productive midday.`
    return             `SUMMER — ${tempF}°F water. Full summer mode. Deep on offshore structure and ledges midday. Shade and cover early and late. Low-light windows most productive.`
  }

  // Month-based TX/OK spawn stage for homepage mode (no water temp available).
  // Uses typical regional averages; explicitly forbids fabricating spawn activity.
  function getHomepageSpawnContext(month: number /* 0-indexed */): string {
    // month 0=Jan … 11=Dec
    if (month <= 1)   return `SEASONAL CONTEXT (TX/OK, ${['January','February'][month]}): Typical water temps 45–54°F. WINTER PATTERN — bass deep and lethargic. Do NOT describe pre-spawn, spawning, or shallow activity. Slow finesse presentations near deep structure are the story.`
    if (month === 2)  return `SEASONAL CONTEXT (TX/OK, March): Typical water temps 54–65°F. PRE-SPAWN beginning in most lakes. Bass staging on secondary points and channel edges adjacent to spawning flats. South TX lakes (Falcon, Amistad) may be further along. Do NOT say bass are "on beds" in most TX/OK lakes in March.`
    if (month === 3)  return `SEASONAL CONTEXT (TX/OK, April): Typical water temps 63–72°F. SPAWN TRANSITION — bass actively moving onto flats and beds across most TX/OK lakes. Sight fishing applicable. Some post-spawn fish in south TX. Stage varies by specific lake and latitude.`
    if (month === 4)  return `SEASONAL CONTEXT (TX/OK, May): Typical water temps 69–78°F. POST-SPAWN / EARLY SUMMER transition. Most bass have completed spawning. Females recovering near first break lines. Males finishing fry guard duty. Do NOT describe bass as actively spawning or pre-spawn unless the angler confirms colder-than-normal water.`
    if (month <= 7)   return `SEASONAL CONTEXT (TX/OK, ${['June','July','August'][month-5]}): Typical water temps 75–88°F. SUMMER PATTERN — spawn is long over. Bass are on main lake ledges, offshore humps, and channel structure. Low-light topwater windows morning and evening. Finesse on deeper structure midday. NEVER describe June/July/August bass as pre-spawn or spawning in TX/OK. This is factually wrong.`
    if (month === 8)  return `SEASONAL CONTEXT (TX/OK, September): Typical water temps 74–82°F. LATE SUMMER / EARLY FALL — bass beginning fall transition as water cools. Shad schooling in creeks. Reaction baits effective in the morning; ledge patterns still productive midday.`
    if (month <= 10)  return `SEASONAL CONTEXT (TX/OK, ${['October','November'][month-9]}): Typical water temps 58–72°F. FALL PATTERN — bass following shad schools into creeks and secondary points. Reaction baits, topwater, and moving baits shine. No spawning activity.`
    return             `SEASONAL CONTEXT (TX/OK, December): Typical water temps 48–58°F. LATE FALL / EARLY WINTER — bass slowing and moving deeper. Slow presentations near channel drops and main lake structure. No spawning activity.`
  }

  const now = new Date()
  const spawnStageSection = context.mode === 'report' && context.waterTempF != null
    ? `\nSPAWN STAGE (from measured/estimated water temperature — treat as ground truth):\n${inferSpawnStageFromTemp(context.waterTempF)}\n`
    : context.mode === 'homepage'
    ? `\n${getHomepageSpawnContext(now.getMonth())}\n`
    : ''

  // ── Lake suggestion marker instruction ───────────────────────────────────
  // When the AI recommends a specific lake, it appends [LAKE:Name, State].
  // The client strips this from display and renders a "Run Report" button.
  const lakeMarkerInstruction = `
LAKE REPORT SUGGESTION: When you identify a specific lake as a strong recommendation for the angler to fish — whether answering a direct "where should I go" question or pivoting to a nearby lake — append exactly this marker on a new line at the very end of your response: [LAKE:Exact Lake Name, State Abbreviation] (e.g. [LAKE:Lake Fork, TX] or [LAKE:Lake Texoma, TX/OK]). Only include this marker when you are genuinely recommending a lake the angler should consider fishing. Do not include it for every lake you mention — only the one you'd most recommend.`

  // ── System prompts ────────────────────────────────────────────────────────
  let systemPrompt: string

  if (context.mode === 'homepage') {
    systemPrompt = `You are AnglerIQ, an expert bass fishing AI assistant with deep knowledge of Texas and Oklahoma lakes. Help anglers decide where to fish and what patterns to target for their next trip.

Today's date: ${currentDate}
${spawnStageSection}${ragSection}${lureSection}
RULES:
- SPAWN STAGE IS MANDATORY: The SEASONAL CONTEXT above defines the current bass lifecycle phase for TX/OK based on actual date and typical regional water temperatures. Treat it as ground truth. Never contradict it. Do not use calendar generalizations ("it's spring so bass are spawning") — use the stage defined above.
- LURE ACCURACY: When the LURE / BAIT CATALOG section contains data about a specific bait, use those facts exactly — diving depth, technique, colors, material, rigging. Never invent specs for a named lure; if you don't have catalog data for it, describe only what you know for certain.
- Artificial lures only. Never recommend live bait, cut bait, or natural bait of any kind.
- Bass species only (largemouth, smallmouth, spotted, Guadalupe).
- Be specific: name lakes, patterns, baits, structure, depths.
- Focus recommendations on TX and OK fisheries.
- Keep answers concise and direct (3-6 sentences unless the angler asks for more detail).
- If you lack data for a specific lake, say so and offer the best guidance you can.
- Never recommend trolling.
- Stay on topic: bass fishing, lake conditions, tackle, and related fishing subjects only.
${lakeMarkerInstruction}`
  } else {
    const condParts: string[] = []
    if (context.lake && context.state) condParts.push(`Primary lake: ${context.lake}, ${context.state}`)
    if (context.season)                condParts.push(`Season: ${context.season}`)
    if (context.waterTempF != null)    condParts.push(`Water temp: ${context.waterTempF}°F`)
    if (context.topBaits?.length)      condParts.push(`Top tournament baits: ${context.topBaits.slice(0, 5).map(b => b.name).join(', ')}`)
    if (context.topPatterns?.length)   condParts.push(`Top patterns: ${context.topPatterns.slice(0, 3).map(p => p.pattern).join(', ')}`)

    systemPrompt = `You are AnglerIQ, an expert bass fishing AI assistant. The angler is reviewing a fishing intelligence report and has follow-up questions.

Today's date: ${currentDate}
${spawnStageSection}
CURRENT REPORT CONTEXT:
${condParts.join('\n')}
${context.intel ? `\nTOURNAMENT INTEL FROM REPORT:\n${context.intel}\n` : ''}${context.today ? `\nTODAY'S RECOMMENDATION FROM REPORT:\n${context.today}\n` : ''}${ragSection}${lureSection}
RULES:
- SPAWN STAGE IS MANDATORY: The SPAWN STAGE above is derived from actual water temperature — treat it as ground truth. Never contradict it or soften it with qualifiers like "bass may be spawning."
- LURE ACCURACY: When the LURE / BAIT CATALOG section contains data about a specific bait, use those facts exactly — diving depth, technique, colors, material, rigging. Never invent specs for a named lure; if you don't have catalog data for it, describe only what you know for certain.
- Artificial lures only. Never recommend live bait.
- Bass species only (largemouth, smallmouth, spotted, Guadalupe).
- Answer primarily in the context of ${context.lake ?? 'this lake'} — be consistent with the report data above, do not contradict it.
- You MAY discuss nearby or similar lakes when it helps the angler understand regional patterns or consider an alternative fishery. Comparing techniques across similar fisheries is valuable context.
- Keep answers concise and actionable unless more detail is requested.
- Never recommend trolling.
- Stay on topic: bass fishing and related fishing subjects only.
${lakeMarkerInstruction}`
  }

  // ── Anthropic streaming call ──────────────────────────────────────────────
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      stream: true,
      system: systemPrompt,
      messages: [
        ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    }),
  })

  if (!anthropicRes.ok) {
    console.error('Anthropic chat error:', await anthropicRes.text())
    return new Response('AI service unavailable', { status: 502 })
  }

  // Pipe Anthropic SSE → plain-text stream (extract text_delta tokens only)
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      if (!anthropicRes.body) { controller.close(); return }

      const reader = anthropicRes.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? '' // hold back the incomplete final line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue
            try {
              const evt = JSON.parse(data)
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(evt.delta.text))
              }
            } catch { /* ignore malformed SSE lines */ }
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
