'use client';

import { useEffect, useMemo, useState } from 'react';

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
      if (saved) setHistory(JSON.parse(saved));
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

  // ================= SAVE HISTORY =================
  const saveHistory = (q: string) => {
    const updated = [q, ...history.filter((h) => h !== q)].slice(0, 5);
    setHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));
  };

  // ================= AI SUGGESTIONS =================
  const generateSuggestions = async (text: string) => {
    if (text.length < 5) {
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
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  };

  // ================= SEARCH =================
  const searchSources = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;

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

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || data.detail || 'Vyhľadávanie zlyhalo.');
      }

      const foundResults = data.results || [];

      setResults(foundResults);
      setLastApiCount(typeof data.count === 'number' ? data.count : foundResults.length);
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
    setCustomYear(value);

    if (value.length === 4) {
      setYearFrom(`${value}-01-01`);
      setYearTo(`${value}-12-31`);
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
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      {/* HEADER */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200 mb-4">
          OpenAlex • Semantic Scholar • Crossref • CORE • Europe PMC • arXiv • Unpaywall
        </div>

        <h1 className="text-5xl font-black mb-2">
          Vyhľadávanie zdrojov
        </h1>

        <p className="text-gray-400 max-w-5xl mx-auto">
          Nájdite akademické články, štúdie, publikácie, DOI a open-access PDF zdroje
          z viacerých svetových databáz. Zadajte otázku alebo kľúčové slová – AI váš
          dopyt automaticky optimalizuje.
        </p>
      </div>

      {/* SEARCH */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              generateSuggestions(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && searchSources()}
            placeholder="Zadaj tému práce..."
            className="flex-1 bg-transparent px-4 py-3 outline-none text-white placeholder:text-gray-500"
          />

          <button
            onClick={() => searchSources()}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 rounded-xl font-semibold"
          >
            {loading ? 'Hľadám...' : 'Hľadať'}
          </button>
        </div>

        {/* SUGGESTIONS */}
        {suggestions.length > 0 && (
          <div className="bg-white/5 border border-white/10 mt-2 p-3 rounded-xl space-y-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => searchSources(s)}
                className="block w-full text-left cursor-pointer hover:text-purple-400 text-sm py-1"
              >
                🔎 {s}
              </button>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => searchSources(h)}
                className="px-3 py-1 bg-white/10 rounded hover:bg-purple-600/30 text-sm"
              >
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 p-4 rounded-2xl mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {/* PDF */}
          <button
            onClick={() => setOnlyPdf(!onlyPdf)}
            className={`px-4 py-2 rounded-xl ${
              onlyPdf ? 'bg-green-600' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            📄 Len PDF
          </button>

          {/* YEAR FILTERS */}
          <button onClick={setLast2Years} className={btn(activeFilter === '2')}>
            Posledné 2 roky
          </button>

          <button onClick={setLast5Years} className={btn(activeFilter === '5')}>
            Posledné 5 rokov
          </button>

          <button onClick={setRange2010_2015} className={btn(activeFilter === '2010-2015')}>
            2010–2015
          </button>

          <button onClick={setRange2015_2020} className={btn(activeFilter === '2015-2020')}>
            2015–2020
          </button>

          {/* CUSTOM YEAR */}
          <input
            type="number"
            placeholder="Rok (napr. 2022)"
            value={customYear}
            onChange={(e) => handleCustomYear(e.target.value)}
            className="w-40 px-3 py-2 bg-white/10 rounded-xl outline-none text-white placeholder:text-gray-500"
          />

          {/* RESET */}
          <button
            onClick={resetAll}
            className="ml-auto bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl"
          >
            Reset
          </button>
        </div>
      </div>

      {/* RESULT SUMMARY BAR */}
      {(loading || lastSearchQuery || results.length > 0 || error) && (
        <div className="max-w-5xl mx-auto mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-purple-600/20 border border-purple-400/30 px-4 py-2">
              <span className="text-gray-400 text-sm">Nájdené články:</span>{' '}
              <span className="font-bold text-white">
                {loading ? 'hľadám...' : lastApiCount ?? resultCount}
              </span>
            </div>

            {lastSearchQuery && (
              <div className="rounded-xl bg-white/10 px-4 py-2">
                <span className="text-gray-400 text-sm">Dopyt:</span>{' '}
                <span className="font-semibold">{lastSearchQuery}</span>
              </div>
            )}

            <div className="rounded-xl bg-green-600/20 border border-green-400/30 px-4 py-2">
              <span className="text-gray-400 text-sm">Open Access:</span>{' '}
              <span className="font-bold">{openAccessCount}</span>
            </div>

            <div className="rounded-xl bg-blue-600/20 border border-blue-400/30 px-4 py-2">
              <span className="text-gray-400 text-sm">PDF:</span>{' '}
              <span className="font-bold">{pdfCount}</span>
            </div>
          </div>

          {/* SOURCES USED */}
          <div className="mt-4">
            <p className="text-gray-400 text-sm mb-2">
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
        <p className="text-center text-purple-400 mb-6">
          🔍 AI analyzuje tému a hľadá zdroje vo svetových akademických databázach...
        </p>
      )}

      {/* ERROR */}
      {error && (
        <div className="max-w-5xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 text-red-200 p-4 rounded-2xl">
          Chyba: {error}
        </div>
      )}

      {/* EMPTY */}
      {!loading && lastSearchQuery && results.length === 0 && !error && (
        <div className="max-w-5xl mx-auto mb-6 text-center text-gray-400 bg-white/5 border border-white/10 p-8 rounded-2xl">
          Nenašli sa žiadne výsledky. Skúste širší výraz alebo vypnite filter „Len PDF“.
        </div>
      )}

      {/* RESULTS */}
      <div className="max-w-5xl mx-auto space-y-6">
        {results.map((r) => (
          <div
            key={String(r.id)}
            className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-purple-400/40 transition"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {r.source && (
                <span className="text-xs bg-purple-600/30 border border-purple-400/30 px-3 py-1 rounded-full">
                  {r.source}
                </span>
              )}

              {r.isOpenAccess && (
                <span className="text-xs bg-green-600/30 border border-green-400/30 px-3 py-1 rounded-full">
                  Open Access
                </span>
              )}

              {(r.isPdf || r.pdfUrl) && (
                <span className="text-xs bg-blue-600/30 border border-blue-400/30 px-3 py-1 rounded-full">
                  PDF
                </span>
              )}

              {r.year && (
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full">
                  {r.year}
                </span>
              )}
            </div>

            <h3 className="font-bold text-xl mb-2">
              {r.title}
            </h3>

            <p className="text-gray-400 text-sm mb-3">
              {r.authors && r.authors.length > 0
                ? r.authors.join(', ')
                : 'Autori neuvedení'}
              {r.year ? ` • ${r.year}` : ''}
            </p>

            {r.abstract && (
              <p className="text-gray-300 text-sm leading-relaxed">
                {r.abstract}
              </p>
            )}

            {r.doi && (
              <p className="text-gray-500 text-xs mt-3">
                DOI: {r.doi}
              </p>
            )}

            {r.citation && (
              <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-3">
                <p className="text-xs text-gray-400 mb-1">Citácia:</p>
                <p className="text-sm text-gray-300">{r.citation}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-4">
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-blue-400 hover:text-blue-300"
                >
                  Zobraziť článok
                </a>
              )}

              {r.pdfUrl && (
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-green-400 hover:text-green-300"
                >
                  Otvoriť PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================= BUTTON STYLE =================
function btn(active: boolean) {
  return `px-3 py-2 rounded-xl ${
    active ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
  }`;
}