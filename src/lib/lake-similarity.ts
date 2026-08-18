/**
 * AnglerIQ — Matching lakes by physical character
 *
 * Answers "what works on waters like this one", which matters most on the lakes
 * that have too little report data to answer it themselves.
 *
 * Lakes are matched on a PHYSICAL signature derived from stored channel
 * geometry, never on their own reports. A report-derived profile would be
 * circular: the lakes most in need of borrowed patterns are exactly those with
 * no reports to profile. Channel geometry is available for 410 of 415 lakes,
 * including 117 of the 118 with thin report coverage.
 */

export type LakeSignature = {
  channelKm: number | null       // total channel length — a size proxy
  dendriticRatio: number | null  // minor/main — how cove-riddled the lake is
  inletCount: number | null      // tributary richness
  type: string | null            // reservoir vs natural lake
}

export type ScopeName = 'local' | 'nearby' | 'state' | 'region' | 'national'

// Regions are fishery-shaped rather than census-shaped: waters inside one
// behave alike enough that a pattern has a fair chance of transferring.
export const REGIONS: Record<string, string[]> = {
  'South Central': ['TX', 'OK', 'LA', 'AR'],
  'Southeast':     ['AL', 'GA', 'FL', 'MS', 'SC', 'NC', 'TN', 'VA', 'KY', 'WV'],
  'Midwest':       ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE'],
  'Northeast':     ['NY', 'PA', 'VT', 'NH', 'ME', 'MA', 'CT', 'NJ', 'MD', 'DE'],
  'West':          ['CA', 'AZ', 'NV', 'OR', 'WA', 'ID', 'UT', 'CO', 'NM', 'MT', 'WY'],
}

export const firstState = (s: string | null | undefined) => (s || '').split('/')[0].trim()

export function regionOf(state: string | null | undefined): string {
  const st = firstState(state)
  for (const [region, states] of Object.entries(REGIONS)) if (states.includes(st)) return region
  return 'Other'
}

const R_MI = 3959
export function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const p = Math.PI / 180
  const x = Math.sin((bLat - aLat) * p / 2) ** 2 +
    Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin((bLng - aLng) * p / 2) ** 2
  return 2 * R_MI * Math.asin(Math.sqrt(x))
}

/**
 * 0..1 physical similarity. Size is compared on a log scale so a 10 km lake and
 * a 100 km lake are not "close"; dendritic ratio and inlet count carry the
 * character of the water beyond raw size.
 */
export function similarity(a: LakeSignature, b: LakeSignature): number {
  if (a.channelKm == null || b.channelKm == null) return 0
  const sizeDiff = Math.abs(Math.log10(Math.max(a.channelKm, 1)) - Math.log10(Math.max(b.channelKm, 1)))
  const sizeSim = Math.max(0, 1 - sizeDiff / 1.2)

  const ad = Math.min(a.dendriticRatio ?? 1, 6), bd = Math.min(b.dendriticRatio ?? 1, 6)
  const dendSim = Math.max(0, 1 - Math.abs(ad - bd) / 4)

  const ai = Math.log10((a.inletCount ?? 0) + 1), bi = Math.log10((b.inletCount ?? 0) + 1)
  const inletSim = Math.max(0, 1 - Math.abs(ai - bi) / 1.5)

  const typeSim = a.type && b.type ? (a.type === b.type ? 1 : 0.75) : 0.9

  return 0.4 * sizeSim + 0.3 * dendSim + 0.2 * inletSim + 0.1 * typeSim
}

/**
 * Seasons, with the spawn stages that occur inside them.
 *
 * Nesting the stages under their season makes a contradictory selection
 * impossible to express: there is no path to "winter + spawn", because no spawn
 * stage is offered under winter. Postspawn appears under both spring and summer
 * — it runs into early summer, further north especially — which is the only
 * place the calendar genuinely overlaps.
 *
 * The stages are worth keeping selectable rather than collapsing into "spring":
 * they are the majority of the timing data we hold, and prespawn and spawn fish
 * differently enough to lead to different water (rock and timber against grass
 * and flats).
 */
export const SEASONS: { value: string; label: string; stages: string[] }[] = [
  { value: 'spring', label: 'Spring', stages: ['prespawn', 'spawn', 'postspawn'] },
  { value: 'summer', label: 'Summer', stages: ['postspawn'] },
  { value: 'fall',   label: 'Fall',   stages: [] },
  { value: 'winter', label: 'Winter', stages: [] },
]

export const STAGE_LABEL: Record<string, string> = {
  prespawn: 'Prespawn', spawn: 'Spawn', postspawn: 'Postspawn',
}

/** Phases counted for a season when every stage is in play. */
export const PHASES_IN_SEASON: Record<string, string[]> = Object.fromEntries(
  SEASONS.map(s => [s.value, [s.value, ...s.stages]])
)

export function seasonFromDate(d = new Date()): 'spring' | 'summer' | 'fall' | 'winter' {
  const m = d.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'fall'
  return 'winter'
}

export const SCOPES: { name: ScopeName; label: string; miles?: number }[] = [
  { name: 'local',    label: 'Within 50 mi',  miles: 50 },
  { name: 'nearby',   label: 'Within 150 mi', miles: 150 },
  { name: 'state',    label: 'Statewide' },
  { name: 'region',   label: 'Region' },
  { name: 'national', label: 'Nationwide' },
]

/** Lakes are only worth comparing above this similarity. */
export const MIN_SIMILARITY = 0.65
