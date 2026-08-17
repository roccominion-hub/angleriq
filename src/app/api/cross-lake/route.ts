import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groupLabel, phaseLabel, depthLabel } from '@/lib/pattern-facets'
import {
  MIN_SIMILARITY, PHASES_IN_SEASON, SCOPES, type ScopeName,
  firstState, milesBetween, regionOf, seasonFromDate, similarity, type LakeSignature,
} from '@/lib/lake-similarity'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Patterns from comparable waters.
 *
 * Lakes are matched on physical character — channel length, dendritic ratio,
 * inlet count, impoundment type — rather than on their own reports, so this
 * still works (and matters most) on a lake with no reports of its own.
 *
 * Results are returned at widening scopes because a thin local sample is not a
 * reason to show nothing: many lakes have no comparable water inside 50 miles.
 * Conditions qualify rather than filter — every relevant pattern is returned
 * with its in-season share, so an angler sees what should work now *and* what
 * else has produced on water like this.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lakeId = searchParams.get('lakeId')
  const season = (searchParams.get('season') || seasonFromDate()).toLowerCase()
  // Callers can select any combination of phases; the current season's phases
  // are the default so the report opens on "what should work now" without
  // hiding what else has produced.
  const requested = (searchParams.get('phases') || '')
    .split(',').map(p => p.trim()).filter(Boolean)
  if (!lakeId) return NextResponse.json({ error: 'lakeId required' }, { status: 400 })

  const { data: lakes } = await supabase
    .from('body_of_water')
    .select('id, name, state, type, lat, lng, channel_km, dendritic_ratio, inlet_count')
  if (!lakes?.length) return NextResponse.json({ error: 'no lakes' }, { status: 500 })

  const me = lakes.find((l: any) => l.id === lakeId)
  if (!me) return NextResponse.json({ error: 'Lake not found' }, { status: 404 })

  const sigOf = (l: any): LakeSignature => ({
    channelKm: l.channel_km, dendriticRatio: l.dendritic_ratio,
    inletCount: l.inlet_count, type: l.type,
  })
  const mySig = sigOf(me)
  if (mySig.channelKm == null) {
    return NextResponse.json({ lake: me.name, scopes: [], reason: 'no physical signature for this lake' })
  }

  const myRegion = regionOf(me.state)
  const peers = lakes
    .filter((l: any) => l.id !== me.id && l.channel_km != null)
    .map((l: any) => ({
      l,
      sim: similarity(mySig, sigOf(l)),
      miles: (me.lat != null && l.lat != null) ? milesBetween(me.lat, me.lng, l.lat, l.lng) : Infinity,
    }))
    .filter(p => p.sim >= MIN_SIMILARITY)

  if (!peers.length) return NextResponse.json({ lake: me.name, scopes: [] })

  // One query for every candidate's facets, rather than per scope.
  const ids = peers.map(p => p.l.id)
  const reports: any[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from('technique_report')
      .select('body_of_water_id, pattern, pattern_phase, pattern_technique, pattern_place, pattern_depth, pattern_scoping')
      .in('body_of_water_id', ids.slice(i, i + 100))
    reports.push(...(data ?? []))
  }
  const byLake = new Map<string, any[]>()
  for (const r of reports) {
    const list = byLake.get(r.body_of_water_id) ?? []
    list.push(r); byLake.set(r.body_of_water_id, list)
  }

  const live = requested.length ? requested : (PHASES_IN_SEASON[season] ?? [])

  const inScope = (p: typeof peers[number], scope: ScopeName) => {
    if (scope === 'local')  return p.miles <= 50
    if (scope === 'nearby') return p.miles <= 150
    if (scope === 'state')  return firstState(p.l.state) === firstState(me.state)
    if (scope === 'region') return regionOf(p.l.state) === myRegion
    return true
  }

  const scopes = SCOPES.map(scope => {
    const members = peers
      .filter(p => inScope(p, scope.name) && (byLake.get(p.l.id)?.length ?? 0) > 0)
      .sort((a, b) => b.sim - a.sim)

    const agg = new Map<string, {
      label: string; count: number; weight: number; relevance: number; inSeason: number; phaseKnown: number
      scoping: number; phases: Record<string, number>; depths: Record<string, number>
      lakes: Map<string, number>
    }>()

    for (const p of members) {
      for (const r of byLake.get(p.l.id) ?? []) {
        const label = groupLabel({
          phase: r.pattern_phase, technique: r.pattern_technique, place: r.pattern_place,
          depth: r.pattern_depth, condition: null, scoping: !!r.pattern_scoping,
        })
        if (!label) continue
        const g = agg.get(label) ?? {
          label, count: 0, weight: 0, relevance: 0, inSeason: 0, phaseKnown: 0, scoping: 0,
          phases: {}, depths: {}, lakes: new Map<string, number>(),
        }
        g.count++
        // Relevance score. One number instead of three competing ones: a report
        // counts for more when it comes from a more comparable lake, and when
        // its timing matches the selection. Unstated timing counts partially —
        // it may well apply — and an explicitly different phase counts little
        // but never zero, since a pattern that produces out of season is still
        // evidence the water fishes that way.
        const inSel = !!r.pattern_phase && live.includes(r.pattern_phase)
        const timingFactor = inSel ? 1 : (!r.pattern_phase ? 0.35 : 0.12)
        g.relevance += p.sim * timingFactor
        g.weight += p.sim
        if (r.pattern_phase) g.phaseKnown++
        if (inSel) g.inSeason++
        if (r.pattern_scoping) g.scoping++
        if (r.pattern_phase) g.phases[r.pattern_phase] = (g.phases[r.pattern_phase] || 0) + 1
        if (r.pattern_depth) g.depths[r.pattern_depth] = (g.depths[r.pattern_depth] || 0) + 1
        g.lakes.set(p.l.name, (g.lakes.get(p.l.name) || 0) + 1)
        agg.set(label, g)
      }
    }

    const dominant = (t: Record<string, number>) =>
      Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    // Relevance as a share, volume on a log scale. Straight weighted sums let a
    // high-volume pattern with unstated timing outrank one with far more
    // confirmed in-season reports — Topwater held first place on a winter
    // selection with none of its 55 reports in winter. Taking relevance as a
    // proportion makes the timing selection actually move the ranking, while
    // log volume keeps a well-evidenced pattern ahead of a lucky single report.
    const scoreOf = (g: { relevance: number; weight: number }) =>
      g.weight > 0 ? (g.relevance / g.weight) * Math.log1p(g.weight) : 0

    const ranked = [...agg.values()].sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 6)
    const topScore = ranked.length ? scoreOf(ranked[0]) : 0

    const patterns = ranked
      .map(g => ({
        label: g.label,
        count: g.count,
        inSeason: g.inSeason,
        phaseKnown: g.phaseKnown,
        // The bar is this pattern's strength relative to the strongest in view,
        // so bar length and ordering express the same thing.
        strength: topScore > 0 ? Math.round(100 * scoreOf(g) / topScore) : 0,
        scoping: g.scoping > 0,
        phase: phaseLabel(dominant(g.phases)),
        depth: depthLabel(dominant(g.depths)),
        lakes: [...g.lakes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n),
        lakeCount: g.lakes.size,
      }))

    return {
      scope: scope.name,
      label: scope.name === 'region' ? `${myRegion} region` : scope.label,
      lakeCount: members.length,
      reportCount: members.reduce((s, p) => s + (byLake.get(p.l.id)?.length ?? 0), 0),
      topMatches: members.slice(0, 3).map(p => ({
        name: p.l.name, state: p.l.state,
        similarity: Math.round(p.sim * 100),
        miles: Number.isFinite(p.miles) ? Math.round(p.miles) : null,
      })),
      patterns,
    }
  }).filter(s => s.lakeCount > 0)

  return NextResponse.json({
    lake: me.name,
    season,
    phases: live,
    // Every phase present in the matched reports, so the UI can offer only
    // selections that would actually return something.
    availablePhases: [...new Set(reports.map(r => r.pattern_phase).filter(Boolean))],
    signature: {
      channelKm: me.channel_km == null ? null : Math.round(me.channel_km),
      dendriticRatio: me.dendritic_ratio,
      inletCount: me.inlet_count,
      type: me.type,
    },
    scopes,
  })
}
