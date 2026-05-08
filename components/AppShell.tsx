'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
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
  ['/dashboard', 'Menu', Home],
  ['/chat', 'AI Chat', Bot],
  ['/projects', 'Moje práce', BookOpen],
  ['/sources', 'Zdroje', Library],
  ['/pricing', 'Balíčky', CreditCard],
  ['/video', 'Video návod', Video],
  ['/history', 'História', History],
  ['/settings', 'Nastavenia', Settings],
];

// ================= COMPONENT =================

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';

  const [openProfile, setOpenProfile] = useState(false);

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }

    return pathname.startsWith(path);
  };

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

      <aside className="hidden h-dvh w-[300px] shrink-0 flex-col border-r border-white/10 bg-[#020617] p-5 lg:flex">
        {/* LOGO ONLY */}

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex w-fit items-center rounded-2xl p-1 transition hover:bg-white/[0.04]"
          aria-label="Zedpera"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-700/25">
            <Sparkles className="text-white" size={22} />
          </div>
        </button>

        {/* NEW PROJECT */}

        <button
          type="button"
          onClick={openNewProfile}
          className="mb-8 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 font-black text-white shadow-lg shadow-violet-700/25 transition hover:scale-[1.015] hover:from-violet-500 hover:to-purple-500"
        >
          <Plus size={18} />
          Nová práca
        </button>

        {/* NAVIGATION */}

        <nav className="flex-1 space-y-2 overflow-hidden pr-0">
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
        {/* 
          Horný header je odstránený.
          Už sa tu nebude zobrazovať:
          Menu / Dashboard / Moje práce / Profil práce / Zdroje / Balíčky / História / Nastavenia
          ani text: AI platforma pre akademické písanie.
        */}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* ================= MODAL - NOVÁ PRÁCA ================= */}

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