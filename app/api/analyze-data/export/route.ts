import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { deflateSync } from 'zlib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type ExportFormat = 'excel' | 'xlsx' | 'json' | 'raw' | 'word' | 'doc' | 'pdf' | 'html';

type AnyRecord = Record<string, unknown>;

type ExportTableDefinition = {
  sheetName: string;
  title: string;
  description: string;
  rows: AnyRecord[];
};

type SheetHelperRow = {
  poradie: number;
  list: string;
  cast: string;
  co_obsahuje: string;
  preco_je_dolezity: string;
  ako_sa_pocita: string;
  kedy_moze_chybat: string;
  odporucanie: string;
};

const SCALE_SHEET_HEADERS = [
  'typ',
  'id',
  'nazov',
  'polozky',
  'pouzite_polozky',
  'reverzne_polozky',
  'minimum',
  'maximum',
  'skoring',
  'valid',
  'missing',
  'mean',
  'median',
  'sd',
  'standard_deviation',
  'min',
  'max',
  'minimum_hodnota',
  'maximum_hodnota',
  'pocet_chybajucich_riadkov',
  'cronbach_alpha',
  'interpretacia',
  'zdroj',
  'popis',
  'poznamka',
];

const SCALE_SCORE_SHEET_HEADERS = [
  'respondent',
  'riadok',
  'rowIndex',
  'id',
  'nazov',
  'skala',
  'subskala',
  'score',
  'skore',
  'hodnota',
  'valid_items',
  'missing_items',
  'pouzite_polozky',
  'skoring',
  'zdroj',
  'poznamka',
];

const RELIABILITY_SHEET_HEADERS = [
  'skala',
  'nazov',
  'id',
  'typ',
  'pocet_poloziek',
  'item_count',
  'valid_riadky',
  'validRows',
  'cronbach_alpha',
  'alpha',
  'interpretacia',
  'pouzite_polozky',
  'usedItems',
  'chybajuce_polozky',
  'missingItems',
  'zdroj',
  'poznamka',
  'note',
];

const DESCRIPTIVE_SHEET_HEADERS = [
  'zdroj',
  'typ',
  'premenna',
  'nazov',
  'valid',
  'missing',
  'mean',
  'median',
  'mode',
  'standard_deviation',
  'sd',
  'variance',
  'skewness',
  'kurtosis',
  'minimum',
  'maximum',
  'min',
  'max',
  'sum',
  'q1',
  'q3',
  'iqr',
  'poznamka',
];

const DATA_QUALITY_SHEET_HEADERS = [
  'oblast',
  'kontrola',
  'premenna',
  'stlpec',
  'typ',
  'valid',
  'missing',
  'missing_percent',
  'unique',
  'minimum',
  'maximum',
  'vysledok',
  'stav',
  'odporucanie',
  'poznamka',
];

const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL);

/**
 * Produkčné limity pre Vercel/serverless export.
 *
 * Dôvod:
 * - localhost zvládne generovať veľa PNG grafov aj niekoľko minút,
 * - Vercel API route musí odpovedať výrazne rýchlejšie,
 * - preto ponechávame metodiku, farby, tabuľky, škály, skóre a reliabilitu,
 *   ale obmedzujeme počet obrázkov grafov a úplne vypíname samostatné grafové listy 22–37.
 */
const EXCEL_EXPORT_LIMITS = {
  maxDashboardPieSections: IS_VERCEL_RUNTIME ? 2 : 2,
  maxDashboardBarSections: IS_VERCEL_RUNTIME ? 3 : 4,
  maxChartSections: IS_VERCEL_RUNTIME ? 4 : 6,
  maxPieSections: IS_VERCEL_RUNTIME ? 2 : 3,
  maxStandaloneChartSheets: 0,
  maxPerTableCharts: 0,
  piePngWidth: IS_VERCEL_RUNTIME ? 520 : 640,
  piePngHeight: IS_VERCEL_RUNTIME ? 320 : 380,
  barPngWidth: IS_VERCEL_RUNTIME ? 620 : 760,
  barPngHeight: IS_VERCEL_RUNTIME ? 340 : 420,
  pieDisplayWidth: IS_VERCEL_RUNTIME ? 300 : 340,
  pieDisplayHeight: IS_VERCEL_RUNTIME ? 175 : 200,
  barDisplayWidth: IS_VERCEL_RUNTIME ? 360 : 430,
  barDisplayHeight: IS_VERCEL_RUNTIME ? 195 : 230,
  removeNumberedSheetsFrom: 22,
  removeNumberedSheetsTo: 37,
} as const;

type ExportPayload = {
  [key: string]: unknown;
  result?: unknown;
  analysisResult?: unknown;
  data?: unknown;
  preparedDataFile?: {
    fileName?: string;
    base64?: string;
    mimeType?: string;
    rows?: number | AnyRecord[];
    columns?: number;
    warnings?: string[];
    sheets?: string[];
    qualityReport?: unknown[];
    rawData?: AnyRecord[];
    rawRows?: AnyRecord[];
    cleanRows?: AnyRecord[];
    dataRows?: AnyRecord[];
    preparedRows?: AnyRecord[];
    data?: unknown;
  } | null;
  format?: ExportFormat | string;
  exportFormat?: ExportFormat | string;
  type?: ExportFormat | string;
  fileName?: string;
  userCommand?: unknown;
  userCommands?: unknown;
  userPrompt?: unknown;
  instructions?: unknown;
  manualScalesText?: unknown;
  manualSubscalesText?: unknown;
  customScalesText?: unknown;
  customSubscalesText?: unknown;
  scaleDefinitions?: unknown;
  subscaleDefinitions?: unknown;
  manualScaleDefinitions?: unknown;
  manualSubscaleDefinitions?: unknown;
  groupingColumns?: unknown;
  groupVariables?: unknown;
};

type ApiUsage = {
  endpoint: string;
  method: 'POST';
  body: 'JSON';
  requiredFields: string[];
  optionalFields: string[];
  exportFormats: string[];
};

const EXPORT_ROUTE = '/api/analyze-data/export';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const WORD_MIME_TYPE = 'application/msword; charset=utf-8';
const HTML_MIME_TYPE = 'text/html; charset=utf-8';
const PDF_MIME_TYPE = 'application/pdf';

const usage: ApiUsage = {
  endpoint: EXPORT_ROUTE,
  method: 'POST',
  body: 'JSON',
  requiredFields: ['result alebo analysisResult'],
  optionalFields: ['preparedDataFile', 'format', 'exportFormat', 'type', 'fileName'],
  exportFormats: ['excel', 'xlsx', 'json', 'raw', 'word', 'doc', 'pdf', 'html'],
};

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function safeSheetName(name: string): string {
  const cleaned = String(name || 'Sheet')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  return cleaned || 'Sheet';
}

function safeFileName(name: string): string {
  const cleaned = String(name || 'ZEDPERA_analyza_dat')
    .replace(/\.[^.]+$/g, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  return cleaned || 'ZEDPERA_analyza_dat';
}

function normalizeExportFormat(value: unknown): ExportFormat {
  const normalized = String(value || 'excel')
    .trim()
    .toLowerCase();

  if (normalized === 'xlsx') return 'xlsx';
  if (normalized === 'json') return 'json';
  if (normalized === 'raw') return 'raw';
  if (normalized === 'word') return 'word';
  if (normalized === 'doc') return 'doc';
  if (normalized === 'pdf') return 'pdf';
  if (normalized === 'html') return 'html';

  return 'excel';
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecords(value: unknown): AnyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as AnyRecord);
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as AnyRecord)[key];
  }

  return current;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'object' && item !== null
          ? JSON.stringify(item)
          : String(item),
      )
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeRowsForExcel(rows: AnyRecord[]): AnyRecord[] {
  return rows.map((row) => {
    const normalized: AnyRecord = {};

    Object.entries(row).forEach(([key, value]) => {
      normalized[key] = Array.isArray(value) || typeof value === 'object'
        ? stringifyValue(value)
        : value;
    });

    return normalized;
  });
}

function getAllHeadersFromRows(
  rows: AnyRecord[],
  preferredHeaders: string[] = [],
): string[] {
  const used = new Set<string>();
  const headers: string[] = [];

  function addHeader(header: unknown) {
    const value = String(header ?? '').trim();
    if (!value || used.has(value)) return;
    used.add(value);
    headers.push(value);
  }

  preferredHeaders.forEach(addHeader);
  rows.forEach((row) => Object.keys(row || {}).forEach(addHeader));

  return headers;
}

function getPreferredHeadersForSheet(sheetName: string): string[] {
  const normalized = normalizeReliabilityItemName(sheetName);

  if (normalized.includes('skaly') || normalized.includes('podskaly') || normalized.includes('scales')) {
    return SCALE_SHEET_HEADERS;
  }

  if (normalized.includes('scoreskal') || normalized.includes('score') || normalized.includes('skore')) {
    return SCALE_SCORE_SHEET_HEADERS;
  }

  if (normalized.includes('reliability') || normalized.includes('reliabilita')) {
    return RELIABILITY_SHEET_HEADERS;
  }

  if (normalized.includes('descriptives') || normalized.includes('deskript')) {
    return DESCRIPTIVE_SHEET_HEADERS;
  }

  if (normalized.includes('dataquality') || normalized.includes('kvalita')) {
    return DATA_QUALITY_SHEET_HEADERS;
  }

  return [];
}

function normalizeRowsToHeaders(rows: AnyRecord[], headers: string[]): AnyRecord[] {
  return rows.map((row) => {
    const normalized: AnyRecord = {};
    headers.forEach((header) => {
      normalized[header] = Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
    return normalized;
  });
}

function addJsonSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: AnyRecord[],
) {
  const finalRows =
    rows.length > 0
      ? normalizeRowsForExcel(rows)
      : [
          {
            stav: 'bez údajov',
            poznamka:
              'Pre tento hárok neboli v aktuálnom výsledku dostupné žiadne dáta.',
          },
        ];

  const headers = getAllHeadersFromRows(
    finalRows,
    getPreferredHeadersForSheet(sheetName),
  );
  const normalizedFinalRows = normalizeRowsToHeaders(finalRows, headers);
  const worksheet = XLSX.utils.json_to_sheet(normalizedFinalRows, {
    header: headers,
  });

  worksheet['!cols'] = headers.map((header) => ({
    wch: Math.min(Math.max(header.length + 8, 16), 45),
  }));

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(sheetName),
  );
}

function addAoaSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: unknown[][],
) {
  const finalRows =
    rows.length > 0
      ? rows
      : [['stav', 'poznamka'], ['bez údajov', 'Pre tento hárok nie sú dostupné dáta.']];

  const worksheet = XLSX.utils.aoa_to_sheet(finalRows);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(sheetName),
  );
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}


type PreparedFileLike = {
  fileName?: string;
  base64?: string;
  mimeType?: string;
  rows?: number | AnyRecord[];
  columns?: number;
  warnings?: string[];
  sheets?: string[];
  qualityReport?: unknown[];
  rawData?: AnyRecord[];
  rawRows?: AnyRecord[];
  cleanRows?: AnyRecord[];
  dataRows?: AnyRecord[];
  preparedRows?: AnyRecord[];
  data?: unknown;
};

function isFileLikeFormValue(value: unknown): value is Blob & { name?: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Blob).arrayBuffer === 'function' &&
      typeof (value as Blob).size === 'number',
  );
}

async function formFileToPreparedDataFile(
  value: Blob & { name?: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> },
): Promise<PreparedFileLike> {
  const arrayBuffer = await value.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    fileName: value.name || 'uploaded-data-file',
    mimeType: value.type || 'application/octet-stream',
    base64: buffer.toString('base64'),
  };
}

async function getFirstUploadedPreparedFile(formData: FormData): Promise<PreparedFileLike | null> {
  const preferredKeys = ['file', 'upload', 'attachment', 'dataFile', 'preparedFile', 'preparedDataFile'];

  for (const key of preferredKeys) {
    const value = formData.get(key);
    if (isFileLikeFormValue(value)) {
      return formFileToPreparedDataFile(value);
    }
  }

  let discoveredFile: Blob & { name?: string; type?: string; arrayBuffer: () => Promise<ArrayBuffer> } | null = null;

  formData.forEach((value) => {
    if (!discoveredFile && isFileLikeFormValue(value)) {
      discoveredFile = value;
    }
  });

  return discoveredFile ? formFileToPreparedDataFile(discoveredFile) : null;
}

function getFileExtension(fileName?: string): string {
  const match = String(fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function decodePreparedFileText(buffer: Buffer): string {
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function detectDelimiter(text: string, explicitDelimiter?: string): string {
  if (explicitDelimiter) return explicitDelimiter;

  const sampleLines = text.split(/\r\n|\n|\r/).slice(0, 20).filter((line) => line.trim() !== '');
  const candidates = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let bestScore = -1;

  candidates.forEach((delimiter) => {
    const counts = sampleLines.map((line) => splitDelimitedLine(line, delimiter).length);
    const avg = counts.reduce((sum, value) => sum + value, 0) / Math.max(counts.length, 1);
    const stable = counts.filter((count) => count === counts[0]).length;
    const score = avg + stable * 0.25;

    if (avg >= 2 && score > bestScore) {
      bestDelimiter = delimiter;
      bestScore = score;
    }
  });

  return bestDelimiter;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function dedupeHeaders(headers: string[]): string[] {
  const used = new Map<string, number>();

  return headers.map((header, index) => {
    const base = String(header || `Premenná ${index + 1}`).trim() || `Premenná ${index + 1}`;
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function parseDelimitedTextRows(text: string, explicitDelimiter?: string): AnyRecord[] {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim() !== '');

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(text, explicitDelimiter);
  const headers = dedupeHeaders(splitDelimitedLine(lines[0], delimiter));

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row: AnyRecord = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

function extractRowsFromJsonLike(value: unknown): AnyRecord[] {
  const rows = extractRowsFromUnknown(value);
  if (rows.length > 0) return rows;

  if (isRecord(value)) {
    const objectRows = Object.entries(value).map(([key, child]) => {
      if (isRecord(child)) {
        return { id: key, ...child };
      }
      return { id: key, value: child };
    });

    return objectRows.length > 0 ? objectRows : [];
  }

  return [];
}

function getRowsFromPreparedTextFile(
  preparedDataFile: ExportPayload['preparedDataFile'],
  buffer: Buffer,
): AnyRecord[] {
  const fileName = preparedDataFile?.fileName || '';
  const mimeType = String(preparedDataFile?.mimeType || '').toLowerCase();
  const extension = getFileExtension(fileName);
  const text = decodePreparedFileText(buffer);
  const looksTextual =
    ['csv', 'tsv', 'txt', 'json'].includes(extension) ||
    mimeType.includes('csv') ||
    mimeType.includes('json') ||
    mimeType.includes('text') ||
    mimeType.includes('tab-separated');

  if (!looksTextual || !text.trim()) return [];

  if (extension === 'json' || mimeType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return extractRowsFromJsonLike(JSON.parse(text));
    } catch {
      // Pokračujeme cez delimited fallback, ak JSON parsing zlyhá.
    }
  }

  if (extension === 'tsv' || mimeType.includes('tab-separated')) {
    return parseDelimitedTextRows(text, '\t');
  }

  return parseDelimitedTextRows(text);
}


function extractFormDataPayloadExtras(formData: FormData): AnyRecord {
  const extras: AnyRecord = {};

  formData.forEach((value, key) => {
    if (
      key === 'result' ||
      key === 'analysisResult' ||
      key === 'data' ||
      key === 'preparedDataFile' ||
      key === 'format' ||
      key === 'exportFormat' ||
      key === 'type' ||
      key === 'fileName'
    ) {
      return;
    }

    if (typeof value === 'string') {
      extras[key] = tryParseJson(value);
    }
  });

  return extras;
}

function mergeDefinedObjects(...objects: Array<unknown>): AnyRecord {
  const merged: AnyRecord = {};

  objects.forEach((object) => {
    if (!isRecord(object)) return;

    Object.entries(object).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        merged[key] = value;
      }
    });
  });

  return merged;
}

const USER_INPUT_EXPORT_KEYS = [
  'userCommand',
  'userCommands',
  'userPrompt',
  'instructions',
  'manualScalesText',
  'manualSubscalesText',
  'customScalesText',
  'customSubscalesText',
  'scaleInput',
  'subscaleInput',
  'scaleDefinitions',
  'subscaleDefinitions',
  'manualScaleDefinitions',
  'manualSubscaleDefinitions',
  'customScaleDefinitions',
  'customSubscaleDefinitions',
  'questionnaireName',
  'questionnaire',
  'standardizedQuestionnaires',
  'groupingColumns',
  'groupColumns',
  'groupVariables',
  'groupingVariables',
  'groupingColumnsText',
] as const;

function getPayloadUserInputs(payload: ExportPayload): AnyRecord {
  const inputs: AnyRecord = {};

  USER_INPUT_EXPORT_KEYS.forEach((key) => {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== '') {
      inputs[key] = value;
    }
  });

  return inputs;
}

function hydrateAnalysisResultWithPayloadInputs(
  result: unknown,
  payload: ExportPayload,
): unknown {
  const userInputs = getPayloadUserInputs(payload);

  if (Object.keys(userInputs).length === 0) {
    return result;
  }

  if (!isRecord(result)) {
    return {
      value: result,
      analysisConfig: userInputs,
      manualAnalysisConfig: userInputs,
      questionnaireConfig: userInputs,
    };
  }

  return {
    ...result,
    ...Object.fromEntries(
      Object.entries(userInputs).filter(([key]) => (result as AnyRecord)[key] === undefined),
    ),
    analysisConfig: mergeDefinedObjects(
      getNestedValue(result, ['analysisConfig']),
      userInputs,
    ),
    manualAnalysisConfig: mergeDefinedObjects(
      getNestedValue(result, ['manualAnalysisConfig']),
      userInputs,
    ),
    questionnaireConfig: mergeDefinedObjects(
      getNestedValue(result, ['questionnaireConfig']),
      userInputs,
    ),
  };
}

async function readPayload(request: NextRequest): Promise<ExportPayload> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.toLowerCase().includes('application/json')) {
    const json = await request.json();

    return isRecord(json) ? (json as ExportPayload) : {};
  }

  if (contentType.toLowerCase().includes('multipart/form-data')) {
    const formData = await request.formData();

    const result =
      tryParseJson(formData.get('result')) ||
      tryParseJson(formData.get('analysisResult')) ||
      tryParseJson(formData.get('data'));

    const preparedDataFile = tryParseJson(formData.get('preparedDataFile'));
    const uploadedPreparedFile = isRecord(preparedDataFile)
      ? null
      : await getFirstUploadedPreparedFile(formData);

    return {
      result,
      analysisResult: result,
      data: result,
      preparedDataFile: isRecord(preparedDataFile)
        ? (preparedDataFile as ExportPayload['preparedDataFile'])
        : (uploadedPreparedFile as ExportPayload['preparedDataFile']),
      format: String(formData.get('format') || ''),
      exportFormat: String(formData.get('exportFormat') || ''),
      type: String(formData.get('type') || ''),
      fileName: String(formData.get('fileName') || uploadedPreparedFile?.fileName || ''),
      ...extractFormDataPayloadExtras(formData),
    };
  }

  return {};
}

function getAnalysisResult(payload: ExportPayload): unknown {
  return payload.result || payload.analysisResult || payload.data || null;
}

function getPreparedDataFile(
  payload: ExportPayload,
  result?: unknown,
): ExportPayload['preparedDataFile'] {
  const direct = payload.preparedDataFile;

  if (isRecord(direct)) {
    return direct as ExportPayload['preparedDataFile'];
  }

  const nestedCandidates = [
    getNestedValue(result, ['preparedDataFile']),
    getNestedValue(result, ['preparedFile']),
    getNestedValue(result, ['dataFile']),
    getNestedValue(result, ['statisticalAnalysis', 'preparedDataFile']),
    getNestedValue(result, ['statisticalAnalysis', 'preparedFile']),
  ];

  for (const candidate of nestedCandidates) {
    if (isRecord(candidate)) {
      return candidate as ExportPayload['preparedDataFile'];
    }
  }

  return null;
}

function isPlaceholderOnlyRows(rows: AnyRecord[]): boolean {
  if (!rows.length) return true;

  const meaningfulRows = rows.filter((row) =>
    Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== ''),
  );

  if (!meaningfulRows.length) return true;

  if (meaningfulRows.length === 1) {
    const text = Object.values(meaningfulRows[0]).map((value) => String(value ?? '')).join(' ').toLowerCase();
    return text.includes('žiadne') || text.includes('ziadne') || text.includes('bez údajov') || text.includes('bez udajov') || text.includes('no data');
  }

  return false;
}

function normalizeSheetLookupName(value: string): string {
  return stripDiacritics(String(value || ''))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function sheetNameMatchesCandidate(sheetName: string, candidate: string): boolean {
  const sheet = normalizeSheetLookupName(sheetName);
  const wanted = normalizeSheetLookupName(candidate);

  if (!sheet || !wanted) return false;
  return sheet === wanted || sheet.includes(wanted) || wanted.includes(sheet);
}

function getRowsFromWorksheet(workbook: XLSX.WorkBook, sheetName: string): AnyRecord[] {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) return [];

  return XLSX.utils.sheet_to_json<AnyRecord>(worksheet, {
    defval: '',
  });
}

function getRowsFromPreparedBase64Sheets(
  preparedDataFile: ExportPayload['preparedDataFile'],
  preferredSheetNames: string[],
): AnyRecord[] {
  if (!preparedDataFile?.base64) {
    return [];
  }

  try {
    const buffer = Buffer.from(preparedDataFile.base64, 'base64');
    const textRows = getRowsFromPreparedTextFile(preparedDataFile, buffer);

    if (!isPlaceholderOnlyRows(textRows)) {
      return textRows;
    }

    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });

    const exactOrAliasSheets = workbook.SheetNames.filter((sheetName) =>
      preferredSheetNames.some((candidate) => sheetNameMatchesCandidate(sheetName, candidate)),
    );

    const fallbackDataSheets = workbook.SheetNames.filter((sheetName) => {
      const normalized = normalizeSheetLookupName(sheetName);
      return (
        normalized.includes('rawdata') ||
        normalized.includes('dataraw') ||
        normalized.includes('dataclean') ||
        normalized.includes('cleandata') ||
        normalized === 'data' ||
        normalized === 'sheet1'
      );
    });

    const candidateSheetNames = Array.from(new Set([...exactOrAliasSheets, ...fallbackDataSheets]));

    for (const sheetName of candidateSheetNames) {
      const rows = getRowsFromWorksheet(workbook, sheetName);
      if (!isPlaceholderOnlyRows(rows)) {
        return rows;
      }
    }

    // Posledná záchrana: použijeme prvý hárok, ktorý vyzerá ako dátová tabuľka, nie úvod/navigácia.
    for (const sheetName of workbook.SheetNames) {
      const normalized = normalizeSheetLookupName(sheetName);
      if (normalized.includes('uvod') || normalized.includes('summary') || normalized.includes('suhrn') || normalized.includes('navigation')) {
        continue;
      }

      const rows = getRowsFromWorksheet(workbook, sheetName);
      const headerCount = rows.length > 0 ? Object.keys(rows[0] || {}).length : 0;
      if (headerCount >= 2 && rows.length >= 2 && !isPlaceholderOnlyRows(rows)) {
        return rows;
      }
    }
  } catch {
    return [];
  }

  return [];
}

function getResultRowsFromPreparedBase64(
  preparedDataFile: ExportPayload['preparedDataFile'],
  sheetName: string,
): AnyRecord[] {
  return getRowsFromPreparedBase64Sheets(preparedDataFile, [sheetName]);
}

function extractRowsFromUnknown(value: unknown): AnyRecord[] {
  const directRows = asRecords(value);
  if (directRows.length > 0) return directRows;

  if (!isRecord(value)) return [];

  const nestedKeys = ['rows', 'data', 'rawData', 'rawRows', 'cleanRows', 'dataRows', 'preparedRows', 'records', 'items', 'values'];

  for (const key of nestedKeys) {
    const nestedRows = asRecords((value as AnyRecord)[key]);
    if (nestedRows.length > 0) return nestedRows;
  }

  return [];
}

function flattenOverview(result: unknown, preparedDataFile: ExportPayload['preparedDataFile']): AnyRecord[] {
  const meta = isRecord(getNestedValue(result, ['meta']))
    ? (getNestedValue(result, ['meta']) as AnyRecord)
    : {};

  return [
    {
      oblast: 'Názov reportu',
      hodnota: 'ZEDPERA – profesionálny export výsledkov analýzy dát',
    },
    {
      oblast: 'Vygenerované',
      hodnota: new Date().toISOString(),
    },
    {
      oblast: 'Súbor',
      hodnota: preparedDataFile?.fileName || meta.preparedFileName || '',
    },
    {
      oblast: 'Respondenti',
      hodnota: meta.respondentCount ?? meta.rows ?? preparedDataFile?.rows ?? '',
    },
    {
      oblast: 'Premenné',
      hodnota: meta.columns ?? preparedDataFile?.columns ?? '',
    },
    {
      oblast: 'Zdroj',
      hodnota: meta.source || '',
    },
    {
      oblast: 'Hárok použitý na výpočty',
      hodnota: meta.sheetName || 'DATA_CLEAN',
    },
  ];
}

function flattenRawData(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const directCandidates = [
    result,
    getNestedValue(result, ['rawData']),
    getNestedValue(result, ['rawRows']),
    getNestedValue(result, ['dataRows']),
    getNestedValue(result, ['preparedRows']),
    getNestedValue(result, ['cleanRows']),
    getNestedValue(result, ['rows']),
    getNestedValue(result, ['records']),
    getNestedValue(result, ['dataset', 'rows']),
    getNestedValue(result, ['table', 'rows']),
    getNestedValue(result, ['preparedDataFile', 'rawData']),
    getNestedValue(result, ['preparedDataFile', 'rawRows']),
    getNestedValue(result, ['preparedDataFile', 'cleanRows']),
    getNestedValue(result, ['preparedDataFile', 'dataRows']),
    getNestedValue(result, ['preparedDataFile', 'preparedRows']),
    getNestedValue(result, ['preparedDataFile', 'rows']),
    getNestedValue(result, ['preparedFile', 'rawData']),
    getNestedValue(result, ['preparedFile', 'rawRows']),
    getNestedValue(result, ['preparedFile', 'cleanRows']),
    getNestedValue(result, ['preparedFile', 'dataRows']),
    getNestedValue(result, ['preparedFile', 'preparedRows']),
    getNestedValue(result, ['preparedFile', 'rows']),
    getNestedValue(result, ['statisticalAnalysis', 'rawData']),
    getNestedValue(result, ['statisticalAnalysis', 'rawRows']),
    getNestedValue(result, ['statisticalAnalysis', 'dataRows']),
    getNestedValue(result, ['statisticalAnalysis', 'preparedRows']),
    getNestedValue(result, ['statisticalAnalysis', 'scaleScoreRows']),
    preparedDataFile?.rawData,
    preparedDataFile?.rawRows,
    preparedDataFile?.cleanRows,
    preparedDataFile?.dataRows,
    preparedDataFile?.preparedRows,
    preparedDataFile?.rows,
    preparedDataFile?.data,
  ];

  for (const candidate of directCandidates) {
    const rows = extractRowsFromUnknown(candidate);

    if (!isPlaceholderOnlyRows(rows)) {
      return rows;
    }
  }

  const fromPreparedRaw = getRowsFromPreparedBase64Sheets(preparedDataFile, [
    'DATA_RAW',
    '02 raw-data',
    'raw-data',
    'Raw dáta',
    'Raw data',
  ]);

  if (!isPlaceholderOnlyRows(fromPreparedRaw)) {
    return fromPreparedRaw;
  }

  const fromPreparedClean = getRowsFromPreparedBase64Sheets(preparedDataFile, [
    'DATA_CLEAN',
    'clean-data',
    'Data clean',
    'Dáta',
    'Data',
  ]);

  if (!isPlaceholderOnlyRows(fromPreparedClean)) {
    return fromPreparedClean;
  }

  return [];
}

