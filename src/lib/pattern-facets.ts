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
// No shad_spawn phase: shad are not present in every fishery, so it is not a
// timing stage that generalises. Where the text mentions shad it still lands in
// CONDITION as "Bait-driven", and the timing falls to the surrounding language.
export const PHASE: Facet[] = [
  { name: 'postspawn',  label: 'Postspawn',  terms: ['postspawn', 'post-spawn', 'post spawn'] },
  { name: 'prespawn',   label: 'Prespawn',   terms: ['prespawn', 'pre-spawn', 'pre spawn', 'staging'] },
  { name: 'spawn',      label: 'Spawn',      terms: ['spawning', 'spawn', 'bedding', 'beds', 'sight fishing'] },
  { name: 'winter',     label: 'Winter',     terms: ['winter', 'cold water', 'coldwater', 'wintering'] },
  { name: 'summer',     label: 'Summer',     terms: ['summer', 'midsummer', 'mid-summer'] },
  { name: 'fall',       label: 'Fall',       terms: ['fall', 'autumn'] },
  { name: 'spring',     label: 'Spring',     terms: ['spring'] },
]

// Forward-facing sonar is how fish are found, not what is tied on — you scope a
// jighead minnow on offshore timber. So it rides alongside a pattern as a flag
// rather than consuming the technique slot, and shows as a pill wherever it
// applies instead of competing for a place in the ranking.
export const SCOPING_TERMS = [
  'scoping', 'scoped', 'scope', 'livescope', 'live scope', 'forward-facing',
  'forward facing', 'ffs', 'activetarget', 'active target', 'panoptix',
  'mega live', 'megalive', 'damiki rig', 'hover strolling', 'moping', 'video game',
]

