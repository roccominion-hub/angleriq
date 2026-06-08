import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Resolves the signed-in user from the request's auth cookies (server component
// client). Returns null for anonymous visitors — Personal Intel is opt-in by
// virtue of having a logged-in account with trip history.
export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const userSupabase = await createServerClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

interface PersonalLog {
  lake_name?: string
  trip_date: string
  fish_count: number | null
  big_fish_lbs: number | null
  rating: number | null
  techniques: string[] | null
  baits: string[] | null
  structure: string[] | null
  depth: string[] | null
  water_temp_f: number | null
  water_clarity: string | null
  pattern_notes: string | null
  notes: string | null
}

export interface CurrentConditions {
  waterTempF?: number | null
  season?: string | null
  clarity?: string | null
}

const LOG_FIELDS = 'lake_name, trip_date, fish_count, big_fish_lbs, rating, techniques, baits, structure, depth, water_temp_f, water_clarity, pattern_notes, notes'

// A log is "similar conditions" to today if water temp is close (±8°F) or
// water clarity matches — the two angler-loggable signals most predictive
// of pattern transferability.
function isSimilar(log: PersonalLog, current?: CurrentConditions): boolean {
  if (!current) return false
  if (current.waterTempF != null && log.water_temp_f != null && Math.abs(current.waterTempF - log.water_temp_f) <= 8) return true
  if (current.clarity && log.water_clarity && current.clarity.toLowerCase() === log.water_clarity.toLowerCase()) return true
  return false
}

function formatLogLine(l: PersonalLog, opts: { withLake?: boolean; flagSimilar?: boolean; current?: CurrentConditions } = {}): string {
  const parts: string[] = [l.trip_date]
  if (opts.withLake && l.lake_name) parts.push(l.lake_name)
  if (l.fish_count != null) parts.push(`${l.fish_count} fish`)
  if (l.big_fish_lbs != null) parts.push(`${l.big_fish_lbs} lb kicker`)
  if (l.water_temp_f != null) parts.push(`${l.water_temp_f}°F water`)
  if (l.water_clarity) parts.push(`${l.water_clarity} water`)
  if (l.techniques?.length) parts.push(`techniques: ${l.techniques.join(', ')}`)
  if (l.baits?.length) parts.push(`baits: ${l.baits.join(', ')}`)
  if (l.structure?.length) parts.push(`structure: ${l.structure.join(', ')}`)
  if (l.depth?.length) parts.push(`depth: ${l.depth.join(', ')}`)
  if (l.rating != null) parts.push(`self-rated ${l.rating}/5`)
  const tag = opts.flagSimilar && isSimilar(l, opts.current) ? ' [SIMILAR CONDITIONS TO TODAY]' : ''
  let line = `- ${parts.join(' · ')}${tag}`
  if (l.pattern_notes) line += `\n  "${l.pattern_notes}"`
  else if (l.notes) line += `\n  "${l.notes}"`
  return line
}

