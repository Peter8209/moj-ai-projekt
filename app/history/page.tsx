'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type HistoryItem = {
  id: string;
  type: 'write' | 'supervisor' | 'audit' | 'defense' | 'sources';
  title: string;
  preview: string;
  created_at: string;
};

export default function HistoryPage() {

  const router = useRouter();
  const [data, setData] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // ================= LOAD DATA =================
  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(res => {
        setData(res.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ================= FILTER =================
  const filtered = filter === 'all'
    ? data
    : data.filter(item => item.type === filter);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">

      {/* HEADER */}
      <h1 className="text-3xl font-black mb-2">
        História práce
      </h1>

      <p className="text-gray-400 mb-6">
        Všetky tvoje generovania, analýzy a kontroly na jednom mieste
      </p>

      {/* FILTERS */}
      <div className="flex gap-2 mb-6 flex-wrap">

        {[
          ['all', 'Všetko'],
          ['write', 'Písanie'],
          ['supervisor', 'AI vedúci'],
          ['audit', 'Kontrola'],
          ['defense', 'Obhajoba'],
          ['sources', 'Zdroje']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-sm ${
              filter === key
                ? 'bg-violet-600 text-white'
                : 'bg-white/10 text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}

      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-gray-400">
          Načítavam históriu...
        </div>
      )}

      {/* EMPTY */}
      {!loading && filtered.length === 0 && (
        <div className="text-gray-400">
          Zatiaľ nemáš žiadnu históriu.
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4">

        {filtered.map(item => (
          <div
            key={item.id}
            className="border border-white/10 p-5 rounded-xl bg-white/5 hover:bg-white/10 transition"
          >

            {/* TYPE */}
            <div className="text-xs text-violet-400 font-bold mb-1 uppercase">
              {typeLabel(item.type)}
            </div>

            {/* TITLE */}
            <h3 className="text-lg font-bold">
              {item.title}
            </h3>

            {/* PREVIEW */}
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
              {item.preview}
            </p>

            {/* DATE */}
            <div className="text-xs text-gray-500 mt-3">
              {formatDate(item.created_at)}
            </div>

            {/* ACTION */}
            <button
              onClick={() => router.push(`/chat?history=${item.id}`)}
              className="mt-4 bg-violet-600 px-4 py-2 rounded-xl text-sm"
            >
              Otvoriť
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}

// ================= HELPERS =================

function typeLabel(type: string) {
  switch (type) {
    case 'write': return 'Písanie';
    case 'supervisor': return 'AI vedúci';
    case 'audit': return 'Kontrola kvality';
    case 'defense': return 'Obhajoba';
    case 'sources': return 'Zdroje';
    default: return 'Iné';
  }
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleString('sk-SK');
  } catch {
    return date;
  }
}