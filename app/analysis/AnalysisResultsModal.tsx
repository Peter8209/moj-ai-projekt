'use client';

import { useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
} from 'lucide-react';

import AnalysisTable from './AnalysisTable';
import type { AnalysisResult } from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
  onExportWord?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
};

function getResultTitle(result: AnalysisResult | null) {
  return result?.title || 'Výsledky analýzy dát';
}

function getSummary(result: AnalysisResult | null) {
  if (!result) return '';

  if (typeof result.summary === 'string' && result.summary.trim()) {
    return result.summary.trim();
  }

  return 'Analýza bola spracovaná. Výsledky sú zobrazené v tabuľkách nižšie.';
}

function countItems(value: unknown) {
  if (Array.isArray(value)) return value.length;
  return 0;
}

function getStats(result: AnalysisResult | null) {
  if (!result) {
    return {
      variables: 0,
      frequencies: 0,
      descriptive: 0,
      charts: 0,
      tests: 0,
    };
  }

  return {
    variables: countItems(result.variables || result.detectedVariables || result.columns),
    frequencies: countItems(
      result.frequencies || result.frequencyTables || result.frequency_tables,
    ),
    descriptive: countItems(
      result.descriptiveStatistics ||
        result.descriptive_statistics ||
        result.statistics,
    ),
    charts: countItems(
      result.recommendedCharts || result.recommended_charts || result.charts,
    ),
    tests: countItems(
      result.recommendedTests ||
        result.recommended_tests ||
        result.tests ||
        result.hypothesisTests ||
        result.hypothesis_tests ||
        result.testResults,
    ),
  };
}

export default function AnalysisResultsModal({
  open,
  result,
  onClose,
  onExportWord,
  onExportExcel,
  onExportPdf,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const stats = getStats(result);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 px-3 py-4 backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Výsledky analýzy dát"
    >
      <button
        type="button"
        aria-label="Zavrieť výsledky analýzy"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#070b16] shadow-2xl shadow-black/50">
        <div className="border-b border-white/10 bg-gradient-to-r from-blue-600/20 via-violet-600/15 to-cyan-500/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-500/15 text-blue-100">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200/80">
                  Analýza dát
                </p>

                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
                  {getResultTitle(result)}
                </h2>

                <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {getSummary(result)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {onExportWord ? (
                <button
                  type="button"
                  onClick={onExportWord}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/[0.1]"
                >
                  <FileText className="h-4 w-4" />
                  Word
                </button>
              ) : null}

              {onExportExcel ? (
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-500/15"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </button>
              ) : null}

              {onExportPdf ? (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/15"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-100 transition hover:bg-white/[0.1]"
              >
                <Printer className="h-4 w-4" />
                Tlač
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/[0.12] hover:text-white"
                aria-label="Zavrieť"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-xs text-slate-400">Premenné</p>
              <p className="mt-1 text-2xl font-black text-white">
                {stats.variables}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-xs text-slate-400">Frekvencie</p>
              <p className="mt-1 text-2xl font-black text-white">
                {stats.frequencies}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-xs text-slate-400">Deskriptíva</p>
              <p className="mt-1 text-2xl font-black text-white">
                {stats.descriptive}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-xs text-slate-400">Grafy</p>
              <p className="mt-1 text-2xl font-black text-white">
                {stats.charts}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="text-xs text-slate-400">Testy</p>
              <p className="mt-1 text-2xl font-black text-white">
                {stats.tests}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">
          <AnalysisTable result={result} />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-950/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-xs leading-5 text-slate-400">
            Výsledky sú orientačné a odporúčame ich skontrolovať podľa metodiky
            práce, typu premenných a požiadaviek školy.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex justify-center rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-200"
          >
            Zavrieť výsledky
          </button>
        </div>
      </div>
    </div>
  );
}