/**
 * AnglerIQ — Cross-lake pattern comparison (analysis prototype)
 *
 * What works on waters like this one? Useful anywhere, and most useful on the
 * 118 lakes with too little report data of their own to answer the question.
 *
 * Lakes are matched on a PHYSICAL signature taken from stored channel geometry
 * — channel length as a size proxy, minor/main ratio as cove complexity, inlet
 * count as tributary richness — rather than on their own reports. Matching on
 * report-derived profiles would be circular: the lakes that most need borrowed
 * patterns are exactly the ones with no profile to match on. 117 of the 118
 * low-data lakes have channel geometry.
 *
 * Patterns are then aggregated from matched lakes at widening scopes (local /
 * state / region / national) so a thin local sample can be backed by a broader
 * one. Conditions qualify rather than filter: every relevant pattern is
 * returned, with the ones matching the current season marked, so an angler sees
 * both what should work now and what else could.
 *
 * Read-only.
 *
 * Usage:
 *   npx tsx scripts/ingestion/cross-lake-patterns.ts --lake "Lake B.A. Steinhagen"
 *   npx tsx scripts/ingestion/cross-lake-patterns.ts --lake "Lake Fork" --season summer
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { groupLabel, placeLabel, depthLabel, phaseLabel } from '../../src/lib/pattern-facets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Regions are fishery-shaped rather than census-shaped: waters within one behave
// alike enough that a pattern transfers.
const REGIONS: Record<string, string[]> = {
  'South Central': ['TX', 'OK', 'LA', 'AR'],
  'Southeast':     ['AL', 'GA', 'FL', 'MS', 'SC', 'NC', 'TN', 'VA', 'KY', 'WV'],
  'Midwest':       ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE'],
  'Northeast':     ['NY', 'PA', 'VT', 'NH', 'ME', 'MA', 'CT', 'NJ', 'MD', 'DE'],
  'West':          ['CA', 'AZ', 'NV', 'OR', 'WA', 'ID', 'UT', 'CO', 'NM', 'MT', 'WY'],
}
const firstState = (s: string) => (s || '').split('/')[0].trim()
const regionOf = (state: string) => {
  const st = firstState(state)
  for (const [r, states] of Object.entries(REGIONS)) if (states.includes(st)) return r
  return 'Other'
}

const R_MI = 3959
const miles = (a: number, b: number, c: number, d: number) => {
  const p = Math.PI / 180
  const x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2
  return 2 * R_MI * Math.asin(Math.sqrt(x))
}
const R_KM = 6371
const km = (a: number, b: number, c: number, d: number) => {
  const p = Math.PI / 180
  const x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(x))
}
const segKm = (s: number[][]) => {
  let t = 0
  for (let i = 0; i < s.length - 1; i++) t += km(s[i][1], s[i][0], s[i + 1][1], s[i + 1][0])
  return t
}

/** Physical signature from channel geometry — available without any reports. */
type Signature = { scale: number; dendritic: number; inlets: number; type: string }

function signature(main: number[][][], minor: number[][][], junctions: any[], type: string): Signature | null {
  const mainKm = main.reduce((s, x) => s + segKm(x), 0)
  const minorKm = minor.reduce((s, x) => s + segKm(x), 0)
  if (!mainKm && !minorKm) return null
  return {
    scale: mainKm || minorKm,
    dendritic: minorKm / (mainKm || 1),
    inlets: (junctions ?? []).length,
    type: type || 'reservoir',
  }
}

/** 0..1 similarity. Log-scaled on size so a 10 km and a 100 km lake aren't "close". */
function similarity(a: Signature, b: Signature): number {
  const sizeDiff = Math.abs(Math.log10(Math.max(a.scale, 1)) - Math.log10(Math.max(b.scale, 1)))
  const sizeSim = Math.max(0, 1 - sizeDiff / 1.2)
  const dendDiff = Math.abs(Math.min(a.dendritic, 6) - Math.min(b.dendritic, 6))
  const dendSim = Math.max(0, 1 - dendDiff / 4)
  const inA = Math.log10(a.inlets + 1), inB = Math.log10(b.inlets + 1)
  const inSim = Math.max(0, 1 - Math.abs(inA - inB) / 1.5)
  const typeSim = a.type === b.type ? 1 : 0.75
  return (0.4 * sizeSim + 0.3 * dendSim + 0.2 * inSim + 0.1 * typeSim)
}

type Row = { lake_id: string; place: string | null; technique: string | null; depth: string | null; phase: string | null; scoping: boolean; season: string | null }

