/**
 * AnglerIQ — Re-embed Lure Catalog
 *
 * Fetches all lure_catalog rows with null embeddings and generates
 * embeddings for them. Run this after Voyage rate limits reset or
 * after adding a payment method at dashboard.voyageai.com.
 *
 * Usage:
 *   npx tsx scripts/ingestion/re-embed-catalog.ts
 *   npx tsx scripts/ingestion/re-embed-catalog.ts --dry-run   # count only
 */

import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const VOYAGE_KEY = process.env.VOYAGE_API_KEY!

// Conservative batch size — 10 texts × ~400 tokens = ~4K tokens, well under 10K TPM
const BATCH_SIZE = 10
const BATCH_DELAY_MS = 65_000   // 65 seconds — safely clears the 1-min TPM window

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: texts.map(t => t.slice(0, 8000)),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  ✗ Voyage error: ${err.slice(0, 200)}`)
    return texts.map(() => null)
  }

  const data = await res.json() as any
  return (data.data ?? [])
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding as number[])
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // Fetch all rows missing embeddings
  const { data: rows, error } = await supabase
    .from('lure_catalog')
    .select('id, brand, name, chunk_text')
    .is('embedding', null)
    .order('brand')

  if (error) { console.error('DB error:', error); process.exit(1) }
  if (!rows || rows.length === 0) {
    console.log('✅ All catalog entries already have embeddings.')
    return
  }

  console.log(`\n🔧 Re-embed Lure Catalog`)
  console.log(`Found ${rows.length} entries missing embeddings`)

  if (dryRun) {
    rows.forEach(r => console.log(`  - ${r.brand} | ${r.name}`))
    return
  }

  const batches = Math.ceil(rows.length / BATCH_SIZE)
  console.log(`Processing ${batches} batch(es) of up to ${BATCH_SIZE} texts\n`)

  let fixed = 0, failed = 0

  for (let b = 0; b < batches; b++) {
    const batch = rows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    console.log(`Batch ${b + 1}/${batches} (${batch.length} texts)...`)

    const embeddings = await embedBatch(batch.map(r => r.chunk_text))

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i]
      const embedding = embeddings[i] ?? null

      if (!embedding) {
        console.log(`  ✗ No embedding: ${row.brand} | ${row.name}`)
        failed++
        continue
      }

      const { error: upErr } = await supabase
        .from('lure_catalog')
        .update({ embedding, updated_at: new Date().toISOString() })
        .eq('id', row.id)

      if (upErr) {
        console.error(`  ✗ DB update failed: ${row.brand} | ${row.name}: ${upErr.message}`)
        failed++
      } else {
        console.log(`  ✓ ${row.brand} | ${row.name}`)
        fixed++
      }
    }

    if (b < batches - 1) {
      console.log(`\n  ⏳ Waiting ${BATCH_DELAY_MS / 1000}s for TPM window to clear...\n`)
      await sleep(BATCH_DELAY_MS)
    }
  }

  const { count } = await supabase
    .from('lure_catalog')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null)

  console.log(`\n${'═'.repeat(50)}`)
  console.log(`Done. ${fixed} fixed, ${failed} failed.`)
  console.log(`Catalog entries with embeddings: ${count ?? '?'}`)
}

main().catch(e => { console.error(e); process.exit(1) })
