import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Precomputed in-lake channel geometry + inlets (see compute-lake-channels.ts).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lakeId = searchParams.get('lakeId')
  if (!lakeId) return NextResponse.json({ error: 'lakeId required' }, { status: 400 })

  const { data } = await supabase
    .from('lake_channels')
    .select('main_channel, minor_channels, junctions')
    .eq('lake_id', lakeId)
    .maybeSingle()

  return NextResponse.json(data ?? { main_channel: [], minor_channels: [], junctions: [] })
}
