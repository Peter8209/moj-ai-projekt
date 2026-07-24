import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  isAttachmentSizeAllowed,
  isSupportedAttachment,
} from '@/lib/ai/config';
import {
  zedperaErrorJson,
  zedperaUnknownErrorJson,
} from '@/lib/zedpera-api-errors.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const MAX_ATTACHMENTS_PER_REQUEST = 10;
const MAX_EXTRACTED_CHARS_PER_ATTACHMENT = 180_000;
const MAX_COMBINED_EXTRACTED_CHARS = 1_200_000;

// Nepoužívame instanceof File. Vo Vercel/Next.js runtime môže File pochádzať
// z iného JS realm-u a instanceof potom nespoľahlivo zlyhá.
type UploadedFile = Blob & {
  name: string;
  lastModified?: number;
};

type ExtractionMethod =
  | 'pdf-parse'
  | 'mammoth'
  | 'plain-text'
  | 'rtf'
  | 'none';

type ExtractedFileResult = {
  id: string;
  name: string;
  originalName: string;
  preparedName: string;
  type: string;
  originalType: string;
  size: number;
  originalSize: number;
  extractedText: string;
  extracted_text: string;
  text: string;
  content: string;
  extractedChars: number;
  extractedPreview: string;
  status: 'success' | 'empty' | 'failed';
  extractionStatus: 'success' | 'empty' | 'failed';
  extractionMethod: ExtractionMethod;
  extractionMessage: string;
  error: string | null;
  warning: string | null;
};

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value === 'string' || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadedFile> & {
    arrayBuffer?: unknown;
  };

  return (
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.size === 'number' &&
    candidate.size >= 0 &&
    typeof candidate.type === 'string' &&
    typeof candidate.name === 'string'
  );
}

function collectUploadedFiles(formData: FormData): UploadedFile[] {
  const uniqueFiles = new Map<string, UploadedFile>();

  // Podporuje file, files, attachments, attachments[], document_0 a ďalšie názvy.
  for (const [, value] of formData.entries()) {
    if (!isUploadedFile(value)) continue;
    if (value.size <= 0 || !value.name.trim()) continue;

    const key = [
      value.name,
      value.size,
      value.type,
      value.lastModified || 0,
    ].join('|');

    if (!uniqueFiles.has(key)) {
      uniqueFiles.set(key, value);
    }
  }

  return Array.from(uniqueFiles.values());
}

