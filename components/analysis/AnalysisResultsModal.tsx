'use client';

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  LineChart,
  PieChart,
  Sigma,
  Table2,
  X,
} from 'lucide-react';

import type {
  AnalysisChart,
  AnalysisRecommendation,
  AnalysisResult,
  AnalysisTable,
} from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

type UnknownRecord = Record<string, unknown>;

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function isObject(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeTableLike(value: unknown, fallbackTitle: string): AnalysisTable[] {
  const items = asArray<unknown>(value);

  return items
    .map((item, index) => {
      if (!isObject(item)) return null;

      const title =
        toText(item.title) ||
        toText(item.name) ||
        toText(item.label) ||
        `${fallbackTitle} ${index + 1}`;

      const description =
        toText(item.description) ||
        toText(item.note) ||
        toText(item.summary) ||
        '';

      const rawColumns = asArray<unknown>(item.columns);
      const rawRows = asArray<UnknownRecord>(item.rows || item.data || item.values);

      let columns =
        rawColumns.length > 0
          ? rawColumns
              .map((column) => {
                if (isObject(column)) {
                  const key = toText(column.key || column.name || column.field);
                  const label = toText(column.label || column.title || column.name || key);

                  if (!key) return null;

                  return {
                    key,
                    label: label || key,
                  };
                }

                const key = toText(column);

                if (!key) return null;

                return {
                  key,
                  label: key,
                };
              })
              .filter(Boolean)
          : [];

      if (columns.length === 0 && rawRows.length > 0) {
        columns = Object.keys(rawRows[0] || {}).map((key) => ({
          key,
          label: key,
        }));
      }

      return {
        title,
        description,
        columns,
        rows: rawRows,
      } as AnalysisTable;
    })
    .filter(Boolean) as AnalysisTable[];
}

function normalizeRecommendations(
  value: unknown,
  fallbackTitle: string,
): AnalysisRecommendation[] {
  return asArray<unknown>(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          title: `${fallbackTitle} ${index + 1}`,
          description: item,
        };
      }

      if (!isObject(item)) return null;

      return {
        title:
          toText(item.title) ||
          toText(item.name) ||
          toText(item.test) ||
          `${fallbackTitle} ${index + 1}`,
        description:
          toText(item.description) ||
          toText(item.reason) ||
          toText(item.hypothesis) ||
          toText(item.interpretation) ||
          toText(item.text) ||
          '',
      };
    })
    .filter(Boolean) as AnalysisRecommendation[];
}

function normalizeCharts(value: unknown): AnalysisChart[] {
  return asArray<unknown>(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          title: item,
          type: 'other',
          description: 'Odporúčaný graf pre vizualizáciu výsledkov.',
          variables: [],
        } as AnalysisChart;
      }

      if (!isObject(item)) return null;

      return {
        title:
          toText(item.title) ||
          toText(item.name) ||
          toText(item.chart) ||
          `Graf ${index + 1}`,
        type:
          item.type === 'bar' ||
          item.type === 'line' ||
          item.type === 'pie' ||
          item.type === 'histogram' ||
          item.type === 'boxplot' ||
          item.type === 'scatter' ||
          item.type === 'heatmap' ||
          item.type === 'other'
            ? item.type
            : 'other',
        description:
          toText(item.description) ||
          toText(item.reason) ||
          toText(item.interpretation) ||
          'Odporúčaný graf pre vizualizáciu výsledkov.',
        variables: asArray<string>(item.variables || item.columns || item.fields),
      } as AnalysisChart;
    })
    .filter(Boolean) as AnalysisChart[];
}

function getAllTables(result: AnalysisResult) {
  const descriptiveStatistics = normalizeTableLike(
    (result as any).descriptiveStatistics,
    'Deskriptívna štatistika',
  );

  const frequencies = normalizeTableLike(
    (result as any).frequencies || (result as any).frequencyTables,
    'Frekvenčná tabuľka',
  );

  const excelTables = normalizeTableLike(
    (result as any).excelTables,
    'Tabuľka do práce',
  );

  return {
    descriptiveStatistics,
    frequencies,
    excelTables,
  };
}

function getChartIcon(type: AnalysisChart['type']) {
  if (type === 'pie') return PieChart;
  if (type === 'line') return LineChart;
  if (type === 'bar' || type === 'histogram') return BarChart3;
  if (type === 'scatter' || type === 'boxplot' || type === 'heatmap') {
    return BarChart3;
  }

  return BarChart3;
}

function getChartTypeLabel(type: AnalysisChart['type']) {
  if (type === 'bar') return 'Stĺpcový graf';
  if (type === 'line') return 'Čiarový graf';
  if (type === 'pie') return 'Koláčový graf';
  if (type === 'histogram') return 'Histogram';
  if (type === 'boxplot') return 'Boxplot';
  if (type === 'scatter') return 'Bodový graf';
  if (type === 'heatmap') return 'Heatmapa';

  return 'Iný graf';
}

function getTableValue(row: UnknownRecord, key: string) {
  const value = row?.[key];

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, '');
  }

  if (typeof value === 'boolean') {
    return value ? 'áno' : 'nie';
  }

  return String(value);
}

