'use client';

import {
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  History,
  Home,
  Mail,
  Menu,
  Package,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Video,
  WandSparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type MobileDashboardModuleInfo = {
  key: string;
  translationKey: string;
};

type MobileDashboardNavigationProps = {
  activeModule: string;
  activeModuleLabel: string;
  activeModuleSubtitle?: string;
  activeProfileTitle?: string;
  activeProfileSubtitle?: string;
  activeProfileType?: string;
  moduleInfos: MobileDashboardModuleInfo[];
  t?: any;
  onSelectModule: (moduleKey: string) => void;

  /**
   * Navigácia z DashboardClient.tsx.
   * Používa sa pre rozbaľovacie hlavné menu.
   */
  onNavigate?: (path: string) => void;
};

const mobileMainMenuItems = [
  {
    label: 'Menu',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Profil',
    href: '/profile',
    icon: UserCircle,
  },
  {
    label: 'AI Chat',
    href: '/chat',
    icon: Bot,
  },
  {
    label: 'Moje práce',
    href: '/works',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Zdroje',
    href: '/sources',
    icon: BookOpen,
  },
  {
    label: 'Balíčky',
    href: '/packages',
    icon: Package,
  },
  {
    label: 'História',
    href: '/history',
    icon: History,
  },
  {
    label: 'Video návod',
    href: '/video',
    icon: Video,
  },
];

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
      return <Sparkles className="h-4 w-4" />;

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

function getModuleDescription(moduleKey: string) {
  switch (moduleKey) {
    case 'supervisor':
      return 'Odborné pripomienky';

    case 'quality':
      return 'Kontrola kvality';

    case 'defense':
      return 'Príprava obhajoby';

    case 'translation':
      return 'Odborný preklad';

    case 'data':
      return 'Tabuľky a grafy';

    case 'planning':
      return 'Harmonogram';

    case 'emails':
      return 'Komunikácia';

    case 'humanizer':
      return 'Prirodzený štýl';

    case 'originality':
      return 'Originalita textu';

    default:
      return 'AI nástroj';
  }
}

export default function MobileDashboardNavigation({
  activeModule,
  activeModuleLabel,
  activeModuleSubtitle,
  activeProfileTitle,
  activeProfileSubtitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);

  const cleanActiveModuleLabel = useMemo(() => {
    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModuleLabel]);

  const visibleModules = useMemo(() => {
    if (!Array.isArray(moduleInfos)) {
      return [];
    }

    return moduleInfos;
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

  function handleNavigate(path: string) {
    setIsMainMenuOpen(false);

    if (onNavigate) {
      onNavigate(path);
      return;
    }

    window.location.href = path;
  }

  return (
    <>
      {/* =====================================================
          MOBILNÁ VRCHNÁ LIŠTA
          - jazyky odstránené
          - hlavné menu sa otvorí/zatvorí po kliknutí
          - AI moduly ostávajú ako posuvná horná lišta
      ===================================================== */}

      <section className="sticky top-0 z-[70] -mx-4 border-b border-white/10 bg-[#020617]/95 px-4 pb-3 pt-3 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
              AI sekcia
            </p>

            <h2 className="mt-1 line-clamp-1 text-lg font-black leading-tight text-white">
              {cleanActiveModuleLabel}
            </h2>

            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
              {activeModuleSubtitle || 'Vyberte AI nástroj pre aktuálnu prácu'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMainMenuOpen((value) => !value)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-white shadow-lg transition active:scale-95 ${
              isMainMenuOpen
                ? 'border-violet-300 bg-violet-600 shadow-violet-950/40'
                : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.1]'
            }`}
            aria-expanded={isMainMenuOpen}
            aria-label={isMainMenuOpen ? 'Zatvoriť hlavné menu' : 'Otvoriť hlavné menu'}
            title={isMainMenuOpen ? 'Zatvoriť menu' : 'Otvoriť menu'}
          >
            {isMainMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {(activeProfileTitle || activeProfileSubtitle || activeProfileType) && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
            <p className="line-clamp-1 text-[11px] font-black text-white">
              {activeProfileTitle || 'Profil práce'}
            </p>

            {activeProfileSubtitle ? (
              <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400">
                {activeProfileSubtitle}
              </p>
            ) : null}

            {activeProfileType ? (
              <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-violet-300">
                {activeProfileType}
              </p>
            ) : null}
          </div>
        )}

        {/* HLAVNÉ MENU — SKRYTÉ / ODKRYTÉ PO KLIKNUTÍ */}
        {isMainMenuOpen ? (
          <div className="mb-3 rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Hlavné menu
              </p>

              <button
                type="button"
                onClick={() => setIsMainMenuOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
              >
                Skryť
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {mobileMainMenuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={`${item.href}-${item.label}`}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-violet-300/40 hover:bg-violet-600/20 active:scale-[0.98]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30 text-violet-200">
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black">
                        {item.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* AI MODULY — VRCHNÁ POSÚVATEĽNÁ LIŠTA */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
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
                  className={`flex min-h-[62px] w-[96px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.97] ${
                    active
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                      : 'border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:text-white'
                  }`}
                  aria-pressed={active}
                  title={getModuleDescription(item.key)}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-black/25 text-violet-200'
                    }`}
                  >
                    {getModuleIcon(item.key)}
                  </span>

                  <span className="max-w-full truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}