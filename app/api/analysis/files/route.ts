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
  variable: string;
  label: string;
  valid: number;
  missing: number;
  validValues: number;
  missingValues: number;
  mean: number | null;
  M: number | null;
  median: number | null;
  Md: number | null;
  stdDeviation: number | null;
  SD: number | null;
  minimum: number | null;
  min: number | null;
  maximum: number | null;
  max: number | null;
  sum: number | null;
  skewness: number | null;
  kurtosis: number | null;
  distinctValues: number;
  variableType: 'numeric' | 'categorical' | 'text';
  measurementLevel: 'scale' | 'nominal' | 'ordinal' | 'text';
  description: string;
};

type DescriptiveStatistic = {
  name: string;
  variable: string;
  label: string;
  valid: number;
  n: number;
  missing: number;
  mean: number | null;
  M: number | null;
  median: number | null;
  Md: number | null;
  stdDeviation: number | null;
  standardDeviation: number | null;
  SD: number | null;
  minimum: number | null;
  min: number | null;
  maximum: number | null;
  max: number | null;
  sum: number | null;
  skewness: number | null;
  kurtosis: number | null;
  interpretation: string;
};

type FrequencyRow = {
  value: string;
  category: string;
  frequency: number;
  count: number;
  percent: number;
  percentage: number;
  validPercent: number;
  cumulativePercent: number;
};

type FrequencyTable = {
  variable: string;
  name: string;
  title: string;
  rows: FrequencyRow[];
  missing: number;
  total: number;
  validTotal: number;
  interpretation: string;
};

type RecommendedChart = {
  title: string;
  name: string;
  type:
    | 'bar'
    | 'histogram'
    | 'boxplot'
    | 'pie'
    | 'heatmap'
    | 'line'
    | 'radar'
    | 'scatter';
  chartType: string;
  variables: string[];
  reason: string;
  description: string;
};

type RecommendedTest = {
  name: string;
  hypothesis: string;
  variables: string[];
  test: string;
  reason: string;
  parametric: boolean;
  assumptions: string[];
  interpretation: string;
};

type CorrelationResult = {
  name: string;
  test: 'Pearson' | 'Spearman';
  variable1: string;
  variable2: string;
  variables: string[];
  coefficient: number | null;
  r?: number | null;
  rho?: number | null;
  pValue: number | null;
  p: number | null;
  n: number;
  sampleSize: number;
  strength: string;
  direction: string;
  significant: boolean | null;
  interpretation: string;
};

type TTestResult = {
  name: string;
  test: string;
  dependentVariable: string;
  independentVariable: string;
  group1: string;
  group2: string;
  mean1: number | null;
  mean2: number | null;
  sd1: number | null;
  sd2: number | null;
  n1: number;
  n2: number;
  statistic: number | null;
  t: number | null;
  df: number | null;
  pValue: number | null;
  p: number | null;
  meanDifference: number | null;
  significant: boolean | null;
  interpretation: string;
};

type ExcelTable = {
  title: string;
  name: string;
  sheetName: string;
  description: string;
  headers: string[];
  columns: string[];
  rows: unknown[][];
  data: Record<string, unknown>[];
  interpretation?: string;
};

type AnalysisResult = {
  ok: boolean;
  title: string;
  summary: string;
  files: ExtractedFile[];
  extractedFiles: ExtractedFile[];
  variables: VariableSummary[];
  detectedVariables: VariableSummary[];
  columns: VariableSummary[];
  descriptiveStatistics: DescriptiveStatistic[];
  descriptive_statistics: DescriptiveStatistic[];
  frequencyTables: FrequencyTable[];
  frequencies: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedChartsData: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  correlations: CorrelationResult[];
  pearsonCorrelations: CorrelationResult[];
  spearmanCorrelations: CorrelationResult[];
  tTests: TTestResult[];
  hypothesisTests: Array<CorrelationResult | TTestResult>;
  excelTables: ExcelTable[];
  tables: ExcelTable[];
  practicalText: string;
  interpretation: string;
  fullText: string;
  warnings: string[];
  selectedAnalyses: string[];
  dataDescription: string;
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

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace('%', '')
    .replace(',', '.');

  if (!cleaned) return null;

  const number = Number(cleaned);

  if (!Number.isFinite(number)) return null;

  return number;
}

