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
};

const COLUMN_PRIORITY = [
  'scaleName',
  'variable',
  'name',
  'label',
  'title',
  'type',
  'variableType',
  'measurementLevel',
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

function getFieldLabel(key: string) {
  if (COLUMN_LABELS[key]) return COLUMN_LABELS[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatNumber(value: number) {
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
            .map(([key, val]) => `${getFieldLabel(key)}: ${valueToText(val)}`)
            .join(', ');
        }

        return valueToText(item);
      })
      .join('\n');
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

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
    if (isRecord(row)) return row;

    return {
      poradie: index + 1,
      hodnota: row,
    };
  });
}

function getColumns(rows: DataRow[]) {
  const allColumns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  );

  const priorityColumns = COLUMN_PRIORITY.filter((column) =>
    allColumns.includes(column),
  );

  const restColumns = allColumns
    .filter((column) => !priorityColumns.includes(column))
    .sort((a, b) => a.localeCompare(b, 'sk'));

  return [...priorityColumns, ...restColumns];
}

function getNestedArray<T = unknown>(raw: any, path: string): T[] {
  const parts = path.split('.');
  let current = raw;

  for (const part of parts) {
    current = current?.[part];
  }

  return safeArray<T>(current);
}

function getSummaryLines(result: AnalysisResult | null) {
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

    const values = safeArray(table.values || table.rows || table.data || table.items);

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

function createTableSections(result: AnalysisResult | null): TableSection[] {
  const arrays = getResultArrays(result);

  const sections: TableSection[] = [
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
      key: 'frequencies',
      title: 'Frekvenčná analýza',
      description:
        'Početnosti, percentá, validné percentá a kumulatívne percentá po jednotlivých položkách.',
      rows: arrays.frequencyRows.length > 0 ? arrays.frequencyRows : arrays.frequencies,
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
      description: 'Independent t-test a ANOVA pre porovnanie rozdielov medzi skupinami.',
      rows: arrays.parametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'nonParametricGroupTests',
      title: 'Neparametrické testy',
      description: 'Mann-Whitney U test a Kruskal-Wallis test pre porovnanie skupín.',
      rows: arrays.nonParametricGroupTests,
      icon: <Sigma className="h-5 w-5" />,
    },
    {
      key: 'recommendedGroupTests',
      title: 'Odporúčané testovanie rozdielov',
      description:
        'Testy odporúčané podľa normality dát a počtu skupín.',
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

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getFileName(format: ExportFormat) {
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function getChartColor(index: number) {
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
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        {title}
      </h3>

      <div className="space-y-3">
        {prepared.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-slate-700 dark:text-slate-200">
                {item.label}
              </span>
              <span className="font-black text-slate-950 dark:text-white">
                {formatNumber(item.value)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
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
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
        <PieChart className="h-5 w-5 text-violet-600 dark:text-violet-300" />
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
              <span className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-200">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: getChartColor(index) }}
                />
                {item.label}
              </span>

              <span className="font-black text-slate-950 dark:text-white">
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
          table.variable ||
            table.name ||
            table.title ||
            `Premenná ${index + 1}`,
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
        valueKey={scaleDescriptiveRows.some((row) => row.mean !== undefined) ? 'mean' : 'M'}
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
        valueKey={itemDescriptiveRows.some((row) => row.mean !== undefined) ? 'mean' : 'M'}
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
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">
          Grafy
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Z aktuálnych dát sa nepodarilo automaticky vytvoriť grafy. Nahraj
          Excel alebo CSV s číselnými a kategorizovanými premennými.
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

      const response = await fetch('/api/analyze-data/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          title: (result as any).title || 'Výsledky analýzy dát',
          result,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Export sa nepodarilo vytvoriť.');
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

  const interpretation =
    String(
      (result as any).interpretation ||
        (result as any).practicalText ||
        (result as any).fullText ||
        '',
    ).trim() || 'Interpretácia nebola dostupná.';

  const meta = arrays.meta as any;

  const respondentCount =
    Number(meta?.respondentCount || meta?.n || meta?.totalRows || 0) || 0;

  const idColumn = String(meta?.idColumn || '').trim();

  const testsCount =
    arrays.recommendedGroupTests.length ||
    arrays.parametricGroupTests.length + arrays.nonParametricGroupTests.length ||
    arrays.hypothesisTests.length ||
    arrays.tTests.length;

  const scrollTo = (target: HTMLDivElement | null) => {
    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div
      data-analysis-modal="true"
      className="fixed inset-0 z-[9999] flex min-h-0 items-stretch justify-center overflow-hidden bg-slate-950/80 p-2 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Výsledky analýzy dát"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť modálne okno"
      />

      <style jsx global>{`
        .analysis-modal-scroll {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior: contain;
        }

        .analysis-modal-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .analysis-modal-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.45);
          border-radius: 999px;
        }

        .analysis-modal-scroll::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.75);
          border-radius: 999px;
        }

        .analysis-modal-scroll table {
          border-collapse: collapse;
        }

        @media (max-width: 767px) {
          [data-analysis-modal='true'] {
            align-items: stretch !important;
          }

          [data-analysis-modal='true'] .analysis-modal-scroll {
            max-height: none !important;
            overflow-y: auto !important;
          }
        }
      `}</style>

      <div className="relative z-10 flex h-[100dvh] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-black/50 transition-colors duration-300 dark:border-white/10 dark:bg-[#070a16] sm:h-[calc(100dvh-2rem)]">
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-500/10 px-4 py-4 dark:border-white/10 dark:from-blue-600/20 dark:via-violet-600/15 dark:to-cyan-500/10 sm:px-7 sm:py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200/80">
                  Analýza dát
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                  {(result as any).title || 'Výsledky analýzy dát'}
                </h2>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Výsledky sú rozdelené na frekvencie, deskriptívnu štatistiku
                  položiek, škály a subškály, normalitu, korelácie, reliabilitu
                  a testovanie rozdielov medzi skupinami. ID stĺpec je
                  ignorovaný vo výpočtoch a slúži iba na počet respondentov.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportResult('word')}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
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
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
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
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.13]"
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
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-500"
                aria-label="Zavrieť výsledky analýzy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard
              label="Respondenti"
              value={respondentCount || '—'}
              note={idColumn ? `ID: ${idColumn}` : 'ID nebolo zadané'}
            />
            <StatCard label="Premenné" value={arrays.variables.length} />
            <StatCard label="Frekvencie" value={arrays.frequencies.length} />
            <StatCard label="Škály" value={arrays.scaleScores.length} />
            <StatCard
              label="Korelácie"
              value={
                arrays.recommendedCorrelations.length ||
                arrays.pearsonCorrelations.length + arrays.spearmanCorrelations.length
              }
            />
            <StatCard label="Testy" value={testsCount} />
          </div>

          {arrays.correlationRecommendationNote ||
          arrays.groupTestsRecommendationNote ||
          arrays.aiRecommendation.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100">
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

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => scrollTo(overviewRef.current)}
              className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Súhrn
            </button>
            <button
              type="button"
              onClick={() => scrollTo(chartsRef.current)}
              className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Grafy
            </button>
            <button
              type="button"
              onClick={() => scrollTo(tablesRef.current)}
              className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Tabuľky
            </button>
            <button
              type="button"
              onClick={() => scrollTo(interpretationRef.current)}
              className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Interpretácia
            </button>
          </div>
        </div>

        <div
          data-analysis-content="true"
          className="analysis-modal-scroll min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain px-4 py-5 [scrollbar-width:thin] [scrollbar-color:#2563eb_#020617] sm:px-7"
        >
          <div ref={overviewRef} className="scroll-mt-6">
            <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  Súhrn analýzy
                </h3>

                {summaryLines.length > 0 ? (
                  <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {summaryLines.map((line, index) => (
                      <li key={`${line}-${index}`}>• {line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Súhrn nebol dostupný.
                  </p>
                )}

                {arrays.warnings.length > 0 ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
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

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                  <Table2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  Prehľad tabuliek
                </h3>

                {tableSections.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tableSections.map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => setSelectedTable(section)}
                        className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/40 dark:hover:bg-blue-500/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="mb-2 text-blue-700 dark:text-blue-300">
                              {section.icon}
                            </div>
                            <p className="font-black text-slate-950 dark:text-white">
                              {section.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {section.description}
                            </p>
                            <p className="mt-2 text-xs font-black text-blue-700 dark:text-blue-300">
                              {safeArray(section.rows).length} záznamov
                            </p>
                          </div>

                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Žiadne tabuľky neboli dostupné.
                  </p>
                )}
              </section>
            </div>
          </div>

          <div ref={chartsRef} className="mt-6 scroll-mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  Grafy
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Grafy sa vytvárajú automaticky z frekvencií, deskriptívnych
                  štatistík škál, korelácií a reliability.
                </p>
              </div>
            </div>

            <ChartGallery result={result} />
          </div>

          <div ref={tablesRef} className="mt-6 scroll-mt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <Table2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  Tabuľky
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tabuľky neboli dostupné.
                </p>
              </section>
            )}
          </div>

          <div ref={interpretationRef} className="mt-6 scroll-mt-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="mb-3 text-lg font-black text-slate-950 dark:text-white">
                Akademická interpretácia
              </h3>

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                {interpretation}
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/70 sm:flex sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Výsledky sú orientačné. Pred finálnou interpretáciou odporúčame
            overiť typ premenných, metodiku práce, normalitu rozdelenia,
            reliabilitu škál a požiadavky školy.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 inline-flex justify-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:mt-0"
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
      className="group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-400/40"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 text-blue-700 dark:text-blue-300">
            {section.icon}
          </div>
          <h4 className="text-base font-black text-slate-950 dark:text-white">
            {section.title}
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {section.description}
          </p>
        </div>

        <Maximize2 className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-blue-600 dark:group-hover:text-blue-300" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/10">
        {previewRows.length > 0 ? (
          <div className="space-y-2">
            {previewRows.map((row, index) => (
              <div
                key={index}
                className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 dark:bg-white/[0.05] dark:text-slate-200"
              >
                {columns.map((column) => (
                  <div key={column} className="flex justify-between gap-3">
                    <span className="font-bold text-slate-500 dark:text-slate-400">
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bez náhľadu.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-black text-blue-700 dark:text-blue-300">
          {rows.length} záznamov
        </span>
        <span className="inline-flex items-center gap-1 font-black text-slate-500 transition group-hover:text-blue-700 dark:text-slate-400 dark:group-hover:text-blue-300">
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
    <div className="fixed inset-0 z-[10000] flex min-h-0 items-stretch justify-center overflow-hidden bg-slate-950/80 p-2 backdrop-blur-md sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Zavrieť tabuľku"
      />

      <div className="relative z-10 flex h-[100dvh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#070a16] sm:h-[calc(100dvh-2rem)]">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              Detail tabuľky
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
              {section.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {section.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white transition hover:bg-red-500"
            aria-label="Zavrieť tabuľku"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="analysis-modal-scroll min-h-0 flex-1 overflow-auto overscroll-contain p-4 [scrollbar-width:thin] [scrollbar-color:#2563eb_#020617] sm:p-5">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#0b1020]">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:text-slate-300"
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
                    className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/70 dark:odd:bg-transparent dark:even:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    {columns.map((column) => (
                      <td
                        key={`${rowIndex}-${column}`}
                        className="whitespace-pre-wrap border-b border-slate-100 px-4 py-3 align-top leading-6 text-slate-700 dark:border-white/10 dark:text-slate-200"
                      >
                        {valueToText(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                Tabuľka neobsahuje žiadne riadky.
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Zavrieť tabuľku
          </button>
        </div>
      </div>
    </div>
  );
}