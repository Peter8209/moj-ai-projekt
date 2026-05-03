'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText, Library, GraduationCap, FileCheck2,
  Presentation, Languages, BarChart3,
  CalendarDays, Mail, ShieldCheck, Sparkles,
  Crown, X
} from 'lucide-react';

import ProfileForm from '@/components/ProfileForm';

// ================= TYPES =================

type View = 'dashboard' | 'chat';

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
] as const;

type Mode = typeof featureCards[number]['mode'];

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
  const [subActive, setSubActive] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (document.cookie.includes('sub_active=1')) {
      setSubActive(true);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("success")) {
      document.cookie = "sub_active=1; path=/";
      setSubActive(true);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex bg-[#020617] text-white">

      <Sidebar
        setView={setView}
        subActive={subActive}
        openForm={() => {
          console.log('OPEN MODAL'); // DEBUG
          setShowProfileForm(true);
        }}
      />

      <main className="flex-1 flex flex-col">
        <Header view={view} subActive={subActive} />

        <div className="flex-1 p-8">
          {view === 'dashboard' && (
            <Dashboard setView={setView} setMode={setMode} />
          )}
          {view === 'chat' && <Chat mode={mode} />}
        </div>
      </main>

      {/* ================= MODAL ================= */}
      {showProfileForm && (
        <div className="fixed inset-0 z-[9999]">

          {/* BACKDROP */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowProfileForm(false)}
          />

          {/* CONTENT */}
          <div className="absolute inset-0 flex items-center justify-center p-4">

            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#020617] w-full max-w-4xl rounded-xl p-6 border border-white/10 relative"
            >

              <button
                onClick={() => setShowProfileForm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X />
              </button>

              <h2 className="text-2xl font-bold mb-6">
                Nová práca
              </h2>

              <ProfileForm
                onSave={(data) => {
                  console.log('ULOŽENÉ:', data);
                  setShowProfileForm(false);
                }}
              />

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= SIDEBAR =================

function Sidebar({
  setView,
  subActive,
  openForm
}: {
  setView: (v: View) => void;
  subActive: boolean;
  openForm: () => void;
}) {
  return (
    <aside className="w-64 bg-[#020617] border-r border-white/10 p-4 flex flex-col">

      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="text-purple-400" />
        <span className="font-bold text-lg">ZEDPERA</span>

        {subActive && (
          <span className="ml-auto text-xs bg-purple-600 px-2 py-1 rounded">
            PRO
          </span>
        )}
      </div>

      <div className="space-y-1">
        <button
          onClick={() => setView('dashboard')}
          className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5"
        >
          Dashboard
        </button>

        <button
          onClick={() => setView('chat')}
          className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-white/5"
        >
          AI Chat
        </button>
      </div>

      <div className="mt-auto pt-6 space-y-3">

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openForm();
          }}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 py-2 rounded-lg font-medium"
        >
          + Nová práca
        </button>

        {!subActive && (
          <button className="w-full flex items-center justify-center gap-2 bg-yellow-500 text-black py-2 rounded-lg font-medium">
            <Crown size={16} />
            Upgrade PRO
          </button>
        )}

      </div>

    </aside>
  );
}

// ================= HEADER =================

function Header({ view, subActive }: any) {
  return (
    <div className="h-16 flex items-center justify-between px-8 border-b border-white/10 bg-[#020617]/80">
      <h1 className="text-lg font-semibold">{view}</h1>

      {subActive && (
        <span className="text-purple-400 text-sm">
          PRO aktívne
        </span>
      )}
    </div>
  );
}

// ================= DASHBOARD =================

function Dashboard({ setView, setMode }: any) {
  return (
    <div className="max-w-6xl space-y-10">
      <h2 className="text-4xl font-bold">
        Zisti čo je zlé na tvojej práci skôr než vedúci
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <Stat title="Projekty" value="3" />
        <Stat title="Texty" value="124" />
        <Stat title="AI skóre" value="87%" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {featureCards.map((f) => {
          const Icon = f.icon;

          return (
            <button
              key={f.mode}
              onClick={() => {
                setMode(f.mode);
                setView('chat');
              }}
              className="bg-white/5 p-5 rounded-xl"
            >
              <Icon className="mb-3 text-purple-400" />
              {f.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= CHAT =================

function Chat({ mode }: any) {
  return (
    <div>
      <h2 className="text-2xl">AI Chat – {mode}</h2>
    </div>
  );
}

// ================= STAT =================

function Stat({ title, value }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-xl">
      <div className="text-gray-400">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}