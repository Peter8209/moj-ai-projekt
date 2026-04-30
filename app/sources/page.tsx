'use client';

import { useState } from 'react';

// ================= TYPES =================
type Source = {
  id: number;
  name: string;
  summary?: string;
};

// ================= PAGE =================
export default function SourcesPage() {

  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');

  // ================= UPLOAD =================
  const upload = async () => {
    if (!file) return;

    setLoading(true);

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/sources', {
      method: 'POST',
      body: form
    });

    const data = await res.json();

    setSources(prev => [...prev, data.source]);

    setLoading(false);
  };

  // ================= SEARCH =================
  const searchSources = async () => {

    if (!query) return;

    setLoading(true);

    const res = await fetch('/api/sources', {
      method: 'PUT',
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    setSources(data.results || []);

    setLoading(false);
  };

  // ================= USE SOURCE =================
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
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-black mb-2">Zdroje</h1>
      <p className="text-gray-400 mb-6">
        Nahraj PDF alebo nájdi vedecké zdroje automaticky
      </p>

      {/* ================= UPLOAD ================= */}
      <div className="mb-8 border border-white/10 p-4 rounded-xl">

        <h2 className="font-bold mb-2">Upload PDF</h2>

        <input
          type="file"
          onChange={(e: any) => setFile(e.target.files[0])}
        />

        <button
          onClick={upload}
          className="mt-3 bg-violet-600 px-4 py-2 rounded-xl"
        >
          {loading ? "Nahrávam..." : "Nahrať a analyzovať"}
        </button>

      </div>

      {/* ================= SEARCH ================= */}
      <div className="mb-8 border border-white/10 p-4 rounded-xl">

        <h2 className="font-bold mb-2">Vyhľadať zdroje</h2>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Téma alebo kľúčové slová..."
            className="flex-1 bg-black/30 px-3 py-2 rounded"
          />

          <button
            onClick={searchSources}
            className="bg-violet-600 px-4 rounded"
          >
            Hľadať
          </button>
        </div>

      </div>

      {/* ================= LIST ================= */}
      <div className="grid gap-4">

        {sources.length === 0 && (
          <p className="text-gray-400">
            Zatiaľ nemáš žiadne zdroje
          </p>
        )}

        {sources.map((s) => (
          <div
            key={s.id}
            className="border border-white/10 p-4 rounded-xl"
          >

            <h3 className="font-bold">{s.name}</h3>

            {s.summary && (
              <p className="text-sm text-gray-400 mt-2">
                {s.summary}
              </p>
            )}

            <div className="mt-3 flex gap-2">

              <button
                onClick={() => useSource(s)}
                className="bg-green-600 px-3 py-1 rounded"
              >
                Použiť v práci
              </button>

              <button
                onClick={() => alert("Preklad cez AI")}
                className="bg-blue-600 px-3 py-1 rounded"
              >
                Preložiť
              </button>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}