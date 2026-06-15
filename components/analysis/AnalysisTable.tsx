'use client';

import type { AnalysisResult } from './analysisTypes';

type Props = {
  result?: AnalysisResult | null;
};

type GenericRow = Record<string, unknown>;

type NormalizedSection = {
  key: string;
  title: string;
  description?: string;
  rows: GenericRow[];
  limitPreview?: boolean;
};

type PreparedDatasetSummary = {
  rowCount: number;
  variableCount: number;
  scaleCount: number;
  subscaleCount: number;
  rawDataFileName: string;
};

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  respondentId: 'ID respondenta',
  poradie: 'Poradie',

  name: 'Premenná',
  variable: 'Premenná',
  premenna: 'Premenná',
  column: 'Stĺpec',
  label: 'Názov',
  originalName: 'Pôvodný názov',
  displayName: 'Zobrazený názov',

  type: 'Typ',
  dataType: 'Typ dát',
  kind: 'Druh premennej',
  role: 'Rola',
  measurementLevel: 'Úroveň merania',
  scale: 'Škála',
  scaleGroup: 'Skupina škály',
  reverseScored: 'Reverzne skórované',

  valid: 'N platných',
  validValues: 'Platné hodnoty',
  validCount: 'N platných',
  nonMissing: 'N platných',
  n: 'N',
  count: 'Počet',
  missing: 'Chýbajúce',
  missingValues: 'Chýbajúce',
  missingCount: 'Chýbajúce',

  uniqueValues: 'Počet unikátnych hodnôt',
  uniqueCount: 'Počet unikátnych hodnôt',
  categories: 'Kategórie',
  examples: 'Príklady',

  mean: 'M',
  M: 'M',
  average: 'Priemer',
  median: 'Medián',
  Md: 'Medián',
  mode: 'Modus',

  stdDeviation: 'SD',
  standardDeviation: 'SD',
  stdDev: 'SD',
  std: 'SD',
  sd: 'SD',
  SD: 'SD',
  variance: 'Rozptyl',

  minimum: 'Min',
  min: 'Min',
  maximum: 'Max',
  max: 'Max',
  range: 'Rozpätie',
  sum: 'Súčet',

  skewness: 'Šikmosť',
  kurtosis: 'Špicatosť',
  q1: 'Q1',
  q3: 'Q3',
  iqr: 'IQR',

  confidenceIntervalLower: 'Dolná hranica CI',
  confidenceIntervalUpper: 'Horná hranica CI',

  value: 'Hodnota',
  category: 'Kategória',
  frequency: 'Počet',
  percent: 'Percento',
  percentage: 'Percento',
  validPercent: 'Validné percento',
  cumulativePercent: 'Kumulatívne percento',

  test: 'Test',
  dependentVariable: 'Závislá premenná',
  independentVariable: 'Nezávislá premenná',
  groupVariable: 'Skupinová premenná',
  groupingVariable: 'Skupinová premenná',
  groups: 'Skupiny',

  group1: 'Skupina 1',
  group2: 'Skupina 2',
  mean1: 'Priemer 1',
  mean2: 'Priemer 2',
  sd1: 'SD 1',
  sd2: 'SD 2',
  n1: 'N 1',
  n2: 'N 2',

  statistic: 'Štatistika',
  valueStatistic: 'Štatistika',
  t: 't',
  f: 'F',
  u: 'U',
  h: 'H',
  r: 'r',
  rho: 'ρ',
  pearsonR: 'Pearson r',
  spearmanRho: 'Spearman ρ',
  coefficient: 'Koeficient',
  p: 'p',
  pValue: 'p',
  df: 'df',
  df1: 'df1',
  df2: 'df2',
  degreesOfFreedom: 'df',
  significance: 'Významnosť',
  significant: 'Štatisticky významné',
  alpha: 'Alfa',

  effectSize: 'Veľkosť efektu',
  cohensD: "Cohenovo d",
  meanDifference: 'Rozdiel priemerov',

  result: 'Výsledok',
  conclusion: 'Záver',
  interpretation: 'Interpretácia',

  title: 'Názov',
  chart: 'Graf',
  chartType: 'Typ grafu',
  reason: 'Odôvodnenie',
  recommendation: 'Odporúčanie',
  recommendedUse: 'Odporúčané použitie',
  hypothesis: 'Hypotéza',
  assumptions: 'Predpoklady',
  whenToUse: 'Kedy použiť',

  itemCount: 'Počet položiek',
  items: 'Položky',
  validN: 'N platných',
  cronbachAlpha: 'Cronbachova alfa',
  alphaValue: 'Alfa',

  sourceFileName: 'Zdrojový súbor',
  selectedSheetName: 'Vybraný hárok',
  headerRowIndex: 'Riadok hlavičky',
  originalRowCount: 'Pôvodný počet riadkov',
  rowCount: 'Počet riadkov',
  originalColumnCount: 'Pôvodný počet stĺpcov',
  variableCount: 'Počet premenných',
  removedEmptyRows: 'Odstránené prázdne riadky',
  removedDuplicateRows: 'Odstránené duplicitné riadky',
  scaleCount: 'Počet škál',
  subscaleCount: 'Počet subškál',

  fileName: 'Súbor',
  filename: 'Súbor',
  size: 'Veľkosť',
  sizeBytes: 'Veľkosť',
  status: 'Stav',
  message: 'Správa',
  warning: 'Upozornenie',
  notes: 'Poznámky',
};

