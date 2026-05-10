'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Sparkles } from 'lucide-react';

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  savedAt?: string;
  createdAt?: string;
  created_at?: string;
  updated_at?: string;
};

type SavedText = {
  id?: string;
  title?: string;
  content?: string;
  text?: string;
  output?: string;
  result?: string;
  score?: number;
  aiScore?: number;
  createdAt?: string;
  savedAt?: string;
  created_at?: string;
  updated_at?: string;
};

type DashboardStatsState = {
  projectsCount: number;
  textsCount: number;
  aiScore: number;
};

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function getLocalStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getNumber(value: unknown): number | null {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function hasTextContent(item: SavedText) {
  const text =
    item.text ||
    item.content ||
    item.output ||
    item.result ||
    item.title ||
    '';

  return String(text).trim().length > 0;
}

function calculateAiScore(texts: SavedText[]) {
  const scores = texts
    .map((item) => getNumber(item.aiScore ?? item.score))
    .filter((item): item is number => item !== null)
    .map((item) => Math.max(0, Math.min(100, item)));

  if (scores.length === 0) {
    return 0;
  }

  const average = scores.reduce((sum, item) => sum + item, 0) / scores.length;

  return Math.round(average);
}

function loadProfilesFromLocalStorage() {
  const profilesFull = normalizeArray<SavedProfile>(
    safeJsonParse(getLocalStorageValue('profiles_full')),
  );

  const profiles = normalizeArray<SavedProfile>(
    safeJsonParse(getLocalStorageValue('profiles')),
  );

  const singleProfile = safeJsonParse<SavedProfile>(
    getLocalStorageValue('profile'),
  );

  const activeProfile = safeJsonParse<SavedProfile>(
    getLocalStorageValue('active_profile'),
  );

  const allProfiles = [
    ...profilesFull,
    ...profiles,
    ...(singleProfile ? [singleProfile] : []),
    ...(activeProfile ? [activeProfile] : []),
  ];

  const uniqueProfiles = new Map<string, SavedProfile>();

  allProfiles.forEach((profile, index) => {
    const key =
      profile.id ||
      profile.title ||
      profile.topic ||
      profile.savedAt ||
      profile.createdAt ||
      profile.created_at ||
      profile.updated_at ||
      `profile-${index}`;

    uniqueProfiles.set(String(key), profile);
  });

  return Array.from(uniqueProfiles.values());
}

function loadTextsFromLocalStorage() {
  const texts = normalizeArray<SavedText>(
    safeJsonParse(getLocalStorageValue('texts')),
  );

  const generatedTexts = normalizeArray<SavedText>(
    safeJsonParse(getLocalStorageValue('generated_texts')),
  );

  const chatHistory = normalizeArray<SavedText>(
    safeJsonParse(getLocalStorageValue('chat_history')),
  );

  const outputs = normalizeArray<SavedText>(
    safeJsonParse(getLocalStorageValue('outputs')),
  );

  const savedOutputs = normalizeArray<SavedText>(
    safeJsonParse(getLocalStorageValue('saved_outputs')),
  );

  const latestGeneratedText = getLocalStorageValue('latest_generated_work_text');

  const latestTextItem: SavedText[] =
    latestGeneratedText && latestGeneratedText.trim().length > 0
      ? [
          {
            id: 'latest_generated_work_text',
            title: 'Najnovší vygenerovaný text',
            text: latestGeneratedText,
          },
        ]
      : [];

  const allTexts = [
    ...texts,
    ...generatedTexts,
    ...chatHistory,
    ...outputs,
    ...savedOutputs,
    ...latestTextItem,
  ].filter(hasTextContent);

  const uniqueTexts = new Map<string, SavedText>();

  allTexts.forEach((text, index) => {
    const key =
      text.id ||
      text.title ||
      text.createdAt ||
      text.savedAt ||
      text.created_at ||
      text.updated_at ||
      `${text.text || text.content || text.output || text.result || ''}`.slice(
        0,
        80,
      ) ||
      `text-${index}`;

    uniqueTexts.set(String(key), text);
  });

  return Array.from(uniqueTexts.values());
}

function loadDashboardStatsFromLocalStorage(): DashboardStatsState {
  const profiles = loadProfilesFromLocalStorage();
  const texts = loadTextsFromLocalStorage();

  return {
    projectsCount: profiles.length,
    textsCount: texts.length,
    aiScore: calculateAiScore(texts),
  };
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsState>({
    projectsCount: 0,
    textsCount: 0,
    aiScore: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const load = () => {
      setStats(loadDashboardStatsFromLocalStorage());
    };

    load();

    window.addEventListener('storage', load);
    window.addEventListener('focus', load);
    window.addEventListener('zedpera:stats-refresh', load);

    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('focus', load);
      window.removeEventListener('zedpera:stats-refresh', load);
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Moje práce',
        value: stats.projectsCount,
        suffix: '',
        icon: BookOpen,
        description: 'Počet vytvorených alebo uložených profilov práce.',
      },
      {
        label: 'Texty',
        value: stats.textsCount,
        suffix: '',
        icon: FileText,
        description: 'Počet uložených alebo spracovaných textových výstupov.',
      },
      {
        label: 'Celkové AI skóre',
        value: stats.aiScore,
        suffix: '%',
        icon: Sparkles,
        description: 'Priemerné skóre z uložených AI hodnotení.',
      },
    ],
    [stats],
  );

  return (
    <section className="w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="group relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.035] p-7 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-purple-400/50 hover:shadow-purple-950/30"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-600/10 blur-3xl transition group-hover:bg-purple-500/20" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/20 transition group-hover:bg-purple-600 group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </div>

                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Live
                </span>
              </div>

              <div className="relative mt-7">
                <h3 className="text-lg font-black text-slate-100">
                  {card.label}
                </h3>

                <div className="mt-4 text-5xl font-black tracking-tight text-white">
                  {card.value}
                  {card.suffix}
                </div>

                <p className="mt-5 max-w-[260px] text-sm leading-7 text-slate-400">
                  {card.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}