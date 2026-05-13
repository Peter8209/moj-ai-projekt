import { NextRequest, NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= CONFIG =================

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Nevracaj extrémne veľký text, aby sa následne nezasekol /api/chat.
const MAX_RETURN_TEXT_CHARS = 180_000;
const MAX_DETECTED_SOURCES = 500;

type SourceType =
  | 'book'
  | 'article'
  | 'web'
  | 'software'
  | 'standard'
  | 'law'
  | 'thesis'
  | 'conference'
  | 'report'
  | 'chapter'
  | 'dataset'
  | 'unknown';

type BibliographicCandidate = {
  raw: string;
  authors: string[];
  year: string | null;
  title: string | null;
  doi: string | null;
  url: string | null;
  isbn: string | null;
  issn: string | null;
  publisher: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  sourceType: SourceType;
  sourceFileName?: string;
  sourcePage?: number | null;
  confidence: number;
  detectedFormat: string;
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
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeSpaces(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeDash(value: string) {
  return String(value || '')
    .replace(/[‐-‒–—―]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function uniqueArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
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

function getPageNumberFromPageHeader(line: string) {
  const match = line.match(/^STRANA\s+(\d+)/i);

  if (!match?.[1]) return null;

  const number = Number(match[1]);

  return Number.isFinite(number) ? number : null;
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
// DÔLEŽITÉ:
// PDF sa v tomto route.ts už nespracúva cez pdfjs-dist ani @napi-rs/canvas.
// Tým sa odstráni Turbopack build chyba:
// @napi-rs/canvas/js-binding.js non-ecmascript placeable asset.
// PDF má byť extrahované vo frontende v ChatPage cez pdfjs-dist a lokálny worker v /public/pdfjs/.

async function extractPdfTextDisabled(fileName: string): Promise<ExtractResult> {
  return {
    ok: false,
    text: '',
    method: 'pdf-disabled-in-extract-text-route',
    message:
      `PDF súbor ${fileName} sa v /api/extract-text už nespracúva. ` +
      'PDF extrakcia má prebehnúť vo frontende cez pdfjs-dist, aby build neťahal @napi-rs/canvas.',
  };
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
    return extractPdfTextDisabled(fileName);
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

function removeLeadingReferenceMarker(value: string) {
  return String(value || '')
    .replace(/^\s*\[\d+\]\s*/, '')
    .replace(/^\s*\(\d+\)\s*/, '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/^\s*\d+\)\s*/, '')
    .replace(/^\s*[•\-–—]\s*/, '')
    .trim();
}

function cleanReference(value: string) {
  return normalizeSpaces(
    removeLeadingReferenceMarker(value)
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])([^\s])/g, '$1 $2')
      .replace(/\.{2,}/g, '.'),
  );
}

function uniqueByCleanedText(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = cleanReference(value);

    if (!cleaned) continue;

    const key = cleaned.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function detectSourceType(line: string): SourceType {
  if (
    /\biso\s*\d+|\bstn\s+|en\s+iso|astm\s+|din\s+|iec\s+|technical standard|norma\b/i.test(
      line,
    )
  ) {
    return 'standard';
  }

  if (
    /zákon|vyhláška|nariadenie|smernica|act no\.|regulation|directive|legal|eur-lex/i.test(
      line,
    )
  ) {
    return 'law';
  }

  if (
    /dizertačná práca|diplomová práca|bakalárska práca|thesis|dissertation|doctoral dissertation|master.?s thesis|bachelor.?s thesis/i.test(
      line,
    )
  ) {
    return 'thesis';
  }

  if (
    /conference|proceedings|symposium|kongres|konferencia|zborník|in proceedings/i.test(
      line,
    )
  ) {
    return 'conference';
  }

  if (
    /report|správa|technical report|annual report|working paper|white paper|research report/i.test(
      line,
    )
  ) {
    return 'report';
  }

  if (
    /\bin:\s+.+(ed\.|eds\.|editor|editors|zost\.|editori)|chapter|kapitola/i.test(
      line,
    )
  ) {
    return 'chapter';
  }

  if (
    /\bdataset\b|data set|zenodo|figshare|dryad|osf\.io|dataverse/i.test(line)
  ) {
    return 'dataset';
  }

  if (
    /\[computer software\]|software|program|jasp|spss|jamovi|r foundation|python|matlab|stata|sas|microsoft excel/i.test(
      line,
    )
  ) {
    return 'software';
  }

  if (/https?:\/\/|www\.|retrieved|available online|dostupné online/i.test(line)) {
    return 'web';
  }

  if (
    /doi|journal|vol\.|volume|issue|časopis|štúdia|article|nutrition|food|science|plant physiol|plant breed|j\. cereal sci|j\. inst\. brew|euphytica|nova biotechnologica|plant mol\.? biol|periodikum|revue|bulletin/i.test(
      line,
    )
  ) {
    return 'article';
  }

  if (
    /publisher|vydavateľ|vydavatel|isbn|monografia|book|press|nakladatelství|vydanie|edition|cambridge|springer|elsevier|wiley|routledge|oxford|crc press/i.test(
      line,
    )
  ) {
    return 'book';
  }

  return 'unknown';
}

function extractDoi(line: string) {
  const match = line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);

  return match?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/[^\s<>)]+|www\.[^\s<>)]+/i);

  return match?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractIsbn(line: string) {
  const match =
    line.match(
      /\bISBN(?:-1[03])?:?\s*((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx])\b/i,
    ) || line.match(/\b(?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx]\b/);

  return match?.[1]?.trim() || match?.[0]?.trim() || null;
}

function extractIssn(line: string) {
  const match = line.match(/\bISSN:?\s*(\d{4}[-\s]?\d{3}[\dXx])\b/i);

  return match?.[1]?.trim() || null;
}

function extractYear(line: string) {
  const matches = Array.from(
    line.matchAll(/\b(18|19|20|21)\d{2}[a-z]?\b|\bn\.d\.\b|\bbez dátumu\b/gi),
  ).map((match) => match[0]);

  if (!matches.length) return null;

  return matches[0].replace(/[()]/g, '');
}

function extractPages(line: string) {
  const patterns = [
    /\bs\.\s*(\d+\s*[-–—]\s*\d+|\d+)/i,
    /\bpp\.\s*(\d+\s*[-–—]\s*\d+|\d+)/i,
    /\bp\.\s*(\d+\s*[-–—]\s*\d+|\d+)/i,
    /\bpages?\s*(\d+\s*[-–—]\s*\d+|\d+)/i,
    /:\s*(\d+\s*[-–—]\s*\d+)\b/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);

    if (match?.[1]) return normalizeDash(match[1]);
  }

  return null;
}

function extractVolume(line: string) {
  const patterns = [
    /\bvol\.\s*(\d+[A-Za-z]?)/i,
    /\bvolume\s*(\d+[A-Za-z]?)/i,
    /\broč\.\s*(\d+[A-Za-z]?)/i,
    /\b(?:journal|časopis)[^,]*,\s*(\d+)\s*(?:\(|,)/i,
    /,\s*(\d+)\s*\(\d+\)\s*,/,
    /\b([A-Z][A-Za-z. ]+),\s*(\d+)\s*,\s*(18|19|20|21)\d{2}/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);

    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function extractIssue(line: string) {
  const patterns = [
    /\bno\.\s*(\d+[A-Za-z]?)/i,
    /\bissue\s*(\d+[A-Za-z]?)/i,
    /\bč\.\s*(\d+[A-Za-z]?)/i,
    /\(\s*(\d+[A-Za-z]?)\s*\)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);

    if (match?.[1]) return match[1].trim();
  }

  return null;
}

function extractPublisher(line: string) {
  const patterns = [
    /(?:publisher|vydavateľ|vydavatel|nakladatelství)\s*[:.-]\s*([^.;\n]+)/i,
    /\b(?:New York|London|Praha|Bratislava|Brno|Oxford|Cambridge|Berlin|Amsterdam|Paris|Wien|Vienna)\s*:\s*([^.;\n]+)/i,
    /\b(Springer|Elsevier|Wiley|Routledge|Oxford University Press|Cambridge University Press|CRC Press|Taylor\s*&\s*Francis|SAGE|Pearson|McGraw-Hill|Academic Press)\b/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);

    if (match?.[1]) return cleanText(match[1]).slice(0, 160);
  }

  return null;
}

function extractJournal(line: string) {
  const cleaned = removeLeadingReferenceMarker(line);

  const knownJournalMatch = cleaned.match(
    /\b(Plant Physiol\.? Biochem\.?|Plant Molecular Biology Reporter|Plant Mol\.? Biol\.? Rep\.?|Journal of Cereal Science|J\. Cereal Sci\.?|Journal of the Institute of Brewing|J\. Inst\. Brew\.?|Euphytica|Plant Breeding|Plant Breed\.?|Nova Biotechnologica|Farmář|Food Chemistry|Food Science and Technology|Nature|Science|PLOS ONE|Nutrients|Cereal Chemistry|Potravinarstvo|Potravinárstvo)\b/i,
  );

  if (knownJournalMatch?.[1]) return knownJournalMatch[1].trim();

  const isoLike =
    cleaned.match(/:\s*.+?\.\s*([^.,]+),\s*\d+\s*,\s*(18|19|20|21)\d{2}/) ||
    cleaned.match(/\.\s*([^.,]+),\s*\d+\s*,\s*(18|19|20|21)\d{2}/);

  if (isoLike?.[1]) return cleanText(isoLike[1]).slice(0, 160);

  const apaLike =
    cleaned.match(/\)\.\s*[^.]+?\.\s*([^.,]+),\s*\d+/) ||
    cleaned.match(/\d{4}\.\s*[^.]+?\.\s*([^.,]+),\s*\d+/);

  if (apaLike?.[1]) return cleanText(apaLike[1]).slice(0, 160);

  return null;
}

function normalizeAuthorCandidate(value: string) {
  return cleanText(value)
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .replace(/\s+\(.*?\)\s*$/g, '')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

function isValidAuthorCandidate(value: string) {
  const part = normalizeAuthorCandidate(value);

  if (part.length < 2) return false;
  if (part.length > 120) return false;

  if (
    /^(in|from|retrieved|dostupné|available|vol|volume|no|issue|pp|str|s|page|pages|journal|doi|isbn|issn|publisher|vydavateľ|university|press|editor|eds?|accessed|online)$/i.test(
      part,
    )
  ) {
    return false;
  }

  if (/\d{4}/.test(part)) return false;
  if (/https?:\/\/|www\.|doi|isbn|issn/i.test(part)) return false;

  const surnameInitials =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.' -]+,\s*(?:[A-Z]\.?\s*){1,8}$/;

  const nameSurname =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+(?:\s+[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+){0,4}$/;

  const corporate =
    /^(WHO|FAO|OECD|UNESCO|UNICEF|European Commission|World Health Organization|Food and Agriculture Organization|Ministerstvo|Úrad|Štatistický úrad|European Union|ISO|STN|ASTM|DIN|IEC)\b/i;

  return (
    surnameInitials.test(part) ||
    nameSurname.test(part) ||
    corporate.test(part)
  );
}

function extractIsoAuthors(line: string) {
  const cleaned = removeLeadingReferenceMarker(line);

  const beforeTitle =
    cleaned.split(/\s*:\s+/)[0] ||
    cleaned.split(/\.\s+(?=[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ0-9])/)[0] ||
    '';

  const matches = Array.from(
    beforeTitle.matchAll(
      /[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.'-]+,\s*(?:[A-Z]\.?\s*){1,8}/g,
    ),
  ).map((match) => normalizeAuthorCandidate(match[0]));

  return uniqueArray(matches.filter(isValidAuthorCandidate)).slice(0, 30);
}

function extractAuthors(line: string) {
  const isoAuthors = extractIsoAuthors(line);

  if (isoAuthors.length) return isoAuthors;

  const cleaned = removeLeadingReferenceMarker(line);

  const beforeYear =
    cleaned.split(/\((18|19|20|21)\d{2}[a-z]?\)|\b(18|19|20|21)\d{2}[a-z]?\b/)[0] ||
    '';

  const beforeTitle =
    beforeYear.split(/\.\s+(?=[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ0-9])/)[0] || beforeYear;

  const possibleAuthorPart = cleanText(beforeTitle)
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '');

  const parts = possibleAuthorPart
    .split(/\s*(?:;|&|\band\b|\ba\b|\bet\b|\bund\b|\s+\|\s+)\s*/i)
    .map(normalizeAuthorCandidate)
    .filter(isValidAuthorCandidate);

  return uniqueArray(parts).slice(0, 30);
}

function extractTitle(line: string) {
  let working = removeLeadingReferenceMarker(line);

  working = working.replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '');
  working = working.replace(/https?:\/\/[^\s<>)]+|www\.[^\s<>)]+/gi, '');

  const quoted =
    working.match(/"([^"]{5,260})"/) ||
    working.match(/„([^“”]{5,260})“/) ||
    working.match(/'([^']{5,260})'/);

  if (quoted?.[1]) {
    return cleanText(quoted[1]).slice(0, 300);
  }

  const colonTitle = working.match(/:\s*([^.;]{8,350})[.;]/);

  if (colonTitle?.[1]) {
    return cleanText(colonTitle[1]).slice(0, 300);
  }

  const afterYear = working
    .split(/\((18|19|20|21)\d{2}[a-z]?\)|\b(18|19|20|21)\d{2}[a-z]?\b/)
    .pop();

  if (afterYear && afterYear.trim().length > 8) {
    const possible = afterYear
      .replace(/^[).,\s:-]+/, '')
      .split(/\.\s+/)[0]
      .trim();

    if (possible.length >= 5 && !/^s\.|^pp\.|^vol\.|^doi/i.test(possible)) {
      return possible.slice(0, 300);
    }
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const possible = parts[1];

    if (possible.length >= 5) return possible.slice(0, 300);
  }

  return null;
}

