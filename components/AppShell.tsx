'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Bot,
  BookOpen,
  User,
  Library,
  CreditCard,
  Video,
  History,
  Settings,
  Plus,
  Sparkles,
  Bell,
  X,
} from 'lucide-react';

import ProfileFormOriginal from '@/components/ProfileForm';

// ================= TYPES =================

type NavItem = [string, string, LucideIcon];

type ProfileFormProps = {
  onClose?: () => void;
  onSave?: (data: unknown) => void;
};

const ProfileForm =
  ProfileFormOriginal as unknown as ComponentType<ProfileFormProps>;

// ================= NAVIGATION =================

const navItems: NavItem[] = [
  ['/dashboard', 'Dashboard', Home],
  ['/chat', 'AI Chat', Bot],
  ['/projects', 'Moje práce', BookOpen],
  ['/profile', 'Profil práce', User],
  ['/sources', 'Zdroje', Library],
  ['/pricing', 'Balíčky', CreditCard],
  ['/video', 'Video návod', Video],
  ['/history', 'História', History],
  ['/settings', 'Nastavenia', Settings],
];

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'AI Chat',
  '/projects': 'Moje práce',
  '/profile': 'Profil práce',
  '/sources': 'Zdroje',
  '/pricing': 'Balíčky',
  '/video': 'Video návod',
  '/history': 'História',
  '/settings': 'Nastavenia',
};

// ================= COMPONENT =================

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';

  const [openProfile, setOpenProfile] = useState(false);

  const isChatPage = pathname.startsWith('/chat');

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }

    return pathname.startsWith(path);
  };

  const title =
    Object.entries(titleMap).find(([key]) => pathname.startsWith(key))?.[1] ||
    'Zedpera';

  const openNewProfile = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('profile');
      localStorage.removeItem('active_profile');
    }

    setOpenProfile(true);
  };

  const closeProfile = () => {
    setOpenProfile(false);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#020617] text-white">
      {/* ================= SIDEBAR ================= */}

      <aside className="hidden h-dvh w-[300px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#020617] p-5 lg:flex">
        {/* LOGO */}

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-3 rounded-2xl p-1 text-left transition hover:bg-white/[0.04]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-700/25">
            <Sparkles className="text-white" size={21} />
          </div>

          <div>
            <div className="text-lg font-black leading-tight text-white">
              ZEDPERA
            </div>

            <div className="text-xs text-slate-400">AI vedúci práce</div>
          </div>
        </button>

        {/* NEW PROJECT */}

        <button
          type="button"
          onClick={openNewProfile}
          className="mb-6 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-black text-white shadow-lg shadow-violet-700/25 transition hover:scale-[1.015] hover:from-violet-500 hover:to-purple-500"
        >
          <Plus size={18} />
          Nová práca
        </button>

        {/* NAVIGATION */}

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {navItems.map(([path, label, Icon]) => {
            const active = isActive(path);

            return (
              <button
                type="button"
                key={path}
                onClick={() => router.push(path)}
                className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  active
                    ? 'bg-white/12 text-white shadow-lg shadow-black/15'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                </span>

                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* FOOTER */}

        <div className="shrink-0 pt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} Zedpera
        </div>
      </aside>

      {/* ================= CONTENT ================= */}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* HEADER - skrytý na /chat, aby chat okno nebolo nízko */}

        {!isChatPage && (
          <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 bg-[#020617]/90 px-5 backdrop-blur md:px-6">
            <div>
              <h1 className="text-xl font-black leading-tight text-white">
                {title}
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                AI platforma pre akademické písanie
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-2xl p-3 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Notifikácie"
              >
                <Bell size={20} />
              </button>
            </div>
          </header>
        )}

        {/* PAGE CONTENT */}

        <main
          className={
            isChatPage
              ? 'min-h-0 flex-1 overflow-hidden p-0'
              : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6'
          }
        >
          {children}
        </main>
      </div>

      {/* ================= MODAL ================= */}

      {openProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#020617]">
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