import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lake, state, season, sampleSize, topBaits, topPatterns, reports } = await req.json()

  const prompt = `You are an expert bass fishing analyst. Based on tournament data from ${lake}, ${state}, write a concise, actionable fishing intelligence report.

Data summary:
- Sample size: ${sampleSize} tournament technique reports
- Season filter: ${season || 'all seasons'}
- Top producing baits: ${topBaits.map((b: any) => `${b.name} (${b.count} reports)`).join(', ')}
- Top patterns: ${topPatterns.map((p: any) => `${p.pattern} (${p.count} reports)`).join(', ')}
- Recent reports: ${reports.slice(0, 5).map((r: any) => `${r.tournament_result?.angler_name || 'Angler'} (${r.season || 'unknown season'}): ${r.pattern || 'various'} using ${r.bait_used?.map((b: any) => b.bait_name || b.bait_type).join(', ') || 'various baits'}`).join('; ')}

Write a 3-4 sentence fishing report in plain language. Cover: (1) the dominant pattern/technique, (2) the top bait choices, (3) key structure or conditions. Be specific and actionable. Write like a knowledgeable fishing guide briefing an angler before they hit the water. Do not mention sample sizes or data — just give the intel.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json() as any
  const summary = data.content?.[0]?.text?.trim() || ''

  return NextResponse.json({ summary })
}
