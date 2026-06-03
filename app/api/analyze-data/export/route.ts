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
  sheetName?: string;
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
  recommendation: 'Odporúčanie',
  recommendedTest: 'Odporúčaný test',
  normalityDecision: 'Rozhodnutie podľa normality',
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
  groupingVariable: 'Skupinová premenná',
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
  u: 'U',
  h: 'H',
  f: 'F',
  chiSquare: 'χ²',
  meanDifference: 'Rozdiel priemerov',

  alpha: 'Cronbach alfa',
  cronbachAlpha: 'Cronbach alfa',
  cronbach_alpha: 'Cronbach alfa',
  scale: 'Škála',
  items: 'Položky',
  itemCount: 'Počet položiek',
  alphaIfItemDeleted: 'Alfa pri odstránení položky',
  itemTotalCorrelation: 'Korelácia položka-celok',

  shapiroW: 'Shapiro-Wilk W',
  shapiro_w: 'Shapiro-Wilk W',
  w: 'W',
  normality: 'Normalita',
  normallyDistributed: 'Normálne rozdelenie',

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

function xmlEscape(value: unknown): string {
  return htmlEscape(value);
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

  if (normalizedTitle.includes('identifikovane_premenne')) return false;
  if (normalizedTitle.includes('spracovane_subory')) return false;

  return true;
}

function cleanRowsForTable(title: string, rows: Record<string, any>[]): Record<string, any>[] {
  if (!shouldRemoveTechnicalRowsFromTable(title)) return rows;
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

    'shapiroW',
    'shapiro_w',
    'w',
    'normality',
    'normallyDistributed',

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
    'groupingVariable',
    'group1',
    'group2',
    'mean1',
    'mean2',
    'sd1',
    'sd2',
    'n1',
    'n2',
    't',
    'u',
    'h',
    'f',
    'statistic',
    'meanDifference',

    'scale',
    'items',
    'itemCount',
    'alpha',
    'cronbachAlpha',
    'cronbach_alpha',
    'alphaIfItemDeleted',
    'itemTotalCorrelation',

    'reason',
    'recommendation',
    'recommendedTest',
    'normalityDecision',
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

    if (usedLabels.has(normalizedLabel)) continue;

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

  const text = String(value).trim();
  const normalized = text.replace(/\s/g, '').replace(',', '.');

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return text;
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);

  if (typeof value !== 'string') return false;

  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');

  return /^-?\d+(\.\d+)?$/.test(normalized) && Number.isFinite(Number(normalized));
}

