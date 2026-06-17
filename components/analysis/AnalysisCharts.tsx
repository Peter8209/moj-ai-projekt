'use client';

import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Grid3X3,
  LineChart,
  PieChart,
  Sigma,
  Table2,
  TestTube2,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

import type { AnalysisResult } from './analysisTypes';

type AnalysisChartsProps = {
  result?: AnalysisResult | null;
};

type UnknownRecord = Record<string, unknown>;

type ChartItem = {
  label: string;
  value: number;
  description?: string;
  group?: string;
  status?: 'good' | 'warning' | 'danger' | 'info';
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeText(value: unknown): string {
  return String(value ?? '').trim();
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

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 3,
  }).format(value);
}

function getNested(source: unknown, path: string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }

  return current;
}

function getFirstArray(source: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const value = getNested(source, path);

    if (Array.isArray(value)) return value;
  }

  return [];
}

function getRoot(result?: AnalysisResult | null): UnknownRecord {
  return isRecord(result) ? (result as unknown as UnknownRecord) : {};
}

function getStatisticalAnalysis(result?: AnalysisResult | null): UnknownRecord {
  const root = getRoot(result);

  return isRecord(root.statisticalAnalysis)
    ? (root.statisticalAnalysis as UnknownRecord)
    : {};
}

function normalizeRows(value: unknown): UnknownRecord[] {
  return safeArray(value)
    .map((item) => (isRecord(item) ? item : { hodnota: item }))
    .filter((item) => Object.keys(item).length > 0);
}

function getPreparedDataset(result?: AnalysisResult | null): UnknownRecord {
  const root = getRoot(result);
  return isRecord(root.preparedDataset)
    ? (root.preparedDataset as UnknownRecord)
    : {};
}

function getPreparedFile(result?: AnalysisResult | null): UnknownRecord {
  const root = getRoot(result);
  return isRecord(root.preparedFile) ? (root.preparedFile as UnknownRecord) : {};
}

function getChartDataArray(
  result: AnalysisResult | null | undefined,
  key: string,
): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getNested(root, ['chartData', key]);
  if (Array.isArray(direct)) return normalizeRows(direct);

  const nested = getNested(analysis, ['chartData', key]);
  if (Array.isArray(nested)) return normalizeRows(nested);

  const aliases = getNested(analysis, ['aliases', 'chartData', key]);
  if (Array.isArray(aliases)) return normalizeRows(aliases);

  return [];
}

function getPreparedRowCount(result?: AnalysisResult | null): number {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);
  const preparedDataset = getPreparedDataset(result);
  const preparedFile = getPreparedFile(result);

  const candidates = [
    getNested(analysis, ['meta', 'respondentCount']),
    getNested(analysis, ['meta', 'totalRows']),
    getNested(root, ['meta', 'rows']),
    getNested(root, ['meta', 'respondentCount']),
    preparedFile.rows,
    getNested(preparedDataset, ['quality', 'rowCount']),
    getNested(preparedDataset, ['quality', 'cleanRowCount']),
    getNested(preparedDataset, ['quality', 'validRows']),
  ];

  for (const candidate of candidates) {
    const number = toNumber(candidate, 0);
    if (number > 0) return number;
  }

  return 0;
}

function getVariableCount(result?: AnalysisResult | null): number {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);
  const preparedDataset = getPreparedDataset(result);
  const preparedFile = getPreparedFile(result);

  const numericColumns = getNested(analysis, ['meta', 'numericColumns']);

  const candidates = [
    Array.isArray(numericColumns) ? numericColumns.length : 0,
    getNested(root, ['meta', 'columns']),
    getNested(root, ['meta', 'variables']),
    preparedFile.columns,
    getNested(preparedDataset, ['quality', 'variableCount']),
  ];

  for (const candidate of candidates) {
    const number = toNumber(candidate, 0);
    if (number > 0) return number;
  }

  const variables = getFirstArray(root, [['variables']]);
  return variables.length;
}

function getPreparedRawRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const preparedDataset = getPreparedDataset(result);

  const directRows = getFirstArray(root, [
    ['rawData'],
    ['rawRows'],
    ['preparedRows'],
    ['dataRows'],
  ]);

  if (directRows.length) return normalizeRows(directRows);

  const datasetRows = getFirstArray(preparedDataset, [
    ['rows'],
    ['cleanRows'],
    ['dataCleanRows'],
    ['dataRows'],
  ]);

  if (datasetRows.length) return normalizeRows(datasetRows);

  const rawDataSheet = getNested(preparedDataset, ['rawDataSheet']);

  if (
    Array.isArray(rawDataSheet) &&
    rawDataSheet.length > 1 &&
    Array.isArray(rawDataSheet[0])
  ) {
    const headers = rawDataSheet[0].map((header) => safeText(header));
    return rawDataSheet.slice(1).map((row) => {
      const output: UnknownRecord = {};

      if (Array.isArray(row)) {
        headers.forEach((header, index) => {
          if (header) output[header] = row[index];
        });
      }

      return output;
    });
  }

  return [];
}

function getDataQualityRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const preparedDataset = getPreparedDataset(result);
  const preparedFile = getPreparedFile(result);

  const directRows = getFirstArray(root, [
    ['dataQualityRows'],
    ['qualityReport'],
    ['dataQuality'],
  ]);

  if (directRows.length) return normalizeRows(directRows);

  const preparedQualityReport = getFirstArray(preparedFile, [['qualityReport']]);
  if (preparedQualityReport.length) return normalizeRows(preparedQualityReport);

  const quality = isRecord(preparedDataset.quality)
    ? (preparedDataset.quality as UnknownRecord)
    : {};

  const rows = [
    {
      kontrola: 'Pôvodné riadky',
      vysledok: quality.originalRowCount ?? getPreparedRowCount(result),
      stav: 'info',
      poznamka: 'Počet riadkov pred prípravou alebo aktuálny dostupný počet.',
    },
    {
      kontrola: 'Pripravené riadky DATA_CLEAN',
      vysledok: quality.cleanRowCount ?? quality.rowCount ?? getPreparedRowCount(result),
      stav: 'ok',
      poznamka: 'Počet riadkov použitých na štatistiku.',
    },
    {
      kontrola: 'Premenné',
      vysledok: quality.variableCount ?? getVariableCount(result),
      stav: 'ok',
      poznamka: 'Počet premenných po príprave dát.',
    },
    {
      kontrola: 'Odstránené prázdne riadky',
      vysledok: quality.removedEmptyRows ?? 0,
      stav: toNumber(quality.removedEmptyRows, 0) > 0 ? 'warning' : 'ok',
      poznamka: 'Riadky bez použiteľných hodnôt.',
    },
    {
      kontrola: 'Odstránené duplicity',
      vysledok: quality.removedDuplicateRows ?? 0,
      stav: toNumber(quality.removedDuplicateRows, 0) > 0 ? 'warning' : 'ok',
      poznamka: 'Duplicitné záznamy odstránené pri príprave.',
    },
  ];

  return normalizeRows(rows);
}

function getScaleDefinitions(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['scaleDefinitionRows'],
    ['scales'],
    ['scaleDefinitions'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['scaleDefinitions']]));
}

function getSubscaleDefinitions(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['subscaleDefinitionRows'],
    ['subscales'],
    ['subscaleDefinitions'],
    ['combinedScaleDefinitions'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['combinedScaleDefinitions']]));
}

function getScaleScores(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['scaleScores'],
    ['scaleSubscaleScores'],
    ['scaleScoreRows'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(
    getFirstArray(analysis, [['scaleScores'], ['scaleScoreRows']]),
  );
}

function getScaleDescriptives(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['scaleDescriptives'],
    ['scaleSubscaleDescriptives'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['scaleDescriptives']]));
}

function getItemDescriptives(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [['itemDescriptives']]);
  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['itemDescriptives']]));
}

function getReliabilityRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['reliability'],
    ['reliabilities'],
    ['cronbachAlpha'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['reliability']]));
}

function getCorrelationRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = [
    ...getFirstArray(root, [['recommendedCorrelations']]),
    ...getFirstArray(root, [['spearmanCorrelations']]),
    ...getFirstArray(root, [['pearsonCorrelations']]),
    ...getFirstArray(root, [['correlations'], ['correlationResults']]),
  ];

  if (direct.length) return normalizeRows(direct);

  return normalizeRows([
    ...getFirstArray(analysis, [['correlations', 'recommended']]),
    ...getFirstArray(analysis, [['correlations', 'spearman']]),
    ...getFirstArray(analysis, [['correlations', 'pearson']]),
  ]);
}

function getFrequencyRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [['frequencies'], ['frequencyTables']]);
  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['frequencies']]));
}

function getMissingRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [['missingData'], ['missingValues']]);
  if (direct.length) return normalizeRows(direct);

  const fromChart = getChartDataArray(result, 'missingValueBars');
  if (fromChart.length) return fromChart;

  const descriptives = [
    ...getItemDescriptives(result),
    ...getScaleDescriptives(result),
  ];

  return descriptives
    .filter((item) => toNumber(item.missing, 0) > 0)
    .map((item) => ({
      variable: item.variable ?? item.name ?? item.scaleName ?? 'Premenná',
      valid: item.valid ?? 0,
      missing: item.missing ?? 0,
    }));
}

function getParametricTestRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['parametricGroupTests'],
    ['parametricTests'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['groupTests', 'parametric']]));
}

function getNonParametricTestRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['nonParametricGroupTests'],
    ['nonParametricTests'],
    ['nonparametricTests'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['groupTests', 'nonParametric']]));
}

function getRecommendedTestRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['recommendedGroupTests'],
    ['recommendedTests'],
    ['recommendedStatisticalTests'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(getFirstArray(analysis, [['groupTests', 'recommended']]));
}

function getContingencyRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['contingencyTables'],
    ['contingency'],
    ['contingencyRows'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(
    getFirstArray(analysis, [
      ['contingencyTables'],
      ['aliases', 'contingencyTables'],
    ]),
  );
}

function getChiSquareRows(result?: AnalysisResult | null): UnknownRecord[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const direct = getFirstArray(root, [
    ['chiSquareTests'],
    ['chiSquare'],
    ['chiSquareResults'],
  ]);

  if (direct.length) return normalizeRows(direct);

  return normalizeRows(
    getFirstArray(analysis, [
      ['chiSquareTests'],
      ['aliases', 'chiSquareTests'],
    ]),
  );
}

function chartPointsFromRows(
  value: unknown,
  options?: {
    labelKeys?: string[];
    valueKeys?: string[];
    descriptionKeys?: string[];
    limit?: number;
    statusByValue?: (value: number) => ChartItem['status'];
    absolute?: boolean;
    multiplier?: number;
  },
): ChartItem[] {
  const labelKeys = options?.labelKeys ?? [
    'label',
    'name',
    'variable',
    'scaleName',
    'subscaleName',
    'title',
    'testType',
    'dependentVariable',
    'groupVariable',
  ];

  const valueKeys = options?.valueKeys ?? [
    'value',
    'mean',
    'count',
    'valid',
    'missing',
    'cronbachAlpha',
    'r',
    'rho',
    'statistic',
    'chiSquare',
    'cramersV',
  ];

  const descriptionKeys = options?.descriptionKeys ?? [
    'description',
    'interpretation',
    'note',
    'significance',
    'recommendation',
  ];

  const limit = options?.limit ?? 30;
  const rows = normalizeRows(value);
  const items: ChartItem[] = [];

  for (const row of rows) {
    const variableA = safeText(row.variableA ?? row.variable1 ?? row.rowVariable);
    const variableB = safeText(row.variableB ?? row.variable2 ?? row.columnVariable);

    const label =
      labelKeys.map((key) => safeText(row[key])).find(Boolean) ||
      (variableA && variableB ? `${variableA} × ${variableB}` : '');

    const rawValue = valueKeys.map((key) => row[key]).find((candidate) => {
      const parsed = toNumber(candidate, Number.NaN);
      return Number.isFinite(parsed);
    });

    let valueNumber = toNumber(rawValue, Number.NaN);

    if (!label || !Number.isFinite(valueNumber)) continue;

    if (options?.absolute) valueNumber = Math.abs(valueNumber);
    if (typeof options?.multiplier === 'number') {
      valueNumber *= options.multiplier;
    }

    const description = descriptionKeys
      .map((key) => safeText(row[key]))
      .find(Boolean);

    items.push({
      label,
      value: valueNumber,
      description,
      status: options?.statusByValue?.(valueNumber),
    });

    if (items.length >= limit) break;
  }

  return items;
}