function detectCitationFormat(line: string) {
  const cleaned = removeLeadingReferenceMarker(line);

  if (/^\[\d+\]/.test(line.trim())) return 'numbered-bracket';
  if (/^\d+\./.test(line.trim()) || /^\d+\)/.test(line.trim())) {
    return 'numbered-list';
  }

  if (/:\s+.+\.\s+.+,\s*\d+,\s*(18|19|20|21)\d{2}/.test(cleaned)) {
    return 'iso-690';
  }

  if (/\([12]\d{3}[a-z]?\)\./.test(cleaned)) return 'apa-harvard';
  if (/doi|https?:\/\/|www\./i.test(cleaned)) return 'doi-url';
  if (/isbn/i.test(cleaned)) return 'book-isbn';
  if (/in:\s/i.test(cleaned)) return 'chapter-or-proceedings';

  return 'unknown-format';
}

function scoreBibliographicLine(line: string) {
  let score = 0;

  if (/\b(18|19|20|21)\d{2}[a-z]?\b|\bn\.d\.\b/i.test(line)) score += 18;
  if (/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(line)) score += 30;
  if (/https?:\/\/|www\./i.test(line)) score += 22;
  if (/\bISBN(?:-1[03])?:?/i.test(line)) score += 24;
  if (/\bISSN:?/i.test(line)) score += 18;
  if (extractAuthors(line).length > 0) score += 28;
  if (extractTitle(line)) score += 16;
  if (extractPages(line)) score += 8;
  if (extractVolume(line)) score += 6;
  if (extractIssue(line)) score += 4;
  if (detectSourceType(line) !== 'unknown') score += 10;
  if (/:\s+.+\.\s+.+,\s*\d+,\s*(18|19|20|21)\d{2}/.test(line)) score += 22;

  if (
    /journal|vol\.|issue|publisher|press|conference|thesis|report|norma|standard|zákon|doi|isbn|issn|j\.|plant|cereal|euphytica|biotechnologica|farmář|potravin/i.test(
      line,
    )
  ) {
    score += 10;
  }

  if (line.length >= 35) score += 8;
  if (line.length >= 80) score += 6;

  return Math.min(score, 100);
}