function normalizeText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxLength: number): string {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength)}\n\n[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]`;
}

function getFileExtension(fileName: string): string {
  const normalized = String(fileName || '').toLowerCase();
  const index = normalized.lastIndexOf('.');
  return index >= 0 ? normalized.slice(index) : '';
}

function stripRtf(value: string): string {
  return normalizeText(
    value
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\[a-zA-Z]+\d* ?/g, '')
      .replace(/[{}]/g, ''),
  );
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  type PdfTextResult = { text?: unknown };
  type PdfParserInstance = {
    getText: () => Promise<PdfTextResult | string>;
    destroy?: () => Promise<void> | void;
  };
  type PdfParserConstructor = new (
    options: Record<string, unknown>,
  ) => PdfParserInstance;
  type LegacyPdfParser = (
    input: Buffer,
  ) => Promise<PdfTextResult | string>;

  const importedModule = (await import('pdf-parse')) as Record<
    string,
    unknown
  >;

  const defaultExport = importedModule.default;
  const nestedDefault =
    defaultExport && typeof defaultExport === 'object'
      ? (defaultExport as Record<string, unknown>).default
      : undefined;

  const candidates: unknown[] = [
    importedModule,
    defaultExport,
    nestedDefault,
  ].filter(Boolean);

  const errors: string[] = [];

  // pdf-parse v2/v3
  for (const candidate of candidates) {
    if (
      !candidate ||
      (typeof candidate !== 'object' && typeof candidate !== 'function')
    ) {
      continue;
    }

    const constructorCandidate = (candidate as Record<string, unknown>)
      .PDFParse;

    if (typeof constructorCandidate !== 'function') continue;

    const parser = new (constructorCandidate as PdfParserConstructor)({
      data: new Uint8Array(buffer),
    });

    try {
      const result = await parser.getText();
      const text = normalizeText(
        typeof result === 'string' ? result : String(result?.text || ''),
      );

      if (text) return text;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (typeof parser.destroy === 'function') {
        await Promise.resolve(parser.destroy()).catch(() => undefined);
      }
    }
  }

  // pdf-parse v1
  for (const candidate of candidates) {
    if (typeof candidate !== 'function') continue;

    try {
      const result = await (candidate as LegacyPdfParser)(buffer);
      const text = normalizeText(
        typeof result === 'string' ? result : String(result?.text || ''),
      );

      if (text) return text;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const detail = Array.from(
    new Set(errors.map((value) => value.trim()).filter(Boolean)),
  )
    .slice(0, 3)
    .join(' | ');

  throw new Error(
    [
      'PDF_PARSER_NOT_AVAILABLE: PDF sa nepodarilo spracovať.',
      'Skontrolujte balík pdf-parse a textovú vrstvu PDF.',
      detail ? `Technický detail: ${detail}` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  type MammothApi = {
    extractRawText: (
      input: { buffer: Buffer },
    ) => Promise<{ value?: unknown }>;
  };

  const importedModule = (await import('mammoth')) as Record<
    string,
    unknown
  >;

  const defaultExport =
    importedModule.default && typeof importedModule.default === 'object'
      ? (importedModule.default as Record<string, unknown>)
      : importedModule.default;

  const candidates: unknown[] = [importedModule, defaultExport].filter(
    Boolean,
  );

  for (const candidate of candidates) {
    if (
      !candidate ||
      (typeof candidate !== 'object' && typeof candidate !== 'function')
    ) {
      continue;
    }

    const extractRawText = (candidate as Record<string, unknown>)
      .extractRawText;

    if (typeof extractRawText !== 'function') continue;

    const result = await (
      extractRawText as MammothApi['extractRawText']
    )({ buffer });

    const text = normalizeText(String(result?.value || ''));
    if (text) return text;
  }

  throw new Error(
    'DOCX_PARSER_NOT_AVAILABLE: DOCX sa nepodarilo spracovať. Skontrolujte balík mammoth.',
  );
}

async function extractSingleFile(
  file: UploadedFile,
): Promise<ExtractedFileResult> {
  const id = randomUUID();
  const name = file.name || 'neznamy-subor';
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(name);

  const base = {
    id,
    name,
    originalName: name,
    preparedName: name,
    type,
    originalType: type,
    size,
    originalSize: size,
  };

  try {
    if (!isSupportedAttachment(file)) {
      throw new Error(`Nepodporovaný formát súboru: ${extension || type}.`);
    }

    if (!isAttachmentSizeAllowed(size)) {
      throw new Error(`Súbor ${name} prekračuje povolenú veľkosť.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length <= 0) {
      throw new Error('Priložený súbor je prázdny.');
    }

    let extractedText = '';
    let extractionMethod: ExtractionMethod = 'none';

    if (extension === '.pdf') {
      extractedText = await extractPdfText(buffer);
      extractionMethod = 'pdf-parse';
    } else if (extension === '.docx') {
      extractedText = await extractDocxText(buffer);
      extractionMethod = 'mammoth';
    } else if (extension === '.rtf') {
      extractedText = stripRtf(buffer.toString('utf8'));
      extractionMethod = 'rtf';
    } else if (
      ['.txt', '.md', '.csv', '.json', '.xml', '.html'].includes(
        extension,
      )
    ) {
      extractedText = normalizeText(buffer.toString('utf8'));
      extractionMethod = 'plain-text';
    } else {
      throw new Error(
        `Súbor ${name} je podporovaný ako príloha, ale endpoint /api/extract-text z neho nemá serverový textový parser.`,
      );
    }

    const normalized = limitText(
      extractedText,
      MAX_EXTRACTED_CHARS_PER_ATTACHMENT,
    );

    const status: ExtractedFileResult['status'] = normalized
      ? 'success'
      : 'empty';

    const extractionMessage = normalized
      ? 'Text bol úspešne extrahovaný.'
      : 'Súbor neobsahuje čitateľnú textovú vrstvu.';

    return {
      ...base,
      extractedText: normalized,
      extracted_text: normalized,
      text: normalized,
      content: normalized,
      extractedChars: normalizeText(extractedText).length,
      extractedPreview: normalized.slice(0, 1200),
      status,
      extractionStatus: status,
      extractionMethod,
      extractionMessage,
      error: null,
      warning:
        normalizeText(extractedText).length >
        MAX_EXTRACTED_CHARS_PER_ATTACHMENT
          ? `Text bol skrátený na ${MAX_EXTRACTED_CHARS_PER_ATTACHMENT} znakov.`
          : null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa extrahovať text zo súboru.';

    return {
      ...base,
      extractedText: '',
      extracted_text: '',
      text: '',
      content: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'failed',
      extractionStatus: 'failed',
      extractionMethod: 'none',
      extractionMessage: 'Extrakcia zlyhala.',
      error: message,
      warning: null,
    };
  }
}

function buildPreparedMetadata(result: ExtractedFileResult) {
  return {
    originalId: result.id,
    originalName: result.originalName,
    originalSize: result.originalSize,
    originalType: result.originalType,
    preparedName: result.preparedName,
    preparedSize: result.size,
    preparedType: result.type,
    extractionStatus: result.extractionStatus,
    extractionMethod: result.extractionMethod,
    extractionMessage: result.extractionMessage,
    extractedText: result.extractedText,
    extracted_text: result.extractedText,
    text: result.extractedText,
    content: result.extractedText,
    warning: result.warning || result.error || undefined,
  };
}

