'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Info,
  Loader2,
  Maximize2,
  PieChart,
  Sigma,
  Sparkles,
  Table2,
  X,
} from 'lucide-react';

import type { AnalysisResult } from './analysisTypes';

type PreparedDataFileLike = {
  fileName?: string;
  base64?: string;
  mimeType?: string;
  rows?: number;
  columns?: number;
  warnings?: string[];
  sheets?: string[];
  qualityReport?: unknown[];
} | null;

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;

  /**
   * Voliteľný pripravený Excel z /api/analyze-data/prepare.
   * Ak ho Dashboard pošle do modalu, profesionálny export doplní:
   * - 02 raw-data,
   * - 04 data-quality,
   * - QUALITY_REPORT,
   * - pôvodný DATA_RAW/DATA_CLEAN.
   */
  preparedDataFile?: PreparedDataFileLike;

  /**
   * Voliteľný externý handler z DashboardClient.tsx.
   * Ak nie je poslaný, modal použije vlastný export cez /api/analyze-data/export.
   */
  onExportExcel?: () => void | Promise<void>;
};

type ExportFormat = 'word' | 'xls' | 'pdf' | 'raw';

type DataRow = Record<string, unknown>;

type TableSection = {
  key: string;
  title: string;
  description: string;
  rows: unknown[];
  icon?: ReactNode;
  priority?: number;
};

type PreparedDatasetLike = {
  sourceFileName?: string;
  selectedSheetName?: string;
  headers?: string[];
  originalHeaders?: string[];
  demographicColumns?: string[];
  groupingColumns?: string[];
  itemColumns?: string[];
  numericColumns?: string[];
  categoricalColumns?: string[];
  textColumns?: string[];
  dateColumns?: string[];
  variables?: unknown[];
  rows?: unknown[];
  scaleDefinitions?: unknown[];
  subscaleDefinitions?: unknown[];
  rawDataSheet?: unknown[][];
  variableMapSheet?: unknown[][];
  dataQualitySheet?: unknown[][];
  quality?: Record<string, unknown>;
};

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  respondentId: 'ID respondenta',
  scaleId: 'ID škály',
  scaleName: 'Škála / subškála',

  name: 'Premenná',
  variable: 'Premenná',
  label: 'Názov',
  title: 'Názov',
  originalName: 'Pôvodný názov',
  displayName: 'Zobrazený názov',
  column: 'Stĺpec',

  type: 'Typ',
  dataType: 'Typ dát',
  kind: 'Druh premennej',
  role: 'Rola',
  chartType: 'Typ grafu',
  variableType: 'Typ premennej',
  measurementLevel: 'Úroveň merania',
  scaleGroup: 'Skupina škály',
  reverseScored: 'Reverzne skórované',

  valid: 'N platných',
  validRows: 'N platných riadkov',
  validValues: 'N platných',
  validCount: 'N platných',
  nonMissing: 'N platných',
  n: 'N',
  nTotal: 'N spolu',
  respondentCount: 'Počet respondentov',
  count: 'Počet',
  frequency: 'Počet',

  missing: 'Chýbajúce',
  missingRows: 'Chýbajúce riadky',
  missingValues: 'Chýbajúce',
  missingCount: 'Chýbajúce',
  total: 'Spolu',

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
  SD: 'SD',
  sd: 'SD',
  variance: 'Variancia',
  minimum: 'Min',
  min: 'Min',
  maximum: 'Max',
  max: 'Max',
  range: 'Rozpätie',
  q1: 'Q1',
  q3: 'Q3',
  iqr: 'IQR',
  sum: 'Súčet',

  scoring: 'Výpočet',
  itemsUsed: 'Použité položky',
  items: 'Položky',
  itemCount: 'Počet položiek',

  skewness: 'Šikmosť',
  standardErrorSkewness: 'SE šikmosti',
  kurtosis: 'Špicatosť',
  standardErrorKurtosis: 'SE špicatosti',
  distinctValues: 'Počet hodnôt',
  uniqueValues: 'Počet unikátnych hodnôt',
  uniqueCount: 'Počet unikátnych hodnôt',

  ignored: 'Ignorovaná',
  ignoredReason: 'Dôvod ignorovania',
  value: 'Hodnota',
  category: 'Kategória',
  percent: 'Percento',
  percentage: 'Percento',
  validPercent: 'Validné percento',
  cumulativePercent: 'Kumulatívne percento',

  test: 'Test',
  testType: 'Typ testu',
  hypothesis: 'Hypotéza',
  variables: 'Premenné',
  reason: 'Odôvodnenie',
  assumptions: 'Predpoklady',
  interpretation: 'Interpretácia',
  description: 'Popis',

  variableA: 'Premenná 1',
  variableB: 'Premenná 2',
  variable1: 'Premenná 1',
  variable2: 'Premenná 2',
  variableX: 'Premenná 1',
  variableY: 'Premenná 2',
  coefficient: 'Koeficient',
  pearsonR: 'Pearson r',
  spearmanRho: 'Spearman ρ',
  r: 'r',
  rho: 'ρ',
  pValue: 'p',
  p: 'p',
  df: 'df',
  df1: 'df1',
  df2: 'df2',
  statistic: 'Štatistika',
  significance: 'Významnosť',
  strength: 'Sila vzťahu',
  direction: 'Smer vzťahu',
  significant: 'Signifikantné',
  method: 'Metóda',
  fisherZ: 'Fisherovo z',
  standardError: 'SE',

  dependentVariable: 'Závislá premenná',
  independentVariable: 'Nezávislá premenná',
  groupVariable: 'Skupinová premenná',
  groupingVariable: 'Skupinová premenná',
  groups: 'Skupiny',
  group1: 'Skupina 1',
  group2: 'Skupina 2',
  mean1: 'M1',
  mean2: 'M2',
  sd1: 'SD1',
  sd2: 'SD2',
  n1: 'n1',
  n2: 'n2',
  t: 't',
  f: 'F',
  u: 'U',
  h: 'H',
  meanDifference: 'Rozdiel priemerov',
  effectSize: 'Effect size',
  cohensD: 'Cohenovo d',

  isNormal: 'Normalita',
  recommendation: 'Odporúčanie',
  recommendedUse: 'Odporúčané použitie',
  note: 'Poznámka',
  notes: 'Poznámky',
  warning: 'Upozornenie',
  warnings: 'Upozornenia',

  cronbachAlpha: 'Cronbach alfa',
  alpha: 'Alfa',
  validN: 'N platných',

  sheetName: 'Hárok',
  headers: 'Hlavičky',
  rows: 'Riadky',
  data: 'Dáta',

  fileName: 'Súbor',
  filename: 'Súbor',
  extension: 'Prípona',
  size: 'Veľkosť',
  sizeBytes: 'Veľkosť',
  status: 'Stav',
  message: 'Správa',

  shapiroWilk: 'Shapiro-Wilk',
  pValueOfShapiroWilk: 'p Shapiro-Wilk',
  pValueShapiroWilk: 'p Shapiro-Wilk',
  shapiroWilkPValue: 'p Shapiro-Wilk',

  tableTitle: 'Tabuľka',
  sectionTitle: 'Sekcia',
  jaspSection: 'JASP sekcia',

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

  separator: '',
};

const COLUMN_PRIORITY = [
  'jaspSection',
  'sectionTitle',
  'tableTitle',
  'id',
  'respondentId',
  'scaleName',
  'scale',
  'variable',
  'name',
  'label',
  'title',
  'originalName',
  'displayName',
  'type',
  'dataType',
  'kind',
  'role',
  'variableType',
  'measurementLevel',
  'scaleGroup',
  'ignored',
  'ignoredReason',

  'valid',
  'validRows',
  'validValues',
  'validCount',
  'nonMissing',
  'n',
  'nTotal',
  'missing',
  'missingRows',
  'missingValues',
  'missingCount',
  'total',

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
  'SD',
  'sd',
  'variance',
  'minimum',
  'min',
  'maximum',
  'max',
  'range',
  'q1',
  'q3',
  'iqr',
  'sum',

  'scoring',
  'itemsUsed',
  'items',
  'itemCount',
  'validN',
  'cronbachAlpha',
  'alpha',

  'skewness',
  'standardErrorSkewness',
  'kurtosis',
  'standardErrorKurtosis',
  'shapiroWilk',
  'pValueOfShapiroWilk',
  'pValueShapiroWilk',
  'shapiroWilkPValue',
  'distinctValues',
  'uniqueValues',
  'uniqueCount',

  'value',
  'category',
  'frequency',
  'count',
  'percent',
  'percentage',
  'validPercent',
  'cumulativePercent',

  'method',
  'statistic',
  't',
  'f',
  'u',
  'h',
  'coefficient',
  'r',
  'rho',
  'pearsonR',
  'spearmanRho',
  'pValue',
  'p',
  'df',
  'df1',
  'df2',
  'isNormal',
  'significant',
  'recommendation',
  'note',

  'test',
  'testType',
  'hypothesis',
  'variables',
  'variableA',
  'variableB',
  'variable1',
  'variable2',
  'variableX',
  'variableY',
  'fisherZ',
  'standardError',
  'strength',
  'direction',

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
  'meanDifference',
  'effectSize',
  'cohensD',

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

  'interpretation',
  'conclusion',
  'reason',
  'description',
  'warning',
  'warnings',
  'notes',
];

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isAoATable(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);
}

function normalizeColumnKey(key: string): string {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeColumnLabel(key: string): string {
  return normalizeColumnKey(getFieldLabel(key));
}

function isTechnicalIdColumn(key: string): boolean {
  const normalized = normalizeColumnKey(key);

  return [
    'id',
    'respondent',
    'respondentid',
    'respondent_id',
    'respondentnumber',
    'respondentcislo',
    'respondentporadie',
    'index',
    'poradie',
    'cislo',
    'cisloriadku',
    'row',
    'rowid',
    'row_id',
    'riadok',
    'timestamp',
    'createdat',
    'created_at',
    'updatedat',
    'updated_at',
  ]
    .map(normalizeColumnKey)
    .includes(normalized);
}

function getFieldLabel(key: string): string {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];

  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
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

  if (typeof value === 'number') return formatNumber(value);

  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (Array.isArray(value)) {
    if (!value.length) return '—';

    return value
      .map((item) => {
        if (isRecord(item)) {
          return Object.entries(item)
            .filter(([key]) => !isTechnicalIdColumn(key))
            .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
            .join(', ');
        }

        return valueToText(item);
      })
      .filter(Boolean)
      .join('\n');
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      ([key]) => !isTechnicalIdColumn(key),
    );

    if (!entries.length) return '—';

    return entries
      .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
      .join('\n');
  }

  return String(value);
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

  return Number.isFinite(number) ? number : null;
}


function round(value: unknown, digits = 2): number {
  const numericValue = toNumber(value);

  if (numericValue === null || !Number.isFinite(numericValue)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(numericValue * factor) / factor;
}

function normalizeRows(rows: unknown[]): DataRow[] {
  return rows.map((row, index) => {
    if (isRecord(row)) {
      const cleaned: DataRow = {};
      const usedLabels = new Set<string>();

      Object.entries(row).forEach(([key, value]) => {
        if (isTechnicalIdColumn(key) && normalizeColumnKey(key) !== 'id') return;

        const normalizedLabel = normalizeColumnLabel(key);

        if (usedLabels.has(normalizedLabel)) return;

        usedLabels.add(normalizedLabel);
        cleaned[key] = value;
      });

      return cleaned;
    }

    return {
      poradie: index + 1,
      hodnota: row,
    };
  });
}

function rowsFromAoA(value: unknown): DataRow[] {
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
          cell !== null && cell !== undefined && String(cell).trim() !== '',
      ),
    )
    .map((row) => {
      const output: DataRow = {};

      headers.forEach((header, index) => {
        output[header] = row[index] ?? null;
      });

      return output;
    });
}

function getColumns(rows: DataRow[]): string[] {
  const allColumns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    .filter((column) => !isTechnicalIdColumn(column) || normalizeColumnKey(column) === 'id')
    .filter((column) => {
      const label = normalizeColumnLabel(column);

      return ![
        'respondent',
        'respondentid',
        'index',
        'poradie',
        'cislo',
        'row',
        'riadok',
      ].includes(label);
    });

  const usedLabels = new Set<string>();

  function acceptColumn(column: string): boolean {
    const normalizedLabel = normalizeColumnLabel(column);

    if (usedLabels.has(normalizedLabel)) return false;

    usedLabels.add(normalizedLabel);
    return true;
  }

  const priorityColumns = COLUMN_PRIORITY.filter((column) =>
    allColumns.includes(column),
  ).filter(acceptColumn);

  const restColumns = allColumns
    .filter((column) => !priorityColumns.includes(column))
    .sort((a, b) => getFieldLabel(a).localeCompare(getFieldLabel(b), 'sk'))
    .filter(acceptColumn);

  return [...priorityColumns, ...restColumns];
}

function getPreparedDataset(result: AnalysisResult | null): PreparedDatasetLike {
  const raw = (result || {}) as Record<string, unknown>;

  if (isRecord(raw.preparedDataset)) {
    return raw.preparedDataset as PreparedDatasetLike;
  }

  return {};
}

function getPreparedDataFileFromResult(result: AnalysisResult | null): PreparedDataFileLike {
  const raw = (result || {}) as Record<string, unknown>;

  const candidates = [
    raw.preparedDataFile,
    raw.preparedFileData,
    raw.preparedFile,
    raw.preparedDatasetFile,
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const hasUsefulData =
      typeof candidate.base64 === 'string' ||
      typeof candidate.fileName === 'string' ||
      Array.isArray(candidate.qualityReport) ||
      Array.isArray(candidate.warnings);

    if (hasUsefulData) {
      return candidate as PreparedDataFileLike;
    }
  }

  return null;
}

function getPreparedDatasetQualityRows(
  preparedDataset: PreparedDatasetLike,
): DataRow[] {
  const fromSheet = rowsFromAoA(preparedDataset.dataQualitySheet);

  if (fromSheet.length > 0) return fromSheet;

  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const row: DataRow = {
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
    (value) => value !== null && value !== undefined && valueToText(value) !== '—',
  );

  return hasData ? [row] : [];
}

function getFirstTextValue(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanOutputText(value);

    if (text) return text;
  }

  return '';
}

function getFirstArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    const array = safeArray(value);

    if (array.length > 0) return array;
  }

  return [];
}

function getResultArrays(result: AnalysisResult | null) {
  const raw = (result || {}) as any;
  const preparedDataset = getPreparedDataset(result);
  const statistical = raw.statisticalAnalysis || raw.stats || raw.analysisStats || raw;

  const preparedVariables =
    safeArray(preparedDataset.variables).length > 0
      ? safeArray(preparedDataset.variables)
      : rowsFromAoA(preparedDataset.variableMapSheet);

  const preparedRawRows =
    rowsFromAoA(preparedDataset.rawDataSheet).length > 0
      ? rowsFromAoA(preparedDataset.rawDataSheet)
      : safeArray(preparedDataset.rows);

  const preparedDataQualityRows =
    getPreparedDatasetQualityRows(preparedDataset);

  const frequencies = getFirstArray(
    statistical.frequencies,
    raw.frequencies,
    raw.frequencyTables,
    raw.frequency_tables,
  );

  const itemDescriptives = getFirstArray(
    statistical.itemDescriptives,
    raw.itemDescriptives,
    raw.item_descriptives,
  );

  const scaleDescriptives = getFirstArray(
    statistical.scaleDescriptives,
    raw.scaleDescriptives,
    raw.scaleSubscaleDescriptives,
    raw.scale_subscale_descriptives,
    raw.scale_descriptives,
    raw.scalesDescriptiveStatistics,
    raw.descriptives,
    raw.descriptiveStatistics,
    raw.descriptive_statistics,
    raw.statistics,
  );

  const scaleScores = getFirstArray(
    statistical.scaleScores,
    raw.scaleScores,
    raw.scaleSubscaleScores,
    raw.scale_subscale_scores,
    raw.scales,
  );

  const normality = getFirstArray(statistical.normality, raw.normality);

  const pearsonCorrelations = getFirstArray(
    statistical.correlations?.pearson,
    raw.pearsonCorrelations,
    raw.pearson_correlations,
    raw.pearson,
  );

  const spearmanCorrelations = getFirstArray(
    statistical.correlations?.spearman,
    raw.spearmanCorrelations,
    raw.spearman_correlations,
    raw.spearman,
  );

  const recommendedCorrelations = getFirstArray(
    statistical.correlations?.recommended,
    raw.recommendedCorrelations,
  );

  const genericCorrelations = getFirstArray(
    raw.correlations,
    raw.correlationResults,
  );

  const reliability = getFirstArray(
    statistical.reliability,
    raw.reliabilities,
    raw.reliability,
    raw.reliabilityDetail,
    raw.cronbachAlpha,
  );

  const parametricGroupTests = getFirstArray(
    statistical.groupTests?.parametric,
    raw.parametricGroupTests,
    raw.parametricTests,
  );

  const nonParametricGroupTests = getFirstArray(
    statistical.groupTests?.nonParametric,
    raw.nonParametricGroupTests,
    raw.nonParametricTests,
  );

  const recommendedGroupTests = getFirstArray(
    statistical.groupTests?.recommended,
    raw.recommendedGroupTests,
  );

  const statisticalTests = getFirstArray(
    raw.statisticalTests,
    raw.statistical_tests,
  );

  const oldTTests = getFirstArray(raw.tTests, raw.t_tests);

  const oldHypothesisTests = getFirstArray(
    raw.hypothesisTests,
    raw.hypothesis_tests,
    raw.testResults,
  );

  const files = getFirstArray(raw.files, raw.extractedFiles, raw.attachments);

  const variables =
    preparedVariables.length > 0
      ? preparedVariables
      : getFirstArray(raw.variables, raw.detectedVariables, raw.columns);

  const selectedAnalyses = getFirstArray(
    raw.selectedAnalyses,
    raw.selected_analyses,
  );

  const recommendedCharts = getFirstArray(
    raw.recommendedCharts,
    raw.recommended_charts,
    raw.charts,
  );

  const excelTables = getFirstArray(
    raw.excelTables,
    raw.excel_tables,
    raw.tables,
  );

  const warnings = getFirstArray(raw.warnings, statistical.warnings).map((item) =>
    valueToText(item),
  );

  const aiRecommendation = getFirstArray(
    statistical.aiRecommendation,
    raw.aiRecommendation,
  ).map((item) => valueToText(item));

  return {
    preparedDataset,
    preparedRawRows,
    preparedVariables,
    preparedDataQualityRows,

    meta: statistical.meta || raw.meta || preparedDataset.quality || null,
    warnings,
    files,
    variables,
    selectedAnalyses,

    frequencies,
    frequencyRows: normalizeFrequencyTables(frequencies),

    itemDescriptives,
    scaleScores,
    scaleDescriptives,
    normality,

    correlations: normalizeCorrelations([
      ...genericCorrelations,
      ...pearsonCorrelations,
      ...spearmanCorrelations,
    ]),
    pearsonCorrelations: normalizeCorrelations(pearsonCorrelations),
    spearmanCorrelations: normalizeCorrelations(spearmanCorrelations),
    recommendedCorrelations: normalizeCorrelations(recommendedCorrelations),

    reliability,

    parametricGroupTests,
    nonParametricGroupTests,
    recommendedGroupTests,

    statisticalTests,
    tTests: oldTTests,
    hypothesisTests: oldHypothesisTests,

    recommendedTests: [
      ...recommendedGroupTests,
      ...getFirstArray(raw.recommendedTests, raw.recommended_tests, raw.tests),
    ],

    recommendedCharts,
    excelTables,
    aiRecommendation,
    claudeAgent: getClaudeAgent(result),
    correlationRecommendationNote:
      statistical.correlations?.recommendationNote ||
      raw.correlationRecommendationNote ||
      '',
    groupTestsRecommendationNote:
      statistical.groupTests?.recommendationNote ||
      raw.groupTestsRecommendationNote ||
      '',
  };
}

function normalizeFrequencyTables(frequencies: unknown[]): unknown[] {
  const rows: unknown[] = [];

  frequencies.forEach((table) => {
    if (!isRecord(table)) {
      rows.push(table);
      return;
    }

    const values = safeArray(
      table.values || table.rows || table.data || table.items,
    );

    if (values.length === 0) {
      rows.push(table);
      return;
    }

    values.forEach((item) => {
      if (isRecord(item)) {
        rows.push({
          variable: table.variable || table.name || table.title,
          valid: table.valid,
          missing: table.missing,
          total: table.total,
          ...item,
        });
      }
    });
  });

  return rows;
}

function normalizeCorrelations(correlations: unknown[]): unknown[] {
  return correlations.map((item) => {
    if (!isRecord(item)) return item;

    return {
      ...item,
      variable1: item.variable1 ?? item.variableA ?? item.variableX,
      variable2: item.variable2 ?? item.variableB ?? item.variableY,
      coefficient: item.coefficient ?? item.r ?? item.rho ?? item.pearsonR ?? item.spearmanRho,
      p: item.p ?? item.pValue,
    };
  });
}

function getClaudeAgent(result: AnalysisResult | null) {
  const raw = (result || {}) as any;
  const agent = raw.claudeAgent || raw.claude || raw.aiAgent || null;

  const text = String(
    agent?.text ||
      agent?.output ||
      raw.claudeOutput ||
      raw.claudeText ||
      '',
  ).trim();

  const error = String(agent?.error || '').trim();

  const ok = Boolean(agent?.ok || text);
  const enabled = Boolean(agent?.enabled || text || error);
  const model = String(agent?.model || '').trim();

  return {
    enabled,
    ok,
    text,
    error,
    model,
    usage: agent?.usage || null,
  };
}

