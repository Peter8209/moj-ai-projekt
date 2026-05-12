import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= CONFIG =================

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_RETURN_TEXT_CHARS = 500_000;

type SourceType = 'book' | 'article' | 'web' | 'software' | 'unknown';

type BibliographicCandidate = {
  raw: string;
  authors: string[];
  year: string | null;
  title: string | null;
  doi: string | null;
  url: string | null;
  sourceType: SourceType;
};

type ExtractResult = {
  ok: boolean;
  text: string;
  method: string;
  message?: string;
  meta?: Record<string, unknown>;
};

// ================= TEXT HELPERS =================

function cleanText(value: unknown) {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxChars = MAX_RETURN_TEXT_CHARS) {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    maxChars,
  )}\n\n[Text bol skrátený pre technický limit odpovede API.]`;
}

function normalizeFileName(value: unknown) {
  return String(value || 'uploaded-file').trim() || 'uploaded-file';
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) return '';

  return fileName.slice(index).toLowerCase();
}

function removeGzipSuffix(fileName: string) {
  return fileName.toLowerCase().endsWith('.gz')
    ? fileName.slice(0, -3)
    : fileName;
}

function getEffectiveFileName({
  fileName,
  originalName,
  isCompressed,
}: {
  fileName: string;
  originalName: string;
  isCompressed: boolean;
}) {
  if (isCompressed && originalName && originalName !== 'uploaded-file') {
    return originalName;
  }

  return removeGzipSuffix(fileName);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return 'Neznáma chyba pri extrakcii textu.';
}

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

function isGzipUpload({
  file,
  fileName,
  isCompressedFromForm,
}: {
  file: File;
  fileName: string;
  isCompressedFromForm: boolean;
}) {
  const lowerName = fileName.toLowerCase();
  const type = file.type || '';

  return (
    isCompressedFromForm ||
    lowerName.endsWith('.gz') ||
    type === 'application/gzip' ||
    type === 'application/x-gzip'
  );
}

function safeGunzip(buffer: Buffer) {
  try {
    return gunzipSync(buffer);
  } catch (error) {
    throw new Error(`GZIP_DECOMPRESSION_FAILED: ${getErrorMessage(error)}`);
  }
}

function decodeXmlEntities(value: string) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const number = Number(code);

      if (!Number.isFinite(number)) return '';

      return String.fromCharCode(number);
    });
}

function stripXmlTags(value: string) {
  return cleanText(
    decodeXmlEntities(
      String(value || '')
        .replace(/<text:line-break\s*\/>/gi, '\n')
        .replace(/<text:p[^>]*>/gi, '\n')
        .replace(/<text:h[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

// ================= PLAIN TEXT =================

async function extractPlainTextFromBuffer(buffer: Buffer): Promise<ExtractResult> {
  const text = cleanText(buffer.toString('utf8'));

  return {
    ok: Boolean(text),
    text,
    method: 'plain-text-buffer',
    message: text
      ? 'Text bol načítaný priamo zo súboru.'
      : 'Textový súbor je prázdny alebo sa nepodarilo načítať jeho obsah.',
    meta: {
      chars: text.length,
    },
  };
}

async function extractRtfTextFromBuffer(buffer: Buffer): Promise<ExtractResult> {
  try {
    const raw = buffer.toString('utf8');

    const text = cleanText(
      raw
        .replace(/\\par[d]?/g, '\n')
        .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
        .replace(/\\[a-zA-Z]+\d* ?/g, ' ')
        .replace(/[{}]/g, ' ')
        .replace(/\s+/g, ' '),
    );

    return {
      ok: Boolean(text),
      text,
      method: 'basic-rtf-cleaner',
      message: text
        ? 'RTF bol orientačne vyčistený na text.'
        : 'RTF súbor bol spracovaný, ale text nebol nájdený.',
      meta: {
        chars: text.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'basic-rtf-cleaner',
      message: `RTF extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= PDF =================