function getNumericValue(value: unknown): number {
  if (typeof value === 'number') return value;
  return Number(String(value).trim().replace(/\s/g, '').replace(',', '.'));
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

function makeTable(
  title: string,
  rows: unknown,
  description = '',
  sheetName?: string,
): ExportTable {
  const normalizedRows = normalizeRows(rows);
  const cleanedRows = cleanRowsForTable(title, normalizedRows);

  return {
    title,
    sheetName,
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
        'Súhrn',
      ),
    );
  }

  const variables = safeArray(result?.variables || result?.detectedVariables || result?.columns);

  if (variables.length) {
    tables.push(
      makeTable(
        'Identifikované premenné',
        variables,
        'Prehľad premenných rozpoznaných v dátach. Technické identifikátory ako ID môžu byť zobrazené iba informačne, ale nepočítajú sa do štatistických výpočtov.',
        'Súhrn',
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
        'Deskriptíva',
      ),
    );
  }

  const normality = safeArray(
    result?.normality ||
      result?.normalityTests ||
      result?.normality_tests ||
      result?.shapiroWilk ||
      result?.shapiro_wilk ||
      result?.shapiroWilkTests ||
      result?.shapiro_wilk_tests,
  );

  if (normality.length) {
    tables.push(
      makeTable(
        'Shapiro-Wilk test normality',
        normality,
        'Test normality dát. Pri p > 0,05 sa obvykle uvažuje normálne rozdelenie; pri p ≤ 0,05 sa odporúča neparametrický postup.',
        'Deskriptíva',
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
      sheetName: 'Frekvencia',
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
        'Lineárne vzťahy medzi numerickými premennými. Vhodné najmä pri približne normálnom rozdelení dát.',
        'Korelácie',
      ),
    );
  }

  const spearman = safeArray(result?.spearmanCorrelations || result?.spearman);

  if (spearman.length) {
    tables.push(
      makeTable(
        'Spearmanove korelácie',
        spearman,
        'Poradové alebo monotónne vzťahy medzi premennými. Vhodné pri ordinálnych dátach alebo pri porušení normality.',
        'Korelácie',
      ),
    );
  }

  const correlations = safeArray(result?.correlations || result?.correlationResults);

  if (correlations.length && !pearson.length && !spearman.length) {
    tables.push(
      makeTable(
        'Korelácie',
        correlations,
        'Korelačné výsledky medzi premennými. Ak nie je jasné, či použiť Pearson alebo Spearman, export ponechá všetky dostupné výpočty.',
        'Korelácie',
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
        'Testy',
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
        'Testy',
      ),
    );
  }

  const tTests = safeArray(result?.tTests || result?.t_tests || result?.studentTests || result?.student_tests);

  if (tTests.length) {
    tables.push(
      makeTable(
        'Studentov t-test',
        tTests,
        'Porovnanie dvoch skupín pri numerických premenných.',
        'Testy',
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
        'Testy',
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
        'Testy',
      ),
    );
  }

  const cronbach = safeArray(
    result?.cronbachAlpha ||
      result?.cronbach ||
      result?.cronbach_alpha ||
      result?.reliability ||
      result?.reliabilityAnalysis ||
      result?.reliability_analysis,
  );

  if (cronbach.length) {
    tables.push(
      makeTable(
        'Cronbach alfa',
        cronbach,
        'Vnútorná konzistencia dotazníkových škál. Sociodemografické ukazovatele sa do Cronbachovej alfy nemajú zahŕňať.',
        'Cronbach alfa',
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
        'Testy',
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
        'Odporúčanie podľa typu premenných, normality dát a počtu skupín. Ak systém nevie rozhodnúť jednoznačne, ponechá všetky dostupné výpočty a doplní odporúčanie, čo použiť v práci.',
        'Testy',
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
        'Grafy',
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
      sheetName: cleanText(table.sheetName || table.sheet || 'Doplnkové tabuľky'),
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

  frequencies.slice(0, 20).forEach((table: any, index) => {
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
      sheetName: 'Grafy',
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
      sheetName: 'Grafy',
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
      AbsolútnaHodnota: Math.abs(Number(row.coefficient ?? row.r ?? row.rho ?? 0)),
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
      sheetName: 'Grafy',
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
  const normality = safeArray(result?.normality || result?.normalityTests || result?.shapiroWilk);
  const regression = safeArray(result?.regression || result?.regressions || result?.regressionResults);
  const anova = safeArray(result?.anova || result?.anovaResults);
  const tTests = safeArray(result?.tTests || result?.t_tests || result?.studentTests);
  const mannWhitney = safeArray(result?.mannWhitney || result?.mannWhitneyTests || result?.mann_whitney);
  const kruskal = safeArray(result?.kruskalWallis || result?.kruskalWallisTests || result?.kruskal_wallis);
  const cronbach = safeArray(result?.cronbachAlpha || result?.cronbach || result?.cronbach_alpha || result?.reliability);

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
    { label: 'Premenné', value: variables.length },
    { label: 'Deskriptíva', value: descriptive.length },
    { label: 'Frekvencie', value: frequencies.length },
    { label: 'Shapiro-Wilk', value: normality.length },
    { label: 'Pearson', value: pearson.length },
    { label: 'Spearman', value: spearman.length },
    { label: 'Regresia', value: regression.length },
    { label: 'ANOVA', value: anova.length },
    { label: 'T-testy', value: tTests.length },
    { label: 'Mann-Whitney', value: mannWhitney.length },
    { label: 'Kruskal-Wallis', value: kruskal.length },
    { label: 'Cronbach alfa', value: cronbach.length },
    { label: 'Odporúčané testy', value: recommendedTests.length },
    { label: 'Odporúčané grafy', value: recommendedCharts.length },
    { label: 'Sekcie', value: tables.length },
  ];
}

function buildSummaryMetricsHtml(metrics: SummaryMetric[]): string {
  if (!metrics.length) return '';

  const rows = metrics
    .map(
      (metric) => `
        <tr>
          <td class="metric-label">${htmlEscape(metric.label)}</td>
          <td class="metric-value">${htmlEscape(metric.value)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <table class="metrics-table">
      ${rows}
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
    <h2 style="border-left:10px solid ${color};padding-left:10px;">
      ${htmlEscape(index + 1)}. ${htmlEscape(table.title)}
    </h2>

    ${
      table.description
        ? `<p class="section-description">${htmlEscape(table.description)}</p>`
        : ''
    }

    <table class="data-table">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${bodyHtml}
      </tbody>
    </table>
  `;
}

function createWordHtml(title: string, result: any): string {
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
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: A4;
    margin: 1.2cm;
  }

  body {
    font-family: Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    font-size: 10.5pt;
  }

  h1 {
    color: #0f172a;
    font-size: 22pt;
    margin-bottom: 4pt;
  }

  h2 {
    color: #0f172a;
    font-size: 14pt;
    margin-top: 18pt;
    margin-bottom: 8pt;
  }

  .subtitle {
    background: #e0f2fe;
    color: #0f172a;
    padding: 8pt;
    border: 1px solid #bae6fd;
  }

  .block-title {
    background: #1d4ed8;
    color: #ffffff;
    font-weight: 700;
    padding: 6pt;
    margin-top: 12pt;
  }

  .block-content {
    border: 1px solid #dbeafe;
    padding: 8pt;
    line-height: 1.45;
  }

  .warning-title {
    background: #d97706;
    color: #ffffff;
    font-weight: 700;
    padding: 6pt;
    margin-top: 12pt;
  }

  .warning-content {
    background: #fffbeb;
    color: #78350f;
    border: 1px solid #fcd34d;
    padding: 8pt;
  }

  .metrics-table {
    border-collapse: collapse;
    width: 100%;
  }

  .metrics-table td {
    border: 1px solid #cbd5e1;
    padding: 4pt 6pt;
  }

  .metric-label {
    background: #f8fafc;
    color: #64748b;
    font-weight: 700;
    width: 45%;
  }

  .metric-value {
    color: #0f172a;
    font-weight: 800;
  }

  .section-description {
    background: #f8fafc;
    color: #475569;
    font-style: italic;
    padding: 6pt;
    border: 1px solid #e2e8f0;
  }

  .data-table {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
    margin-bottom: 14pt;
  }

  .data-table th {
    background: #111827;
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    border: 1px solid #cbd5e1;
    padding: 4pt;
    text-align: center;
    vertical-align: middle;
  }

  .data-table td {
    color: #111827;
    font-size: 8pt;
    border: 1px solid #dbe3ef;
    padding: 4pt;
    vertical-align: top;
    word-wrap: break-word;
  }

  .data-table tr:nth-child(even) td {
    background: #f8fafc;
  }

  .footer {
    background: #f1f5f9;
    color: #475569;
    font-size: 9pt;
    padding: 8pt;
    border: 1px solid #cbd5e1;
    margin-top: 16pt;
  }
</style>
</head>

<body>
  <h1>${htmlEscape(title)}</h1>

  <p class="subtitle">
    Profesionálne usporiadaný export výsledkov analýzy dát. Tabuľky sú zúžené a prispôsobené na A4.
  </p>

  <p>
    <strong>Vygenerované:</strong> ${htmlEscape(new Date().toLocaleString('sk-SK'))}
  </p>

  <div class="block-title">Prehľad výsledkov</div>
  <div class="block-content">
    ${buildSummaryMetricsHtml(metrics)}
  </div>

  ${
    summary
      ? `
        <div class="block-title">Súhrn</div>
        <div class="block-content">
          ${htmlEscape(summary).replace(/\n/g, '<br />')}
        </div>
      `
      : ''
  }

  ${
    warnings.length
      ? `
        <div class="warning-title">Upozornenia</div>
        <div class="warning-content">
          ${warnings.map((warning) => `• ${htmlEscape(warning)}`).join('<br />')}
        </div>
      `
      : ''
  }

  ${
    interpretation
      ? `
        <div class="block-title">Interpretácia / text do praktickej časti</div>
        <div class="block-content">
          ${htmlEscape(interpretation).replace(/\n/g, '<br />')}
        </div>
      `
      : ''
  }

  ${tablesHtml}

  <div class="footer">
    Poznámka: Ak systém nevie jednoznačne rozhodnúť medzi Pearson/Spearman alebo medzi parametrickým a neparametrickým testom, ponechá dostupné výpočty a pridá odporúčanie, čo použiť v práci.
  </div>
</body>
</html>
`;
}

function getExcelSheetName(value: string): string {
  const cleaned = cleanText(value)
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  return cleaned || 'Sheet';
}

function groupTablesForSheets(result: any): Record<string, ExportTable[]> {
  const tables = [...getAllTables(result), ...buildChartDataTables(result)];

  const grouped: Record<string, ExportTable[]> = {
    Súhrn: [],
    Frekvencia: [],
    Deskriptíva: [],
    'Cronbach alfa': [],
    Korelácie: [],
    Testy: [],
    Grafy: [],
  };

  tables.forEach((table) => {
    const sheetName = getExcelSheetName(table.sheetName || 'Doplnkové tabuľky');

    if (!grouped[sheetName]) grouped[sheetName] = [];
    grouped[sheetName].push(table);
  });

  return Object.fromEntries(
    Object.entries(grouped).filter(([, sheetTables]) => sheetTables.length > 0),
  );
}

function buildExcelCell(value: unknown, styleId = 'Default'): string {
  const cellValue = getCellValue(value);

  if (isNumericLike(cellValue)) {
    return `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${getNumericValue(cellValue)}</Data></Cell>`;
  }

  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${xmlEscape(cellValue)}</Data></Cell>`;
}

function buildExcelTableRows(table: ExportTable, index: number): string {
  const columns = getColumns(table.rows);

  const titleRow = `
    <Row>
      <Cell ss:StyleID="SectionTitle" ss:MergeAcross="${Math.max(columns.length - 1, 0)}">
        <Data ss:Type="String">${xmlEscape(index + 1)}. ${xmlEscape(table.title)}</Data>
      </Cell>
    </Row>
  `;

  const descriptionRow = table.description
    ? `
      <Row>
        <Cell ss:StyleID="Description" ss:MergeAcross="${Math.max(columns.length - 1, 0)}">
          <Data ss:Type="String">${xmlEscape(table.description)}</Data>
        </Cell>
      </Row>
    `
    : '';

  const headerRow = `
    <Row>
      ${columns
        .map((column) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(column.label)}</Data></Cell>`)
        .join('')}
    </Row>
  `;

  const dataRows = table.rows
    .map(
      (row) => `
        <Row>
          ${columns
            .map((column) => buildExcelCell(getExportCellValue(row, column), 'Cell'))
            .join('')}
        </Row>
      `,
    )
    .join('');

  return `
    <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
    ${titleRow}
    ${descriptionRow}
    ${headerRow}
    ${dataRows}
  `;
}


function clampNumber(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getChartNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const normalized = String(value)
    .replace('%', '')
    .replace(/\s/g, '')
    .replace(',', '.');

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getPercentLike(value: unknown): number {
  const numeric = getChartNumber(value, 0);

  if (numeric <= 1 && numeric > 0) {
    return clampNumber(numeric * 100);
  }

  return clampNumber(numeric);
}

function getChartCellValue(row: Record<string, any>, keys: string[], fallback: unknown = ''): unknown {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && value !== '') return value;
  }

  return fallback;
}

function buildBlankExcelRow(): string {
  return '<Row><Cell><Data ss:Type="String"></Data></Cell></Row>';
}

function buildMergedExcelRow(text: unknown, styleId: string, mergeAcross = 17, height?: number): string {
  return `
    <Row${height ? ` ss:Height="${height}"` : ''}>
      <Cell ss:StyleID="${styleId}" ss:MergeAcross="${mergeAcross}">
        <Data ss:Type="String">${xmlEscape(text)}</Data>
      </Cell>
    </Row>
  `;
}

function buildExcelBarCells(value: number, maxValue: number, segments = 14, activeStyle = 'ChartBarPurple'): string {
  const safeMax = maxValue > 0 ? maxValue : 100;
  const activeSegments = Math.max(0, Math.min(segments, Math.round((value / safeMax) * segments)));

  return Array.from({ length: segments })
    .map((_, index) => {
      const styleId = index < activeSegments ? activeStyle : 'ChartBarEmpty';
      return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String"></Data></Cell>`;
    })
    .join('');
}

