'use client';

import { useState } from 'react';

// ================= TYPES =================
type Source = {
  id: number;
  title: string;
  abstract?: string;
  year?: number;
  authors?: string[];
  url?: string;
  citation?: string;
};

// ================= PAGE =================
export default function SourcesPage() {

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const [yearFilter, setYearFilter] = useState<string>('all');

  // ================= SEARCH =================
  const searchSources = async () => {
    if (!query) return;

    setLoading(true);

    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "search",
        query,
      }),
    });

    const data = await res.json();

    setSources(data.results || []);
    setLoading(false);
  };

  // ================= FILTER =================
  const filteredSources = sources.filter((s) => {
    if (yearFilter === 'all') return true;

    if (yearFilter === '2y') return s.year && s.year >= 2023;
    if (yearFilter === '5y') return s.year && s.year >= 2020;

    return true;
  });

  // ================= USE =================
  const useSource = (s: Source) => {
    const existing = localStorage.getItem('used_sources');
    const parsed = existing ? JSON.parse(existing) : [];

    localStorage.setItem(
      'used_sources',
      JSON.stringify([...parsed, s])
    );

    alert("Zdroj pridaný do práce");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      {/* ================= HERO ================= */}
      <div className="py-20 px-6 text-center bg-gradient-to-b from-purple-900/20 to-transparent">

        <h1 className="text-5xl font-black mb-4">
          Vyhľadávanie zdrojov
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto mb-10">
          Nájdeš vedecké články zo Semantic Scholar.
          AI automaticky optimalizuje tvoje vyhľadávanie.
        </p>

        {/* SEARCH BAR */}
        <div className="max-w-3xl mx-auto flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zadaj otázku alebo kľúčové slová..."
            className="flex-1 bg-transparent px-4 py-3 outline-none"
          />

          <button
            onClick={searchSources}
            className="bg-purple-600 px-6 rounded-xl"
          >
            Hľadať
          </button>

        </div>

      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="max-w-5xl mx-auto px-6 mb-10">

        <div className="bg-white/5 p-4 rounded-2xl flex flex-wrap gap-3 border border-white/10">

          <button
            onClick={() => setYearFilter('all')}
            className={`px-3 py-1 rounded-full ${
              yearFilter === 'all' ? 'bg-purple-600' : 'bg-white/10'
            }`}
          >
            Všetko
          </button>

          <button
            onClick={() => setYearFilter('2y')}
            className={`px-3 py-1 rounded-full ${
              yearFilter === '2y' ? 'bg-purple-600' : 'bg-white/10'
            }`}
          >
            Posledné 2 roky
          </button>

          <button
            onClick={() => setYearFilter('5y')}
            className={`px-3 py-1 rounded-full ${
              yearFilter === '5y' ? 'bg-purple-600' : 'bg-white/10'
            }`}
          >
            Posledných 5 rokov
          </button>

        </div>

      </div>

      {/* ================= RESULTS ================= */}
      <div className="max-w-5xl mx-auto px-6 pb-20">

        {loading && (
          <p className="text-purple-400 text-center mb-10">
            🔍 Hľadám najrelevantnejšie zdroje...
          </p>
        )}

        {!loading && filteredSources.length === 0 && (
          <p className="text-gray-400 text-center">
            Zadaj tému a začni vyhľadávať
          </p>
        )}

        <div className="grid gap-6">

          {filteredSources.map((s) => (
            <div
              key={s.id}
              className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-purple-500 transition"
            >

              {/* TITLE */}
              <h3 className="text-xl font-bold mb-2">
                {s.title}
              </h3>

              {/* META */}
              <p className="text-sm text-gray-400">
                {s.authors?.join(', ')} • {s.year}
              </p>

              {/* ABSTRACT */}
              <p className="text-gray-300 mt-3 line-clamp-4">
                {s.abstract}
              </p>

              {/* ACTIONS */}
              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  onClick={() => useSource(s)}
                  className="bg-green-600 px-4 py-2 rounded-xl"
                >
                  Použiť v práci
                </button>

                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    className="bg-blue-600 px-4 py-2 rounded-xl"
                  >
                    Otvoriť článok
                  </a>
                )}

                {s.citation && (
                  <button
                    onClick={() => navigator.clipboard.writeText(s.citation!)}
                    className="bg-white/10 px-4 py-2 rounded-xl"
                  >
                    Kopírovať citáciu
                  </button>
                )}

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}