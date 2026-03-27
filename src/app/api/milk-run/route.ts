import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lake, state, intel, today, topBaits, topPatterns, weather, filters } = await req.json()

  const conditionSummary = weather
    ? `${weather.tempF}°F, ${weather.skyCondition}, ${weather.timeOfDay}, ${weather.season}`
    : filters?.season || 'current conditions'

  const prompt = `You are an expert bass fishing tournament guide for ${lake}, ${state}.

CRITICAL RULES:
- Recommend artificial lures ONLY. Never suggest live bait, cut bait, or natural bait.
- Target largemouth, smallmouth, spotted, and Guadalupe bass only. Do not mention other species as targets.
- Use bait-category-appropriate colors: frog colors (black, white, natural, olive) for frogs; manufacturer color names (sexy shad, ghost, chartreuse shad, bone) for hard baits; soft plastic colors (Green Pumpkin, Watermelon Red, Black/Blue) for soft plastics only.

INTELLIGENCE SUMMARY:
${intel}

TOP BAITS: ${topBaits?.slice(0, 6).map((b: any) => `${b.name} (${b.count}x)`).join(', ')}
TOP PATTERNS: ${topPatterns?.slice(0, 4).map((p: any) => `${p.pattern} (${p.count}x)`).join(', ')}
CONDITIONS: ${conditionSummary}

Generate a "Recommended Plan" — a prioritized sequence of 3 to 5 artificial lure fishing patterns for a productive day on ${lake}. This should read like a confident game plan from a local guide. Format EXACTLY as follows:

MILK RUN PLAN

Pattern 1: [Name the pattern/approach in 3-5 words]
Why: [One sentence on why this is the #1 priority today]
How: [One sentence — specific bait, technique, and retrieve]
Where: [One sentence — specific structure, depth, area type]

Pattern 2: [Name]
Why: [One sentence]
How: [One sentence]
Where: [One sentence]

Pattern 3: [Name]
Why: [One sentence]
How: [One sentence]
Where: [One sentence]

[Add Pattern 4 and 5 only if strongly supported by the data]

PRO TIP: [One final sentence — a key adjustment or rotation strategy for the day]

Be specific, confident, and actionable. No filler. Write like you know this lake cold.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: 'You are an expert bass fishing guide generating concise, actionable milk run plans. Always follow the exact format requested. Be specific and confident.',
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json() as any
  const text = data.content?.[0]?.text?.trim() || ''

  // Parse patterns
  const patternRegex = /Pattern (\d+): (.+)\nWhy: (.+)\nHow: (.+)\nWhere: (.+)/g
  const patterns: { number: number; name: string; why: string; how: string; where: string }[] = []
  let match
  while ((match = patternRegex.exec(text)) !== null) {
    patterns.push({
      number: parseInt(match[1]),
      name: match[2].trim(),
      why: match[3].trim(),
      how: match[4].trim(),
      where: match[5].trim(),
    })
  }

  const proTipMatch = text.match(/PRO TIP: (.+)/i)
  const proTip = proTipMatch ? proTipMatch[1].trim() : ''

  return NextResponse.json({ patterns, proTip, raw: text })
}