async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  let pdfjs: any;

  try {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'pdfjs-dist-server',
      message:
        `PDF extrakcia zlyhala: nepodarilo sa načítať pdfjs-dist. ` +
        `Nainštaluj balík: npm install pdfjs-dist. Detail: ${getErrorMessage(
          error,
        )}`,
    };
  }

  try {
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = '';
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useWorkerFetch: false,
      isEvalSupported: false,
      stopAtErrors: false,
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => {
          if (typeof item?.str === 'string') return item.str;
          return '';
        })
        .filter(Boolean)
        .join(' ');

      const cleanedPageText = cleanText(pageText);

      if (cleanedPageText) {
        pages.push(`STRANA ${pageNumber}\n${cleanedPageText}`);
      }

      try {
        page.cleanup?.();
      } catch {
        // ignore cleanup error
      }
    }

    try {
      await pdf.destroy?.();
    } catch {
      // ignore destroy error
    }

    const text = cleanText(pages.join('\n\n------------------------------\n\n'));

    return {
      ok: Boolean(text),
      text,
      method: 'pdfjs-dist-server-disable-worker',
      message: text
        ? 'PDF text bol extrahovaný na serveri cez pdfjs-dist bez CDN workeru.'
        : 'PDF bolo spracované, ale neobsahuje čitateľný text. Môže ísť o skenovaný PDF obrázok.',
      meta: {
        pages: pdf.numPages || null,
        chars: text.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'pdfjs-dist-server-disable-worker',
      message: `PDF extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= DOCX =================

async function extractDocxText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const mammoth = await import('mammoth');

    const result = await mammoth.extractRawText({
      buffer,
    });

    const text = cleanText(result?.value || '');

    return {
      ok: Boolean(text),
      text,
      method: 'mammoth-docx',
      message: text
        ? 'DOCX text bol extrahovaný pomocou mammoth.'
        : 'DOCX bolo spracované, ale text nebol nájdený.',
      meta: {
        chars: text.length,
        messages: result?.messages || [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'mammoth-docx',
      message: `DOCX extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= XLS / XLSX =================

async function extractXlsxText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const xlsx = await import('xlsx');

    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellText: false,
      cellNF: false,
    });

    const parts: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) return;

      const csv = xlsx.utils.sheet_to_csv(sheet, {
        FS: ';',
        RS: '\n',
        blankrows: false,
      });

      const cleanedCsv = cleanText(csv);

      if (cleanedCsv) {
        parts.push(`HÁROK: ${sheetName}\n${cleanedCsv}`);
      }
    });

    const text = cleanText(parts.join('\n\n------------------------------\n\n'));

    return {
      ok: Boolean(text),
      text,
      method: 'xlsx',
      message: text
        ? 'Excel tabuľka bola extrahovaná do textového CSV formátu.'
        : 'Excel súbor bol spracovaný, ale neobsahuje čitateľné dáta.',
      meta: {
        sheets: workbook.SheetNames,
        chars: text.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'xlsx',
      message: `Excel extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= PPTX =================

async function extractPptxText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const JSZipModule = await import('jszip');
    const JSZip = JSZipModule.default;

    const zip = await JSZip.loadAsync(buffer);

    const slidePaths = Object.keys(zip.files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
      .sort((a, b) => {
        const aNumber = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
        const bNumber = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);

        return aNumber - bNumber;
      });

    const slides: string[] = [];

    for (const slidePath of slidePaths) {
      const file = zip.files[slidePath];

      if (!file) continue;

      const xml = await file.async('text');

      const texts = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g))
        .map((match) => decodeXmlEntities(match[1] || ''))
        .map((item) => cleanText(item))
        .filter(Boolean);

      const slideNumber =
        Number(slidePath.match(/slide(\d+)\.xml/i)?.[1] || 0) ||
        slides.length + 1;

      if (texts.length > 0) {
        slides.push(`SNÍMKA ${slideNumber}\n${texts.join('\n')}`);
      }
    }

    const text = cleanText(slides.join('\n\n------------------------------\n\n'));

    return {
      ok: Boolean(text),
      text,
      method: 'pptx-jszip-xml',
      message: text
        ? 'PPTX text bol extrahovaný zo snímok pomocou jszip.'
        : 'PPTX bolo spracované, ale text v snímkach nebol nájdený.',
      meta: {
        slides: slidePaths.length,
        chars: text.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'pptx-jszip-xml',
      message: `PPTX extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= ODT =================

async function extractOdtText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const JSZipModule = await import('jszip');
    const JSZip = JSZipModule.default;

    const zip = await JSZip.loadAsync(buffer);
    const contentFile = zip.files['content.xml'];

    if (!contentFile) {
      return {
        ok: false,
        text: '',
        method: 'odt-jszip-content-xml',
        message: 'ODT súbor neobsahuje content.xml.',
      };
    }

    const xml = await contentFile.async('text');
    const text = stripXmlTags(xml);

    return {
      ok: Boolean(text),
      text,
      method: 'odt-jszip-content-xml',
      message: text
        ? 'ODT text bol extrahovaný z content.xml.'
        : 'ODT bolo spracované, ale text nebol nájdený.',
      meta: {
        chars: text.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'odt-jszip-content-xml',
      message: `ODT extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

// ================= UNSUPPORTED =================

async function extractUnsupportedBinary({
  fileName,
  extension,
}: {
  fileName: string;
  extension: string;
}): Promise<ExtractResult> {
  return {
    ok: false,
    text: '',
    method: 'unsupported',
    message: `Súbor ${fileName} s príponou ${
      extension || 'nezistená'
    } nemá podporovanú textovú extrakciu v tomto endpointe.`,
  };
}

// ================= ROUTING BY TYPE =================

async function extractByType({
  buffer,
  fileName,
}: {
  buffer: Buffer;
  fileName: string;
}): Promise<ExtractResult> {
  const extension = getFileExtension(fileName);

  if (['.txt', '.md', '.csv'].includes(extension)) {
    return extractPlainTextFromBuffer(buffer);
  }

  if (extension === '.rtf') {
    return extractRtfTextFromBuffer(buffer);
  }

  if (extension === '.pdf') {
    return extractPdfText(buffer);
  }

  if (extension === '.docx') {
    return extractDocxText(buffer);
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    return extractXlsxText(buffer);
  }

  if (extension === '.pptx') {
    return extractPptxText(buffer);
  }

  if (extension === '.odt') {
    return extractOdtText(buffer);
  }

  if (extension === '.doc') {
    return {
      ok: false,
      text: '',
      method: 'doc-unsupported',
      message:
        'Starý formát .doc nie je spoľahlivo podporovaný. Preveď súbor do .docx alebo PDF a nahraj ho znova.',
    };
  }

  if (extension === '.ppt') {
    return {
      ok: false,
      text: '',
      method: 'ppt-unsupported',
      message:
        'Starý formát .ppt nie je spoľahlivo podporovaný. Preveď súbor do .pptx alebo PDF a nahraj ho znova.',
    };
  }

  return extractUnsupportedBinary({
    fileName,
    extension,
  });
}

// ================= BIBLIOGRAPHY DETECTION =================

function uniqueArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
}

function detectSourceType(line: string): SourceType {
  const lower = line.toLowerCase();

  if (
    lower.includes('[computer software]') ||
    lower.includes('software') ||
    lower.includes('jasp') ||
    lower.includes('spss') ||
    lower.includes('jamovi') ||
    lower.includes('r foundation')
  ) {
    return 'software';
  }

  if (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('www.')
  ) {
    return 'web';
  }

  if (
    lower.includes('doi') ||
    lower.includes('journal') ||
    lower.includes('vol.') ||
    lower.includes('volume') ||
    lower.includes('issue') ||
    lower.includes('časopis') ||
    lower.includes('štúdia') ||
    lower.includes('article') ||
    lower.includes('nutrition') ||
    lower.includes('food') ||
    lower.includes('science')
  ) {
    return 'article';
  }

  if (
    lower.includes('vydavateľ') ||
    lower.includes('publisher') ||
    lower.includes('isbn') ||
    lower.includes('monografia') ||
    lower.includes('book') ||
    lower.includes('press')
  ) {
    return 'book';
  }

  return 'unknown';
}

function extractDoi(line: string) {
  const match = line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);

  return match?.[0] || null;
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i);

  return match?.[0] || null;
}

function extractYear(line: string) {
  const match =
    line.match(/\((19|20)\d{2}\)/) ||
    line.match(/\b(19|20)\d{2}\b/) ||
    line.match(/\bn\.d\.\b/i);

  return match?.[0]?.replace(/[()]/g, '') || null;
}

function extractAuthors(line: string) {
  const beforeYear = line.split(/\((19|20)\d{2}\)|\b(19|20)\d{2}\b/)[0] || '';

  const cleaned = beforeYear
    .replace(/\bet al\./gi, '')
    .replace(/\ba kol\./gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const candidates = cleaned
    .split(/\s*(?:,|;|&|\ba\b|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => {
      if (part.length < 3) return false;
      if (!/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part)) return false;
      if (
        /^(in|from|retrieved|dostupné|available|vol|no|pp|str|s|page|pages|journal|doi|isbn)$/i.test(
          part,
        )
      ) {
        return false;
      }

      return (
        /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+$/.test(
          part,
        ) ||
        /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]+,\s*[A-Z]/.test(
          part,
        )
      );
    });

  return uniqueArray(candidates).slice(0, 20);
}

function extractTitle(line: string) {
  let working = line.trim();

  working = working.replace(/^[-•\d.)\s]+/, '');
  working = working.replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '');
  working = working.replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, '');

  const quoted =
    working.match(/"([^"]{5,220})"/) ||
    working.match(/„([^“”]{5,220})“/) ||
    working.match(/'([^']{5,220})'/);

  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const afterYear = working.split(/\((19|20)\d{2}\)|\b(19|20)\d{2}\b/).pop();

  if (afterYear && afterYear.trim().length > 8) {
    return afterYear
      .replace(/^[).,\s:-]+/, '')
      .split(/\.\s+/)[0]
      .trim()
      .slice(0, 260);
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return parts[1].slice(0, 260);
  }

  return null;
}

function looksLikeBibliographicLine(line: string) {
  const trimmed = line.trim();

  if (trimmed.length < 18) return false;

  const hasYear = /\b(19|20)\d{2}\b|\bn\.d\.\b/i.test(trimmed);
  const hasDoi = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(trimmed);
  const hasUrl = /https?:\/\/|www\./i.test(trimmed);

  const hasCitationWords =
    /publisher|journal|doi|isbn|vydavateľ|časopis|university|press|jasp|spss|software|available|dostupné|retrieved|vol\.|volume|issue|pages|pp\.|nutrition|science|food|protein|proteins|cereal|cereals|wheat|bread|amino/i.test(
      trimmed,
    );

  const hasAuthorPattern =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+,\s*[A-Z]/.test(
      trimmed,
    ) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+\s+\([12]\d{3}\)/.test(
      trimmed,
    ) ||
    /^[A-Z][A-Za-z.' -]+,\s*[A-Z]\./.test(trimmed);

  return (
    hasDoi ||
    hasUrl ||
    (hasYear && (hasCitationWords || hasAuthorPattern)) ||
    (hasAuthorPattern && hasCitationWords)
  );
}

function extractLiteratureLikeBlocks(text: string) {
  const cleaned = cleanText(text);
  const lines = cleaned.split('\n');

  const startIndexes: number[] = [];

  lines.forEach((line, index) => {
    if (
      /literatúra|literatura|references|bibliografia|bibliography|použitá literatúra|zoznam literatúry|zdroje/i.test(
        line,
      )
    ) {
      startIndexes.push(index);
    }
  });

  const blocks: string[] = [];

  for (const startIndex of startIndexes) {
    const endIndex = Math.min(lines.length, startIndex + 180);
    blocks.push(lines.slice(startIndex, endIndex).join('\n'));
  }

  return blocks.join('\n\n');
}

function extractBibliographicCandidates(text: string) {
  const cleaned = cleanText(text);
  const literatureBlock = extractLiteratureLikeBlocks(cleaned);
  const sourceText = literatureBlock
    ? `${literatureBlock}\n\n${cleaned}`
    : cleaned;

  const lines = sourceText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const joinedMultilineCandidates: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';

    joinedMultilineCandidates.push(current);

    if (current.length < 220 && next) {
      joinedMultilineCandidates.push(`${current} ${next}`.trim());
    }

    if (current.length < 160 && next && next2) {
      joinedMultilineCandidates.push(`${current} ${next} ${next2}`.trim());
    }
  }

  const candidates: BibliographicCandidate[] = [];

  for (const line of joinedMultilineCandidates) {
    if (!looksLikeBibliographicLine(line)) continue;

    candidates.push({
      raw: line.slice(0, 1200),
      authors: extractAuthors(line),
      year: extractYear(line),
      title: extractTitle(line),
      doi: extractDoi(line),
      url: extractUrl(line),
      sourceType: detectSourceType(line),
    });
  }

  const unique = new Map<string, BibliographicCandidate>();

  for (const item of candidates) {
    const key = [
      item.raw.slice(0, 220),
      item.doi || '',
      item.url || '',
      item.title || '',
      item.year || '',
    ]
      .join('|')
      .toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values()).slice(0, 250);
}

function extractAllAuthorsFromSources(sources: BibliographicCandidate[]) {
  return uniqueArray(sources.flatMap((source) => source.authors || []));
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy. Ak sú zdroje v texte, treba ich manuálne overiť alebo doplniť čitateľnejší zoznam literatúry.';
  }

  return candidates
    .map((item, index) => {
      return `${index + 1}. Pôvodný záznam:
${item.raw}

Autori: ${item.authors.length ? item.authors.join(', ') : 'neuvedené alebo potrebné overiť'}
Rok: ${item.year || 'údaj je potrebné overiť'}
Názov publikácie / zdroja: ${item.title || 'údaj je potrebné overiť'}
Typ zdroja: ${item.sourceType}
DOI: ${item.doi || 'neuvedené'}
URL: ${item.url || 'neuvedené'}`;
    })
    .join('\n\n');
}

// ================= POST =================

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Súbor nebol odoslaný. Očakáva sa pole "file".',
        },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Súbor je prázdny.',
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Súbor je príliš veľký. Maximum je ${MAX_FILE_SIZE_MB} MB.`,
          meta: {
            fileName: file.name,
            size: file.size,
            maxSize: MAX_FILE_SIZE_BYTES,
          },
        },
        { status: 413 },
      );
    }

    const fileNameFromForm = normalizeFileName(formData.get('fileName'));
    const originalNameFromForm = normalizeFileName(formData.get('originalName'));

    const isCompressedFromForm =
      String(formData.get('isCompressed') || '').toLowerCase() === 'true' ||
      String(formData.get('mustDecompressBeforeExtraction') || '').toLowerCase() ===
        'true';

    const receivedFileName = normalizeFileName(file.name || fileNameFromForm);

    const isCompressed = isGzipUpload({
      file,
      fileName: receivedFileName,
      isCompressedFromForm,
    });

    const effectiveFileName = getEffectiveFileName({
      fileName: receivedFileName,
      originalName: originalNameFromForm,
      isCompressed,
    });

    const extension = getFileExtension(effectiveFileName);

    const originalBuffer = await fileToBuffer(file);

    const usableBuffer = isCompressed ? safeGunzip(originalBuffer) : originalBuffer;

    const result = await extractByType({
      buffer: usableBuffer,
      fileName: effectiveFileName,
    });

    if (!result.ok || !result.text.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.message ||
            'Text sa nepodarilo extrahovať alebo bol výsledok prázdny.',
          text: '',
          extractedText: '',
          method: result.method,
          bibliography: {
            authors: [],
            detectedSources: [],
            detectedSourcesCount: 0,
            formatted: '',
          },
          meta: {
            receivedFileName,
            effectiveFileName,
            originalName: originalNameFromForm,
            extension,
            size: file.size,
            decompressedSize: usableBuffer.length,
            type: file.type || null,
            isCompressed,
            ...result.meta,
          },
        },
        { status: 422 },
      );
    }

    const text = limitText(result.text);
    const detectedSources = extractBibliographicCandidates(text);
    const authors = extractAllAuthorsFromSources(detectedSources);
    const formatted = formatBibliographicCandidates(detectedSources);

    return NextResponse.json({
      ok: true,
      text,
      extractedText: text,
      content: text,
      method: result.method,
      message:
        result.message ||
        'Text bol úspešne extrahovaný a bibliografické zdroje boli analyzované.',
      detectedSources,
      authors,
      formattedSources: formatted,
      sources: formatted,
      bibliography: {
        authors,
        detectedSources,
        detectedSourcesCount: detectedSources.length,
        formatted,
        formattedSources: formatted,
        sources: formatted,
      },
      meta: {
        receivedFileName,
        effectiveFileName,
        originalName: originalNameFromForm,
        extension,
        size: file.size,
        compressedSize: isCompressed ? originalBuffer.length : null,
        decompressedSize: usableBuffer.length,
        type: file.type || null,
        isCompressed,
        chars: text.length,
        detectedSourcesCount: detectedSources.length,
        authorsCount: authors.length,
        ...result.meta,
      },
    });
  } catch (error) {
    console.error('EXTRACT_TEXT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}