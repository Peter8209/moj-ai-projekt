'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  FileSearch,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Mail,
  Maximize2,
  MessageSquare,
  Presentation,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
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

const filters = [
  { key: 'all', label: 'Vše' },
  { key: 'chat', label: 'AI chat' },
  { key: 'supervisor', label: 'AI vedoucí' },
  { key: 'quality', label: 'Audit kvality' },
  { key: 'defense', label: 'Obhajoba' },
  { key: 'translation', label: 'Překlad' },
  { key: 'data', label: 'Analýza dat' },
  { key: 'planning', label: 'Plánování' },
  { key: 'emails', label: 'E-maily' },
  { key: 'originality', label: 'Originalita' },
  { key: 'humanizer', label: 'Humanizace' },
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
  if (module === 'supervisor') return 'AI vedoucí';
  if (module === 'quality') return 'Audit kvality';
  if (module === 'defense') return 'Obhajoba';
  if (module === 'translation') return 'Překlad';
  if (module === 'data') return 'Analýza dat';
  if (module === 'planning') return 'Plánování';
  if (module === 'emails') return 'E-maily';
  if (module === 'originality') return 'Originalita';
  if (module === 'humanizer') return 'Humanizace';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

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

  return allItems.filter((item, index) => {
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

function filterItems(items: HistoryItem[], activeFilter: string) {
  if (activeFilter === 'all') return items;

  return items.filter((item) => item.module === activeFilter);
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
  const moduleLabel = getModuleLabel(item.module);
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item).trim();

  return [
    'Pokračujeme v predchádzajúcej konverzácii z histórie.',
    '',
    `Názov: ${title}`,
    `Modul: ${moduleLabel}`,
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

function createCardPreview(item: HistoryItem) {
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item);

  if (userText && assistantText && assistantText !== 'Bez uloženého výstupu.') {
    return `POUŽÍVATEĽ: ${userText}\n\nODPOVEĎ: ${assistantText}`;
  }

  if (assistantText) return assistantText;
  if (userText) return userText;

  return 'Bez uloženého výstupu.';
}

function createFullReadableText(item: HistoryItem) {
  const title = item.title || getModuleLabel(item.module);
  const moduleLabel = getModuleLabel(item.module);
  const date = formatDate(item.created_at);
  const userText = item.user_message?.trim();
  const assistantText = getFullAssistantText(item);

  return [
    title,
    '',
    `Modul: ${moduleLabel}`,
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
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function goToMainMenu() {
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
  }, [activeFilter]);

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

  const groupedItems = useMemo(() => {
    return searchedItems.reduce<Record<string, HistoryItem[]>>((acc, item) => {
      const key = item.module || 'chat';
      acc[key] ||= [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [searchedItems]);

  const totalCount = searchedItems.length;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950 dark:bg-[#020617] dark:text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-500/25" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl dark:bg-fuchsia-500/20" />
      </div>

      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="mb-5 rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
                <LayoutDashboard className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-950 dark:text-white">
                  História výstupov
                </h1>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Po rozkliknutí sa otvorí celý uložený výstup v plnom detaile.
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:flex-row xl:flex-none xl:items-center xl:justify-end">
              <button
                type="button"
                onClick={goToMainMenu}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Hlavné menu
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <RefreshCcw className="h-4 w-4" />
                Obnoviť
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Vyhľadať v histórii podľa názvu, modulu alebo obsahu..."
                className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              {getResultText(totalCount)}
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.key);
                  closeHistoryDetail();
                }}
                className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black transition ${
                  activeFilter === filter.key
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                <RefreshCcw className="h-5 w-5 animate-spin" />
              </div>

              <div>
                <div className="text-base font-black text-slate-950 dark:text-white">
                  Načítavam záznamy...
                </div>

                <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Pripravujem uložené výstupy z databázy alebo lokálnej histórie.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-bold leading-6 text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && searchedItems.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <Inbox className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              Zatiaľ tu nie sú žiadne záznamy
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Spustite niektorý modul v hlavnom menu a výstup sa sem automaticky
              uloží. Ak používate vyhľadávanie, skúste zadať iný výraz alebo
              zmeniť filter.
            </p>

            <button
              type="button"
              onClick={goToMainMenu}
              className="mt-6 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-950/20 transition hover:-translate-y-0.5 hover:bg-violet-500"
            >
              <LayoutDashboard className="h-4 w-4" />
              Prejsť do hlavného menu
            </button>
          </div>
        ) : null}

        {!loading && !error && searchedItems.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([module, records]) => (
              <section
                key={module}
                className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20 sm:p-5"
              >
                <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                      {getModuleIcon(module)}
                    </div>

                    <div>
                      <h2 className="text-base font-black text-slate-950 dark:text-white">
                        {getModuleLabel(module)}
                      </h2>

                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {getResultText(records.length)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {records.map((item) => (
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
                      className="group relative cursor-pointer overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-950/10 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:from-white/[0.08] dark:to-white/[0.03] dark:hover:border-violet-400/60"
                    >
                      <div className="absolute inset-y-0 left-0 w-1.5 bg-violet-600" />

                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
                        <div className="min-w-0 pl-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                              {getModuleIcon(item.module)}
                              {getModuleLabel(item.module)}
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(item.created_at)}
                            </span>
                          </div>

                          <h3 className="mt-3 text-lg font-black leading-snug text-slate-950 dark:text-white">
                            {item.title || getModuleLabel(item.module)}
                          </h3>

                          <div className="mt-3 line-clamp-4 min-h-[92px] whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">
                            {createCardPreview(item)}
                          </div>

                          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 transition group-hover:bg-violet-50 group-hover:text-violet-700 dark:bg-white/10 dark:text-slate-300 dark:group-hover:bg-violet-500/15 dark:group-hover:text-violet-200">
                            <Maximize2 className="h-3.5 w-3.5" />
                            Rozkliknúť celý výstup
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:items-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openHistoryDetail(item);
                            }}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 xl:w-[260px]"
                          >
                            Otvoriť celý výstup
                            <Maximize2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              continueInAiChat(item);
                            }}
                            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 xl:w-[260px]"
                          >
                            Pokračovať v AI chate
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteHistoryItem(item);
                            }}
                            disabled={deletingId === item.id}
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20 xl:w-[260px]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === item.id
                              ? 'Vymazávam...'
                              : 'Vymazať históriu chatu'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Detail uloženého výstupu"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeHistoryDetail();
            }
          }}
        >
          <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1400px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/40 dark:border-white/10 dark:bg-[#020617] sm:min-h-[calc(100vh-2.5rem)]">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/95 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    {getModuleIcon(selectedItem.module)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                        {getModuleLabel(selectedItem.module)}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(selectedItem.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-black leading-tight text-slate-950 dark:text-white">
                      {selectedItem.title || getModuleLabel(selectedItem.module)}
                    </h2>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                      Toto je plný detail uloženého výstupu. Obsah sa už nezobrazuje ako malé textové okno, ale ako samostatné rozkliknuté zobrazenie.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:shrink-0 xl:flex-wrap xl:justify-end">
                  <button
                    type="button"
                    onClick={() => copyHistoryItem(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedId === selectedItem.id ? 'Skopírované' : 'Kopírovať'}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadHistoryItem(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <Download className="h-4 w-4" />
                    Stiahnuť TXT
                  </button>

                  <button
                    type="button"
                    onClick={() => continueInAiChat(selectedItem)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500"
                  >
                    Pokračovať v AI chate
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={closeHistoryDetail}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    aria-label="Zatvoriť detail"
                  >
                    <X className="h-4 w-4" />
                    Zavrieť
                  </button>
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-5 p-4 sm:p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Informácie
                  </h3>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-2xl bg-white p-4 dark:bg-white/10">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Modul
                      </div>

                      <div className="mt-1 font-black text-slate-950 dark:text-white">
                        {getModuleLabel(selectedItem.module)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 dark:bg-white/10">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Vytvorené
                      </div>

                      <div className="mt-1 font-black text-slate-950 dark:text-white">
                        {formatDate(selectedItem.created_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4 dark:bg-white/10">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        ID záznamu
                      </div>

                      <div className="mt-1 break-all font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                        {selectedItem.id}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedItem.user_message?.trim() ? (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Zadanie používateľa
                    </h3>

                    <div className="mt-4 max-h-[360px] overflow-y-auto rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      <div className="whitespace-pre-wrap">
                        {selectedItem.user_message}
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">
                      Celý výstup
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Zobrazuje sa kompletný obsah z histórie vrátane dlhých výstupov z modulov.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteHistoryItem(selectedItem)}
                    disabled={deletingId === selectedItem.id}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === selectedItem.id ? 'Vymazávam...' : 'Vymazať'}
                  </button>
                </div>

                <div className="min-h-[520px] whitespace-pre-wrap rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-[15px] font-medium leading-8 text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 sm:p-7">
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