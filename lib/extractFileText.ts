import mammoth from 'mammoth';

export type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  extension: string;
  text: string;
  charCount: number;
  warning?: string;
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
    console.error('DOCX EXTRACT ERROR:', error);
    return '';
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse');

    const pdfParse =
      (pdfParseModule as any).default ||
      (pdfParseModule as any).pdfParse ||
      (pdfParseModule as any);

    if (typeof pdfParse !== 'function') {
      console.error('PDF PARSE ERROR: pdf-parse export is not a function');
      return '';
    }

    const result = await pdfParse(buffer);
    return result?.text || '';
  } catch (error) {
    console.error('PDF PARSE ERROR:', error);
    return '';
  }
}

export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  const name = file.name || 'neznámy súbor';
  const type = file.type || '';
  const size = file.size || 0;
  const extension = getFileExtension(name);

  let text = '';
  let warning = '';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const lowerName = name.toLowerCase();
    const lowerType = type.toLowerCase();

    if (
      extension === '.txt' ||
      extension === '.md' ||
      extension === '.csv' ||
      lowerType.includes('text/plain') ||
      lowerType.includes('text/markdown') ||
      lowerType.includes('text/csv')
    ) {
      text = extractPlainText(buffer);
    } else if (extension === '.rtf' || lowerType.includes('rtf')) {
      text = extractRtfText(buffer);
    } else if (extension === '.docx') {
      text = await extractDocxText(buffer);
    } else if (extension === '.pdf' || lowerType.includes('pdf')) {
      text = await extractPdfText(buffer);
    } else if (extension === '.doc') {
      warning =
        'Starý formát .doc sa nedá spoľahlivo čítať. Odporúčané je nahrať .docx, PDF s textovou vrstvou alebo TXT.';
      text = '';
    } else if (extension === '.odt') {
      warning =
        'Formát ODT zatiaľ nie je podporovaný na extrakciu textu. Odporúčané je nahrať DOCX, PDF alebo TXT.';
      text = '';
    } else if (['.xls', '.xlsx'].includes(extension)) {
      warning =
        'Tabuľkový súbor bol nahratý, ale text sa z neho zatiaľ neextrahuje. Pre audit vlož text ručne alebo nahraj DOCX/PDF.';
      text = '';
    } else if (['.ppt', '.pptx'].includes(extension)) {
      warning =
        'Prezentácia bola nahratá, ale text sa z nej zatiaľ neextrahuje. Pre audit vlož text ručne alebo nahraj DOCX/PDF.';
      text = '';
    } else if (
      ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)
    ) {
      warning =
        'Obrázok bol nahratý, ale OCR čítanie textu z obrázka zatiaľ nie je zapnuté.';
      text = '';
    } else {
      warning = `Formát súboru ${extension || lowerName} zatiaľ nie je podporovaný na extrakciu textu.`;
      text = '';
    }
  } catch (error) {
    console.error('FILE EXTRACT ERROR:', error);
    warning =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa extrahovať text zo súboru.';
    text = '';
  }

  const cleanedText = cleanExtractedText(text);

  if (!cleanedText && !warning) {
    warning =
      'Súbor bol nahratý, ale nepodarilo sa z neho extrahovať čitateľný text.';
  }

  return {
    name,
    type,
    size,
    extension,
    text: cleanedText,
    charCount: cleanedText.length,
    warning,
  };
}

export async function extractTextFromFiles(
  files: File[]
): Promise<ExtractedFile[]> {
  const results: ExtractedFile[] = [];

  for (const file of files) {
    const extracted = await extractTextFromFile(file);
    results.push(extracted);
  }

  return results;
}