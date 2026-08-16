/**
 * AnglerIQ — Canonical pattern facets
 *
 * `technique_report.pattern` is free text, so counting it directly measures
 * wording coincidence rather than how often a pattern actually worked: 83% of
 * per-lake pattern entries appeared exactly once, and five reports describing
 * postspawn fish on transition points landed as five separate 1X rows.
 *
 * A single canonical label was not enough either — "skipping a wacky rig under
 * docks" is finesse AND docks, and "punching hydrilla mats postspawn" would
 * lose the punching and the mats, which are the actionable parts. So patterns
 * are classified into five independent facets drawn from controlled lists.
 *
 * Depth is deliberately its own dimension rather than part of PLACE: "deep
 * grass" and "shallow grass" share a place but are different patterns.
 *
 * Coverage: ~94% of reports match at least one facet; grouping by
 * technique+place cuts the per-lake singleton rate from 83% to ~61%.
 */

export type Facet = { name: string; label: string; terms: string[] }

// Ordered within each facet — first match wins, so specific beats general.
export const PHASE: Facet[] = [
  { name: 'shad_spawn', label: 'Shad spawn', terms: ['shad spawn', 'spawning shad'] },
  { name: 'postspawn',  label: 'Postspawn',  terms: ['postspawn', 'post-spawn', 'post spawn'] },
  { name: 'prespawn',   label: 'Prespawn',   terms: ['prespawn', 'pre-spawn', 'pre spawn', 'staging'] },
  { name: 'spawn',      label: 'Spawn',      terms: ['spawning', 'spawn', 'bedding', 'beds', 'sight fishing'] },
  { name: 'winter',     label: 'Winter',     terms: ['winter', 'cold water', 'coldwater', 'wintering'] },
  { name: 'summer',     label: 'Summer',     terms: ['summer', 'midsummer', 'mid-summer'] },
  { name: 'fall',       label: 'Fall',       terms: ['fall', 'autumn'] },
  { name: 'spring',     label: 'Spring',     terms: ['spring'] },
]

export const TECHNIQUE: Facet[] = [
  // Forward-facing sonar. Listed first because it describes how fish are found
  // and targeted, which supersedes the bait in hand — a scoped jerkbait is a
  // scoping pattern, not a jerkbait pattern.
  { name: 'scoping',   label: 'Scoping (forward-facing sonar)', terms: ['scoping', 'scoped', 'scope', 'livescope', 'live scope', 'forward-facing', 'forward facing', 'ffs', 'activetarget', 'active target', 'panoptix', 'mega live', 'megalive'] },
  { name: 'punching',  label: 'Punching',                  terms: ['punch*'] },
  { name: 'flip_skip', label: 'Flipping & skipping',       terms: ['flip*', 'pitch*', 'skip*'] },
  { name: 'frog',      label: 'Frog',                      terms: ['frog', 'frogs', 'frogging'] },
  { name: 'topwater',  label: 'Topwater',                  terms: ['topwater', 'popper', 'walking bait', 'buzzbait', 'blowup', 'blow-up', 'busting', 'schooling', 'schools'] },
  { name: 'jerkbait',  label: 'Jerkbait',                  terms: ['jerkbait', 'jerkbaits', 'jerk bait'] },
  { name: 'crankbait', label: 'Cranking',                  terms: ['crank*', 'squarebill', 'lipless', 'rattle trap'] },
  { name: 'swimbait',  label: 'Swimbait',                  terms: ['swimbait', 'swimbaits', 'glide bait', 'glidebait'] },
  { name: 'bladed',    label: 'Spinnerbait & bladed jig',  terms: ['spinnerbait', 'spinnerbaits', 'chatterbait', 'bladed jig', 'vibrating jig'] },
  { name: 'finesse',   label: 'Finesse',                   terms: ['finesse', 'drop shot', 'dropshot', 'drop-shot', 'ned rig', 'shaky head', 'wacky', 'damiki', 'deadstick*'] },
  { name: 'jig',       label: 'Jig & bottom contact',      terms: ['jig', 'jigs', 'jigging', 'carolina rig', 'texas rig', 'football', 'worm', 'tube', 'senko', 'spoon'] },
  { name: 'reaction',  label: 'Reaction & power fishing',  terms: ['reaction', 'power fishing', 'moving bait', 'moving baits', 'junk fishing'] },
]