function inferColumnKind(values: unknown[]): string {
  const nonEmpty = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!nonEmpty.length) return 'prázdny stĺpec';

  const numericCount = nonEmpty.filter((value) => toFiniteNumber(value) !== null).length;
  if (numericCount / nonEmpty.length >= 0.85) return 'číselná premenná';

  const dateCount = nonEmpty.filter((value) => value instanceof Date || !Number.isNaN(Date.parse(String(value)))).length;
  if (dateCount / nonEmpty.length >= 0.85) return 'dátumová premenná';

  return 'kategorizovaná/textová premenná';
}

function buildComputedDataQualityRows(rawRows: AnyRecord[]): AnyRecord[] {
  if (!rawRows.length) {
    return [
      {
        kontrola: 'Raw dáta',
        vysledok: 'error',
        stav: 'chýbajú',
        poznamka: 'Export nedostal raw dáta ani pripravený DATA_RAW/DATA_CLEAN súbor. Skontrolujte, či frontend posiela preparedDataFile.base64 alebo rawData/dataRows.',
      },
    ];
  }

  const headers = Object.keys(rawRows[0] || {});
  const totalCells = rawRows.length * Math.max(headers.length, 1);
  const missingCells = rawRows.reduce((sum, row) =>
    sum + headers.filter((header) => row[header] === null || row[header] === undefined || String(row[header]).trim() === '').length,
  0);

  const summaryRows: AnyRecord[] = [
    {
      kontrola: 'Počet riadkov',
      vysledok: 'ok',
      stav: rawRows.length,
      poznamka: 'Počet respondentov/záznamov načítaných do exportu.',
    },
    {
      kontrola: 'Počet stĺpcov',
      vysledok: 'ok',
      stav: headers.length,
      poznamka: 'Počet premenných načítaných do exportu.',
    },
    {
      kontrola: 'Chýbajúce bunky spolu',
      vysledok: missingCells > 0 ? 'warning' : 'ok',
      stav: missingCells,
      percento: totalCells > 0 ? Number(((missingCells / totalCells) * 100).toFixed(2)) : 0,
      poznamka: 'Súčet prázdnych buniek v raw dátach.',
    },
  ];

  const columnRows = headers.slice(0, 250).map((header) => {
    const values = rawRows.map((row) => row[header]);
    const nonEmptyValues = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
    const missing = values.length - nonEmptyValues.length;
    const numericCount = nonEmptyValues.filter((value) => toFiniteNumber(value) !== null).length;
    const uniqueCount = new Set(nonEmptyValues.map((value) => String(value).trim())).size;

    return {
      kontrola: 'Profil stĺpca',
      stlpec: header,
      typ: inferColumnKind(values),
      valid: nonEmptyValues.length,
      missing,
      missing_percent: values.length > 0 ? Number(((missing / values.length) * 100).toFixed(2)) : 0,
      numeric_count: numericCount,
      unique_count: uniqueCount,
      vysledok: missing > 0 ? 'warning' : 'ok',
      stav: missing > 0 ? 'obsahuje chýbajúce hodnoty' : 'OK',
      poznamka: missing > 0 ? 'Skontrolujte prázdne hodnoty pred interpretáciou výsledkov.' : 'Bez zistených chýbajúcich hodnôt.',
    };
  });

  return [...summaryRows, ...columnRows];
}

function flattenDataQuality(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const qualityFromPreparedFile = asRecords(preparedDataFile?.qualityReport);

  const qualityFromResultPrepared = [
    ...asRecords(getNestedValue(result, ['preparedFile', 'qualityReport'])),
    ...asRecords(getNestedValue(result, ['preparedDataFile', 'qualityReport'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'qualityReport'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'dataQuality'])),
  ];

  const qualityFromRoot = [
    ...asRecords(getNestedValue(result, ['qualityReport'])),
    ...asRecords(getNestedValue(result, ['dataQuality'])),
  ];

  const warningsFromPrepared = Array.isArray(preparedDataFile?.warnings)
    ? preparedDataFile.warnings
    : [];

  const warningsFromResult = [
    ...(Array.isArray(getNestedValue(result, ['warnings'])) ? (getNestedValue(result, ['warnings']) as unknown[]) : []),
    ...(Array.isArray(getNestedValue(result, ['statisticalAnalysis', 'warnings'])) ? (getNestedValue(result, ['statisticalAnalysis', 'warnings']) as unknown[]) : []),
  ];

  const warningRows = [...warningsFromPrepared, ...warningsFromResult].map(
    (warning) => ({
      kontrola: 'Upozornenie',
      vysledok: 'warning',
      stav: 'warning',
      poznamka: String(warning),
    }),
  );

  const availableRows = [
    ...qualityFromPreparedFile,
    ...qualityFromResultPrepared,
    ...qualityFromRoot,
    ...warningRows,
  ];

  if (availableRows.length > 0) {
    return availableRows;
  }

  return buildComputedDataQualityRows(flattenRawData(result, preparedDataFile));
}

function flattenFrequencies(result: unknown): AnyRecord[] {
  const rows: AnyRecord[] = [];

  asRecords(getNestedValue(result, ['frequencies'])).forEach((frequency) => {
    const variable = String(frequency['variable'] || frequency['name'] || '');
    const values = asRecords(frequency['values'] || frequency['items']);

    values.forEach((item) => {
      rows.push({
        premenna: variable,
        hodnota: item.value ?? item.label ?? '',
        pocet: item.count ?? '',
        percento: item.percent ?? '',
        validne_percento: item.validPercent ?? '',
        kumulativne_percento: item.cumulativePercent ?? '',
      });
    });
  });

  return rows;
}

function flattenDescriptiveRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const candidates = [
    ...asRecords(getNestedValue(result, ['descriptiveStatistics'])),
    ...asRecords(getNestedValue(result, ['descriptives'])),
    ...asRecords(getNestedValue(result, ['itemDescriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'descriptiveStatistics'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'descriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'itemDescriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'scaleDescriptives'])),
    ...asRecords(getNestedValue(result, ['scaleDescriptives'])),
  ];

  const directRows = candidates.map((item) => ({
    zdroj: item.source ?? item.zdroj ?? 'analysis-result',
    typ: item.type ?? item.typ ?? '',
    premenna: item.variable ?? item.name ?? item.nazov ?? item.scaleName ?? item.scale ?? '',
    valid: item.valid ?? item.n ?? '',
    missing: item.missing ?? '',
    mean: item.mean ?? item.priemer ?? '',
    median: item.median ?? '',
    mode: item.mode ?? '',
    standard_deviation: item.standardDeviation ?? item.sd ?? item.standard_deviation ?? '',
    variance: item.variance ?? '',
    skewness: item.skewness ?? '',
    kurtosis: item.kurtosis ?? '',
    minimum: item.minimum ?? item.min ?? '',
    maximum: item.maximum ?? item.max ?? '',
    sum: item.sum ?? '',
    q1: item.q1 ?? '',
    q3: item.q3 ?? '',
    iqr: item.iqr ?? '',
    poznamka: item.note ?? item.poznamka ?? '',
  }));

  const computedRows = buildComputedScaleRowsFromRawData(
    result,
    preparedDataFile,
  ).descriptiveRows;

  const scaleSeriesRows = buildDescriptiveRowsFromScoreSeries(
    buildDependentScoreSeries(result, preparedDataFile),
  );

  const scaleOnlyDirectRows = filterRowsByScaleOrSubscaleNames(
    directRows,
    result,
    preparedDataFile,
    ['premenna', 'nazov', 'skala', 'scaleName', 'name'],
  );

  const finalRows = [
    ...scaleSeriesRows,
    ...computedRows,
    ...scaleOnlyDirectRows,
  ];

  const deduplicated = deduplicateRowsByKey(
    finalRows,
    (row) => `${normalizeReliabilityItemName(row.premenna)}|${normalizeReliabilityItemName(row.typ)}|${normalizeReliabilityItemName(row.zdroj)}`,
  );

  return deduplicated.length > 0 ? deduplicated : buildMissingScaleRowsMessage('Deskriptívna štatistika');
}

function flattenScaleRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const scaleDefinitions = asRecords(
    getNestedValue(result, ['scaleDefinitions']),
  );

  const combinedScaleDefinitions = asRecords(
    getNestedValue(result, ['combinedScaleDefinitions']),
  );

  const scaleScores = asRecords(getNestedValue(result, ['scaleScores']));
  const scaleDescriptives = asRecords(
    getNestedValue(result, ['scaleDescriptives']),
  );

  const statisticalScaleDefinitions = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'scaleDefinitions']),
  );

  const statisticalCombinedScaleDefinitions = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'combinedScaleDefinitions']),
  );

  const statisticalScaleScores = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'scaleScores']),
  );

  const statisticalScaleDescriptives = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'scaleDescriptives']),
  );

  const allScaleDefinitions = deduplicateRowsByKey(
    [
      ...scaleDefinitions,
      ...statisticalScaleDefinitions,
      ...getReliabilityDefinitions(result, preparedDataFile),
    ],
    (item) => `${normalizeReliabilityItemName(item.id)}|${normalizeReliabilityItemName(item.name ?? item.scaleName ?? item.label ?? item.title)}|${parseReliabilityItems(getItemsValueFromDefinition(item)).map(normalizeReliabilityItemName).join('|')}`,
  );

  const allCombinedScaleDefinitions = [
    ...combinedScaleDefinitions,
    ...statisticalCombinedScaleDefinitions,
  ];

  const allScaleScores = [
    ...scaleScores,
    ...statisticalScaleScores,
  ];

  const allScaleDescriptives = [
    ...scaleDescriptives,
    ...statisticalScaleDescriptives,
  ];

  const definitionRows = allScaleDefinitions.map((item, index) => {
    const items = parseReliabilityItems(getItemsValueFromDefinition(item));
    const reverseItems = parseReliabilityItems(
      item.reverseItems ??
        item.reverseItemsText ??
        item.reverseColumns ??
        item.reverzne_polozky,
    );
    const source = String(item.source ?? item.type ?? item.typ ?? 'scale-definition');

    return {
      typ: source.toLowerCase().includes('subscale') || source.toLowerCase().includes('subškála')
        ? 'subškála'
        : 'škála',
      id: item.id ?? `scale-definition-${index + 1}`,
      nazov: item.name ?? item.scaleName ?? item.label ?? item.title ?? item.id ?? `Škála ${index + 1}`,
      polozky: items.join(', '),
      reverzne_polozky: reverseItems.join(', '),
      minimum: item.minValue ?? item.min ?? '',
      maximum: item.maxValue ?? item.max ?? '',
      skoring: item.scoring ?? item.scoreType ?? 'mean',
      zdroj: source,
      popis: item.description ?? item.popis ?? '',
    };
  });

  const combinedRows = allCombinedScaleDefinitions.map((item) => ({
    typ: 'kombinovaná škála / subškála',
    id: item.id ?? '',
    nazov: item.name ?? item.scaleName ?? item.label ?? '',
    polozky: Array.isArray(item.scaleIds) ? item.scaleIds.join(', ') : stringifyValue(item.scaleIds ?? item.items ?? ''),
    reverzne_polozky: '',
    minimum: '',
    maximum: '',
    skoring: item.scoring ?? item.scoreType ?? '',
    zdroj: item.source ?? 'combinedScaleDefinitions',
    popis: item.description ?? '',
  }));

  const scoreRows = allScaleScores.map((item) => ({
    typ: 'vypočítané skóre',
    id: item.scaleId ?? item.id ?? '',
    nazov: item.scaleName ?? item.name ?? item.variable ?? '',
    polozky: Array.isArray(item.itemsUsed) ? item.itemsUsed.join(', ') : stringifyValue(item.itemsUsed ?? item.items ?? ''),
    reverzne_polozky: '',
    minimum: '',
    maximum: '',
    skoring: item.scoring ?? item.scoreType ?? '',
    valid: item.valid ?? item.n ?? '',
    missing: item.missing ?? '',
    mean: item.mean ?? '',
    median: item.median ?? '',
    sd: item.standardDeviation ?? item.sd ?? '',
    min: item.minimum ?? item.min ?? '',
    max: item.maximum ?? item.max ?? '',
    pocet_chybajucich_riadkov: item.missingRows ?? '',
    zdroj: item.source ?? 'scaleScores',
    popis: item.note ?? '',
  }));

  const descriptiveRows = allScaleDescriptives.map((item) => ({
    typ: 'deskriptívna štatistika škály',
    id: item.scaleId ?? '',
    nazov: item.variable ?? item.name ?? item.scaleName ?? '',
    valid: item.valid ?? item.n ?? '',
    missing: item.missing ?? '',
    mean: item.mean ?? '',
    median: item.median ?? '',
    sd: item.standardDeviation ?? item.sd ?? '',
    min: item.minimum ?? item.min ?? '',
    max: item.maximum ?? item.max ?? '',
    zdroj: item.source ?? 'scaleDescriptives',
    popis: item.note ?? '',
  }));

  const computedRows = buildComputedScaleRowsFromRawData(
    result,
    preparedDataFile,
  ).scaleRows;
  const precomputedRows = buildPrecomputedScaleRowsFromRawData(result, preparedDataFile);

  return deduplicateRowsByKey(
    [
      ...definitionRows,
      ...combinedRows,
      ...scoreRows,
      ...descriptiveRows,
      ...computedRows,
      ...precomputedRows,
    ],
    (row) => {
      const record = row as AnyRecord;
      return `${normalizeReliabilityItemName(record.typ)}|${normalizeReliabilityItemName(record.id)}|${normalizeReliabilityItemName(record.nazov)}|${normalizeReliabilityItemName(record.polozky)}|${normalizeReliabilityItemName(record.zdroj)}`;
    },
  );
}

function sampleSkewness(values: number[]): number | null {
  if (values.length < 3) return null;

  const avg = mean(values);
  const sd = standardDeviation(values);

  if (sd <= 0) return null;

  const n = values.length;
  const thirdMoment = values.reduce((sum, value) => sum + ((value - avg) / sd) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * thirdMoment;
}

function sampleExcessKurtosis(values: number[]): number | null {
  if (values.length < 4) return null;

  const avg = mean(values);
  const sd = standardDeviation(values);

  if (sd <= 0) return null;

  const n = values.length;
  const fourthMoment = values.reduce((sum, value) => sum + ((value - avg) / sd) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * fourthMoment -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

function isSeriesApproximatelyNormal(values: number[]): boolean {
  const cleanValues = values.filter((value) => Number.isFinite(value));

  if (cleanValues.length < 8) return false;

  const skewness = sampleSkewness(cleanValues);
  const kurtosis = sampleExcessKurtosis(cleanValues);

  if (skewness === null || kurtosis === null) return false;

  return Math.abs(skewness) <= 1 && Math.abs(kurtosis) <= 2;
}

function buildNormalityRowsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const series = buildDependentScoreSeries(result, preparedDataFile);

  return series.map((item) => {
    const values = item.values.filter((value): value is number => value !== null && Number.isFinite(value));
    const skewness = sampleSkewness(values);
    const kurtosis = sampleExcessKurtosis(values);
    const normal = isSeriesApproximatelyNormal(values);

    return {
      premenna: item.name,
      valid: values.length,
      metoda: 'orientačná kontrola skewness/kurtosis',
      statistika: skewness === null ? '' : `skew=${Number(skewness.toFixed(4))}; kurt=${kurtosis === null ? '' : Number(kurtosis.toFixed(4))}`,
      p_hodnota: '',
      normalita: normal ? 'áno' : 'nie',
      odporucanie: normal ? 'Odporúčané parametrické testy / Pearson.' : 'Odporúčané neparametrické testy / Spearman.',
      poznamka: 'Dopočítané zo skóre škál/subškál podľa zadaných alebo rozpoznaných položiek.',
    };
  });
}

function flattenNormalityRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['normality'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'normality'])),
  ];

  const directRows: AnyRecord[] = rows.map((item) => ({
    premenna: item.variable ?? item.premenna ?? item.name ?? '',
    valid: item.valid ?? item.n ?? '',
    metoda: item.method ?? item.metoda ?? '',
    statistika: item.statistic ?? item.statistika ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? item.p_hodnota ?? '',
    normalita: item.isNormal ?? item.normalita ?? '',
    odporucanie: item.recommendation ?? item.odporucanie ?? '',
    poznamka: item.note ?? item.poznamka ?? '',
  }));

  const computedRows = buildNormalityRowsFromRawData(result, preparedDataFile);
  const scaleOnlyDirectRows = filterRowsByScaleOrSubscaleNames(
    directRows,
    result,
    preparedDataFile,
    ['premenna', 'variable', 'name'],
  );
  const finalRows = computedRows.length > 0 ? computedRows : scaleOnlyDirectRows;

  const deduplicated = deduplicateRowsByKey(
    finalRows,
    (row) => `${normalizeReliabilityItemName(row.premenna)}|${normalizeReliabilityItemName(row.metoda)}`,
  );

  return deduplicated.length > 0 ? deduplicated : buildMissingScaleRowsMessage('Normalita dát');
}