function SectionCard({
  title,
  icon,
  children,
  tone = 'default',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'blue' | 'emerald' | 'violet' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-blue-400/20 bg-blue-500/10'
      : tone === 'emerald'
        ? 'border-emerald-400/20 bg-emerald-500/10'
        : tone === 'violet'
          ? 'border-violet-400/20 bg-violet-500/10'
          : tone === 'amber'
            ? 'border-amber-400/20 bg-amber-500/10'
            : tone === 'red'
              ? 'border-red-400/20 bg-red-500/10'
              : 'border-white/10 bg-white/[0.055]';

  return (
    <section className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon ? <div className="text-violet-200">{icon}</div> : null}

        <h3 className="text-xl font-black text-white">{title}</h3>
      </div>

      {children}
    </section>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-400">
      {text}
    </div>
  );
}

function TextBlock({ text, fallback }: { text?: string; fallback: string }) {
  if (!text?.trim()) {
    return <EmptyBlock text={fallback} />;
  }

  return (
    <div className="whitespace-pre-wrap text-sm leading-8 text-slate-200">
      {text}
    </div>
  );
}

function AnalysisTableView({ table }: { table: AnalysisTable }) {
  const columns = table.columns || [];
  const rows = table.rows || [];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
      <div className="border-b border-white/10 bg-white/[0.045] px-4 py-4">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-violet-200" />

          <h4 className="font-black text-white">
            {table.title || 'Tabuľka'}
          </h4>
        </div>

        {table.description ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {table.description}
          </p>
        ) : null}
      </div>

      {columns.length === 0 || rows.length === 0 ? (
        <div className="px-4 py-4 text-sm text-slate-400">
          Tabuľka neobsahuje zobraziteľné riadky alebo stĺpce.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035]">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-300"
                  >
                    {column.label || column.key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-white/5 last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column.key}`}
                      className="whitespace-nowrap px-4 py-3 text-slate-200"
                    >
                      {getTableValue(row as UnknownRecord, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TableSection({
  title,
  tables,
  empty,
}: {
  title: string;
  tables: AnalysisTable[];
  empty: string;
}) {
  return (
    <SectionCard title={title} icon={<Table2 className="h-5 w-5" />}>
      {tables.length === 0 ? (
        <EmptyBlock text={empty} />
      ) : (
        <div className="space-y-4">
          {tables.map((table, index) => (
            <AnalysisTableView
              key={`${table.title || 'table'}-${index}`}
              table={table}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ChartPreview({ chart }: { chart: AnalysisChart }) {
  const Icon = getChartIcon(chart.type);
  const bars = [42, 68, 55, 85, 63, 74];

  if (chart.type === 'pie') {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
        <div className="relative h-24 w-24 rounded-full border-[18px] border-violet-400/80">
          <div className="absolute -right-3 bottom-1 h-10 w-10 rounded-full border-[12px] border-emerald-300/80" />
          <div className="absolute left-2 top-2 h-8 w-8 rounded-full border-[10px] border-blue-300/80" />
        </div>
      </div>
    );
  }

  if (chart.type === 'line') {
    return (
      <div className="flex h-36 items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="h-[25%] w-full rounded-t-xl bg-violet-400/30" />
        <div className="h-[45%] w-full rounded-t-xl bg-violet-400/45" />
        <div className="h-[35%] w-full rounded-t-xl bg-violet-400/35" />
        <div className="h-[70%] w-full rounded-t-xl bg-violet-400/70" />
        <div className="h-[55%] w-full rounded-t-xl bg-violet-400/55" />
        <div className="h-[85%] w-full rounded-t-xl bg-violet-400/85" />
      </div>
    );
  }

  if (chart.type === 'scatter') {
    return (
      <div className="relative h-36 rounded-2xl border border-white/10 bg-black/20">
        {[
          ['18%', '70%'],
          ['30%', '54%'],
          ['42%', '62%'],
          ['52%', '38%'],
          ['66%', '46%'],
          ['74%', '24%'],
          ['84%', '32%'],
        ].map(([left, top], index) => (
          <span
            key={index}
            className="absolute h-3 w-3 rounded-full bg-violet-300"
            style={{ left, top }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-36 items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-full rounded-t-xl bg-violet-400/70"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function ChartCard({ chart }: { chart: AnalysisChart }) {
  const Icon = getChartIcon(chart.type);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-black text-white">
            <Icon className="h-4 w-4 text-violet-200" />
            {chart.title || 'Odporúčaný graf'}
          </div>

          <div className="text-xs font-bold uppercase tracking-[0.12em] text-violet-200">
            {getChartTypeLabel(chart.type)}
          </div>
        </div>

        <div className="rounded-xl bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase text-violet-100">
          graf
        </div>
      </div>

      <ChartPreview chart={chart} />

      <p className="mt-4 text-sm leading-6 text-slate-300">
        {chart.description || 'Graf je vhodný na vizualizáciu výsledkov.'}
      </p>

      {chart.variables && chart.variables.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chart.variables.map((variable) => (
            <span
              key={variable}
              className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-bold text-slate-200"
            >
              {variable}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecommendationList({
  items,
  empty,
}: {
  items: AnalysisRecommendation[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyBlock text={empty} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div
          key={`${item.title || 'recommendation'}-${index}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="mb-2 flex items-center gap-2 font-black text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            {item.title || `Odporúčanie ${index + 1}`}
          </div>

          <p className="text-sm leading-7 text-slate-300">
            {item.description || 'Popis nie je dostupný.'}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisResultsModal({ open, result, onClose }: Props) {
  if (!open || !result) return null;

  const { descriptiveStatistics, frequencies, excelTables } = getAllTables(result);

  const recommendedCharts = normalizeCharts((result as any).recommendedCharts);
  const selectedAnalyses = normalizeRecommendations(
    (result as any).selectedAnalyses,
    'Vybraná analýza',
  );
  const hypothesisTests = normalizeRecommendations(
    (result as any).hypothesisTests || (result as any).recommendedTests,
    'Štatistický test',
  );

  const warnings = asArray<string>((result as any).warnings);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] text-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-violet-200">
              Výsledky analýzy
            </div>

            <h2 className="text-2xl font-black">
              {result.title || 'Výsledky analýzy'}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Tabuľky, grafy, testy, interpretácia a text do praktickej časti.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-red-500 p-3 text-white hover:bg-red-400"
            aria-label="Zavrieť"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-5 grid gap-4 md:grid-cols-4">
            <StatCard
              label="Deskriptívne tabuľky"
              value={descriptiveStatistics.length}
              icon={<Table2 className="h-5 w-5" />}
            />

            <StatCard
              label="Frekvenčné tabuľky"
              value={frequencies.length}
              icon={<ClipboardList className="h-5 w-5" />}
            />

            <StatCard
              label="Odporúčané grafy"
              value={recommendedCharts.length}
              icon={<BarChart3 className="h-5 w-5" />}
            />

            <StatCard
              label="Testy hypotéz"
              value={hypothesisTests.length}
              icon={<Sigma className="h-5 w-5" />}
            />
          </div>

          <div className="space-y-5">
            <SectionCard
              title="Súhrn"
              icon={<FileText className="h-5 w-5" />}
            >
              <TextBlock
                text={result.summary}
                fallback="Súhrn nie je dostupný."
              />
            </SectionCard>

            <SectionCard
              title="Popis dát"
              icon={<ClipboardList className="h-5 w-5" />}
            >
              <TextBlock
                text={result.dataDescription}
                fallback="Popis dát nie je dostupný."
              />
            </SectionCard>

            {warnings.length > 0 ? (
              <SectionCard
                title="Upozornenia"
                icon={<AlertTriangle className="h-5 w-5" />}
                tone="amber"
              >
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-3 text-sm leading-7 text-amber-100"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Vybrané analýzy"
              icon={<Sigma className="h-5 w-5" />}
              tone="violet"
            >
              <RecommendationList
                items={selectedAnalyses}
                empty="Vybrané analýzy nie sú dostupné."
              />
            </SectionCard>

            <TableSection
              title="Deskriptívna štatistika"
              tables={descriptiveStatistics}
              empty="Deskriptívna štatistika nie je dostupná."
            />

            <TableSection
              title="Frekvenčné tabuľky"
              tables={frequencies}
              empty="Frekvenčné tabuľky nie sú dostupné."
            />

            <SectionCard
              title="Odporúčané grafy"
              icon={<BarChart3 className="h-5 w-5" />}
              tone="blue"
            >
              {recommendedCharts.length === 0 ? (
                <EmptyBlock text="Odporúčané grafy nie sú dostupné." />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {recommendedCharts.map((chart, index) => (
                    <ChartCard
                      key={`${chart.title || 'chart'}-${index}`}
                      chart={chart}
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <TableSection
              title="Tabuľky vhodné do práce"
              tables={excelTables}
              empty="Tabuľky do práce nie sú dostupné."
            />

            <SectionCard
              title="Odporúčané testy hypotéz"
              icon={<Sigma className="h-5 w-5" />}
            >
              <RecommendationList
                items={hypothesisTests}
                empty="Odporúčané štatistické testy nie sú dostupné."
              />
            </SectionCard>

            <SectionCard
              title="Text do praktickej časti"
              icon={<FileText className="h-5 w-5" />}
              tone="emerald"
            >
              <TextBlock
                text={result.practicalText}
                fallback="Text do praktickej časti nie je dostupný."
              />
            </SectionCard>

            <SectionCard
              title="Interpretácia výsledkov"
              icon={<LineChart className="h-5 w-5" />}
              tone="violet"
            >
              <TextBlock
                text={result.interpretation}
                fallback="Interpretácia nie je dostupná."
              />
            </SectionCard>

            <SectionCard
              title="Kompletný textový výstup"
              icon={<FileText className="h-5 w-5" />}
            >
              <TextBlock
                text={result.fullText}
                fallback="Kompletný výstup nie je dostupný."
              />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-violet-200">{icon}</div>

        <div className="rounded-xl bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase text-violet-100">
          počet
        </div>
      </div>

      <div className="text-3xl font-black text-white">{value}</div>

      <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
    </div>
  );
}