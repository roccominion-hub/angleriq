import { createClient } from '@supabase/supabase-js'
import { generateEmbedding, buildRagQueryText } from './embeddings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface RagContext {
  chunks: string[]
  sourceCount: number
  usedSimilarLakes: string[]
  youtubeSources?: { videoId: string; title: string; channel: string }[]
}

export async function getLakeRagContext(
  lakeId: string,
  lake: string,
  state: string,
  season: string,
  filters: Record<string, string> = {}
): Promise<RagContext> {
  const empty: RagContext = { chunks: [], sourceCount: 0, usedSimilarLakes: [], youtubeSources: [] }

  // Generate query embedding
  const queryText = buildRagQueryText(lake, state, season, filters)
  const embedding = await generateEmbedding(queryText)
  if (!embedding) return empty

  // Try to find chunks for this lake
  const { data: chunks, error } = await supabase.rpc('match_lake_chunks', {
    query_embedding: embedding,
    target_lake_id: lakeId,
    match_count: 8,
    match_threshold: 0.45,
  })

  if (error) {
    console.error('RAG chunk query error:', error)
    return empty
  }

  // Pull YouTube chunks for this lake (technique_embeddings with source_type='youtube')
  const { data: ytChunks } = await supabase
    .from('technique_embeddings')
    .select('content, youtube_source_id, youtube_sources:youtube_source_id(video_id, title, channel_title)')
    .eq('body_of_water_id', lakeId)
    .eq('source_type', 'youtube')
    .limit(5)

  const youtubeSources: { videoId: string; title: string; channel: string }[] = []
  const youtubeChunks: string[] = []
  if (ytChunks?.length) {
    const seenSources = new Set<string>()
    for (const ytc of ytChunks) {
      youtubeChunks.push(ytc.content)
      const src = ytc.youtube_sources as any
      if (src?.video_id && !seenSources.has(src.video_id)) {
        seenSources.add(src.video_id)
        youtubeSources.push({ videoId: src.video_id, title: src.title, channel: src.channel_title })
      }
    }
  }

  // If we have enough content for this lake, return it
  if (chunks && chunks.length >= 3) {
    return {
      chunks: [...chunks.map((c: any) => c.chunk_text), ...youtubeChunks],
      sourceCount: chunks.length + youtubeChunks.length,
      usedSimilarLakes: [],
      youtubeSources,
    }
  }

  // Fallback: find similar lakes and pull their chunks
  const primaryChunks = chunks || []
  const { data: similarLakes } = await supabase.rpc('get_similar_lakes', {
    target_lake_id: lakeId,
    limit_count: 3,
  })

  if (!similarLakes || similarLakes.length === 0) {
    return {
      chunks: primaryChunks.map((c: any) => c.chunk_text),
      sourceCount: primaryChunks.length,
      usedSimilarLakes: [],
    }
  }

  const usedSimilarLakes: string[] = []
  const fallbackChunks: string[] = []

  for (const similar of similarLakes) {
    const { data: simChunks } = await supabase.rpc('match_lake_chunks', {
      query_embedding: embedding,
      target_lake_id: similar.lake_id,
      match_count: 4,
      match_threshold: 0.45,
    })

    if (simChunks && simChunks.length > 0) {
      fallbackChunks.push(...simChunks.map((c: any) => 
        `[From similar lake: ${similar.lake_name}] ${c.chunk_text}`
      ))
      usedSimilarLakes.push(similar.lake_name)
    }

    if (fallbackChunks.length >= 6) break
  }

  const allChunks = [
    ...primaryChunks.map((c: any) => c.chunk_text),
    ...fallbackChunks,
  ]

  return {
    chunks: [...allChunks, ...youtubeChunks],
    sourceCount: allChunks.length + youtubeChunks.length,
    usedSimilarLakes,
    youtubeSources,
  }
}

export function formatRagContextForPrompt(rag: RagContext, lake: string): string {
  if (rag.chunks.length === 0) return ''

  const hasYoutube = (rag.youtubeSources?.length || 0) > 0
  const header = rag.usedSimilarLakes.length > 0
    ? `CURATED FISHING INTELLIGENCE (from ${lake} and similar fisheries: ${rag.usedSimilarLakes.join(', ')}):`
    : `CURATED FISHING INTELLIGENCE FOR ${lake.toUpperCase()}:`

  const youtubeNote = hasYoutube
    ? `\n[Includes evidence from ${rag.youtubeSources!.length} YouTube source(s): ${rag.youtubeSources!.map(s => `"${s.title}" — ${s.channel}`).join('; ')}]`
    : ''

  return `${header}${youtubeNote}
${rag.chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

Use the above curated content as your PRIMARY source for the Intel section. YouTube video transcripts are from real anglers describing actual fishing experiences — treat them as first-hand reports. Only include information grounded in these sources.`
}
