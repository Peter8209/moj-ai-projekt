'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RefreshCcw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import OriginalityProtocolView from '@/components/OriginalityProtocolView';

const PRIMARY_STORAGE_KEY = 'zedpera_originality_protocol_result';

const STORAGE_KEYS = [
  'zedpera_originality_protocol_result',
  'originality_protocol_result',
  'originality_result',
  'latest_originality_result',
  'zedpera_originality_result',
];

const SIMILARITY_DEVIATION_PERCENT = 5;
const MAX_LOADING_ATTEMPTS = 90;
const LOADING_INTERVAL_MS = 500;

type LoadingState = 'waiting' | 'loaded' | 'error';

type ProtocolPageResult = Record<string, any>;

function isBrowser() {
  return typeof window !== 'undefined';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.').replace('%', '');
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number) {
  return `${clampPercent(value).toFixed(2).replace('.', ',')}%`;
}

function getSimilarityScore(result: any): number | null {
  if (!result || typeof result !== 'object') return null;

  const source = unwrapProtocolPayload(result);

  return (
    toNumber(source?.score) ??
    toNumber(source?.similarityRiskScore) ??
    toNumber(source?.similarityScore) ??
    toNumber(source?.similarityPercent) ??
    toNumber(source?.similarity) ??
    toNumber(source?.percent) ??
    toNumber(source?.overallPercent) ??
    toNumber(source?.overall_percent) ??
    toNumber(source?.plagiarismPercent) ??
    toNumber(source?.overlapPercent) ??
    null
  );
}

function getDeviationInterval(score: number) {
  const min = clampPercent(score - SIMILARITY_DEVIATION_PERCENT);
  const max = clampPercent(score + SIMILARITY_DEVIATION_PERCENT);

  return {
    min,
    max,
    label: `${formatPercent(min)} – ${formatPercent(max)}`,
  };
}

