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
  }

  const ragSection =
    ragChunks.length > 0
      ? `\nRELEVANT FISHING INTEL (use as primary source):\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n`
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
${ragSection}
RULES:
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

CURRENT REPORT CONTEXT:
${condParts.join('\n')}
${context.intel ? `\nTOURNAMENT INTEL FROM REPORT:\n${context.intel}\n` : ''}${context.today ? `\nTODAY'S RECOMMENDATION FROM REPORT:\n${context.today}\n` : ''}${ragSection}
RULES:
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