function buildExcelVisualBarRow(label: unknown, value: number, maxValue: number, suffix = '', activeStyle = 'ChartBarPurple'): string {
  return `
    <Row ss:Height="21">
      <Cell ss:StyleID="ChartLabel"><Data ss:Type="String">${xmlEscape(label)}</Data></Cell>
      <Cell ss:StyleID="ChartValue"><Data ss:Type="Number">${Number(value.toFixed(2))}</Data></Cell>
      ${buildExcelBarCells(value, maxValue, 14, activeStyle)}
      <Cell ss:StyleID="ChartNote" ss:MergeAcross="1"><Data ss:Type="String">${xmlEscape(`${Number(value.toFixed(2))}${suffix}`)}</Data></Cell>
    </Row>
  `;
}

function buildExcelMetricCard(label: unknown, value: unknown, styleId = 'MetricCard'): string {
  return `
    <Cell ss:StyleID="${styleId}" ss:MergeAcross="3">
      <Data ss:Type="String">${xmlEscape(`${label}: ${value}`)}</Data>
    </Cell>
  `;
}

function getVisualFrequencyCharts(result: any): string {
  const frequencies = safeArray(
    result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );

  const blocks = frequencies.slice(0, 5).map((table: any, tableIndex) => {
    const rawRows = getFrequencyRows(table)
      .map((row) => ({
        label: getChartCellValue(row, ['value', 'category', 'name', 'label', VARIABLE_COLUMN_KEY], ''),
        count: getChartNumber(getChartCellValue(row, ['frequency', 'count', 'n', 'Počet'], 0), 0),
        percent: getPercentLike(getChartCellValue(row, ['percent', 'percentage', 'validPercent', 'valid_percent'], 0)),
      }))
      .filter((row) => row.label !== '' && !isTechnicalIdName(row.label));

    const rows = rawRows
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    if (!rows.length) return '';

    const max = Math.max(...rows.map((row) => row.count), 1);
    const title = cleanText(table?.title || table?.variable || table?.name || `Frekvenčný graf ${tableIndex + 1}`);

    return `
      ${buildBlankExcelRow()}
      ${buildMergedExcelRow(`Stĺpcový graf – ${title}`, 'ChartSectionTitle', 17)}
      <Row>
        <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Kategória</Data></Cell>
        <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Počet</Data></Cell>
        <Cell ss:StyleID="ChartHeader" ss:MergeAcross="13"><Data ss:Type="String">Vizuálny stĺpec</Data></Cell>
        <Cell ss:StyleID="ChartHeader" ss:MergeAcross="1"><Data ss:Type="String">Hodnota</Data></Cell>
      </Row>
      ${rows
        .map((row, index) =>
          buildExcelVisualBarRow(
            row.label,
            row.count,
            max,
            row.percent ? ` (${Number(row.percent.toFixed(1))} %)` : '',
            index % 2 === 0 ? 'ChartBarPurple' : 'ChartBarBlue',
          ),
        )
        .join('')}
    `;
  });

  return blocks.filter(Boolean).join('');
}