function normalizeReliabilityItemName(value: unknown): string {
  return stripDiacritics(String(value ?? ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_\-–—]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findMatchingColumnName(headers: string[], itemName: string): string | null {
  const item = String(itemName || '').trim();

  if (!item) return null;

  const exact = headers.find((header) => header === item);
  if (exact) return exact;

  const normalizedItem = normalizeReliabilityItemName(item);

  const normalizedExact = headers.find((header) => normalizeReliabilityItemName(header) === normalizedItem);
  if (normalizedExact) return normalizedExact;

  const itemCodeMatch = normalizedItem.match(/^(?:q|otazka|polozka|item|jss|wemwbs|sehs|rs)(\d+)$/i);
  if (itemCodeMatch) {
    const codeNumber = itemCodeMatch[1].replace(/^0+/, '');
    const byCode = headers.find((header) => {
      const normalizedHeader = normalizeReliabilityItemName(header);
      const headerCode = normalizedHeader.match(/^(?:q|otazka|polozka|item|jss|wemwbs|sehs|rs)?0*(\d+)$/i);
      return headerCode?.[1] === codeNumber;
    });
    if (byCode) return byCode;
  }

  if (normalizedItem.length >= 14) {
    const substringMatch = headers.find((header) => {
      const normalizedHeader = normalizeReliabilityItemName(header);
      return normalizedHeader.includes(normalizedItem) || normalizedItem.includes(normalizedHeader);
    });

    if (substringMatch) return substringMatch;
  }

  return null;
}

function parseRangePart(value: string): string[] {
  const text = String(value || '').trim();

  if (!text) return [];

  const rangeMatch = text.match(/^(.*?)\s*(?:až|az|do|to|-|–|—)\s*(.*?)$/i);

  if (!rangeMatch) {
    return [text];
  }

  const left = rangeMatch[1].trim();
  const right = rangeMatch[2].trim();
  const leftMatch = left.match(/^(.*?)(\d+)$/);
  const rightMatch = right.match(/^(.*?)(\d+)$/);

  if (!leftMatch || !rightMatch) {
    return [text];
  }

  const leftPrefix = leftMatch[1].trim();
  const rightPrefix = rightMatch[1].trim() || leftPrefix;
  const start = Number(leftMatch[2]);
  const end = Number(rightMatch[2]);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    normalizeReliabilityItemName(leftPrefix) !== normalizeReliabilityItemName(rightPrefix)
  ) {
    return [text];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => `${leftPrefix}${start + index}`);
}

function parseReliabilityItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseReliabilityItems(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = String(value ?? '').trim();

  if (!text) return [];

  return text
    .replace(/\r/g, '\n')
    .split(/[,;\n]+/)
    .flatMap((part) => parseRangePart(part))
    .map((item) => item.trim())
    .filter(Boolean);
}


const RESILIENCE_RS25_ITEMS = [
  'Ak si niečo naplánujem, dotiahnem to dokonca..',
  'Zvyčajne si nejako poradím..',
  'Som schopný/-á spoľahnúť sa na seba viac ako na kohokoľvek iného..',
  'Byť zaujatý vecami je pre mňa dôležité. .',
  'Dokážem byť samostatný/-á, ak sa to vyžaduje..',
  'Cítim hrdosť, že som dokázal/-a uskutočniť vo svojom živote niektoré veci..',
  'Zvyčajne ľahko prekonávam prekážky..',
  'Dobre vychádzam sám/sama so sebou..',
  'Cítim, že dokážem zvládnuť naraz viacero vecí.',
  'Som rozhodný/-á (odhodlaný/-á). .',
  'Len zriedka si lámem hlavu, čo je zmyslom toho všetkého..',
  'Pripúšťam si veci len raz za čas..',
  'Dokážem sa preniesť cez ťažké časy, pretože už predtým som zažil/-a zložité chvíle..',
  'Mám sebadisciplínu..',
  'Udržiavam si záujem o veci..',
  'Dokážem zvyčajne nájsť niečo, na čom sa dá zasmiať..',
  'Viera v seba mi pomáha preniesť sa cez ťažké časy..',
  'Za mimoriadnych okolností som ten/tá, na koho sa ľudia môžu spoľahnúť..',
  'Zvyčajne sa viem pozrieť na situáciu mnohými spôsobmi..',
  'Niekedy sa nútim robiť veci bez ohľadu na to, či to chcem alebo nie..',
  'Môj život má význam (zmysel)..Príkaz 1',
  'Nebazírujem na veciach, s ktorými nemôžem nič urobiť.',
  'Keď sa ocitnem v zložitej situácii, zvyčajne z nej viem nájsť cestu von..',
  'Mám dostatok energie, aby som robil/-a, čo musím.',
  'Je v poriadku, ak existujú ľudia, ktorí ma nemajú radi. .',
];

const SEHS_S_2020_ITEMS = [
  'Ak sa snažím, zvládnem väčšinu vecí..',
  'Veľa vecí robím dobre..',
  'Mám zmysel života..',
  'Rozumiem svojim náladám a pocitom..',
  'Rozumiem, prečo robím to čo robím..',
  'Keď niečomu nerozumiem, pýtam sa na to opakovane učiteľa, kým tomu neporozumiem.',
  'Snažím sa zodpovedať na všetky otázky položené na hodine..',
  'Matematické úlohy riešim dovtedy, kým nenájdem konečné riešenie..',
  'V škole existuje učiteľ alebo iný dospelý, ktorý chce, aby som napredoval..',
  'V škole je učiteľ alebo iný dospelý, ktorý ma vypočuje..',
  'V škole je učiteľ alebo iný dospelý, ktorý verí, že budem úspešný..',
  'Moji rodinní príslušníci si navzájom pomáhajú a podporujú sa..',
  'V mojej rodine vládne pocit súdržnosti..',
  'Moja rodina vychádza spolu dobre..',
  'Mám priateľa v mojom veku, ktorému na mne skutočne záleží..',
  'Mám priateľa, ktorý sa so mnou rozpráva o mojich problémoch..',
  'Mám priateľa, ktorý mi pomôže, keď mám problémy..',
  'Prijímam zodpovednosť za svoje činy..',
  'Viem si uznať chybu..',
  'Viem sa vyrovnať s odmietnutím..',
  'Cítim sa zle, keď je niekto citovo zranený..',
  'Snažím sa pochopiť, čím prechádzajú iný ľudia..',
  'Snažím sa pochopiť, čo iní ľudia cítia a ako rozmýšľajú..',
  'Som trpezlivý, viem počkať na to, čo chcem..',
  'Neobťažujem ostatných, keď toho majú veľa..',
  'Rozmýšľam prv, než konám..',
  'Každý deň sa teším na to, že sa budem dobre baviť..',
  'Zvyčajne očakávam, že budem mať dobrý deň..',
  'Verím tomu, že sa mi prihodí viac dobrých vecí než zlých..',
  'Som vďačný mnohým ľuďom..',
  'Som nadšený, entuziastický..',
  'Som cenný človek..',
  'Cítim sa byť plný síl a energie..',
  'Cítim sa byť aktívny..',
  'Cítim sa byť vitálny, plný života..',
];

function normalizeBuiltinItemText(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function itemRange(items: string[], startIndexOneBased: number, count: number): string[] {
  return items.slice(startIndexOneBased - 1, startIndexOneBased - 1 + count);
}

function createStandardDefinition(
  name: string,
  items: string[],
  source: string,
  type: 'scale' | 'subscale' = 'subscale',
  scoring: 'sum' | 'mean' = 'mean',
): AnyRecord {
  return {
    id: `${source}-${normalizeReliabilityItemName(name)}`,
    name,
    scaleName: name,
    items: items.map(normalizeBuiltinItemText),
    source,
    type,
    scoring,
  };
}

const BUILTIN_STANDARD_DEFINITIONS: AnyRecord[] = [
  createStandardDefinition('ŠKÁLA REZILIENCIE', RESILIENCE_RS25_ITEMS, 'standard-template:RS-25', 'scale', 'mean'),
  createStandardDefinition('Vyrovnanosť', [RESILIENCE_RS25_ITEMS[7], RESILIENCE_RS25_ITEMS[10], RESILIENCE_RS25_ITEMS[11], RESILIENCE_RS25_ITEMS[21], RESILIENCE_RS25_ITEMS[24]], 'standard-template:RS-25'),
  createStandardDefinition('Zmysluplnosť', [RESILIENCE_RS25_ITEMS[3], RESILIENCE_RS25_ITEMS[14], RESILIENCE_RS25_ITEMS[15], RESILIENCE_RS25_ITEMS[20], RESILIENCE_RS25_ITEMS[23]], 'standard-template:RS-25'),
  createStandardDefinition('Sebadôvera', [RESILIENCE_RS25_ITEMS[1], RESILIENCE_RS25_ITEMS[2], RESILIENCE_RS25_ITEMS[4], RESILIENCE_RS25_ITEMS[16], RESILIENCE_RS25_ITEMS[17]], 'standard-template:RS-25'),
  createStandardDefinition('Vytrvalosť', [RESILIENCE_RS25_ITEMS[0], RESILIENCE_RS25_ITEMS[6], RESILIENCE_RS25_ITEMS[12], RESILIENCE_RS25_ITEMS[19], RESILIENCE_RS25_ITEMS[22]], 'standard-template:RS-25'),
  createStandardDefinition('Existenciálna osamelosť', [RESILIENCE_RS25_ITEMS[5], RESILIENCE_RS25_ITEMS[8], RESILIENCE_RS25_ITEMS[9], RESILIENCE_RS25_ITEMS[13], RESILIENCE_RS25_ITEMS[18]], 'standard-template:RS-25'),

  createStandardDefinition('SEHS-S-2020', SEHS_S_2020_ITEMS, 'standard-template:SEHS-S-2020', 'scale', 'mean'),
  createStandardDefinition('Viera v seba:', itemRange(SEHS_S_2020_ITEMS, 1, 9), 'standard-template:SEHS-S-2020', 'scale', 'mean'),
  createStandardDefinition('Sebaúčinnosť', itemRange(SEHS_S_2020_ITEMS, 1, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Sebauvedomenie', itemRange(SEHS_S_2020_ITEMS, 4, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Húževnatosť (Vytrvalosť)', itemRange(SEHS_S_2020_ITEMS, 7, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Viera v druhých:', itemRange(SEHS_S_2020_ITEMS, 10, 9), 'standard-template:SEHS-S-2020', 'scale', 'mean'),
  createStandardDefinition('Podpora školy', itemRange(SEHS_S_2020_ITEMS, 10, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Rodinná súdržnosť', itemRange(SEHS_S_2020_ITEMS, 13, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Podpora rovesníkov', itemRange(SEHS_S_2020_ITEMS, 16, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Emocionálna kompetencia:', itemRange(SEHS_S_2020_ITEMS, 19, 9), 'standard-template:SEHS-S-2020', 'scale', 'mean'),
  createStandardDefinition('Regulácia emócií', itemRange(SEHS_S_2020_ITEMS, 19, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Empatia', itemRange(SEHS_S_2020_ITEMS, 22, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Sebakontrola', itemRange(SEHS_S_2020_ITEMS, 25, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Životná angažovanosť:', itemRange(SEHS_S_2020_ITEMS, 28, 9), 'standard-template:SEHS-S-2020', 'scale', 'mean'),
  createStandardDefinition('Optimizmus', itemRange(SEHS_S_2020_ITEMS, 28, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Vďačnosť', itemRange(SEHS_S_2020_ITEMS, 31, 3), 'standard-template:SEHS-S-2020'),
  createStandardDefinition('Životný elán (Zest)', itemRange(SEHS_S_2020_ITEMS, 34, 3), 'standard-template:SEHS-S-2020'),

  createStandardDefinition('WEMWBS', Array.from({ length: 14 }, (_, index) => `WEMWBS${index + 1}`), 'standard-template:WEMWBS', 'scale', 'sum'),
  createStandardDefinition('JSS – Pay', ['JSS1', 'JSS10', 'JSS19', 'JSS28'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Promotion', ['JSS2', 'JSS11', 'JSS20', 'JSS33'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Supervision', ['JSS3', 'JSS12', 'JSS21', 'JSS30'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Fringe Benefits', ['JSS4', 'JSS13', 'JSS22', 'JSS29'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Contingent Rewards', ['JSS5', 'JSS14', 'JSS23', 'JSS32'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Operating Conditions', ['JSS6', 'JSS15', 'JSS24', 'JSS31'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Coworkers', ['JSS7', 'JSS16', 'JSS25', 'JSS34'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Nature of Work', ['JSS8', 'JSS17', 'JSS27', 'JSS35'], 'standard-template:JSS'),
  createStandardDefinition('JSS – Communication', ['JSS9', 'JSS18', 'JSS26', 'JSS36'], 'standard-template:JSS'),
  createStandardDefinition('JSS – total score', Array.from({ length: 36 }, (_, index) => `JSS${index + 1}`), 'standard-template:JSS', 'scale', 'sum'),
];

function countMatchingItemsInHeaders(headers: string[], items: string[]): number {
  return items.filter((item) => findMatchingColumnName(headers, item)).length;
}

function getRequestedQuestionnaireTokens(result: unknown): string[] {
  const candidateValues = [
    getNestedValue(result, ['questionnaireName']),
    getNestedValue(result, ['questionnaire']),
    getNestedValue(result, ['standardizedQuestionnaires']),
    getNestedValue(result, ['analysisConfig', 'questionnaireName']),
    getNestedValue(result, ['analysisConfig', 'questionnaire']),
    getNestedValue(result, ['analysisConfig', 'standardizedQuestionnaires']),
    getNestedValue(result, ['questionnaireConfig', 'questionnaireName']),
    getNestedValue(result, ['questionnaireConfig', 'questionnaire']),
    getNestedValue(result, ['questionnaireConfig', 'standardizedQuestionnaires']),
    getNestedValue(result, ['userCommand']),
    getNestedValue(result, ['userCommands']),
    getNestedValue(result, ['instructions']),
  ];

  const knownQuestionnaireHints = [
    'sehs',
    'sehss2020',
    'rs25',
    'reziliencia',
    'resilience',
    'wemwbs',
    'jss',
    'spector',
  ];

  return candidateValues
    .flatMap((value) => parseLooseList(value))
    .map(normalizeReliabilityItemName)
    .filter((token) => knownQuestionnaireHints.some((hint) => token.includes(hint)));
}

function sourceMatchesRequestedQuestionnaire(source: unknown, tokens: string[]): boolean {
  if (tokens.length === 0) return true;

  const normalizedSource = normalizeReliabilityItemName(source);
  return tokens.some((token) => normalizedSource.includes(token) || token.includes(normalizedSource));
}

function buildBuiltinDefinitionsForRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);
  const headers = Object.keys(rawRows[0] || {});

  if (!headers.length) return [];

  const requestedTokens = getRequestedQuestionnaireTokens(result);

  return BUILTIN_STANDARD_DEFINITIONS.filter((definition) => {
    const items = parseReliabilityItems(getItemsValueFromDefinition(definition));
    const matched = countMatchingItemsInHeaders(headers, items);
    const required = items.length <= 4 ? Math.min(items.length, 2) : Math.max(2, Math.ceil(items.length * 0.6));

    return matched >= required && sourceMatchesRequestedQuestionnaire(definition.source, requestedTokens);
  });
}

function splitManualDefinitionLines(text: unknown): string[] {
  const normalized = String(text ?? '')
    .replace(/\r/g, '\n')
    .replace(/[•·]/g, '\n')
    .trim();

  if (!normalized) return [];

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const expanded: string[] = [];

  lines.forEach((line) => {
    const semicolonParts = line.split(/;+/).map((part) => part.trim()).filter(Boolean);
    const looksLikeMultipleDefinitions = semicolonParts.filter((part) => /^[^:=]{1,90}\s*[:=]/.test(part)).length > 1;

    if (looksLikeMultipleDefinitions) {
      expanded.push(...semicolonParts);
    } else {
      expanded.push(line);
    }
  });

  return expanded;
}

function extractManualScaleDefinitionMeta(itemsText: string): {
  items: string[];
  reverseItems: string[];
  minValue: number | null;
  maxValue: number | null;
  scoring: 'sum' | 'mean';
} {
  const reverseMatches = Array.from(
    itemsText.matchAll(/(?:reverzné|reverzne|reverse|r)\s*(?:položky|polozky|items)?\s*[:=]\s*([^;\n]+)/giu),
  );
  const reverseItems = reverseMatches.flatMap((match) => parseReliabilityItems(match[1]));
  const minMatch = itemsText.match(/(?:min|minimum|od)\s*[:=]\s*(-?\d+(?:[,.]\d+)?)/i);
  const maxMatch = itemsText.match(/(?:max|maximum|do)\s*[:=]\s*(-?\d+(?:[,.]\d+)?)/i);
  const scoringMatch = itemsText.match(/(?:skoring|scoring|score|výpočet|vypocet)\s*[:=]\s*(sum|súčet|sucet|total|mean|priemer)/i);
  const cleanedItemsText = itemsText
    .replace(/(?:reverzné|reverzne|reverse|r)\s*(?:položky|polozky|items)?\s*[:=]\s*[^;\n]+/giu, '')
    .replace(/(?:min|minimum|od)\s*[:=]\s*-?\d+(?:[,.]\d+)?/gi, '')
    .replace(/(?:max|maximum|do)\s*[:=]\s*-?\d+(?:[,.]\d+)?/gi, '')
    .replace(/(?:skoring|scoring|score|výpočet|vypocet)\s*[:=]\s*(sum|súčet|sucet|total|mean|priemer)/gi, '')
    .replace(/\(.*?reverz.*?\)/giu, '')
    .trim();
  const scoringText = String(scoringMatch?.[1] || '').toLowerCase();

  return {
    items: parseReliabilityItems(cleanedItemsText),
    reverseItems,
    minValue: toFiniteNumber(minMatch?.[1]),
    maxValue: toFiniteNumber(maxMatch?.[1]),
    scoring: scoringText.includes('sum') || scoringText.includes('súčet') || scoringText.includes('sucet') || scoringText.includes('total') ? 'sum' : 'mean',
  };
}

function parseManualScaleTextToDefinitions(text: unknown, type: 'manual-scale' | 'manual-subscale'): AnyRecord[] {
  return splitManualDefinitionLines(text)
    .map((line, index) => {
      const separatorMatch =
        line.match(/^([^:=]{1,140})\s*[:=]\s*(.+)$/) ||
        line.match(/^(.{1,140}?)\s+[-–—]\s+(.+)$/);
      const name = separatorMatch
        ? separatorMatch[1].replace(/^\d+[.)]\s*/, '').trim()
        : `${type === 'manual-scale' ? 'Škála' : 'Subškála'} ${index + 1}`;
      const itemsText = separatorMatch ? separatorMatch[2].trim() : line;
      const meta = extractManualScaleDefinitionMeta(itemsText);

      return {
        id: `${type}-${index + 1}-${normalizeReliabilityItemName(name).slice(0, 24)}`,
        name,
        scaleName: name,
        items: meta.items,
        reverseItems: meta.reverseItems,
        minValue: meta.minValue ?? undefined,
        maxValue: meta.maxValue ?? undefined,
        source: type,
        scoring: meta.scoring,
      };
    })
    .filter((definition) => parseReliabilityItems(definition.items).length >= 2);
}

function getItemsValueFromDefinition(definition: AnyRecord): unknown {
  return definition.items ??
    definition.itemsUsed ??
    definition.itemColumns ??
    definition.columns ??
    definition.questions ??
    definition.questionItems ??
    definition.questionColumns ??
    definition.variables ??
    definition.polozky;
}

function isScaleDefinitionLike(value: unknown): value is AnyRecord {
  if (!isRecord(value)) return false;

  const items = parseReliabilityItems(getItemsValueFromDefinition(value));
  const name = value.name ?? value.scaleName ?? value.label ?? value.title ?? value.id;

  return Boolean(name) && items.length >= 2;
}

function collectScaleDefinitionsDeep(value: unknown, depth = 0): AnyRecord[] {
  if (depth > 5 || value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    const direct = value.filter(isScaleDefinitionLike);
    const nested = value.flatMap((item) => collectScaleDefinitionsDeep(item, depth + 1));
    return [...direct, ...nested];
  }

  if (!isRecord(value)) return [];

  const rows: AnyRecord[] = [];

  Object.entries(value).forEach(([key, child]) => {
    const normalizedKey = normalizeReliabilityItemName(key);
    const keyLooksRelevant =
      normalizedKey.includes('scale') ||
      normalizedKey.includes('subscale') ||
      normalizedKey.includes('skala') ||
      normalizedKey.includes('subskala') ||
      normalizedKey.includes('dotaznik') ||
      normalizedKey.includes('questionnaire') ||
      normalizedKey.includes('manual') ||
      normalizedKey.includes('config');

    if (Array.isArray(child)) {
      const direct = child.filter(isScaleDefinitionLike);
      if (keyLooksRelevant || direct.length > 0) {
        rows.push(...direct);
      }
    }

    if (keyLooksRelevant || depth < 2) {
      rows.push(...collectScaleDefinitionsDeep(child, depth + 1));
    }
  });

  return rows;
}

function collectManualScaleTextsDeep(value: unknown, depth = 0, currentKey = ''): string[] {
  if (depth > 5 || value === null || value === undefined) return [];

  const normalizedKey = normalizeReliabilityItemName(currentKey);
  const keyLooksRelevant =
    normalizedKey.includes('scale') ||
    normalizedKey.includes('subscale') ||
    normalizedKey.includes('skala') ||
    normalizedKey.includes('subskala') ||
    normalizedKey.includes('manual') ||
    normalizedKey.includes('command') ||
    normalizedKey.includes('prompt') ||
    normalizedKey.includes('instruction') ||
    normalizedKey.includes('config');

  if (typeof value === 'string') {
    const text = value.trim();
    const hasDefinitionSyntax = /[:=]/.test(text) && /[,;\n]|\b(?:az|až|do|to)\b|-|–|—/i.test(text);
    return keyLooksRelevant && hasDefinitionSyntax ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectManualScaleTextsDeep(item, depth + 1, currentKey));
  }

  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, child]) =>
    collectManualScaleTextsDeep(child, depth + 1, key),
  );
}

function deduplicateRowsByKey<T extends AnyRecord>(rows: T[], getKey: (row: T) => string): T[] {
  const used = new Set<string>();
  const result: T[] = [];

  rows.forEach((row) => {
    const key = getKey(row);
    if (!key || used.has(key)) return;
    used.add(key);
    result.push(row);
  });

  return result;
}


function getNumericColumnProfile(rawRows: AnyRecord[], header: string): {
  header: string;
  values: number[];
  nonEmptyCount: number;
  numericRatio: number;
  uniqueCount: number;
  min: number | null;
  max: number | null;
} {
  const rawValues = rawRows.map((row) => row[header]);
  const nonEmptyValues = rawValues.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  const values = nonEmptyValues
    .map((value) => toFiniteNumber(value))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const sorted = [...values].sort((a, b) => a - b);

  return {
    header,
    values,
    nonEmptyCount: nonEmptyValues.length,
    numericRatio: nonEmptyValues.length > 0 ? values.length / nonEmptyValues.length : 0,
    uniqueCount: new Set(values.map((value) => String(value))).size,
    min: sorted.length > 0 ? sorted[0] : null,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  };
}

function looksLikeIdentifierColumn(header: string, profile: ReturnType<typeof getNumericColumnProfile>, rowCount: number): boolean {
  const normalized = normalizeReliabilityItemName(header);
  const suspiciousName =
    normalized === 'id' ||
    normalized.endsWith('id') ||
    normalized.includes('timestamp') ||
    normalized.includes('datum') ||
    normalized.includes('date') ||
    normalized.includes('cas') ||
    normalized.includes('time') ||
    normalized.includes('email') ||
    normalized.includes('telefon') ||
    normalized.includes('phone') ||
    normalized.includes('ico') ||
    normalized.includes('rodne') ||
    normalized.includes('respondent');

  if (suspiciousName) return true;

  const almostEveryValueUnique = rowCount > 10 && profile.uniqueCount / Math.max(profile.values.length, 1) > 0.9;
  const largeSequentialLikeValues = profile.max !== null && profile.min !== null && profile.max - profile.min > 1000;

  return almostEveryValueUnique || largeSequentialLikeValues;
}

function looksLikeLikertOrScaleColumn(rawRows: AnyRecord[], header: string): boolean {
  const profile = getNumericColumnProfile(rawRows, header);

  if (profile.nonEmptyCount < 2 || profile.numericRatio < 0.8) return false;
  if (looksLikeIdentifierColumn(header, profile, rawRows.length)) return false;

  const normalized = normalizeReliabilityItemName(header);
  const itemNameHint = /^(q|otazka|polozka|item|jss|wemwbs|sehs|rs|s|skala|scale)\d+/.test(normalized) || /\d+$/.test(normalized);
  const ordinalRange = profile.min !== null && profile.max !== null && profile.min >= 0 && profile.max <= 10 && profile.uniqueCount <= 12;
  const compactSurveyRange = profile.uniqueCount <= 20 && profile.max !== null && profile.min !== null && profile.max - profile.min <= 20;

  return itemNameHint || ordinalRange || compactSurveyRange;
}

function getAutoScaleGroupKey(header: string): string | null {
  const normalized = normalizeReliabilityItemName(header);
  const numbered = normalized.match(/^([a-z]{1,20})0*\d{1,4}$/);

  if (numbered?.[1]) return numbered[1];

  const textNumber = normalized.match(/^(.+?)(?:otazka|polozka|item|q)0*\d{1,4}$/);
  if (textNumber?.[1]) return textNumber[1];

  return null;
}

function buildAutoScaleDefinitionsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (rawRows.length < 2) return [];

  const headers = Object.keys(rawRows[0] || {});
  const candidates = headers.filter((header) => looksLikeLikertOrScaleColumn(rawRows, header));

  if (candidates.length < 2) return [];

  const groups = new Map<string, string[]>();
  candidates.forEach((header) => {
    const key = getAutoScaleGroupKey(header);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), header]);
  });

  const groupDefinitions = Array.from(groups.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([key, items], index) => ({
      id: `auto-scale-${index + 1}-${key}`,
      name: `Automaticky rozpoznaná škála ${key.toUpperCase()}`,
      scaleName: `Automaticky rozpoznaná škála ${key.toUpperCase()}`,
      items,
      source: 'auto-detected-likert-columns',
      type: 'scale',
      scoring: 'mean',
      description:
        'Automaticky vytvorené z číselných/Likert položiek so spoločným prefixom. Overte názov a vecný význam škály pred akademickou interpretáciou.',
    }));

  const fallbackDefinition = candidates.length >= 3
    ? [{
        id: 'auto-scale-all-numeric-likert-items',
        name: 'Automaticky rozpoznané číselné/Likert položky',
        scaleName: 'Automaticky rozpoznané číselné/Likert položky',
        items: candidates,
        source: 'auto-detected-likert-columns',
        type: 'scale',
        scoring: 'mean',
        description:
          'Orientácia pre ľubovoľný dataset bez zadanej definície škál. Ide o automatický návrh, nie o potvrdenú štandardizovanú škálu.',
      }]
    : [];

  return deduplicateRowsByKey(
    [...groupDefinitions, ...fallbackDefinition],
    (definition) => `${normalizeReliabilityItemName(definition.name)}|${parseReliabilityItems(definition.items).map(normalizeReliabilityItemName).join('|')}`,
  );
}

function definitionMatchesRawColumns(
  definition: AnyRecord,
  rawRows: AnyRecord[],
): boolean {
  if (!rawRows.length) return false;

  const headers = Object.keys(rawRows[0] || {});
  const items = parseReliabilityItems(getItemsValueFromDefinition(definition));
  const matchedCount = items.filter((item) => findMatchingColumnName(headers, item)).length;

  return matchedCount >= Math.min(2, items.length);
}

function getReliabilityDefinitions(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const configuredDefinitions = [
    ...asRecords(getNestedValue(result, ['scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['subscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['manualScaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['manualSubscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['customScaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['customSubscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['analysisConfig', 'scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['analysisConfig', 'subscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['manualAnalysisConfig', 'scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['manualAnalysisConfig', 'subscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'subscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'manualScaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'manualSubscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'subscaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['questionnaireConfig', 'scaleDefinitions'])),
    ...asRecords(getNestedValue(result, ['questionnaireConfig', 'subscaleDefinitions'])),
    ...collectScaleDefinitionsDeep(result),
    ...buildBuiltinDefinitionsForRawData(result, preparedDataFile),
  ];

  const manualScaleTexts = [
    getNestedValue(result, ['manualScalesText']),
    getNestedValue(result, ['manualSubscalesText']),
    getNestedValue(result, ['customScalesText']),
    getNestedValue(result, ['customSubscalesText']),
    getNestedValue(result, ['scaleInput']),
    getNestedValue(result, ['subscaleInput']),
    getNestedValue(result, ['userCommands']),
    getNestedValue(result, ['userCommand']),
    getNestedValue(result, ['userPrompt']),
    getNestedValue(result, ['instructions']),
    getNestedValue(result, ['analysisConfig', 'manualScalesText']),
    getNestedValue(result, ['analysisConfig', 'manualSubscalesText']),
    getNestedValue(result, ['manualAnalysisConfig', 'manualScalesText']),
    getNestedValue(result, ['manualAnalysisConfig', 'manualSubscalesText']),
    getNestedValue(result, ['questionnaireConfig', 'manualScalesText']),
    getNestedValue(result, ['questionnaireConfig', 'manualSubscalesText']),
    getNestedValue(result, ['statisticalAnalysis', 'manualScalesText']),
    getNestedValue(result, ['statisticalAnalysis', 'manualSubscalesText']),
    getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'manualScalesText']),
    getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'manualSubscalesText']),
    ...collectManualScaleTextsDeep(result),
  ];

  const parsedDefinitions = manualScaleTexts.flatMap((text, index) => {
    const type = index % 2 === 1 ? 'manual-subscale' : 'manual-scale';
    return parseManualScaleTextToDefinitions(text, type);
  });

  const configuredAndParsed = [
    ...configuredDefinitions.filter(isScaleDefinitionLike),
    ...parsedDefinitions,
  ];
  const rawRows = flattenRawData(result, preparedDataFile);
  const hasUsableConfiguredDefinition = configuredAndParsed.some((definition) =>
    definitionMatchesRawColumns(definition, rawRows),
  );
  const autoDefinitions = hasUsableConfiguredDefinition
    ? []
    : buildAutoScaleDefinitionsFromRawData(result, preparedDataFile);

  return deduplicateRowsByKey(
    [...configuredAndParsed, ...autoDefinitions],
    (definition) => `${normalizeReliabilityItemName(definition.id)}|${normalizeReliabilityItemName(definition.name ?? definition.scaleName ?? definition.label ?? definition.title)}|${parseReliabilityItems(getItemsValueFromDefinition(definition)).map(normalizeReliabilityItemName).join('|')}`,
  );
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sumSquares = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);

  return sumSquares / (values.length - 1);
}

function interpretCronbachAlpha(alpha: number | null): string {
  if (alpha === null || !Number.isFinite(alpha)) {
    return 'Reliabilitu sa nepodarilo vypočítať.';
  }

  if (alpha >= 0.9) return 'Výborná vnútorná konzistencia.';
  if (alpha >= 0.8) return 'Dobrá vnútorná konzistencia.';
  if (alpha >= 0.7) return 'Akceptovateľná vnútorná konzistencia.';
  if (alpha >= 0.6) return 'Hraničná vnútorná konzistencia – interpretovať opatrne.';

  return 'Nízka vnútorná konzistencia – škálu je potrebné skontrolovať.';
}

function quantile(sortedValues: number[], percentile: number): number | null {
  if (!sortedValues.length) return null;
  if (sortedValues.length === 1) return sortedValues[0];

  const position = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function mode(values: number[]): number | null {
  if (!values.length) return null;

  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));

  let bestValue = values[0];
  let bestCount = 0;

  counts.forEach((count, value) => {
    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  });

  return bestCount > 1 ? bestValue : null;
}

function computeDescriptiveStats(values: number[], missing = 0): AnyRecord {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  const sorted = [...cleanValues].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mean = n > 0 ? sum / n : null;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const sampleVariance = n > 1 ? variance(sorted) : null;
  const sd = sampleVariance === null ? null : Math.sqrt(sampleVariance);

  return {
    valid: n,
    missing,
    mean: mean === null ? '' : Number(mean.toFixed(4)),
    median: median === null ? '' : Number(median.toFixed(4)),
    mode: mode(sorted) ?? '',
    standard_deviation: sd === null ? '' : Number(sd.toFixed(4)),
    variance: sampleVariance === null ? '' : Number(sampleVariance.toFixed(4)),
    minimum: n > 0 ? sorted[0] : '',
    maximum: n > 0 ? sorted[n - 1] : '',
    sum: n > 0 ? Number(sum.toFixed(4)) : '',
    q1: q1 === null ? '' : Number(q1.toFixed(4)),
    q3: q3 === null ? '' : Number(q3.toFixed(4)),
    iqr: q1 === null || q3 === null ? '' : Number((q3 - q1).toFixed(4)),
  };
}

function getScaleScoreType(definition: AnyRecord): 'sum' | 'mean' {
  const scoring = String(definition.scoring ?? definition.scoreType ?? definition.aggregation ?? 'mean')
    .trim()
    .toLowerCase();

  return scoring.includes('sum') || scoring.includes('total') || scoring.includes('súčet') || scoring.includes('sucet')
    ? 'sum'
    : 'mean';
}

function scoreScaleRow(params: {
  row: AnyRecord;
  itemColumns: string[];
  reverseColumns: string[];
  minValue?: unknown;
  maxValue?: unknown;
  scoring: 'sum' | 'mean';
}): number | null {
  const reverseSet = new Set(params.reverseColumns.map((item) => normalizeReliabilityItemName(item)));
  const min = toFiniteNumber(params.minValue);
  const max = toFiniteNumber(params.maxValue);

  const values = params.itemColumns.map((column) => {
    const numeric = toFiniteNumber(params.row[column]);

    if (numeric === null) return null;

    if (reverseSet.has(normalizeReliabilityItemName(column)) && min !== null && max !== null) {
      return min + max - numeric;
    }

    return numeric;
  });

  if (values.some((value) => value === null)) return null;

  const numericValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );

  if (!numericValues.length) return null;

  const sum = numericValues.reduce((total, value) => total + value, 0);
  return params.scoring === 'mean' ? sum / numericValues.length : sum;
}

function buildComputedScaleRowsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): { scaleRows: AnyRecord[]; descriptiveRows: AnyRecord[] } {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (!rawRows.length) {
    return { scaleRows: [], descriptiveRows: [] };
  }

  const headers = Object.keys(rawRows[0] || {});
  const definitions = getReliabilityDefinitions(result, preparedDataFile);
  const scaleRows: AnyRecord[] = [];
  const descriptiveRows: AnyRecord[] = [];
  const used = new Set<string>();

  definitions.forEach((definition, index) => {
    const rawItems = parseReliabilityItems(getItemsValueFromDefinition(definition));
    const matchedItems = rawItems
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));
    const uniqueItems = Array.from(new Set(matchedItems));
    const scaleName = String(
      definition.scaleName ??
        definition.name ??
        definition.label ??
        definition.title ??
        definition.id ??
        `Škála ${index + 1}`,
    );
    const key = `${normalizeReliabilityItemName(scaleName)}|${uniqueItems.map(normalizeReliabilityItemName).join('|')}`;

    if (used.has(key)) return;
    used.add(key);

    const scoring = getScaleScoreType(definition);
    const reverseColumns = parseReliabilityItems(
      definition.reverseItems ??
        definition.reverseItemsText ??
        definition.reverseColumns ??
        definition.reverzne_polozky,
    )
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));

    if (uniqueItems.length < 2) {
      if (rawItems.length > 0) {
        scaleRows.push({
          typ: 'zadaná škála/subškála – nespárovaná',
          id: definition.id ?? `computed-scale-${index + 1}`,
          nazov: scaleName,
          polozky: rawItems.join(', '),
          pouzite_polozky: uniqueItems.join(', '),
          skoring: scoring,
          valid: 0,
          missing: rawRows.length,
          zdroj: definition.source ?? 'manual-definition',
          popis: 'V dátach sa nenašli aspoň 2 stĺpce podľa zadaných položiek. Skontrolujte názvy položiek/stĺpcov.',
        });
      }
      return;
    }

    const scores = rawRows
      .map((row) => scoreScaleRow({
        row,
        itemColumns: uniqueItems,
        reverseColumns,
        minValue: definition.min ?? definition.minValue,
        maxValue: definition.max ?? definition.maxValue,
        scoring,
      }))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const stats = computeDescriptiveStats(scores, rawRows.length - scores.length);
    const common = {
      id: definition.id ?? `computed-scale-${index + 1}`,
      nazov: scaleName,
      polozky: rawItems.join(', '),
      pouzite_polozky: uniqueItems.join(', '),
      reverzne_polozky: reverseColumns.join(', '),
      minimum: definition.minValue ?? definition.min ?? '',
      maximum: definition.maxValue ?? definition.max ?? '',
      skoring: scoring,
      zdroj: definition.source ?? 'manual-definition',
    };

    scaleRows.push({
      typ: 'vypočítané skóre zo zadaných škál/subškál',
      ...common,
      valid: stats.valid,
      missing: stats.missing,
      mean: stats.mean,
      median: stats.median,
      sd: stats.standard_deviation,
      min: stats.minimum,
      max: stats.maximum,
      popis: 'Skóre bolo dopočítané priamo z DATA_CLEAN podľa položiek zadaných používateľom.',
    });

    descriptiveRows.push({
      zdroj: 'computed-manual-scale',
      typ: 'škála/subškála',
      premenna: scaleName,
      ...stats,
      poznamka: `Dopočítané z položiek: ${uniqueItems.join(', ')}. Skoring: ${scoring}.`,
    });
  });

  return { scaleRows, descriptiveRows };
}