function looksLikeBibliographicLine(line: string) {
  const trimmed = cleanText(line);

  if (trimmed.length < 18) return false;
  if (trimmed.length > 2200) return false;

  return scoreBibliographicLine(trimmed) >= 34;
}

function extractLiteratureLikeBlocks(text: string) {
  const cleaned = cleanText(text);
  const lines = cleaned.split('\n');

  const startIndexes: number[] = [];

  lines.forEach((line, index) => {
    if (
      /literatúra|literatura|references|bibliografia|bibliography|použitá literatúra|zoznam literatúry|zdroje|works cited|literature cited|referencie|citácie|citations|sources/i.test(
        line,
      )
    ) {
      startIndexes.push(index);
    }
  });

  const blocks: string[] = [];

  for (const startIndex of startIndexes) {
    const endIndex = Math.min(lines.length, startIndex + 700);
    blocks.push(lines.slice(startIndex, endIndex).join('\n'));
  }

  return blocks.join('\n\n');
}

function splitPotentialReferenceEntries(text: string) {
  const cleaned = cleanText(text);
  const lines = cleaned
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean);

  const entries: string[] = [];
  let current = '';

  const startsNewEntry = (line: string) => {
    return (
      /^\s*(\[\d+\]|\d+\.|\d+\)|[•\-–—])\s+/.test(line) ||
      /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+,\s*[A-Z]/.test(
        line,
      ) ||
      /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+\s+\((18|19|20|21)\d{2}[a-z]?\)/.test(
        line,
      )
    );
  };

  for (const line of lines) {
    if (startsNewEntry(line) && current) {
      entries.push(current.trim());
      current = line;
    } else {
      current = current ? `${current} ${line}` : line;
    }

    if (current.length > 1800) {
      entries.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) entries.push(current.trim());

  return entries;
}