function getVisualDescriptiveCharts(result: any): string {
  const descriptive = safeArray(
    result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  )
    .map((row: any) => ({
      label: getBestVariableValue(row) || row.variable || row.name || row.label || '',
      mean: getChartNumber(row.M ?? row.mean ?? row.average, NaN),
      median: getChartNumber(row.Md ?? row.median, NaN),
      sd: getChartNumber(row.SD ?? row.sd ?? row.stdDeviation ?? row.standardDeviation, NaN),
      min: getChartNumber(row.min ?? row.minimum, NaN),
      max: getChartNumber(row.max ?? row.maximum, NaN),
    }))
    .filter((row) => row.label && !isTechnicalIdName(row.label) && Number.isFinite(row.mean));

  if (!descriptive.length) return '';

  const rows = descriptive.slice(0, 10);
  const maxMean = Math.max(...rows.map((row) => Math.abs(row.mean)), 1);
  const maxSd = Math.max(...rows.map((row) => Math.abs(row.sd || 0)), 1);

  return `
    ${buildBlankExcelRow()}
    ${buildMergedExcelRow('Deskriptívne grafy – priemery a variabilita', 'ChartSectionTitle', 17)}
    <Row>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Premenná</Data></Cell>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Priemer</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="13"><Data ss:Type="String">Vizuálny priemer</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="1"><Data ss:Type="String">M / SD</Data></Cell>
    </Row>
    ${rows
      .map((row) =>
        buildExcelVisualBarRow(
          row.label,
          Math.abs(row.mean),
          maxMean,
          ` (M=${Number(row.mean.toFixed(2))}; SD=${Number((row.sd || 0).toFixed(2))})`,
          'ChartBarGreen',
        ),
      )
      .join('')}
    ${buildBlankExcelRow()}
    <Row>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Premenná</Data></Cell>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">SD</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="13"><Data ss:Type="String">Vizuálna variabilita</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="1"><Data ss:Type="String">Rozptyl dát</Data></Cell>
    </Row>
    ${rows
      .filter((row) => Number.isFinite(row.sd))
      .map((row) =>
        buildExcelVisualBarRow(
          row.label,
          Math.abs(row.sd || 0),
          maxSd,
          ` SD`,
          'ChartBarOrange',
        ),
      )
      .join('')}
  `;
}

