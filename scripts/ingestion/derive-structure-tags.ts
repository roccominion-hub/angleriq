/**
 * AnglerIQ — Structure Tag Derivation
 *
 * For each lake that has technique_report rows, aggregates all the free-text
 * `structure` field values and uses Gemini to normalise them into a canonical
 * taxonomy, then writes the result to body_of_water.structure_tags.
 *
 * Canonical tags (28 total) — see CANONICAL_TAGS below.
 *
 * Usage:
 *   npx tsx scripts/ingestion/derive-structure-tags.ts            # all lakes
 *   npx tsx scripts/ingestion/derive-structure-tags.ts --state TX # one state
 *   npx tsx scripts/ingestion/derive-structure-tags.ts --dry-run  # preview only
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GEMINI_KEY = process.env.GEMINI_API_KEY!

// ── Canonical structure taxonomy ─────────────────────────────────────────────
// 28 tags covering the full spectrum of bass-fishing structure types.
// Every free-text structure string should map to one or more of these.
export const CANONICAL_TAGS = [
  'timber',          // standing timber, flooded trees, laydowns, wood cover
  'brush',           // brush piles, stake beds, stick-ups
  'stumps',          // stump fields, stump rows
  'rock',            // chunk rock, rocky banks, boulders, gravel
  'riprap',          // riprap banks, rip-rap, rock rip-rap (man-made)
  'bluffs',          // bluff walls, vertical rock banks
  'grass',           // hydrilla, milfoil, coontail, submerged vegetation
  'pads',            // lily pads, surface vegetation mats
  'cypress',         // cypress trees, cypress knees
  'docks',           // boat docks, piers, boat lifts
  'marina',          // marinas, boat traffic areas
  'bridges',         // bridge pilings, culverts, causeways
  'dam',             // dam face, dam wall, tailwater
  'riprap',          // already listed — alias handled in normalisation
  'ledges',          // channel ledges, depth breaks, drop-offs
  'points',          // main lake points, secondary points, tapering points
  'flats',           // shallow flats, spawning flats, clay flats
  'coves',           // coves, pockets, back of creeks
  'creek_channels',  // creek channels, ditches, submerged creek beds
  'offshore',        // offshore humps, mid-lake structure, submerged islands
  'spawning_flats',  // confirmed bedding/spawning areas
  'clay',            // clay banks, clay points, red clay
  'sand',            // sandy flats, sand bars, sandy banks
  'current',         // current seams, river current, eddies
  'tributary',       // tributary mouths, creek mouths, feeder creeks
  'deep_water',      // deep open water, suspended fish zones
  'laydowns',        // fallen trees, horizontal wood cover
  'vegetation',      // generic vegetation when type unspecified
] as const

export type StructureTag = typeof CANONICAL_TAGS[number]

// De-dupe (riprap appears twice above for clarity in comments)
const TAGS_SET = [...new Set(CANONICAL_TAGS)]

// ── Gemini helper ─────────────────────────────────────────────────────────────

async function normaliseTags(rawStructures: string[]): Promise<string[]> {
  const unique = [...new Set(rawStructures.filter(Boolean))]
  if (!unique.length) return []

  const prompt = `You are classifying bass-fishing structure descriptions into a canonical taxonomy.

CANONICAL TAGS (use ONLY these exact strings):
${TAGS_SET.join(', ')}

RAW STRUCTURE DESCRIPTIONS FROM REPORTS:
${unique.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return a JSON array of canonical tags that apply to this lake based on the descriptions above.
Include a tag if ANY description mentions that type of structure.
Return ONLY the JSON array, no explanation. Example: ["timber","ledges","points","grass"]`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(20000),
      }
    )
    if (!res.ok) throw new Error(`Gemini ${res.status}`)
    const data: any = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '[]'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed: string[] = JSON.parse(cleaned)
    // Filter to only valid canonical tags
    return parsed.filter((t: string) => TAGS_SET.includes(t as any))
  } catch (e: any) {
    console.warn(`    ⚠️  Gemini error: ${e.message?.slice(0, 80)}`)
    return []
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun    = args.includes('--dry-run')
const stateFilter = args.includes('--state') ? args[args.indexOf('--state') + 1] : null

async function main() {
  console.log('\n🏷️  AnglerIQ — Structure Tag Derivation')
  console.log(`   Mode:  ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (stateFilter) console.log(`   State: ${stateFilter}`)

  // Fetch all lakes that have at least one technique report with a structure value
  const forceRetag = args.includes('--force')

  let query = supabase
    .from('body_of_water')
    .select('id, name, state, structure_tags')
    .order('state', { ascending: true })
    .order('name',  { ascending: true })

  if (stateFilter) {
    query = query.or(
      `state.eq.${stateFilter},state.ilike.${stateFilter}/%,state.ilike.%/${stateFilter}`
    )
  }

  const { data: lakes, error } = await query
  if (error || !lakes?.length) { console.error('No lakes found', error); return }

  console.log(`\n   ${lakes.length} lakes to process\n`)

  let tagged = 0, empty = 0, errors = 0

  for (const lake of lakes) {
    // Skip already-tagged lakes unless --force
    if (!forceRetag && (lake as any).structure_tags?.length > 0) {
      console.log(`  ⏭  ${lake.name} (${lake.state}) — already tagged [${(lake as any).structure_tags.join(', ')}]`)
      tagged++
      continue
    }

    // Pull all non-null structure strings for this lake
    const { data: reports } = await supabase
      .from('technique_report')
      .select('structure')
      .eq('body_of_water_id', lake.id)
      .not('structure', 'is', null)

    const rawStructures = (reports ?? [])
      .map((r: any) => r.structure?.trim()?.slice(0, 300))
      .filter(Boolean)

    if (!rawStructures.length) {
      empty++
      continue
    }

    const tags = await normaliseTags(rawStructures)

    if (!tags.length) {
      console.log(`  ⚠️  ${lake.name} (${lake.state}) — no tags derived from ${rawStructures.length} structures`)
      empty++
      continue
    }

    console.log(`  ✓  ${lake.name} (${lake.state}) → [${tags.join(', ')}]`)

    if (!dryRun) {
      const { error: updateErr } = await supabase
        .from('body_of_water')
        .update({ structure_tags: tags })
        .eq('id', lake.id)

      if (updateErr) {
        console.warn(`    ❌ Update failed: ${updateErr.message}`)
        errors++
        continue
      }
    }

    tagged++
    // 3s delay — stay comfortably under Gemini 2.5 Flash rate limits
    await new Promise(r => setTimeout(r, 3000))
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Done — ${tagged} lakes tagged, ${empty} skipped (no structure data), ${errors} errors`)
  if (dryRun) console.log('   DRY RUN — no writes made')
}

main().catch(e => { console.error(e); process.exit(1) })
