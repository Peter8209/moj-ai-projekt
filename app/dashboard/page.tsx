'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Crown,
  FileCheck2,
  FileText,
  GraduationCap,
  Home,
  Languages,
  Library,
  Mail,
  Menu,
  MessageSquare,
  Plus,
  Presentation,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Video,
  X,
} from 'lucide-react';

import ProfileForm from '@/components/ProfileForm';

// ================= TYPES =================

type View =
  | 'dashboard'
  | 'chat'
  | 'profile'
  | 'history'
  | 'settings'
  | 'packages'
  | 'video';

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

type SavedProfile = {
  id: string;
  type?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  language?: string;
  workLanguage?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  savedAt?: string;
};

// ================= WRAPPER =================

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-white bg-[#020617]">Loading...</div>}>
      <DashboardPage />
    </Suspense>
  );
}

// ================= MAIN =================

function DashboardPage() {
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');

  const [subActive, setSubActive] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  // ================= LOAD SUB =================

  useEffect(() => {
    if (document.cookie.includes('sub_active=1')) {
      setSubActive(true);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get('success')) {
      document.cookie = 'sub_active=1; path=/';
      setSubActive(true);
    }
  }, [searchParams]);

  // ================= LOAD PROFILES =================

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    try {
      const list = JSON.parse(localStorage.getItem('profiles_full') || '[]');

      if (Array.isArray(list)) {
        setProfiles(list);
        setActiveProfile(list[0] || null);
      }
    } catch {
      setProfiles([]);
      setActiveProfile(null);
    }
  };

  // ================= SAVE PROFILE FROM MODAL =================

  const handleProfileSave = (data: SavedProfile) => {
    const payload: SavedProfile = {
      ...data,
      id: data.id || Date.now().toString(),
      title: data.title || 'Bez názvu',
      savedAt: data.savedAt || new Date().toISOString(),
    };

    const oldList = JSON.parse(localStorage.getItem('profiles_full') || '[]');

    const newList = [
      payload,
      ...oldList.filter((item: SavedProfile) => item.id !== payload.id),
    ];

    localStorage.setItem('profiles_full', JSON.stringify(newList));
    localStorage.setItem('active_profile', JSON.stringify(payload));

    setProfiles(newList);
    setActiveProfile(payload);

    setShowProfileForm(false);
    setView('profile');
  };

  return (
    <div className="min-h-screen flex bg-[#020617] text-white">
      <Sidebar
        view={view}
        setView={setView}
        subActive={subActive}
        openForm={() => setShowProfileForm(true)}
        openMyWorks={() => setShowProfileForm(true)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <Header view={view} subActive={subActive} />

        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {view === 'dashboard' && (
            <Dashboard
              setView={setView}
              setMode={setMode}
              openForm={() => setShowProfileForm(true)}
            />
          )}

          {view === 'chat' && (
            <Chat mode={mode} setMode={setMode} activeProfile={activeProfile} />
          )}

          {view === 'profile' && (
            <ProfileView
              profile={activeProfile}
              profiles={profiles}
              setActiveProfile={setActiveProfile}
              openForm={() => setShowProfileForm(true)}
            />
          )}

          {view === 'packages' && <SimplePage title="Balíčky" text="Tu budú predplatné balíčky, doplnkové služby a aktivácia PRO funkcií." />}
          {view === 'video' && <SimplePage title="Video návod" text="Tu bude video návod pre používateľa." />}
          {view === 'history' && <SimplePage title="História" text="Tu bude história generovaní, auditov a uložených výstupov." />}
          {view === 'settings' && <SimplePage title="Nastavenia" text="Tu budú nastavenia účtu, jazyka, fakturácie a aplikácie." />}
        </div>
      </main>

      {/* ================= PROFILE MODAL ================= */}
      {showProfileForm && (
        <div className="fixed inset-0 z-[9999]">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowProfileForm(false)}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#020617] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#020617]/95 px-6 py-5 backdrop-blur">
                <div>
                  <h2 className="text-2xl font-black">Nová práca</h2>
                  <p className="text-sm text-gray-400">
                    Vyplň profil práce. Po uložení sa údaje automaticky vložia do sekcie Profil práce.
                  </p>
                </div>

                <button
                  onClick={() => setShowProfileForm(false)}
                  className="rounded-xl bg-white/10 p-2 text-gray-300 hover:bg-white/20 hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6">
                <ProfileForm onSave={handleProfileSave} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= SIDEBAR =================

function Sidebar({
  view,
  setView,
  subActive,
  openForm,
  openMyWorks,
}: {
  view: View;
  setView: (v: View) => void;
  subActive: boolean;
  openForm: () => void;
  openMyWorks: () => void;
}) {
  return (
    <aside className="w-[270px] shrink-0 bg-[#020617] border-r border-white/10 p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
          <Sparkles className="text-white" size={24} />
        </div>

        <div>
          <div className="font-black text-xl leading-none">ZEDPERA</div>
          <div className="text-sm text-gray-300">AI vedúci práce</div>
        </div>

        {subActive && (
          <span className="ml-auto text-xs bg-purple-600 px-2 py-1 rounded">
            PRO
          </span>
        )}
      </div>

      <button
        onClick={openForm}
        className="mb-7 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-4 font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90"
      >
        <Plus size={20} />
        Nová práca
      </button>

      <nav className="space-y-2">
        <SideItem
          active={view === 'dashboard'}
          icon={Home}
          label="Dashboard"
          onClick={() => setView('dashboard')}
        />

        <SideItem
          active={view === 'chat'}
          icon={MessageSquare}
          label="AI Chat"
          onClick={() => setView('chat')}
        />

        <SideItem
          active={false}
          icon={BookOpen}
          label="Moje práce"
          onClick={openMyWorks}
        />

        <SideItem
          active={view === 'profile'}
          icon={User}
          label="Profil práce"
          onClick={() => setView('profile')}
        />

        <SideItem
          active={view === 'chat'}
          icon={Library}
          label="Zdroje"
          onClick={() => {
            setView('chat');
          }}
        />

        <SideItem
          active={view === 'packages'}
          icon={Menu}
          label="Balíčky"
          onClick={() => setView('packages')}
        />

        <SideItem
          active={view === 'video'}
          icon={Video}
          label="Video návod"
          onClick={() => setView('video')}
        />

        <SideItem
          active={view === 'history'}
          icon={ClockIcon}
          label="História"
          onClick={() => setView('history')}
        />

        <SideItem
          active={view === 'settings'}
          icon={Settings}
          label="Nastavenia"
          onClick={() => setView('settings')}
        />
      </nav>

      <div className="mt-auto pt-6">
        {!subActive && (
          <button className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-black py-3 rounded-xl font-bold">
            <Crown size={17} />
            Upgrade PRO
          </button>
        )}
      </div>
    </aside>
  );
}

function ClockIcon(props: any) {
  return <CalendarDays {...props} />;
}

function SideItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
        active
          ? 'bg-white/10 text-white font-semibold'
          : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

// ================= HEADER =================

function Header({
  view,
  subActive,
}: {
  view: View;
  subActive: boolean;
}) {
  const titleMap: Record<View, string> = {
    dashboard: 'Dashboard',
    chat: 'AI Chat',
    profile: 'Profil práce',
    history: 'História',
    settings: 'Nastavenia',
    packages: 'Balíčky',
    video: 'Video návod',
  };

  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-white/10 bg-[#363946]">
      <div>
        <h1 className="text-2xl font-black text-black/80">{titleMap[view]}</h1>
        <p className="text-gray-300">AI platforma pre akademické písanie</p>
      </div>

      <div className="flex items-center gap-4">
        {subActive && (
          <span className="text-purple-200 text-sm bg-purple-600/30 px-3 py-1 rounded-full">
            PRO aktívne
          </span>
        )}

        <Bell className="text-gray-300" size={22} />
      </div>
    </header>
  );
}

// ================= DASHBOARD =================

function Dashboard({
  setView,
  setMode,
  openForm,
}: {
  setView: (v: View) => void;
  setMode: (m: Mode) => void;
  openForm: () => void;
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <section className="rounded-3xl border border-white/10 bg-[#050816] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Sparkles className="text-purple-400" />
              <span className="font-black text-2xl">ZEDPERA</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black leading-tight max-w-5xl">
              Zisti čo je zlé na tvojej práci skôr než vedúci
            </h2>

            <p className="mt-4 max-w-3xl text-gray-400">
              Vytvor profil práce, vyhľadaj zdroje, skontroluj kvalitu textu,
              priprav obhajobu a získaj spätnú väzbu ako od vedúceho práce.
            </p>
          </div>

          <button
            onClick={openForm}
            className="shrink-0 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold flex items-center gap-2"
          >
            <Plus size={20} />
            Nová práca
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat title="Projekty" value="3" />
          <Stat title="Texty" value="124" />
          <Stat title="AI skóre" value="87%" />
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((f) => {
            const Icon = f.icon;

            return (
              <button
                key={f.mode}
                onClick={() => {
                  setMode(f.mode);
                  setView('chat');
                }}
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left hover:bg-white/10 transition"
              >
                <Icon className="mb-5 text-purple-400 group-hover:scale-110 transition" size={30} />
                <div className="font-bold text-lg">{f.title}</div>
                <p className="mt-2 text-sm text-gray-400">
                  {getModeDescription(f.mode)}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ================= PROFILE VIEW =================

function ProfileView({
  profile,
  profiles,
  setActiveProfile,
  openForm,
}: {
  profile: SavedProfile | null;
  profiles: SavedProfile[];
  setActiveProfile: (p: SavedProfile) => void;
  openForm: () => void;
}) {
  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <User className="mx-auto mb-4 text-purple-400" size={42} />
        <h2 className="text-3xl font-black mb-2">Profil práce zatiaľ nie je vytvorený</h2>
        <p className="text-gray-400 mb-6">
          Klikni na tlačidlo nižšie a vytvor nový profil práce.
        </p>

        <button
          onClick={openForm}
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-bold"
        >
          + Vytvoriť profil práce
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Profil práce</h2>
          <p className="text-gray-400">
            Tu sú údaje z uloženého popup formulára.
          </p>
        </div>

        <button
          onClick={openForm}
          className="rounded-2xl bg-purple-600 px-5 py-3 font-bold"
        >
          + Nová práca
        </button>
      </div>

      {profiles.length > 1 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProfile(p)}
              className={`rounded-xl px-4 py-2 text-sm ${
                p.id === profile.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {p.title || 'Bez názvu'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ProfileCard label="Názov práce" value={profile.title} />
        <ProfileCard label="Typ práce" value={profile.type} />
        <ProfileCard label="Jazyk práce" value={profile.workLanguage || profile.language} />
        <ProfileCard label="Téma" value={profile.topic} large />
        <ProfileCard label="Odbor" value={profile.field} />
        <ProfileCard label="Vedúci práce" value={profile.supervisor} />
        <ProfileCard label="Cieľ práce" value={profile.goal} large />
        <ProfileCard label="Metodológia" value={profile.methodology} large />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold mb-3">Kľúčové slová</h3>

        {profile.keywords?.length ? (
          <div className="flex flex-wrap gap-2">
            {profile.keywords.map((k, i) => (
              <span key={i} className="rounded-full bg-purple-600/30 px-3 py-1 text-purple-100">
                {k}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Bez kľúčových slov.</p>
        )}
      </div>
    </div>
  );
}

function ProfileCard({
  label,
  value,
  large,
}: {
  label: string;
  value?: string;
  large?: boolean;
}) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/5 p-5 ${large ? 'lg:col-span-2' : ''}`}>
      <div className="text-sm text-gray-400 mb-2">{label}</div>
      <div className="text-lg font-semibold whitespace-pre-wrap">
        {value || <span className="text-gray-600">Nevyplnené</span>}
      </div>
    </div>
  );
}

// ================= CHAT / MODULES =================

function Chat({
  mode,
  setMode,
  activeProfile,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  activeProfile: SavedProfile | null;
}) {
  const current = featureCards.find((f) => f.mode === mode) || featureCards[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <ModuleTabs mode={mode} setMode={setMode} />

      <div className="rounded-3xl border border-white/10 bg-[#050816] p-6">
        <div className="mb-6 flex items-center gap-3">
          <current.icon className="text-purple-400" size={30} />
          <div>
            <h2 className="text-3xl font-black">{current.title}</h2>
            <p className="text-gray-400">{getModeDescription(mode)}</p>
          </div>
        </div>

        {activeProfile && (
          <div className="mb-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100">
            Aktívny profil práce: <strong>{activeProfile.title}</strong>
            {activeProfile.topic ? ` — ${activeProfile.topic}` : ''}
          </div>
        )}

        {mode === 'write' && <WriteModule />}
        {mode === 'sources' && <SourcesModule />}
        {mode === 'supervisor' && <SupervisorModule />}
        {mode === 'audit' && <AuditModule />}
        {mode === 'defense' && <DefenseModule />}
        {mode === 'translate' && <TranslateModule />}
        {mode === 'analysis' && <AnalysisModule />}
        {mode === 'planning' && <PlanningModule />}
        {mode === 'email' && <EmailModule />}
        {mode === 'plagiarism' && <PlagiarismModule />}
      </div>
    </div>
  );
}

function ModuleTabs({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex gap-2 overflow-x-auto">
        {featureCards.map((f) => {
          const Icon = f.icon;

          return (
            <button
              key={f.mode}
              onClick={() => setMode(f.mode)}
              className={`shrink-0 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold ${
                mode === f.mode
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <Icon size={17} />
              {f.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= MODULE CONTENTS =================

function WriteModule() {
  return (
    <ModuleLayout>
      <Input label="Názov kapitoly" placeholder="Napr. Teoretické východiská práce" />
      <Select label="Typ výstupu" options={['Úvod', 'Kapitola', 'Podkapitola', 'Záver', 'Abstrakt', 'Anotácia']} />
      <Textarea label="Zadanie pre AI" placeholder="Popíš, čo má AI napísať..." />
      <ActionButton icon={FileText} label="Generovať text" />
    </ModuleLayout>
  );
}

function SourcesModule() {
  return (
    <ModuleLayout>
      <Input label="Téma vyhľadávania" placeholder="Napr. inkluzívne vzdelávanie v predprimárnom veku" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select label="Roky" options={['Bez obmedzenia', 'Posledné 2 roky', 'Posledných 5 rokov', '2010–2015', '2015–2020']} />
        <Select label="Typ zdroja" options={['Všetko', 'Len PDF', 'Open Access', 'Články', 'Štúdie']} />
        <Select label="Jazyk" options={['EN', 'SK', 'CZ', 'DE']} />
      </div>
      <ActionButton icon={Search} label="Vyhľadať zdroje" />
    </ModuleLayout>
  );
}

function SupervisorModule() {
  return (
    <ModuleLayout>
      <Textarea label="Vlož text práce" placeholder="Vlož kapitolu alebo časť práce na kritické posúdenie..." />
      <Select label="Prísnosť hodnotenia" options={['Mierna', 'Štandardná', 'Prísna ako vedúci práce', 'Oponentská kritika']} />
      <ActionButton icon={GraduationCap} label="Skontrolovať ako AI vedúci" />
    </ModuleLayout>
  );
}

function AuditModule() {
  return (
    <ModuleLayout>
      <Textarea label="Text na audit kvality" placeholder="Vlož text, ktorý chceš skontrolovať..." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select label="Kontrola" options={['Logika', 'Metodológia', 'Argumentácia', 'Štylistika', 'Všetko']} />
        <Select label="Výstup" options={['Bodové hodnotenie', 'Detailná správa', 'Odporúčania']} />
        <Select label="Norma" options={['APA', 'ISO 690', 'Harvard', 'MLA']} />
      </div>
      <ActionButton icon={FileCheck2} label="Spustiť audit kvality" />
    </ModuleLayout>
  );
}

function DefenseModule() {
  return (
    <ModuleLayout>
      <Input label="Názov práce" placeholder="Názov záverečnej práce" />
      <Textarea label="Stručný obsah práce" placeholder="Vlož abstrakt alebo stručný opis práce..." />
      <Select label="Typ obhajoby" options={['Bakalárska', 'Diplomová', 'Seminárna', 'Dizertačná']} />
      <ActionButton icon={Presentation} label="Pripraviť otázky na obhajobu" />
    </ModuleLayout>
  );
}

function TranslateModule() {
  return (
    <ModuleLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Z jazyka" options={['Automaticky', 'Slovenčina', 'Čeština', 'Angličtina', 'Nemčina', 'Poľština', 'Maďarčina']} />
        <Select label="Do jazyka" options={['Slovenčina', 'Čeština', 'Angličtina', 'Nemčina', 'Poľština', 'Maďarčina']} />
      </div>

      <Select label="Štýl prekladu" options={['Akademický', 'Odborný', 'Jednoduchý', 'Formálny', 'Doslovný']} />

      <Textarea label="Text na preklad" placeholder="Vlož text, ktorý chceš preložiť..." />

      <ActionButton icon={Languages} label="Preložiť text" />
    </ModuleLayout>
  );
}

function AnalysisModule() {
  return (
    <ModuleLayout>
      <Textarea label="Dáta alebo tabuľka" placeholder="Vlož údaje, výsledky výskumu alebo popis dát..." />
      <Select label="Typ analýzy" options={['Opisná štatistika', 'Korelácia', 'Interpretácia výsledkov', 'Grafické odporúčania']} />
      <ActionButton icon={BarChart3} label="Analyzovať dáta" />
    </ModuleLayout>
  );
}

function PlanningModule() {
  return (
    <ModuleLayout>
      <Input label="Termín odovzdania" placeholder="Napr. 30. 6. 2026" />
      <Select label="Typ plánu" options={['Denný plán', 'Týždenný plán', 'Plán kapitol', 'Plán výskumu']} />
      <Textarea label="Aktuálny stav práce" placeholder="Napíš, čo už máš hotové a čo ešte chýba..." />
      <ActionButton icon={CalendarDays} label="Vytvoriť plán práce" />
    </ModuleLayout>
  );
}

function EmailModule() {
  return (
    <ModuleLayout>
      <Select label="Typ emailu" options={['Email vedúcemu', 'Žiadosť o konzultáciu', 'Odovzdanie kapitoly', 'Ospravedlnenie', 'Formálny email']} />
      <Input label="Komu" placeholder="Napr. vedúci práce, školiteľ, konzultant" />
      <Textarea label="Obsah / požiadavka" placeholder="Napíš, čo má email obsahovať..." />
      <ActionButton icon={Mail} label="Vygenerovať email" />
    </ModuleLayout>
  );
}

function PlagiarismModule() {
  return (
    <ModuleLayout>
      <Textarea label="Text na kontrolu originality" placeholder="Vlož text, ktorý chceš preveriť..." />
      <Select label="Typ kontroly" options={['Orientačná kontrola', 'Parafrázovanie', 'Rizikové pasáže', 'Odporúčania na úpravu']} />
      <ActionButton icon={ShieldCheck} label="Skontrolovať originalitu" />
    </ModuleLayout>
  );
}

// ================= UI HELPERS =================

function ModuleLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

function Input({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>
      <input
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
      />
    </label>
  );
}

function Textarea({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>
      <textarea
        placeholder={placeholder}
        rows={7}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
      />
    </label>
  );
}

function Select({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>
      <select className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: any;
  label: string;
}) {
  return (
    <button className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold flex items-center gap-2 hover:opacity-90">
      <Icon size={20} />
      {label}
    </button>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-gray-400">{title}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function SimplePage({ title, text }: { title: string; text: string }) {
  return (
    <div className="max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-3xl font-black mb-3">{title}</h2>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

function getModeDescription(mode: Mode) {
  const descriptions: Record<Mode, string> = {
    write: 'Generovanie akademického textu podľa profilu práce.',
    sources: 'Vyhľadávanie vedeckých zdrojov, článkov a PDF.',
    supervisor: 'Kritická spätná väzba ako od vedúceho práce.',
    audit: 'Kontrola kvality, logiky, metodológie a argumentácie.',
    defense: 'Príprava na obhajobu, otázky a odpovede.',
    translate: 'Akademický preklad s výberom vstupného a výstupného jazyka.',
    analysis: 'Analýza dát, výsledkov výskumu a interpretácia.',
    planning: 'Plánovanie kapitol, termínov a postupu práce.',
    email: 'Formálne emaily pre vedúceho, školu alebo konzultanta.',
    plagiarism: 'Orientačná kontrola originality a rizikových pasáží.',
  };

  return descriptions[mode];
}