function getFallbackRespondentCount(
  result: AnalysisResult | null,
  files: unknown[],
): number {
  const raw = (result || {}) as any;
  const preparedDataset = getPreparedDataset(result);

  const direct =
    toNumber(raw.respondentCount) ??
    toNumber(raw.totalRows) ??
    toNumber(raw.meta?.respondentCount) ??
    toNumber(raw.statisticalAnalysis?.meta?.respondentCount) ??
    toNumber(raw.statisticalAnalysis?.meta?.totalRows) ??
    toNumber(preparedDataset.quality?.rowCount);

  if (direct && direct > 0) return direct;

  if (safeArray(preparedDataset.rows).length > 0) {
    return safeArray(preparedDataset.rows).length;
  }

  if (isAoATable(preparedDataset.rawDataSheet)) {
    return Math.max(preparedDataset.rawDataSheet.length - 1, 0);
  }

  const fileRowCounts = files
    .map((file) => {
      if (!isRecord(file)) return 0;

      const rows = safeArray(file.rows || file.data || file.records);
      if (rows.length > 0) return rows.length;

      return (
        toNumber(file.rowCount) ??
        toNumber(file.rowsCount) ??
        toNumber(file.validRows) ??
        toNumber(file.totalRows) ??
        0
      );
    })
    .filter((count) => Number.isFinite(count) && count > 0);

  if (fileRowCounts.length > 0) {
    return Math.max(...fileRowCounts);
  }

  return 0;
}

function getTotalCorrelationCount(
  arrays: ReturnType<typeof getResultArrays>,
): number {
  return (
    arrays.recommendedCorrelations.length +
    arrays.pearsonCorrelations.length +
    arrays.spearmanCorrelations.length +
    arrays.correlations.length
  );
}

function getTotalTestsCount(arrays: ReturnType<typeof getResultArrays>): number {
  return (
    arrays.recommendedGroupTests.length +
    arrays.parametricGroupTests.length +
    arrays.nonParametricGroupTests.length +
    arrays.hypothesisTests.length +
    arrays.tTests.length +
    arrays.statisticalTests.length
  );
}

function getTotalScaleCount(arrays: ReturnType<typeof getResultArrays>): number {
  return arrays.scaleScores.length || arrays.scaleDescriptives.length;
}

function getFrequencyRows(table: unknown): DataRow[] {
  if (!isRecord(table)) return [];

  const rows =
    safeArray(table.rows).length > 0
      ? safeArray(table.rows)
      : safeArray(table.data).length > 0
        ? safeArray(table.data)
        : safeArray(table.items).length > 0
          ? safeArray(table.items)
          : safeArray(table.values);

  return normalizeRows(rows);
}

function getNormalityForVariable(
  normalityRows: unknown[],
  variable: unknown,
): Record<string, unknown> | null {
  const variableName = String(variable || '').trim();

  if (!variableName) return null;

  const normalizedVariableName = normalizeColumnKey(variableName);

  const found = normalityRows.find((row) => {
    if (!isRecord(row)) return false;

    const rowVariable = String(
      row.variable || row.name || row.scaleName || row.label || '',
    ).trim();

    return normalizeColumnKey(rowVariable) === normalizedVariableName;
  });

  return isRecord(found) ? found : null;
}

function getCorrelationCoefficient(row: Record<string, unknown>): unknown {
  return (
    row.coefficient ??
    row.rho ??
    row.r ??
    row.pearsonR ??
    row.spearmanRho ??
    row.value ??
    null
  );
}

function buildJaspScaleDescriptiveRows(
  arrays: ReturnType<typeof getResultArrays>,
): DataRow[] {
  return normalizeRows(arrays.scaleDescriptives).map((row) => {
    const normality = getNormalityForVariable(
      arrays.normality,
      row.variable || row.name || row.scaleName || row.label,
    );

    return {
      variable: row.variable || row.name || row.scaleName || row.label,
      valid: row.valid ?? row.validRows ?? row.n,
      missing: row.missing ?? row.missingRows ?? row.missingValues,
      median: row.median ?? row.Md,
      mean: row.mean ?? row.M ?? row.average,
      standardDeviation:
        row.standardDeviation ?? row.stdDeviation ?? row.stdDev ?? row.SD ?? row.sd,
      skewness: row.skewness,
      standardErrorSkewness: row.standardErrorSkewness,
      kurtosis: row.kurtosis,
      standardErrorKurtosis: row.standardErrorKurtosis,
      shapiroWilk:
        row.shapiroWilk ??
        row.shapiroWilkStatistic ??
        normality?.statistic ??
        null,
      pValueOfShapiroWilk:
        row.pValueOfShapiroWilk ??
        row.pValueShapiroWilk ??
        row.shapiroWilkPValue ??
        normality?.pValue ??
        normality?.p ??
        null,
      minimum: row.minimum ?? row.min,
      maximum: row.maximum ?? row.max,
    };
  });
}

function buildJaspSpearmanRows(
  arrays: ReturnType<typeof getResultArrays>,
): DataRow[] {
  const source =
    arrays.spearmanCorrelations.length > 0
      ? arrays.spearmanCorrelations
      : arrays.correlations.filter((item) => {
          if (!isRecord(item)) return false;
          const test = String(item.test || item.method || '').toLowerCase();
          return test.includes('spearman') || item.spearmanRho !== undefined || item.rho !== undefined;
        });

  return normalizeRows(source).map((row) => ({
    variableA: row.variableA || row.variable1 || row.variableX || row.x || row.left,
    variableB: row.variableB || row.variable2 || row.variableY || row.y || row.right,
    rho: getCorrelationCoefficient(row),
    pValue: row.pValue ?? row.p,
    significance: row.significance,
    fisherZ: row.fisherZ,
    standardError: row.standardError ?? row.se,
    interpretation: row.interpretation,
  }));
}

function buildJaspReliabilityRows(
  arrays: ReturnType<typeof getResultArrays>,
): DataRow[] {
  return normalizeRows(arrays.reliability).map((row) => ({
    scaleName: row.scaleName || row.scale || row.variable || row.name || row.label,
    validRows: row.validRows ?? row.valid ?? row.validN ?? row.n,
    itemCount: row.itemCount,
    cronbachAlpha: row.cronbachAlpha ?? row.alpha,
    interpretation: row.interpretation,
    items: row.items,
  }));
}

function buildJaspNormalityRows(
  arrays: ReturnType<typeof getResultArrays>,
): DataRow[] {
  return normalizeRows(arrays.normality).map((row) => ({
    variable: row.variable || row.name || row.scaleName || row.label,
    valid: row.valid ?? row.n,
    method: row.method,
    statistic: row.statistic ?? row.shapiroWilk,
    pValue: row.pValue ?? row.p,
    isNormal: row.isNormal,
    recommendation: row.recommendation,
    note: row.note,
  }));
}

function normalizeTableRowsFromJaspTable(
  table: unknown,
  fallbackTitle: string,
): DataRow[] {
  if (!isRecord(table)) return [];

  const tableTitle = String(table.title || table.name || fallbackTitle || 'JASP tabuľka');
  const rows = safeArray(table.rows || table.data || table.values || table.items);

  return normalizeRows(rows).map((row) => ({
    tableTitle,
    ...row,
  }));
}

function buildJaspOutputSections(result: AnalysisResult | null): TableSection[] {
  const raw = (result || {}) as any;
  const jaspOutput = raw.jaspOutput || null;
  const sections: TableSection[] = [];

  const frequencySections = safeArray<any>(
    raw.jaspFrequencySections || jaspOutput?.frequencySections,
  );

  frequencySections.forEach((section, sectionIndex) => {
    if (!isRecord(section)) return;

    const tables = safeArray(section.tables);
    const rows = tables.flatMap((table, tableIndex) =>
      normalizeTableRowsFromJaspTable(
        table,
        `${section.title || 'Frekvenčné tabuľky'} ${tableIndex + 1}`,
      ).map((row) => ({
        jaspSection: section.title || 'Frekvenčné tabuľky',
        ...row,
      })),
    );

    if (!rows.length) return;

    sections.push({
      key: `jasp-frequency-section-${sectionIndex + 1}`,
      title: String(section.title || `JASP frekvenčná sekcia ${sectionIndex + 1}`),
      description: String(
        section.description ||
          section.subtitle ||
          'Frekvenčné tabuľky v členení podľa JASP reportu.',
      ),
      rows,
      icon: <BarChart3 className="h-5 w-5" />,
      priority: 30 + sectionIndex,
    });
  });

  const descriptiveSection = raw.jaspDescriptiveSection || jaspOutput?.descriptiveSection;
  if (isRecord(descriptiveSection)) {
    const rows = safeArray(descriptiveSection.tables).flatMap((table, tableIndex) =>
      normalizeTableRowsFromJaspTable(table, `Descriptive Statistics ${tableIndex + 1}`).map(
        (row) => ({
          jaspSection: descriptiveSection.title || 'DESKRIPTÍVNA ŠTATISTIKA - škály a subškály',
          ...row,
        }),
      ),
    );

    if (rows.length) {
      sections.push({
        key: 'jasp-output-descriptive',
        title: String(descriptiveSection.title || 'DESKRIPTÍVNA ŠTATISTIKA - škály a subškály'),
        description: String(
          descriptiveSection.subtitle ||
            'Descriptive Statistics – Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
        ),
        rows,
        icon: <Sigma className="h-5 w-5" />,
        priority: 40,
      });
    }
  }

  const reliabilitySection = raw.jaspReliabilitySection || jaspOutput?.reliabilitySection;
  if (isRecord(reliabilitySection)) {
    const rows = safeArray(reliabilitySection.tables).flatMap((table, tableIndex) =>
      normalizeTableRowsFromJaspTable(table, `Reliability ${tableIndex + 1}`).map((row) => ({
        jaspSection: reliabilitySection.title || 'RELIABILITA ŠKÁL, SUBŠKÁL',
        ...row,
      })),
    );

    if (rows.length) {
      sections.push({
        key: 'jasp-output-reliability',
        title: String(reliabilitySection.title || 'RELIABILITA ŠKÁL, SUBŠKÁL'),
        description: String(
          reliabilitySection.subtitle ||
            'Unidimensional Reliability – Cronbachovo alfa a If item dropped.',
        ),
        rows,
        icon: <FlaskConical className="h-5 w-5" />,
        priority: 50,
      });
    }
  }

  const correlationSection = raw.jaspCorrelationSection || jaspOutput?.correlationSection;
  if (isRecord(correlationSection)) {
    const rows = safeArray(correlationSection.tables).flatMap((table, tableIndex) =>
      normalizeTableRowsFromJaspTable(table, `Spearman ${tableIndex + 1}`).map((row) => ({
        jaspSection: correlationSection.title || 'KORELAČNÁ ANALÝZA-SPEARMAN',
        ...row,
      })),
    );

    if (rows.length) {
      sections.push({
        key: 'jasp-output-spearman',
        title: String(correlationSection.title || 'KORELAČNÁ ANALÝZA-SPEARMAN'),
        description: String(
          correlationSection.subtitle ||
            "IBA MEDZI ŠKÁLAMI A SUBŠKÁLAMI – Spearman's rho, p, Fisher's z a SE.",
        ),
        rows,
        icon: <Sigma className="h-5 w-5" />,
        priority: 60,
      });
    }
  }

  return sections;
}

function createTableSections(result: AnalysisResult | null): TableSection[] {
  const arrays = getResultArrays(result);
  const jaspOutputSections = buildJaspOutputSections(result);

  const jaspScaleRows = buildJaspScaleDescriptiveRows(arrays);
  const jaspNormalityRows = buildJaspNormalityRows(arrays);
  const jaspReliabilityRows = buildJaspReliabilityRows(arrays);
  const jaspSpearmanRows = buildJaspSpearmanRows(arrays);

  const sections: TableSection[] = [
    {
      key: 'dataQuality',
      title: '1. Kontrola a príprava dát',
      description:
        'Kontrola vstupného súboru pred štatistikou: vybraný hárok, riadok hlavičky, počet riadkov, odstránené prázdne alebo duplicitné riadky.',
      rows: arrays.preparedDataQualityRows,
      icon: <Info className="h-5 w-5" />,
      priority: 1,
    },
    {
      key: 'variableMap',
      title: '2. Mapa premenných',
      description:
        'Automatické rozpoznanie premenných: demografické, skupinové, položkové, číselné, textové, dátumové, škály a subškály.',
      rows: arrays.variables,
      icon: <Table2 className="h-5 w-5" />,
      priority: 2,
    },
    {
      key: 'rawData',
      title: '3. Pripravené raw dáta',
      description:
        'Dáta po očistení a transformácii. Z týchto raw dát sa následne počítajú všetky štatistiky.',
      rows: arrays.preparedRawRows,
      icon: <FileSpreadsheet className="h-5 w-5" />,
      priority: 3,
    },
    ...jaspOutputSections,
    {
      key: 'files',
      title: 'Spracované súbory',
      description: 'Prehľad súborov použitých pri analýze.',
      rows: arrays.files,
      icon: <FileText className="h-5 w-5" />,
      priority: 10,
    },
    {
      key: 'jaspScaleDescriptives',
      title: 'JASP tabuľka – deskriptívna štatistika škál a subškál',
      description:
        'Hlavná tabuľka podľa JASP: Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
      rows: jaspScaleRows,
      icon: <Sigma className="h-5 w-5" />,
      priority: 70,
    },
    {
      key: 'jaspNormality',
      title: 'JASP tabuľka – normalita dát',
      description:
        'Kontrola normality škál a subškál vrátane štatistiky, p-hodnoty a odporúčania.',
      rows: jaspNormalityRows,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 80,
    },
    {
      key: 'jaspReliability',
      title: 'JASP tabuľka – reliabilita škál',
      description:
        'Cronbachovo alfa pre rozpoznané alebo manuálne definované škály a subškály.',
      rows: jaspReliabilityRows,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 90,
    },
    {
      key: 'jaspSpearman',
      title: 'JASP tabuľka – Spearmanove korelácie',
      description:
        'Spearmanove korelácie medzi škálami a subškálami vrátane p-hodnoty, Fisherovho z a SE efektu.',
      rows: jaspSpearmanRows,
      icon: <Sigma className="h-5 w-5" />,
      priority: 100,
    },
    {
      key: 'frequencies',
      title: 'Frekvenčná analýza',
      description:
        'Početnosti, percentá, validné percentá a kumulatívne percentá po jednotlivých položkách alebo kategóriách.',
      rows:
        arrays.frequencyRows.length > 0
          ? arrays.frequencyRows
          : arrays.frequencies,
      icon: <BarChart3 className="h-5 w-5" />,
      priority: 110,
    },
    {
      key: 'itemDescriptives',
      title: 'Deskriptívna štatistika položiek',
      description:
        'Deskriptívna štatistika po jednotlivých položkách – vhodná na kontrolu dát.',
      rows: arrays.itemDescriptives,
      icon: <Sigma className="h-5 w-5" />,
      priority: 120,
    },
    {
      key: 'scaleScores',
      title: 'Vypočítané škály a subškály',
      description:
        'Súčty alebo priemery položiek podľa definovaných alebo automaticky rozpoznaných škál/subškál.',
      rows: arrays.scaleScores,
      icon: <Brain className="h-5 w-5" />,
      priority: 130,
    },
    {
      key: 'scaleDescriptives',
      title: 'Deskriptívna štatistika škál a subškál',
      description:
        'Hlavná deskriptívna štatistika vhodná do práce – N, M, medián, SD, min, max, šikmosť, špicatosť.',
      rows: arrays.scaleDescriptives,
      icon: <Sigma className="h-5 w-5" />,
      priority: 140,
    },
    {
      key: 'normality',
      title: 'Normalita dát',
      description:
        'Posúdenie normality škál a subškál a odporúčanie parametrických alebo neparametrických testov.',
      rows: arrays.normality,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 150,
    },
    {
      key: 'pearsonCorrelations',
      title: 'Pearsonove korelácie',
      description: 'Parametrické korelácie medzi škálami, subškálami alebo číselnými premennými.',
      rows: arrays.pearsonCorrelations,
      icon: <Sigma className="h-5 w-5" />,
      priority: 160,
    },
    {
      key: 'spearmanCorrelations',
      title: 'Spearmanove korelácie',
      description: 'Neparametrické korelácie medzi škálami, subškálami alebo ordinálnymi premennými.',
      rows: arrays.spearmanCorrelations,
      icon: <Sigma className="h-5 w-5" />,
      priority: 170,
    },
    {
      key: 'correlations',
      title: 'Korelačná analýza',
      description: 'Súhrnný formát korelácií, ak prichádza z univerzálneho API výstupu.',
      rows: arrays.correlations,
      icon: <Sigma className="h-5 w-5" />,
      priority: 175,
    },
    {
      key: 'recommendedCorrelations',
      title: 'Odporúčaná korelačná analýza',
      description:
        'Korelácie odporúčané podľa normality dát – Pearson alebo Spearman.',
      rows: arrays.recommendedCorrelations,
      icon: <Brain className="h-5 w-5" />,
      priority: 180,
    },
    {
      key: 'reliability',
      title: 'Reliabilita – Cronbach alfa',
      description:
        'Vnútorná konzistencia škál a subškál štandardizovaného dotazníka.',
      rows: arrays.reliability,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 190,
    },
    {
      key: 'statisticalTests',
      title: 'Štatistické testovanie',
      description:
        'Univerzálne výsledky testovania: t-test, ANOVA, Mann-Whitney U, Kruskal-Wallis alebo ďalšie testy.',
      rows: arrays.statisticalTests,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 200,
    },
    {
      key: 'parametricGroupTests',
      title: 'Parametrické testy',
      description:
        'Independent t-test a ANOVA pre porovnanie rozdielov medzi skupinami.',
      rows: arrays.parametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
      priority: 210,
    },
    {
      key: 'nonParametricGroupTests',
      title: 'Neparametrické testy',
      description:
        'Mann-Whitney U test a Kruskal-Wallis test pre porovnanie skupín.',
      rows: arrays.nonParametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
      priority: 220,
    },
    {
      key: 'recommendedGroupTests',
      title: 'Odporúčané testovanie rozdielov',
      description: 'Testy odporúčané podľa normality dát a počtu skupín.',
      rows: arrays.recommendedGroupTests,
      icon: <Brain className="h-5 w-5" />,
      priority: 230,
    },
    {
      key: 'tTests',
      title: 'T-testy',
      description: 'Starší formát výsledkov t-testov, ak bol v odpovedi dostupný.',
      rows: arrays.tTests,
      icon: <Sigma className="h-5 w-5" />,
      priority: 240,
    },
    {
      key: 'hypothesisTests',
      title: 'Výsledky testovania hypotéz',
      description: 'Súhrn vykonaných alebo odporúčaných testov.',
      rows: arrays.hypothesisTests,
      icon: <FlaskConical className="h-5 w-5" />,
      priority: 250,
    },
    {
      key: 'recommendedCharts',
      title: 'Odporúčané grafy',
      description: 'Grafy vhodné pre praktickú časť práce.',
      rows: arrays.recommendedCharts,
      icon: <PieChart className="h-5 w-5" />,
      priority: 260,
    },
    {
      key: 'excelTables',
      title: 'Odporúčané tabuľky do práce',
      description: 'Tabuľky vhodné do Excelu, Wordu alebo prílohy práce.',
      rows: arrays.excelTables,
      icon: <FileSpreadsheet className="h-5 w-5" />,
      priority: 270,
    },
  ];

  return sections
    .filter((section) => safeArray(section.rows).length > 0)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function decodeEscapedText(value: unknown): string {
  return String(value || '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function unwrapPossibleJsonText(value: unknown): string {
  return decodeEscapedText(value)
    .replace(/^\s*```json\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/^\s*json\s*/i, '')
    .replace(/^\s*Academic\s+Interpretation\s*/i, '')
    .trim();
}

function tryParseJsonObject(value: unknown): Record<string, unknown> | null {
  const text = unwrapPossibleJsonText(value);

  if (!text) return null;

  const candidates: string[] = [text];

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/^\s*json\s*/i, '')
      .replace(/^\s*Academic\s+Interpretation\s*/i, '')
      .replace(/[;\s]*$/g, '')
      .trim();

    try {
      const parsed = JSON.parse(normalized);

      if (isRecord(parsed)) return parsed;
    } catch {
      // Skúsime ďalší kandidát.
    }
  }

  return null;
}

function extractJsonStringField(value: unknown, fieldName: string): string {
  const text = unwrapPossibleJsonText(value);

  if (!text) return '';

  const pattern = new RegExp(
    `"${fieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
    'i',
  );

  const match = text.match(pattern);

  if (!match?.[1]) return '';

  return decodeEscapedText(match[1])
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .trim();
}

function extractJsonArrayField(value: unknown, fieldName: string): string[] {
  const text = unwrapPossibleJsonText(value);

  if (!text) return [];

  const pattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = text.match(pattern);

  if (!match?.[1]) return [];

  return Array.from(match[1].matchAll(/"((?:\\.|[^"\\])*)"/g))
    .map((item) => decodeEscapedText(item[1]).trim())
    .filter(Boolean);
}

function getAiTextCandidates(result: AnalysisResult | null): unknown[] {
  const raw = (result || {}) as any;
  const agent = getClaudeAgent(result);

  return [
    raw.summary,
    raw.practicalText,
    raw.interpretation,
    raw.fullText,
    agent.text,
    raw.aiAgent?.text,
    raw.claudeAgent?.text,
    raw.claudeOutput,
    raw.claudeText,
  ];
}

function getParsedAiSource(result: AnalysisResult | null): Record<string, unknown> | null {
  for (const candidate of getAiTextCandidates(result)) {
    const parsed = tryParseJsonObject(candidate);

    if (
      parsed &&
      (parsed.summary || parsed.practicalText || parsed.interpretation || parsed.fullText)
    ) {
      return parsed;
    }
  }

  const fallbackSource: Record<string, unknown> = {};

  for (const candidate of getAiTextCandidates(result)) {
    const summary = extractJsonStringField(candidate, 'summary');
    const practicalText = extractJsonStringField(candidate, 'practicalText');
    const interpretation = extractJsonStringField(candidate, 'interpretation');
    const fullText = extractJsonStringField(candidate, 'fullText');
    const title = extractJsonStringField(candidate, 'title');
    const warnings = extractJsonArrayField(candidate, 'warnings');

    if (title && !fallbackSource.title) fallbackSource.title = title;
    if (summary && !fallbackSource.summary) fallbackSource.summary = summary;
    if (practicalText && !fallbackSource.practicalText) fallbackSource.practicalText = practicalText;
    if (interpretation && !fallbackSource.interpretation) fallbackSource.interpretation = interpretation;
    if (fullText && !fallbackSource.fullText) fallbackSource.fullText = fullText;
    if (warnings.length && !fallbackSource.warnings) fallbackSource.warnings = warnings;
  }

  return Object.keys(fallbackSource).length > 0 ? fallbackSource : null;
}

function stripJsonLikeText(value: unknown): string {
  const text = unwrapPossibleJsonText(value);

  if (!text) return '';

  const parsed = tryParseJsonObject(text);
  if (parsed) {
    return getFirstTextValue(
      parsed.interpretation,
      parsed.practicalText,
      parsed.fullText,
      parsed.summary,
    );
  }

  const directFields = [
    extractJsonStringField(text, 'interpretation'),
    extractJsonStringField(text, 'practicalText'),
    extractJsonStringField(text, 'fullText'),
    extractJsonStringField(text, 'summary'),
  ].filter(Boolean);

  if (directFields.length > 0) return directFields.join('\n\n');

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const before = text.slice(0, firstBrace).trim();
    const after = text.slice(lastBrace + 1).trim();

    const cleaned = [before, after]
      .join('\n\n')
      .replace(/^Academic\s+Interpretation\s*$/im, '')
      .replace(/^json\s*$/im, '')
      .trim();

    if (cleaned) return cleaned;

    return '';
  }

  return text;
}