function isMissingValue(value: unknown) {
  if (value === null || value === undefined) return true;

  const text = String(value).trim().toLowerCase();

  return (
    text === '' ||
    text === 'null' ||
    text === 'undefined' ||
    text === 'nan' ||
    text === 'na' ||
    text === 'n/a' ||
    text === '-'
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

function safePercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 0;
  return roundNumber(value) || 0;
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

  const headers = lines[0].split(delimiter).map((header, index) => {
    const cleanedHeader = cleanText(header);
    return cleanedHeader || `Premenná_${index + 1}`;
  });

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = cleanText(values[index] || '');
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
      rows: parseDelimitedText(text),
      method: 'pdf-parse',
      warnings: text
        ? [
            'PDF bol spracovaný ako text. Ak PDF obsahuje tabuľky, odporúčame nahrať pôvodný Excel alebo CSV pre presnejšie výpočty.',
          ]
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
      rows: parseDelimitedText(text),
      method: 'mammoth-docx',
      warnings: result?.messages?.length
        ? result.messages.map((message) => String(message.message || message))
        : [
            'DOCX bol spracovaný ako text. Ak dokument obsahuje tabuľky, pre presnú štatistiku nahraj Excel alebo CSV.',
          ],
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
    rows: parseDelimitedText(text),
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

  if (['.txt', '.md', '.csv'].includes(extension)) return extractPlainText(file);
  if (extension === '.rtf') return extractRtf(file);
  if (extension === '.pdf') return extractPdf(file);
  if (extension === '.docx') return extractDocx(file);
  if (['.xlsx', '.xls'].includes(extension)) return extractExcel(file);
  if (extension === '.pptx') return extractPptx(file);

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

function getNumericColumnValues(rows: Record<string, unknown>[], column: string) {
  return getColumnValues(rows, column)
    .filter((value) => !isMissingValue(value))
    .map((value) => toNumber(value))
    .filter((value): value is number => value !== null);
}

function detectMeasurementLevel(
  variableType: VariableSummary['variableType'],
  distinctValues: number,
): VariableSummary['measurementLevel'] {
  if (variableType === 'numeric') return 'scale';
  if (variableType === 'categorical' && distinctValues <= 10) return 'ordinal';
  if (variableType === 'categorical') return 'nominal';
  return 'text';
}

function describeVariable(variable: {
  name: string;
  variableType: VariableSummary['variableType'];
  valid: number;
  distinctValues: number;
}) {
  if (variable.variableType === 'numeric') {
    return `Premenná ${variable.name} bola rozpoznaná ako numerická premenná s ${variable.valid} platnými hodnotami.`;
  }

  if (variable.variableType === 'categorical') {
    return `Premenná ${variable.name} bola rozpoznaná ako kategorizovaná premenná s ${variable.distinctValues} odlišnými hodnotami.`;
  }

  return `Premenná ${variable.name} bola rozpoznaná ako textová premenná.`;
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

    const meanValue = roundNumber(mean(numericValues));
    const medianValue = roundNumber(median(numericValues));
    const sdValue = roundNumber(stdDeviation(numericValues));
    const minValue = numericValues.length
      ? roundNumber(Math.min(...numericValues))
      : null;
    const maxValue = numericValues.length
      ? roundNumber(Math.max(...numericValues))
      : null;

    const base = {
      name: header,
      variable: header,
      label: header,
      valid: validValues.length,
      missing: totalRows - validValues.length,
      validValues: validValues.length,
      missingValues: totalRows - validValues.length,
      mean: meanValue,
      M: meanValue,
      median: medianValue,
      Md: medianValue,
      stdDeviation: sdValue,
      SD: sdValue,
      minimum: minValue,
      min: minValue,
      maximum: maxValue,
      max: maxValue,
      sum: roundNumber(sum),
      skewness: roundNumber(skewness(numericValues)),
      kurtosis: roundNumber(kurtosis(numericValues)),
      distinctValues,
      variableType,
      measurementLevel: detectMeasurementLevel(variableType, distinctValues),
    };

    return {
      ...base,
      description: describeVariable(base),
    };
  });
}

function createDescriptiveStatistics(
  variables: VariableSummary[],
): DescriptiveStatistic[] {
  return variables.map((variable) => {
    const interpretation =
      variable.variableType === 'numeric'
        ? `Premenná ${variable.name} má priemer M = ${
            variable.M ?? '—'
          }, medián Md = ${variable.Md ?? '—'} a štandardnú odchýlku SD = ${
            variable.SD ?? '—'
          }.`
        : `Premenná ${variable.name} je kategorizovaná alebo textová premenná. Pri tejto premennej je vhodnejšia frekvenčná analýza.`;

    return {
      name: variable.name,
      variable: variable.name,
      label: variable.label,
      valid: variable.valid,
      n: variable.valid,
      missing: variable.missing,
      mean: variable.mean,
      M: variable.M,
      median: variable.median,
      Md: variable.Md,
      stdDeviation: variable.stdDeviation,
      standardDeviation: variable.stdDeviation,
      SD: variable.SD,
      minimum: variable.minimum,
      min: variable.min,
      maximum: variable.maximum,
      max: variable.max,
      sum: variable.sum,
      skewness: variable.skewness,
      kurtosis: variable.kurtosis,
      interpretation,
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
            category: value,
            frequency,
            count: frequency,
            percent: safePercent(percent),
            percentage: safePercent(percent),
            validPercent: safePercent(validPercent),
            cumulativePercent: safePercent(Math.min(cumulative, 100)),
          };
        });

      return {
        variable: variable.name,
        name: variable.name,
        title: `Frekvenčná tabuľka – ${variable.name}`,
        rows: tableRows,
        missing,
        total,
        validTotal: validValues.length,
        interpretation: `Frekvenčná tabuľka zobrazuje rozdelenie odpovedí alebo hodnôt pre premennú ${variable.name}.`,
      };
    });
}

function pearsonCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return null;

  const meanX = mean(x);
  const meanY = mean(y);

  if (meanX === null || meanY === null) return null;

  let numerator = 0;
  let sumX = 0;
  let sumY = 0;

  for (let index = 0; index < x.length; index += 1) {
    const dx = x[index] - meanX;
    const dy = y[index] - meanY;

    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }

  const denominator = Math.sqrt(sumX * sumY);

  if (!denominator) return null;

  return numerator / denominator;
}

function rankValues(values: number[]) {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length).fill(0);

  let index = 0;

  while (index < sorted.length) {
    let end = index;

    while (
      end + 1 < sorted.length &&
      sorted[end + 1].value === sorted[index].value
    ) {
      end += 1;
    }

    const averageRank = (index + 1 + end + 1) / 2;

    for (let rankIndex = index; rankIndex <= end; rankIndex += 1) {
      ranks[sorted[rankIndex].index] = averageRank;
    }

    index = end + 1;
  }

  return ranks;
}

function spearmanCorrelation(x: number[], y: number[]) {
  if (x.length !== y.length || x.length < 3) return null;
  return pearsonCorrelation(rankValues(x), rankValues(y));
}

function getCorrelationStrength(value: number | null) {
  if (value === null) return 'neuvedené';

  const abs = Math.abs(value);

  if (abs < 0.1) return 'zanedbateľná';
  if (abs < 0.3) return 'slabá';
  if (abs < 0.5) return 'stredná';
  if (abs < 0.7) return 'silná';
  return 'veľmi silná';
}

function getCorrelationDirection(value: number | null) {
  if (value === null) return 'neuvedené';
  if (value > 0) return 'pozitívny';
  if (value < 0) return 'negatívny';
  return 'nulový';
}

function createCorrelationInterpretation(params: {
  test: 'Pearson' | 'Spearman';
  variable1: string;
  variable2: string;
  coefficient: number | null;
  n: number;
}) {
  const symbol = params.test === 'Pearson' ? 'r' : 'ρ';
  const label =
    params.test === 'Pearson'
      ? 'Pearsonov korelačný koeficient'
      : 'Spearmanov korelačný koeficient';

  return [
    `${label} medzi premennými ${params.variable1} a ${params.variable2} je ${symbol} = ${
      params.coefficient ?? '—'
    }.`,
    `Počet párových pozorovaní je n = ${params.n}.`,
    `Sila vzťahu: ${getCorrelationStrength(params.coefficient)}.`,
    `Smer vzťahu: ${getCorrelationDirection(params.coefficient)}.`,
    'Hodnota p nie je v tomto rýchlom výpočte dopočítaná, preto štatistickú významnosť odporúčame overiť v JASP, SPSS, R alebo inom štatistickom softvéri.',
  ].join(' ');
}

function createCorrelationResults(
  rows: Record<string, unknown>[],
  variables: VariableSummary[],
) {
  const numericVariables = variables.filter(
    (variable) =>
      variable.variableType === 'numeric' &&
      getNumericColumnValues(rows, variable.name).length >= 3,
  );

  const pearsonResults: CorrelationResult[] = [];
  const spearmanResults: CorrelationResult[] = [];

  for (let i = 0; i < numericVariables.length; i += 1) {
    for (let j = i + 1; j < numericVariables.length; j += 1) {
      const first = numericVariables[i];
      const second = numericVariables[j];

      const paired: Array<[number, number]> = [];

      for (const row of rows) {
        const x = toNumber(row[first.name]);
        const y = toNumber(row[second.name]);

        if (x !== null && y !== null) {
          paired.push([x, y]);
        }
      }

      if (paired.length < 3) continue;

      const xValues = paired.map((item) => item[0]);
      const yValues = paired.map((item) => item[1]);

      const pearson = roundNumber(pearsonCorrelation(xValues, yValues));
      const spearman = roundNumber(spearmanCorrelation(xValues, yValues));

      pearsonResults.push({
        name: `Pearsonova korelácia: ${first.name} × ${second.name}`,
        test: 'Pearson',
        variable1: first.name,
        variable2: second.name,
        variables: [first.name, second.name],
        coefficient: pearson,
        r: pearson,
        pValue: null,
        p: null,
        n: paired.length,
        sampleSize: paired.length,
        strength: getCorrelationStrength(pearson),
        direction: getCorrelationDirection(pearson),
        significant: null,
        interpretation: createCorrelationInterpretation({
          test: 'Pearson',
          variable1: first.name,
          variable2: second.name,
          coefficient: pearson,
          n: paired.length,
        }),
      });

      spearmanResults.push({
        name: `Spearmanova korelácia: ${first.name} × ${second.name}`,
        test: 'Spearman',
        variable1: first.name,
        variable2: second.name,
        variables: [first.name, second.name],
        coefficient: spearman,
        rho: spearman,
        pValue: null,
        p: null,
        n: paired.length,
        sampleSize: paired.length,
        strength: getCorrelationStrength(spearman),
        direction: getCorrelationDirection(spearman),
        significant: null,
        interpretation: createCorrelationInterpretation({
          test: 'Spearman',
          variable1: first.name,
          variable2: second.name,
          coefficient: spearman,
          n: paired.length,
        }),
      });
    }
  }

  return {
    pearsonResults,
    spearmanResults,
    all: [...pearsonResults, ...spearmanResults],
  };
}