function computeCronbachAlphaFromRows(params: {
  rows: AnyRecord[];
  itemColumns: string[];
  reverseColumns?: string[];
  minValue?: unknown;
  maxValue?: unknown;
}): {
  alpha: number | null;
  validRows: number;
  itemCount: number;
  usedItems: string[];
  note: string;
} {
  const { rows, itemColumns } = params;
  const reverseSet = new Set((params.reverseColumns || []).map((item) => normalizeReliabilityItemName(item)));
  const min = toFiniteNumber(params.minValue);
  const max = toFiniteNumber(params.maxValue);
  const itemValues: number[][] = itemColumns.map(() => []);
  const totalScores: number[] = [];

  rows.forEach((row) => {
    const values = itemColumns.map((column) => {
      const numeric = toFiniteNumber(row[column]);

      if (numeric === null) return null;

      if (reverseSet.has(normalizeReliabilityItemName(column)) && min !== null && max !== null) {
        return min + max - numeric;
      }

      return numeric;
    });

    if (values.some((value) => value === null)) {
      return;
    }

    const validValues = values.filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    );

    if (validValues.length !== itemColumns.length) {
      return;
    }

    validValues.forEach((value, index) => {
      itemValues[index].push(value);
    });

    totalScores.push(validValues.reduce((sum, value) => sum + value, 0));
  });

  if (itemColumns.length < 2) {
    return {
      alpha: null,
      validRows: totalScores.length,
      itemCount: itemColumns.length,
      usedItems: itemColumns,
      note: 'Cronbachovo alfa potrebuje minimálne 2 položky.',
    };
  }

  if (totalScores.length < 2) {
    return {
      alpha: null,
      validRows: totalScores.length,
      itemCount: itemColumns.length,
      usedItems: itemColumns,
      note: 'Na výpočet reliability sú potrebné aspoň 2 kompletné riadky.',
    };
  }

  const totalVariance = variance(totalScores);
  const itemVarianceSum = itemValues.reduce((sum, values) => sum + variance(values), 0);

  if (totalVariance <= 0) {
    return {
      alpha: null,
      validRows: totalScores.length,
      itemCount: itemColumns.length,
      usedItems: itemColumns,
      note: 'Rozptyl celkového skóre je nulový, Cronbachovo alfa sa nedá vypočítať.',
    };
  }

  const itemCount = itemColumns.length;
  const alpha = (itemCount / (itemCount - 1)) * (1 - itemVarianceSum / totalVariance);

  return {
    alpha: Number(alpha.toFixed(4)),
    validRows: totalScores.length,
    itemCount,
    usedItems: itemColumns,
    note: '',
  };
}

function buildReliabilityRowsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (!rawRows.length) return [];

  const headers = Object.keys(rawRows[0] || {});
  const definitions = getReliabilityDefinitions(result, preparedDataFile);
  const usedScaleKeys = new Set<string>();
  const rows: AnyRecord[] = [];

  definitions.forEach((definition, index) => {
    const rawItems = parseReliabilityItems(
      definition.items ??
        definition.itemsUsed ??
        definition.itemColumns ??
        definition.columns ??
        definition.questions ??
        definition.polozky,
    );

    const matchedItems = rawItems
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));

    const uniqueItems = Array.from(new Set(matchedItems));
    const scaleName = String(
      definition.scaleName ??
        definition.name ??
        definition.label ??
        definition.title ??
        definition.id ??
        `Škála ${index + 1}`,
    );

    const scaleKey = `${normalizeReliabilityItemName(scaleName)}|${uniqueItems.join('|')}`;

    if (usedScaleKeys.has(scaleKey)) return;
    usedScaleKeys.add(scaleKey);

    if (uniqueItems.length < 2) {
      if (rawItems.length > 0) {
        rows.push({
          id: definition.id ?? `reliability-${index + 1}`,
          skala: scaleName,
          polozky: rawItems.join(', '),
          pouzite_polozky: uniqueItems.join(', '),
          validne_riadky: 0,
          pocet_poloziek: uniqueItems.length,
          cronbach_alpha: '',
          interpretacia: 'Reliabilita nebola vypočítaná.',
          poznamka:
            'V DATA_CLEAN sa nenašli aspoň 2 položky tejto škály. Skontrolujte názvy stĺpcov a zápis položiek.',
        });
      }

      return;
    }

    const reverseColumns = parseReliabilityItems(
      definition.reverseItems ??
        definition.reverseItemsText ??
        definition.reverseColumns ??
        definition.reverzne_polozky,
    )
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));

    const calculation = computeCronbachAlphaFromRows({
      rows: rawRows,
      itemColumns: uniqueItems,
      reverseColumns,
      minValue: definition.min ?? definition.minValue,
      maxValue: definition.max ?? definition.maxValue,
    });

    rows.push({
      id: definition.id ?? `reliability-${index + 1}`,
      skala: scaleName,
      polozky: rawItems.join(', '),
      pouzite_polozky: calculation.usedItems.join(', '),
      reverzne_polozky: reverseColumns.join(', '),
      validne_riadky: calculation.validRows,
      pocet_poloziek: calculation.itemCount,
      cronbach_alpha: calculation.alpha ?? '',
      interpretacia: interpretCronbachAlpha(calculation.alpha),
      poznamka: calculation.note,
    });
  });

  return rows;
}

function flattenReliabilityRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['reliability'])),
    ...asRecords(getNestedValue(result, ['reliabilities'])),
    ...asRecords(getNestedValue(result, ['cronbachAlpha'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'reliability'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'reliabilities'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'cronbachAlpha'])),
  ];

  const directRows: AnyRecord[] = rows.map((item) => ({
    id: item.scaleId ?? item.id ?? '',
    skala: item.scaleName ?? item.scale ?? item.variable ?? item.name ?? '',
    polozky: Array.isArray(item.items)
      ? item.items.join(', ')
      : Array.isArray(item.itemsUsed)
        ? item.itemsUsed.join(', ')
        : item.items ?? item.itemsUsed ?? '',
    pouzite_polozky: Array.isArray(item.usedItems)
      ? item.usedItems.join(', ')
      : Array.isArray(item.itemColumns)
        ? item.itemColumns.join(', ')
        : item.usedItems ?? item.itemColumns ?? '',
    validne_riadky: item.validRows ?? item.validN ?? item.valid ?? item.n ?? '',
    pocet_poloziek: item.itemCount ?? '',
    cronbach_alpha: item.cronbachAlpha ?? item.alpha ?? '',
    interpretacia: item.interpretation ?? interpretCronbachAlpha(toFiniteNumber(item.cronbachAlpha ?? item.alpha)),
    poznamka: item.note ?? item.warning ?? '',
    zdroj: item.source ?? 'analysis-result',
  }));

  const computedRows: AnyRecord[] = buildReliabilityRowsFromRawData(result, preparedDataFile).map((row) => ({
    ...row,
    zdroj: row.zdroj ?? 'computed-from-DATA_CLEAN',
  }));

  const scaleOnlyDirectRows = filterRowsByScaleOrSubscaleNames(
    directRows,
    result,
    preparedDataFile,
    ['skala', 'scaleName', 'scale', 'variable', 'name'],
  );

  const finalRows: AnyRecord[] = computedRows.length > 0
    ? [...computedRows, ...scaleOnlyDirectRows]
    : scaleOnlyDirectRows;

  const deduplicated = deduplicateRowsByKey(
    finalRows,
    (row) => `${normalizeReliabilityItemName(row.skala)}|${normalizeReliabilityItemName(row.polozky)}|${normalizeReliabilityItemName(row.pouzite_polozky)}`,
  );

  if (deduplicated.length > 0) {
    return deduplicated;
  }

  return [
    {
      stav: 'reliabilita nie je dostupná',
      poznamka:
        'Cronbachovo alfa sa vypočíta až vtedy, keď výsledok obsahuje definície škál/subškál s položkami a v pripravených dátach DATA_CLEAN existujú príslušné stĺpce.',
    },
  ];
}

function pairedNumericValues(
  a: Array<number | null>,
  b: Array<number | null>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const length = Math.min(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const valueA = a[index];
    const valueB = b[index];

    if (
      valueA !== null &&
      valueB !== null &&
      Number.isFinite(valueA) &&
      Number.isFinite(valueB)
    ) {
      pairs.push([valueA, valueB]);
    }
  }

  return pairs;
}

function pearsonR(xValues: number[], yValues: number[]): number | null {
  if (xValues.length !== yValues.length || xValues.length < 3) return null;

  const meanX = mean(xValues);
  const meanY = mean(yValues);
  const numerator = xValues.reduce((sum, value, index) => sum + (value - meanX) * (yValues[index] - meanY), 0);
  const sumSquaresX = xValues.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const sumSquaresY = yValues.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const denominator = Math.sqrt(sumSquaresX * sumSquaresY);

  if (denominator <= 0) return null;

  return numerator / denominator;
}

function spearmanR(xValues: number[], yValues: number[]): number | null {
  if (xValues.length !== yValues.length || xValues.length < 3) return null;

  const rankX = rankValues(xValues).map((item) => item.rank);
  const rankY = rankValues(yValues).map((item) => item.rank);

  return pearsonR(rankX, rankY);
}

function correlationPValue(r: number | null, n: number): number {
  if (r === null || !Number.isFinite(r) || n < 4 || Math.abs(r) >= 1) return NaN;

  const t = r * Math.sqrt((n - 2) / Math.max(1 - r ** 2, 1e-12));
  return 2 * (1 - studentTCdf(Math.abs(t), n - 2));
}

function buildCorrelationRowsFromRawData(
  result: unknown,
  method: 'pearson' | 'spearman' | 'recommended',
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const series = buildDependentScoreSeries(result, preparedDataFile);
  const rows: AnyRecord[] = [];

  for (let first = 0; first < series.length; first += 1) {
    for (let second = first + 1; second < series.length; second += 1) {
      const left = series[first];
      const right = series[second];
      const pairs = pairedNumericValues(left.values, right.values);

      if (pairs.length < 4) continue;

      const xValues = pairs.map((pair) => pair[0]);
      const yValues = pairs.map((pair) => pair[1]);
      const leftNormal = isSeriesApproximatelyNormal(xValues);
      const rightNormal = isSeriesApproximatelyNormal(yValues);
      const chosenMethod = method === 'recommended'
        ? (leftNormal && rightNormal ? 'pearson' : 'spearman')
        : method;
      const r = chosenMethod === 'pearson'
        ? pearsonR(xValues, yValues)
        : spearmanR(xValues, yValues);

      if (r === null || !Number.isFinite(r)) continue;

      const pValue = correlationPValue(r, pairs.length);

      rows.push({
        premenna_a: left.name,
        premenna_b: right.name,
        metoda: chosenMethod === 'pearson' ? 'Pearson r' : 'Spearman rho',
        n: pairs.length,
        r: Number(r.toFixed(4)),
        p_hodnota: formatPValue(pValue),
        signifikancia: interpretPValue(pValue),
        fisher_z: Math.abs(r) < 1 ? Number((0.5 * Math.log((1 + r) / (1 - r))).toFixed(4)) : '',
        standard_error: pairs.length > 3 ? Number((1 / Math.sqrt(pairs.length - 3)).toFixed(4)) : '',
        interpretacia: chosenMethod === 'pearson'
          ? 'Parametrická korelácia použitá pri približne normálnych dátach.'
          : 'Neparametrická korelácia použitá pri nenormálnych/ordinálnych dátach.',
        zdroj: `dopočítané z DATA_CLEAN (${left.source}; ${right.source})`,
      });
    }
  }

  return rows.slice(0, 240);
}

function flattenCorrelationRows(
  result: unknown,
  method: 'pearson' | 'spearman' | 'recommended',
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rootRows = asRecords(getNestedValue(result, ['correlations', method]));
  const statRows = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'correlations', method]),
  );

  const directRows = [...rootRows, ...statRows].map((item) => ({
    premenna_a: item.variableA ?? item.premenna_a ?? '',
    premenna_b: item.variableB ?? item.premenna_b ?? '',
    metoda: item.method ?? item.metoda ?? method,
    n: item.n ?? '',
    r: item.r ?? item.rho ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? item.p_hodnota ?? '',
    signifikancia: item.significance ?? item.signifikancia ?? '',
    fisher_z: item.fisherZ ?? item.fisher_z ?? '',
    standard_error: item.standardError ?? item.standard_error ?? '',
    interpretacia: item.interpretation ?? item.interpretacia ?? '',
    zdroj: item.source ?? 'analysis-result',
  }));

  const computedRows = buildCorrelationRowsFromRawData(result, method, preparedDataFile);
  const knownScaleNames = getKnownScaleNameSet(result, preparedDataFile);
  const scaleOnlyDirectRows = directRows.filter((row) =>
    isLikelyScaleOrSubscaleVariableName(row.premenna_a, knownScaleNames) &&
    isLikelyScaleOrSubscaleVariableName(row.premenna_b, knownScaleNames),
  );
  const finalRows = computedRows.length > 0 ? computedRows : scaleOnlyDirectRows;

  return deduplicateRowsByKey(
    finalRows,
    (row) => `${normalizeReliabilityItemName(row.premenna_a)}|${normalizeReliabilityItemName(row.premenna_b)}|${normalizeReliabilityItemName(row.metoda)}`,
  );
}

function flattenCorrelationMatrix(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['correlationMatrix'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'correlationMatrix'])),
  ];

  if (!rows.length) return [];

  const knownScaleNames = getKnownScaleNameSet(result, preparedDataFile);
  const metadataKeys = new Set(['premenna', 'variable', 'name', 'skala', 'scale', 'metoda', 'method']);

  return rows
    .map((row) => {
      const rowVariable = getOutputVariableName(row, ['premenna', 'variable', 'name', 'skala', 'scale']);
      if (rowVariable && !isLikelyScaleOrSubscaleVariableName(rowVariable, knownScaleNames)) {
        return null;
      }

      const filteredRow: AnyRecord = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeReliabilityItemName(key);
        if (metadataKeys.has(key) || metadataKeys.has(normalizedKey) || isLikelyScaleOrSubscaleVariableName(key, knownScaleNames)) {
          filteredRow[key] = value;
        }
      });

      return Object.keys(filteredRow).length > 0 ? filteredRow : null;
    })
    .filter((row): row is AnyRecord => row !== null);
}




type TestValueGroup = {
  group: string;
  values: number[];
};

type DependentScoreSeries = {
  name: string;
  source: string;
  usedItems: string[];
  values: Array<number | null>;
};

function parseLooseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseLooseList(item));
  }

  if (value === null || value === undefined) return [];

  return String(value)
    .replace(/\r/g, '\n')
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectGroupingTextsDeep(value: unknown, depth = 0, currentKey = ''): string[] {
  if (depth > 5 || value === null || value === undefined) return [];

  const normalizedKey = normalizeReliabilityItemName(currentKey);
  const keyLooksRelevant =
    normalizedKey.includes('grouping') ||
    normalizedKey.includes('groupvariable') ||
    normalizedKey.includes('groupvariables') ||
    normalizedKey.includes('groupcolumns') ||
    normalizedKey.includes('skupinov') ||
    normalizedKey.includes('premennepretest') ||
    normalizedKey.includes('testvariables');

  if (typeof value === 'string') {
    const text = value.trim();
    return keyLooksRelevant && text.length > 0 && text.length <= 1200 ? [text] : [];
  }

  if (Array.isArray(value)) {
    if (keyLooksRelevant) {
      return value.flatMap((item) => parseLooseList(item));
    }

    return value.flatMap((item) => collectGroupingTextsDeep(item, depth + 1, currentKey));
  }

  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, child]) =>
    collectGroupingTextsDeep(child, depth + 1, key),
  );
}

