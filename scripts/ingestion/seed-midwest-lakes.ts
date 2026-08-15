/**
 * AnglerIQ — Upper Midwest / Plains lake seeder
 *
 * Adds marquee bass fisheries for KS, NE, IA, MN, WI into body_of_water.
 *
 * Unlike the earlier seeders, coordinates are NOT hard-coded — each lake is
 * geocoded against OSM and only inserted when a water feature is found in the
 * expected state. Hand-entered coordinates were the source of several
 * mislocated lakes (a pin on the wrong reservoir entirely), so the geocode is
 * the source of truth and anything unresolved is reported rather than guessed.
 *
 * Dedupes by name+state. Same-named lakes in different states are distinct
 * fisheries (Clinton Lake KS vs IL, Wilson Lake KS vs AL) and are all kept —
 * the app resolves lakes by id, so duplicate names are unambiguous.
 *
 * Usage:
 *   npx tsx scripts/ingestion/seed-midwest-lakes.ts --dry-run   # verify only
 *   npx tsx scripts/ingestion/seed-midwest-lakes.ts             # insert
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LM = 'largemouth bass', SM = 'smallmouth bass', ST = 'striped bass',
      WB = 'white bass', CR = 'crappie', MU = 'muskie', WE = 'walleye'

type Cand = { name: string; state: string; type: string; species: string[]; county?: string }

const CANDIDATES: Cand[] = [
  // ── Kansas ────────────────────────────────────────────────────────────────
  { name: 'Milford Lake',          state: 'KS', type: 'reservoir', species: [LM, WB, WE, CR] },
  { name: 'Tuttle Creek Lake',     state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'Perry Lake',            state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'Clinton Lake',          state: 'KS', type: 'reservoir', species: [LM, WB, CR], county: 'Douglas County' },
  { name: 'Melvern Lake',          state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'El Dorado Lake',        state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'Cheney Reservoir',      state: 'KS', type: 'reservoir', species: [LM, WB, WE] },
  { name: 'Wilson Lake',           state: 'KS', type: 'reservoir', species: [SM, LM, WB], county: 'Russell County' },
  { name: 'Hillsdale Lake',        state: 'KS', type: 'reservoir', species: [LM, CR] },
  { name: 'Council Grove Lake',    state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'John Redmond Reservoir',state: 'KS', type: 'reservoir', species: [LM, WB, CR] },
  { name: 'Pomona Lake',           state: 'KS', type: 'reservoir', species: [LM, CR] },

  // ── Nebraska ──────────────────────────────────────────────────────────────
  { name: 'Lake McConaughy',       state: 'NE', type: 'reservoir', species: [LM, SM, WE, WB] },
  { name: 'Harlan County Lake',    state: 'NE', type: 'reservoir', species: [LM, WE, WB, CR] },
  { name: 'Sherman Reservoir',     state: 'NE', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Calamus Reservoir',     state: 'NE', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Merritt Reservoir',     state: 'NE', type: 'reservoir', species: [LM, SM, WE] },
  { name: 'Branched Oak Lake',     state: 'NE', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Pawnee Lake',           state: 'NE', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Swanson Reservoir',     state: 'NE', type: 'reservoir', species: [LM, WE, WB] },
  { name: 'Hugh Butler Lake',      state: 'NE', type: 'reservoir', species: [LM, WE, WB], county: 'Frontier County' },  // locally "Red Willow Reservoir"
  { name: 'Elwood Reservoir',      state: 'NE', type: 'reservoir', species: [LM, WE] },
  { name: 'Lake Minatare',         state: 'NE', type: 'reservoir', species: [LM, WE, CR] },

  // ── Iowa ──────────────────────────────────────────────────────────────────
  { name: 'Rathbun Lake',          state: 'IA', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Saylorville Lake',      state: 'IA', type: 'reservoir', species: [LM, WE, WB, CR] },
  { name: 'Lake Red Rock',         state: 'IA', type: 'reservoir', species: [LM, WE, WB, CR] },
  { name: 'Big Creek Lake',        state: 'IA', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Coralville Lake',       state: 'IA', type: 'reservoir', species: [LM, WE, CR] },
  { name: 'Clear Lake',            state: 'IA', type: 'lake', species: [LM, WE, MU, CR], county: 'Cerro Gordo County' },
  { name: 'Spirit Lake',           state: 'IA', type: 'lake', species: [LM, SM, WE, MU], county: 'Dickinson County' },
  { name: 'West Okoboji Lake',     state: 'IA', type: 'lake', species: [LM, SM, WE, MU] },
  { name: 'East Okoboji Lake',     state: 'IA', type: 'lake', species: [LM, WE, CR] },
  { name: 'Storm Lake',            state: 'IA', type: 'lake', species: [LM, WE, WB] },

  // ── Minnesota ─────────────────────────────────────────────────────────────
  { name: 'Lake Minnetonka',       state: 'MN', type: 'lake', species: [LM, SM, MU, WE] },
  { name: 'Mille Lacs Lake',       state: 'MN', type: 'lake', species: [SM, WE, MU] },
  { name: 'Leech Lake',            state: 'MN', type: 'lake', species: [SM, LM, WE, MU] },
  { name: 'Lake Vermilion',        state: 'MN', type: 'lake', species: [SM, LM, WE, MU] },
  { name: 'Lake Winnibigoshish',   state: 'MN', type: 'lake', species: [SM, WE, MU] },
  { name: 'Gull Lake',             state: 'MN', type: 'lake', species: [LM, SM, WE], county: 'Cass County' },
  { name: 'Otter Tail Lake',       state: 'MN', type: 'lake', species: [LM, WE, MU] },
  { name: 'Lake Waconia',          state: 'MN', type: 'lake', species: [LM, WE, MU] },
  { name: 'Cass Lake',             state: 'MN', type: 'lake', species: [SM, WE, MU] },
  { name: 'Big Stone Lake',        state: 'MN', type: 'lake', species: [LM, WE] },
  { name: 'Upper Prior Lake',      state: 'MN', type: 'lake', species: [LM, CR], county: 'Scott County' },

  // ── Wisconsin ─────────────────────────────────────────────────────────────
  { name: 'Lake Winnebago',        state: 'WI', type: 'lake', species: [LM, SM, WE, MU] },
  { name: 'Chippewa Flowage',      state: 'WI', type: 'reservoir', species: [LM, SM, MU, WE] },
  { name: 'Petenwell Lake',        state: 'WI', type: 'reservoir', species: [LM, WE, MU] },
  { name: 'Castle Rock Lake',      state: 'WI', type: 'reservoir', species: [LM, WE, MU] },
  { name: 'Lake Wissota',          state: 'WI', type: 'reservoir', species: [LM, SM, WE, MU] },
  { name: 'Green Lake',            state: 'WI', type: 'lake', species: [LM, SM, WE], county: 'Green Lake County' },
  { name: 'Geneva Lake',           state: 'WI', type: 'lake', species: [LM, SM], county: 'Walworth County' },
  { name: 'Lake Mendota',          state: 'WI', type: 'lake', species: [LM, SM, WE, MU] },
  { name: 'Lake Monona',           state: 'WI', type: 'lake', species: [LM, SM, WE] },
  { name: 'Pewaukee Lake',         state: 'WI', type: 'lake', species: [LM, SM, MU] },
  { name: 'Turtle-Flambeau Flowage',state: 'WI', type: 'reservoir', species: [LM, SM, MU, WE] },
  { name: 'Lac Courte Oreilles',   state: 'WI', type: 'lake', species: [LM, SM, MU, WE] },
]

const STATE_NAME: Record<string, string> = {
  KS: 'Kansas', NE: 'Nebraska', IA: 'Iowa', MN: 'Minnesota', WI: 'Wisconsin',
}

const UA = { 'User-Agent': 'AnglerIQ/1.0 (angleriq.app)' }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// A geocode result only counts when it is a water feature inside the expected
// state — this is what stops a same-named lake in another state being adopted.
async function geocode(c: Cand): Promise<{ lat: number; lng: number; label: string } | null> {
  const stFull = STATE_NAME[c.state] ?? c.state
  const queries = [
    `${c.name}, ${c.county ? c.county + ', ' : ''}${stFull}, USA`,
    `${c.name}, ${stFull}, USA`,
  ]
  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=5&countrycodes=us`
      const res = await fetch(url, { headers: UA })
      const rows = (await res.json()) as any[]
      await sleep(1100)
      if (!Array.isArray(rows)) continue
      const hit = rows.find(r =>
        new RegExp(stFull, 'i').test(r.display_name) &&
        /water|reservoir|lake|bay|flowage|stream/i.test(`${r.type} ${r.category} ${r.class ?? ''}`)
      )
      if (hit) return { lat: +(+hit.lat).toFixed(4), lng: +(+hit.lon).toFixed(4), label: String(hit.display_name).slice(0, 58) }
    } catch { /* try next query form */ }
    await sleep(300)
  }
  return null
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\n🎣 Seeding Midwest/Plains lakes — ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   ${CANDIDATES.length} candidates across KS, NE, IA, MN, WI\n`)

  let inserted = 0, skipped = 0, unresolved = 0
  const misses: string[] = []

  for (const c of CANDIDATES) {
    // Dedupe on name AND state — same-named lakes in different states are
    // distinct fisheries (Clinton Lake KS vs IL, Wilson Lake KS vs AL), and the
    // app resolves lakes by id, so duplicate names across states are safe.
    const { data: existing } = await supabase
      .from('body_of_water')
      .select('id, state')
      .ilike('name', c.name)
      .eq('state', c.state)
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log(`  ⏭  ${c.name} (${c.state}) — already present`)
      skipped++
      continue
    }

    const g = await geocode(c)
    if (!g) {
      console.log(`  ❓ ${c.name} (${c.state}) — no in-state water match, NOT seeded`)
      misses.push(`${c.name} (${c.state})`)
      unresolved++
      continue
    }

    console.log(`  ✓  ${c.name} (${c.state}) → ${g.lat},${g.lng}  [${g.label}]`)
    if (!dryRun) {
      const { error } = await supabase.from('body_of_water').insert({
        name: c.name, state: c.state, type: c.type,
        lat: g.lat, lng: g.lng, species: c.species,
      })
      if (error) { console.error(`     ✗ insert failed: ${error.message}`); continue }
    }
    inserted++
  }

  console.log(`\n${'─'.repeat(58)}`)
  console.log(`${dryRun ? 'Would insert' : '✅ Inserted'} ${inserted}, skipped ${skipped}, unresolved ${unresolved}`)
  if (misses.length) console.log(`\nUnresolved (need manual coords):\n  ${misses.join('\n  ')}`)
  if (!dryRun && inserted) {
    console.log(`\nNext: npx tsx scripts/ingestion/compute-lake-channels.ts --missing`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
