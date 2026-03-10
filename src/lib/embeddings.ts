// Embedding utility using Voyage AI voyage-3-lite
// Anthropic's recommended embedding partner
// Falls back gracefully if VOYAGE_API_KEY is not set

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    console.warn('VOYAGE_API_KEY not set — embeddings disabled')
    return null
  }

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: text.slice(0, 8000), // safety truncation
    }),
  })

  if (!res.ok) {
    console.error('Voyage embedding API error:', await res.text())
    return null
  }

  const data = await res.json() as any
  return data.data?.[0]?.embedding ?? null
}

export function buildRagQueryText(lake: string, state: string, season: string, filters: Record<string, string> = {}): string {
  const parts = [`Bass fishing on ${lake}, ${state}`]
  if (season && season !== 'unknown') parts.push(`in ${season}`)
  if (filters.pattern && filters.pattern !== 'all') parts.push(`${filters.pattern} pattern`)
  if (filters.bait_type && filters.bait_type !== 'all') parts.push(`using ${filters.bait_type}`)
  if (filters.structure && filters.structure !== 'all') parts.push(`on ${filters.structure}`)
  return parts.join(' ')
}