function getVisualCorrelationCharts(result: any): string {
  const correlations = [
    ...safeArray(result?.pearsonCorrelations || result?.pearson),
    ...safeArray(result?.spearmanCorrelations || result?.spearman),
    ...safeArray(result?.correlations || result?.correlationResults),
  ]
    .map((row: any) => {
      const coefficient = getChartNumber(row.coefficient ?? row.r ?? row.rho, NaN);

      return {
        label: `${row.variable1 || row.Premenná1 || ''} × ${row.variable2 || row.Premenná2 || ''}`,
        coefficient,
        abs: Math.abs(coefficient),
        p: row.pValue ?? row.p_value ?? row.p ?? '',
        strength: row.strength || '',
      };
    })
    .filter(
      (row) =>
        row.label.trim() !== '×' &&
        Number.isFinite(row.coefficient) &&
        !row.label.split('×').some((part) => isTechnicalIdName(part.trim())),
    )
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 10);

  if (!correlations.length) return '';

  return `
    ${buildBlankExcelRow()}
    ${buildMergedExcelRow('Korelačný graf – sila vzťahov', 'ChartSectionTitle', 17)}
    <Row>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">Vzťah</Data></Cell>
      <Cell ss:StyleID="ChartHeader"><Data ss:Type="String">|r|</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="13"><Data ss:Type="String">Vizuálna sila vzťahu</Data></Cell>
      <Cell ss:StyleID="ChartHeader" ss:MergeAcross="1"><Data ss:Type="String">r / p</Data></Cell>
    </Row>
    ${correlations
      .map((row) =>
        buildExcelVisualBarRow(
          row.label,
          row.abs,
          1,
          ` (r=${Number(row.coefficient.toFixed(3))}${row.p !== '' ? `; p=${row.p}` : ''})`,
          row.coefficient >= 0 ? 'ChartBarGreen' : 'ChartBarRed',
        ),
      )
      .join('')}
  `;
}

