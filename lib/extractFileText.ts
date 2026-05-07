import mammoth from 'mammoth';

export type ExtractedFile = {
  name: string;
  type: string;
  size: number;

  // hlavný výstup
  extractedText: string;
  extractedChars: number;
  extractedPreview: string;

  // kompatibilita so staršími API súbormi
  text?: string;
  content?: string;

  error?: string;
  warning?: string;
  ok?: boolean;
};

function cleanText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index === -1) return '';
  return name.slice(index).toLowerCase();
}

function isPdf(name: string, type: string) {
  return getExtension(name) === '.pdf' || type.toLowerCase().includes('pdf');
}

function isDocx(name: string) {
  return getExtension(name) === '.docx';
}

function isRtf(name: string, type: string) {
  return getExtension(name) === '.rtf' || type.toLowerCase().includes('rtf');
}

function isTxt(name: string, type: string) {
  const extension = getExtension(name);
  const mime = type.toLowerCase();

  return (
    extension === '.txt' ||
    extension === '.md' ||
    extension === '.csv' ||
    mime.includes('text/plain') ||
    mime.includes('text/markdown') ||
    mime.includes('text/csv')
  );
}

function stripRtf(value: string): string {
  return String(value || '')
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');

  // Staršie verzie pdf-parse:
  // const pdf = require('pdf-parse');
  // await pdf(buffer)
  const possibleDefaultParser = pdfParseModule?.default;

  if (typeof possibleDefaultParser === 'function') {
    const result = await possibleDefaultParser(buffer);
    return cleanText(result?.text || '');
  }

  if (typeof pdfParseModule === 'function') {
    const result = await pdfParseModule(buffer);
    return cleanText(result?.text || '');
  }

  // Novšie ESM verzie pdf-parse môžu používať PDFParse triedu.
  // import { PDFParse } from 'pdf-parse';
  if (typeof pdfParseModule?.PDFParse === 'function') {
    const parser = new pdfParseModule.PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      if (typeof result === 'string') {
        return cleanText(result);
      }

      return cleanText(
        result?.text ||
          result?.content ||
          result?.pages?.map((page: any) => page?.text || '').join('\n') ||
          ''
      );
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }

  // Niektoré buildy môžu exportovať parser pod iným názvom.
  if (typeof pdfParseModule?.parse === 'function') {
    const result = await pdfParseModule.parse(buffer);
    return cleanText(result?.text || result?.content || '');
  }

  if (typeof pdfParseModule?.parsePDF === 'function') {
    const result = await pdfParseModule.parsePDF(buffer);
    return cleanText(result?.text || result?.content || '');
  }

  throw new Error(
    'PDF parser sa nepodarilo inicializovať. Skontroluj verziu balíka pdf-parse.'
  );
}

function createResult(params: {
  name: string;
  type: string;
  size: number;
  extractedText: string;
  error?: string;
  warning?: string;
  ok?: boolean;
}): ExtractedFile {
  const cleaned = cleanText(params.extractedText);

  return {
    name: params.name,
    type: params.type,
    size: params.size,
    extractedText: cleaned,
    extractedChars: cleaned.length,
    extractedPreview: cleaned.slice(0, 1000),

    // kompatibilita so staršími route súbormi
    text: cleaned,
    content: cleaned,

    error: params.error,
    warning: params.warning,
    ok: params.ok ?? cleaned.length > 0,
  };
}

export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  const name = file.name || 'neznamy-subor';
  const type = file.type || '';
  const size = file.size || 0;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';
    let warning = '';

    if (isTxt(name, type)) {
      extractedText = buffer.toString('utf8');
    } else if (isDocx(name)) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';

      if (result.messages?.length) {
        warning = result.messages
          .map((message) => message.message)
          .filter(Boolean)
          .join(' | ');
      }
    } else if (isPdf(name, type)) {
      extractedText = await extractPdfText(buffer);
    } else if (isRtf(name, type)) {
      extractedText = stripRtf(buffer.toString('utf8'));
    } else {
      return createResult({
        name,
        type,
        size,
        extractedText: '',
        warning:
          'Tento typ súboru je povolený ako príloha, ale text sa z neho v tejto funkcii neextrahuje.',
        ok: false,
      });
    }

    const cleaned = cleanText(extractedText);

    if (!cleaned) {
      return createResult({
        name,
        type,
        size,
        extractedText: '',
        warning:
          isPdf(name, type)
            ? 'PDF neobsahuje čitateľný text alebo je skenované ako obrázok.'
            : 'Súbor neobsahuje čitateľný text alebo sa text nepodarilo extrahovať.',
        ok: false,
      });
    }

    return createResult({
      name,
      type,
      size,
      extractedText: cleaned,
      warning: warning || undefined,
      ok: true,
    });
  } catch (error) {
    return createResult({
      name,
      type,
      size,
      extractedText: '',
      error:
        error instanceof Error
          ? error.message
          : 'Nepodarilo sa extrahovať text zo súboru.',
      ok: false,
    });
  }
}

export async function extractTextFromFiles(files: File[]) {
  const results: ExtractedFile[] = [];

  for (const file of files) {
    results.push(await extractTextFromFile(file));
  }

  return results;
}