function safeJsonParse(value: string): any | null {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed);
      } catch {
        return {
          plaintext: parsed,
          protocolText: parsed,
          createdAt: new Date().toISOString(),
        };
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

function readStorageValue(key: string): any | null {
  if (!isBrowser()) return null;

  const localValue = window.localStorage.getItem(key);
  const sessionValue = window.sessionStorage.getItem(key);
  const raw = localValue || sessionValue;

  if (!raw) return null;

  return safeJsonParse(raw);
}

function readProtocolFromQuery(): any | null {
  if (!isBrowser()) return null;

  const params = new URLSearchParams(window.location.search);
  const directData = params.get('data');

  if (!directData) return null;

  try {
    const decoded = decodeURIComponent(directData);
    return safeJsonParse(decoded);
  } catch {
    return null;
  }
}

function unwrapProtocolPayload(value: any): ProtocolPageResult {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const nestedResult =
    value?.result && typeof value.result === 'object'
      ? value.result
      : value?.data && typeof value.data === 'object'
        ? value.data
        : value?.payload && typeof value.payload === 'object'
          ? value.payload
          : value?.protocol && typeof value.protocol === 'object'
            ? value.protocol
            : value;

  const activeProfile =
    nestedResult?.activeProfile ||
    nestedResult?.profile ||
    value?.activeProfile ||
    value?.profile ||
    null;

  return {
    ...nestedResult,

    id: nestedResult?.id || value?.id,
    ok: nestedResult?.ok ?? value?.ok,
    createdAt:
      nestedResult?.createdAt ||
      nestedResult?.generatedAt ||
      value?.createdAt ||
      value?.generatedAt ||
      new Date().toISOString(),

    title:
      nestedResult?.title ||
      nestedResult?.protocolTitle ||
      value?.title ||
      value?.protocolTitle ||
      activeProfile?.title ||
      activeProfile?.topic ||
      'Kontrola originality',

    author:
      nestedResult?.author ||
      nestedResult?.authorName ||
      value?.author ||
      value?.authorName ||
      activeProfile?.author ||
      activeProfile?.authorName ||
      '',

    supervisor:
      nestedResult?.supervisor ||
      value?.supervisor ||
      activeProfile?.supervisor ||
      '',

    workType:
      nestedResult?.workType ||
      value?.workType ||
      activeProfile?.type ||
      activeProfile?.schema?.label ||
      'neurčené',

    citationStyle:
      nestedResult?.citationStyle ||
      value?.citationStyle ||
      activeProfile?.citation ||
      activeProfile?.citationStyle ||
      'ISO 690',

    language:
      nestedResult?.language ||
      value?.language ||
      activeProfile?.workLanguage ||
      activeProfile?.language ||
      'SK',

    activeProfile,
    profile: activeProfile,
  };
}

function isUsableProtocolResult(value: any): boolean {
  if (!value || typeof value !== 'object') return false;

  const source = unwrapProtocolPayload(value);

  if (source?.ok === false && !source?.summary && !source?.protocolText) {
    return false;
  }

  return Boolean(
    source?.score !== undefined ||
      source?.percent !== undefined ||
      source?.overallPercent !== undefined ||
      source?.similarityRiskScore !== undefined ||
      source?.similarityScore !== undefined ||
      source?.similarityPercent !== undefined ||
      source?.plagiarismPercent !== undefined ||
      source?.overlapPercent !== undefined ||
      source?.protocolText ||
      source?.summary ||
      source?.recommendation ||
      source?.plaintext ||
      source?.extractedText ||
      source?.text ||
      Array.isArray(source?.documents) ||
      Array.isArray(source?.passages) ||
      Array.isArray(source?.corpuses),
  );
}

function normalizeProtocolForRendering(value: any): ProtocolPageResult | null {
  if (!isUsableProtocolResult(value)) {
    return null;
  }

  const source = unwrapProtocolPayload(value);

  if (source?.ok === false) {
    throw new Error(
      source?.message ||
        source?.error ||
        'API vrátilo chybu pri kontrole originality.',
    );
  }

  const plaintext =
    source?.plaintext ||
    source?.extractedText ||
    source?.text ||
    source?.protocolText ||
    source?.summary ||
    '';

  return {
    ...source,
    plaintext,
    extractedText: source?.extractedText || plaintext,
    text: source?.text || plaintext,
    createdAt: source?.createdAt || source?.generatedAt || new Date().toISOString(),
    corpuses: Array.isArray(source?.corpuses) ? source.corpuses : [],
    documents: Array.isArray(source?.documents) ? source.documents : [],
    passages: Array.isArray(source?.passages) ? source.passages : [],
    histogram: Array.isArray(source?.histogram) ? source.histogram : [],
  };
}

function readStoredProtocol(): ProtocolPageResult | null {
  if (!isBrowser()) return null;

  const queryProtocol = readProtocolFromQuery();

  if (queryProtocol) {
    const normalizedFromQuery = normalizeProtocolForRendering(queryProtocol);

    if (normalizedFromQuery) {
      return normalizedFromQuery;
    }
  }

  for (const key of STORAGE_KEYS) {
    const parsed = readStorageValue(key);

    if (!parsed) continue;

    const normalized = normalizeProtocolForRendering(parsed);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function writeProtocolToPrimaryStorage(result: ProtocolPageResult) {
  if (!isBrowser()) return;

  try {
    const payload = JSON.stringify(result);
    window.localStorage.setItem(PRIMARY_STORAGE_KEY, payload);
    window.sessionStorage.setItem(PRIMARY_STORAGE_KEY, payload);
  } catch {
    // Ak prehliadač blokuje storage alebo je prekročený limit, stránka stále ostane funkčná.
  }
}

function removeStoredProtocols() {
  if (!isBrowser()) return;

  STORAGE_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignorujeme chyby prehliadača pri mazaní storage.
    }
  });
}

function getProtocolTitle(result: any) {
  const source = unwrapProtocolPayload(result);

  return (
    source?.title ||
    source?.protocolTitle ||
    source?.workTitle ||
    source?.activeProfile?.title ||
    source?.profile?.title ||
    'Protokol originality'
  );
}