function collectGroupingColumnNames(result: unknown): string[] {
  const candidates = [
    getNestedValue(result, ['groupingColumns']),
    getNestedValue(result, ['groupColumns']),
    getNestedValue(result, ['groupVariables']),
    getNestedValue(result, ['groupingVariables']),
    getNestedValue(result, ['groupingColumnsText']),
    getNestedValue(result, ['analysisConfig', 'groupingColumns']),
    getNestedValue(result, ['analysisConfig', 'groupColumns']),
    getNestedValue(result, ['analysisConfig', 'groupVariables']),
    getNestedValue(result, ['analysisConfig', 'groupingColumnsText']),
    getNestedValue(result, ['manualAnalysisConfig', 'groupingColumns']),
    getNestedValue(result, ['manualAnalysisConfig', 'groupColumns']),
    getNestedValue(result, ['manualAnalysisConfig', 'groupVariables']),
    getNestedValue(result, ['manualAnalysisConfig', 'groupingColumnsText']),
    getNestedValue(result, ['questionnaireConfig', 'groupingColumns']),
    getNestedValue(result, ['questionnaireConfig', 'groupColumns']),
    getNestedValue(result, ['questionnaireConfig', 'groupVariables']),
    getNestedValue(result, ['questionnaireConfig', 'groupingColumnsText']),
    getNestedValue(result, ['statisticalAnalysis', 'groupingColumns']),
    getNestedValue(result, ['statisticalAnalysis', 'groupColumns']),
    getNestedValue(result, ['statisticalAnalysis', 'groupVariables']),
    getNestedValue(result, ['statisticalAnalysis', 'groupingColumnsText']),
    getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'groupingColumns']),
    getNestedValue(result, ['statisticalAnalysis', 'manualAnalysisConfig', 'groupingColumnsText']),
    ...collectGroupingTextsDeep(result),
  ];

  return Array.from(
    new Set(
      candidates
        .flatMap((candidate) => parseLooseList(candidate))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function getNumericColumnValues(rows: AnyRecord[], column: string): number[] {
  return rows
    .map((row) => toFiniteNumber(row[column]))
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function isMostlyNumericColumn(rows: AnyRecord[], column: string): boolean {
  const nonEmptyValues = rows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

  if (nonEmptyValues.length < 2) return false;

  const numericCount = nonEmptyValues.filter((value) => toFiniteNumber(value) !== null).length;
  return numericCount / nonEmptyValues.length >= 0.75;
}

const SCALE_OR_SUBSCALE_NAME_HINTS = [
  'skala',
  'subskala',
  'scale',
  'subscale',
  'score',
  'skore',
  'total',
  'celkom',
  'celkove',
  'sum',
  'sucet',
  'priemer',
  'index',
  'faktor',
  'domena',
  'dimenzia',
  'rs25',
  'rs',
  'sehs',
  'sehss',
  'wemwbs',
  'jss',
  'rezilien',
  'resilien',
  'covitalita',
  'angazovanyzivot',
  'zivotnaangazovanost',
  'viera',
  'sebaucinnost',
  'sebauvedomenie',
  'vytrvalost',
  'rodinnasudrznost',
  'podporaskoly',
  'podporarovesnikov',
  'regulaciaemocii',
  'empatia',
  'sebakontrola',
  'optimizmus',
  'vdacnost',
  'vitalita',
  'zapal',
  'osobnakompetencia',
  'akceptaciasabaazivota',
];

const NON_DEPENDENT_COLUMN_HINTS = [
  'id',
  'respondent',
  'participant',
  'pohlavie',
  'gender',
  'vek',
  'age',
  'rocnik',
  'ročník',
  'skola',
  'škola',
  'typ',
  'druh',
  'uroven',
  'úroveň',
  'datum',
  'dátum',
  'cas',
  'čas',
  'sport',
  'šport',
  'trening',
  'tréning',
];

function getOutputVariableName(row: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}

function isRawItemLikeVariableName(value: unknown): boolean {
  const text = String(value ?? '').trim();
  if (!text) return false;

  const normalized = normalizeReliabilityItemName(text);

  if (/^(?:q|otazka|polozka|item|jss|wemwbs|rs)0*\d+$/i.test(normalized)) {
    return true;
  }

  if (text.length >= 65 && /[?]|\.\.$|\b(?:na škále|na skale|cítim|citim|som|mám|mam|viem|dokážem|dokazem|snažím|snazim|rozumiem|verím|verim|môj|moj|moja|moji)\b/i.test(text)) {
    return true;
  }

  if (/\.\.$/.test(text) && text.length >= 18) {
    return true;
  }

  return false;
}

function isNonDependentMetadataColumnName(value: unknown): boolean {
  const normalized = normalizeReliabilityItemName(value);
  if (!normalized) return true;

  return NON_DEPENDENT_COLUMN_HINTS.some((hint) => {
    const normalizedHint = normalizeReliabilityItemName(hint);
    return normalized === normalizedHint || normalized.includes(normalizedHint);
  });
}

function getKnownScaleNameSet(result: unknown, preparedDataFile?: ExportPayload['preparedDataFile']): Set<string> {
  const names = new Set<string>();

  getReliabilityDefinitions(result, preparedDataFile).forEach((definition) => {
    [
      definition.name,
      definition.scaleName,
      definition.label,
      definition.title,
      definition.id,
    ].forEach((value) => {
      const normalized = normalizeReliabilityItemName(value);
      if (normalized) names.add(normalized);
    });
  });

  const additionalCandidates = [
    ...asRecords(getNestedValue(result, ['scaleScores'])),
    ...asRecords(getNestedValue(result, ['scaleDescriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'scaleScores'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'scaleDescriptives'])),
    ...asRecords(getNestedValue(result, ['descriptiveStatistics'])),
    ...asRecords(getNestedValue(result, ['descriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'descriptiveStatistics'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'descriptives'])),
  ];

  additionalCandidates.forEach((row) => {
    [
      row.scaleName,
      row.scale,
      row.variable,
      row.premenna,
      row.name,
      row.nazov,
      row.id,
    ].forEach((value) => {
      const text = String(value ?? '').trim();
      const normalized = normalizeReliabilityItemName(text);
      if (normalized && isLikelyScaleOrSubscaleVariableName(text, names)) {
        names.add(normalized);
      }
    });
  });

  return names;
}

function isKnownScaleName(value: unknown, knownScaleNames: Set<string>): boolean {
  const normalized = normalizeReliabilityItemName(value);
  if (!normalized) return false;

  if (knownScaleNames.has(normalized)) return true;

  for (const knownName of knownScaleNames) {
    if (!knownName) continue;
    if (normalized.includes(knownName) || knownName.includes(normalized)) {
      return true;
    }
  }

  return false;
}

function hasScaleOrSubscaleKeyword(value: unknown): boolean {
  const normalized = normalizeReliabilityItemName(value);

  return SCALE_OR_SUBSCALE_NAME_HINTS.some((hint) => {
    const normalizedHint = normalizeReliabilityItemName(hint);
    return normalized.includes(normalizedHint);
  });
}

function isLikelyScaleOrSubscaleVariableName(
  value: unknown,
  knownScaleNames: Set<string> = new Set<string>(),
): boolean {
  const text = String(value ?? '').trim();
  if (!text) return false;

  if (isRawItemLikeVariableName(text)) return false;
  if (isNonDependentMetadataColumnName(text) && !hasScaleOrSubscaleKeyword(text) && !isKnownScaleName(text, knownScaleNames)) return false;

  if (isKnownScaleName(text, knownScaleNames)) return true;
  if (hasScaleOrSubscaleKeyword(text)) return true;

  return false;
}

function filterRowsByScaleOrSubscaleNames(
  rows: AnyRecord[],
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'] | undefined,
  variableKeys: string[],
): AnyRecord[] {
  const knownScaleNames = getKnownScaleNameSet(result, preparedDataFile);

  return rows.filter((row) => {
    const variableName = getOutputVariableName(row, variableKeys);
    return isLikelyScaleOrSubscaleVariableName(variableName, knownScaleNames);
  });
}

function buildMissingScaleRowsMessage(section: string): AnyRecord[] {
  return [
    {
      stav: `${section} nie sú dostupné pre škály/subškály`,
      poznamka:
        'Od deskriptívnej štatistiky po testovanie sa exportujú iba vypočítané škály a subškály. Do vstupného súboru doplňte samostatné stĺpce so skóre škál/subškál alebo zadajte definície položiek škál/subškál pred analýzou.',
    },
  ];
}

function buildPrecomputedScaleSeriesFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
  groupingColumns: string[] = [],
  limit = 40,
): DependentScoreSeries[] {
  const rawRows = flattenRawData(result, preparedDataFile);
  if (!rawRows.length) return [];

  const knownScaleNames = getKnownScaleNameSet(result, preparedDataFile);
  const groupingSet = new Set(groupingColumns.map((column) => normalizeReliabilityItemName(column)));
  const headers = Object.keys(rawRows[0] || {});
  const used = new Set<string>();

  return headers
    .filter((header) => !groupingSet.has(normalizeReliabilityItemName(header)))
    .filter((header) => isMostlyNumericColumn(rawRows, header))
    .filter((header) => isLikelyScaleOrSubscaleVariableName(header, knownScaleNames))
    .map((header) => ({
      name: header,
      source: 'precomputed-scale-column',
      usedItems: [header],
      values: rawRows.map((row) => toFiniteNumber(row[header])),
    }))
    .filter((series) => {
      const key = normalizeReliabilityItemName(series.name);
      if (!key || used.has(key)) return false;
      used.add(key);
      return series.values.filter((value): value is number => value !== null && Number.isFinite(value)).length >= 3;
    })
    .slice(0, limit);
}

function buildDescriptiveRowsFromScoreSeries(series: DependentScoreSeries[]): AnyRecord[] {
  return series.map((item) => {
    const values = item.values.filter((value): value is number => value !== null && Number.isFinite(value));
    const stats = computeDescriptiveStats(values, item.values.length - values.length);
    const skewness = sampleSkewness(values);
    const kurtosis = sampleExcessKurtosis(values);

    return {
      zdroj: item.source,
      typ: 'škála/subškála',
      premenna: item.name,
      ...stats,
      skewness: skewness === null ? '' : Number(skewness.toFixed(4)),
      kurtosis: kurtosis === null ? '' : Number(kurtosis.toFixed(4)),
      poznamka: item.source === 'precomputed-scale-column'
        ? 'Dopočítané zo stĺpca so skóre škály/subškály vo vstupnom súbore.'
        : `Dopočítané z položiek: ${item.usedItems.join(', ')}.`,
    };
  });
}

function buildPrecomputedScaleRowsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  return buildPrecomputedScaleSeriesFromRawData(result, preparedDataFile).map((series, index) => {
    const values = series.values.filter((value): value is number => value !== null && Number.isFinite(value));
    const stats = computeDescriptiveStats(values, series.values.length - values.length);

    return {
      typ: 'vypočítané skóre zo stĺpca v databáze',
      id: `precomputed-scale-${index + 1}`,
      nazov: series.name,
      polozky: '',
      pouzite_polozky: series.usedItems.join(', '),
      reverzne_polozky: '',
      minimum: stats.minimum,
      maximum: stats.maximum,
      skoring: 'precomputed',
      valid: stats.valid,
      missing: stats.missing,
      mean: stats.mean,
      median: stats.median,
      sd: stats.standard_deviation,
      min: stats.minimum,
      max: stats.maximum,
      zdroj: series.source,
      popis: 'Použitý bol už vypočítaný stĺpec škály/subškály z databázy používateľa.',
    };
  });
}

function flattenItemDescriptiveRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);
  if (!rawRows.length) return [];

  const knownScaleNames = getKnownScaleNameSet(result, preparedDataFile);
  const groupingColumns = new Set(resolveGroupingColumns(result, preparedDataFile).map((column) => normalizeReliabilityItemName(column)));
  const headers = Object.keys(rawRows[0] || {});

  return headers
    .filter((header) => !groupingColumns.has(normalizeReliabilityItemName(header)))
    .filter((header) => isMostlyNumericColumn(rawRows, header))
    .filter((header) => !isLikelyScaleOrSubscaleVariableName(header, knownScaleNames))
    .filter((header) => isRawItemLikeVariableName(header) || !isNonDependentMetadataColumnName(header))
    .slice(0, 300)
    .map((header, index) => {
      const values = getNumericColumnValues(rawRows, header);
      const stats = computeDescriptiveStats(values, rawRows.length - values.length);
      const skewness = sampleSkewness(values);
      const kurtosis = sampleExcessKurtosis(values);

      return {
        poradie: index + 1,
        polozka: header,
        ...stats,
        skewness: skewness === null ? '' : Number(skewness.toFixed(4)),
        kurtosis: kurtosis === null ? '' : Number(kurtosis.toFixed(4)),
        poznamka: 'Položková deskriptíva je presunutá do samostatného hárka, aby hlavné štatistické hárky obsahovali iba škály a subškály.',
      };
    });
}

function detectFallbackNumericColumns(rows: AnyRecord[], excludedColumns: string[], limit = 30): string[] {
  const excluded = new Set(excludedColumns.map((column) => normalizeReliabilityItemName(column)));
  const headers = Object.keys(rows[0] || {});

  return headers
    .filter((header) => !excluded.has(normalizeReliabilityItemName(header)))
    .filter((header) => getNumericColumnValues(rows, header).length >= 3)
    .slice(0, limit);
}

function detectFallbackGroupingColumns(rows: AnyRecord[], excludedColumns: string[], limit = 8): string[] {
  const excluded = new Set(excludedColumns.map((column) => normalizeReliabilityItemName(column)));
  const headers = Object.keys(rows[0] || {});

  return headers
    .filter((header) => !excluded.has(normalizeReliabilityItemName(header)))
    .filter((header) => {
      const values = rows
        .map((row) => row[header])
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
        .map((value) => String(value).trim());
      const uniqueValues = Array.from(new Set(values));

      if (values.length < 4) return false;
      if (uniqueValues.length < 2 || uniqueValues.length > 8) return false;
      if (isMostlyNumericColumn(rows, header) && uniqueValues.length > 5) return false;

      return true;
    })
    .slice(0, limit);
}

function buildDependentScoreSeries(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
  groupingColumns: string[] = [],
): DependentScoreSeries[] {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (!rawRows.length) return [];

  const headers = Object.keys(rawRows[0] || {});
  const definitions = getReliabilityDefinitions(result, preparedDataFile);
  const series: DependentScoreSeries[] = [];
  const used = new Set<string>();

  definitions.forEach((definition, index) => {
    const rawItems = parseReliabilityItems(getItemsValueFromDefinition(definition));
    const itemColumns = rawItems
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));
    const uniqueItems = Array.from(new Set(itemColumns));

    if (uniqueItems.length < 2) return;

    const reverseColumns = parseReliabilityItems(
      definition.reverseItems ??
        definition.reverseItemsText ??
        definition.reverseColumns ??
        definition.reverzne_polozky,
    )
      .map((item) => findMatchingColumnName(headers, item))
      .filter((item): item is string => Boolean(item));

    const name = String(
      definition.scaleName ??
        definition.name ??
        definition.label ??
        definition.title ??
        definition.id ??
        `Škála ${index + 1}`,
    ).trim();

    const key = `${normalizeReliabilityItemName(name)}|${uniqueItems.map(normalizeReliabilityItemName).join('|')}`;
    if (used.has(key)) return;
    used.add(key);

    const scoring = getScaleScoreType(definition);
    const values = rawRows.map((row) =>
      scoreScaleRow({
        row,
        itemColumns: uniqueItems,
        reverseColumns,
        minValue: definition.min ?? definition.minValue,
        maxValue: definition.max ?? definition.maxValue,
        scoring,
      }),
    );

    if (values.filter((value): value is number => value !== null && Number.isFinite(value)).length >= 3) {
      series.push({
        name,
        source: String(definition.source ?? 'manual-scale'),
        usedItems: uniqueItems,
        values,
      });
    }
  });

  buildPrecomputedScaleSeriesFromRawData(result, preparedDataFile, groupingColumns).forEach((precomputedSeries) => {
    const key = normalizeReliabilityItemName(precomputedSeries.name);
    if (!key || used.has(key)) return;
    used.add(key);
    series.push(precomputedSeries);
  });

  // Zámerne už nepoužívame fallback na všetky číselné stĺpce.
  // Od deskriptívnej štatistiky po testovanie majú ísť do exportu iba škály a subškály,
  // nie demografické premenné ani jednotlivé položky dotazníka.
  return series.slice(0, 40);
}

function flattenScaleScoreRows(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile || null);
  const series = buildDependentScoreSeries(result, preparedDataFile);

  if (!rawRows.length) {
    return [
      {
        stav: 'skóre škál nie je dostupné',
        poznamka: 'Nie sú dostupné raw dáta, z ktorých by bolo možné vypočítať skóre škál a subškál po respondentoch.',
      },
    ];
  }

  if (!series.length) {
    return [
      {
        stav: 'skóre škál nie je dostupné',
        poznamka: 'Export nenašiel definície škál/subškál alebo už vypočítané skórové stĺpce. Doplňte scaleDefinitions/subscaleDefinitions alebo text typu „Názov škály: položka1, položka2, položka3“.',
      },
    ];
  }

  const groupingColumns = resolveGroupingColumns(
    result,
    preparedDataFile,
    series.flatMap((item) => item.usedItems),
  ).slice(0, 6);

  return rawRows.map((row, rowIndex) => {
    const output: AnyRecord = { riadok: rowIndex + 1 };

    groupingColumns.forEach((column) => {
      output[column] = row[column] ?? '';
    });

    series.forEach((item) => {
      const score = item.values[rowIndex];
      output[item.name] = score === null || score === undefined || !Number.isFinite(score)
        ? ''
        : Number(score.toFixed(4));
    });

    return output;
  });
}

function resolveGroupingColumns(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
  excludedDependentColumns: string[] = [],
): string[] {
  const rawRows = flattenRawData(result, preparedDataFile);
  if (!rawRows.length) return [];

  const headers = Object.keys(rawRows[0] || {});
  const explicitColumns = collectGroupingColumnNames(result)
    .map((name) => findMatchingColumnName(headers, name))
    .filter((name): name is string => Boolean(name));

  const uniqueExplicitColumns = Array.from(new Set(explicitColumns));

  if (uniqueExplicitColumns.length > 0) {
    return uniqueExplicitColumns.slice(0, 8);
  }

  return detectFallbackGroupingColumns(rawRows, excludedDependentColumns, 8);
}

function groupDependentValues(
  rawRows: AnyRecord[],
  series: DependentScoreSeries,
  groupColumn: string,
): TestValueGroup[] {
  const grouped = new Map<string, number[]>();

  rawRows.forEach((row, index) => {
    const numeric = series.values[index];
    const rawGroup = row[groupColumn];

    if (numeric === null || numeric === undefined || !Number.isFinite(numeric)) return;
    if (rawGroup === null || rawGroup === undefined || String(rawGroup).trim() === '') return;

    const groupName = String(rawGroup).trim();
    const values = grouped.get(groupName) || [];
    values.push(numeric);
    grouped.set(groupName, values);
  });

  return Array.from(grouped.entries())
    .map(([group, values]) => ({ group, values }))
    .filter((item) => item.values.length >= 2)
    .slice(0, 12);
}

function mean(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function standardDeviation(values: number[]): number {
  return values.length > 1 ? Math.sqrt(variance(values)) : 0;
}

function erfApprox(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erfApprox(value / Math.SQRT2));
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  let x = 0.99999999999980993;
  const z = value - 1;

  coefficients.forEach((coefficient, index) => {
    x += coefficient / (z + index + 1);
  });

  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIterations = 120;
  const epsilon = 3e-7;
  const fpmin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;

  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;

  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < epsilon) break;
  }

  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(x, a, b)) / a;
  }

  return 1 - (bt * betaContinuedFraction(1 - x, b, a)) / b;
}

function studentTCdf(t: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) return NaN;

  const x = degreesOfFreedom / (degreesOfFreedom + t * t);
  const ib = regularizedBeta(x, degreesOfFreedom / 2, 0.5);

  if (!Number.isFinite(ib)) return NaN;
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

function fCdf(fValue: number, df1: number, df2: number): number {
  if (!Number.isFinite(fValue) || !Number.isFinite(df1) || !Number.isFinite(df2) || fValue < 0 || df1 <= 0 || df2 <= 0) {
    return NaN;
  }

  const x = (df1 * fValue) / (df1 * fValue + df2);
  return regularizedBeta(x, df1 / 2, df2 / 2);
}

function chiSquareSurvivalWilsonHilferty(value: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(degreesOfFreedom) || value < 0 || degreesOfFreedom <= 0) return NaN;

  const z = (Math.pow(value / degreesOfFreedom, 1 / 3) - (1 - 2 / (9 * degreesOfFreedom))) /
    Math.sqrt(2 / (9 * degreesOfFreedom));

  return 1 - normalCdf(z);
}

function formatPValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (value < 0.001) return '< 0,001';
  return value.toFixed(4).replace('.', ',');
}

function interpretPValue(value: number): string {
  if (!Number.isFinite(value)) return 'p-hodnota nie je dostupná';
  return value < 0.05 ? 'štatisticky významné' : 'štatisticky nevýznamné';
}

function formatGroupSummary(groups: TestValueGroup[], statistic: 'mean' | 'median'): string {
  return groups
    .map((group) => {
      const values = [...group.values].sort((a, b) => a - b);
      const center = statistic === 'mean' ? mean(values) : quantile(values, 0.5);
      const sd = standardDeviation(values);
      const centerText = center === null ? '' : Number(center.toFixed(4));
      return `${group.group}: n=${values.length}, ${statistic === 'mean' ? 'M' : 'Md'}=${centerText}, SD=${Number(sd.toFixed(4))}`;
    })
    .join(' | ');
}

function rankValues(values: number[]): Array<{ value: number; index: number; rank: number }> {
  const sorted = values
    .map((value, index) => ({ value, index, rank: 0 }))
    .sort((a, b) => a.value - b.value);

  let position = 0;

  while (position < sorted.length) {
    let end = position + 1;
    while (end < sorted.length && sorted[end].value === sorted[position].value) {
      end += 1;
    }

    const averageRank = (position + 1 + end) / 2;
    for (let index = position; index < end; index += 1) {
      sorted[index].rank = averageRank;
    }

    position = end;
  }

  return sorted.sort((a, b) => a.index - b.index);
}

function buildParametricTestsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (!rawRows.length) return [];

  const initialGroupingColumns = resolveGroupingColumns(result, preparedDataFile);
  const series = buildDependentScoreSeries(result, preparedDataFile, initialGroupingColumns);
  const groupingColumns = resolveGroupingColumns(
    result,
    preparedDataFile,
    series.flatMap((item) => item.usedItems),
  );

  if (!series.length || !groupingColumns.length) {
    return [
      {
        stav: 'parametrické testy nie sú dostupné',
        poznamka:
          'Na dopočítanie t-testu alebo ANOVA sú potrebné číselné škály/subškály a aspoň jedna skupinová premenná. Zadajte napríklad: pohlavie, typ_skoly, rocnik.',
      },
    ];
  }

  const rows: AnyRecord[] = [];

  groupingColumns.forEach((groupColumn) => {
    series.forEach((dependent) => {
      const groups = groupDependentValues(rawRows, dependent, groupColumn);
      const allValues = groups.flatMap((group) => group.values);

      if (groups.length < 2 || allValues.length < 4) return;

      if (!isSeriesApproximatelyNormal(allValues)) {
        rows.push({
          zavisla_premenna: dependent.name,
          skupinova_premenna: groupColumn,
          test: 'nepočítané – odporúčaný neparametrický test',
          skupiny: groups.map((group) => group.group).join('; '),
          n: allValues.length,
          n_skupiny: groups.map((group) => `${group.group}: ${group.values.length}`).join('; '),
          priemery: formatGroupSummary(groups, 'mean'),
          df1: '',
          df2: '',
          statistika: '',
          p_hodnota: '',
          signifikancia: '',
          efekt: '',
          odporucanie: 'Normalita nebola splnená, preto je pre túto premennú vhodný neparametrický test v hárku 17 Neparam testy.',
          zdroj: `dopočítané z DATA_CLEAN (${dependent.source})`,
        });
        return;
      }

      if (groups.length === 2) {
        const [groupA, groupB] = groups;
        const n1 = groupA.values.length;
        const n2 = groupB.values.length;
        const mean1 = mean(groupA.values);
        const mean2 = mean(groupB.values);
        const var1 = variance(groupA.values);
        const var2 = variance(groupB.values);
        const standardError = Math.sqrt(var1 / n1 + var2 / n2);
        const tStatistic = standardError > 0 ? (mean1 - mean2) / standardError : NaN;
        const numerator = (var1 / n1 + var2 / n2) ** 2;
        const denominator = (var1 ** 2) / (n1 ** 2 * Math.max(n1 - 1, 1)) + (var2 ** 2) / (n2 ** 2 * Math.max(n2 - 1, 1));
        const df = denominator > 0 ? numerator / denominator : n1 + n2 - 2;
        const pValue = Number.isFinite(tStatistic) ? 2 * (1 - studentTCdf(Math.abs(tStatistic), df)) : NaN;
        const pooledSd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / Math.max(n1 + n2 - 2, 1));
        const cohenD = pooledSd > 0 ? (mean1 - mean2) / pooledSd : NaN;

        rows.push({
          zavisla_premenna: dependent.name,
          skupinova_premenna: groupColumn,
          test: 'Welchov t-test',
          skupiny: `${groupA.group}; ${groupB.group}`,
          n: n1 + n2,
          n_skupiny: `${groupA.group}: ${n1}; ${groupB.group}: ${n2}`,
          priemery: formatGroupSummary(groups, 'mean'),
          df1: '',
          df2: Number(df.toFixed(4)),
          statistika: Number(tStatistic.toFixed(4)),
          p_hodnota: formatPValue(pValue),
          signifikancia: interpretPValue(pValue),
          efekt: Number.isFinite(cohenD) ? `Cohen d = ${Number(cohenD.toFixed(4))}` : '',
          odporucanie: 'Parametrický test rozdielu dvoch skupín. Pred finálnou interpretáciou overte normalitu a extrémne hodnoty.',
          zdroj: `dopočítané z DATA_CLEAN (${dependent.source})`,
        });

        return;
      }

      const grandMean = mean(allValues);
      const ssBetween = groups.reduce((sum, group) => sum + group.values.length * (mean(group.values) - grandMean) ** 2, 0);
      const ssWithin = groups.reduce((sum, group) => sum + group.values.reduce((innerSum, value) => innerSum + (value - mean(group.values)) ** 2, 0), 0);
      const dfBetween = groups.length - 1;
      const dfWithin = allValues.length - groups.length;
      const msBetween = ssBetween / Math.max(dfBetween, 1);
      const msWithin = ssWithin / Math.max(dfWithin, 1);
      const fStatistic = msWithin > 0 ? msBetween / msWithin : NaN;
      const pValue = Number.isFinite(fStatistic) ? 1 - fCdf(fStatistic, dfBetween, dfWithin) : NaN;
      const etaSquared = ssBetween + ssWithin > 0 ? ssBetween / (ssBetween + ssWithin) : NaN;

      rows.push({
        zavisla_premenna: dependent.name,
        skupinova_premenna: groupColumn,
        test: 'Jednofaktorová ANOVA',
        skupiny: groups.map((group) => group.group).join('; '),
        n: allValues.length,
        n_skupiny: groups.map((group) => `${group.group}: ${group.values.length}`).join('; '),
        priemery: formatGroupSummary(groups, 'mean'),
        df1: dfBetween,
        df2: dfWithin,
        statistika: Number(fStatistic.toFixed(4)),
        p_hodnota: formatPValue(pValue),
        signifikancia: interpretPValue(pValue),
        efekt: Number.isFinite(etaSquared) ? `eta² = ${Number(etaSquared.toFixed(4))}` : '',
        odporucanie: 'Parametrický test rozdielu troch a viac skupín. Pri významnom výsledku doplňte post-hoc porovnania.',
        zdroj: `dopočítané z DATA_CLEAN (${dependent.source})`,
      });
    });
  });

  return rows.slice(0, 240);
}

function buildNonParametricTestsFromRawData(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rawRows = flattenRawData(result, preparedDataFile);

  if (!rawRows.length) return [];

  const initialGroupingColumns = resolveGroupingColumns(result, preparedDataFile);
  const series = buildDependentScoreSeries(result, preparedDataFile, initialGroupingColumns);
  const groupingColumns = resolveGroupingColumns(
    result,
    preparedDataFile,
    series.flatMap((item) => item.usedItems),
  );

  if (!series.length || !groupingColumns.length) {
    return [
      {
        stav: 'neparametrické testy nie sú dostupné',
        poznamka:
          'Na dopočítanie Mann-Whitney alebo Kruskal-Wallis testu sú potrebné číselné škály/subškály a skupinová premenná.',
      },
    ];
  }

  const rows: AnyRecord[] = [];

  groupingColumns.forEach((groupColumn) => {
    series.forEach((dependent) => {
      const groups = groupDependentValues(rawRows, dependent, groupColumn);
      const allValues = groups.flatMap((group) => group.values);

      if (groups.length < 2 || allValues.length < 4) return;

      if (groups.length === 2) {
        const [groupA, groupB] = groups;
        const combined = [...groupA.values, ...groupB.values];
        const ranks = rankValues(combined);
        const rankSumA = ranks.slice(0, groupA.values.length).reduce((sum, item) => sum + item.rank, 0);
        const n1 = groupA.values.length;
        const n2 = groupB.values.length;
        const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
        const u2 = n1 * n2 - u1;
        const u = Math.min(u1, u2);
        const meanU = (n1 * n2) / 2;
        const sdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
        const z = sdU > 0 ? (u - meanU) / sdU : NaN;
        const pValue = Number.isFinite(z) ? 2 * (1 - normalCdf(Math.abs(z))) : NaN;
        const rEffect = Number.isFinite(z) ? Math.abs(z) / Math.sqrt(n1 + n2) : NaN;

        rows.push({
          zavisla_premenna: dependent.name,
          skupinova_premenna: groupColumn,
          test: 'Mann-Whitney U',
          skupiny: `${groupA.group}; ${groupB.group}`,
          n: n1 + n2,
          n_skupiny: `${groupA.group}: ${n1}; ${groupB.group}: ${n2}`,
          mediany: formatGroupSummary(groups, 'median'),
          df: '',
          statistika: Number(u.toFixed(4)),
          z: Number(z.toFixed(4)),
          p_hodnota: formatPValue(pValue),
          signifikancia: interpretPValue(pValue),
          efekt: Number.isFinite(rEffect) ? `r = ${Number(rEffect.toFixed(4))}` : '',
          odporucanie: 'Neparametrický test rozdielu dvoch nezávislých skupín.',
          zdroj: `dopočítané z DATA_CLEAN (${dependent.source})`,
        });

        return;
      }

      const combined = groups.flatMap((group) => group.values.map((value) => ({ value, group: group.group })));
      const ranks = rankValues(combined.map((item) => item.value));
      const rankSums = new Map<string, number>();

      combined.forEach((item, index) => {
        rankSums.set(item.group, (rankSums.get(item.group) || 0) + ranks[index].rank);
      });

      const n = combined.length;
      const h = (12 / (n * (n + 1))) * groups.reduce((sum, group) => {
        const rankSum = rankSums.get(group.group) || 0;
        return sum + (rankSum ** 2) / group.values.length;
      }, 0) - 3 * (n + 1);
      const df = groups.length - 1;
      const pValue = chiSquareSurvivalWilsonHilferty(h, df);
      const epsilonSquared = n > groups.length ? (h - groups.length + 1) / (n - groups.length) : NaN;

      rows.push({
        zavisla_premenna: dependent.name,
        skupinova_premenna: groupColumn,
        test: 'Kruskal-Wallis H',
        skupiny: groups.map((group) => group.group).join('; '),
        n,
        n_skupiny: groups.map((group) => `${group.group}: ${group.values.length}`).join('; '),
        mediany: formatGroupSummary(groups, 'median'),
        df,
        statistika: Number(h.toFixed(4)),
        p_hodnota: formatPValue(pValue),
        signifikancia: interpretPValue(pValue),
        efekt: Number.isFinite(epsilonSquared) ? `epsilon² = ${Number(epsilonSquared.toFixed(4))}` : '',
        odporucanie: 'Neparametrický test rozdielu troch a viac nezávislých skupín.',
        zdroj: `dopočítané z DATA_CLEAN (${dependent.source})`,
      });
    });
  });

  return rows.slice(0, 240);
}

function flattenParametricTests(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['parametricTests'])),
    ...asRecords(getNestedValue(result, ['tests', 'parametric'])),
    ...asRecords(getNestedValue(result, ['groupTests', 'parametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'parametricTests'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'tests', 'parametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'parametric'])),
  ];

  const directRows = rows.map((item) => ({
    zavisla_premenna: item.dependentVariable ?? item.variable ?? item.premenna ?? item.zavisla_premenna ?? '',
    skupinova_premenna: item.groupVariable ?? item.groupColumn ?? item.groupingVariable ?? item.skupinova_premenna ?? '',
    test: item.testType ?? item.test ?? item.method ?? '',
    skupiny: Array.isArray(item.groups) ? item.groups.join(', ') : item.groups ?? item.skupiny ?? '',
    n: item.nTotal ?? item.n ?? '',
    n_skupiny: item.groupNs ?? item.n_skupiny ?? '',
    priemery: item.means ?? item.priemery ?? '',
    df1: item.df1 ?? '',
    df2: item.df2 ?? item.df ?? '',
    statistika: item.statistic ?? item.t ?? item.f ?? item.statistika ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? item.p_hodnota ?? '',
    signifikancia: item.significance ?? item.signifikancia ?? '',
    efekt: item.effectSize ?? item.effect ?? item.efekt ?? '',
    odporucanie: item.recommendation ?? item.odporucanie ?? '',
    zdroj: item.source ?? 'analysis-result',
  }));

  const computedRows = buildParametricTestsFromRawData(result, preparedDataFile);
  const scaleOnlyDirectRows = filterRowsByScaleOrSubscaleNames(
    directRows,
    result,
    preparedDataFile,
    ['zavisla_premenna', 'dependentVariable', 'variable', 'premenna'],
  );

  return deduplicateRowsByKey(
    [...scaleOnlyDirectRows, ...computedRows],
    (row) => `${normalizeReliabilityItemName(row.zavisla_premenna)}|${normalizeReliabilityItemName(row.skupinova_premenna)}|${normalizeReliabilityItemName(row.test)}|${normalizeReliabilityItemName(row.skupiny)}|${normalizeReliabilityItemName(row.zdroj)}`,
  );
}

