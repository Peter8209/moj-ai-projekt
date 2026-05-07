// lib/extractFileText.ts

import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  extension: string;

  ok: boolean;

  text: string;
  content: string;
  extractedText: string;

  charCount: number;
  extractedChars: number;
  extractedPreview: string;

  warning?: string;
  error?: string;
};

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

  return fileName.slice(index).toLowerCase();
}

function cleanExtractedText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function buildResult(params: {
  name: string;
  type: string;
  size: number;
  extension: string;
  text?: string;
  warning?: string;
  error?: string;
}): ExtractedFile {
  const cleanedText = cleanExtractedText(params.text || '');
  const preview = cleanedText.slice(0, 900);

  return {
    name: params.name,
    type: params.type,
    size: params.size,
    extension: params.extension,

    ok: cleanedText.length > 0,

    text: cleanedText,
    content: cleanedText,
    extractedText: cleanedText,

    charCount: cleanedText.length,
    extractedChars: cleanedText.length,
    extractedPreview: preview,

    warning:
      params.warning ||
      (!cleanedText
        ? 'Súbor bol nahratý, ale nepodarilo sa z neho extrahovať čitateľný text.'
        : ''),
    error: params.error,
  };
}

function extractPlainText(buffer: Buffer): string {
  try {
    return buffer.toString('utf8');
  } catch {
    return '';
  }
}

function extractRtfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString('utf8');

    return raw
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\line/g, '\n')
      .replace(/\\tab/g, ' ')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+\d* ?/g, ' ')
      .replace(/[{}]/g, ' ');
  } catch {
    return '';
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX_EXTRACT_ERROR:', error);
    return '';
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    /*
      DÔLEŽITÉ:
      Nepoužívaj:
      await import('pdf-parse')
      ani:
      import pdfParse from 'pdf-parse'

      V Next.js/Turbopack to môže spustiť debug režim pdf-parse
      a potom hľadá testovací súbor:
      test/data/05-versions-space.pdf

      Preto používame priamo interný parser.
    */

    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
      dataBuffer: Buffer,
      options?: Record<string, unknown>,
    ) => Promise<{
      text?: string;
      numpages?: number;
      info?: unknown;
      metadata?: unknown;
      version?: string;
    }>;

    if (typeof pdfParse !== 'function') {
      console.error('PDF_EXTRACT_ERROR: pdf-parse/lib/pdf-parse.js nie je funkcia');
      return '';
    }

    const result = await pdfParse(buffer, {
      max: 0,
    });

    return result?.text || '';
  } catch (error) {
    console.error('PDF_EXTRACT_ERROR:', error);
    return '';
  }
}

async function extractXlsxText(buffer: Buffer): Promise<string> {
  try {
    const xlsx = await import('xlsx');
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    const parts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);

      if (csv.trim()) {
        parts.push(`Hárok: ${sheetName}\n${csv}`);
      }
    }

    return parts.join('\n\n');
  } catch (error) {
    console.error('XLSX_EXTRACT_ERROR:', error);
    return '';
  }
}

export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  const name = file.name || 'neznámy súbor';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    let warning = '';

    if (
      extension === '.txt' ||
      extension === '.md' ||
      extension === '.csv' ||
      type.toLowerCase().includes('text/plain') ||
      type.toLowerCase().includes('text/markdown') ||
      type.toLowerCase().includes('text/csv')
    ) {
      text = extractPlainText(buffer);
    } else if (extension === '.rtf' || type.toLowerCase().includes('rtf')) {
      text = extractRtfText(buffer);
    } else if (extension === '.docx') {
      text = await extractDocxText(buffer);
    } else if (extension === '.pdf' || type.toLowerCase().includes('pdf')) {
      text = await extractPdfText(buffer);

      if (!text.trim()) {
        warning =
          'PDF bol nahratý, ale text sa nepodarilo extrahovať. PDF môže byť sken bez textovej vrstvy alebo má ochranu proti kopírovaniu.';
      }
    } else if (extension === '.xlsx' || extension === '.xls') {
      text = await extractXlsxText(buffer);

      if (!text.trim()) {
        warning =
          'Tabuľkový súbor bol nahratý, ale nepodarilo sa z neho extrahovať text.';
      }
    } else if (extension === '.doc') {
      warning =
        'Starý formát .doc sa nedá spoľahlivo čítať. Odporúčané je nahrať .docx, PDF s textovou vrstvou alebo TXT.';
    } else if (extension === '.odt') {
      warning =
        'Formát ODT zatiaľ nie je podporovaný na extrakciu textu. Odporúčané je nahrať DOCX, PDF alebo TXT.';
    } else if (extension === '.ppt' || extension === '.pptx') {
      warning =
        'Prezentácia bola nahratá, ale text sa z nej zatiaľ neextrahuje. Pre analýzu vlož text ručne alebo nahraj DOCX/PDF/TXT.';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
      warning =
        'Obrázok bol nahratý, ale OCR čítanie textu z obrázka zatiaľ nie je zapnuté.';
    } else {
      warning = `Formát súboru ${extension || name} zatiaľ nie je podporovaný na extrakciu textu.`;
    }

    return buildResult({
      name,
      type,
      size,
      extension,
      text,
      warning,
    });
  } catch (error) {
    console.error('FILE_EXTRACT_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa extrahovať text zo súboru.';

    return buildResult({
      name,
      type,
      size,
      extension,
      text: '',
      warning: message,
      error: message,
    });
  }
}

export async function extractTextFromFiles(
  files: File[],
): Promise<ExtractedFile[]> {
  const results: ExtractedFile[] = [];

  for (const file of files) {
    const extracted = await extractTextFromFile(file);
    results.push(extracted);
  }

  return results;
}