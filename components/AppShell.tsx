'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CreditCard,
  Crown,
  FileText,
  History,
  Home,
  Languages,
  Library,
  LogOut,
  Mail,
  Menu,
  Presentation,
  Sparkles,
  UserCircle,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

// =====================================================
// TYPES
// =====================================================

type NavItem = {
  href: string;
  activePath: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  action?: 'client-profile' | 'projects-list';
};

type AiSectionItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

type TranslationRecord = Record<string, unknown>;

// =====================================================
// ROUTES
// =====================================================

const PROFILE_PAGE_PATH = '/profile';
const PROFILE_CLIENT_ACCOUNT_HREF = '/profile?tab=account';

const PROJECTS_PAGE_PATH = '/projects';
const PROJECTS_LIST_HREF = '/projects?view=list';

// =====================================================
// TRANSLATION HELPERS
// =====================================================

function text(
  dictionary: TranslationRecord,
  key: string,
  fallback: string,
): string {
  const value = dictionary[key];

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

// =====================================================
// MAIN MENU ITEMS
// =====================================================

function createNavItems(dictionary: TranslationRecord): NavItem[] {
  return [
    {
      href: '/dashboard',
      activePath: '/dashboard',
      label: text(dictionary, 'dashboardMenu', 'Menu'),
      icon: Home,
      description: text(
        dictionary,
        'dashboardMenuDescription',
        'Hlavný prehľad aplikácie',
      ),
    },
    {
      href: PROFILE_CLIENT_ACCOUNT_HREF,
      activePath: PROFILE_PAGE_PATH,
      label: text(dictionary, 'clientProfile', 'Profil'),
      icon: UserCircle,
      description: text(
        dictionary,
        'clientProfileDescription',
        'Účet klienta, balíček a nastavenia služieb',
      ),
      action: 'client-profile',
    },
    {
      href: '/chat',
      activePath: '/chat',
      label: text(dictionary, 'aiChat', 'AI Chat'),
      icon: Bot,
      description: text(
        dictionary,
        'dashboardChatDescription',
        'Písanie a úprava textu',
      ),
    },
    {
      href: PROJECTS_LIST_HREF,
      activePath: PROJECTS_PAGE_PATH,
      label: text(dictionary, 'dashboardProjects', 'Moje práce'),
      icon: BookOpen,
      description: text(
        dictionary,
        'dashboardProjectsDescription',
        'Zoznam rozpracovaných prác',
      ),
      action: 'projects-list',
    },
    {
      href: '/sources',
      activePath: '/sources',
      label: text(dictionary, 'sources', 'Zdroje'),
      icon: Library,
      description: text(
        dictionary,
        'dashboardSourcesDescription',
        'Literatúra a citácie',
      ),
    },
    {
      href: '/pricing',
      activePath: '/pricing',
      label: text(dictionary, 'pricing', 'Balíčky'),
      icon: CreditCard,
      description: text(
        dictionary,
        'dashboardPricingDescription',
        'Predplatné a doplnky',
      ),
    },
    {
      href: '/history',
      activePath: '/history',
      label: text(dictionary, 'chatHistory', 'História chatu'),
      icon: History,
      description: text(
        dictionary,
        'dashboardHistoryDescription',
        'Uložené konverzácie a výstupy',
      ),
    },
    {
      href: '/videos',
      activePath: '/videos',
      label: text(dictionary, 'dashboardVideo', 'Video návod'),
      icon: Video,
      description: text(
        dictionary,
        'dashboardVideoDescription',
        'Postup používania',
      ),
    },
  ];
}

// =====================================================
// MOBILE TOP AI SECTIONS
// =====================================================

function createAiSectionItems(dictionary: TranslationRecord): AiSectionItem[] {
  return [
    {
      key: 'supervisor',
      label: text(dictionary, 'aiSupervisor', 'AI školiteľ'),
      icon: Brain,
    },
    {
      key: 'quality',
      label: text(dictionary, 'qualityAudit', 'Audit kvality'),
      icon: Sparkles,
    },
    {
      key: 'defense',
      label: text(dictionary, 'defense', 'Obhajoba'),
      icon: Presentation,
    },
    {
      key: 'translation',
      label: text(dictionary, 'translation', 'Preklad'),
      icon: Languages,
    },
    {
      key: 'data',
      label: text(dictionary, 'dataAnalysis', 'Analýza dát'),
      icon: BarChart3,
    },
    {
      key: 'planning',
      label: text(dictionary, 'planning', 'Plánovanie'),
      icon: FileText,
    },
    {
      key: 'emails',
      label: text(dictionary, 'emails', 'Emaily'),
      icon: Mail,
    },
    {
      key: 'humanizer',
      label: text(dictionary, 'textHumanization', 'Humanizácia textu'),
      icon: Wand2,
    },
  ];
}


const VALID_DASHBOARD_MODULE_KEYS = [
  'supervisor',
  'quality',
  'defense',
  'translation',
  'data',
  'planning',
  'emails',
  'humanizer',
] as const;

type DashboardModuleKey =
  (typeof VALID_DASHBOARD_MODULE_KEYS)[number];

function normalizeDashboardModuleKey(
  value: string | null | undefined,
): DashboardModuleKey | null {
  if (!value) return null;

  if (value === 'coach') return 'supervisor';
  if (value === 'audit') return 'quality';

  return VALID_DASHBOARD_MODULE_KEYS.includes(
    value as DashboardModuleKey,
  )
    ? (value as DashboardModuleKey)
    : null;
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}

// =====================================================
// FALLBACK
// =====================================================

function AppShellFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#020617] text-white">
      <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm font-bold text-slate-300">
        Načítavam aplikáciu...
      </div>
    </div>
  );
}

