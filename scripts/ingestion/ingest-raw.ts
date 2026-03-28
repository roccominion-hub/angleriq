/**
 * AnglerIQ - Raw Text Ingestor
 * For when fetch-article can't get clean content (paywalls, JS-heavy pages)
 * Usage: npx tsx scripts/ingestion/ingest-raw.ts <text_file> <body_of_water> <state> <source_type> <source_url> [tournament_name] [organization] [date]
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

async function main() {
  const [textFile, bodyOfWater, state, sourceType, sourceUrl, tournamentName, organization, reportedDate] = process.argv.slice(2)
  const apiKey = process.env.GEMINI_API_KEY!

  const text = readFileSync(textFile, 'utf-8')
  console.log(`\n🎣 AnglerIQ Raw Ingestion | ${bodyOfWater}, ${state}`)
  console.log(`✓ Loaded ${text.length} characters from ${textFile}`)

  console.log(`\n🤖 Extracting fishing data with AI...`)
  const extracted = await extractFishingData(text, apiKey)
  console.log(`✓ Extracted ${extracted.length} technique records`)

  extracted.forEach((item, i) => {
    console.log(`  [${i+1}] ${item.angler_name || 'Unknown'} | Pattern: ${item.pattern || '?'} | Baits: ${item.baits?.map((b:any) => b.bait_name || b.bait_type).join(', ') || '?'}`)
  })

  if (extracted.length > 0) {
    console.log(`\n💾 Inserting into Supabase...`)
    await insertTechniqueReport({
      bodyOfWaterName: bodyOfWater, state,
      sourceType: sourceType as any, sourceUrl,
      reportedDate: reportedDate || null,
      tournamentName, organization, extracted,
    })
  }
  console.log(`\n✅ Done!`)
}

main().catch(console.error)
