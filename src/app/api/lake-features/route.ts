/**
 * GET /api/lake-features?lakeId=xxx
 * Returns NHD GeoJSON (flowlines, waterbodies) for map overlay
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLakeFeatures } from '@/lib/lake-conditions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lakeId = searchParams.get('lakeId')
  if (!lakeId) return NextResponse.json({ error: 'lakeId required' }, { status: 400 })

  const { data: lake } = await supabase
    .from('body_of_water')
    .select('lat, lng, name, state')
    .eq('id', lakeId)
    .single()

  if (!lake) return NextResponse.json({ error: 'Lake not found' }, { status: 404 })

  const features = await getLakeFeatures(lake.lat, lake.lng, lake.name, lake.state)
  return NextResponse.json(features)
}
