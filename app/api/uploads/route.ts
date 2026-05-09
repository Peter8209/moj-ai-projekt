import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/extractFileText';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'text/markdown',
  'application/rtf',
  'text/rtf',
  'text/richtext',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream',
];

type UploadedFileResponse = {
  original_name: string;
  name: string;
  safe_name: string;
  size: number;
  type: string;
  extension: string;
  buffer_size: number;

  text: string;
  content: string;
  extractedText: string;
  charCount: number;
  textPreview: string;

  ok: boolean;
  status: 'processed' | 'processed_without_text' | 'rejected' | 'failed';
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

function isAllowedFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  const mimeType = file.type?.toLowerCase() || '';

  return (
    ALLOWED_EXTENSIONS.includes(extension) ||
    ALLOWED_MIME_TYPES.includes(mimeType)
  );
}

function safeFileName(fileName: string): string {
  const cleaned =
    String(fileName || 'uploaded_file')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'uploaded_file';

  return cleaned;
}

function cleanText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function makeBaseFileResponse(
  file: File,
  bufferSize = 0,
): Omit<
  UploadedFileResponse,
  | 'text'
  | 'content'
  | 'extractedText'
  | 'charCount'
  | 'textPreview'
  | 'ok'
  | 'status'
> {
  return {
    original_name: file.name,
    name: file.name,
    safe_name: safeFileName(file.name),
    size: file.size,
    type: file.type || 'application/octet-stream',
    extension: getFileExtension(file.name),
    buffer_size: bufferSize,
  };
}

function getNoTextWarning(file: File): string {
  const extension = getFileExtension(file.name);

  if (extension === '.pdf') {
    return 'PDF bol nahratý, ale nepodarilo sa z neho extrahovať text. Pravdepodobne ide o sken bez textovej vrstvy alebo chránený PDF súbor.';
  }

  if (extension === '.doc') {
    return 'Starý formát .doc sa nedá spoľahlivo extrahovať. Súbor ulož ako .docx a nahraj znova.';
  }

  if (extension === '.docx') {
    return 'DOCX bol nahratý, ale extrakcia textu vrátila prázdny obsah. Skontroluj, či dokument neobsahuje iba obrázky alebo sken.';
  }

  if (extension === '.odt') {
    return 'ODT bol nahratý, ale extrakcia textu zatiaľ nie je dostupná. Odporúčané je nahrať DOCX alebo PDF s textovou vrstvou.';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok bol nahratý, ale OCR čítanie textu z obrázka zatiaľ nie je zapnuté.';
  }

  if (['.xls', '.xlsx'].includes(extension)) {
    return 'Tabuľkový súbor bol nahratý, ale text sa z neho zatiaľ neextrahuje.';
  }

  if (['.ppt', '.pptx'].includes(extension)) {
    return 'Prezentácia bola nahratá, ale text sa z nej zatiaľ neextrahuje.';
  }

  return 'Súbor bol nahratý, ale neobsahuje dostupný extrahovaný text.';
}

function collectFiles(formData: FormData): File[] {
  const candidates = [
    ...formData.getAll('files'),
    ...formData.getAll('file'),
    ...formData.getAll('reviews'),
    ...formData.getAll('attachments'),
  ];

  return candidates.filter((item): item is File => item instanceof File);
}

function getExtractedTextSafe(extracted: unknown): string {
  const item = extracted as {
    text?: unknown;
    content?: unknown;
    extractedText?: unknown;
  };

  return cleanText(
    String(item.extractedText || item.content || item.text || ''),
  );
}

