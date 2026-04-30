'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Library,
  GraduationCap,
  FileCheck2,
  Presentation,
  Languages,
  BarChart3,
  CalendarDays,
  Mail,
  ShieldCheck,
  Sparkles,
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

// ================= MAIN =================
export default function Page() {
  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success")) {
      document.cookie = "sub_active=1; path=/";
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-[#020617] text-white">

      <Sidebar view={view} setView={setView} />

      <main className="flex-1">
        <Header view={view} />

        <div className="p-6">
          {view === 'dashboard' && <Dashboard setView={setView} setMode={setMode} />}
          {view === 'chat' && <Chat />}
        </div>
      </main>
    </div>
  );
}

// ================= SIDEBAR =================
function Sidebar({ view, setView }: any) {
  return (
    <aside className="w-64 bg-black/40 p-4 space-y-3">

      <div className="flex gap-2 items-center">
        <Sparkles /> <b>ZEDPERA</b>
      </div>

      {[
        ['dashboard', 'Dashboard'],
        ['chat', 'AI Chat'],
      ].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)}>
          {label}
        </button>
      ))}

    </aside>
  );
}

// ================= HEADER =================
function Header({ view }: any) {
  return (
    <div className="p-4 border-b border-white/10">
      <h1>{view.toUpperCase()}</h1>
    </div>
  );
}

// ================= DASHBOARD =================
function Dashboard({ setView, setMode }: any) {
  return (
    <div>
      <h2 className="text-3xl mb-4">
        Zisti čo je zlé na tvojej práci skôr než vedúci
      </h2>

      <div className="grid gap-3 mt-5">
        {featureCards.map((f: any) => (
          <button
            key={f.mode}
            onClick={() => {
              setMode(f.mode);
              setView('chat');
            }}
          >
            {f.title}
          </button>
        ))}
      </div>
    </div>
  );
}

