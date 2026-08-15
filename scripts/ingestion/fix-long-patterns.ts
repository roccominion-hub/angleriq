/**
 * AnglerIQ — Condense over-long technique_report.pattern values
 *
 * `pattern` is rendered as a one-line "Winning Patterns" label, but some
 * extraction runs wrote a full narrative paragraph into it (Lake Houston's
 * averaged 267 chars against a 39-char global average, rendering as 9–12 line
 * blurbs). This keeps the first sentence as the label and preserves the full
 * original text in `notes`, so nothing is lost.
 *
 * The extractor now enforces the same rule at ingest time
 * (extract-fishing-data.ts); this repairs rows written before that.
 *
 * Usage:
 *   npx tsx scripts/ingestion/fix-long-patterns.ts --dry-run
 *   npx tsx scripts/ingestion/fix-long-patterns.ts
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'
import { condenseLabel, PATTERN_MAX } from './extract-fishing-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function condense(pattern: string, notes: string | null) {
  const p = pattern.trim()
  const label = condenseLabel(p)
  const keptNotes = notes && notes.includes(p.slice(0, 40))
    ? notes
    : [p, notes].filter(Boolean).join(' — ')
  return { label, notes: keptNotes }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\n✂️  Condensing long patterns — ${dryRun ? 'DRY RUN' : 'LIVE'} (max ${PATTERN_MAX} chars)\n`)

  // PostgREST has no length() filter and caps rows per request, so page through
  // everything and measure locally.
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('technique_report')
      .select('id, pattern, notes')
      .not('pattern', 'is', null)
      .order('id')
      .range(from, from + 999)
    if (error) { console.error(error.message); return }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const long = rows.filter(r => (r.pattern as string).length > PATTERN_MAX)
  console.log(`  ${long.length} of ${rows.length} reports exceed ${PATTERN_MAX} chars\n`)

  let done = 0
  for (const r of long) {
    const { label, notes } = condense(r.pattern as string, r.notes as string | null)
    if (done < 5) {
      console.log(`  ${(r.pattern as string).length} → ${label.length} chars`)
      console.log(`     "${label}"`)
    }
    if (!dryRun) {
      const { error: e } = await supabase
        .from('technique_report')
        .update({ pattern: label, notes })
        .eq('id', r.id)
      if (e) { console.error(`     ✗ ${r.id}: ${e.message}`); continue }
    }
    done++
  }

  if (long.length > 5) console.log(`  … and ${long.length - 5} more`)
  console.log(`\n${'─'.repeat(52)}`)
  console.log(`${dryRun ? 'Would update' : '✅ Updated'} ${done} report(s)`)
}

main().catch(e => { console.error(e); process.exit(1) })
