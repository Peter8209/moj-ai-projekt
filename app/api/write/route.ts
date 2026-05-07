import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractTextFromFiles } from '@/lib/extractFileText';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

function limitText(value: string, maxLength = 60000): string {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT.]`;
}

function buildSourcesBlock(files: Awaited<ReturnType<typeof extractTextFromFiles>>) {
  if (!files.length) {
    return 'Používateľ nepriložil žiadne dokumenty.';
  }

  return files
    .map((file, index) => {
      const text = file.text
        ? limitText(file.text, 25000)
        : '[Z tohto súboru sa nepodarilo extrahovať text.]';

      return `
ZDROJ ${index + 1}
Názov súboru: ${file.name}
Typ: ${file.type || 'nezadaný'}
Veľkosť: ${file.size} bajtov

EXTRAHOVANÝ TEXT:
"""
${text}
"""
`.trim();
    })
    .join('\n\n---\n\n');
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba OPENAI_API_KEY.',
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();

    const title = cleanText(formData.get('title'));
    const task = cleanText(formData.get('task'));
    const activeProfileRaw = cleanText(formData.get('activeProfile'));

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    const extractedFiles = await extractTextFromFiles(files);

    const extractedTextTotal = extractedFiles
      .map((file) => file.text)
      .join('\n\n')
      .trim();

    if (!task && !extractedTextTotal) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba zadanie alebo extrahovaný text zo súborov.',
        },
        { status: 400 }
      );
    }

    let activeProfile: any = null;

    try {
      activeProfile = activeProfileRaw ? JSON.parse(activeProfileRaw) : null;
    } catch {
      activeProfile = null;
    }

    const sourcesBlock = buildSourcesBlock(extractedFiles);

    const prompt = `
Si akademický AI asistent platformy ZEDPERA.

Tvojou úlohou je vytvoriť akademický text podľa profilu práce a podľa priložených dokumentov.

DÔLEŽITÉ PRAVIDLO:
Najprv používaj informácie z priložených dokumentov.
Ak sú priložené dokumenty, nesmieš písať všeobecne bez ich využitia.
Ak dokument obsahuje autorov, názvy diel, roky, bibliografické údaje alebo citácie, vypíš ich v časti „Použité zdroje a autori“.

PROFIL PRÁCE:
${activeProfile ? JSON.stringify(activeProfile, null, 2) : 'Profil práce nebol dodaný.'}

ZADANIE:
${task || title || 'Vytvor akademický text podľa priložených dokumentov.'}

PRILOŽENÉ DOKUMENTY A EXTRAHOVANÝ TEXT:
${sourcesBlock}

VÝSTUP MUSÍ MAŤ ŠTRUKTÚRU:

# Vygenerovaný akademický text

Napíš kvalitný akademický text podľa zadania.
Použi najmä informácie z extrahovaných dokumentov.
Nepíš vymyslené zdroje.
Ak v texte chýbajú bibliografické údaje, napíš to otvorene.

# Použité zdroje a autori

## A. Zdroje nájdené v priložených dokumentoch
Vypíš všetkých identifikovaných autorov, názvy publikácií, článkov, kníh, rokov, inštitúcií, URL alebo citačných údajov, ktoré sa nachádzajú v extrahovanom texte.

## B. Použité časti dokumentov
Ku každému zdroju napíš, z ktorého priloženého súboru pochádza.

## C. Chýbajúce alebo neúplné zdroje
Ak dokument obsahuje neúplné citácie alebo chýbajú autor/rok/názov, uveď ich ako neúplné.

PRAVIDLÁ:
- Nevymýšľaj autorov.
- Nevymýšľaj roky.
- Nevymýšľaj názvy publikácií.
- Ak v dokumentoch zdroje nie sú, napíš: „V priložených dokumentoch sa nenašli úplné bibliografické údaje.“
- Ak sa text extrahoval, nikdy nepíš, že obsah nebol extrahovaný.
`.trim();

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.25,
      max_tokens: 4500,
      messages: [
        {
          role: 'system',
          content:
            'Si akademický asistent. Pracuješ primárne s textom extrahovaným z priložených dokumentov a nevymýšľaš zdroje.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const output = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      ok: true,
      output,
      extractedFiles: extractedFiles.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        extractedChars: file.text.length,
        extractedPreview: file.text.slice(0, 600),
      })),
      extractedTextAvailable: extractedTextTotal.length > 0,
    });
  } catch (error) {
    console.error('WRITE_WITH_FILES_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa spracovať dokumenty.',
      },
      { status: 500 }
    );
  }
}