import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExtractedFile = {
  fileName: string;
  extension: string;
  type: string;
  size: number;
  text: string;
  tables: string[][];
  rows: Record<string, unknown>[];
  method: string;
  warnings: string[];
};

type VariableSummary = {
  name: string;
  valid: number;
  missing: number;
  mean: number | null;
  median: number | null;
  stdDeviation: number | null;
  minimum: number | null;
  maximum: number | null;
  sum: number | null;
  skewness: number | null;
  kurtosis: number | null;
  distinctValues: number;
  variableType: 'numeric' | 'categorical' | 'text';
};

type FrequencyRow = {
  value: string;
  frequency: number;
  percent: number;
  validPercent: number;
  cumulativePercent: number;
};

type FrequencyTable = {
  variable: string;
  rows: FrequencyRow[];
  missing: number;
  total: number;
};

type RecommendedChart = {
  title: string;
  type:
    | 'bar'
    | 'histogram'
    | 'boxplot'
    | 'pie'
    | 'heatmap'
    | 'line'
    | 'radar'
    | 'scatter';
  variables: string[];
  reason: string;
};

type RecommendedTest = {
  hypothesis: string;
  variables: string[];
  test: string;
  reason: string;
  parametric: boolean;
};

type AnalysisResult = {
  ok: boolean;
  title: string;
  summary: string;
  files: ExtractedFile[];
  variables: VariableSummary[];
  frequencyTables: FrequencyTable[];
  frequencies: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  excelTables: string[];
  practicalText: string;
  fullText: string;
  warnings: string[];
};

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
  return 'Neznáma chyba pri spracovaní súboru.';
}

function compactStrings(values: Array<string | undefined | null | false | ''>) {
  return values.filter((value): value is string => {
    return typeof value === 'string' && value.trim().length > 0;
  });
}

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const cleaned = String(value).trim().replace(/\s/g, '').replace(',', '.');

  if (!cleaned) return null;

  const number = Number(cleaned);

  if (!Number.isFinite(number)) return null;

  return number;
}

function isMissingValue(value: unknown) {
  if (value === null || value === undefined) return true;

  const text = String(value).trim();

  return (
    text === '' ||
    text.toLowerCase() === 'null' ||
    text.toLowerCase() === 'undefined' ||
    text.toLowerCase() === 'nan'
  );
}

function mean(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function stdDeviation(values: number[]) {
  if (values.length < 2) return null;

  const avg = mean(values);

  if (avg === null) return null;

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

function skewness(values: number[]) {
  if (values.length < 3) return null;

  const avg = mean(values);
  const sd = stdDeviation(values);

  if (avg === null || !sd) return null;

  const n = values.length;
  const m3 =
    values.reduce((sum, value) => sum + Math.pow((value - avg) / sd, 3), 0) /
    n;

  return m3;
}

function kurtosis(values: number[]) {
  if (values.length < 4) return null;

  const avg = mean(values);
  const sd = stdDeviation(values);

  if (avg === null || !sd) return null;

  const n = values.length;
  const m4 =
    values.reduce((sum, value) => sum + Math.pow((value - avg) / sd, 4), 0) /
    n;

  return m4 - 3;
}

function roundNumber(value: number | null, decimals = 3) {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

function detectDelimiter(text: string) {
  const firstLine = text.split('\n').find((line) => line.trim()) || '';

  const candidates = [';', ',', '\t', '|'];

  let best = ';';
  let bestCount = 0;

  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length;

    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function parseDelimitedText(text: string): Record<string, unknown>[] {
  const cleaned = cleanText(text);

  if (!cleaned) return [];

  const delimiter = detectDelimiter(cleaned);

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((header) => cleanText(header));

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);

    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header || `Premenná_${index + 1}`] = cleanText(values[index] || '');
    });

    return row;
  });
}

function recordsToText(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0] || {});

  const lines = [
    headers.join(';'),
    ...rows.map((row) =>
      headers.map((header) => String(row[header] ?? '')).join(';'),
    ),
  ];

  return lines.join('\n');
}