function buildExcelVisualCharts(result: any, title: string): string {
  const allTables = [...getAllTables(result), ...buildChartDataTables(result)];
  const metrics = getSummaryMetrics(result, allTables);
  const metricMap = new Map(metrics.map((metric) => [metric.label, metric.value]));
  const descriptiveCount = Number(metricMap.get('Deskriptíva') || 0);
  const frequencyCount = Number(metricMap.get('Frekvencie') || 0);
  const correlationCount = Number(metricMap.get('Pearson') || 0) + Number(metricMap.get('Spearman') || 0);
  const chartCount = Number(metricMap.get('Odporúčané grafy') || 0);

  const frequencyCharts = getVisualFrequencyCharts(result);
  const descriptiveCharts = getVisualDescriptiveCharts(result);
  const correlationCharts = getVisualCorrelationCharts(result);

  return `
    <Row>
      <Cell ss:StyleID="DashboardTitle" ss:MergeAcross="17">
        <Data ss:Type="String">${xmlEscape(`Vizuálne grafy – ${title}`)}</Data>
      </Cell>
    </Row>
    <Row>
      <Cell ss:StyleID="DashboardSubtitle" ss:MergeAcross="17">
        <Data ss:Type="String">Grafy sú vložené priamo na liste Grafy ako vizuálne Excel panely. Sú pod nimi aj zdrojové dáta, aby sa dali ďalej upraviť alebo prerobiť na natívne grafy v Exceli.</Data>
      </Cell>
    </Row>
    ${buildBlankExcelRow()}
    <Row ss:Height="42">
      ${buildExcelMetricCard('Frekvenčné grafy', frequencyCount, 'MetricCardPurple')}
      ${buildExcelMetricCard('Deskriptívne grafy', descriptiveCount, 'MetricCardGreen')}
      ${buildExcelMetricCard('Korelačné grafy', correlationCount, 'MetricCardBlue')}
      ${buildExcelMetricCard('Odporúčané grafy', chartCount, 'MetricCardOrange')}
    </Row>
    ${frequencyCharts || buildMergedExcelRow('Frekvenčné grafy: dáta neboli dostupné alebo neobsahovali použiteľné kategórie.', 'Description', 17)}
    ${descriptiveCharts || buildMergedExcelRow('Deskriptívne grafy: dáta neboli dostupné alebo neobsahovali číselné premenné.', 'Description', 17)}
    ${correlationCharts || buildMergedExcelRow('Korelačný graf: korelačné výsledky neboli dostupné.', 'Description', 17)}
    ${buildBlankExcelRow()}
    ${buildMergedExcelRow('Zdrojové dáta pre grafy', 'SectionTitle', 17)}
  `;
}

