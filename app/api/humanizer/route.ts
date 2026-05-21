import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function getOutputLanguage(value: unknown) {
  const language = String(value || 'sk').toLowerCase();

  if (['sk', 'cs', 'cz', 'en', 'de', 'pl', 'hu'].includes(language)) {
    if (language === 'cz') return 'cs';
    return language;
  }

  return 'sk';
}

function getLanguageLabel(language: string) {
  if (language === 'cs') return 'češtine';
  if (language === 'en') return 'angličtine';
  if (language === 'de') return 'nemčine';
  if (language === 'pl') return 'poľštine';
  if (language === 'hu') return 'maďarčine';
  return 'slovenčine';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const inputText = cleanText(body.text || body.input || body.content);
    const language = getOutputLanguage(body.language || body.outputLanguage);
    const languageLabel = getLanguageLabel(language);

    if (!inputText || inputText.length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error: 'TEXT_REQUIRED',
          message:
            'Vlož text, ktorý chceš humanizovať. Text musí mať aspoň 20 znakov.',
        },
        { status: 400 },
      );
    }

    const prompt = `
Si profesionálny akademický editor.

Prepracuj text tak, aby pôsobil prirodzenejšie, ľudskejšie a menej šablónovito.

Pravidlá:
- Zachovaj pôvodný význam.
- Nevymýšľaj nové fakty, autorov, zdroje, čísla ani citácie.
- Zachovaj odborný štýl.
- Odstráň strojové, generické a príliš uhladené formulácie.
- Zmeň vetnú stavbu, rytmus viet a prechody medzi myšlienkami.
- Nepoužívaj typické AI frázy ako „v dnešnej dobe“, „je dôležité poznamenať“, „v neposlednom rade“, ak nie sú potrebné.
- Text má znieť ako prirodzene napísaný študentom alebo odborníkom.
- Výstup musí byť v ${languageLabel}.
- Nepíš komentár, vysvetlenie, nadpis ani Markdown.
- Vráť iba výsledný humanizovaný text.

TEXT:
${inputText}
`.trim();

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.8,
      maxOutputTokens: 4000,
      prompt,
    });

    const output = cleanText(result.text);

    return NextResponse.json({
      ok: true,
      humanizedText: output,
      output,
      message:
        'Text bol humanizovaný. Výsledok bude prirodzenejší, ale žiadny AI detektor nevie garantovať stabilné 0 % AI.',
    });
  } catch (error) {
    console.error('HUMANIZER_API_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'HUMANIZER_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Humanizácia textu zlyhala.',
      },
      { status: 500 },
    );
  }
}