function flattenNonParametricTests(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['nonParametricTests'])),
    ...asRecords(getNestedValue(result, ['nonparametricTests'])),
    ...asRecords(getNestedValue(result, ['tests', 'nonParametric'])),
    ...asRecords(getNestedValue(result, ['tests', 'nonparametric'])),
    ...asRecords(getNestedValue(result, ['groupTests', 'nonParametric'])),
    ...asRecords(getNestedValue(result, ['groupTests', 'nonparametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'nonParametricTests'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'nonparametricTests'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'tests', 'nonParametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'tests', 'nonparametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'nonParametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'nonparametric'])),
  ];

  const directRows = rows.map((item) => ({
    zavisla_premenna: item.dependentVariable ?? item.variable ?? item.premenna ?? item.zavisla_premenna ?? '',
    skupinova_premenna: item.groupVariable ?? item.groupColumn ?? item.groupingVariable ?? item.skupinova_premenna ?? '',
    test: item.testType ?? item.test ?? item.method ?? '',
    skupiny: Array.isArray(item.groups) ? item.groups.join(', ') : item.groups ?? item.skupiny ?? '',
    n: item.nTotal ?? item.n ?? '',
    n_skupiny: item.groupNs ?? item.n_skupiny ?? '',
    mediany: item.medians ?? item.mediany ?? '',
    df: item.df ?? '',
    statistika: item.statistic ?? item.u ?? item.h ?? item.statistika ?? '',
    z: item.z ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? item.p_hodnota ?? '',
    signifikancia: item.significance ?? item.signifikancia ?? '',
    efekt: item.effectSize ?? item.effect ?? item.efekt ?? '',
    odporucanie: item.recommendation ?? item.odporucanie ?? '',
    zdroj: item.source ?? 'analysis-result',
  }));

  const computedRows = buildNonParametricTestsFromRawData(result, preparedDataFile);
  const scaleOnlyDirectRows = filterRowsByScaleOrSubscaleNames(
    directRows,
    result,
    preparedDataFile,
    ['zavisla_premenna', 'dependentVariable', 'variable', 'premenna'],
  );

  return deduplicateRowsByKey(
    [...scaleOnlyDirectRows, ...computedRows],
    (row) => `${normalizeReliabilityItemName(row.zavisla_premenna)}|${normalizeReliabilityItemName(row.skupinova_premenna)}|${normalizeReliabilityItemName(row.test)}|${normalizeReliabilityItemName(row.skupiny)}|${normalizeReliabilityItemName(row.zdroj)}`,
  );
}

function buildContingencyTables(result: unknown): AnyRecord[] {
  const rows: AnyRecord[] = [];

  const frequencies = [
    ...asRecords(getNestedValue(result, ['frequencies'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'frequencies'])),
  ];

  frequencies.forEach((frequency) => {
    const variable = String(frequency['variable'] || frequency['name'] || '');
    const values = asRecords(frequency['values'] || frequency['items']);
    const total = Number(frequency['total'] || frequency['valid'] || 0);

    values.forEach((item) => {
      const count = Number(item.count || 0);

      rows.push({
        tabulka: variable,
        riadok: variable,
        stlpec: item.value ?? item.label ?? '',
        count,
        row_percent: total > 0 ? Number(((count / total) * 100).toFixed(2)) : '',
        column_percent: '',
        total_percent: total > 0 ? Number(((count / total) * 100).toFixed(2)) : '',
      });
    });
  });

  return rows;
}

function buildChiSquareTests(result: unknown): AnyRecord[] {
  const contingencyRows = buildContingencyTables(result);

  if (!contingencyRows.length) {
    return [];
  }

  const grouped = new Map<string, AnyRecord[]>();

  contingencyRows.forEach((row) => {
    const key = String(row.tabulka || '');
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });

  return Array.from(grouped.entries()).map(([variable, rows]) => ({
    premenna: variable,
    test: 'Chí-kvadrát test dobrej zhody / kontingenčná kontrola',
    pocet_kategorii: rows.length,
    poznamka:
      'Pre plnohodnotný chí-kvadrát test nezávislosti sú potrebné dve kategorizované premenné. Tento riadok slúži ako súhrn kategórií a podklad pre ďalšie rozšírenie.',
  }));
}

function flattenRecommendedTests(result: unknown): AnyRecord[] {
  const recommendedTests = asRecords(
    getNestedValue(result, ['recommendedTests']),
  );

  const recommendedGroupTests = [
    ...asRecords(getNestedValue(result, ['groupTests', 'recommended'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'recommended'])),
  ];

  const recommendedCorrelations = [
    ...asRecords(getNestedValue(result, ['correlations', 'recommended'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'correlations', 'recommended'])),
  ];

  const testRows = recommendedTests.map((item) => ({
    zdroj: 'recommendedTests',
    nazov: item.title ?? '',
    test: item.test ?? '',
    premenne: Array.isArray(item.variables)
      ? item.variables.join(', ')
      : '',
    p_hodnota: item.pValue ?? '',
    vysledok: item.result ?? item.description ?? '',
    dovod: item.reason ?? '',
  }));

  const groupRows = recommendedGroupTests.map((item) => ({
    zdroj: 'groupTests.recommended',
    nazov: `${item.dependentVariable ?? ''} podľa ${item.groupVariable ?? ''}`,
    test: item.testType ?? '',
    premenne: `${item.dependentVariable ?? ''}, ${item.groupVariable ?? ''}`,
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    vysledok: item.recommendation ?? '',
    dovod: 'Odporúčané podľa normality a počtu skupín.',
  }));

  const correlationRows = recommendedCorrelations.map((item) => ({
    zdroj: 'correlations.recommended',
    nazov: `${item.variableA ?? ''} × ${item.variableB ?? ''}`,
    test: item.method ?? '',
    premenne: `${item.variableA ?? ''}, ${item.variableB ?? ''}`,
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    vysledok: item.interpretation ?? '',
    dovod: 'Odporúčaná korelačná metóda podľa normality.',
  }));

  return [...testRows, ...correlationRows, ...groupRows];
}

function flattenRecommendedCharts(result: unknown): AnyRecord[] {
  const recommendedCharts = asRecords(
    getNestedValue(result, ['recommendedCharts']),
  );

  const chartTables = [
    ...asRecords(getNestedValue(result, ['chartTables'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'chartTables'])),
  ];

  const chartRows = recommendedCharts.map((item) => ({
    nazov: item.title ?? item.name ?? '',
    typ: item.type ?? '',
    premenne: Array.isArray(item.variables)
      ? item.variables.join(', ')
      : '',
    popis: item.description ?? '',
    dovod: item.reason ?? '',
  }));

  const chartTableRows = chartTables.map((item) => ({
    nazov: item.title ?? item.key ?? '',
    typ: 'chart-table',
    premenne: '',
    popis: `Tabuľka pre graf: ${item.key ?? ''}`,
    pocet_riadkov: Array.isArray(item.rows) ? item.rows.length : 0,
    dovod: 'Dáta pripravené pre grafické zobrazenie.',
  }));

  return [...chartRows, ...chartTableRows];
}

function flattenChartData(result: unknown): AnyRecord[] {
  const chartData =
    getNestedValue(result, ['chartData']) ||
    getNestedValue(result, ['statisticalAnalysis', 'chartData']);

  if (!isRecord(chartData)) {
    return [];
  }

  const rows: AnyRecord[] = [];

  Object.entries(chartData).forEach(([section, value]) => {
    asRecords(value).forEach((item) => {
      rows.push({
        sekcia: section,
        label: item.label ?? '',
        value: item.value ?? '',
        description: item.description ?? '',
        group: item.group ?? '',
      });
    });
  });

  return rows;
}



type ChartPoint = {
  label: string;
  value: number;
  description?: string;
  group?: string;
};

type ChartSection = {
  key: string;
  title: string;
  description: string;
  points: ChartPoint[];
  valueLabel: string;
  valueSuffix?: string;
  kind?: 'bar' | 'correlation' | 'reliability';
};

function stripDiacritics(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function pdfEscape(value: unknown): string {
  return stripDiacritics(String(value ?? ''))
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .slice(0, 110);
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace('%', '')
    .replace(',', '.');

  if (!cleaned) return null;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function firstExistingValue(row: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }

  return undefined;
}

function buildChartPoints(
  rows: AnyRecord[],
  labelKeys: string[],
  valueKeys: string[],
  limit = 30,
): ChartPoint[] {
  const usedLabels = new Set<string>();

  const points = rows
    .map((row, index): ChartPoint | null => {
      const rawLabel = firstExistingValue(row, labelKeys);
      const rawValue = firstExistingValue(row, valueKeys);
      const value = toFiniteNumber(rawValue);
      const label = String(rawLabel ?? `Položka ${index + 1}`).trim();

      if (!label || value === null) return null;

      const uniqueKey = `${label}|${value}`;
      if (usedLabels.has(uniqueKey)) return null;
      usedLabels.add(uniqueKey);

      return {
        label: label.slice(0, 90),
        value,
        description: String(row.interpretacia ?? row.popis ?? row.poznamka ?? '').trim(),
        group: String(row.skala ?? row.typ ?? row.sekcia ?? row.premenna ?? '').trim(),
      };
    })
    .filter((item): item is ChartPoint => item !== null);

  return points.slice(0, limit);
}

function chartSectionFromRows(params: {
  key: string;
  title: string;
  description: string;
  rows: AnyRecord[];
  labelKeys: string[];
  valueKeys: string[];
  valueLabel: string;
  valueSuffix?: string;
  kind?: ChartSection['kind'];
  limit?: number;
}): ChartSection | null {
  const points = buildChartPoints(
    params.rows,
    params.labelKeys,
    params.valueKeys,
    params.limit ?? 30,
  );

  if (!points.length) return null;

  return {
    key: params.key,
    title: params.title,
    description: params.description,
    points,
    valueLabel: params.valueLabel,
    valueSuffix: params.valueSuffix,
    kind: params.kind ?? 'bar',
  };
}

function normalizeChartDataRows(result: unknown): AnyRecord[] {
  const direct = flattenChartData(result);

  if (direct.length > 0) {
    return direct;
  }

  const chartTables = [
    ...asRecords(getNestedValue(result, ['chartTables'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'chartTables'])),
  ];

  const rows: AnyRecord[] = [];

  chartTables.forEach((table) => {
    const tableRows = asRecords(table.rows || table.data || table.values || table.items);

    tableRows.forEach((row) => {
      rows.push({
        sekcia: table.key ?? table.title ?? 'chartTables',
        label: row.label ?? row.variable ?? row.name ?? row.category ?? row.value ?? '',
        value:
          row.value ??
          row.mean ??
          row.count ??
          row.frequency ??
          row.percent ??
          row.percentage ??
          row.cronbachAlpha ??
          row.r ??
          row.rho ??
          row.coefficient ??
          '',
        description: row.description ?? row.interpretation ?? row.note ?? '',
        group: table.title ?? table.key ?? '',
      });
    });
  });

  return rows;
}

function buildChartSections(
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
): ChartSection[] {
  const sections: Array<ChartSection | null> = [];

  const chartRows = normalizeChartDataRows(result);

  const groupedChartRows = new Map<string, AnyRecord[]>();
  chartRows.forEach((row) => {
    const key = String(row.sekcia || 'chartData');
    const list = groupedChartRows.get(key) || [];
    list.push(row);
    groupedChartRows.set(key, list);
  });

  groupedChartRows.forEach((rows, key) => {
    sections.push(
      chartSectionFromRows({
        key: `chart-${key}`,
        title: `Graf – ${key}`,
        description: 'Graf vytvorený z poľa chartData alebo chartTables.',
        rows,
        labelKeys: ['label', 'premenná', 'premenna', 'nazov', 'name', 'variable'],
        valueKeys: ['value', 'hodnota', 'mean', 'count', 'pocet', 'percento', 'r', 'rho', 'cronbach_alpha'],
        valueLabel: 'Hodnota',
        limit: 25,
      }),
    );
  });

  sections.push(
    chartSectionFromRows({
      key: 'frequencies-count',
      title: 'Frekvenčné rozdelenie',
      description: 'Početnosti kategórií a odpovedí v dátach.',
      rows: flattenFrequencies(result),
      labelKeys: ['hodnota', 'premenna', 'nazov', 'label'],
      valueKeys: ['pocet', 'count', 'frequency'],
      valueLabel: 'Počet',
      limit: 30,
    }),
  );

  sections.push(
    chartSectionFromRows({
      key: 'descriptives-mean',
      title: 'Priemery premenných',
      description: 'Priemerné hodnoty položiek, škál alebo subškál.',
      rows: flattenDescriptiveRows(result, preparedDataFile),
      labelKeys: ['premenna', 'nazov', 'variable', 'name'],
      valueKeys: ['mean', 'priemer', 'average'],
      valueLabel: 'Priemer',
      limit: 30,
    }),
  );

  sections.push(
    chartSectionFromRows({
      key: 'scale-means',
      title: 'Škály a subškály',
      description: 'Grafické porovnanie vypočítaných škál a subškál.',
      rows: flattenScaleRows(result, preparedDataFile),
      labelKeys: ['nazov', 'id', 'premenna'],
      valueKeys: ['mean', 'valid', 'missing', 'pocet_chybajucich_riadkov'],
      valueLabel: 'Hodnota',
      limit: 30,
    }),
  );

  sections.push(
    chartSectionFromRows({
      key: 'reliability-alpha',
      title: 'Reliabilita – Cronbach alfa',
      description: 'Vnútorná konzistencia škál. Vyššia hodnota znamená vyššiu reliabilitu.',
      rows: flattenReliabilityRows(result, preparedDataFile),
      labelKeys: ['skala', 'id', 'premenna'],
      valueKeys: ['cronbach_alpha', 'alpha', 'cronbachAlpha'],
      valueLabel: 'Cronbach alfa',
      kind: 'reliability',
      limit: 25,
    }),
  );

  sections.push(
    chartSectionFromRows({
      key: 'recommended-correlations',
      title: 'Korelačné vzťahy',
      description: 'Sila korelačných vzťahov medzi premennými.',
      rows: [
        ...flattenCorrelationRows(result, 'recommended', preparedDataFile),
        ...flattenCorrelationRows(result, 'pearson', preparedDataFile),
        ...flattenCorrelationRows(result, 'spearman', preparedDataFile),
      ].map((row) => ({
        ...row,
        nazov: `${row.premenna_a ?? ''} × ${row.premenna_b ?? ''}`,
      })),
      labelKeys: ['nazov', 'premenna_a', 'premenna_b'],
      valueKeys: ['r', 'rho', 'coefficient'],
      valueLabel: 'Koeficient',
      kind: 'correlation',
      limit: 30,
    }),
  );

  sections.push(
    chartSectionFromRows({
      key: 'normality-p',
      title: 'Normalita dát',
      description: 'p-hodnoty testu normality podľa analyzovaných premenných.',
      rows: flattenNormalityRows(result, preparedDataFile),
      labelKeys: ['premenna', 'nazov'],
      valueKeys: ['p_hodnota', 'statistika'],
      valueLabel: 'p / štatistika',
      limit: 30,
    }),
  );

  const deduplicated = new Map<string, ChartSection>();

  sections
    .filter((section): section is ChartSection => Boolean(section && section.points.length > 0))
    .forEach((section) => {
      const key = section.key;
      if (!deduplicated.has(key)) {
        deduplicated.set(key, section);
      }
    });

  return Array.from(deduplicated.values()).slice(0, EXCEL_EXPORT_LIMITS.maxChartSections);
}

function formatExportNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4))).replace('.', ',');
}

function makeTextBar(value: number, maxAbsValue: number, kind?: ChartSection['kind']): string {
  const safeMax = Math.max(maxAbsValue, 1);
  const length = Math.max(1, Math.round((Math.abs(value) / safeMax) * 28));
  const bar = '█'.repeat(length);

  if (kind === 'correlation') {
    return value < 0 ? `${bar} ◀ 0` : `0 ▶ ${bar}`;
  }

  if (kind === 'reliability') {
    const percentLength = Math.max(1, Math.round(Math.min(Math.max(value, 0), 1) * 28));
    return '█'.repeat(percentLength) + '░'.repeat(Math.max(0, 28 - percentLength));
  }

  return bar;
}

function addChartDataSheet(workbook: XLSX.WorkBook, chartSections: ChartSection[]) {
  // Starý SheetJS grafový výstup je vypnutý, aby nevznikali listy 22–37.
  // Podkladové dáta pre grafy sa exportujú v hlavnom liste 14 Chart data.
  void workbook;
  void chartSections;
}

function addExcelChartSheet(workbook: XLSX.WorkBook, section: ChartSection, index: number) {
  // Staré samostatné textové grafové hárky sú vypnuté.
  void workbook;
  void section;
  void index;
}

function addExcelChartSheets(
  workbook: XLSX.WorkBook,
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
) {
  // Zámerne nevytvárame samostatné grafové hárky 22–37.
  // Dáta pre grafy zostávajú v liste 14 Chart data a skutočné obrázky grafov sú iba na 01 Dashboard.
  // Tým sa export výrazne zrýchli na Verceli a zároveň zostanú zachované helper, farby,
  // raw-data, data-quality, škály, skóre, reliabilita a štatistické tabuľky.
  void workbook;
  void result;
  void preparedDataFile;
}



type DashboardPieSection = {
  key: string;
  title: string;
  points: ChartPoint[];
};

const PROFESSIONAL_COLORS = [
  '2563EB',
  '7C3AED',
  '059669',
  'F59E0B',
  'DC2626',
  '0891B2',
  'BE185D',
  '4F46E5',
  '65A30D',
  'EA580C',
];

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  const value = parseInt(cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function createCrc32Table(): number[] {
  const table: number[] = [];

  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }

  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    c = CRC32_TABLE[(c ^ buffer[index]) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLength = width * 4 + 1;
  const raw = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * rowLength] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * rowLength + 1);
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(width: number, height: number, background: string): Uint8Array {
  const [r, g, b] = hexToRgb(background);
  const rgba = new Uint8Array(width * height * 4);

  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = r;
    rgba[index + 1] = g;
    rgba[index + 2] = b;
    rgba[index + 3] = 255;
  }

  return rgba;
}

function setPixel(rgba: Uint8Array, width: number, height: number, x: number, y: number, color: string) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const [r, g, b] = hexToRgb(color);
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  rgba[index] = r;
  rgba[index + 1] = g;
  rgba[index + 2] = b;
  rgba[index + 3] = 255;
}

function fillRectPng(rgba: Uint8Array, width: number, height: number, x: number, y: number, w: number, h: number, color: string) {
  const x1 = Math.max(0, Math.floor(x));
  const y1 = Math.max(0, Math.floor(y));
  const x2 = Math.min(width, Math.ceil(x + w));
  const y2 = Math.min(height, Math.ceil(y + h));

  for (let yy = y1; yy < y2; yy += 1) {
    for (let xx = x1; xx < x2; xx += 1) {
      setPixel(rgba, width, height, xx, yy, color);
    }
  }
}

function drawCircleSector(
  rgba: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
) {
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > radius) continue;

      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      const inside = startAngle <= endAngle
        ? angle >= startAngle && angle <= endAngle
        : angle >= startAngle || angle <= endAngle;

      if (inside) {
        setPixel(rgba, width, height, x, y, color);
      }
    }
  }
}

function renderPieChartPng(section: DashboardPieSection, width = 720, height = 420): Buffer {
  const rgba = createCanvas(width, height, 'F8FAFC');
  fillRectPng(rgba, width, height, 0, 0, width, 8, '0F172A');

  const total = Math.max(section.points.reduce((sum, point) => sum + Math.max(0, point.value), 0), 1);
  const cx = 220;
  const cy = 220;
  const radius = 145;
  let angle = -Math.PI / 2;

  section.points.forEach((point, index) => {
    const nextAngle = angle + (Math.max(0, point.value) / total) * Math.PI * 2;
    drawCircleSector(
      rgba,
      width,
      height,
      cx,
      cy,
      radius,
      angle < 0 ? angle + Math.PI * 2 : angle,
      nextAngle < 0 ? nextAngle + Math.PI * 2 : nextAngle,
      PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length],
    );
    angle = nextAngle;
  });

  // Stredový kruh pre moderný donut vzhľad.
  drawCircleSector(rgba, width, height, cx, cy, 60, 0, Math.PI * 2, 'F8FAFC');

  // Legendové farebné pruhy vpravo. Text je v bunkách Excelu vedľa obrázka.
  section.points.slice(0, 8).forEach((_, index) => {
    fillRectPng(rgba, width, height, 430, 80 + index * 32, 34, 18, PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]);
  });

  return encodePng(width, height, rgba);
}

function renderBarChartPng(section: ChartSection, width = 900, height = 460): Buffer {
  const rgba = createCanvas(width, height, 'F8FAFC');
  fillRectPng(rgba, width, height, 0, 0, width, 8, '0F172A');
  fillRectPng(rgba, width, height, 55, 70, width - 105, height - 130, 'E2E8F0');

  const points = section.points.slice(0, 16);
  const maxAbs = Math.max(...points.map((point) => Math.abs(point.value)), 1);
  const chartX = 70;
  const chartY = 90;
  const chartW = width - 150;
  const chartH = height - 160;
  const gap = 8;
  const barH = Math.max(8, Math.floor((chartH - gap * (points.length - 1)) / Math.max(points.length, 1)));

  points.forEach((point, index) => {
    const y = chartY + index * (barH + gap);
    const ratio = section.kind === 'reliability'
      ? Math.min(Math.max(point.value, 0), 1)
      : Math.min(Math.abs(point.value) / maxAbs, 1);
    const barW = Math.max(3, Math.floor(chartW * ratio));
    const color = section.kind === 'correlation' && point.value < 0
      ? 'DC2626'
      : PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length];

    fillRectPng(rgba, width, height, chartX, y, chartW, barH, 'CBD5E1');
    fillRectPng(rgba, width, height, chartX, y, barW, barH, color);
  });

  return encodePng(width, height, rgba);
}