const PRIORITY_KEYS = [
  'id',
  'respondentId',
  'poradie',

  'sourceFileName',
  'selectedSheetName',
  'headerRowIndex',
  'originalRowCount',
  'rowCount',
  'originalColumnCount',
  'variableCount',
  'removedEmptyRows',
  'removedDuplicateRows',
  'scaleCount',
  'subscaleCount',

  'name',
  'variable',
  'premenna',
  'label',
  'originalName',
  'displayName',

  'type',
  'dataType',
  'kind',
  'role',
  'measurementLevel',
  'scaleGroup',

  'valid',
  'validValues',
  'validCount',
  'nonMissing',
  'n',
  'count',
  'missing',
  'missingValues',
  'missingCount',
  'uniqueValues',
  'uniqueCount',

  'mean',
  'M',
  'average',
  'median',
  'Md',
  'mode',
  'stdDeviation',
  'standardDeviation',
  'stdDev',
  'std',
  'sd',
  'SD',
  'variance',
  'minimum',
  'min',
  'maximum',
  'max',
  'range',
  'sum',
  'skewness',
  'kurtosis',
  'q1',
  'q3',
  'iqr',

  'value',
  'category',
  'frequency',
  'count',
  'percent',
  'percentage',
  'validPercent',
  'cumulativePercent',

  'scale',
  'items',
  'itemCount',
  'validN',
  'cronbachAlpha',
  'alpha',

  'test',
  'dependentVariable',
  'independentVariable',
  'groupVariable',
  'groupingVariable',
  'groups',
  'group1',
  'group2',
  'mean1',
  'mean2',
  'sd1',
  'sd2',
  'n1',
  'n2',
  'statistic',
  't',
  'f',
  'u',
  'h',
  'r',
  'rho',
  'pearsonR',
  'spearmanRho',
  'coefficient',
  'df',
  'df1',
  'df2',
  'degreesOfFreedom',
  'p',
  'pValue',
  'significant',
  'effectSize',
  'cohensD',

  'interpretation',
  'conclusion',
  'reason',
  'recommendation',
  'recommendedUse',
  'warning',
  'notes',
];

