import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/extractFileText';

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

  ok: boolean;
  warning?: string;
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
    fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'uploaded_file';

  return cleaned;
}

function buildUnsupportedResponse(file: File) {
  return {
    ok: false,
    error: 'UNSUPPORTED_FILE_TYPE',
    message: `Nepodporovaný formát súboru: ${file.name}`,
    file_name: file.name,
    file_type: file.type || 'application/octet-stream',
    extension: getFileExtension(file.name),
    supported_formats: ALLOWED_EXTENSIONS,
  };
}

function buildTooLargeResponse(file: File) {
  return {
    ok: false,
    error: 'FILE_TOO_LARGE',
    message: `Súbor ${file.name} je väčší ako ${MAX_FILE_SIZE_MB} MB.`,
    file_name: file.name,
    file_size: file.size,
    max_size_mb: MAX_FILE_SIZE_MB,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_FILES',
          message: 'Neboli odoslané žiadne súbory.',
        },
        { status: 400 },
      );
    }

    const uploadedFiles: UploadedFileResponse[] = [];

    for (const file of files) {
      if (!isAllowedFile(file)) {
        return NextResponse.json(buildUnsupportedResponse(file), {
          status: 400,
        });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(buildTooLargeResponse(file), {
          status: 400,
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const bufferSize = arrayBuffer.byteLength;

      let extractedText = '';
      let warning = '';
      let extractionOk = false;

      try {
        const extracted = await extractTextFromFile(file);

        extractedText = extracted.text || '';
        warning = extracted.warning || '';
        extractionOk = extracted.ok || extractedText.trim().length > 0;
      } catch (error) {
        console.error('UPLOAD EXTRACT TEXT ERROR:', error);

        extractedText = '';
        warning =
          error instanceof Error
            ? error.message
            : 'Súbor bol nahratý, ale nepodarilo sa z neho extrahovať text.';
        extractionOk = false;
      }

      const cleanedText = String(extractedText || '').trim();

      uploadedFiles.push({
        original_name: file.name,
        name: file.name,
        safe_name: safeFileName(file.name),
        size: file.size,
        type: file.type || 'application/octet-stream',
        extension: getFileExtension(file.name),
        buffer_size: bufferSize,

        text: cleanedText,
        content: cleanedText,
        extractedText: cleanedText,
        charCount: cleanedText.length,

        ok: extractionOk,
        warning:
          warning ||
          (!cleanedText
            ? 'Súbor bol nahratý, ale neobsahuje dostupný extrahovaný text. Ak ide o PDF, skontroluj, či nejde o sken bez textovej vrstvy.'
            : ''),
      });
    }

    const totalExtractedCharacters = uploadedFiles.reduce(
      (sum, file) => sum + file.charCount,
      0,
    );

    const filesWithoutText = uploadedFiles.filter(
      (file) => file.charCount === 0,
    );

    return NextResponse.json({
      ok: true,
      message: 'FILES_ACCEPTED_AND_PROCESSED',
      count: uploadedFiles.length,
      files: uploadedFiles,
      supported_formats: ALLOWED_EXTENSIONS,
      totalExtractedCharacters,
      hasExtractedText: totalExtractedCharacters > 0,
      warnings: filesWithoutText
        .map((file) => ({
          name: file.name,
          warning: file.warning,
        }))
        .filter((item) => item.warning),
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