'use client';

import {
  BarChart3,
  LineChart,
  PieChart,
  Sigma,
  Table2,
  TrendingUp,
} from 'lucide-react';

import type { AnalysisResult } from './analysisTypes';

type AnalysisChartsProps = {
  result?: AnalysisResult | null;
};

type ChartItem = {
  label: string;
  value: number;
  description?: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace('%', '')
      .replace(',', '.');

    if (!normalized) return fallback;

    const number = Number(normalized);
    return Number.isFinite(number) ? number : fallback;
  }

  return fallback;
}

function toPositiveNumber(value: unknown, fallback = 0): number {
  const number = toNumber(value, fallback);
  return number > 0 ? number : fallback;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getPercentFromRatio(value: unknown): number {
  const number = toNumber(value, 0);

  if (number <= 1) {
    return clampPercent(number * 100);
  }

  return clampPercent(number);
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 3,
  }).format(value);
}

function getNestedValue(source: unknown, paths: string[][]): unknown {
  for (const path of paths) {
    let current: unknown = source;

    for (const key of path) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }

      current = current[key];
    }

    if (current !== undefined && current !== null && current !== '') {
      return current;
    }
  }

  return undefined;
}

function getPreparedDataset(result?: AnalysisResult | null): UnknownRecord {
  if (!result) return {};

  const root = result as unknown as UnknownRecord;

  return isRecord(root.preparedDataset) ? root.preparedDataset : {};
}

function isAoATable(value: unknown): value is unknown[][] {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);
}

function getPreparedRowCount(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const fromQuality = toPositiveNumber(quality.rowCount);
  if (fromQuality > 0) return fromQuality;

  if (Array.isArray(preparedDataset.rows)) {
    return preparedDataset.rows.length;
  }

  if (isAoATable(preparedDataset.rawDataSheet)) {
    return Math.max(preparedDataset.rawDataSheet.length - 1, 0);
  }

  return 0;
}

function getPreparedVariableCount(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const fromQuality = toPositiveNumber(quality.variableCount);
  if (fromQuality > 0) return fromQuality;

  if (Array.isArray(preparedDataset.variables)) {
    return preparedDataset.variables.length;
  }

  if (Array.isArray(preparedDataset.headers)) {
    return preparedDataset.headers.length;
  }

  if (Array.isArray(preparedDataset.originalHeaders)) {
    return preparedDataset.originalHeaders.length;
  }

  return 0;
}

function getScaleCount(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const fromQuality = toPositiveNumber(quality.scaleCount);
  if (fromQuality > 0) return fromQuality;

  return safeArray(preparedDataset.scaleDefinitions).length;
}

function getSubscaleCount(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const fromQuality = toPositiveNumber(quality.subscaleCount);
  if (fromQuality > 0) return fromQuality;

  return safeArray(preparedDataset.subscaleDefinitions).length;
}

function getRemovedEmptyRows(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  return toPositiveNumber(quality.removedEmptyRows);
}

function getRemovedDuplicateRows(result?: AnalysisResult | null): number {
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  return toPositiveNumber(quality.removedDuplicateRows);
}

function getResultArray(result: AnalysisResult | null | undefined, keys: string[]): unknown[] {
  if (!result) return [];

  const root = result as unknown as UnknownRecord;

  for (const key of keys) {
    const value = root[key];

    if (Array.isArray(value)) return value;
  }

  return [];
}

function getStatisticsArrays(result?: AnalysisResult | null) {
  const root = (result || {}) as unknown as UnknownRecord;

  const descriptiveStatistics = getResultArray(result, [
    'descriptives',
    'descriptiveStatistics',
    'descriptive_statistics',
    'statistics',
  ]);

  const frequencies = getResultArray(result, [
    'frequencies',
    'frequencyTables',
    'frequency_tables',
  ]);

  const reliabilities = getResultArray(result, [
    'reliabilities',
    'reliability',
    'cronbachAlpha',
  ]);

  const correlations = [
    ...getResultArray(result, ['correlations', 'correlationResults']),
    ...getResultArray(result, ['pearsonCorrelations', 'pearson']),
    ...getResultArray(result, ['spearmanCorrelations', 'spearman']),
  ];

  const statisticalTests = getResultArray(result, [
    'statisticalTests',
    'statistical_tests',
    'hypothesisTests',
    'hypothesis_tests',
    'testResults',
    'tTests',
    't_tests',
  ]);

  const recommendedCharts = getResultArray(result, [
    'recommendedCharts',
    'recommended_charts',
    'charts',
  ]);

  const recommendedTests = getResultArray(result, [
    'recommendedTests',
    'recommended_tests',
    'tests',
  ]);

  const preparedDataset = getPreparedDataset(result);

  return {
    root,
    preparedDataset,
    descriptiveStatistics,
    frequencies,
    reliabilities,
    correlations,
    statisticalTests,
    recommendedCharts,
    recommendedTests,
  };
}

