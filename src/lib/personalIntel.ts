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
  trip_date: string
  fish_count: number | null
  big_fish_lbs: number | null
  rating: number | null
  techniques: string[] | null
  baits: string[] | null
  structure: string[] | null
  depth: string | null
  water_temp_f: number | null
  water_clarity: string | null
  pattern_notes: string | null
  notes: string | null
}

// Builds a "PERSONAL INTEL" prompt section from the angler's own logged trips
// to this specific lake — what's actually worked for THEM, not just the field
// at large. Returns '' if the angler has no account, or no logs for this lake.
export async function getPersonalIntelSection(userId: string | null | undefined, lakeName: string | null | undefined): Promise<string> {
  if (!userId || !lakeName) return ''

  try {
    const { data: logs, error } = await supabase
      .from('fishing_logs')
      .select('trip_date, fish_count, big_fish_lbs, rating, techniques, baits, structure, depth, water_temp_f, water_clarity, pattern_notes, notes')
      .eq('user_id', userId)
      .eq('lake_name', lakeName)
      .order('trip_date', { ascending: false })
      .limit(8)

    if (error || !logs || logs.length === 0) return ''

    const lines = (logs as PersonalLog[]).map(l => {
      const parts: string[] = [l.trip_date]
      if (l.fish_count != null) parts.push(`${l.fish_count} fish`)
      if (l.big_fish_lbs != null) parts.push(`${l.big_fish_lbs} lb kicker`)
      if (l.water_temp_f != null) parts.push(`${l.water_temp_f}°F water`)
      if (l.water_clarity) parts.push(`${l.water_clarity} water`)
      if (l.techniques?.length) parts.push(`techniques: ${l.techniques.join(', ')}`)
      if (l.baits?.length) parts.push(`baits: ${l.baits.join(', ')}`)
      if (l.structure?.length) parts.push(`structure: ${l.structure.join(', ')}`)
      if (l.depth) parts.push(`depth: ${l.depth}`)
      if (l.rating != null) parts.push(`self-rated ${l.rating}/5`)
      let line = `- ${parts.join(' · ')}`
      if (l.pattern_notes) line += `\n  "${l.pattern_notes}"`
      else if (l.notes) line += `\n  "${l.notes}"`
      return line
    })

    return `\nPERSONAL INTEL — THE ANGLER'S OWN LOGGED TRIPS TO ${lakeName.toUpperCase()} (most recent first, ${logs.length} of their trips on file):\n${lines.join('\n')}\n`
  } catch {
    return ''
  }
}
