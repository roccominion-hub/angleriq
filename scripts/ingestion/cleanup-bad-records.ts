/**
 * AnglerIQ — DB Cleanup
 * Deletes technique_reports containing non-bass species or non-artificial bait references.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const BAD_TERMS = [
  // Species
  'carp', 'catfish', 'channel cat', 'flathead', 'crappie', 'white bass',
  'striper', 'striped bass', 'perch', 'walleye', 'drum', 'gar',
  // Baits
  'nightcrawler', 'cut bait', 'cutbait', 'stink bait', 'stinkbait',
  'cricket', 'chicken liver', 'dough bait', 'doughbait', 'blood bait',
  'soap bait', 'liver', 'live shad', 'live bait', 'live worm',
  'dead shad', 'natural bait', 'fresh shad', 'shiner', 'minnow',
]

async function main() {
  // Fetch all reports with their text fields
  const { data: reports, error } = await sb
    .from('technique_report')
    .select('id, pattern, presentation, notes, structure')

  if (error) throw error
  console.log(`Loaded ${reports!.length} technique reports`)

  const toDelete: string[] = []

  for (const r of reports!) {
    const text = [r.pattern, r.presentation, r.notes, r.structure]
      .filter(Boolean).join(' ').toLowerCase()

    if (BAD_TERMS.some(term => text.includes(term))) {
      toDelete.push(r.id)
      console.log(`  🗑  [${r.id.slice(0,8)}] "${r.pattern || r.presentation || r.notes?.slice(0,60)}"`)
    }
  }

  console.log(`\nFound ${toDelete.length} bad records to delete`)

  if (toDelete.length === 0) { console.log('Nothing to delete.'); return }

  // Also delete related bait_used records first (FK constraint)
  // Get tournament_result_ids linked to these reports
  const { data: linked } = await sb
    .from('technique_report')
    .select('id, tournament_result_id')
    .in('id', toDelete)

  const trIds = linked!.map(r => r.tournament_result_id).filter(Boolean)

  // Delete bait_used records tied to these technique_reports via tournament_result
  if (trIds.length > 0) {
    const { error: baitErr } = await sb.from('bait_used').delete().in('tournament_result_id', trIds)
    if (baitErr) console.warn('bait_used delete warning:', baitErr.message)
    else console.log(`✓ Deleted bait_used records for ${trIds.length} tournament results`)
  }

  // Delete the technique_reports
  const { error: delErr } = await sb.from('technique_report').delete().in('id', toDelete)
  if (delErr) throw delErr

  console.log(`\n✅ Deleted ${toDelete.length} bad technique reports`)
}

main().catch(e => { console.error(e); process.exit(1) })
