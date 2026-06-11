'use client';

import { BarChart3, LineChart, ScatterChart } from 'lucide-react';

type AnyRecord = Record<string, any>;

type Props = {
  result?: any;
  data?: any;
  tables?: any[];
  maxCharts?: number;
};

type ChartType = 'bar' | 'histogram' | 'scatter' | 'line';

type ChartPoint = {
  label?: string;
  x?: number;
  y?: number;
  value?: number;
};

type ChartConfig = {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  points: ChartPoint[];
};

const TECHNICAL_COLUMNS = [
  'id',
  'ID',
  'Id',
  'respondent',
  'respondent_id',
  'respondent id',
  'Respondent',
  'Respondent ID',
  'index',
  'poradie',
  'Poradie',
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

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^\w]/g, '');
}

function isTechnicalColumn(value: unknown) {
  const normalized = normalizeText(value);

  return TECHNICAL_COLUMNS.map(normalizeText).includes(normalized);
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .replace(/\s/g, '')
      .replace('%', '')
      .replace(',', '.');

    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
      const numeric = Number(normalized);
      return Number.isFinite(numeric) ? numeric : null;
    }
  }

  return null;
}

function cleanLabel(value: unknown) {
  const text = String(value ?? '').trim();
  return text || '—';
}

function uniqueById(charts: ChartConfig[]) {
  const seen = new Set<string>();

  return charts.filter((chart) => {
    const key = normalizeText(chart.id || chart.title);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function getStatisticalSource(result: any) {
  return result?.statisticalAnalysis || result?.analysisStats || result?.stats || result || {};
}

function getNestedArray<T = any>(source: any, path: string): T[] {
  const parts = path.split('.');
  let current = source;

  for (const part of parts) {
    current = current?.[part];
  }

  return safeArray<T>(current);
}

function getFrequencyRows(table: any): AnyRecord[] {
  if (!table || typeof table !== 'object') return [];

  const rows =
    safeArray<AnyRecord>(table.values).length > 0
      ? safeArray<AnyRecord>(table.values)
      : safeArray<AnyRecord>(table.rows).length > 0
        ? safeArray<AnyRecord>(table.rows)
        : safeArray<AnyRecord>(table.data).length > 0
          ? safeArray<AnyRecord>(table.data)
          : safeArray<AnyRecord>(table.items);

  return rows;
}

function getFrequencies(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.frequencies ||
      result?.frequencies ||
      result?.frequencyTables ||
      result?.frequency_tables,
  );
}

function getScaleDescriptives(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.scaleDescriptives ||
      result?.scaleDescriptives ||
      result?.scale_descriptives ||
      result?.scalesDescriptiveStatistics,
  );
}

function getItemDescriptives(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.itemDescriptives ||
      result?.itemDescriptives ||
      result?.descriptiveStatistics ||
      result?.descriptive_statistics ||
      result?.statistics,
  );
}

function getNormality(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(statistical?.normality || result?.normality);
}

function getPearsonCorrelations(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.correlations?.pearson ||
      result?.pearsonCorrelations ||
      result?.pearson_correlations ||
      result?.pearson,
  );
}

function getSpearmanCorrelations(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.correlations?.spearman ||
      result?.spearmanCorrelations ||
      result?.spearman_correlations ||
      result?.spearman,
  );
}

function getRecommendedCorrelations(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.correlations?.recommended ||
      result?.recommendedCorrelations ||
      result?.recommended_correlations,
  );
}

function getReliability(result: any) {
  const statistical = getStatisticalSource(result);

  return safeArray(
    statistical?.reliability ||
      result?.reliability ||
      result?.cronbachAlpha ||
      result?.cronbach_alpha,
  );
}

function getGroupTests(result: any) {
  const statistical = getStatisticalSource(result);

  return [
    ...safeArray(statistical?.groupTests?.recommended),
    ...safeArray(result?.recommendedGroupTests),
    ...safeArray(statistical?.groupTests?.parametric),
    ...safeArray(statistical?.groupTests?.nonParametric),
    ...safeArray(result?.parametricGroupTests),
    ...safeArray(result?.nonParametricGroupTests),
    ...safeArray(result?.tTests || result?.t_tests),
    ...safeArray(result?.hypothesisTests || result?.hypothesis_tests),
  ];
}