// `structure` sits last so anything more specific wins the match, but it is a
// first-class value: structure is findable on electronics, and 81% of the
// reports that land here carry a depth, technique or phase alongside it
// ("deep structure in winter, finesse") — that is an actionable pattern.
export const PLACE: Facet[] = [
  { name: 'mats',      label: 'Matted vegetation', terms: ['mat', 'mats', 'matted', 'slop'] },
  { name: 'pads',      label: 'Lily pads',         terms: ['pad', 'pads', 'lily'] },
  { name: 'docks',     label: 'Docks',             terms: ['dock', 'docks', 'marina', 'boathouse', 'seawall'] },
  { name: 'bridges',   label: 'Bridges',           terms: ['bridge', 'bridges', 'piling', 'pilings', 'causeway', 'culvert'] },
  { name: 'grass',     label: 'Grass',             terms: ['grass', 'hydrilla', 'milfoil', 'vegetation', 'coontail', 'eelgrass', 'weed', 'weeds', 'weedline', 'grassline'] },
  { name: 'timber',    label: 'Timber & wood',     terms: ['timber', 'laydown', 'laydowns', 'wood', 'stump', 'stumps', 'brush', 'treetop', 'treeline', 'cypress'] },
  { name: 'rock',      label: 'Rock & riprap',     terms: ['riprap', 'rip-rap', 'rip rap', 'rock', 'rocks', 'rocky', 'gravel', 'bluff', 'bluffs', 'boulder', 'chunk rock'] },
  { name: 'ledges',    label: 'Ledges & channels', terms: ['ledge', 'ledges', 'channel', 'drop-off', 'drop off', 'dropoff', 'breakline', 'break line'] },
  { name: 'humps',     label: 'Humps & offshore',  terms: ['hump', 'humps', 'roadbed', 'submerged island', 'offshore'] },
  { name: 'points',    label: 'Points',            terms: ['point', 'points'] },
  { name: 'creeks',    label: 'Creeks & pockets',  terms: ['creek', 'creeks', 'pocket', 'pockets', 'cove', 'coves', 'tributary', 'feeder', 'bay', 'bays'] },
  { name: 'flats',     label: 'Flats',             terms: ['flat', 'flats'] },
  { name: 'banks',     label: 'Banks & shoreline', terms: ['bank', 'banks', 'shoreline', 'shore'] },
  { name: 'structure', label: 'Structure & cover', terms: ['structure', 'structures', 'cover'] },
]

export const DEPTH: Facet[] = [
  { name: 'suspended', label: 'Suspended', terms: ['suspend*', 'water column', 'mid-column'] },
  { name: 'deep',      label: 'Deep',      terms: ['deep', 'deeper', 'deepest', 'depth', 'depths'] },
  { name: 'shallow',   label: 'Shallow',   terms: ['shallow', 'shallows', 'shallower', 'skinny water'] },
]