function extractInlineIsoReferences(text: string) {
  const oneLine = normalizeSpaces(text);

  const pattern =
    /(?:^|[\n ]|(?<=\. ))([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.'-]+,\s*(?:[A-Z]\.?\s*){1,8}(?:,\s*[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.'-]+,\s*(?:[A-Z]\.?\s*){1,8}){0,12}\s*:\s*.{10,420}?\b(?:18|19|20|21)\d{2}.{0,80}?(?:s\.|pp\.|p\.|pages?|DOI|https?:\/\/|www\.|$).{0,80}?)(?=(?:\s+[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.'-]+,\s*(?:[A-Z]\.?\s*){1,8}(?:,\s*[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽa-záäčďéíĺľňóôŕšťúýž.'-]+,\s*(?:[A-Z]\.?\s*){1,8}){0,12}\s*:)|$)/g;

  return Array.from(oneLine.matchAll(pattern))
    .map((match) => cleanReference(match[1] || ''))
    .filter((item) => item.length >= 35)
    .slice(0, 1000);
}

function buildCandidateItems(text: string) {
  const cleaned = cleanText(text);
  const literatureBlock = extractLiteratureLikeBlocks(cleaned);

  const sourceText = literatureBlock
    ? `${literatureBlock}\n\n${cleaned}`
    : cleaned;

  const lines = sourceText
    .split('\n')
    .map((line) => cleanText(line))
    .filter(Boolean);

  const candidates: {
    raw: string;
    sourcePage: number | null;
  }[] = [];

  let currentPage: number | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const pageFromHeader = getPageNumberFromPageHeader(current);

    if (pageFromHeader) currentPage = pageFromHeader;

    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const next3 = lines[i + 3] || '';
    const next4 = lines[i + 4] || '';

    candidates.push({ raw: current, sourcePage: currentPage });

    if (current.length < 320 && next) {
      candidates.push({
        raw: `${current} ${next}`,
        sourcePage: currentPage,
      });
    }

    if (current.length < 260 && next && next2) {
      candidates.push({
        raw: `${current} ${next} ${next2}`,
        sourcePage: currentPage,
      });
    }

    if (current.length < 210 && next && next2 && next3) {
      candidates.push({
        raw: `${current} ${next} ${next2} ${next3}`,
        sourcePage: currentPage,
      });
    }

    if (current.length < 160 && next && next2 && next3 && next4) {
      candidates.push({
        raw: `${current} ${next} ${next2} ${next3} ${next4}`,
        sourcePage: currentPage,
      });
    }
  }

  const structuredEntries = splitPotentialReferenceEntries(
    literatureBlock || cleaned,
  ).map((raw) => ({
    raw,
    sourcePage: null as number | null,
  }));

  const inlineEntries = extractInlineIsoReferences(literatureBlock || cleaned).map(
    (raw) => ({
      raw,
      sourcePage: null as number | null,
    }),
  );

  return [...structuredEntries, ...inlineEntries, ...candidates];
}

