import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
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

type ExportPayload = {
  result?: unknown;
  analysisResult?: unknown;
  data?: unknown;
  preparedDataFile?: {
    fileName?: string;
    base64?: string;
    mimeType?: string;
    rows?: number;
    columns?: number;
    warnings?: string[];
    sheets?: string[];
    qualityReport?: unknown[];
  } | null;
  format?: ExportFormat | string;
  exportFormat?: ExportFormat | string;
  type?: ExportFormat | string;
  fileName?: string;
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

  const worksheet = XLSX.utils.json_to_sheet(finalRows);

  const headers = Object.keys(finalRows[0] || {});
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

    return {
      result,
      analysisResult: result,
      data: result,
      preparedDataFile: isRecord(preparedDataFile)
        ? (preparedDataFile as ExportPayload['preparedDataFile'])
        : null,
      format: String(formData.get('format') || ''),
      exportFormat: String(formData.get('exportFormat') || ''),
      type: String(formData.get('type') || ''),
      fileName: String(formData.get('fileName') || ''),
    };
  }

  return {};
}

function getAnalysisResult(payload: ExportPayload): unknown {
  return payload.result || payload.analysisResult || payload.data || null;
}

function getPreparedDataFile(payload: ExportPayload): ExportPayload['preparedDataFile'] {
  return payload.preparedDataFile || null;
}

