import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

type ExportFormat = 'word' | 'doc' | 'xlsx' | 'xls' | 'excel' | 'pdf';

type ExportBody = {
  format?: ExportFormat;
  title?: string;
  result?: any;
};

type ExportColumn = {
  key: string;
  label: string;
  sourceKeys?: string[];
};

type ExportTable = {
  title: string;
  description?: string;
  rows: Record<string, any>[];
};

type SummaryMetric = {
  label: string;
  value: string | number;
};

const VARIABLE_COLUMN_KEY = '__variable__';

const VARIABLE_SOURCE_KEYS = [
  'variable',
  'premenná',
  'premenna',
  'name',
  'názov',
  'nazov',
  'label',
  'column',
  'stĺpec',
  'stlpec',
  'field',
];

const TECHNICAL_ID_COLUMNS = [
  'id',
  'respondent',
  'respondent_id',
  'respondent id',
  'index',
  'poradie',
  'cislo',
  'číslo',
  'c',
  'timestamp',
  'datum',
  'dátum',
  'cas',
  'čas',
  'created_at',
  'updated_at',
];

const COLUMN_LABELS: Record<string, string> = {
  [VARIABLE_COLUMN_KEY]: 'Premenná',

  name: 'Premenná',
  variable: 'Premenná',
  label: 'Premenná',
  column: 'Premenná',
  field: 'Premenná',
  nazov: 'Premenná',
  premenna: 'Premenná',

  title: 'Názov',
  description: 'Popis',

  type: 'Typ premennej',
  variableType: 'Typ premennej',
  variable_type: 'Typ premennej',
  measurementLevel: 'Úroveň merania',
  measurement_level: 'Úroveň merania',
  level: 'Úroveň merania',

  valid: 'N platných',
  validValues: 'N platných',
  validCount: 'N platných',
  validN: 'N platných',
  nValid: 'N platných',

  n: 'N',
  count: 'Počet',
  frequency: 'Frekvencia',

  missing: 'N chýbajúcich',
  missingValues: 'N chýbajúcich',
  missingCount: 'N chýbajúcich',
  missingN: 'N chýbajúcich',
  nMissing: 'N chýbajúcich',

  mean: 'M',
  M: 'M',
  average: 'Priemer',
  avg: 'Priemer',

  median: 'Medián',
  Md: 'Medián',
  mode: 'Modus',

  stdDeviation: 'SD',
  standardDeviation: 'SD',
  stdDev: 'SD',
  SD: 'SD',
  sd: 'SD',

  min: 'Min',
  minimum: 'Min',
  max: 'Max',
  maximum: 'Max',

  sum: 'Súčet',
  range: 'Rozpätie',
  variance: 'Rozptyl',
  skewness: 'Šikmosť',
  kurtosis: 'Špicatosť',
  distinctValues: 'Počet hodnôt',

  value: 'Hodnota',
  category: 'Kategória',
  percent: 'Percento',
  percentage: 'Percento',
  validPercent: 'Validné percento',
  valid_percent: 'Validné percento',
  cumulativePercent: 'Kumulatívne percento',
  cumulative_percent: 'Kumulatívne percento',

  test: 'Test',
  hypothesis: 'Hypotéza',
  variables: 'Premenné',
  reason: 'Odôvodnenie',
  assumptions: 'Predpoklady',
  interpretation: 'Interpretácia',
  conclusion: 'Záver',
  result: 'Výsledok',

  variable1: 'Premenná 1',
  variable2: 'Premenná 2',
  coefficient: 'Koeficient',
  r: 'r',
  rho: 'ρ',
  pValue: 'p',
  p_value: 'p',
  p: 'p',
  df: 'df',
  strength: 'Sila vzťahu',
  direction: 'Smer vzťahu',
  significant: 'Signifikantné',

  dependentVariable: 'Závislá premenná',
  independentVariable: 'Nezávislá premenná',
  groupVariable: 'Skupinová premenná',
  group1: 'Skupina 1',
  group2: 'Skupina 2',
  mean1: 'M1',
  mean2: 'M2',
  sd1: 'SD1',
  sd2: 'SD2',
  n1: 'n1',
  n2: 'n2',
  statistic: 'Štatistika',
  t: 't',
  meanDifference: 'Rozdiel priemerov',

  alpha: 'Cronbach alfa',
  cronbachAlpha: 'Cronbach alfa',
  cronbach_alpha: 'Cronbach alfa',
  scale: 'Škála',
  items: 'Položky',
  itemCount: 'Počet položiek',

  fileName: 'Súbor',
  filename: 'Súbor',
  extension: 'Prípona',
  size: 'Veľkosť',
  method: 'Metóda',
  status: 'Stav',
  warnings: 'Upozornenia',
};