function extractBibliographicCandidates(text: string, sourceFileName: string) {
  const allPotential = buildCandidateItems(text);
  const candidates: BibliographicCandidate[] = [];

  for (const item of allPotential) {
    const raw = cleanReference(item.raw);

    if (!looksLikeBibliographicLine(raw)) continue;

    candidates.push({
      raw: raw.slice(0, 1800),
      authors: extractAuthors(raw),
      year: extractYear(raw),
      title: extractTitle(raw),
      doi: extractDoi(raw),
      url: extractUrl(raw),
      isbn: extractIsbn(raw),
      issn: extractIssn(raw),
      publisher: extractPublisher(raw),
      journal: extractJournal(raw),
      volume: extractVolume(raw),
      issue: extractIssue(raw),
      pages: extractPages(raw),
      sourceType: detectSourceType(raw),
      sourceFileName,
      sourcePage: item.sourcePage,
      confidence: scoreBibliographicLine(raw),
      detectedFormat: detectCitationFormat(raw),
    });
  }

  const unique = new Map<string, BibliographicCandidate>();

  for (const item of candidates) {
    const strongKey = [
      item.doi || '',
      item.isbn || '',
      item.issn || '',
      item.url || '',
      item.title || '',
      item.year || '',
      item.authors.join(',') || '',
      item.sourceFileName || '',
    ]
      .join('|')
      .toLowerCase();

    const fallbackKey = [
      item.raw.slice(0, 300),
      item.year || '',
      item.sourceFileName || '',
    ]
      .join('|')
      .toLowerCase();

    const key = strongKey.replace(/\|/g, '').trim() ? strongKey : fallbackKey;
    const existing = unique.get(key);

    if (!existing || item.confidence > existing.confidence) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_DETECTED_SOURCES);
}

function extractAllAuthorsFromSources(sources: BibliographicCandidate[]) {
  return uniqueArray(sources.flatMap((source) => source.authors || []));
}

// ================= FINAL SOURCE OUTPUT FORMAT =================

