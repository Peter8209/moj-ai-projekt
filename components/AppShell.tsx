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
  BookOpen,
  Bot,
  CreditCard,
  Crown,
  History,
  Home,
  Library,
  LogOut,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

// =====================================================
// TYPES
// =====================================================

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

type TranslationRecord = Record<string, unknown>;

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

function createNavItems(dictionary: TranslationRecord): NavItem[] {
  return [
    {
      href: '/dashboard',
      label: text(dictionary, 'dashboardMenu', 'Menu'),
      icon: Home,
      description: text(
        dictionary,
        'dashboardMenuDescription',
        'Hlavný prehľad aplikácie',
      ),
    },
    {
      href: '/chat',
      label: text(dictionary, 'aiChat', 'AI Chat'),
      icon: Bot,
      description: text(
        dictionary,
        'dashboardChatDescription',
        'Písanie a úprava textu',
      ),
    },
    {
      href: '/projects',
      label: text(dictionary, 'dashboardProjects', 'Moje práce'),
      icon: BookOpen,
      description: text(
        dictionary,
        'dashboardProjectsDescription',
        'Rozpracované projekty',
      ),
    },
    {
      href: '/sources',
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
  label: text(dictionary, 'chatHistory', 'História chatu'),
  icon: History,
  description: text(
    dictionary,
    'dashboardHistoryDescription',
    'Uložené konverzácie a výstupy',
  ),
},
    {
      href: '/video',
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

  const mobileNavItems = useMemo(() => {
    return navItems.slice(0, 5);
  }, [navItems]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminFree, setIsAdminFree] = useState(false);

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
    const active = navItems.find((item) => isPathActive(pathname, item.href));
    return active?.label || 'Zedpera';
  }, [navItems, pathname]);

  const activeDescription = useMemo(() => {
    const active = navItems.find((item) => isPathActive(pathname, item.href));
    return (
      active?.description ||
      text(dictionary, 'publicHeroTitle', 'AI akademická platforma')
    );
  }, [dictionary, navItems, pathname]);

  const isDashboard = pathname === '/dashboard';

  const goTo = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };


  const logoutAdminMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zedpera_admin_free');
      localStorage.removeItem('zedpera_selected_plan');
      localStorage.removeItem('zedpera_user_plan');
      localStorage.removeItem('zedpera_user_role');
    }

    setIsAdminFree(false);
    router.push('/');
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#020617] text-white">
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="hidden h-dvh w-[306px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#020617] p-5 lg:flex">
        <nav className="flex-1 space-y-2 overflow-visible pr-0">
          {navItems.map((item) => {
            const active = isPathActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <button
                type="button"
                key={item.href}
                onClick={() => goTo(item.href)}
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

          {isAdminFree && (
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
        {/* MOBILE TOP BAR */}

     <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-[#020617]/95 px-4 py-4 backdrop-blur lg:hidden">
  <div className="flex items-center gap-3">
    <div className="min-w-0">
      <div className="truncate text-sm font-black">{activeTitle}</div>
      <div className="truncate text-[11px] font-semibold text-slate-400">
        {activeDescription}
      </div>
    </div>
  </div>

  <div className="flex flex-wrap gap-2">
    {navItems.map((item) => {
      const active = isPathActive(pathname, item.href);
      const Icon = item.icon;

      return (
        <button
          type="button"
          key={item.href}
          onClick={() => goTo(item.href)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-black transition ${
            active
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-700/25'
              : 'border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white'
          }`}
        >
          <Icon size={15} />
          {item.label}
        </button>
      );
    })}
  </div>
</header>

        {/* MAIN CONTENT */}

       <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] p-3 pb-28 sm:p-4 md:p-6 lg:pb-6">
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

        {/* MOBILE BOTTOM NAV */}

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#020617]/95 px-2 py-2 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 gap-1">
            {mobileNavItems.map((item) => {
              const active = isPathActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.href}
                  onClick={() => goTo(item.href)}
                  className={`flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
                    active
                      ? 'bg-white/12 text-white'
                      : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="mt-1 max-w-full truncate">
                    {item.label}
                  </span>
                </button>
              );
            })}
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

           <div className="grid grid-cols-1 gap-2 pb-6">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => goTo(item.href)}
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

            
            {isAdminFree && (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm font-black text-emerald-200">
                <div className="flex items-center justify-center gap-2">
                  <Crown size={18} />
                  {text(dictionary, 'adminAccount', 'Admin účet')}
                </div>
              </div>
            )}

            {isAdminFree && (
              <button
                type="button"
                onClick={logoutAdminMode}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm font-black text-rose-200"
              >
                <LogOut size={18} />
                {text(dictionary, 'exitAdminMode', 'Ukončiť admin režim')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

function isPathActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}