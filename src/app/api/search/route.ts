import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lake = searchParams.get('lake')
  const season = searchParams.get('season')
  const baitType = searchParams.get('bait_type')

  if (!lake) return NextResponse.json({ error: 'lake is required' }, { status: 400 })

  // Get body of water
  const { data: water } = await supabase
    .from('body_of_water')
    .select('id, name, state, type, species')
    .ilike('name', `%${lake}%`)
    .single()

  if (!water) return NextResponse.json({ error: 'Lake not found' }, { status: 404 })

  // Build technique report query
  let query = supabase
    .from('technique_report')
    .select(`
      id, pattern, presentation, structure, depth_range_ft, season, notes, reported_date, source_url, confidence,
      bait_used ( bait_type, bait_name, color, weight_oz, line_type, line_lb_test ),
      conditions ( water_temp_f, water_clarity, water_level ),
      tournament_result ( angler_name, place, total_weight, tournament ( name, organization, start_date ) )
    `)
    .eq('body_of_water_id', water.id)
    .order('reported_date', { ascending: false })

  if (season) query = query.eq('season', season)

  const { data: reports, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate bait frequency
  const baitFrequency: Record<string, number> = {}
  const patternFrequency: Record<string, number> = {}

  reports?.forEach(r => {
    r.bait_used?.forEach((b: any) => {
      const key = b.bait_name || b.bait_type
      if (key) baitFrequency[key] = (baitFrequency[key] || 0) + 1
    })
    if (r.pattern) {
      patternFrequency[r.pattern] = (patternFrequency[r.pattern] || 0) + 1
    }
  })

  const topBaits = Object.entries(baitFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const topPatterns = Object.entries(patternFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => ({ pattern, count }))

  return NextResponse.json({
    water,
    sampleSize: reports?.length || 0,
    topBaits,
    topPatterns,
    reports: reports?.slice(0, 20) || [],
  })
}
