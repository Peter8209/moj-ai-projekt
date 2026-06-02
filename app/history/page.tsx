'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Home,
  Inbox,
  Maximize2,
  MessageSquare,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

type RawHistoryItem = {
  id?: string | number;
  module?: string | null;
  type?: string | null;
  title?: unknown;
  user_message?: unknown;
  assistant_message?: unknown;
  preview?: unknown;
  content?: unknown;
  result?: unknown;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  messages?: unknown;
  role?: string | null;
  [key: string]: unknown;
};

type HistoryItem = {
  id: string;
  module: string;
  title: string | null;
  user_message: string | null;
  assistant_message: string | null;
  result?: unknown;
  created_at: string;
};

type ContinueChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type ContinueChatContext = {
  id: string;
  module: string;
  title: string;
  user_message: string;
  assistant_message: string;
  created_at: string;
  source: 'history';
  mode: 'auto-submit-history';
  autoSubmit: true;
  autoSubmitText: string;
  messages: ContinueChatMessage[];
};

const CONTINUE_CHAT_STORAGE_KEY = 'zedpera_continue_chat_context';

const LOCAL_HISTORY_KEYS = [
  'chat_history',
  'saved_outputs',
  'generated_texts',
  'zedpera_chat_history',
];

function isAiChatModuleValue(value: unknown) {
  const module = String(value || 'chat').trim().toLowerCase();

  return (
    !module ||
    module === 'chat' ||
    module === 'ai-chat' ||
    module === 'ai' ||
    module === 'ai_chat'
  );
}

function normalizeModule(value: unknown) {
  return isAiChatModuleValue(value) ? 'chat' : 'chat';
}

function getModuleLabel(_module: string) {
  return 'AI chat';
}

