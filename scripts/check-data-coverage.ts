import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Get all lakes with their state
  const { data: lakes } = await supabase
    .from('body_of_water')
    .select('id, name, state')
    .order('state').order('name')

  // Get report counts per lake (paginated)
  const allReportRows: { body_of_water_id: string }[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('technique_report')
      .select('body_of_water_id')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    allReportRows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  // Get queue entries per lake
  const { data: queueRows } = await supabase
    .from('ingest_queue')
    .select('body_of_water_id, status, raw_text')

  // Get rawText knowledge base entries
  const { data: rawTextRows } = await supabase
    .from('body_of_water')
    .select('id, raw_text')

  const reportCount: Record<string, number> = {}
  for (const r of allReportRows) {
    reportCount[r.body_of_water_id] = (reportCount[r.body_of_water_id] ?? 0) + 1
  }

  const queueByLake: Record<string, { total: number; done: number; pending: number; failed: number }> = {}
  for (const q of queueRows ?? []) {
    if (!queueByLake[q.body_of_water_id]) queueByLake[q.body_of_water_id] = { total: 0, done: 0, pending: 0, failed: 0 }
    queueByLake[q.body_of_water_id].total++
    if (q.status === 'done') queueByLake[q.body_of_water_id].done++
    else if (q.status === 'failed') queueByLake[q.body_of_water_id].failed++
    else queueByLake[q.body_of_water_id].pending++
  }

  const rawTextById: Record<string, boolean> = {}
  for (const r of rawTextRows ?? []) {
    rawTextById[r.id] = !!(r.raw_text && r.raw_text.length > 100)
  }

  // Group by state
  const byState: Record<string, typeof lakes> = {}
  for (const lake of lakes ?? []) {
    if (!byState[lake.state]) byState[lake.state] = []
    byState[lake.state]!.push(lake)
  }

  for (const state of Object.keys(byState).sort()) {
    const stateLakes = byState[state]!
    console.log(`\n${'═'.repeat(72)}`)
    console.log(`  ${state} LAKES (${stateLakes.length})`)
    console.log(`${'═'.repeat(72)}`)
    console.log(`  ${'Lake'.padEnd(38)} ${'Reports'.padStart(7)} ${'Queue'.padStart(6)} ${'Raw'.padStart(4)}`)
    console.log(`  ${'-'.repeat(57)}`)

    const noData = stateLakes.filter(l => !reportCount[l.id] && !queueByLake[l.id] && !rawTextById[l.id])
    const hasData = stateLakes.filter(l => reportCount[l.id] || queueByLake[l.id] || rawTextById[l.id])

    for (const lake of hasData) {
      const r = reportCount[lake.id] ?? 0
      const q = queueByLake[lake.id]
      const hasRaw = rawTextById[lake.id] ? '✓' : ' '
      const qStr = q ? `${q.done}/${q.total}` : '—'
      const flag = r === 0 ? ' ⚠️' : ''
      console.log(`  ${lake.name.padEnd(38)} ${String(r).padStart(7)} ${qStr.padStart(6)} ${hasRaw.padStart(4)}${flag}`)
    }

    if (noData.length) {
      console.log(`\n  ○ NO DATA / NO QUEUE (${noData.length}):`)
      for (const l of noData) console.log(`    ${l.name}`)
    }
  }

  // Summary
  const okLakes = (lakes ?? []).filter(l => l.state === 'OK')
  const txLakes = (lakes ?? []).filter(l => l.state === 'TX')
  const okNoData = okLakes.filter(l => !reportCount[l.id])
  const txNoData = txLakes.filter(l => !reportCount[l.id])

  console.log(`\n${'═'.repeat(72)}`)
  console.log(`  SUMMARY`)
  console.log(`${'═'.repeat(72)}`)
  console.log(`  TX: ${txLakes.length} lakes — ${txLakes.length - txNoData.length} with reports, ${txNoData.length} with zero`)
  console.log(`  OK: ${okLakes.length} lakes — ${okLakes.length - okNoData.length} with reports, ${okNoData.length} with zero`)
  console.log(`${'═'.repeat(72)}\n`)
}

main().catch(console.error)
