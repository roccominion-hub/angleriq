/**
 * AnglerIQ - AI Fishing Data Extractor
 * Uses an LLM to extract structured fishing technique data from raw text
 */

const SYSTEM_PROMPT = `You are a fishing data extraction assistant. Given text from a fishing tournament article, angler column, YouTube transcript, or forum post, extract structured technique data.

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
      "line_lb_test": number | null
    }
  ],
  "water_temp_f": number | null,
  "water_clarity": string | null,     // clear/stained/muddy
  "notes": string | null              // any additional context worth capturing
}

Return ONLY valid JSON array. No explanation. If no fishing technique data found, return [].`

export async function extractFishingData(
  text: string,
  apiKey: string
): Promise<any[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract fishing technique data from this text:\n\n${text.slice(0, 8000)}`
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json() as any
  const raw = data.content[0].text.trim()
  // Strip markdown code fences if present
  const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(content)
  } catch {
    console.error('Failed to parse AI response:', content)
    return []
  }
}
