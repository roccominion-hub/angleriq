import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * A stored NHD outline, for the lakes where OSM's is short or missing.
 *
 * Most lakes have no row here and the map keeps drawing OSM, which is accurate
 * on the large majority. Returning 200 with `rings: null` rather than a 404
 * keeps that the ordinary case rather than an error the client has to handle.
 */
export async function GET(req: NextRequest) {
  const lakeId = new URL(req.url).searchParams.get('lakeId')
  if (!lakeId) return NextResponse.json({ error: 'lakeId required' }, { status: 400 })

  const { data } = await supabase
    .from('lake_outlines')
    .select('rings, area_km2, vertex_count, source')
    .eq('lake_id', lakeId)
    .maybeSingle()

  return NextResponse.json(data ?? { rings: null })
}
