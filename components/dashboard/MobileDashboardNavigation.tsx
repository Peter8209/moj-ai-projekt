'use client';

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Languages,
  Mail,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  WandSparkles,
} from 'lucide-react';
import { useMemo } from 'react';

type MobileDashboardModuleInfo = {
  key: string;
  translationKey: string;
};

type MobileDashboardNavigationProps = {
  activeModule: string;
  activeModuleLabel: string;
  activeModuleSubtitle?: string;
  activeProfileTitle?: string;
  activeProfileType?: string;
  moduleInfos: MobileDashboardModuleInfo[];
  t: any;
  onSelectModule: (moduleKey: string) => void;
  onNavigate: (path: string) => void;
};

function normalizeModuleLabel(label: string) {
  const value = String(label || '').trim();

  if (!value) return 'AI nástroj';

  return value
    .replace(/AI\s*supervisor/gi, 'AI školiteľ')
    .replace(/AI\s*supervízor/gi, 'AI školiteľ')
    .replace(/AI\s*vedúci/gi, 'AI školiteľ')
    .replace(/AI\s*veduci/gi, 'AI školiteľ')
    .replace(/Originalita/gi, 'Kontrola originality');
}

function getModuleIcon(moduleKey: string) {
  switch (moduleKey) {
    case 'supervisor':
      return <GraduationCap className="h-4 w-4" />;

    case 'quality':
      return <ShieldCheck className="h-4 w-4" />;

    case 'defense':
      return <PlayCircle className="h-4 w-4" />;

    case 'translation':
      return <Languages className="h-4 w-4" />;

    case 'data':
      return <BarChart3 className="h-4 w-4" />;

    case 'planning':
      return <CalendarDays className="h-4 w-4" />;

    case 'emails':
      return <Mail className="h-4 w-4" />;

    case 'humanizer':
      return <WandSparkles className="h-4 w-4" />;

    case 'originality':
      return <ShieldCheck className="h-4 w-4" />;

    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function getShortModuleLabel(moduleKey: string, label: string) {
  const normalized = normalizeModuleLabel(label);

  switch (moduleKey) {
    case 'supervisor':
      return 'AI školiteľ';

    case 'quality':
      return 'Audit';

    case 'defense':
      return 'Obhajoba';

    case 'translation':
      return 'Preklad';

    case 'data':
      return 'Dáta';

    case 'planning':
      return 'Plán';

    case 'emails':
      return 'Email';

    case 'humanizer':
      return 'Humanizér';

    case 'originality':
      return 'Originalita';

    default:
      return normalized;
  }
}

export default function MobileDashboardNavigation({
  activeModule,
  activeModuleLabel,
  activeProfileTitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
  const cleanActiveModuleLabel = useMemo(() => {
    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModuleLabel]);

  const visibleModules = useMemo(() => {
    return moduleInfos.filter((item) => item.key !== 'originality');
  }, [moduleInfos]);

  function scrollToDashboardToolPanel() {
    window.setTimeout(() => {
      const dashboardPanel =
        document.getElementById('dashboard-tool-panel') ||
        document.querySelector('[data-dashboard-tool-panel="true"]');

      dashboardPanel?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }

  function handleSelectModule(moduleKey: string) {
    onSelectModule(moduleKey);
    scrollToDashboardToolPanel();
  }

  return (
    <>
      {/* MALÝ HORNÝ STAV BEZ MENU */}
      <section className="xl:hidden">
        <div className="rounded-[1.5rem] border border-white/10 bg-[#070b16] px-4 py-3 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                Zedpera AI
              </p>

              <p className="mt-1 truncate text-base font-black text-white">
                {cleanActiveModuleLabel}
              </p>

              <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                {activeProfileTitle || 'Nie je vybraná žiadna práca'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/profile')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
              aria-label="Profil"
            >
              <User className="h-5 w-5" />
            </button>
          </div>

          {activeProfileType ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="truncate text-xs font-bold text-slate-300">
                {activeProfileType}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* SPODNÁ MOBILNÁ NAVIGÁCIA */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-white shadow-2xl shadow-black/70 backdrop-blur-xl xl:hidden">
        {/* AKTÍVNY NÁSTROJ */}
        <div className="mb-2 rounded-2xl border border-white/10 bg-[#070b16] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">
                Aktívny nástroj
              </p>

              <p className="truncate text-sm font-black text-white">
                {cleanActiveModuleLabel}
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200">
              AI
            </span>
          </div>
        </div>

        {/* POSUVNÉ AI MODULY */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {visibleModules.map((item) => {
            const active = activeModule === item.key;

            const rawLabel =
              t?.dashboardTools?.tools?.[item.translationKey] ||
              item.translationKey;

            const label = getShortModuleLabel(item.key, rawLabel);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectModule(item.key)}
                className={`flex min-h-[52px] min-w-[118px] shrink-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center text-xs font-black transition ${
                  active
                    ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/50'
                    : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                }`}
                aria-pressed={active}
              >
                <span className="shrink-0">
                  {getModuleIcon(item.key)}
                </span>

                <span className="truncate">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* HLAVNÁ SPODNÁ LIŠTA */}
        <div className="grid grid-cols-5 gap-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={() => {
              onNavigate('/dashboard');
              scrollToDashboardToolPanel();
            }}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white"
          >
            <Sparkles className="h-4 w-4" />
            <span className="max-w-full truncate">Panel</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/projects?new=1')}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1]"
          >
            <FileText className="h-4 w-4" />
            <span className="max-w-full truncate">Nová</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/projects')}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1]"
          >
            <BookOpen className="h-4 w-4" />
            <span className="max-w-full truncate">Práce</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/sources')}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1]"
          >
            <Search className="h-4 w-4" />
            <span className="max-w-full truncate">Zdroje</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/video')}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-2 py-2 text-[10px] font-black text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <PlayCircle className="h-4 w-4" />
            <span className="max-w-full truncate">Videá</span>
          </button>
        </div>
      </nav>
    </>
  );
}