function buildWorkbookHelperRows(): SheetHelperRow[] {
  return [
    {
      poradie: 0,
      list: '00 Pomocnik',
      cast: 'Návod k exportu',
      co_obsahuje: 'Vysvetlenie všetkých hárkov, význam stĺpcov, výpočtov a dôvody, prečo môže niektorá hodnota chýbať.',
      preco_je_dolezity: 'Používateľ nemusí poznať štatistiku ani štruktúru exportu. Tento list slúži ako metodický manuál priamo v Exceli.',
      ako_sa_pocita: 'Tento list je statický metodický popis. Nevypočítava výsledky, ale opisuje výpočty v ostatných listoch.',
      kedy_moze_chybat: 'Nemal by chýbať nikdy. Generuje sa ako prvý list pri každom Excel exporte.',
      odporucanie: 'Začnite týmto listom, potom skontrolujte raw-data, data-quality, škály/subškály, skóre a reliabilitu. Samostatné grafové listy 22–37 sa na Verceli negenerujú – grafy sú sústredené na Dashboarde a ich dátový podklad je v liste 14 Chart data.',
    },
    {
      poradie: 1,
      list: '01 Dashboard',
      cast: 'Manažérsky prehľad a grafy',
      co_obsahuje: 'Základný prehľad súboru, počty riadkov/stĺpcov, hlavné grafické výstupy, frekvencie, priemery, korelácie a reliabilitu podľa dostupných dát.',
      preco_je_dolezity: 'Slúži na rýchlu orientáciu bez prechádzania všetkých štatistických listov.',
      ako_sa_pocita: 'Dashboard preberá hodnoty z výstupných tabuliek. Grafy sa tvoria z count, percent, mean, r/rho, cronbach_alpha alebo iných číselných stĺpcov.',
      kedy_moze_chybat: 'Graf sa nezobrazí, ak v príslušnej tabuľke nie sú číselné hodnoty vhodné na graf.',
      odporucanie: 'Ak je graf prázdny, pozrite príslušný dátový list a overte, či obsahuje číselné výsledky.',
    },
    {
      poradie: 2,
      list: '01 overview',
      cast: 'Základné informácie',
      co_obsahuje: 'Názov reportu, dátum generovania, názov zdrojového súboru, počet respondentov/riadkov, počet premenných/stĺpcov a použitý hárok.',
      preco_je_dolezity: 'Overuje, či export pracoval so správnym súborom a správnym rozsahom dát.',
      ako_sa_pocita: 'Hodnoty sa čítajú z metadát analýzy, z preparedDataFile alebo priamo z prílohy.',
      kedy_moze_chybat: 'Niektoré položky môžu byť prázdne, ak API neposlalo metadáta alebo súbor nemal názov/počet stĺpcov.',
      odporucanie: 'Ak nesedí počet riadkov alebo stĺpcov, skontrolujte vstupnú prílohu a import dát.',
    },
    {
      poradie: 3,
      list: '02 raw-data',
      cast: 'Pôvodné dáta',
      co_obsahuje: 'Riadky a stĺpce, ktoré boli použité ako vstup pre výpočty. Preferuje DATA_RAW, potom DATA_CLEAN, rawData, rawRows, dataRows, preparedRows alebo nahranú prílohu.',
      preco_je_dolezity: 'Bez raw dát nie je možné spätne overiť deskriptívu, škály, reliabilitu ani testy.',
      ako_sa_pocita: 'Raw-data sa nepočíta. Ide o priamy prepis vstupných dát po normalizácii objektov/zoznamov na text.',
      kedy_moze_chybat: 'Chýba, ak API nepošle raw dáta, príloha sa nedá prečítať alebo používateľ pošle iba hotový štatistický výsledok bez dát.',
      odporucanie: 'Pri probléme najprv overte, či tento list obsahuje skutočné dáta a nie hlásenie bez údajov.',
    },
    {
      poradie: 4,
      list: '03 frequencies',
      cast: 'Frekvenčné tabuľky',
      co_obsahuje: 'Početnosti kategórií, percentá, validné percentá a kumulatívne percentá pre kategorizované premenné.',
      preco_je_dolezity: 'Ukazuje rozdelenie odpovedí a kategórií podobne ako v štatistických programoch.',
      ako_sa_pocita: 'Pre každú kategóriu sa počíta počet výskytov. Percento = počet kategórie / počet všetkých odpovedí × 100. Validné percento ignoruje chýbajúce hodnoty.',
      kedy_moze_chybat: 'Chýba, ak výsledok neobsahuje frekvencie a z raw dát sa nenašli vhodné kategorizované stĺpce.',
      odporucanie: 'Pre dotazníkové odpovede kontrolujte, či sú kategórie správne zakódované a nie sú pomiešané texty s číslami.',
    },
    {
      poradie: 5,
      list: '04 data-quality',
      cast: 'Kontrola kvality dát',
      co_obsahuje: 'Počet validných a chýbajúcich hodnôt, typy stĺpcov, počet unikátnych hodnôt, upozornenia a odporúčania.',
      preco_je_dolezity: 'Odhaľuje dôvody, prečo výpočty môžu chýbať alebo vychádzať nesprávne.',
      ako_sa_pocita: 'Pre každý stĺpec sa počíta valid = neprázdne hodnoty, missing = prázdne hodnoty, missing_percent = missing / počet riadkov × 100, unique = počet jedinečných hodnôt.',
      kedy_moze_chybat: 'Nemal by chýbať. Ak nepríde qualityReport, systém sa ho pokúsi dopočítať z raw dát.',
      odporucanie: 'Ak je missing vysoký alebo typ stĺpca nesedí, opravte vstupný Excel alebo mapovanie premenných.',
    },
    {
      poradie: 6,
      list: '05 descriptives',
      cast: 'Deskriptívna štatistika škál/subškál',
      co_obsahuje: 'Valid, missing, priemer, medián, modus, smerodajnú odchýlku, rozptyl, minimum, maximum, kvartily, IQR, šikmosť a špicatosť podľa dostupných hodnôt.',
      preco_je_dolezity: 'Je základom akademickej interpretácie výsledkov a porovnania škál.',
      ako_sa_pocita: 'Mean = súčet hodnôt / N. Median = stredná hodnota zoradeného súboru. SD = výberová smerodajná odchýlka. Variance = výberový rozptyl. Q1/Q3 sú 25. a 75. percentil.',
      kedy_moze_chybat: 'Chýba, ak sa nenašli číselné hodnoty alebo škály/subškály nemajú aspoň použiteľné skóre.',
      odporucanie: 'Ak chcete odborné škály, zadajte definície položiek, napríklad Podpora rodiny: Q1, Q2, Q3.',
    },
    {
      poradie: 7,
      list: '06 normality',
      cast: 'Kontrola normality',
      co_obsahuje: 'Orientačnú alebo dodanú kontrolu normality, štatistiku, p-hodnotu a odporúčanie Pearson/Spearman alebo parametrické/neparametrické testy.',
      preco_je_dolezity: 'Normalita rozhoduje, či použiť parametrické alebo neparametrické testy.',
      ako_sa_pocita: 'Ak nie je dostupný formálny test, systém používa orientačnú kontrolu šikmosti a špicatosti: približne normálne, ak |skewness| ≤ 1 a |kurtosis| ≤ 2.',
      kedy_moze_chybat: 'Chýba, ak nie je dosť číselných hodnôt. Orientačne sa vyžaduje aspoň približne 8 validných hodnôt.',
      odporucanie: 'Pri malých vzorkách interpretujte normalitu opatrne a zvážte neparametrické testy.',
    },
    {
      poradie: 8,
      list: '07 reliability',
      cast: 'Cronbachovo alfa',
      co_obsahuje: 'Reliabilitu škál/subškál, počet položiek, počet kompletných riadkov, použité položky a interpretáciu vnútornej konzistencie.',
      preco_je_dolezity: 'Overuje, či položky v jednej škále merajú spoločný konštrukt.',
      ako_sa_pocita: 'Cronbach alfa = k/(k-1) × (1 - súčet rozptylov položiek / rozptyl celkového skóre), kde k je počet položiek. Potrebné sú aspoň 2 položky a aspoň 2 kompletné riadky.',
      kedy_moze_chybat: 'Chýba, ak škála obsahuje iba jednu položku, položky sa nespárovali s názvami stĺpcov alebo je nulový rozptyl celkového skóre.',
      odporucanie: 'Pre reliabilitu vždy zadajte presné položky škál/subškál a min/max pri reverzných položkách.',
    },
    {
      poradie: 9,
      list: '08 correlations',
      cast: 'Odporúčané korelácie',
      co_obsahuje: 'Korelačné páry vybrané podľa normality dát. Použije Pearson pri približnej normalite, inak Spearman.',
      preco_je_dolezity: 'Znižuje riziko nesprávne zvoleného korelačného testu.',
      ako_sa_pocita: 'Pearson pracuje s lineárnym vzťahom číselných hodnôt. Spearman pracuje s poradím hodnôt. Výstupom je koeficient r/rho a p-hodnota, ak sú dostupné.',
      kedy_moze_chybat: 'Chýba, ak nie sú aspoň dve číselné premenné alebo skóre škál.',
      odporucanie: 'Pri dotazníkoch porovnávajte hlavne vypočítané škály/subškály, nie jednotlivé položky.',
    },
    {
      poradie: 10,
      list: '09 Škály podškály',
      cast: 'Definície a súhrn škál/subškál',
      co_obsahuje: 'Názov škály, položky, použité položky, reverzné položky, min/max, spôsob skórovania, valid, missing, mean, median, SD, min, max, zdroj a poznámku.',
      preco_je_dolezity: 'Je to hlavný akademický list pre kontrolu, z čoho sa škály počítali a aké majú súhrnné hodnoty.',
      ako_sa_pocita: 'Pre každú škálu sa spárujú zadané položky so stĺpcami. Skóre riadku = súčet alebo priemer položiek podľa nastavenia skoring. Súhrnné hodnoty sa počítajú zo skóre všetkých validných riadkov.',
      kedy_moze_chybat: 'Hodnoty chýbajú, ak systém našiel iba definíciu, ale nenašiel položky v raw dátach. Ak je škála automaticky rozpoznaná z jedného stĺpca, reliabilita nebude možná.',
      odporucanie: 'Pre presné výsledky zadávajte definície napríklad: Rodinná súdržnosť: Q1, Q2, Q3; skoring=mean; min=1; max=5.',
    },
    {
      poradie: 11,
      list: '10 Skóre škál',
      cast: 'Skóre po respondentoch',
      co_obsahuje: 'Vypočítané skóre každej škály/subškály pre každý riadok/respondenta.',
      preco_je_dolezity: 'Umožňuje kontrolu, z akých konkrétnych hodnôt vznikli priemery, korelácie a testy.',
      ako_sa_pocita: 'Pre každý riadok sa vezmú položky škály. Pri mean sa spočíta priemer položiek, pri sum sa spočíta súčet. Reverzná položka sa prepočíta ako min + max - hodnota.',
      kedy_moze_chybat: 'Chýba, ak nie sú raw dáta alebo definície škál/subškál.',
      odporucanie: 'Ak sa skóre neobjaví, skontrolujte názvy položiek v definícii a v raw dátach.',
    },
    {
      poradie: 12,
      list: '11 Pearson',
      cast: 'Parametrické korelácie',
      co_obsahuje: 'Pearsonove korelácie medzi číselnými premennými alebo škálami.',
      preco_je_dolezity: 'Používa sa pri približne normálnych dátach a lineárnych vzťahoch.',
      ako_sa_pocita: 'r = kovariancia premenných / súčin ich smerodajných odchýlok. Hodnota je od -1 po 1.',
      kedy_moze_chybat: 'Chýba pri nedostatku číselných premenných, nulovom rozptyle alebo malom počte validných párov.',
      odporucanie: 'Interpretujte spolu s p-hodnotou a veľkosťou vzorky.',
    },
    {
      poradie: 13,
      list: '12 Spearman',
      cast: 'Neparametrické korelácie',
      co_obsahuje: 'Spearmanove korelácie medzi premennými alebo škálami.',
      preco_je_dolezity: 'Vhodné pre ordinálne dáta, Likert škály alebo nenormálne rozdelenia.',
      ako_sa_pocita: 'Hodnoty sa najprv prevedú na poradia a následne sa počíta korelácia poradí.',
      kedy_moze_chybat: 'Chýba pri nedostatku validných párov alebo ak sa nedajú vytvoriť poradia.',
      odporucanie: 'Pre Likertové dotazníky je Spearman často bezpečnejšia voľba.',
    },
    {
      poradie: 14,
      list: '13 Corr matrix',
      cast: 'Korelačná matica',
      co_obsahuje: 'Maticové zobrazenie korelácií medzi viacerými premennými alebo škálami.',
      preco_je_dolezity: 'Rýchlo ukazuje štruktúru vzťahov medzi premennými.',
      ako_sa_pocita: 'Každá bunka predstavuje koreláciu medzi dvojicou premenných. Diagonála je spravidla 1.',
      kedy_moze_chybat: 'Chýba, ak neexistujú aspoň dve vhodné číselné premenné.',
      odporucanie: 'Silné korelácie ďalej interpretujte vecne, nie iba podľa čísla.',
    },
    {
      poradie: 15,
      list: '14 Chart data',
      cast: 'Dáta pre grafy',
      co_obsahuje: 'Podkladové tabuľky, z ktorých sa vytvárajú grafické listy.',
      preco_je_dolezity: 'Umožňuje kontrolu, či graf vznikol zo správnych údajov.',
      ako_sa_pocita: 'Hodnoty sa preberajú zo štatistických tabuliek alebo z chartData/chartTables vo výsledku API.',
      kedy_moze_chybat: 'Chýba, ak nie sú dostupné vhodné číselné dáta pre grafy.',
      odporucanie: 'Ak graf nevyzerá správne, porovnajte ho s týmto listom.',
    },
    {
      poradie: 16,
      list: '16 Param testy',
      cast: 'Parametrické testy',
      co_obsahuje: 't-test, ANOVA alebo iné parametrické porovnania podľa dostupných skupín a premenných.',
      preco_je_dolezity: 'Testuje rozdiely pri približne normálnych dátach.',
      ako_sa_pocita: 't-test porovnáva priemery dvoch skupín. ANOVA porovnáva priemery troch a viac skupín. Výstupom je štatistika, df a p-hodnota, ak sú dostupné.',
      kedy_moze_chybat: 'Chýba, ak nie je skupinová premenná, závislá číselná premenná alebo sú nesplnené podmienky.',
      odporucanie: 'Zadajte groupVariables/groupingColumns, ak chcete presné skupinové testy.',
    },
    {
      poradie: 17,
      list: '17 Neparam testy',
      cast: 'Neparametrické testy',
      co_obsahuje: 'Mann-Whitney, Kruskal-Wallis alebo iné neparametrické porovnania.',
      preco_je_dolezity: 'Používa sa pri nenormálnych dátach, ordinálnych dátach alebo malých vzorkách.',
      ako_sa_pocita: 'Testy pracujú s poradím hodnôt namiesto priamych priemerov. Výstupom je testová štatistika a p-hodnota, ak sú dostupné.',
      kedy_moze_chybat: 'Chýba, ak nie je skupinová premenná alebo nie sú validné hodnoty v porovnávaných skupinách.',
      odporucanie: 'Pri Likertových dátach preferujte neparametrické testy, ak normalita nevychádza.',
    },
    {
      poradie: 18,
      list: '18 Kontingencne tab',
      cast: 'Kontingenčné tabuľky',
      co_obsahuje: 'Krížové tabuľky kategorizovaných premenných.',
      preco_je_dolezity: 'Ukazuje vzťah medzi dvoma kategóriami, napríklad pohlavie × odpoveď.',
      ako_sa_pocita: 'Počíta sa počet výskytov každej kombinácie kategórií riadok × stĺpec.',
      kedy_moze_chybat: 'Chýba, ak nie sú aspoň dve kategorizované premenné.',
      odporucanie: 'Skontrolujte, či kategórie nie sú zbytočne rozdelené rôznym zápisom.',
    },
    {
      poradie: 19,
      list: '19 Chi-square',
      cast: 'Chí-kvadrát test',
      co_obsahuje: 'Test nezávislosti kategorizovaných premenných.',
      preco_je_dolezity: 'Overuje, či rozdelenie kategórií súvisí s inou kategóriou.',
      ako_sa_pocita: 'Porovnáva pozorované a očakávané početnosti: χ² = súčet (O - E)² / E.',
      kedy_moze_chybat: 'Chýba, ak nie sú kontingenčné tabuľky alebo očakávané početnosti nie sú vhodné.',
      odporucanie: 'Pri malých početnostiach interpretujte opatrne alebo použite vhodnú alternatívu.',
    },
    {
      poradie: 20,
      list: '20 Odpor testy',
      cast: 'Odporúčané testovanie',
      co_obsahuje: 'Automatické odporúčania, ktoré testy sú vhodné podľa typu premenných, normality a skupín.',
      preco_je_dolezity: 'Pomáha používateľovi, ktorý nevie, aký test má použiť.',
      ako_sa_pocita: 'Systém vyhodnotí typy premenných, počet skupín a normalitu. Potom odporučí koreláciu, t-test/ANOVA alebo neparametrickú alternatívu.',
      kedy_moze_chybat: 'Chýba, ak nie sú dostupné typy premenných alebo dostatok dát.',
      odporucanie: 'Odporúčanie berte ako metodickú pomôcku, nie ako náhradu odborného posúdenia.',
    },
    {
      poradie: 21,
      list: '21 Odpor grafy',
      cast: 'Odporúčané grafy',
      co_obsahuje: 'Návrhy grafov pre frekvencie, deskriptívu, korelácie, reliabilitu a skupinové porovnania.',
      preco_je_dolezity: 'Pomáha vytvoriť vizuálne výstupy do práce alebo prezentácie.',
      ako_sa_pocita: 'Výber grafu závisí od typu dát: kategórie → stĺpcový/koláčový graf, škály → stĺpcový graf priemerov, korelácie → heatmap/matica.',
      kedy_moze_chybat: 'Chýba, ak sa nedajú identifikovať vhodné dáta pre graf.',
      odporucanie: 'Grafy používajte najmä zo škál/subškál, nie z nespracovaných textových položiek.',
    },
  ];
}

function addWorkbookHelperSheet(workbook: XLSX.WorkBook) {
  addJsonSheet(workbook, '00 Pomocnik', buildWorkbookHelperRows() as unknown as AnyRecord[]);
}

function getTableDefinitions(result: unknown, preparedDataFile: ExportPayload['preparedDataFile']): ExportTableDefinition[] {
  return [
    { sheetName: '01 overview', title: 'Prehľad exportu', description: 'Základné informácie o analýze.', rows: flattenOverview(result, preparedDataFile) },
    { sheetName: '02 raw-data', title: 'Raw dáta', description: 'Dáta použité pri analýze.', rows: flattenRawData(result, preparedDataFile) },
    { sheetName: '03 frequencies', title: 'Frekvenčné tabuľky', description: 'Početnosti a percentá odpovedí.', rows: flattenFrequencies(result) },
    { sheetName: '04 data-quality', title: 'Kontrola kvality dát', description: 'Upozornenia a kontrola vstupného súboru.', rows: flattenDataQuality(result, preparedDataFile) },
    { sheetName: '05 descriptives', title: 'Deskriptívna štatistika', description: 'V hlavných výstupoch sú ponechané najmä vypočítané škály a subškály; jednotlivé položky zostávajú kontrolovateľné v raw-data a data-quality.', rows: flattenDescriptiveRows(result, preparedDataFile) },
    { sheetName: '06 normality', title: 'Normalita dát', description: 'Vyhodnotenie normality iba pre vypočítané škály/subškály a odporúčanie Pearson/Spearman.', rows: flattenNormalityRows(result, preparedDataFile) },
    { sheetName: '07 reliability', title: 'Reliabilita', description: 'Cronbachovo alfa pre škály a subškály vypočítané z položiek dotazníka.', rows: flattenReliabilityRows(result, preparedDataFile) },
    { sheetName: '08 correlations', title: 'Odporúčané korelácie', description: 'Korelácie zvolené podľa normality dát.', rows: flattenCorrelationRows(result, 'recommended', preparedDataFile) },
    { sheetName: '09 Škály podškály', title: 'Škály a subškály', description: 'Definície, vypočítané skóre a deskriptíva škál/subškál.', rows: flattenScaleRows(result, preparedDataFile) },
    { sheetName: '10 Skóre škál', title: 'Skóre škál a subškál po riadkoch', description: 'Skóre škál/subškál vypočítané pre každého respondenta alebo záznam.', rows: flattenScaleScoreRows(result, preparedDataFile) },
    { sheetName: '11 Pearson', title: 'Pearsonove korelácie', description: 'Parametrické korelácie.', rows: flattenCorrelationRows(result, 'pearson', preparedDataFile) },
    { sheetName: '12 Spearman', title: 'Spearmanove korelácie', description: 'Neparametrické korelácie.', rows: flattenCorrelationRows(result, 'spearman', preparedDataFile) },
    { sheetName: '13 Corr matrix', title: 'Korelačná matica', description: 'Maticový výstup korelácií.', rows: flattenCorrelationMatrix(result, preparedDataFile) },
    { sheetName: '14 Chart data', title: 'Dáta pre grafy', description: 'Podkladové dáta grafických výstupov.', rows: flattenChartData(result) },
    { sheetName: '16 Param testy', title: 'Parametrické testy', description: 't-test a ANOVA podľa normálnosti a počtu skupín.', rows: flattenParametricTests(result, preparedDataFile) },
    { sheetName: '17 Neparam testy', title: 'Neparametrické testy', description: 'Mann-Whitney a Kruskal-Wallis.', rows: flattenNonParametricTests(result, preparedDataFile) },
    { sheetName: '18 Kontingencne tab', title: 'Kontingenčné tabuľky', description: 'Podklady pre kategorizované premenné.', rows: buildContingencyTables(result) },
    { sheetName: '19 Chi-square', title: 'Chí-kvadrát', description: 'Súhrny pre chí-kvadrát testy.', rows: buildChiSquareTests(result) },
    { sheetName: '20 Odpor testy', title: 'Odporúčané testy', description: 'Odporúčané štatistické testovanie.', rows: flattenRecommendedTests(result) },
    { sheetName: '21 Odpor grafy', title: 'Odporúčané grafy', description: 'Odporúčané grafické výstupy.', rows: flattenRecommendedCharts(result) },
  ];
}

function buildPieChartSections(result: unknown): DashboardPieSection[] {
  const frequencies = [
    ...asRecords(getNestedValue(result, ['frequencies'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'frequencies'])),
  ];

  const sections: DashboardPieSection[] = [];

  frequencies.forEach((frequency, index) => {
    const variable = String(frequency['variable'] || frequency['name'] || `Premenná ${index + 1}`).trim();
    const values = asRecords(frequency['values'] || frequency['items']);
    const points = buildChartPoints(
      values,
      ['value', 'label', 'category', 'hodnota'],
      ['count', 'pocet', 'frequency'],
      8,
    );

    if (points.length >= 2) {
      sections.push({
        key: `pie-${index + 1}`,
        title: `Koláčový graf – ${variable}`,
        points,
      });
    }
  });

  if (sections.length > 0) return sections.slice(0, EXCEL_EXPORT_LIMITS.maxPieSections);

  const contingency = buildContingencyTables(result);
  const grouped = new Map<string, AnyRecord[]>();
  contingency.forEach((row) => {
    const key = String(row.tabulka || 'Kontingenčná tabuľka');
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  });

  grouped.forEach((rows, key) => {
    const points = buildChartPoints(rows, ['stlpec', 'riadok'], ['count'], 8);
    if (points.length >= 2) {
      sections.push({ key: `pie-${key}`, title: `Koláčový graf – ${key}`, points });
    }
  });

  return sections.slice(0, EXCEL_EXPORT_LIMITS.maxPieSections);
}

function chartSectionForTable(definition: ExportTableDefinition): ChartSection | null {
  const rows = asRecords(definition.rows);

  const exact = chartSectionFromRows({
    key: `table-chart-${definition.sheetName}`,
    title: `Graf k tabuľke – ${definition.title}`,
    description: definition.description,
    rows,
    labelKeys: ['premenna', 'nazov', 'skala', 'hodnota', 'kategoria', 'stlpec', 'zavisla_premenna', 'premenná', 'variable', 'name', 'label'],
    valueKeys: ['mean', 'priemer', 'pocet', 'count', 'frequency', 'percento', 'valid', 'missing', 'cronbach_alpha', 'r', 'rho', 'statistika', 'p_hodnota', 'hodnota'],
    valueLabel: 'Hodnota',
    kind: definition.sheetName.toLowerCase().includes('correlation') || definition.sheetName.toLowerCase().includes('pearson') || definition.sheetName.toLowerCase().includes('spearman') ? 'correlation' : definition.sheetName.toLowerCase().includes('reliability') ? 'reliability' : 'bar',
    limit: 18,
  });

  return exact;
}

async function loadExcelJs(): Promise<any> {
  /*
   * DÔLEŽITÉ PRE VERCEL:
   * Nepoužívame dynamický import cez new Function('return import(moduleName)').
   * Next/Vercel bundler takýto import nevie spoľahlivo vystopovať a exceljs sa nemusí
   * dostať do serverless buildu. Výsledok bol x-zedpera-excel-charts: fallback.
   *
   * Statický import `import ExcelJS from 'exceljs';` hore v súbore zabezpečí,
   * že exceljs bude súčasťou produkčného serverového bundlu.
   */
  return ExcelJS;
}

function setCellStyle(cell: any, options: { header?: boolean; title?: boolean; subtitle?: boolean; fill?: string } = {}) {
  cell.alignment = { vertical: 'middle', horizontal: options.title ? 'center' : 'left', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  if (options.title) {
    cell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    return;
  }

  if (options.subtitle) {
    cell.font = { bold: true, italic: true, color: { argb: 'FF334155' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    return;
  }

  if (options.header) {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill || 'FF1D4ED8' } };
    return;
  }

  cell.font = { color: { argb: 'FF111827' } };
  if (options.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill } };
  }
}

function getProfessionalFillForCell(header: string, value: unknown, rowIndex: number): string {
  const normalizedHeader = normalizeReliabilityItemName(header);
  const text = String(value ?? '').trim().toLowerCase();
  const numeric = toFiniteNumber(value);

  if (text.includes('error') || text.includes('chyba') || text.includes('chýba') || text.includes('chybaju') || text.includes('nízka')) {
    return 'FFFEE2E2';
  }

  if (text.includes('warning') || text.includes('upozornen') || text.includes('hranič') || text.includes('hranic')) {
    return 'FFFEF3C7';
  }

  if (text === 'ok' || text.includes('výborn') || text.includes('dobrá') || text.includes('dobra') || text.includes('akceptovateľ')) {
    return 'FFDCFCE7';
  }

  if (normalizedHeader.includes('cronbach') || normalizedHeader === 'alpha') {
    if (numeric === null) return rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    if (numeric >= 0.7) return 'FFDCFCE7';
    if (numeric >= 0.6) return 'FFFEF3C7';
    return 'FFFEE2E2';
  }

  if (normalizedHeader.includes('phodnota') || normalizedHeader === 'pvalue') {
    if (numeric === null) return rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    return numeric < 0.05 ? 'FFDCFCE7' : 'FFF8FAFC';
  }

  if (normalizedHeader.includes('missing') || normalizedHeader.includes('chybaj')) {
    if (numeric !== null && numeric > 0) return 'FFFEF3C7';
  }

  return rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
}

function applyProfessionalNumberFormat(cell: any, header: string, value: unknown) {
  const normalizedHeader = normalizeReliabilityItemName(header);

  if (typeof value !== 'number' || !Number.isFinite(value)) return;

  if (
    normalizedHeader.includes('percent') ||
    normalizedHeader.includes('podiel')
  ) {
    cell.numFmt = '0.00%';
    return;
  }

  if (
    normalizedHeader.includes('mean') ||
    normalizedHeader.includes('priemer') ||
    normalizedHeader.includes('median') ||
    normalizedHeader.includes('sd') ||
    normalizedHeader.includes('variance') ||
    normalizedHeader.includes('cronbach') ||
    normalizedHeader.includes('alpha') ||
    normalizedHeader.includes('phodnota') ||
    normalizedHeader.includes('pvalue') ||
    normalizedHeader === 'r' ||
    normalizedHeader === 'rho'
  ) {
    cell.numFmt = '0.0000';
    return;
  }

  cell.numFmt = Number.isInteger(value) ? '0' : '0.00';
}

function addRowsAsProfessionalTable(
  worksheet: any,
  rows: AnyRecord[],
  startRow: number,
  preferredHeaders: string[] = [],
) {
  const finalRows = rows.length ? normalizeRowsForExcel(rows) : [{ stav: 'bez údajov', poznamka: 'Pre túto tabuľku nie sú dostupné dáta.' }];
  const headers = getAllHeadersFromRows(finalRows, preferredHeaders);
  const normalizedFinalRows = normalizeRowsToHeaders(finalRows, headers);
  const headerRow = worksheet.getRow(startRow);

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    setCellStyle(cell, { header: true, fill: index % 2 === 0 ? 'FF1D4ED8' : 'FF2563EB' });
    worksheet.getColumn(index + 1).width = Math.min(Math.max(header.length + 8, 18), 46);
  });

  normalizedFinalRows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(startRow + rowIndex + 1);
    headers.forEach((header, index) => {
      const cell = excelRow.getCell(index + 1);
      const value = toExcelValueForExcelJs(row[header]);
      const fill = getProfessionalFillForCell(header, row[header], rowIndex);
      cell.value = value;
      setCellStyle(cell, { fill });
      applyProfessionalNumberFormat(cell, header, value);
    });
  });

  worksheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: startRow + finalRows.length, column: headers.length },
  };

  return {
    rowCount: finalRows.length,
    columnCount: headers.length,
  };
}

function toExcelValueForExcelJs(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value) || typeof value === 'object') return stringifyValue(value);
  return String(value);
}

function addSectionDataTable(worksheet: any, section: ChartSection | DashboardPieSection, startRow: number, startColumn: number) {
  worksheet.getRow(startRow).getCell(startColumn).value = 'Kategória';
  worksheet.getRow(startRow).getCell(startColumn + 1).value = 'Hodnota';
  worksheet.getRow(startRow).getCell(startColumn + 2).value = 'Podiel';
  [0, 1, 2].forEach((offset) => setCellStyle(worksheet.getRow(startRow).getCell(startColumn + offset), { header: true, fill: 'FF0F172A' }));

  const total = Math.max(section.points.reduce((sum, point) => sum + Math.max(0, point.value), 0), 1);

  section.points.forEach((point, index) => {
    const row = worksheet.getRow(startRow + index + 1);
    const color = PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length];
    row.getCell(startColumn).value = point.label;
    row.getCell(startColumn + 1).value = point.value;
    row.getCell(startColumn + 2).value = point.value / total;
    row.getCell(startColumn + 2).numFmt = '0.0%';
    row.getCell(startColumn).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
    row.getCell(startColumn).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    setCellStyle(row.getCell(startColumn + 1));
    setCellStyle(row.getCell(startColumn + 2));
  });
}

function addWorksheetImage(workbook: any, worksheet: any, pngBuffer: Buffer, col: number, row: number, width: number, height: number) {
  const imageId = workbook.addImage({ buffer: pngBuffer, extension: 'png' });
  worksheet.addImage(imageId, {
    tl: { col, row },
    ext: { width, height },
  });
}