const HIDDEN_TOP_LEVEL_KEYS = new Set([
  'ok',
  'success',
  'title',
  'summary',

  'warnings',

  'preparedDataset',
  'rawDataWorkbookBase64',
  'rawDataFileName',

  'variables',
  'detectedVariables',
  'columns',

  'frequencies',
  'frequencyTables',
  'frequency_tables',

  'recommendedTests',
  'recommended_tests',
  'tests',

  'recommendedCharts',
  'recommended_charts',
  'charts',

  'excelTables',
  'excel_tables',
  'tables',

  'descriptiveStatistics',
  'descriptive_statistics',
  'descriptives',
  'statistics',

  'reliabilities',
  'reliability',
  'cronbachAlpha',

  'correlations',
  'correlationResults',

  'pearsonCorrelations',
  'pearson',

  'spearmanCorrelations',
  'spearman',

  'tTests',
  't_tests',

  'statisticalTests',
  'statistical_tests',

  'hypothesisTests',
  'hypothesis_tests',
  'testResults',

  'selectedAnalyses',
  'selected_analyses',

  'practicalText',
  'practical_text',

  'fullText',
  'fullResult',
  'text',
  'output',
  'result',
  'answer',
  'message',
  'interpretation',

  'dataDescription',
  'data_description',

  'files',
  'extractedFiles',
  'attachments',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function isAoATable(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && !value.trim()) return true;
  return false;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(String(value).replace(',', '.').trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';

  if (Number.isInteger(value)) return String(value);

  const abs = Math.abs(value);

  if (abs > 0 && abs < 0.001) {
    return value.toLocaleString('sk-SK', {
      maximumSignificantDigits: 4,
    });
  }

  return value.toLocaleString('sk-SK', {
    maximumFractionDigits: 4,
  });
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string') return value.trim() || '—';

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';

    return value
      .map((item) => {
        if (isPrimitive(item)) {
          return valueToText(item);
        }

        if (isObject(item)) {
          return Object.entries(item)
            .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
            .join(', ');
        }

        return String(item);
      })
      .join('\n');
  }

  if (isObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) return '—';

    return entries
      .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
      .join('\n');
  }

  return String(value);
}

function getFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function normalizeArray(value: unknown): GenericRow[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    if (isObject(item)) return item;

    return {
      poradie: index + 1,
      value: item,
    };
  });
}

function rowsFromAoA(value: unknown): GenericRow[] {
  if (!isAoATable(value)) return [];

  const [headerRow, ...bodyRows] = value;

  const headers = headerRow.map((header, index) => {
    const text = String(header ?? '').trim();
    return text || `Stĺpec ${index + 1}`;
  });

  return bodyRows
    .filter((row) =>
      row.some(
        (cell) =>
          cell !== null &&
          cell !== undefined &&
          String(cell).trim() !== '',
      ),
    )
    .map((row) => {
      const output: GenericRow = {};

      headers.forEach((header, index) => {
        output[header] = row[index] ?? null;
      });

      return output;
    });
}

function getRawResult(result?: AnalysisResult | null): Record<string, unknown> {
  if (!result) return {};
  return result as unknown as Record<string, unknown>;
}

function getPreparedDataset(result?: AnalysisResult | null): Record<string, unknown> {
  const raw = getRawResult(result);

  if (isObject(raw.preparedDataset)) {
    return raw.preparedDataset;
  }

  return {};
}

function getFirstArray(raw: Record<string, unknown>, keys: string[]): GenericRow[] {
  for (const key of keys) {
    const rows = normalizeArray(raw[key]);
    if (rows.length > 0) return rows;
  }

  return [];
}

function getFirstAoA(raw: Record<string, unknown>, keys: string[]): GenericRow[] {
  for (const key of keys) {
    const rows = rowsFromAoA(raw[key]);
    if (rows.length > 0) return rows;
  }

  return [];
}

function getTextValue(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function normalizeFrequencyRows(value: unknown): GenericRow[] {
  if (!Array.isArray(value)) return [];

  const output: GenericRow[] = [];

  value.forEach((item) => {
    if (!isObject(item)) {
      output.push({
        value: item,
      });
      return;
    }

    const nestedRows =
      normalizeArray(item.rows).length > 0
        ? normalizeArray(item.rows)
        : normalizeArray(item.items).length > 0
          ? normalizeArray(item.items)
          : normalizeArray(item.data);

    if (nestedRows.length > 0) {
      const variable =
        item.variable ??
        item.name ??
        item.title ??
        item.label ??
        'Premenná';

      nestedRows.forEach((row) => {
        output.push({
          variable,
          ...row,
        });
      });

      return;
    }

    output.push(item);
  });

  return output;
}

function getFrequencyRows(raw: Record<string, unknown>): GenericRow[] {
  const keys = ['frequencies', 'frequencyTables', 'frequency_tables'];

  for (const key of keys) {
    const rows = normalizeFrequencyRows(raw[key]);

    if (rows.length > 0) return rows;
  }

  return [];
}

function uniqueRows(rows: GenericRow[]): GenericRow[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = JSON.stringify(row);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function removeEmptyColumns(rows: GenericRow[]): GenericRow[] {
  if (!rows.length) return rows;

  const allColumns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  const nonEmptyColumns = allColumns.filter((column) =>
    rows.some((row) => !isEmptyValue(row[column])),
  );

  return rows.map((row) => {
    const nextRow: GenericRow = {};

    nonEmptyColumns.forEach((column) => {
      nextRow[column] = row[column];
    });

    return nextRow;
  });
}

function sanitizeRows(rows: GenericRow[], limit?: number): GenericRow[] {
  const cleaned = removeEmptyColumns(uniqueRows(rows));

  if (typeof limit === 'number' && limit > 0) {
    return cleaned.slice(0, limit);
  }

  return cleaned;
}

function collectColumns(rows: GenericRow[]): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => keys.add(key));
  }

  const allKeys = Array.from(keys);

  const priority = PRIORITY_KEYS.filter((key) => allKeys.includes(key));
  const rest = allKeys
    .filter((key) => !priority.includes(key))
    .sort((a, b) => a.localeCompare(b, 'sk'));

  return [...priority, ...rest];
}