function getExtractedWarningSafe(extracted: unknown): string {
  const item = extracted as {
    warning?: unknown;
  };

  return typeof item.warning === 'string' ? item.warning : '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = collectFiles(formData);

    if (!files.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_FILES',
          message: 'Neboli odoslané žiadne súbory.',
          accepted_field_names: ['files', 'file', 'reviews', 'attachments'],
        },
        { status: 400 },
      );
    }

    const uploadedFiles: UploadedFileResponse[] = [];

    for (const file of files) {
      let bufferSize = 0;

      try {
        const arrayBuffer = await file.arrayBuffer();
        bufferSize = arrayBuffer.byteLength;
      } catch {
        bufferSize = 0;
      }

      const base = makeBaseFileResponse(file, bufferSize);

      if (!isAllowedFile(file)) {
        uploadedFiles.push({
          ...base,
          text: '',
          content: '',
          extractedText: '',
          charCount: 0,
          textPreview: '',
          ok: false,
          status: 'rejected',
          error: 'UNSUPPORTED_FILE_TYPE',
          warning: `Nepodporovaný formát súboru: ${file.name}`,
        });

        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        uploadedFiles.push({
          ...base,
          text: '',
          content: '',
          extractedText: '',
          charCount: 0,
          textPreview: '',
          ok: false,
          status: 'rejected',
          error: 'FILE_TOO_LARGE',
          warning: `Súbor ${file.name} je väčší ako ${MAX_FILE_SIZE_MB} MB.`,
        });

        continue;
      }

      try {
        const extracted = await extractTextFromFile(file);

        const extractedText = getExtractedTextSafe(extracted);
        const extractedWarning = getExtractedWarningSafe(extracted);

        const warning =
          extractedWarning || (!extractedText ? getNoTextWarning(file) : '');

        uploadedFiles.push({
          ...base,

          text: extractedText,
          content: extractedText,
          extractedText,
          charCount: extractedText.length,
          textPreview: extractedText.slice(0, 500),

          ok: extractedText.length > 0,
          status:
            extractedText.length > 0
              ? 'processed'
              : 'processed_without_text',
          warning,
        });

        console.log('UPLOAD FILE EXTRACTED:', {
          name: file.name,
          extension: base.extension,
          type: base.type,
          size: base.size,
          charCount: extractedText.length,
          preview: extractedText.slice(0, 160),
          warning,
        });
      } catch (error) {
        console.error('UPLOAD EXTRACT TEXT ERROR:', {
          name: file.name,
          error,
        });

        uploadedFiles.push({
          ...base,
          text: '',
          content: '',
          extractedText: '',
          charCount: 0,
          textPreview: '',
          ok: false,
          status: 'failed',
          error: 'EXTRACTION_FAILED',
          warning:
            error instanceof Error
              ? error.message
              : 'Súbor bol nahratý, ale nepodarilo sa z neho extrahovať text.',
        });
      }
    }

    const totalExtractedCharacters = uploadedFiles.reduce(
      (sum, file) => sum + file.charCount,
      0,
    );

    const processedFiles = uploadedFiles.filter(
      (file) => file.status === 'processed',
    );

    const filesWithoutText = uploadedFiles.filter(
      (file) => file.charCount === 0,
    );

    return NextResponse.json({
      ok: true,
      message: 'FILES_ACCEPTED_AND_PROCESSED',
      count: uploadedFiles.length,
      processedCount: processedFiles.length,
      files: uploadedFiles,
      supported_formats: ALLOWED_EXTENSIONS,
      max_file_size_mb: MAX_FILE_SIZE_MB,
      totalExtractedCharacters,
      hasExtractedText: totalExtractedCharacters > 0,
      warnings: filesWithoutText
        .map((file) => ({
          name: file.name,
          extension: file.extension,
          status: file.status,
          warning: file.warning,
          error: file.error,
        }))
        .filter((item) => item.warning || item.error),
    });
  } catch (err: any) {
    console.error('UPLOAD ERROR:', err);

    return NextResponse.json(
      {
        ok: false,
        error: 'UPLOAD_FAILED',
        detail: err?.message || 'unknown',
        message: 'Nepodarilo sa spracovať nahraté súbory.',
      },
      { status: 500 },
    );
  }
}