async function extractPlainText(file: File): Promise<ExtractedFile> {
  const text = cleanText(await file.text());
  const extension = getFileExtension(file.name);
  const rows =
    extension === '.csv' || text.includes(';') || text.includes(',')
      ? parseDelimitedText(text)
      : [];

  return {
    fileName: file.name,
    extension,
    type: file.type || 'text/plain',
    size: file.size,
    text,
    tables: [],
    rows,
    method: 'plain-text',
    warnings: text ? [] : ['Textový súbor je prázdny.'],
  };
}

async function extractPdf(file: File): Promise<ExtractedFile> {
  const buffer = await fileToBuffer(file);

  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule.default || pdfParseModule) as (
      dataBuffer: Buffer,
    ) => Promise<{
      text?: string;
      numpages?: number;
      info?: unknown;
    }>;

    const data = await pdfParse(buffer);
    const text = cleanText(data?.text || '');

    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type: file.type || 'application/pdf',
      size: file.size,
      text,
      tables: [],
      rows: [],
      method: 'pdf-parse',
      warnings: text
        ? []
        : [
            'PDF neobsahuje čitateľný text. Pravdepodobne ide o skenovaný dokument. Na OCR treba doplniť samostatný OCR modul.',
          ],
    };
  } catch (error) {
    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type: file.type || 'application/pdf',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'pdf-parse',
      warnings: [`PDF extrakcia zlyhala: ${getErrorMessage(error)}`],
    };
  }
}

async function extractDocx(file: File): Promise<ExtractedFile> {
  const buffer = await fileToBuffer(file);

  try {
    const mammoth = await import('mammoth');

    const result = await mammoth.extractRawText({ buffer });
    const text = cleanText(result?.value || '');

    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: file.size,
      text,
      tables: [],
      rows: [],
      method: 'mammoth-docx',
      warnings: result?.messages?.length
        ? result.messages.map((message) => String(message.message || message))
        : [],
    };
  } catch (error) {
    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type: file.type || 'application/docx',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'mammoth-docx',
      warnings: [`DOCX extrakcia zlyhala: ${getErrorMessage(error)}`],
    };
  }
}

async function extractExcel(file: File): Promise<ExtractedFile> {
  const buffer = await fileToBuffer(file);

  try {
    const xlsx = await import('xlsx');

    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellText: false,
      cellNF: false,
    });

    const textParts: string[] = [];
    const tables: string[][] = [];
    const allRows: Record<string, unknown>[] = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) return;

      const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: false,
      });

      allRows.push(...rows);

      const csv = xlsx.utils.sheet_to_csv(sheet, {
        FS: ';',
        RS: '\n',
        blankrows: false,
      });

      const cleanedCsv = cleanText(csv);

      if (cleanedCsv) {
        textParts.push(`HÁROK: ${sheetName}\n${cleanedCsv}`);
        tables.push(cleanedCsv.split('\n'));
      }
    });

    const text = cleanText(textParts.join('\n\n------------------------------\n\n'));

    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: file.size,
      text,
      tables,
      rows: allRows,
      method: 'xlsx',
      warnings: text ? [] : ['Excel súbor neobsahuje čitateľné dáta.'],
    };
  } catch (error) {
    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type: file.type || 'application/excel',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'xlsx',
      warnings: [`Excel extrakcia zlyhala: ${getErrorMessage(error)}`],
    };
  }
}

async function extractPptx(file: File): Promise<ExtractedFile> {
  const buffer = await fileToBuffer(file);

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

    for (const path of slidePaths) {
      const xml = await zip.files[path].async('string');

      const texts = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g))
        .map((match) => decodeXmlEntities(match[1] || ''))
        .map((item) => cleanText(item))
        .filter(Boolean);

      const slideNumber =
        Number(path.match(/slide(\d+)\.xml/i)?.[1] || 0) || slides.length + 1;

      if (texts.length) {
        slides.push(`SNÍMKA ${slideNumber}\n${texts.join('\n')}`);
      }
    }

    const text = cleanText(slides.join('\n\n------------------------------\n\n'));

    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type:
        file.type ||
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: file.size,
      text,
      tables: [],
      rows: [],
      method: 'pptx-jszip',
      warnings: text ? [] : ['PPTX neobsahuje čitateľný text v snímkach.'],
    };
  } catch (error) {
    return {
      fileName: file.name,
      extension: getFileExtension(file.name),
      type: file.type || 'application/pptx',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'pptx-jszip',
      warnings: [`PPTX extrakcia zlyhala: ${getErrorMessage(error)}`],
    };
  }
}