export default function OriginalityProtocolPage() {
  const [result, setResult] = useState<ProtocolPageResult | null>(null);
  const [error, setError] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('waiting');
  const [attempts, setAttempts] = useState(0);

  const loadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const protocolTitle = useMemo(() => {
    if (!result) return 'Protokol originality';
    return getProtocolTitle(result);
  }, [result]);

  const similarityScore = useMemo(() => {
    return getSimilarityScore(result);
  }, [result]);

  const deviationInterval = useMemo(() => {
    if (similarityScore === null) return null;
    return getDeviationInterval(similarityScore);
  }, [similarityScore]);

  const clearLoadingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const loadProtocol = useCallback(() => {
    try {
      const parsed = readStoredProtocol();

      if (!parsed) {
        return false;
      }

      loadedRef.current = true;
      setResult(parsed);
      setError('');
      setLoadingState('loaded');
      writeProtocolToPrimaryStorage(parsed);
      clearLoadingInterval();

      return true;
    } catch (err) {
      loadedRef.current = false;
      setResult(null);
      setLoadingState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Nepodarilo sa načítať protokol originality.',
      );
      clearLoadingInterval();

      return false;
    }
  }, [clearLoadingInterval]);

  useEffect(() => {
    if (!isBrowser()) return;

    let cancelled = false;
    let attemptCounter = 0;

    const initialLoaded = loadProtocol();

    if (initialLoaded) {
      return;
    }

    setLoadingState('waiting');

    intervalRef.current = setInterval(() => {
      if (cancelled || loadedRef.current) {
        clearLoadingInterval();
        return;
      }

      attemptCounter += 1;
      setAttempts(attemptCounter);

      const loaded = loadProtocol();

      if (loaded) {
        clearLoadingInterval();
        return;
      }

      if (attemptCounter >= MAX_LOADING_ATTEMPTS) {
        setLoadingState('error');
        setError(
          'Protokol sa nenašiel. Najprv spustite kontrolu originality a počkajte, kým systém dokončí výpočet a uloží výsledok.',
        );
        clearLoadingInterval();
      }
    }, LOADING_INTERVAL_MS);

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || STORAGE_KEYS.includes(event.key)) {
        loadProtocol();
      }
    };

    const handleFocus = () => {
      loadProtocol();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadProtocol();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      if (!data || typeof data !== 'object') return;

      if (
        data.type === 'zedpera_originality_protocol_result' ||
        data.type === 'originality_protocol_result'
      ) {
        const normalized = normalizeProtocolForRendering(data.payload || data.result || data);

        if (normalized) {
          loadedRef.current = true;
          setResult(normalized);
          setError('');
          setLoadingState('loaded');
          writeProtocolToPrimaryStorage(normalized);
          clearLoadingInterval();
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('message', handleMessage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearLoadingInterval();

      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clearLoadingInterval, loadProtocol]);

  function handleReloadProtocol() {
    setError('');
    setResult(null);
    setLoadingState('waiting');
    setAttempts(0);
    loadedRef.current = false;

    const loaded = loadProtocol();

    if (!loaded) {
      setLoadingState('error');
      setError(
        'Protokol zatiaľ nebol nájdený v prehliadači. Spustite kontrolu originality ešte raz a počkajte na dokončenie výpočtu.',
      );
    }
  }

  function handleClearProtocol() {
    const confirmed = window.confirm(
      'Naozaj chcete vymazať uložený protokol z prehliadača?',
    );

    if (!confirmed) return;

    removeStoredProtocols();

    loadedRef.current = false;
    setResult(null);
    setError(
      'Uložený protokol bol vymazaný. Pre zobrazenie nového protokolu spustite kontrolu originality znova.',
    );
    setLoadingState('error');
  }

  function handleBackToOriginality() {
    window.location.href = '/dashboard?module=originality';
  }

  function handleCloseWindow() {
    window.close();

    setTimeout(() => {
      if (!window.closed) {
        handleBackToOriginality();
      }
    }, 300);
  }

  if (loadingState === 'waiting' && !result && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 bg-gradient-to-r from-violet-500/20 via-sky-500/10 to-transparent px-7 py-6">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
              <Loader2 className="animate-spin" size={34} />
            </div>

            <h1 className="text-center text-2xl font-black tracking-tight">
              Načítavam protokol originality
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-slate-300">
              Systém čaká na uložený výsledok kontroly originality. Po dokončení
              sa automaticky vykreslia grafy, tabuľky, histogram, detaily
              podobností a plaintext dokumentu.
            </p>
          </div>

          <div className="grid gap-3 p-7">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              Pokus o načítanie:{' '}
              <strong className="text-white">{attempts}</strong> /{' '}
              {MAX_LOADING_ATTEMPTS}
            </div>

            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm leading-7 text-violet-50">
              Ak sa protokol neotvorí automaticky, skontrolujte, či prehliadač
              nepovolil blokovanie nových okien alebo či výsledok kontroly nebol
              uložený pod iným kľúčom v prehliadači.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-red-500/30 bg-red-500/10 shadow-2xl shadow-black/40">
          <div className="border-b border-red-500/20 bg-gradient-to-r from-red-500/20 via-fuchsia-500/10 to-transparent p-6">
            <div className="mb-4 flex items-center gap-3 text-2xl font-black text-red-100">
              <AlertTriangle size={30} />
              Protokol sa nepodarilo načítať
            </div>

            <p className="text-sm leading-7 text-red-50">{error}</p>
          </div>

          <div className="grid gap-4 p-6">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-red-50">
              Odporúčaný postup: vráťte sa do modulu Originalita, spustite
              kontrolu znova a počkajte, kým systém dokončí výpočet. Protokol sa
              má otvoriť až po uložení výsledku do prehliadača.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReloadProtocol}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-gray-100"
              >
                <RotateCcw size={18} />
                Skúsiť znova načítať
              </button>

              <button
                type="button"
                onClick={handleBackToOriginality}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <RefreshCcw size={18} />
                Späť do originality
              </button>

              <button
                type="button"
                onClick={handleCloseWindow}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <X size={18} />
                Zavrieť okno
              </button>
            </div>
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
          html,
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-6xl flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/30 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-400/30 bg-green-500/15 text-green-200">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <div className="text-lg font-black">Protokol originality</div>

            <div className="mt-1 text-sm text-gray-400">{protocolTitle}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1">
                <FileText size={13} />
                Samostatná podstránka
              </span>

              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                Grafy, histogram, tabuľky a pasáže
              </span>

              {similarityScore !== null ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-black text-red-200">
                  Podobnosť: {formatPercent(similarityScore)}
                </span>
              ) : (
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 font-black text-yellow-100">
                  Podobnosť: údaj je potrebné vypočítať
                </span>
              )}

              {deviationInterval ? (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-black text-violet-100">
                  Odchýlka ±{SIMILARITY_DEVIATION_PERCENT} %:{' '}
                  {deviationInterval.label}
                </span>
              ) : (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-black text-violet-100">
                  Odchýlka ±{SIMILARITY_DEVIATION_PERCENT} %: čaká sa na výsledok
                </span>
              )}
            </div>

            {deviationInterval ? (
              <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs leading-6 text-violet-50">
                Orientačný interval výsledku pri odchýlke ±
                {SIMILARITY_DEVIATION_PERCENT} % je{' '}
                <strong>{deviationInterval.label}</strong>. Tento údaj slúži
                ako doplnková kontrolná informácia k protokolu.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-gray-100"
          >
            <Printer size={18} />
            Tlačiť / PDF
          </button>

          <button
            type="button"
            onClick={handleReloadProtocol}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <RotateCcw size={18} />
            Obnoviť
          </button>

          <button
            type="button"
            onClick={handleBackToOriginality}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <RefreshCcw size={18} />
            Späť
          </button>

          <button
            type="button"
            onClick={handleClearProtocol}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/20"
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