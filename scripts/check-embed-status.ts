import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fetch all rows from a table with a single column, paginating past the 1000-row default cap
async function fetchAllIds(table: string, column: string): Promise<string[]> {
  const PAGE = 1000
  const results: string[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .range(from, from + PAGE - 1)
    if (error) { console.error(`Error fetching ${table}:`, error.message); break }
    if (!data || data.length === 0) break
    results.push(...data.map((r: any) => r[column]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return results
}

async function main() {
  const [{ data: lakes }, reportIds, embeddingIds] = await Promise.all([
    supabase.from('body_of_water').select('id, name, state').order('state').order('name'),
    fetchAllIds('technique_report', 'body_of_water_id'),
    fetchAllIds('technique_embeddings', 'body_of_water_id'),
  ])

  const reports: Record<string, number> = {}
  for (const id of reportIds) {
    reports[id] = (reports[id] ?? 0) + 1
  }

  const embedded: Record<string, number> = {}
  for (const id of embeddingIds) {
    embedded[id] = (embedded[id] ?? 0) + 1
  }

  let totalReports = 0, totalEmbedded = 0
  const withGap: { state: string; name: string; reports: number; embedded: number; gap: number }[] = []
  const complete: { state: string; name: string; reports: number; embedded: number }[] = []
  const noReports: { name: string; state: string }[] = []

  for (const lake of lakes?.data ?? lakes ?? []) {
    const r = reports[lake.id] ?? 0
    const e = embedded[lake.id] ?? 0
    totalReports += r
    totalEmbedded += e

    if (r === 0 && e === 0) {
      noReports.push(lake)
    } else if (r - e > 0) {
      withGap.push({ state: lake.state, name: lake.name, reports: r, embedded: e, gap: r - e })
    } else {
      complete.push({ state: lake.state, name: lake.name, reports: r, embedded: e })
    }
  }

  withGap.sort((a, b) => b.gap - a.gap)

  console.log(`\n${'═'.repeat(66)}`)
  console.log(`  EMBEDDING STATUS`)
  console.log(`${'═'.repeat(66)}`)
  console.log(`  Total technique reports : ${totalReports}`)
  console.log(`  Total embedded          : ${totalEmbedded}`)
  console.log(`  Unembedded              : ${totalReports - totalEmbedded}`)
  console.log(`  Coverage                : ${totalReports > 0 ? ((totalEmbedded / totalReports) * 100).toFixed(1) : '0.0'}%`)
  console.log(`${'═'.repeat(66)}\n`)

  if (withGap.length) {
    console.log(`  ⚠️  LAKES WITH UNEMBEDDED REPORTS (${withGap.length})\n`)
    console.log(`  ${'Lake'.padEnd(36)} ${'St'.padEnd(4)} ${'Reports'.padStart(7)} ${'Embedded'.padStart(9)} ${'Gap'.padStart(5)}`)
    console.log(`  ${'-'.repeat(62)}`)
    for (const r of withGap) {
      console.log(`  ${r.name.padEnd(36)} ${r.state.padEnd(4)} ${String(r.reports).padStart(7)} ${String(r.embedded).padStart(9)} ${String(r.gap).padStart(5)}`)
    }
    console.log()
  }

  console.log(`  ✅ FULLY EMBEDDED LAKES (${complete.length})\n`)
  console.log(`  ${'Lake'.padEnd(36)} ${'St'.padEnd(4)} ${'Reports'.padStart(7)} ${'Embedded'.padStart(9)}`)
  console.log(`  ${'-'.repeat(58)}`)
  for (const r of complete) {
    console.log(`  ${r.name.padEnd(36)} ${r.state.padEnd(4)} ${String(r.reports).padStart(7)} ${String(r.embedded).padStart(9)}`)
  }

  if (noReports.length) {
    console.log(`\n  ○ NO REPORTS YET (${noReports.length} lakes)\n`)
    for (const l of noReports) {
      console.log(`    ${l.name} (${l.state})`)
    }
  }

  console.log(`\n${'═'.repeat(66)}\n`)
}

main().catch(console.error)
