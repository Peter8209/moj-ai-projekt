'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText, Library, GraduationCap, FileCheck2,
  Presentation, Languages, BarChart3,
  CalendarDays, Mail, ShieldCheck, Sparkles
} from 'lucide-react';

// ================= TYPES =================
type Mode =
  | 'write'
  | 'sources'
  | 'supervisor'
  | 'defense'
  | 'audit'
  | 'translate'
  | 'analysis'
  | 'planning'
  | 'email'
  | 'plagiarism';

type View =
  | 'dashboard'
  | 'chat'
  | 'projects'
  | 'profile'
  | 'sources'
  | 'pricing'
  | 'video'
  | 'history'
  | 'settings';

// ================= FEATURE CARDS =================
const featureCards = [
  { mode: 'write', title: 'AI písanie práce', icon: FileText },
  { mode: 'sources', title: 'Zdroje', icon: Library },
  { mode: 'supervisor', title: 'AI vedúci', icon: GraduationCap },
  { mode: 'audit', title: 'Audit kvality', icon: FileCheck2 },
  { mode: 'defense', title: 'Obhajoba', icon: Presentation },
  { mode: 'translate', title: 'Preklad', icon: Languages },
  { mode: 'analysis', title: 'Analýza dát', icon: BarChart3 },
  { mode: 'planning', title: 'Plánovanie', icon: CalendarDays },
  { mode: 'email', title: 'Emaily', icon: Mail },
  { mode: 'plagiarism', title: 'Plagiátorstvo', icon: ShieldCheck },
];

// ================= WRAPPER =================
export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
      <DashboardPage />
    </Suspense>
  );
}

// ================= MAIN =================
function DashboardPage() {
  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success")) {
      document.cookie = "sub_active=1; path=/";
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex bg-[#020617] text-white">

      <Sidebar view={view} setView={setView} />

      <main className="flex-1 flex flex-col">
        <Header view={view} />

        <div className="flex-1 p-8">
          {view === 'dashboard' && (
            <Dashboard setView={setView} setMode={setMode} />
          )}
          {view === 'chat' && <Chat mode={mode} />}
        </div>
      </main>
    </div>
  );
}

// ================= SIDEBAR =================
function Sidebar({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'chat', label: 'AI Chat' },
  ];

  return (
    <aside className="w-64 bg-[#020617] border-r border-white/10 p-4 flex flex-col">

      {/* LOGO */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="text-purple-400" />
        <span className="font-bold text-lg">ZEDPERA</span>
      </div>

      {/* NAV */}
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={`w-full text-left px-3 py-2 rounded-lg transition 
              ${view === item.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-auto pt-6">
        <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-2 rounded-lg font-medium hover:opacity-90 transition">
          + Nová práca
        </button>
      </div>

    </aside>
  );
}

// ================= HEADER =================
function Header({ view }: { view: View }) {
  return (
    <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#020617]/80 backdrop-blur">

      <h1 className="text-lg font-semibold capitalize">
        {view === 'dashboard' ? 'Dashboard' : 'AI Chat'}
      </h1>

      <div className="text-sm text-gray-400">
        AI platforma pre akademické písanie
      </div>

    </div>
  );
}

// ================= DASHBOARD =================
function Dashboard({
  setView,
  setMode,
}: {
  setView: (v: View) => void;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="max-w-6xl">

      {/* HERO */}
      <div className="mb-10">
        <h2 className="text-4xl font-bold mb-3">
          Zisti čo je zlé na tvojej práci skôr než vedúci
        </h2>
        <p className="text-gray-400">
          Kompletný AI systém pre písanie, analýzu a obhajobu práce
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">

        {featureCards.map((f) => {
          const Icon = f.icon;

          return (
            <button
              key={f.mode}
              onClick={() => {
                setMode(f.mode);
                setView('chat');
              }}
              className="group bg-white/5 border border-white/10 rounded-xl p-5 text-left hover:bg-white/10 transition"
            >
              <Icon className="mb-4 text-purple-400 group-hover:scale-110 transition" />

              <div className="font-medium">
                {f.title}
              </div>

              <div className="text-xs text-gray-400 mt-1">
                Spustiť modul
              </div>
            </button>
          );
        })}

      </div>

    </div>
  );
}

// ================= CHAT =================
function Chat({ mode }: { mode: Mode }) {
  return (
    <div className="max-w-4xl">

      <h2 className="text-2xl font-semibold mb-4">
        AI Chat – {mode}
      </h2>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">

        <textarea
          className="w-full p-3 bg-transparent outline-none resize-none"
          rows={4}
          placeholder="Napíš otázku..."
        />

        <div className="flex justify-end mt-3">
          <button className="bg-purple-600 px-4 py-2 rounded-lg hover:opacity-90 transition">
            Odoslať
          </button>
        </div>

      </div>

    </div>
  );
}