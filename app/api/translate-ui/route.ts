import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TranslateUiBody = {
  language?: string;
  texts?: string[];
};

const allowedLanguages = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];

function normalizeLanguage(value: unknown) {
  const lang = String(value || '').toLowerCase().trim();

  if (allowedLanguages.includes(lang)) {
    return lang;
  }

  return 'sk';
}

function getLanguageName(language: string) {
  const names: Record<string, string> = {
    sk: 'slovenčina',
    cs: 'čeština',
    en: 'angličtina',
    de: 'nemčina',
    pl: 'poľština',
    hu: 'maďarčina',
  };

  return names[language] || names.sk;
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipText(value: string) {
  const text = cleanText(value);

  if (!text) return true;
  if (text.length < 2) return true;
  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^[A-Z0-9_-]{2,20}$/.test(text)) return true;

  return false;
}

function extractJsonArray(value: string): string[] {
  const cleaned = String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || ''));
    }

    if (Array.isArray(parsed?.translations)) {
      return parsed.translations.map((item: unknown) => String(item || ''));
    }
  } catch {
    // pokračujeme nižšie
  }

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const jsonOnly = cleaned.slice(firstBracket, lastBracket + 1);
    const parsed = JSON.parse(jsonOnly);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || ''));
    }
  }

  throw new Error('TRANSLATION_JSON_PARSE_FAILED');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslateUiBody;

    const language = normalizeLanguage(body.language);
    const texts = Array.isArray(body.texts)
      ? body.texts.map(cleanText).filter((item) => !shouldSkipText(item))
      : [];

    if (language === 'sk') {
      return NextResponse.json({
        ok: true,
        language,
        translations: Object.fromEntries(texts.map((text) => [text, text])),
      });
    }

    const uniqueTexts = Array.from(new Set(texts)).slice(0, 120);

    if (uniqueTexts.length === 0) {
      return NextResponse.json({
        ok: true,
        language,
        translations: {},
      });
    }

    const languageName = getLanguageName(language);

    const prompt = `
Prelož texty používateľského rozhrania do jazyka: ${languageName}.

Pravidlá:
- Vráť iba JSON pole stringov.
- Poradie prekladov musí byť rovnaké ako poradie vstupných textov.
- Nepíš komentár, markdown ani vysvetlenie.
- Neprekladaj názov Zedpera alebo ZEDPERA.
- Neprekladaj ceny, meny, percentá, čísla, URL adresy a technické identifikátory.
- Texty majú byť prirodzené pre webovú aplikáciu.

Vstupné texty:
${JSON.stringify(uniqueTexts)}
`;

    let resultText = '';

    try {
      const result = await generateText({
        model: google('gemini-2.0-flash'),
        prompt,
      });

      resultText = result.text;
    } catch (geminiError) {
      console.error('GEMINI_TRANSLATE_UI_ERROR:', geminiError);

      try {
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          prompt,
        });

        resultText = result.text;
      } catch (openaiError) {
        console.error('OPENAI_TRANSLATE_UI_ERROR:', openaiError);

        const result = await generateText({
          model: anthropic('claude-3-5-haiku-20241022'),
          prompt,
        });

        resultText = result.text;
      }
    }

    const translatedArray = extractJsonArray(resultText);

    const translations: Record<string, string> = {};

    uniqueTexts.forEach((source, index) => {
      translations[source] = translatedArray[index] || source;
    });

    return NextResponse.json({
      ok: true,
      language,
      translations,
    });
  } catch (error) {
    console.error('TRANSLATE_UI_API_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'TRANSLATE_UI_FAILED',
        message: 'Preklad rozhrania zlyhal.',
      },
      { status: 500 },
    );
  }
}