function getOverviewItems(result?: AnalysisResult | null): ChartItem[] {
  const rows = getPreparedRowCount(result);
  const variables = getVariableCount(result);
  const rawRows = getPreparedRawRows(result);
  const qualityRows = getDataQualityRows(result);
  const scaleDefinitions = getScaleDefinitions(result);
  const subscaleDefinitions = getSubscaleDefinitions(result);
  const scaleScores = getScaleScores(result);
  const scaleDescriptives = getScaleDescriptives(result);
  const itemDescriptives = getItemDescriptives(result);
  const frequencyRows = getFrequencyRows(result);
  const reliabilityRows = getReliabilityRows(result);
  const correlationRows = getCorrelationRows(result);
  const missingRows = getMissingRows(result);
  const parametricTests = getParametricTestRows(result);
  const nonParametricTests = getNonParametricTestRows(result);
  const contingencyRows = getContingencyRows(result);
  const chiSquareRows = getChiSquareRows(result);
  const recommendedTests = getRecommendedTestRows(result);

  return [
    {
      label: '02 Raw-data',
      value: rawRows.length || rows,
      description: 'Riadky pripravené v DATA_CLEAN alebo dostupné raw dáta.',
      status: rows > 0 || rawRows.length > 0 ? 'good' : 'warning',
    },
    {
      label: '04 Data-quality',
      value: qualityRows.length,
      description: 'Kontroly kvality dát a prípravy súboru.',
      status: qualityRows.length > 0 ? 'good' : 'warning',
    },
    {
      label: 'Premenné',
      value: variables,
      description: 'Počet rozpoznaných premenných.',
      status: variables > 0 ? 'info' : 'warning',
    },
    {
      label: '09 Škály',
      value: scaleDefinitions.length,
      description: 'Definované alebo automaticky rozpoznané škály.',
      status: scaleDefinitions.length > 0 ? 'good' : 'warning',
    },
    {
      label: '09 Podškály',
      value: subscaleDefinitions.length,
      description: 'Kombinované škály a subškály.',
      status: subscaleDefinitions.length > 0 ? 'good' : 'warning',
    },
    {
      label: 'Skóre škál/subškál',
      value: scaleScores.length,
      description: 'Vypočítané skóre po respondentoch.',
      status: scaleScores.length > 0 ? 'good' : 'warning',
    },
    {
      label: 'Deskriptíva škál',
      value: scaleDescriptives.length,
      description: 'Priemery, SD a rozptyl škál/subškál.',
      status: scaleDescriptives.length > 0 ? 'info' : 'warning',
    },
    {
      label: 'Deskriptíva položiek',
      value: itemDescriptives.length,
      description: 'Položkové deskriptívne štatistiky.',
      status: itemDescriptives.length > 0 ? 'info' : 'warning',
    },
    {
      label: 'Frekvencie',
      value: frequencyRows.length,
      description: 'Frekvenčné tabuľky.',
      status: frequencyRows.length > 0 ? 'info' : 'warning',
    },
    {
      label: 'Reliabilita',
      value: reliabilityRows.length,
      description: 'Cronbachovo alfa pre škály.',
      status: reliabilityRows.length > 0 ? 'good' : 'warning',
    },
    {
      label: 'Korelácie',
      value: correlationRows.length,
      description: 'Pearson/Spearman korelácie.',
      status: correlationRows.length > 0 ? 'info' : 'warning',
    },
    {
      label: 'Chýbajúce údaje',
      value: missingRows.length,
      description: 'Premenné s chýbajúcimi hodnotami.',
      status: missingRows.length > 0 ? 'warning' : 'good',
    },
    {
      label: '16 Param testy',
      value: parametricTests.length,
      description: 't-test a ANOVA.',
      status: parametricTests.length > 0 ? 'info' : 'warning',
    },
    {
      label: '17 Neparam testy',
      value: nonParametricTests.length,
      description: 'Mann-Whitney U a Kruskal-Wallis.',
      status: nonParametricTests.length > 0 ? 'info' : 'warning',
    },
    {
      label: '18 Kontingenčné tabuľky',
      value: contingencyRows.length,
      description: 'Krížové tabuľky kategórií.',
      status: contingencyRows.length > 0 ? 'info' : 'warning',
    },
    {
      label: '19 Chi-square',
      value: chiSquareRows.length,
      description: 'Chi-square testy a Cramerovo V.',
      status: chiSquareRows.length > 0 ? 'info' : 'warning',
    },
    {
      label: '20 Odporúčané testy',
      value: recommendedTests.length,
      description: 'Automaticky odporúčané testy.',
      status: recommendedTests.length > 0 ? 'good' : 'warning',
    },
  ];
}

function getRawDataItems(result?: AnalysisResult | null): ChartItem[] {
  const rows = getPreparedRawRows(result);
  const rowCount = rows.length || getPreparedRowCount(result);
  const variableCount = getVariableCount(result);

  return [
    {
      label: 'Riadky DATA_CLEAN',
      value: rowCount,
      description: 'Počet riadkov, z ktorých sa počíta štatistika.',
      status: rowCount > 0 ? 'good' : 'warning',
    },
    {
      label: 'Premenné',
      value: variableCount,
      description: 'Počet dostupných stĺpcov po príprave.',
      status: variableCount > 0 ? 'info' : 'warning',
    },
  ];
}