function titleCaseName(value: string) {
  return String(value || '')
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => {
      if (part === ' ' || part === '-') return part;

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

function normalizeAuthorNameForClassic(author: string) {
  const cleaned = normalizeAuthorCandidate(author);

  if (!cleaned) return '';

  if (cleaned.includes(',')) {
    const [surnameRaw, initialsRaw] = cleaned.split(',', 2);
    const surname = surnameRaw.trim().toUpperCase();
    const initials = normalizeSpaces(initialsRaw || '')
      .split(/\s+|\./)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}.`)
      .join('');

    return initials ? `${surname}, ${initials}` : surname;
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].toUpperCase();

  const surname = parts[parts.length - 1].toUpperCase();
  const initials = parts
    .slice(0, -1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join('');

  return initials ? `${surname}, ${initials}` : surname;
}

function normalizeAuthorNameForApa(author: string) {
  const cleaned = normalizeAuthorCandidate(author);

  if (!cleaned) return '';

  if (cleaned.includes(',')) {
    const [surnameRaw, initialsRaw] = cleaned.split(',', 2);
    const surname = titleCaseName(surnameRaw.trim());
    const initials = normalizeSpaces(initialsRaw || '')
      .split(/\s+|\./)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}.`)
      .join(' ');

    return initials ? `${surname}, ${initials}` : surname;
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return titleCaseName(parts[0]);

  const surname = titleCaseName(parts[parts.length - 1]);
  const initials = parts
    .slice(0, -1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(' ');

  return initials ? `${surname}, ${initials}` : surname;
}

function formatClassicAuthors(authors: string[]) {
  const formatted = authors.map(normalizeAuthorNameForClassic).filter(Boolean);

  return formatted.length ? formatted.join(', ') : 'NEUVEDENÝ AUTOR';
}

function formatApaAuthors(authors: string[]) {
  const formatted = authors.map(normalizeAuthorNameForApa).filter(Boolean);

  if (!formatted.length) return 'Neuvedený autor';
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;

  return `${formatted.slice(0, -1).join(', ')} & ${
    formatted[formatted.length - 1]
  }`;
}

function formatSourceAsOriginalLikeRecord(source: BibliographicCandidate) {
  const raw = cleanReference(source.raw);

  if (raw && source.confidence >= 50) {
    return raw.endsWith('.') ? raw : `${raw}.`;
  }

  const authors = formatClassicAuthors(source.authors);
  const title = source.title || 'Názov je potrebné overiť';
  const journal = source.journal ? ` ${source.journal},` : '';
  const volume = source.volume ? ` ${source.volume}` : '';
  const issue = source.issue ? ` (${source.issue})` : '';
  const year = source.year ? ` ${source.year}` : '';
  const pages = source.pages ? `, s. ${source.pages}` : '';
  const doi = source.doi ? ` DOI: ${source.doi}` : '';
  const url = source.url ? ` Dostupné na: ${source.url}` : '';

  return cleanReference(
    `${authors}: ${title}.${journal}${volume}${issue}${year}${pages}.${doi}${url}`,
  );
}

function formatSourceAsApaRecord(source: BibliographicCandidate) {
  const authors = formatApaAuthors(source.authors);
  const year = source.year || 'n.d.';
  const title = source.title || source.raw || 'Názov je potrebné overiť';
  const journal = source.journal ? ` ${source.journal}` : '';
  const volume = source.volume ? `, ${source.volume}` : '';
  const issue = source.issue ? `(${source.issue})` : '';
  const pages = source.pages ? `, ${source.pages}` : '';
  const doi = source.doi ? ` https://doi.org/${source.doi}` : '';
  const url = source.url ? ` ${source.url}` : '';

  return cleanReference(
    `${authors} (${year}). ${title}.${journal}${volume}${issue}${pages}.${doi || url}`,
  );
}

function getCitationSurname(source: BibliographicCandidate) {
  const firstAuthor = source.authors?.[0];

  if (!firstAuthor) return 'Autor';

  const cleaned = normalizeAuthorCandidate(firstAuthor);

  if (cleaned.includes(',')) {
    return titleCaseName(cleaned.split(',')[0].trim());
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  return titleCaseName(surname || 'Autor');
}

function buildCitationVariantsForSources(sources: BibliographicCandidate[]) {
  if (!sources.length) {
    return `Parentetický odkaz: (autor je potrebné overiť, rok je potrebné overiť)
Naratívny odkaz: Autor je potrebné overiť (rok je potrebné overiť) uvádza...`;
  }

  const variants: string[] = [];

  for (const source of sources.slice(0, 50)) {
    const surname = getCitationSurname(source);
    const year = source.year || 'rok je potrebné overiť';

    if (source.authors.length === 1) {
      variants.push(`Parentetický odkaz: (${surname}, ${year})`);
      variants.push(`Naratívny odkaz: ${surname} (${year}) uvádza...`);
      continue;
    }

    if (source.authors.length === 2) {
      const secondAuthor = source.authors[1];
      const secondCleaned = normalizeAuthorCandidate(secondAuthor);
      const secondSurname = secondCleaned.includes(',')
        ? titleCaseName(secondCleaned.split(',')[0].trim())
        : titleCaseName(
            secondCleaned.split(/\s+/).filter(Boolean).slice(-1)[0] ||
              'spoluautor',
          );

      variants.push(`Parentetický odkaz: (${surname} & ${secondSurname}, ${year})`);
      variants.push(
        `Naratívny odkaz: ${surname} a ${secondSurname} (${year}) uvádzajú...`,
      );
      continue;
    }

    variants.push(`Parentetický odkaz: (${surname} et al., ${year})`);
    variants.push(`Naratívny odkaz: ${surname} et al. (${year}) uvádzajú...`);
  }

  return uniqueByCleanedText(variants).join('\n');
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli nájdené jednoznačné bibliografické záznamy v priložených dokumentoch.';
  }

  return uniqueByCleanedText(
    candidates.map((source) => formatSourceAsOriginalLikeRecord(source)),
  ).join('\n');
}

function formatApaBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.';
  }

  return uniqueByCleanedText(
    candidates.map((source) => formatSourceAsApaRecord(source)),
  ).join('\n');
}

