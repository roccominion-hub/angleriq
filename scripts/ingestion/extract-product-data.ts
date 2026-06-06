/**
 * AnglerIQ — Lure Product Data Extractor
 *
 * Uses Gemini to extract structured lure/bait product specs from brand
 * website pages or Brave search snippets. Sibling to extract-fishing-data.ts.
 */

export interface ExtractedProduct {
  brand: string
  name: string
  bait_type: string
  sub_type: string | null
  sizes: string[]
  colors: string[]
  depth_ft_min: number | null
  depth_ft_max: number | null
  techniques: string[]
  structure: string[]
  seasons: string[]
  description: string   // 2–4 sentence fishing description for the chunk
}

const SYSTEM_PROMPT = `You are a fishing tackle data extraction assistant for a bass fishing intelligence platform. Given text from a lure brand's product page or product description, extract structured product data.

RULES:
- Extract only bass fishing lures and soft plastics. Skip saltwater-only products, fly fishing gear, terminal tackle (hooks, weights alone), or non-lure items.
- If the page contains multiple products (a collection page), extract ALL individual products found, each as a separate object.
- For depth: only include numeric values when specifically stated. Do not guess.
- For techniques: use standard fishing terms (Texas rig, Carolina rig, drop shot, swim jig, squarebill cranking, ledge fishing, flipping, pitching, etc.)
- For structure: use standard terms (grass, dock, laydown, ledge, rock, point, hump, channel, timber, brush pile)
- For seasons: spring / summer / fall / winter only
- description field: write 2–4 sentences in an angler's voice — what the bait is, how to fish it, what it's best for. Include depth range if known, key technique, and standout colors. This is the field that gets embedded for semantic search.
- If the text is not a product page or contains no lure data, return [].

Return a JSON array of product objects. Each object:
{
  "brand": string,             // manufacturer name exactly as labeled on the product
  "name": string,              // full official product name
  "bait_type": string,         // crankbait | jig | soft_plastic | topwater | spinnerbait | swimbait | bladed_jig | jerkbait | lipless_crankbait
  "sub_type": string | null,   // squarebill | deep_diving | football_jig | swim_jig | creature | worm | craw | stickbait | walk_the_dog | etc.
  "sizes": string[],           // ["3/8oz", "1/2oz"] or ["4 inch", "5 inch"] — empty array if unknown
  "colors": string[],          // list of key/popular colors — empty array if unknown
  "depth_ft_min": number | null,
  "depth_ft_max": number | null,
  "techniques": string[],      // primary fishing techniques
  "structure": string[],       // best structures
  "seasons": string[],         // best seasons
  "description": string        // 2-4 sentence angler-voice description
}

Return ONLY valid JSON array. No explanation. Return [] if no qualifying product data found.`

async function callGemini(text: string, apiKey: string, attempt = 1): Promise<ExtractedProduct[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `Extract bass fishing lure product data from this text:\n\n${text.slice(0, 10000)}` }] }],
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' }
      })
    }
  )

  if (response.status === 429 || response.status === 503) {
    if (attempt > 3) throw new Error(`Gemini ${response.status} — max retries exceeded`)
    const wait = response.status === 503 ? 10_000 * attempt : 20_000 * attempt
    const label = response.status === 503 ? 'Service unavailable' : 'Rate limited'
    console.log(`     ⏳ ${label} — waiting ${wait / 1000}s (retry ${attempt}/3)...`)
    await new Promise(r => setTimeout(r, wait))
    return callGemini(text, apiKey, attempt + 1)
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error: ${response.status} — ${err.slice(0, 200)}`)
  }

  const data = await response.json() as any
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  const content = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Truncation recovery
    const lastComplete = content.lastIndexOf('},')
    if (lastComplete > 0) {
      try {
        const recovered = JSON.parse(content.slice(0, lastComplete + 1) + ']')
        if (recovered.length) {
          console.log(`     ⚠️  JSON truncated — recovered ${recovered.length} products`)
          return recovered
        }
      } catch { /* fall through */ }
    }
    console.error('     Failed to parse Gemini response:', content.slice(0, 200))
    return []
  }
}

export async function extractProductData(text: string, apiKey: string): Promise<ExtractedProduct[]> {
  const results = await callGemini(text, apiKey)
  // Basic sanity filter — must have at least a name and bait_type
  return results.filter(r => r?.name && r?.bait_type && r?.description?.length > 20)
}