function getResultRowsFromPreparedBase64(
  preparedDataFile: ExportPayload['preparedDataFile'],
  sheetName: string,
): AnyRecord[] {
  if (!preparedDataFile?.base64) {
    return [];
  }

  try {
    const buffer = Buffer.from(preparedDataFile.base64, 'base64');

    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });

    const selectedSheetName = workbook.SheetNames.includes(sheetName)
      ? sheetName
      : workbook.SheetNames[0];

    if (!selectedSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[selectedSheetName];

    if (!worksheet) {
      return [];
    }

    return XLSX.utils.sheet_to_json<AnyRecord>(worksheet, {
      defval: '',
    });
  } catch {
    return [];
  }
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
  const fromPreparedRaw = getResultRowsFromPreparedBase64(
    preparedDataFile,
    'DATA_RAW',
  );

  if (fromPreparedRaw.length > 0) {
    return fromPreparedRaw;
  }

  const fromPreparedClean = getResultRowsFromPreparedBase64(
    preparedDataFile,
    'DATA_CLEAN',
  );

  if (fromPreparedClean.length > 0) {
    return fromPreparedClean;
  }

  const candidates = [
    getNestedValue(result, ['rawData']),
    getNestedValue(result, ['rawRows']),
    getNestedValue(result, ['dataRows']),
    getNestedValue(result, ['preparedRows']),
    getNestedValue(result, ['scaleScoreRows']),
    getNestedValue(result, ['statisticalAnalysis', 'scaleScoreRows']),
  ];

  for (const candidate of candidates) {
    const rows = asRecords(candidate);

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function flattenDataQuality(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): AnyRecord[] {
  const qualityFromPreparedFile = asRecords(preparedDataFile?.qualityReport);

  const qualityFromResultPrepared = asRecords(
    getNestedValue(result, ['preparedFile', 'qualityReport']),
  );

  const qualityFromRoot = asRecords(
    getNestedValue(result, ['qualityReport']),
  );

  const warningsFromPrepared = Array.isArray(preparedDataFile?.warnings)
    ? preparedDataFile.warnings
    : [];

  const warningsFromResult = Array.isArray(getNestedValue(result, ['warnings']))
    ? (getNestedValue(result, ['warnings']) as unknown[])
    : [];

  const warningRows = [...warningsFromPrepared, ...warningsFromResult].map(
    (warning) => ({
      kontrola: 'Upozornenie',
      vysledok: 'warning',
      stav: 'warning',
      poznamka: String(warning),
    }),
  );

  return [
    ...qualityFromPreparedFile,
    ...qualityFromResultPrepared,
    ...qualityFromRoot,
    ...warningRows,
  ];
}

function flattenFrequencies(result: unknown): AnyRecord[] {
  const rows: AnyRecord[] = [];

  asRecords(getNestedValue(result, ['frequencies'])).forEach((frequency) => {
    const variable = String(frequency.variable || frequency.name || '');
    const values = asRecords(frequency.values || frequency.items);

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

function flattenDescriptiveRows(result: unknown): AnyRecord[] {
  const candidates = [
    ...asRecords(getNestedValue(result, ['descriptiveStatistics'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'itemDescriptives'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'scaleDescriptives'])),
    ...asRecords(getNestedValue(result, ['scaleDescriptives'])),
  ];

  return candidates.map((item) => ({
    premenna: item.variable ?? item.name ?? '',
    valid: item.valid ?? item.n ?? '',
    missing: item.missing ?? '',
    mean: item.mean ?? '',
    median: item.median ?? '',
    mode: item.mode ?? '',
    standard_deviation: item.standardDeviation ?? item.sd ?? '',
    variance: item.variance ?? '',
    skewness: item.skewness ?? '',
    kurtosis: item.kurtosis ?? '',
    minimum: item.minimum ?? item.min ?? '',
    maximum: item.maximum ?? item.max ?? '',
    sum: item.sum ?? '',
    q1: item.q1 ?? '',
    q3: item.q3 ?? '',
    iqr: item.iqr ?? '',
  }));
}

function flattenScaleRows(result: unknown): AnyRecord[] {
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

  const allScaleDefinitions = [
    ...scaleDefinitions,
    ...statisticalScaleDefinitions,
  ];

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

  const definitionRows = allScaleDefinitions.map((item) => ({
    typ: 'škála',
    id: item.id ?? '',
    nazov: item.name ?? '',
    polozky: Array.isArray(item.items) ? item.items.join(', ') : '',
    reverzne_polozky: Array.isArray(item.reverseItems)
      ? item.reverseItems.join(', ')
      : '',
    minimum: item.minValue ?? '',
    maximum: item.maxValue ?? '',
    skoring: item.scoring ?? '',
    popis: item.description ?? '',
  }));

  const combinedRows = allCombinedScaleDefinitions.map((item) => ({
    typ: 'kombinovaná škála / subškála',
    id: item.id ?? '',
    nazov: item.name ?? '',
    polozky: Array.isArray(item.scaleIds) ? item.scaleIds.join(', ') : '',
    reverzne_polozky: '',
    minimum: '',
    maximum: '',
    skoring: item.scoring ?? '',
    popis: item.description ?? '',
  }));

  const scoreRows = allScaleScores.map((item) => ({
    typ: 'vypočítané skóre',
    id: item.scaleId ?? '',
    nazov: item.scaleName ?? '',
    polozky: Array.isArray(item.itemsUsed) ? item.itemsUsed.join(', ') : '',
    reverzne_polozky: '',
    minimum: '',
    maximum: '',
    skoring: item.scoring ?? '',
    pocet_chybajucich_riadkov: item.missingRows ?? '',
    popis: '',
  }));

  const descriptiveRows = allScaleDescriptives.map((item) => ({
    typ: 'deskriptívna štatistika škály',
    id: '',
    nazov: item.variable ?? '',
    valid: item.valid ?? item.n ?? '',
    missing: item.missing ?? '',
    mean: item.mean ?? '',
    median: item.median ?? '',
    sd: item.standardDeviation ?? '',
    min: item.minimum ?? item.min ?? '',
    max: item.maximum ?? item.max ?? '',
    popis: '',
  }));

  return [
    ...definitionRows,
    ...combinedRows,
    ...scoreRows,
    ...descriptiveRows,
  ];
}

function flattenNormalityRows(result: unknown): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['normality'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'normality'])),
  ];

  return rows.map((item) => ({
    premenna: item.variable ?? '',
    valid: item.valid ?? '',
    metoda: item.method ?? '',
    statistika: item.statistic ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    normalita: item.isNormal ?? '',
    odporucanie: item.recommendation ?? '',
    poznamka: item.note ?? '',
  }));
}

function flattenReliabilityRows(result: unknown): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['reliability'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'reliability'])),
  ];

  return rows.map((item) => ({
    id: item.scaleId ?? '',
    skala: item.scaleName ?? '',
    polozky: Array.isArray(item.items) ? item.items.join(', ') : '',
    validne_riadky: item.validRows ?? '',
    cronbach_alpha: item.cronbachAlpha ?? '',
    interpretacia: item.interpretation ?? '',
  }));
}