function createExcelXml(title: string, result: any): string {
  const grouped = groupTablesForSheets(result);
  const allTables = Object.values(grouped).flat();
  const metrics = getSummaryMetrics(result, allTables);

  const summary = cleanText(result?.summary || '');
  const interpretation = cleanText(
    result?.interpretation ||
      result?.practicalText ||
      result?.fullText ||
      result?.output ||
      '',
  );

  const warnings = safeArray<string>(result?.warnings);

  const worksheets = Object.entries(grouped)
    .map(([sheetName, tables]) => {
      const safeSheetName = getExcelSheetName(sheetName);

      const introRows =
        safeSheetName === 'Súhrn'
          ? `
            <Row>
              <Cell ss:StyleID="Title" ss:MergeAcross="7">
                <Data ss:Type="String">${xmlEscape(title)}</Data>
              </Cell>
            </Row>
            <Row>
              <Cell ss:StyleID="Description" ss:MergeAcross="7">
                <Data ss:Type="String">Vygenerované: ${xmlEscape(new Date().toLocaleString('sk-SK'))}</Data>
              </Cell>
            </Row>
            <Row>
              <Cell ss:StyleID="SectionTitle" ss:MergeAcross="1">
                <Data ss:Type="String">Prehľad výsledkov</Data>
              </Cell>
            </Row>
            ${metrics
              .map(
                (metric) => `
                  <Row>
                    <Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(metric.label)}</Data></Cell>
                    ${buildExcelCell(metric.value, 'Cell')}
                  </Row>
                `,
              )
              .join('')}
            ${
              summary
                ? `
                  <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
                  <Row>
                    <Cell ss:StyleID="SectionTitle" ss:MergeAcross="7">
                      <Data ss:Type="String">Súhrn</Data>
                    </Cell>
                  </Row>
                  <Row>
                    <Cell ss:StyleID="LongText" ss:MergeAcross="7">
                      <Data ss:Type="String">${xmlEscape(summary)}</Data>
                    </Cell>
                  </Row>
                `
                : ''
            }
            ${
              interpretation
                ? `
                  <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
                  <Row>
                    <Cell ss:StyleID="SectionTitle" ss:MergeAcross="7">
                      <Data ss:Type="String">Interpretácia / text do praktickej časti</Data>
                    </Cell>
                  </Row>
                  <Row>
                    <Cell ss:StyleID="LongText" ss:MergeAcross="7">
                      <Data ss:Type="String">${xmlEscape(interpretation)}</Data>
                    </Cell>
                  </Row>
                `
                : ''
            }
            ${
              warnings.length
                ? `
                  <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
                  <Row>
                    <Cell ss:StyleID="WarningTitle" ss:MergeAcross="7">
                      <Data ss:Type="String">Upozornenia</Data>
                    </Cell>
                  </Row>
                  ${warnings
                    .map(
                      (warning) => `
                        <Row>
                          <Cell ss:StyleID="Warning" ss:MergeAcross="7">
                            <Data ss:Type="String">• ${xmlEscape(warning)}</Data>
                          </Cell>
                        </Row>
                      `,
                    )
                    .join('')}
                `
                : ''
            }
          `
          : safeSheetName === 'Grafy'
            ? buildExcelVisualCharts(result, title)
            : `
              <Row>
                <Cell ss:StyleID="Title" ss:MergeAcross="17">
                  <Data ss:Type="String">${xmlEscape(safeSheetName)}</Data>
                </Cell>
              </Row>
            `;

      const tableRows = tables
        .map((table, index) => buildExcelTableRows(table, index))
        .join('');

      return `
        <Worksheet ss:Name="${xmlEscape(safeSheetName)}">
          <Table ss:DefaultColumnWidth="115">
            <Column ss:AutoFitWidth="1" ss:Width="170"/>
            <Column ss:AutoFitWidth="1" ss:Width="78"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="24"/>
            <Column ss:AutoFitWidth="1" ss:Width="135"/>
            <Column ss:AutoFitWidth="1" ss:Width="135"/>
            ${introRows}
            ${tableRows}
          </Table>
          <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
            <PageSetup>
              <Layout x:Orientation="Landscape"/>
              <Header x:Margin="0.3"/>
              <Footer x:Margin="0.3"/>
              <PageMargins x:Bottom="0.5" x:Left="0.4" x:Right="0.4" x:Top="0.5"/>
            </PageSetup>
            <FitToPage/>
            <Print>
              <FitWidth>1</FitWidth>
              <FitHeight>0</FitHeight>
              <ValidPrinterInfo/>
              <HorizontalResolution>600</HorizontalResolution>
              <VerticalResolution>600</VerticalResolution>
            </Print>
            <FreezePanes/>
            <FrozenNoSplit/>
            <SplitHorizontal>1</SplitHorizontal>
            <TopRowBottomPane>1</TopRowBottomPane>
            <ActivePane>2</ActivePane>
          </WorksheetOptions>
        </Worksheet>
      `;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">

  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Zedpera</Author>
    <LastAuthor>Zedpera</LastAuthor>
    <Created>${new Date().toISOString()}</Created>
    <Company>Zedpera</Company>
    <Version>16.00</Version>
  </DocumentProperties>

  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>

    <Style ss:ID="Title">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>

    <Style ss:ID="SectionTitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>

    <Style ss:ID="Cell">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <NumberFormat ss:Format="General"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE3EF"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE3EF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE3EF"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DBE3EF"/>
      </Borders>
    </Style>

    <Style ss:ID="Description">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="9" ss:Italic="1" ss:Color="#475569"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="LongText">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#111827"/>
    </Style>

    <Style ss:ID="WarningTitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#D97706" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="Warning">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#78350F"/>
      <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="DashboardTitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="18" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#111827" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="DashboardSubtitle">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#CBD5E1"/>
      <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ChartSectionTitle">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#7C3AED" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ChartHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#334155" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartLabel">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ChartValue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ChartNote">
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="8" ss:Bold="1" ss:Color="#475569"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="ChartBarEmpty">
      <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartBarPurple">
      <Interior ss:Color="#7C3AED" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartBarBlue">
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartBarGreen">
      <Interior ss:Color="#059669" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartBarOrange">
      <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="ChartBarRed">
      <Interior ss:Color="#DC2626" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/>
      </Borders>
    </Style>

    <Style ss:ID="MetricCard">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#334155" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="MetricCardPurple">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#7C3AED" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="MetricCardGreen">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#059669" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="MetricCardBlue">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
    </Style>

    <Style ss:ID="MetricCardOrange">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#EA580C" ss:Pattern="Solid"/>
    </Style>
  </Styles>

  ${worksheets}
</Workbook>`;
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

    if (current) output.push(current);
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

  if (!pages.length) pages.push(['Vysledky analyzy dat']);

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
    contentLines.push('/F1 9 Tf');
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

    const excelXml = createExcelXml(title, result);

    return fileResponse({
      buffer: excelXml,
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
      'Export delí Excel do samostatných sheetov: Súhrn, Frekvencia, Deskriptíva, Cronbach alfa, Korelácie, Testy a Grafy. Bunky s číslami sa zapisujú ako čísla, PDF sa vracia ako skutočný application/pdf súbor a Word je prispôsobený na A4.',
  });
}