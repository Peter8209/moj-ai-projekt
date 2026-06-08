'use client';

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
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
import { useMemo, useState } from 'react';

type LanguageCode = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

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
  language?: LanguageCode;
  onChangeLanguage?: (language: LanguageCode) => void;
  onSelectModule: (moduleKey: string) => void;
  onNavigate: (path: string) => void;
};

const dashboardLanguages: Array<{
  code: LanguageCode;
  label: string;
  short: string;
}> = [
  { code: 'sk', label: 'Slovenčina', short: 'SK' },
  { code: 'cs', label: 'Čeština', short: 'CZ' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'pl', label: 'Polski', short: 'PL' },
  { code: 'hu', label: 'Magyar', short: 'HU' },
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

function getBottomMainMenuItems(onNavigate: (path: string) => void) {
  return [
    {
      key: 'overview',
      label: 'Menu',
      description: 'Hlavný prehľad',
      icon: <Home className="h-4 w-4" />,
      onClick: () => onNavigate('/dashboard'),
    },
    {
      key: 'profile',
      label: 'Profil',
      description: 'Účet klienta',
      icon: <User className="h-4 w-4" />,
      onClick: () => onNavigate('/profile?tab=account'),
    },
    {
      key: 'chat',
      label: 'AI Chat',
      description: 'Písanie a úprava textu',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => onNavigate('/chat'),
    },
    {
      key: 'new-work',
      label: 'Nová práca',
      description: 'Vytvoriť prácu',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onNavigate('/projects?new=1'),
    },
    {
      key: 'works',
      label: 'Moje práce',
      description: 'Rozpracované práce',
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => onNavigate('/projects?view=list'),
    },
    {
      key: 'sources',
      label: 'Zdroje',
      description: 'Literatúra',
      icon: <Search className="h-4 w-4" />,
      onClick: () => onNavigate('/sources'),
    },
    {
      key: 'packages',
      label: 'Balíčky',
      description: 'Predplatné',
      icon: <CreditCard className="h-4 w-4" />,
      onClick: () => onNavigate('/pricing'),
    },
    {
      key: 'history',
      label: 'História',
      description: 'História chatu',
      icon: <History className="h-4 w-4" />,
      onClick: () => onNavigate('/history'),
    },
  ];
}

function getFallbackLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'sk';

  const stored =
    window.localStorage.getItem('zedpera_language') ||
    window.localStorage.getItem('zedpera_system_language') ||
    'sk';

  if (
    stored === 'sk' ||
    stored === 'cs' ||
    stored === 'en' ||
    stored === 'de' ||
    stored === 'pl' ||
    stored === 'hu'
  ) {
    return stored;
  }

  return 'sk';
}

function persistDashboardLanguage(language: LanguageCode) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('zedpera_language', language);
  window.localStorage.setItem('zedpera_system_language', language);

  document.documentElement.lang = language;
  document.documentElement.setAttribute('data-language', language);
  document.documentElement.setAttribute('data-system-language', language);
  document.documentElement.setAttribute('data-work-language', language);

  window.dispatchEvent(
    new CustomEvent('zedpera:language-changed', {
      detail: {
        language,
      },
    }),
  );
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
  language,
  onChangeLanguage,
  onSelectModule,
  onNavigate,
}: MobileDashboardNavigationProps) {
  const [localLanguage, setLocalLanguage] = useState<LanguageCode>(() => {
    return language || getFallbackLanguage();
  });

  const selectedLanguage = language || localLanguage;

  const cleanActiveModuleLabel = useMemo(() => {
    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModuleLabel]);

  const visibleModules = useMemo(() => {
    if (!Array.isArray(moduleInfos)) {
      return [];
    }

    return moduleInfos;
  }, [moduleInfos]);

  const bottomMainMenuItems = useMemo(() => {
    return getBottomMainMenuItems(onNavigate);
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

  function handleChangeLanguage(nextLanguage: LanguageCode) {
    setLocalLanguage(nextLanguage);
    persistDashboardLanguage(nextLanguage);
    onChangeLanguage?.(nextLanguage);
  }

  return (
    <>
      {/* =====================================================
          MOBILNÁ VRCHNÁ LIŠTA — IBA AI SEKCIA
          Toto nahrádza pôvodné horné menu.
      ===================================================== */}

      <section className="sticky top-0 z-[70] -mx-4 border-b border-white/10 bg-[#020617]/95 px-4 pb-3 pt-3 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
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
            onClick={() => onNavigate('/profile?tab=account')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.1] active:scale-95"
            aria-label="Profil"
          >
            <User className="h-5 w-5" />
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

        {/* JAZYKY — OSTÁVAJÚ HORE POD AI SEKCIOU */}
        <div className="mb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {dashboardLanguages.map((item) => {
              const active = selectedLanguage === item.code;

              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleChangeLanguage(item.code)}
                  className={`flex min-h-[40px] min-w-[74px] shrink-0 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition active:scale-95 ${
                    active
                      ? 'border-cyan-300 bg-cyan-500 text-white shadow-lg shadow-cyan-950/40'
                      : 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:text-white'
                  }`}
                  aria-pressed={active}
                  title={item.label}
                >
                  <span
                    className={`flex h-6 min-w-8 items-center justify-center rounded-xl px-2 text-[10px] font-black ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-black/30 text-cyan-200'
                    }`}
                  >
                    {item.short}
                  </span>

                  {active ? <Check className="h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </div>

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

      {/* =====================================================
          MOBILNÁ SPODNÁ LIŠTA — HLAVNÉ MENU
      ===================================================== */}

      <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-white/10 bg-[#020617]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 text-white shadow-2xl shadow-black/70 backdrop-blur-2xl xl:hidden">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">
              Hlavné menu
            </p>

            <p className="line-clamp-1 text-xs font-black text-white">
              Zedpera Dashboard
            </p>
          </div>

          <p className="line-clamp-1 text-[10px] font-bold text-slate-400">
            Práca, profil, zdroje a história
          </p>
        </div>

        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {bottomMainMenuItems.map((item) => {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    item.onClick();

                    if (item.key === 'overview') {
                      scrollToDashboardToolPanel();
                    }
                  }}
                  className="flex min-h-[62px] w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.97]"
                  title={item.description}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/25 text-violet-200">
                    {item.icon}
                  </span>

                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MEDZERA, ABY SPODNÁ HLAVNÁ LIŠTA NEPREKRÝVALA OBSAH */}
      <div className="h-[108px] xl:hidden" aria-hidden="true" />
    </>
  );
}