function getDataQualityItems(result?: AnalysisResult | null): ChartItem[] {
  return getDataQualityRows(result).map((row) => {
    const value = toNumber(row.vysledok ?? row.value ?? row.count ?? row.hodnota, 0);
    const statusText = safeText(row.stav ?? row.status).toLowerCase();

    const status: ChartItem['status'] =
      statusText.includes('error') || statusText.includes('danger')
        ? 'danger'
        : statusText.includes('warn')
          ? 'warning'
          : statusText.includes('ok') || statusText.includes('good')
            ? 'good'
            : 'info';

    return {
      label: safeText(row.kontrola ?? row.label ?? row.name ?? row.metric) || 'Kontrola',
      value,
      description: safeText(row.poznamka ?? row.description ?? row.note),
      status,
    };
  });
}

function getScaleMeanItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'scaleScoreBars'),
    {
      valueKeys: ['value', 'mean'],
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getScaleDescriptives(result), {
    labelKeys: ['variable', 'scaleName', 'name'],
    valueKeys: ['mean', 'M', 'average'],
    limit: 30,
  });
}

function getSubscaleMeanItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'subscaleScoreBars'),
    {
      valueKeys: ['value', 'mean'],
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  const subscaleNames = new Set(
    getSubscaleDefinitions(result)
      .map((item) => safeText(item.subscaleName ?? item.name ?? item.scaleName))
      .filter(Boolean),
  );

  const scaleRows = getScaleDescriptives(result).filter((item) => {
    const name = safeText(item.variable ?? item.scaleName ?? item.name);

    return (
      subscaleNames.has(name) ||
      /subšk|subsk|subscale|energia|zmyslupl|nadšen|nadsen|absorp|odmiet|vrelosť|vrelost|hyperprotekt|akcept|vylúčen|vylucen/i.test(name)
    );
  });

  return chartPointsFromRows(scaleRows, {
    labelKeys: ['variable', 'scaleName', 'name'],
    valueKeys: ['mean', 'M', 'average'],
    limit: 30,
  });
}

function getReliabilityItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'reliabilityBars'),
    {
      valueKeys: ['value', 'cronbachAlpha', 'alpha'],
      limit: 30,
      statusByValue: (value) =>
        value >= 70 ? 'good' : value >= 60 ? 'warning' : 'danger',
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getReliabilityRows(result), {
    labelKeys: ['scaleName', 'scale', 'name', 'variable'],
    valueKeys: ['cronbachAlpha', 'alpha'],
    descriptionKeys: ['interpretation'],
    limit: 30,
    statusByValue: (value) =>
      value >= 0.7 ? 'good' : value >= 0.6 ? 'warning' : 'danger',
  }).map((item) => ({
    ...item,
    value: item.value <= 1 ? item.value * 100 : item.value,
  }));
}

function getCorrelationItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'correlationBars'),
    {
      valueKeys: ['value', 'r', 'rho', 'coefficient'],
      absolute: true,
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return getCorrelationRows(result)
    .map((item) => {
      const variableA = safeText(item.variableA ?? item.variable1 ?? item.variableX);
      const variableB = safeText(item.variableB ?? item.variable2 ?? item.variableY);
      const r = toNumber(
        item.r ?? item.rho ?? item.coefficient ?? item.pearsonR ?? item.spearmanRho,
        Number.NaN,
      );

      if (!Number.isFinite(r)) return null;

      return {
        label: variableA && variableB ? `${variableA} × ${variableB}` : 'Korelácia',
        value: Math.abs(r),
        description: `Koeficient: ${formatNumber(r)}${item.pValueText ? `, p=${safeText(item.pValueText)}` : ''}`,
        status:
          Math.abs(r) >= 0.5
            ? 'good'
            : Math.abs(r) >= 0.3
              ? 'warning'
              : 'info',
      } satisfies ChartItem;
    })
    .filter(Boolean)
    .sort((a, b) => (b as ChartItem).value - (a as ChartItem).value)
    .slice(0, 30) as ChartItem[];
}

function getMissingItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'missingValueBars'),
    {
      valueKeys: ['value', 'missing'],
      limit: 30,
      statusByValue: (value) => (value > 0 ? 'warning' : 'good'),
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getMissingRows(result), {
    labelKeys: ['variable', 'name', 'scaleName'],
    valueKeys: ['missing', 'value'],
    limit: 30,
    statusByValue: (value) => (value > 0 ? 'warning' : 'good'),
  });
}

function getFrequencyItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'frequencyBars'),
    {
      valueKeys: ['value', 'count'],
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  const rows = getFrequencyRows(result);
  const expanded: ChartItem[] = [];

  rows.forEach((frequency) => {
    const variable = safeText(frequency.variable ?? frequency.name ?? frequency.label);

    const values = Array.isArray(frequency.values)
      ? (frequency.values as UnknownRecord[])
      : [];

    values.slice(0, 6).forEach((item) => {
      const valueLabel = safeText(item.value ?? item.label);
      const count = toNumber(item.count, Number.NaN);

      if (!Number.isFinite(count)) return;

      expanded.push({
        label: variable && valueLabel ? `${variable}: ${valueLabel}` : valueLabel || variable,
        value: count,
        description: item.validPercent
          ? `Validné %: ${safeText(item.validPercent)}`
          : undefined,
        status: 'info',
      });
    });
  });

  if (expanded.length) return expanded.slice(0, 30);

  return chartPointsFromRows(rows, {
    labelKeys: ['label', 'variable', 'value'],
    valueKeys: ['count', 'valid', 'total'],
    limit: 30,
  });
}

function getParametricTestItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'parametricTestBars'),
    {
      valueKeys: ['value', 'statistic', 'f', 't'],
      absolute: true,
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getParametricTestRows(result), {
    labelKeys: ['label', 'dependentVariable', 'testType', 'groupVariable'],
    valueKeys: ['statistic', 'f', 't'],
    descriptionKeys: ['pValueText', 'significance', 'recommendation'],
    absolute: true,
    limit: 30,
  });
}

function getNonParametricTestItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'nonParametricTestBars'),
    {
      valueKeys: ['value', 'statistic', 'u', 'h'],
      absolute: true,
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getNonParametricTestRows(result), {
    labelKeys: ['label', 'dependentVariable', 'testType', 'groupVariable'],
    valueKeys: ['statistic', 'u', 'h'],
    descriptionKeys: ['pValueText', 'significance', 'recommendation'],
    absolute: true,
    limit: 30,
  });
}

function getContingencyItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'contingencyBars'),
    {
      valueKeys: ['value', 'total', 'count', 'n'],
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getContingencyRows(result), {
    labelKeys: ['label', 'tableName', 'rowVariable', 'columnVariable', 'variableA', 'variableB'],
    valueKeys: ['total', 'count', 'n', 'value'],
    limit: 30,
  });
}

function getChiSquareItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'chiSquareBars'),
    {
      valueKeys: ['value', 'chiSquare', 'statistic', 'cramersV'],
      absolute: true,
      limit: 30,
      statusByValue: (value) => (value > 0 ? 'info' : 'warning'),
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getChiSquareRows(result), {
    labelKeys: ['label', 'testName', 'rowVariable', 'columnVariable', 'variableA', 'variableB'],
    valueKeys: ['chiSquare', 'statistic', 'cramersV', 'value'],
    descriptionKeys: ['pValueText', 'significance', 'interpretation'],
    absolute: true,
    limit: 30,
  });
}

function getRecommendedTestItems(result?: AnalysisResult | null): ChartItem[] {
  const fromChartData = chartPointsFromRows(
    getChartDataArray(result, 'recommendedTestBars'),
    {
      valueKeys: ['value', 'statistic', 'priority', 'score'],
      absolute: true,
      limit: 30,
    },
  );

  if (fromChartData.length) return fromChartData;

  return chartPointsFromRows(getRecommendedTestRows(result), {
    labelKeys: ['label', 'dependentVariable', 'testType', 'test', 'name'],
    valueKeys: ['statistic', 'priority', 'score', 'value'],
    descriptionKeys: ['recommendation', 'reason', 'pValueText', 'significance'],
    absolute: true,
    limit: 30,
  });
}

