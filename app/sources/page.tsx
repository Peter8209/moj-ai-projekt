'use client';

import { useState, useEffect } from 'react';

type Source = {
  id: number;
  title: string;
  abstract?: string;
  year?: number;
  authors?: string[];
  url?: string;
};

export default function SourcesPage() {

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [recent, setRecent] = useState<Source[]>([]);
  const [recommended, setRecommended] = useState<Source[]>([]);

  const [sort, setSort] = useState('relevance');
  const [onlyPdf, setOnlyPdf] = useState(false);

  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [yearPreset, setYearPreset] = useState('all');

  // ================= LOAD =================
  useEffect(() => {
    const h = localStorage.getItem('search_history');
    const r = localStorage.getItem('recent_papers');

    if (h) setHistory(JSON.parse(h));
    if (r) setRecent(JSON.parse(r));
  }, []);

  // ================= HISTORY =================
  const saveToHistory = (q: string) => {
    const updated = [q, ...history.filter(x => x !== q)].slice(0, 3);
    setHistory(updated);
    localStorage.setItem('search_history', JSON.stringify(updated));

    generateRecommendations(updated);
  };

  // ================= RECENT =================
  const saveRecentPaper = (paper: Source) => {
    const updated = [paper, ...recent.filter(p => p.title !== paper.title)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem('recent_papers', JSON.stringify(updated));
  };

  // ================= AI RECOMMEND =================
  const generateRecommendations = async (queries: string[]) => {
    if (!queries.length) return;

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "search", query: queries.join(' ') })
      });

      const data = await res.json();
      setRecommended(data.results?.slice(0, 3) || []);
    } catch {
      setRecommended([]);
    }
  };

  // ================= SEARCH =================
  const searchSources = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q) return;

    setQuery(q);
    saveToHistory(q);

    setLoading(true);

    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "search",
        query: q,
        filters: { sort, onlyPdf, yearFrom, yearTo }
      }),
    });

    const data = await res.json();
    setSources(data.results || []);
    setLoading(false);
  };

  // ================= YEAR =================
  const setYearPresetHandler = (type: string) => {
    setYearPreset(type);

    switch (type) {
      case '2010-2015':
        setYearFrom('2010-01-01');
        setYearTo('2015-12-31');
        break;

      case '2015-2020':
        setYearFrom('2015-01-01');
        setYearTo('2020-12-31');
        break;

      default:
        setYearFrom('');
        setYearTo('');
    }
  };

  // ================= RESET =================
  const resetFilters = () => {
    setQuery('');
    setSources([]);
    setSort('relevance');
    setOnlyPdf(false);
    setYearFrom('');
    setYearTo('');
    setYearPreset('all');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* HERO */}
      <div className="py-20 text-center px-6">

        <h1 className="text-5xl font-black mb-4">
          Vyhľadávanie zdrojov
        </h1>

        <p className="text-purple-400 text-sm mb-8">
          🔬 viac ako 200 000 000 vedeckých článkov
        </p>

        {/* SEARCH */}
        <div className="max-w-4xl mx-auto flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zadaj otázku..."
            className="flex-1 bg-transparent px-4 py-3 outline-none"
          />

          <button
            onClick={() => searchSources()}
            className="bg-purple-600 px-6 rounded-xl"
          >
            Hľadať
          </button>

        </div>

        {/* HISTORY */}
        {history.length > 0 && (
          <div className="flex gap-3 mt-6 justify-center flex-wrap">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => searchSources(h)}
                className="px-4 py-2 bg-white/10 hover:bg-purple-600/30 rounded-xl text-sm"
              >
                {h}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* FILTERS */}
      <div className="max-w-6xl mx-auto px-6 mb-10">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-wrap gap-3 items-center">

          {/* SORT */}
          {[
            { value: 'relevance', label: 'Relevantné' },
            { value: 'year', label: 'Najnovšie' },
            { value: 'citations', label: 'Najcitovanejšie' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-4 py-2 rounded-xl ${
                sort === opt.value ? 'bg-purple-600' : 'bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <button
            onClick={() => setOnlyPdf(!onlyPdf)}
            className={`px-4 py-2 rounded-xl ${
              onlyPdf ? 'bg-green-600' : 'bg-white/10'
            }`}
          >
            📄 Len PDF
          </button>

          {[
            { key: 'all', label: 'Všetko' },
            { key: '2010-2015', label: '2010–2015' },
            { key: '2015-2020', label: '2015–2020' },
          ].map(y => (
            <button
              key={y.key}
              onClick={() => setYearPresetHandler(y.key)}
              className={`px-4 py-2 rounded-xl ${
                yearPreset === y.key ? 'bg-purple-600' : 'bg-white/10'
              }`}
            >
              {y.label}
            </button>
          ))}

          {/* RESET */}
          <button
            onClick={resetFilters}
            className="bg-red-600 px-4 py-2 rounded-xl ml-auto"
          >
            Reset
          </button>

        </div>
      </div>

      {/* RESULTS */}
      <div className="max-w-5xl mx-auto px-6 pb-20">

        {loading && (
          <p className="text-center text-purple-400">
            🔍 Hľadám...
          </p>
        )}

        <div className="grid gap-6">

          {sources.map(s => (
            <div key={s.id} className="bg-white/5 p-6 rounded-xl">

              <h3 className="font-bold text-lg">{s.title}</h3>

              <p className="text-gray-400 text-sm">
                {s.authors?.join(', ')} • {s.year}
              </p>

              <p className="mt-3 text-gray-300">{s.abstract}</p>

              <div className="mt-4 flex gap-3">

                <button
                  onClick={() => saveRecentPaper(s)}
                  className="bg-green-600 px-3 py-1 rounded"
                >
                  Použiť
                </button>

                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    onClick={() => saveRecentPaper(s)}
                    className="bg-blue-600 px-3 py-1 rounded"
                  >
                    Otvoriť
                  </a>
                )}

              </div>

            </div>
          ))}

        </div>

        {/* RECENT */}
        {recent.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-4">
              📄 Nedávno otvorené
            </h2>

            <div className="grid gap-3">
              {recent.map((r, i) => (
                <button
                  key={i}
                  onClick={() => searchSources(r.title)}
                  className="bg-white/5 p-3 rounded hover:bg-purple-600/20 text-left"
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDED */}
        {recommended.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-4">
              🧠 Odporúčané pre teba
            </h2>

            <div className="grid gap-3">
              {recommended.map((r, i) => (
                <button
                  key={i}
                  onClick={() => searchSources(r.title)}
                  className="bg-purple-600/10 p-3 rounded hover:bg-purple-600/30 text-left"
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}