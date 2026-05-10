'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ================= TYPES =================

type Source = {
  id: number | string;
  originalId?: string;
  paperId?: string | null;
  source?: string;
  sourceKey?: string;
  title: string;
  abstract?: string;
  year?: number | null;
  publicationDate?: string | null;
  authors?: string[];
  url?: string | null;
  doi?: string | null;
  isPdf?: boolean;
  pdfUrl?: string | null;
  isOpenAccess?: boolean;
  citation?: string;
  publicationTypes?: string[];
  externalIds?: Record<string, any>;
};

type ActiveFilter =
  | 'none'
  | '2'
  | '5'
  | '2010-2015'
  | '2015-2020'
  | 'custom';

type ApiResponse = {
  ok?: boolean;
  source?: string;
  count?: number;
  results?: Source[];
  filters?: any;
  databases?: Record<string, boolean>;
  error?: string;
  detail?: string;
};

const SOURCE_LABELS: Record<string, string> = {
  openalex: 'OpenAlex',
  semanticScholar: 'Semantic Scholar',
  crossref: 'Crossref',
  core: 'CORE',
  europePmc: 'Europe PMC',
  arxiv: 'arXiv',
};

export default function Page() {
  const router = useRouter();

  const pageRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const [results, setResults] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [onlyPdf, setOnlyPdf] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [customYear, setCustomYear] = useState('');

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('none');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastApiCount, setLastApiCount] = useState<number | null>(null);

  // ================= LOAD HISTORY =================

  useEffect(() => {
    try {
      const saved = localStorage.getItem('search_history');

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {
      setHistory([]);
    }
  }, []);

  // ================= RESULT STATS =================

  const resultCount = results.length;

  const sourceStats = useMemo(() => {
    const map = new Map<string, number>();

    for (const item of results) {
      const source = item.source || 'Neznámy zdroj';

      const splitSources = source
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (splitSources.length === 0) {
        map.set('Neznámy zdroj', (map.get('Neznámy zdroj') || 0) + 1);
        continue;
      }

      for (const s of splitSources) {
        map.set(s, (map.get(s) || 0) + 1);
      }
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const pdfCount = useMemo(() => {
    return results.filter((item) => item.isPdf || item.pdfUrl).length;
  }, [results]);

  const openAccessCount = useMemo(() => {
    return results.filter((item) => item.isOpenAccess).length;
  }, [results]);

  // ================= MENU / DASHBOARD =================

  const goToMenu = () => {
    router.push('/dashboard');
  };

  // ================= SCROLL =================

  const scrollToTop = () => {
    pageRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  // ================= SAVE HISTORY =================

  const saveHistory = (q: string) => {
    const clean = q.trim();

    if (!clean) return;

    const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, 5);

    setHistory(updated);

    try {
      localStorage.setItem('search_history', JSON.stringify(updated));
    } catch {
      // localStorage nemusí byť dostupný napr. v private režime
    }
  };

  // ================= AI SUGGESTIONS =================

  const generateSuggestions = async (text: string) => {
    if (text.trim().length < 5) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', query: text }),
      });

      const data = await res.json();

      if (Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    }
  };

  // ================= SEARCH =================

  const searchSources = async (customQuery?: string) => {
    const q = (customQuery || query).trim();

    if (!q) return;

    setQuery(q);
    setLastSearchQuery(q);
    saveHistory(q);
    setLoading(true);
    setSuggestions([]);
    setError('');
    setLastApiCount(null);

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: q,
          yearFrom,
          yearTo,
          onlyPdf,
        }),
      });

      let data: ApiResponse = {};

      try {
        data = (await res.json()) as ApiResponse;
      } catch {
        data = {};
      }

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.detail || 'Vyhľadávanie zlyhalo.');
      }

      const foundResults = Array.isArray(data.results) ? data.results : [];

      setResults(foundResults);
      setLastApiCount(typeof data.count === 'number' ? data.count : foundResults.length);

      if (foundResults.length > 0) {
        setTimeout(() => {
          scrollToResults();
        }, 150);
      }
    } catch (err) {
      setResults([]);
      setLastApiCount(0);
      setError(err instanceof Error ? err.message : 'Vyhľadávanie zlyhalo.');
    } finally {
      setLoading(false);
    }
  };

  // ================= FILTERS =================

  const setLast2Years = () => {
    const now = new Date().getFullYear();

    setYearFrom(`${now - 2}-01-01`);
    setYearTo(`${now}-12-31`);
    setCustomYear('');
    setActiveFilter('2');
  };

  const setLast5Years = () => {
    const now = new Date().getFullYear();

    setYearFrom(`${now - 5}-01-01`);
    setYearTo(`${now}-12-31`);
    setCustomYear('');
    setActiveFilter('5');
  };

  const setRange2010_2015 = () => {
    setYearFrom('2010-01-01');
    setYearTo('2015-12-31');
    setCustomYear('');
    setActiveFilter('2010-2015');
  };

  const setRange2015_2020 = () => {
    setYearFrom('2015-01-01');
    setYearTo('2020-12-31');
    setCustomYear('');
    setActiveFilter('2015-2020');
  };

  const handleCustomYear = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);

    setCustomYear(cleanValue);

    if (cleanValue.length === 4) {
      setYearFrom(`${cleanValue}-01-01`);
      setYearTo(`${cleanValue}-12-31`);
      setActiveFilter('custom');
    } else {
      setYearFrom('');
      setYearTo('');
      setActiveFilter('none');
    }
  };

  // ================= RESET =================

  const resetAll = () => {
    setQuery('');
    setResults([]);
    setYearFrom('');
    setYearTo('');
    setOnlyPdf(false);
    setCustomYear('');
    setActiveFilter('none');
    setSuggestions([]);
    setError('');
    setLastSearchQuery('');
    setLastApiCount(null);

    setTimeout(() => {
      scrollToTop();
    }, 50);
  };

  // ================= UI =================

  return (
    <div
      ref={pageRef}
      className="h-screen overflow-y-auto bg-[#020617] text-white"
    >
      <div className="min-h-screen px-4 py-5 pb-24 sm:px-6 lg:px-8">
        {/* TOP NAV */}
        <div className="sticky top-0 z-50 -mx-4 mb-8 border-b border-white/10 bg-[#020617]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToMenu}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              ☰ Menu
            </button>

            <div className="hidden text-center text-sm text-gray-400 md:block">
              Akademické zdroje a citácie
            </div>

            <div className="flex items-center gap-2">
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={scrollToResults}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700"
                >
                  Výsledky
                </button>
              )}

              <button
                type="button"
                onClick={scrollToTop}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Hore
              </button>
            </div>
          </div>
        </div>

        {/* HEADER */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
            OpenAlex • Semantic Scholar • Crossref • CORE • Europe PMC • arXiv • Unpaywall
          </div>

          <h1 className="mb-2 text-4xl font-black sm:text-5xl">
            Vyhľadávanie zdrojov
          </h1>

          <p className="mx-auto max-w-5xl text-gray-400">
            Nájdite akademické články, štúdie, publikácie, DOI a open-access PDF zdroje
            z viacerých svetových databáz. Zadajte otázku alebo kľúčové slová – AI váš
            dopyt automaticky optimalizuje.
          </p>
        </div>

        {/* SEARCH */}
        <div className="mx-auto mb-6 max-w-4xl">
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                generateSuggestions(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchSources();
                }
              }}
              placeholder="Zadaj tému práce..."
              className="min-h-[52px] flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <button
              type="button"
              onClick={() => searchSources()}
              disabled={loading}
              className="min-h-[52px] rounded-xl bg-purple-600 px-6 font-semibold hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Hľadám...' : 'Hľadať'}
            </button>
          </div>

          {/* SUGGESTIONS */}
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3">
              {suggestions.map((s, i) => (
                <button
                  type="button"
                  key={`${s}-${i}`}
                  onClick={() => searchSources(s)}
                  className="block w-full cursor-pointer py-1 text-left text-sm hover:text-purple-400"
                >
                  🔎 {s}
                </button>
              ))}
            </div>
          )}

          {/* HISTORY */}
          {history.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {history.map((h, i) => (
                <button
                  type="button"
                  key={`${h}-${i}`}
                  onClick={() => searchSources(h)}
                  className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-purple-600/30"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FILTER BAR */}
        <div className="mx-auto mb-6 max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyPdf(!onlyPdf)}
              className={`rounded-xl px-4 py-2 ${
                onlyPdf ? 'bg-green-600' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              📄 Len PDF
            </button>

            <button
              type="button"
              onClick={setLast2Years}
              className={btn(activeFilter === '2')}
            >
              Posledné 2 roky
            </button>

            <button
              type="button"
              onClick={setLast5Years}
              className={btn(activeFilter === '5')}
            >
              Posledné 5 rokov
            </button>

            <button
              type="button"
              onClick={setRange2010_2015}
              className={btn(activeFilter === '2010-2015')}
            >
              2010–2015
            </button>

            <button
              type="button"
              onClick={setRange2015_2020}
              className={btn(activeFilter === '2015-2020')}
            >
              2015–2020
            </button>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Rok, napr. 2022"
              value={customYear}
              onChange={(e) => handleCustomYear(e.target.value)}
              className="w-44 rounded-xl bg-white/10 px-3 py-2 text-white outline-none placeholder:text-gray-500"
            />

            <button
              type="button"
              onClick={resetAll}
              className="rounded-xl bg-red-600 px-4 py-2 hover:bg-red-700 sm:ml-auto"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RESULT SUMMARY BAR */}
        {(loading || lastSearchQuery || results.length > 0 || error) && (
          <div className="mx-auto mb-8 max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-purple-400/30 bg-purple-600/20 px-4 py-2">
                <span className="text-sm text-gray-400">Nájdené články:</span>{' '}
                <span className="font-bold text-white">
                  {loading ? 'hľadám...' : lastApiCount ?? resultCount}
                </span>
              </div>

              {lastSearchQuery && (
                <div className="rounded-xl bg-white/10 px-4 py-2">
                  <span className="text-sm text-gray-400">Dopyt:</span>{' '}
                  <span className="font-semibold">{lastSearchQuery}</span>
                </div>
              )}

              <div className="rounded-xl border border-green-400/30 bg-green-600/20 px-4 py-2">
                <span className="text-sm text-gray-400">Open Access:</span>{' '}
                <span className="font-bold">{openAccessCount}</span>
              </div>

              <div className="rounded-xl border border-blue-400/30 bg-blue-600/20 px-4 py-2">
                <span className="text-sm text-gray-400">PDF:</span>{' '}
                <span className="font-bold">{pdfCount}</span>
              </div>
            </div>

            {/* SOURCES USED */}
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-400">
                Zdroje výsledkov:
              </p>

              {sourceStats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sourceStats.map((source) => (
                    <span
                      key={source.name}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm"
                    >
                      <span>{source.name}</span>
                      <span className="rounded-full bg-purple-600 px-2 py-0.5 text-xs font-bold">
                        {source.count}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <span
                      key={key}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-gray-400"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {(yearFrom || yearTo || onlyPdf) && (
              <div className="mt-4 text-sm text-gray-400">
                Aktívny filter:{' '}
                {yearFrom && yearTo ? `${yearFrom} až ${yearTo}` : 'bez časového filtra'}
                {onlyPdf ? ' • iba PDF' : ''}
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <p className="mb-6 text-center text-purple-400">
            🔍 AI analyzuje tému a hľadá zdroje vo svetových akademických databázach...
          </p>
        )}

        {/* ERROR */}
        {error && (
          <div className="mx-auto mb-6 max-w-5xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Chyba: {error}
          </div>
        )}

        {/* EMPTY */}
        {!loading && lastSearchQuery && results.length === 0 && !error && (
          <div className="mx-auto mb-6 max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
            Nenašli sa žiadne výsledky. Skúste širší výraz alebo vypnite filter „Len PDF“.
          </div>
        )}

        {/* RESULTS */}
        <div
          ref={resultsRef}
          className="mx-auto max-w-5xl scroll-mt-28 space-y-6"
        >
          {results.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">
                Výsledky vyhľadávania
              </h2>

              <button
                type="button"
                onClick={scrollToTop}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Späť hore
              </button>
            </div>
          )}

          {results.map((r, index) => (
            <div
              key={`${String(r.id)}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-400/40"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {r.source && (
                  <span className="rounded-full border border-purple-400/30 bg-purple-600/30 px-3 py-1 text-xs">
                    {r.source}
                  </span>
                )}

                {r.isOpenAccess && (
                  <span className="rounded-full border border-green-400/30 bg-green-600/30 px-3 py-1 text-xs">
                    Open Access
                  </span>
                )}

                {(r.isPdf || r.pdfUrl) && (
                  <span className="rounded-full border border-blue-400/30 bg-blue-600/30 px-3 py-1 text-xs">
                    PDF
                  </span>
                )}

                {r.year && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    {r.year}
                  </span>
                )}
              </div>

              <h3 className="mb-2 text-xl font-bold">
                {r.title || 'Bez názvu'}
              </h3>

              <p className="mb-3 text-sm text-gray-400">
                {r.authors && r.authors.length > 0
                  ? r.authors.join(', ')
                  : 'Autori neuvedení'}
                {r.year ? ` • ${r.year}` : ''}
              </p>

              {r.abstract && (
                <p className="text-sm leading-relaxed text-gray-300">
                  {r.abstract}
                </p>
              )}

              {r.doi && (
                <p className="mt-3 text-xs text-gray-500">
                  DOI: {r.doi}
                </p>
              )}

              {r.citation && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-1 text-xs text-gray-400">
                    Citácia:
                  </p>

                  <p className="text-sm text-gray-300">
                    {r.citation}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-xl border border-blue-400/30 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-600/20"
                  >
                    Zobraziť článok
                  </a>
                )}

                {r.pdfUrl && (
                  <a
                    href={r.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-xl border border-green-400/30 bg-green-600/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-600/20"
                  >
                    Otvoriť PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================= BUTTON STYLE =================

function btn(active: boolean) {
  return `rounded-xl px-3 py-2 ${
    active ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
  }`;
}