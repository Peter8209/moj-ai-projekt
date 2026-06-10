'use client';

import {
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  CreditCard,
  GraduationCap,
  History,
  Home,
  Mail,
  Menu,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Video,
  WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MobileDashboardTab = 'main' | 'ai' | 'module';

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
  onNavigate?: (path: string) => void;
};

const mobileMainMenuItems = [
  {
    label: 'Menu',
    description: 'Úvodná obrazovka',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Profil',
    description: 'Účet klienta',
    href: '/profile?tab=account',
    icon: UserCircle,
  },
  {
    label: 'AI Chat',
    description: 'Samostatný chat',
    href: '/chat',
    icon: Bot,
  },
  {
    label: 'Moje práce',
    description: 'Zoznam rozpracovaných prác',
    href: '/projects?view=list',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Zdroje',
    description: 'Literatúra a citácie',
    href: '/sources',
    icon: BookOpen,
  },
  {
    label: 'Balíčky',
    description: 'Predplatné a doplnky',
    href: '/pricing',
    icon: CreditCard,
  },
  {
    label: 'História',
    description: 'História výstupov',
    href: '/history',
    icon: History,
  },
  {
    label: 'Video návod',
    description: 'Mobilné video návody',
    href: '/videos',
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
    .replace(/Preklad/gi, 'Translator')
    .replace(/Translation/gi, 'Translator')
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
      return 'Translator';

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
      return 'Plánovanie termínov';

    case 'emails':
      return 'Profesionálne písanie emailov';

    case 'humanizer':
      return 'Prirodzený štýl textu';

    case 'originality':
      return 'Kontrola originality textu';

    default:
      return 'AI nástroj';
  }
}

function scrollToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
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
  const [activeTab, setActiveTab] = useState<MobileDashboardTab>('main');
  const [selectedMobileModuleKey, setSelectedMobileModuleKey] =
    useState<string>(activeModule);

  const cleanActiveModuleLabel = useMemo(() => {
    if (activeModule === 'translation') {
      return 'Translator';
    }

    if (activeModule === 'planning') {
      return 'Plánovanie termínov';
    }

    if (activeModule === 'emails') {
      return 'Profesionálne písanie emailov';
    }

    return normalizeModuleLabel(activeModuleLabel);
  }, [activeModule, activeModuleLabel]);

  const visibleModules = useMemo(() => {
    if (!Array.isArray(moduleInfos)) {
      return [];
    }

    return moduleInfos.filter((item) => item.key !== 'originality');
  }, [moduleInfos]);

  const selectedMobileModule = useMemo(() => {
    return (
      visibleModules.find((item) => item.key === selectedMobileModuleKey) ||
      visibleModules.find((item) => item.key === activeModule) ||
      visibleModules[0]
    );
  }, [activeModule, selectedMobileModuleKey, visibleModules]);

  const selectedMobileModuleRawLabel = selectedMobileModule
    ? t?.dashboardTools?.tools?.[selectedMobileModule.translationKey] ||
      selectedMobileModule.translationKey
    : cleanActiveModuleLabel;

  const selectedMobileModuleLabel = selectedMobileModule
    ? getShortModuleLabel(selectedMobileModule.key, selectedMobileModuleRawLabel)
    : cleanActiveModuleLabel;

  const selectedMobileModuleDescription = selectedMobileModule
    ? getModuleDescription(selectedMobileModule.key)
    : activeModuleSubtitle || 'AI nástroj';

  useEffect(() => {
    if (activeModule) {
      setSelectedMobileModuleKey(activeModule);
    }
  }, [activeModule]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute(
      'data-zedpera-mobile-dashboard-tab',
      activeTab,
    );

    document.body.setAttribute(
      'data-zedpera-mobile-dashboard-tab',
      activeTab,
    );

    return () => {
      document.documentElement.removeAttribute(
        'data-zedpera-mobile-dashboard-tab',
      );

      document.body.removeAttribute('data-zedpera-mobile-dashboard-tab');
    };
  }, [activeTab]);

  function scrollToDashboardToolPanel() {
    window.setTimeout(() => {
      const dashboardPanel =
        document.getElementById('dashboard-tool-panel') ||
        document.querySelector('[data-dashboard-tool-panel="true"]');

      dashboardPanel?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 140);
  }

  function openMainPage() {
    setActiveTab('main');
    scrollToTop();
  }

  function openAiPage() {
    setActiveTab('ai');
    scrollToTop();
  }

  function openModulePage() {
    setActiveTab('module');
    scrollToDashboardToolPanel();
  }

  function handleSelectModule(moduleKey: string) {
    setSelectedMobileModuleKey(moduleKey);
    setActiveTab('module');
    onSelectModule(moduleKey);

    window.setTimeout(() => {
      scrollToDashboardToolPanel();
    }, 200);
  }

  function handleNavigate(path: string) {
    if (typeof window !== 'undefined' && path.startsWith('/projects')) {
      localStorage.removeItem('zedpera_new_project_mode');
      localStorage.removeItem('zedpera_open_identity');
      localStorage.removeItem('zedpera_open_project_identity');
      localStorage.removeItem('zedpera_continue_project_identity');
      localStorage.removeItem('zedpera_last_project_identity');
      localStorage.removeItem('zedpera_selected_project_identity');
    }

    if (onNavigate) {
      onNavigate(path);
      return;
    }

    window.location.href = path;
  }

  return (
    <>
      <style jsx global>{`
        @media (max-width: 1279px) {
          html,
          body {
            min-height: 100%;
            overflow-x: hidden !important;
          }

          html[data-zedpera-mobile-dashboard-tab='main'],
          body[data-zedpera-mobile-dashboard-tab='main'],
          html[data-zedpera-mobile-dashboard-tab='ai'],
          body[data-zedpera-mobile-dashboard-tab='ai'] {
            background: #020617 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='main']
            #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='main']
            [data-dashboard-tool-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='main']
            [data-mobile-dashboard-hidden-on-menu='true'],
          html[data-zedpera-mobile-dashboard-tab='ai'] #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='ai']
            [data-dashboard-tool-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='ai']
            [data-mobile-dashboard-hidden-on-menu='true'] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            min-height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            #dashboard-tool-panel,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-dashboard-tool-panel='true'] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-mobile-dashboard-hidden-on-menu='true'] {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            #dashboard-tool-panel
            *,
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-dashboard-tool-panel='true']
            * {
            max-width: 100% !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-results='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-result='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-panel='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-modal='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [data-analysis-content='true'],
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-results,
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-result,
          html[data-zedpera-mobile-dashboard-tab='module']
            .analysis-panel {
            max-height: none !important;
            overflow: visible !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            [role='dialog'],
          html[data-zedpera-mobile-dashboard-tab='module']
            [aria-modal='true'] {
            max-height: 100dvh !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            button,
          html[data-zedpera-mobile-dashboard-tab='module']
            a {
            -webkit-tap-highlight-color: transparent;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            button[class*='bg-white'],
          html[data-zedpera-mobile-dashboard-tab='module']
            a[class*='bg-white'] {
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.18) !important;
            background: rgba(30, 41, 59, 0.92) !important;
          }

          html[data-zedpera-mobile-dashboard-tab='module']
            button[class*='bg-white']:hover,
          html[data-zedpera-mobile-dashboard-tab='module']
            a[class*='bg-white']:hover {
            background: rgba(51, 65, 85, 0.98) !important;
          }
        }
      `}</style>

      <section className="relative z-[70] -mx-4 border-b border-white/10 bg-[#020617]/98 px-4 pb-4 pt-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        {activeTab === 'module' ? (
          <div className="rounded-3xl border border-violet-400/20 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/40">
                  {selectedMobileModule ? (
                    getModuleIcon(selectedMobileModule.key)
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                    Otvorený modul
                  </p>

                  <h3 className="line-clamp-1 text-base font-black text-white">
                    {selectedMobileModuleLabel}
                  </h3>

                  <p className="line-clamp-1 text-[11px] font-semibold text-slate-400">
                    {selectedMobileModuleDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openAiPage}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                AI nástroje
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={openMainPage}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                <Menu className="h-3.5 w-3.5" />
                Menu
              </button>

              <button
                type="button"
                onClick={openAiPage}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI nástroje
              </button>

              <button
                type="button"
                onClick={scrollToDashboardToolPanel}
                className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.98]"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Panel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[calc(100dvh-2rem)] flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
                Mobilná aplikácia
              </p>

              <h2 className="mt-1 line-clamp-1 text-xl font-black leading-tight text-white">
                {activeTab === 'main' ? 'Hlavné menu' : 'AI nástroje'}
              </h2>

              <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                {activeTab === 'main'
                  ? 'Prvá stránka obsahuje iba hlavné menu systému.'
                  : 'Druhá stránka obsahuje iba výber AI nástrojov.'}
              </p>
            </div>

            {activeProfileTitle ||
            activeProfileSubtitle ||
            activeProfileType ? (
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
            ) : null}

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-[#070b18] p-2 shadow-2xl shadow-black/40">
              <button
                type="button"
                onClick={openMainPage}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                  activeTab === 'main'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
                aria-pressed={activeTab === 'main'}
              >
                <Menu className="h-4 w-4" />
                Menu
              </button>

              <button
                type="button"
                onClick={openAiPage}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                  activeTab === 'ai'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
                }`}
                aria-pressed={activeTab === 'ai'}
              >
                <Sparkles className="h-4 w-4" />
                AI nástroje
              </button>

              <button
                type="button"
                onClick={openModulePage}
                className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[10px] font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white active:scale-[0.98]"
              >
                {selectedMobileModule ? (
                  getModuleIcon(selectedMobileModule.key)
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                Modul
              </button>
            </div>

            {activeTab === 'main' ? (
              <div className="flex-1 rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-200">
                    <Menu className="h-4 w-4" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      Hlavné menu
                    </p>

                    <p className="line-clamp-1 text-[11px] font-semibold text-slate-500">
                      Základné sekcie systému
                    </p>
                  </div>
                </div>

                <div className="max-h-[calc(100dvh-260px)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    {mobileMainMenuItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={`${item.href}-${item.label}`}
                          type="button"
                          onClick={() => handleNavigate(item.href)}
                          className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:border-violet-300/40 hover:bg-violet-600/20 active:scale-[0.98]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/30 text-violet-200">
                            <Icon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black">
                              {item.label}
                            </span>

                            <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAiPage}
                  className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  Pokračovať na AI nástroje
                </button>
              </div>
            ) : null}

            {activeTab === 'ai' ? (
              <div className="flex-1 rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200">
                      <Sparkles className="h-4 w-4" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                        AI nástroje
                      </p>

                      <p className="line-clamp-1 text-[11px] font-semibold text-slate-500">
                        Vyberte nástroj a otvorí sa pracovná stránka modulu.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openMainPage}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Späť
                  </button>
                </div>

                {visibleModules.length > 0 ? (
                  <div className="max-h-[calc(100dvh-260px)] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                            className={`flex min-h-[68px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${
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
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                    <p className="text-xs font-bold text-slate-400">
                      AI nástroje nie sú dostupné.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