function getModuleIcon(_module: string) {
  return <MessageSquare className="h-5 w-5" />;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value.trim();

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function stringifyResultValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractMessageText(messages: unknown, role?: 'user' | 'assistant') {
  if (!Array.isArray(messages)) return '';

  const normalizedRole = role ? role.toLowerCase() : '';

  const matchingMessages = messages.filter((message) => {
    if (!isRecord(message)) return !normalizedRole;

    const messageRole = String(message.role || message.type || '').toLowerCase();

    return normalizedRole ? messageRole === normalizedRole : true;
  });

  const sourceMessages = matchingMessages.length > 0 ? matchingMessages : messages;

  return sourceMessages
    .map((message) => {
      if (typeof message === 'string') return message.trim();

      if (!isRecord(message)) return '';

      return (
        cleanText(message.content) ||
        cleanText(message.text) ||
        cleanText(message.message) ||
        cleanText(message.answer) ||
        cleanText(message.output) ||
        ''
      );
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function extractTextFromUnknown(value: unknown, depth = 0): string {
  if (value === null || value === undefined || depth > 6) return '';

  const directText = cleanText(value);

  if (directText) return directText;

  if (Array.isArray(value)) {
    const messagesText = extractMessageText(value);

    if (messagesText) return messagesText;

    return value
      .map((item) => extractTextFromUnknown(item, depth + 1))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  if (!isRecord(value)) return '';

  const priorityKeys = [
    'assistant_message',
    'output',
    'text',
    'content',
    'answer',
    'message',
    'response',
    'result',
    'analysis',
    'protocol',
    'html',
    'markdown',
    'body',
    'value',
    'data',
    'items',
    'history',
  ];

  for (const key of priorityKeys) {
    const nestedText = extractTextFromUnknown(value[key], depth + 1);

    if (nestedText) return nestedText;
  }

  const usefulValues = Object.entries(value)
    .filter(([key]) => {
      const normalizedKey = key.toLowerCase();

      return ![
        'id',
        'uuid',
        'user_id',
        'created_at',
        'createdat',
        'updated_at',
        'updatedat',
        'module',
        'type',
        'title',
      ].includes(normalizedKey);
    })
    .map(([, nestedValue]) => extractTextFromUnknown(nestedValue, depth + 1))
    .filter(Boolean);

  if (usefulValues.length > 0) {
    return usefulValues.join('\n\n').trim();
  }

  return depth === 0 ? stringifyResultValue(value) : '';
}

function extractResultText(result?: unknown) {
  return extractTextFromUnknown(result);
}

function extractUserText(item: RawHistoryItem) {
  const messagesUserText = extractMessageText(item.messages, 'user');

  return (
    cleanText(item.user_message) ||
    cleanText(item.prompt) ||
    cleanText(item.input) ||
    cleanText(item.question) ||
    cleanText(item.query) ||
    cleanText(item.request) ||
    messagesUserText ||
    ''
  );
}

function extractAssistantText(item: RawHistoryItem) {
  const messagesAssistantText = extractMessageText(item.messages, 'assistant');

  return (
    cleanText(item.assistant_message) ||
    extractTextFromUnknown(item.content) ||
    extractTextFromUnknown(item.result) ||
    cleanText(item.output) ||
    cleanText(item.answer) ||
    cleanText(item.response) ||
    cleanText(item.text) ||
    messagesAssistantText ||
    cleanText(item.preview) ||
    ''
  );
}

function normalizeHistoryItem(item: RawHistoryItem, index: number): HistoryItem {
  const module = normalizeModule(item.module || item.type);
  const titleText = cleanText(item.title);
  const userMessage = extractUserText(item);
  const assistantMessage = extractAssistantText(item);
  const createdAt =
    cleanText(item.created_at) ||
    cleanText(item.createdAt) ||
    cleanText(item.updated_at) ||
    new Date().toISOString();

  return {
    id: String(item.id || `local-${index}-${createdAt}`),
    module,
    title: titleText || getModuleLabel(module),
    user_message: userMessage,
    assistant_message: assistantMessage,
    result: item.result,
    created_at: createdAt,
  };
}

function extractRawHistoryItems(parsed: unknown): RawHistoryItem[] {
  if (Array.isArray(parsed)) return parsed as RawHistoryItem[];

  if (!isRecord(parsed)) return [];

  if (Array.isArray(parsed.items)) return parsed.items as RawHistoryItem[];
  if (Array.isArray(parsed.history)) return parsed.history as RawHistoryItem[];
  if (Array.isArray(parsed.messages)) return parsed.messages as RawHistoryItem[];
  if (Array.isArray(parsed.outputs)) return parsed.outputs as RawHistoryItem[];
  if (Array.isArray(parsed.records)) return parsed.records as RawHistoryItem[];

  return [parsed as RawHistoryItem];
}

function safelyParseLocalHistory(): RawHistoryItem[] {
  if (typeof window === 'undefined') return [];

  const allItems: RawHistoryItem[] = [];

  for (const key of LOCAL_HISTORY_KEYS) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const parsedItems = extractRawHistoryItems(parsed);

      allItems.push(...parsedItems);
    } catch {
      // Pokračujeme ďalším lokálnym kľúčom.
    }
  }

  const seen = new Set<string>();

  return allItems
    .filter((item) => isAiChatModuleValue(item.module || item.type))
    .filter((item, index) => {
      const createdAt =
        cleanText(item.created_at) ||
        cleanText(item.createdAt) ||
        cleanText(item.updated_at) ||
        '';

      const key = [
        cleanText(item.id) || `bez-id-${index}`,
        normalizeModule(item.module || item.type),
        cleanText(item.title),
        createdAt,
        extractUserText(item).slice(0, 120),
        extractAssistantText(item).slice(0, 120),
      ].join('|');

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function removeItemFromLocalStorage(item: HistoryItem) {
  if (typeof window === 'undefined') return;

  for (const key of LOCAL_HISTORY_KEYS) {
    try {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const isSameItem = (rawItem: RawHistoryItem) => {
        if (!isAiChatModuleValue(rawItem.module || rawItem.type)) return false;

        const rawId = String(rawItem.id || '');

        if (rawId && rawId === item.id) return true;

        const rawModule = normalizeModule(rawItem.module || rawItem.type);
        const rawTitle = cleanText(rawItem.title) || getModuleLabel(rawModule);
        const rawCreatedAt =
          cleanText(rawItem.created_at) ||
          cleanText(rawItem.createdAt) ||
          cleanText(rawItem.updated_at) ||
          '';

        return (
          rawModule === item.module &&
          rawTitle === item.title &&
          rawCreatedAt === item.created_at
        );
      };

      if (Array.isArray(parsed)) {
        const nextItems = parsed.filter((rawItem: RawHistoryItem) => {
          return !isSameItem(rawItem);
        });

        localStorage.setItem(key, JSON.stringify(nextItems));
        continue;
      }

      if (isRecord(parsed) && Array.isArray(parsed.items)) {
        const nextItems = parsed.items.filter((rawItem: RawHistoryItem) => {
          return !isSameItem(rawItem);
        });

        localStorage.setItem(
          key,
          JSON.stringify({
            ...parsed,
            items: nextItems,
          }),
        );

        continue;
      }

      if (isRecord(parsed) && Array.isArray(parsed.history)) {
        const nextHistory = parsed.history.filter((rawItem: RawHistoryItem) => {
          return !isSameItem(rawItem);
        });

        localStorage.setItem(
          key,
          JSON.stringify({
            ...parsed,
            history: nextHistory,
          }),
        );
      }
    } catch {
      // Ak je lokálna história poškodená, pokračujeme ďalším kľúčom.
    }
  }
}

function filterItems(items: HistoryItem[]) {
  return items.filter((item) => item.module === 'chat');
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Neznámy dátum';
  }
}

function getFullAssistantText(item: HistoryItem) {
  const assistantText = item.assistant_message?.trim();

  if (assistantText) return assistantText;

  const resultText = extractResultText(item.result).trim();

  if (resultText) return resultText;

  const userText = item.user_message?.trim();

  if (userText) return userText;

  return 'Bez uloženého výstupu.';
}

function createAutoSubmitHistoryPrompt(item: HistoryItem) {
  const title = item.title || getModuleLabel(item.module);
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item).trim();

  return [
    'Pokračujeme v predchádzajúcej konverzácii z histórie.',
    '',
    `Názov: ${title}`,
    `Modul: AI chat`,
    `Dátum: ${formatDate(item.created_at)}`,
    '',
    userText ? '=== PÔVODNÉ ZADANIE POUŽÍVATEĽA ===' : '',
    userText || '',
    userText ? '' : '',
    '=== DOTERAJŠÍ VÝSTUP / KONTEXT ===',
    assistantText && assistantText !== 'Bez uloženého výstupu.'
      ? assistantText
      : 'Výstup v histórii nebol uložený, pokračuj podľa dostupného zadania.',
    '',
    '=== NOVÁ INŠTRUKCIA ===',
    'Pokračuj priamo na základe tejto histórie. Zachovaj kontext, nenúť používateľa znova klikať na odoslanie a nadviaž na predchádzajúci výstup.',
  ]
    .filter((part) => part !== '')
    .join('\n');
}

function createContinueChatContext(item: HistoryItem): ContinueChatContext {
  const userText = item.user_message?.trim() || '';
  const assistantText = getFullAssistantText(item).trim();
  const createdAt = item.created_at || new Date().toISOString();
  const autoSubmitText = createAutoSubmitHistoryPrompt(item);

  const messages: ContinueChatMessage[] = [];

  if (userText) {
    messages.push({
      id: `${item.id}-history-user`,
      role: 'user',
      content: userText,
      createdAt,
    });
  }

  if (assistantText && assistantText !== 'Bez uloženého výstupu.') {
    messages.push({
      id: `${item.id}-history-assistant`,
      role: 'assistant',
      content: assistantText,
      createdAt,
    });
  }

  return {
    id: item.id,
    module: item.module,
    title: item.title || getModuleLabel(item.module),
    user_message: userText,
    assistant_message: assistantText,
    created_at: createdAt,
    source: 'history',
    mode: 'auto-submit-history',
    autoSubmit: true,
    autoSubmitText,
    messages,
  };
}

function createCompactPreview(item: HistoryItem) {
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item).trim();

  const text =
    userText ||
    assistantText ||
    'Bez uloženého náhľadu. Kliknite pre otvorenie detailu.';

  return text.replace(/\s+/g, ' ').slice(0, 150);
}

function createFullReadableText(item: HistoryItem) {
  const title = item.title || getModuleLabel(item.module);
  const date = formatDate(item.created_at);
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item);

  return [
    title,
    '',
    `Modul: AI chat`,
    `Dátum: ${date}`,
    '',
    userText ? '=== ZADANIE ===' : '',
    userText || '',
    userText ? '' : '',
    '=== VÝSTUP ===',
    assistantText,
  ]
    .filter((part) => part !== '')
    .join('\n');
}

function getResultText(count: number) {
  if (count === 1) return '1 záznam';
  if (count >= 2 && count <= 4) return `${count} záznamy`;
  return `${count} záznamov`;
}

function createSafeFileName(value: string) {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return cleaned || 'historia-vystup';
}

export default function HistoryPage() {
  const router = useRouter();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function goToMenu() {
    router.push('/dashboard');
  }

  function openHistoryDetail(item: HistoryItem) {
    setSelectedItem(item);
    setCopiedId(null);
  }

  function closeHistoryDetail() {
    setSelectedItem(null);
    setCopiedId(null);
  }

  function continueInAiChat(item: HistoryItem) {
    if (typeof window === 'undefined') return;

    const context = createContinueChatContext(item);

    localStorage.setItem(CONTINUE_CHAT_STORAGE_KEY, JSON.stringify(context));

    router.push('/chat?continue=history&autosend=1');
  }

  async function copyHistoryItem(item: HistoryItem) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;

    await navigator.clipboard.writeText(createFullReadableText(item));
    setCopiedId(item.id);

    window.setTimeout(() => {
      setCopiedId((currentId) => (currentId === item.id ? null : currentId));
    }, 1800);
  }

  function downloadHistoryItem(item: HistoryItem) {
    if (typeof window === 'undefined') return;

    const blob = new Blob([createFullReadableText(item)], {
      type: 'text/plain;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const title = item.title || getModuleLabel(item.module);

    link.href = url;
    link.download = `${createSafeFileName(title)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  async function deleteHistoryItem(item: HistoryItem) {
    const confirmed = window.confirm(
      'Naozaj chcete vymazať tento záznam z histórie chatu?',
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError('');

    const previousItems = items;

    setItems((currentItems) =>
      currentItems.filter((historyItem) => historyItem.id !== item.id),
    );

    if (selectedItem?.id === item.id) {
      closeHistoryDetail();
    }

    removeItemFromLocalStorage(item);

    try {
      if (!item.id.startsWith('local-')) {
        const res = await fetch(
          `/api/history?id=${encodeURIComponent(item.id)}`,
          {
            method: 'DELETE',
            cache: 'no-store',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
            },
          },
        );

        const data = await res.json().catch(() => null);

        if (!res.ok || data?.ok === false) {
          setItems(previousItems);

          setError(
            data?.message ||
              data?.error ||
              'Záznam sa nepodarilo vymazať zo serverovej histórie.',
          );
        }
      }
    } catch {
      setItems(previousItems);
      setError(
        'Záznam sa nepodarilo vymazať. Skontrolujte pripojenie alebo API /api/history.',
      );
    } finally {
      setDeletingId(null);
    }
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

      const filteredLocalItems = filterItems(localItems);

      setItems(filteredLocalItems);

      return filteredLocalItems;
    }

    try {
      const url = '/api/history?module=chat';

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
          .filter((item: HistoryItem) => {
            return (
              item.user_message?.trim() ||
              item.assistant_message?.trim() ||
              extractResultText(item.result).trim()
            );
          })
          .sort(
            (a: HistoryItem, b: HistoryItem) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );

        if (loadedItems.length > 0) {
          setItems(loadedItems);
          setError('');
          return;
        }

        const localItems = loadLocalHistory();

        if (localItems.length > 0) {
          setError('');
          return;
        }

        setItems([]);
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
          'Históriu sa nepodarilo načítať, pretože server nevidí aktívne prihlásenie používateľa. Skontrolujte Supabase session cookies, súbor app/api/history/route.ts a serverový Supabase klient v lib/supabase/server.ts.',
        );
        return;
      }

      if (data?.reason === 'DATABASE_ERROR') {
        setError(
          data?.message ||
            'Históriu sa nepodarilo načítať z databázy. Skontrolujte tabuľku history, RLS pravidlá a oprávnenia používateľa.',
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
          : 'Históriu sa nepodarilo načítať. Skontrolujte /api/history.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeHistoryDetail();
      }
    }

    if (!selectedItem) return;

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedItem]);

  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const joined = [
        item.title,
        getModuleLabel(item.module),
        item.user_message,
        getFullAssistantText(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return joined.includes(query);
    });
  }, [items, searchQuery]);

  const totalCount = searchedItems.length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-0 top-40 h-[420px] w-[420px] rounded-full bg-blue-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-fuchsia-700/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[980px] px-4 py-8 sm:px-6">
        <header className="mb-8">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white">
                História chatu
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-400">
                Zoznam vašich konverzácií
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={goToMenu}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
              >
                <Home className="h-4 w-4" />
                Návrat do menu
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#111827] px-5 text-sm font-black text-white transition hover:bg-[#1f2937]"
              >
                <RefreshCcw className="h-4 w-4" />
                Obnoviť
              </button>
            </div>
          </div>

          <div className="relative max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Hľadať..."
              className="h-11 w-full rounded-2xl border border-white/10 bg-[#111827] pl-11 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/20"
            />
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b1020] p-6 shadow-xl shadow-black/30">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-200">
                <RefreshCcw className="h-5 w-5 animate-spin" />
              </div>

              <div>
                <div className="text-base font-black text-white">
                  Načítavam históriu...
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-400">
                  História sa načítava automaticky.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-950/50 p-5 text-sm font-bold leading-6 text-red-100">
            {error}
          </div>
        ) : null}

        {!loading && !error && searchedItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b1020] p-10 text-center shadow-xl shadow-black/30">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600/20 text-violet-100">
              <Inbox className="h-7 w-7" />
            </div>

            <h2 className="text-2xl font-black text-white">
              Žiadne záznamy
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
              História sa načíta automaticky. Ak používaš vyhľadávanie, skús iný výraz.
            </p>
          </div>
        ) : null}

        {!loading && !error && searchedItems.length > 0 ? (
          <section className="rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-4 shadow-2xl shadow-black/35">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-black text-white">
                  Uložené konverzácie
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-400">
                  {getResultText(totalCount)}
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/8">
              {searchedItems.map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openHistoryDetail(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openHistoryDetail(item);
                    }
                  }}
                  className="group flex cursor-pointer items-start gap-4 rounded-2xl px-3 py-4 outline-none transition hover:bg-white/[0.04] focus:bg-white/[0.05] focus:ring-4 focus:ring-violet-500/20"
                >
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                    <MessageSquare className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-black text-white">
                        {item.title || getModuleLabel(item.module)}
                      </h3>
                    </div>

                    <p className="mt-1 line-clamp-1 text-sm font-semibold leading-6 text-slate-400">
                      {createCompactPreview(item)}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <button
                      type="button"
                      title="Otvoriť"
                      onClick={(event) => {
                        event.stopPropagation();
                        openHistoryDetail(item);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-violet-600 hover:text-white"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      title="Pokračovať v chate"
                      onClick={(event) => {
                        event.stopPropagation();
                        continueInAiChat(item);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-violet-600 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      title="Vymazať"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteHistoryItem(item);
                      }}
                      disabled={deletingId === item.id}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-950/30 text-red-200 transition hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-md sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Detail uloženej konverzácie"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeHistoryDetail();
            }
          }}
        >
          <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1100px] flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#070b1c] shadow-2xl shadow-black/60 sm:min-h-[calc(100vh-2.5rem)]">
            <div className="sticky top-0 z-10 border-b border-white/15 bg-[#10162a]/98 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600/25 text-violet-100">
                    {getModuleIcon(selectedItem.module)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-600/25 px-4 py-1.5 text-sm font-black text-violet-100">
                        {getModuleLabel(selectedItem.module)}
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#070b1c] px-4 py-1.5 text-sm font-black text-slate-100">
                        <Clock3 className="h-4 w-4" />
                        {formatDate(selectedItem.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl">
                      {selectedItem.title || getModuleLabel(selectedItem.module)}
                    </h2>

                    <p className="mt-2 text-base font-bold leading-7 text-slate-300">
                      Plný detail uloženej konverzácie.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:shrink-0 xl:flex-wrap xl:justify-end">
                  <button
                    type="button"
                    onClick={() => copyHistoryItem(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#1c2542] px-4 text-sm font-black text-white transition hover:bg-[#27345d]"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedId === selectedItem.id ? 'Skopírované' : 'Kopírovať'}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadHistoryItem(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-[#1c2542] px-4 text-sm font-black text-white transition hover:bg-[#27345d]"
                  >
                    <Download className="h-4 w-4" />
                    TXT
                  </button>

                  <button
                    type="button"
                    onClick={() => continueInAiChat(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:bg-violet-500"
                  >
                    Pokračovať
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={closeHistoryDetail}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-600"
                    aria-label="Zatvoriť detail"
                  >
                    <X className="h-4 w-4" />
                    Zavrieť
                  </button>
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-5 p-5 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-5">
                <div className="rounded-[1.5rem] border border-white/15 bg-[#10162a] p-5 shadow-xl shadow-black/25">
                  <h3 className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                    Informácie
                  </h3>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-[#070b1c] p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Modul
                      </div>

                      <div className="mt-2 font-black text-white">
                        {getModuleLabel(selectedItem.module)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#070b1c] p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Vytvorené
                      </div>

                      <div className="mt-2 font-black text-white">
                        {formatDate(selectedItem.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedItem.user_message?.trim() ? (
                  <div className="rounded-[1.5rem] border border-white/15 bg-[#10162a] p-5 shadow-xl shadow-black/25">
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                      Zadanie používateľa
                    </h3>

                    <div className="mt-5 max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-[#070b1c] p-5 text-sm font-bold leading-7 text-slate-100">
                      <div className="whitespace-pre-wrap">
                        {selectedItem.user_message}
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>

              <section className="rounded-[1.5rem] border border-white/15 bg-[#10162a] p-5 shadow-xl shadow-black/25 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 border-b border-white/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Celý výstup
                    </h3>

                    <p className="mt-1 text-sm font-bold text-slate-400">
                      Kompletný obsah uloženej konverzácie.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteHistoryItem(selectedItem)}
                    disabled={deletingId === selectedItem.id}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-950/60 px-4 text-sm font-black text-red-100 transition hover:bg-red-900/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === selectedItem.id ? 'Vymazávam...' : 'Vymazať'}
                  </button>
                </div>

                <div className="min-h-[520px] whitespace-pre-wrap rounded-[1.5rem] border border-white/15 bg-[#070b1c] p-6 text-[15px] font-semibold leading-8 text-slate-50 shadow-inner shadow-black/30 sm:p-7">
                  {createFullReadableText(selectedItem)}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}