async function extractRtf(file: File): Promise<ExtractedFile> {
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
    fileName: file.name,
    extension: getFileExtension(file.name),
    type: file.type || 'application/rtf',
    size: file.size,
    text,
    tables: [],
    rows: [],
    method: 'basic-rtf-cleaner',
    warnings: text ? [] : ['RTF súbor neobsahuje čitateľný text.'],
  };
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

async function extractFile(file: File): Promise<ExtractedFile> {
  const fileName = normalizeFileName(file.name);
  const extension = getFileExtension(fileName);

  if (['.txt', '.md', '.csv'].includes(extension)) {
    return extractPlainText(file);
  }

  if (extension === '.rtf') {
    return extractRtf(file);
  }

  if (extension === '.pdf') {
    return extractPdf(file);
  }

  if (extension === '.docx') {
    return extractDocx(file);
  }

  if (['.xlsx', '.xls'].includes(extension)) {
    return extractExcel(file);
  }

  if (extension === '.pptx') {
    return extractPptx(file);
  }

  if (extension === '.doc') {
    return {
      fileName,
      extension,
      type: file.type || 'application/msword',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'doc-unsupported',
      warnings: [
        'Starý formát .doc nie je spoľahlivo podporovaný. Preveď dokument do .docx alebo PDF.',
      ],
    };
  }

  if (extension === '.odt') {
    return {
      fileName,
      extension,
      type: file.type || 'application/vnd.oasis.opendocument.text',
      size: file.size,
      text: '',
      tables: [],
      rows: [],
      method: 'odt-unsupported',
      warnings: [
        'ODT zatiaľ nie je podporované. Exportuj dokument ako DOCX alebo PDF.',
      ],
    };
  }

  return {
    fileName,
    extension,
    type: file.type || 'application/octet-stream',
    size: file.size,
    text: '',
    tables: [],
    rows: [],
    method: 'unsupported',
    warnings: [`Formát ${extension || 'bez prípony'} nie je podporovaný.`],
  };
}

function mergeRows(files: ExtractedFile[]) {
  const rows: Record<string, unknown>[] = [];

  for (const file of files) {
    if (file.rows.length > 0) {
      rows.push(...file.rows);
    }
  }

  return rows;
}

function getAllHeaders(rows: Record<string, unknown>[]) {
  const headers = new Set<string>();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key.trim()) headers.add(key.trim());
    });
  });

  return Array.from(headers);
}

function getColumnValues(rows: Record<string, unknown>[], column: string) {
  return rows.map((row) => row[column]);
}

function analyzeVariables(rows: Record<string, unknown>[]): VariableSummary[] {
  if (!rows.length) return [];

  const totalRows = rows.length;
  const headers = getAllHeaders(rows);

  return headers.map((header) => {
    const values = getColumnValues(rows, header);

    const validValues = values.filter((value) => !isMissingValue(value));
    const numericValues = validValues
      .map((value) => toNumber(value))
      .filter((value): value is number => value !== null);

    const numericRatio =
      validValues.length > 0 ? numericValues.length / validValues.length : 0;

    const distinctValues = new Set(
      validValues.map((value) => String(value).trim()),
    ).size;

    const variableType: VariableSummary['variableType'] =
      numericRatio >= 0.8
        ? distinctValues <= 10
          ? 'categorical'
          : 'numeric'
        : distinctValues <= 20
          ? 'categorical'
          : 'text';

    const sum =
      numericValues.length > 0
        ? numericValues.reduce((total, value) => total + value, 0)
        : null;

    return {
      name: header,
      valid: validValues.length,
      missing: totalRows - validValues.length,
      mean: roundNumber(mean(numericValues)),
      median: roundNumber(median(numericValues)),
      stdDeviation: roundNumber(stdDeviation(numericValues)),
      minimum: numericValues.length
        ? roundNumber(Math.min(...numericValues))
        : null,
      maximum: numericValues.length
        ? roundNumber(Math.max(...numericValues))
        : null,
      sum: roundNumber(sum),
      skewness: roundNumber(skewness(numericValues)),
      kurtosis: roundNumber(kurtosis(numericValues)),
      distinctValues,
      variableType,
    };
  });
}