function addHelperWorksheet(workbook: any) {
  const worksheet = workbook.addWorksheet('00 Pomocnik', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    properties: { tabColor: { argb: 'FF0F172A' } },
  });

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'ZEDPERA – pomocník k Excel exportu analýzy dát';
  setCellStyle(worksheet.getCell('A1'), { title: true });
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = 'Tento prvý list vysvetľuje každý hárok, každú časť výstupu, spôsob výpočtu a dôvod, prečo niektoré hodnoty môžu chýbať.';
  setCellStyle(worksheet.getCell('A2'), { subtitle: true });

  worksheet.mergeCells('A3:H3');
  worksheet.getCell('A3').value = 'Kľúčové pravidlo: odborné škály a subškály sa nedajú spoľahlivo uhádnuť z ľubovoľného Excelu. Ak používateľ nezadá definície škál, systém vytvorí iba automaticky rozpoznané/orientačné škály z číselných alebo Likert položiek a jasne označí ich zdroj.';
  setCellStyle(worksheet.getCell('A3'), { fill: 'FFFEF3C7' });

  worksheet.mergeCells('A4:H4');
  worksheet.getCell('A4').value = 'Príklad definície: Rodinná súdržnosť: Q1, Q2, Q3; Podpora priateľov: Q4 až Q6; skoring=mean; min=1; max=5; reverzné položky=Q2.';
  setCellStyle(worksheet.getCell('A4'), { fill: 'FFDCFCE7' });

  worksheet.mergeCells('A5:H5');
  worksheet.getCell('A5').value = 'Vercel optimalizácia: listy 22–37 sa negenerujú. Export ostáva metodicky kompletný, ale grafy sú sústredené na 01 Dashboard a číselné podklady ku grafom sú v liste 14 Chart data.';
  setCellStyle(worksheet.getCell('A5'), { fill: 'FFE0F2FE' });

  addRowsAsProfessionalTable(
    worksheet,
    buildWorkbookHelperRows() as unknown as AnyRecord[],
    7,
    ['poradie', 'list', 'cast', 'co_obsahuje', 'preco_je_dolezity', 'ako_sa_pocita', 'kedy_moze_chybat', 'odporucanie'],
  );

  worksheet.getColumn(1).width = 10;
  worksheet.getColumn(2).width = 24;
  worksheet.getColumn(3).width = 28;
  worksheet.getColumn(4).width = 48;
  worksheet.getColumn(5).width = 48;
  worksheet.getColumn(6).width = 56;
  worksheet.getColumn(7).width = 48;
  worksheet.getColumn(8).width = 48;
}

function addDashboardWorksheet(workbook: any, result: unknown, preparedDataFile: ExportPayload['preparedDataFile']) {
  const worksheet = workbook.addWorksheet('01 Dashboard', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: 'FF0F172A' } },
  });

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'ZEDPERA – profesionálny dashboard analýzy dát';
  setCellStyle(worksheet.getCell('A1'), { title: true });
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = 'Druhá strana obsahuje prehľad, koláčové grafy a hlavné grafické výstupy. Prvý list Pomocnik vysvetľuje metodiku exportu.';
  setCellStyle(worksheet.getCell('A2'), { subtitle: true });

  const overview = flattenOverview(result, preparedDataFile);
  addRowsAsProfessionalTable(worksheet, overview, 4);

  const pieSections = buildPieChartSections(result).slice(0, EXCEL_EXPORT_LIMITS.maxDashboardPieSections);
  const chartSections = buildChartSections(result, preparedDataFile).slice(0, EXCEL_EXPORT_LIMITS.maxDashboardBarSections);
  let imageRow = 12;

  pieSections.forEach((section, index) => {
    const col = index % 2 === 0 ? 0 : 5;
    const row = imageRow + Math.floor(index / 2) * 17;
    worksheet.getRow(row).getCell(col + 1).value = section.title;
    setCellStyle(worksheet.getRow(row).getCell(col + 1), { header: true, fill: 'FF7C3AED' });
    addWorksheetImage(workbook, worksheet, renderPieChartPng(section, EXCEL_EXPORT_LIMITS.piePngWidth, EXCEL_EXPORT_LIMITS.piePngHeight), col, row, EXCEL_EXPORT_LIMITS.pieDisplayWidth, EXCEL_EXPORT_LIMITS.pieDisplayHeight);
    addSectionDataTable(worksheet, section, row + 13, col + 1);
  });

  imageRow = 48;
  chartSections.forEach((section, index) => {
    const col = index % 2 === 0 ? 0 : 5;
    const row = imageRow + Math.floor(index / 2) * 19;
    worksheet.getRow(row).getCell(col + 1).value = section.title;
    setCellStyle(worksheet.getRow(row).getCell(col + 1), { header: true, fill: 'FF059669' });
    addWorksheetImage(workbook, worksheet, renderBarChartPng(section, EXCEL_EXPORT_LIMITS.barPngWidth, EXCEL_EXPORT_LIMITS.barPngHeight), col, row, EXCEL_EXPORT_LIMITS.barDisplayWidth, EXCEL_EXPORT_LIMITS.barDisplayHeight);
  });

  for (let column = 1; column <= 10; column += 1) {
    worksheet.getColumn(column).width = column % 5 === 0 ? 4 : 24;
  }
}

function addProfessionalWorksheetWithChart(workbook: any, definition: ExportTableDefinition, index: number) {
  const worksheet = workbook.addWorksheet(safeSheetName(definition.sheetName), {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
    properties: { tabColor: { argb: `FF${PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}` } },
  });

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = definition.title;
  setCellStyle(worksheet.getCell('A1'), { title: true });

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = definition.description;
  setCellStyle(worksheet.getCell('A2'), { subtitle: true });

  const tableMeta = addRowsAsProfessionalTable(
    worksheet,
    asRecords(definition.rows),
    4,
    getPreferredHeadersForSheet(definition.sheetName),
  );
  const chartSection = index < EXCEL_EXPORT_LIMITS.maxPerTableCharts
    ? chartSectionForTable(definition)
    : null;

  if (chartSection && chartSection.points.length > 0) {
    try {
      const imageStartRow = 5;
      const imageStartCol = Math.min(Math.max(tableMeta.columnCount + 2, 6), 10);
      worksheet.getRow(4).getCell(imageStartCol).value = `Graf k tabuľke – ${definition.title}`;
      setCellStyle(worksheet.getRow(4).getCell(imageStartCol), { header: true, fill: 'FF7C3AED' });
      addWorksheetImage(
        workbook,
        worksheet,
        renderBarChartPng(chartSection, EXCEL_EXPORT_LIMITS.barPngWidth, EXCEL_EXPORT_LIMITS.barPngHeight),
        imageStartCol - 1,
        imageStartRow,
        EXCEL_EXPORT_LIMITS.barDisplayWidth,
        EXCEL_EXPORT_LIMITS.barDisplayHeight,
      );
      addSectionDataTable(worksheet, chartSection, imageStartRow + 18, imageStartCol);
    } catch (error) {
      const noteCell = worksheet.getRow(4).getCell(Math.min(Math.max(tableMeta.columnCount + 2, 6), 10));
      noteCell.value = 'Graf sa nepodarilo vložiť, tabuľkové dáta zostali zachované.';
      setCellStyle(noteCell, { header: true, fill: 'FFF59E0B' });
      console.warn('[api/analyze-data/export] Graf hárka sa nepodarilo vložiť:', definition.sheetName, error);
    }
  }
}

function addStandaloneChartWorksheets(
  workbook: any,
  result: unknown,
  preparedDataFile?: ExportPayload['preparedDataFile'],
) {
  // Vypnuté zámerne: samostatné grafové listy 22–37 boli najväčší dôvod pomalého exportu.
  // Grafy ostávajú na 01 Dashboard a dátové podklady ostávajú v 14 Chart data.
  void workbook;
  void result;
  void preparedDataFile;
}

function getLeadingSheetNumber(sheetName: string): number | null {
  const match = String(sheetName || '').trim().match(/^(\d{1,2})(?:\s|\b|[-_])/);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function removeForbiddenNumberedSheets(workbook: any) {
  const sheets = Array.isArray(workbook?.worksheets) ? [...workbook.worksheets] : [];

  sheets.forEach((worksheet: any) => {
    const number = getLeadingSheetNumber(worksheet?.name);
    if (
      number !== null &&
      number >= EXCEL_EXPORT_LIMITS.removeNumberedSheetsFrom &&
      number <= EXCEL_EXPORT_LIMITS.removeNumberedSheetsTo
    ) {
      workbook.removeWorksheet(worksheet.id);
    }
  });
}

function assertNoForbiddenNumberedSheets(workbook: any) {
  const sheets = Array.isArray(workbook?.worksheets) ? workbook.worksheets : [];
  const forbidden = sheets
    .map((worksheet: any) => String(worksheet?.name || ''))
    .filter((name: string) => {
      const number = getLeadingSheetNumber(name);
      return (
        number !== null &&
        number >= EXCEL_EXPORT_LIMITS.removeNumberedSheetsFrom &&
        number <= EXCEL_EXPORT_LIMITS.removeNumberedSheetsTo
      );
    });

  if (forbidden.length > 0) {
    throw new Error(`Excel export stále obsahuje zakázané listy 22–37: ${forbidden.join(', ')}`);
  }
}



async function buildProfessionalExcelTablesOnly(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): Promise<Buffer | null> {
  try {
    const ExcelJSRuntime = await loadExcelJs();
    const workbook = new ExcelJSRuntime.Workbook();
    workbook.creator = 'ZEDPERA';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.views = [{ x: 0, y: 0, width: 18000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    addHelperWorksheet(workbook);

    const dashboard = workbook.addWorksheet('01 Dashboard', {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: 'FF0F172A' } },
    });
    dashboard.mergeCells('A1:H1');
    dashboard.getCell('A1').value = 'ZEDPERA – profesionálny export analýzy dát';
    setCellStyle(dashboard.getCell('A1'), { title: true });
    dashboard.mergeCells('A2:H2');
    dashboard.getCell('A2').value = 'Farebný Excel export bez obrázkov grafov – tabuľkové dáta, raw-data, data-quality, škály, skóre a reliabilita sú zachované.';
    setCellStyle(dashboard.getCell('A2'), { subtitle: true });
    addRowsAsProfessionalTable(dashboard, flattenOverview(result, preparedDataFile), 4);

    getTableDefinitions(result, preparedDataFile).forEach((definition, index) => {
      const worksheet = workbook.addWorksheet(safeSheetName(definition.sheetName), {
        views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
        properties: { tabColor: { argb: `FF${PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}` } },
      });

      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = definition.title;
      setCellStyle(worksheet.getCell('A1'), { title: true });
      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = definition.description;
      setCellStyle(worksheet.getCell('A2'), { subtitle: true });
      addRowsAsProfessionalTable(
        worksheet,
        asRecords(definition.rows),
        4,
        getPreferredHeadersForSheet(definition.sheetName),
      );
    });

    removeForbiddenNumberedSheets(workbook);
    assertNoForbiddenNumberedSheets(workbook);

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output as ArrayBuffer);
  } catch (error) {
    console.error('[api/analyze-data/export] ExcelJS tabuľkový export zlyhal:', error);
    return null;
  }
}

async function buildProfessionalExcelWithRenderedCharts(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): Promise<Buffer | null> {
  try {
    const ExcelJSRuntime = await loadExcelJs();

    const workbook = new ExcelJSRuntime.Workbook();
    workbook.creator = 'ZEDPERA';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.views = [{ x: 0, y: 0, width: 18000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

    addHelperWorksheet(workbook);
    addDashboardWorksheet(workbook, result, preparedDataFile);
    const definitions = getTableDefinitions(result, preparedDataFile);
    definitions.forEach((definition, index) => addProfessionalWorksheetWithChart(workbook, definition, index));
    addStandaloneChartWorksheets(workbook, result, preparedDataFile);

    removeForbiddenNumberedSheets(workbook);
    assertNoForbiddenNumberedSheets(workbook);

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output as ArrayBuffer);
  } catch (error) {
    console.error('[api/analyze-data/export] Rendered ExcelJS export zlyhal, používam farebný tabuľkový fallback:', error);
    return buildProfessionalExcelTablesOnly(result, preparedDataFile);
  }
}

function chartSectionToHtml(section: ChartSection): string {
  const maxAbsValue = Math.max(...section.points.map((item) => Math.abs(item.value)), 1);

  const rows = section.points
    .map((point) => {
      const width = section.kind === 'reliability'
        ? Math.max(2, Math.min(100, point.value * 100))
        : Math.max(2, Math.min(100, (Math.abs(point.value) / maxAbsValue) * 100));

      const color = section.kind === 'correlation' && point.value < 0
        ? '#dc2626'
        : section.kind === 'reliability'
          ? '#059669'
          : '#2563eb';

      return `
        <div class="chart-row">
          <div class="chart-label">${htmlEscape(point.label)}</div>
          <div class="chart-value">${htmlEscape(formatExportNumber(point.value))}${htmlEscape(section.valueSuffix || '')}</div>
          <div class="chart-track"><div class="chart-bar" style="width:${width}%;background:${color};"></div></div>
          ${point.description ? `<div class="chart-note">${htmlEscape(point.description)}</div>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <section class="chart-card">
      <h2>${htmlEscape(section.title)}</h2>
      <p>${htmlEscape(section.description)}</p>
      ${rows}
    </section>
  `;
}


function chartSectionToPieHtml(section: DashboardPieSection): string {
  const total = Math.max(section.points.reduce((sum, point) => sum + Math.max(0, point.value), 0), 1);
  let offset = 0;
  const stops = section.points.map((point, index) => {
    const start = offset;
    const end = offset + (Math.max(0, point.value) / total) * 100;
    offset = end;
    return `#${PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(', ');

  const rows = section.points.map((point, index) => `
    <tr>
      <td><span class="legend-dot" style="background:#${PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}"></span>${htmlEscape(point.label)}</td>
      <td>${htmlEscape(formatExportNumber(point.value))}</td>
      <td>${htmlEscape(formatExportNumber((point.value / total) * 100))} %</td>
    </tr>
  `).join('');

  return `
    <section class="chart-card pie-card">
      <h2>${htmlEscape(section.title)}</h2>
      <p>Koláčový graf podielov kategórií z celkového počtu odpovedí.</p>
      <div class="pie-layout">
        <div class="pie" style="background:conic-gradient(${stops});"></div>
        <table><tr><th>Kategória</th><th>Počet</th><th>Podiel</th></tr>${rows}</table>
      </div>
    </section>
  `;
}

function buildExportHtmlDocument(result: unknown, preparedDataFile: ExportPayload['preparedDataFile']): string {
  const overviewRows = flattenOverview(result, preparedDataFile);
  const chartSections = buildChartSections(result, preparedDataFile).slice(0, EXCEL_EXPORT_LIMITS.maxChartSections);
  const pieSections = buildPieChartSections(result).slice(0, EXCEL_EXPORT_LIMITS.maxPieSections);

  const overviewHtml = overviewRows
    .map((row) => `<tr><th>${htmlEscape(row.oblast)}</th><td>${htmlEscape(row.hodnota)}</td></tr>`)
    .join('');

  const pieHtml = pieSections.length
    ? pieSections.map((section) => chartSectionToPieHtml(section)).join('')
    : '';

  const chartsHtml = chartSections.length
    ? chartSections.map(chartSectionToHtml).join('')
    : `<div class="warning">Grafické podklady neboli dostupné.</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ZEDPERA – export analýzy dát</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; }
    h1 { font-size: 26px; margin: 0 0 8px; color: #0f172a; }
    h2 { font-size: 19px; margin: 0 0 6px; color: #0f172a; }
    p { margin: 0 0 14px; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0 24px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; font-size: 12px; }
    th { width: 32%; background: #e2e8f0; color: #0f172a; }
    .chart-card { page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; margin: 18px 0; background: #f8fafc; }
    .chart-row { display: grid; grid-template-columns: 180px 70px 1fr; gap: 10px; align-items: center; margin: 9px 0; }
    .chart-label { font-size: 12px; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
    .chart-value { font-size: 12px; font-weight: 700; color: #334155; text-align: right; }
    .chart-track { height: 16px; border-radius: 999px; background: #e2e8f0; overflow: hidden; border: 1px solid #cbd5e1; }
    .chart-bar { height: 100%; border-radius: 999px; }
    .chart-note { grid-column: 1 / -1; font-size: 11px; color: #64748b; margin-left: 260px; }
    .warning { padding: 14px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; }
    .pie-layout { display: grid; grid-template-columns: 220px 1fr; gap: 24px; align-items: center; }
    .pie { width: 210px; height: 210px; border-radius: 999px; border: 10px solid #f8fafc; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16); }
    .legend-dot { display: inline-block; width: 12px; height: 12px; border-radius: 999px; margin-right: 8px; vertical-align: middle; }
    .footer { margin-top: 28px; color: #64748b; font-size: 11px; }
  </style>
</head>
<body>
  <h1>ZEDPERA – výsledky analýzy dát</h1>
  <p>Export obsahuje tabuľky a profesionálne grafické výstupy vytvorené z dostupných štatistických dát.</p>
  <table>${overviewHtml}</table>
  ${pieHtml}
  ${chartsHtml}
  <div class="footer">Vygenerované: ${htmlEscape(new Date().toLocaleString('sk-SK'))}</div>
</body>
</html>`;
}

function buildPdfBuffer(result: unknown, preparedDataFile: ExportPayload['preparedDataFile']): Buffer {
  const sections = buildChartSections(result, preparedDataFile).slice(0, EXCEL_EXPORT_LIMITS.maxChartSections);
  const overview = flattenOverview(result, preparedDataFile);
  const pages: string[] = [];

  function textLine(x: number, y: number, size: number, text: string): string {
    return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET\n`;
  }

  function rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number): string {
    return `${r} ${g} ${b} rg ${x} ${y} ${Math.max(1, w)} ${h} re f\n`;
  }

  let first = '';
  first += textLine(50, 790, 18, 'ZEDPERA - vysledky analyzy dat');
  first += textLine(50, 765, 10, 'Export obsahuje graficke vystupy vytvorene zo statistickych dat.');
  let y = 735;
  overview.forEach((row) => {
    first += textLine(50, y, 10, `${row.oblast}: ${row.hodnota}`);
    y -= 16;
  });
  pages.push(first);

  if (!sections.length) {
    let content = textLine(50, 790, 16, 'Grafy nie su dostupne');
    content += textLine(50, 765, 10, 'API neposlalo chartData ani tabulkove ciselne podklady pre grafy.');
    pages.push(content);
  }

  sections.forEach((section) => {
    const maxAbsValue = Math.max(...section.points.map((item) => Math.abs(item.value)), 1);
    let content = textLine(50, 790, 16, section.title);
    content += textLine(50, 768, 9, section.description);
    let cy = 735;

    section.points.slice(0, 18).forEach((point) => {
      const width = section.kind === 'reliability'
        ? Math.max(4, Math.min(430, point.value * 430))
        : Math.max(4, Math.min(430, (Math.abs(point.value) / maxAbsValue) * 430));
      const isNegative = section.kind === 'correlation' && point.value < 0;
      const color = isNegative ? [0.86, 0.15, 0.15] : section.kind === 'reliability' ? [0.04, 0.55, 0.32] : [0.15, 0.39, 0.92];

      content += textLine(50, cy, 8, point.label.slice(0, 48));
      content += textLine(460, cy, 8, formatExportNumber(point.value));
      content += rect(50, cy - 15, 430, 8, 0.89, 0.91, 0.94);
      content += rect(50, cy - 15, width, 8, color[0], color[1], color[2]);
      cy -= 35;
    });

    pages.push(content);
  });

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  const fontObjectNumber = 3 + pages.length * 2;

  pages.forEach((_, index) => {
    pageObjectNumbers.push(3 + index * 2);
    contentObjectNumbers.push(4 + index * 2);
  });

  objects.push(`<< /Type /Pages /Kids [${pageObjectNumbers.map((num) => `${num} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  pages.forEach((content, index) => {
    const stream = content;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumbers[index]} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'binary')} >>\nstream\n${stream}endstream`);
  });

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

function addProfessionalDataAnalysisSheets(
  workbook: XLSX.WorkBook,
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
) {
  getTableDefinitions(result, preparedDataFile).forEach((definition) => {
    addJsonSheet(workbook, definition.sheetName, definition.rows);
  });

  addExcelChartSheets(workbook, result, preparedDataFile);
}

function buildWorkbook(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  addWorkbookHelperSheet(workbook);
  addProfessionalDataAnalysisSheets(workbook, result, preparedDataFile);

  return workbook;
}

function getDownloadFileName(payload: ExportPayload, format: ExportFormat = 'excel'): string {
  const explicitName = payload.fileName || '';

  const extension = format === 'word' || format === 'doc' ? 'doc' : format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : 'xlsx';

  if (explicitName) {
    return `${safeFileName(explicitName)}.${extension}`;
  }

  const preparedFileName = payload.preparedDataFile?.fileName || '';

  if (preparedFileName) {
    return `${safeFileName(preparedFileName.replace(/_PREPARED.*$/i, ''))}_EXPORT.${extension}`;
  }

  const date = new Date().toISOString().slice(0, 10);

  return `ZEDPERA_analyza_dat_export_${date}.${extension}`;
}

function asciiDownloadFileName(fileName: string): string {
  const extensionMatch = String(fileName || '').match(/\.[A-Za-z0-9]+$/);
  const extension = extensionMatch ? extensionMatch[0] : '';
  const baseName = String(fileName || 'ZEDPERA_export')
    .replace(/\.[^.]+$/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'ZEDPERA_export';

  return `${baseName}${extension}`;
}

function downloadHeaders(
  contentType: string,
  fileName: string,
  extraHeaders: Record<string, string> = {},
): HeadersInit {
  const asciiName = asciiDownloadFileName(fileName);
  const encodedName = encodeURIComponent(fileName);

  return {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...extraHeaders,
  };
}

function binaryDownloadResponse(
  buffer: Buffer | Uint8Array,
  contentType: string,
  fileName: string,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: downloadHeaders(contentType, fileName, extraHeaders),
  });
}

export async function GET() {
  return jsonResponse({
    ok: true,
    route: EXPORT_ROUTE,
    message:
      'ZEDPERA profesionálny export výsledkov analýzy dát. Použite POST s JSON telom obsahujúcim result alebo analysisResult.',
    usage,
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await readPayload(request);
    const payloadPreparedDataFile = getPreparedDataFile(payload, null);
    const detectedResult = getAnalysisResult(payload);
    const rawResult = isFileLikeFormValue(detectedResult) && payloadPreparedDataFile
      ? {}
      : detectedResult || (payloadPreparedDataFile ? {} : null);
    const result = hydrateAnalysisResultWithPayloadInputs(rawResult, payload);
    const preparedDataFile = getPreparedDataFile(payload, result);

    if (!rawResult && !preparedDataFile) {
      return jsonResponse(
        {
          ok: false,
          route: EXPORT_ROUTE,
          error:
            'Chýba result alebo analysisResult. Export potrebuje celý výsledok analýzy dát.',
          usage,
        },
        400,
      );
    }

    const format = normalizeExportFormat(
      payload.exportFormat || payload.format || payload.type,
    );

    if (format === 'json') {
      return jsonResponse({
        ok: true,
        format: 'json',
        result,
        preparedDataFile,
      });
    }

    if (format === 'raw') {
      return jsonResponse({
        ok: true,
        format: 'raw',
        rawData: flattenRawData(result, preparedDataFile),
        dataQuality: flattenDataQuality(result, preparedDataFile),
        scales: flattenScaleRows(result, preparedDataFile),
        reliability: flattenReliabilityRows(result, preparedDataFile),
        parametricTests: flattenParametricTests(result, preparedDataFile),
        nonParametricTests: flattenNonParametricTests(result, preparedDataFile),
        contingencyTables: buildContingencyTables(result),
        chiSquare: buildChiSquareTests(result),
        recommendedTests: flattenRecommendedTests(result),
        recommendedCharts: flattenRecommendedCharts(result),
        chartData: flattenChartData(result),
        chartSections: buildChartSections(result, preparedDataFile),
      });
    }

    if (format === 'word' || format === 'doc' || format === 'html') {
      const html = buildExportHtmlDocument(result, preparedDataFile);
      const fileName = getDownloadFileName(payload, format);

      return new NextResponse(html, {
        status: 200,
        headers: downloadHeaders(
          format === 'html' ? HTML_MIME_TYPE : WORD_MIME_TYPE,
          fileName,
          {
            'X-Zedpera-Export': 'data-analysis-word',
          },
        ),
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = buildPdfBuffer(result, preparedDataFile);
      const fileName = getDownloadFileName(payload, format);

      return binaryDownloadResponse(pdfBuffer, PDF_MIME_TYPE, fileName, {
        'X-Zedpera-Export': 'data-analysis-pdf',
      });
    }

    const professionalBuffer = await buildProfessionalExcelWithRenderedCharts(
  result,
  preparedDataFile,
);

console.log('[EXPORT XLSX PROFESSIONAL]', {
  professionalBuffer: Boolean(professionalBuffer),
  chartSections: buildChartSections(result, preparedDataFile).length,
  pieSections: buildPieChartSections(result).length,
  dashboardCharts: EXCEL_EXPORT_LIMITS.maxDashboardBarSections,
  dashboardPies: EXCEL_EXPORT_LIMITS.maxDashboardPieSections,
  removedSheets: `${EXCEL_EXPORT_LIMITS.removeNumberedSheetsFrom}-${EXCEL_EXPORT_LIMITS.removeNumberedSheetsTo}`,
});

if (!professionalBuffer) {
  return jsonResponse(
    {
      ok: false,
      route: EXPORT_ROUTE,
      error:
        'Profesionálny ExcelJS export zlyhal. Starý bezfarebný SheetJS fallback je zámerne vypnutý, aby sa na produkcii negeneroval nesprávny Excel bez Pomocníka, farieb a grafov.',
      recommendation:
        'Skontrolujte Vercel logs, či je nainštalovaný balík exceljs a či API route beží v nodejs runtime.',
    },
    500,
  );
}

const fileName = getDownloadFileName(payload, 'excel');

return binaryDownloadResponse(professionalBuffer, EXCEL_MIME_TYPE, fileName, {
  'X-Zedpera-Export': 'data-analysis',
  'X-Zedpera-Export-Version': 'professional-excel-v7-vercel-optimized-no-sheets-22-37',
  'X-Zedpera-Excel-Charts': 'dashboard-limited-rendered',
  'X-Zedpera-Removed-Sheets': '22-37',
  'X-Zedpera-Vercel-Optimized': 'true',
  'X-Zedpera-ExcelJS-Loader': 'static-import',
  'Cache-Control': 'no-store, no-cache, max-age=0',
});

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Neznáma chyba pri exporte výsledkov analýzy dát.';

    console.error('[api/analyze-data/export] Chyba exportu:', error);

    return jsonResponse(
      {
        ok: false,
        route: EXPORT_ROUTE,
        message: 'Export výsledkov analýzy dát zlyhal.',
        error: message,
      },
      500,
    );
  }
}

export async function PUT() {
  return jsonResponse(
    {
      ok: false,
      route: EXPORT_ROUTE,
      error: 'Metóda PUT nie je podporovaná. Použite POST.',
      usage,
    },
    405,
  );
}

export async function PATCH() {
  return jsonResponse(
    {
      ok: false,
      route: EXPORT_ROUTE,
      error: 'Metóda PATCH nie je podporovaná. Použite POST.',
      usage,
    },
    405,
  );
}

export async function DELETE() {
  return jsonResponse(
    {
      ok: false,
      route: EXPORT_ROUTE,
      error: 'Metóda DELETE nie je podporovaná. Použite POST.',
      usage,
    },
    405,
  );
}