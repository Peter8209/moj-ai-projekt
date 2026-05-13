'use client';

import {
  BarChart3,
  LineChart,
  PieChart,
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

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getPercentFromRatio(value: unknown) {
  const number = toNumber(value, 0);

  if (number <= 1) {
    return clampPercent(number * 100);
  }

  return clampPercent(number);
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function getOverviewItems(result?: AnalysisResult | null): ChartItem[] {
  if (!result) return [];

  const items: ChartItem[] = [];

  const summary: any = (result as any).summary || {};
  const descriptiveStatistics: any =
    (result as any).descriptiveStatistics || {};
  const hypothesisTests: any = (result as any).hypothesisTests || {};
  const variables: any = (result as any).variables || {};
  const frequencies: any = (result as any).frequencies || {};

  const totalRows =
    summary.totalRows ||
    summary.rows ||
    summary.count ||
    descriptiveStatistics.totalRows ||
    descriptiveStatistics.rows;

  const totalVariables =
    summary.totalVariables ||
    summary.variables ||
    variables.total ||
    variables.count ||
    (Array.isArray(variables) ? variables.length : 0);

  const missingValues =
    summary.missingValues ||
    summary.missing ||
    descriptiveStatistics.missingValues ||
    0;

  const testsCount =
    hypothesisTests.total ||
    hypothesisTests.count ||
    (Array.isArray(hypothesisTests) ? hypothesisTests.length : 0);

  const frequencyCount =
    frequencies.total ||
    frequencies.count ||
    (Array.isArray(frequencies) ? frequencies.length : 0);

  if (toNumber(totalRows) > 0) {
    items.push({
      label: 'Počet riadkov',
      value: toNumber(totalRows),
      description: 'Rozsah analyzovaného súboru',
    });
  }

  if (toNumber(totalVariables) > 0) {
    items.push({
      label: 'Počet premenných',
      value: toNumber(totalVariables),
      description: 'Premenné dostupné v dátach',
    });
  }

  if (toNumber(missingValues) > 0) {
    items.push({
      label: 'Chýbajúce hodnoty',
      value: toNumber(missingValues),
      description: 'Hodnoty bez vyplneného obsahu',
    });
  }

  if (toNumber(testsCount) > 0) {
    items.push({
      label: 'Testy hypotéz',
      value: toNumber(testsCount),
      description: 'Počet identifikovaných alebo odporúčaných testov',
    });
  }

  if (toNumber(frequencyCount) > 0) {
    items.push({
      label: 'Frekvenčné tabuľky',
      value: toNumber(frequencyCount),
      description: 'Počet dostupných frekvenčných výstupov',
    });
  }

  return items;
}

function getQualityItems(result?: AnalysisResult | null): ChartItem[] {
  if (!result) return [];

  const items: ChartItem[] = [];
  const anyResult: any = result;

  const dataQuality =
    anyResult.dataQuality ||
    anyResult.quality ||
    anyResult.score ||
    anyResult.summary?.quality ||
    anyResult.summary?.score;

  const completeness =
    anyResult.completeness ||
    anyResult.summary?.completeness ||
    anyResult.descriptiveStatistics?.completeness;

  const dictionaryRatio =
    anyResult.dictionaryStats?.dictionaryWordsRatio ||
    anyResult.dictionaryWordsRatio;

  const reliability =
    anyResult.reliability ||
    anyResult.summary?.reliability ||
    anyResult.hypothesisTests?.reliability;

  if (dataQuality !== undefined && dataQuality !== null) {
    items.push({
      label: 'Kvalita dát',
      value: getPercentFromRatio(dataQuality),
      description: 'Orientačné skóre kvality spracovania',
    });
  }

  if (completeness !== undefined && completeness !== null) {
    items.push({
      label: 'Úplnosť dát',
      value: getPercentFromRatio(completeness),
      description: 'Podiel vyplnených a použiteľných údajov',
    });
  }

  if (dictionaryRatio !== undefined && dictionaryRatio !== null) {
    items.push({
      label: 'Slovníková zhoda',
      value: getPercentFromRatio(dictionaryRatio),
      description: 'Podiel slov rozpoznaných v slovníku',
    });
  }

  if (reliability !== undefined && reliability !== null) {
    items.push({
      label: 'Spoľahlivosť',
      value: getPercentFromRatio(reliability),
      description: 'Orientačné hodnotenie spoľahlivosti výstupu',
    });
  }

  return items;
}

function getRecommendedChartItems(result?: AnalysisResult | null): string[] {
  if (!result) return [];

  const anyResult: any = result;
  const recommendedCharts =
    anyResult.recommendedCharts ||
    anyResult.charts ||
    anyResult.summary?.recommendedCharts ||
    [];

  if (Array.isArray(recommendedCharts)) {
    return recommendedCharts
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.name || item?.title || item?.label || '';
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

  return [];
}

function MaxBarChart({ items }: { items: ChartItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-400">
        Pre túto časť zatiaľ nie sú dostupné číselné údaje na grafické
        zobrazenie.
      </div>
    );
  }

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
                {item.value}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-violet-500"
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
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-400">
        Percentuálne hodnotenie zatiaľ nie je dostupné.
      </div>
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
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalysisCharts({ result }: AnalysisChartsProps) {
  const overviewItems = getOverviewItems(result);
  const qualityItems = getQualityItems(result);
  const recommendedCharts = getRecommendedChartItems(result);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <BarChart3 className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Prehľad analýzy
            </h3>
            <p className="text-sm text-slate-400">
              Základné číselné ukazovatele zo spracovaného výstupu.
            </p>
          </div>
        </div>

        <MaxBarChart items={overviewItems} />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200">
            <TrendingUp className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Kvalita a spoľahlivosť
            </h3>
            <p className="text-sm text-slate-400">
              Percentuálne skóre, ak ho analýza poskytla.
            </p>
          </div>
        </div>

        <PercentChart items={qualityItems} />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-200">
            <PieChart className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              Odporúčané grafy
            </h3>
            <p className="text-sm text-slate-400">
              Typy grafov vhodné pre interpretáciu dát.
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
      </div>
    </div>
  );
}