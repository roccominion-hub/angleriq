/**
 * AnglerIQ - Main Ingestion Runner
 * Usage: npx tsx scripts/ingestion/ingest.ts <url> <body_of_water> <state> <source_type> [tournament_name] [organization] [date]
 * 
 * Example:
 *   npx tsx scripts/ingestion/ingest.ts \
 *     "https://www.bassmaster.com/column/trey-mckinney/everything-fell-into-place/" \
 *     "Lake Fork" "TX" "tournament" \
 *     "2024 AFTCO Bassmaster Elite at Lake Fork" "BASS" "2024-03-01"
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { fetchArticleText } from './fetch-article'
import { extractFishingData } from './extract-fishing-data'
import { insertTechniqueReport } from './insert-to-supabase'

async function main() {
  const [url, bodyOfWater, state, sourceType, tournamentName, organization, reportedDate] = process.argv.slice(2)

  if (!url || !bodyOfWater || !state || !sourceType) {
    console.error('Usage: npx tsx scripts/ingestion/ingest.ts <url> <body_of_water> <state> <source_type> [tournament_name] [organization] [date]')
    process.exit(1)
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY in .env.local')
    process.exit(1)
  }

  console.log(`\n🎣 AnglerIQ Ingestion Pipeline`)
  console.log(`📍 Water: ${bodyOfWater}, ${state}`)
  console.log(`🔗 URL: ${url}`)
  console.log(`📂 Source: ${sourceType}`)
  console.log(`\n⏳ Fetching article...`)

  const text = await fetchArticleText(url)
  console.log(`✓ Fetched ${text.length} characters`)

  console.log(`\n🤖 Extracting fishing data with AI...`)
  const extracted = await extractFishingData(text, apiKey)
  console.log(`✓ Extracted ${extracted.length} technique records`)

  if (extracted.length === 0) {
    console.log('No fishing data found in this article.')
    return
  }

  console.log('\n📊 Extracted data preview:')
  extracted.forEach((item, i) => {
    console.log(`\n  [${i + 1}] ${item.angler_name || 'Unknown'} (Place: ${item.finish_place || '?'})`)
    console.log(`      Pattern: ${item.pattern || '?'}`)
    console.log(`      Presentation: ${item.presentation || '?'}`)
    console.log(`      Baits: ${item.baits?.map((b: any) => b.bait_name || b.bait_type).join(', ') || '?'}`)
  })

  console.log(`\n💾 Inserting into Supabase...`)
  await insertTechniqueReport({
    bodyOfWaterName: bodyOfWater,
    state,
    sourceType: sourceType as any,
    sourceUrl: url,
    reportedDate: reportedDate || null,
    tournamentName,
    organization,
    extracted,
  })

  console.log(`\n✅ Done! Ingestion complete.`)
}

main().catch(console.error)
