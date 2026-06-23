import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set in .env.local' },
      { status: 500 }
    )
  }

  let body: { system: string; userMessage: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { system, userMessage } = body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? 'Claude API error' },
        { status: response.status }
      )
    }

    const raw = data.content?.[0]?.text ?? ''
    const text = raw.replace(/—/g, '-').replace(/–/g, '-')
    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Request failed: ${msg}` }, { status: 500 })
  }
}
