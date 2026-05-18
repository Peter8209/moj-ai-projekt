'use client';

import { useState } from 'react';
import {
  BarChart3,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import type { AnalysisResult } from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

type ExportFormat = 'word' | 'xlsx' | 'pdf';

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getSummaryLines(result: AnalysisResult) {
  const summary = String((result as any)?.summary || '').trim();

  if (!summary) return [];

  return summary
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
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
  if (format === 'xlsx') return 'vysledky-analyzy-dat.xls';
  return 'vysledky-analyzy-dat.pdf';
}

export default function AnalysisResultsModal({ open, result, onClose }: Props) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  if (!open || !result) return null;

  const warnings = safeArray<string>((result as any).warnings);
  const variables = safeArray<any>((result as any).variables);
  const frequencies = safeArray<any>((result as any).frequencies);
  const recommendedTests = safeArray<any>((result as any).recommendedTests);
  const recommendedCharts = safeArray<any>((result as any).recommendedCharts);
  const excelTables = safeArray<any>((result as any).excelTables);
  const descriptiveStatistics = safeArray<any>(
    (result as any).descriptiveStatistics,
  );
  const hypothesisTests = safeArray<any>((result as any).hypothesisTests);
  const selectedAnalyses = safeArray<any>((result as any).selectedAnalyses);
  const summaryLines = getSummaryLines(result);

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
          title: result.title || 'Výsledky analýzy dát',
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

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl transition-colors duration-300 dark:border-white/10 dark:bg-[#070a16]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <BarChart3 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                  {result.title || 'Výsledky analýzy dát'}
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tabuľky, premenné, odporúčané testy, grafy a interpretácia do
                  praktickej časti.
                </p>
              </div>
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
              onClick={() => exportResult('xlsx')}
              disabled={exporting !== null}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25"
            >
              {exporting === 'xlsx' ? (
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
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="mb-3 text-lg font-black text-slate-950 dark:text-white">
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

              {warnings.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <div className="mb-2 font-black">Upozornenia</div>
                  <ul className="space-y-1">
                    {warnings.map((item, index) => (
                      <li key={`${item}-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="mb-3 text-lg font-black text-slate-950 dark:text-white">
                Akademická interpretácia
              </h3>

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                {(result as any).interpretation ||
                  (result as any).practicalText ||
                  (result as any).fullText ||
                  'Interpretácia nebola dostupná.'}
              </div>
            </section>
          </div>

          <DataTable
            title="Identifikované premenné"
            rows={variables}
            emptyText="Premenné neboli identifikované."
          />

          <DataTable
            title="Deskriptívna štatistika"
            rows={descriptiveStatistics}
            emptyText="Deskriptívna štatistika nebola dostupná."
          />

          <DataTable
            title="Frekvenčné tabuľky"
            rows={frequencies}
            emptyText="Frekvenčné tabuľky neboli dostupné."
          />

          <DataTable
            title="Odporúčané štatistické testy"
            rows={recommendedTests}
            emptyText="Odporúčané testy neboli dostupné."
          />

          <DataTable
            title="Výsledky testovania hypotéz"
            rows={hypothesisTests}
            emptyText="Výsledky hypotéz neboli dostupné."
          />

          <DataTable
            title="Odporúčané grafy"
            rows={recommendedCharts}
            emptyText="Odporúčané grafy neboli dostupné."
          />

          <DataTable
            title="Odporúčané tabuľky do práce"
            rows={excelTables}
            emptyText="Tabuľky do práce neboli dostupné."
          />

          <DataTable
            title="Vybrané analýzy"
            rows={selectedAnalyses}
            emptyText="Vybrané analýzy neboli dostupné."
          />
        </div>
      </div>
    </div>
  );
}

function DataTable({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: any[];
  emptyText: string;
}) {
  const normalizedRows = safeArray<any>(rows);

  if (normalizedRows.length === 0) {
    return (
      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <h3 className="text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {emptyText}
        </p>
      </section>
    );
  }

  const columns = Array.from(
    new Set(
      normalizedRows.flatMap((row) =>
        row && typeof row === 'object' && !Array.isArray(row)
          ? Object.keys(row)
          : ['hodnota'],
      ),
    ),
  );

  return (
    <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h3 className="mb-4 text-lg font-black text-slate-950 dark:text-white">
        {title}
      </h3>

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="min-w-[760px] w-full border-collapse text-sm">
          <thead className="bg-slate-100 dark:bg-white/[0.08]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-slate-200 px-4 py-3 text-left font-black text-slate-700 dark:border-white/10 dark:text-slate-200"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {normalizedRows.map((row, rowIndex) => {
              const normalizedRow =
                row && typeof row === 'object' && !Array.isArray(row)
                  ? row
                  : { hodnota: String(row) };

              return (
                <tr
                  key={rowIndex}
                  className="odd:bg-white even:bg-slate-50 dark:odd:bg-transparent dark:even:bg-white/[0.03]"
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="border-b border-slate-100 px-4 py-3 align-top text-slate-700 dark:border-white/10 dark:text-slate-200"
                    >
                      {String(normalizedRow[column] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}