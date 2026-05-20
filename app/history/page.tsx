'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  Mail,
  MessageSquare,
  Presentation,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type HistoryItem = {
  id: string;
  module: string;
  title: string | null;
  user_message: string | null;
  assistant_message: string | null;
  result?: Record<string, unknown>;
  created_at: string;
};

const filters = [
  { key: 'all', label: 'Všetko' },
  { key: 'chat', label: 'AI chat' },
  { key: 'supervisor', label: 'AI vedúci' },
  { key: 'quality', label: 'Audit kvality' },
  { key: 'defense', label: 'Obhajoba' },
  { key: 'translation', label: 'Preklad' },
  { key: 'data', label: 'Analýza dát' },
  { key: 'planning', label: 'Plánovanie' },
  { key: 'emails', label: 'Emaily' },
  { key: 'originality', label: 'Originalita' },
  { key: 'humanizer', label: 'Humanizácia' },
];

function getModuleLabel(module: string) {
  if (module === 'supervisor') return 'AI vedúci';
  if (module === 'quality') return 'Audit kvality';
  if (module === 'defense') return 'Obhajoba';
  if (module === 'translation') return 'Preklad';
  if (module === 'data') return 'Analýza dát';
  if (module === 'planning') return 'Plánovanie';
  if (module === 'emails') return 'Emaily';
  if (module === 'originality') return 'Originalita';
  if (module === 'humanizer') return 'Humanizácia';
  return 'AI chat';
}

function getModuleIcon(module: string) {
  if (module === 'supervisor') return <GraduationCap className="h-5 w-5" />;
  if (module === 'quality') return <ClipboardCheck className="h-5 w-5" />;
  if (module === 'defense') return <Presentation className="h-5 w-5" />;
  if (module === 'translation') return <MessageSquare className="h-5 w-5" />;
  if (module === 'data') return <BarChart3 className="h-5 w-5" />;
  if (module === 'emails') return <Mail className="h-5 w-5" />;
  if (module === 'originality') return <ShieldCheck className="h-5 w-5" />;
  if (module === 'humanizer') return <Sparkles className="h-5 w-5" />;
  if (module === 'sources') return <FileSearch className="h-5 w-5" />;
  return <MessageSquare className="h-5 w-5" />;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadHistory() {
  setLoading(true);
  setError('');

  try {
    const url =
      activeFilter === 'all'
        ? '/api/history'
        : `/api/history?module=${encodeURIComponent(activeFilter)}`;

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      const loadedItems = Array.isArray(data.items) ? data.items : [];

      setItems(loadedItems);
      setActiveItem(loadedItems[0] || null);
      return;
    }

    const rawLocal = localStorage.getItem('chat_history');
    const localItems = rawLocal ? JSON.parse(rawLocal) : [];
    const safeLocalItems = Array.isArray(localItems) ? localItems : [];

    const filteredLocalItems =
      activeFilter === 'all'
        ? safeLocalItems
        : safeLocalItems.filter((item) => item.module === activeFilter);

    setItems(filteredLocalItems);
    setActiveItem(filteredLocalItems[0] || null);

    if (filteredLocalItems.length === 0) {
      setError(data?.error || 'Používateľ nie je prihlásený.');
    } else {
      setError('');
    }
  } catch (err) {
    const rawLocal = localStorage.getItem('chat_history');
    const localItems = rawLocal ? JSON.parse(rawLocal) : [];
    const safeLocalItems = Array.isArray(localItems) ? localItems : [];

    const filteredLocalItems =
      activeFilter === 'all'
        ? safeLocalItems
        : safeLocalItems.filter((item) => item.module === activeFilter);

    setItems(filteredLocalItems);
    setActiveItem(filteredLocalItems[0] || null);

    if (filteredLocalItems.length === 0) {
      setError(
        err instanceof Error
          ? err.message
          : 'Históriu sa nepodarilo načítať.',
      );
    }
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, HistoryItem[]>>((acc, item) => {
      const key = item.module || 'chat';
      acc[key] ||= [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950 dark:bg-[#020617] dark:text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black">História chatu</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tu sa zobrazujú uložené výstupy z AI chatu, AI vedúceho, auditu,
              obhajoby, originality a ďalších modulov.
            </p>
          </div>

          <a
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white dark:bg-white dark:text-slate-950"
          >
            Späť do menu
          </a>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setActiveFilter(filter.key);
                setActiveItem(null);
              }}
              className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition ${
                activeFilter === filter.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            Načítavam históriu...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            História je zatiaľ prázdna. Spusti niektorý modul v dashboarde a
            výstup sa sem uloží.
          </div>
        ) : null}

        {!loading && !error && items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <div className="space-y-5">
              {Object.entries(groupedItems).map(([module, records]) => (
                <section
                  key={module}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                >
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-500 dark:text-slate-300">
                    {getModuleIcon(module)}
                    {getModuleLabel(module)}
                  </div>

                  <div className="space-y-3">
                    {records.map((item) => {
                      const active = activeItem?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveItem(item)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
                              : 'border-slate-100 bg-slate-50 hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-violet-500/10'
                          }`}
                        >
                          <div className="font-black">
                            {item.title || getModuleLabel(item.module)}
                          </div>

                          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {new Date(item.created_at).toLocaleString('sk-SK')}
                          </div>

                          <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                            {item.assistant_message || 'Bez výstupu'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              {activeItem ? (
                <>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                      {getModuleIcon(activeItem.module)}
                    </div>

                    <div>
                      <h2 className="text-xl font-black">
                        {activeItem.title || getModuleLabel(activeItem.module)}
                      </h2>
                      <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {new Date(activeItem.created_at).toLocaleString(
                          'sk-SK',
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-black/20">
                    <div className="mb-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                      Zadanie
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-6">
                      {activeItem.user_message || 'Bez zadania'}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-black/20">
                    <div className="mb-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                      Výstup
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-7">
                      {activeItem.assistant_message || 'Bez výstupu'}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 dark:text-slate-300">
                  Vyber záznam z histórie.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}