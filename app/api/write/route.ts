import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractTextFromFiles } from '@/lib/extractFileText';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================= TYPES =================

type ExtractedFileLike = Awaited<ReturnType<typeof extractTextFromFiles>>[number] & {
  text?: string | null;
  content?: string | null;
  extractedText?: string | null;
  output?: string | null;
  name?: string | null;
  fileName?: string | null;
  file_name?: string | null;
  type?: string | null;
  mimeType?: string | null;
  mime_type?: string | null;
  size?: number | null;
  fileSize?: number | null;
  file_size?: number | null;
  error?: string | null;
  warning?: string | null;
  ok?: boolean | null;
};

// ================= HELPERS =================

function cleanText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxLength = 60000): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT.]`;
}

function getExtractedText(file: ExtractedFileLike): string {
  return normalizeText(
    file.extractedText ||
      file.content ||
      file.text ||
      file.output ||
      ''
  );
}

function getFileName(file: ExtractedFileLike, index: number): string {
  return cleanText(
    file.name ||
      file.fileName ||
      file.file_name ||
      `Priložený dokument ${index + 1}`
  );
}

function getFileType(file: ExtractedFileLike): string {
  return cleanText(file.type || file.mimeType || file.mime_type || 'nezadaný');
}

function getFileSize(file: ExtractedFileLike): number {
  const size = file.size ?? file.fileSize ?? file.file_size ?? 0;
  return Number(size || 0);
}

function getFileStatus(file: ExtractedFileLike): string {
  const text = getExtractedText(file);

  if (text.length > 0) {
    return 'Text bol úspešne extrahovaný.';
  }

  if (file.error) {
    return `Extrakcia zlyhala: ${file.error}`;
  }

  if (file.warning) {
    return `Upozornenie: ${file.warning}`;
  }

  return 'Z tohto súboru sa nepodarilo extrahovať text.';
}

function buildSourcesBlock(files: Awaited<ReturnType<typeof extractTextFromFiles>>) {
  if (!files.length) {
    return 'Používateľ nepriložil žiadne dokumenty.';
  }

  return files
    .map((rawFile, index) => {
      const file = rawFile as ExtractedFileLike;

      const fileName = getFileName(file, index);
      const fileType = getFileType(file);
      const fileSize = getFileSize(file);
      const extractedText = getExtractedText(file);
      const status = getFileStatus(file);

      const text = extractedText
        ? limitText(extractedText, 25000)
        : '[Z tohto súboru sa nepodarilo extrahovať text.]';

      return `
ZDROJ ${index + 1}
Názov súboru: ${fileName}
Typ: ${fileType}
Veľkosť: ${fileSize} bajtov
Stav extrakcie: ${status}
Počet extrahovaných znakov: ${extractedText.length}

EXTRAHOVANÝ TEXT:
"""
${text}
"""
`.trim();
    })
    .join('\n\n---\n\n');
}

function parseJsonSafe<T>(value: string, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ================= API ROUTE =================

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

    const normalizedExtractedFiles = extractedFiles.map(
      (file) => file as ExtractedFileLike
    );

    const extractedTextTotal = normalizedExtractedFiles
      .map((file) => getExtractedText(file))
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!task && !title && !extractedTextTotal) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Chýba zadanie alebo extrahovaný text zo súborov.',
        },
        { status: 400 }
      );
    }

    const activeProfile = parseJsonSafe<any>(activeProfileRaw, null);
    const sourcesBlock = buildSourcesBlock(extractedFiles);

    const prompt = `
Si akademický AI asistent platformy ZEDPERA.

Tvojou úlohou je vytvoriť akademický text podľa profilu práce a podľa priložených dokumentov.

