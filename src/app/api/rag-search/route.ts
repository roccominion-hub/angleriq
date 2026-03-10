import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: [text],
      input_type: 'query',
    }),
  })

  if (!res.ok) {
    console.error('Voyage embedding error:', await res.text())
    return null
  }

  const data = await res.json() as any
  return data.data?.[0]?.embedding ?? null
}

export async function POST(req: NextRequest) {
  try {
    const { queryText, matchCount = 10 } = await req.json()

    if (!queryText) {
      return NextResponse.json({ error: 'queryText required' }, { status: 400 })
    }

    const embedding = await generateQueryEmbedding(queryText)
    if (!embedding) {
      return NextResponse.json({ chunks: [], error: 'Embedding failed' })
    }

    const { data: chunks, error } = await supabase.rpc('match_technique_embeddings', {
      query_embedding: embedding,
      match_count: matchCount,
    })

    if (error) {
      console.error('RAG search error:', error)
      return NextResponse.json({ chunks: [], error: error.message })
    }

    return NextResponse.json({ chunks: chunks || [] })
  } catch (err) {
    console.error('rag-search error:', err)
    return NextResponse.json({ chunks: [], error: 'Internal error' }, { status: 500 })
  }
}