export async function POST(req: Request) {
  const requestId =
    req.headers.get('x-request-id')?.trim() || randomUUID();

  try {
    const contentType = req.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return zedperaErrorJson(
        'INVALID_MULTIPART_FORM_DATA',
        {
          requestId,
          endpoint: '/api/extract-text',
          module: 'attachments',
          serverMessage:
            'Extrakcia očakáva multipart/form-data so súbormi.',
          serverDetail:
            'Frontend musí súbory vložiť do FormData. Neposielajte ručne hlavičku Content-Type; prehliadač doplní multipart boundary automaticky.',
        },
        {
          request: req,
          status: 400,
        },
      );
    }

    let formData: FormData;

    try {
      formData = await req.formData();
    } catch (error) {
      return zedperaErrorJson(
        'INVALID_MULTIPART_FORM_DATA',
        {
          requestId,
          endpoint: '/api/extract-text',
          module: 'attachments',
          serverMessage:
            'Prílohy sa nepodarilo načítať z odoslanej požiadavky.',
          serverDetail:
            error instanceof Error ? error.message : String(error),
        },
        {
          request: req,
          status: 400,
        },
      );
    }

    const files = collectUploadedFiles(formData);

    if (files.length === 0) {
      return zedperaErrorJson(
        'MISSING_ATTACHMENTS',
        {
          requestId,
          endpoint: '/api/extract-text',
          module: 'attachments',
          serverMessage: 'Nebola prijatá žiadna príloha.',
          serverDetail:
            'Odošlite aspoň jeden neprázdny súbor cez FormData.',
        },
        {
          request: req,
          status: 400,
        },
      );
    }

    if (files.length > MAX_ATTACHMENTS_PER_REQUEST) {
      return zedperaErrorJson(
        'ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED',
        {
          requestId,
          endpoint: '/api/extract-text',
          module: 'attachments',
          attachmentLimit: MAX_ATTACHMENTS_PER_REQUEST,
          receivedAttachments: files.length,
          serverMessage: `Nahrali ste viac ako ${MAX_ATTACHMENTS_PER_REQUEST} príloh. Maximálny povolený počet príloh je ${MAX_ATTACHMENTS_PER_REQUEST}.`,
          serverDetail:
            'Odstráňte nadbytočné prílohy a odošlite požiadavku znova.',
        },
        {
          request: req,
          status: 400,
        },
      );
    }

    // Sekvenčné spracovanie je zámerné: pri 10 PDF súboroch nevyrobíme
    // naraz 10 náročných parserov a znížime riziko pádu serverless funkcie.
    const results: ExtractedFileResult[] = [];

    for (const file of files) {
      results.push(await extractSingleFile(file));
    }

    const successfulAttachments = results.filter(
      (item) => item.status === 'success',
    ).length;
    const emptyAttachments = results.filter(
      (item) => item.status === 'empty',
    ).length;
    const failedAttachments = results.filter(
      (item) => item.status === 'failed',
    ).length;

    const combinedExtractedText = limitText(
      results
        .filter((item) => item.extractedText.trim())
        .map(
          (item) =>
            `SÚBOR: ${item.originalName}\n\n${item.extractedText}`,
        )
        .join('\n\n-----------------\n\n'),
      MAX_COMBINED_EXTRACTED_CHARS,
    );

    const preparedFilesMetadata = results.map(buildPreparedMetadata);

    return NextResponse.json(
      {
        success: true,
        ok: true,
        code: 'ATTACHMENT_EXTRACTION_COMPLETED',
        requestId,
        endpoint: '/api/extract-text',
        maxAttachments: MAX_ATTACHMENTS_PER_REQUEST,
        attachmentLimit: MAX_ATTACHMENTS_PER_REQUEST,
        receivedAttachments: files.length,
        processedAttachments: results.length,
        successfulAttachments,
        emptyAttachments,
        failedAttachments,

        // Viac názvov polí kvôli kompatibilite so starším frontendovým kódom.
        extractedText: combinedExtractedText,
        extracted_text: combinedExtractedText,
        clientExtractedText: combinedExtractedText,
        text: combinedExtractedText,
        content: combinedExtractedText,
        files: results,
        attachments: results,
        results,
        preparedFilesMetadata,

        message:
          failedAttachments > 0
            ? `Extrakcia bola dokončená. Úspešne: ${successfulAttachments}, bez textovej vrstvy: ${emptyAttachments}, neúspešne: ${failedAttachments}.`
            : `Extrakcia bola úspešne dokončená pre ${results.length} príloh.`,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Request-Id': requestId,
        },
      },
    );
  } catch (error) {
    console.error('EXTRACT_TEXT_API_ERROR:', {
      requestId,
      error,
    });

    return zedperaUnknownErrorJson(error, {
      request: req,
      endpoint: '/api/extract-text',
      module: 'attachments',
      status: 500,
    });
  }
}
