/**
 * AnglerIQ — Precompute each lake's physical signature
 *
 * Derives channel length, dendritic ratio and inlet count from stored channel
 * geometry onto body_of_water, so cross-lake matching can compare 415 lakes
 * from a light query instead of loading every channel geometry per request.
 *
 * Re-runnable; run after compute-lake-channels changes a lake's geometry.
 *
 * Usage:
 *   npx tsx scripts/ingestion/backfill-lake-signatures.ts --dry-run
 *   npx tsx scripts/ingestion/backfill-lake-signatures.ts
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const REF = 'qotpyszkdzjxqrlzlosw'
const MGMT = process.env.SUPABASE_ACCESS_TOKEN!

const R = 6371
const km = (a: number, b: number, c: number, d: number) => {
  const p = Math.PI / 180
  const x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
const segKm = (s: number[][]) => {
  let t = 0
  for (let i = 0; i < s.length - 1; i++) t += km(s[i][1], s[i][0], s[i + 1][1], s[i + 1][0])
  return t
}

async function runSql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json', 'User-Agent': 'curl/8.4.0' },
    body: JSON.stringify({ query }),
  })
  const body = await res.json() as any
  if (!res.ok || body?.message) throw new Error(body?.message ?? `HTTP ${res.status}`)
  return body
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`\n📐 Lake signatures — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  const chan: any[] = []
  for (let f = 0; ; f += 200) {
    const { data, error } = await supabase.from('lake_channels')
      .select('lake_id, main_channel, minor_channels, junctions').range(f, f + 199)
    if (error) { console.error(error.message); return }
    chan.push(...(data ?? [])); if (!data || data.length < 200) break
  }
  console.log(`  ${chan.length} lakes with channel geometry`)

  const rows = chan.map(c => {
    const main = (c.main_channel ?? []) as number[][][]
    const minor = (c.minor_channels ?? []) as number[][][]
    const mainKm = main.reduce((s, x) => s + segKm(x), 0)
    const minorKm = minor.reduce((s, x) => s + segKm(x), 0)
    const total = mainKm + minorKm
    return {
      id: c.lake_id,
      channelKm: +total.toFixed(2),
      dendritic: +(minorKm / (mainKm || 1)).toFixed(3),
      inlets: (c.junctions ?? []).length,
    }
  }).filter(r => r.channelKm > 0)

  const sizes = rows.map(r => r.channelKm).sort((a, b) => a - b)
  const pct = (p: number) => sizes[Math.floor(sizes.length * p)]
  console.log(`  channel length: p10 ${pct(0.1).toFixed(0)}km · median ${pct(0.5).toFixed(0)}km · p90 ${pct(0.9).toFixed(0)}km`)
  console.log(`  ${rows.length} signatures to write\n`)

  if (dryRun) { console.log('(dry run — nothing written)'); return }

  for (let i = 0; i < rows.length; i += 300) {
    const chunk = rows.slice(i, i + 300)
    const values = chunk.map(r => `('${r.id}'::uuid, ${r.channelKm}, ${r.dendritic}, ${r.inlets})`).join(',\n      ')
    await runSql(`
      UPDATE body_of_water b SET
        channel_km = v.channel_km, dendritic_ratio = v.dendritic, inlet_count = v.inlets
      FROM (VALUES
      ${values}
      ) AS v(id, channel_km, dendritic, inlets)
      WHERE b.id = v.id;`)
    process.stdout.write(`\r  updated ${Math.min(i + 300, rows.length)}/${rows.length}`)
  }
  console.log(`\n\n✅ ${rows.length} signatures written`)
}

main().catch(e => { console.error(e); process.exit(1) })
