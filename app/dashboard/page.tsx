'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Crown,
  ExternalLink,
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
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Video,
  X,
} from 'lucide-react';

import ProfileFormOriginal from '@/components/ProfileForm';

// =====================================================
// TYPES
// =====================================================

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

type Mode = (typeof featureCards)[number]['mode'];

type SavedProfile = {
  id: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  language?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  methodology?: string;
  keywords?: string[];
  keywordsList?: string[];
  savedAt?: string;
};

const ProfileForm = ProfileFormOriginal as unknown as ComponentType<{
  onSave?: (data: SavedProfile) => void;
}>;

// =====================================================
// PAGE WRAPPER
// =====================================================

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] p-6 text-white">
          Načítavam...
        </div>
      }
    >
      <DashboardPage />
    </Suspense>
  );
}

// =====================================================
// MAIN DASHBOARD PAGE
// =====================================================

function DashboardPage() {
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');

  const [subActive, setSubActive] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);

  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  // =====================================================
  // LOAD SUBSCRIPTION STATUS
  // =====================================================

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (document.cookie.includes('sub_active=1')) {
      setSubActive(true);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (searchParams.get('success')) {
      document.cookie = 'sub_active=1; path=/';
      setSubActive(true);
    }
  }, [searchParams]);

  // =====================================================
  // LOAD PROFILES
  // =====================================================

  useEffect(() => {
    loadProfiles();
  }, []);

  const normalizeProfile = (profile: SavedProfile): SavedProfile => {
    return {
      ...profile,
      id: profile.id || Date.now().toString(),
      title: profile.title || 'Bez názvu',
      savedAt: profile.savedAt || new Date().toISOString(),
      keywords:
        profile.keywords && profile.keywords.length > 0
          ? profile.keywords
          : profile.keywordsList || [],
    };
  };

  const loadProfiles = () => {
    if (typeof window === 'undefined') return;

    try {
      const rawProfiles = localStorage.getItem('profiles_full');
      const rawActive = localStorage.getItem('active_profile');

      const list = rawProfiles ? JSON.parse(rawProfiles) : [];
      const active = rawActive ? JSON.parse(rawActive) : null;

      if (Array.isArray(list)) {
        const normalizedList = list.map((item: SavedProfile) =>
          normalizeProfile(item)
        );

        setProfiles(normalizedList);

        if (active?.id) {
          const found = normalizedList.find(
            (item: SavedProfile) => item.id === active.id
          );

          setActiveProfile(found || normalizeProfile(active));
        } else {
          setActiveProfile(normalizedList[0] || null);
        }
      } else {
        setProfiles([]);
        setActiveProfile(null);
      }
    } catch {
      setProfiles([]);
      setActiveProfile(null);
    }
  };

  // =====================================================
  // SAVE PROFILE FROM POPUP FORM
  // =====================================================

  const handleProfileSave = (data: SavedProfile) => {
    if (typeof window === 'undefined') return;

    const payload = normalizeProfile(data);

    let oldList: SavedProfile[] = [];

    try {
      const raw = localStorage.getItem('profiles_full');
      const parsed = raw ? JSON.parse(raw) : [];
      oldList = Array.isArray(parsed) ? parsed : [];
    } catch {
      oldList = [];
    }

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

  const closeProfileFormAndRefresh = () => {
    setShowProfileForm(false);
    loadProfiles();
  };

const showSidebar = view !== 'dashboard';

return (
  <div className="min-h-screen bg-[#020617] text-white">
    <main className="flex min-w-0 flex-1 flex-col">
        <Header
  view={view}
  mode={mode}
  subActive={subActive}
  setView={setView}
/>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {view === 'dashboard' && (
            <Dashboard
              setView={setView}
              setMode={setMode}
              openForm={() => setShowProfileForm(true)}
            />
          )}

          {view === 'chat' && (
            <Chat
              mode={mode}
              setMode={setMode}
              activeProfile={activeProfile}
            />
          )}

          {view === 'profile' && (
            <ProfileView
              profile={activeProfile}
              profiles={profiles}
              setActiveProfile={(profile) => {
                setActiveProfile(profile);

                if (typeof window !== 'undefined') {
                  localStorage.setItem(
                    'active_profile',
                    JSON.stringify(profile)
                  );
                }
              }}
              openForm={() => setShowProfileForm(true)}
            />
          )}

          {view === 'packages' && (
            <SimplePage
              title="Balíčky"
              text="Tu budú predplatné balíčky, doplnkové služby a aktivácia PRO funkcií."
            />
          )}

          {view === 'video' && (
            <SimplePage
              title="Video návod"
              text="Tu bude video návod pre používateľa."
            />
          )}

          {view === 'history' && (
            <SimplePage
              title="História"
              text="Tu bude história generovaní, auditov a uložených výstupov."
            />
          )}

          {view === 'settings' && (
            <SimplePage
              title="Nastavenia"
              text="Tu budú nastavenia účtu, jazyka, fakturácie a aplikácie."
            />
          )}
        </div>
      </main>

      {/* =====================================================
          PROFILE POPUP MODAL
      ===================================================== */}

      {showProfileForm && (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            aria-label="Zavrieť popup"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeProfileFormAndRefresh}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#020617] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#020617]/95 px-6 py-5 backdrop-blur">
                <div>
                  <h2 className="text-2xl font-black">Nová práca</h2>
                  <p className="text-sm text-gray-400">
                    Vyplň profil práce. Po uložení sa údaje automaticky vložia
                    do sekcie Profil práce.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeProfileFormAndRefresh}
                  className="rounded-xl bg-white/10 p-2 text-gray-300 transition hover:bg-white/20 hover:text-white"
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



// =====================================================
// HEADER
// =====================================================

function Header({
  view,
  mode,
  subActive,
  setView,
}: {
  view: View;
  mode: Mode;
  subActive: boolean;
  setView: (v: View) => void;
}) {
  const titleMap: Record<View, string> = {
    dashboard: 'Dashboard',
    chat: getModeTitle(mode),
    profile: 'Profil práce',
    history: 'História',
    settings: 'Nastavenia',
    packages: 'Balíčky',
    video: 'Video návod',
  };

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/10 bg-[#111827] px-8">
      <div>
        <h1 className="text-2xl font-black text-white">{titleMap[view]}</h1>
        <p className="text-gray-300">AI platforma pre akademické písanie</p>
      </div>

     <div className="flex items-center gap-4">
  {view !== 'dashboard' && (
    <button
      type="button"
      onClick={() => setView('dashboard')}
      className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
    >
      Dashboard
    </button>
  )}

  {subActive && (
    <span className="rounded-full bg-purple-600/30 px-3 py-1 text-sm text-purple-200">
      PRO aktívne
    </span>
  )}

  <Bell className="text-gray-300" size={22} />
</div>
     
    </header>
  );
}

// =====================================================
// DASHBOARD
// =====================================================

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
    <div className="mx-auto max-w-7xl space-y-10">
      <section className="rounded-3xl border border-white/10 bg-[#050816] p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Sparkles className="text-purple-400" />
              <span className="text-2xl font-black">ZEDPERA</span>
            </div>

            <h2 className="max-w-5xl text-4xl font-black leading-tight md:text-5xl">
              Zisti čo je zlé na tvojej práci skôr než vedúci
            </h2>

            <p className="mt-4 max-w-3xl text-gray-400">
              Vytvor profil práce, vyhľadaj zdroje, skontroluj kvalitu textu,
              priprav obhajobu a získaj spätnú väzbu ako od vedúceho práce.
            </p>
          </div>

          <button
            type="button"
            onClick={openForm}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold"
          >
            <Plus size={20} />
            Nová práca
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat title="Projekty" value="3" />
          <Stat title="Texty" value="124" />
          <Stat title="AI skóre" value="87%" />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <button
                type="button"
                key={feature.mode}
                onClick={() => {
                  setMode(feature.mode);
                  setView('chat');
                }}
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition hover:bg-white/10"
              >
                <Icon
                  className="mb-5 text-purple-400 transition group-hover:scale-110"
                  size={30}
                />
                <div className="text-lg font-bold">{feature.title}</div>
                <p className="mt-2 text-sm text-gray-400">
                  {getModeDescription(feature.mode)}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// =====================================================
// PROFILE VIEW
// =====================================================

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
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <User className="mx-auto mb-4 text-purple-400" size={42} />

        <h2 className="mb-2 text-3xl font-black">
          Profil práce zatiaľ nie je vytvorený
        </h2>

        <p className="mb-6 text-gray-400">
          Klikni na tlačidlo nižšie a vytvor nový profil práce.
        </p>

        <button
          type="button"
          onClick={openForm}
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-bold"
        >
          + Vytvoriť profil práce
        </button>
      </div>
    );
  }

  const keywords =
    profile.keywords && profile.keywords.length > 0
      ? profile.keywords
      : profile.keywordsList || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Profil práce</h2>
          <p className="text-gray-400">
            Tu sú údaje z uloženého popup formulára.
          </p>
        </div>

        <button
          type="button"
          onClick={openForm}
          className="rounded-2xl bg-purple-600 px-5 py-3 font-bold"
        >
          + Nová práca
        </button>
      </div>

      {profiles.length > 1 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          {profiles.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveProfile(item)}
              className={`rounded-xl px-4 py-2 text-sm ${
                item.id === profile.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {item.title || 'Bez názvu'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ProfileCard label="Názov práce" value={profile.title} />
        <ProfileCard label="Typ práce" value={profile.type} />
        <ProfileCard label="Úroveň práce" value={profile.level} />
        <ProfileCard
          label="Jazyk práce"
          value={profile.workLanguage || profile.language}
        />
        <ProfileCard label="Citovanie" value={profile.citation} />
        <ProfileCard label="Vedúci práce" value={profile.supervisor} />
        <ProfileCard label="Téma" value={profile.topic} large />
        <ProfileCard label="Odbor" value={profile.field} />
        <ProfileCard label="Anotácia" value={profile.annotation} large />
        <ProfileCard label="Cieľ práce" value={profile.goal} large />
        <ProfileCard label="Metodológia" value={profile.methodology} large />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-3 text-lg font-bold">Kľúčové slová</h3>

        {keywords.length ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-full bg-purple-600/30 px-3 py-1 text-purple-100"
              >
                {keyword}
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
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-5 ${
        large ? 'lg:col-span-2' : ''
      }`}
    >
      <div className="mb-2 text-sm text-gray-400">{label}</div>
      <div className="whitespace-pre-wrap text-lg font-semibold">
        {value || <span className="text-gray-600">Nevyplnené</span>}
      </div>
    </div>
  );
}

