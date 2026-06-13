'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronRight,
  FileDown,
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

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

type ExportFormat = 'word' | 'xls' | 'pdf';

type DataRow = Record<string, unknown>;

type TableSection = {
  key: string;
  title: string;
  description: string;
  rows: unknown[];
  icon?: ReactNode;
};

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  scaleId: 'ID škály',
  scaleName: 'Škála / subškála',
  name: 'Premenná',
  variable: 'Premenná',
  label: 'Názov',
  title: 'Názov',
  type: 'Typ',
  chartType: 'Typ grafu',
  variableType: 'Typ premennej',
  measurementLevel: 'Úroveň merania',
  valid: 'N platných',
  validRows: 'N platných riadkov',
  validValues: 'N platných',
  n: 'N',
  nTotal: 'N spolu',
  respondentCount: 'Počet respondentov',
  count: 'Počet',
  frequency: 'Počet',
  missing: 'Chýbajúce',
  missingRows: 'Chýbajúce riadky',
  missingValues: 'Chýbajúce',
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
  SD: 'SD',
  sd: 'SD',
  variance: 'Variancia',
  minimum: 'Min',
  min: 'Min',
  maximum: 'Max',
  max: 'Max',
  q1: 'Q1',
  q3: 'Q3',
  iqr: 'IQR',
  sum: 'Súčet',
  scoring: 'Výpočet',
  itemsUsed: 'Použité položky',
  items: 'Položky',
  skewness: 'Šikmosť',
  standardErrorSkewness: 'SE šikmosti',
  kurtosis: 'Špicatosť',
  standardErrorKurtosis: 'SE špicatosti',
  distinctValues: 'Počet hodnôt',
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
  coefficient: 'Koeficient',
  r: 'r',
  rho: 'ρ',
  pValue: 'p',
  p: 'p',
  df: 'df',
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
  meanDifference: 'Rozdiel priemerov',
  isNormal: 'Normalita',
  recommendation: 'Odporúčanie',
  note: 'Poznámka',
  cronbachAlpha: 'Cronbach alfa',
  alpha: 'Alfa',
  sheetName: 'Hárok',
  headers: 'Hlavičky',
  rows: 'Riadky',
  data: 'Dáta',
  fileName: 'Súbor',
  extension: 'Prípona',
  size: 'Veľkosť',
  warnings: 'Upozornenia',
  shapiroWilk: 'Shapiro-Wilk',
  pValueOfShapiroWilk: 'P-value Shapiro-Wilk',
  pValueShapiroWilk: 'P-value Shapiro-Wilk',
  shapiroWilkPValue: 'P-value Shapiro-Wilk',
  effectSize: 'Effect size',
  tableTitle: 'Tabuľka',
  sectionTitle: 'Sekcia',
  jaspSection: 'JASP sekcia',
  separator: '',
};

