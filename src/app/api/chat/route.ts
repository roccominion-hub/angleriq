import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/embeddings'
import { getUserIdFromRequest, getPersonalIntelSection, getPersonalIntelOverview } from '@/lib/personalIntel'

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
  const lureSeen = new Set<string>()  // shared dedup set across both lure passes

  // ── Lure catalog — Pass 1: keyword name/brand search ─────────────────────
  // Runs unconditionally — no Voyage call needed. Catches explicit bait names
  // ("Whopper Plopper", "JackHammer", "Senko") even when rate-limited.
  //
  // Searches the `name` and `brand` columns ONLY (not chunk_text).
  // Product names don't contain common English words, so there are no false
  // positives from words like "fish", "how", "the", "run" that appear in
  // every chunk_text description.
  const baitNames = context.topBaits?.slice(0, 5).map(b => b.name) ?? []

  // Extract meaningful words: 3+ chars, not common stop words
  const STOP_WORDS = new Set([
    // Common English
    'the','and','for','are','but','not','you','all','can','her','was','one','our',
    'out','were','they','this','that','with','have','from','had','his','him','has',
    'its','how','who','what','when','will','would','could','your','about','tell',
    'does','into','just','also','like','some','more','than','should','use','best',
    'get','got','put','make','good','work','want','need','give','using','fish',
    // Generic fishing words that appear as brand substrings (would cause false positives)
    'bait','lure','bass','fishing','lures',
  ])
  const messageWords = message
    .replace(/[^a-z0-9\s\-]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()))

  // Also include full topBait name phrases (split into words for the name search)
  const baitWords = baitNames.flatMap(n =>
    n.replace(/[^a-z0-9\s\-]/gi, ' ').split(/\s+/).filter(w => w.length >= 3)
  )

  const allSearchTerms = [...new Set([...messageWords, ...baitWords])]

  if (allSearchTerms.length > 0) {
    // Match against name OR brand columns — avoids false positives from chunk_text
    const orFilter = allSearchTerms.flatMap(term => [
      `name.ilike.%${term}%`,
      `brand.ilike.%${term}%`,
    ]).join(',')
    const { data: kwData } = await supabase
      .from('lure_catalog')
      .select('chunk_text, brand, name')
      .or(orFilter)
      .limit(6)
    for (const row of kwData ?? []) {
      if (!lureSeen.has(row.name)) {
        lureSeen.add(row.name)
        lureChunks.push(row.chunk_text as string)
      }
    }
  }

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

    // ── Lure catalog — Pass 2: semantic embedding search ──────────────────
    // Catches technique/category queries ("deep diving crankbait for ledges")
    // that don't name a specific bait. Deduped against Pass 1 keyword results.
    const lureQueryText = baitNames.length
      ? `${message} ${baitNames.join(' ')}`
      : message

    const lureEmbedding = lureQueryText !== ragQueryText
      ? (await generateEmbedding(lureQueryText)) ?? embedding
      : embedding

    const { data: lureData } = await supabase.rpc('match_lure_catalog', {
      query_embedding: lureEmbedding,
      match_count: 4,
      match_threshold: 0.30,
    })
    for (const row of lureData ?? []) {
      if (!lureSeen.has(row.name)) {
        lureSeen.add(row.name)
        lureChunks.push(row.chunk_text as string)
      }
    }
  }

  // Cap total lure chunks at 6 to keep prompt size reasonable
  lureChunks = lureChunks.slice(0, 6)

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
  // When the AI recommends lakes, it appends one [LAKE:Name, State] marker
  // per recommended lake. The client strips them and renders "Run Report" buttons.
  const lakeMarkerInstruction = `
LAKE REPORT MARKERS — MANDATORY: Every lake you recommend must have a [LAKE:Exact Lake Name, State Abbreviation] marker appended at the very end of your response, one per line. There is no limit. If you recommend 4 lakes, emit 4 markers. If you recommend 6, emit 6.

Format: [LAKE:Lake Fork, TX] or [LAKE:Lake Texoma, TX/OK] or [LAKE:Grand Lake, OK]

Rules:
- COUNT CAREFULLY: Before finishing your response, count how many lakes you recommended by name. Emit exactly that many markers — one for each, in the same order you mentioned them.
- Every named lake you suggest the angler consider fishing must have a marker. No exceptions.
- Do NOT emit markers for lakes you merely mentioned in passing or used as a contrast/comparison without recommending.
- If the angler asks you to "generate a report", "run a report", or "pull up the intel" for any lake you mentioned — including lakes from earlier in the conversation — emit the [LAKE:...] marker for that lake immediately. Do not say you cannot do it.`

  // Personal Intel — the angler's own logged trip history.
  // Report mode: trips to the specific lake under discussion (+ similar-conditions flags).
  // Homepage mode: an aggregate "where have I had success" overview across all logged trips.
  const personalUserId = await getUserIdFromRequest()
  const personalIntelSection = context.mode === 'report' && context.lake
    ? await getPersonalIntelSection(personalUserId, context.lake, { waterTempF: context.waterTempF, season: context.season })
    : context.mode === 'homepage'
    ? await getPersonalIntelOverview(personalUserId)
    : ''

  // ── System prompts ────────────────────────────────────────────────────────
  let systemPrompt: string

  if (context.mode === 'homepage') {
    systemPrompt = `You are AnglerIQ, an expert bass fishing AI assistant with deep knowledge of Texas and Oklahoma lakes. Help anglers decide where to fish and what patterns to target for their next trip.

Today's date: ${currentDate}
${spawnStageSection}${personalIntelSection}${ragSection}${lureSection}
RULES:
${personalIntelSection ? `- PERSONAL FISHING HISTORY — ONE SIGNAL AMONG MANY, NOT THE WHOLE ANSWER: The PERSONAL FISHING HISTORY section above is the angler's own logged trip data. When they ask DIRECTLY about their own track record — "where have I had the most success," "what's worked for me," "what's my history" — lead with specifics from this data: name the lakes, the numbers, the techniques that produced for THEM. But for general planning questions — "where should I go this weekend," "where's good for a big bass," "what lake should I fish" — answer the way you normally would, drawing on your full TX/OK fishery knowledge, current conditions, and tournament intel. The angler's logged lakes are NOT the only valid answers to a general question and must not crowd out a better recommendation elsewhere — recommend whatever fishery genuinely fits, whether or not they've logged it. You may add a logged lake as a supporting data point ("you've also done well at X in similar conditions") when it strengthens the answer, but do not narrow a general recommendation down to only the lakes in their log. Never fabricate history beyond what's listed there.\n- LOGGED ≠ ONLY DATA YOU HAVE: If the angler asks about a lake they haven't personally logged, you still have full TX/OK fishery knowledge for it — answer normally and confidently. Never say "I don't have data on that lake" just because it's absent from PERSONAL FISHING HISTORY; that section only reflects their personal log, not the limits of your knowledge.\n` : ''}- SPAWN STAGE IS MANDATORY: The SEASONAL CONTEXT above defines the current bass lifecycle phase for TX/OK based on actual date and typical regional water temperatures. Treat it as ground truth. Never contradict it. Do not use calendar generalizations ("it's spring so bass are spawning") — use the stage defined above.
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
${context.intel ? `\nTOURNAMENT INTEL FROM REPORT:\n${context.intel}\n` : ''}${context.today ? `\nTODAY'S RECOMMENDATION FROM REPORT:\n${context.today}\n` : ''}${personalIntelSection}${ragSection}${lureSection}
RULES:
${personalIntelSection ? `- PERSONAL INTEL — USE WHEN ASKED, BLEND OTHERWISE: The PERSONAL INTEL section above contains the angler's OWN logged trips — "THIS LAKE" covers ${context.lake} specifically (entries flagged [SIMILAR CONDITIONS TO TODAY] are the most relevant — lean on those first), and "OTHER LOGGED WATERS" covers their history on other lakes. When they ask DIRECTLY about their own history — "what's worked for me here," "what's my history on this lake (or similar lakes)" — lead with specifics (dates, baits, techniques, conditions) straight from this section. For general questions about today's plan or pattern, fold in a personal data point only where it naturally reinforces the broader report data (e.g. "and that lines up with what's worked for you here before") — don't let it override or crowd out the report's tournament intel and current-conditions analysis, which remain the primary basis for the day's recommendation. Never fabricate personal history beyond what's listed there.\n` : ''}- SPAWN STAGE IS MANDATORY: The SPAWN STAGE above is derived from actual water temperature — treat it as ground truth. Never contradict it or soften it with qualifiers like "bass may be spawning."
- LURE ACCURACY: When the LURE / BAIT CATALOG section contains data about a specific bait, use those facts exactly — diving depth, technique, colors, material, rigging. Never invent specs for a named lure; if you don't have catalog data for it, describe only what you know for certain.
- Artificial lures only. Never recommend live bait.
- Bass species only (largemouth, smallmouth, spotted, Guadalupe).
- Answer primarily in the context of ${context.lake ?? 'this lake'} — be consistent with the report data above, do not contradict it.
- You MAY discuss nearby or similar lakes when it helps the angler understand regional patterns or consider an alternative fishery. Comparing techniques across similar fisheries is valuable context.
- Keep answers concise and actionable unless more detail is requested.
- Never recommend trolling.
- Stay on topic: bass fishing and related fishing subjects only.
- TECHNIQUE EXPERTISE: You are an expert in ALL bass fishing techniques, not just what appears in the current lake report. When an angler asks about a specific technique (dock skipping, flipping, punching, drop shot, ned rig, shakey head, topwater walking, frog fishing, etc.) draw on your full expert knowledge even if it isn't mentioned in the tournament intel above. Technique questions should always get accurate, detailed answers.
- DOCK SKIPPING SPECIFICALLY: Dock skipping is a finesse/power technique using SOFT PLASTICS (Senko/stick bait, tube, craw, beaver, worm) skipped with a spinning or baitcaster setup far back under shaded boat docks — especially long docks over deeper water adjacent to creek channels, points, or main lake depth. It is NOT a jerkbait technique. Target docks with shade over water 4–10+ feet deep and quick access to deeper water. Summer and post-spawn dock skipping is proven on TX/OK fisheries when water temps are 75°F+.
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
