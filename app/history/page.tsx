'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Calendar,
  FileText,
  History,
  MessageCircle,
  Search,
  Trash2,
} from 'lucide-react';

type HistoryItem = {
  id: string;
  user_email: string;
  type: string;
  title: string;
  preview: string | null;
  content: string | null;
  metadata?: Record<string, any>;
  created_at: string;
};

const filters = [
  { id: 'all', label: 'Všetko' },
  { id: 'chat', label: 'Chat' },
  { id: 'write', label: 'Písanie' },
  { id: 'supervisor', label: 'AI Vedúci' },
  { id: 'audit', label: 'Audit' },
  { id: 'defense', label: 'Obhajoba' },
  { id: 'sources', label: 'Zdroje' },
  { id: 'data', label: 'Dáta' },
];

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getIcon(type: string) {
  if (type === 'chat') return <MessageCircle className="h-5 w-5" />;
  if (type === 'supervisor') return <Bot className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

export default function HistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadHistory() {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('limit', '100');

      if (filter !== 'all') params.set('type', filter);
      if (query.trim()) params.set('q', query.trim());

      const res = await fetch(`/api/history?${params.toString()}`, {
        cache: 'no-store',
      });

      const data = await res.json();

      if (data.ok) {
        setItems(data.items || []);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('History load error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 250);

    return () => clearTimeout(timer);
  }, [filter, query]);

  async function deleteItem(id: string) {
    if (!confirm('Naozaj chcete vymazať tento záznam z histórie?')) return;

    setDeletingId(id);

    try {
      const res = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    } catch (error) {
      console.error('History delete error:', error);
    } finally {
      setDeletingId(null);
    }
  }

  const emptyText = useMemo(() => {
    if (query.trim()) return 'Nenašli sa žiadne záznamy pre zadané hľadanie.';
    if (filter !== 'all') return 'Pre tento modul zatiaľ nie je uložená história.';
    return 'Zatiaľ nemáte uloženú žiadnu históriu.';
  }, [filter, query]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#020617] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-4 w-4" />
            Späť do dashboardu
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-violet-100 px-4 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <History className="h-4 w-4" />
            História chatu
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[420px_1fr]">
        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-5">
            <h1 className="text-3xl font-black tracking-tight">
              História chatu
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Zoznam vašich uložených konverzácií a výstupov zo Zedpera.
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-black/20">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Hľadať..."
              className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {filters.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={
                  filter === item.id
                    ? 'rounded-2xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm'
                    : 'rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                Načítavam históriu...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                {emptyText}
              </div>
            ) : (
              items.map(item => (
                <article
                  key={item.id}
                  className={
                    selected?.id === item.id
                      ? 'group cursor-pointer rounded-3xl border border-violet-300 bg-violet-50 p-4 shadow-sm dark:border-violet-400/40 dark:bg-violet-500/15'
                      : 'group cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
                  }
                  onClick={() => setSelected(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {getIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-1 text-sm font-black">
                        {item.title}
                      </h2>

                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                        {item.preview || item.content || 'Bez náhľadu'}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(item.created_at)}
                        </div>

                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            deleteItem(item.id);
                          }}
                          disabled={deletingId === item.id}
                          className="rounded-xl p-2 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          title="Vymazať"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          {!selected ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <History className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-black">
                Vyberte záznam z histórie
              </h2>

              <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Po kliknutí na uloženú konverzáciu sa tu zobrazí kompletný
                obsah výstupu.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-6 border-b border-slate-200 pb-5 dark:border-white/10">
                <div className="mb-3 inline-flex items-center gap-2 rounded-2xl bg-violet-100 px-3 py-2 text-xs font-black uppercase tracking-wide text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  {getIcon(selected.type)}
                  {selected.type}
                </div>

                <h2 className="text-3xl font-black tracking-tight">
                  {selected.title}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selected.created_at)}
                </div>
              </div>

              <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm font-medium leading-7 dark:prose-invert">
                {selected.content || selected.preview || 'Bez obsahu'}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}