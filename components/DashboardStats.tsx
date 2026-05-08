'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Sparkles } from 'lucide-react';

type SavedProfile = {
  id?: string;
  title?: string;
  topic?: string;
  type?: string;
  savedAt?: string;
};

type SavedText = {
  id?: string;
  title?: string;
  content?: string;
  text?: string;
  score?: number;
  aiScore?: number;
  createdAt?: string;
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

function getNumber(value: unknown): number | null {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function calculateAiScore(texts: SavedText[]) {
  const scores = texts
    .map((item) => getNumber(item.aiScore ?? item.score))
    .filter((item): item is number => item !== null);

  if (scores.length === 0) {
    return 0;
  }

  const average = scores.reduce((sum, item) => sum + item, 0) / scores.length;

  return Math.round(Math.max(0, Math.min(100, average)));
}

function loadDashboardStatsFromLocalStorage(): DashboardStatsState {
  const profilesFull = normalizeArray<SavedProfile>(
    safeJsonParse(
      typeof window !== 'undefined' ? localStorage.getItem('profiles_full') : null,
    ),
  );

  const profiles = normalizeArray<SavedProfile>(
    safeJsonParse(
      typeof window !== 'undefined' ? localStorage.getItem('profiles') : null,
    ),
  );

  const singleProfile = safeJsonParse<SavedProfile>(
    typeof window !== 'undefined' ? localStorage.getItem('profile') : null,
  );

  const activeProfile = safeJsonParse<SavedProfile>(
    typeof window !== 'undefined' ? localStorage.getItem('active_profile') : null,
  );

  const allProfiles = [
    ...profilesFull,
    ...profiles,
    ...(singleProfile ? [singleProfile] : []),
    ...(activeProfile ? [activeProfile] : []),
  ];

  const uniqueProfiles = new Map<string, SavedProfile>();

  allProfiles.forEach((profile, index) => {
    const key = profile.id || profile.title || profile.topic || `profile-${index}`;
    uniqueProfiles.set(key, profile);
  });

  const savedTexts = normalizeArray<SavedText>(
    safeJsonParse(
      typeof window !== 'undefined' ? localStorage.getItem('texts') : null,
    ),
  );

  const history = normalizeArray<SavedText>(
    safeJsonParse(
      typeof window !== 'undefined' ? localStorage.getItem('chat_history') : null,
    ),
  );

  const outputs = normalizeArray<SavedText>(
    safeJsonParse(
      typeof window !== 'undefined' ? localStorage.getItem('outputs') : null,
    ),
  );

  const allTexts = [...savedTexts, ...history, ...outputs];

  return {
    projectsCount: uniqueProfiles.size,
    textsCount: allTexts.length,
    aiScore: calculateAiScore(allTexts),
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

    return () => {
      window.removeEventListener('storage', load);
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
    <section className="mx-auto w-full max-w-6xl px-2 md:px-0">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="group flex min-h-[250px] flex-col justify-between rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-[0_25px_70px_rgba(124,58,237,0.18)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </div>

                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Live
                </span>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-black leading-snug text-slate-100">
                  {card.label}
                </h3>

                <div className="mt-4 text-5xl font-black tracking-tight text-white">
                  {card.value}
                  {card.suffix}
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-slate-400">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}