function cleanOutputText(value: unknown): string {
  const text = stripJsonLikeText(value)
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\s*json\s*$/gim, '')
    .replace(/^\s*Academic\s+Interpretation\s*$/gim, '')
    .replace(/^\s*[{}]\s*$/gm, '')
    .replace(/^\s*"?(ok|title|summary|practicalText|interpretation|warnings|fullText)"?\s*:\s*/gim, '')
    .replace(/",?\s*$/gm, '')
    .replace(/^"/gm, '')
    .replace(/^\s*,\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return '';
  if (text === '{' || text === '}') return '';
  if (/^json\s*$/i.test(text)) return '';
  if (text.startsWith('{') && text.endsWith('}')) return '';

  return text;
}

function splitTextToParagraphs(value: unknown): string[] {
  const cleaned = cleanOutputText(value);

  if (!cleaned) return [];

  return cleaned
    .split(/\n\s*\n|(?<=\.)\s+(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/g)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => {
      if (!paragraph) return false;
      if (/^json$/i.test(paragraph)) return false;
      if (paragraph === '{' || paragraph === '}') return false;
      if (/^"?(ok|title|summary|practicalText|interpretation|warnings|fullText)"?\s*:/i.test(paragraph)) return false;
      if (paragraph.startsWith('{') && paragraph.endsWith('}')) return false;
      return true;
    });
}

function getSummaryLines(result: AnalysisResult | null): string[] {
  const raw = (result || {}) as any;
  const parsedSource = getParsedAiSource(result);

  const summary = getFirstTextValue(
    parsedSource?.summary,
    raw.summary,
    raw.aiAgent?.summary,
    raw.claudeAgent?.summary,
  );

  const aiRecommendation = getFirstArray(
    raw.aiRecommendation,
    raw.statisticalAnalysis?.aiRecommendation,
  ).map((item) => valueToText(item));

  const meta = raw.meta || raw.statisticalAnalysis?.meta || getPreparedDataset(result).quality;
  const generatedLines: string[] = [];

  if (isRecord(meta)) {
    const respondentCount = meta.respondentCount || meta.rowCount;
    const idColumn = meta.idColumn;

    if (respondentCount) {
      generatedLines.push(`Počet respondentov: N = ${respondentCount}.`);
    }

    if (idColumn) {
      generatedLines.push(
        `Stĺpec "${idColumn}" bol rozpoznaný ako ID a nebol použitý v štatistických výpočtoch.`,
      );
    }
  }

  return [
    ...generatedLines,
    ...splitTextToParagraphs(summary),
    ...aiRecommendation.map((item) => cleanOutputText(item)).filter(Boolean),
  ]
    .filter(Boolean)
    .filter((line, index, array) => array.indexOf(line) === index);
}

function buildProfessionalFallbackFromStatistics(result: AnalysisResult | null): string {
  const arrays = getResultArrays(result);
  const raw = (result || {}) as any;
  const meta = arrays.meta as any;
  const respondentCount =
    meta?.respondentCount ||
    raw.respondentCount ||
    meta?.n ||
    meta?.totalRows ||
    meta?.rowCount ||
    getFallbackRespondentCount(result, arrays.files);

  const idColumn = String(meta?.idColumn || raw.idColumn || '').trim();

  const normalityRejected = arrays.normality.filter((row) => {
    if (!isRecord(row)) return false;
    const p = toNumber(row.pValue ?? row.p);
    return p !== null && p < 0.05;
  }).length;

  const reliabilityCount = arrays.reliability.length;
  const correlationCount = getTotalCorrelationCount(arrays);
  const testsCount = getTotalTestsCount(arrays);

  return [
    respondentCount
      ? `Analýza bola spracovaná na výskumnej vzorke N = ${respondentCount} respondentov.`
      : 'Analýza bola spracovaná na základe nahraného dátového súboru.',
    idColumn
      ? `Stĺpec „${idColumn}“ bol identifikovaný ako technický identifikátor respondentov a nebol zahrnutý medzi analyzované premenné.`
      : '',
    'Pred samotným vyhodnotením boli dáta pripravené do interného súboru raw-data.xlsx. Až z týchto očistených dát boli počítané frekvencie, deskriptívna štatistika, škály, subškály, reliabilita, korelácie a testovanie rozdielov.',
    `Výstup obsahuje frekvenčné tabuľky, deskriptívnu štatistiku, kontrolu normality, reliabilitu škál a korelačné alebo skupinové analýzy podľa dostupných premenných.`,
    normalityRejected > 0
      ? `Keďže pri časti premenných nebola potvrdená normalita rozdelenia, pri interpretácii vzťahov a rozdielov je vhodné uprednostniť neparametrické postupy, najmä Spearmanovu koreláciu, Mann-Whitneyho U test a Kruskal-Wallisov test.`
      : '',
    reliabilityCount > 0
      ? `Reliabilita škál bola posúdená pomocou Cronbachovho alfa. Hodnoty reliability je potrebné interpretovať podľa počtu položiek, charakteru škály a metodiky použitého dotazníka.`
      : '',
    correlationCount > 0
      ? `Vzťahy medzi premennými boli interpretované pomocou korelačnej analýzy. Smer koeficientu vyjadruje pozitívny alebo negatívny vzťah a jeho absolútna hodnota naznačuje silu vzťahu.`
      : '',
    testsCount > 0
      ? `Rozdiely medzi skupinami boli posúdené pomocou dostupných parametrických alebo neparametrických testov podľa počtu skupín a charakteru dát.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getProfessionalInterpretation(result: AnalysisResult | null) {
  const raw = (result || {}) as any;
  const agent = getClaudeAgent(result);
  const source = getParsedAiSource(result);
  const fallback = buildProfessionalFallbackFromStatistics(result);

  const title = getFirstTextValue(
    source?.title,
    raw.title,
    'Akademická interpretácia výsledkov',
  );

  const summary = getFirstTextValue(
    source?.summary,
    raw.summary,
    'Analýza bola spracovaná a nižšie je pripravený odborný výstup vhodný do praktickej časti práce.',
  );

  const practicalText = getFirstTextValue(
    source?.practicalText,
    raw.practicalText,
  );

  const interpretation = getFirstTextValue(
    source?.interpretation,
    raw.interpretation,
    source?.fullText,
    raw.fullText,
  );

  const fallbackFromAgent = source
    ? ''
    : getFirstTextValue(agent.text, raw.aiAgent?.text, raw.claudeAgent?.text);

  const warnings = [
    ...safeArray(source?.warnings),
    ...safeArray(raw.warnings),
  ]
    .map((item) => valueToText(item))
    .map((item) => cleanOutputText(item))
    .filter((item, index, array) => item && item !== '—' && array.indexOf(item) === index)
    .filter((item) => !item.startsWith('{') && !/^"?(ok|title|summary|practicalText|interpretation|warnings|fullText)"?\s*:/i.test(item));

  const sections = [
    {
      key: 'summary',
      title: '1. Súhrn výsledkov',
      text: summary,
    },
    {
      key: 'practicalText',
      title: '2. Text do praktickej časti práce',
      text: practicalText,
    },
    {
      key: 'interpretation',
      title: '3. Odborná interpretácia výsledkov',
      text: interpretation || fallbackFromAgent || fallback,
    },
  ].filter((section) => splitTextToParagraphs(section.text).length > 0);

  return {
    title: cleanOutputText(title) || 'Akademická interpretácia výsledkov',
    summary,
    practicalText,
    interpretation: interpretation || fallbackFromAgent || fallback || summary,
    warnings,
    sections,
    model: agent.model,
    error: agent.error,
  };
}

function ProfessionalTextBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const paragraphs = splitTextToParagraphs(text);

  if (!paragraphs.length) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <h4 className="mb-3 text-base font-black text-white">{title}</h4>

      <div className="space-y-3 text-sm leading-7 text-slate-100">
        {paragraphs.map((paragraph, index) => (
          <p key={`${title}-${index}`}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getFileName(format: ExportFormat): string {
  if (format === 'word') return 'vysledky-analyzy-dat.doc';
  if (format === 'xls') return 'statisticka-analyza.xlsx';
  if (format === 'raw') return 'raw-data.xlsx';

  return 'vysledky-analyzy-dat.pdf';
}


type ExcelWorkbookLike = any;
type ExcelWorksheetLike = any;

type ExportTableDefinition = {
  sheetName: string;
  title: string;
  description: string;
  rows: DataRow[];
};

const EXCEL_THEME = {
  navy: 'FF0F172A',
  blue: 'FF1D4ED8',
  lightBlue: 'FFDBEAFE',
  cyan: 'FFE0F2FE',
  green: 'FFDCFCE7',
  amber: 'FFFEF3C7',
  red: 'FFFEE2E2',
  purple: 'FFEDE9FE',
  slate: 'FFF8FAFC',
  border: 'FFCBD5E1',
  white: 'FFFFFFFF',
  text: 'FF111827',
  muted: 'FF475569',
};

const EXCEL_CHART_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#f59e0b',
  '#dc2626',
  '#0891b2',
  '#be185d',
  '#4f46e5',
  '#65a30d',
  '#ea580c',
];


async function loadExcelJsModule(): Promise<any | null> {
  try {
    const moduleName = 'exceljs';
    const dynamicImport = new Function(
      'moduleName',
      'return import(moduleName)',
    ) as (moduleName: string) => Promise<any>;

    const imported = await dynamicImport(moduleName);
    return imported?.default || imported;
  } catch {
    return null;
  }
}

function normalizeSheetName(value: string, fallback = 'Hárok'): string {
  const cleaned = String(value || fallback)
    .replace(/[\\/?*\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);

  return cleaned || fallback.slice(0, 31);
}

function ensureUniqueSheetName(name: string, usedNames: Set<string>): string {
  const base = normalizeSheetName(name || 'Hárok');
  let candidate = base;
  let index = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    index += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function cellRef(row: number, col: number): string {
  let column = col;
  let letters = '';

  while (column > 0) {
    const mod = (column - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    column = Math.floor((column - mod) / 26);
  }

  return `${letters}${row}`;
}

function sheetLink(sheetName: string): string {
  return `#'${String(sheetName).replace(/'/g, "''")}'!A1`;
}

function toExcelCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => valueToText(item)).filter(Boolean).join(', ');
  if (isRecord(value)) return valueToText(value);
  return String(value);
}


function toCleanArrayBuffer(value: unknown): ArrayBuffer {
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    ) as ArrayBuffer;
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value as number[]).buffer.slice(0) as ArrayBuffer;
  }

  const text = String(value ?? '');
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function createValidXlsxBlob(output: unknown): Blob {
  return new Blob([toCleanArrayBuffer(output)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}


type PureXlsxSheet = {
  sheetName: string;
  rows: unknown[][];
};

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
}

function pureColumnName(index: number): string {
  let column = index + 1;
  let letters = '';

  while (column > 0) {
    const mod = (column - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    column = Math.floor((column - mod) / 26);
  }

  return letters;
}

function normalizePureXlsxRows(rows: unknown[][]): unknown[][] {
  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [['Žiadne dáta']];
  const normalizedRows = safeRows
    .map((row) => (Array.isArray(row) ? row : [row]))
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''));

  return normalizedRows.length > 0 ? normalizedRows : [['Žiadne dáta']];
}