const COLUMN_PRIORITY = [
  'jaspSection',
  'sectionTitle',
  'tableTitle',
  'scaleName',
  'variable',
  'name',
  'label',
  'title',
  'type',
  'variableType',
  'measurementLevel',
  'ignored',
  'ignoredReason',
  'valid',
  'validRows',
  'validValues',
  'n',
  'nTotal',
  'missing',
  'missingRows',
  'missingValues',
  'total',
  'mean',
  'M',
  'median',
  'Md',
  'mode',
  'stdDeviation',
  'standardDeviation',
  'SD',
  'variance',
  'minimum',
  'min',
  'maximum',
  'max',
  'q1',
  'q3',
  'iqr',
  'sum',
  'scoring',
  'itemsUsed',
  'items',
  'skewness',
  'standardErrorSkewness',
  'kurtosis',
  'standardErrorKurtosis',
  'shapiroWilk',
  'pValueOfShapiroWilk',
  'pValueShapiroWilk',
  'shapiroWilkPValue',
  'distinctValues',
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
  'pValue',
  'p',
  'isNormal',
  'recommendation',
  'note',
  'cronbachAlpha',
  'interpretation',
  'test',
  'testType',
  'hypothesis',
  'variables',
  'variableA',
  'variableB',
  'variable1',
  'variable2',
  'coefficient',
  'r',
  'rho',
  'df',
  'significance',
  'fisherZ',
  'standardError',
  'strength',
  'direction',
  'dependentVariable',
  'independentVariable',
  'groupVariable',
  'groups',
  'group1',
  'group2',
  'mean1',
  'mean2',
  'sd1',
  'sd2',
  'n1',
  'n2',
  't',
  'reason',
  'description',
];

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
    'iD',
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

  return value.toLocaleString('sk-SK', {
    maximumFractionDigits: 3,
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

function normalizeRows(rows: unknown[]): DataRow[] {
  return rows.map((row, index) => {
    if (isRecord(row)) {
      const cleaned: DataRow = {};
      const usedLabels = new Set<string>();

      Object.entries(row).forEach(([key, value]) => {
        if (isTechnicalIdColumn(key)) return;

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

function getColumns(rows: DataRow[]): string[] {
  const allColumns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    .filter((column) => !isTechnicalIdColumn(column))
    .filter((column) => {
      const label = normalizeColumnLabel(column);

      return ![
        'id',
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

function getSummaryLines(result: AnalysisResult | null): string[] {
  const raw = (result || {}) as any;

  const summary = String(raw.summary || '').trim();

  const aiRecommendation = safeArray<string>(
    raw.aiRecommendation || raw.statisticalAnalysis?.aiRecommendation,
  );

  const meta = raw.meta || raw.statisticalAnalysis?.meta;

  const generatedLines: string[] = [];

  if (isRecord(meta)) {
    const respondentCount = meta.respondentCount;
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
    ...summary
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    ...aiRecommendation,
  ].filter(Boolean);
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
      variable1: item.variable1 ?? item.variableA,
      variable2: item.variable2 ?? item.variableB,
      coefficient: item.coefficient ?? item.r ?? item.rho,
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

  const direct =
    toNumber(raw.respondentCount) ??
    toNumber(raw.totalRows) ??
    toNumber(raw.meta?.respondentCount) ??
    toNumber(raw.statisticalAnalysis?.meta?.respondentCount) ??
    toNumber(raw.statisticalAnalysis?.meta?.totalRows);

  if (direct && direct > 0) return direct;

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

  const dataDescription = String(raw.dataDescription || '').trim();

  if (dataDescription) {
    const lines = dataDescription
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length > 1) return lines.length - 1;
  }

  return 0;
}

function getResultArrays(result: AnalysisResult | null) {
  const raw = (result || {}) as any;
  const statistical = raw.statisticalAnalysis || raw.stats || raw.analysisStats || raw;

  const frequencies = safeArray<any>(
    statistical.frequencies ||
      raw.frequencies ||
      raw.frequencyTables ||
      raw.frequency_tables,
  );

  const itemDescriptives = safeArray<any>(
    statistical.itemDescriptives ||
      raw.itemDescriptives ||
      raw.descriptiveStatistics ||
      raw.descriptive_statistics ||
      raw.statistics,
  );

  const scaleDescriptives = safeArray<any>(
    statistical.scaleDescriptives ||
      raw.scaleDescriptives ||
      raw.scale_descriptives ||
      raw.scalesDescriptiveStatistics,
  );

  const scaleScores = safeArray<any>(
    statistical.scaleScores || raw.scaleScores || raw.scales,
  );

  const normality = safeArray<any>(statistical.normality || raw.normality);

  const pearsonCorrelations = safeArray<any>(
    statistical.correlations?.pearson ||
      raw.pearsonCorrelations ||
      raw.pearson_correlations,
  );

  const spearmanCorrelations = safeArray<any>(
    statistical.correlations?.spearman ||
      raw.spearmanCorrelations ||
      raw.spearman_correlations,
  );

  const recommendedCorrelations = safeArray<any>(
    statistical.correlations?.recommended || raw.recommendedCorrelations,
  );

  const reliability = safeArray<any>(
    statistical.reliability || raw.reliability || raw.cronbachAlpha,
  );

  const parametricGroupTests = safeArray<any>(
    statistical.groupTests?.parametric ||
      raw.parametricGroupTests ||
      raw.parametricTests,
  );

  const nonParametricGroupTests = safeArray<any>(
    statistical.groupTests?.nonParametric ||
      raw.nonParametricGroupTests ||
      raw.nonParametricTests,
  );

  const recommendedGroupTests = safeArray<any>(
    statistical.groupTests?.recommended ||
      raw.recommendedGroupTests ||
      raw.recommendedTests ||
      raw.recommended_tests ||
      raw.tests,
  );

  const oldTTests = safeArray<any>(raw.tTests || raw.t_tests);

  const oldHypothesisTests = safeArray<any>(
    raw.hypothesisTests || raw.hypothesis_tests || raw.testResults,
  );

  const files = safeArray<any>(raw.files || raw.extractedFiles || raw.attachments);

  const variables = safeArray<any>(
    raw.variables || raw.detectedVariables || raw.columns,
  );

  const selectedAnalyses = safeArray<any>(
    raw.selectedAnalyses || raw.selected_analyses,
  );

  const recommendedCharts = safeArray<any>(
    raw.recommendedCharts || raw.recommended_charts || raw.charts,
  );

  const excelTables = safeArray<any>(
    raw.excelTables || raw.excel_tables || raw.tables,
  );

  const warnings = safeArray<string>(raw.warnings || statistical.warnings);

  const aiRecommendation = safeArray<string>(
    statistical.aiRecommendation || raw.aiRecommendation,
  );

  return {
    meta: statistical.meta || raw.meta || null,
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

    tTests: oldTTests,
    hypothesisTests: oldHypothesisTests,

    recommendedTests: [
      ...recommendedGroupTests,
      ...safeArray<any>(raw.recommendedTests || raw.recommended_tests),
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

function getTotalCorrelationCount(
  arrays: ReturnType<typeof getResultArrays>,
): number {
  return (
    arrays.recommendedCorrelations.length +
    arrays.pearsonCorrelations.length +
    arrays.spearmanCorrelations.length
  );
}

function getTotalTestsCount(arrays: ReturnType<typeof getResultArrays>): number {
  return (
    arrays.recommendedGroupTests.length +
    arrays.parametricGroupTests.length +
    arrays.nonParametricGroupTests.length +
    arrays.hypothesisTests.length +
    arrays.tTests.length
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
  return row.coefficient ?? row.rho ?? row.r ?? row.value ?? null;
}

function buildJaspScaleDescriptiveRows(arrays: ReturnType<typeof getResultArrays>): DataRow[] {
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

function buildJaspSpearmanRows(arrays: ReturnType<typeof getResultArrays>): DataRow[] {
  return normalizeRows(arrays.spearmanCorrelations).map((row) => {
    return {
      variableA: row.variableA || row.variable1 || row.x || row.left,
      variableB: row.variableB || row.variable2 || row.y || row.right,
      rho: getCorrelationCoefficient(row),
      pValue: row.pValue ?? row.p,
      significance: row.significance,
      fisherZ: row.fisherZ,
      standardError: row.standardError ?? row.se,
      interpretation: row.interpretation,
    };
  });
}

function buildJaspReliabilityRows(arrays: ReturnType<typeof getResultArrays>): DataRow[] {
  return normalizeRows(arrays.reliability).map((row) => {
    return {
      scaleName: row.scaleName || row.variable || row.name || row.label,
      validRows: row.validRows ?? row.valid ?? row.n,
      cronbachAlpha: row.cronbachAlpha ?? row.alpha,
      interpretation: row.interpretation,
      items: row.items,
    };
  });
}

function buildJaspNormalityRows(arrays: ReturnType<typeof getResultArrays>): DataRow[] {
  return normalizeRows(arrays.normality).map((row) => {
    return {
      variable: row.variable || row.name || row.scaleName || row.label,
      valid: row.valid ?? row.n,
      method: row.method,
      statistic: row.statistic ?? row.shapiroWilk,
      pValue: row.pValue ?? row.p,
      isNormal: row.isNormal,
      recommendation: row.recommendation,
      note: row.note,
    };
  });
}



function normalizeTableRowsFromJaspTable(table: unknown, fallbackTitle: string): DataRow[] {
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
          'Frekvenčné tabuľky v členení presne podľa JASP reportu.',
      ),
      rows,
      icon: <BarChart3 className="h-5 w-5" />,
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
            'Descriptive Statistics – Valid, Missing, Median, Mean, Std. Deviation, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
        ),
        rows,
        icon: <Sigma className="h-5 w-5" />,
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
      });
    }
  }

  const correlationSection = raw.jaspCorrelationSection || jaspOutput?.correlationSection;
  if (isRecord(correlationSection)) {
    const rows = safeArray(correlationSection.tables).flatMap((table, tableIndex) =>
      normalizeTableRowsFromJaspTable(table, `Spearman ${tableIndex + 1}`).map((row) => ({
        jaspSection: correlationSection.title || 'KORELAČNÁ ANALÝZA-SPEARMAN - MALÝ SÚBOR',
        ...row,
      })),
    );

    if (rows.length) {
      sections.push({
        key: 'jasp-output-spearman',
        title: String(correlationSection.title || 'KORELAČNÁ ANALÝZA-SPEARMAN - MALÝ SÚBOR'),
        description: String(
          correlationSection.subtitle ||
            "IBA MEDZI ŠKÁLAMI A SUBŠKÁLAMI – Spearman's rho, p, Fisher's z a SE.",
        ),
        rows,
        icon: <Sigma className="h-5 w-5" />,
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
    ...jaspOutputSections,
    {
      key: 'files',
      title: 'Spracované súbory',
      description: 'Prehľad súborov použitých pri analýze.',
      rows: arrays.files,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      key: 'variables',
      title: 'Identifikované premenné',
      description: 'Premenné rozpoznané zo súboru alebo vložených dát.',
      rows: arrays.variables,
      icon: <Table2 className="h-5 w-5" />,
    },
    {
      key: 'jaspScaleDescriptives',
      title: 'JASP tabuľka – deskriptívna štatistika škál a subškál',
      description:
        'Hlavná tabuľka podľa JASP: Valid, Missing, Median, Mean, SD, Skewness, Kurtosis, Shapiro-Wilk, p-hodnota, Minimum a Maximum.',
      rows: jaspScaleRows,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'jaspNormality',
      title: 'JASP tabuľka – normalita dát',
      description:
        'Kontrola normality škál a subškál vrátane štatistiky, p-hodnoty a odporúčania.',
      rows: jaspNormalityRows,
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      key: 'jaspReliability',
      title: 'JASP tabuľka – reliabilita škál',
      description:
        'Cronbachovo alfa pre rozpoznané alebo manuálne definované škály a subškály.',
      rows: jaspReliabilityRows,
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      key: 'jaspSpearman',
      title: 'JASP tabuľka – Spearmanove korelácie',
      description:
        'Spearmanove korelácie medzi škálami a subškálami vrátane p-hodnoty, Fisherovho z a SE efektu.',
      rows: jaspSpearmanRows,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'frequencies',
      title: 'Frekvenčná analýza',
      description:
        'Početnosti, percentá, validné percentá a kumulatívne percentá po jednotlivých položkách.',
      rows:
        arrays.frequencyRows.length > 0
          ? arrays.frequencyRows
          : arrays.frequencies,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      key: 'itemDescriptives',
      title: 'Deskriptívna štatistika položiek',
      description:
        'Deskriptívna štatistika po jednotlivých položkách – vhodná skôr na kontrolu dát.',
      rows: arrays.itemDescriptives,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'scaleScores',
      title: 'Vypočítané škály a subškály',
      description:
        'Súčty alebo priemery položiek podľa definovaných škál a subškál dotazníka.',
      rows: arrays.scaleScores,
      icon: <Brain className="h-5 w-5" />,
    },
    {
      key: 'scaleDescriptives',
      title: 'Deskriptívna štatistika škál a subškál',
      description:
        'Hlavná deskriptívna štatistika vhodná do práce – N, M, medián, SD, min, max, šikmosť, špicatosť.',
      rows: arrays.scaleDescriptives,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'normality',
      title: 'Normalita dát',
      description:
        'Posúdenie normality škál a subškál a odporúčanie parametrických alebo neparametrických testov.',
      rows: arrays.normality,
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      key: 'pearsonCorrelations',
      title: 'Pearsonove korelácie',
      description: 'Parametrické korelácie medzi škálami a subškálami.',
      rows: arrays.pearsonCorrelations,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'spearmanCorrelations',
      title: 'Spearmanove korelácie',
      description: 'Neparametrické korelácie medzi škálami a subškálami.',
      rows: arrays.spearmanCorrelations,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'recommendedCorrelations',
      title: 'Odporúčaná korelačná analýza',
      description:
        'Korelácie odporúčané podľa normality dát – Pearson alebo Spearman.',
      rows: arrays.recommendedCorrelations,
      icon: <Brain className="h-5 w-5" />,
    },
    {
      key: 'reliability',
      title: 'Reliabilita – Cronbach alfa',
      description:
        'Vnútorná konzistencia škál a subškál štandardizovaného dotazníka.',
      rows: arrays.reliability,
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      key: 'parametricGroupTests',
      title: 'Parametrické testy',
      description:
        'Independent t-test a ANOVA pre porovnanie rozdielov medzi skupinami.',
      rows: arrays.parametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'nonParametricGroupTests',
      title: 'Neparametrické testy',
      description:
        'Mann-Whitney U test a Kruskal-Wallis test pre porovnanie skupín.',
      rows: arrays.nonParametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'recommendedGroupTests',
      title: 'Odporúčané testovanie rozdielov',
      description: 'Testy odporúčané podľa normality dát a počtu skupín.',
      rows: arrays.recommendedGroupTests,
      icon: <Brain className="h-5 w-5" />,
    },
    {
      key: 'tTests',
      title: 'T-testy',
      description: 'Starší formát výsledkov t-testov, ak bol v odpovedi dostupný.',
      rows: arrays.tTests,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'hypothesisTests',
      title: 'Výsledky testovania hypotéz',
      description: 'Súhrn vykonaných alebo odporúčaných testov.',
      rows: arrays.hypothesisTests,
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      key: 'recommendedCharts',
      title: 'Odporúčané grafy',
      description: 'Grafy vhodné pre praktickú časť práce.',
      rows: arrays.recommendedCharts,
      icon: <PieChart className="h-5 w-5" />,
    },
    {
      key: 'excelTables',
      title: 'Odporúčané tabuľky do práce',
      description: 'Tabuľky vhodné do Excelu, Wordu alebo prílohy práce.',
      rows: arrays.excelTables,
      icon: <FileSpreadsheet className="h-5 w-5" />,
    },
  ];

  return sections.filter((section) => safeArray(section.rows).length > 0);
}



function tryParseJsonObject(value: unknown): Record<string, unknown> | null {
  const text = String(value || '').trim();

  if (!text) return null;

  const candidates: string[] = [];
  candidates.push(text);

  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (isRecord(parsed)) return parsed;
    } catch {
      // Skúsime ďalší kandidát.
    }
  }

  return null;
}

function cleanOutputText(value: unknown): string {
  const parsed = tryParseJsonObject(value);

  if (parsed) {
    return [
      parsed.summary,
      parsed.practicalText,
      parsed.interpretation,
      parsed.fullText,
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return String(value || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\s*[{}]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitTextToParagraphs(value: unknown): string[] {
  return cleanOutputText(value)
    .split(/\n\s*\n|(?<=\.)\s+(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^"?(ok|title|summary|practicalText|interpretation|warnings|fullText)"?\s*:/.test(paragraph));
}

function getFirstTextValue(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanOutputText(value);

    if (text) return text;
  }

  return '';
}

function getParsedAiSource(result: AnalysisResult | null): Record<string, unknown> | null {
  const raw = (result || {}) as any;
  const agent = getClaudeAgent(result);

  const candidates = [
    agent.text,
    raw.aiAgent?.text,
    raw.claudeAgent?.text,
    raw.fullText,
    raw.interpretation,
    raw.practicalText,
    raw.summary,
  ];

  for (const candidate of candidates) {
    const parsed = tryParseJsonObject(candidate);

    if (
      parsed &&
      (parsed.summary || parsed.practicalText || parsed.interpretation || parsed.fullText)
    ) {
      return parsed;
    }
  }

  return null;
}

function getProfessionalInterpretation(result: AnalysisResult | null) {
  const raw = (result || {}) as any;
  const agent = getClaudeAgent(result);
  const source = getParsedAiSource(result);

  const title = getFirstTextValue(
    source?.title,
    raw.title,
    'Odborná interpretácia výsledkov',
  );

  const summary = getFirstTextValue(
    source?.summary,
    raw.summary,
    'Analýza bola spracovaná. Nižšie je odborný výstup pripravený do praktickej časti práce.',
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
    .filter((item, index, array) => item && item !== '—' && array.indexOf(item) === index);

  const sections = [
    {
      key: 'summary',
      title: 'Súhrn výsledkov',
      text: summary,
    },
    {
      key: 'practicalText',
      title: 'Text do praktickej časti práce',
      text: practicalText,
    },
    {
      key: 'interpretation',
      title: 'Odborná interpretácia výsledkov',
      text: interpretation || fallbackFromAgent,
    },
  ].filter((section) => cleanOutputText(section.text));

  return {
    title,
    summary,
    practicalText,
    interpretation: interpretation || fallbackFromAgent || summary,
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
  if (format === 'xls') return 'vysledky-analyzy-dat.xls';

  return 'vysledky-analyzy-dat.pdf';
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

function getChartColor(index: number): string {
  const colors = [
    '#2563eb',
    '#7c3aed',
    '#059669',
    '#f59e0b',
    '#dc2626',
    '#0891b2',
    '#be185d',
    '#4f46e5',
  ];

  return colors[index % colors.length];
}

function BarChart({
  title,
  data,
  valueKey,
  labelKey,
}: {
  title: string;
  data: DataRow[];
  valueKey: string;
  labelKey: string;
}) {
  const prepared = data
    .map((row) => ({
      label: valueToText(row[labelKey]),
      value: toNumber(row[valueKey]) || 0,
    }))
    .filter((item) => item.value > 0)
    .slice(0, 12);

  const max = Math.max(...prepared.map((item) => item.value), 1);

  if (!prepared.length) return null;

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
        <BarChart3 className="h-5 w-5 text-blue-300" />
        {title}
      </h3>

      <div className="space-y-3">
        {prepared.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-slate-200">
                {item.label}
              </span>

              <span className="font-black text-white">
                {formatNumber(item.value)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((item.value / max) * 100, 3)}%`,
                  backgroundColor: getChartColor(index),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SimplePieChart({
  title,
  data,
  valueKey,
  labelKey,
}: {
  title: string;
  data: DataRow[];
  valueKey: string;
  labelKey: string;
}) {
  const prepared = data
    .map((row) => ({
      label: valueToText(row[labelKey]),
      value: toNumber(row[valueKey]) || 0,
    }))
    .filter((item) => item.value > 0)
    .slice(0, 8);

  const total = prepared.reduce((sum, item) => sum + item.value, 0);

  if (!prepared.length || total <= 0) return null;

  let offset = 0;

  const gradient = prepared
    .map((item, index) => {
      const start = offset;
      const percent = (item.value / total) * 100;
      const end = start + percent;

      offset = end;

      return `${getChartColor(index)} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-white">
        <PieChart className="h-5 w-5 text-violet-300" />
        {title}
      </h3>

      <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
        <div
          className="mx-auto h-40 w-40 rounded-full shadow-inner"
          style={{
            background: `conic-gradient(${gradient})`,
          }}
        />

        <div className="space-y-2">
          {prepared.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 truncate text-slate-200">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: getChartColor(index) }}
                />
                {item.label}
              </span>

              <span className="font-black text-white">
                {formatNumber(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChartGallery({ result }: { result: AnalysisResult | null }) {
  const arrays = getResultArrays(result);
  const charts: ReactNode[] = [];

  arrays.frequencies.slice(0, 4).forEach((table, index) => {
    const rows = getFrequencyRows(table);
    const variable = isRecord(table)
      ? String(
          table.variable || table.name || table.title || `Premenná ${index + 1}`,
        )
      : `Premenná ${index + 1}`;

    if (rows.length > 0) {
      const valueKey = rows.some((row) => row.frequency !== undefined)
        ? 'frequency'
        : rows.some((row) => row.count !== undefined)
          ? 'count'
          : 'valid';

      charts.push(
        <BarChart
          key={`freq-bar-${index}`}
          title={`Frekvencia – ${variable}`}
          data={rows}
          labelKey="value"
          valueKey={valueKey}
        />,
      );

      charts.push(
        <SimplePieChart
          key={`freq-pie-${index}`}
          title={`Podiely – ${variable}`}
          data={rows}
          labelKey="value"
          valueKey={valueKey}
        />,
      );
    }
  });

  const scaleDescriptiveRows = normalizeRows(arrays.scaleDescriptives).filter(
    (row) => toNumber(row.mean ?? row.M) !== null,
  );

  if (scaleDescriptiveRows.length > 0) {
    charts.push(
      <BarChart
        key="scale-descriptive-means"
        title="Porovnanie priemerov škál a subškál"
        data={scaleDescriptiveRows}
        labelKey="variable"
        valueKey={
          scaleDescriptiveRows.some((row) => row.mean !== undefined) ? 'mean' : 'M'
        }
      />,
    );
  }

  const itemDescriptiveRows = normalizeRows(arrays.itemDescriptives).filter(
    (row) => toNumber(row.mean ?? row.M) !== null,
  );

  if (scaleDescriptiveRows.length === 0 && itemDescriptiveRows.length > 0) {
    charts.push(
      <BarChart
        key="item-descriptive-means"
        title="Porovnanie priemerov položiek"
        data={itemDescriptiveRows}
        labelKey="variable"
        valueKey={
          itemDescriptiveRows.some((row) => row.mean !== undefined) ? 'mean' : 'M'
        }
      />,
    );
  }

  const correlationRows = normalizeRows([
    ...arrays.recommendedCorrelations,
    ...arrays.pearsonCorrelations,
    ...arrays.spearmanCorrelations,
  ]).filter((row) => toNumber(row.coefficient ?? row.r ?? row.rho) !== null);

  if (correlationRows.length > 0) {
    charts.push(
      <BarChart
        key="correlations"
        title="Korelačné koeficienty"
        data={correlationRows.map((row) => ({
          ...row,
          label: `${valueToText(row.variable1 ?? row.variableA)} × ${valueToText(
            row.variable2 ?? row.variableB,
          )}`,
          absoluteCoefficient: Math.abs(
            toNumber(row.coefficient ?? row.r ?? row.rho) || 0,
          ),
        }))}
        labelKey="label"
        valueKey="absoluteCoefficient"
      />,
    );
  }

  const reliabilityRows = normalizeRows(arrays.reliability).filter(
    (row) => toNumber(row.cronbachAlpha) !== null,
  );

  if (reliabilityRows.length > 0) {
    charts.push(
      <BarChart
        key="cronbach-alpha"
        title="Reliabilita škál – Cronbach alfa"
        data={reliabilityRows}
        labelKey="scaleName"
        valueKey="cronbachAlpha"
      />,
    );
  }

  if (!charts.length) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
        <h3 className="text-lg font-black text-white">Grafy</h3>

        <p className="mt-2 text-sm text-slate-400">
          Z aktuálnych dát sa nepodarilo automaticky vytvoriť grafy. Nahraj Excel
          alebo CSV s číselnými a kategorizovanými premennými.
        </p>
      </section>
    );
  }

  return <div className="grid gap-5 xl:grid-cols-2">{charts}</div>;
}

export default function AnalysisResultsModal({
  open,
  result,
  onClose,
}: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableSection | null>(null);

  const arrays = useMemo(() => getResultArrays(result), [result]);
  const summaryLines = useMemo(() => getSummaryLines(result), [result]);
  const tableSections = useMemo(() => createTableSections(result), [result]);

  const overviewRef = useRef<HTMLDivElement | null>(null);
  const claudeRef = useRef<HTMLDivElement | null>(null);
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

  if (!open || !result) return null;

  async function exportResult(format: ExportFormat) {
    if (!result) return;

    try {
      setExporting(format);

      const response = await fetch('/api/analyze-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export',
          format: format === 'xls' ? 'excel' : format,
          title: (result as any).title || 'Výsledky analýzy dát',
          exportMode: 'jasp',
          // Dôležité: export je integrovaný priamo v app/api/analyze-data/route.ts.
          // Posiela sa celý result objekt, nie iba summary.
          // Inak Excel nedostane frequencies, scaleDescriptives, normality,
          // reliability, spearmanCorrelations, statisticalAnalysis ani jaspOutput.
          result,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let message = 'Export sa nepodarilo vytvoriť.';

        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => null);
          message = payload?.message || payload?.error || message;
        } else {
          const text = await response.text().catch(() => '');

          if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
            message =
              'Export vrátil HTML stránku Next.js. Skontroluj, či je export integrovaný v app/api/analyze-data/route.ts a či si reštartoval npm run dev.';
          } else if (text.trim()) {
            message = text.slice(0, 700);
          }
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      downloadBlob(blob, getFileName(format));
    } catch (error) {
      console.error('ANALYSIS_MODAL_EXPORT_ERROR:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Export výsledkov analýzy sa nepodarilo vytvoriť.',
      );
    } finally {
      setExporting(null);
    }
  }

  const claudeAgent = arrays.claudeAgent;
  const professionalInterpretation = useMemo(
    () => getProfessionalInterpretation(result),
    [result],
  );
  const showClaudeSection = Boolean(claudeAgent.error.trim());
  const interpretation = professionalInterpretation.interpretation;

  const meta = arrays.meta as any;

  const respondentCount =
    Number(
      meta?.respondentCount ||
        (result as any).respondentCount ||
        meta?.n ||
        meta?.totalRows ||
        getFallbackRespondentCount(result, arrays.files),
    ) || 0;

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
        className="relative z-10 mx-auto my-2 flex max-h-[calc(100dvh-1rem)] min-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#050814] text-white shadow-2xl shadow-black/70 transition-colors duration-300 sm:my-4 sm:max-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-2rem)]"
      >
        <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-950 via-[#0b1020] to-slate-950 px-4 py-4 sm:px-7 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">
                  Analýza dát podľa JASP reportu
                </p>

                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  {(result as any).title || 'Výsledky analýzy dát'}
                </h2>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  Výsledky sú rozdelené presne podľa reportu z programu JASP:
                  frekvenčné tabuľky EMBU Otec, EMBU Matka a Škála školskej
                  začlenenosti, deskriptívna štatistika škál/subškál,
                  Shapiro-Wilk, reliabilita a Spearmanova korelačná analýza.
                  ID stĺpec je ignorovaný vo výpočtoch a slúži iba na počet respondentov.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => exportResult('xls')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/15 px-4 py-3 text-sm font-black text-emerald-100 shadow-sm transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting === 'xls' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
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
                  <FileDown className="h-4 w-4" />
                )}
                PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/20 bg-black px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-zinc-900"
                aria-label="Zavrieť výsledky analýzy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="JASP sekcie"
              value={buildJaspOutputSections(result).length}
              note="Podľa priloženého reportu"
            />
            <StatCard
              label="Respondenti"
              value={respondentCount || '—'}
              note={idColumn ? `ID ignorované: ${idColumn}` : 'ID stĺpec nezadaný'}
            />
            <StatCard label="Premenné" value={arrays.variables.length} />
            <StatCard label="Frekvencie" value={frequencyCount} />
            <StatCard label="Položkové štatistiky" value={itemDescriptiveCount} />
            <StatCard label="Škály" value={scaleCount} />
            <StatCard label="Deskriptíva škál" value={scaleDescriptiveCount} />
            <StatCard label="Normalita" value={normalityCount} />
            <StatCard label="Korelácie" value={correlationCount} />
            <StatCard label="Reliabilita" value={reliabilityCount} />
            <StatCard label="Testy" value={testsCount} />
          </div>

          {arrays.correlationRecommendationNote ||
          arrays.groupTestsRecommendationNote ||
          arrays.aiRecommendation.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
              <div className="mb-2 flex items-center gap-2 font-black">
                <Brain className="h-4 w-4" />
                AI odporúčanie pre interpretáciu
              </div>

              <div className="space-y-1">
                {arrays.correlationRecommendationNote ? (
                  <p>• {arrays.correlationRecommendationNote}</p>
                ) : null}

                {arrays.groupTestsRecommendationNote ? (
                  <p>• {arrays.groupTestsRecommendationNote}</p>
                ) : null}

                {arrays.aiRecommendation.map((item, index) => (
                  <p key={`${item}-${index}`}>• {item}</p>
                ))}
              </div>
            </div>
          ) : null}

          {claudeAgent.error ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              <div className="mb-1 flex items-center gap-2 font-black">
                <AlertTriangle className="h-4 w-4" />
                Claude AI agent
              </div>
              {claudeAgent.error}
            </div>
          ) : null}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => scrollTo(overviewRef.current)}
              className="shrink-0 rounded-2xl bg-[#0b1020] px-4 py-2 text-xs font-black text-slate-200 shadow-sm transition hover:bg-white/10"
            >
              Súhrn
            </button>

            {showClaudeSection ? (
              <button
                type="button"
                onClick={() => scrollTo(claudeRef.current)}
                className="shrink-0 rounded-2xl bg-purple-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-purple-500"
              >
                Claude AI agent
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => scrollTo(chartsRef.current)}
              className="shrink-0 rounded-2xl bg-[#0b1020] px-4 py-2 text-xs font-black text-slate-200 shadow-sm transition hover:bg-white/10"
            >
              Grafy
            </button>

            <button
              type="button"
              onClick={() => scrollTo(tablesRef.current)}
              className="shrink-0 rounded-2xl bg-[#0b1020] px-4 py-2 text-xs font-black text-slate-200 shadow-sm transition hover:bg-white/10"
            >
              Tabuľky
            </button>

            <button
              type="button"
              onClick={() => scrollTo(interpretationRef.current)}
              className="shrink-0 rounded-2xl bg-[#0b1020] px-4 py-2 text-xs font-black text-slate-200 shadow-sm transition hover:bg-white/10"
            >
              Interpretácia
            </button>
          </div>
        </div>

        <div
          data-analysis-content="true"
          className="analysis-modal-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-4 py-5 sm:px-7"
        >
          <div ref={overviewRef} className="scroll-mt-6">
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[28px] border border-white/10 bg-[#070a16] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-white">
                  <Info className="h-5 w-5 text-blue-300" />
                  Súhrn analýzy
                </h3>

                {summaryLines.length > 0 ? (
                  <ul className="space-y-2 text-sm leading-6 text-slate-200">
                    {summaryLines.map((line, index) => (
                      <li key={`${line}-${index}`}>• {line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">
                    Súhrn nebol dostupný.
                  </p>
                )}

                {arrays.warnings.length > 0 ? (
                  <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                    <div className="mb-2 flex items-center gap-2 font-black">
                      <AlertTriangle className="h-4 w-4" />
                      Upozornenia
                    </div>

                    <ul className="space-y-1">
                      {arrays.warnings.map((item, index) => (
                        <li key={`${String(item)}-${index}`}>
                          • {valueToText(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-white">
                  <Table2 className="h-5 w-5 text-emerald-300" />
                  Prehľad tabuliek
                </h3>

                {tableSections.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tableSections.map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => setSelectedTable(section)}
                        className="group rounded-2xl border border-white/10 bg-[#070a16] p-4 text-left transition hover:border-blue-400/40 hover:bg-blue-500/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="mb-2 text-blue-300">
                              {section.icon}
                            </div>

                            <p className="font-black text-white">
                              {section.title}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-400">
                              {section.description}
                            </p>

                            <p className="mt-2 text-xs font-black text-blue-300">
                              {safeArray(section.rows).length} záznamov
                            </p>
                          </div>

                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    Žiadne tabuľky neboli dostupné.
                  </p>
                )}
              </section>
            </div>
          </div>

          {showClaudeSection ? (
            <div ref={claudeRef} className="mt-6 scroll-mt-6">
              <section className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-red-100">
                  <AlertTriangle className="h-4 w-4" />
                  AI agent
                </div>

                <p className="text-sm leading-6 text-red-100">
                  {claudeAgent.error}
                </p>
              </section>
            </div>
          ) : null}

          <div ref={chartsRef} className="mt-6 scroll-mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Grafy</h3>

                <p className="text-sm text-slate-400">
                  Grafy sa vytvárajú automaticky z frekvencií, deskriptívnych
                  štatistík škál, korelácií a reliability.
                </p>
              </div>
            </div>

            <ChartGallery result={result} />
          </div>

          <div ref={tablesRef} className="mt-6 scroll-mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
                <Table2 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Tabuľky</h3>

                <p className="text-sm text-slate-400">
                  Každú tabuľku otvoríš samostatne kliknutím na kartu.
                </p>
              </div>
            </div>

            {tableSections.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tableSections.map((section) => (
                  <TableCard
                    key={section.key}
                    section={section}
                    onOpen={() => setSelectedTable(section)}
                  />
                ))}
              </div>
            ) : (
              <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
                <p className="text-sm text-slate-400">
                  Tabuľky neboli dostupné.
                </p>
              </section>
            )}
          </div>

          <div ref={interpretationRef} className="mt-6 scroll-mt-6">
            <section className="rounded-[28px] border border-white/10 bg-[#0b1020] p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-purple-200">
                    <Sparkles className="h-4 w-4" />
                    Profesionálna akademická interpretácia
                  </div>

                  <h3 className="text-xl font-black text-white">
                    {professionalInterpretation.title || 'Odborný výstup výsledkov'}
                  </h3>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                    Výstup je zobrazený ako finálny odborný text vhodný do praktickej časti práce. Technické JSON dáta sa automaticky rozparsujú a používateľovi sa nezobrazujú.
                  </p>
                </div>

                {professionalInterpretation.model ? (
                  <div className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-xs font-bold text-slate-300">
                    Model: {professionalInterpretation.model}
                  </div>
                ) : null}
              </div>

              <div className="analysis-modal-scroll max-h-[720px] overflow-y-auto rounded-2xl border border-white/10 bg-[#070a16] p-4 shadow-inner">
                <div className="space-y-4">
                  {professionalInterpretation.sections.length > 0 ? (
                    professionalInterpretation.sections.map((section) => (
                      <ProfessionalTextBlock
                        key={section.key}
                        title={section.title}
                        text={section.text}
                      />
                    ))
                  ) : (
                    <ProfessionalTextBlock
                      title="Interpretácia výsledkov"
                      text={interpretation}
                    />
                  )}

                  {professionalInterpretation.warnings.length > 0 ? (
                    <section className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                      <h4 className="mb-3 flex items-center gap-2 text-base font-black text-amber-100">
                        <AlertTriangle className="h-4 w-4" />
                        Metodické upozornenia
                      </h4>

                      <ul className="space-y-2 text-sm leading-6 text-amber-50">
                        {professionalInterpretation.warnings.map((warning, index) => (
                          <li key={`${warning}-${index}`}>• {warning}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black px-5 py-4 sm:flex sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs leading-5 text-slate-400">
            Výsledky sú orientačné. Export posiela celý JASP result objekt do
            /api/analyze-data, aby sa v Exceli naplnili všetky hárky:
            Frekvencia, Deskriptíva, Korelácie, Testy, Grafy a Premenné.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex justify-center rounded-2xl border border-white/20 bg-black px-5 py-2.5 text-sm font-black text-white transition hover:bg-zinc-900 sm:mt-0"
          >
            Zavrieť výsledky
          </button>
        </div>
      </div>

      {selectedTable ? (
        <TableDetailModal
          section={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      ) : null}
    </div>
  );
}

function TableCard({
  section,
  onOpen,
}: {
  section: TableSection;
  onOpen: () => void;
}) {
  const rows = normalizeRows(safeArray(section.rows));
  const previewRows = rows.slice(0, 3);
  const columns = getColumns(rows).slice(0, 4);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-[28px] border border-white/10 bg-[#0b1020] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-lg"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 text-blue-300">{section.icon}</div>

          <h4 className="text-base font-black text-white">{section.title}</h4>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {section.description}
          </p>
        </div>

        <Maximize2 className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-blue-300" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#070a16] p-3">
        {previewRows.length > 0 ? (
          <div className="space-y-2">
            {previewRows.map((row, index) => (
              <div
                key={index}
                className="rounded-xl bg-[#0b1020] px-3 py-2 text-xs text-slate-200"
              >
                {columns.map((column) => (
                  <div key={column} className="flex justify-between gap-3">
                    <span className="font-bold text-slate-400">
                      {getFieldLabel(column)}
                    </span>

                    <span className="truncate text-right">
                      {valueToText(row[column])}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Bez náhľadu.</p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-black text-blue-300">{rows.length} záznamov</span>

        <span className="inline-flex items-center gap-1 font-black text-slate-400 transition group-hover:text-blue-300">
          Otvoriť
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

function TableDetailModal({
  section,
  onClose,
}: {
  section: TableSection;
  onClose: () => void;
}) {
  const rows = normalizeRows(safeArray(section.rows));
  const columns = getColumns(rows);

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto overflow-x-hidden bg-black/90 p-2 text-white backdrop-blur-md sm:p-4">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť tabuľku"
      />

      <div className="relative z-10 mx-auto my-2 flex max-h-[calc(100dvh-1rem)] min-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#050814] text-white shadow-2xl sm:my-4 sm:max-h-[calc(100dvh-2rem)] sm:min-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
              Detail tabuľky
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              {section.title}
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              {section.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-black text-white transition hover:bg-zinc-900"
            aria-label="Zavrieť tabuľku"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="analysis-modal-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <div className="analysis-table-scroll max-h-full overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-[960px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#0b1020]">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-white/10 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-300"
                    >
                      {getFieldLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="odd:bg-transparent even:bg-white/[0.03] hover:bg-white/[0.06]"
                  >
                    {columns.map((column) => (
                      <td
                        key={`${rowIndex}-${column}`}
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