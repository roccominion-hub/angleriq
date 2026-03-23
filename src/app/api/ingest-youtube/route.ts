/**
 * POST /api/ingest-youtube
 *
 * Triggers YouTube ingestion for one or all lakes.
 * Body: {
 *   secret: string,
 *   lakeId?: string,       // specific lake, or omit for all lakes
 *   maxResults?: number,   // videos to consider per lake (default 15)
 *   minScore?: number,     // relevance threshold 0–100 (default 40)
 *   publishedAfter?: string, // e.g. "2022-01-01T00:00:00Z"
 *   dryRun?: boolean       // preview what would be ingested without processing
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ingestYouTubeForLake } from '@/lib/youtube-ingest'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INGEST_SECRET = process.env.INGEST_SECRET || 'angleriq-ingest-2026'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { secret, lakeId, maxResults = 15, minScore = 40, publishedAfter, dryRun = false } = body

  if (secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get target lakes
  let query = supabase.from('body_of_water').select('id, name, state')
  if (lakeId) query = query.eq('id', lakeId)
  const { data: lakes, error } = await query

  if (error || !lakes?.length) {
    return NextResponse.json({ error: error?.message || 'No lakes found' }, { status: 400 })
  }

  const allResults: Record<string, any[]> = {}

  for (const lake of lakes) {
    console.log(`[yt-ingest] Starting lake: ${lake.name}`)
    try {
      const results = await ingestYouTubeForLake({
        lakeId: lake.id,
        lakeName: lake.name,
        state: lake.state,
        maxResults,
        minScore,
        publishedAfter,
        dryRun,
      })
      allResults[lake.name] = results
    } catch (e: any) {
      allResults[lake.name] = [{ status: 'error', reason: e.message }]
    }
  }

  // Summary
  const summary = {
    lakes: Object.keys(allResults).length,
    totalIngested: Object.values(allResults).flat().filter(r => r.status === 'ingested').length,
    totalSkipped: Object.values(allResults).flat().filter(r => r.status === 'skipped').length,
    totalErrors: Object.values(allResults).flat().filter(r => r.status === 'error').length,
    alreadyExists: Object.values(allResults).flat().filter(r => r.status === 'already_exists').length,
    totalChunks: Object.values(allResults).flat().reduce((acc, r) => acc + (r.chunksCreated || 0), 0),
    dryRun,
  }

  return NextResponse.json({ summary, results: allResults })
}

// GET — check ingestion status / what's been ingested per lake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: sources } = await supabase
    .from('youtube_sources')
    .select('id, video_id, title, channel_title, body_of_water_id, transcript_status, chunk_count, view_count, published_at, body_of_water:body_of_water_id(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const byStatus = (sources || []).reduce((acc: Record<string, number>, s) => {
    acc[s.transcript_status] = (acc[s.transcript_status] || 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    total: sources?.length || 0,
    byStatus,
    sources: sources || [],
  })
}
