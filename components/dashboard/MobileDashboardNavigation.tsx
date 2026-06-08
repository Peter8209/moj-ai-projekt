'use client';

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  Home,
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
    .replace(/AI\s*supervizor/gi, 'AI školiteľ')
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
      key: 'overview',
      label: 'Prehľad',
      description: 'Hlavný prehľad aplikácie',
      icon: <Home className="h-4 w-4" />,
      onClick: () => onNavigate('/dashboard'),
      active: true,
    },
    {
      key: 'profile',
      label: 'Profil',
      description: 'Účet klienta',
      icon: <User className="h-4 w-4" />,
      onClick: () => onNavigate('/profile'),
      active: false,
    },
    {
      key: 'new-work',
      label: 'Nová práca',
      description: 'Vytvoriť prácu',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onNavigate('/projects?new=1'),
      active: false,
    },
    {
      key: 'works',
      label: 'Moje práce',
      description: 'Rozpracované práce',
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => onNavigate('/projects'),
      active: false,
    },
    {
      key: 'sources',
      label: 'Zdroje',
      description: 'Literatúra',
      icon: <Search className="h-4 w-4" />,
      onClick: () => onNavigate('/sources'),
      active: false,
    },
    {
      key: 'videos',
      label: 'Videá',
      description: 'Video návod',
      icon: <PlayCircle className="h-4 w-4" />,
      onClick: () => onNavigate('/video'),
      active: false,
    },
    {
      key: 'packages',
      label: 'Balíčky',
      description: 'Predplatné',
      icon: <CreditCard className="h-4 w-4" />,
      onClick: () => onNavigate('/packages'),
      active: false,
    },
    {
      key: 'history',
      label: 'História',
      description: 'História chatu',
      icon: <History className="h-4 w-4" />,
      onClick: () => onNavigate('/history'),
      active: false,
    },
  ];
}

export default function MobileDashboardNavigation({
  activeModule,
  activeProfileTitle,
  activeProfileType,
  moduleInfos,
  t,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
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
        document.querySelector('[data-dashboard-tool-panel="true"]') ||
        document.querySelector('[data-mobile-tool-panel="true"]');

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
      {/* HORNÁ MOBILNÁ LIŠTA: IBA AI NÁSTROJE */}
      <section className="sticky top-0 z-40 -mx-4 border-b border-white/10 bg-[#020617]/95 px-4 pb-3 pt-3 shadow-2xl shadow-black/40 backdrop-blur-xl xl:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
              AI nástroje
            </p>

            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
              {activeProfileTitle || 'Vyberte AI modul a pokračujte v práci'}
            </p>

            {activeProfileType ? (
              <p className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-500">
                {activeProfileType}
              </p>
            ) : null}
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
                  className={`min-h-[70px] w-[122px] shrink-0 rounded-2xl border px-3 py-3 text-left transition ${
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
      </section>

      {/* SPODNÁ MOBILNÁ LIŠTA: HLAVNÝ PREHĽAD APLIKÁCIE */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 text-white shadow-2xl shadow-black/70 backdrop-blur-xl xl:hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onClick();

                  if (item.key === 'overview') {
                    scrollToDashboardToolPanel();
                  }
                }}
                className={`flex min-h-[60px] w-[86px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition ${
                  item.active
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]'
                }`}
                title={item.description}
              >
                {item.icon}
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="h-[88px] xl:hidden" aria-hidden="true" />
    </>
  );
}
