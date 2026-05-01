'use client';

import { useRouter, usePathname } from "next/navigation";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ================= TYPES =================
type NavItem = [string, string, LucideIcon];

// ================= COMPONENT =================
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";

  // 🔥 FIX: správne typovanie
  const items: NavItem[] = [
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

  const isActive = (path: string) => pathname.startsWith(path);

  // 🔥 FIX: typovanie + jednoduchšia logika
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

  const title =
    Object.entries(titleMap).find(([key]) =>
      pathname.startsWith(key)
    )?.[1] || "Zedpera";

  return (
    <div className="flex min-h-screen">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-72 border-r border-white/10 bg-[#020617] p-5 flex flex-col">

        {/* LOGO */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <div className="font-black text-white">ZEDPERA</div>
            <div className="text-xs text-gray-400">AI vedúci práce</div>
          </div>
        </div>

        {/* NEW PROJECT */}
        <button
          onClick={() => router.push('/profile')}
          className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-bold hover:bg-violet-700 transition"
        >
          <Plus size={16} /> Nová práca
        </button>

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-2">
          {items.map(([path, label, Icon]) => (
            <button
              key={path} // ✅ už je string → OK
              onClick={() => router.push(path)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                isActive(path)
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="mt-auto text-xs text-gray-500">
          © {new Date().getFullYear()} Zedpera
        </div>
      </aside>

      {/* ================= CONTENT ================= */}
      <div className="flex flex-1 flex-col">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-white/10 bg-[#020617]/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-gray-400">
              AI platforma pre akademické písanie
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-white">
              <Bell size={20} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}