// Builds a "PERSONAL INTEL" prompt section from the angler's own logged trips
// to this specific lake — what's actually worked for THEM, not just the field
// at large. When `current` conditions are supplied, flags entries logged in
// similar conditions so the model can prioritize them. Also appends a brief
// note about other lakes the angler has logged, for "similar lakes" questions.
// Returns '' if the angler has no account, or no logs anywhere relevant.
export async function getPersonalIntelSection(
  userId: string | null | undefined,
  lakeName: string | null | undefined,
  current?: CurrentConditions,
): Promise<string> {
  if (!userId || !lakeName) return ''

  try {
    const { data: allLogs, error } = await supabase
      .from('fishing_logs')
      .select(LOG_FIELDS)
      .eq('user_id', userId)
      .order('trip_date', { ascending: false })
      .limit(60)

    if (error || !allLogs || allLogs.length === 0) return ''

    const logs = allLogs as PersonalLog[]
    const thisLake = logs.filter(l => l.lake_name === lakeName).slice(0, 8)
    const otherLakes = logs.filter(l => l.lake_name !== lakeName)

    if (thisLake.length === 0 && otherLakes.length === 0) return ''

    const sections: string[] = []

    if (thisLake.length > 0) {
      const similarCount = thisLake.filter(l => isSimilar(l, current)).length
      sections.push(
        `THIS LAKE — ${lakeName.toUpperCase()} (most recent first, ${thisLake.length} of the angler's trips on file` +
        `${current && similarCount > 0 ? `; ${similarCount} flagged as SIMILAR CONDITIONS TO TODAY` : ''}):\n` +
        thisLake.map(l => formatLogLine(l, { flagSimilar: true, current })).join('\n')
      )
    }

    if (otherLakes.length > 0) {
      // Group by lake for a compact "other waters" summary
      const byLake = new Map<string, PersonalLog[]>()
      for (const l of otherLakes) {
        const key = l.lake_name || 'Unknown water'
        if (!byLake.has(key)) byLake.set(key, [])
        byLake.get(key)!.push(l)
      }
      const summaryLines = Array.from(byLake.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([name, ls]) => {
          const fish = ls.reduce((s, l) => s + (l.fish_count || 0), 0)
          const techs = Array.from(new Set(ls.flatMap(l => l.techniques || []))).slice(0, 3)
          return `- ${name}: ${ls.length} trip${ls.length === 1 ? '' : 's'}, ${fish} fish caught${techs.length ? `, techniques used: ${techs.join(', ')}` : ''}`
        })
      sections.push(`OTHER LOGGED WATERS (for "similar lakes" comparisons):\n${summaryLines.join('\n')}`)
    }

    return `\nPERSONAL INTEL — THE ANGLER'S OWN LOGGED FISHING HISTORY:\n${sections.join('\n\n')}\n`
  } catch {
    return ''
  }
}

// Aggregate "where have I had the most success" overview across every logged
// trip — used in homepage chat where there's no specific lake in context.
export async function getPersonalIntelOverview(userId: string | null | undefined): Promise<string> {
  if (!userId) return ''

  try {
    const { data: allLogs, error } = await supabase
      .from('fishing_logs')
      .select(LOG_FIELDS)
      .eq('user_id', userId)
      .order('trip_date', { ascending: false })
      .limit(150)

    if (error || !allLogs || allLogs.length === 0) return ''

    const logs = allLogs as PersonalLog[]
    const byLake = new Map<string, { trips: number; fish: number; bigFish: number; ratings: number[] }>()
    for (const l of logs) {
      const key = l.lake_name || 'Unknown water'
      const cur = byLake.get(key) || { trips: 0, fish: 0, bigFish: 0, ratings: [] }
      cur.trips += 1
      cur.fish += l.fish_count || 0
      if (l.big_fish_lbs != null) cur.bigFish = Math.max(cur.bigFish, l.big_fish_lbs)
      if (l.rating != null) cur.ratings.push(l.rating)
      byLake.set(key, cur)
    }

    // Rank by total fish caught (the clearest "success" signal), tie-break on trips
    const ranked = Array.from(byLake.entries()).sort((a, b) => (b[1].fish - a[1].fish) || (b[1].trips - a[1].trips))
    const lakeLines = ranked.slice(0, 6).map(([name, s]) => {
      const avgRating = s.ratings.length ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1) : null
      return `- ${name}: ${s.trips} trip${s.trips === 1 ? '' : 's'}, ${s.fish} fish caught${s.bigFish ? `, biggest ${s.bigFish} lbs` : ''}${avgRating ? `, avg rating ${avgRating}/5` : ''}`
    })

    const allTechniques = new Map<string, number>()
    const allBaits = new Map<string, number>()
    for (const l of logs) {
      for (const t of l.techniques || []) allTechniques.set(t, (allTechniques.get(t) || 0) + 1)
      for (const b of l.baits || []) allBaits.set(b, (allBaits.get(b) || 0) + 1)
    }
    const topTech = Array.from(allTechniques.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n} (${c}x)`)
    const topBait = Array.from(allBaits.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n} (${c}x)`)

    const totalFish = logs.reduce((s, l) => s + (l.fish_count || 0), 0)

    return `\nPERSONAL FISHING HISTORY — THE ANGLER'S LOGGED TRIPS (${logs.length} trips, ${totalFish} fish caught total):
LAKES RANKED BY THEIR PERSONAL SUCCESS (most fish caught first):
${lakeLines.join('\n')}
${topTech.length ? `Their most-used techniques overall: ${topTech.join(', ')}` : ''}
${topBait.length ? `Their most-used baits overall: ${topBait.join(', ')}` : ''}
`
  } catch {
    return ''
  }
}

