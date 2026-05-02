'use client';

import { useState, useEffect } from 'react';

// ================= TYPES =================
type Source = {
  id: number;
  title: string;
  abstract?: string;
  year?: number;
  authors?: string[];
  url?: string;
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

  const [activeFilter, setActiveFilter] = useState<
    'none' | '2' | '5' | '2010-2015' | '2015-2020' | 'custom'
  >('none');

  const [suggestions, setSuggestions] = useState<string[]>([]);

  // ================= LOAD HISTORY =================
  useEffect(() => {
    const saved = localStorage.getItem('search_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // ================= SAVE HISTORY =================
  const saveHistory = (q: string) => {
    const updated = [q, ...history.filter(h => h !== q)].slice(0, 3);
    setHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));
  };

  // ================= AI SUGGESTIONS =================
  const generateSuggestions = async (text: string) => {
    if (text.length < 5) return setSuggestions([]);

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
    saveHistory(q);
    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          yearFrom,
          yearTo,
          onlyPdf
        }),
      });

      const data = await res.json();
      setResults(data.results || []);

    } catch {
      setResults([]);
    }

    setLoading(false);
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
    setYearFrom(`2010-01-01`);
    setYearTo(`2015-12-31`);
    setCustomYear('');
    setActiveFilter('2010-2015');
  };

  const setRange2015_2020 = () => {
    setYearFrom(`2015-01-01`);
    setYearTo(`2020-12-31`);
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
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black mb-2">
          Vyhľadávanie zdrojov
        </h1>
        <p className="text-gray-400">
          Nájdite akademické články, štúdie a publikácie pre vašu záverečnú prácu z databázy Semantic Scholar. Zadajte otázku alebo kľúčové slová – AI váš dopyt automaticky optimalizuje.
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
            className="flex-1 bg-transparent px-4 py-3 outline-none"
          />

          <button
            onClick={() => searchSources()}
            className="bg-purple-600 px-6 rounded-xl"
          >
            Hľadať
          </button>
        </div>

        {/* SUGGESTIONS */}
        {suggestions.length > 0 && (
          <div className="bg-white/5 mt-2 p-3 rounded-xl space-y-1">
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => searchSources(s)}
                className="cursor-pointer hover:text-purple-400"
              >
                🔎 {s}
              </div>
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
      <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 p-4 rounded-2xl mb-8">

        <div className="flex flex-wrap gap-3 items-center">

          {/* PDF */}
          <button
            onClick={() => setOnlyPdf(!onlyPdf)}
            className={`px-4 py-2 rounded-xl ${
              onlyPdf ? 'bg-green-600' : 'bg-white/10'
            }`}
          >
            📄 Len PDF
          </button>

          {/* YEAR FILTERS */}
          <button onClick={setLast2Years} className={btn(activeFilter==='2')}>
            Posledné 2 roky
          </button>

          <button onClick={setLast5Years} className={btn(activeFilter==='5')}>
            Posledné 5 rokov
          </button>

          <button onClick={setRange2010_2015} className={btn(activeFilter==='2010-2015')}>
            2010–2015
          </button>

          <button onClick={setRange2015_2020} className={btn(activeFilter==='2015-2020')}>
            2015–2020
          </button>

          {/* CUSTOM YEAR */}
          <input
            type="number"
            placeholder="Rok (napr. 2022)"
            value={customYear}
            onChange={(e) => handleCustomYear(e.target.value)}
            className="w-40 px-3 py-1 bg-white/10 rounded"
          />

          {/* RESET */}
          <button
            onClick={resetAll}
            className="ml-auto bg-red-600 px-4 py-2 rounded-xl"
          >
            Reset
          </button>

        </div>

      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-center text-purple-400">
          🔍 AI analyzuje tému a hľadá zdroje...
        </p>
      )}

      {/* RESULTS */}
      <div className="max-w-5xl mx-auto space-y-6">
        {results.map(r => (
          <div key={r.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="font-bold text-xl mb-2">{r.title}</h3>
            <p className="text-gray-400 text-sm mb-2">
              {r.authors?.join(', ')} • {r.year}
            </p>
            <p className="text-gray-300 text-sm">{r.abstract}</p>

            {r.url && (
              <a href={r.url} target="_blank" className="mt-3 inline-block text-blue-400">
                Zobraziť článok
              </a>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

// ================= BUTTON STYLE =================
function btn(active:boolean){
  return `px-3 py-1 rounded ${
    active ? 'bg-purple-600' : 'bg-white/10'
  }`;
}