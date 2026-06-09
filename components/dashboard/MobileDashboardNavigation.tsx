'use client';

import {
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronUp,
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
  const [isMainMenuVisible, setIsMainMenuVisible] = useState(true);
  const [isModuleMenuVisible, setIsModuleMenuVisible] = useState(false);
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

    return moduleInfos;
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

  function scrollToDashboardToolPanel() {
    window.setTimeout(() => {
      const dashboardPanel =
        document.getElementById('dashboard-tool-panel') ||
        document.querySelector('[data-dashboard-tool-panel="true"]');

      dashboardPanel?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  }

  function showWorkingPanelOnly() {
    setIsModuleMenuVisible(false);
    scrollToDashboardToolPanel();
  }

  function handleSelectModule(moduleKey: string) {
    setSelectedMobileModuleKey(moduleKey);
    setActiveTab('module');
    setIsModuleMenuVisible(false);

    onSelectModule(moduleKey);
    scrollToDashboardToolPanel();
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
      <section className="sticky top-0 z-[70] -mx-4 border-b border-white/10 bg-[#020617]/95 px-4 pb-4 pt-4 text-white shadow-2xl shadow-black/40 backdrop-blur-2xl xl:hidden">
        <div className="mb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">
            Mobilná aplikácia
          </p>

          <h2 className="mt-1 line-clamp-1 text-xl font-black leading-tight text-white">
            {activeTab === 'main'
              ? 'Hlavné menu'
              : activeTab === 'ai'
                ? 'AI nástroje'
                : selectedMobileModuleLabel}
          </h2>

          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
            {activeTab === 'main'
              ? 'Vyberte sekciu systému alebo prejdite na AI nástroje.'
              : activeTab === 'ai'
                ? 'Vyberte AI nástroj, ktorý chcete otvoriť.'
                : isModuleMenuVisible
                  ? 'Menu modulu je odkryté. Môžete zmeniť nástroj alebo skryť menu.'
                  : 'Menu je skryté. Pracovný panel modulu je nižšie na stránke.'}
          </p>
        </div>

        {(activeProfileTitle || activeProfileSubtitle || activeProfileType) &&
        activeTab !== 'module' ? (
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

        {(activeTab !== 'module' || isModuleMenuVisible) && (
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-[#070b18] p-2 shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab('main');
                setIsModuleMenuVisible(false);
              }}
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
              onClick={() => {
                setActiveTab('ai');
                setIsModuleMenuVisible(false);
              }}
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
              onClick={() => {
                if (selectedMobileModule) {
                  setActiveTab('module');
                  setIsModuleMenuVisible(false);
                  scrollToDashboardToolPanel();
                } else {
                  setActiveTab('ai');
                }
              }}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-black transition active:scale-[0.98] ${
                activeTab === 'module'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40'
                  : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
              }`}
              aria-pressed={activeTab === 'module'}
            >
              {selectedMobileModule ? (
                getModuleIcon(selectedMobileModule.key)
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Modul
            </button>
          </div>
        )}

        {activeTab === 'main' ? (
          <div className="rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
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

              <button
                type="button"
                onClick={() => setIsMainMenuVisible((value) => !value)}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
                aria-expanded={isMainMenuVisible}
              >
                {isMainMenuVisible ? (
                  <>
                    Skryť
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Zobraziť
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {isMainMenuVisible ? (
              <div className="max-h-[54dvh] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            ) : (
              <button
                type="button"
                onClick={() => setIsMainMenuVisible(true)}
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/10 px-3 py-3 text-xs font-black text-violet-100 transition hover:bg-violet-500/15 active:scale-[0.98]"
              >
                <ChevronDown className="h-4 w-4" />
                Zobraziť hlavné menu
              </button>
            )}

            <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
              <p className="text-[11px] font-bold leading-5 text-cyan-100">
                AI školiteľ, Audit, Obhajoba a Translator sú na karte{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className="font-black text-white underline decoration-cyan-300/60 underline-offset-4"
                >
                  AI nástroje
                </button>
                .
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === 'ai' ? (
          <div className="rounded-3xl border border-white/10 bg-[#070b18] p-3 shadow-2xl shadow-black/40">
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
                    Kliknite na nástroj a otvorí sa na samostatnej karte.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('main')}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1] hover:text-white active:scale-95"
              >
                Späť
              </button>
            </div>

            {visibleModules.length > 0 ? (
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
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <p className="text-xs font-bold text-slate-400">
                  AI nástroje nie sú dostupné.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'module' ? (
          <div
            className={`rounded-3xl border border-violet-400/20 bg-[#070b18] shadow-2xl shadow-black/40 ${
              isModuleMenuVisible ? 'p-3' : 'p-2'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsModuleMenuVisible((value) => !value)}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white transition hover:bg-white/[0.1] active:scale-[0.98]"
                aria-expanded={isModuleMenuVisible}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/40">
                  {selectedMobileModule ? (
                    getModuleIcon(selectedMobileModule.key)
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-white">
                    {selectedMobileModuleLabel}
                  </span>

                  <span className="block truncate text-[10px] font-semibold text-slate-400">
                    {isModuleMenuVisible
                      ? 'Menu modulu je otvorené'
                      : 'Menu skryté — pracujte v module nižšie'}
                  </span>
                </span>

                {isModuleMenuVisible ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-slate-300" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" />
                )}
              </button>

              <button
                type="button"
                onClick={showWorkingPanelOnly}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-95"
                aria-label="Otvoriť pracovný panel modulu"
                title="Otvoriť pracovný panel"
              >
                <PlayCircle className="h-5 w-5" />
              </button>
            </div>

            {isModuleMenuVisible ? (
              <div className="mt-3">
                <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">
                    Otvorený modul
                  </p>

                  <h3 className="mt-1 text-lg font-black text-white">
                    {selectedMobileModuleLabel}
                  </h3>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    {selectedMobileModuleDescription}
                  </p>

                  <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold leading-5 text-cyan-100">
                    Kliknite na <span className="font-black">Skryť menu</span>.
                    Zostane iba pracovný panel modulu, kde môžete písať text,
                    vkladať podklady a pracovať s vybraným AI nástrojom.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white transition hover:bg-white/[0.1] active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Iný nástroj
                  </button>

                  <button
                    type="button"
                    onClick={showWorkingPanelOnly}
                    className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.98]"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Skryť menu
                  </button>
                </div>

                <button
                  type="button"
                  onClick={showWorkingPanelOnly}
                  className="mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-500/15 active:scale-[0.98]"
                >
                  <PlayCircle className="h-4 w-4" />
                  Prejsť do pracovného panelu modulu
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}