function getOverviewItems(result?: AnalysisResult | null): ChartItem[] {
  if (!result) return [];

  const arrays = getStatisticsArrays(result);
  const root = arrays.root;

  const preparedRows = getPreparedRowCount(result);
  const preparedVariables = getPreparedVariableCount(result);
  const scaleCount = getScaleCount(result);
  const subscaleCount = getSubscaleCount(result);

  const oldRows = getNestedValue(root, [
    ['summary', 'totalRows'],
    ['summary', 'rows'],
    ['summary', 'count'],
    ['descriptiveStatistics', 'totalRows'],
    ['descriptiveStatistics', 'rows'],
    ['data', 'totalRows'],
    ['data', 'rows'],
    ['meta', 'respondentCount'],
    ['statisticalAnalysis', 'meta', 'respondentCount'],
  ]);

  const oldVariables = getNestedValue(root, [
    ['summary', 'totalVariables'],
    ['summary', 'variables'],
    ['variables', 'total'],
    ['variables', 'count'],
    ['descriptiveStatistics', 'totalVariables'],
    ['descriptiveStatistics', 'variables'],
  ]);

  const rowsNumber = preparedRows || toPositiveNumber(oldRows);
  const variablesNumber =
    preparedVariables ||
    toPositiveNumber(oldVariables) ||
    safeArray(root.variables).length;

  const items: ChartItem[] = [];

  if (rowsNumber > 0) {
    items.push({
      label: 'Pripravené raw dáta',
      value: rowsNumber,
      description: 'Počet riadkov po vyčistení a príprave dát.',
    });
  }

  if (variablesNumber > 0) {
    items.push({
      label: 'Premenné',
      value: variablesNumber,
      description: 'Počet rozpoznaných premenných v dátovom súbore.',
    });
  }

  if (scaleCount > 0) {
    items.push({
      label: 'Škály',
      value: scaleCount,
      description: 'Automaticky alebo manuálne definované celkové škály.',
    });
  }

  if (subscaleCount > 0) {
    items.push({
      label: 'Subškály',
      value: subscaleCount,
      description: 'Rozpoznané subškály použité pri výpočtoch.',
    });
  }

  if (arrays.descriptiveStatistics.length > 0) {
    items.push({
      label: 'Deskriptívne výstupy',
      value: arrays.descriptiveStatistics.length,
      description: 'Počet vypočítaných deskriptívnych štatistík.',
    });
  }

  if (arrays.frequencies.length > 0) {
    items.push({
      label: 'Frekvenčné tabuľky',
      value: arrays.frequencies.length,
      description: 'Počet dostupných frekvenčných výstupov.',
    });
  }

  if (arrays.reliabilities.length > 0) {
    items.push({
      label: 'Reliability',
      value: arrays.reliabilities.length,
      description: 'Počet výpočtov Cronbachovej alfy.',
    });
  }

  if (arrays.correlations.length > 0) {
    items.push({
      label: 'Korelácie',
      value: arrays.correlations.length,
      description: 'Počet vypočítaných Pearson/Spearman korelácií.',
    });
  }

  if (arrays.statisticalTests.length > 0) {
    items.push({
      label: 'Štatistické testy',
      value: arrays.statisticalTests.length,
      description: 't-test, ANOVA, Mann-Whitney alebo Kruskal-Wallis.',
    });
  }

  return items;
}