function normalizeCorrelationRow(row: any) {
  if (!isRecord(row)) return null;

  const variable1 =
    row.variable1 ||
    row.variableA ||
    row.x ||
    row.firstVariable ||
    row.left ||
    row.source;

  const variable2 =
    row.variable2 ||
    row.variableB ||
    row.y ||
    row.secondVariable ||
    row.right ||
    row.target;

  const coefficient =
    toNumber(row.coefficient) ??
    toNumber(row.r) ??
    toNumber(row.rho) ??
    toNumber(row.value);

  if (coefficient === null) return null;

  const left = cleanLabel(variable1);
  const right = cleanLabel(variable2);

  if (left === '—' || right === '—') return null;
  if (isTechnicalColumn(left) || isTechnicalColumn(right)) return null;

  return {
    label: `${left} × ${right}`,
    value: coefficient,
  };
}

function buildFrequencyCharts(result: any): ChartConfig[] {
  const output: ChartConfig[] = [];
  const frequencies = getFrequencies(result);

  frequencies.forEach((table: any, index) => {
    const variableName = cleanLabel(
      table?.variable || table?.name || table?.title || `Premenná ${index + 1}`,
    );

    if (isTechnicalColumn(variableName)) return;

    const rows = getFrequencyRows(table)
      .map((row) => {
        const label =
          row.value ??
          row.category ??
          row.name ??
          row.label ??
          row.kategoria ??
          row.hodnota;

        const value =
          toNumber(row.frequency) ??
          toNumber(row.count) ??
          toNumber(row.n) ??
          toNumber(row.počet) ??
          toNumber(row.pocet) ??
          0;

        return {
          label: cleanLabel(label),
          value,
        };
      })
      .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

    if (rows.length < 1) return;

    output.push({
      id: `frequency-${variableName}-${index}`,
      type: 'bar',
      title: `Frekvenčný graf – ${variableName}`,
      description:
        'Stĺpcový graf zobrazuje početnosti jednotlivých odpovedí alebo kategórií. ID/respondent sa automaticky vynecháva.',
      xLabel: variableName,
      yLabel: 'Počet',
      points: rows.slice(0, 20),
    });
  });

  return output;
}

