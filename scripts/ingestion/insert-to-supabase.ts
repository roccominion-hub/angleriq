/**
 * AnglerIQ - Supabase Inserter
 * Takes extracted fishing data and inserts into the database
 */

import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function insertTechniqueReport(params: {
  bodyOfWaterName: string
  state: string
  sourceType: 'tournament' | 'youtube' | 'forum' | 'article' | 'other'
  sourceUrl: string
  reportedDate: string | null
  tournamentName?: string
  organization?: string
  extracted: any[]
}) {
  const supabase = getSupabaseAdmin()

  // Look up body of water
  const { data: water, error: waterError } = await supabase
    .from('body_of_water')
    .select('id')
    .ilike('name', `%${params.bodyOfWaterName}%`)
    .eq('state', params.state)
    .single()

  if (waterError || !water) {
    console.error(`Body of water not found: ${params.bodyOfWaterName}, ${params.state}`)
    return
  }

  // Insert tournament if provided
  let tournamentResultId: string | null = null
  if (params.tournamentName && params.organization) {
    const { data: tournament } = await supabase
      .from('tournament')
      .upsert({
        name: params.tournamentName,
        organization: params.organization,
        body_of_water_id: water.id,
        start_date: params.reportedDate || new Date().toISOString().split('T')[0],
        source_url: params.sourceUrl,
      }, { onConflict: 'name' })
      .select('id')
      .single()

    // Insert tournament results for each angler
    for (const item of params.extracted) {
      if (item.angler_name && item.finish_place && tournament) {
        const { data: result } = await supabase
          .from('tournament_result')
          .insert({
            tournament_id: tournament.id,
            angler_name: item.angler_name,
            place: item.finish_place,
            total_weight: item.total_weight_lbs,
          })
          .select('id')
          .single()

        if (result) tournamentResultId = result.id
      }
    }
  }

  // Insert technique reports
  for (const item of params.extracted) {
    const { data: report, error: reportError } = await supabase
      .from('technique_report')
      .insert({
        body_of_water_id: water.id,
        tournament_result_id: tournamentResultId,
        source_type: params.sourceType,
        source_url: params.sourceUrl,
        reported_date: params.reportedDate,
        pattern: item.pattern,
        presentation: item.presentation,
        structure: item.structure,
        depth_range_ft: item.depth_range_ft,
        notes: item.notes,
        confidence: 0.8, // tournament source = high confidence
      })
      .select('id')
      .single()

    if (reportError || !report) {
      console.error('Failed to insert technique report:', reportError)
      continue
    }

    // Insert baits
    if (item.baits && Array.isArray(item.baits)) {
      for (const bait of item.baits) {
        await supabase.from('bait_used').insert({
          technique_report_id: report.id,
          bait_type: bait.bait_type,
          bait_name: bait.bait_name,
          color: bait.color,
          weight_oz: bait.weight_oz,
          line_type: bait.line_type,
          line_lb_test: bait.line_lb_test,
          product_url: bait.product_url || null,
          retailer: bait.retailer || null,
        })
      }
    }

    // Insert conditions
    if (item.water_temp_f || item.water_clarity) {
      await supabase.from('conditions').insert({
        technique_report_id: report.id,
        date: params.reportedDate,
        water_temp_f: item.water_temp_f,
        water_clarity: item.water_clarity,
      })
    }

    console.log(`✓ Inserted technique report for ${item.angler_name || 'unknown angler'}`)
  }
}
