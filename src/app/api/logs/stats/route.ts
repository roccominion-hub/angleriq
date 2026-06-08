import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Aggregates the angler's trip logs into:
//  - lakes: one row per lake fished, with visit count + coordinates (for the map + badges)
//  - metrics: headline numbers for a stats summary (trips, fish, top bait/technique, etc.)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: logs, error } = await supabase
    .from('fishing_logs')
    .select('lake_id, lake_name, lake_state, lat, lng, trip_date, fish_count, big_fish_lbs, total_weight_lbs, rating, techniques, baits')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = logs || []

  // ── Lakes fished, with visit counts + a representative coordinate ──────────
  const lakeMap = new Map<string, { lake_id: string | null; lake_name: string; lake_state: string | null; lat: number | null; lng: number | null; visits: number; fish: number }>()
  for (const r of rows) {
    const key = r.lake_name
    const existing = lakeMap.get(key)
    if (existing) {
      existing.visits += 1
      existing.fish += r.fish_count || 0
      if (existing.lat == null && r.lat != null) { existing.lat = r.lat; existing.lng = r.lng }
    } else {
      lakeMap.set(key, {
        lake_id: r.lake_id,
        lake_name: r.lake_name,
        lake_state: r.lake_state,
        lat: r.lat,
        lng: r.lng,
        visits: 1,
        fish: r.fish_count || 0,
      })
    }
  }
  const lakes = Array.from(lakeMap.values()).sort((a, b) => b.visits - a.visits)

  // ── Headline metrics ───────────────────────────────────────────────────────
  const totalTrips = rows.length
  const totalFish = rows.reduce((sum, r) => sum + (r.fish_count || 0), 0)
  const ratedTrips = rows.filter(r => r.rating != null)
  const avgRating = ratedTrips.length ? ratedTrips.reduce((s, r) => s + (r.rating || 0), 0) / ratedTrips.length : null

  let biggestFish: { lbs: number; lake: string; date: string } | null = null
  for (const r of rows) {
    if (r.big_fish_lbs != null && (!biggestFish || r.big_fish_lbs > biggestFish.lbs)) {
      biggestFish = { lbs: r.big_fish_lbs, lake: r.lake_name, date: r.trip_date }
    }
  }

  function topCount(field: 'techniques' | 'baits'): { name: string; count: number }[] {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const arr: string[] = (r as any)[field] || []
      for (const item of arr) counts.set(item, (counts.get(item) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  const metrics = {
    totalTrips,
    totalFish,
    avgFishPerTrip: totalTrips ? Math.round((totalFish / totalTrips) * 10) / 10 : 0,
    uniqueLakes: lakes.length,
    avgRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
    biggestFish,
    topTechniques: topCount('techniques'),
    topBaits: topCount('baits'),
    favoriteLake: lakes[0] ? { name: lakes[0].lake_name, visits: lakes[0].visits } : null,
  }

  return NextResponse.json({ lakes, metrics })
}