function getRowId(row: GenericRow, index: number): string {
  const name =
    row.id ??
    row.respondentId ??
    row.name ??
    row.variable ??
    row.premenna ??
    row.label ??
    row.title ??
    row.test ??
    row.value;

  return `${String(name || 'row')}-${index}`;
}

function normalizeGenericRows(result?: AnalysisResult | null) {
  const raw = getRawResult(result);

  return Object.entries(raw)
    .filter(([key]) => !HIDDEN_TOP_LEVEL_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: getFieldLabel(key),
      value: valueToText(value),
    }))
    .filter((row) => row.value && row.value !== '—');
}

function createDataQualityRows(preparedDataset: Record<string, unknown>): GenericRow[] {
  const quality = isObject(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const rowsFromSheet = getFirstAoA(preparedDataset, ['dataQualitySheet']);

  if (rowsFromSheet.length > 0) {
    return rowsFromSheet;
  }

  const row: GenericRow = {
    sourceFileName: preparedDataset.sourceFileName ?? quality.sourceFileName,
    selectedSheetName:
      preparedDataset.selectedSheetName ?? quality.selectedSheetName,
    headerRowIndex: quality.headerRowIndex,
    originalRowCount: quality.originalRowCount,
    rowCount: quality.rowCount,
    originalColumnCount: quality.originalColumnCount,
    variableCount: quality.variableCount,
    removedEmptyRows: quality.removedEmptyRows,
    removedDuplicateRows: quality.removedDuplicateRows,
    scaleCount: quality.scaleCount,
    subscaleCount: quality.subscaleCount,
    warnings: quality.warnings,
    notes: quality.notes,
  };

  const hasData = Object.values(row).some(
    (value) =>
      value !== null &&
      value !== undefined &&
      valueToText(value) !== '—',
  );

  return hasData ? [row] : [];
}

function createScaleDefinitionRows(
  preparedDataset: Record<string, unknown>,
): GenericRow[] {
  const scaleDefinitions = normalizeArray(preparedDataset.scaleDefinitions);
  const subscaleDefinitions = normalizeArray(preparedDataset.subscaleDefinitions);

  const scaleRows = scaleDefinitions.map((row) => ({
    type: 'Škála',
    ...row,
  }));

  const subscaleRows = subscaleDefinitions.map((row) => ({
    type: 'Subškála',
    ...row,
  }));

  return [...scaleRows, ...subscaleRows];
}

function getPreparedSummary(
  raw: Record<string, unknown>,
  preparedDataset: Record<string, unknown>,
): PreparedDatasetSummary {
  const quality = isObject(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const rowCount =
    toNumber(quality.rowCount) ??
    (Array.isArray(preparedDataset.rows)
      ? preparedDataset.rows.length
      : isAoATable(preparedDataset.rawDataSheet)
        ? Math.max(preparedDataset.rawDataSheet.length - 1, 0)
        : 0);

  const variableCount =
    toNumber(quality.variableCount) ??
    (Array.isArray(preparedDataset.variables)
      ? preparedDataset.variables.length
      : Array.isArray(preparedDataset.headers)
        ? preparedDataset.headers.length
        : 0);

  const scaleCount =
    toNumber(quality.scaleCount) ??
    (Array.isArray(preparedDataset.scaleDefinitions)
      ? preparedDataset.scaleDefinitions.length
      : 0);

  const subscaleCount =
    toNumber(quality.subscaleCount) ??
    (Array.isArray(preparedDataset.subscaleDefinitions)
      ? preparedDataset.subscaleDefinitions.length
      : 0);

  const rawDataFileName =
    typeof raw.rawDataFileName === 'string' && raw.rawDataFileName.trim()
      ? raw.rawDataFileName.trim()
      : 'raw-data.xlsx';

  return {
    rowCount,
    variableCount,
    scaleCount,
    subscaleCount,
    rawDataFileName,
  };
}

function createSections(result?: AnalysisResult | null): NormalizedSection[] {
  const raw = getRawResult(result);
  const preparedDataset = getPreparedDataset(result);

  const preparedVariables = getFirstArray(preparedDataset, ['variables']);
  const preparedVariableMap = getFirstAoA(preparedDataset, ['variableMapSheet']);
  const preparedRawRows = getFirstArray(preparedDataset, ['rows']);
  const preparedRawSheetRows = getFirstAoA(preparedDataset, ['rawDataSheet']);
  const dataQualityRows = createDataQualityRows(preparedDataset);
  const scaleDefinitionRows = createScaleDefinitionRows(preparedDataset);

  const variables =
    preparedVariables.length > 0
      ? preparedVariables
      : preparedVariableMap.length > 0
        ? preparedVariableMap
        : getFirstArray(raw, ['variables', 'detectedVariables', 'columns']);

  const rawDataRows =
    preparedRawSheetRows.length > 0 ? preparedRawSheetRows : preparedRawRows;

  const descriptiveStatistics = getFirstArray(raw, [
    'descriptives',
    'descriptiveStatistics',
    'descriptive_statistics',
    'statistics',
  ]);

  const frequencies = getFrequencyRows(raw);

  const reliabilities = getFirstArray(raw, [
    'reliabilities',
    'reliability',
    'cronbachAlpha',
  ]);

  const correlations = [
    ...getFirstArray(raw, ['correlations', 'correlationResults']),
    ...getFirstArray(raw, ['pearsonCorrelations', 'pearson']),
    ...getFirstArray(raw, ['spearmanCorrelations', 'spearman']),
  ];

  const statisticalTests = getFirstArray(raw, [
    'statisticalTests',
    'statistical_tests',
    'hypothesisTests',
    'hypothesis_tests',
    'testResults',
    'tTests',
    't_tests',
  ]);

  const recommendedTests = getFirstArray(raw, [
    'recommendedTests',
    'recommended_tests',
    'tests',
  ]);

  const recommendedCharts = getFirstArray(raw, [
    'recommendedCharts',
    'recommended_charts',
    'charts',
  ]);

  const excelTables = getFirstArray(raw, [
    'excelTables',
    'excel_tables',
    'tables',
  ]);

  const files = getFirstArray(raw, ['files', 'extractedFiles', 'attachments']);

  const sections: NormalizedSection[] = [];

  if (dataQualityRows.length > 0) {
    sections.push({
      key: 'dataQuality',
      title: '1. Kontrola a príprava dát',
      description:
        'Prehľad toho, ako bol vstupný súbor spracovaný pred štatistickým vyhodnotením.',
      rows: dataQualityRows,
    });
  }

  if (variables.length > 0) {
    sections.push({
      key: 'variables',
      title: '2. Mapa premenných',
      description:
        'Prehľad premenných rozpoznaných zo súboru vrátane typu, roly, úrovne merania a použitia v analýze.',
      rows: variables,
    });
  }

  if (scaleDefinitionRows.length > 0) {
    sections.push({
      key: 'scaleDefinitions',
      title: '3. Definované škály a subškály',
      description:
        'Prehľad škál a subškál, ktoré sa použili pri výpočte skóre, reliability, korelácií a testovania.',
      rows: scaleDefinitionRows,
    });
  }

  if (rawDataRows.length > 0) {
    sections.push({
      key: 'rawData',
      title: '4. Pripravené raw dáta',
      description:
        'Dáta po očistení, premenovaní stĺpcov, odstránení duplicít a doplnení vypočítaných škál alebo subškál. Zobrazuje sa náhľad, celý obsah ide do exportu raw-data.xlsx.',
      rows: rawDataRows,
      limitPreview: true,
    });
  }

  if (descriptiveStatistics.length > 0) {
    sections.push({
      key: 'descriptiveStatistics',
      title: '5. Deskriptívna štatistika',
      description:
        'Základné štatistiky pre číselné premenné, položky dotazníka, škály a subškály.',
      rows: descriptiveStatistics,
    });
  }

  if (frequencies.length > 0) {
    sections.push({
      key: 'frequencies',
      title: '6. Frekvenčná analýza',
      description:
        'Frekvenčné tabuľky bez duplicít. Obsahujú hodnoty, početnosti, percentá, validné percentá a kumulatívne percentá.',
      rows: frequencies,
    });
  }

  if (reliabilities.length > 0) {
    sections.push({
      key: 'reliability',
      title: '7. Reliabilita škál',
      description:
        'Výpočet vnútornej konzistencie škál a subškál pomocou Cronbachovej alfy.',
      rows: reliabilities,
    });
  }

  if (correlations.length > 0) {
    sections.push({
      key: 'correlations',
      title: '8. Korelačná analýza',
      description:
        'Vzťahy medzi škálami, subškálami a číselnými premennými. Zobrazuje Pearsonovu a/alebo Spearmanovu koreláciu.',
      rows: correlations,
    });
  }

  if (statisticalTests.length > 0) {
    sections.push({
      key: 'statisticalTests',
      title: '9. Výsledky štatistických testov',
      description:
        'Výsledky t-testu, ANOVA, Mann-Whitneyho U testu, Kruskal-Wallisovho testu alebo ďalších testov.',
      rows: statisticalTests,
    });
  }

  if (recommendedTests.length > 0) {
    sections.push({
      key: 'recommendedTests',
      title: '10. Odporúčané štatistické testy',
      description:
        'Návrh vhodných testov podľa typu premenných a cieľa výskumu.',
      rows: recommendedTests,
    });
  }

  if (recommendedCharts.length > 0) {
    sections.push({
      key: 'recommendedCharts',
      title: '11. Odporúčané grafy',
      description:
        'Návrh grafov vhodných do praktickej časti práce alebo prezentácie výsledkov.',
      rows: recommendedCharts,
    });
  }

  if (excelTables.length > 0) {
    sections.push({
      key: 'excelTables',
      title: '12. Tabuľky vhodné do práce',
      description:
        'Odporúčané tabuľky, ktoré je vhodné zaradiť do praktickej alebo analytickej časti.',
      rows: excelTables,
    });
  }

  if (files.length > 0) {
    sections.push({
      key: 'files',
      title: '13. Spracované súbory',
      description: 'Prehľad súborov použitých pri analýze dát.',
      rows: files,
    });
  }

  return sections;
}

function renderTextBlock(title: string, value?: string) {
  if (!value?.trim()) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">{title}</h3>
      </div>

      <div className="px-5 py-4">
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
          {value}
        </div>
      </div>
    </section>
  );
}

function renderWarnings(warnings: unknown) {
  if (!warnings) return null;

  const warningRows = Array.isArray(warnings)
    ? normalizeArray(warnings)
    : typeof warnings === 'string'
      ? [{ message: warnings }]
      : isObject(warnings)
        ? [warnings]
        : [];

  if (!warningRows.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-400/20 bg-amber-500/10">
      <div className="border-b border-amber-400/20 px-5 py-4">
        <h3 className="text-base font-black text-amber-100">Upozornenia</h3>
        <p className="mt-1 text-xs text-amber-100/70">
          Položky, ktoré je potrebné pri interpretácii výsledkov skontrolovať.
        </p>
      </div>

      <div className="px-5 py-4">
        <ul className="space-y-2 text-sm leading-6 text-amber-50/90">
          {warningRows.map((row, index) => (
            <li
              key={getRowId(row, index)}
              className="rounded-2xl bg-black/10 px-4 py-3"
            >
              {valueToText(row.message ?? row.warning ?? row.value ?? row)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words text-lg font-black text-white">
        {value}
      </div>

      {note ? (
        <div className="mt-1 text-xs leading-5 text-slate-400">{note}</div>
      ) : null}
    </div>
  );
}

function SectionTable({ section }: { section: NormalizedSection }) {
  const rows = sanitizeRows(section.rows, section.limitPreview ? 80 : undefined);
  const columns = collectColumns(rows);
  const hiddenRowsCount = section.rows.length - rows.length;

  if (!rows.length || !columns.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-black text-white">{section.title}</h3>

            {section.description ? (
              <p className="mt-1 text-xs leading-5 text-slate-400">
                {section.description}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs font-bold text-slate-300">
            {section.rows.length} riadkov
          </div>
        </div>

        {hiddenRowsCount > 0 ? (
          <p className="mt-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs leading-5 text-blue-100">
            V náhľade je zobrazených prvých {rows.length} riadkov. Kompletné
            dáta sa exportujú do súboru raw-data.xlsx / Excel exportu.
          </p>
        ) : null}
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b1020] text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-white/10 px-5 py-3 font-black"
                >
                  {getFieldLabel(column)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={getRowId(row, rowIndex)}
                className="border-b border-white/5 transition-colors hover:bg-white/[0.035]"
              >
                {columns.map((column) => (
                  <td
                    key={`${getRowId(row, rowIndex)}-${column}`}
                    className="whitespace-pre-wrap px-5 py-4 align-top leading-6 text-slate-300"
                  >
                    {valueToText(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GenericResultTable({ result }: Props) {
  const rows = normalizeGenericRows(result);

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-base font-black text-white">Ostatné výsledky</h3>
        <p className="mt-1 text-xs text-slate-400">
          Doplnkové údaje, ktoré nepatria do hlavných analytických tabuliek.
        </p>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b1020] text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="w-[260px] border-b border-white/10 px-5 py-3">
                Položka
              </th>
              <th className="border-b border-white/10 px-5 py-3">
                Hodnota
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-white/5">
                <td className="align-top px-5 py-4 font-bold text-slate-200">
                  {row.label}
                </td>
                <td className="whitespace-pre-wrap px-5 py-4 leading-6 text-slate-300">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AnalysisTable({ result }: Props) {
  const raw = getRawResult(result);
  const preparedDataset = getPreparedDataset(result);

  const title =
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : 'Výsledky analýzy dát';

  const summary = getTextValue(raw, ['summary']);

  const dataDescription = getTextValue(raw, [
    'dataDescription',
    'data_description',
  ]);

  const practicalText = getTextValue(raw, [
    'practicalText',
    'practical_text',
  ]);

  const interpretation = getTextValue(raw, [
    'interpretation',
    'fullText',
    'fullResult',
    'output',
    'text',
    'answer',
  ]);

  const sections = createSections(result);
  const preparedSummary = getPreparedSummary(raw, preparedDataset);

  const hasAnyContent =
    Boolean(summary) ||
    Boolean(dataDescription) ||
    Boolean(practicalText) ||
    Boolean(interpretation) ||
    sections.length > 0 ||
    normalizeGenericRows(result).length > 0;

  if (!hasAnyContent) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
        Nie sú dostupné žiadne tabuľkové výsledky analýzy.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-black text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Výstup je pripravený v poradí: vstupný súbor → raw dáta → mapa
            premenných → škály/subškály → reliabilita → korelácie →
            štatistické testovanie → export.
          </p>
        </div>

        <div className="grid gap-3 px-5 py-4 md:grid-cols-5">
          <StatCard
            label="Pripravené dáta"
            value={
              preparedSummary.rowCount > 0
                ? `${preparedSummary.rowCount} riadkov`
                : '—'
            }
          />

          <StatCard
            label="Premenné"
            value={
              preparedSummary.variableCount > 0
                ? preparedSummary.variableCount
                : '—'
            }
          />

          <StatCard
            label="Škály"
            value={
              preparedSummary.scaleCount > 0 ? preparedSummary.scaleCount : '—'
            }
          />

          <StatCard
            label="Subškály"
            value={
              preparedSummary.subscaleCount > 0
                ? preparedSummary.subscaleCount
                : '—'
            }
          />

          <StatCard
            label="Raw export"
            value={preparedSummary.rawDataFileName}
          />
        </div>

        {summary ? (
          <div className="px-5 pb-4">
            <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm leading-7 text-slate-300">
              {summary}
            </div>
          </div>
        ) : null}
      </section>

      {renderWarnings(raw.warnings)}

      {renderTextBlock('Popis dát', dataDescription)}

      {sections.map((section) => (
        <SectionTable key={section.key} section={section} />
      ))}

      {renderTextBlock('Interpretácia výsledkov do práce', practicalText)}

      {renderTextBlock('Celková interpretácia', interpretation)}

      <GenericResultTable result={result} />
    </div>
  );
}