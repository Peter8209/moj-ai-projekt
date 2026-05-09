'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Bot,
  BookOpen,
  Library,
  CreditCard,
  Video,
  History,
  Settings,
  Plus,
  Sparkles,
  X,
  ShieldCheck,
  User,
  LogOut,
  Menu,
} from 'lucide-react';

import ProfileFormOriginal from '@/components/ProfileForm';

// =====================================================
// TYPES
// =====================================================

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

type ProfileFormProps = {
  onClose?: () => void;
  onSave?: (data: unknown) => void;
};

const ProfileForm =
  ProfileFormOriginal as unknown as ComponentType<ProfileFormProps>;

// =====================================================
// NAVIGATION
// =====================================================

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Menu',
    icon: Home,
    description: 'Hlavný prehľad aplikácie',
  },
  {
    href: '/chat',
    label: 'AI Chat',
    icon: Bot,
    description: 'Písanie a úprava textu',
  },
  {
    href: '/projects',
    label: 'Moje práce',
    icon: BookOpen,
    description: 'Rozpracované projekty',
  },
  {
    href: '/sources',
    label: 'Zdroje',
    icon: Library,
    description: 'Literatúra a citácie',
  },
  {
    href: '/pricing',
    label: 'Balíčky',
    icon: CreditCard,
    description: 'Predplatné a doplnky',
  },
  {
    href: '/video',
    label: 'Video návod',
    icon: Video,
    description: 'Postup používania',
  },
  {
    href: '/history',
    label: 'História',
    icon: History,
    description: 'Uložené výstupy',
  },
  {
    href: '/settings',
    label: 'Nastavenia',
    icon: Settings,
    description: 'Účet a systém',
  },
];

const mobileNavItems = navItems.slice(0, 5);

// =====================================================
// COMPONENT
// =====================================================

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const [openProfile, setOpenProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminFree, setIsAdminFree] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mode = searchParams?.get('mode');
    const storedAdminMode = localStorage.getItem('zedpera_admin_free');

    if (mode === 'admin-free') {
      localStorage.setItem('zedpera_admin_free', 'true');
      localStorage.setItem('zedpera_selected_plan', 'admin-free');
      setIsAdminFree(true);
      return;
    }

    setIsAdminFree(storedAdminMode === 'true');
  }, [searchParams]);

  const activeTitle = useMemo(() => {
    const active = navItems.find((item) => isPathActive(pathname, item.href));
    return active?.label || 'Zedpera';
  }, [pathname]);

  const activeDescription = useMemo(() => {
    const active = navItems.find((item) => isPathActive(pathname, item.href));
    return active?.description || 'AI akademická platforma';
  }, [pathname]);

  const goTo = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };

  const openNewProfile = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profile');
      localStorage.removeItem('active_profile');
    }

    setMobileMenuOpen(false);
    setOpenProfile(true);
  };

  const closeProfile = () => {
    setOpenProfile(false);
  };

  const logoutAdminMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zedpera_admin_free');
      localStorage.removeItem('zedpera_selected_plan');
    }

    setIsAdminFree(false);
    router.push('/');
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#020617] text-white">
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="hidden h-dvh w-[306px] shrink-0 flex-col border-r border-white/10 bg-[#020617] p-5 lg:flex">
        {/* LOGO */}

        <button
          type="button"
          onClick={() => goTo('/dashboard')}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/[0.04]"
          aria-label="Zedpera dashboard"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-700/25">
            <Sparkles className="text-white" size={22} />
          </div>

          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight">
              ZEDPERA
            </div>
            <div className="truncate text-xs font-semibold text-slate-400">
              AI akademický asistent
            </div>
          </div>
        </button>

        {/* ADMIN BADGE */}

        {isAdminFree && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
              <ShieldCheck size={17} />
              Admin Free režim
            </div>

            <p className="mt-2 text-xs leading-5 text-emerald-100/70">
              Máš zapnutý administrátorský vstup bez platby. Tento režim
              používaj iba pre vlastný účet.
            </p>
          </div>
        )}

        {/* NEW PROJECT */}

        <button
          type="button"
          onClick={openNewProfile}
          className="mb-7 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-black text-white shadow-lg shadow-violet-700/25 transition hover:scale-[1.015] hover:from-violet-500 hover:to-purple-500"
        >
          <Plus size={18} />
          Nová práca
        </button>

        {/* NAVIGATION */}

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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

        {/* SIDEBAR FOOTER */}

        <div className="shrink-0 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => goTo('/settings')}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
              <User size={17} />
            </span>
            Môj účet
          </button>

          {isAdminFree && (
            <button
              type="button"
              onClick={logoutAdminMode}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                <LogOut size={17} />
              </span>
              Ukončiť admin režim
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

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* MOBILE TOP BAR */}

        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#020617]/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-2xl bg-white/10 p-3 text-white transition hover:bg-white/15"
            aria-label="Otvoriť menu"
          >
            <Menu size={20} />
          </button>

          <div className="text-center">
            <div className="text-sm font-black">{activeTitle}</div>
            <div className="text-[11px] font-semibold text-slate-400">
              {activeDescription}
            </div>
          </div>

          <button
            type="button"
            onClick={openNewProfile}
            className="rounded-2xl bg-violet-600 p-3 text-white shadow-lg shadow-violet-700/25 transition hover:bg-violet-500"
            aria-label="Nová práca"
          >
            <Plus size={20} />
          </button>
        </header>

        {/* MAIN CONTENT */}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] p-4 pb-24 md:p-6 lg:pb-6">
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
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <div className="flex h-full w-full flex-col bg-[#020617] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-700/25">
                  <Sparkles className="text-white" size={20} />
                </div>

                <div>
                  <div className="font-black">ZEDPERA</div>
                  <div className="text-xs font-semibold text-slate-400">
                    AI akademický asistent
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl bg-white/10 p-3 text-slate-300 transition hover:bg-white/20 hover:text-white"
                aria-label="Zavrieť menu"
              >
                <X size={20} />
              </button>
            </div>

            {isAdminFree && (
              <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
                  <ShieldCheck size={17} />
                  Admin Free režim
                </div>

                <p className="mt-2 text-xs leading-5 text-emerald-100/70">
                  Administrátorský vstup je aktívny.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={openNewProfile}
              className="mb-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-black text-white shadow-lg shadow-violet-700/25"
            >
              <Plus size={18} />
              Nová práca
            </button>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <button
                    type="button"
                    key={item.href}
                    onClick={() => goTo(item.href)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-sm font-bold transition ${
                      active
                        ? 'bg-white/12 text-white'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                      <Icon size={18} />
                    </span>

                    <span>
                      <span className="block">{item.label}</span>
                      {item.description && (
                        <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                          {item.description}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {isAdminFree && (
              <button
                type="button"
                onClick={logoutAdminMode}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm font-black text-rose-200"
              >
                <LogOut size={18} />
                Ukončiť admin režim
              </button>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL - NOVÁ PRÁCA
      ===================================================== */}

      {openProfile && (
        <div className="fixed inset-0 z-[70] overflow-hidden bg-[#020617]">
          <div className="relative mx-auto flex h-dvh w-full max-w-[1500px] flex-col overflow-hidden p-4 md:p-6">
            <button
              type="button"
              onClick={closeProfile}
              className="fixed right-5 top-5 z-50 rounded-2xl bg-white/10 p-3 text-slate-300 shadow-lg shadow-black/30 transition hover:bg-white/20 hover:text-white"
              aria-label="Zavrieť formulár"
            >
              <X size={22} />
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ProfileForm onClose={closeProfile} />
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

function isPathActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}