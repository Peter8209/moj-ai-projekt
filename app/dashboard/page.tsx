'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
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
  Paperclip,
  Plus,
  Presentation,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
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
{ mode: 'plagiarism', title: 'Originalita práce', icon: ShieldCheck },
] as const;

const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
];

const FILE_INPUT_ACCEPT = SUPPORTED_FILE_EXTENSIONS.join(',');

const MAX_UPLOAD_FILES = 10;
const MAX_UPLOAD_FILE_SIZE_MB = 25;
const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;

type AttachedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  extension: string;
};

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function isSupportedFile(file: File) {
  const extension = getFileExtension(file.name);
  return SUPPORTED_FILE_EXTENSIONS.includes(extension);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getFileTypeLabel(extension: string) {
  if (extension === '.pdf') return 'PDF';
  if (['.doc', '.docx', '.odt', '.rtf', '.txt', '.md'].includes(extension)) {
    return 'Dokument';
  }
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }
  if (['.xls', '.xlsx', '.csv'].includes(extension)) {
    return 'Tabuľka';
  }
  if (['.ppt', '.pptx'].includes(extension)) {
    return 'Prezentácia';
  }

  return 'Súbor';
}


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

         {view === 'packages' && <PackagesPage subActive={subActive} />}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [chapterTitle, setChapterTitle] = useState('');
  const [outputType, setOutputType] = useState('Kapitola');
  const [assignment, setAssignment] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedForSupervisor, setSavedForSupervisor] = useState(false);
  const [error, setError] = useState('');

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [fileError, setFileError] = useState('');

  const addAttachedFiles = (files: FileList | File[]) => {
    setFileError('');

    const incomingFiles = Array.from(files);

    if (!incomingFiles.length) return;

    setAttachedFiles((currentFiles) => {
      const nextFiles = [...currentFiles];

      for (const file of incomingFiles) {
        const extension = getFileExtension(file.name);

        if (!isSupportedFile(file)) {
          setFileError(
            `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, obrázky, Excel, CSV a PowerPoint.`,
          );
          continue;
        }

        if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          setFileError(
            `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je ${MAX_UPLOAD_FILE_SIZE_MB} MB.`,
          );
          continue;
        }

        if (nextFiles.length >= MAX_UPLOAD_FILES) {
          setFileError(`Môžete priložiť maximálne ${MAX_UPLOAD_FILES} súborov.`);
          break;
        }

        const duplicate = nextFiles.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (duplicate) {
          continue;
        }

        nextFiles.push({
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extension,
        });
      }

      return nextFiles;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== id),
    );
  };

  const uploadAttachedFiles = async () => {
    if (!attachedFiles.length) {
      return [];
    }

    const formData = new FormData();

    for (const item of attachedFiles) {
      formData.append('files', item.file);
    }

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.message || data?.error || 'Nepodarilo sa nahrať priložené súbory.',
      );
    }

    return data.files || [];
  };

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
    setFileError('');
    setSavedForSupervisor(false);

    try {
      const uploadedFiles = await uploadAttachedFiles();

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
          attachments: uploadedFiles,
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

      {/* =====================================================
          PRÍLOHY / PODKLADY
      ===================================================== */}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Paperclip size={20} className="text-purple-400" />
              Priložené podklady
            </div>

            <p className="mt-1 text-sm text-gray-400">
              Klient môže nahrať viacero formátov, nielen PDF. Podporované sú
              PDF, Word, TXT, obrázky, Excel, CSV a PowerPoint.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
          >
            <UploadCloud size={18} />
            Nahrať súbory
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              addAttachedFiles(event.target.files);
            }
          }}
        />

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();

            if (event.dataTransfer.files) {
              addAttachedFiles(event.dataTransfer.files);
            }
          }}
          className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center text-sm text-gray-400"
        >
          Pretiahnite sem súbory alebo kliknite na tlačidlo „Nahrať súbory“.
          <div className="mt-2 text-xs text-gray-500">
            Maximálne {MAX_UPLOAD_FILES} súborov, každý do{' '}
            {MAX_UPLOAD_FILE_SIZE_MB} MB.
          </div>
        </div>

        {fileError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {fileError}
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            {attachedFiles.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f1324] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-xl bg-purple-600/20 px-3 py-2 text-xs font-bold text-purple-200">
                    {getFileTypeLabel(item.extension)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      {item.extension.toUpperCase()} · {formatFileSize(item.size)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachedFile(item.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                  Odstrániť
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
              event.target.value,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState('');
  const [checkType, setCheckType] = useState('Všetko');
  const [outputType, setOutputType] = useState('Detailná správa');
  const [citationStyle, setCitationStyle] = useState(
    activeProfile?.citation || 'ISO 690'
  );

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [fileError, setFileError] = useState('');

  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addAttachedFiles = (files: FileList | File[]) => {
    setFileError('');

    const incomingFiles = Array.from(files);

    if (!incomingFiles.length) return;

    setAttachedFiles((currentFiles) => {
      const nextFiles = [...currentFiles];

      for (const file of incomingFiles) {
        const extension = getFileExtension(file.name);

        if (!isSupportedFile(file)) {
          setFileError(
            `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, MD, obrázky, Excel, CSV a PowerPoint.`,
          );
          continue;
        }

        if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          setFileError(
            `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je ${MAX_UPLOAD_FILE_SIZE_MB} MB.`,
          );
          continue;
        }

        if (nextFiles.length >= MAX_UPLOAD_FILES) {
          setFileError(`Môžete priložiť maximálne ${MAX_UPLOAD_FILES} súborov.`);
          break;
        }

        const duplicate = nextFiles.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (duplicate) {
          continue;
        }

        nextFiles.push({
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extension,
        });
      }

      return nextFiles;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== id),
    );
  };

  const uploadAttachedFiles = async () => {
    if (!attachedFiles.length) {
      return [];
    }

    const formData = new FormData();

    for (const item of attachedFiles) {
      formData.append('files', item.file, item.name);
    }

    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          'Nepodarilo sa nahrať priložené súbory.',
      );
    }

    return data.files || [];
  };

  const runAudit = async () => {
    setError('');
    setFileError('');
    setResult('');

    const hasText = text.trim().length >= 300;
    const hasFiles = attachedFiles.length > 0;

    if (!hasText && !hasFiles) {
      setError(
        'Vlož aspoň 300 znakov textu alebo nahraj prílohu na audit kvality.',
      );
      return;
    }

    setLoading(true);

    try {
      const uploadedFiles = await uploadAttachedFiles();

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
          attachments: uploadedFiles,
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
          placeholder="Vlož sem kapitolu, úvod, záver alebo inú časť práce. Ak nechceš vkladať text ručne, nahraj súbor nižšie..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      {/* =====================================================
          PRÍLOHY NA AUDIT KVALITY
      ===================================================== */}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Paperclip size={20} className="text-purple-400" />
              Prílohy na audit kvality
            </div>

            <p className="mt-1 text-sm text-gray-400">
              Používateľ môže nahrať prácu alebo kapitolu priamo z počítača.
              Zedpera prílohu spracuje a použije ju pri audite kvality.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
          >
            <UploadCloud size={18} />
            Nahrať prílohu
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              addAttachedFiles(event.target.files);
            }
          }}
        />

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();

            if (event.dataTransfer.files) {
              addAttachedFiles(event.dataTransfer.files);
            }
          }}
          className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center text-sm text-gray-400"
        >
          Pretiahnite sem súbor alebo kliknite na tlačidlo „Nahrať prílohu“.
          <div className="mt-2 text-xs text-gray-500">
            Podporované formáty: PDF, Word, TXT, RTF, ODT, MD, obrázky, Excel,
            CSV a PowerPoint. Maximálne {MAX_UPLOAD_FILES} súborov, každý do{' '}
            {MAX_UPLOAD_FILE_SIZE_MB} MB.
          </div>
        </div>

        {fileError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {fileError}
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Priložené súbory na audit ({attachedFiles.length})
            </div>

            {attachedFiles.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f1324] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-xl bg-purple-600/20 px-3 py-2 text-xs font-bold text-purple-200">
                    {getFileTypeLabel(item.extension)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      {item.extension.toUpperCase()} · {formatFileSize(item.size)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachedFile(item.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                  Odstrániť
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
  const reviewFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const [reviewFiles, setReviewFiles] = useState<AttachedFile[]>([]);
  const [reviewFileError, setReviewFileError] = useState('');

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

  const addReviewFiles = (files: FileList | File[]) => {
    setReviewFileError('');

    const incomingFiles = Array.from(files);

    if (!incomingFiles.length) return;

    setReviewFiles((currentFiles) => {
      const nextFiles = [...currentFiles];

      for (const file of incomingFiles) {
        const extension = getFileExtension(file.name);

        if (!isSupportedFile(file)) {
          setReviewFileError(
            `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, obrázky, Excel, CSV a PowerPoint.`,
          );
          continue;
        }

        if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          setReviewFileError(
            `Súbor "${file.name}" je príliš veľký. Maximálna veľkosť je ${MAX_UPLOAD_FILE_SIZE_MB} MB.`,
          );
          continue;
        }

        if (nextFiles.length >= MAX_UPLOAD_FILES) {
          setReviewFileError(
            `Môžete priložiť maximálne ${MAX_UPLOAD_FILES} posudkov alebo podkladov.`,
          );
          break;
        }

        const duplicate = nextFiles.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (duplicate) {
          continue;
        }

        nextFiles.push({
          id:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          extension,
        });
      }

      return nextFiles;
    });

    if (reviewFileInputRef.current) {
      reviewFileInputRef.current.value = '';
    }
  };

  const removeReviewFile = (id: string) => {
    setReviewFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== id),
    );
  };


    const generateDefense = async () => {
    setError('');
    setReviewFileError('');
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
      const formData = new FormData();

      formData.append('title', title);
      formData.append('summary', summary);
      formData.append('defenseType', defenseType);
      formData.append('activeProfile', JSON.stringify(activeProfile || null));

      reviewFiles.forEach((item) => {
        formData.append('reviews', item.file, item.name);
      });

      const response = await fetch('/api/defense', {
        method: 'POST',
        body: formData,
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

      {/* =====================================================
          POSUDKY / PODKLADY K OBHAJOBE
      ===================================================== */}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <Paperclip size={20} className="text-purple-400" />
              Posudky k obhajobe
            </div>

            <p className="mt-1 text-sm text-gray-400">
              Nahraj posudok vedúceho, posudok oponenta alebo ďalšie podklady.
              Zedpera ich zapracuje do prezentácie, otázok, odpovedí a časti
              „reakcia na pripomienky“.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reviewFileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500"
          >
            <UploadCloud size={18} />
            Nahrať posudky
          </button>
        </div>

        <input
          ref={reviewFileInputRef}
          type="file"
          multiple
          accept={FILE_INPUT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              addReviewFiles(event.target.files);
            }
          }}
        />

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();

            if (event.dataTransfer.files) {
              addReviewFiles(event.dataTransfer.files);
            }
          }}
          className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-center text-sm text-gray-400"
        >
          Pretiahnite sem posudky alebo kliknite na tlačidlo „Nahrať posudky“.
          <div className="mt-2 text-xs text-gray-500">
            Maximálne {MAX_UPLOAD_FILES} súborov, každý do{' '}
            {MAX_UPLOAD_FILE_SIZE_MB} MB.
          </div>
        </div>

        {reviewFileError && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            {reviewFileError}
          </div>
        )}

        {reviewFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Priložené posudky ({reviewFiles.length})
            </div>

            {reviewFiles.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0f1324] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-xl bg-purple-600/20 px-3 py-2 text-xs font-bold text-purple-200">
                    {getFileTypeLabel(item.extension)}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      {item.extension.toUpperCase()} · {formatFileSize(item.size)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeReviewFile(item.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                  Odstrániť
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
  const [sourceLanguage, setSourceLanguage] = useState('Angličtina');
  const [targetLanguage, setTargetLanguage] = useState('Slovenčina');
  const [style, setStyle] = useState('Akademický');

  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const translateText = async () => {
    const text = inputText.trim();

    if (!text) {
      setError('Najprv vlož text na preklad.');
      return;
    }

    setIsTranslating(true);
    setError('');
    setCopied(false);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceLanguage,
          targetLanguage,
          style,
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Preklad sa nepodaril.');
      }

      const output = String(data.translatedText || '').trim();

      if (!output) {
        throw new Error('AI nevrátila žiadny preklad.');
      }

      setTranslatedText(output);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri preklade.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const copyResult = async () => {
    const text = translatedText.trim();

    if (!text) {
      setError('Nie je čo kopírovať. Najprv vytvor preklad.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError('');

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setError('Nepodarilo sa skopírovať preklad.');
    }
  };

  return (
    <ModuleLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-sm font-semibold text-gray-300">
            Z jazyka
          </div>

          <select
            value={sourceLanguage}
            onChange={(event) => setSourceLanguage(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
          >
            <option>Automaticky</option>
            <option>Slovenčina</option>
            <option>Čeština</option>
            <option>Angličtina</option>
            <option>Nemčina</option>
            <option>Poľština</option>
            <option>Maďarčina</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-2 text-sm font-semibold text-gray-300">
            Do jazyka
          </div>

          <select
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
          >
            <option>Slovenčina</option>
            <option>Čeština</option>
            <option>Angličtina</option>
            <option>Nemčina</option>
            <option>Poľština</option>
            <option>Maďarčina</option>
          </select>
        </label>
      </div>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Štýl prekladu
        </div>

        <select
          value={style}
          onChange={(event) => setStyle(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
        >
          <option>Akademický</option>
          <option>Odborný</option>
          <option>Jednoduchý</option>
          <option>Formálny</option>
          <option>Doslovný</option>
        </select>
      </label>

      <label className="block">
        <div className="mb-2 text-sm font-semibold text-gray-300">
          Text na preklad
        </div>

        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          rows={9}
          placeholder="Vlož text, ktorý chceš preložiť..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={translateText}
          disabled={isTranslating}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Languages size={20} />
          {isTranslating ? 'Prekladám text...' : 'Preložiť text'}
        </button>

        <button
          type="button"
          onClick={copyResult}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/15"
        >
          {copied ? 'Skopírované' : 'Skopírovať preklad'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <label className="block">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-300">
            Výsledný preklad
          </div>

          {translatedText && (
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
              Preklad pripravený
            </span>
          )}
        </div>

        <textarea
          value={translatedText}
          onChange={(event) => setTranslatedText(event.target.value)}
          rows={10}
          placeholder="Tu sa zobrazí preložený text..."
          className="w-full rounded-2xl border border-purple-500/30 bg-[#0f1324] px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>
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
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [school, setSchool] = useState('');
  const [faculty, setFaculty] = useState('');
  const [studyProgram, setStudyProgram] = useState('');
  const [supervisor, setSupervisor] = useState('');

  const [workType, setWorkType] = useState('Bakalárska práca');
  const [citationStyle, setCitationStyle] = useState('ISO 690');
  const [language, setLanguage] = useState('SK');

  const [text, setText] = useState('');
  const [agent, setAgent] = useState('gemini');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any | null>(null);

  const runOriginalityCheck = async () => {
    setError('');
    setResult(null);

    if (text.trim().length < 300) {
      setError('Vlož aspoň 300 znakov textu práce.');
      return;
    }

    setLoading(true);

    try {
      const activeRaw =
        typeof window !== 'undefined'
          ? localStorage.getItem('active_profile')
          : null;

      let activeProfile = null;

      try {
        activeProfile = activeRaw ? JSON.parse(activeRaw) : null;
      } catch {
        activeProfile = null;
      }

      const response = await fetch('/api/originality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          authorName,
          school,
          faculty,
          studyProgram,
          supervisor,
          workType,
          citationStyle,
          language,
          text,
          agent,
          activeProfile,
          profileId: activeProfile?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.message || data?.error || 'Kontrola originality zlyhala.');
      }

      setResult(data);
      setStep(5);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Neznáma chyba pri kontrole.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-6">
        <h3 className="text-2xl font-black text-white">
          Originalita práce
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-300">
          Predbežná kontrola originality v štýle univerzitného krokového postupu.
          Výsledok je orientačný a nenahrádza oficiálnu školskú kontrolu originality.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          'Nahratie práce',
          'Údaje o práci',
          'Nastavenie kontroly',
          'Spracovanie',
          'Výsledok',
        ].map((label, index) => {
          const currentStep = index + 1;

          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(currentStep)}
              className={`rounded-2xl px-3 py-3 text-sm font-bold ${
                step === currentStep
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300'
              }`}
            >
              {currentStep}. {label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-xl font-black">1. Nahratie / vloženie práce</h4>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={16}
            placeholder="Vlož sem text práce, kapitolu alebo časť záverečnej práce..."
            className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white"
            >
              Pokračovať
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-xl font-black">2. Údaje o práci</h4>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Názov práce" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Autor" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
            <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Škola / univerzita" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
            <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Fakulta" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
            <input value={studyProgram} onChange={(e) => setStudyProgram(e.target.value)} placeholder="Študijný program" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
            <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Vedúci práce" className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white" />
          </div>

          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="rounded-2xl bg-white/10 px-6 py-3 font-bold text-white">
              Späť
            </button>
            <button type="button" onClick={() => setStep(3)} className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white">
              Pokračovať
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-xl font-black">3. Nastavenie kontroly</h4>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white">
              <option>Bakalárska práca</option>
              <option>Diplomová práca</option>
              <option>Seminárna práca</option>
              <option>Dizertačná práca</option>
              <option>Rigorózna práca</option>
            </select>

            <select value={citationStyle} onChange={(e) => setCitationStyle(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white">
              <option>ISO 690</option>
              <option>APA 7</option>
              <option>Harvard</option>
              <option>MLA</option>
              <option>Chicago</option>
            </select>

            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white">
              <option>SK</option>
              <option>CZ</option>
              <option>EN</option>
              <option>DE</option>
            </select>

            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white">
              <option value="gemini">Gemini</option>
              <option value="openai">GPT</option>
              <option value="claude">Claude</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>

          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="rounded-2xl bg-white/10 px-6 py-3 font-bold text-white">
              Späť
            </button>
            <button type="button" onClick={() => setStep(4)} className="rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white">
              Pokračovať
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h4 className="mb-4 text-xl font-black">4. Spracovanie originality</h4>

          <p className="mb-4 text-sm text-gray-300">
            Systém vykoná predbežnú kontrolu originality, rizikových pasáží,
            chýbajúcich citácií a generického štýlu textu.
          </p>

          <button
            type="button"
            onClick={runOriginalityCheck}
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Kontrolujem originalitu...' : 'Spustiť kontrolu originality'}
          </button>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 5 && result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
              <div className="text-sm text-green-200">Skóre originality</div>
              <div className="mt-2 text-4xl font-black text-green-300">
                {result.originalityScore ?? '—'} %
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6">
              <div className="text-sm text-yellow-200">Riziko podobnosti</div>
              <div className="mt-2 text-4xl font-black text-yellow-300">
                {result.similarityRiskScore ?? '—'} %
              </div>
            </div>

            <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6">
              <div className="text-sm text-purple-200">AI / generický štýl</div>
              <div className="mt-2 text-4xl font-black text-purple-300">
                {result.aiStyleScore ?? '—'} %
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0f1324] p-6">
            <h4 className="mb-3 text-xl font-black">
              Protokol predbežnej kontroly originality
            </h4>

            <div className="whitespace-pre-wrap text-sm leading-7 text-gray-200">
              {result.report}
            </div>
          </div>
        </div>
      )}
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

type PackagePlan = {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  pages: string;
  works: string;
  supervisor: string;
  audit: string;
  defense: string;
  badge?: string;
  description: string;
  features: string[];
};

type AddonService = {
  id: string;
  name: string;
  price: string;
  description: string;
  disabledBeforePlan?: boolean;
};

const packagePlans: PackagePlan[] = [
  {
    id: 'week-mini',
    name: 'Týždeň MINI',
    price: '9,90 €',
    originalPrice: '14,90 €',
    period: '7 dní',
    pages: '25 strán',
    works: '1 práca',
    supervisor: '2 kontroly',
    audit: '1 audit',
    defense: 'Bez obhajoby',
    badge: 'Rýchly štart',
    description: 'Vhodné na seminárnu prácu, kapitolu alebo rýchlu úpravu textu.',
    features: [
      'Základné AI písanie',
      'Profil práce a zadania',
      'Základná spätná väzba',
      'Export textového výstupu',
    ],
  },
  {
    id: 'week-student',
    name: 'Týždeň ŠTUDENT',
    price: '19,90 €',
    originalPrice: '24,90 €',
    period: '7 dní',
    pages: '50 strán',
    works: '2 práce',
    supervisor: '5 kontrol',
    audit: '2 audity',
    defense: 'Bez obhajoby',
    badge: 'Najlepšie na skúšku',
    description: 'Vhodné na seminárku, ročníkovú prácu alebo väčšiu kapitolu.',
    features: [
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality textu',
      'Zdroje a citácie',
    ],
  },
  {
    id: 'week-pro',
    name: 'Týždeň PRO',
    price: '29,90 €',
    originalPrice: '39,90 €',
    period: '7 dní',
    pages: '100 strán',
    works: '3 práce',
    supervisor: '10 kontrol',
    audit: '4 audity',
    defense: '1 obhajoba',
    badge: 'Pred odovzdaním',
    description: 'Pre študenta, ktorý potrebuje intenzívne pracovať pred odovzdaním.',
    features: [
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality',
      'Obhajoba + otázky',
      'Prezentácia k obhajobe',
    ],
  },
  {
    id: 'month-start',
    name: 'Mesačný START',
    price: '39,90 €',
    originalPrice: '40 €',
    period: '1 mesiac',
    pages: '150 strán',
    works: '5 prác',
    supervisor: '15 kontrol',
    audit: '5 auditov',
    defense: '1 obhajoba',
    badge: 'Hlavný balík',
    description: 'Základný hlavný plán pre priebežnú prácu počas mesiaca.',
    features: [
      '150 strán mesačne',
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality',
      'Obhajoba a prezentácia',
      'Plánovanie a emaily',
    ],
  },
  {
    id: 'three-months',
    name: '3 mesiace ŠTUDENT',
    price: '79,90 €',
    originalPrice: '70 €',
    period: '3 mesiace',
    pages: '350 strán',
    works: '10 prác',
    supervisor: '35 kontrol',
    audit: '12 auditov',
    defense: '3 obhajoby',
    badge: 'Najvýhodnejší',
    description: 'Najlepší pomer ceny a výkonu pre bakalársku alebo diplomovú prácu.',
    features: [
      '350 strán na 3 mesiace',
      'AI písanie a zdroje',
      'AI vedúci práce',
      'Audit kvality',
      '3 obhajoby',
      'Dlhšie plánovanie práce',
    ],
  },
  {
    id: 'year-pro',
    name: 'Ročný PRO',
    price: '299 €',
    originalPrice: '240 €',
    period: '12 mesiacov',
    pages: '1 500 strán',
    works: 'Neobmedzené projekty',
    supervisor: '150 kontrol',
    audit: '50 auditov',
    defense: '10 obhajôb',
    badge: 'Dlhodobé používanie',
    description: 'Ročný balík pre študentov, konzultantov alebo intenzívne používanie.',
    features: [
      '1 500 strán ročne',
      'Všetky hlavné moduly',
      'AI vedúci práce',
      'Audit kvality',
      '10 obhajôb',
      'Vhodné na celý akademický rok',
    ],
  },
  {
    id: 'year-max',
    name: 'Ročný MAX',
    price: '399 €',
    period: '12 mesiacov',
    pages: '2 000 strán',
    works: 'Neobmedzené projekty',
    supervisor: '250 kontrol',
    audit: '80 auditov',
    defense: '15 obhajôb',
    badge: 'Prémiový plán',
    description: 'Pre náročných používateľov, ktorí chcú vyššie limity a prémiové moduly.',
    features: [
      '2 000 strán ročne',
      'Vyššie limity',
      'Prémiové AI modely podľa dostupnosti',
      '15 obhajôb',
      'Rozšírený audit',
      'Vhodné aj pre mentoring',
    ],
  },
];

const addonServices: AddonService[] = [
  {
    id: 'ai-supervisor',
    name: 'AI vedúci práce',
    price: '29,90 €',
    description: 'Detailná spätná väzba do 100 strán.',
    disabledBeforePlan: true,
  },
  {
    id: 'quality-audit',
    name: 'Kontrola kvality práce',
    price: '29,90 €',
    description: 'Audit logiky, metodológie, argumentácie a štruktúry.',
    disabledBeforePlan: true,
  },
  {
    id: 'defense-presentation',
    name: 'Obhajoba + prezentácia',
    price: '39,90 €',
    description: 'Prezentácia, otázky komisie a návrhy odpovedí.',
    disabledBeforePlan: true,
  },
  {
    id: 'plagiarism',
    name: 'Kontrola originality',
    price: '12 €',
    description: 'Orientačný report originality a rizikových pasáží.',
    disabledBeforePlan: true,
  },
  {
    id: 'extra-50',
    name: 'Extra 50 strán',
    price: '9,90 €',
    description: 'Doplnenie limitu o 50 strán.',
    disabledBeforePlan: true,
  },
  {
    id: 'extra-100',
    name: 'Extra 100 strán',
    price: '19,90 €',
    description: 'Doplnenie limitu o 100 strán.',
    disabledBeforePlan: true,
  },
  {
    id: 'premium-model',
    name: 'Prémiový model Claude/Grok',
    price: '9,90 €',
    description: 'Kvalitnejšia kritika, audit a odborné hodnotenie.',
    disabledBeforePlan: true,
  },
  {
    id: 'express',
    name: 'Expresné spracovanie',
    price: '19,90 €',
    description: 'Prednostné spracovanie požiadaviek.',
    disabledBeforePlan: true,
  },
];

function PackagesPage({ subActive }: { subActive: boolean }) {
  const [selectedPlan, setSelectedPlan] = useState<string>('month-start');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const selectedPlanData =
    packagePlans.find((plan) => plan.id === selectedPlan) || packagePlans[0];

  const toggleAddon = (addonId: string) => {
    if (!subActive) return;

    setSelectedAddons((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  };

  const createPaymentUrl = () => {
    const params = new URLSearchParams();

    params.set('plan', selectedPlanData.id);
    params.set('planName', selectedPlanData.name);
    params.set('price', selectedPlanData.price);

    if (selectedAddons.length > 0) {
      params.set('addons', selectedAddons.join(','));
    }

    return `/api/checkout?${params.toString()}`;
  };

  const selectedAddonData = addonServices.filter((addon) =>
    selectedAddons.includes(addon.id),
  );

  const slovakiaEmailSubject = encodeURIComponent(
    'Zedpera – žiadosť o akademický mentoring Slovensko',
  );

  const slovakiaEmailBody = encodeURIComponent(
    `Dobrý deň,

mám záujem o pomoc od akademického pracovníka / reálneho experta cez Zedpera.

Krajina: Slovensko
Zvolený balík v Zedpera: ${selectedPlanData.name} (${selectedPlanData.price})
Rozsah: ${selectedPlanData.pages}
Typ práce:
Názov práce:
Termín:
Požiadavka:

Ďakujem.`,
  );

  const czechEmailSubject = encodeURIComponent(
    'Zedpera – žiadosť o akademický mentoring Česko',
  );

  const czechEmailBody = encodeURIComponent(
    `Dobrý deň,

mám záujem o pomoc od akademického pracovníka / reálneho experta cez Zedpera.

Krajina: Česko
Zvolený balík v Zedpera: ${selectedPlanData.name} (${selectedPlanData.price})
Rozsah: ${selectedPlanData.pages}
Typ práce:
Názov práce:
Termín:
Požiadavka:

Ďakujem.`,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section>
        <div className="mb-8">
          <h2 className="text-4xl font-black text-white">
            Balíčky a doplnky
          </h2>

          <p className="mt-3 text-lg text-gray-400">
            Najprv si aktivuj plán, potom si môžeš dokúpiť doplnky.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {packagePlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative flex min-h-[360px] flex-col rounded-3xl border p-6 text-left transition ${
                  isSelected
                    ? 'border-purple-400 bg-purple-600/15 shadow-2xl shadow-purple-950/40'
                    : 'border-white/10 bg-white/5 hover:border-purple-400/50 hover:bg-white/10'
                }`}
              >
                {plan.badge && (
                  <div className="mb-4 w-fit rounded-full bg-purple-600/30 px-3 py-1 text-xs font-black uppercase tracking-wide text-purple-100">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {plan.name}
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300">
                      Vybrané
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-end gap-3">
                  <div className="text-4xl font-black text-white">
                    {plan.price}
                  </div>

                  {plan.originalPrice && (
                    <div className="pb-1 text-sm text-gray-500 line-through">
                      {plan.originalPrice}
                    </div>
                  )}
                </div>

                <div className="mt-1 text-sm text-gray-400">
                  {plan.period}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-black/20 p-3">
                    <div className="text-gray-500">Limit</div>
                    <div className="font-bold text-white">{plan.pages}</div>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-3">
                    <div className="text-gray-500">Práce</div>
                    <div className="font-bold text-white">{plan.works}</div>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-3">
                    <div className="text-gray-500">AI vedúci</div>
                    <div className="font-bold text-white">{plan.supervisor}</div>
                  </div>

                  <div className="rounded-2xl bg-black/20 p-3">
                    <div className="text-gray-500">Audit</div>
                    <div className="font-bold text-white">{plan.audit}</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-black/20 p-3 text-sm">
                  <div className="text-gray-500">Obhajoba</div>
                  <div className="font-bold text-white">{plan.defense}</div>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#050816] p-6">
        <div className="mb-5">
          <h3 className="text-2xl font-black text-white">
            Doplnkové služby
          </h3>

          {!subActive ? (
            <p className="mt-2 text-sm font-semibold text-red-300">
              Najprv musíš zakúpiť základný plán.
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-400">
              Doplnky si môžeš pridať k aktívnemu plánu.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addonServices.map((addon) => {
            const selected = selectedAddons.includes(addon.id);
            const disabled = addon.disabledBeforePlan && !subActive;

            return (
              <button
                key={addon.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleAddon(addon.id)}
                className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition ${
                  disabled
                    ? 'cursor-not-allowed border-white/10 bg-white/[0.03] opacity-45'
                    : selected
                      ? 'border-purple-400 bg-purple-600/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-white">
                    {addon.name}
                  </div>

                  <div className="mt-1 text-sm text-gray-400">
                    {addon.description}
                  </div>
                </div>

                <div className="shrink-0 text-xl font-black text-white">
                  {addon.price}
                </div>
              </button>
            );
          })}
        </div>

        {selectedAddonData.length > 0 && (
          <div className="mt-5 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-100">
            Vybrané doplnky:{' '}
            <strong>
              {selectedAddonData.map((addon) => addon.name).join(', ')}
            </strong>
          </div>
        )}

        <a
          href={createPaymentUrl()}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 text-center text-lg font-black text-white transition hover:opacity-90"
        >
          Pokračovať na platbu
        </a>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-white">
              Akademický pracovník + mentoring
            </h3>

            <p className="mt-2 text-gray-400">
              Potrebuješ pomoc od reálneho experta? Pošli požiadavku podľa krajiny.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-gray-500">Slovensko</div>
                <div className="mt-1 font-bold text-white">
                  info@zaverecneprace.sk
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-gray-500">Česko</div>
                <div className="mt-1 font-bold text-white">
                  info@zaverecneprace.cz
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <a
              href={`mailto:info@zaverecneprace.sk?subject=${slovakiaEmailSubject}&body=${slovakiaEmailBody}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-500"
            >
              <Mail size={18} />
              Slovensko
            </a>

            <a
              href={`mailto:info@zaverecneprace.cz?subject=${czechEmailSubject}&body=${czechEmailBody}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500"
            >
              <Mail size={18} />
              Česko
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-sm leading-6 text-yellow-100">
        <strong>Poznámka k limitom:</strong> Limity strán sú orientačné a
        zahŕňajú AI písanie, audit, prácu s profilom, obhajobu, plánovanie,
        emaily a pomocné výstupy. Pri náročných alebo opakovaných požiadavkách
        môže byť spotreba vyššia.
      </section>
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
    plagiarism: 'Predbežná kontrola originality, citácií a rizikových pasáží.',
  };

  return descriptions[mode];
}