/**
 * GET /api/lake-conditions?lakeId=xxx
 * Returns real-time water level, inflows, wind, water temp for a lake
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLakeConditions } from '@/lib/lake-conditions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lakeId = searchParams.get('lakeId')
  if (!lakeId) return NextResponse.json({ error: 'lakeId required' }, { status: 400 })

  const { data: lake, error } = await supabase
    .from('body_of_water')
    .select('id, name, lat, lng, usgs_site_no, wdft_slug')
    .eq('id', lakeId)
    .single()

  if (error || !lake) return NextResponse.json({ error: 'Lake not found' }, { status: 404 })

  const conditions = await getLakeConditions(lake.wdft_slug, lake.lat, lake.lng)

  return NextResponse.json({
    lake: { id: lake.id, name: lake.name, lat: lake.lat, lng: lake.lng },
    conditions,
  })
}
