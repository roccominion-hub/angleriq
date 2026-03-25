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
  const timeOfDay = searchParams.get('timeOfDay')
  const fishDepth = searchParams.get('fishDepth')
  const waterClarity = searchParams.get('waterClarity')
  const yearFrom = searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : 2015
  const yearTo = searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!) : new Date().getFullYear()

  // Multi-value filters (comma-separated)
  const baitTypes = searchParams.get('baitType')?.split(',').map(s => s.trim()).filter(s => s && s !== 'all') || []
  const locationTypes = searchParams.get('locationType')?.split(',').map(s => s.trim()).filter(s => s && s !== 'all') || []
  const structureVals = searchParams.get('structure')?.split(',').map(s => s.trim()).filter(s => s && s !== 'all') || []

  if (!lake) return NextResponse.json({ error: 'lake is required' }, { status: 400 })

  // Get body of water
  const { data: water } = await supabase
    .from('body_of_water')
    .select('id, name, state, type, species, lat, lng')
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
  if (timeOfDay) query = query.eq('time_of_day', timeOfDay)
  if (fishDepth) query = query.eq('fish_depth', fishDepth)
  if (waterClarity) query = query.eq('conditions.water_clarity', waterClarity)
  if (yearFrom) query = query.gte('reported_date', `${yearFrom}-01-01`)
  if (yearTo) query = query.lte('reported_date', `${yearTo}-12-31`)

  // Multi-value location/structure filters
  if (locationTypes.length === 1) query = query.eq('location_type', locationTypes[0])
  else if (locationTypes.length > 1) query = query.in('location_type', locationTypes)

  if (structureVals.length === 1) query = query.ilike('structure', `%${structureVals[0]}%`)
  else if (structureVals.length > 1) {
    const orClause = structureVals.map(s => `structure.ilike.%${s}%`).join(',')
    query = query.or(orClause)
  }

  const { data: reports, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter reports by baitType if specified (post-query, related table)
  let filteredReports = reports || []
  if (baitTypes.length > 0) {
    filteredReports = filteredReports.filter((r: any) =>
      r.bait_used?.some((b: any) =>
        baitTypes.some(bt => b.bait_type?.toLowerCase().includes(bt) || b.bait_name?.toLowerCase().includes(bt))
      )
    )
  }
  // Fall back to all reports if filter yields 0
  const reportsForAgg = filteredReports.length > 0 ? filteredReports : (reports || [])

  // Aggregate bait frequency
  const baitFrequency: Record<string, number> = {}
  const patternFrequency: Record<string, number> = {}

  reportsForAgg.forEach((r: any) => {
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

  // Filter out non-technique entries (objectives, categories, etc.)
  const PATTERN_BLOCKLIST = [
    'trophy bass fishing', 'bass fishing', 'trophy bass', 'bass tournament',
    'tournament fishing', 'recreational fishing', 'fishing',
  ]
  const topPatterns = Object.entries(patternFrequency)
    .filter(([pattern]) => !PATTERN_BLOCKLIST.includes(pattern.toLowerCase().trim()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => ({ pattern, count }))

  return NextResponse.json({
    water,
    sampleSize: reportsForAgg.length,
    unfilteredCount: reports?.length || 0,
    topBaits,
    topPatterns,
    reports: reportsForAgg.slice(0, 20),
    coords: { lat: water.lat, lng: water.lng },
  })
}