// =====================================================
// CHAT / MODULES
// =====================================================

function Chat({
  mode,
  setMode,
  activeProfile,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  activeProfile: SavedProfile | null;
}) {
  const current = useMemo(() => {
    return (
      featureCards.find((feature) => feature.mode === mode) || featureCards[0]
    );
  }, [mode]);

  const CurrentIcon = current.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ModuleTabs mode={mode} setMode={setMode} />

      <div className="rounded-3xl border border-white/10 bg-[#050816] p-6">
        <div className="mb-6 flex items-center gap-3">
          <CurrentIcon className="text-purple-400" size={30} />

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

       {mode === 'write' && <WriteModule activeProfile={activeProfile} />}
        {mode === 'sources' && <SourcesModule />}
        {mode === 'supervisor' && <SupervisorModule activeProfile={activeProfile} />}
      {mode === 'audit' && <AuditModule activeProfile={activeProfile} />}
       {mode === 'defense' && <DefenseModule activeProfile={activeProfile} />}
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
  const firstRow = featureCards.slice(0, 5);
  const secondRow = featureCards.slice(5, 10);

  const renderTab = (feature: (typeof featureCards)[number]) => {
    const Icon = feature.icon;

    return (
      <button
        type="button"
        key={feature.mode}
        onClick={() => setMode(feature.mode)}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold transition ${
          mode === feature.mode
            ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
        }`}
      >
        <Icon size={18} />
        <span className="truncate">{feature.title}</span>
      </button>
    );
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3">
        {/* 1. riadok */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {firstRow.map(renderTab)}
        </div>

        {/* 2. riadok */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {secondRow.map(renderTab)}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODULE CONTENTS
// =====================================================

function WriteModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const [chapterTitle, setChapterTitle] = useState('');
  const [outputType, setOutputType] = useState('Kapitola');
  const [assignment, setAssignment] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedForSupervisor, setSavedForSupervisor] = useState(false);
  const [error, setError] = useState('');

  const saveForSupervisor = (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      setError('Najprv vygeneruj alebo vlož text.');
      return;
    }

    localStorage.setItem('latest_generated_work_text', cleanText);

    setSavedForSupervisor(true);
    setError('');

    window.setTimeout(() => {
      setSavedForSupervisor(false);
    }, 2500);
  };

  const generateText = async () => {
    setIsGenerating(true);
    setError('');
    setSavedForSupervisor(false);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chapterTitle,
          outputType,
          assignment,
          activeProfile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Nepodarilo sa vygenerovať text.');
      }

      const text = String(data?.text || '').trim();

      if (!text) {
        throw new Error('AI nevrátila žiadny text.');
      }

      setGeneratedText(text);

      // Toto je hlavné prepojenie na AI vedúceho práce:
      localStorage.setItem('latest_generated_work_text', text);

      setSavedForSupervisor(true);

      window.setTimeout(() => {
        setSavedForSupervisor(false);
      }, 2500);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri generovaní textu.';

      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModuleLayout>
      {activeProfile && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100">
          Text sa bude generovať podľa aktívneho profilu:{' '}
          <strong>{activeProfile.title || 'Bez názvu'}</strong>
          {activeProfile.topic ? ` — ${activeProfile.topic}` : ''}
        </div>
      )}

      {!activeProfile && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Profil práce zatiaľ nie je vytvorený. Text sa dá generovať aj bez
          profilu, ale výsledok bude menej presný.
        </div>
      )}

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Názov kapitoly
        </div>

        <input
          value={chapterTitle}
          onChange={(event) => setChapterTitle(event.target.value)}
          placeholder="Napr. Teoretické východiská práce"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Typ výstupu
        </div>

        <select
          value={outputType}
          onChange={(event) => setOutputType(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500"
        >
          <option>Úvod</option>
          <option>Kapitola</option>
          <option>Podkapitola</option>
          <option>Záver</option>
          <option>Abstrakt</option>
          <option>Anotácia</option>
        </select>
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Zadanie pre AI
        </div>

        <textarea
          value={assignment}
          onChange={(event) => setAssignment(event.target.value)}
          rows={7}
          placeholder="Popíš, čo má AI napísať. Napr. Napíš teoretickú kapitolu o inkluzívnom vzdelávaní v rozsahu cca 2 strany..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateText}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={20} />
          {isGenerating ? 'Generujem text...' : 'Generovať text'}
        </button>

        <button
          type="button"
          onClick={() => saveForSupervisor(generatedText)}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold transition hover:bg-white/15"
        >
          Uložiť pre AI vedúceho
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {savedForSupervisor && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-semibold text-green-200">
          Text bol uložený pre AI vedúceho práce.
        </div>
      )}

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Vygenerovaný text
        </div>

        <textarea
          value={generatedText}
          onChange={(event) => {
            setGeneratedText(event.target.value);
            localStorage.setItem(
              'latest_generated_work_text',
              event.target.value
            );
          }}
          rows={16}
          placeholder="Tu sa zobrazí vygenerovaný text z AI..."
          className="w-full rounded-2xl border border-purple-500/30 bg-[#0f1324] px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>
    </ModuleLayout>
  );
}

function SourcesModule() {
  return (
    <ModuleLayout>
      <Input
        label="Téma vyhľadávania"
        placeholder="Napr. inkluzívne vzdelávanie v predprimárnom veku"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Select
          label="Roky"
          options={[
            'Bez obmedzenia',
            'Posledné 2 roky',
            'Posledných 5 rokov',
            '2010–2015',
            '2015–2020',
          ]}
        />

        <Select
          label="Typ zdroja"
          options={[
            'Všetko',
            'Len PDF',
            'Open Access',
            'Články',
            'Štúdie',
          ]}
        />

        <Select label="Jazyk" options={['EN', 'SK', 'CZ', 'DE']} />
      </div>

      <ActionButton icon={Search} label="Vyhľadať zdroje" />
    </ModuleLayout>
  );
}

// =====================================================
// FASTBOTS AI VEDÚCI PRÁCE
// =====================================================

function SupervisorModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const botId =
    process.env.NEXT_PUBLIC_FASTBOTS_BOT_ID || 'cmonxnqsl0av1p81pwly2ti1x';

  const fastbotUrl = `https://app.fastbots.ai/embed/${botId}`;

  if (!botId) {
    return (
      <div className="rounded-3xl border border-red-500/40 bg-red-950/30 p-6 text-red-100">
        <h3 className="text-xl font-black">Fastbots nie je nastavený</h3>
        <p className="mt-2 text-sm text-red-200">
          Do súboru .env.local pridaj premennú:
        </p>

        <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/40 p-4 text-xs text-red-100">
{`NEXT_PUBLIC_FASTBOTS_BOT_ID=cmonxnqsl0av1p81pwly2ti1x`}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30">
              <Bot size={28} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                Fastbots AI vedúci práce
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                Tento modul je napojený priamo na Fastbots AI. Používateľ vloží
                text práce do chatbota a dostane odbornú spätnú väzbu ako od
                vedúceho práce.
              </p>

              {activeProfile && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-purple-100">
                  <div>
                    <span className="text-gray-400">Aktívna práca:</span>{' '}
                    <strong>{activeProfile.title || 'Bez názvu'}</strong>
                  </div>

                  {activeProfile.topic && (
                    <div className="mt-1">
                      <span className="text-gray-400">Téma:</span>{' '}
                      {activeProfile.topic}
                    </div>
                  )}

                  {activeProfile.type && (
                    <div className="mt-1">
                      <span className="text-gray-400">Typ práce:</span>{' '}
                      {activeProfile.type}
                    </div>
                  )}

                  {activeProfile.citation && (
                    <div className="mt-1">
                      <span className="text-gray-400">Citovanie:</span>{' '}
                      {activeProfile.citation}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <a
            href={fastbotUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Otvoriť samostatne
            <ExternalLink size={17} />
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-purple-500/30 bg-white shadow-2xl">
        <iframe
          title="Fastbots AI vedúci práce"
          src={fastbotUrl}
          className="h-[720px] w-full border-0"
          allow="microphone; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

function AuditModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const [text, setText] = useState('');
  const [checkType, setCheckType] = useState('Všetko');
  const [outputType, setOutputType] = useState('Detailná správa');
  const [citationStyle, setCitationStyle] = useState(
    activeProfile?.citation || 'ISO 690'
  );

  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAudit = async () => {
    setError('');
    setResult('');

    if (text.trim().length < 300) {
      setError('Vlož aspoň 300 znakov textu na audit.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          checkType,
          outputType,
          citationStyle,
          activeProfile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || 'Audit kvality zlyhal.');
      }

      setResult(data.result || '');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri audite kvality.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      {activeProfile && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100">
          Audit sa vykoná podľa aktívneho profilu práce:{' '}
          <strong>{activeProfile.title || 'Bez názvu'}</strong>
          {activeProfile.topic ? ` — ${activeProfile.topic}` : ''}
        </div>
      )}

      {!activeProfile && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          Profil práce nie je vytvorený. Audit bude fungovať, ale bez kontextu
          témy, metodológie a typu práce.
        </div>
      )}

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Text na audit kvality
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          placeholder="Vlož sem kapitolu, úvod, záver alebo inú časť práce..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <div className="mb-2 text-sm font-semibold text-gray-300">
            Kontrola
          </div>

          <select
            value={checkType}
            onChange={(event) => setCheckType(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500"
          >
            <option>Všetko</option>
            <option>Logika</option>
            <option>Metodológia</option>
            <option>Argumentácia</option>
            <option>Štylistika</option>
            <option>Citácie</option>
            <option>Štruktúra práce</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-2 text-sm font-semibold text-gray-300">
            Výstup
          </div>

          <select
            value={outputType}
            onChange={(event) => setOutputType(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500"
          >
            <option>Detailná správa</option>
            <option>Bodové hodnotenie</option>
            <option>Odporúčania</option>
            <option>Prísna kritika</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-2 text-sm font-semibold text-gray-300">
            Citačná norma
          </div>

          <select
            value={citationStyle}
            onChange={(event) => setCitationStyle(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500"
          >
            <option>ISO 690</option>
            <option>APA</option>
            <option>APA 7</option>
            <option>Harvard</option>
            <option>MLA</option>
            <option>Chicago</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={runAudit}
        disabled={loading}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FileCheck2 size={20} />
        {loading ? 'Prebieha audit...' : 'Spustiť audit kvality'}
      </button>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-white/10 bg-[#0f1324] p-6">
          <div className="mb-3 text-lg font-black text-white">
            Výsledok auditu kvality
          </div>

          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-200">
            {result}
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

type DefenseSlide = {
  title: string;
  bullets: string[];
  speakerNotes?: string;
};

function DefenseModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const [title, setTitle] = useState(activeProfile?.title || '');
  const [summary, setSummary] = useState(
    activeProfile?.annotation ||
      activeProfile?.goal ||
      activeProfile?.topic ||
      ''
  );
  const [defenseType, setDefenseType] = useState('Bakalárska');
  const [slides, setSlides] = useState<DefenseSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeProfile) return;

    setTitle(activeProfile.title || '');
    setSummary(
      activeProfile.annotation ||
        activeProfile.goal ||
        activeProfile.topic ||
        ''
    );

    if (activeProfile.type) {
      setDefenseType(activeProfile.type);
    }
  }, [activeProfile]);

  const generateDefense = async () => {
    setError('');
    setSlides([]);

    if (!title.trim()) {
      setError('Zadaj názov práce.');
      return;
    }

    if (!summary.trim() || summary.trim().length < 100) {
      setError('Vlož stručný obsah práce aspoň 100 znakov.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/defense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          summary,
          defenseType,
          activeProfile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || 'Nepodarilo sa pripraviť obhajobu.');
      }

      setSlides(data.slides || []);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri príprave obhajoby.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const exportPptx = async () => {
    if (!slides.length) {
      setError('Najprv vygeneruj prezentáciu.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const response = await fetch('/api/defense/pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          defenseType,
          slides,
        }),
      });

      if (!response.ok) {
        throw new Error('Export do PowerPointu zlyhal.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeFileName(title || 'obhajoba')}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Export do PowerPointu zlyhal.';

      setError(message);
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (!slides.length) {
      setError('Najprv vygeneruj prezentáciu.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const element = document.getElementById('defense-pdf-export');

      if (!element) {
        throw new Error('PDF obsah sa nenašiel.');
      }

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;

      await html2pdf()
        .set({
          margin: 8,
          filename: `${safeFileName(title || 'obhajoba')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'landscape',
          },
        })
        .from(element)
        .save();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Export do PDF zlyhal.';

      setError(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ModuleLayout>
      {activeProfile && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100">
          Prezentácia sa pripraví podľa aktívneho profilu práce:{' '}
          <strong>{activeProfile.title || 'Bez názvu'}</strong>
          {activeProfile.topic ? ` — ${activeProfile.topic}` : ''}
        </div>
      )}

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Názov práce
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Názov záverečnej práce"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Stručný obsah práce
        </div>

        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={8}
          placeholder="Vlož abstrakt, cieľ práce, metodológiu alebo stručný opis práce..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Typ obhajoby
        </div>

        <select
          value={defenseType}
          onChange={(event) => setDefenseType(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 outline-none focus:border-purple-500"
        >
          <option>Bakalárska</option>
          <option>Diplomová</option>
          <option>Seminárna</option>
          <option>Dizertačná</option>
          <option>Projektová</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={generateDefense}
    disabled={loading}
    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <Presentation size={20} />
    {loading ? 'Vytváram prezentáciu...' : 'Vytvoriť prezentáciu'}
  </button>

  <button
    type="button"
    onClick={exportPptx}
    disabled={!slides.length || exporting}
    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Export PowerPoint
  </button>

  <button
    type="button"
    onClick={exportPdf}
    disabled={!slides.length || exporting}
    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
  >
    Export PDF
  </button>
</div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      {slides.length > 0 && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-white/10 bg-[#0f1324] p-6">
            <h3 className="mb-2 text-2xl font-black">
              Náhľad prezentácie
            </h3>
            <p className="text-sm text-gray-400">
              Táto prezentácia sa exportuje do PowerPointu aj PDF.
            </p>
          </div>

          <div id="defense-pdf-export" className="space-y-6 bg-white p-6 text-black">
            <div className="rounded-2xl border border-gray-300 bg-white p-8">
              <div className="text-sm uppercase tracking-wide text-purple-700">
                {defenseType} obhajoba
              </div>
              <h1 className="mt-4 text-4xl font-black">{title}</h1>
              <p className="mt-4 text-lg text-gray-700">
                Prezentácia pripravená systémom ZEDPERA
              </p>
            </div>

            {slides.map((slide, index) => (
              <div
                key={`${slide.title}-${index}`}
                className="rounded-2xl border border-gray-300 bg-white p-8"
              >
                <div className="mb-3 text-sm font-bold text-purple-700">
                  Slide {index + 1}
                </div>

                <h2 className="mb-5 text-3xl font-black">{slide.title}</h2>

                <ul className="space-y-3 text-lg">
                  {slide.bullets.map((bullet, bulletIndex) => (
                    <li key={`${bullet}-${bulletIndex}`} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {slide.speakerNotes && (
                  <div className="mt-6 rounded-xl bg-gray-100 p-4 text-sm text-gray-700">
                    <strong>Poznámky k prezentovaniu:</strong>{' '}
                    {slide.speakerNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function TranslateModule() {
  return (
    <ModuleLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Z jazyka"
          options={[
            'Automaticky',
            'Slovenčina',
            'Čeština',
            'Angličtina',
            'Nemčina',
            'Poľština',
            'Maďarčina',
          ]}
        />

        <Select
          label="Do jazyka"
          options={[
            'Slovenčina',
            'Čeština',
            'Angličtina',
            'Nemčina',
            'Poľština',
            'Maďarčina',
          ]}
        />
      </div>

      <Select
        label="Štýl prekladu"
        options={[
          'Akademický',
          'Odborný',
          'Jednoduchý',
          'Formálny',
          'Doslovný',
        ]}
      />

      <Textarea
        label="Text na preklad"
        placeholder="Vlož text, ktorý chceš preložiť..."
      />

      <ActionButton icon={Languages} label="Preložiť text" />
    </ModuleLayout>
  );
}

function AnalysisModule() {
  return (
    <ModuleLayout>
      <Textarea
        label="Dáta alebo tabuľka"
        placeholder="Vlož údaje, výsledky výskumu alebo popis dát..."
      />

      <Select
        label="Typ analýzy"
        options={[
          'Opisná štatistika',
          'Korelácia',
          'Interpretácia výsledkov',
          'Grafické odporúčania',
        ]}
      />

      <ActionButton icon={BarChart3} label="Analyzovať dáta" />
    </ModuleLayout>
  );
}

function PlanningModule() {
  return (
    <ModuleLayout>
      <Input label="Termín odovzdania" placeholder="Napr. 30. 6. 2026" />

      <Select
        label="Typ plánu"
        options={[
          'Denný plán',
          'Týždenný plán',
          'Plán kapitol',
          'Plán výskumu',
        ]}
      />

      <Textarea
        label="Aktuálny stav práce"
        placeholder="Napíš, čo už máš hotové a čo ešte chýba..."
      />

      <ActionButton icon={CalendarDays} label="Vytvoriť plán práce" />
    </ModuleLayout>
  );
}

function EmailModule() {
  return (
    <ModuleLayout>
      <Select
        label="Typ emailu"
        options={[
          'Email vedúcemu',
          'Žiadosť o konzultáciu',
          'Odovzdanie kapitoly',
          'Ospravedlnenie',
          'Formálny email',
        ]}
      />

      <Input
        label="Komu"
        placeholder="Napr. vedúci práce, školiteľ, konzultant"
      />

      <Textarea
        label="Obsah / požiadavka"
        placeholder="Napíš, čo má email obsahovať..."
      />

      <ActionButton icon={Mail} label="Vygenerovať email" />
    </ModuleLayout>
  );
}

function PlagiarismModule() {
  return (
    <ModuleLayout>
      <Textarea
        label="Text na kontrolu originality"
        placeholder="Vlož text, ktorý chceš preveriť..."
      />

      <Select
        label="Typ kontroly"
        options={[
          'Orientačná kontrola',
          'Parafrázovanie',
          'Rizikové pasáže',
          'Odporúčania na úpravu',
        ]}
      />

      <ActionButton icon={ShieldCheck} label="Skontrolovať originalitu" />
    </ModuleLayout>
  );
}

// =====================================================
// UI HELPERS
// =====================================================

function ModuleLayout({ children }: { children: ReactNode }) {
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
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90"
    >
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
    <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/5 p-8">
      <h2 className="mb-3 text-3xl font-black">{title}</h2>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

function getModeTitle(mode: Mode) {
  const titles: Record<Mode, string> = {
    write: 'AI Chat',
    sources: 'Zdroje',
    supervisor: 'AI vedúci',
    audit: 'Audit kvality',
    defense: 'Obhajoba',
    translate: 'Preklad',
    analysis: 'Analýza dát',
    planning: 'Plánovanie',
    email: 'Emaily',
    plagiarism: 'Plagiátorstvo',
  };

  return titles[mode];
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