async function main() {
  const args = process.argv.slice(2)
  const target = args.includes('--lake') ? args[args.indexOf('--lake') + 1] : 'Lake B.A. Steinhagen'
  const season = args.includes('--season') ? args[args.indexOf('--season') + 1] : null

  const { data: lakes } = await supabase.from('body_of_water').select('id,name,state,type,lat,lng')
  const L = new Map((lakes ?? []).map((l: any) => [l.id, l]))

  const chan: any[] = []
  for (let f = 0; ; f += 300) {
    const { data } = await supabase.from('lake_channels').select('lake_id,main_channel,minor_channels,junctions').range(f, f + 299)
    chan.push(...(data ?? [])); if (!data || data.length < 300) break
  }
  const sigs = new Map<string, Signature>()
  for (const c of chan) {
    const l = L.get(c.lake_id); if (!l) continue
    const s = signature(c.main_channel ?? [], c.minor_channels ?? [], c.junctions ?? [], l.type)
    if (s) sigs.set(c.lake_id, s)
  }

  const rows: Row[] = []
  for (let f = 0; ; f += 1000) {
    const { data } = await supabase.from('technique_report')
      .select('body_of_water_id, pattern_place, pattern_technique, pattern_depth, pattern_phase, pattern_scoping, season')
      .order('id').range(f, f + 999)
    for (const r of (data ?? []) as any[]) rows.push({
      lake_id: r.body_of_water_id, place: r.pattern_place, technique: r.pattern_technique,
      depth: r.pattern_depth, phase: r.pattern_phase, scoping: !!r.pattern_scoping, season: r.season,
    })
    if (!data || data.length < 1000) break
  }
  const byLake = new Map<string, Row[]>()
  for (const r of rows) { if (r.lake_id) (byLake.get(r.lake_id) ?? byLake.set(r.lake_id, []).get(r.lake_id)!).push(r) }

  const me = (lakes ?? []).find((l: any) => l.name === target)
  if (!me) { console.error(`Lake not found: ${target}`); return }
  const mySig = sigs.get(me.id)
  if (!mySig) { console.error(`${target} has no channel geometry — cannot build a signature`); return }
  const myRegion = regionOf(me.state)

  console.log(`\n🎣  ${me.name} (${me.state}) — cross-lake patterns`)
  console.log(`    own reports: ${(byLake.get(me.id) ?? []).length}`)
  console.log(`    signature: ${mySig.scale.toFixed(0)}km channel · ${mySig.dendritic.toFixed(1)}x dendritic · ${mySig.inlets} inlets · ${mySig.type}`)
  if (season) console.log(`    qualifying against season: ${season}`)

  const scopes: { name: string; filter: (l: any) => boolean }[] = [
    { name: 'Local (50 mi)',  filter: l => miles(me.lat, me.lng, l.lat, l.lng) <= 50 },
    { name: 'Local (150 mi)', filter: l => miles(me.lat, me.lng, l.lat, l.lng) <= 150 },
    { name: `State (${firstState(me.state)})`, filter: l => firstState(l.state) === firstState(me.state) },
    { name: `Region (${myRegion})`, filter: l => regionOf(l.state) === myRegion },
    { name: 'National', filter: () => true },
  ]

  // Which pattern phases are live in a given season. The `season` column is
// populated on 0.4% of reports, so the phase facet (23%) is the usable signal.
const PHASES_IN_SEASON: Record<string, string[]> = {
  spring: ['prespawn', 'spawn', 'spring', 'shad_spawn'],
  summer: ['summer', 'postspawn', 'shad_spawn'],
  fall:   ['fall'],
  winter: ['winter'],
}

const MIN_SIM = 0.65
  for (const scope of scopes) {
    const peers = (lakes ?? []).filter((l: any) =>
      l.id !== me.id && sigs.has(l.id) && scope.filter(l) && similarity(mySig, sigs.get(l.id)!) >= MIN_SIM
    ).map((l: any) => ({ l, sim: similarity(mySig, sigs.get(l.id)!), n: (byLake.get(l.id) ?? []).length }))
      .filter(p => p.n > 0)
      .sort((a, b) => b.sim - a.sim)

    const totalReports = peers.reduce((s, p) => s + p.n, 0)
    console.log(`\n  ── ${scope.name} — ${peers.length} comparable lakes, ${totalReports} reports`)
    if (!peers.length) { console.log('     (no comparable water with data at this scope)'); continue }

    // Weight a pattern by how similar its lake is, so a closer analog counts more.
    // No peer cap: a wider scope is supposed to aggregate a larger sample, and
    // capping made the national view report fewer occurrences than the state one.
    const agg = new Map<string, { w: number; n: number; inSeason: number; scoping: number; lakes: Set<string> }>()
    const live = season ? (PHASES_IN_SEASON[season.toLowerCase()] ?? []) : []
    for (const p of peers) {
      for (const r of (byLake.get(p.l.id) ?? [])) {
        const label = groupLabel({ phase: r.phase, technique: r.technique, place: r.place, depth: r.depth, condition: null, scoping: r.scoping })
        if (!label) continue
        const g = agg.get(label) ?? { w: 0, n: 0, inSeason: 0, scoping: 0, lakes: new Set<string>() }
        g.w += p.sim; g.n++
        if (live.length && r.phase && live.includes(r.phase)) g.inSeason++
        if (r.scoping) g.scoping++
        g.lakes.add(p.l.name)
        agg.set(label, g)
      }
    }
    const top = [...agg.entries()].sort((a, b) => b[1].w - a[1].w).slice(0, 6)
    for (const [label, g] of top) {
      // Conditions qualify rather than filter: everything relevant is listed,
      // with in-season occurrences called out so "what works now" and "what
      // else could work" are both visible.
      const pct = g.n ? Math.round(100 * g.inSeason / g.n) : 0
      const marks = [
        season ? (g.inSeason > 0 ? `${g.inSeason}/${g.n} in ${season} (${pct}%)` : `no ${season} reports`) : null,
        g.scoping > 0 ? 'Scoping/FFS' : null,
      ].filter(Boolean).join('  ·  ')
      console.log(`     ${String(g.n).padStart(3)}x  ${label.padEnd(38)} ${marks}`)
      console.log(`          from ${[...g.lakes].slice(0, 3).join(', ')}${g.lakes.size > 3 ? ` +${g.lakes.size - 3}` : ''}`)
    }
  }
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