function getRecommendedChartItems(result?: AnalysisResult | null): string[] {
  const root = getRoot(result);
  const analysis = getStatisticalAnalysis(result);

  const candidates = [
    getFirstArray(root, [['recommendedCharts']]),
    getFirstArray(root, [['charts']]),
    getFirstArray(root, [['chartTables']]),
    getFirstArray(analysis, [['chartTables']]),
    getFirstArray(analysis, [['aliases', 'recommendedCharts']]),
  ].find((items) => items.length > 0);

  if (candidates?.length) {
    return candidates
      .map((item) => {
        if (typeof item === 'string') return item;

        if (isRecord(item)) {
          return safeText(item.title ?? item.name ?? item.type ?? item.key);
        }

        return '';
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  return [
    'Stĺpcový graf priemerov škál a podškál',
    'Graf reliability – Cronbachovo alfa',
    'Graf chýbajúcich údajov po premenných',
    'Graf najsilnejších Spearmanových/Pearsonových korelácií',
    'Frekvenčný graf kategorizovaných premenných',
    'Kontingenčný graf pre dvojice kategorizovaných premenných',
    'Graf významnosti Chi-square testov',
    'Graf odporúčaných testov podľa charakteru premenných',
  ];
}

function statusClasses(status?: ChartItem['status']): string {
  if (status === 'good') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
  }

  if (status === 'warning') {
    return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  }

  if (status === 'danger') {
    return 'border-red-400/30 bg-red-500/10 text-red-100';
  }

  return 'border-blue-400/30 bg-blue-500/10 text-blue-100';
}

function gradientByStatus(status?: ChartItem['status']): string {
  if (status === 'good') return 'from-emerald-400 via-teal-400 to-cyan-400';
  if (status === 'warning') return 'from-amber-400 via-orange-400 to-yellow-300';
  if (status === 'danger') return 'from-red-500 via-rose-500 to-pink-500';
  return 'from-violet-500 via-blue-500 to-cyan-400';
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5 text-sm font-semibold leading-6 text-amber-100">
      {children}
    </div>
  );
}

function ChartSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.075] via-white/[0.035] to-black/20 p-5 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.09] text-violet-100 shadow-lg shadow-black/20">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="break-words text-lg font-black text-white">
            {title}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function OverviewGrid({ items }: { items: ChartItem[] }) {
  if (!items.length) {
    return <EmptyState>Zatiaľ nie sú dostupné prehľadové údaje.</EmptyState>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-3xl border p-4 shadow-lg shadow-black/20 ${statusClasses(
            item.status,
          )}`}
        >
          <div className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
            {item.label}
          </div>

          <div className="mt-2 text-3xl font-black text-white">
            {formatNumber(item.value)}
          </div>

          {item.description ? (
            <div className="mt-2 text-xs font-semibold leading-5 opacity-80">
              {item.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({
  items,
  valueSuffix = '',
  percentMode = false,
}: {
  items: ChartItem[];
  valueSuffix?: string;
  percentMode?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyState>
        Pre túto časť zatiaľ nie sú dostupné číselné údaje na grafické zobrazenie.
      </EmptyState>
    );
  }

  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = percentMode ? clampPercent(item.value) : item.value;
        const width = percentMode
          ? clampPercent(value)
          : clampPercent((Math.abs(value) / max) * 100);

        return (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/20"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="break-words text-sm font-black text-white">
                  {item.label}
                </div>

                {item.description ? (
                  <div className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {item.description}
                  </div>
                ) : null}
              </div>

              <div
                className={`shrink-0 rounded-2xl border px-3 py-1 text-sm font-black ${statusClasses(
                  item.status,
                )}`}
              >
                {formatNumber(value)}
                {valueSuffix}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradientByStatus(
                  item.status,
                )} transition-all duration-500`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendedCharts({ items }: { items: string[] }) {
  if (!items.length) {
    return <EmptyState>Odporúčané grafy zatiaľ nie sú dostupné.</EmptyState>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/20"
        >
          <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />
          <div className="text-sm font-bold leading-6 text-slate-100">
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisCharts({ result }: AnalysisChartsProps) {
  const overviewItems = getOverviewItems(result);
  const rawDataItems = getRawDataItems(result);
  const dataQualityItems = getDataQualityItems(result);
  const scaleMeanItems = getScaleMeanItems(result);
  const subscaleMeanItems = getSubscaleMeanItems(result);
  const reliabilityItems = getReliabilityItems(result);
  const missingItems = getMissingItems(result);
  const correlationItems = getCorrelationItems(result);
  const frequencyItems = getFrequencyItems(result);
  const parametricTestItems = getParametricTestItems(result);
  const nonParametricTestItems = getNonParametricTestItems(result);
  const contingencyItems = getContingencyItems(result);
  const chiSquareItems = getChiSquareItems(result);
  const recommendedTestItems = getRecommendedTestItems(result);
  const recommendedCharts = getRecommendedChartItems(result);

  return (
    <div className="space-y-5">
      <ChartSection
        icon={<BarChart3 className="h-5 w-5" />}
        title="Prehľad analýzy"
        description="Farebne označený súhrn pripravených raw dát, škál, subškál, testov, kvality údajov a grafických výstupov."
      >
        <OverviewGrid items={overviewItems} />
      </ChartSection>

      <ChartSection
        icon={<Database className="h-5 w-5" />}
        title="02 Raw-data"
        description="Kontrola, či sú raw dáta pripravené a či má DATA_CLEAN použiteľné riadky a premenné."
      >
        <HorizontalBarChart items={rawDataItems} />
      </ChartSection>

      <ChartSection
        icon={<ClipboardCheck className="h-5 w-5" />}
        title="04 Data-quality"
        description="Farebné kontroly kvality dát, odstránených prázdnych riadkov, duplicít a pripravených premenných."
      >
        <HorizontalBarChart items={dataQualityItems} />
      </ChartSection>

      <ChartSection
        icon={<Sigma className="h-5 w-5" />}
        title="09 Škály – priemery"
        description="Vizuálne porovnanie priemerov vypočítaných celkových škál."
      >
        <HorizontalBarChart items={scaleMeanItems} />
      </ChartSection>

      <ChartSection
        icon={<Table2 className="h-5 w-5" />}
        title="09 Podškály – priemery"
        description="Vizuálne porovnanie subškál a kombinovaných škálových výpočtov."
      >
        <HorizontalBarChart items={subscaleMeanItems} />
      </ChartSection>

      <ChartSection
        icon={<TrendingUp className="h-5 w-5" />}
        title="Reliabilita – Cronbachovo alfa"
        description="Farebné zobrazenie vnútornej konzistencie škál a subškál. Hodnoty sú prepočítané na percentá."
      >
        <HorizontalBarChart items={reliabilityItems} valueSuffix=" %" percentMode />
      </ChartSection>

      <ChartSection
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Chýbajúce údaje"
        description="Premenné alebo škály, pri ktorých boli zistené chýbajúce hodnoty."
      >
        <HorizontalBarChart items={missingItems} />
      </ChartSection>

      <ChartSection
        icon={<LineChart className="h-5 w-5" />}
        title="Najsilnejšie korelácie"
        description="Korelačné koeficienty zoradené podľa absolútnej hodnoty."
      >
        <HorizontalBarChart items={correlationItems} />
      </ChartSection>

      <ChartSection
        icon={<PieChart className="h-5 w-5" />}
        title="Frekvenčné výstupy"
        description="Najvýraznejšie frekvenčné hodnoty z kategorizovaných premenných."
      >
        <HorizontalBarChart items={frequencyItems} />
      </ChartSection>

      <ChartSection
        icon={<TestTube2 className="h-5 w-5" />}
        title="16 Parametrické testy"
        description="t-test a ANOVA zobrazené podľa veľkosti testovej štatistiky."
      >
        <HorizontalBarChart items={parametricTestItems} />
      </ChartSection>

      <ChartSection
        icon={<TestTube2 className="h-5 w-5" />}
        title="17 Neparametrické testy"
        description="Mann-Whitney U a Kruskal-Wallis podľa veľkosti testovej štatistiky."
      >
        <HorizontalBarChart items={nonParametricTestItems} />
      </ChartSection>

      <ChartSection
        icon={<Grid3X3 className="h-5 w-5" />}
        title="18 Kontingenčné tabuľky"
        description="Krížové tabuľky kategorizovaných premenných a ich početnosti."
      >
        <HorizontalBarChart items={contingencyItems} />
      </ChartSection>

      <ChartSection
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="19 Chi-square"
        description="Chi-square testy vrátane Cramerovho V, ak sú dostupné."
      >
        <HorizontalBarChart items={chiSquareItems} />
      </ChartSection>

      <ChartSection
        icon={<FileSpreadsheet className="h-5 w-5" />}
        title="20 Odporúčané testy"
        description="Automaticky odporúčané testy podľa typu premenných, skupín a normality."
      >
        <HorizontalBarChart items={recommendedTestItems} />
      </ChartSection>

      <ChartSection
        icon={<LineChart className="h-5 w-5" />}
        title="21 Odporúčané grafy"
        description="Návrh grafov, ktoré je vhodné vložiť do praktickej alebo analytickej časti práce."
      >
        <RecommendedCharts items={recommendedCharts} />
      </ChartSection>
    </div>
  );
}