function createFrequencyTables(
  rows: Record<string, unknown>[],
  variables: VariableSummary[],
): FrequencyTable[] {
  if (!rows.length) return [];

  const total = rows.length;

  return variables
    .filter((variable) => {
      return (
        variable.variableType === 'categorical' ||
        variable.distinctValues <= 20 ||
        /^WEM\d+$/i.test(variable.name) ||
        /^JSS\d+$/i.test(variable.name)
      );
    })
    .map((variable) => {
      const values = getColumnValues(rows, variable.name);
      const validValues = values.filter((value) => !isMissingValue(value));
      const missing = total - validValues.length;

      const counts = new Map<string, number>();

      validValues.forEach((value) => {
        const key = String(value).trim();
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      let cumulative = 0;

      const tableRows = Array.from(counts.entries())
        .sort((a, b) => {
          const an = toNumber(a[0]);
          const bn = toNumber(b[0]);

          if (an !== null && bn !== null) return an - bn;

          return a[0].localeCompare(b[0], 'sk');
        })
        .map(([value, frequency]) => {
          const percent = total > 0 ? (frequency / total) * 100 : 0;
          const validPercent =
            validValues.length > 0 ? (frequency / validValues.length) * 100 : 0;

          cumulative += validPercent;

          return {
            value,
            frequency,
            percent: roundNumber(percent) || 0,
            validPercent: roundNumber(validPercent) || 0,
            cumulativePercent: roundNumber(Math.min(cumulative, 100)) || 0,
          };
        });

      return {
        variable: variable.name,
        rows: tableRows,
        missing,
        total,
      };
    });
}

function recommendCharts(variables: VariableSummary[]) {
  const charts: RecommendedChart[] = [];

  const findVariable = (patterns: RegExp[]) => {
    return variables.find((variable) =>
      patterns.some((pattern) => pattern.test(variable.name)),
    );
  };

  const vek = findVariable([/^vek$/i, /age/i]);
  const pohlavie = findVariable([/pohlavie/i, /gender/i, /sex/i]);
  const typPodniku = findVariable([/typ.*podniku/i]);
  const rodinnyStav = findVariable([/rodinn/i]);
  const wemwbs = findVariable([/WEMWBS/i]);
  const jss = findVariable([/^JSS_skore$/i, /JSS.*skore/i]);

  if (pohlavie) {
    charts.push({
      title: 'Rozdelenie pohlavia',
      type: 'bar',
      variables: [pohlavie.name],
      reason: 'Vhodné pre kategorizovanú demografickú premennú.',
    });
  }

  if (typPodniku) {
    charts.push({
      title: 'Rozdelenie typu podniku',
      type: 'bar',
      variables: [typPodniku.name],
      reason: 'Vhodné na porovnanie zastúpenia respondentov podľa typu podniku.',
    });
  }

  if (rodinnyStav) {
    charts.push({
      title: 'Rozdelenie rodinného stavu',
      type: 'bar',
      variables: [rodinnyStav.name],
      reason: 'Vhodné na prezentáciu štruktúry výskumného súboru.',
    });
  }

  if (vek) {
    charts.push({
      title: 'Histogram veku',
      type: 'histogram',
      variables: [vek.name],
      reason: 'Vhodné na zobrazenie rozdelenia veku respondentov.',
    });

    charts.push({
      title: 'Boxplot veku',
      type: 'boxplot',
      variables: [vek.name],
      reason: 'Vhodné na identifikáciu variability a extrémnych hodnôt.',
    });
  }

  if (wemwbs) {
    charts.push({
      title: 'Histogram WEMWBS skóre',
      type: 'histogram',
      variables: [wemwbs.name],
      reason: 'Vhodné na kontrolu rozdelenia celkového skóre well-beingu.',
    });
  }

  if (jss) {
    charts.push({
      title: 'Histogram JSS skóre',
      type: 'histogram',
      variables: [jss.name],
      reason:
        'Vhodné na zobrazenie rozdelenia celkového skóre pracovnej spokojnosti.',
    });
  }

  if (wemwbs && jss) {
    charts.push({
      title: 'Korelačná matica hlavných škál',
      type: 'heatmap',
      variables: [wemwbs.name, jss.name],
      reason: 'Vhodné na vizuálne zobrazenie vzťahu medzi hlavnými škálami.',
    });

    charts.push({
      title: 'Bodový graf WEMWBS a JSS',
      type: 'scatter',
      variables: [wemwbs.name, jss.name],
      reason:
        'Vhodné na kontrolu lineárneho vzťahu medzi well-beingom a pracovnou spokojnosťou.',
    });
  }

  const jssSubscales = variables
    .filter((variable) => {
      return /^JSS_/i.test(variable.name) && !/skore/i.test(variable.name);
    })
    .map((variable) => variable.name);

  if (jssSubscales.length >= 3) {
    charts.push({
      title: 'Radar graf JSS subškál',
      type: 'radar',
      variables: jssSubscales,
      reason:
        'Vhodné na rýchle porovnanie úrovne jednotlivých dimenzií pracovnej spokojnosti.',
    });
  }

  return charts;
}

function recommendTests(variables: VariableSummary[]) {
  const tests: RecommendedTest[] = [];

  const names = variables.map((variable) => variable.name);

  const has = (pattern: RegExp) => names.find((name) => pattern.test(name));

  const vek = has(/^vek$/i);
  const pohlavie = has(/pohlavie/i);
  const typPodniku = has(/typ.*podniku/i);
  const rodinnyStav = has(/rodinn/i);
  const wemwbs = has(/WEMWBS/i);
  const jss = has(/^JSS_skore$/i);

  if (vek && wemwbs) {
    tests.push({
      hypothesis: 'Vzťah medzi vekom a celkovým skóre well-beingu',
      variables: [vek, wemwbs],
      test: 'Spearmanova korelácia',
      reason:
        'Vhodné pri nenormálnom rozdelení alebo ordinálnych/škálových dátach.',
      parametric: false,
    });
  }

  if (vek && jss) {
    tests.push({
      hypothesis: 'Vzťah medzi vekom a pracovnou spokojnosťou',
      variables: [vek, jss],
      test: 'Spearmanova korelácia',
      reason:
        'Vhodné na overenie monotónneho vzťahu medzi vekom a skóre spokojnosti.',
      parametric: false,
    });
  }

  if (wemwbs && jss) {
    tests.push({
      hypothesis: 'Vzťah medzi well-beingom a pracovnou spokojnosťou',
      variables: [wemwbs, jss],
      test: 'Spearmanova alebo Pearsonova korelácia',
      reason:
        'Pearson možno použiť pri splnení normality a lineárneho vzťahu, inak Spearman.',
      parametric: false,
    });
  }

  if (pohlavie && (wemwbs || jss)) {
    tests.push({
      hypothesis: 'Rozdiely v skóre podľa pohlavia',
      variables: compactStrings([pohlavie, wemwbs, jss]),
      test: 'Mann-Whitney U test',
      reason:
        'Pohlavie má dve skupiny. Pri dotazníkových skórach je vhodné použiť neparametrický test, ak normalita nie je splnená.',
      parametric: false,
    });
  }

  if (typPodniku && (wemwbs || jss)) {
    tests.push({
      hypothesis: 'Rozdiely v skóre podľa typu podniku',
      variables: compactStrings([typPodniku, wemwbs, jss]),
      test: 'Mann-Whitney U test',
      reason:
        'Typ podniku má dve skupiny, preto je vhodný Mann-Whitney U test pri nenormálnom rozdelení.',
      parametric: false,
    });
  }

  if (rodinnyStav && (wemwbs || jss)) {
    tests.push({
      hypothesis: 'Rozdiely v skóre podľa rodinného stavu',
      variables: compactStrings([rodinnyStav, wemwbs, jss]),
      test: 'Kruskal-Wallis test',
      reason:
        'Rodinný stav má viac ako dve skupiny, preto je vhodný Kruskal-Wallis test.',
      parametric: false,
    });
  }

  const wemItems = names.filter((name) => /^WEM\d+$/i.test(name));
  const jssItems = names.filter((name) => /^JSS\d+$/i.test(name));

  if (wemItems.length >= 3 || jssItems.length >= 3) {
    tests.push({
      hypothesis: 'Vnútorná konzistencia škál',
      variables: compactStrings([
        wemItems.length ? 'WEM1–WEM14' : '',
        jssItems.length ? 'JSS1–JSS36' : '',
      ]),
      test: 'Cronbachova alfa',
      reason: 'Vhodné na overenie reliability dotazníkových škál a subškál.',
      parametric: false,
    });
  }

  if (wemwbs || jss) {
    tests.push({
      hypothesis: 'Predikcia well-beingu alebo pracovnej spokojnosti',
      variables: compactStrings([wemwbs, jss, vek, pohlavie, typPodniku]),
      test: 'Regresná analýza',
      reason:
        'Vhodné pri overovaní, ktoré premenné predikujú výsledné skóre.',
      parametric: true,
    });
  }

  return tests;
}

function getDefaultExcelTables() {
  return [
    'Tabuľka 1: Charakteristika výskumného súboru',
    'Tabuľka 2: Frekvenčné rozdelenie pohlavia',
    'Tabuľka 3: Frekvenčné rozdelenie typu podniku',
    'Tabuľka 4: Frekvenčné rozdelenie rodinného stavu',
    'Tabuľka 5: Deskriptívna štatistika veku',
    'Tabuľka 6: Deskriptívna štatistika WEMWBS položiek',
    'Tabuľka 7: Deskriptívna štatistika WEMWBS celkového skóre',
    'Tabuľka 8: Deskriptívna štatistika JSS položiek',
    'Tabuľka 9: Deskriptívna štatistika JSS celkového skóre',
    'Tabuľka 10: Deskriptívna štatistika JSS subškál',
    'Tabuľka 11: Test normality vybraných premenných',
    'Tabuľka 12: Korelačná matica',
    'Tabuľka 13: Rozdiely podľa pohlavia',
    'Tabuľka 14: Rozdiely podľa typu podniku',
    'Tabuľka 15: Rozdiely podľa rodinného stavu',
    'Tabuľka 16: Reliabilita použitých škál',
  ];
}

function createPracticalText(variables: VariableSummary[]) {
  const vek = variables.find((variable) => /^vek$/i.test(variable.name));
  const wemwbs = variables.find((variable) => /WEMWBS/i.test(variable.name));
  const jss = variables.find((variable) => /^JSS_skore$/i.test(variable.name));

  const parts = [
    'Do praktickej časti práce je vhodné zaradiť najskôr charakteristiku výskumného súboru, následne deskriptívnu štatistiku hlavných premenných, frekvenčné tabuľky kategorizovaných premenných a potom testovanie hypotéz.',
  ];

  if (vek) {
    parts.push(
      `Premenná ${vek.name} má ${vek.valid} platných hodnôt. Priemerná hodnota je ${
        vek.mean ?? 'neuvedené'
      }, medián je ${vek.median ?? 'neuvedené'} a smerodajná odchýlka je ${
        vek.stdDeviation ?? 'neuvedené'
      }.`,
    );
  }

  if (wemwbs) {
    parts.push(
      `Celkové skóre WEMWBS dosiahlo priemer ${
        wemwbs.mean ?? 'neuvedené'
      } a smerodajnú odchýlku ${
        wemwbs.stdDeviation ?? 'neuvedené'
      }. Túto premennú je vhodné interpretovať ako hlavný ukazovateľ subjektívneho well-beingu.`,
    );
  }

  if (jss) {
    parts.push(
      `Celkové skóre JSS dosiahlo priemer ${
        jss.mean ?? 'neuvedené'
      } a smerodajnú odchýlku ${
        jss.stdDeviation ?? 'neuvedené'
      }. Premennú je vhodné použiť ako hlavný ukazovateľ pracovnej spokojnosti.`,
    );
  }

  parts.push(
    'Pri kategorizovaných premenných je potrebné uvádzať najmä frekvencie a validné percentá. Pri dotazníkových položkách je vhodné neuvádzať mechanicky všetky položky v texte, ale zamerať sa na celkové skóre, subškály a tabuľkové prílohy.',
  );

  return parts.join('\n\n');
}

function createSummary({
  files,
  variables,
  frequencyTables,
  recommendedCharts,
  recommendedTests,
}: {
  files: ExtractedFile[];
  variables: VariableSummary[];
  frequencyTables: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
}) {
  const fileNames = files.map((file) => file.fileName).join(', ') || 'bez súboru';

  return [
    `Spracované súbory: ${fileNames}.`,
    `Počet identifikovaných premenných: ${variables.length}.`,
    `Počet frekvenčných tabuliek: ${frequencyTables.length}.`,
    `Počet odporúčaných grafov: ${recommendedCharts.length}.`,
    `Počet odporúčaných štatistických testov: ${recommendedTests.length}.`,
  ].join('\n');
}

function createFullText({
  variables,
  frequencyTables,
  recommendedCharts,
  recommendedTests,
  practicalText,
  warnings,
}: {
  variables: VariableSummary[];
  frequencyTables: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  practicalText: string;
  warnings: string[];
}) {
  const variableText = variables
    .map((variable) => {
      return `${variable.name}: validné=${variable.valid}, chýbajúce=${variable.missing}, priemer=${
        variable.mean ?? '—'
      }, medián=${variable.median ?? '—'}, SD=${
        variable.stdDeviation ?? '—'
      }, min=${variable.minimum ?? '—'}, max=${variable.maximum ?? '—'}, typ=${
        variable.variableType
      }`;
    })
    .join('\n');

  const frequencyText = frequencyTables
    .slice(0, 20)
    .map((table) => {
      const rows = table.rows
        .map((row) => {
          return `${row.value}: n=${row.frequency}, valid %=${row.validPercent}`;
        })
        .join('; ');

      return `${table.variable}: ${rows}`;
    })
    .join('\n');

  const chartText = recommendedCharts
    .map((chart) => {
      return `${chart.title} (${chart.type}): ${chart.variables.join(', ')} – ${
        chart.reason
      }`;
    })
    .join('\n');

  const testText = recommendedTests
    .map((test) => {
      return `${test.hypothesis}: ${test.test}; premenné: ${test.variables.join(
        ', ',
      )}; dôvod: ${test.reason}`;
    })
    .join('\n');

  const warningText = warnings.length ? warnings.map((item) => `- ${item}`).join('\n') : 'Bez upozornení.';

  return cleanText(`
VÝSLEDKY ANALÝZY

1. Upozornenia
${warningText}

2. Deskriptívna štatistika premenných
${variableText || 'Neboli identifikované tabuľkové premenné.'}

3. Frekvenčné tabuľky
${frequencyText || 'Neboli vytvorené frekvenčné tabuľky.'}

4. Odporúčané grafy
${chartText || 'Neboli navrhnuté grafy.'}

5. Odporúčané štatistické testy
${testText || 'Neboli navrhnuté testy.'}

6. Text do praktickej časti
${practicalText}
`);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File);

    const singleFile = formData.get('file');

    if (singleFile instanceof File) {
      files.push(singleFile);
    }

    if (!files.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Neboli odoslané žiadne súbory. Použi pole "files" alebo "file".',
        },
        { status: 400 },
      );
    }

    const oversized = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (oversized) {
      return NextResponse.json(
        {
          ok: false,
          error: `Súbor ${oversized.name} je príliš veľký. Maximum je ${MAX_FILE_SIZE_MB} MB.`,
        },
        { status: 413 },
      );
    }

    const extractedFiles = await Promise.all(
      files.map((file) => extractFile(file)),
    );

    const allRows = mergeRows(extractedFiles);

    const variables = analyzeVariables(allRows);
    const frequencyTables = createFrequencyTables(allRows, variables);
    const recommendedCharts = recommendCharts(variables);
    const recommendedTests = recommendTests(variables);

    const warnings = extractedFiles.flatMap((file) => file.warnings);

    if (!allRows.length) {
      warnings.push(
        'Neboli nájdené tabuľkové dáta. Pre výpočty štatistiky nahraj Excel alebo CSV. Pri PDF/DOCX sa zatiaľ spoľahlivo extrahuje najmä text, nie komplexné tabuľky.',
      );
    }

    const practicalText = createPracticalText(variables);

    const summary = createSummary({
      files: extractedFiles,
      variables,
      frequencyTables,
      recommendedCharts,
      recommendedTests,
    });

    const fullText = createFullText({
      variables,
      frequencyTables,
      recommendedCharts,
      recommendedTests,
      practicalText,
      warnings,
    });

    const result: AnalysisResult = {
      ok: true,
      title: 'Výsledky analýzy',
      summary,
      files: extractedFiles,
      variables,
      frequencyTables,
      frequencies: frequencyTables,
      recommendedCharts,
      recommendedTests,
      excelTables: getDefaultExcelTables(),
      practicalText,
      fullText,
      warnings,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('ANALYSIS_FILES_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}