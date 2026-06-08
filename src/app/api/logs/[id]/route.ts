import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const EDITABLE_FIELDS = [
  'lake_id', 'lake_name', 'lake_state', 'spot', 'lat', 'lng',
  'trip_date', 'time_of_day',
  'water_temp_f', 'air_temp_f', 'sky', 'wind', 'water_clarity', 'water_level',
  'techniques', 'baits', 'structure', 'depth', 'pattern_notes',
  'fish_count', 'big_fish_lbs', 'big_fish_entries', 'catches', 'total_weight_lbs', 'rating', 'notes', 'photos',
]

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, any> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) update[key] = body[key]
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('fishing_logs')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('fishing_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
