/**
 * AnglerIQ — Faceted pattern vocabulary (analysis only)
 *
 * A single canonical label throws away most of a pattern: "skipping a wacky rig
 * under docks" is finesse AND docks, and "punching hydrilla mats postspawn"
 * loses the punching and the mats — the actionable parts.
 *
 * This assigns facets from controlled lists instead (phase / technique / place /
 * condition) and measures whether composite labels still group, or whether they
 * re-fragment the way free text does (83% of free-text entries are singletons).
 *
 * Writes nothing.
 *
 * Usage:
 *   npx tsx scripts/ingestion/derive-pattern-facets.ts
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Facet = { name: string; label: string; terms: string[] }

// Ordered within each facet — first match wins, so specific beats general.
export const PHASE: Facet[] = [
  { name: 'shad_spawn',  label: 'Shad spawn',   terms: ['shad spawn','spawning shad'] },
  { name: 'postspawn',   label: 'Postspawn',    terms: ['postspawn','post-spawn','post spawn'] },
  { name: 'prespawn',    label: 'Prespawn',     terms: ['prespawn','pre-spawn','pre spawn','staging'] },
  { name: 'spawn',       label: 'Spawn',        terms: ['spawning','spawn','bedding','beds','sight fishing'] },
  { name: 'winter',      label: 'Winter',       terms: ['winter','cold water','coldwater','wintering'] },
  { name: 'summer',      label: 'Summer',       terms: ['summer','midsummer','mid-summer'] },
  { name: 'fall',        label: 'Fall',         terms: ['fall','autumn'] },
  { name: 'spring',      label: 'Spring',       terms: ['spring'] },
]

export const TECHNIQUE: Facet[] = [
  { name: 'punching',    label: 'Punching',     terms: ['punch*'] },
  { name: 'flip_skip',   label: 'Flipping & skipping', terms: ['flip*','pitch*','skip*'] },
  { name: 'frog',        label: 'Frog',         terms: ['frog','frogs','frogging'] },
  { name: 'topwater',    label: 'Topwater',     terms: ['topwater','popper','walking bait','buzzbait','blowup','blow-up','busting','schooling','schools'] },
  { name: 'jerkbait',    label: 'Jerkbait',     terms: ['jerkbait','jerkbaits','jerk bait'] },
  { name: 'crankbait',   label: 'Cranking',     terms: ['crank*','squarebill','lipless','rattle trap'] },
  { name: 'swimbait',    label: 'Swimbait',     terms: ['swimbait','swimbaits','glide bait','glidebait'] },
  { name: 'bladed',      label: 'Spinnerbait & bladed jig', terms: ['spinnerbait','spinnerbaits','chatterbait','bladed jig','vibrating jig'] },
  { name: 'finesse',     label: 'Finesse',      terms: ['finesse','drop shot','dropshot','drop-shot','ned rig','shaky head','wacky','damiki','deadstick*'] },
  { name: 'jig',         label: 'Jig & bottom contact', terms: ['jig','jigs','jigging','carolina rig','texas rig','football','worm','tube','senko','spoon'] },
  { name: 'reaction',    label: 'Reaction & power fishing', terms: ['reaction','power fishing','moving bait','moving baits','junk fishing'] },
]

export const PLACE: Facet[] = [
  { name: 'mats',        label: 'Matted vegetation', terms: ['mat','mats','matted','slop'] },
  { name: 'pads',        label: 'Lily pads',    terms: ['pad','pads','lily'] },
  { name: 'docks',       label: 'Docks',        terms: ['dock','docks','marina','boathouse','seawall'] },
  { name: 'bridges',     label: 'Bridges',      terms: ['bridge','bridges','piling','pilings','causeway','culvert'] },
  { name: 'grass',       label: 'Grass',        terms: ['grass','hydrilla','milfoil','vegetation','coontail','eelgrass','weed','weeds','weedline','grassline'] },
  { name: 'timber',      label: 'Timber & wood', terms: ['timber','laydown','laydowns','wood','stump','stumps','brush','treetop','treeline','cypress'] },
  { name: 'rock',        label: 'Rock & riprap', terms: ['riprap','rip-rap','rip rap','rock','rocks','rocky','gravel','bluff','bluffs','boulder','chunk rock'] },
  { name: 'ledges',      label: 'Ledges & channels', terms: ['ledge','ledges','channel','drop-off','drop off','dropoff','breakline','break line'] },
  { name: 'humps',       label: 'Humps & offshore', terms: ['hump','humps','roadbed','submerged island','offshore'] },
  { name: 'points',      label: 'Points',       terms: ['point','points'] },
  { name: 'creeks',      label: 'Creeks & pockets', terms: ['creek','creeks','pocket','pockets','cove','coves','tributary','feeder','bay','bays'] },
  { name: 'flats',       label: 'Flats',        terms: ['flat','flats'] },
  { name: 'banks',       label: 'Banks & shoreline', terms: ['bank','banks','shoreline','shore'] },
  { name: 'structure',   label: 'Structure & cover', terms: ['structure','structures','cover'] },  // last resort — generic
]

// Depth is its own dimension: "deep grass" and "shallow grass" share a place
// but are different patterns, so this can't be folded into PLACE.
export const DEPTH: Facet[] = [
  { name: 'suspended',   label: 'Suspended',    terms: ['suspend*','water column','mid-column'] },
  { name: 'deep',        label: 'Deep',         terms: ['deep','deeper','deepest','depth','depths'] },
  { name: 'shallow',     label: 'Shallow',      terms: ['shallow','shallows','shallower','skinny water'] },
]

export const CONDITION: Facet[] = [
  { name: 'current',     label: 'Current',      terms: ['current','eddy','eddies','tailrace','tailwater','wing dam'] },
  { name: 'night',       label: 'Night',        terms: ['night','after dark','moonlight'] },
  { name: 'wind',        label: 'Wind',         terms: ['wind','windy','wind-blown','windward'] },
  { name: 'muddy',       label: 'Stained water', terms: ['muddy','stained','turbid','dirty water'] },
  { name: 'forage',      label: 'Bait-driven',  terms: ['shad','baitfish','bait ball','bluegill','forage','herring','alewife'] },
  { name: 'lowlight',    label: 'Low light',    terms: ['morning','evening','dawn','dusk','low light','low-light'] },
  { name: 'front',       label: 'Frontal',      terms: ['front','cold front','post-front','postfront','pressured','pressure'] },
]

const rxCache = new Map<string, RegExp>()
function hasTerm(s: string, term: string): boolean {
  let rx = rxCache.get(term)
  if (!rx) {
    const esc = term.trim().replace(/[.+?^${}()|[\]\\]/g, m => '\\' + m)
    const body = esc.endsWith('*') ? esc.slice(0, -1) + '[a-z]*' : esc
    rx = new RegExp(`\\b${body}\\b`, 'i')
    rxCache.set(term, rx)
  }
  return rx.test(s)
}
const pick = (s: string, facets: Facet[]) => facets.find(f => f.terms.some(t => hasTerm(s, t))) ?? null

export function facetsOf(pattern: string) {
  const s = pattern.toLowerCase()
  const place = pick(s, PLACE)
  const depth = pick(s, DEPTH)
  return {
    phase: pick(s, PHASE),
    technique: pick(s, TECHNIQUE),
    // Deep water with no structure named is an offshore/open-water pattern.
    place: place ?? (depth?.name === 'deep' ? { name: 'offshore', label: 'Offshore', terms: [] } : null),
    depth,
    condition: pick(s, CONDITION),
  }
}

// Display label: technique + place carry the action, phase gives context.
export function compositeLabel(f: ReturnType<typeof facetsOf>): string | null {
  const place = f.depth && f.place ? `${f.depth.label} ${f.place.label.toLowerCase()}` : f.place?.label
  const parts = [f.technique?.label, place].filter(Boolean)
  if (!parts.length) return f.phase?.label ?? f.depth?.label ?? f.condition?.label ?? null
  return (f.phase ? `${f.phase.label} · ` : '') + parts.join(' · ')
}

async function main() {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('technique_report')
      .select('pattern, body_of_water_id').not('pattern', 'is', null).order('id').range(from, from + 999)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }

  let anyFacet = 0, multi = 0
  const perLakeFull: Record<string, number> = {}
  const perLakeTechPlace: Record<string, number> = {}
  const labelCounts: Record<string, number> = {}

  for (const r of rows) {
    const f = facetsOf(r.pattern)
    const n = [f.phase, f.technique, f.place, f.depth, f.condition].filter(Boolean).length
    if (n > 0) anyFacet++
    if (n > 1) multi++

    const full = compositeLabel(f)
    if (full) {
      labelCounts[full] = (labelCounts[full] || 0) + 1
      perLakeFull[`${r.body_of_water_id}|${full}`] = (perLakeFull[`${r.body_of_water_id}|${full}`] || 0) + 1
      const tp = [f.technique?.label, f.place?.label].filter(Boolean).join(' · ') || f.phase?.label
      perLakeTechPlace[`${r.body_of_water_id}|${tp}`] = (perLakeTechPlace[`${r.body_of_water_id}|${tp}`] || 0) + 1
    }
  }

  const stats = (m: Record<string, number>) => {
    const vals = Object.values(m)
    const singles = vals.filter(v => v === 1).length
    return { entries: vals.length, singles, pct: (100 * singles / vals.length).toFixed(1) }
  }
  const sFull = stats(perLakeFull), sTP = stats(perLakeTechPlace)

  console.log(`\n${rows.length} patterned reports`)
  console.log(`  ${anyFacet} matched at least one facet (${(100*anyFacet/rows.length).toFixed(1)}%)`)
  console.log(`  ${multi} matched two or more facets (${(100*multi/rows.length).toFixed(1)}%)\n`)

  console.log('PER-LAKE GROUPING — singleton rate (lower is better):')
  console.log(`  free text (today)          83.2%`)
  console.log(`  composite phase+tech+place ${sFull.pct}%   (${sFull.entries} entries)`)
  console.log(`  composite tech+place only  ${sTP.pct}%   (${sTP.entries} entries)\n`)

  console.log('TOP COMPOSITE LABELS (catalog-wide):')
  Object.entries(labelCounts).sort((a,b)=>b[1]-a[1]).slice(0,22)
    .forEach(([l,c]) => console.log(`  ${String(c).padStart(4)}  ${l}`))
  console.log(`\n  distinct composite labels: ${Object.keys(labelCounts).length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
