import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Voyage AI free tier: 3 RPM. Batching 50 texts per call means ~16 calls
// for 781 reports — at 3 RPM that's ~5 min vs the old 4.5 hours (1 call/report).
const BATCH_SIZE = 50
const BATCH_DELAY_MS = 21_000   // 21s between batches keeps us under 3 RPM

function buildChunkText(report: any): string {
  const lines: string[] = []

  const bow = report.body_of_water
  if (bow) {
    lines.push(`Lake: ${bow.name}${bow.state ? ', ' + bow.state : ''}`)
  }

  const tr = Array.isArray(report.tournament_result) ? report.tournament_result[0] : report.tournament_result
  const tournament = tr?.tournament
  if (tournament) {
    const orgPart = tournament.organization ? ` (${tournament.organization})` : ''
    const datePart = tournament.start_date ? ` - ${tournament.start_date}` : ''
    lines.push(`Tournament: ${tournament.name}${orgPart}${datePart}`)
  }

  const parts: string[] = []
  if (tr?.angler_name || report.angler_name) parts.push(`Angler: ${tr?.angler_name || report.angler_name}`)
  if (tr?.place || report.place) parts.push(`Place: #${tr?.place || report.place}`)
  if (parts.length) lines.push(parts.join(', '))

  const patternParts: string[] = []
  if (report.season) patternParts.push(`Season: ${report.season}`)
  if (report.time_of_day) patternParts.push(`Time of Day: ${report.time_of_day}`)
  if (report.pattern) patternParts.push(`Pattern: ${report.pattern}`)
  if (patternParts.length) lines.push(patternParts.join(' | '))

  if (report.presentation) lines.push(`Presentation: ${report.presentation}`)

  const structureParts: string[] = []
  if (report.structure) structureParts.push(`Structure: ${report.structure}`)
  if (report.depth_range_ft) structureParts.push(`Depth: ${report.depth_range_ft} ft`)
  if (report.location_type) structureParts.push(`Location: ${report.location_type}`)
  if (structureParts.length) lines.push(structureParts.join(' | '))

  if (report.fish_depth) lines.push(`Fish Depth: ${report.fish_depth}`)

  const baits = Array.isArray(report.bait_used) ? report.bait_used : []
  if (baits.length > 0) {
    const baitStr = baits.map((b: any) => {
      const parts: string[] = []
      if (b.bait_name) parts.push(b.bait_name)
      if (b.bait_type) parts.push(`(${b.bait_type})`)
      if (b.color) parts.push(`color: ${b.color}`)
      if (b.weight_oz) parts.push(`weight: ${b.weight_oz}oz`)
      if (b.line_type || b.line_lb_test) parts.push(`line: ${[b.line_type, b.line_lb_test ? b.line_lb_test + 'lb' : ''].filter(Boolean).join(' ')}`)
      return parts.join(', ')
    }).join('; ')
    lines.push(`Baits: ${baitStr}`)
  }

  const cond = Array.isArray(report.conditions) ? report.conditions[0] : report.conditions
  if (cond) {
    const condParts: string[] = []
    if (cond.water_temp_f) condParts.push(`water temp ${cond.water_temp_f}°F`)
    if (cond.water_clarity) condParts.push(`clarity: ${cond.water_clarity}`)
    if (cond.sky_cover) condParts.push(`sky: ${cond.sky_cover}`)
    if (cond.wind_mph) condParts.push(`wind: ${cond.wind_mph}mph`)
    if (condParts.length) lines.push(`Conditions: ${condParts.join(', ')}`)
  }

  if (report.notes) lines.push(`Notes: ${report.notes}`)

  return lines.join('\n')
}

// Send up to BATCH_SIZE texts in a single Voyage API call.
// Returns embeddings in the same order as the input array; null for any failure.
async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: texts,
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Voyage API error:', err)
    return texts.map(() => null)
  }

  const data: any = await res.json()
  // data.data is sorted by index so order matches input
  const results: any[] = data.data ?? []
  return results.map((r: any) => r.embedding ?? null)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('Fetching technique reports...')

  const { data: reports, error: fetchError } = await supabase
    .from('technique_report')
    .select(`
      *,
      body_of_water(*),
      tournament_result(*, tournament(*)),
      bait_used(*),
      conditions(*)
    `)
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('Error fetching reports:', fetchError)
    process.exit(1)
  }

  if (!reports || reports.length === 0) {
    console.log('No reports found.')
    return
  }

  console.log(`Found ${reports.length} reports.`)

  // Get already-embedded report IDs
  const { data: existing } = await supabase
    .from('technique_embeddings')
    .select('technique_report_id')

  const embeddedIds = new Set((existing || []).map((e: any) => e.technique_report_id))
  const toEmbed = reports.filter((r: any) => !embeddedIds.has(r.id))

  console.log(`${embeddedIds.size} already embedded. Processing ${toEmbed.length} new reports...`)

  if (toEmbed.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const totalBatches = Math.ceil(toEmbed.length / BATCH_SIZE)
  let successCount = 0
  let errorCount = 0

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE
    const batch = toEmbed.slice(start, start + BATCH_SIZE)
    const texts = batch.map(buildChunkText)

    // Skip reports with no content
    const validIndices = texts.map((t, i) => t.trim() ? i : -1).filter(i => i >= 0)
    const validTexts = validIndices.map(i => texts[i])

    if (validTexts.length === 0) {
      console.warn(`Batch ${batchIdx + 1}: all reports empty, skipping.`)
      continue
    }

    const embeddings = await embedBatch(validTexts)

    // Build upsert rows for successful embeddings
    const rows = validIndices
      .map((reportIdx, embIdx) => ({
        report: batch[reportIdx],
        text: texts[reportIdx],
        embedding: embeddings[embIdx],
      }))
      .filter(({ embedding }) => embedding !== null)
      .map(({ report, text, embedding }) => ({
        technique_report_id: report.id,
        body_of_water_id: report.body_of_water_id,
        content: text,
        embedding: JSON.stringify(embedding),
      }))

    errorCount += validTexts.length - rows.length

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('technique_embeddings')
        .upsert(rows, { onConflict: 'technique_report_id' })

      if (upsertError) {
        console.error(`Batch ${batchIdx + 1} upsert error:`, upsertError.message)
        errorCount += rows.length
      } else {
        successCount += rows.length
      }
    }

    const processed = Math.min(start + BATCH_SIZE, toEmbed.length)
    console.log(`Batch ${batchIdx + 1}/${totalBatches} — ${processed}/${toEmbed.length} processed (${successCount} success, ${errorCount} errors)`)

    // Rate-limit sleep between batches (not after the last one)
    if (batchIdx < totalBatches - 1) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  console.log(`\nDone! Embedded ${successCount} reports. ${errorCount} errors.`)
}

main().catch(console.error)
