import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GenerateRequestBody = {
  chapterTitle?: string;
  outputType?: string;
  assignment?: string;
  activeProfile?: {
    id?: string;
    type?: string;
    level?: string;
    title?: string;
    topic?: string;
    field?: string;
    supervisor?: string;
    citation?: string;
    language?: string;
    workLanguage?: string;
    annotation?: string;
    goal?: string;
    methodology?: string;
    keywords?: string[];
    keywordsList?: string[];
  } | null;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeText(value: unknown, fallback = 'Nevyplnené') {
  if (typeof value !== 'string') return fallback;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

function safeArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProfileBlock(profile: GenerateRequestBody['activeProfile']) {
  if (!profile) {
    return `
PROFIL PRÁCE:
Profil práce nie je vyplnený. Text preto priprav všeobecne akademicky, ale upozorni, že lepší výsledok vznikne po doplnení profilu práce.
`.trim();
  }

  const keywords =
    safeArray(profile.keywords).length > 0
      ? safeArray(profile.keywords)
      : safeArray(profile.keywordsList);

  return `
PROFIL PRÁCE:
- Názov práce: ${safeText(profile.title)}
- Typ práce: ${safeText(profile.type)}
- Úroveň práce: ${safeText(profile.level)}
- Téma: ${safeText(profile.topic)}
- Odbor: ${safeText(profile.field)}
- Vedúci práce: ${safeText(profile.supervisor)}
- Citačná norma: ${safeText(profile.citation)}
- Jazyk práce: ${safeText(profile.workLanguage || profile.language)}
- Anotácia: ${safeText(profile.annotation)}
- Cieľ práce: ${safeText(profile.goal)}
- Metodológia: ${safeText(profile.methodology)}
- Kľúčové slová: ${keywords.length ? keywords.join(', ') : 'Nevyplnené'}
`.trim();
}

function buildPrompt(body: GenerateRequestBody) {
  const chapterTitle = safeText(body.chapterTitle, 'Bez názvu kapitoly');
  const outputType = safeText(body.outputType, 'Kapitola');
  const assignment = safeText(body.assignment, 'Používateľ nezadal konkrétne zadanie.');
  const profileBlock = buildProfileBlock(body.activeProfile);

  return `
Si odborný akademický asistent pre tvorbu seminárnych, bakalárskych, diplomových, dizertačných a odborných prác.

Tvojou úlohou je vygenerovať kvalitný akademický text podľa profilu práce a zadania používateľa.

${profileBlock}

ZADANIE NA GENEROVANIE:
- Názov kapitoly / časti: ${chapterTitle}
- Typ výstupu: ${outputType}
- Zadanie používateľa: ${assignment}

PRAVIDLÁ VÝSTUPU:
1. Píš odborne, vecne a akademicky.
2. Nepíš marketingovo.
3. Nepíš v bodoch, ak používateľ výslovne nechce osnovu alebo zoznam.
4. Text má byť použiteľný ako návrh do akademickej práce.
5. Dodrž jazyk práce z profilu, ak je uvedený.
6. Ak je uvedená citačná norma, píš tak, aby sa text dal neskôr ľahko doplniť o citácie podľa tejto normy.
7. Nevymýšľaj konkrétne zdroje, autorov, roky ani bibliografické údaje.
8. Ak sú potrebné citácie, vlož len neutrálnu značku v texte, napríklad: [doplniť zdroj].
9. Text musí byť logicky členený a zrozumiteľný.
10. Ak chýba dôležitý údaj, doplň všeobecnú formuláciu, ale nevymýšľaj fakty.

VÝSTUP:
Vygeneruj priamo výsledný text pre používateľa.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            'Chýba OPENAI_API_KEY v .env.local alebo vo Vercel Environment Variables.',
        },
        { status: 500 }
      );
    }

    let body: GenerateRequestBody;

    try {
      body = (await request.json()) as GenerateRequestBody;
    } catch {
      return NextResponse.json(
        { error: 'Neplatné JSON dáta v požiadavke.' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(body);

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await client.responses.create({
      model,
      input: prompt,
      temperature: 0.4,
      max_output_tokens: 2500,
    });

    const text = response.output_text?.trim() || '';

    if (!text) {
      return NextResponse.json(
        {
          error: 'AI nevrátila žiadny text.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      model,
      text,
    });
  } catch (error) {
    console.error('GENERATE_ROUTE_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri generovaní textu.';

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}