function getQualityItems(result?: AnalysisResult | null): ChartItem[] {
  if (!result) return [];

  const root = result as unknown as UnknownRecord;
  const preparedDataset = getPreparedDataset(result);
  const quality = isRecord(preparedDataset.quality)
    ? preparedDataset.quality
    : {};

  const originalRowCount = toPositiveNumber(quality.originalRowCount);
  const rowCount = getPreparedRowCount(result);
  const removedEmptyRows = getRemovedEmptyRows(result);
  const removedDuplicateRows = getRemovedDuplicateRows(result);

  const dataQuality = getNestedValue(root, [
    ['dataQuality', 'score'],
    ['dataQuality', 'quality'],
    ['quality', 'score'],
    ['summary', 'quality'],
    ['summary', 'score'],
    ['score'],
  ]);

  const completeness = getNestedValue(root, [
    ['dataQuality', 'completeness'],
    ['quality', 'completeness'],
    ['summary', 'completeness'],
    ['descriptiveStatistics', 'completeness'],
    ['completeness'],
  ]);

  const reliability = getNestedValue(root, [
    ['quality', 'reliability'],
    ['summary', 'reliability'],
  ]);

  const items: ChartItem[] = [];

  if (originalRowCount > 0 && rowCount > 0) {
    items.push({
      label: 'Zachované riadky',
      value: clampPercent((rowCount / originalRowCount) * 100),
      description: 'Podiel riadkov zachovaných po príprave raw dát.',
    });
  }

  if (removedEmptyRows > 0 && originalRowCount > 0) {
    items.push({
      label: 'Odstránené prázdne riadky',
      value: clampPercent((removedEmptyRows / originalRowCount) * 100),
      description: 'Podiel prázdnych riadkov odstránených pri príprave.',
    });
  }

  if (removedDuplicateRows > 0 && originalRowCount > 0) {
    items.push({
      label: 'Odstránené duplicity',
      value: clampPercent((removedDuplicateRows / originalRowCount) * 100),
      description: 'Podiel duplicitných riadkov odstránených pri príprave.',
    });
  }

  if (dataQuality !== undefined && dataQuality !== null) {
    items.push({
      label: 'Kvalita dát',
      value: getPercentFromRatio(dataQuality),
      description: 'Orientačné skóre kvality spracovania dát.',
    });
  }

  if (completeness !== undefined && completeness !== null) {
    items.push({
      label: 'Úplnosť dát',
      value: getPercentFromRatio(completeness),
      description: 'Podiel vyplnených a použiteľných údajov.',
    });
  }

  if (reliability !== undefined && reliability !== null) {
    items.push({
      label: 'Spoľahlivosť',
      value: getPercentFromRatio(reliability),
      description: 'Orientačné hodnotenie spoľahlivosti výstupu.',
    });
  }

  return items;
}

function getScaleReliabilityItems(result?: AnalysisResult | null): ChartItem[] {
  const reliabilities = getStatisticsArrays(result).reliabilities;
  const items: ChartItem[] = [];

  for (const item of reliabilities) {
    if (!isRecord(item)) continue;

    const label = normalizeText(
      item.scale ??
        item.scaleName ??
        item.name ??
        item.label ??
        item.variable ??
        'Škála',
    );

    const alpha = toNumber(item.cronbachAlpha ?? item.alpha, NaN);

    if (!Number.isFinite(alpha)) continue;

    items.push({
      label,
      value: clampPercent(alpha * 100),
      description: `Cronbachova alfa: ${formatNumber(alpha)}`,
    });
  }

  return items;
}

function getMeanItems(result?: AnalysisResult | null): ChartItem[] {
  const descriptives = getStatisticsArrays(result).descriptiveStatistics;
  const items: ChartItem[] = [];

  for (const item of descriptives) {
    if (!isRecord(item)) continue;

    const label = normalizeText(
      item.variable ?? item.name ?? item.label ?? item.scale ?? '',
    );

    const mean = toNumber(item.mean ?? item.M ?? item.average, NaN);

    if (!label || !Number.isFinite(mean)) continue;

    items.push({
      label,
      value: mean,
      description: 'Priemer vypočítaný z pripravených raw dát.',
    });

    if (items.length >= 12) break;
  }

  return items;
}

function getCorrelationItems(result?: AnalysisResult | null): ChartItem[] {
  const correlations = getStatisticsArrays(result).correlations;
  const items: ChartItem[] = [];

  for (const item of correlations) {
    if (!isRecord(item)) continue;

    const variable1 = normalizeText(
      item.variable1 ?? item.variableA ?? item.variableX ?? '',
    );

    const variable2 = normalizeText(
      item.variable2 ?? item.variableB ?? item.variableY ?? '',
    );

    const coefficient = toNumber(
      item.coefficient ??
        item.r ??
        item.rho ??
        item.pearsonR ??
        item.spearmanRho,
      NaN,
    );

    if (!Number.isFinite(coefficient)) continue;

    const label =
      variable1 && variable2
        ? `${variable1} × ${variable2}`
        : normalizeText(item.name ?? item.label ?? 'Korelácia');

    items.push({
      label,
      value: Math.abs(coefficient),
      description: `Koeficient: ${formatNumber(coefficient)}`,
    });

    if (items.length >= 12) break;
  }

  return items;
}