export const CONDITION: Facet[] = [
  { name: 'current',  label: 'Current',       terms: ['current', 'eddy', 'eddies', 'tailrace', 'tailwater', 'wing dam'] },
  { name: 'night',    label: 'Night',         terms: ['night', 'after dark', 'moonlight'] },
  { name: 'wind',     label: 'Wind',          terms: ['wind', 'windy', 'wind-blown', 'windward'] },
  { name: 'muddy',    label: 'Stained water', terms: ['muddy', 'stained', 'turbid', 'dirty water'] },
  { name: 'forage',   label: 'Bait-driven',   terms: ['shad', 'baitfish', 'bait ball', 'bluegill', 'forage', 'herring', 'alewife'] },
  { name: 'lowlight', label: 'Low light',     terms: ['morning', 'evening', 'dawn', 'dusk', 'low light', 'low-light'] },
  // Weather fronts and angling pressure are unrelated; lumping them produced a
  // "Frontal" label on reports that were actually about pressured fish.
  { name: 'cold_front', label: 'Cold front',      terms: ['cold front', 'post-front', 'postfront', 'frontal', 'bluebird'] },
  { name: 'pressured',  label: 'Pressured fish',  terms: ['pressured', 'pressure', 'high-pressure', 'heavily fished'] },
]

const OFFSHORE: Facet = { name: 'humps', label: 'Humps & offshore', terms: [] }

// Match on word boundaries, not raw substrings: "sloping" must not match "slop",
// "cover" must not match "cove", "postspawn" must not match "spawn".
// A trailing * marks a deliberate prefix match ("flip*" → flipping/flipped).
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

const pick = (s: string, facets: Facet[]) =>
  facets.find(f => f.terms.some(t => hasTerm(s, t) && !negated(s, t))) ?? null

export type PatternFacets = {
  phase: string | null
  technique: string | null
  place: string | null
  depth: string | null
  condition: string | null
}

// "Caught at Purtis Creek without LiveScope" must not read as a scoping
// pattern, so a term preceded by a negator does not count.
const NEGATORS = ['without', 'no', 'not', 'lacking', 'absent', 'never']
function negated(s: string, term: string): boolean {
  const base = term.endsWith('*') ? term.slice(0, -1) : term
  const esc = base.replace(/[.+?^${}()|[\]\\]/g, m => '\\' + m)
  return new RegExp(`\\b(${NEGATORS.join('|')})\\s+(\\w+\\s+){0,2}${esc}`, 'i').test(s)
}

/**
 * `extra` widens the search to a short companion field (presentation), which is
 * where techniques such as forward-facing sonar are often recorded rather than
 * in the pattern text itself. Long free-text notes are deliberately excluded —
 * they mention too much in passing to classify reliably.
 */
export function facetsOf(pattern: string, extra?: string | null): PatternFacets {
  const s = [(pattern || ''), (extra || '')].join(' ').toLowerCase()
  const place = pick(s, PLACE)
  const depth = pick(s, DEPTH)
  return {
    phase: pick(s, PHASE)?.name ?? null,
    technique: pick(s, TECHNIQUE)?.name ?? null,
    // Deep water with no structure named is an offshore/open-water pattern.
    place: (place ?? (depth?.name === 'deep' ? OFFSHORE : null))?.name ?? null,
    depth: depth?.name ?? null,
    condition: pick(s, CONDITION)?.name ?? null,
  }
}

const labelOf = (facets: Facet[], name: string | null) =>
  name ? (facets.find(f => f.name === name)?.label ?? null) : null

export const phaseLabel     = (n: string | null) => labelOf(PHASE, n)
export const techniqueLabel = (n: string | null) => labelOf(TECHNIQUE, n)
export const placeLabel     = (n: string | null) => labelOf(PLACE, n)
export const depthLabel     = (n: string | null) => labelOf(DEPTH, n)
export const conditionLabel = (n: string | null) => labelOf(CONDITION, n)

/**
 * The heading a pattern is grouped under. Technique and place carry the action,
 * so they form the label; depth, phase and condition ride along as chips. Depth
 * is deliberately kept out of the heading — folding it in split "Ledges" from
 * "Deep ledges", which are the same pattern described two ways.
 */
export function groupLabel(f: PatternFacets): string | null {
  const parts = [techniqueLabel(f.technique), placeLabel(f.place)].filter(Boolean)
  if (parts.length) return parts.join(' · ')
  return phaseLabel(f.phase) ?? depthLabel(f.depth) ?? conditionLabel(f.condition) ?? null
}
