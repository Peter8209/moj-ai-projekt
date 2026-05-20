export type PreparedAuditFile = {
  file: File;
  originalName: string;
  finalName: string;
  originalSize: number;
  finalSize: number;
  wasCompressed: boolean;
  warning?: string;
};

const MAX_FILE_SIZE_MB = 8;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function canCompressInBrowser(file: File): boolean {
  return file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
}

async function compressTextFile(file: File): Promise<File> {
  const text = await file.text();

  const compressedText = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return new File([compressedText], file.name, {
    type: file.type || 'text/plain',
  });
}

export async function prepareAuditFile(file: File): Promise<PreparedAuditFile> {
  const originalSize = file.size;

  if (originalSize <= MAX_FILE_SIZE_BYTES) {
    return {
      file,
      originalName: file.name,
      finalName: file.name,
      originalSize,
      finalSize: file.size,
      wasCompressed: false,
    };
  }

  if (canCompressInBrowser(file)) {
    const compressed = await compressTextFile(file);

    return {
      file: compressed,
      originalName: file.name,
      finalName: compressed.name,
      originalSize,
      finalSize: compressed.size,
      wasCompressed: compressed.size < originalSize,
      warning:
        compressed.size > MAX_FILE_SIZE_BYTES
          ? `Súbor ${file.name} je aj po kompresii príliš veľký.`
          : undefined,
    };
  }

  return {
    file,
    originalName: file.name,
    finalName: file.name,
    originalSize,
    finalSize: file.size,
    wasCompressed: false,
    warning: `Súbor ${file.name} je väčší ako ${MAX_FILE_SIZE_MB} MB. Ak je to PDF, DOCX alebo obrázok, odporúča sa serverová kompresia alebo zmenšenie pred spracovaním.`,
  };
}

export async function prepareAuditFiles(files: File[]): Promise<PreparedAuditFile[]> {
  const prepared: PreparedAuditFile[] = [];

  for (const file of files) {
    prepared.push(await prepareAuditFile(file));
  }

  return prepared;
}