function buildAuthorsList(authors: string[]) {
  if (!authors.length) {
    return 'Autori neboli automaticky identifikovaní alebo ich treba overiť.';
  }

  return authors.join('\n');
}

function buildSourceOutputSection({
  sources,
  authors,
  effectiveFileName,
}: {
  sources: BibliographicCandidate[];
  authors: string[];
  effectiveFileName: string;
}) {
  return `Použité zdroje a autori

A. Zdroje nájdené v priložených dokumentoch
${formatBibliographicCandidates(sources)}

B. Autori nájdení v dokumentoch
${buildAuthorsList(authors)}

C. Formátované bibliografické záznamy
${formatApaBibliographicCandidates(sources)}

D. Varianty odkazov v texte
${buildCitationVariantsForSources(sources)}

E. Priložené dokumenty použité ako podklad
${effectiveFileName.replace(/\.[a-z0-9]+$/i, '')}

F. Neúplné alebo neoveriteľné zdroje
Pri každom zázname, kde chýba autor, rok, názov, vydavateľ, DOI, URL, ročník, číslo alebo strany, je potrebné údaj overiť podľa pôvodného dokumentu alebo knižničného záznamu.`;
}

function buildEmptySourceOutputSection(effectiveFileName: string) {
  return `Použité zdroje a autori

A. Zdroje nájdené v priložených dokumentoch
Neboli nájdené jednoznačné bibliografické záznamy v priložených dokumentoch.

B. Autori nájdení v dokumentoch
Autori neboli automaticky identifikovaní alebo ich treba overiť.

C. Formátované bibliografické záznamy
Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.

D. Varianty odkazov v texte
Parentetický odkaz: (autor je potrebné overiť, rok je potrebné overiť)
Naratívny odkaz: Autor je potrebné overiť (rok je potrebné overiť) uvádza...

E. Priložené dokumenty použité ako podklad
${effectiveFileName.replace(/\.[a-z0-9]+$/i, '')}

F. Neúplné alebo neoveriteľné zdroje
Údaje je potrebné overiť podľa pôvodného dokumentu alebo knižničného záznamu.`;
}

