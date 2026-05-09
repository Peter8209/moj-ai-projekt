import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TranslateRequestBody = {
  sourceLanguage?: string;
  targetLanguage?: string;
  style?: string;
  text?: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

function languageName(value: string): string {
  const map: Record<string, string> = {
    Automaticky: 'automaticky rozpoznaj jazyk',
    Slovenčina: 'slovenčina',
    Čeština: 'čeština',
    Angličtina: 'angličtina',
    Nemčina: 'nemčina',
    Poľština: 'poľština',
    Maďarčina: 'maďarčina',
  };

  return map[value] || value;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba OPENAI_API_KEY v .env.local alebo vo Vercel nastaveniach.',
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as TranslateRequestBody;

    const sourceLanguage = cleanText(body.sourceLanguage || 'Automaticky');
    const targetLanguage = cleanText(body.targetLanguage || 'Slovenčina');
    const style = cleanText(body.style || 'Akademický');
    const inputText = cleanText(body.text);

    if (!inputText) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba text na preklad.',
        },
        { status: 400 }
      );
    }

    const prompt = `
Si profesionálny akademický prekladateľ v platforme ZEDPERA.

Úloha:
Prelož text z jazyka: ${languageName(sourceLanguage)}
Do jazyka: ${languageName(targetLanguage)}

Štýl prekladu:
${style}

Pravidlá:
1. Zachovaj význam pôvodného textu.
2. Nepíš vysvetlenia, iba hotový preklad.
3. Zachovaj odborný a akademický charakter textu.
4. Nevynechávaj vety.
5. Nepridávaj nové fakty.
6. Ak je text neformálny, prelož ho prirodzene, ale podľa zvoleného štýlu.
7. Ak je štýl "Akademický", používaj odborný jazyk vhodný do práce.
8. Ak je štýl "Formálny", používaj zdvorilý a profesionálny tón.
9. Ak je štýl "Doslovný", drž sa čo najbližšie originálu.
10. Ak je štýl "Jednoduchý", prelož zrozumiteľne a menej komplikovane.

TEXT NA PREKLAD:
${inputText}

VÝSTUP:
`.trim();

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const response = await client.responses.create({
      model,
      input: prompt,
      temperature: 0.2,
      max_output_tokens: 3500,
    });

    const translatedText = response.output_text?.trim() || '';

    if (!translatedText) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI nevrátila preklad.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      model,
      translatedText,
    });
  } catch (error) {
    console.error('TRANSLATE_ROUTE_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Neznáma chyba pri preklade.',
      },
      { status: 500 }
    );
  }
}