import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

async function embedText(text: string): Promise<number[] | null> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'voyage-3-lite',
      input: [text],
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Voyage API error:', err)
    return null
  }

  const data: any = await res.json()
  return data.data?.[0]?.embedding ?? null
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

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < toEmbed.length; i++) {
    const report = toEmbed[i]
    const chunkText = buildChunkText(report)

    if (!chunkText.trim()) {
      console.warn(`Report ${report.id} produced empty chunk, skipping.`)
      continue
    }

    const embedding = await embedText(chunkText)

    if (!embedding) {
      console.error(`Failed to embed report ${report.id}`)
      errorCount++
      continue
    }

    const { error: upsertError } = await supabase
      .from('technique_embeddings')
      .upsert({
        technique_report_id: report.id,
        body_of_water_id: report.body_of_water_id,
        content: chunkText,
        embedding: JSON.stringify(embedding),
      }, { onConflict: 'technique_report_id' })

    if (upsertError) {
      console.error(`Upsert error for report ${report.id}:`, upsertError)
      errorCount++
    } else {
      successCount++
    }

    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${toEmbed.length} processed (${successCount} success, ${errorCount} errors)`)
    }

    // Rate limit: free tier = 3 RPM, wait 21s between calls
    await sleep(21000)
  }

  console.log(`\nDone! Embedded ${successCount} reports successfully. ${errorCount} errors.`)
}

main().catch(console.error)