const SECTION_COLORS = [
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#dc2626',
  '#4f46e5',
  '#0f766e',
];

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function normalizeTextForCompare(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeFileName(value: string): string {
  return (
    cleanText(value || 'vysledky-analyzy-dat')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'vysledky-analyzy-dat'
  );
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isVariableLikeColumn(key: string): boolean {
  return VARIABLE_SOURCE_KEYS.map(normalizeKey).includes(normalizeKey(key));
}

function isTechnicalIdName(value: unknown): boolean {
  const normalized = normalizeTextForCompare(value);

  return TECHNICAL_ID_COLUMNS.map(normalizeTextForCompare).includes(normalized);
}

function getFieldLabel(key: string): string {
  const normalized = normalizeKey(key);

  return (
    COLUMN_LABELS[key] ||
    COLUMN_LABELS[normalized] ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/^\w/, (char) => char.toUpperCase())
  );
}

function normalizeRows(value: unknown): Record<string, any>[] {
  if (!Array.isArray(value)) return [];

  return value.map((row, index) => {
    if (isRecord(row)) return row;

    if (Array.isArray(row)) {
      const output: Record<string, any> = {};

      row.forEach((cell, cellIndex) => {
        output[`col_${cellIndex + 1}`] = cell;
      });

      return output;
    }

    return {
      poradie: index + 1,
      hodnota: row,
    };
  });
}

function getBestVariableValue(row: Record<string, any>): unknown {
  for (const key of VARIABLE_SOURCE_KEYS) {
    const value = row[key];

    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  const dynamicKey = Object.keys(row).find((key) => isVariableLikeColumn(key));

  if (!dynamicKey) return undefined;

  const value = row[dynamicKey];

  return value !== null && value !== undefined && value !== '' ? value : undefined;
}

function getExportCellValue(row: Record<string, any>, column: ExportColumn): unknown {
  if (column.key === VARIABLE_COLUMN_KEY) {
    return getBestVariableValue(row);
  }

  if (Array.isArray(column.sourceKeys) && column.sourceKeys.length > 0) {
    for (const sourceKey of column.sourceKeys) {
      const value = row[sourceKey];

      if (value !== null && value !== undefined && value !== '') {
        return value;
      }
    }

    return '';
  }

  return row[column.key];
}

function hasVisibleValue(rows: Record<string, any>[], column: ExportColumn): boolean {
  return rows.some((row) => {
    const value = getExportCellValue(row, column);

    return value !== null && value !== undefined && value !== '';
  });
}

function isTechnicalRow(row: Record<string, any>): boolean {
  const variableName = getBestVariableValue(row);

  return isTechnicalIdName(variableName);
}

function shouldRemoveTechnicalRowsFromTable(title: string): boolean {
  const normalizedTitle = normalizeTextForCompare(title);

  if (normalizedTitle.includes('identifikovane_premenne')) {
    return false;
  }

  if (normalizedTitle.includes('spracovane_subory')) {
    return false;
  }

  return true;
}

function cleanRowsForTable(title: string, rows: Record<string, any>[]): Record<string, any>[] {
  if (!shouldRemoveTechnicalRowsFromTable(title)) {
    return rows;
  }

  return rows.filter((row) => !isTechnicalRow(row));
}

function getColumns(rows: Record<string, any>[]): ExportColumn[] {
  const priority = [
    'type',
    'variableType',
    'variable_type',
    'measurementLevel',
    'measurement_level',
    'level',

    'valid',
    'validValues',
    'validCount',
    'validN',
    'nValid',
    'n',

    'missing',
    'missingValues',
    'missingCount',
    'missingN',
    'nMissing',

    'mean',
    'M',
    'average',
    'median',
    'Md',
    'mode',
    'stdDeviation',
    'standardDeviation',
    'stdDev',
    'SD',
    'sd',
    'min',
    'minimum',
    'max',
    'maximum',
    'sum',
    'range',
    'variance',
    'skewness',
    'kurtosis',
    'distinctValues',

    'value',
    'category',
    'frequency',
    'count',
    'percent',
    'percentage',
    'validPercent',
    'valid_percent',
    'cumulativePercent',
    'cumulative_percent',

    'test',
    'hypothesis',
    'variables',
    'variable1',
    'variable2',
    'coefficient',
    'r',
    'rho',
    'pValue',
    'p_value',
    'p',
    'df',
    'strength',
    'direction',
    'significant',

    'dependentVariable',
    'independentVariable',
    'groupVariable',
    'group1',
    'group2',
    'mean1',
    'mean2',
    'sd1',
    'sd2',
    'n1',
    'n2',
    't',
    'statistic',
    'meanDifference',

    'scale',
    'items',
    'itemCount',
    'alpha',
    'cronbachAlpha',
    'cronbach_alpha',

    'reason',
    'description',
    'interpretation',
    'conclusion',
    'result',

    'fileName',
    'filename',
    'extension',
    'size',
    'method',
    'status',
    'warnings',
  ];

  const allRawColumns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const variableSourceKeys = allRawColumns.filter((column) => isVariableLikeColumn(column));

  const nonVariableColumns = allRawColumns.filter((column) => !isVariableLikeColumn(column));

  const priorityColumns = priority.filter((column) => nonVariableColumns.includes(column));

  const restColumns = nonVariableColumns
    .filter((column) => !priorityColumns.includes(column))
    .sort((a, b) => a.localeCompare(b, 'sk'));

  const exportColumns: ExportColumn[] = [];

  if (variableSourceKeys.length > 0) {
    exportColumns.push({
      key: VARIABLE_COLUMN_KEY,
      label: 'Premenná',
      sourceKeys: variableSourceKeys,
    });
  }

  for (const key of [...priorityColumns, ...restColumns]) {
    exportColumns.push({
      key,
      label: getFieldLabel(key),
    });
  }

  const usedLabels = new Set<string>();
  const dedupedColumns: ExportColumn[] = [];

  for (const column of exportColumns) {
    const normalizedLabel = normalizeKey(column.label);

    if (usedLabels.has(normalizedLabel)) {
      continue;
    }

    usedLabels.add(normalizedLabel);
    dedupedColumns.push(column);
  }

  return dedupedColumns.filter((column) => hasVisibleValue(rows, column));
}

function getCellValue(value: unknown): string | number {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Áno' : 'Nie';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (isRecord(item)) return JSON.stringify(item);
        return String(item ?? '');
      })
      .join(', ');
  }

  if (isRecord(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  const text = String(value);
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return text;
}

function getFrequencyRows(table: any): Record<string, any>[] {
  if (!isRecord(table)) return [];

  return normalizeRows(
    safeArray(table.rows).length > 0
      ? table.rows
      : safeArray(table.data).length > 0
        ? table.data
        : table.items,
  );
}

function makeTable(title: string, rows: unknown, description = ''): ExportTable {
  const normalizedRows = normalizeRows(rows);
  const cleanedRows = cleanRowsForTable(title, normalizedRows);

  return {
    title,
    description,
    rows: cleanedRows,
  };
}

function getAllTables(result: any): ExportTable[] {
  const tables: ExportTable[] = [];

  const files = safeArray(result?.files || result?.extractedFiles || result?.attachments);

  if (files.length) {
    tables.push(
      makeTable(
        'Spracované súbory',
        files,
        'Prehľad súborov použitých pri analýze.',
      ),
    );
  }

  const variables = safeArray(
    result?.variables || result?.detectedVariables || result?.columns,
  );

  if (variables.length) {
    tables.push(
      makeTable(
        'Identifikované premenné',
        variables,
        'Prehľad premenných rozpoznaných v dátach. Technické identifikátory ako ID môžu byť zobrazené iba informačne, ale nepočítajú sa do štatistických výpočtov.',
      ),
    );
  }

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  );

  if (descriptive.length) {
    tables.push(
      makeTable(
        'Deskriptívna štatistika',
        descriptive,
        'N, M, medián, SD, minimum, maximum, šikmosť a špicatosť. Technické stĺpce ako ID sú z exportovanej štatistiky odstránené.',
      ),
    );
  }

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  frequencies.forEach((table: any, index) => {
    const rows = cleanRowsForTable('Frekvenčné tabuľky', getFrequencyRows(table));

    if (!rows.length) return;

    tables.push({
      title:
        cleanText(table?.title) ||
        `Frekvenčná tabuľka – ${table?.variable || table?.name || index + 1}`,
      description:
        cleanText(table?.description || table?.interpretation) ||
        'Frekvenčné rozdelenie hodnôt.',
      rows,
    });
  });

  const pearson = safeArray(result?.pearsonCorrelations || result?.pearson);

  if (pearson.length) {
    tables.push(
      makeTable(
        'Pearsonove korelácie',
        pearson,
        'Lineárne vzťahy medzi numerickými premennými.',
      ),
    );
  }

  const spearman = safeArray(result?.spearmanCorrelations || result?.spearman);

  if (spearman.length) {
    tables.push(
      makeTable(
        'Spearmanove korelácie',
        spearman,
        'Poradové alebo monotónne vzťahy medzi premennými.',
      ),
    );
  }

  const correlations = safeArray(result?.correlations || result?.correlationResults);

  if (correlations.length && !pearson.length && !spearman.length) {
    tables.push(
      makeTable(
        'Korelácie',
        correlations,
        'Korelačné výsledky medzi premennými.',
      ),
    );
  }

  const regression = safeArray(
    result?.regression ||
      result?.regressions ||
      result?.regressionResults ||
      result?.regression_results,
  );

  if (regression.length) {
    tables.push(
      makeTable(
        'Regresná analýza',
        regression,
        'Výsledky regresného modelovania.',
      ),
    );
  }

  const anova = safeArray(
    result?.anova ||
      result?.anovaResults ||
      result?.anova_results,
  );

  if (anova.length) {
    tables.push(
      makeTable(
        'ANOVA',
        anova,
        'Analýza rozptylu pre porovnanie viacerých skupín.',
      ),
    );
  }

  const tTests = safeArray(result?.tTests || result?.t_tests);

  if (tTests.length) {
    tables.push(
      makeTable(
        'T-testy',
        tTests,
        'Porovnanie dvoch skupín pri numerických premenných.',
      ),
    );
  }

  const mannWhitney = safeArray(
    result?.mannWhitney ||
      result?.mannWhitneyTests ||
      result?.mann_whitney ||
      result?.mann_whitney_tests,
  );

  if (mannWhitney.length) {
    tables.push(
      makeTable(
        'Mann-Whitney U test',
        mannWhitney,
        'Neparametrické porovnanie dvoch nezávislých skupín.',
      ),
    );
  }

  const kruskal = safeArray(
    result?.kruskalWallis ||
      result?.kruskalWallisTests ||
      result?.kruskal_wallis ||
      result?.kruskal_wallis_tests,
  );

  if (kruskal.length) {
    tables.push(
      makeTable(
        'Kruskal-Wallis test',
        kruskal,
        'Neparametrické porovnanie viacerých nezávislých skupín.',
      ),
    );
  }

  const cronbach = safeArray(
    result?.cronbachAlpha ||
      result?.cronbach ||
      result?.cronbach_alpha ||
      result?.reliability,
  );

  if (cronbach.length) {
    tables.push(
      makeTable(
        'Cronbach alfa',
        cronbach,
        'Vnútorná konzistencia dotazníkových škál, napríklad WEMWBS a JSS.',
      ),
    );
  }

  const hypothesisTests = safeArray(
    result?.hypothesisTests ||
      result?.hypothesis_tests ||
      result?.testResults,
  );

  if (hypothesisTests.length) {
    tables.push(
      makeTable(
        'Výsledky testovania hypotéz',
        hypothesisTests,
        'Výsledky štatistického testovania.',
      ),
    );
  }

  const recommendedTests = safeArray(
    result?.recommendedTests ||
      result?.recommended_tests ||
      result?.tests,
  );

  if (recommendedTests.length) {
    tables.push(
      makeTable(
        'Odporúčané štatistické testy',
        recommendedTests,
        'Testy odporúčané podľa typu premenných.',
      ),
    );
  }

  const recommendedCharts = safeArray(
    result?.recommendedCharts ||
      result?.recommended_charts ||
      result?.charts,
  );

  if (recommendedCharts.length) {
    tables.push(
      makeTable(
        'Odporúčané grafy',
        recommendedCharts,
        'Grafy vhodné pre praktickú časť práce, napríklad histogramy, scatter grafy, stĺpcové grafy alebo boxploty.',
      ),
    );
  }

  const excelTables = safeArray(
    result?.excelTables ||
      result?.excel_tables ||
      result?.tables,
  );

  excelTables.forEach((table: any, index) => {
    if (!isRecord(table)) return;

    const rows = cleanRowsForTable(
      cleanText(table.title || table.name || `Tabuľka ${index + 1}`),
      normalizeRows(table.rows || table.data),
    );

    if (!rows.length) return;

    tables.push({
      title: cleanText(table.title || table.name || `Tabuľka ${index + 1}`),
      description: cleanText(table.description || ''),
      rows,
    });
  });

  const seen = new Set<string>();

  return tables.filter((table) => {
    if (!table.rows.length) return false;

    const columns = getColumns(table.rows);

    if (!columns.length) return false;

    const key = `${normalizeTextForCompare(table.title)}-${table.rows.length}-${columns
      .map((column) => column.label)
      .join('|')}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function buildChartDataTables(result: any): ExportTable[] {
  const output: ExportTable[] = [];

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  frequencies.slice(0, 10).forEach((table: any, index) => {
    const rows = getFrequencyRows(table)
      .map((row) => ({
        Kategória: row.value ?? row.category ?? row.name ?? row.label ?? '',
        Počet: row.frequency ?? row.count ?? row.n ?? 0,
        Percento: row.percent ?? row.percentage ?? '',
        ValidnéPercento: row.validPercent ?? row.valid_percent ?? '',
        KumulatívnePercento: row.cumulativePercent ?? row.cumulative_percent ?? '',
      }))
      .filter((row) => row.Kategória !== '' && !isTechnicalIdName(row.Kategória));

    if (!rows.length) return;

    output.push({
      title: `Grafové dáta – frekvencia ${table?.variable || table?.name || index + 1}`,
      description:
        'Dáta pripravené na vytvorenie stĺpcového alebo koláčového grafu v Exceli.',
      rows,
    });
  });

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  )
    .map((row: any) => ({
      Premenná: row.variable || row.name || row.label || row.column || '',
      M: row.M ?? row.mean ?? row.average ?? '',
      Medián: row.Md ?? row.median ?? '',
      SD: row.SD ?? row.sd ?? row.stdDeviation ?? row.standardDeviation ?? '',
      Min: row.min ?? row.minimum ?? '',
      Max: row.max ?? row.maximum ?? '',
      Šikmosť: row.skewness ?? '',
      Špicatosť: row.kurtosis ?? '',
    }))
    .filter((row: any) => row.Premenná && !isTechnicalIdName(row.Premenná));

  if (descriptive.length) {
    output.push({
      title: 'Grafové dáta – deskriptívna štatistika',
      description:
        'Dáta pripravené na vizualizáciu priemerov, mediánov a variability.',
      rows: descriptive,
    });
  }

  const correlations = [
    ...safeArray(result?.pearsonCorrelations || result?.pearson),
    ...safeArray(result?.spearmanCorrelations || result?.spearman),
    ...safeArray(result?.correlations || result?.correlationResults),
  ]
    .map((row: any) => ({
      Test: row.test || '',
      Premenná1: row.variable1 || '',
      Premenná2: row.variable2 || '',
      Koeficient: row.coefficient ?? row.r ?? row.rho ?? '',
      AbsolútnaHodnota: Math.abs(
        Number(row.coefficient ?? row.r ?? row.rho ?? 0),
      ),
      Sila: row.strength || '',
      Smer: row.direction || '',
    }))
    .filter(
      (row: any) =>
        row.Premenná1 &&
        row.Premenná2 &&
        !isTechnicalIdName(row.Premenná1) &&
        !isTechnicalIdName(row.Premenná2),
    );

  if (correlations.length) {
    output.push({
      title: 'Grafové dáta – korelácie',
      description:
        'Dáta pripravené na vizualizáciu sily korelačných vzťahov.',
      rows: correlations,
    });
  }

  return output;
}

function getSummaryMetrics(result: any, tables: ExportTable[]): SummaryMetric[] {
  const variables = safeArray(result?.variables || result?.detectedVariables || result?.columns);

  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  ).filter((row: any) => !isTechnicalRow(row));

  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  const pearson = safeArray(result?.pearsonCorrelations || result?.pearson);
  const spearman = safeArray(result?.spearmanCorrelations || result?.spearman);
  const regression = safeArray(result?.regression || result?.regressions || result?.regressionResults);
  const anova = safeArray(result?.anova || result?.anovaResults);
  const tTests = safeArray(result?.tTests || result?.t_tests);
  const mannWhitney = safeArray(result?.mannWhitney || result?.mannWhitneyTests || result?.mann_whitney);
  const kruskal = safeArray(result?.kruskalWallis || result?.kruskalWallisTests || result?.kruskal_wallis);
  const cronbach = safeArray(result?.cronbachAlpha || result?.cronbach || result?.cronbach_alpha);

  const recommendedTests = safeArray(
    result?.recommendedTests ||
      result?.recommended_tests ||
      result?.tests,
  );

  const recommendedCharts = safeArray(
    result?.recommendedCharts ||
      result?.recommended_charts ||
      result?.charts,
  );

  return [
    {
      label: 'Premenné',
      value: variables.length,
    },
    {
      label: 'Deskriptíva',
      value: descriptive.length,
    },
    {
      label: 'Frekvencie',
      value: frequencies.length,
    },
    {
      label: 'Pearson',
      value: pearson.length,
    },
    {
      label: 'Spearman',
      value: spearman.length,
    },
    {
      label: 'Regresia',
      value: regression.length,
    },
    {
      label: 'ANOVA',
      value: anova.length,
    },
    {
      label: 'T-testy',
      value: tTests.length,
    },
    {
      label: 'Mann-Whitney',
      value: mannWhitney.length,
    },
    {
      label: 'Kruskal',
      value: kruskal.length,
    },
    {
      label: 'Cronbach alfa',
      value: cronbach.length,
    },
    {
      label: 'Odporúčané testy',
      value: recommendedTests.length,
    },
    {
      label: 'Odporúčané grafy',
      value: recommendedCharts.length,
    },
    {
      label: 'Sekcie',
      value: tables.length,
    },
  ];
}

function buildSummaryMetricsHtml(metrics: SummaryMetric[]): string {
  if (!metrics.length) return '';

  const cells = metrics
    .map(
      (metric) => `
        <td class="metric-card">
          <div class="metric-label">${htmlEscape(metric.label)}</div>
          <div class="metric-value">${htmlEscape(metric.value)}</div>
        </td>
      `,
    )
    .join('');

  return `
    <table class="metrics-table">
      <tr>${cells}</tr>
    </table>
  `;
}

function buildSectionTable(table: ExportTable, index: number): string {
  const columns = getColumns(table.rows);
  const color = SECTION_COLORS[index % SECTION_COLORS.length];

  const headerHtml = columns
    .map((column) => `<th>${htmlEscape(column.label)}</th>`)
    .join('');

  const bodyHtml = table.rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const rawValue = getExportCellValue(row, column);
          return `<td>${htmlEscape(getCellValue(rawValue))}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <tr>
      <td colspan="12" class="section-spacer">&nbsp;</td>
    </tr>

    <tr>
      <td colspan="12" class="section-title" style="background:${color};">
        ${htmlEscape(index + 1)}. ${htmlEscape(table.title)}
      </td>
    </tr>

    ${
      table.description
        ? `
          <tr>
            <td colspan="12" class="section-description">
              ${htmlEscape(table.description)}
            </td>
          </tr>
        `
        : ''
    }

    <tr>
      <td colspan="12" class="embedded-table-cell">
        <table class="data-table">
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>
      </td>
    </tr>
  `;
}

function createOneSheetExcelHtml(title: string, result: any): string {
  const summary = cleanText(result?.summary || '');

  const interpretation = cleanText(
    result?.interpretation ||
      result?.practicalText ||
      result?.fullText ||
      result?.output ||
      '',
  );

  const warnings = safeArray<string>(result?.warnings);

  const tables = [...getAllTables(result), ...buildChartDataTables(result)];

  const metrics = getSummaryMetrics(result, tables);

  const tablesHtml = tables
    .map((table, index) => buildSectionTable(table, index))
    .join('\n');

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8" />
<style>
  body {
    font-family: Arial, sans-serif;
    color: #111827;
    background: #ffffff;
  }

  .main-sheet {
    width: 100%;
    border-collapse: collapse;
  }

  .title-cell {
    background: #0f172a;
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    padding: 18px 20px;
    border: 1px solid #0f172a;
  }

  .subtitle-cell {
    background: #e0f2fe;
    color: #0f172a;
    font-size: 12px;
    padding: 10px 20px;
    border: 1px solid #bae6fd;
  }

  .meta-cell {
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    padding: 8px 20px;
    border: 1px solid #e2e8f0;
  }

  .block-title {
    background: #1d4ed8;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 14px;
    border: 1px solid #1d4ed8;
  }

  .block-content {
    background: #ffffff;
    color: #111827;
    font-size: 12px;
    padding: 12px 14px;
    border: 1px solid #dbeafe;
    line-height: 1.5;
  }

  .warning-title {
    background: #d97706;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 14px;
    border: 1px solid #d97706;
  }

  .warning-content {
    background: #fffbeb;
    color: #78350f;
    font-size: 12px;
    padding: 12px 14px;
    border: 1px solid #fcd34d;
  }

  .metrics-table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
  }

  .metric-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    padding: 10px;
    min-width: 115px;
  }

  .metric-label {
    color: #64748b;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .metric-value {
    color: #0f172a;
    font-size: 20px;
    font-weight: 800;
    margin-top: 4px;
  }

  .section-spacer {
    height: 16px;
    background: #ffffff;
    border: none;
  }

  .section-title {
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
  }

  .section-description {
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    font-style: italic;
    padding: 8px 14px;
    border: 1px solid #e2e8f0;
  }

  .embedded-table-cell {
    padding: 0;
    border: 1px solid #cbd5e1;
  }

  .data-table {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
  }

  .data-table th {
    background: #111827;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
    text-align: center;
    vertical-align: middle;
  }

  .data-table td {
    color: #111827;
    font-size: 11px;
    border: 1px solid #dbe3ef;
    padding: 6px 8px;
    vertical-align: top;
  }

  .data-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  .data-table tr:nth-child(odd) td {
    background: #ffffff;
  }

  .footer-cell {
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
  }
</style>
</head>

<body>
  <table class="main-sheet">
    <tr>
      <td colspan="12" class="title-cell">${htmlEscape(title)}</td>
    </tr>

    <tr>
      <td colspan="12" class="subtitle-cell">
        Profesionálne usporiadaný export výsledkov analýzy dát v jednom liste.
      </td>
    </tr>

    <tr>
      <td colspan="12" class="meta-cell">
        Vygenerované: ${htmlEscape(new Date().toLocaleString('sk-SK'))}
      </td>
    </tr>

    <tr>
      <td colspan="12" class="block-title">Prehľad výsledkov</td>
    </tr>

    <tr>
      <td colspan="12" class="block-content">
        ${buildSummaryMetricsHtml(metrics)}
      </td>
    </tr>

    ${
      summary
        ? `
          <tr>
            <td colspan="12" class="block-title">Súhrn</td>
          </tr>
          <tr>
            <td colspan="12" class="block-content">
              ${htmlEscape(summary).replace(/\n/g, '<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${
      warnings.length
        ? `
          <tr>
            <td colspan="12" class="warning-title">Upozornenia</td>
          </tr>
          <tr>
            <td colspan="12" class="warning-content">
              ${warnings.map((warning) => `• ${htmlEscape(warning)}`).join('<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${
      interpretation
        ? `
          <tr>
            <td colspan="12" class="block-title">Interpretácia / text do praktickej časti</td>
          </tr>
          <tr>
            <td colspan="12" class="block-content">
              ${htmlEscape(interpretation).replace(/\n/g, '<br />')}
            </td>
          </tr>
        `
        : ''
    }

    ${tablesHtml}

    <tr>
      <td colspan="12" class="section-spacer">&nbsp;</td>
    </tr>

    <tr>
      <td colspan="12" class="footer-cell">
        Poznámka: Duplicitné stĺpce Premenná / Názov sú zlúčené do jedného stĺpca Premenná. Technické identifikátory ako ID sa nepoužívajú v štatistických výpočtoch.
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function createWordHtml(title: string, result: any): string {
  return createOneSheetExcelHtml(title, result);
}

function pdfSafeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .replace(/\t/g, '    ');
}

function wrapText(text: string, maxLength: number): string[] {
  const clean = pdfSafeText(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const output: string[] = [];

  clean.split('\n').forEach((line) => {
    const words = line.split(/\s+/).filter(Boolean);

    if (!words.length) {
      output.push('');
      return;
    }

    let current = '';

    words.forEach((word) => {
      if (!current) {
        current = word;
        return;
      }

      if (`${current} ${word}`.length > maxLength) {
        output.push(current);
        current = word;
      } else {
        current += ` ${word}`;
      }
    });

    if (current) {
      output.push(current);
    }
  });

  return output;
}

function buildPdfLines(title: string, result: any): string[] {
  const tables = [...getAllTables(result), ...buildChartDataTables(result)];

  const lines: string[] = [];

  lines.push(title);
  lines.push('');
  lines.push(`Vygenerovane: ${new Date().toLocaleString('sk-SK')}`);
  lines.push('');
  lines.push('PREHLAD');
  lines.push('');

  getSummaryMetrics(result, tables).forEach((metric) => {
    lines.push(`${metric.label}: ${metric.value}`);
  });

  const summary = cleanText(result?.summary || '');

  if (summary) {
    lines.push('');
    lines.push('SUHRN');
    lines.push(...wrapText(summary, 95));
  }

  const interpretation = cleanText(
    result?.interpretation ||
      result?.practicalText ||
      result?.fullText ||
      result?.output ||
      '',
  );

  if (interpretation) {
    lines.push('');
    lines.push('INTERPRETACIA');
    lines.push(...wrapText(interpretation, 95));
  }

  tables.forEach((table, index) => {
    lines.push('');
    lines.push(`${index + 1}. ${table.title}`);

    if (table.description) {
      lines.push(...wrapText(table.description, 95));
    }

    const columns = getColumns(table.rows);

    lines.push(columns.map((column) => column.label).join(' | '));

    table.rows.slice(0, 120).forEach((row) => {
      const rowText = columns
        .map((column) => String(getCellValue(getExportCellValue(row, column))))
        .join(' | ');

      lines.push(...wrapText(rowText, 95));
    });
  });

  lines.push('');
  lines.push('Poznamka: PDF export je skutocny subor PDF, nie TXT. Diakritika je v PDF fallbacku zjednodusena kvoli kompatibilite bez externych balikov.');

  return lines;
}

function escapePdfString(value: string): string {
  return pdfSafeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createPdfBuffer(title: string, result: any): Buffer {
  const lines = buildPdfLines(title, result);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginLeft = 42;
  const startY = 790;
  const lineHeight = 13;
  const maxLinesPerPage = 56;

  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += maxLinesPerPage) {
    pages.push(lines.slice(index, index + maxLinesPerPage));
  }

  if (!pages.length) {
    pages.push(['Vysledky analyzy dat']);
  }

  const objects: string[] = [];

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);

  objects.push(
    `<< /Type /Pages /Kids [${pageObjectNumbers
      .map((objectNumber) => `${objectNumber} 0 R`)
      .join(' ')}] /Count ${pages.length} >>`,
  );

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 3 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );

    const contentLines: string[] = [];

    contentLines.push('BT');
    contentLines.push(`/F1 9 Tf`);
    contentLines.push(`${marginLeft} ${startY} Td`);

    pageLines.forEach((line, lineIndex) => {
      const isTitleLine =
        lineIndex === 0 &&
        (pageIndex === 0 || /^[0-9]+\./.test(line) || /^[A-Z0-9 ]+$/.test(line));

      if (isTitleLine) {
        contentLines.push('/F2 11 Tf');
      } else {
        contentLines.push('/F1 9 Tf');
      }

      contentLines.push(`(${escapePdfString(line)}) Tj`);
      contentLines.push(`0 -${lineHeight} Td`);
    });

    contentLines.push('ET');

    const content = contentLines.join('\n');

    objects.push(`<< /Length ${Buffer.byteLength(content, 'binary')} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'binary');

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
}

function fileResponse(params: {
  buffer: Buffer | string;
  fileName: string;
  contentType: string;
}) {
  const body =
    typeof params.buffer === 'string'
      ? params.buffer
      : new Uint8Array(params.buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': params.contentType,
      'Content-Disposition': `attachment; filename="${params.fileName}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExportBody;

    const result = body.result;

    if (!result || typeof result !== 'object') {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_RESULT',
          message: 'Chýba objekt result s výsledkami analýzy.',
        },
        { status: 400 },
      );
    }

    const requestedFormat = cleanText(body.format || 'xlsx').toLowerCase();

    const format =
      requestedFormat === 'word' || requestedFormat === 'doc'
        ? 'doc'
        : requestedFormat === 'pdf'
          ? 'pdf'
          : 'xls';

    const title = cleanText(
      body.title || result.title || 'Výsledky analýzy dát',
    );

    const baseFileName = sanitizeFileName(title);

    if (format === 'doc') {
      const html = createWordHtml(title, result);

      return fileResponse({
        buffer: html,
        fileName: `${baseFileName}.doc`,
        contentType: 'application/msword; charset=utf-8',
      });
    }

    if (format === 'pdf') {
      const pdfBuffer = createPdfBuffer(title, result);

      return fileResponse({
        buffer: pdfBuffer,
        fileName: `${baseFileName}.pdf`,
        contentType: 'application/pdf',
      });
    }

    const html = createOneSheetExcelHtml(title, result);

    return fileResponse({
      buffer: html,
      fileName: `${baseFileName}.xls`,
      contentType: 'application/vnd.ms-excel; charset=utf-8',
    });
  } catch (error) {
    console.error('ANALYZE_DATA_EXPORT_ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'EXPORT_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa vytvoriť export analýzy.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/analyze-data/export',
    methods: ['POST'],
    formats: ['word', 'doc', 'excel', 'xls', 'xlsx', 'pdf'],
    note:
      'Export zlučuje duplicitné stĺpce Premenná / Názov do jedného stĺpca Premenná, technické ID odstraňuje zo štatistických tabuliek a PDF vracia ako skutočný application/pdf súbor.',
  });
}