function pureWorksheetXml(rows: unknown[][]): string {
  const normalizedRows = normalizePureXlsxRows(rows);
  const maxColumnCount = Math.max(1, ...normalizedRows.map((row) => row.length));
  const dimension = `A1:${pureColumnName(maxColumnCount - 1)}${normalizedRows.length}`;

  const sheetData = normalizedRows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = Array.from({ length: maxColumnCount }, (_, columnIndex) => {
        const value = row[columnIndex];
        const cellReference = `${pureColumnName(columnIndex)}${rowNumber}`;

        if (typeof value === 'number' && Number.isFinite(value)) {
          return `<c r="${cellReference}"><v>${value}</v></c>`;
        }

        if (typeof value === 'boolean') {
          return `<c r="${cellReference}" t="b"><v>${value ? 1 : 0}</v></c>`;
        }

        const textValue = valueToText(value);
        const finalText = textValue === '—' ? '' : textValue;

        return `<c r="${cellReference}" t="inlineStr"><is><t>${xmlEscape(finalText)}</t></is></c>`;
      }).join('');

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  const cols = Array.from({ length: maxColumnCount }, (_, index) => {
    const width = Math.min(
      60,
      Math.max(
        12,
        ...normalizedRows.slice(0, 200).map((row) => String(valueToText(row[index] ?? '')).length + 2),
      ),
    );

    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${sheetData}</sheetData>
  <autoFilter ref="${dimension}"/>
</worksheet>`;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16LE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32LE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function createZipBlob(files: Array<{ path: string; content: string }>): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);

    writeUInt32LE(localHeader, 0, 0x04034b50);
    writeUInt16LE(localHeader, 4, 20);
    writeUInt16LE(localHeader, 6, 0);
    writeUInt16LE(localHeader, 8, 0);
    writeUInt16LE(localHeader, 10, 0);
    writeUInt16LE(localHeader, 12, 0);
    writeUInt32LE(localHeader, 14, crc);
    writeUInt32LE(localHeader, 18, contentBytes.length);
    writeUInt32LE(localHeader, 22, contentBytes.length);
    writeUInt16LE(localHeader, 26, nameBytes.length);
    writeUInt16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUInt32LE(centralHeader, 0, 0x02014b50);
    writeUInt16LE(centralHeader, 4, 20);
    writeUInt16LE(centralHeader, 6, 20);
    writeUInt16LE(centralHeader, 8, 0);
    writeUInt16LE(centralHeader, 10, 0);
    writeUInt16LE(centralHeader, 12, 0);
    writeUInt16LE(centralHeader, 14, 0);
    writeUInt32LE(centralHeader, 16, crc);
    writeUInt32LE(centralHeader, 20, contentBytes.length);
    writeUInt32LE(centralHeader, 24, contentBytes.length);
    writeUInt16LE(centralHeader, 28, nameBytes.length);
    writeUInt16LE(centralHeader, 30, 0);
    writeUInt16LE(centralHeader, 32, 0);
    writeUInt16LE(centralHeader, 34, 0);
    writeUInt16LE(centralHeader, 36, 0);
    writeUInt32LE(centralHeader, 38, 0);
    writeUInt32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
  });

  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = new Uint8Array(22);

  writeUInt32LE(endRecord, 0, 0x06054b50);
  writeUInt16LE(endRecord, 4, 0);
  writeUInt16LE(endRecord, 6, 0);
  writeUInt16LE(endRecord, 8, files.length);
  writeUInt16LE(endRecord, 10, files.length);
  writeUInt32LE(endRecord, 12, centralDirectory.length);
  writeUInt32LE(endRecord, 16, offset);
  writeUInt16LE(endRecord, 20, 0);

  const zipBytes = concatUint8Arrays([...localParts, centralDirectory, endRecord]);

  const arrayBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength,
  ) as ArrayBuffer;

  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function createPureXlsxBlob(sheets: PureXlsxSheet[]): Blob {
  const usedNames = new Set<string>();
  const safeSheets = sheets.length > 0 ? sheets : [{ sheetName: 'Export', rows: [['Žiadne dáta']] }];
  const normalizedSheets = safeSheets.map((sheet, index) => ({
    sheetName: ensureUniqueSheetName(sheet.sheetName || `Hárok ${index + 1}`, usedNames),
    rows: normalizePureXlsxRows(sheet.rows),
  }));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${normalizedSheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${normalizedSheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('\n')}
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${normalizedSheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('\n')}
  <Relationship Id="rId${normalizedSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const now = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>ZEDPERA</dc:creator>
  <cp:lastModifiedBy>ZEDPERA</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>ZEDPERA</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${normalizedSheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${normalizedSheets.length}" baseType="lpstr">${normalizedSheets.map((sheet) => `<vt:lpstr>${xmlEscape(sheet.sheetName)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts>
</Properties>`;

  const files = [
    { path: '[Content_Types].xml', content: contentTypes },
    { path: '_rels/.rels', content: rootRels },
    { path: 'docProps/core.xml', content: coreXml },
    { path: 'docProps/app.xml', content: appXml },
    { path: 'xl/workbook.xml', content: workbookXml },
    { path: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { path: 'xl/styles.xml', content: stylesXml },
    ...normalizedSheets.map((sheet, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      content: pureWorksheetXml(sheet.rows),
    })),
  ];

  return createZipBlob(files);
}

function createPureAnalysisExportBlob(params: {
  exportPayload: any;
  tableSections: TableSection[];
  arrays: ReturnType<typeof getResultArrays>;
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
}): Blob {
  const payload = params.exportPayload || {};
  const preparedDataset = payload.preparedDataset || params.arrays.preparedDataset || {};
  const chartData = normalizePayloadChartData(payload, params.arrays);
  const contingency = buildContingencyExport({ arrays: params.arrays, payload });
  const usedNames = new Set<string>();
  const sheets: PureXlsxSheet[] = [];
  const registry: Array<{ sheetName: string; title: string; description: string; rowCount: number }> = [];

  const addSheet = (sheetName: string, title: string, description: string, rows: unknown[][]) => {
    const realName = ensureUniqueSheetName(sheetName, usedNames);
    const safeRows = normalizePureXlsxRows(rows);
    sheets.push({ sheetName: realName, rows: safeRows });
    registry.push({ sheetName: realName, title, description, rowCount: Math.max(0, safeRows.length - 1) });
  };

  addSheet('01 Súhrn', 'Súhrn analýzy', 'Základné informácie o exporte a spracovaní dát.', aoaFromRowsForXlsx(createIntroRows(payload, params.professionalInterpretation), 'Žiadne súhrnné údaje'));
  addSheet('02 raw-data', 'Raw dáta', 'Pripravený dátový súbor použitý na výpočty.', aoaFromPreparedSheetForXlsx(preparedDataset.rawDataSheet, params.arrays.preparedRawRows, 'Žiadne raw dáta'));
  addSheet('03 variable-map', 'Mapa premenných', 'Rozpoznané premenné a analytické roly.', aoaFromPreparedSheetForXlsx(preparedDataset.variableMapSheet, params.arrays.variables, 'Žiadna mapa premenných'));
  addSheet('04 data-quality', 'Kvalita dát', 'Kontrola kvality dát.', aoaFromPreparedSheetForXlsx(preparedDataset.dataQualitySheet, params.arrays.preparedDataQualityRows, 'Žiadne údaje o kvalite dát'));

  [
    { sheetName: '05 Premenné', title: 'Premenné', description: 'Kompletný zoznam premenných.', rows: params.arrays.variables },
    { sheetName: '06 Frekvencie JASP', title: 'Frekvenčné tabuľky JASP', description: 'Početnosti a percentá.', rows: params.arrays.frequencyRows.length ? params.arrays.frequencyRows : params.arrays.frequencies },
    { sheetName: '07 Deskriptíva', title: 'Deskriptívna štatistika', description: 'Deskriptívne výsledky.', rows: params.arrays.scaleDescriptives.length ? params.arrays.scaleDescriptives : payload.descriptives || payload.descriptiveStatistics || [] },
    { sheetName: '08 Položky', title: 'Deskriptívna štatistika položiek', description: 'Deskriptívna štatistika položiek.', rows: params.arrays.itemDescriptives },
    { sheetName: '09 Škály podškály', title: 'Škály a podškály', description: 'Definícia škál a subškál.', rows: [...safeArray(preparedDataset.scaleDefinitions), ...safeArray(preparedDataset.subscaleDefinitions)] },
    { sheetName: '10 Skóre škál', title: 'Skóre škál', description: 'Vypočítané skóre škál.', rows: params.arrays.scaleScores },
    { sheetName: '11 Normalita', title: 'Normalita dát', description: 'Normalita dát.', rows: params.arrays.normality },
    { sheetName: '12 Reliabilita', title: 'Reliabilita – Cronbach alfa', description: 'Cronbachova alfa.', rows: params.arrays.reliability },
    { sheetName: '13 Pearson', title: 'Pearsonove korelácie', description: 'Pearsonove korelácie.', rows: params.arrays.pearsonCorrelations },
    { sheetName: '14 Spearman', title: 'Spearmanove korelácie', description: 'Spearmanove korelácie.', rows: params.arrays.spearmanCorrelations },
    { sheetName: '15 Korelácie', title: 'Korelačná analýza – súhrn', description: 'Súhrnná korelačná tabuľka.', rows: params.arrays.correlations },
    { sheetName: '16 Param testy', title: 'Parametrické testy', description: 't-testy a ANOVA.', rows: params.arrays.parametricGroupTests.length ? params.arrays.parametricGroupTests : payload.anovaTests || payload.tTests || [] },
    { sheetName: '17 Neparam testy', title: 'Neparametrické testy', description: 'Mann-Whitney U a Kruskal-Wallis.', rows: params.arrays.nonParametricGroupTests.length ? params.arrays.nonParametricGroupTests : payload.mannWhitneyTests || payload.kruskalWallisTests || [] },
    { sheetName: '18 Kontingencne tab', title: 'Kontingenčné tabuľky', description: 'Count, Row %, Column % a Total %.', rows: contingency.tables },
    { sheetName: '19 Chi-square', title: 'Chí-kvadrát testy', description: 'Súhrn chí-kvadrát testov.', rows: contingency.chiSquare },
    { sheetName: '20 Odpor testy', title: 'Odporúčané testy', description: 'Odporúčané štatistické testy.', rows: params.arrays.recommendedTests },
    { sheetName: '21 Odpor grafy', title: 'Odporúčané grafy', description: 'Odporúčané grafy.', rows: params.arrays.recommendedCharts },
    { sheetName: '22 Graf frekvencie', title: 'Graf frekvencií – dátová tabuľka', description: 'Dátový podklad pre graf frekvencií.', rows: chartData.frequencyChartRows || [] },
    { sheetName: '23 Graf priemery', title: 'Graf priemerov – dátová tabuľka', description: 'Dátový podklad pre graf priemerov škál.', rows: chartData.scaleMeanChartRows || [] },
    { sheetName: '24 Graf reliabilita', title: 'Graf reliability – dátová tabuľka', description: 'Dátový podklad pre graf Cronbachovej alfy.', rows: chartData.reliabilityChartRows || [] },
    { sheetName: '25 Graf korelacie', title: 'Graf korelácií – dátová tabuľka', description: 'Dátový podklad pre graf korelácií.', rows: chartData.correlationChartRows || [] },
  ].forEach((table) => addSheet(table.sheetName, table.title, table.description, aoaFromRowsForXlsx(table.rows, 'Žiadne dáta')));

  safeArray<any>(payload.exportTables).forEach((table, index) => {
    addSheet(`${String(index + 26).padStart(2, '0')} ${table.sheetName || table.title || 'Tabuľka'}`, table.title || `Tabuľka ${index + 1}`, table.description || 'Doplnková exportovaná tabuľka.', aoaFromRowsForXlsx(table.rows || [], 'Žiadne dáta'));
  });

  const navigationRows: unknown[][] = [
    ['ZEDPERA – profesionálny export výsledkov analýzy dát'],
    [params.professionalInterpretation.title || 'Výsledky analýzy dát'],
    ['Poznámka', 'Tento XLSX bol vytvorený interným exportérom bez závislosti od balíkov exceljs/xlsx.'],
    [],
    ['Poradie', 'Hárok', 'Obsah', 'Počet riadkov'],
    ...registry.map((sheet, index) => [index + 1, sheet.sheetName, `${sheet.title} – ${sheet.description}`, sheet.rowCount]),
  ];

  return createPureXlsxBlob([{ sheetName: '00 Úvod navigácia', rows: navigationRows }, ...sheets]);
}

function createPureRawDataBlob(result: AnalysisResult | null, arrays: ReturnType<typeof getResultArrays>): Blob {
  const raw = (result || {}) as any;
  const preparedDataset = raw.preparedDataset || arrays.preparedDataset || {};

  return createPureXlsxBlob([
    { sheetName: 'raw-data', rows: aoaFromPreparedSheetForXlsx(preparedDataset.rawDataSheet, arrays.preparedRawRows, 'Žiadne raw dáta') },
    { sheetName: 'variable-map', rows: aoaFromPreparedSheetForXlsx(preparedDataset.variableMapSheet, arrays.variables, 'Žiadna mapa premenných') },
    { sheetName: 'data-quality', rows: aoaFromPreparedSheetForXlsx(preparedDataset.dataQualitySheet, arrays.preparedDataQualityRows, 'Žiadne údaje o kvalite dát') },
    { sheetName: 'raw-data-rows', rows: aoaFromRowsForXlsx(arrays.preparedRawRows, 'Žiadne raw dáta') },
  ]);
}

async function assertValidXlsxBlob(blob: Blob, source = 'Excel export'): Promise<void> {
  if (!blob || blob.size < 1000) {
    const text = blob ? await blob.text().catch(() => '') : '';
    throw new Error(
      `${source} nevytvoril platný XLSX súbor. Súbor je prázdny alebo príliš malý. ${text.slice(0, 300)}`,
    );
  }

  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const isZip =
    header[0] === 0x50 &&
    header[1] === 0x4b &&
    (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07) &&
    (header[3] === 0x04 || header[3] === 0x06 || header[3] === 0x08);

  if (!isZip) {
    const text = await blob.text().catch(() => '');
    throw new Error(
      `${source} nie je platný XLSX/ZIP súbor. Namiesto Excelu sa pravdepodobne stiahla chyba alebo HTML odpoveď. Začiatok obsahu: ${text.slice(0, 500)}`,
    );
  }
}

function normalizeExportTableRows(rows: unknown[], limit?: number): DataRow[] {
  return sanitizeExportRows(rows, limit).filter((row) =>
    Object.values(row).some(
      (value) => value !== null && value !== undefined && String(value).trim() !== '',
    ),
  );
}

function getExportColumns(rows: DataRow[]): string[] {
  if (!rows.length) return [];

  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const priority = COLUMN_PRIORITY.map(getFieldLabel);

  return columns.sort((a, b) => {
    const aIndex = priority.indexOf(a);
    const bIndex = priority.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b, 'sk', { numeric: true, sensitivity: 'base' });
  });
}

function styleCellBorder(cell: any): void {
  cell.border = {
    top: { style: 'thin', color: { argb: EXCEL_THEME.border } },
    left: { style: 'thin', color: { argb: EXCEL_THEME.border } },
    bottom: { style: 'thin', color: { argb: EXCEL_THEME.border } },
    right: { style: 'thin', color: { argb: EXCEL_THEME.border } },
  };
}

function styleTitleRow(row: any): void {
  row.eachCell((cell: any) => {
    cell.font = { bold: true, size: 18, color: { argb: EXCEL_THEME.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });
  row.height = 28;
}

function styleSubtitleRow(row: any): void {
  row.eachCell((cell: any) => {
    cell.font = { italic: true, size: 11, color: { argb: EXCEL_THEME.muted } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.slate } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
}

function styleHeaderRow(row: any): void {
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: EXCEL_THEME.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.blue } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    styleCellBorder(cell);
  });
  row.height = 22;
}

function styleDataRow(row: any, rowIndex: number): void {
  row.eachCell((cell: any) => {
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: rowIndex % 2 === 0 ? EXCEL_THEME.slate : EXCEL_THEME.white },
    };
    styleCellBorder(cell);

    const numericValue = typeof cell.value === 'number' ? cell.value : toNumber(cell.value);
    const header = String(row.worksheet.getCell(4, cell.col).value || '').toLowerCase();

    if (header === 'p' || header.includes('p hodnota') || header.includes('p-value')) {
      if (numericValue !== null && numericValue < 0.05) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.green } };
        cell.font = { bold: true, color: { argb: 'FF166534' } };
      }
    }

    if (header.includes('cronbach') || header.includes('alfa') || header.includes('alpha')) {
      if (numericValue !== null && numericValue >= 0.7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.green } };
      } else if (numericValue !== null && numericValue < 0.6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.red } };
      }
    }
  });
}

function applyWorksheetLayout(sheet: ExcelWorksheetLike, columns: string[], rowCount: number): void {
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.properties.defaultRowHeight = 18;
  sheet.autoFilter = {
    from: cellRef(4, 1),
    to: cellRef(Math.max(4, rowCount), Math.max(1, columns.length)),
  };

  columns.forEach((column, index) => {
    const width = Math.min(Math.max(String(column).length + 4, 14), 42);
    sheet.getColumn(index + 1).width = width;
  });
}

function addProfessionalTableSheet(params: {
  workbook: ExcelWorkbookLike;
  usedNames: Set<string>;
  sheetName: string;
  title: string;
  description: string;
  rows: unknown[];
  introSheet?: ExcelWorksheetLike;
  introIndex?: number;
  tabColor?: string;
}): ExcelWorksheetLike | null {
  const rows = normalizeExportTableRows(params.rows);
  if (!rows.length) return null;

  const safeName = ensureUniqueSheetName(params.sheetName, params.usedNames);
  const sheet = params.workbook.addWorksheet(safeName, {
    properties: { tabColor: { argb: params.tabColor || EXCEL_THEME.blue } },
  });

  const columns = getExportColumns(rows);
  const lastCol = Math.max(columns.length, 2);

  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getCell(1, 1).value = params.title;
  styleTitleRow(sheet.getRow(1));

  sheet.mergeCells(2, 1, 2, lastCol);
  sheet.getCell(2, 1).value = params.description || 'Profesionálne exportované dáta z analýzy.';
  styleSubtitleRow(sheet.getRow(2));

  sheet.addRow([]);
  const headerRow = sheet.addRow(columns);
  styleHeaderRow(headerRow);

  rows.forEach((row, index) => {
    const excelRow = sheet.addRow(columns.map((column) => toExcelCellValue(row[column])));
    styleDataRow(excelRow, index);
  });

  applyWorksheetLayout(sheet, columns, sheet.rowCount);

  if (params.introSheet && params.introIndex !== undefined) {
    addIntroLinkRow({
      introSheet: params.introSheet,
      index: params.introIndex,
      sheetName: safeName,
      title: params.title,
      description: params.description,
      rowCount: rows.length,
    });
  }

  return sheet;
}

function addAoAProfessionalSheet(params: {
  workbook: ExcelWorkbookLike;
  usedNames: Set<string>;
  sheetName: string;
  title: string;
  description: string;
  rows: unknown;
  introSheet?: ExcelWorksheetLike;
  introIndex?: number;
  tabColor?: string;
}): ExcelWorksheetLike | null {
  if (!isAoATable(params.rows) || params.rows.length === 0) return null;

  const [headersRaw, ...bodyRows] = params.rows;
  const headers = headersRaw.map((header, index) => String(header || `Stĺpec ${index + 1}`));
  const rows = bodyRows
    .filter((row) => row.some((cell) => !['', null, undefined].includes(cell as any)))
    .map((row) => {
      const output: DataRow = {};
      headers.forEach((header, index) => {
        output[header] = row[index] ?? '';
      });
      return output;
    });

  return addProfessionalTableSheet({
    workbook: params.workbook,
    usedNames: params.usedNames,
    sheetName: params.sheetName,
    title: params.title,
    description: params.description,
    rows,
    introSheet: params.introSheet,
    introIndex: params.introIndex,
    tabColor: params.tabColor,
  });
}

function addIntroLinkRow(params: {
  introSheet: ExcelWorksheetLike;
  index: number;
  sheetName: string;
  title: string;
  description: string;
  rowCount: number;
}): void {
  const row = params.introSheet.addRow([
    params.index,
    params.title,
    params.description,
    params.rowCount,
    { text: 'Otvoriť hárok', hyperlink: sheetLink(params.sheetName) },
  ]);

  row.eachCell((cell: any) => {
    styleCellBorder(cell);
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: params.index % 2 === 0 ? EXCEL_THEME.slate : EXCEL_THEME.white },
    };
  });

  row.getCell(5).font = { bold: true, color: { argb: EXCEL_THEME.blue }, underline: true };
}


function createIntroRows(
  exportPayload: any,
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>,
): Array<{ Položka: string; Hodnota: string }> {
  const payload = isRecord(exportPayload) ? exportPayload : {};
  const preparedDataset = isRecord(payload.preparedDataset)
    ? payload.preparedDataset
    : {};
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};
  const statisticalAnalysis = isRecord(payload.statisticalAnalysis)
    ? payload.statisticalAnalysis
    : {};
  const statisticalMeta = isRecord(statisticalAnalysis.meta)
    ? statisticalAnalysis.meta
    : {};
  const professional = professionalInterpretation || ({} as ReturnType<typeof getProfessionalInterpretation>);

  const getFirstText = (...values: unknown[]): string => {
    for (const value of values) {
      const text = valueToText(value);
      if (text && text !== '—') return text;
    }

    return '';
  };

  const getFirstNumberText = (...values: unknown[]): string => {
    for (const value of values) {
      const number = toNumber(value);
      if (number !== null && Number.isFinite(number)) {
        return formatNumber(number);
      }

      const text = valueToText(value);
      if (text && text !== '—') return text;
    }

    return '';
  };

  const arrays = getResultArrays(payload as AnalysisResult | null);

  const rows: Array<{ Položka: string; Hodnota: string }> = [
    {
      Položka: 'Názov výstupu',
      Hodnota: getFirstText(payload.title, professional.title, 'Výsledky analýzy dát'),
    },
    {
      Položka: 'Zdrojový súbor',
      Hodnota: getFirstText(
        preparedDataset.sourceFileName,
        quality.sourceFileName,
        payload.sourceFileName,
        payload.fileName,
      ),
    },
    {
      Položka: 'Vybraný hárok',
      Hodnota: getFirstText(
        preparedDataset.selectedSheetName,
        quality.selectedSheetName,
        payload.selectedSheetName,
      ),
    },
    {
      Položka: 'Počet respondentov / riadkov',
      Hodnota: getFirstNumberText(
        statisticalMeta.respondentCount,
        statisticalMeta.rowCount,
        quality.rowCount,
        payload.respondentCount,
        payload.totalRows,
        getFallbackRespondentCount(payload as AnalysisResult | null, arrays.files),
      ),
    },
    {
      Položka: 'Počet premenných',
      Hodnota: getFirstNumberText(
        statisticalMeta.variableCount,
        quality.variableCount,
        safeArray(preparedDataset.variables).length || safeArray(payload.variables).length,
      ),
    },
    {
      Položka: 'Počet škál',
      Hodnota: getFirstNumberText(
        statisticalMeta.scaleCount,
        quality.scaleCount,
        safeArray(preparedDataset.scaleDefinitions).length,
      ),
    },
    {
      Položka: 'Počet subškál',
      Hodnota: getFirstNumberText(
        statisticalMeta.subscaleCount,
        quality.subscaleCount,
        safeArray(preparedDataset.subscaleDefinitions).length,
      ),
    },
    {
      Položka: 'Frekvenčné tabuľky',
      Hodnota: formatNumber(arrays.frequencies.length || arrays.frequencyRows.length),
    },
    {
      Položka: 'Deskriptívna štatistika',
      Hodnota: formatNumber(arrays.scaleDescriptives.length || arrays.itemDescriptives.length),
    },
    {
      Položka: 'Reliabilita',
      Hodnota: formatNumber(arrays.reliability.length),
    },
    {
      Položka: 'Korelácie',
      Hodnota: formatNumber(getTotalCorrelationCount(arrays)),
    },
    {
      Položka: 'Štatistické testy',
      Hodnota: formatNumber(getTotalTestsCount(arrays)),
    },
    {
      Položka: 'Odporúčané grafy',
      Hodnota: formatNumber(arrays.recommendedCharts.length),
    },
    {
      Položka: 'Model / AI interpretácia',
      Hodnota: getFirstText(professional.model, arrays.claudeAgent?.model, 'Interná štatistická analýza'),
    },
    {
      Položka: 'Dátum exportu',
      Hodnota: new Date().toLocaleString('sk-SK'),
    },
  ];

  const warnings = [
    ...safeArray(payload.warnings),
    ...safeArray(quality.warnings),
    ...safeArray(professional.warnings),
  ]
    .map((item) => valueToText(item))
    .filter((item, index, array) => item && item !== '—' && array.indexOf(item) === index);

  if (warnings.length > 0) {
    rows.push({
      Položka: 'Upozornenia',
      Hodnota: warnings.join(' | '),
    });
  }

  return rows.filter((row) => row.Hodnota && row.Hodnota !== '—');
}


function createProfessionalIntroSheet(params: {
  workbook: ExcelWorkbookLike;
  usedNames: Set<string>;
  title: string;
  description: string;
  exportPayload: any;
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
}): ExcelWorksheetLike {
  const sheetName = ensureUniqueSheetName('00 Úvod a navigácia', params.usedNames);
  const sheet = params.workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: EXCEL_THEME.navy } },
  });

  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = params.title;
  styleTitleRow(sheet.getRow(1));

  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = params.description;
  styleSubtitleRow(sheet.getRow(2));

  const preparedDataset = params.exportPayload?.preparedDataset || {};
  const quality = isRecord(preparedDataset.quality) ? preparedDataset.quality : {};
  const metaRows = createIntroRows(params.exportPayload, params.professionalInterpretation);

  sheet.addRow([]);
  sheet.addRow(['Kľúčový údaj', 'Hodnota']);
  styleHeaderRow(sheet.getRow(4));
  metaRows.forEach((item, index) => {
    const row = sheet.addRow([item.Položka, item.Hodnota]);
    styleDataRow(row, index);
  });

  sheet.addRow([]);
  const navTitleRow = sheet.addRow(['Obsah exportu – preklik na každý hárok']);
  sheet.mergeCells(navTitleRow.number, 1, navTitleRow.number, 5);
  navTitleRow.eachCell((cell: any) => {
    cell.font = { bold: true, size: 14, color: { argb: EXCEL_THEME.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const headerRow = sheet.addRow(['#', 'Hárok', 'Čo sa nachádza na hárku', 'Počet riadkov', 'Preklik']);
  styleHeaderRow(headerRow);

  sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 34;
  sheet.getColumn(3).width = 75;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 18;
  sheet.autoFilter = {
    from: cellRef(headerRow.number, 1),
    to: cellRef(headerRow.number, 5),
  };

  sheet.getCell('D5').value = quality.rowCount || quality.originalRowCount || '';
  return sheet;
}

function createSvgBarChart(params: {
  title: string;
  subtitle?: string;
  rows: DataRow[];
  labelKey: string;
  valueKey: string;
  width?: number;
  height?: number;
}): string {
  const width = params.width || 980;
  const height = params.height || 520;
  const padding = { top: 72, right: 52, bottom: 58, left: 260 };
  const rows = params.rows
    .map((row) => ({
      label: valueToText(row[params.labelKey]).slice(0, 48),
      value: toNumber(row[params.valueKey]) || 0,
    }))
    .filter((item) => item.value > 0)
    .slice(0, 12);

  const plotHeight = height - padding.top - padding.bottom;
  const barGap = 10;
  const barHeight = rows.length ? Math.max(16, (plotHeight - barGap * (rows.length - 1)) / rows.length) : 20;
  const max = Math.max(...rows.map((row) => row.value), 1);

  const bars = rows
    .map((row, index) => {
      const y = padding.top + index * (barHeight + barGap);
      const barWidth = ((width - padding.left - padding.right) * row.value) / max;
      const color = EXCEL_CHART_COLORS[index % EXCEL_CHART_COLORS.length];
      return `
        <text x="${padding.left - 12}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-family="Arial" font-size="15" fill="#334155">${escapeXml(row.label)}</text>
        <rect x="${padding.left}" y="${y}" width="${Math.max(barWidth, 3)}" height="${barHeight}" rx="8" fill="${color}"/>
        <text x="${padding.left + Math.max(barWidth, 3) + 10}" y="${y + barHeight / 2 + 5}" font-family="Arial" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(formatNumber(row.value))}</text>
      `;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" rx="20" fill="#ffffff"/>
    <rect x="0" y="0" width="100%" height="54" rx="20" fill="#0f172a"/>
    <text x="32" y="35" font-family="Arial" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(params.title)}</text>
    ${params.subtitle ? `<text x="32" y="82" font-family="Arial" font-size="14" fill="#64748b">${escapeXml(params.subtitle)}</text>` : ''}
    <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#cbd5e1" stroke-width="1"/>
    ${bars}
  </svg>`;
}

function createSvgPieChart(params: {
  title: string;
  rows: DataRow[];
  labelKey: string;
  valueKey: string;
  width?: number;
  height?: number;
}): string {
  const width = params.width || 980;
  const height = params.height || 520;
  const rows = params.rows
    .map((row) => ({
      label: valueToText(row[params.labelKey]).slice(0, 42),
      value: toNumber(row[params.valueKey]) || 0,
    }))
    .filter((item) => item.value > 0)
    .slice(0, 8);
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  let currentAngle = -90;
  const cx = 290;
  const cy = 285;
  const radius = 150;

  const slices = rows
    .map((row, index) => {
      const angle = (row.value / total) * 360;
      const start = polarToCartesian(cx, cy, radius, currentAngle);
      const end = polarToCartesian(cx, cy, radius, currentAngle + angle);
      const largeArc = angle > 180 ? 1 : 0;
      const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
      currentAngle += angle;
      return `<path d="${path}" fill="${EXCEL_CHART_COLORS[index % EXCEL_CHART_COLORS.length]}" stroke="#ffffff" stroke-width="3"/>`;
    })
    .join('');

  const legend = rows
    .map((row, index) => {
      const y = 160 + index * 34;
      const percent = total ? (row.value / total) * 100 : 0;
      return `
        <rect x="540" y="${y - 14}" width="18" height="18" rx="4" fill="${EXCEL_CHART_COLORS[index % EXCEL_CHART_COLORS.length]}"/>
        <text x="570" y="${y}" font-family="Arial" font-size="15" fill="#0f172a">${escapeXml(row.label)} – ${escapeXml(formatNumber(percent))}%</text>
      `;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" rx="20" fill="#ffffff"/>
    <rect x="0" y="0" width="100%" height="54" rx="20" fill="#0f172a"/>
    <text x="32" y="35" font-family="Arial" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(params.title)}</text>
    <g>${slices}</g>
    ${legend}
  </svg>`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function svgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas kontext nie je dostupný.'));
        return;
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const png = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(png);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Graf sa nepodarilo vykresliť do obrázka.'));
    };

    image.src = url;
  });
}

async function addChartSheet(params: {
  workbook: ExcelWorkbookLike;
  usedNames: Set<string>;
  introSheet: ExcelWorksheetLike;
  introIndex: number;
  sheetName: string;
  title: string;
  description: string;
  rows: DataRow[];
  labelKey: string;
  valueKey: string;
  chartType?: 'bar' | 'pie';
}): Promise<void> {
  const rows = normalizeExportTableRows(params.rows).filter((row) => toNumber(row[params.valueKey]) !== null);
  if (!rows.length) return;

  const safeName = ensureUniqueSheetName(params.sheetName, params.usedNames);
  const sheet = params.workbook.addWorksheet(safeName, {
    properties: { tabColor: { argb: EXCEL_THEME.purple } },
  });

  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = params.title;
  styleTitleRow(sheet.getRow(1));
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = params.description;
  styleSubtitleRow(sheet.getRow(2));

  const width = 980;
  const height = 520;
  const svg = params.chartType === 'pie'
    ? createSvgPieChart({ title: params.title, rows, labelKey: params.labelKey, valueKey: params.valueKey, width, height })
    : createSvgBarChart({ title: params.title, subtitle: params.description, rows, labelKey: params.labelKey, valueKey: params.valueKey, width, height });

  try {
    const imageBase64 = await svgToPngDataUrl(svg, width, height);
    const imageId = params.workbook.addImage({ base64: imageBase64, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0, row: 3 }, ext: { width, height } });
  } catch (error) {
    sheet.getCell('A4').value = `Graf sa nepodarilo vložiť ako obrázok: ${error instanceof Error ? error.message : String(error)}`;
  }

  const dataStartRow = 34;
  sheet.getCell(dataStartRow, 1).value = 'Dáta použité v grafe';
  sheet.getCell(dataStartRow, 1).font = { bold: true, color: { argb: EXCEL_THEME.white } };
  sheet.getCell(dataStartRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_THEME.navy } };

  const columns = getExportColumns(rows);
  const headerRow = sheet.getRow(dataStartRow + 1);
  columns.forEach((column, index) => {
    headerRow.getCell(index + 1).value = column;
  });
  styleHeaderRow(headerRow);

  rows.forEach((row, index) => {
    const excelRow = sheet.getRow(dataStartRow + 2 + index);
    columns.forEach((column, colIndex) => {
      excelRow.getCell(colIndex + 1).value = toExcelCellValue(row[column]);
    });
    styleDataRow(excelRow, index);
  });

  applyWorksheetLayout(sheet, columns, dataStartRow + rows.length + 1);
  sheet.views = [{ state: 'frozen', ySplit: dataStartRow + 1 }];

  addIntroLinkRow({
    introSheet: params.introSheet,
    index: params.introIndex,
    sheetName: safeName,
    title: params.title,
    description: params.description,
    rowCount: rows.length,
  });
}

function getTopRowsForChart(rows: DataRow[], labelKeys: string[], valueKeys: string[], limit = 12): { rows: DataRow[]; labelKey: string; valueKey: string } {
  const labelKey = labelKeys.find((key) => rows.some((row) => row[key] !== undefined && String(row[key]).trim() !== '')) || labelKeys[0];
  const valueKey = valueKeys.find((key) => rows.some((row) => toNumber(row[key]) !== null)) || valueKeys[0];
  const prepared = rows
    .filter((row) => toNumber(row[valueKey]) !== null)
    .sort((a, b) => (toNumber(b[valueKey]) || 0) - (toNumber(a[valueKey]) || 0))
    .slice(0, limit);

  return { rows: prepared, labelKey, valueKey };
}

function buildContingencyExport(params: { arrays: ReturnType<typeof getResultArrays>; payload: any }): { tables: DataRow[]; chiSquare: DataRow[] } {
  const preparedDataset = params.payload?.preparedDataset || params.arrays.preparedDataset || {};
  const rawRows = safeArray<DataRow>(params.arrays.preparedRawRows.length ? params.arrays.preparedRawRows : preparedDataset.rows);
  const groupColumns = safeArray<string>(preparedDataset.groupingColumns)
    .concat(safeArray<string>(preparedDataset.demographicColumns))
    .concat(safeArray<string>(preparedDataset.categoricalColumns))
    .filter((column, index, array) => column && array.indexOf(column) === index)
    .slice(0, 5);

  const contingencyRows: DataRow[] = [];
  const chiRows: DataRow[] = [];

  for (let i = 0; i < groupColumns.length; i += 1) {
    for (let j = i + 1; j < groupColumns.length; j += 1) {
      const rowVariable = groupColumns[i];
      const columnVariable = groupColumns[j];
      const matrix = new Map<string, Map<string, number>>();
      const rowTotals = new Map<string, number>();
      const colTotals = new Map<string, number>();
      let total = 0;

      rawRows.forEach((row) => {
        const rowCategory = valueToText(row[rowVariable]);
        const colCategory = valueToText(row[columnVariable]);
        if (!rowCategory || rowCategory === '—' || !colCategory || colCategory === '—') return;
        if (!matrix.has(rowCategory)) matrix.set(rowCategory, new Map<string, number>());
        const current = matrix.get(rowCategory) as Map<string, number>;
        current.set(colCategory, (current.get(colCategory) || 0) + 1);
        rowTotals.set(rowCategory, (rowTotals.get(rowCategory) || 0) + 1);
        colTotals.set(colCategory, (colTotals.get(colCategory) || 0) + 1);
        total += 1;
      });

      if (total === 0) continue;

      const rowCategories = Array.from(rowTotals.keys()).sort((a, b) => a.localeCompare(b, 'sk', { numeric: true }));
      const colCategories = Array.from(colTotals.keys()).sort((a, b) => a.localeCompare(b, 'sk', { numeric: true }));

      rowCategories.forEach((rowCategory) => {
        colCategories.forEach((colCategory) => {
          const count = matrix.get(rowCategory)?.get(colCategory) || 0;
          const rowTotal = rowTotals.get(rowCategory) || 0;
          const colTotal = colTotals.get(colCategory) || 0;
          contingencyRows.push({
            'Riadková premenná': rowVariable,
            'Riadková kategória': rowCategory,
            'Stĺpcová premenná': columnVariable,
            'Stĺpcová kategória': colCategory,
            'Počet': count,
            'Riadkové %': rowTotal ? round((count / rowTotal) * 100, 2) : 0,
            'Stĺpcové %': colTotal ? round((count / colTotal) * 100, 2) : 0,
            'Celkové %': total ? round((count / total) * 100, 2) : 0,
          });
        });
      });

      let chiSquare = 0;
      rowCategories.forEach((rowCategory) => {
        colCategories.forEach((colCategory) => {
          const observed = matrix.get(rowCategory)?.get(colCategory) || 0;
          const expected = ((rowTotals.get(rowCategory) || 0) * (colTotals.get(colCategory) || 0)) / total;
          if (expected > 0) chiSquare += Math.pow(observed - expected, 2) / expected;
        });
      });

      const df = Math.max(1, (rowCategories.length - 1) * (colCategories.length - 1));
      chiRows.push({
        'Riadková premenná': rowVariable,
        'Stĺpcová premenná': columnVariable,
        'Chi-square': round(chiSquare, 4),
        df,
        'N': total,
        'Interpretácia': 'Chí-kvadrát test nezávislosti pre kontingenčnú tabuľku. p-hodnotu presne dopočíta serverová štatistická vrstva; tento hárok obsahuje profesionálne pripravené počty a percentá.',
      });
    }
  }

  return { tables: contingencyRows, chiSquare: chiRows };
}


async function loadXlsxModule(): Promise<any | null> {
  try {
    const moduleName = 'xlsx';
    const dynamicImport = new Function(
      'moduleName',
      'return import(moduleName)',
    ) as (moduleName: string) => Promise<any>;

    const imported = await dynamicImport(moduleName);
    return imported?.default || imported;
  } catch {
    try {
      const required = new Function('moduleName', 'return require(moduleName)') as (moduleName: string) => any;
      return required('xlsx');
    } catch {
      return null;
    }
  }
}

function aoaFromRowsForXlsx(rows: unknown[], emptyLabel: string): unknown[][] {
  const normalizedRows = normalizeExportTableRows(rows, 5000);

  if (!normalizedRows.length) {
    return [[emptyLabel]];
  }

  const columns = getExportColumns(normalizedRows);

  if (!columns.length) {
    return [[emptyLabel]];
  }

  return [
    columns.map((column) => getFieldLabel(column)),
    ...normalizedRows.map((row) =>
      columns.map((column) => toExcelCellValue(row[column])),
    ),
  ];
}

function aoaFromPreparedSheetForXlsx(value: unknown, fallbackRows: unknown[], emptyLabel: string): unknown[][] {
  if (isAoATable(value) && value.length > 0) {
    return value.map((row) => row.map((cell) => toExcelCellValue(cell)));
  }

  return aoaFromRowsForXlsx(fallbackRows, emptyLabel);
}

function appendXlsxSheet(params: {
  XLSX: any;
  workbook: any;
  usedNames: Set<string>;
  sheetName: string;
  rows: unknown[][];
}): string {
  const sheetName = ensureUniqueSheetName(params.sheetName, params.usedNames);
  const safeRows = params.rows.length > 0 ? params.rows : [['Žiadne dáta']];
  const worksheet = params.XLSX.utils.aoa_to_sheet(safeRows);

  const range = params.XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
  worksheet['!autofilter'] = { ref: params.XLSX.utils.encode_range(range) };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  worksheet['!cols'] = safeRows[0].map((_, columnIndex) => {
    const maxLength = Math.min(
      60,
      Math.max(
        12,
        ...safeRows.slice(0, 500).map((row) => String(row[columnIndex] ?? '').length),
      ),
    );
    return { wch: maxLength + 2 };
  });

  params.XLSX.utils.book_append_sheet(params.workbook, worksheet, sheetName);
  return sheetName;
}

async function createXlsxFallbackExportBlob(params: {
  exportPayload: any;
  tableSections: TableSection[];
  arrays: ReturnType<typeof getResultArrays>;
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
}): Promise<Blob> {
  const XLSX = await loadXlsxModule();

  if (!XLSX?.utils || !XLSX?.write) {
    return createPureAnalysisExportBlob(params);
  }

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: params.professionalInterpretation.title || 'Výsledky analýzy dát',
    Subject: 'ZEDPERA fallback Excel export',
    Author: 'ZEDPERA',
    CreatedDate: new Date(),
  };

  const usedNames = new Set<string>();
  const payload = params.exportPayload || {};
  const preparedDataset = payload.preparedDataset || params.arrays.preparedDataset || {};
  const chartData = normalizePayloadChartData(payload, params.arrays);
  const contingency = buildContingencyExport({ arrays: params.arrays, payload });

  const sheetRegistry: Array<{ sheetName: string; title: string; description: string; rowCount: number }> = [];

  const addSheet = (sheetName: string, title: string, description: string, rows: unknown[][]) => {
    const realName = appendXlsxSheet({ XLSX, workbook, usedNames, sheetName, rows });
    sheetRegistry.push({
      sheetName: realName,
      title,
      description,
      rowCount: Math.max(0, rows.length - 1),
    });
  };

  addSheet(
    '01 Súhrn',
    'Súhrn analýzy',
    'Základné informácie o exporte a spracovaní dát.',
    aoaFromRowsForXlsx(createIntroRows(payload, params.professionalInterpretation), 'Žiadne súhrnné údaje'),
  );

  addSheet(
    '02 raw-data',
    'Raw dáta',
    'Pripravený dátový súbor použitý na výpočty.',
    aoaFromPreparedSheetForXlsx(preparedDataset.rawDataSheet, params.arrays.preparedRawRows, 'Žiadne raw dáta'),
  );

  addSheet(
    '03 variable-map',
    'Mapa premenných',
    'Rozpoznané premenné, typy premenných a analytické roly.',
    aoaFromPreparedSheetForXlsx(preparedDataset.variableMapSheet, params.arrays.variables, 'Žiadna mapa premenných'),
  );

  addSheet(
    '04 data-quality',
    'Kvalita dát',
    'Kontrola kvality dát, počty riadkov, stĺpcov a upozornenia.',
    aoaFromPreparedSheetForXlsx(preparedDataset.dataQualitySheet, params.arrays.preparedDataQualityRows, 'Žiadne údaje o kvalite dát'),
  );

  const standardTables: Array<{ sheetName: string; title: string; description: string; rows: unknown[] }> = [
    { sheetName: '05 Premenné', title: 'Premenné', description: 'Kompletný zoznam rozpoznaných premenných.', rows: params.arrays.variables },
    { sheetName: '06 Frekvencie JASP', title: 'Frekvenčné tabuľky JASP', description: 'Početnosti, percentá, validné percentá a kumulatívne percentá.', rows: params.arrays.frequencyRows.length ? params.arrays.frequencyRows : params.arrays.frequencies },
    { sheetName: '07 Deskriptíva', title: 'Deskriptívna štatistika', description: 'Valid, Missing, Mean, Median, SD, Min, Max, Skewness a Kurtosis.', rows: params.arrays.scaleDescriptives.length ? params.arrays.scaleDescriptives : payload.descriptives || payload.descriptiveStatistics || [] },
    { sheetName: '08 Položky', title: 'Deskriptívna štatistika položiek', description: 'Deskriptívna štatistika jednotlivých položiek.', rows: params.arrays.itemDescriptives },
    { sheetName: '09 Škály podškály', title: 'Škály a podškály', description: 'Definícia škál, subškál, skórovania a použitých položiek.', rows: [...safeArray(preparedDataset.scaleDefinitions), ...safeArray(preparedDataset.subscaleDefinitions), ...safeArray(payload.scaleSubscaleDefinitions), ...safeArray(payload.scaleDefinitionsTable)] },
    { sheetName: '10 Skóre škál', title: 'Skóre škál', description: 'Vypočítané skóre škál a subškál pre respondentov.', rows: params.arrays.scaleScores },
    { sheetName: '11 Normalita', title: 'Normalita dát', description: 'Shapiro-Wilk a odporúčanie testov.', rows: params.arrays.normality },
    { sheetName: '12 Reliabilita', title: 'Reliabilita – Cronbach alfa', description: 'Cronbachova alfa, položky, validné riadky a interpretácia.', rows: params.arrays.reliability },
    { sheetName: '13 Pearson', title: 'Pearsonove korelácie', description: 'Parametrické korelácie medzi číselnými premennými.', rows: params.arrays.pearsonCorrelations },
    { sheetName: '14 Spearman', title: 'Spearmanove korelácie', description: 'Neparametrické korelácie medzi ordinálnymi/škálovými premennými.', rows: params.arrays.spearmanCorrelations },
    { sheetName: '15 Korelácie', title: 'Korelačná analýza – súhrn', description: 'Súhrnná tabuľka korelačných výsledkov.', rows: params.arrays.correlations },
    { sheetName: '16 Param testy', title: 'Parametrické testy', description: 't-testy a ANOVA.', rows: params.arrays.parametricGroupTests.length ? params.arrays.parametricGroupTests : payload.anovaTests || payload.tTests || [] },
    { sheetName: '17 Neparam testy', title: 'Neparametrické testy', description: 'Mann-Whitney U a Kruskal-Wallis.', rows: params.arrays.nonParametricGroupTests.length ? params.arrays.nonParametricGroupTests : payload.mannWhitneyTests || payload.kruskalWallisTests || [] },
    { sheetName: '18 Kontingencne tab', title: 'Kontingenčné tabuľky', description: 'Count, Row %, Column % a Total %.', rows: contingency.tables },
    { sheetName: '19 Chi-square', title: 'Chí-kvadrát testy', description: 'Súhrn chí-kvadrát testov ku kontingenčným tabuľkám.', rows: contingency.chiSquare },
    { sheetName: '20 Odpor testy', title: 'Odporúčané testy', description: 'Odporúčané štatistické testy podľa typu premenných.', rows: params.arrays.recommendedTests },
    { sheetName: '21 Odpor grafy', title: 'Odporúčané grafy', description: 'Odporúčané grafy pre praktickú časť práce.', rows: params.arrays.recommendedCharts },
  ];

  standardTables.forEach((table) => {
    addSheet(table.sheetName, table.title, table.description, aoaFromRowsForXlsx(table.rows, 'Žiadne dáta'));
  });

  const chartTables: Array<{ sheetName: string; title: string; description: string; rows: unknown[] }> = [
    { sheetName: '22 Graf frekvencie', title: 'Graf frekvencií – dátová tabuľka', description: 'Dátový podklad pre graf frekvencií.', rows: chartData.frequencyChartRows || [] },
    { sheetName: '23 Graf priemery', title: 'Graf priemerov – dátová tabuľka', description: 'Dátový podklad pre graf priemerov škál.', rows: chartData.scaleMeanChartRows || [] },
    { sheetName: '24 Graf reliabilita', title: 'Graf reliability – dátová tabuľka', description: 'Dátový podklad pre graf Cronbachovej alfy.', rows: chartData.reliabilityChartRows || [] },
    { sheetName: '25 Graf korelacie', title: 'Graf korelácií – dátová tabuľka', description: 'Dátový podklad pre graf sily korelácií.', rows: chartData.correlationChartRows || [] },
  ];

  chartTables.forEach((table) => {
    addSheet(table.sheetName, table.title, table.description, aoaFromRowsForXlsx(table.rows, 'Žiadne grafové dáta'));
  });

  safeArray<any>(payload.exportTables).forEach((table, index) => {
    addSheet(
      `${String(index + 26).padStart(2, '0')} ${table.sheetName || table.title || 'Tabuľka'}`,
      table.title || `Tabuľka ${index + 1}`,
      table.description || 'Doplnková exportovaná tabuľka.',
      aoaFromRowsForXlsx(table.rows || [], 'Žiadne dáta'),
    );
  });

  const navigationRows: unknown[][] = [
    ['ZEDPERA – profesionálny export výsledkov analýzy dát'],
    [params.professionalInterpretation.title || 'Výsledky analýzy dát'],
    [],
    ['Poradie', 'Hárok', 'Obsah', 'Počet riadkov', 'Preklik'],
    ...sheetRegistry.map((sheet, index) => [
      index + 1,
      sheet.sheetName,
      `${sheet.title} – ${sheet.description}`,
      sheet.rowCount,
      { t: 's', v: 'Otvoriť hárok', l: { Target: sheetLink(sheet.sheetName) } },
    ]),
  ];

  const navigationWorksheet = XLSX.utils.aoa_to_sheet(navigationRows);
  navigationWorksheet['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 90 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, navigationWorksheet, ensureUniqueSheetName('00 Úvod navigácia', usedNames));

  if (workbook.SheetNames?.length > 1) {
    const lastSheet = workbook.Sheets[workbook.SheetNames[workbook.SheetNames.length - 1]];
    const orderedSheets: any = {};
    const orderedNames = [workbook.SheetNames[workbook.SheetNames.length - 1], ...workbook.SheetNames.slice(0, -1)];

    orderedNames.forEach((name) => {
      orderedSheets[name] = workbook.Sheets[name];
    });

    workbook.SheetNames = orderedNames;
    workbook.Sheets = orderedSheets;
    void lastSheet;
  }

  const output = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
  });

  return createValidXlsxBlob(output);
}

async function createXlsxRawDataFallbackBlob(
  result: AnalysisResult | null,
  arrays: ReturnType<typeof getResultArrays>,
): Promise<Blob> {
  const XLSX = await loadXlsxModule();

  if (!XLSX?.utils || !XLSX?.write) {
    return createPureRawDataBlob(result, arrays);
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  const raw = (result || {}) as any;
  const preparedDataset = raw.preparedDataset || arrays.preparedDataset || {};

  appendXlsxSheet({
    XLSX,
    workbook,
    usedNames,
    sheetName: 'raw-data',
    rows: aoaFromPreparedSheetForXlsx(preparedDataset.rawDataSheet, arrays.preparedRawRows, 'Žiadne raw dáta'),
  });

  appendXlsxSheet({
    XLSX,
    workbook,
    usedNames,
    sheetName: 'variable-map',
    rows: aoaFromPreparedSheetForXlsx(preparedDataset.variableMapSheet, arrays.variables, 'Žiadna mapa premenných'),
  });

  appendXlsxSheet({
    XLSX,
    workbook,
    usedNames,
    sheetName: 'data-quality',
    rows: aoaFromPreparedSheetForXlsx(preparedDataset.dataQualitySheet, arrays.preparedDataQualityRows, 'Žiadne údaje o kvalite dát'),
  });

  appendXlsxSheet({
    XLSX,
    workbook,
    usedNames,
    sheetName: 'raw-data-rows',
    rows: aoaFromRowsForXlsx(arrays.preparedRawRows, 'Žiadne raw dáta'),
  });

  const output = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    compression: true,
  });

  return createValidXlsxBlob(output);
}

async function createClientExcelExportBlob(params: {
  exportPayload: any;
  tableSections: TableSection[];
  arrays: ReturnType<typeof getResultArrays>;
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
}): Promise<Blob> {
  const ExcelJS = await loadExcelJsModule();

  if (!ExcelJS) {
    return createXlsxFallbackExportBlob(params);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ZEDPERA';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = 'Profesionálny export štatistickej analýzy';
  workbook.title = params.professionalInterpretation.title || 'Výsledky analýzy dát';
  workbook.company = 'ZEDPERA';

  const usedNames = new Set<string>();
  const payload = params.exportPayload || {};
  const preparedDataset = payload.preparedDataset || params.arrays.preparedDataset || {};
  const chartData = normalizePayloadChartData(payload, params.arrays);
  const contingency = buildContingencyExport({ arrays: params.arrays, payload });

  const introSheet = createProfessionalIntroSheet({
    workbook,
    usedNames,
    title: 'ZEDPERA – profesionálny export výsledkov analýzy dát',
    description: 'Úvodný list obsahuje rozpis všetkých hárkov, ich obsah a preklik na konkrétny hárok.',
    exportPayload: payload,
    professionalInterpretation: params.professionalInterpretation,
  });

  let introIndex = 1;
  const addTable = (sheetName: string, title: string, description: string, rows: unknown[], tabColor?: string) => {
    const sheet = addProfessionalTableSheet({
      workbook,
      usedNames,
      sheetName,
      title,
      description,
      rows,
      introSheet,
      introIndex,
      tabColor,
    });
    if (sheet) introIndex += 1;
  };

  const addAoa = (sheetName: string, title: string, description: string, rows: unknown, tabColor?: string) => {
    const sheet = addAoAProfessionalSheet({
      workbook,
      usedNames,
      sheetName,
      title,
      description,
      rows,
      introSheet,
      introIndex,
      tabColor,
    });
    if (sheet) introIndex += 1;
  };

  addTable('01 Súhrn', 'Súhrn analýzy', 'Základné informácie o súbore, rozsahu dát, škálach, subškálach a exporte.', createIntroRows(payload, params.professionalInterpretation), EXCEL_THEME.navy);
  addAoa('02 raw-data', 'Raw dáta', 'Pripravený dátový súbor, z ktorého boli počítané všetky výsledky.', preparedDataset.rawDataSheet, EXCEL_THEME.blue);
  addAoa('03 variable-map', 'Mapa premenných', 'Rozpoznané premenné, typy premenných, roly, missing hodnoty a príklady.', preparedDataset.variableMapSheet, EXCEL_THEME.blue);
  addAoa('04 data-quality', 'Kvalita dát', 'Kontrola hárku, počet riadkov, premenných, škál, subškál a upozornenia.', preparedDataset.dataQualitySheet, EXCEL_THEME.blue);

  addTable('05 Premenné', 'Premenné', 'Kompletný zoznam rozpoznaných premenných.', params.arrays.variables, EXCEL_THEME.cyan);
  addTable('06 Frekvencie JASP', 'Frekvenčné tabuľky JASP', 'Početnosti, Percent, Valid Percent, Cumulative Percent, Missing a Total.', params.arrays.frequencyRows.length ? params.arrays.frequencyRows : params.arrays.frequencies, EXCEL_THEME.cyan);
  addTable('07 Deskriptíva', 'Deskriptívna štatistika', 'Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, minimum, maximum a sum.', params.arrays.scaleDescriptives.length ? params.arrays.scaleDescriptives : payload.descriptives || payload.descriptiveStatistics || [], EXCEL_THEME.green);
  addTable('08 Položky', 'Deskriptívna štatistika položiek', 'Kontrolná deskriptívna štatistika jednotlivých položiek.', params.arrays.itemDescriptives, EXCEL_THEME.green);
  addTable('09 Škály podškály', 'Škály a podškály', 'Definícia škál, subškál, spôsob skórovania a položky patriace do škál.', [...safeArray(preparedDataset.scaleDefinitions), ...safeArray(preparedDataset.subscaleDefinitions)], EXCEL_THEME.purple);
  addTable('10 Skóre škál', 'Skóre škál', 'Vypočítané skóre škál a subškál pre respondentov.', params.arrays.scaleScores, EXCEL_THEME.purple);
  addTable('11 Normalita', 'Normalita dát', 'Shapiro-Wilk a odporúčanie parametrických/neparametrických testov.', params.arrays.normality, EXCEL_THEME.amber);
  addTable('12 Reliabilita', 'Reliabilita – Cronbach alfa', 'Cronbachova alfa, počet položiek, validné riadky a interpretácia reliability.', params.arrays.reliability, EXCEL_THEME.green);
  addTable('13 Pearson', 'Pearsonove korelácie', 'Parametrické korelácie medzi škálami, subškálami alebo číselnými premennými.', params.arrays.pearsonCorrelations, EXCEL_THEME.cyan);
  addTable('14 Spearman', 'Spearmanove korelácie', 'Neparametrické korelácie medzi škálami, subškálami alebo ordinálnymi premennými.', params.arrays.spearmanCorrelations, EXCEL_THEME.cyan);
  addTable('15 Korelácie', 'Korelačná analýza – súhrn', 'Súhrnná tabuľka korelačných výsledkov.', params.arrays.correlations, EXCEL_THEME.cyan);
  addTable('16 Param testy', 'Parametrické testy', 't-testy a ANOVA podľa dostupných skupinových premenných.', params.arrays.parametricGroupTests.length ? params.arrays.parametricGroupTests : payload.anovaTests || payload.tTests || [], EXCEL_THEME.amber);
  addTable('17 Neparam testy', 'Neparametrické testy', 'Mann-Whitney U a Kruskal-Wallis podľa dostupných skupín.', params.arrays.nonParametricGroupTests.length ? params.arrays.nonParametricGroupTests : payload.mannWhitneyTests || payload.kruskalWallisTests || [], EXCEL_THEME.amber);
  addTable('18 Kontingencne tab', 'Kontingenčné tabuľky', 'Farebné kontingenčné tabuľky: Count, Row %, Column %, Total %.', contingency.tables, EXCEL_THEME.purple);
  addTable('19 Chi-square', 'Chí-kvadrát testy', 'Súhrn chí-kvadrát testov pre kontingenčné tabuľky.', contingency.chiSquare, EXCEL_THEME.purple);
  addTable('20 Odpor testy', 'Odporúčané testy', 'Odporúčané štatistické testy podľa typu premenných a normality.', params.arrays.recommendedTests, EXCEL_THEME.green);
  addTable('21 Odpor grafy', 'Odporúčané grafy', 'Odporúčané grafy pre praktickú časť práce.', params.arrays.recommendedCharts, EXCEL_THEME.green);

  const frequencyChart = getTopRowsForChart(chartData.frequencyChartRows || [], ['Hodnota', 'value', 'category', 'Kategória'], ['Počet', 'frequency', 'count', 'Frequency']);
  await addChartSheet({ workbook, usedNames, introSheet, introIndex: introIndex++, sheetName: '22 Graf frekvencie', title: 'Graf frekvencií', description: 'Grafické zobrazenie najčastejších kategórií.', rows: frequencyChart.rows, labelKey: frequencyChart.labelKey, valueKey: frequencyChart.valueKey, chartType: 'bar' });

  const scaleChart = getTopRowsForChart(chartData.scaleMeanChartRows || [], ['Premenná', 'variable', 'name', 'scaleName'], ['M', 'mean', 'Mean', 'Priemer']);
  await addChartSheet({ workbook, usedNames, introSheet, introIndex: introIndex++, sheetName: '23 Graf priemery', title: 'Graf priemerov škál a subškál', description: 'Grafické porovnanie priemerov škál a subškál.', rows: scaleChart.rows, labelKey: scaleChart.labelKey, valueKey: scaleChart.valueKey, chartType: 'bar' });

  const reliabilityChart = getTopRowsForChart(chartData.reliabilityChartRows || [], ['Škála / subškála', 'scaleName', 'scale', 'variable'], ['Cronbach alfa', 'cronbachAlpha', 'alpha']);
  await addChartSheet({ workbook, usedNames, introSheet, introIndex: introIndex++, sheetName: '24 Graf reliabilita', title: 'Graf reliability', description: 'Grafické zobrazenie Cronbachovej alfy.', rows: reliabilityChart.rows, labelKey: reliabilityChart.labelKey, valueKey: reliabilityChart.valueKey, chartType: 'bar' });

  const correlationChart = getTopRowsForChart(chartData.correlationChartRows || [], ['variablePair', 'Premenná 1', 'Premenná'], ['absoluteCoefficient', 'Koeficient', 'coefficient', 'r', 'rho']);
  await addChartSheet({ workbook, usedNames, introSheet, introIndex: introIndex++, sheetName: '25 Graf korelacie', title: 'Graf sily korelácií', description: 'Grafické zobrazenie absolútnej sily korelačných vzťahov.', rows: correlationChart.rows, labelKey: correlationChart.labelKey, valueKey: correlationChart.valueKey, chartType: 'bar' });

  safeArray<any>(payload.exportTables).forEach((table, index) => {
    addTable(
      `${String(index + 26).padStart(2, '0')} ${table.sheetName || table.title || 'Tabuľka'}`,
      table.title || `Tabuľka ${index + 1}`,
      table.description || 'Doplnková exportovaná tabuľka.',
      table.rows || [],
      EXCEL_THEME.slate,
    );
  });

  if (workbook.worksheets.length <= 1) {
    addTable('Diagnostika', 'Diagnostika exportu', 'Neboli nájdené dáta na export.', [
      {
        Problém: 'Export nemá dáta.',
        Riešenie: 'Spusti novú analýzu a skontroluj, či API vracia preparedDataset, descriptives, frequencies, reliability a correlations.',
      },
    ], EXCEL_THEME.red);
  }

  workbook.views = [{ activeTab: 0, firstSheet: 0, visibility: 'visible' }];
  const output = await workbook.xlsx.writeBuffer();

  return createValidXlsxBlob(output);
}


async function createClientRawDataBlob(result: AnalysisResult | null, arrays: ReturnType<typeof getResultArrays>): Promise<Blob> {
  const raw = (result || {}) as any;
  if (raw.rawDataWorkbookBase64) {
    const byteCharacters = atob(String(raw.rawDataWorkbookBase64));
    const bytes = new Uint8Array(byteCharacters.length);

    for (let index = 0; index < byteCharacters.length; index += 1) {
      bytes[index] = byteCharacters.charCodeAt(index);
    }

    return createValidXlsxBlob(bytes);
  }

  const ExcelJS = await loadExcelJsModule();

  if (!ExcelJS) {
    return createXlsxRawDataFallbackBlob(result, arrays);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ZEDPERA';
  workbook.created = new Date();
  workbook.modified = new Date();

  const usedNames = new Set<string>();
  const preparedDataset = arrays.preparedDataset;
  const introSheet = createProfessionalIntroSheet({
    workbook,
    usedNames,
    title: 'ZEDPERA – raw-data export',
    description: 'Navigácia k pripraveným raw dátam, mape premenných a kontrole kvality dát.',
    exportPayload: { preparedDataset, title: 'Raw-data export' },
    professionalInterpretation: {
      title: 'Raw-data export',
      summary: '',
      practicalText: '',
      interpretation: '',
      warnings: [],
      sections: [],
      model: '',
      error: '',
    },
  });

  let introIndex = 1;
  const addAoa = (sheetName: string, title: string, description: string, rows: unknown) => {
    const sheet = addAoAProfessionalSheet({
      workbook,
      usedNames,
      sheetName,
      title,
      description,
      rows,
      introSheet,
      introIndex,
      tabColor: EXCEL_THEME.blue,
    });
    if (sheet) introIndex += 1;
  };

  addAoa('raw-data', 'Raw dáta', 'Pripravený dátový súbor použitý na výpočty.', preparedDataset.rawDataSheet);
  addAoa('variable-map', 'Mapa premenných', 'Prehľad premenných, typov a analytických rolí.', preparedDataset.variableMapSheet);
  addAoa('data-quality', 'Kvalita dát', 'Kontrola kvality dát a základné metadáta.', preparedDataset.dataQualitySheet);

  addProfessionalTableSheet({
    workbook,
    usedNames,
    sheetName: 'raw-data-rows',
    title: 'Raw dáta – riadky',
    description: 'Fallback export raw dát z pripravených riadkov.',
    rows: arrays.preparedRawRows,
    introSheet,
    introIndex,
    tabColor: EXCEL_THEME.cyan,
  });

  const output = await workbook.xlsx.writeBuffer();
  return createValidXlsxBlob(output);
}

function createClientDocumentBlob(params: {
  format: ExportFormat;
  result: AnalysisResult;
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
  tableSections: TableSection[];
}): Blob {
  const title = params.professionalInterpretation.title || 'Výsledky analýzy dát';
  const sections = params.professionalInterpretation.sections
    .map((section) => `
      <h2>${section.title}</h2>
      ${splitTextToParagraphs(section.text).map((paragraph) => `<p>${paragraph}</p>`).join('')}
    `)
    .join('');

  const tables = params.tableSections
    .slice(0, 12)
    .map((section) => {
      const rows = sanitizeExportRows(section.rows, 80);
      const columns = getColumns(rows);
      if (!rows.length || !columns.length) return '';

      return `
        <h2>${section.title}</h2>
        <p>${section.description}</p>
        <table>
          <thead><tr>${columns.map((column) => `<th>${getFieldLabel(column)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${columns.map((column) => `<td>${valueToText(row[column])}</td>`).join('')}</tr>`)
              .join('')}
          </tbody>
        </table>
      `;
    })
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; padding: 36px; line-height: 1.55; }
    h1 { font-size: 24px; margin-bottom: 18px; }
    h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    p { font-size: 13px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 11px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 7px; border: 1px solid #334155; }
    td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${sections}
  ${tables}
</body>
</html>`;

  return new Blob([html], {
    type: params.format === 'word' ? 'application/msword;charset=utf-8' : 'text/html;charset=utf-8',
  });
}


function sanitizeExportValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }

  if (typeof value === 'boolean') return value ? 'Áno' : 'Nie';

  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') return JSON.stringify(item);
        return String(item);
      })
      .filter(Boolean)
      .join(', ');
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => !isTechnicalIdColumn(key))
      .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
      .join('\n');
  }

  return String(value);
}