function flattenCorrelationRows(result: unknown, method: 'pearson' | 'spearman' | 'recommended'): AnyRecord[] {
  const rootRows = asRecords(getNestedValue(result, ['correlations', method]));
  const statRows = asRecords(
    getNestedValue(result, ['statisticalAnalysis', 'correlations', method]),
  );

  return [...rootRows, ...statRows].map((item) => ({
    premenna_a: item.variableA ?? '',
    premenna_b: item.variableB ?? '',
    metoda: item.method ?? method,
    n: item.n ?? '',
    r: item.r ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    signifikancia: item.significance ?? '',
    fisher_z: item.fisherZ ?? '',
    standard_error: item.standardError ?? '',
    interpretacia: item.interpretation ?? '',
  }));
}

function flattenCorrelationMatrix(result: unknown): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['correlationMatrix'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'correlationMatrix'])),
  ];

  return rows;
}

function flattenParametricTests(result: unknown): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['groupTests', 'parametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'parametric'])),
  ];

  return rows.map((item) => ({
    zavisla_premenna: item.dependentVariable ?? '',
    skupinova_premenna: item.groupVariable ?? '',
    test: item.testType ?? '',
    skupiny: Array.isArray(item.groups) ? item.groups.join(', ') : '',
    n: item.nTotal ?? '',
    statistika: item.statistic ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    signifikancia: item.significance ?? '',
    odporucanie: item.recommendation ?? '',
  }));
}

function flattenNonParametricTests(result: unknown): AnyRecord[] {
  const rows = [
    ...asRecords(getNestedValue(result, ['groupTests', 'nonParametric'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'groupTests', 'nonParametric'])),
  ];

  return rows.map((item) => ({
    zavisla_premenna: item.dependentVariable ?? '',
    skupinova_premenna: item.groupVariable ?? '',
    test: item.testType ?? '',
    skupiny: Array.isArray(item.groups) ? item.groups.join(', ') : '',
    n: item.nTotal ?? '',
    statistika: item.statistic ?? '',
    p_hodnota: item.pValueText ?? item.pValue ?? '',
    signifikancia: item.significance ?? '',
    odporucanie: item.recommendation ?? '',
  }));
}

