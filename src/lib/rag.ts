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
}

export async function getLakeRagContext(
  lakeId: string,
  lake: string,
  state: string,
  season: string,
  filters: Record<string, string> = {}
): Promise<RagContext> {
  const empty: RagContext = { chunks: [], sourceCount: 0, usedSimilarLakes: [] }

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

  // If we have enough content for this lake, return it
  if (chunks && chunks.length >= 3) {
    return {
      chunks: chunks.map((c: any) => c.chunk_text),
      sourceCount: chunks.length,
      usedSimilarLakes: [],
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
    chunks: allChunks,
    sourceCount: allChunks.length,
    usedSimilarLakes,
  }
}

export function formatRagContextForPrompt(rag: RagContext, lake: string): string {
  if (rag.chunks.length === 0) return ''

  const header = rag.usedSimilarLakes.length > 0
    ? `CURATED FISHING INTELLIGENCE (from ${lake} and similar fisheries: ${rag.usedSimilarLakes.join(', ')}):`
    : `CURATED FISHING INTELLIGENCE FOR ${lake.toUpperCase()}:`

  return `${header}
${rag.chunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}

Use the above curated content as your PRIMARY source for the Intel section. Only include information that is supported by or consistent with this content. Do not add generic fishing advice not grounded in these sources.`
}
