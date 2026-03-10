// Embedding utility using OpenAI text-embedding-3-small
// Falls back gracefully if OPENAI_API_KEY is not set

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set — embeddings disabled')
    return null
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // safety truncation
    }),
  })

  if (!res.ok) {
    console.error('Embedding API error:', await res.text())
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