function buildScaleDescriptiveCharts(result: any): ChartConfig[] {
  const scaleDescriptives = getScaleDescriptives(result);

  const meanPoints = scaleDescriptives
    .map((row: any) => {
      const label = row.variable || row.scaleName || row.name || row.label || row.column;
      const value = toNumber(row.mean ?? row.M ?? row.average);

      return {
        label: cleanLabel(label),
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  const sdPoints = scaleDescriptives
    .map((row: any) => {
      const label = row.variable || row.scaleName || row.name || row.label || row.column;
      const value = toNumber(
        row.standardDeviation ?? row.stdDeviation ?? row.SD ?? row.sd,
      );

      return {
        label: cleanLabel(label),
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  const charts: ChartConfig[] = [];

  if (meanPoints.length > 0) {
    charts.push({
      id: 'scale-descriptive-means',
      type: 'bar',
      title: 'Priemery škál a subškál',
      description:
        'Hlavný graf pre deskriptívnu štatistiku. Zobrazuje priemerné hodnoty škál a subškál dotazníka.',
      xLabel: 'Škála / subškála',
      yLabel: 'Priemer',
      points: meanPoints.slice(0, 25),
    });
  }

  if (sdPoints.length > 0) {
    charts.push({
      id: 'scale-descriptive-standard-deviations',
      type: 'bar',
      title: 'Smerodajné odchýlky škál a subškál',
      description:
        'Graf zobrazuje variabilitu výsledkov pri jednotlivých škálach a subškálach.',
      xLabel: 'Škála / subškála',
      yLabel: 'SD',
      points: sdPoints.slice(0, 25),
    });
  }

  return charts;
}

function buildItemDescriptiveFallbackCharts(result: any): ChartConfig[] {
  const descriptive = getItemDescriptives(result);

  const points = descriptive
    .map((row: any) => {
      const label = row.variable || row.name || row.label || row.column;
      const value = toNumber(row.M ?? row.mean ?? row.average);

      return {
        label: cleanLabel(label),
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  if (!points.length) return [];

  return [
    {
      id: 'item-descriptive-means',
      type: 'bar',
      title: 'Porovnanie priemerov položiek',
      description:
        'Graf zobrazuje priemerné hodnoty jednotlivých položiek. Pre finálnu prácu je vhodnejšie použiť grafy škál a subškál.',
      xLabel: 'Položka',
      yLabel: 'Priemer',
      points: points.slice(0, 25),
    },
  ];
}

function buildNormalityCharts(result: any): ChartConfig[] {
  const normality = getNormality(result);

  const points = normality
    .map((row: any) => {
      const label = row.variable || row.scaleName || row.name || row.label;
      const value = toNumber(row.pValue ?? row.p);

      return {
        label: cleanLabel(label),
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  if (!points.length) return [];

  return [
    {
      id: 'normality-p-values',
      type: 'bar',
      title: 'Normalita dát – p hodnoty',
      description:
        'Graf zobrazuje p hodnoty testu normality pre škály a subškály. Hodnota p ≥ 0,05 naznačuje približne normálne rozdelenie.',
      xLabel: 'Škála / subškála',
      yLabel: 'p hodnota',
      points: points.slice(0, 25),
    },
  ];
}

function buildCorrelationCharts(result: any): ChartConfig[] {
  const recommended = getRecommendedCorrelations(result)
    .map(normalizeCorrelationRow)
    .filter(Boolean) as ChartPoint[];

  const pearson = getPearsonCorrelations(result)
    .map(normalizeCorrelationRow)
    .filter(Boolean) as ChartPoint[];

  const spearman = getSpearmanCorrelations(result)
    .map(normalizeCorrelationRow)
    .filter(Boolean) as ChartPoint[];

  const charts: ChartConfig[] = [];

  if (recommended.length > 0) {
    charts.push({
      id: 'recommended-correlation-strengths',
      type: 'bar',
      title: 'Odporúčané korelačné koeficienty',
      description:
        'Graf zobrazuje odporúčanú korelačnú analýzu podľa normality dát – Pearson alebo Spearman.',
      xLabel: 'Dvojica škál',
      yLabel: 'Koeficient',
      points: recommended.slice(0, 25),
    });

    return charts;
  }

  if (pearson.length > 0) {
    charts.push({
      id: 'pearson-correlation-strengths',
      type: 'bar',
      title: 'Pearsonove korelačné koeficienty',
      description:
        'Graf zobrazuje Pearsonove korelácie medzi škálami a subškálami.',
      xLabel: 'Dvojica škál',
      yLabel: 'r',
      points: pearson.slice(0, 25),
    });
  }

  if (spearman.length > 0) {
    charts.push({
      id: 'spearman-correlation-strengths',
      type: 'bar',
      title: 'Spearmanove korelačné koeficienty',
      description:
        'Graf zobrazuje Spearmanove korelácie medzi škálami a subškálami.',
      xLabel: 'Dvojica škál',
      yLabel: 'ρ',
      points: spearman.slice(0, 25),
    });
  }

  return charts;
}

function buildReliabilityCharts(result: any): ChartConfig[] {
  const reliability = getReliability(result);

  const points = reliability
    .map((row: any) => {
      const label = row.scaleName || row.variable || row.name || row.label;
      const value = toNumber(row.cronbachAlpha ?? row.alpha);

      return {
        label: cleanLabel(label),
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  if (!points.length) return [];

  return [
    {
      id: 'cronbach-alpha',
      type: 'bar',
      title: 'Reliabilita škál – Cronbach alfa',
      description:
        'Graf zobrazuje vnútornú konzistenciu škál. Hodnoty nad 0,70 sa zvyčajne považujú za akceptovateľné.',
      xLabel: 'Škála / subškála',
      yLabel: 'Cronbach alfa',
      points: points.slice(0, 25),
    },
  ];
}

function buildGroupTestCharts(result: any): ChartConfig[] {
  const tests = getGroupTests(result);

  const points = tests
    .map((row: any) => {
      const dependent = row.dependentVariable || row.variable || row.name || row.label;
      const group = row.groupVariable || row.independentVariable || row.group || '';
      const test = row.testType || row.test || '';
      const value = toNumber(row.pValue ?? row.p);

      const label = [dependent, group, test]
        .map(cleanLabel)
        .filter((item) => item && item !== '—')
        .join(' / ');

      return {
        label,
        value: value ?? 0,
      };
    })
    .filter((point) => point.label !== '—' && !isTechnicalColumn(point.label));

  if (!points.length) return [];

  return [
    {
      id: 'group-test-p-values',
      type: 'bar',
      title: 'Testovanie rozdielov medzi skupinami – p hodnoty',
      description:
        'Graf zobrazuje p hodnoty testov rozdielov medzi skupinami: t-test, ANOVA, Mann-Whitney U alebo Kruskal-Wallis.',
      xLabel: 'Test',
      yLabel: 'p hodnota',
      points: points.slice(0, 25),
    },
  ];
}

function buildScatterCharts(result: any): ChartConfig[] {
  const output: ChartConfig[] = [];

  const scatterSources = safeArray(
    result?.scatterPlots ||
      result?.scatterplots ||
      result?.scatterCharts ||
      result?.scatter_charts,
  );

  scatterSources.forEach((chart: any, index) => {
    const xName = cleanLabel(chart.xVariable || chart.x || chart.xLabel || 'X');
    const yName = cleanLabel(chart.yVariable || chart.y || chart.yLabel || 'Y');

    if (isTechnicalColumn(xName) || isTechnicalColumn(yName)) return;

    const points = safeArray(chart.points || chart.data || chart.rows)
      .map((point: any) => {
        const x = toNumber(point.x ?? point[xName]);
        const y = toNumber(point.y ?? point[yName]);

        if (x === null || y === null) return null;

        return {
          x,
          y,
        };
      })
      .filter(Boolean) as ChartPoint[];

    if (points.length < 2) return;

    output.push({
      id: `scatter-${xName}-${yName}-${index}`,
      type: 'scatter',
      title: `Scatter graf – ${xName} × ${yName}`,
      description:
        'Bodový graf zobrazuje vzťah medzi dvomi numerickými premennými.',
      xLabel: xName,
      yLabel: yName,
      points: points.slice(0, 500),
    });
  });

  return output;
}

function buildHistogramCharts(result: any): ChartConfig[] {
  const output: ChartConfig[] = [];

  const histogramSources = safeArray(
    result?.histograms ||
      result?.histogramCharts ||
      result?.histogram_charts,
  );

  histogramSources.forEach((chart: any, index) => {
    const variableName = cleanLabel(
      chart.variable || chart.name || chart.title || `Premenná ${index + 1}`,
    );

    if (isTechnicalColumn(variableName)) return;

    const points = safeArray(chart.bins || chart.points || chart.data || chart.rows)
      .map((row: any) => {
        const label =
          row.label ??
          row.bin ??
          row.range ??
          `${row.from ?? ''}–${row.to ?? ''}`;

        const value =
          toNumber(row.count) ??
          toNumber(row.frequency) ??
          toNumber(row.n) ??
          toNumber(row.value) ??
          0;

        return {
          label: cleanLabel(label),
          value,
        };
      })
      .filter((point) => point.label !== '—');

    if (!points.length) return;

    output.push({
      id: `histogram-${variableName}-${index}`,
      type: 'histogram',
      title: `Histogram – ${variableName}`,
      description:
        'Histogram zobrazuje rozdelenie hodnôt numerickej premennej.',
      xLabel: variableName,
      yLabel: 'Počet',
      points: points.slice(0, 25),
    });
  });

  return output;
}

function buildRecommendedChartFallbacks(result: any): ChartConfig[] {
  const output: ChartConfig[] = [];

  const recommendedCharts = safeArray(
    result?.recommendedCharts ||
      result?.recommended_charts ||
      result?.charts,
  );

  recommendedCharts.forEach((chart: any, index) => {
    const title = cleanLabel(
      chart.title || chart.name || chart.type || `Graf ${index + 1}`,
    );

    const variable = cleanLabel(
      chart.variable || chart.variableName || chart.x || chart.y || '',
    );

    if (variable && isTechnicalColumn(variable)) return;

    const rows = safeArray(chart.points || chart.data || chart.rows)
      .map((row: any) => {
        const label = row.label ?? row.category ?? row.name ?? row.value;
        const value =
          toNumber(row.count) ??
          toNumber(row.frequency) ??
          toNumber(row.percent) ??
          toNumber(row.value) ??
          toNumber(row.y) ??
          0;

        return {
          label: cleanLabel(label),
          value,
        };
      })
      .filter((point) => point.label !== '—');

    if (!rows.length) return;

    const normalizedType = normalizeText(chart.type);

    output.push({
      id: `recommended-${title}-${index}`,
      type: normalizedType.includes('histogram')
        ? 'histogram'
        : normalizedType.includes('scatter')
          ? 'scatter'
          : normalizedType.includes('line')
            ? 'line'
            : 'bar',
      title,
      description: cleanLabel(chart.description || chart.reason || ''),
      xLabel: cleanLabel(chart.xLabel || chart.variable || ''),
      yLabel: cleanLabel(chart.yLabel || 'Hodnota'),
      points: rows.slice(0, 25),
    });
  });

  return output;
}

function buildCharts(result: any, maxCharts: number): ChartConfig[] {
  const scaleCharts = buildScaleDescriptiveCharts(result);
  const itemCharts = scaleCharts.length === 0 ? buildItemDescriptiveFallbackCharts(result) : [];

  const charts = uniqueById([
    ...buildFrequencyCharts(result),
    ...scaleCharts,
    ...itemCharts,
    ...buildNormalityCharts(result),
    ...buildCorrelationCharts(result),
    ...buildReliabilityCharts(result),
    ...buildGroupTestCharts(result),
    ...buildHistogramCharts(result),
    ...buildScatterCharts(result),
    ...buildRecommendedChartFallbacks(result),
  ]);

  return charts.slice(0, maxCharts);
}

function getChartIcon(type: ChartType) {
  if (type === 'scatter') return <ScatterChart className="h-4 w-4" />;
  if (type === 'line') return <LineChart className="h-4 w-4" />;
  return <BarChart3 className="h-4 w-4" />;
}

function getMinMax(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));

  if (!clean.length) {
    return {
      min: 0,
      max: 1,
    };
  }

  const min = Math.min(...clean);
  const max = Math.max(...clean);

  if (min === max) {
    return {
      min: Math.min(0, min),
      max: max + 1,
    };
  }

  return {
    min,
    max,
  };
}

function formatTick(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function BarSvg({ chart }: { chart: ChartConfig }) {
  const width = 760;
  const height = 320;
  const paddingLeft = 58;
  const paddingRight = 28;
  const paddingTop = 28;
  const paddingBottom = 84;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const values = chart.points.map((point) => toNumber(point.value) ?? 0);

  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const valueRange = maxValue - minValue || 1;

  const barGap = 8;
  const barWidth = Math.max(
    10,
    (plotWidth - barGap * Math.max(0, chart.points.length - 1)) /
      Math.max(1, chart.points.length),
  );

  const zeroY =
    paddingTop + plotHeight - ((0 - minValue) / valueRange) * plotHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={chart.title}
    >
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + plotHeight}
        stroke="currentColor"
        className="text-slate-500"
        strokeWidth="1"
      />

      <line
        x1={paddingLeft}
        y1={zeroY}
        x2={width - paddingRight}
        y2={zeroY}
        stroke="currentColor"
        className="text-slate-500"
        strokeWidth="1"
      />

      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = paddingTop + plotHeight - tick * plotHeight;
        const value = minValue + tick * valueRange;

        return (
          <g key={tick}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="currentColor"
              className="text-white/10"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {formatTick(value)}
            </text>
          </g>
        );
      })}

      {chart.points.map((point, index) => {
        const value = toNumber(point.value) ?? 0;
        const x = paddingLeft + index * (barWidth + barGap);
        const barHeight = Math.abs((value / valueRange) * plotHeight);
        const y = value >= 0 ? zeroY - barHeight : zeroY;

        return (
          <g key={`${point.label}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(1, barHeight)}
              rx="5"
              className="fill-violet-400/80"
            />
            <text
              x={x + barWidth / 2}
              y={value >= 0 ? y - 6 : y + barHeight + 14}
              textAnchor="middle"
              className="fill-slate-200 text-[10px] font-bold"
            >
              {formatTick(value)}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 38}
              textAnchor="end"
              transform={`rotate(-35 ${x + barWidth / 2} ${height - 38})`}
              className="fill-slate-400 text-[10px]"
            >
              {String(point.label || '').slice(0, 22)}
            </text>
          </g>
        );
      })}

      {chart.yLabel ? (
        <text
          x={18}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${height / 2})`}
          className="fill-slate-400 text-[11px] font-bold"
        >
          {chart.yLabel}
        </text>
      ) : null}
    </svg>
  );
}

function ScatterSvg({ chart }: { chart: ChartConfig }) {
  const width = 760;
  const height = 320;
  const paddingLeft = 56;
  const paddingRight = 28;
  const paddingTop = 26;
  const paddingBottom = 54;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const xs = chart.points.map((point) => toNumber(point.x) ?? 0);
  const ys = chart.points.map((point) => toNumber(point.y) ?? 0);

  const { min: minX, max: maxX } = getMinMax(xs);
  const { min: minY, max: maxY } = getMinMax(ys);

  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  function scaleX(value: number) {
    return paddingLeft + ((value - minX) / xRange) * plotWidth;
  }

  function scaleY(value: number) {
    return paddingTop + plotHeight - ((value - minY) / yRange) * plotHeight;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={chart.title}
    >
      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={paddingTop + plotHeight}
        stroke="currentColor"
        className="text-slate-500"
      />
      <line
        x1={paddingLeft}
        y1={paddingTop + plotHeight}
        x2={width - paddingRight}
        y2={paddingTop + plotHeight}
        stroke="currentColor"
        className="text-slate-500"
      />

      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const x = paddingLeft + tick * plotWidth;
        const y = paddingTop + plotHeight - tick * plotHeight;

        return (
          <g key={tick}>
            <line
              x1={x}
              y1={paddingTop}
              x2={x}
              y2={paddingTop + plotHeight}
              stroke="currentColor"
              className="text-white/10"
            />
            <line
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="currentColor"
              className="text-white/10"
            />
            <text
              x={x}
              y={height - 28}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatTick(minX + tick * xRange)}
            </text>
            <text
              x={paddingLeft - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {formatTick(minY + tick * yRange)}
            </text>
          </g>
        );
      })}

      {chart.points.map((point, index) => {
        const x = toNumber(point.x);
        const y = toNumber(point.y);

        if (x === null || y === null) return null;

        return (
          <circle
            key={index}
            cx={scaleX(x)}
            cy={scaleY(y)}
            r="4"
            className="fill-cyan-300/80"
          />
        );
      })}

      {chart.xLabel ? (
        <text
          x={paddingLeft + plotWidth / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-400 text-[11px] font-bold"
        >
          {chart.xLabel}
        </text>
      ) : null}

      {chart.yLabel ? (
        <text
          x={18}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${height / 2})`}
          className="fill-slate-400 text-[11px] font-bold"
        >
          {chart.yLabel}
        </text>
      ) : null}
    </svg>
  );
}

function ChartCard({ chart }: { chart: ChartConfig }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
      <div className="border-b border-white/10 bg-white/[0.045] px-4 py-4">
        <div className="flex items-center gap-2 text-violet-200">
          {getChartIcon(chart.type)}
          <h4 className="font-black text-white">{chart.title}</h4>
        </div>

        {chart.description ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {chart.description}
          </p>
        ) : null}
      </div>

      <div className="p-4">
        {chart.type === 'scatter' ? (
          <ScatterSvg chart={chart} />
        ) : (
          <BarSvg chart={chart} />
        )}
      </div>
    </div>
  );
}

export default function AnalysisCharts({
  result,
  data,
  maxCharts = 12,
}: Props) {
  const source = result || data || {};
  const charts = buildCharts(source, maxCharts);

  if (!charts.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/20 px-4 py-5 text-sm leading-7 text-slate-400">
        Grafy zatiaľ nie sú dostupné. Analýza nevrátila frekvenčné tabuľky,
        deskriptívne dáta škál/subškál, normalitu, korelácie, reliabilitu,
        testovanie rozdielov, histogramy ani scatter dáta vhodné na automatické
        vykreslenie. Technické stĺpce typu ID sa automaticky vynechávajú.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 px-4 py-4">
        <div className="flex items-center gap-2 text-violet-100">
          <BarChart3 className="h-4 w-4" />
          <h3 className="text-sm font-black uppercase tracking-[0.16em]">
            Automaticky vykreslené grafy
          </h3>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-300">
          Grafy sa vytvárajú automaticky podľa typu dát: frekvencie ako
          stĺpcové grafy, škály a subškály ako porovnanie priemerov a SD,
          normalita ako p hodnoty, korelácie ako koeficienty, reliabilita ako
          Cronbach alfa a testovanie rozdielov ako p hodnoty. Technické stĺpce
          typu ID/respondent sa automaticky vynechávajú.
        </p>
      </div>

      {charts.map((chart) => (
        <ChartCard key={chart.id} chart={chart} />
      ))}
    </div>
  );
}