export const TECHNIQUE: Facet[] = [
  { name: 'jighead_minnow', label: 'Jighead minnow',       terms: ['jighead minnow', 'minnow head', 'damiki rig', 'hover rig', 'jig head minnow'] },
  { name: 'hair_jig',  label: 'Hair jig',                  terms: ['hair jig', 'marabou', 'feather jig'] },
  { name: 'football_jig', label: 'Football jig',           terms: ['football jig', 'football head', 'football'] },
  { name: 'swim_jig',  label: 'Swim jig',                  terms: ['swim jig', 'swimming jig', 'swimjig'] },
  { name: 'flipping_jig', label: 'Flipping jig',           terms: ['flipping jig', 'pitching jig', 'casting jig', 'arky', 'flippin jig'] },
  { name: 'punching',  label: 'Punching',                  terms: ['punch*'] },
  { name: 'flip_skip', label: 'Flipping & skipping',       terms: ['flip*', 'pitch*', 'skip*'] },
  { name: 'frog',      label: 'Frog',                      terms: ['frog', 'frogs', 'frogging'] },
  { name: 'topwater',  label: 'Topwater',                  terms: ['topwater', 'popper', 'walking bait', 'buzzbait', 'blowup', 'blow-up', 'busting', 'schooling', 'schools'] },
  { name: 'jerkbait',  label: 'Jerkbait',                  terms: ['jerkbait', 'jerkbaits', 'jerk bait'] },
  { name: 'crankbait', label: 'Cranking',                  terms: ['crank*', 'squarebill', 'lipless', 'rattle trap'] },
  { name: 'swimbait',  label: 'Swimbait',                  terms: ['swimbait', 'swimbaits', 'glide bait', 'glidebait'] },
  { name: 'bladed',    label: 'Spinnerbait & bladed jig',  terms: ['spinnerbait', 'spinnerbaits', 'chatterbait', 'bladed jig', 'vibrating jig'] },
  { name: 'finesse',   label: 'Finesse',                   terms: ['finesse', 'drop shot', 'dropshot', 'drop-shot', 'ned rig', 'shaky head', 'wacky', 'deadstick*'] },
  { name: 'soft_plastic', label: 'Soft plastics',          terms: ['texas rig', 'carolina rig', 'worm', 'senko', 'stick bait', 'creature', 'craw', 'lizard', 'fluke', 'tube'] },
  { name: 'jig',       label: 'Jig (unspecified)',          terms: ['jig', 'jigs', 'jigging', 'spoon'] },
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
  scoping: boolean
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
/**
 * Bait names that in practice mean forward-facing sonar. Minnow-style baits and
 * the Damiki/hover family exist to be watched down to a fish on the screen, so
 * their presence is a reliable scoping signal even when the write-up never says
 * "LiveScope". Checked only for this technique — bait names must not feed the
 * general matcher, or a "Rock Crawler" crankbait would register as place=rock.
 */
// Specific bait families, not brands. "Damiki" alone is a tackle company that
// also makes crankbaits — matching the brand flagged a Damiki DC Series 300
// crankbait as a scoping pattern. A bare "minnow" is likewise ambiguous: a
// Rapala Original Floating Minnow is a hard jerkbait, while a minnow on a
// jighead is the archetypal forward-facing-sonar bait. So a plain "minnow"
// counts only when the bait is a soft plastic.
const FFS_BAIT_TERMS = [
  'flatnose', 'hinge minnow', 'drop minnow', 'mooch minnow', 'jighead minnow',
  'jig head minnow', 'damiki rig', 'hover rig', 'hover strolling', 'armor shad',
  'minnow soft', 'soft minnow',
]

function baitsSuggestScoping(baits?: (string | { name?: string | null; type?: string | null })[] | null): boolean {
  if (!baits?.length) return false
  for (const b of baits) {
    const name = (typeof b === 'string' ? b : b?.name ?? '').toLowerCase()
    const type = (typeof b === 'string' ? '' : b?.type ?? '').toLowerCase()
    if (!name && !type) continue
    if (FFS_BAIT_TERMS.some(t => hasTerm(name, t) && !negated(name, t))) return true
    // Deliberately no generic "soft plastic + minnow" rule: a Strike King Rage
    // Minnow is a fluke-style soft jerkbait fished in a crankbait rotation, and
    // treating every soft minnow as forward-facing sonar mislabelled it. Only
    // the named families above are unambiguous enough to flag.
    void type
  }
  return false
}

/**
 * Extra evidence for the seasonal phase only. Notes are long and mention many
 * things in passing, so they must not feed place/technique/depth matching — but
 * they are the richest remaining source of timing. Water temperature is used
 * only at the unambiguous ends: 60F could be spring or fall, but sub-48F is
 * winter and 78F+ is summer wherever you are.
 */
export type PhaseHints = {
  notes?: string | null
  season?: string | null
  spawnPhase?: string | null
  waterTempF?: number | null
}

function phaseFromHints(h?: PhaseHints | null): string | null {
  if (!h) return null
  const spawn = (h.spawnPhase ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (spawn === 'prespawn' || spawn === 'spawn' || spawn === 'postspawn') return spawn
  const season = (h.season ?? '').toLowerCase().trim()
  if (['spring', 'summer', 'fall', 'winter'].includes(season)) return season
  if (h.notes) {
    const p = pick(String(h.notes).toLowerCase(), PHASE)
    if (p) return p.name
  }
  if (typeof h.waterTempF === 'number') {
    if (h.waterTempF < 48) return 'winter'
    if (h.waterTempF >= 78) return 'summer'
  }
  return null
}

export function facetsOf(
  pattern: string,
  extra?: string | null,
  baits?: (string | { name?: string | null; type?: string | null })[] | null,
  hints?: PhaseHints | null,
): PatternFacets {
  const s = [(pattern || ''), (extra || '')].join(' ').toLowerCase()
  const place = pick(s, PLACE)
  const depth = pick(s, DEPTH)
  const scoping =
    SCOPING_TERMS.some(t => hasTerm(s, t) && !negated(s, t)) || baitsSuggestScoping(baits)
  return {
    scoping,
    phase: pick(s, PHASE)?.name ?? phaseFromHints(hints),
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
 * The heading a pattern is grouped under. Only technique and place can name a
 * pattern: they are what an angler does and where. Timing, depth and conditions
 * qualify a pattern rather than being one, so they ride along as chips.
 *
 * Falling back to those qualifiers produced headings like "Summer" and
 * "Prespawn", which are seasons rather than anything to fish, and worse, the
 * singleton-collapse then pulled genuine patterns into them — "wind blown
 * points" was correctly labelled Points, then absorbed into a "Summer" group
 * because that was all its parent had left. A report with neither a technique
 * nor a place simply does not describe a pattern, so it forms no group.
 */
export function groupLabel(f: PatternFacets): string | null {
  const parts = [techniqueLabel(f.technique), placeLabel(f.place)].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
