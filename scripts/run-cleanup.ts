import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  console.log('\n🧹 AnglerIQ DB Cleanup — removing non-bass/non-artificial records\n')

  // ── 1. Find bad technique_report IDs via bait_used ──────────────────────

  const BAD_BAIT_TERMS = ['corn', 'nightcrawler', 'night crawler', 'chicken liver', 'cut bait', 'stink bait', 'cricket', 'dough bait', 'blood bait', 'soap bait', 'wax worm', 'spawn sac', 'fish eggs']
  const BAD_SPECIES_TERMS = ['trout', 'catfish', 'crappie', 'walleye', 'carp', 'salmon', 'panfish', 'bluegill', 'perch']
  const BAD_CONTEXT_TERMS = ['below the dam', 'tailwater', 'fly fish', 'live bait', 'live shad']

  // Get all bait_used rows and filter client-side (Supabase JS doesn't support ILIKE OR chains easily)
  const { data: allBaits } = await supabase
    .from('bait_used')
    .select('id, technique_report_id, bait_name, bait_type')

  const badReportIds = new Set<string>()

  for (const b of allBaits || []) {
    const text = `${b.bait_name || ''} ${b.bait_type || ''}`.toLowerCase()
    if (BAD_BAIT_TERMS.some(t => text.includes(t))) {
      badReportIds.add(b.technique_report_id)
    }
  }

  // Also check technique_report pattern/notes/presentation
  const { data: allReports } = await supabase
    .from('technique_report')
    .select('id, pattern, presentation, notes')

  for (const r of allReports || []) {
    const text = `${r.pattern || ''} ${r.presentation || ''} ${r.notes || ''}`.toLowerCase()
    if (
      BAD_SPECIES_TERMS.some(t => text.includes(t)) ||
      BAD_BAIT_TERMS.some(t => text.includes(t)) ||
      BAD_CONTEXT_TERMS.some(t => text.includes(t))
    ) {
      badReportIds.add(r.id)
    }
  }

  console.log(`Found ${badReportIds.size} bad technique_report(s) to remove`)

  if (badReportIds.size > 0) {
    const ids = Array.from(badReportIds)
    // Delete bait_used first (FK)
    await supabase.from('bait_used').delete().in('technique_report_id', ids)
    // Delete conditions (FK)
    await supabase.from('conditions').delete().in('technique_report_id', ids)
    // Delete technique_report
    const { error } = await supabase.from('technique_report').delete().in('id', ids)
    if (error) console.error('Error deleting reports:', error.message)
    else console.log(`✅ Deleted ${ids.length} technique_report(s)`)
  }

  // ── 2. Clean bad RAG embeddings ──────────────────────────────────────────

  const { data: allEmbeddings } = await supabase
    .from('technique_embeddings')
    .select('id, content')

  const BAD_EMBEDDING_TERMS = [
    ...BAD_BAIT_TERMS,
    ...BAD_SPECIES_TERMS,
    'below the dam', 'tailwater', 'fly fish', 'live bait',
    'live shad', 'panfish', 'sunfish',
  ]

  const badEmbeddingIds: string[] = []
  for (const e of allEmbeddings || []) {
    const text = (e.content || '').toLowerCase()
    if (BAD_EMBEDDING_TERMS.some(t => text.includes(t))) {
      badEmbeddingIds.push(e.id)
    }
  }

  console.log(`\nFound ${badEmbeddingIds.length} bad technique_embedding(s) to remove`)

  if (badEmbeddingIds.length > 0) {
    const { error } = await supabase
      .from('technique_embeddings')
      .delete()
      .in('id', badEmbeddingIds)
    if (error) console.error('Error deleting embeddings:', error.message)
    else console.log(`✅ Deleted ${badEmbeddingIds.length} embedding(s)`)
  }

  // ── 3. Summary ───────────────────────────────────────────────────────────

  const { count: reportCount } = await supabase
    .from('technique_report')
    .select('*', { count: 'exact', head: true })

  const { count: embeddingCount } = await supabase
    .from('technique_embeddings')
    .select('*', { count: 'exact', head: true })

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Cleanup complete`)
  console.log(`   technique_report remaining:   ${reportCount}`)
  console.log(`   technique_embeddings remaining: ${embeddingCount}`)
}

main().catch(console.error)
