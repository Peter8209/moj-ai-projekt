'use client';

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  History,
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
      return <GraduationCap className="h-4.5 w-4.5" />;

    case 'quality':
      return <ShieldCheck className="h-4.5 w-4.5" />;

    case 'defense':
      return <PlayCircle className="h-4.5 w-4.5" />;

    case 'translation':
      return <Languages className="h-4.5 w-4.5" />;

    case 'data':
      return <BarChart3 className="h-4.5 w-4.5" />;

    case 'planning':
      return <CalendarDays className="h-4.5 w-4.5" />;

    case 'emails':
      return <Mail className="h-4.5 w-4.5" />;

    case 'humanizer':
      return <WandSparkles className="h-4.5 w-4.5" />;

    case 'originality':
      return <ShieldCheck className="h-4.5 w-4.5" />;

    default:
      return <Sparkles className="h-4.5 w-4.5" />;
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

function getBottomNavItems(onNavigate: (path: string) => void) {
  return [
    {
      key: 'panel',
      label: 'Panel',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => onNavigate('/dashboard'),
      active: true,
    },
    {
      key: 'profile',
      label: 'Profil',
      icon: <User className="h-4 w-4" />,
      onClick: () => onNavigate('/profile'),
      active: false,
    },
    {
      key: 'new-work',
      label: 'Nová práca',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onNavigate('/projects?new=1'),
      active: false,
    },
    {
      key: 'works',
      label: 'Moje práce',
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => onNavigate('/projects'),
      active: false,
    },
    {
      key: 'sources',
      label: 'Zdroje',
      icon: <Search className="h-4 w-4" />,
      onClick: () => onNavigate('/sources'),
      active: false,
    },
    {
      key: 'videos',
      label: 'Videá',
      icon: <PlayCircle className="h-4 w-4" />,
      onClick: () => onNavigate('/videos'),
      active: false,
    },
    {
      key: 'packages',
      label: 'Balíčky',
      icon: <CreditCard className="h-4 w-4" />,
      onClick: () => onNavigate('/packages'),
      active: false,
    },
    {
      key: 'history',
      label: 'História',
      icon: <History className="h-4 w-4" />,
      onClick: () => onNavigate('/history'),
      active: false,
    },
  ];
}

export default function MobileDashboardNavigation({
  activeModule,
  activeModuleLabel,
  activeModuleSubtitle,
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

  const bottomNavItems = useMemo(() => {
    return getBottomNavItems(onNavigate);
  }, [onNavigate]);

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
      {/* MOBILNÉ HORNÉ MENU AI MODULOV — BEZ STARÉHO HORNÉHO STAVOVÉHO BLOKU */}
      <section className="xl:hidden">
        <div className="rounded-[1.6rem] border border-white/10 bg-[#070b16] p-3 shadow-2xl shadow-black/30">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                Hlavné AI menu
              </p>

              <h2 className="mt-1 line-clamp-1 text-lg font-black leading-tight text-white">
                {cleanActiveModuleLabel}
              </h2>

              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                {activeProfileTitle || 'Vyberte prácu alebo pokračujte v module'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/profile')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
              aria-label="Profil"
            >
              <User className="h-5 w-5" />
            </button>
          </div>

          {activeProfileType ? (
            <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2">
              <p className="line-clamp-1 text-[11px] font-bold text-slate-300">
                {activeProfileType}
              </p>
            </div>
          ) : null}

          <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              {visibleModules.map((item) => {
                const active = activeModule === item.key;

                const rawLabel =
                  t?.dashboardTools?.tools?.[item.translationKey] ||
                  item.translationKey;

                const label = getShortModuleLabel(item.key, rawLabel);
                const description = getModuleDescription(item.key);

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectModule(item.key)}
                    className={`min-h-[76px] w-[132px] shrink-0 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/50'
                        : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-black/25 text-violet-200'
                        }`}
                      >
                        {getModuleIcon(item.key)}
                      </span>

                      {active ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
                          ON
                        </span>
                      ) : null}
                    </div>

                    <p className="line-clamp-1 text-sm font-black leading-5">
                      {label}
                    </p>

                    <p
                      className={`mt-0.5 line-clamp-1 text-[10px] font-semibold leading-4 ${
                        active ? 'text-violet-100' : 'text-slate-400'
                      }`}
                    >
                      {description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-2 px-1 text-[10px] font-semibold text-slate-500">
            Posúvaním do strán zobrazíte všetky AI sekcie.
          </p>
        </div>

        <div className="h-[96px]" aria-hidden="true" />
      </section>

      {/* SPODNÁ POSÚVACIA LIŠTA AKO DISERTA */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 text-white shadow-2xl shadow-black/70 backdrop-blur-xl xl:hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onClick();

                  if (item.key === 'panel') {
                    scrollToDashboardToolPanel();
                  }
                }}
                className={`flex min-h-[58px] w-[82px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition ${
                  item.active
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                }`}
              >
                {item.icon}
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}