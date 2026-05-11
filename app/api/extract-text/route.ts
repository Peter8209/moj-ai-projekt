import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type ExtractResult = {
  ok: boolean;
  text: string;
  method: string;
  message?: string;
  meta?: Record<string, unknown>;
};

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

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) return '';

  return fileName.slice(index).toLowerCase();
}

function normalizeFileName(value: unknown) {
  return String(value || 'uploaded-file').trim() || 'uploaded-file';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return 'Neznáma chyba pri extrakcii textu.';
}

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

async function extractPlainText(file: File): Promise<ExtractResult> {
  const raw = await file.text();
  const text = cleanText(raw);

  return {
    ok: Boolean(text),
    text,
    method: 'plain-text',
    message: text
      ? 'Text bol načítaný priamo zo súboru.'
      : 'Textový súbor je prázdny alebo sa nepodarilo načítať jeho obsah.',
    meta: {
      chars: text.length,
    },
  };
}

async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;

    const data = await pdfParse(buffer);
    const text = cleanText(data?.text || '');

    return {
      ok: Boolean(text),
      text,
      method: 'pdf-parse',
      message: text
        ? 'PDF text bol extrahovaný pomocou pdf-parse.'
        : 'PDF bolo spracované, ale neobsahuje čitateľný text. Môže ísť o skenovaný PDF obrázok.',
      meta: {
        pages: data?.numpages || null,
        chars: text.length,
        info: data?.info || null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      text: '',
      method: 'pdf-parse',
      message: `PDF extrakcia zlyhala: ${getErrorMessage(error)}`,
    };
  }
}

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

async function extractRtfText(file: File): Promise<ExtractResult> {
  try {
    const raw = await file.text();

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

async function extractByType(file: File): Promise<ExtractResult> {
  const fileName = normalizeFileName(file.name);
  const extension = getFileExtension(fileName);
  const buffer = await fileToBuffer(file);

  if (['.txt', '.md', '.csv'].includes(extension)) {
    return extractPlainText(file);
  }

  if (extension === '.rtf') {
    return extractRtfText(file);
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

  if (extension === '.doc') {
    return {
      ok: false,
      text: '',
      method: 'doc-unsupported',
      message:
        'Starý formát .doc nie je spoľahlivo podporovaný. Preveď súbor do .docx alebo PDF a nahraj ho znova.',
    };
  }

  if (extension === '.odt') {
    return {
      ok: false,
      text: '',
      method: 'odt-unsupported',
      message:
        'ODT zatiaľ nie je podporované v tomto extrakčnom endpointe. Exportuj súbor ako DOCX alebo PDF.',
    };
  }

  return extractUnsupportedBinary({
    fileName,
    extension,
  });
}

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
    const fileName = normalizeFileName(file.name || fileNameFromForm);
    const extension = getFileExtension(fileName);

    const result = await extractByType(file);

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
          meta: {
            fileName,
            extension,
            size: file.size,
            type: file.type || null,
            ...result.meta,
          },
        },
        { status: 422 },
      );
    }

    const text = cleanText(result.text);

    return NextResponse.json({
      ok: true,
      text,
      extractedText: text,
      content: text,
      method: result.method,
      message: result.message || 'Text bol úspešne extrahovaný.',
      meta: {
        fileName,
        extension,
        size: file.size,
        type: file.type || null,
        chars: text.length,
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