function sanitizeExportRows(rows: unknown[], limit?: number): DataRow[] {
  const normalized = normalizeRows(rows);
  const limited = typeof limit === 'number' ? normalized.slice(0, limit) : normalized;

  return limited.map((row) => {
    const output: DataRow = {};

    Object.entries(row).forEach(([key, value]) => {
      if (isTechnicalIdColumn(key) && normalizeColumnKey(key) !== 'id') return;

      const label = getFieldLabel(key) || key;
      output[label] = sanitizeExportValue(value);
    });

    return output;
  });
}

function rowsFromSection(section: TableSection): DataRow[] {
  const rows = safeArray(section.rows);

  if (!rows.length) return [];

  return sanitizeExportRows(rows);
}

function createNamedExportTable(
  sheetName: string,
  title: string,
  rows: unknown[],
  description = '',
): DataRow[] {
  const cleanedRows = sanitizeExportRows(rows);

  if (!cleanedRows.length) return [];

  return cleanedRows.map((row) => ({
    Sekcia: title,
    Popis: description,
    ...row,
  }));
}

function buildExportTablesFromVisibleSections(
  sections: TableSection[],
): Array<{
  title: string;
  description: string;
  sheetName: string;
  rows: DataRow[];
}> {
  return sections
    .map((section, index) => {
      const rows = rowsFromSection(section);

      return {
        title: section.title,
        description: section.description,
        sheetName: `${String(index + 1).padStart(2, '0')} ${section.title}`
          .replace(/[\\/?*\[\]:]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 31),
        rows,
      };
    })
    .filter((table) => table.rows.length > 0);
}

