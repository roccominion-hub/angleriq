import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// List the angler's trip logs (most recent first), or create a new one.
// Designed for minimal-effort entry — only lake_name + trip_date are required;
// every other field (conditions, technique, results) is optional.

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lakeName = searchParams.get('lake')

  let query = supabase
    .from('fishing_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('trip_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (lakeName) query = query.eq('lake_name', lakeName)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body?.lake_name?.trim()) {
    return NextResponse.json({ error: 'lake_name is required' }, { status: 400 })
  }

  const row: Record<string, any> = { user_id: user.id, lake_name: body.lake_name.trim() }

  // Location
  if (body.lake_id) row.lake_id = body.lake_id
  if (body.lake_state) row.lake_state = body.lake_state
  if (body.spot) row.spot = body.spot
  if (body.lat != null) row.lat = body.lat
  if (body.lng != null) row.lng = body.lng

  // When
  if (body.trip_date) row.trip_date = body.trip_date
  if (body.time_of_day) row.time_of_day = body.time_of_day

  // Environment / Conditions
  if (body.water_temp_f != null) row.water_temp_f = body.water_temp_f
  if (body.air_temp_f != null) row.air_temp_f = body.air_temp_f
  if (body.sky) row.sky = body.sky
  if (body.wind) row.wind = body.wind
  if (body.water_clarity) row.water_clarity = body.water_clarity
  if (body.water_level) row.water_level = body.water_level

  // Technique / Pattern
  if (Array.isArray(body.techniques)) row.techniques = body.techniques
  if (Array.isArray(body.baits)) row.baits = body.baits
  if (Array.isArray(body.structure)) row.structure = body.structure
  if (body.depth) row.depth = body.depth
  if (body.pattern_notes) row.pattern_notes = body.pattern_notes

  // Results
  if (body.fish_count != null) row.fish_count = body.fish_count
  if (body.big_fish_lbs != null) row.big_fish_lbs = body.big_fish_lbs
  if (body.total_weight_lbs != null) row.total_weight_lbs = body.total_weight_lbs
  if (body.rating != null) row.rating = body.rating
  if (body.notes) row.notes = body.notes
  if (Array.isArray(body.photos)) row.photos = body.photos

  const { data, error } = await supabase
    .from('fishing_logs')
    .insert(row)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
