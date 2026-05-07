import mammoth from 'mammoth';

export type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  extension: string;

  // hlavný text
  text: string;

  // aliasy pre ostatné API moduly
  content: string;
  extractedText: string;

  charCount: number;
  warning?: string;
  ok: boolean;
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
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizePdfText(value: string): string {
  return cleanExtractedText(
    String(value || '')
      .replace(/([a-záäčďéíĺľňóôŕšťúýž])\n([a-záäčďéíĺľňóôŕšťúýž])/gi, '$1 $2')
      .replace(/-\n/g, '')
  );
}

function extractPlainText(buffer: Buffer): string {
  try {
    return cleanExtractedText(buffer.toString('utf8'));
  } catch (error) {
    console.error('PLAIN TEXT EXTRACT ERROR:', error);
    return '';
  }
}

function extractRtfText(buffer: Buffer): string {
  try {
    const raw = buffer.toString('utf8');

    const text = raw
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\line/g, '\n')
      .replace(/\\tab/g, ' ')
      .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
      .replace(/\\u(-?\d+)\??/g, (_match, code) => {
        const numericCode = Number(code);

        if (!Number.isFinite(numericCode)) {
          return ' ';
        }

        try {
          return String.fromCharCode(numericCode < 0 ? numericCode + 65536 : numericCode);
        } catch {
          return ' ';
        }
      })
      .replace(/\\[a-zA-Z]+\d* ?/g, ' ')
      .replace(/[{}]/g, ' ');

    return cleanExtractedText(text);
  } catch (error) {
    console.error('RTF EXTRACT ERROR:', error);
    return '';
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanExtractedText(result.value || '');
  } catch (error) {
    console.error('DOCX EXTRACT ERROR:', error);
    return '';
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse');

    // pdf-parse má podľa verzie rozdielne exporty:
    // 1) staršie verzie: default funkcia
    // 2) niektoré verzie: pdfParse funkcia
    // 3) nové verzie: PDFParse class
    const legacyParser =
      (pdfParseModule as any).default ||
      (pdfParseModule as any).pdfParse ||
      (typeof (pdfParseModule as any) === 'function'
        ? (pdfParseModule as any)
        : null);

    if (typeof legacyParser === 'function') {
      const result = await legacyParser(buffer);
      return normalizePdfText(result?.text || '');
    }

    const PDFParse = (pdfParseModule as any).PDFParse;

    if (typeof PDFParse === 'function') {
      const parser = new PDFParse({
        data: buffer,
      });

      try {
        const result = await parser.getText();

        const text =
          result?.text ||
          result?.pages
            ?.map((page: any) => page?.text || '')
            .join('\n\n') ||
          '';

        return normalizePdfText(text);
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    }

    console.error('PDF PARSE ERROR: Unsupported pdf-parse export format');
    return '';
  } catch (error) {
    console.error('PDF PARSE ERROR:', error);
    return '';
  }
}

function getUnsupportedWarning(extension: string, name: string): string {
  if (extension === '.doc') {
    return 'Starý formát .doc sa nedá spoľahlivo čítať. Súbor ulož ako .docx a nahraj znova.';
  }

  if (extension === '.odt') {
    return 'Formát ODT zatiaľ nie je podporovaný na extrakciu textu. Odporúčané je nahrať DOCX, PDF s textovou vrstvou alebo TXT.';
  }

  if (['.xls', '.xlsx'].includes(extension)) {
    return 'Tabuľkový súbor bol nahratý, ale text sa z neho zatiaľ neextrahuje. Pre audit vlož text ručne alebo nahraj DOCX/PDF.';
  }

  if (['.ppt', '.pptx'].includes(extension)) {
    return 'Prezentácia bola nahratá, ale text sa z nej zatiaľ neextrahuje. Pre audit vlož text ručne alebo nahraj DOCX/PDF.';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok bol nahratý, ale OCR čítanie textu z obrázka zatiaľ nie je zapnuté.';
  }

  return `Formát súboru ${extension || name} zatiaľ nie je podporovaný na extrakciu textu.`;
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
    } else if (
      extension === '.docx' ||
      lowerType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ) {
      text = await extractDocxText(buffer);
    } else if (extension === '.pdf' || lowerType.includes('pdf')) {
      text = await extractPdfText(buffer);
    } else {
      warning = getUnsupportedWarning(extension, name);
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
      'Súbor bol nahratý, ale nepodarilo sa z neho extrahovať čitateľný text. Pri PDF skontroluj, či nejde o sken bez textovej vrstvy.';
  }

  return {
    name,
    type,
    size,
    extension,
    text: cleanedText,
    content: cleanedText,
    extractedText: cleanedText,
    charCount: cleanedText.length,
    warning,
    ok: cleanedText.length > 0,
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