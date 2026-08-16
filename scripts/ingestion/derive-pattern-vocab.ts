/**
 * AnglerIQ — Candidate canonical pattern vocabulary (analysis only)
 *
 * `pattern` is free text, so Winning Patterns counts wording coincidences
 * rather than real frequency: 83% of per-lake pattern entries appear exactly
 * once, and five reports describing "postspawn fish on transition points"
 * land as five separate 1X rows.
 *
 * This proposes a canonical vocabulary (the same idea as CANONICAL_TAGS for
 * structures) and measures how much of the corpus each entry captures, so the
 * list can be reviewed before anything is applied. Writes nothing.
 *
 * Usage:
 *   npx tsx scripts/ingestion/derive-pattern-vocab.ts
 *   npx tsx scripts/ingestion/derive-pattern-vocab.ts --unmatched   # what's left over
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Rule = { name: string; label: string; all?: string[][]; any?: string[]; not?: string[] }

// Ordered — first match wins, so specific rules precede general ones.
// `all` is a list of groups; every group must match at least one of its terms.
export const PATTERN_VOCAB: Rule[] = [
  // ── distinct events / seasonal phases (most specific first) ───────────────
  { name: 'shad_spawn',           label: 'Shad spawn',                  all: [['shad'], ['spawn','spawning']] },
  { name: 'postspawn_transition', label: 'Postspawn transition',        any: ['postspawn','post-spawn','post spawn'] },
  { name: 'prespawn_staging',     label: 'Prespawn staging',            any: ['prespawn','pre-spawn','pre spawn'] },
  { name: 'spawning_beds',        label: 'Spawning beds & flats',       any: ['spawning','spawn','bedding','beds','sight fishing'], not: ['shad'] },

  // ── unambiguous techniques ────────────────────────────────────────────────
  { name: 'punching_mats',        label: 'Punching heavy cover',        any: ['punch*','mat','mats','matted'] },
  { name: 'frog_pads',            label: 'Frogs over pads & slop',      any: ['frog','frogs','pad','pads','lily','slop'] },
  { name: 'jerkbait',             label: 'Jerkbait',                    any: ['jerkbait','jerkbaits','jerk bait'] },
  { name: 'swimbait',             label: 'Swimbaits',                   any: ['swimbait','swimbaits','glide bait','glidebait'] },
  { name: 'bladed_spinner',       label: 'Spinnerbaits & bladed jigs',  any: ['spinnerbait','spinnerbaits','chatterbait','bladed jig','vibrating jig'] },
  { name: 'crankbait',            label: 'Cranking',                    any: ['crank*','squarebill','lipless','rattle trap'] },
  { name: 'finesse',              label: 'Finesse presentations',       any: ['finesse','drop shot','dropshot','drop-shot','ned rig','shaky head','wacky','damiki'] },
  { name: 'topwater_schooling',   label: 'Topwater & schooling fish',   any: ['topwater','schooling','schools','blowup','blow-up','busting','walking bait','popper','buzzbait'] },

  // ── cover types ───────────────────────────────────────────────────────────
  { name: 'dock_flipping',        label: 'Dock flipping & skipping',    all: [['dock','docks','marina','boathouse'], ['flip*','pitch*','skip*']] },
  { name: 'docks_general',        label: 'Docks',                       any: ['dock','docks','marina','boathouse','seawall'] },
  { name: 'grass_edges',          label: 'Grass & vegetation edges',    any: ['grass','hydrilla','milfoil','vegetation','coontail','eelgrass','weeds','weedline'] },
  { name: 'timber_wood',          label: 'Timber, laydowns & wood',     any: ['timber','laydown','laydowns','wood','stump','stumps','brush','treetop','buck brush'] },
  { name: 'rock_riprap',          label: 'Rock, riprap & bluffs',       any: ['riprap','rip-rap','rip rap','rock','rocks','rocky','gravel','bluff','bluffs','boulder'] },
  { name: 'bridge_pilings',       label: 'Bridges & pilings',           any: ['bridge','bridges','piling','pilings','causeway','culvert'] },

  // ── structure ─────────────────────────────────────────────────────────────
  { name: 'offshore_ledges',      label: 'Offshore ledges & channels',  any: ['ledge','ledges','channel','drop-off','drop off','dropoff','break line','breakline'] },
  { name: 'humps_offshore',       label: 'Offshore humps & structure',  any: ['hump','humps','roadbed','submerged island','offshore'] },
  { name: 'main_lake_points',     label: 'Main-lake points',            any: ['point','points'] },
  { name: 'creek_arms',           label: 'Creek arms & pockets',        any: ['creek','creeks','pocket','pockets','cove','coves','tributary','feeder','bay','bays'] },
  { name: 'flats_shallow',        label: 'Shallow flats',               any: ['flat','flats'] },

  // ── generic presentations (low priority — only if nothing above matched) ──
  { name: 'jig_bottom',           label: 'Jigs & bottom contact',       any: ['jig','jigs','jigging','carolina rig','texas rig','football','worm','tube','senko'] },

  // ── conditions ────────────────────────────────────────────────────────────
  { name: 'current_river',        label: 'Current & river flow',        any: ['current','eddy','eddies','tailrace','tailwater','wing dam','flow'] },
  { name: 'night_bite',           label: 'Night fishing',               any: ['night','after dark','moonlight'] },
  { name: 'winter_deep',          label: 'Winter & cold water',         any: ['winter','cold water','coldwater','wintering'] },
  { name: 'summer_deep',          label: 'Summer pattern',              any: ['summer','midsummer','mid-summer'] },
  { name: 'fall_migration',       label: 'Fall migration',              any: ['fall','autumn'] },
  { name: 'spring_general',       label: 'Spring pattern',              any: ['spring'] },
]

// Match on word boundaries, not raw substrings: "sloping" must not match "slop",
// "cover" must not match "cove", and "postspawn" must not match "spawn".
// A trailing * marks a deliberate prefix match ("flip*" → flipping/flipped).
const rxCache = new Map<string, RegExp>()
function hasTerm(s: string, term: string): boolean {
  let rx = rxCache.get(term)
  if (!rx) {
    const t = term.trim()
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, m => (m === '*' ? m : '\\' + m))
    const body = esc.endsWith('*') ? esc.slice(0, -1) + '[a-z]*' : esc
    rx = new RegExp(`\\b${body}\\b`, 'i')
    rxCache.set(term, rx)
  }
  return rx.test(s)
}

export function classify(p: string): Rule | null {
  const s = p.toLowerCase()
  for (const r of PATTERN_VOCAB) {
    if (r.not && r.not.some(t => hasTerm(s, t))) continue
    if (r.all) {
      if (r.all.every(group => group.length === 0 || group.some(t => hasTerm(s, t)))) return r
    } else if (r.any) {
      if (r.any.some(t => hasTerm(s, t))) return r
    }
  }
  return null
}

async function main() {
  const showUnmatched = process.argv.includes('--unmatched')
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('technique_report')
      .select('pattern, body_of_water_id').not('pattern', 'is', null).order('id').range(from, from + 999)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }

  const counts: Record<string, number> = {}
  const samples: Record<string, string[]> = {}
  const unmatched: string[] = []

  for (const r of rows) {
    const hit = classify(r.pattern)
    if (!hit) { unmatched.push(r.pattern); continue }
    counts[hit.name] = (counts[hit.name] || 0) + 1
    samples[hit.name] = samples[hit.name] || []
    if (samples[hit.name].length < 3 && !samples[hit.name].includes(r.pattern)) samples[hit.name].push(r.pattern)
  }

  const matched = rows.length - unmatched.length
  console.log(`\nCANDIDATE PATTERN VOCABULARY — ${PATTERN_VOCAB.length} entries`)
  console.log(`${rows.length} reports · ${matched} matched (${(100*matched/rows.length).toFixed(1)}%) · ${unmatched.length} unmatched\n`)

  for (const r of PATTERN_VOCAB) {
    const c = counts[r.name] || 0
    console.log(`  ${String(c).padStart(4)}  ${r.label}`)
    if (c && samples[r.name]) console.log(`        e.g. ${samples[r.name].map(s => `"${s.slice(0, 52)}"`).join('  ')}`)
  }

  if (showUnmatched) {
    console.log(`\nUNMATCHED SAMPLE (${unmatched.length} total):`)
    for (const u of unmatched.slice(0, 30)) console.log(`   • ${u.slice(0, 76)}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