function buildNoTextJsonResponse({
  result,
  receivedFileName,
  effectiveFileName,
  originalNameFromForm,
  extension,
  file,
  originalBufferLength,
  usableBufferLength,
  isCompressed,
  status = 422,
}: {
  result: ExtractResult;
  receivedFileName: string;
  effectiveFileName: string;
  originalNameFromForm: string;
  extension: string;
  file: File;
  originalBufferLength: number | null;
  usableBufferLength: number | null;
  isCompressed: boolean;
  status?: number;
}) {
  const emptySourceOutputSection = buildEmptySourceOutputSection(effectiveFileName);

  return NextResponse.json(
    {
      ok: false,
      error:
        result.message ||
        'Text sa nepodarilo extrahovať alebo bol výsledok prázdny.',
      text: '',
      extractedText: '',
      content: '',
      method: result.method,
      detectedSources: [],
      authors: [],
      formattedSources:
        'Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.',
      sources:
        'Neboli nájdené jednoznačné bibliografické záznamy v priložených dokumentoch.',
      citationVariants:
        'Parentetický odkaz: (autor je potrebné overiť, rok je potrebné overiť)\nNaratívny odkaz: Autor je potrebné overiť (rok je potrebné overiť) uvádza...',
      sourceOutputSection: emptySourceOutputSection,
      bibliography: {
        title: 'Použité zdroje a autori',
        authors: [],
        detectedSources: [],
        detectedSourcesCount: 0,
        formatted:
          'Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.',
        formattedSources:
          'Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.',
        sources:
          'Neboli nájdené jednoznačné bibliografické záznamy v priložených dokumentoch.',
        citationVariants:
          'Parentetický odkaz: (autor je potrebné overiť, rok je potrebné overiť)\nNaratívny odkaz: Autor je potrebné overiť (rok je potrebné overiť) uvádza...',
        sourceOutputSection: emptySourceOutputSection,
        sections: {
          title: 'Použité zdroje a autori',
          a_sourcesFoundInAttachedDocuments:
            'Neboli nájdené jednoznačné bibliografické záznamy v priložených dokumentoch.',
          b_authorsFoundInDocuments:
            'Autori neboli automaticky identifikovaní alebo ich treba overiť.',
          c_formattedBibliographicRecords:
            'Neboli vytvorené formátované bibliografické záznamy, pretože v dokumentoch neboli nájdené dostatočné bibliografické údaje.',
          d_inTextCitationVariants:
            'Parentetický odkaz: (autor je potrebné overiť, rok je potrebné overiť)\nNaratívny odkaz: Autor je potrebné overiť (rok je potrebné overiť) uvádza...',
          e_attachedDocumentsUsedAsSource: effectiveFileName.replace(
            /\.[a-z0-9]+$/i,
            '',
          ),
          f_incompleteOrUnverifiableSources:
            'Údaje je potrebné overiť podľa pôvodného dokumentu alebo knižničného záznamu.',
        },
      },
      meta: {
        receivedFileName,
        effectiveFileName,
        originalName: originalNameFromForm,
        extension,
        size: file.size,
        compressedSize: isCompressed ? originalBufferLength : null,
        decompressedSize: usableBufferLength,
        type: file.type || null,
        isCompressed,
        ...result.meta,
      },
    },
    { status },
  );
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

    if (extension === '.pdf') {
      const result = await extractPdfTextDisabled(effectiveFileName);

      return buildNoTextJsonResponse({
        result,
        receivedFileName,
        effectiveFileName,
        originalNameFromForm,
        extension,
        file,
        originalBufferLength: null,
        usableBufferLength: null,
        isCompressed,
        status: 400,
      });
    }

    const originalBuffer = await fileToBuffer(file);
    const usableBuffer = isCompressed ? safeGunzip(originalBuffer) : originalBuffer;

    const result = await extractByType({
      buffer: usableBuffer,
      fileName: effectiveFileName,
    });

    if (!result.ok || !result.text.trim()) {
      return buildNoTextJsonResponse({
        result,
        receivedFileName,
        effectiveFileName,
        originalNameFromForm,
        extension,
        file,
        originalBufferLength: originalBuffer.length,
        usableBufferLength: usableBuffer.length,
        isCompressed,
        status: 422,
      });
    }

    const text = limitText(result.text);

    const detectedSources = extractBibliographicCandidates(
      text,
      effectiveFileName,
    );

    const authors = extractAllAuthorsFromSources(detectedSources);

    const sourcesFoundInDocuments = formatBibliographicCandidates(detectedSources);
    const apaFormattedSources = formatApaBibliographicCandidates(detectedSources);
    const citationVariants = buildCitationVariantsForSources(detectedSources);

    const sourceOutputSection = buildSourceOutputSection({
      sources: detectedSources,
      authors,
      effectiveFileName,
    });

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

      formattedSources: apaFormattedSources,
      sources: sourcesFoundInDocuments,
      citationVariants,
      sourceOutputSection,

      bibliography: {
        title: 'Použité zdroje a autori',
        authors,
        detectedSources,
        detectedSourcesCount: detectedSources.length,

        formatted: apaFormattedSources,
        formattedSources: apaFormattedSources,
        sources: sourcesFoundInDocuments,
        citationVariants,
        sourceOutputSection,

        sections: {
          title: 'Použité zdroje a autori',
          a_sourcesFoundInAttachedDocuments: sourcesFoundInDocuments,
          b_authorsFoundInDocuments: buildAuthorsList(authors),
          c_formattedBibliographicRecords: apaFormattedSources,
          d_inTextCitationVariants: citationVariants,
          e_attachedDocumentsUsedAsSource: effectiveFileName.replace(
            /\.[a-z0-9]+$/i,
            '',
          ),
          f_incompleteOrUnverifiableSources:
            'Pri každom zázname, kde chýba autor, rok, názov, vydavateľ, DOI, URL, ročník, číslo alebo strany, je potrebné údaj overiť podľa pôvodného dokumentu alebo knižničného záznamu.',
        },
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
        sourceTypesCount: detectedSources.reduce<Record<string, number>>(
          (acc, source) => {
            acc[source.sourceType] = (acc[source.sourceType] || 0) + 1;
            return acc;
          },
          {},
        ),
        detectedFormatsCount: detectedSources.reduce<Record<string, number>>(
          (acc, source) => {
            acc[source.detectedFormat] = (acc[source.detectedFormat] || 0) + 1;
            return acc;
          },
          {},
        ),
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
