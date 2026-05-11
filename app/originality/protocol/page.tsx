'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import OriginalityProtocolView from '@/components/OriginalityProtocolView';

const STORAGE_KEY = 'zedpera_originality_protocol_result';

type LoadingState = 'waiting' | 'loaded' | 'error';

export default function OriginalityProtocolPage() {
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('waiting');
  const [attempts, setAttempts] = useState(0);

  const protocolTitle = useMemo(() => {
    if (!result) return 'Protokol originality';

    return (
      result?.title ||
      result?.protocolTitle ||
      result?.workTitle ||
      'Protokol originality'
    );
  }, [result]);

  function readStoredProtocol() {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Uložený protokol má neplatný formát.');
    }

    if (parsed.ok === false) {
      throw new Error(
        parsed.message ||
          parsed.error ||
          'API vrátilo chybu pri kontrole originality.',
      );
    }

    return parsed;
  }

  function loadProtocol() {
    try {
      const parsed = readStoredProtocol();

      if (!parsed) {
        return false;
      }

      setResult(parsed);
      setError('');
      setLoadingState('loaded');

      return true;
    } catch (err) {
      setResult(null);
      setLoadingState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Nepodarilo sa načítať protokol originality.',
      );

      return false;
    }
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attemptCounter = 0;

    const initialLoaded = loadProtocol();

    if (initialLoaded) {
      return;
    }

    setLoadingState('waiting');

    intervalId = setInterval(() => {
      attemptCounter += 1;
      setAttempts(attemptCounter);

      const loaded = loadProtocol();

      if (loaded && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 700);

    timeoutId = setTimeout(() => {
      if (!result) {
        const loaded = loadProtocol();

        if (!loaded) {
          setLoadingState('error');
          setError(
            'Protokol sa nenašiel. Najprv spusti kontrolu originality a nechaj systém otvoriť túto podstránku automaticky.',
          );
        }

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    }, 45000);

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        loadProtocol();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReloadProtocol() {
    setError('');
    setResult(null);
    setLoadingState('waiting');
    setAttempts(0);

    const loaded = loadProtocol();

    if (!loaded) {
      setLoadingState('error');
      setError(
        'Protokol sa zatiaľ nenašiel v prehliadači. Spusti kontrolu originality ešte raz.',
      );
    }
  }

  function handleClearProtocol() {
    const confirmed = window.confirm(
      'Naozaj chceš vymazať uložený protokol z prehliadača?',
    );

    if (!confirmed) return;

    window.localStorage.removeItem(STORAGE_KEY);
    setResult(null);
    setError(
      'Uložený protokol bol vymazaný. Spusti kontrolu originality znova.',
    );
    setLoadingState('error');
  }

  if (loadingState === 'waiting' && !result && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-center shadow-2xl shadow-black/40">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
            <Loader2 className="animate-spin" size={34} />
          </div>

          <h1 className="text-2xl font-black">Načítavam protokol...</h1>

          <p className="mt-3 text-sm leading-7 text-slate-400">
            Kontrola originality ešte môže bežať. Táto podstránka čaká na
            výsledok z API a po dokončení automaticky vykreslí protokol,
            tabuľky, grafy, histogram a detailné podobnosti.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-slate-400">
            Pokus o načítanie: {attempts}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 shadow-2xl shadow-black/40">
          <div className="mb-4 flex items-center gap-3 text-xl font-black text-red-100">
            <AlertTriangle size={26} />
            Protokol sa nezobrazil
          </div>

          <p className="text-sm leading-7 text-red-100">{error}</p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-red-50">
            Riešenie: vráť sa na stránku kontroly originality, klikni znova na
            „Skontrolovať originalitu“ alebo „Vygenerovať protokol“ a povoľ
            nové okná v prehliadači.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReloadProtocol}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-gray-100"
            >
              <RotateCcw size={18} />
              Skúsiť znova načítať
            </button>

            <button
              type="button"
              onClick={() => window.close()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
            >
              Zavrieť okno
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold">
          <Loader2 className="animate-spin" size={24} />
          Načítavam protokol...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] px-3 py-5 text-white md:px-6">
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-6xl flex-col justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/30 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-400/30 bg-green-500/15 text-green-200">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <div className="text-lg font-black">Protokol originality</div>

            <div className="mt-1 text-sm text-gray-400">
              {protocolTitle}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1">
                <FileText size={13} />
                Samostatná podstránka
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                Grafy, histogram, tabuľky, pasáže
              </span>

              {typeof result?.score === 'number' && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-black text-red-200">
                  Podobnosť: {result.score.toFixed(2).replace('.', ',')}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-gray-100"
          >
            <Printer size={18} />
            Tlačiť / PDF
          </button>

          <button
            type="button"
            onClick={handleReloadProtocol}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
          >
            <RotateCcw size={18} />
            Obnoviť
          </button>

          <button
            type="button"
            onClick={handleClearProtocol}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 hover:bg-red-500/20"
          >
            <Trash2 size={18} />
            Vymazať
          </button>
        </div>
      </div>

      <OriginalityProtocolView result={result} />
    </main>
  );
}