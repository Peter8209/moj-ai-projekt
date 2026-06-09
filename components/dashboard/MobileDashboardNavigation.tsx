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
  activeProfileSubtitle?: string;
  activeProfileType?: string;
  moduleInfos: MobileDashboardModuleInfo[];
  t?: any;
  onSelectModule: (moduleKey: string) => void;

  /**
   * Navigácia z DashboardClient.tsx.
   * Používa sa pre hlavné mobilné menu.
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
      return 'Analýza dát';

    case 'planning':
      return 'Plánovanie';

    case 'emails':
      return 'Emaily';

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
      return 'Odborné vedenie práce';

    case 'quality':
      return 'Kontrola kvality práce';

    case 'defense':
      return 'Príprava obhajoby';

    case 'translation':
      return 'Odborný preklad textu';

    case 'data':
      return 'Tabuľky, výpočty a grafy';

    case 'planning':
      return 'Harmonogram práce';

    case 'emails':
      return 'Akademická komunikácia';

    case 'humanizer':
      return 'Prirodzený štýl textu';

    case 'originality':
      return 'Kontrola originality textu';

    default:
      return 'AI nástroj';
  }
}

export default function MobileDashboardNavigation({
  activeModule,
  activeProfileTitle,
  activeProfileSubtitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
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
    if (onNavigate) {
      onNavigate(path);
      return;
    }

    window.location.href = path;
  }

  return (
    <>
      {/* =====================================================
          MOBILNÁ ÚVODNÁ STRÁNKA DASHBOARDU
          - po prihlásení sa zobrazí hlavné menu
          - spodná AI lišta je odstránená
          - AI nástroje sú vložené priamo do hlavného menu
      ===================================================== */}

      <section className="sticky top-0 z-[70] -mx-4 border-b border-white/10 bg-[#020617]/95 px-4 pb-4 pt-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
            Mobilná aplikácia
          </p>

          <h2 className="mt-1 text-xl font-black leading-tight text-white">
            Hlavné menu
          </h2>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Vyberte sekciu alebo AI nástroj, s ktorým chcete pracovať.
          </p>
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

        <div className="rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-200">
              <Menu className="h-4 w-4" />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Hlavné menu
              </p>
              <p className="text-[11px] font-semibold text-slate-500">
                Základné sekcie systému
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {mobileMainMenuItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={`${item.href}-${item.label}`}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className="flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-violet-300/40 hover:bg-violet-600/20 active:scale-[0.98]"
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

          {visibleModules.length > 0 ? (
            <>
              <div className="my-4 h-px bg-white/10" />

              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                    AI nástroje
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Školiteľ, audit, obhajoba a ďalšie moduly
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                      className={`flex min-h-[58px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                        active
                          ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                          : 'border-white/10 bg-white/[0.06] text-white hover:border-violet-300/40 hover:bg-violet-600/20'
                      }`}
                      title={getModuleDescription(item.key)}
                      aria-pressed={active}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-black/30 text-violet-200'
                        }`}
                      >
                        {getModuleIcon(item.key)}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black">
                          {label}
                        </span>

                        <span
                          className={`mt-0.5 block truncate text-[10px] font-semibold ${
                            active ? 'text-violet-100' : 'text-slate-500'
                          }`}
                        >
                          {getModuleDescription(item.key)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}