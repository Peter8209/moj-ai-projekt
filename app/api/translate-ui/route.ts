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

type UiLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

const allowedLanguages: UiLanguage[] = ['sk', 'cs', 'en', 'de', 'pl', 'hu'];

const maxTextsPerRequest = 120;
const maxTextLength = 600;
const maxBatchSize = 35;

function normalizeLanguage(value: unknown): UiLanguage {
  const lang = String(value || '').toLowerCase().trim();

  if (allowedLanguages.includes(lang as UiLanguage)) {
    return lang as UiLanguage;
  }

  return 'sk';
}

function getLanguageName(language: UiLanguage) {
  const names: Record<UiLanguage, string> = {
    sk: 'slovenčina',
    cs: 'čeština',
    en: 'angličtina',
    de: 'nemčina',
    pl: 'poľština',
    hu: 'maďarčina',
  };

  return names[language];
}

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipText(value: string) {
  const text = cleanText(value);

  if (!text) return true;
  if (text.length < 2) return true;
  if (text.length > maxTextLength) return true;

  if (/^[\d\s.,€%+\-/:()]+$/.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (/^www\./i.test(text)) return true;

  if (/^[A-Z0-9_-]{2,25}$/.test(text)) return true;

  if (text === 'Zedpera') return true;
  if (text === 'ZEDPERA') return true;
  if (text === 'AI') return true;
  if (text === 'OPEN AI') return true;
  if (text === 'GPT') return true;
  if (text === 'PDF') return true;
  if (text === 'DOC') return true;
  if (text === 'PPTX') return true;
  if (text === 'XLSX') return true;

  return false;
}

function removeCodeFences(value: string) {
  return String(value || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function normalizeParsedTranslations(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;

      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;

        return String(
          obj.translation ||
            obj.translated ||
            obj.text ||
            obj.value ||
            obj.output ||
            '',
        );
      }

      return String(item || '');
    });
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.translations)) {
      return obj.translations.map((item) => String(item || ''));
    }

    if (Array.isArray(obj.items)) {
      return obj.items.map((item) => String(item || ''));
    }

    if (Array.isArray(obj.result)) {
      return obj.result.map((item) => String(item || ''));
    }

    if (Array.isArray(obj.data)) {
      return obj.data.map((item) => String(item || ''));
    }
  }

  return null;
}

function findBalancedJsonArray(value: string) {
  const text = String(value || '');
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '[') {
      if (depth === 0) {
        start = i;
      }

      depth += 1;
    }

    if (char === ']') {
      depth -= 1;

      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return '';
}

function parseLineBasedTranslations(value: string, expectedLength: number) {
  const lines = String(value || '')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\d+\s*[\).:-]\s*/, '')
        .replace(/^[-•]\s*/, '')
        .replace(/^["']|["']$/g, '')
        .trim(),
    )
    .filter(Boolean);

  if (lines.length === expectedLength) {
    return lines;
  }

  return null;
}

function extractJsonArray(value: string, expectedLength: number): string[] {
  const cleaned = removeCodeFences(value);

  try {
    const parsed = JSON.parse(cleaned);
    const normalized = normalizeParsedTranslations(parsed);

    if (normalized && normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Pokračujeme robustným parsovaním nižšie.
  }

  const jsonArray = findBalancedJsonArray(cleaned);

  if (jsonArray) {
    try {
      const parsed = JSON.parse(jsonArray);
      const normalized = normalizeParsedTranslations(parsed);

      if (normalized && normalized.length > 0) {
        return normalized;
      }
    } catch {
      // Pokračujeme fallbackom nižšie.
    }
  }

  const lineBased = parseLineBasedTranslations(cleaned, expectedLength);

  if (lineBased) {
    return lineBased;
  }

  throw new Error('TRANSLATION_JSON_PARSE_FAILED');
}

function buildPrompt({
  language,
  texts,
}: {
  language: UiLanguage;
  texts: string[];
}) {
  const languageName = getLanguageName(language);

  return `
You are a professional UI localization engine.

Translate the following web application interface texts into: ${languageName}.

Return ONLY valid JSON.
Return ONLY this shape:
["translation 1","translation 2","translation 3"]

Rules:
- Output must be a JSON array only.
- Do not write markdown.
- Do not write explanations.
- Do not wrap the JSON in code fences.
- The array length must be exactly ${texts.length}.
- Keep the same order as input.
- Do not translate the brand name Zedpera or ZEDPERA.
- Do not translate prices, currencies, numbers, URLs, model names and technical identifiers.
- Translate naturally for a SaaS web application.
- Keep button texts short.
- If a text is already suitable in the target language, keep it natural.

Input texts:
${JSON.stringify(texts)}
`.trim();
}

async function translateWithGemini({
  language,
  texts,
}: {
  language: UiLanguage;
  texts: string[];
}) {
  const prompt = buildPrompt({ language, texts });

  const result = await generateText({
    model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
    prompt,
    temperature: 0,
  });

  return extractJsonArray(result.text || '', texts.length);
}

async function translateWithOpenAi({
  language,
  texts,
}: {
  language: UiLanguage;
  texts: string[];
}) {
  const prompt = buildPrompt({ language, texts });

  const result = await generateText({
    model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    prompt,
    temperature: 0,
  });

  return extractJsonArray(result.text || '', texts.length);
}

async function translateWithClaude({
  language,
  texts,
}: {
  language: UiLanguage;
  texts: string[];
}) {
  const prompt = buildPrompt({ language, texts });

  const result = await generateText({
    model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022') as any,
    prompt,
    temperature: 0,
  });

  return extractJsonArray(result.text || '', texts.length);
}

async function translateBatch({
  language,
  texts,
}: {
  language: UiLanguage;
  texts: string[];
}) {
  try {
    return await translateWithGemini({ language, texts });
  } catch (geminiError) {
    console.error('TRANSLATE_UI_GEMINI_ERROR:', geminiError);
  }

  try {
    return await translateWithOpenAi({ language, texts });
  } catch (openaiError) {
    console.error('TRANSLATE_UI_OPENAI_ERROR:', openaiError);
  }

  try {
    return await translateWithClaude({ language, texts });
  } catch (claudeError) {
    console.error('TRANSLATE_UI_CLAUDE_ERROR:', claudeError);
  }

  return texts;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TranslateUiBody;

    const language = normalizeLanguage(body.language);

    const inputTexts = Array.isArray(body.texts)
      ? body.texts.map(cleanText).filter((item) => !shouldSkipText(item))
      : [];

    const uniqueTexts = Array.from(new Set(inputTexts)).slice(
      0,
      maxTextsPerRequest,
    );

    if (uniqueTexts.length === 0) {
      return NextResponse.json({
        ok: true,
        language,
        translations: {},
      });
    }

    if (language === 'sk') {
      return NextResponse.json({
        ok: true,
        language,
        translations: Object.fromEntries(uniqueTexts.map((text) => [text, text])),
      });
    }

    const translations: Record<string, string> = {};
    const batches = chunkArray(uniqueTexts, maxBatchSize);

    for (const batch of batches) {
      const translatedBatch = await translateBatch({
        language,
        texts: batch,
      });

      batch.forEach((source, index) => {
        const translated = cleanText(translatedBatch[index] || source);
        translations[source] = translated || source;
      });
    }

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