function buildChartExportData(arrays: ReturnType<typeof getResultArrays>): Record<string, DataRow[]> {
  const frequencyRows = normalizeRows(arrays.frequencyRows.length ? arrays.frequencyRows : arrays.frequencies);
  const scaleRows = normalizeRows(arrays.scaleDescriptives);
  const reliabilityRows = normalizeRows(arrays.reliability);
  const correlationRows = normalizeRows([
    ...arrays.correlations,
    ...arrays.pearsonCorrelations,
    ...arrays.spearmanCorrelations,
  ]);

  return {
    frequencyChartRows: sanitizeExportRows(
      frequencyRows
        .filter((row) => {
          const value = String(row.value ?? row.category ?? '').toLowerCase();
          return value !== 'missing' && value !== 'total';
        })
        .map((row) => ({
          variable: row.variable ?? row.name ?? row.tableTitle ?? '',
          value: row.value ?? row.category ?? '',
          frequency: row.frequency ?? row.count ?? row.Frequency ?? 0,
          percent: row.percent ?? row.percentage ?? row.Percent ?? '',
          validPercent: row.validPercent ?? row['Valid Percent'] ?? '',
        })),
    ),
    scaleMeanChartRows: sanitizeExportRows(
      scaleRows
        .filter((row) => toNumber(row.mean ?? row.M ?? row.average) !== null)
        .map((row) => ({
          variable: row.variable ?? row.name ?? row.scaleName ?? row.label ?? '',
          mean: row.mean ?? row.M ?? row.average,
          median: row.median ?? row.Md,
          standardDeviation:
            row.standardDeviation ?? row.stdDeviation ?? row.stdDev ?? row.SD ?? row.sd,
        })),
    ),
    reliabilityChartRows: sanitizeExportRows(
      reliabilityRows
        .filter((row) => toNumber(row.cronbachAlpha ?? row.alpha) !== null)
        .map((row) => ({
          scaleName: row.scaleName ?? row.scale ?? row.variable ?? row.name ?? row.label ?? '',
          cronbachAlpha: row.cronbachAlpha ?? row.alpha,
          itemCount: row.itemCount,
          validRows: row.validRows ?? row.validN ?? row.n,
        })),
    ),
    correlationChartRows: sanitizeExportRows(
      correlationRows
        .filter((row) => toNumber(row.coefficient ?? row.r ?? row.rho ?? row.pearsonR ?? row.spearmanRho) !== null)
        .map((row) => {
          const coefficient = toNumber(row.coefficient ?? row.r ?? row.rho ?? row.pearsonR ?? row.spearmanRho) ?? 0;

          return {
            variablePair: `${valueToText(row.variable1 ?? row.variableA ?? row.variableX)} × ${valueToText(
              row.variable2 ?? row.variableB ?? row.variableY,
            )}`,
            coefficient,
            absoluteCoefficient: Math.abs(coefficient),
            pValue: row.pValue ?? row.p,
            method: row.method ?? row.test ?? '',
          };
        }),
    ),
  };
}


function normalizePayloadChartData(payload: any, arrays: ReturnType<typeof getResultArrays>): Record<string, DataRow[]> {
  const source = payload?.chartData || payload?.chartsData || payload?.chartTables || null;

  if (!source || !isRecord(source)) {
    return buildChartExportData(arrays);
  }

  const fallback = buildChartExportData(arrays);

  return {
    frequencyChartRows: sanitizeExportRows(
      safeArray(source.frequencyChartRows || fallback.frequencyChartRows),
    ),
    scaleMeanChartRows: sanitizeExportRows(
      safeArray(source.scaleMeanChartRows || source.meanChartRows || fallback.scaleMeanChartRows),
    ),
    reliabilityChartRows: sanitizeExportRows(
      safeArray(source.reliabilityChartRows || fallback.reliabilityChartRows),
    ),
    correlationChartRows: sanitizeExportRows(
      safeArray(source.correlationChartRows || fallback.correlationChartRows),
    ),
  };
}

function buildCompleteExportPayload(params: {
  result: AnalysisResult;
  arrays: ReturnType<typeof getResultArrays>;
  tableSections: TableSection[];
  professionalInterpretation: ReturnType<typeof getProfessionalInterpretation>;
}) {
  const raw = params.result as any;
  const preparedDataset = params.arrays.preparedDataset;
  const visibleExportTables = buildExportTablesFromVisibleSections(params.tableSections);
  const chartData = normalizePayloadChartData(raw, params.arrays);

  const scaleDefinitionRows = sanitizeExportRows([
    ...safeArray(preparedDataset.scaleDefinitions),
    ...safeArray(preparedDataset.subscaleDefinitions),
    ...safeArray(raw.scaleSubscaleDefinitions),
    ...safeArray(raw.scaleDefinitionsTable),
  ]);

  const payload = {
    ...raw,

    ok: raw.ok ?? true,
    success: raw.success ?? true,
    title: raw.title || params.professionalInterpretation.title || 'Výsledky analýzy dát',
    summary: raw.summary || params.professionalInterpretation.summary,
    practicalText: raw.practicalText || params.professionalInterpretation.practicalText,
    interpretation: raw.interpretation || params.professionalInterpretation.interpretation,
    fullText:
      raw.fullText ||
      [
        params.professionalInterpretation.summary,
        params.professionalInterpretation.practicalText,
        params.professionalInterpretation.interpretation,
      ]
        .filter(Boolean)
        .join('\n\n'),

    preparedDataset: {
      ...preparedDataset,
      rows: safeArray(preparedDataset.rows),
      variables:
        safeArray(preparedDataset.variables).length > 0
          ? safeArray(preparedDataset.variables)
          : params.arrays.variables,
      rawDataSheet: isAoATable(preparedDataset.rawDataSheet)
        ? preparedDataset.rawDataSheet
        : [],
      variableMapSheet: isAoATable(preparedDataset.variableMapSheet)
        ? preparedDataset.variableMapSheet
        : [],
      dataQualitySheet: isAoATable(preparedDataset.dataQualitySheet)
        ? preparedDataset.dataQualitySheet
        : [],
      scaleDefinitions: safeArray(preparedDataset.scaleDefinitions),
      subscaleDefinitions: safeArray(preparedDataset.subscaleDefinitions),
      quality: isRecord(preparedDataset.quality) ? preparedDataset.quality : {},
    },

    variables: params.arrays.variables,
    detectedVariables: params.arrays.variables,
    columns: params.arrays.variables,

    frequencies: params.arrays.frequencyRows.length > 0 ? params.arrays.frequencyRows : params.arrays.frequencies,
    frequencyTables: params.arrays.frequencyRows.length > 0 ? params.arrays.frequencyRows : params.arrays.frequencies,

    descriptives:
      params.arrays.scaleDescriptives.length > 0
        ? params.arrays.scaleDescriptives
        : params.arrays.itemDescriptives,
    descriptiveStatistics:
      params.arrays.scaleDescriptives.length > 0
        ? params.arrays.scaleDescriptives
        : params.arrays.itemDescriptives,
    itemDescriptives: params.arrays.itemDescriptives,
    scaleDescriptives: params.arrays.scaleDescriptives,
    scaleScores: params.arrays.scaleScores,

    normality: params.arrays.normality,

    reliabilities: params.arrays.reliability,
    reliability: params.arrays.reliability,
    cronbachAlpha: params.arrays.reliability,

    correlations: params.arrays.correlations,
    correlationResults: params.arrays.correlations,
    pearsonCorrelations: params.arrays.pearsonCorrelations,
    spearmanCorrelations: params.arrays.spearmanCorrelations,
    recommendedCorrelations: params.arrays.recommendedCorrelations,

    statisticalTests: [
      ...params.arrays.statisticalTests,
      ...params.arrays.parametricGroupTests,
      ...params.arrays.nonParametricGroupTests,
      ...params.arrays.tTests,
      ...params.arrays.hypothesisTests,
    ],
    hypothesisTests: params.arrays.hypothesisTests,
    tTests: params.arrays.tTests,
    parametricGroupTests: params.arrays.parametricGroupTests,
    nonParametricGroupTests: params.arrays.nonParametricGroupTests,
    recommendedGroupTests: params.arrays.recommendedGroupTests,

    recommendedTests: params.arrays.recommendedTests,
    recommendedCharts: params.arrays.recommendedCharts,

    scaleDefinitions: scaleDefinitionRows,
    subscaleDefinitions: sanitizeExportRows(safeArray(preparedDataset.subscaleDefinitions)),
    scaleSubscaleDefinitions: scaleDefinitionRows,

    chartData,
    frequencyChartRows: chartData.frequencyChartRows,
    scaleMeanChartRows: chartData.scaleMeanChartRows,
    reliabilityChartRows: chartData.reliabilityChartRows,
    correlationChartRows: chartData.correlationChartRows,

    excelTables: visibleExportTables,
    tables: visibleExportTables,
    exportTables: visibleExportTables,

    warnings:
      params.professionalInterpretation.warnings.length > 0
        ? params.professionalInterpretation.warnings
        : params.arrays.warnings,

    meta: {
      ...(isRecord(params.arrays.meta) ? params.arrays.meta : {}),
      exportGeneratedAt: new Date().toISOString(),
      exportSource: 'AnalysisResultsModal',
      exportedTablesCount: visibleExportTables.length,
      exportedFrequencyRows: chartData.frequencyChartRows.length,
      exportedScaleRows: chartData.scaleMeanChartRows.length,
      exportedReliabilityRows: chartData.reliabilityChartRows.length,
      exportedCorrelationRows: chartData.correlationChartRows.length,
    },
  };

  return payload;
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">{value}</p>

      {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
    </div>
  );
}