// ── "My Intel" — structured personal-history data for report UI ────────────
// Unlike the prompt-string builders above, this returns structured data the
// report page renders directly (a "My Intel" card between Tournament Intel
// and the Recommended Plan). It's per-user, so it's never cached — computed
// fresh on every report load alongside the (cacheable) AI summary.

export interface MyIntelTrip {
  trip_date: string
  fish_count: number | null
  big_fish_lbs: number | null
  rating: number | null
  techniques: string[]
  baits: string[]
  structure: string[]
  depth: string[] | null
  water_temp_f: number | null
  water_clarity: string | null
  pattern_notes: string | null
  notes: string | null
  similar: boolean
}

export interface MyIntelData {
  tripCount: number
  similarCount: number
  totalFish: number
  bestTrip: MyIntelTrip | null
  topTechniques: string[]
  topBaits: string[]
  trips: MyIntelTrip[]
}

export async function getMyIntelData(
  userId: string | null | undefined,
  lakeName: string | null | undefined,
  current?: CurrentConditions,
): Promise<MyIntelData | null> {
  if (!userId || !lakeName) return null

  try {
    const { data: logs, error } = await supabase
      .from('fishing_logs')
      .select(LOG_FIELDS)
      .eq('user_id', userId)
      .eq('lake_name', lakeName)
      .order('trip_date', { ascending: false })
      .limit(20)

    if (error || !logs || logs.length === 0) return null

    const trips: MyIntelTrip[] = (logs as PersonalLog[]).map(l => ({
      trip_date: l.trip_date,
      fish_count: l.fish_count,
      big_fish_lbs: l.big_fish_lbs,
      rating: l.rating,
      techniques: l.techniques || [],
      baits: l.baits || [],
      structure: l.structure || [],
      depth: l.depth,
      water_temp_f: l.water_temp_f,
      water_clarity: l.water_clarity,
      pattern_notes: l.pattern_notes,
      notes: l.notes,
      similar: isSimilar(l, current),
    }))

    const similarCount = trips.filter(t => t.similar).length
    const totalFish = trips.reduce((s, t) => s + (t.fish_count || 0), 0)

    let bestTrip: MyIntelTrip | null = null
    for (const t of trips) {
      if (t.fish_count != null && (!bestTrip || (bestTrip.fish_count ?? -1) < t.fish_count)) bestTrip = t
    }

    const techCounts = new Map<string, number>()
    const baitCounts = new Map<string, number>()
    for (const t of trips) {
      for (const x of t.techniques) techCounts.set(x, (techCounts.get(x) || 0) + 1)
      for (const x of t.baits) baitCounts.set(x, (baitCounts.get(x) || 0) + 1)
    }
    const topTechniques = Array.from(techCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)
    const topBaits = Array.from(baitCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)

    // Surface similar-condition trips first, then the rest, capped for display
    const ordered = [...trips].sort((a, b) => (Number(b.similar) - Number(a.similar)))
    return { tripCount: trips.length, similarCount, totalFish, bestTrip, topTechniques, topBaits, trips: ordered.slice(0, 5) }
  } catch {
    return null
  }
}
