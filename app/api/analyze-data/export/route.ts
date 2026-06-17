import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type ExportFormat = 'excel' | 'xlsx' | 'json' | 'raw';

type AnyRecord = Record<string, unknown>;

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

const usage: ApiUsage = {
  endpoint: EXPORT_ROUTE,
  method: 'POST',
  body: 'JSON',
  requiredFields: ['result alebo analysisResult'],
  optionalFields: ['preparedDataFile', 'format', 'exportFormat', 'type', 'fileName'],
  exportFormats: ['excel', 'xlsx', 'json', 'raw'],
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
}

function buildWorkbook(
  result: unknown,
  preparedDataFile: ExportPayload['preparedDataFile'],
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  addProfessionalDataAnalysisSheets(workbook, result, preparedDataFile);

  return workbook;
}

function getDownloadFileName(payload: ExportPayload): string {
  const explicitName = payload.fileName || '';

  if (explicitName) {
    return `${safeFileName(explicitName)}.xlsx`;
  }

  const preparedFileName = payload.preparedDataFile?.fileName || '';

  if (preparedFileName) {
    return `${safeFileName(preparedFileName.replace(/_PREPARED.*$/i, ''))}_EXPORT.xlsx`;
  }

  const date = new Date().toISOString().slice(0, 10);

  return `ZEDPERA_analyza_dat_export_${date}.xlsx`;
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
      });
    }

    const workbook = buildWorkbook(result, preparedDataFile);

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
      compression: true,
    }) as Buffer;

    const fileName = getDownloadFileName(payload);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': EXCEL_MIME_TYPE,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName,
        )}"`,
        'Cache-Control': 'no-store',
        'X-Zedpera-Export': 'data-analysis',
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