type ChartPoint = {
  label: string;
  value: number;
  originalValue?: unknown;
  description?: string;
  group?: string;
  meta?: Record<string, unknown>;
};

type ProfessionalChartSection = {
  key: string;
  title: string;
  description: string;
  items: ChartPoint[];
  kind?: 'bar' | 'diverging' | 'pie' | 'gauge';
  valueSuffix?: string;
  limit?: number;
};

function getChartTone(index: number): string {
  const tones = [
    'from-blue-500 via-cyan-400 to-sky-300',
    'from-violet-500 via-fuchsia-400 to-pink-300',
    'from-emerald-500 via-teal-400 to-cyan-300',
    'from-amber-500 via-orange-400 to-yellow-300',
    'from-rose-500 via-pink-400 to-orange-300',
    'from-indigo-500 via-blue-400 to-cyan-300',
    'from-lime-500 via-emerald-400 to-teal-300',
    'from-purple-500 via-violet-400 to-indigo-300',
  ];

  return tones[index % tones.length];
}

function getChartSolidColor(index: number): string {
  const colors = [
    '#38bdf8',
    '#a78bfa',
    '#34d399',
    '#fbbf24',
    '#fb7185',
    '#60a5fa',
    '#a3e635',
    '#c084fc',
  ];

  return colors[index % colors.length];
}

function getChartDataSource(result: AnalysisResult | null): Record<string, unknown> {
  const raw = (result || {}) as any;
  const statistical = raw.statisticalAnalysis || raw.stats || raw.analysisStats || {};

  const chartData =
    raw.chartData ||
    statistical.chartData ||
    raw.chartsData ||
    raw.graphData ||
    {};

  return isRecord(chartData) ? chartData : {};
}

function normalizeChartPoint(item: unknown, index: number): ChartPoint | null {
  if (isRecord(item)) {
    const label = String(
      item.label ||
        item.name ||
        item.variable ||
        item.scaleName ||
        item.title ||
        item.group ||
        item.category ||
        `Položka ${index + 1}`,
    ).trim();

    const rawValue =
      item.value ??
      item.count ??
      item.mean ??
      item.average ??
      item.frequency ??
      item.percent ??
      item.percentage ??
      item.validPercent ??
      item.cronbachAlpha ??
      item.alpha ??
      item.r ??
      item.rho ??
      item.coefficient ??
      item.statistic ??
      0;

    const numericValue = toNumber(rawValue);

    if (!label || numericValue === null || !Number.isFinite(numericValue)) {
      return null;
    }

    return {
      label,
      value: numericValue,
      originalValue: rawValue,
      description: String(
        item.description ||
          item.interpretation ||
          item.recommendation ||
          item.note ||
          '',
      ).trim(),
      group: String(
        item.group ||
          item.category ||
          item.type ||
          item.method ||
          '',
      ).trim(),
      meta: item,
    };
  }

  const numericValue = toNumber(item);

  if (numericValue === null || !Number.isFinite(numericValue)) {
    return null;
  }

  return {
    label: `Položka ${index + 1}`,
    value: numericValue,
    originalValue: item,
  };
}

function normalizeChartDataRows(value: unknown): ChartPoint[] {
  return safeArray(value)
    .map((item, index) => normalizeChartPoint(item, index))
    .filter((item): item is ChartPoint => Boolean(item))
    .filter((item) => Number.isFinite(item.value));
}

function createChartSection(
  sections: ProfessionalChartSection[],
  params: ProfessionalChartSection,
) {
  const cleanItems = params.items.filter((item) => Number.isFinite(item.value));

  if (!cleanItems.length) return;

  sections.push({
    ...params,
    items: cleanItems,
  });
}

function createFallbackFrequencyChartSections(
  sections: ProfessionalChartSection[],
  arrays: ReturnType<typeof getResultArrays>,
) {
  arrays.frequencies.slice(0, 4).forEach((table, index) => {
    const rows = getFrequencyRows(table);
    const variable = isRecord(table)
      ? String(
          table.variable || table.name || table.title || `Premenná ${index + 1}`,
        )
      : `Premenná ${index + 1}`;

    if (!rows.length) return;

    const valueKey = rows.some((row) => row.frequency !== undefined)
      ? 'frequency'
      : rows.some((row) => row.count !== undefined)
        ? 'count'
        : 'valid';

    const chartItems = rows
      .map((row, rowIndex) =>
        normalizeChartPoint(
          {
            label: row.value ?? row.category ?? row.label ?? `Kategória ${rowIndex + 1}`,
            value: row[valueKey],
            description: variable,
            group: 'frekvencia',
          },
          rowIndex,
        ),
      )
      .filter((item): item is ChartPoint => Boolean(item))
      .filter((item) => item.value > 0);

    createChartSection(sections, {
      key: `fallback-frequency-${index}`,
      title: `Frekvencia – ${variable}`,
      description:
        'Profesionálny graf početností podľa kategórií. Vhodné pre demografické a kategorizované premenné.',
      items: chartItems,
      kind: 'bar',
      limit: 14,
    });
  });
}

function getProfessionalChartSections(
  result: AnalysisResult | null,
): ProfessionalChartSection[] {
  const arrays = getResultArrays(result);
  const chartData = getChartDataSource(result);
  const sections: ProfessionalChartSection[] = [];

  createChartSection(sections, {
    key: 'api-frequency-bars',
    title: 'Frekvenčné rozdelenie',
    description:
      'Početnosti a percentuálne rozdelenie kategorizovaných premenných z API výstupu.',
    items: normalizeChartDataRows(chartData.frequencyBars),
    kind: 'bar',
    limit: 18,
  });

  createChartSection(sections, {
    key: 'api-mean-bars',
    title: 'Priemery položiek',
    description:
      'Grafické porovnanie priemerných hodnôt jednotlivých dotazníkových položiek.',
    items: normalizeChartDataRows(chartData.meanBars),
    kind: 'bar',
    limit: 22,
  });

  createChartSection(sections, {
    key: 'api-scale-score-bars',
    title: 'Hlavné škály',
    description:
      'Porovnanie vypočítaných hlavných škál, napríklad WEMWBS a JSS.',
    items: normalizeChartDataRows(chartData.scaleScoreBars),
    kind: 'bar',
    limit: 16,
  });

  createChartSection(sections, {
    key: 'api-subscale-score-bars',
    title: 'Subškály',
    description:
      'Grafické porovnanie vypočítaných subškál a odvodených dimenzií.',
    items: normalizeChartDataRows(chartData.subscaleScoreBars),
    kind: 'bar',
    limit: 24,
  });

  createChartSection(sections, {
    key: 'api-reliability-bars',
    title: 'Reliabilita škál',
    description:
      'Cronbachovo alfa zobrazené ako graf vnútornej konzistencie škál.',
    items: normalizeChartDataRows(chartData.reliabilityBars),
    kind: 'gauge',
    limit: 16,
  });

  createChartSection(sections, {
    key: 'api-correlation-bars',
    title: 'Korelačné vzťahy',
    description:
      'Sila a smer korelácií medzi škálami, subškálami alebo vybranými premennými.',
    items: normalizeChartDataRows(chartData.correlationBars),
    kind: 'diverging',
    limit: 20,
  });

  createChartSection(sections, {
    key: 'api-normality-bars',
    title: 'Normalita dát',
    description:
      'Grafické zobrazenie výsledkov kontroly normality premenných.',
    items: normalizeChartDataRows(chartData.normalityBars),
    kind: 'bar',
    limit: 20,
  });

  createChartSection(sections, {
    key: 'api-missing-value-bars',
    title: 'Chýbajúce hodnoty',
    description:
      'Prehľad chýbajúcich hodnôt v dátach podľa premenných.',
    items: normalizeChartDataRows(chartData.missingValueBars),
    kind: 'bar',
    limit: 20,
  });

  const scaleDescriptiveRows = normalizeRows(arrays.scaleDescriptives).filter(
    (row) => toNumber(row.mean ?? row.M ?? row.average) !== null,
  );

  if (scaleDescriptiveRows.length > 0) {
    createChartSection(sections, {
      key: 'fallback-scale-descriptive-means',
      title: 'Priemery škál a subškál',
      description:
        'Graf vytvorený z deskriptívnej štatistiky škál a subškál, ak API neposlalo samostatné chartData.',
      items: scaleDescriptiveRows
        .map((row, index) =>
          normalizeChartPoint(
            {
              label:
                row.variable ||
                row.name ||
                row.scaleName ||
                row.label ||
                `Škála ${index + 1}`,
              value: row.mean ?? row.M ?? row.average,
              description: row.interpretation || row.note,
              group: 'škála/subškála',
            },
            index,
          ),
        )
        .filter((item): item is ChartPoint => Boolean(item)),
      kind: 'bar',
      limit: 24,
    });
  }

  const itemDescriptiveRows = normalizeRows(arrays.itemDescriptives).filter(
    (row) => toNumber(row.mean ?? row.M ?? row.average) !== null,
  );

  if (scaleDescriptiveRows.length === 0 && itemDescriptiveRows.length > 0) {
    createChartSection(sections, {
      key: 'fallback-item-descriptive-means',
      title: 'Priemery položiek',
      description:
        'Graf vytvorený z deskriptívnej štatistiky položiek.',
      items: itemDescriptiveRows
        .map((row, index) =>
          normalizeChartPoint(
            {
              label:
                row.variable ||
                row.name ||
                row.label ||
                `Položka ${index + 1}`,
              value: row.mean ?? row.M ?? row.average,
              description: row.interpretation || row.note,
              group: 'položka',
            },
            index,
          ),
        )
        .filter((item): item is ChartPoint => Boolean(item)),
      kind: 'bar',
      limit: 24,
    });
  }

  const reliabilityRows = normalizeRows(arrays.reliability).filter(
    (row) => toNumber(row.cronbachAlpha ?? row.alpha) !== null,
  );

  if (reliabilityRows.length > 0) {
    createChartSection(sections, {
      key: 'fallback-cronbach-alpha',
      title: 'Cronbachovo alfa',
      description:
        'Grafické porovnanie reliability škál podľa hodnoty Cronbachovho alfa.',
      items: reliabilityRows
        .map((row, index) =>
          normalizeChartPoint(
            {
              label:
                row.scaleName ||
                row.scale ||
                row.variable ||
                row.name ||
                row.label ||
                `Škála ${index + 1}`,
              value: row.cronbachAlpha ?? row.alpha,
              description: row.interpretation,
              group: 'reliabilita',
            },
            index,
          ),
        )
        .filter((item): item is ChartPoint => Boolean(item)),
      kind: 'gauge',
      limit: 16,
    });
  }

  const correlationRows = normalizeRows([
    ...arrays.recommendedCorrelations,
    ...arrays.pearsonCorrelations,
    ...arrays.spearmanCorrelations,
    ...arrays.correlations,
  ]).filter((row) => {
    return (
      toNumber(
        row.coefficient ??
          row.r ??
          row.rho ??
          row.pearsonR ??
          row.spearmanRho,
      ) !== null
    );
  });

  if (correlationRows.length > 0) {
    createChartSection(sections, {
      key: 'fallback-correlations',
      title: 'Korelačné koeficienty',
      description:
        'Graf zobrazuje smer a silu korelačných vzťahov. Záporné hodnoty sú vyznačené opačným smerom.',
      items: correlationRows
        .map((row, index) =>
          normalizeChartPoint(
            {
              label: `${valueToText(
                row.variable1 ?? row.variableA ?? row.variableX,
              )} × ${valueToText(row.variable2 ?? row.variableB ?? row.variableY)}`,
              value:
                row.coefficient ??
                row.r ??
                row.rho ??
                row.pearsonR ??
                row.spearmanRho,
              description: row.interpretation || row.significance,
              group: row.method || row.test || 'korelácia',
            },
            index,
          ),
        )
        .filter((item): item is ChartPoint => Boolean(item)),
      kind: 'diverging',
      limit: 20,
    });
  }

  createFallbackFrequencyChartSections(sections, arrays);

  return sections;
}

