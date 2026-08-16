import { createClient } from '@supabase/supabase-js'
import { groupLabel, phaseLabel, depthLabel, conditionLabel } from '@/lib/pattern-facets'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lake = searchParams.get('lake')
  const lakeId = searchParams.get('lakeId')
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

  // Get body of water. Prefer the explicit lakeId (lake names aren't unique across
  // states, e.g. Lake Murray in OK and SC); fall back to a name match otherwise.
  // maybeSingle() avoids a hard error when a bare name matches more than one row.
  const baseSelect = () => supabase
    .from('body_of_water')
    .select('id, name, state, type, species, lat, lng, usgs_site_no, wdft_slug')
  const { data: water } = lakeId
    ? await baseSelect().eq('id', lakeId).maybeSingle()
    : await baseSelect().ilike('name', `%${lake}%`).limit(1).maybeSingle()

  if (!water) return NextResponse.json({ error: 'Lake not found' }, { status: 404 })

  // Build technique report query
  let query = supabase
    .from('technique_report')
    .select(`
      id, pattern, presentation, structure, depth_range_ft, season, notes, reported_date, source_url, confidence,
      pattern_phase, pattern_technique, pattern_place, pattern_depth, pattern_condition,
      bait_used ( bait_type, bait_name, color, weight_oz, line_type, line_lb_test ),
      conditions ( water_temp_f, water_clarity, water_level ),
      tournament_result ( angler_name, place, total_weight, tournament ( name, organization, start_date ) )
    `)
    .eq('body_of_water_id', water.id)
    .order('confidence', { ascending: false })
    .order('reported_date', { ascending: false })

  if (season) query = query.eq('season', season)
  if (timeOfDay) query = query.eq('time_of_day', timeOfDay)
  if (fishDepth) query = query.eq('fish_depth', fishDepth)
  if (waterClarity) query = query.eq('conditions.water_clarity', waterClarity)
  // Most reports carry no date — curated knowledge and technique articles are
  // undated by nature, and a plain gte/lte drops NULLs, which hid 56% of the
  // corpus (entire lakes, e.g. Table Rock, returned nothing). Undated reports
  // are still valid technique data, so keep them and let the range narrow only
  // the rows that actually have a date.
  if (yearFrom || yearTo) {
    const bounds = [
      yearFrom ? `reported_date.gte.${yearFrom}-01-01` : null,
      yearTo ? `reported_date.lte.${yearTo}-12-31` : null,
    ].filter(Boolean).join(',')
    query = query.or(`reported_date.is.null,and(${bounds})`)
  }

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
  // Patterns are free text, so count them on a normalised key (case, spacing and
  // trailing punctuation) rather than an exact string — "Dock Flipping" and
  // "dock flipping" are the same pattern and should count together. The label
  // shown is the most common original spelling for that key.
  const patternCounts: Record<string, number> = {}
  const patternLabels: Record<string, Record<string, number>> = {}
  const patternKey = (p: string) =>
    p.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '')

  reportsForAgg.forEach((r: any) => {
    r.bait_used?.forEach((b: any) => {
      const key = b.bait_name || b.bait_type
      if (key) baitFrequency[key] = (baitFrequency[key] || 0) + 1
    })
    if (r.pattern) {
      const k = patternKey(r.pattern)
      if (!k) return
      patternCounts[k] = (patternCounts[k] || 0) + 1
      patternLabels[k] = patternLabels[k] || {}
      const label = r.pattern.trim().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '')
      patternLabels[k][label] = (patternLabels[k][label] || 0) + 1
    }
  })

  const patternFrequency: Record<string, number> = {}
  for (const [k, count] of Object.entries(patternCounts)) {
    const label = Object.entries(patternLabels[k]).sort((a, b) => b[1] - a[1])[0][0]
    patternFrequency[label] = count
  }

  // Winning Patterns, grouped by canonical facets rather than exact prose. The
  // free-text pattern rarely repeats verbatim (83% of entries were singletons),
  // so counting the label measured wording coincidence instead of how often a
  // pattern actually produced. Each group keeps its source descriptions so the
  // UI can expand a heading and show what the individual reports actually said.
  type Tally = Record<string, number>
  type Group = {
    label: string; count: number
    phases: Tally; depths: Tally; conditions: Tally
    descriptions: string[]
  }
  const bump = (t: Tally, v: string | null) => { if (v) t[v] = (t[v] || 0) + 1 }
  const dominant = (t: Tally) => Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const groupMap = new Map<string, Group>()
  for (const r of reportsForAgg as any[]) {
    const facets = {
      phase: r.pattern_phase ?? null, technique: r.pattern_technique ?? null,
      place: r.pattern_place ?? null, depth: r.pattern_depth ?? null,
      condition: r.pattern_condition ?? null,
    }
    const label = groupLabel(facets)
    if (!label) continue
    const g = groupMap.get(label) ?? {
      label, count: 0, phases: {}, depths: {}, conditions: {}, descriptions: [],
    }
    g.count++
    // Reports in a group can disagree (some prespawn, some postspawn), so the
    // chip shows the dominant value rather than whichever happened to be first.
    bump(g.phases, phaseLabel(facets.phase))
    bump(g.depths, depthLabel(facets.depth))
    bump(g.conditions, conditionLabel(facets.condition))
    if (r.pattern && !g.descriptions.includes(r.pattern)) g.descriptions.push(r.pattern)
    groupMap.set(label, g)
  }
  const patternGroups = [...groupMap.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map(g => ({
      label: g.label, count: g.count,
      phase: dominant(g.phases), depth: dominant(g.depths), condition: dominant(g.conditions),
      descriptions: g.descriptions,
    }))

  // Filter live/natural/dead bait — artificial lures only
  const LIVE_BAIT_BLOCKLIST = [
    'live', 'dead', 'cut', 'shad', 'minnow', 'worm', 'leech', 'crawfish', 'crayfish',
    'nightcrawler', 'night crawler', 'cricket', 'grasshopper', 'stinkbait', 'stink bait',
    'smelly', 'chicken liver', 'dough bait', 'power bait', 'powerbait', 'gulp alive',
    'natural bait', 'live bait', 'cut bait', 'blood bait', 'sucker', 'herring', 'sardine',
    'anchovy', 'shrimp', 'crab', 'eel', 'frog' // live frog (hollow body frogs are fine — handled by name match below)
  ]
  // Terms that indicate an ARTIFICIAL lure even if a blocklist word is present
  const ARTIFICIAL_EXCEPTIONS = [
    'zoom', 'strike king', 'berkley', 'yum', 'reaction', 'rapala', 'lucky craft',
    'ribbon tail', 'trick worm', 'senko', 'rage', 'brush hog', 'ned', 'chigger',
    'roboworm', 'fluke', 'swimbait', 'jig', 'crank', 'spinner', 'bladed',
    'hollow body', 'whopper', 'popper', 'buzzbait', 'topwater', 'spoon', 'blade bait',
    'keitech', 'zman', 'z-man', 'swimsenko', 'elaztech', 'paddle tail', 'boot tail'
  ]

  function isLiveBait(name: string): boolean {
    const lower = name.toLowerCase()
    // If it matches an artificial exception, keep it
    if (ARTIFICIAL_EXCEPTIONS.some(e => lower.includes(e))) return false
    // If it matches a live bait term, filter it
    return LIVE_BAIT_BLOCKLIST.some(term => lower.includes(term))
  }

  const topBaits = Object.entries(baitFrequency)
    .filter(([name]) => !isLiveBait(name))
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
    patternGroups,
    reports: reportsForAgg,
    coords: { lat: water.lat, lng: water.lng },
  })
}
