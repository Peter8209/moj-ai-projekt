import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
  field?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const title = String(body.title || '').trim();
    const summary = String(body.summary || '').trim();
    const defenseType = String(body.defenseType || 'Bakalárska').trim();
    const profile = body.activeProfile as SavedProfile | null;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: 'Chýba názov práce.' },
        { status: 400 }
      );
    }

    if (!summary || summary.length < 100) {
      return NextResponse.json(
        { ok: false, error: 'Stručný obsah práce je príliš krátky.' },
        { status: 400 }
      );
    }

    const prompt = `
Vytvor profesionálnu prezentáciu na obhajobu záverečnej práce.

NÁZOV PRÁCE:
${title}

TYP OBHAJOBY:
${defenseType}

PROFIL PRÁCE:
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${profile?.type || defenseType}
- Odbor: ${profile?.field || 'nezadané'}
- Jazyk práce: ${profile?.workLanguage || profile?.language || 'slovenčina'}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Citovanie: ${profile?.citation || 'nezadané'}
- Kľúčové slová: ${
      profile?.keywords?.join(', ') ||
      profile?.keywordsList?.join(', ') ||
      'nezadané'
    }

STRUČNÝ OBSAH PRÁCE:
${summary}

Vytvor prezentáciu v slovenčine.

Požiadavky:
- 10 až 12 slidov
- každý slide má mať jasný názov
- každý slide má mať 3 až 5 stručných bodov
- pridaj aj krátke poznámky pre prezentujúceho
- štruktúra má byť vhodná na školskú/akademickú obhajobu

Vráť iba čistý JSON bez markdownu v tomto formáte:

{
  "slides": [
    {
      "title": "Názov slidu",
      "bullets": ["bod 1", "bod 2", "bod 3"],
      "speakerNotes": "Krátke poznámky k tomu, čo má študent povedať."
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Si odborník na akademické prezentácie a obhajoby záverečných prác.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const slides = Array.isArray(parsed.slides) ? parsed.slides : [];

    return NextResponse.json({
      ok: true,
      slides,
    });
  } catch (error) {
    console.error('DEFENSE_GENERATE_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Nepodarilo sa vygenerovať prezentáciu na obhajobu.',
      },
      { status: 500 }
    );
  }
}