function ProfessionalBarChart({
  section,
}: {
  section: ProfessionalChartSection;
}) {
  const cleanItems = section.items
    .filter((item) => Number.isFinite(item.value))
    .slice(0, section.limit ?? 20);

  if (!cleanItems.length) return null;

  const maxAbsValue = Math.max(
    ...cleanItems.map((item) => Math.abs(item.value)),
    1,
  );

  const total = cleanItems.reduce((sum, item) => sum + Math.abs(item.value), 0);
  const average = total / cleanItems.length;

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07111f] via-[#0b1020] to-[#050814] shadow-2xl shadow-black/30">
      <div className="border-b border-white/10 bg-white/[0.035] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              <BarChart3 className="h-3.5 w-3.5" />
              Profesionálny graf
            </div>

            <h3 className="text-xl font-black text-white">
              {section.title}
            </h3>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
              {section.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Položky
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {cleanItems.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Maximum
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {formatNumber(maxAbsValue)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Priemer
              </p>
              <p className="mt-1 text-xl font-black text-white">
                {formatNumber(average)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {cleanItems.map((item, index) => {
          const rawWidth =
            section.kind === 'gauge'
              ? Math.max(0, Math.min(1, item.value)) * 100
              : (Math.abs(item.value) / maxAbsValue) * 100;

          const width = Math.max(4, Math.min(100, rawWidth));
          const tone = getChartTone(index);
          const isNegative = item.value < 0;
          const percentageOfTotal =
            total > 0 ? (Math.abs(item.value) / total) * 100 : 0;

          return (
            <div
              key={`${section.key}-${item.label}-${index}`}
              className="rounded-3xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-300/25 hover:bg-black/35"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-white">
                      {index + 1}
                    </span>

                    <h4 className="truncate text-sm font-black text-white">
                      {item.label}
                    </h4>
                  </div>

                  {item.description ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                      {item.description}
                    </p>
                  ) : null}

                  {item.group ? (
                    <p className="mt-1 text-xs font-bold text-cyan-200">
                      {item.group}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1 text-sm font-black text-white">
                    {formatNumber(item.value)}
                    {section.valueSuffix || ''}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {formatNumber(percentageOfTotal)} % z grafu
                  </div>
                </div>
              </div>

              {section.kind === 'diverging' ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="h-5 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                    {isNegative ? (
                      <div
                        className="ml-auto h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300 shadow-lg shadow-rose-500/20"
                        style={{ width: `${width}%` }}
                      />
                    ) : null}
                  </div>

                  <div className="h-7 w-px bg-white/25" />

                  <div className="h-5 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                    {!isNegative ? (
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${tone} shadow-lg shadow-cyan-500/20`}
                        style={{ width: `${width}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="h-5 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tone} shadow-lg shadow-cyan-500/20`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProfessionalPieChart({
  section,
}: {
  section: ProfessionalChartSection;
}) {
  const cleanItems = section.items
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .slice(0, Math.min(section.limit ?? 8, 8));

  if (cleanItems.length < 2) return null;

  const total = cleanItems.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) return null;

  let offset = 0;

  const gradient = cleanItems
    .map((item, index) => {
      const start = offset;
      const share = (item.value / total) * 100;
      const end = start + share;

      offset = end;

      return `${getChartSolidColor(index)} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07111f] via-[#0b1020] to-[#050814] shadow-2xl shadow-black/30">
      <div className="border-b border-white/10 bg-white/[0.035] px-5 py-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
          <PieChart className="h-3.5 w-3.5" />
          Podielový graf
        </div>

        <h3 className="mt-3 text-xl font-black text-white">{section.title}</h3>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
          {section.description}
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[240px_1fr] lg:items-center">
        <div
          className="mx-auto h-56 w-56 rounded-full shadow-2xl shadow-black/40 ring-8 ring-white/5"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />

        <div className="space-y-3">
          {cleanItems.map((item, index) => {
            const share = (item.value / total) * 100;

            return (
              <div
                key={`${section.key}-pie-${item.label}-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full shadow"
                    style={{ backgroundColor: getChartSolidColor(index) }}
                  />
                  <span className="truncate text-sm font-bold text-slate-100">
                    {item.label}
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-white">
                    {formatNumber(item.value)}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    {formatNumber(share)} %
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


function scoreNumericChartColumn(column: string): number {
  const normalized = normalizeColumnKey(column);

  if (['mean', 'm', 'average', 'priemer'].includes(normalized)) return 100;
  if (['cronbachalpha', 'alpha', 'alfa'].includes(normalized)) return 95;
  if (['coefficient', 'koeficient', 'r', 'rho', 'pearsonr', 'spearmanrho'].includes(normalized)) return 92;
  if (['count', 'frequency', 'pocet', 'frequencycount'].includes(normalized)) return 90;
  if (['percent', 'percentage', 'validpercent', 'validnepercento'].includes(normalized)) return 88;
  if (['statistic', 'statistika', 'shapirowilk', 't', 'f', 'u', 'h'].includes(normalized)) return 72;
  if (['valid', 'n', 'total', 'spolu'].includes(normalized)) return 55;
  if (normalized.includes('skore') || normalized.includes('score')) return 80;
  if (normalized.includes('priemer') || normalized.includes('mean')) return 80;
  if (normalized.includes('pocet') || normalized.includes('count')) return 75;
  if (normalized.includes('percent')) return 74;
  if (normalized.includes('alpha') || normalized.includes('alfa')) return 95;
  if (normalized.includes('coefficient') || normalized.includes('koeficient')) return 90;

  return 10;
}

function findBestNumericChartColumn(rows: DataRow[]): string | null {
  if (!rows.length) return null;

  const columns = getColumns(rows).filter((column) => {
    if (isTechnicalIdColumn(column) && normalizeColumnKey(column) !== 'id') return false;
    const normalized = normalizeColumnKey(column);
    return !['id', 'respondent', 'respondentid', 'poradie', 'index'].includes(normalized);
  });

  let bestColumn: string | null = null;
  let bestScore = -1;

  columns.forEach((column) => {
    const numericValues = rows
      .map((row) => toNumber(row[column]))
      .filter((value): value is number => value !== null && Number.isFinite(value));

    if (!numericValues.length) return;

    const numericRatio = numericValues.length / Math.max(rows.length, 1);
    const nonZeroCount = numericValues.filter((value) => value !== 0).length;
    const score = scoreNumericChartColumn(column) + numericRatio * 20 + Math.min(nonZeroCount, 10);

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  });

  return bestColumn;
}

function scoreLabelChartColumn(column: string): number {
  const normalized = normalizeColumnKey(column);

  if (['variable', 'premenna', 'name', 'nazov', 'label', 'scalename', 'scale', 'category', 'kategoria', 'value', 'hodnota'].includes(normalized)) {
    return 100;
  }

  if (normalized.includes('variable') || normalized.includes('premenna')) return 95;
  if (normalized.includes('scale') || normalized.includes('skala')) return 92;
  if (normalized.includes('category') || normalized.includes('kategoria')) return 90;
  if (normalized.includes('name') || normalized.includes('nazov') || normalized.includes('label')) return 88;
  if (normalized.includes('title') || normalized.includes('tabletitle')) return 50;

  return 10;
}

function findBestLabelChartColumn(rows: DataRow[], valueColumn: string): string | null {
  const columns = getColumns(rows).filter((column) => {
    if (column === valueColumn) return false;
    if (isTechnicalIdColumn(column) && normalizeColumnKey(column) !== 'id') return false;
    return true;
  });

  let bestColumn: string | null = null;
  let bestScore = -1;

  columns.forEach((column) => {
    const filledValues = rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined && valueToText(value) !== '—');

    if (!filledValues.length) return;

    const textValues = filledValues.filter((value) => toNumber(value) === null);
    const score = scoreLabelChartColumn(column) + (textValues.length / Math.max(filledValues.length, 1)) * 20;

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  });

  return bestColumn || columns[0] || null;
}

function inferChartKindFromSection(section: TableSection): ProfessionalChartSection['kind'] {
  const text = `${section.key} ${section.title} ${section.description}`.toLowerCase();

  if (text.includes('korel') || text.includes('correl') || text.includes('spearman') || text.includes('pearson')) {
    return 'diverging';
  }

  if (text.includes('reliabil') || text.includes('cronbach') || text.includes('alfa') || text.includes('alpha')) {
    return 'gauge';
  }

  return 'bar';
}

function createChartSectionFromTableSection(
  section: TableSection,
  sectionIndex: number,
): ProfessionalChartSection | null {
  const rows = normalizeRows(safeArray(section.rows));

  if (!rows.length) return null;

  const valueColumn = findBestNumericChartColumn(rows);
  if (!valueColumn) return null;

  const labelColumn = findBestLabelChartColumn(rows, valueColumn);

      const items: ChartPoint[] = rows
    .map((row, rowIndex): ChartPoint | null => {
      const numericValue = toNumber(row[valueColumn]);
      if (numericValue === null || !Number.isFinite(numericValue)) return null;

      const labelValue = labelColumn ? row[labelColumn] : null;
      const label = valueToText(labelValue);

      return {
        label:
          label && label !== '—'
            ? label.slice(0, 120)
            : `${section.title} ${rowIndex + 1}`,
        value: numericValue,
        originalValue: row[valueColumn],
        description: section.description,
        group: getFieldLabel(valueColumn),
        meta: row,
      };
    })
    .filter((item): item is ChartPoint => item !== null)
    .filter((item) => Number.isFinite(item.value));

  if (!items.length) return null;

  return {
    key: `table-fallback-chart-${section.key}-${sectionIndex}`,
    title: `Graf – ${section.title}`,
    description: `Automaticky vykreslený graf z tabuľky „${section.title}“. Hodnota: ${getFieldLabel(valueColumn)}.`,
    items,
    kind: inferChartKindFromSection(section),
    limit: section.key.toLowerCase().includes('frequency') || section.title.toLowerCase().includes('frekven') ? 16 : 24,
  };
}

function createChartSectionsFromTableSections(
  tableSections: TableSection[],
): ProfessionalChartSection[] {
  const preferredOrder = [
    'recommendedCharts',
    'scaleDescriptives',
    'jaspScaleDescriptives',
    'scaleScores',
    'reliability',
    'jaspReliability',
    'spearmanCorrelations',
    'pearsonCorrelations',
    'recommendedCorrelations',
    'correlations',
    'frequencies',
    'normality',
    'jaspNormality',
    'parametricGroupTests',
    'nonParametricGroupTests',
  ];

  const ordered = [...tableSections].sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.key);
    const bIndex = preferredOrder.indexOf(b.key);

    const safeA = aIndex === -1 ? 999 : aIndex;
    const safeB = bIndex === -1 ? 999 : bIndex;

    return safeA - safeB;
  });

  const usedTitles = new Set<string>();
  const sections: ProfessionalChartSection[] = [];

  ordered.forEach((section, index) => {
    const chartSection = createChartSectionFromTableSection(section, index);
    if (!chartSection) return;

    const normalizedTitle = normalizeColumnKey(chartSection.title);
    if (usedTitles.has(normalizedTitle)) return;

    usedTitles.add(normalizedTitle);
    sections.push(chartSection);
  });

  return sections.slice(0, 10);
}

function ChartGallery({
  result,
  tableSections = [],
}: {
  result: AnalysisResult | null;
  tableSections?: TableSection[];
}) {
  const resultChartSections = getProfessionalChartSections(result);
  const tableChartSections = createChartSectionsFromTableSections(tableSections);

  const chartSections = resultChartSections.length > 0
    ? [
        ...resultChartSections,
        ...tableChartSections.filter((section) =>
          !resultChartSections.some((existing) => normalizeColumnKey(existing.title) === normalizeColumnKey(section.title)),
        ),
      ].slice(0, 12)
    : tableChartSections;

  if (!chartSections.length) {
    return (
      <section className="rounded-[30px] border border-amber-300/20 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 text-amber-200" />

          <div>
            <h3 className="text-lg font-black text-amber-100">
              Grafické dáta zatiaľ nie sú dostupné
            </h3>

            <p className="mt-2 text-sm leading-6 text-amber-50/90">
              API musí vrátiť <strong>chartData</strong>, alebo aspoň tabuľkové
              dáta ako scaleDescriptives, reliability, correlations a frequencies.
              Po doplnení týchto polí sa grafy zobrazia automaticky.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-violet-300/20 bg-gradient-to-br from-violet-500/15 via-blue-500/10 to-cyan-500/10 p-5 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-100">
              <PieChart className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200/80">
                Profesionálne vizualizácie
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                Grafické výstupy analýzy dát
              </h3>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-violet-100/80">
                Grafy sú vytvorené z vypočítaných štatistických dát – frekvencie,
                priemery, škály, subškály, reliabilita, korelácie, normalita a
                chýbajúce hodnoty.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
            {chartSections.length} grafických sekcií
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {chartSections.map((section) => (
          <div key={section.key} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <ProfessionalBarChart section={section} />
            {section.kind !== 'diverging' ? (
              <ProfessionalPieChart section={section} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function TablePreview({
  section,
  onOpen,
}: {
  section: TableSection;
  onOpen: (section: TableSection) => void;
}) {
  const rows = normalizeRows(safeArray(section.rows));
  const columns = getColumns(rows);
  const previewRows = rows.slice(0, 8);

  if (!rows.length || !columns.length) return null;

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1020] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
            {section.icon || <Table2 className="h-5 w-5" />}
          </div>

          <div>
            <h3 className="text-base font-black text-white">{section.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {section.description}
            </p>
            <p className="mt-2 text-xs font-bold text-blue-200">
              {rows.length} riadkov · {columns.length} stĺpcov
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(section)}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10"
        >
          <Maximize2 className="h-4 w-4" />
          Otvoriť tabuľku
        </button>
      </div>

      <div className="analysis-table-scroll max-h-[430px] overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#111827] text-xs uppercase tracking-[0.14em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-white/10 px-4 py-3 font-black"
                >
                  {getFieldLabel(column)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {previewRows.map((row, rowIndex) => (
              <tr
                key={`${section.key}-preview-${rowIndex}`}
                className="border-b border-white/5 hover:bg-white/[0.035]"
              >
                {columns.map((column) => (
                  <td
                    key={`${section.key}-${rowIndex}-${column}`}
                    className="max-w-[360px] whitespace-pre-wrap break-words px-4 py-3 align-top leading-6 text-slate-200"
                  >
                    {valueToText(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > previewRows.length ? (
        <div className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">
          Zobrazený je náhľad prvých {previewRows.length} riadkov. Celú tabuľku otvoríš tlačidlom vyššie.
        </div>
      ) : null}
    </section>
  );
}

function FullTableDialog({
  section,
  onClose,
}: {
  section: TableSection | null;
  onClose: () => void;
}) {
  if (!section) return null;

  const rows = normalizeRows(safeArray(section.rows));
  const columns = getColumns(rows);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 p-2 text-white backdrop-blur-md sm:p-5">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť tabuľku"
      />

      <div className="relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-[1500px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#050814] shadow-2xl sm:h-[calc(100dvh-2.5rem)]">
        <div className="shrink-0 border-b border-white/10 bg-[#0b1020] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                Detail tabuľky
              </p>
              <h3 className="mt-1 text-xl font-black text-white">
                {section.title}
              </h3>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">
                {section.description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
              aria-label="Zavrieť tabuľku"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="analysis-table-scroll flex-1 overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#111827] text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="border-b border-white/10 px-4 py-3 font-black"
                  >
                    {getFieldLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${section.key}-${rowIndex}`}
                  className="border-b border-white/5 hover:bg-white/[0.035]"
                >
                  {columns.map((column) => (
                    <td
                      key={`${section.key}-${rowIndex}-${column}`}
                      className="max-w-[460px] whitespace-pre-wrap break-words border-b border-white/10 px-4 py-3 align-top leading-6 text-slate-200"
                    >
                      {valueToText(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              Tabuľka neobsahuje žiadne riadky.
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/20 bg-black px-5 py-2.5 text-sm font-black text-white transition hover:bg-zinc-900"
          >
            Zavrieť tabuľku
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResultsModal({
  open,
  result,
  onClose,
  preparedDataFile: preparedDataFileFromProps = null,
  onExportExcel,
}: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableSection | null>(null);

  const arrays = useMemo(() => getResultArrays(result), [result]);
  const summaryLines = useMemo(() => getSummaryLines(result), [result]);
  const tableSections = useMemo(() => createTableSections(result), [result]);
  const preparedDataFile = useMemo(
    () => preparedDataFileFromProps || getPreparedDataFileFromResult(result),
    [preparedDataFileFromProps, result],
  );

  const overviewRef = useRef<HTMLDivElement | null>(null);
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const tablesRef = useRef<HTMLDivElement | null>(null);
  const interpretationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (selectedTable) {
          setSelectedTable(null);
          return;
        }

        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, selectedTable]);

  async function exportProfessionalExcelFromModal() {
    if (!result) return false;

    if (onExportExcel) {
      await onExportExcel();
      return true;
    }

    const response = await fetch('/api/analyze-data/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        result,
        analysisResult: result,
        preparedDataFile,
        exportFormat: 'excel',
        format: 'excel',
        type: 'excel',
        fileName: 'ZEDPERA_profesionalny_export_analyzy_dat',
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const errorText = contentType.includes('application/json')
        ? JSON.stringify(await response.json())
        : await response.text();

      throw new Error(errorText || 'Profesionálny Excel export zlyhal.');
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('Profesionálny Excel export je prázdny.');
    }

    downloadBlob(blob, 'ZEDPERA_profesionalny_export_analyzy_dat.xlsx');

    return true;
  }

  async function exportResult(format: ExportFormat) {
    if (!result) return;

    try {
      setExporting(format);

      const professionalInterpretation = getProfessionalInterpretation(result);
      const exportPayload = buildCompleteExportPayload({
        result,
        arrays,
        tableSections,
        professionalInterpretation,
      });

      if (format === 'xls') {
        try {
          const exportedByServer = await exportProfessionalExcelFromModal();

          if (exportedByServer) {
            return;
          }
        } catch (serverExportError) {
          console.warn(
            'ANALYSIS_MODAL_SERVER_EXCEL_EXPORT_FALLBACK:',
            serverExportError,
          );
        }

        const blob = await createClientExcelExportBlob({
          exportPayload,
          arrays,
          tableSections,
          professionalInterpretation,
        });

        await assertValidXlsxBlob(blob, 'Excel fallback export');
        downloadBlob(blob, getFileName(format));
        return;
      }

      if (format === 'raw') {
        const blob = await createClientRawDataBlob(result, arrays);
        await assertValidXlsxBlob(blob, 'Raw-data export');
        downloadBlob(blob, getFileName(format));
        return;
      }

      const normalizedFormat: 'word' | 'pdf' = format;

      const response = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export',
          mode: 'export',
          format: normalizedFormat,
          type: normalizedFormat,
          title:
            (result as any).title ||
            professionalInterpretation.title ||
            'Výsledky analýzy dát',
          exportMode: 'jasp-professional-complete',
          fileName: getFileName(format),
          result: exportPayload,
          analysis: exportPayload,
          payload: exportPayload,
          preparedDataset: exportPayload.preparedDataset,
          frequencies: exportPayload.frequencies,
          descriptives: exportPayload.descriptives,
          descriptiveStatistics: exportPayload.descriptiveStatistics,
          scaleScores: exportPayload.scaleScores,
          scaleDescriptives: exportPayload.scaleDescriptives,
          reliability: exportPayload.reliability,
          reliabilities: exportPayload.reliabilities,
          correlations: exportPayload.correlations,
          pearsonCorrelations: exportPayload.pearsonCorrelations,
          spearmanCorrelations: exportPayload.spearmanCorrelations,
          statisticalTests: exportPayload.statisticalTests,
          parametricGroupTests: exportPayload.parametricGroupTests,
          nonParametricGroupTests: exportPayload.nonParametricGroupTests,
          recommendedTests: exportPayload.recommendedTests,
          recommendedCharts: exportPayload.recommendedCharts,
          chartData: exportPayload.chartData,
          tables: exportPayload.tables,
          excelTables: exportPayload.excelTables,
          exportTables: exportPayload.exportTables,
          warnings: exportPayload.warnings,
        }),
      });

      if (!response.ok) {
        const fallbackBlob = createClientDocumentBlob({
          format,
          result,
          professionalInterpretation,
          tableSections,
        });

        downloadBlob(fallbackBlob, getFileName(format));
        return;
      }

      const blob = await response.blob();

      downloadBlob(blob, getFileName(format));
    } catch (error) {
      console.error('ANALYSIS_MODAL_EXPORT_ERROR:', error);

      try {
        const professionalInterpretation = getProfessionalInterpretation(result);

        if (format === 'xls') {
          const exportPayload = buildCompleteExportPayload({
            result,
            arrays,
            tableSections,
            professionalInterpretation,
          });
          const fallbackBlob = await createClientExcelExportBlob({
            exportPayload,
            arrays,
            tableSections,
            professionalInterpretation,
          });
          await assertValidXlsxBlob(fallbackBlob, 'Excel fallback export');
          downloadBlob(fallbackBlob, getFileName(format));
          return;
        }

        if (format === 'raw') {
          const fallbackBlob = await createClientRawDataBlob(result, arrays);
          await assertValidXlsxBlob(fallbackBlob, 'Raw-data fallback export');
          downloadBlob(fallbackBlob, getFileName(format));
          return;
        }

        const fallbackBlob = createClientDocumentBlob({
          format,
          result,
          professionalInterpretation,
          tableSections,
        });
        downloadBlob(fallbackBlob, getFileName(format));
      } catch (fallbackError) {
        console.error('ANALYSIS_MODAL_CLIENT_EXPORT_FALLBACK_ERROR:', fallbackError);
        alert(
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Export výsledkov analýzy sa nepodarilo vytvoriť.',
        );
      }
    } finally {
      setExporting(null);
    }
  }

  if (!open || !result) return null;

  const claudeAgent = arrays.claudeAgent;
  const professionalInterpretation = getProfessionalInterpretation(result);
  const showClaudeSection = Boolean(claudeAgent.error.trim());

  const meta = arrays.meta as any;
  const preparedDataset = arrays.preparedDataset;

  const respondentCount =
    Number(
      meta?.respondentCount ||
        (result as any).respondentCount ||
        meta?.n ||
        meta?.totalRows ||
        meta?.rowCount ||
        getFallbackRespondentCount(result, arrays.files),
    ) || 0;

  const rawRowsCount =
    arrays.preparedRawRows.length ||
    (isAoATable(preparedDataset.rawDataSheet)
      ? Math.max(preparedDataset.rawDataSheet.length - 1, 0)
      : 0);

  const variableCount =
    arrays.variables.length ||
    safeArray(preparedDataset.headers).length ||
    safeArray(preparedDataset.originalHeaders).length ||
    0;

  const idColumn = String(meta?.idColumn || (result as any).idColumn || '').trim();

  const frequencyCount = arrays.frequencies.length || arrays.frequencyRows.length;
  const itemDescriptiveCount = arrays.itemDescriptives.length;
  const scaleCount = getTotalScaleCount(arrays);
  const scaleDescriptiveCount = arrays.scaleDescriptives.length;
  const normalityCount = arrays.normality.length;
  const correlationCount = getTotalCorrelationCount(arrays);
  const reliabilityCount = arrays.reliability.length;
  const testsCount = getTotalTestsCount(arrays);

  const scrollTo = (target: HTMLDivElement | null) => {
    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div
      data-analysis-modal="true"
      className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden bg-black/90 p-2 text-white backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Výsledky analýzy dát"
    >
      <style jsx global>{`
        .analysis-modal-scroll {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }

        .analysis-table-scroll {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x pan-y;
          overscroll-behavior: contain;
          scrollbar-width: thin;
        }

        .analysis-table-scroll table {
          border-collapse: collapse;
        }

        @media (max-width: 767px) {
          [data-analysis-modal='true'] {
            padding: 0.5rem !important;
          }
        }
      `}</style>

      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť modálne okno"
      />

      <div
        data-analysis-results="true"
        className="relative z-10 mx-auto my-2 flex h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#050814] text-white shadow-2xl shadow-black/70 transition-colors duration-300 sm:my-4 sm:h-[calc(100dvh-2rem)]"
      >
        <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-950 via-[#0b1020] to-slate-950 px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">
                  Univerzálna analýza dát
                </p>

                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  {(result as any).title || 'Výsledky analýzy dát'}
                </h2>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  Výstup ide v správnom poradí: nahratý súbor → príprava raw-data.xlsx →
                  mapa premenných → škály/subškály → reliabilita → korelácie →
                  t-test, ANOVA, Mann-Whitney a Kruskal-Wallis. ID stĺpec sa nepoužíva
                  ako analytická premenná.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportResult('raw')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100 shadow-sm transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'raw' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Raw dáta
              </button>

              <button
                type="button"
                onClick={() => exportResult('xls')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm font-black text-slate-100 shadow-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'xls' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Profesionálny Excel
              </button>

              <button
                type="button"
                onClick={() => exportResult('word')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm font-black text-slate-100 shadow-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'word' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Word
              </button>

              <button
                type="button"
                onClick={() => exportResult('pdf')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm font-black text-slate-100 shadow-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
                aria-label="Zavrieť výsledky"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => scrollTo(overviewRef.current)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10"
            >
              Prehľad
            </button>
            <button
              type="button"
              onClick={() => scrollTo(chartsRef.current)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10"
            >
              Grafy
            </button>
            <button
              type="button"
              onClick={() => scrollTo(tablesRef.current)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10"
            >
              Tabuľky
            </button>
            <button
              type="button"
              onClick={() => scrollTo(interpretationRef.current)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10"
            >
              Interpretácia
            </button>
          </div>
        </div>

        <div className="analysis-modal-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-7">
          <div ref={overviewRef} className="space-y-5">
            {arrays.warnings.length > 0 ? (
              <section className="rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-5">
                <h3 className="flex items-center gap-2 text-lg font-black text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  Upozornenia
                </h3>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/90">
                  {arrays.warnings.map((warning, index) => (
                    <li
                      key={`warning-${index}`}
                      className="rounded-2xl bg-black/10 px-4 py-3"
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showClaudeSection ? (
              <section className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-5">
                <h3 className="flex items-center gap-2 text-lg font-black text-red-100">
                  <AlertTriangle className="h-5 w-5" />
                  AI interpretácia
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-50/90">
                  {claudeAgent.error}
                </p>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="flex items-center gap-2 text-lg font-black text-white">
                <Sparkles className="h-5 w-5 text-blue-300" />
                Súhrn spracovania
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Respondenti"
                  value={respondentCount || rawRowsCount || '—'}
                  note={idColumn ? `ID: ${idColumn}` : 'Po očistení dát'}
                />
                <StatCard
                  label="Raw dáta"
                  value={rawRowsCount || '—'}
                  note="riadky v raw-data.xlsx"
                />
                <StatCard
                  label="Premenné"
                  value={variableCount || '—'}
                  note="po mapovaní stĺpcov"
                />
                <StatCard
                  label="Tabuľky"
                  value={tableSections.length}
                  note="dostupné sekcie výsledkov"
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Frekvencie" value={frequencyCount} />
                <StatCard
                  label="Deskriptíva"
                  value={scaleDescriptiveCount || itemDescriptiveCount}
                />
                <StatCard
                  label="Škály/subškály"
                  value={scaleCount}
                />
                <StatCard
                  label="Normalita"
                  value={normalityCount}
                />
                <StatCard
                  label="Reliabilita"
                  value={reliabilityCount}
                />
                <StatCard
                  label="Korelácie"
                  value={correlationCount}
                />
                <StatCard
                  label="Testovanie"
                  value={testsCount}
                />
                <StatCard
                  label="Export"
                  value="Excel"
                  note="raw-data + štatistiky"
                />
              </div>

              {summaryLines.length > 0 ? (
                <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {summaryLines.map((line, index) => (
                    <p key={`summary-${index}`}>{line}</p>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <div ref={chartsRef} className="mt-6 space-y-5">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-violet-300" />
              <h3 className="text-lg font-black text-white">Grafické náhľady</h3>
            </div>

            <ChartGallery result={result} tableSections={tableSections} />
          </div>

          <div ref={tablesRef} className="mt-6 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-white">
                  <Table2 className="h-5 w-5 text-blue-300" />
                  Tabuľkové výsledky
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Tabuľky sú zoradené tak, aby bolo najprv vidno prípravu raw dát a až potom samotné štatistiky.
                </p>
              </div>
            </div>

            {tableSections.length > 0 ? (
              <div className="space-y-5">
                {tableSections.map((section) => (
                  <TablePreview
                    key={section.key}
                    section={section}
                    onOpen={setSelectedTable}
                  />
                ))}
              </div>
            ) : (
              <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
                <h3 className="text-lg font-black text-white">Tabuľky</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Nie sú dostupné žiadne tabuľkové výsledky. Skontroluj, či API vracia preparedDataset, descriptives, frequencies, reliabilities, correlations a statisticalTests.
                </p>
              </section>
            )}
          </div>

          <div ref={interpretationRef} className="mt-6 space-y-5 pb-6">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                  <Brain className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200/80">
                    Interpretácia
                  </p>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {professionalInterpretation.title}
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {professionalInterpretation.sections.map((section) => (
                  <ProfessionalTextBlock
                    key={section.key}
                    title={section.title}
                    text={section.text}
                  />
                ))}
              </div>

              {professionalInterpretation.warnings.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <h4 className="text-sm font-black text-amber-100">
                    Poznámky k interpretácii
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-50/90">
                    {professionalInterpretation.warnings.map((warning, index) => (
                      <li key={`interpretation-warning-${index}`}>
                        <ChevronRight className="mr-1 inline h-4 w-4" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      <FullTableDialog
        section={selectedTable}
        onClose={() => setSelectedTable(null)}
      />
    </div>
  );
}
