'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type RawHistoryItem = {
  id?: string;
  module?: string;
  type?: string;
  title?: string | null;
  user_message?: string | null;
  assistant_message?: string | null;
  preview?: string | null;
  content?: string | null;
  result?: Record<string, unknown>;
  created_at?: string;
};

type HistoryItem = {
  id: string;
  module: string;
  title: string | null;
  user_message: string | null;
  assistant_message: string | null;
  result?: Record<string, unknown>;
  created_at: string;
};

type ContinueChatContext = {
  id: string;
  module: string;
  title: string;
  user_message: string;
  assistant_message: string;
  created_at: string;
  source: 'history';
};

const CONTINUE_CHAT_STORAGE_KEY = 'zedpera_continue_chat_context';

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

function normalizeModule(value: unknown) {
  const module = String(value || 'chat').trim();

  if (module === 'ai-chat') return 'chat';
  if (module === 'ai') return 'chat';
  if (module === 'audit') return 'quality';

  const allowed = [
    'chat',
    'supervisor',
    'quality',
    'defense',
    'translation',
    'data',
    'planning',
    'emails',
    'originality',
    'humanizer',
    'sources',
  ];

  return allowed.includes(module) ? module : 'chat';
}

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
  if (module === 'sources') return 'Zdroje';

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

function normalizeHistoryItem(item: RawHistoryItem, index: number): HistoryItem {
  const module = normalizeModule(item.module || item.type);

  const assistantMessage =
    item.assistant_message ||
    item.content ||
    item.preview ||
    '';

  const userMessage =
    item.user_message ||
    item.preview ||
    '';

  return {
    id: String(item.id || `local-${index}-${Date.now()}`),
    module,
    title: item.title || getModuleLabel(module),
    user_message: userMessage,
    assistant_message: assistantMessage,
    result: item.result,
    created_at: item.created_at || new Date().toISOString(),
  };
}

function safelyParseLocalHistory(): RawHistoryItem[] {
  if (typeof window === 'undefined') return [];

  const possibleKeys = [
    'chat_history',
    'saved_outputs',
    'generated_texts',
    'zedpera_chat_history',
  ];

  for (const key of possibleKeys) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }

      if (parsed && Array.isArray(parsed.history)) {
        return parsed.history;
      }
    } catch {
      // Pokračujeme ďalším lokálnym kľúčom.
    }
  }

  return [];
}

function filterItems(items: HistoryItem[], activeFilter: string) {
  if (activeFilter === 'all') return items;

  return items.filter((item) => item.module === activeFilter);
}

function createContinueChatContext(item: HistoryItem): ContinueChatContext {
  return {
    id: item.id,
    module: item.module,
    title: item.title || getModuleLabel(item.module),
    user_message: item.user_message || '',
    assistant_message: item.assistant_message || '',
    created_at: item.created_at,
    source: 'history',
  };
}

function createCardPreview(item: HistoryItem) {
  const userText = item.user_message?.trim();
  const assistantText = item.assistant_message?.trim();

  if (userText && assistantText) {
    return `POUŽÍVATEĽ: ${userText}\nODPOVEĎ: ${assistantText}`;
  }

  if (assistantText) return assistantText;
  if (userText) return userText;

  return 'Bez výstupu';
}

export default function HistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function continueInAiChat(item: HistoryItem) {
    if (typeof window === 'undefined') return;

    const context = createContinueChatContext(item);

    localStorage.setItem(
      CONTINUE_CHAT_STORAGE_KEY,
      JSON.stringify(context),
    );

    router.push('/chat?continue=history');
  }

  async function loadHistory() {
    setLoading(true);
    setError('');

    function loadLocalHistory() {
      const localItems = safelyParseLocalHistory()
        .map((item, index) => normalizeHistoryItem(item, index))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        );

      const filteredLocalItems = filterItems(localItems, activeFilter);

      setItems(filteredLocalItems);

      return filteredLocalItems;
    }

    try {
      const url =
        activeFilter === 'all'
          ? '/api/history'
          : `/api/history?module=${encodeURIComponent(activeFilter)}`;

      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        const rawItems = Array.isArray(data.items) ? data.items : [];

        const loadedItems = rawItems
          .map((item: RawHistoryItem, index: number) =>
            normalizeHistoryItem(item, index),
          )
          .sort(
            (a: HistoryItem, b: HistoryItem) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        setItems(loadedItems);
        setError('');
        return;
      }

      const localItems = loadLocalHistory();

      if (localItems.length > 0) {
        setError('');
        return;
      }

      if (res.status === 401 || data?.reason === 'NOT_AUTHENTICATED') {
        setError(
          'Server nevie načítať prihlásenie používateľa. Si prihlásený v aplikácii, ale /api/history nevidí Supabase session cookies. Skontroluj app/api/history/route.ts a lib/supabase/server.ts.',
        );
        return;
      }

      if (data?.reason === 'DATABASE_ERROR') {
        setError(
          data?.message ||
            'Históriu sa nepodarilo načítať z databázy. Skontroluj tabuľku history a RLS pravidlá.',
        );
        return;
      }

      setError(
        data?.message ||
          data?.error ||
          'Históriu sa nepodarilo načítať z databázy.',
      );
    } catch (err) {
      const localItems = loadLocalHistory();

      if (localItems.length > 0) {
        setError('');
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Históriu sa nepodarilo načítať. Skontroluj /api/history.',
      );
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
        

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setActiveFilter(filter.key);
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
          <div className="max-w-xl">
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
                    {records.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-violet-300 bg-violet-50 p-4 transition hover:border-violet-400 dark:border-violet-400/70 dark:bg-violet-500/10"
                      >
                        <div className="font-black">
                          {item.title || getModuleLabel(item.module)}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleString('sk-SK')}
                        </div>

                        <div className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {createCardPreview(item)}
                        </div>

                        <button
                          type="button"
                          onClick={() => continueInAiChat(item)}
                          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500"
                        >
                          Pokračovať v AI chate
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}