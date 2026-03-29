/**
 * AnglerIQ - AI Fishing Data Extractor
 * Uses an LLM to extract structured fishing technique data from raw text
 */

const SYSTEM_PROMPT = `You are a fishing data extraction assistant for a competitive bass fishing intelligence platform. Given text from a fishing tournament article, angler column, YouTube transcript, or forum post, extract structured technique data.

STRICT FILTERING RULES — apply before extracting anything:
- BASS ONLY: Extract data only for largemouth bass, smallmouth bass, spotted bass, or Guadalupe bass. Ignore crappie, white bass, striped bass, catfish, perch, and any other species entirely.
- ARTIFICIAL LURES ONLY: Extract only techniques using artificial lures. Ignore any mention of live bait, cut bait, dead bait, nightcrawlers, minnows, shad (as live bait), or any natural bait.
- NO TROLLING: Ignore any trolling techniques. If trolling is mentioned, skip that technique entirely.
- SIGNAL QUALITY: Forum posts often contain low-signal content (vague reports, gear talk, arguments). Only extract if the text contains a specific pattern, bait, or technique with enough detail to be actionable. Skip vague comments like "I caught some on a plastic" with no further detail.
- If the text contains no qualifying bass/artificial/non-trolling technique data, return [].

Return a JSON array of technique objects. Each object should have these fields (use null for unknown):

{
  "angler_name": string | null,
  "finish_place": number | null,
  "total_weight_lbs": number | null,
  "pattern": string | null,           // e.g. "shallow flipping wood", "deep ledge fishing"
  "presentation": string | null,      // e.g. "slow roll", "drop shot", "punch rig", "swim jig"
  "structure": string | null,         // e.g. "laydowns", "grass edges", "docks", "points"
  "depth_range_ft": string | null,    // e.g. "2-6", "15-25"
  "season": string | null,            // spring/summer/fall/winter
  "baits": [
    {
      "bait_type": string | null,     // e.g. "soft plastic", "crankbait", "jig"
      "bait_name": string | null,     // e.g. "Zoom Trick Worm", "Strike King KVD 1.5"
      "color": string | null,         // e.g. "June Bug", "Chartreuse Shad"
      "weight_oz": number | null,
      "line_type": string | null,     // fluorocarbon/braid/monofilament
      "line_lb_test": number | null,
      "product_url": string | null,   // direct product link if found in source text
      "retailer": string | null       // e.g. "Bass Pro Shops", "TackleDirect", "Amazon"
    }
  ],
  "water_temp_f": number | null,
  "water_clarity": string | null,     // clear/stained/muddy
  "notes": string | null              // any additional context worth capturing
}

Return ONLY valid JSON array. No explanation. If no fishing technique data found, return [].`

async function callGemini(text: string, apiKey: string, attempt = 1): Promise<any[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `Extract fishing technique data from this text:\n\n${text.slice(0, 8000)}` }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' }
      })
    }
  )

  // 429 rate limit — exponential backoff, up to 3 retries
  if (response.status === 429) {
    if (attempt > 3) throw new Error(`Gemini API error: 429 — rate limit, max retries exceeded`)
    const wait = attempt * 20000 // 20s, 40s, 60s
    console.log(`     ⏳ Rate limited — waiting ${wait/1000}s before retry ${attempt}/3...`)
    await new Promise(r => setTimeout(r, wait))
    return callGemini(text, apiKey, attempt + 1)
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} — ${err.slice(0, 200)}`)
  }

  const data = await response.json() as any
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(content)
  } catch {
    console.error('Failed to parse AI response:', content)
    return []
  }
}

// Hard post-extraction filter — catches anything the AI missed
const BAD_SPECIES = ['carp', 'catfish', 'channel cat', 'flathead', 'blue cat', 'crappie', 'white bass', 'striper', 'striped bass', 'perch', 'walleye', 'trout', 'drum', 'gar', 'buffalo']
const BAD_BAITS = ['nightcrawler', 'worm' /* live */, 'cut bait', 'cutbait', 'stink bait', 'stinkbait', 'cricket', 'minnow', 'shiner', 'chicken liver', 'dough bait', 'doughbait', 'punch bait', 'blood bait', 'soap bait', 'liver']

// "worm" is valid as a lure (e.g. "trick worm", "plastic worm") — only flag if it's clearly live/natural
const LIVE_BAIT_CONTEXT = /\b(live|fresh|dead|natural|real)\s+(worm|bait|shad|minnow|crawler)/i
const SHAD_LIVE = /\blive\s+shad\b|\bshad\s+(as|for)\s+(bait|live)/i

function isBadRecord(record: any): boolean {
  const fields = [
    record.pattern, record.presentation, record.notes, record.structure,
    ...(record.baits || []).map((b: any) => `${b.bait_name || ''} ${b.bait_type || ''} ${b.color || ''}`)
  ].join(' ').toLowerCase()

  // Check bad species
  if (BAD_SPECIES.some(s => fields.includes(s))) return true

  // Check bad baits
  if (BAD_BAITS.some(b => b !== 'worm' && fields.includes(b))) return true

  // Live worm / live bait context check
  const rawText = JSON.stringify(record)
  if (LIVE_BAIT_CONTEXT.test(rawText) || SHAD_LIVE.test(rawText)) return true

  return false
}

export async function extractFishingData(text: string, apiKey: string): Promise<any[]> {
  const raw = await callGemini(text, apiKey)
  const filtered = raw.filter(r => !isBadRecord(r))
  const removed = raw.length - filtered.length
  if (removed > 0) console.log(`     🚫 Hard filter removed ${removed} non-bass/non-artificial record(s)`)
  return filtered
}