function getRecommendedChartItems(result?: AnalysisResult | null): string[] {
  if (!result) return [];

  const root = result as unknown as UnknownRecord;

  const recommendedCharts = getNestedValue(root, [
    ['recommendedCharts'],
    ['recommended_charts'],
    ['charts'],
    ['summary', 'recommendedCharts'],
    ['summary', 'charts'],
    ['visualizations'],
    ['recommendedVisualizations'],
  ]);

  if (Array.isArray(recommendedCharts)) {
    return recommendedCharts
      .map((item) => {
        if (typeof item === 'string') return item;

        if (isRecord(item)) {
          return (
            item.name ??
            item.title ??
            item.label ??
            item.type ??
            item.chart ??
            item.chartType ??
            ''
          );
        }

        return '';
      })
      .map(normalizeText)
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof recommendedCharts === 'string') {
    return recommendedCharts
      .split(/\n|;|,/)
      .map(normalizeText)
      .filter(Boolean)
      .slice(0, 8);
  }

  return [
    'Stĺpcový graf pre frekvenčné tabuľky',
    'Boxplot pre porovnanie škál medzi skupinami',
    'Stĺpcový graf priemerov škál a subškál',
    'Korelačná matica pre Pearson/Spearman korelácie',
  ];
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-400">
      {children}
    </div>
  );
}

function MaxBarChart({ items }: { items: ChartItem[] }) {
  if (!items.length) {
    return (
      <EmptyState>
        Pre túto časť zatiaľ nie sú dostupné číselné údaje na grafické
        zobrazenie.
      </EmptyState>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = clampPercent((item.value / max) * 100);

        return (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {item.label}
                </div>

                {item.description ? (
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 rounded-2xl bg-violet-500/15 px-3 py-1 text-sm font-black text-violet-100">
                {formatNumber(item.value)}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PercentChart({ items }: { items: ChartItem[] }) {
  if (!items.length) {
    return (
      <EmptyState>
        Percentuálne hodnotenie zatiaľ nie je dostupné.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const percent = clampPercent(item.value);

        return (
          <div
            key={item.label}
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {item.label}
                </div>

                {item.description ? (
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div className="text-2xl font-black text-emerald-300">
                {Math.round(percent)} %
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompactBarChart({
  items,
  valueSuffix = '',
}: {
  items: ChartItem[];
  valueSuffix?: string;
}) {
  if (!items.length) {
    return (
      <EmptyState>
        Pre túto časť zatiaľ nie sú dostupné údaje.
      </EmptyState>
    );
  }

  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = clampPercent((Math.abs(item.value) / max) * 100);

        return (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  {item.label}
                </div>

                {item.description ? (
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 rounded-2xl bg-blue-500/15 px-3 py-1 text-sm font-black text-blue-100">
                {formatNumber(item.value)}
                {valueSuffix}
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalysisCharts({
  result,
}: AnalysisChartsProps) {
  const overviewItems = getOverviewItems(result);
  const qualityItems = getQualityItems(result);
  const reliabilityItems = getScaleReliabilityItems(result);
  const meanItems = getMeanItems(result);
  const correlationItems = getCorrelationItems(result);
  const recommendedCharts = getRecommendedChartItems(result);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Prehľad analýzy
            </h3>

            <p className="text-sm text-slate-400">
              Základné ukazovatele z pripraveného raw-data súboru a
              následných štatistických výpočtov.
            </p>
          </div>
        </div>

        <MaxBarChart items={overviewItems} />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
            <TrendingUp className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Kvalita prípravy dát
            </h3>

            <p className="text-sm text-slate-400">
              Percentuálny pohľad na zachované riadky, odstránené duplicity,
              úplnosť a kvalitu dát.
            </p>
          </div>
        </div>

        <PercentChart items={qualityItems} />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
            <Table2 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Priemery škál, subškál a číselných premenných
            </h3>

            <p className="text-sm text-slate-400">
              Grafické porovnanie priemerov z deskriptívnej štatistiky.
            </p>
          </div>
        </div>

        <CompactBarChart items={meanItems} />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
            <Sigma className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Reliabilita škál
            </h3>

            <p className="text-sm text-slate-400">
              Cronbachova alfa zobrazená ako percentuálny ukazovateľ vnútornej
              konzistencie.
            </p>
          </div>
        </div>

        <PercentChart items={reliabilityItems} />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200">
            <LineChart className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Korelačné koeficienty
            </h3>

            <p className="text-sm text-slate-400">
              Absolútna sila Pearsonových alebo Spearmanových korelácií.
            </p>
          </div>
        </div>

        <CompactBarChart items={correlationItems} />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-200">
            <PieChart className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Odporúčané grafy
            </h3>

            <p className="text-sm text-slate-400">
              Typy grafov vhodné pre interpretáciu pripravených raw dát a
              výsledkov štatistického testovania.
            </p>
          </div>
        </div>

        {recommendedCharts.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {recommendedCharts.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-3xl border border-white/10 bg-black/20 p-4"
              >
                <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />

                <div className="text-sm font-bold leading-6 text-slate-100">
                  {item}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">
            Analýza zatiaľ neobsahuje odporúčané typy grafov.
          </div>
        )}
      </section>
    </div>
  );
}