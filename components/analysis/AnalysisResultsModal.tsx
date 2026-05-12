'use client';

import { X } from 'lucide-react';
import type { AnalysisResult } from './analysisTypes';

type Props = {
  open: boolean;
  result: AnalysisResult | null;
  onClose: () => void;
};

export default function AnalysisResultsModal({ open, result, onClose }: Props) {
  if (!open || !result) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-violet-200">
              Výsledky analýzy
            </div>

            <h2 className="text-2xl font-black">
              {result.title || 'Výsledky analýzy'}
            </h2>
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
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
              <h3 className="mb-2 text-xl font-black">Súhrn</h3>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {result.summary || 'Súhrn nie je dostupný.'}
              </p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
              <h3 className="mb-2 text-xl font-black">Popis dát</h3>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {result.dataDescription || 'Popis dát nie je dostupný.'}
              </p>
            </section>

            <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <h3 className="mb-2 text-xl font-black text-emerald-100">
                Text do praktickej časti
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-8 text-emerald-50/90">
                {result.practicalText || 'Text do praktickej časti nie je dostupný.'}
              </p>
            </section>

            <section className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-5">
              <h3 className="mb-2 text-xl font-black text-violet-100">
                Interpretácia výsledkov
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-8 text-violet-50/90">
                {result.interpretation || 'Interpretácia nie je dostupná.'}
              </p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <h3 className="mb-2 text-xl font-black">Kompletný výstup</h3>
              <p className="whitespace-pre-wrap text-sm leading-8 text-slate-300">
                {result.fullText || 'Kompletný výstup nie je dostupný.'}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}