DÔLEŽITÉ PRAVIDLÁ:
1. Najprv používaj informácie z priložených dokumentov.
2. Ak sú priložené dokumenty a text bol extrahovaný, nesmieš písať všeobecne bez ich využitia.
3. Ak dokument obsahuje autorov, názvy diel, roky, bibliografické údaje alebo citácie, vypíš ich v časti „Použité zdroje a autori“.
4. Ak dokument obsahuje neúplné bibliografické údaje, jasne napíš, čo chýba.
5. Nevymýšľaj autorov, roky, názvy publikácií, DOI, URL ani vydavateľov.
6. Ak sa text zo súboru extrahoval, nikdy nepíš, že obsah nebol extrahovaný.
7. Ak sa bibliografické údaje v dokumentoch nenachádzajú, napíš:
„V priložených dokumentoch sa nenašli úplné bibliografické údaje.“
8. Ak používateľ žiada citácie, bibliografiu alebo zdroje, odpovedaj ako citačná špecialistka.
9. Ak sú v dokumente výstupy zo softvéru JASP, SPSS, Jamovi, R alebo Excel, uveď softvér ako zdroj, ak je to relevantné.
10. Ak chýba verzia softvéru, napíš, že údaj je potrebné overiť.

PROFIL PRÁCE:
${activeProfile ? JSON.stringify(activeProfile, null, 2) : 'Profil práce nebol dodaný.'}

ZADANIE:
${task || title || 'Vytvor akademický text podľa priložených dokumentov.'}

PRILOŽENÉ DOKUMENTY A EXTRAHOVANÝ TEXT:
${sourcesBlock}

VÝSTUP MUSÍ MAŤ TÚTO ŠTRUKTÚRU:

# Vygenerovaný akademický text

Napíš kvalitný akademický text podľa zadania.
Použi najmä informácie z extrahovaných dokumentov.
Nepíš vymyslené zdroje.
Ak v texte chýbajú bibliografické údaje, napíš to otvorene.

# Použité zdroje a autori

## A. Zdroje nájdené v priložených dokumentoch
Vypíš všetkých identifikovaných autorov, názvy publikácií, článkov, kníh, rokov, inštitúcií, URL alebo citačných údajov, ktoré sa nachádzajú v extrahovanom texte.

## B. Formátované bibliografické záznamy
Ak sú dostupné bibliografické údaje, uprav ich podľa citačného štýlu z profilu práce.
Ak profil citačný štýl neobsahuje, použi všeobecný akademický formát.
Ak používateľ výslovne žiada APA 7 alebo ISO 690, použi požadovaný štýl.

## C. Varianty odkazov v texte
Pri každom identifikovanom zdroji priprav:
- parentetický odkaz,
- naratívny odkaz,
- krátku ukážku použitia vo vete.

## D. Použité časti dokumentov
Ku každému zdroju alebo tvrdeniu napíš, z ktorého priloženého súboru pochádza.

## E. Chýbajúce alebo neúplné zdroje
Ak dokument obsahuje neúplné citácie alebo chýbajú autor, rok, názov, vydavateľ, DOI, URL alebo verzia softvéru, uveď ich ako:
„údaj je potrebné overiť“.

## F. Odporúčaná veta do metodológie
Ak dokument obsahuje štatistické výstupy alebo analýzu dát, priprav vetu do metodológie práce.

PRAVIDLÁ:
- Nevymýšľaj autorov.
- Nevymýšľaj roky.
- Nevymýšľaj názvy publikácií.
- Nevymýšľaj DOI ani URL.
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
            'Si akademický asistent a citačný špecialista platformy ZEDPERA. Pracuješ primárne s textom extrahovaným z priložených dokumentov a nevymýšľaš zdroje.',
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
      extractedFiles: normalizedExtractedFiles.map((file, index) => {
        const extractedText = getExtractedText(file);

        return {
          name: getFileName(file, index),
          type: getFileType(file),
          size: getFileSize(file),
          extractedChars: extractedText.length,
          extractedPreview: extractedText.slice(0, 600),
          status: getFileStatus(file),
          error: file.error || null,
          warning: file.warning || null,
        };
      }),
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