function buildContingencyTables(result: unknown): AnyRecord[] {
  const rows: AnyRecord[] = [];

  const frequencies = [
    ...asRecords(getNestedValue(result, ['frequencies'])),
    ...asRecords(getNestedValue(result, ['statisticalAnalysis', 'frequencies'])),
  ];

  frequencies.forEach((frequency) => {
    const variable = String(frequency.variable || frequency.name || '');
    const values = asRecords(frequency.values || frequency.items);
    const total = Number(frequency.total || frequency.valid || 0);

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

function buildChartSections(result: unknown): ChartSection[] {
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
      rows: flattenDescriptiveRows(result),
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
      rows: flattenScaleRows(result),
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
      rows: flattenReliabilityRows(result),
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
        ...flattenCorrelationRows(result, 'recommended'),
        ...flattenCorrelationRows(result, 'pearson'),
        ...flattenCorrelationRows(result, 'spearman'),
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
      rows: flattenNormalityRows(result),
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

  return Array.from(deduplicated.values()).slice(0, 12);
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
  const rows: AnyRecord[] = [];

  chartSections.forEach((section) => {
    section.points.forEach((point) => {
      rows.push({
        graf: section.title,
        label: point.label,
        hodnota: point.value,
        bar: makeTextBar(
          point.value,
          Math.max(...section.points.map((item) => Math.abs(item.value)), 1),
          section.kind,
        ),
        popis: point.description || '',
        skupina: point.group || '',
      });
    });
  });

  addJsonSheet(workbook, '22 Grafy data', rows);
}

function addExcelChartSheet(workbook: XLSX.WorkBook, section: ChartSection, index: number) {
  const maxAbsValue = Math.max(...section.points.map((item) => Math.abs(item.value)), 1);

  const rows: unknown[][] = [
    [section.title],
    [section.description],
    [],
    ['Položka', section.valueLabel, 'Grafické vykreslenie', 'Poznámka'],
    ...section.points.map((point) => [
      point.label,
      point.value,
      makeTextBar(point.value, maxAbsValue, section.kind),
      point.description || point.group || '',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 42 },
    { wch: 16 },
    { wch: 38 },
    { wch: 55 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeSheetName(`${23 + index} ${section.title}`),
  );
}

function addExcelChartSheets(workbook: XLSX.WorkBook, result: unknown) {
  const chartSections = buildChartSections(result);

  if (!chartSections.length) {
    addJsonSheet(workbook, '22 Grafy', [
      {
        stav: 'bez grafov',
        poznamka:
          'Export nenašiel číselné podklady pre grafy. Skontrolujte, či API vracia chartData alebo štatistické tabuľky s hodnotami mean/count/r/cronbach_alpha.',
      },
    ]);
    return;
  }

  addChartDataSheet(workbook, chartSections);
  chartSections.forEach((section, index) => addExcelChartSheet(workbook, section, index));
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

function getTableDefinitions(result: unknown, preparedDataFile: ExportPayload['preparedDataFile']): ExportTableDefinition[] {
  return [
    { sheetName: '01 overview', title: 'Prehľad exportu', description: 'Základné informácie o analýze.', rows: flattenOverview(result, preparedDataFile) },
    { sheetName: '02 raw-data', title: 'Raw dáta', description: 'Dáta použité pri analýze.', rows: flattenRawData(result, preparedDataFile) },
    { sheetName: '03 frequencies', title: 'Frekvenčné tabuľky', description: 'Početnosti a percentá odpovedí.', rows: flattenFrequencies(result) },
    { sheetName: '04 data-quality', title: 'Kontrola kvality dát', description: 'Upozornenia a kontrola vstupného súboru.', rows: flattenDataQuality(result, preparedDataFile) },
    { sheetName: '05 descriptives', title: 'Deskriptívna štatistika', description: 'Priemery, mediány, smerodajné odchýlky a rozsahy.', rows: flattenDescriptiveRows(result) },
    { sheetName: '06 normality', title: 'Normalita dát', description: 'Testy normality a odporúčania.', rows: flattenNormalityRows(result) },
    { sheetName: '07 reliability', title: 'Reliabilita', description: 'Cronbachovo alfa a vnútorná konzistencia.', rows: flattenReliabilityRows(result) },
    { sheetName: '08 correlations', title: 'Odporúčané korelácie', description: 'Korelácie odporúčané podľa normality.', rows: flattenCorrelationRows(result, 'recommended') },
    { sheetName: '09 Škály podškály', title: 'Škály a subškály', description: 'Definície, skóre a deskriptíva škál.', rows: flattenScaleRows(result) },
    { sheetName: '10 Pearson', title: 'Pearsonove korelácie', description: 'Parametrické korelácie.', rows: flattenCorrelationRows(result, 'pearson') },
    { sheetName: '11 Spearman', title: 'Spearmanove korelácie', description: 'Neparametrické korelácie.', rows: flattenCorrelationRows(result, 'spearman') },
    { sheetName: '12 Corr matrix', title: 'Korelačná matica', description: 'Maticový výstup korelácií.', rows: flattenCorrelationMatrix(result) },
    { sheetName: '13 Chart data', title: 'Dáta pre grafy', description: 'Podkladové dáta grafických výstupov.', rows: flattenChartData(result) },
    { sheetName: '16 Param testy', title: 'Parametrické testy', description: 't-test a ANOVA.', rows: flattenParametricTests(result) },
    { sheetName: '17 Neparam testy', title: 'Neparametrické testy', description: 'Mann-Whitney a Kruskal-Wallis.', rows: flattenNonParametricTests(result) },
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
    const variable = String(frequency.variable || frequency.name || `Premenná ${index + 1}`).trim();
    const values = asRecords(frequency.values || frequency.items);
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

  if (sections.length > 0) return sections.slice(0, 6);

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

  return sections.slice(0, 6);
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

async function loadExcelJs(): Promise<any | null> {
  try {
    const moduleName = 'exceljs';
    const dynamicImport = new Function('moduleName', 'return import(moduleName)') as (moduleName: string) => Promise<any>;
    const imported = await dynamicImport(moduleName);
    return imported?.default || imported;
  } catch (error) {
    console.warn('[api/analyze-data/export] exceljs nie je dostupný, používam fallback xlsx export bez obrázkov.', error);
    return null;
  }
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

function addRowsAsProfessionalTable(worksheet: any, rows: AnyRecord[], startRow: number) {
  const finalRows = rows.length ? normalizeRowsForExcel(rows) : [{ stav: 'bez údajov', poznamka: 'Pre túto tabuľku nie sú dostupné dáta.' }];
  const headers = Object.keys(finalRows[0] || {});
  const headerRow = worksheet.getRow(startRow);

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    setCellStyle(cell, { header: true, fill: index % 2 === 0 ? 'FF1D4ED8' : 'FF2563EB' });
    worksheet.getColumn(index + 1).width = Math.min(Math.max(header.length + 8, 18), 46);
  });

  finalRows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(startRow + rowIndex + 1);
    const fill = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    headers.forEach((header, index) => {
      const cell = excelRow.getCell(index + 1);
      cell.value = toExcelValueForExcelJs(row[header]);
      setCellStyle(cell, { fill });
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

function addDashboardWorksheet(workbook: any, result: unknown, preparedDataFile: ExportPayload['preparedDataFile']) {
  const worksheet = workbook.addWorksheet('00 Dashboard', {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: 'FF0F172A' } },
  });

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'ZEDPERA – profesionálny dashboard analýzy dát';
  setCellStyle(worksheet.getCell('A1'), { title: true });
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = 'Prvá strana obsahuje prehľad, koláčové grafy a hlavné grafické výstupy.';
  setCellStyle(worksheet.getCell('A2'), { subtitle: true });

  const overview = flattenOverview(result, preparedDataFile);
  addRowsAsProfessionalTable(worksheet, overview, 4);

  const pieSections = buildPieChartSections(result);
  const chartSections = buildChartSections(result);
  let imageRow = 12;

  pieSections.slice(0, 4).forEach((section, index) => {
    const col = index % 2 === 0 ? 0 : 5;
    const row = imageRow + Math.floor(index / 2) * 17;
    worksheet.getRow(row).getCell(col + 1).value = section.title;
    setCellStyle(worksheet.getRow(row).getCell(col + 1), { header: true, fill: 'FF7C3AED' });
    addWorksheetImage(workbook, worksheet, renderPieChartPng(section), col, row, 360, 210);
    addSectionDataTable(worksheet, section, row + 13, col + 1);
  });

  imageRow = 48;
  chartSections.slice(0, 4).forEach((section, index) => {
    const col = index % 2 === 0 ? 0 : 5;
    const row = imageRow + Math.floor(index / 2) * 19;
    worksheet.getRow(row).getCell(col + 1).value = section.title;
    setCellStyle(worksheet.getRow(row).getCell(col + 1), { header: true, fill: 'FF059669' });
    addWorksheetImage(workbook, worksheet, renderBarChartPng(section), col, row, 440, 230);
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

  const tableMeta = addRowsAsProfessionalTable(worksheet, asRecords(definition.rows), 4);
  const chartSection = chartSectionForTable(definition);

  if (chartSection && chartSection.points.length > 0) {
    const imageStartRow = 5;
    const imageStartCol = Math.min(Math.max(tableMeta.columnCount + 2, 6), 10);
    worksheet.getRow(4).getCell(imageStartCol).value = `Graf k tabuľke – ${definition.title}`;
    setCellStyle(worksheet.getRow(4).getCell(imageStartCol), { header: true, fill: 'FF7C3AED' });
    addWorksheetImage(
      workbook,
      worksheet,
      renderBarChartPng(chartSection),
      imageStartCol - 1,
      imageStartRow,
      560,
      300,
    );
    addSectionDataTable(worksheet, chartSection, imageStartRow + 18, imageStartCol);
  }
}

function addStandaloneChartWorksheets(workbook: any, result: unknown) {
  const chartSections = buildChartSections(result);
  const pieSections = buildPieChartSections(result);

  [...pieSections, ...chartSections].slice(0, 24).forEach((section: any, index) => {
    const isPie = String(section.key || '').startsWith('pie-');
    const worksheet = workbook.addWorksheet(safeSheetName(`${22 + index} Graf ${index + 1}`), {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: `FF${PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}` } },
    });

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = section.title;
    setCellStyle(worksheet.getCell('A1'), { title: true });
    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = isPie ? 'Koláčový graf podielov kategórií.' : section.description;
    setCellStyle(worksheet.getCell('A2'), { subtitle: true });
    addWorksheetImage(workbook, worksheet, isPie ? renderPieChartPng(section) : renderBarChartPng(section), 0, 4, isPie ? 560 : 700, 360);
    addSectionDataTable(worksheet, section, 26, 1);

    for (let column = 1; column <= 8; column += 1) {
      worksheet.getColumn(column).width = 24;
    }
  });
}

async function buildProfessionalExcelWithRenderedCharts(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): Promise<Buffer | null> {
  const ExcelJS = await loadExcelJs();
  if (!ExcelJS) return null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ZEDPERA';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.views = [{ x: 0, y: 0, width: 18000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  addDashboardWorksheet(workbook, result, preparedDataFile);
  const definitions = getTableDefinitions(result, preparedDataFile);
  definitions.forEach((definition, index) => addProfessionalWorksheetWithChart(workbook, definition, index));
  addStandaloneChartWorksheets(workbook, result);

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output as ArrayBuffer);
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
  const chartSections = buildChartSections(result);
  const pieSections = buildPieChartSections(result);

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
  const sections = buildChartSections(result);
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
  addJsonSheet(workbook, '01 overview', flattenOverview(result, preparedDataFile));

  addJsonSheet(workbook, '02 raw-data', flattenRawData(result, preparedDataFile));

  addJsonSheet(workbook, '03 frequencies', flattenFrequencies(result));

  addJsonSheet(workbook, '04 data-quality', flattenDataQuality(result, preparedDataFile));

  addJsonSheet(workbook, '05 descriptives', flattenDescriptiveRows(result));

  addJsonSheet(workbook, '06 normality', flattenNormalityRows(result));

  addJsonSheet(workbook, '07 reliability', flattenReliabilityRows(result));

  addJsonSheet(workbook, '08 correlations', flattenCorrelationRows(result, 'recommended'));

  addJsonSheet(workbook, '09 Škály podškály', flattenScaleRows(result));

  addJsonSheet(workbook, '10 Pearson', flattenCorrelationRows(result, 'pearson'));

  addJsonSheet(workbook, '11 Spearman', flattenCorrelationRows(result, 'spearman'));

  addJsonSheet(workbook, '12 Corr matrix', flattenCorrelationMatrix(result));

  addJsonSheet(workbook, '13 Chart data', flattenChartData(result));

  addJsonSheet(workbook, '16 Param testy', flattenParametricTests(result));

  addJsonSheet(workbook, '17 Neparam testy', flattenNonParametricTests(result));

  addJsonSheet(workbook, '18 Kontingencne tab', buildContingencyTables(result));

  addJsonSheet(workbook, '19 Chi-square', buildChiSquareTests(result));

  addJsonSheet(workbook, '20 Odpor testy', flattenRecommendedTests(result));

  addJsonSheet(workbook, '21 Odpor grafy', flattenRecommendedCharts(result));

  addExcelChartSheets(workbook, result);
}

function buildWorkbook(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

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
    const result = getAnalysisResult(payload);
    const preparedDataFile = getPreparedDataFile(payload);

    if (!result) {
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
        scales: flattenScaleRows(result),
        parametricTests: flattenParametricTests(result),
        nonParametricTests: flattenNonParametricTests(result),
        contingencyTables: buildContingencyTables(result),
        chiSquare: buildChiSquareTests(result),
        recommendedTests: flattenRecommendedTests(result),
        recommendedCharts: flattenRecommendedCharts(result),
        chartData: flattenChartData(result),
        chartSections: buildChartSections(result),
      });
    }

    if (format === 'word' || format === 'doc' || format === 'html') {
      const html = buildExportHtmlDocument(result, preparedDataFile);
      const fileName = getDownloadFileName(payload, format);

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': format === 'html' ? HTML_MIME_TYPE : WORD_MIME_TYPE,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(
            fileName,
          )}"`,
          'Cache-Control': 'no-store',
          'X-Zedpera-Export': 'data-analysis-word',
        },
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = buildPdfBuffer(result, preparedDataFile);
      const fileName = getDownloadFileName(payload, format);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': PDF_MIME_TYPE,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(
            fileName,
          )}"`,
          'Cache-Control': 'no-store',
          'X-Zedpera-Export': 'data-analysis-pdf',
        },
      });
    }

   const professionalBuffer = await buildProfessionalExcelWithRenderedCharts(
  result,
  preparedDataFile,
);

console.log('[EXPORT XLSX CHARTS]', {
  professionalBuffer: Boolean(professionalBuffer),
  chartSections: buildChartSections(result).length,
  pieSections: buildPieChartSections(result).length,
});

const fallbackBuffer = XLSX.write(buildWorkbook(result, preparedDataFile), {
  bookType: 'xlsx',
  type: 'buffer',
  compression: true,
}) as Buffer;

const buffer = professionalBuffer ?? fallbackBuffer;

const fileName = getDownloadFileName(payload, format);

return new NextResponse(new Uint8Array(buffer), {
  status: 200,
  headers: {
    'Content-Type': EXCEL_MIME_TYPE,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(
      fileName,
    )}"`,
    'Cache-Control': 'no-store',
    'X-Zedpera-Export': 'data-analysis',
    'X-Zedpera-Excel-Charts': professionalBuffer ? 'rendered' : 'fallback',
  },
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