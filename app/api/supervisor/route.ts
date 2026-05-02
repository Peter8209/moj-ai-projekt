import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, question } = await req.json();

  const prompt = question
    ? `Si prísny univerzitný vedúci práce.
Odpovedaj odborne, kriticky a konkrétne.

TEXT:
${text}

OTÁZKA:
${question}`
    : `Si prísny univerzitný vedúci práce.
Analyzuj text a daj:

1. Skóre (0-100)
2. Najväčšie chyby
3. Kritiku
4. Odporúčania

TEXT:
${text}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  const output = data.choices?.[0]?.message?.content || '';

  return NextResponse.json({ output });
}