function getCategoricalGroups(
  rows: Record<string, unknown>[],
  groupVariable: string,
) {
  const groups = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const rawValue = row[groupVariable];

    if (isMissingValue(rawValue)) continue;

    const key = String(rawValue).trim();

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(row);
  }

  return groups;
}

function createTTests(
  rows: Record<string, unknown>[],
  variables: VariableSummary[],
): TTestResult[] {
  const numericVariables = variables.filter(
    (variable) => variable.variableType === 'numeric',
  );

  const groupVariables = variables.filter(
    (variable) =>
      variable.variableType === 'categorical' &&
      variable.distinctValues === 2,
  );

  const results: TTestResult[] = [];

  for (const groupVariable of groupVariables) {
    const groups = getCategoricalGroups(rows, groupVariable.name);
    const groupNames = Array.from(groups.keys());

    if (groupNames.length !== 2) continue;

    for (const numericVariable of numericVariables) {
      const firstGroupRows = groups.get(groupNames[0]) || [];
      const secondGroupRows = groups.get(groupNames[1]) || [];

      const firstValues = firstGroupRows
        .map((row) => toNumber(row[numericVariable.name]))
        .filter((value): value is number => value !== null);

      const secondValues = secondGroupRows
        .map((row) => toNumber(row[numericVariable.name]))
        .filter((value): value is number => value !== null);

      if (firstValues.length < 2 || secondValues.length < 2) continue;

      const mean1 = roundNumber(mean(firstValues));
      const mean2 = roundNumber(mean(secondValues));
      const sd1 = roundNumber(stdDeviation(firstValues));
      const sd2 = roundNumber(stdDeviation(secondValues));

      const rawMean1 = mean(firstValues);
      const rawMean2 = mean(secondValues);
      const rawSd1 = stdDeviation(firstValues);
      const rawSd2 = stdDeviation(secondValues);

      let t: number | null = null;
      let df: number | null = null;

      if (
        rawMean1 !== null &&
        rawMean2 !== null &&
        rawSd1 !== null &&
        rawSd2 !== null
      ) {
        const se = Math.sqrt(
          Math.pow(rawSd1, 2) / firstValues.length +
            Math.pow(rawSd2, 2) / secondValues.length,
        );

        if (se > 0) {
          t = roundNumber((rawMean1 - rawMean2) / se);
          df = roundNumber(firstValues.length + secondValues.length - 2);
        }
      }

      const meanDifference =
        rawMean1 !== null && rawMean2 !== null
          ? roundNumber(rawMean1 - rawMean2)
          : null;

      results.push({
        name: `T-test: ${numericVariable.name} podľa ${groupVariable.name}`,
        test: 'Nezávislý t-test',
        dependentVariable: numericVariable.name,
        independentVariable: groupVariable.name,
        group1: groupNames[0],
        group2: groupNames[1],
        mean1,
        mean2,
        sd1,
        sd2,
        n1: firstValues.length,
        n2: secondValues.length,
        statistic: t,
        t,
        df,
        pValue: null,
        p: null,
        meanDifference,
        significant: null,
        interpretation: [
          `Pre premennú ${numericVariable.name} boli porovnané dve skupiny podľa premennej ${groupVariable.name}.`,
          `Skupina ${groupNames[0]} dosiahla M = ${mean1 ?? '—'}, SD = ${sd1 ?? '—'}, n = ${firstValues.length}.`,
          `Skupina ${groupNames[1]} dosiahla M = ${mean2 ?? '—'}, SD = ${sd2 ?? '—'}, n = ${secondValues.length}.`,
          `Vypočítaná hodnota t = ${t ?? '—'}, df = ${df ?? '—'}.`,
          'Hodnota p nie je v tomto rýchlom výpočte dopočítaná, preto štatistickú významnosť odporúčame overiť v JASP, SPSS, R alebo inom štatistickom softvéri.',
        ].join(' '),
      });
    }
  }

  return results;
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

  const pushChart = (
    title: string,
    type: RecommendedChart['type'],
    variablesList: string[],
    reason: string,
  ) => {
    charts.push({
      title,
      name: title,
      type,
      chartType: type,
      variables: variablesList,
      reason,
      description: reason,
    });
  };

  if (pohlavie) {
    pushChart(
      'Rozdelenie pohlavia',
      'bar',
      [pohlavie.name],
      'Vhodné pre kategorizovanú demografickú premennú.',
    );
  }

  if (typPodniku) {
    pushChart(
      'Rozdelenie typu podniku',
      'bar',
      [typPodniku.name],
      'Vhodné na porovnanie zastúpenia respondentov podľa typu podniku.',
    );
  }

  if (rodinnyStav) {
    pushChart(
      'Rozdelenie rodinného stavu',
      'bar',
      [rodinnyStav.name],
      'Vhodné na prezentáciu štruktúry výskumného súboru.',
    );
  }

  if (vek) {
    pushChart(
      'Histogram veku',
      'histogram',
      [vek.name],
      'Vhodné na zobrazenie rozdelenia veku respondentov.',
    );

    pushChart(
      'Boxplot veku',
      'boxplot',
      [vek.name],
      'Vhodné na identifikáciu variability a extrémnych hodnôt.',
    );
  }

  if (wemwbs) {
    pushChart(
      'Histogram WEMWBS skóre',
      'histogram',
      [wemwbs.name],
      'Vhodné na kontrolu rozdelenia celkového skóre well-beingu.',
    );
  }

  if (jss) {
    pushChart(
      'Histogram JSS skóre',
      'histogram',
      [jss.name],
      'Vhodné na zobrazenie rozdelenia celkového skóre pracovnej spokojnosti.',
    );
  }

  if (wemwbs && jss) {
    pushChart(
      'Korelačná matica hlavných škál',
      'heatmap',
      [wemwbs.name, jss.name],
      'Vhodné na vizuálne zobrazenie vzťahu medzi hlavnými škálami.',
    );

    pushChart(
      'Bodový graf WEMWBS a JSS',
      'scatter',
      [wemwbs.name, jss.name],
      'Vhodné na kontrolu lineárneho vzťahu medzi well-beingom a pracovnou spokojnosťou.',
    );
  }

  const jssSubscales = variables
    .filter((variable) => {
      return /^JSS_/i.test(variable.name) && !/skore/i.test(variable.name);
    })
    .map((variable) => variable.name);

  if (jssSubscales.length >= 3) {
    pushChart(
      'Radar graf JSS subškál',
      'radar',
      jssSubscales,
      'Vhodné na rýchle porovnanie úrovne jednotlivých dimenzií pracovnej spokojnosti.',
    );
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

  const pushTest = (
    item: Omit<RecommendedTest, 'name' | 'assumptions' | 'interpretation'>,
  ) => {
    tests.push({
      ...item,
      name: item.test,
      assumptions: item.parametric
        ? [
            'približne normálne rozdelenie',
            'nezávislé pozorovania',
            'primeraná veľkosť vzorky',
          ]
        : [
            'nezávislé pozorovania',
            'vhodné pri ordinálnych alebo nenormálne rozdelených dátach',
          ],
      interpretation: `Test ${item.test} je odporúčaný pre hypotézu: ${item.hypothesis}.`,
    });
  };

  if (vek && wemwbs) {
    pushTest({
      hypothesis: 'Vzťah medzi vekom a celkovým skóre well-beingu',
      variables: [vek, wemwbs],
      test: 'Spearmanova korelácia',
      reason:
        'Vhodné pri nenormálnom rozdelení alebo ordinálnych/škálových dátach.',
      parametric: false,
    });
  }

  if (vek && jss) {
    pushTest({
      hypothesis: 'Vzťah medzi vekom a pracovnou spokojnosťou',
      variables: [vek, jss],
      test: 'Spearmanova korelácia',
      reason:
        'Vhodné na overenie monotónneho vzťahu medzi vekom a skóre spokojnosti.',
      parametric: false,
    });
  }

  if (wemwbs && jss) {
    pushTest({
      hypothesis: 'Vzťah medzi well-beingom a pracovnou spokojnosťou',
      variables: [wemwbs, jss],
      test: 'Spearmanova alebo Pearsonova korelácia',
      reason:
        'Pearson možno použiť pri splnení normality a lineárneho vzťahu, inak Spearman.',
      parametric: false,
    });
  }

  if (pohlavie && (wemwbs || jss)) {
    pushTest({
      hypothesis: 'Rozdiely v skóre podľa pohlavia',
      variables: compactStrings([pohlavie, wemwbs, jss]),
      test: 'Mann-Whitney U test alebo nezávislý t-test',
      reason:
        'Pohlavie má dve skupiny. Pri splnení normality možno použiť t-test, inak Mann-Whitney U test.',
      parametric: false,
    });
  }

  if (typPodniku && (wemwbs || jss)) {
    pushTest({
      hypothesis: 'Rozdiely v skóre podľa typu podniku',
      variables: compactStrings([typPodniku, wemwbs, jss]),
      test: 'Mann-Whitney U test alebo nezávislý t-test',
      reason:
        'Typ podniku má dve skupiny, preto je vhodné porovnať dve nezávislé skupiny.',
      parametric: false,
    });
  }

  if (rodinnyStav && (wemwbs || jss)) {
    pushTest({
      hypothesis: 'Rozdiely v skóre podľa rodinného stavu',
      variables: compactStrings([rodinnyStav, wemwbs, jss]),
      test: 'Kruskal-Wallis test alebo ANOVA',
      reason:
        'Rodinný stav má viac ako dve skupiny, preto je vhodné použiť test pre viac nezávislých skupín.',
      parametric: false,
    });
  }

  const wemItems = names.filter((name) => /^WEM\d+$/i.test(name));
  const jssItems = names.filter((name) => /^JSS\d+$/i.test(name));

  if (wemItems.length >= 3 || jssItems.length >= 3) {
    pushTest({
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
    pushTest({
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

function createExcelTables(params: {
  variables: VariableSummary[];
  descriptiveStatistics: DescriptiveStatistic[];
  frequencyTables: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  correlations: CorrelationResult[];
  tTests: TTestResult[];
}) {
  const {
    variables,
    descriptiveStatistics,
    frequencyTables,
    recommendedCharts,
    recommendedTests,
    correlations,
    tTests,
  } = params;

  const tables: ExcelTable[] = [];

  tables.push({
    title: 'Identifikované premenné',
    name: 'Identifikované premenné',
    sheetName: 'Premenné',
    description: 'Prehľad premenných rozpoznaných v dátovom súbore.',
    headers: [
      'Premenná',
      'Typ',
      'Úroveň merania',
      'N platných',
      'Chýbajúce',
      'Počet odlišných hodnôt',
    ],
    columns: [
      'name',
      'variableType',
      'measurementLevel',
      'valid',
      'missing',
      'distinctValues',
    ],
    rows: variables.map((item) => [
      item.name,
      item.variableType,
      item.measurementLevel,
      item.valid,
      item.missing,
      item.distinctValues,
    ]),
    data: variables,
  });

  tables.push({
    title: 'Deskriptívna štatistika',
    name: 'Deskriptívna štatistika',
    sheetName: 'Deskriptíva',
    description:
      'Prehľad základných deskriptívnych štatistík vrátane M, mediánu, SD, minima, maxima, šikmosti a špicatosti.',
    headers: [
      'Premenná',
      'N',
      'Chýbajúce',
      'M',
      'Medián',
      'SD',
      'Min',
      'Max',
      'Súčet',
      'Šikmosť',
      'Špicatosť',
    ],
    columns: [
      'variable',
      'n',
      'missing',
      'M',
      'Md',
      'SD',
      'min',
      'max',
      'sum',
      'skewness',
      'kurtosis',
    ],
    rows: descriptiveStatistics.map((item) => [
      item.variable,
      item.n,
      item.missing,
      item.M,
      item.Md,
      item.SD,
      item.min,
      item.max,
      item.sum,
      item.skewness,
      item.kurtosis,
    ]),
    data: descriptiveStatistics,
  });

  frequencyTables.forEach((table) => {
    tables.push({
      title: table.title,
      name: table.title,
      sheetName: `Frekvencia ${table.variable}`.slice(0, 31),
      description: table.interpretation,
      headers: [
        'Hodnota',
        'Počet',
        'Percento',
        'Validné percento',
        'Kumulatívne percento',
      ],
      columns: [
        'value',
        'frequency',
        'percent',
        'validPercent',
        'cumulativePercent',
      ],
      rows: table.rows.map((row) => [
        row.value,
        row.frequency,
        row.percent,
        row.validPercent,
        row.cumulativePercent,
      ]),
      data: table.rows as unknown as Record<string, unknown>[],
      interpretation: table.interpretation,
    });
  });

  tables.push({
    title: 'Korelácie',
    name: 'Korelácie',
    sheetName: 'Korelácie',
    description: 'Výsledky Pearsonových a Spearmanových korelácií.',
    headers: [
      'Test',
      'Premenná 1',
      'Premenná 2',
      'Koeficient',
      'N',
      'Sila',
      'Smer',
    ],
    columns: [
      'test',
      'variable1',
      'variable2',
      'coefficient',
      'n',
      'strength',
      'direction',
    ],
    rows: correlations.map((item) => [
      item.test,
      item.variable1,
      item.variable2,
      item.coefficient,
      item.n,
      item.strength,
      item.direction,
    ]),
    data: correlations as unknown as Record<string, unknown>[],
  });

  tables.push({
    title: 'T-testy',
    name: 'T-testy',
    sheetName: 'T-testy',
    description: 'Orientačné výsledky t-testov pre dvojskupinové kategórie.',
    headers: [
      'Závislá premenná',
      'Skupinová premenná',
      'Skupina 1',
      'Skupina 2',
      'M1',
      'M2',
      'SD1',
      'SD2',
      'n1',
      'n2',
      't',
      'df',
    ],
    columns: [
      'dependentVariable',
      'independentVariable',
      'group1',
      'group2',
      'mean1',
      'mean2',
      'sd1',
      'sd2',
      'n1',
      'n2',
      't',
      'df',
    ],
    rows: tTests.map((item) => [
      item.dependentVariable,
      item.independentVariable,
      item.group1,
      item.group2,
      item.mean1,
      item.mean2,
      item.sd1,
      item.sd2,
      item.n1,
      item.n2,
      item.t,
      item.df,
    ]),
    data: tTests as unknown as Record<string, unknown>[],
  });

  tables.push({
    title: 'Odporúčané grafy',
    name: 'Odporúčané grafy',
    sheetName: 'Grafy',
    description: 'Odporúčané grafy pre vizualizáciu výsledkov.',
    headers: ['Názov', 'Typ grafu', 'Premenné', 'Odôvodnenie'],
    columns: ['title', 'type', 'variables', 'reason'],
    rows: recommendedCharts.map((item) => [
      item.title,
      item.type,
      item.variables.join(', '),
      item.reason,
    ]),
    data: recommendedCharts as unknown as Record<string, unknown>[],
  });

  tables.push({
    title: 'Odporúčané testy',
    name: 'Odporúčané testy',
    sheetName: 'Testy',
    description: 'Odporúčané štatistické testy podľa typu premenných.',
    headers: ['Hypotéza', 'Test', 'Premenné', 'Dôvod'],
    columns: ['hypothesis', 'test', 'variables', 'reason'],
    rows: recommendedTests.map((item) => [
      item.hypothesis,
      item.test,
      item.variables.join(', '),
      item.reason,
    ]),
    data: recommendedTests as unknown as Record<string, unknown>[],
  });

  return tables;
}

function createPracticalText(params: {
  variables: VariableSummary[];
  correlations: CorrelationResult[];
  tTests: TTestResult[];
}) {
  const { variables, correlations, tTests } = params;

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
      }, medián je ${vek.median ?? 'neuvedené'} a štandardná odchýlka je ${
        vek.stdDeviation ?? 'neuvedené'
      }.`,
    );
  }

  if (wemwbs) {
    parts.push(
      `Celkové skóre WEMWBS dosiahlo priemer ${
        wemwbs.mean ?? 'neuvedené'
      } a štandardnú odchýlku ${
        wemwbs.stdDeviation ?? 'neuvedené'
      }. Túto premennú je vhodné interpretovať ako hlavný ukazovateľ subjektívneho well-beingu.`,
    );
  }

  if (jss) {
    parts.push(
      `Celkové skóre JSS dosiahlo priemer ${
        jss.mean ?? 'neuvedené'
      } a štandardnú odchýlku ${
        jss.stdDeviation ?? 'neuvedené'
      }. Premennú je vhodné použiť ako hlavný ukazovateľ pracovnej spokojnosti.`,
    );
  }

  if (correlations.length > 0) {
    parts.push(
      `Bolo vytvorených ${correlations.length} orientačných korelačných výpočtov. Pri ich interpretácii je potrebné doplniť štatistickú významnosť p-hodnotou zo štatistického softvéru.`,
    );
  }

  if (tTests.length > 0) {
    parts.push(
      `Bolo vytvorených ${tTests.length} orientačných porovnaní dvoch skupín. Výsledky t-testov je potrebné overiť spolu s predpokladmi normality a homogenity rozptylov.`,
    );
  }

  parts.push(
    'Pri kategorizovaných premenných je potrebné uvádzať najmä frekvencie a validné percentá. Pri dotazníkových položkách je vhodné neuvádzať mechanicky všetky položky v texte, ale zamerať sa na celkové skóre, subškály a tabuľkové prílohy.',
  );

  return parts.join('\n\n');
}

function createSummary(params: {
  files: ExtractedFile[];
  variables: VariableSummary[];
  frequencyTables: FrequencyTable[];
  descriptiveStatistics: DescriptiveStatistic[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  correlations: CorrelationResult[];
  tTests: TTestResult[];
}) {
  const {
    files,
    variables,
    frequencyTables,
    descriptiveStatistics,
    recommendedCharts,
    recommendedTests,
    correlations,
    tTests,
  } = params;

  const fileNames = files.map((file) => file.fileName).join(', ') || 'bez súboru';

  return [
    `Spracované súbory: ${fileNames}.`,
    `Počet identifikovaných premenných: ${variables.length}.`,
    `Počet deskriptívnych výpočtov: ${descriptiveStatistics.length}.`,
    `Počet frekvenčných tabuliek: ${frequencyTables.length}.`,
    `Počet korelačných výpočtov: ${correlations.length}.`,
    `Počet orientačných t-testov: ${tTests.length}.`,
    `Počet odporúčaných grafov: ${recommendedCharts.length}.`,
    `Počet odporúčaných štatistických testov: ${recommendedTests.length}.`,
  ].join('\n');
}

function createFullText(params: {
  variables: VariableSummary[];
  descriptiveStatistics: DescriptiveStatistic[];
  frequencyTables: FrequencyTable[];
  recommendedCharts: RecommendedChart[];
  recommendedTests: RecommendedTest[];
  correlations: CorrelationResult[];
  tTests: TTestResult[];
  practicalText: string;
  warnings: string[];
}) {
  const {
    variables,
    descriptiveStatistics,
    frequencyTables,
    recommendedCharts,
    recommendedTests,
    correlations,
    tTests,
    practicalText,
    warnings,
  } = params;

  const variableText = variables
    .map((variable) => {
      return `${variable.name}: validné=${variable.valid}, chýbajúce=${variable.missing}, typ=${variable.variableType}, úroveň=${variable.measurementLevel}`;
    })
    .join('\n');

  const descriptiveText = descriptiveStatistics
    .map((item) => {
      return `${item.variable}: N=${item.n}, M=${item.M ?? '—'}, Md=${
        item.Md ?? '—'
      }, SD=${item.SD ?? '—'}, Min=${item.min ?? '—'}, Max=${
        item.max ?? '—'
      }, šikmosť=${item.skewness ?? '—'}, špicatosť=${
        item.kurtosis ?? '—'
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

  const correlationText = correlations
    .slice(0, 40)
    .map((item) => {
      return `${item.test}: ${item.variable1} × ${item.variable2}, koeficient=${
        item.coefficient ?? '—'
      }, n=${item.n}, sila=${item.strength}, smer=${item.direction}`;
    })
    .join('\n');

  const tTestText = tTests
    .slice(0, 40)
    .map((item) => {
      return `${item.name}: ${item.group1} M=${item.mean1 ?? '—'} vs. ${
        item.group2
      } M=${item.mean2 ?? '—'}, t=${item.t ?? '—'}, df=${item.df ?? '—'}`;
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

  const warningText = warnings.length
    ? warnings.map((item) => `- ${item}`).join('\n')
    : 'Bez upozornení.';

  return cleanText(`
VÝSLEDKY ANALÝZY

1. Upozornenia
${warningText}

2. Identifikované premenné
${variableText || 'Neboli identifikované tabuľkové premenné.'}

3. Deskriptívna štatistika
${descriptiveText || 'Nebola vytvorená deskriptívna štatistika.'}

4. Frekvenčné tabuľky
${frequencyText || 'Neboli vytvorené frekvenčné tabuľky.'}

5. Korelačná analýza
${correlationText || 'Neboli vytvorené korelačné výpočty.'}

6. Orientačné t-testy
${tTestText || 'Neboli vytvorené orientačné t-testy.'}

7. Odporúčané grafy
${chartText || 'Neboli navrhnuté grafy.'}

8. Odporúčané štatistické testy
${testText || 'Neboli navrhnuté testy.'}

9. Text do praktickej časti
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
    const descriptiveStatistics = createDescriptiveStatistics(variables);
    const frequencyTables = createFrequencyTables(allRows, variables);
    const recommendedCharts = recommendCharts(variables);
    const recommendedTests = recommendTests(variables);

    const correlationGroups = createCorrelationResults(allRows, variables);
    const pearsonCorrelations = correlationGroups.pearsonResults;
    const spearmanCorrelations = correlationGroups.spearmanResults;
    const correlations = correlationGroups.all;

    const tTests = createTTests(allRows, variables);

    const warnings = extractedFiles.flatMap((file) => file.warnings);

    if (!allRows.length) {
      warnings.push(
        'Neboli nájdené tabuľkové dáta. Pre výpočty štatistiky nahraj Excel alebo CSV. Pri PDF/DOCX sa zatiaľ spoľahlivo extrahuje najmä text, nie komplexné tabuľky.',
      );
    }

    if (correlations.length > 0) {
      warnings.push(
        'Korelácie sú vypočítané orientačne bez p-hodnôt. Štatistickú významnosť odporúčame overiť v JASP, SPSS, R alebo inom štatistickom softvéri.',
      );
    }

    if (tTests.length > 0) {
      warnings.push(
        'T-testy sú vypočítané orientačne bez p-hodnôt. Pred interpretáciou treba overiť normalitu, homogenitu rozptylov a štatistickú významnosť.',
      );
    }

    const practicalText = createPracticalText({
      variables,
      correlations,
      tTests,
    });

    const summary = createSummary({
      files: extractedFiles,
      variables,
      frequencyTables,
      descriptiveStatistics,
      recommendedCharts,
      recommendedTests,
      correlations,
      tTests,
    });

    const fullText = createFullText({
      variables,
      descriptiveStatistics,
      frequencyTables,
      recommendedCharts,
      recommendedTests,
      correlations,
      tTests,
      practicalText,
      warnings,
    });

    const excelTables = createExcelTables({
      variables,
      descriptiveStatistics,
      frequencyTables,
      recommendedCharts,
      recommendedTests,
      correlations,
      tTests,
    });

    const hypothesisTests: Array<CorrelationResult | TTestResult> = [
      ...correlations,
      ...tTests,
    ];

    const result: AnalysisResult = {
      ok: true,
      title: 'Výsledky analýzy dát',
      summary,
      files: extractedFiles,
      extractedFiles,
      variables,
      detectedVariables: variables,
      columns: variables,
      descriptiveStatistics,
      descriptive_statistics: descriptiveStatistics,
      frequencyTables,
      frequencies: frequencyTables,
      recommendedCharts,
      recommendedChartsData: recommendedCharts,
      recommendedTests,
      correlations,
      pearsonCorrelations,
      spearmanCorrelations,
      tTests,
      hypothesisTests,
      excelTables,
      tables: excelTables,
      practicalText,
      interpretation: practicalText,
      fullText,
      warnings,
      selectedAnalyses: [
        'frequency',
        'descriptive',
        'correlation',
        'pearson',
        'spearman',
        'ttest',
        'charts',
        'interpretation',
      ],
      dataDescription: recordsToText(allRows).slice(0, 20_000),
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