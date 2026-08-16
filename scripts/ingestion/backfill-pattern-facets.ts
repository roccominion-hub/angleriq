/**
 * AnglerIQ — Backfill canonical pattern facets
 *
 * Classifies every technique_report.pattern into the controlled facets in
 * src/lib/pattern-facets.ts. Purely local rules — no LLM calls — so this is
 * free, fast, and safe to re-run whenever the vocabulary is tuned.
 *
 * The original prose in `pattern` is never modified; facets are additive.
 *
 * Usage:
 *   npx tsx scripts/ingestion/backfill-pattern-facets.ts --dry-run
 *   npx tsx scripts/ingestion/backfill-pattern-facets.ts
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { facetsOf, groupLabel } from '../../src/lib/pattern-facets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REF = 'qotpyszkdzjxqrlzlosw'
const MGMT = process.env.SUPABASE_ACCESS_TOKEN!
const CHUNK = 400

const sqlStr = (v: string | null) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`)

async function runSql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MGMT}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({ query }),
  })
  const body = await res.json() as any
  if (!res.ok || body?.message) throw new Error(body?.message ?? `HTTP ${res.status}`)
  return body
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\n🏷️  Backfilling pattern facets — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('technique_report').select('id, pattern')
      .not('pattern', 'is', null).order('id').range(from, from + 999)
    if (error) { console.error(error.message); return }
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  console.log(`  ${rows.length} reports with a pattern`)

  const updates = rows.map(r => ({ id: r.id, f: facetsOf(r.pattern), label: groupLabel(facetsOf(r.pattern)) }))
  const matched = updates.filter(u => u.label).length
  const groups: Record<string, number> = {}
  for (const u of updates) if (u.label) groups[u.label] = (groups[u.label] || 0) + 1

  console.log(`  ${matched} classified (${(100 * matched / rows.length).toFixed(1)}%), ${rows.length - matched} left unfaceted`)
  console.log(`  ${Object.keys(groups).length} distinct group labels\n`)
  console.log('  TOP GROUPS:')
  Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([l, c]) => console.log(`    ${String(c).padStart(4)}  ${l}`))

  if (dryRun) { console.log('\n(dry run — nothing written)'); return }

  let done = 0
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    const values = chunk.map(u =>
      `('${u.id}'::uuid, ${sqlStr(u.f.phase)}, ${sqlStr(u.f.technique)}, ${sqlStr(u.f.place)}, ${sqlStr(u.f.depth)}, ${sqlStr(u.f.condition)})`
    ).join(',\n      ')
    const sql = `
      UPDATE technique_report t SET
        pattern_phase = v.phase, pattern_technique = v.technique,
        pattern_place = v.place, pattern_depth = v.depth, pattern_condition = v.condition
      FROM (VALUES
      ${values}
      ) AS v(id, phase, technique, place, depth, condition)
      WHERE t.id = v.id;`
    await runSql(sql)
    done += chunk.length
    process.stdout.write(`\r  updated ${done}/${updates.length}`)
  }

  console.log(`\n\n${'─'.repeat(52)}\n✅ Backfilled ${done} reports`)
}

main().catch(e => { console.error(e); process.exit(1) })
