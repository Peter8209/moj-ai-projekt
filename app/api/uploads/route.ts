import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
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
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
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

    const uploadedFiles = [];

    for (const file of files) {
      if (!isAllowedFile(file)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'UNSUPPORTED_FILE_TYPE',
            message: `Nepodporovaný formát súboru: ${file.name}`,
            file_name: file.name,
            file_type: file.type,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error: 'FILE_TOO_LARGE',
            message: `Súbor ${file.name} je väčší ako ${MAX_FILE_SIZE_MB} MB.`,
            file_name: file.name,
            file_size: file.size,
          },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();

      uploadedFiles.push({
        original_name: file.name,
        safe_name: safeFileName(file.name),
        size: file.size,
        type: file.type || 'application/octet-stream',
        extension: getFileExtension(file.name),
        buffer_size: arrayBuffer.byteLength,
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'FILES_ACCEPTED',
      count: uploadedFiles.length,
      files: uploadedFiles,
      supported_formats: ALLOWED_EXTENSIONS,
    });
  } catch (err: any) {
    console.error('UPLOAD ERROR:', err);

    return NextResponse.json(
      {
        ok: false,
        error: 'UPLOAD_FAILED',
        detail: err?.message || 'unknown',
      },
      { status: 500 },
    );
  }
}