// =====================================================
// COMPONENT CONTENT
// =====================================================

function AppShellContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const { t } = useLanguage();
  const dictionary = t as TranslationRecord;

  const navItems = useMemo(() => {
    return createNavItems(dictionary);
  }, [dictionary]);

  const aiSectionItems = useMemo(() => {
    return createAiSectionItems(dictionary);
  }, [dictionary]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminFree, setIsAdminFree] = useState(false);
  const [activeAiSection, setActiveAiSection] =
  useState<DashboardModuleKey>('supervisor');

  useEffect(() => {
  if (typeof window === 'undefined') return;

  const moduleFromUrl = normalizeDashboardModuleKey(
    searchParams?.get('module'),
  );

  const moduleFromStorage = normalizeDashboardModuleKey(
    localStorage.getItem('zedpera_active_dashboard_module'),
  );

  const nextModule =
    moduleFromUrl || moduleFromStorage || 'supervisor';

  setActiveAiSection(nextModule);
  localStorage.setItem(
    'zedpera_active_dashboard_module',
    nextModule,
  );
}, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mode = searchParams?.get('mode');
    const storedAdminMode = localStorage.getItem('zedpera_admin_free');

    if (mode === 'admin-free') {
      localStorage.setItem('zedpera_admin_free', 'true');
      localStorage.setItem('zedpera_selected_plan', 'admin-free');
      localStorage.setItem('zedpera_user_plan', 'admin-free');
      localStorage.setItem('zedpera_user_role', 'admin');
      localStorage.setItem('zedpera_is_logged_in', 'true');

      if (!localStorage.getItem('zedpera_user_name')) {
        localStorage.setItem('zedpera_user_name', 'Admin');
      }

      if (!localStorage.getItem('zedpera_user_email')) {
        localStorage.setItem('zedpera_user_email', 'admin@zedpera.com');
      }

      setIsAdminFree(true);
      return;
    }

    if (storedAdminMode === 'true') {
      localStorage.setItem('zedpera_user_role', 'admin');
      localStorage.setItem('zedpera_user_plan', 'admin-free');
      localStorage.setItem('zedpera_selected_plan', 'admin-free');
      setIsAdminFree(true);
      return;
    }

    setIsAdminFree(false);
  }, [searchParams]);

  const activeTitle = useMemo(() => {
    const active = navItems.find((item) =>
      isPathActive(pathname, item.activePath),
    );

    return active?.label || 'Zedpera';
  }, [navItems, pathname]);

  const activeDescription = useMemo(() => {
    const active = navItems.find((item) =>
      isPathActive(pathname, item.activePath),
    );

    return (
      active?.description ||
      text(dictionary, 'publicHeroTitle', 'AI akademická platforma')
    );
  }, [dictionary, navItems, pathname]);

  const isDashboard = pathname === '/dashboard';

  function goTo(href: string) {
    setMobileMenuOpen(false);
    router.push(href);
  }

  function goToClientAccountProfile() {
    setMobileMenuOpen(false);
    router.push(PROFILE_CLIENT_ACCOUNT_HREF);
  }

  function goToProjectsList() {
    setMobileMenuOpen(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('zedpera_new_project_mode');
      localStorage.removeItem('zedpera_open_identity');
      localStorage.removeItem('zedpera_open_project_identity');
      localStorage.removeItem('zedpera_continue_project_identity');
      localStorage.removeItem('zedpera_last_project_identity');
      localStorage.removeItem('zedpera_selected_project_identity');
    }

    router.push(PROJECTS_LIST_HREF);
  }

  function handleNavItemClick(item: NavItem) {
    if (item.action === 'client-profile') {
      goToClientAccountProfile();
      return;
    }

    if (item.action === 'projects-list') {
      goToProjectsList();
      return;
    }

    goTo(item.href);
  }

  function handleAiSectionClick(moduleKey: string) {
  const normalizedModuleKey =
    normalizeDashboardModuleKey(moduleKey) || 'supervisor';

  setActiveAiSection(normalizedModuleKey);

  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'zedpera_active_dashboard_module',
      normalizedModuleKey,
    );

    window.dispatchEvent(
      new CustomEvent('zedpera-dashboard-module-change', {
        detail: {
          moduleKey: normalizedModuleKey,
        },
      }),
    );
  }

  router.push(
    `/dashboard?module=${encodeURIComponent(normalizedModuleKey)}`,
  );
}

  function logoutAdminMode() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zedpera_admin_free');
      localStorage.removeItem('zedpera_selected_plan');
      localStorage.removeItem('zedpera_user_plan');
      localStorage.removeItem('zedpera_user_role');
    }

    setIsAdminFree(false);
    router.push('/');
  }

  function logoutUser() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zedpera_is_logged_in');
      localStorage.removeItem('zedpera_user_role');
      localStorage.removeItem('zedpera_user_plan');
      localStorage.removeItem('zedpera_selected_plan');
      localStorage.removeItem('zedpera_admin_free');
    }

    setIsAdminFree(false);
    setMobileMenuOpen(false);
    router.push('/');
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#020617] text-white">
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="hidden h-dvh w-[306px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#020617] p-5 lg:flex">
        <nav className="flex-1 space-y-2 overflow-visible pr-0">
          {navItems.map((item) => {
            const active = isPathActive(pathname, item.activePath);
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.href}
                onClick={() => handleNavItemClick(item)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? 'bg-white/12 text-white shadow-lg shadow-black/15'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                </span>

                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>

                  {item.description && (
                    <span
                      className={`mt-0.5 block truncate text-[11px] font-semibold ${
                        active ? 'text-white/55' : 'text-slate-500'
                      }`}
                    >
                      {item.description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 pt-4">
          {isAdminFree && (
            <div className="mb-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-3 text-sm font-black text-emerald-200">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Crown size={17} />
                </span>

                <span>
                  <span className="block">
                    {text(dictionary, 'adminAccount', 'Admin účet')}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-emerald-300/80">
                    {text(
                      dictionary,
                      'adminAccess',
                      'Administrátorský prístup',
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}

          {isAdminFree ? (
            <button
              type="button"
              onClick={logoutAdminMode}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                <LogOut size={17} />
              </span>
              {text(dictionary, 'exitAdminMode', 'Ukončiť admin režim')}
            </button>
          ) : (
            <button
              type="button"
              onClick={logoutUser}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                <LogOut size={17} />
              </span>
              {text(dictionary, 'logout', 'Odhlásiť sa')}
            </button>
          )}

          <div className="px-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Zedpera
          </div>
        </div>
      </aside>

      {/* =====================================================
          CONTENT AREA
      ===================================================== */}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-24 lg:pb-6 lg:pt-6">
          {!isDashboard && (
            <div className="sticky top-0 z-30 mb-5 rounded-3xl border border-white/10 bg-[#020617]/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                    {text(dictionary, 'currentSection', 'Aktuálna sekcia')}
                  </div>

                  <div className="mt-1 truncate text-xl font-black text-white">
                    {activeTitle}
                  </div>

                  <div className="mt-0.5 text-sm text-slate-400">
                    {activeDescription}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goTo('/dashboard')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
                >
                  <ArrowLeft size={18} />
                  {text(dictionary, 'backToMenu', 'Návrat do menu')}
                </button>
              </div>
            </div>
          )}

          {children}
        </main>

        {/* =====================================================
            MOBILE BOTTOM MAIN MENU
        ===================================================== */}

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#020617]/95 px-2 py-2 backdrop-blur lg:hidden">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.activePath);
                const Icon = item.icon;

                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => handleNavItemClick(item)}
                    className={`flex h-[58px] min-w-[76px] flex-col items-center justify-center rounded-2xl px-3 text-[10px] font-black transition ${
                      active
                        ? 'bg-white/12 text-white shadow-lg shadow-black/20'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="mt-1 max-w-[70px] truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* =====================================================
          MOBILE FULL MENU
      ===================================================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 lg:hidden">
          <div className="min-h-dvh w-full bg-[#020617] p-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-700/25">
                  <Sparkles className="text-white" size={20} />
                </div>

                <div>
                  <div className="font-black">ZEDPERA</div>
                  <div className="text-xs font-semibold text-slate-400">
                    {text(
                      dictionary,
                      'academicAssistant',
                      'AI akademický asistent',
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl bg-white/10 p-3 text-slate-300 transition hover:bg-white/20 hover:text-white"
                aria-label={text(dictionary, 'closeMenu', 'Zavrieť menu')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                AI sekcie
              </div>

              <div className="grid grid-cols-2 gap-2">
                {aiSectionItems.map((item) => {
                  const active = activeAiSection === item.key && isDashboard;
                  const Icon = item.icon;

                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleAiSectionClick(item.key);
                      }}
                      className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                        active
                          ? 'bg-violet-600 text-white'
                          : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white'
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                Hlavné menu
              </div>

              <div className="grid grid-cols-1 gap-2">
                {navItems.map((item) => {
                  const active = isPathActive(pathname, item.activePath);
                  const Icon = item.icon;

                  return (
                    <button
                      type="button"
                      key={item.href}
                      onClick={() => handleNavItemClick(item)}
                      className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                        active
                          ? 'bg-white/12 text-white'
                          : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                        <Icon size={18} />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate">{item.label}</span>

                        {item.description && (
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-4">
              {isAdminFree ? (
                <>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm font-black text-emerald-200">
                    <div className="flex items-center justify-center gap-2">
                      <Crown size={18} />
                      {text(dictionary, 'adminAccount', 'Admin účet')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logoutAdminMode}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm font-black text-rose-200"
                  >
                    <LogOut size={18} />
                    {text(dictionary, 'exitAdminMode', 'Ukončiť admin režim')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={logoutUser}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm font-black text-rose-200"
                >
                  <LogOut size={18} />
                  {text(dictionary, 'logout', 'Odhlásiť sa')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function isPathActive(pathname: string, activePath: string) {
  if (activePath === '/dashboard') {
    return pathname === '/dashboard';
  }

  if (activePath === PROFILE_PAGE_PATH) {
    return pathname === PROFILE_PAGE_PATH || pathname.startsWith('/profile/');
  }

  if (activePath === PROJECTS_PAGE_PATH) {
    return pathname === PROJECTS_PAGE_PATH || pathname.startsWith('/projects/');
  }

  return pathname === activePath || pathname.startsWith(`${activePath}/`);
}