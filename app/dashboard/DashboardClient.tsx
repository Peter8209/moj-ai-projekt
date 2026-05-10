'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Mail,
  Plus,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';

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
  | 'video'
  | 'admin-users'
  | 'admin-payments'
  | 'admin-plans';

type UserRole = 'admin' | 'user' | 'guest';

type DashboardUser = {
  name: string;
  email: string;
  role: UserRole;
  plan: string;
  isLoggedIn: boolean;
};

const featureCards = [
  { mode: 'write', title: 'AI Chat', icon: Bot },
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

type Mode = (typeof featureCards)[number]['mode'];

type SavedTextOutput = {
  id?: string;
  title?: string;
  text?: string;
  content?: string;
  output?: string;
  score?: number;
  aiScore?: number;
  createdAt?: string;
  savedAt?: string;
};

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
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  sourcesRequirement?: string;

  keywords?: string[];
  keywordsList?: string[];

  savedAt?: string;
  created_at?: string;
  updated_at?: string;

  work_language?: string;
  research_questions?: string;
  practical_part?: string;
  scientific_contribution?: string;
  sources_requirement?: string;
  keywords_list?: string[];
};

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

// =====================================================
// PACKAGES DATA
// =====================================================

const packagePlans: PackagePlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0 €',
    period: 'Limitovaný prístup',
    pages: 'Ukážka',
    works: '1 práca',
    supervisor: 'Ukážka',
    audit: 'Ukážka',
    defense: 'Nie',
    badge: 'Štart',
    description: 'Vhodné na základné vyskúšanie aplikácie.',
    features: [
      'Základný vstup do aplikácie',
      'Ukážka AI písania',
      'Ukážka profilu práce',
    ],
  },
  {
    id: 'month',
    name: 'Mesačný balík',
    price: '40 €',
    originalPrice: '49 €',
    period: '1 mesiac',
    pages: '150 strán',
    works: '5 prác',
    supervisor: '15 kontrol',
    audit: '5 auditov',
    defense: '1 obhajoba',
    badge: 'Hlavný balík',
    description: 'Základný hlavný plán pre priebežnú prácu počas mesiaca.',
    features: [
      'AI písanie práce',
      'AI vedúci práce',
      'Audit kvality',
      'Obhajoba a prezentácia',
    ],
  },
  {
    id: 'quarter',
    name: '3 mesiace',
    price: '70 €',
    originalPrice: '120 €',
    period: '3 mesiace',
    pages: '350 strán',
    works: '10 prác',
    supervisor: '35 kontrol',
    audit: '12 auditov',
    defense: '3 obhajoby',
    badge: 'Najvýhodnejší',
    description:
      'Najlepší pomer ceny a výkonu pre bakalársku alebo diplomovú prácu.',
    features: [
      'AI písanie a zdroje',
      'AI vedúci práce',
      'Audit kvality',
      '3 obhajoby',
    ],
  },
  {
    id: 'year',
    name: 'Ročný PRO',
    price: '240 €',
    originalPrice: '480 €',
    period: '12 mesiacov',
    pages: '1 500 strán',
    works: 'Neobmedzené projekty',
    supervisor: '150 kontrol',
    audit: '50 auditov',
    defense: '10 obhajôb',
    badge: 'Dlhodobé používanie',
    description: 'Ročný balík pre intenzívne používanie.',
    features: [
      'Všetky hlavné moduly',
      'AI vedúci práce',
      'Audit kvality',
      '10 obhajôb',
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
];

// =====================================================
// LOCAL STORAGE HELPERS
// =====================================================

function safeParseLocalStorageArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseLocalStorageObject<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function useClientSearchParams() {
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setParams(new URLSearchParams(window.location.search));
  }, []);

  return params;
}

function getAverageAiScore(outputs: SavedTextOutput[]) {
  const scores = outputs
    .map((item) => Number(item.aiScore ?? item.score))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (scores.length === 0) return 0;

  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;

  return Math.round(Math.max(0, Math.min(100, average)));
}

// =====================================================
// PAGE WRAPPER
// =====================================================

export default function DashboardClient() {
  return <DashboardPage />;
}

// =====================================================
// MAIN DASHBOARD PAGE
// =====================================================

function DashboardPage() {
  const searchParams = useClientSearchParams();

  const [view, setView] = useState<View>('dashboard');
  const [mode, setMode] = useState<Mode>('write');

  const [user, setUser] = useState<DashboardUser>({
    name: '',
    email: '',
    role: 'guest',
    plan: '',
    isLoggedIn: false,
  });

  const [subActive, setSubActive] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(
    null,
  );

  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!searchParams) return;

    const isLoggedIn = localStorage.getItem('zedpera_is_logged_in');
    const email = localStorage.getItem('zedpera_user_email') || '';
    const name = localStorage.getItem('zedpera_user_name') || '';
    const role =
      (localStorage.getItem('zedpera_user_role') as UserRole) || 'guest';

    const plan =
      localStorage.getItem('zedpera_user_plan') ||
      localStorage.getItem('zedpera_selected_plan') ||
      'free';

    const adminFree = localStorage.getItem('zedpera_admin_free');

    if (searchParams.get('mode') === 'admin-free') {
      localStorage.setItem('zedpera_is_logged_in', 'true');
      localStorage.setItem('zedpera_user_role', 'admin');
      localStorage.setItem('zedpera_user_plan', 'admin-free');
      localStorage.setItem('zedpera_admin_free', 'true');

      setUser({
        name: name || 'Admin',
        email: email || 'admin@zedpera.com',
        role: 'admin',
        plan: 'admin-free',
        isLoggedIn: true,
      });

      setSubActive(true);
      return;
    }

    if (isLoggedIn !== 'true') {
      window.location.href = '/login';
      return;
    }

    const finalRole: UserRole =
      role === 'admin' || adminFree === 'true' ? 'admin' : 'user';

    const finalPlan =
      finalRole === 'admin'
        ? 'admin-free'
        : searchParams.get('plan') || plan || 'free';

    setUser({
      name: name || email || 'Používateľ',
      email,
      role: finalRole,
      plan: finalPlan,
      isLoggedIn: true,
    });

    setSubActive(finalRole === 'admin' || finalPlan !== 'free');
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof document === 'undefined') return;
    if (!searchParams) return;

    const paymentSuccess =
      searchParams.get('payment') === 'success' ||
      searchParams.get('success') === 'true' ||
      searchParams.get('success') === '1';

    const paidPlan = searchParams.get('plan');

    if (paymentSuccess) {
      document.cookie = 'sub_active=1; path=/';
      localStorage.setItem('zedpera_is_logged_in', 'true');

      if (paidPlan) {
        localStorage.setItem('zedpera_user_plan', paidPlan);
        localStorage.setItem('zedpera_selected_plan', paidPlan);
      }

      setSubActive(true);

      setUser((current) => ({
        ...current,
        plan: paidPlan || current.plan || 'paid',
        isLoggedIn: true,
      }));
    }

    if (document.cookie.includes('sub_active=1')) {
      setSubActive(true);
    }
  }, [searchParams]);

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
          : profile.keywordsList || profile.keywords_list || [],
      workLanguage:
        profile.workLanguage || profile.work_language || profile.language,
      researchQuestions:
        profile.researchQuestions || profile.research_questions,
      practicalPart: profile.practicalPart || profile.practical_part,
      scientificContribution:
        profile.scientificContribution || profile.scientific_contribution,
      sourcesRequirement:
        profile.sourcesRequirement || profile.sources_requirement,
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
          normalizeProfile(item),
        );

        setProfiles(normalizedList);

        if (active?.id) {
          const found = normalizedList.find(
            (item: SavedProfile) => item.id === active.id,
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

  const openNewProfileForm = () => {
    setEditingProfile(null);
    setShowProfileForm(true);
  };

  const openEditProfileForm = (profile: SavedProfile) => {
    setEditingProfile(profile);
    setShowProfileForm(true);
  };

  const handleProfileSave = (data: SavedProfile) => {
    if (typeof window === 'undefined') return;

    const payload = normalizeProfile({
      ...data,
      id: data.id || editingProfile?.id || Date.now().toString(),
      savedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let oldList: SavedProfile[] = [];

    try {
      const raw = localStorage.getItem('profiles_full');
      const parsed = raw ? JSON.parse(raw) : [];
      oldList = Array.isArray(parsed) ? parsed : [];
    } catch {
      oldList = [];
    }

    const exists = oldList.some(
      (item: SavedProfile) => item.id === payload.id,
    );

    const newList = exists
      ? oldList.map((item: SavedProfile) =>
          item.id === payload.id ? payload : item,
        )
      : [payload, ...oldList];

    localStorage.setItem('profiles_full', JSON.stringify(newList));
    localStorage.setItem('active_profile', JSON.stringify(payload));
    localStorage.setItem('profile', JSON.stringify(payload));

    setProfiles(newList);
    setActiveProfile(payload);

    setEditingProfile(null);
    setShowProfileForm(false);
    setView('profile');
  };

  const closeProfileFormAndRefresh = () => {
    setShowProfileForm(false);
    setEditingProfile(null);
    loadProfiles();
  };

  const logout = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('zedpera_is_logged_in');
    localStorage.removeItem('zedpera_user_email');
    localStorage.removeItem('zedpera_user_name');
    localStorage.removeItem('zedpera_user_role');
    localStorage.removeItem('zedpera_user_plan');
    localStorage.removeItem('zedpera_selected_plan');
    localStorage.removeItem('zedpera_admin_free');

    document.cookie = 'sub_active=; Max-Age=0; path=/';

    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        {view !== 'dashboard' && (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
            >
              ← Návrat do menu
            </button>
          </div>
        )}

        {view === 'dashboard' && (
          <Dashboard
            setView={setView}
            setMode={setMode}
            user={user}
          />
        )}

        {view === 'chat' && (
          <Chat mode={mode} setMode={setMode} activeProfile={activeProfile} />
        )}

        {view === 'profile' && (
          <ProfileView
            profile={activeProfile}
            profiles={profiles}
            setActiveProfile={(profile) => {
              setActiveProfile(profile);

              if (typeof window !== 'undefined') {
                localStorage.setItem('active_profile', JSON.stringify(profile));
              }
            }}
            openForm={openNewProfileForm}
            openEditForm={openEditProfileForm}
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
          <SettingsPage user={user} subActive={subActive} logout={logout} />
        )}

        {view === 'admin-users' && (
          <AdminPlaceholder
            title="Admin: Používatelia"
            text="Tu neskôr doplníš správu používateľov, ich rolí, balíkov a prístupov."
          />
        )}

        {view === 'admin-payments' && (
          <AdminPlaceholder
            title="Admin: Platby"
            text="Tu neskôr doplníš prehľad platieb, objednávok, faktúr a Stripe transakcií."
          />
        )}

        {view === 'admin-plans' && (
          <AdminPlaceholder
            title="Admin: Balíčky"
            text="Tu neskôr doplníš správu cien, promo akcií, doplnkov a limitov."
          />
        )}
      </div>

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
              className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-[#020617] shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#020617]/95 px-6 py-5 backdrop-blur">
                <div>
                  <h2 className="text-2xl font-black">
                    {editingProfile ? 'Upraviť profil práce' : 'Nová práca'}
                  </h2>

                  <p className="text-sm text-gray-400">
                    {editingProfile
                      ? 'Uprav uložený profil práce.'
                      : 'Vyplň základné údaje, akademický profil a kľúčové slová.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeProfileFormAndRefresh}
                  className="rounded-xl bg-white/10 p-2 text-gray-300 transition hover:bg-white/20 hover:text-white"
                  aria-label="Zavrieť"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6">
                <NewWorkForm
                  onSave={handleProfileSave}
                  initialProfile={editingProfile}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// DASHBOARD MENU
// =====================================================

function Dashboard({
  setView,
  setMode,
  user,
}: {
  setView: (v: View) => void;
  setMode: (m: Mode) => void;
  user: DashboardUser;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DashboardStats />

      <section>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-black text-white">Moduly aplikácie</h3>
            <p className="mt-1 text-sm text-gray-400">
              Vyber modul, s ktorým chceš pracovať.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition hover:-translate-y-1 hover:border-purple-400/50 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-950/20"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 transition group-hover:bg-purple-600 group-hover:text-white">
                  <Icon size={28} />
                </div>

                <div className="text-lg font-black">{feature.title}</div>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {getModeDescription(feature.mode)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {user.role === 'admin' && (
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-6">
          <div className="mb-5">
            <h3 className="text-2xl font-black text-emerald-200">
              Admin centrum
            </h3>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              Máš admin free prístup. Tu môžeš neskôr doplniť správu
              používateľov, balíkov, platieb a obsahu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <AdminQuickCard
              title="Používatelia"
              text="Správa účtov, rolí a prístupov."
              onClick={() => setView('admin-users')}
            />

            <AdminQuickCard
              title="Platby"
              text="Kontrola objednávok a Stripe transakcií."
              onClick={() => setView('admin-payments')}
            />

            <AdminQuickCard
              title="Balíčky"
              text="Ceny, promo akcie a doplnkové služby."
              onClick={() => setView('admin-plans')}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function AdminQuickCard({
  title,
  text,
  onClick,
}: {
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-emerald-500/20 bg-black/20 p-5 text-left transition hover:bg-emerald-500/10"
    >
      <div className="text-lg font-black text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-emerald-100/70">{text}</p>
    </button>
  );
}

// =====================================================
// DASHBOARD STATS
// =====================================================

function DashboardStats() {
  const [projectsCount, setProjectsCount] = useState(0);
  const [textsCount, setTextsCount] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  const loadStats = () => {
    const profilesFull =
      safeParseLocalStorageArray<SavedProfile>('profiles_full');

    const profiles = safeParseLocalStorageArray<SavedProfile>('profiles');
    const profile = safeParseLocalStorageObject<SavedProfile>('profile');
    const activeProfile =
      safeParseLocalStorageObject<SavedProfile>('active_profile');

    const allProfiles = [
      ...profilesFull,
      ...profiles,
      ...(profile ? [profile] : []),
      ...(activeProfile ? [activeProfile] : []),
    ];

    const uniqueProfiles = new Map<string, SavedProfile>();

    allProfiles.forEach((item, index) => {
      const key =
        item.id ||
        item.title ||
        item.topic ||
        item.savedAt ||
        `profile-${index}`;

      uniqueProfiles.set(key, item);
    });

    const generatedTexts =
      safeParseLocalStorageArray<SavedTextOutput>('generated_texts');

    const chatHistory =
      safeParseLocalStorageArray<SavedTextOutput>('chat_history');

    const savedOutputs =
      safeParseLocalStorageArray<SavedTextOutput>('saved_outputs');

    const texts = safeParseLocalStorageArray<SavedTextOutput>('texts');
    const outputs = safeParseLocalStorageArray<SavedTextOutput>('outputs');

    const latestGeneratedText =
      typeof window !== 'undefined'
        ? localStorage.getItem('latest_generated_work_text')
        : null;

    const textOutputs = [
      ...generatedTexts,
      ...chatHistory,
      ...savedOutputs,
      ...texts,
      ...outputs,
      ...(latestGeneratedText?.trim()
        ? [
            {
              id: 'latest_generated_work_text',
              text: latestGeneratedText,
            },
          ]
        : []),
    ];

    setProjectsCount(uniqueProfiles.size);
    setTextsCount(textOutputs.length);
    setAiScore(getAverageAiScore(textOutputs));
  };

  useEffect(() => {
    loadStats();

    const onStorage = () => loadStats();
    const onFocus = () => loadStats();

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const stats = [
    {
      title: 'Moje práce',
      value: projectsCount,
      suffix: '',
      description: 'Počet vytvorených alebo uložených profilov práce.',
      icon: BookOpen,
    },
    {
      title: 'Texty',
      value: textsCount,
      suffix: '',
      description: 'Počet uložených alebo spracovaných textových výstupov.',
      icon: FileText,
    },
    {
      title: 'Celkové AI skóre',
      value: aiScore,
      suffix: '%',
      description: 'Priemerné skóre z uložených AI hodnotení.',
      icon: Sparkles,
    },
  ];

  return (
    <section className="mx-auto w-full">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.075] to-white/[0.035] p-7 shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-purple-400/50 hover:shadow-purple-950/30"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-600/10 blur-3xl transition group-hover:bg-purple-500/20" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/20 transition group-hover:bg-purple-600 group-hover:text-white">
                  <Icon size={28} />
                </div>

                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Live
                </span>
              </div>

              <div className="relative mt-7">
                <h3 className="text-lg font-black text-slate-100">
                  {item.title}
                </h3>

                <div className="mt-4 text-5xl font-black tracking-tight text-white">
                  {item.value}
                  {item.suffix}
                </div>

                <p className="mt-5 max-w-[260px] text-sm leading-7 text-slate-400">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
  openEditForm,
}: {
  profile: SavedProfile | null;
  profiles: SavedProfile[];
  setActiveProfile: (p: SavedProfile) => void;
  openForm: () => void;
  openEditForm: (p: SavedProfile) => void;
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
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-bold text-white"
        >
          + Vytvoriť profil práce
        </button>
      </div>
    );
  }

  const keywords =
    profile.keywords && profile.keywords.length > 0
      ? profile.keywords
      : profile.keywordsList || profile.keywords_list || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black">Profil práce</h2>
          <p className="text-gray-400">
            Tu sú údaje z uloženého profilu práce.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => openEditForm(profile)}
            className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 font-bold text-white"
          >
            Upraviť profil
          </button>

          <button
            type="button"
            onClick={openForm}
            className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
          >
            + Nová práca
          </button>
        </div>
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
          value={
            profile.workLanguage || profile.work_language || profile.language
          }
        />

        <ProfileCard label="Citovanie" value={profile.citation} />
        <ProfileCard label="Vedúci práce" value={profile.supervisor} />

        <ProfileCard label="Téma" value={profile.topic} large />
        <ProfileCard label="Odbor" value={profile.field} />
        <ProfileCard label="Anotácia" value={profile.annotation} large />
        <ProfileCard label="Cieľ práce" value={profile.goal} large />
        <ProfileCard label="Výskumný problém" value={profile.problem} large />
        <ProfileCard label="Metodológia" value={profile.methodology} large />
        <ProfileCard label="Hypotézy" value={profile.hypotheses} large />

        <ProfileCard
          label="Výskumné otázky"
          value={profile.researchQuestions || profile.research_questions}
          large
        />

        <ProfileCard
          label="Praktická časť"
          value={profile.practicalPart || profile.practical_part}
          large
        />

        <ProfileCard
          label="Vedecký / odborný prínos"
          value={
            profile.scientificContribution ||
            profile.scientific_contribution
          }
          large
        />

        <ProfileCard
          label="Požiadavky na zdroje"
          value={profile.sourcesRequirement || profile.sources_requirement}
          large
        />
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
// NEW WORK FORM
// =====================================================

function NewWorkForm({
  onSave,
  initialProfile,
}: {
  onSave: (data: SavedProfile) => void;
  initialProfile?: SavedProfile | null;
}) {
  const [type, setType] = useState(initialProfile?.type || 'Bakalárska práca');
  const [level, setLevel] = useState(
    initialProfile?.level || 'Vysokoškolská práca',
  );
  const [title, setTitle] = useState(initialProfile?.title || '');
  const [topic, setTopic] = useState(initialProfile?.topic || '');
  const [field, setField] = useState(initialProfile?.field || '');
  const [supervisor, setSupervisor] = useState(
    initialProfile?.supervisor || '',
  );
  const [citation, setCitation] = useState(
    initialProfile?.citation || 'ISO 690',
  );
  const [workLanguage, setWorkLanguage] = useState(
    initialProfile?.workLanguage ||
      initialProfile?.work_language ||
      initialProfile?.language ||
      'Slovenčina',
  );

  const [annotation, setAnnotation] = useState(
    initialProfile?.annotation || '',
  );
  const [goal, setGoal] = useState(initialProfile?.goal || '');
  const [problem, setProblem] = useState(initialProfile?.problem || '');
  const [methodology, setMethodology] = useState(
    initialProfile?.methodology || '',
  );
  const [hypotheses, setHypotheses] = useState(
    initialProfile?.hypotheses || '',
  );

  const [researchQuestions, setResearchQuestions] = useState(
    initialProfile?.researchQuestions ||
      initialProfile?.research_questions ||
      '',
  );

  const [practicalPart, setPracticalPart] = useState(
    initialProfile?.practicalPart || initialProfile?.practical_part || '',
  );

  const [scientificContribution, setScientificContribution] = useState(
    initialProfile?.scientificContribution ||
      initialProfile?.scientific_contribution ||
      '',
  );

  const [sourcesRequirement, setSourcesRequirement] = useState(
    initialProfile?.sourcesRequirement ||
      initialProfile?.sources_requirement ||
      '',
  );

  const [keywordsText, setKeywordsText] = useState(
    initialProfile?.keywords?.join(', ') ||
      initialProfile?.keywordsList?.join(', ') ||
      initialProfile?.keywords_list?.join(', ') ||
      '',
  );

  const [error, setError] = useState('');

  const parseKeywords = (value: string) => {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const submitForm = () => {
    setError('');

    if (!title.trim()) {
      setError('Vyplň názov práce.');
      return;
    }

    if (!topic.trim()) {
      setError('Vyplň tému práce.');
      return;
    }

    if (!goal.trim()) {
      setError('Vyplň cieľ práce.');
      return;
    }

    const keywords = parseKeywords(keywordsText);

    const payload: SavedProfile = {
      id: initialProfile?.id || Date.now().toString(),

      type,
      level,
      title: title.trim(),
      topic: topic.trim(),
      field: field.trim(),
      supervisor: supervisor.trim(),
      citation,
      language: workLanguage,
      workLanguage,

      annotation: annotation.trim(),
      goal: goal.trim(),
      problem: problem.trim(),
      methodology: methodology.trim(),
      hypotheses: hypotheses.trim(),
      researchQuestions: researchQuestions.trim(),
      practicalPart: practicalPart.trim(),
      scientificContribution: scientificContribution.trim(),
      sourcesRequirement: sourcesRequirement.trim(),

      keywords,
      keywordsList: keywords,

      work_language: workLanguage,
      research_questions: researchQuestions.trim(),
      practical_part: practicalPart.trim(),
      scientific_contribution: scientificContribution.trim(),
      sources_requirement: sourcesRequirement.trim(),
      keywords_list: keywords,

      savedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(payload);
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white">
            1. Základné údaje práce
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Tieto údaje sa budú používať pri písaní, audite, obhajobe, zdrojoch
            a AI vedúcom práce.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SelectField
            label="Typ práce"
            value={type}
            onChange={setType}
            options={[
              'Seminárna práca',
              'Ročníková práca',
              'Bakalárska práca',
              'Diplomová práca',
              'Dizertačná práca',
              'Rigorózna práca',
              'Projektová práca',
              'Esej',
              'Odborný článok',
            ]}
          />

          <SelectField
            label="Úroveň práce"
            value={level}
            onChange={setLevel}
            options={[
              'Stredoškolská práca',
              'Vysokoškolská práca',
              'Bakalársky stupeň',
              'Magisterský / inžiniersky stupeň',
              'Doktorandský stupeň',
              'Odborná / firemná práca',
            ]}
          />

          <InputField
            label="Názov práce"
            value={title}
            onChange={setTitle}
            placeholder="Napr. Využitie umelej inteligencie vo vzdelávaní"
            wide
          />

          <TextareaField
            label="Téma práce"
            value={topic}
            onChange={setTopic}
            placeholder="Stručne popíš tému práce..."
            rows={4}
            wide
          />

          <InputField
            label="Odbor / oblasť"
            value={field}
            onChange={setField}
            placeholder="Napr. manažment, pedagogika, IT, ekonomika..."
          />

          <InputField
            label="Vedúci práce"
            value={supervisor}
            onChange={setSupervisor}
            placeholder="Meno vedúceho práce"
          />

          <SelectField
            label="Citačná norma"
            value={citation}
            onChange={setCitation}
            options={[
              'ISO 690',
              'APA',
              'APA 7',
              'Harvard',
              'MLA',
              'Chicago',
              'Vancouver',
            ]}
          />

          <SelectField
            label="Jazyk práce"
            value={workLanguage}
            onChange={setWorkLanguage}
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
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white">
            2. Akademický profil práce
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Čím presnejšie údaje vyplníš, tým lepšie bude AI písať,
            kontrolovať a odporúčať zdroje.
          </p>
        </div>

        <div className="space-y-5">
          <TextareaField
            label="Anotácia / stručný opis práce"
            value={annotation}
            onChange={setAnnotation}
            placeholder="Stručne vysvetli, čomu sa práca venuje..."
            rows={5}
          />

          <TextareaField
            label="Cieľ práce"
            value={goal}
            onChange={setGoal}
            placeholder="Napr. Cieľom práce je analyzovať..."
            rows={4}
          />

          <TextareaField
            label="Výskumný problém"
            value={problem}
            onChange={setProblem}
            placeholder="Aký problém práca rieši?"
            rows={4}
          />

          <TextareaField
            label="Metodológia"
            value={methodology}
            onChange={setMethodology}
            placeholder="Popíš metódy, výskumný súbor, dotazník, rozhovory, analýzu dát..."
            rows={5}
          />

          <TextareaField
            label="Hypotézy"
            value={hypotheses}
            onChange={setHypotheses}
            placeholder="Napr. H1: Existuje štatisticky významný vzťah..."
            rows={4}
          />

          <TextareaField
            label="Výskumné otázky"
            value={researchQuestions}
            onChange={setResearchQuestions}
            placeholder="Napr. VO1: Ako respondenti vnímajú..."
            rows={4}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white">
            3. Praktická časť, prínos a zdroje
          </h3>
        </div>

        <div className="space-y-5">
          <TextareaField
            label="Praktická časť"
            value={practicalPart}
            onChange={setPracticalPart}
            placeholder="Popíš, čo bude obsahovať praktická časť práce..."
            rows={5}
          />

          <TextareaField
            label="Vedecký / odborný prínos"
            value={scientificContribution}
            onChange={setScientificContribution}
            placeholder="Aký prínos má práca pre odbor, prax alebo organizáciu?"
            rows={4}
          />

          <TextareaField
            label="Požiadavky na zdroje"
            value={sourcesRequirement}
            onChange={setSourcesRequirement}
            placeholder="Napr. používať zdroje z posledných 5 rokov, zahraničné články, open-access PDF..."
            rows={4}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <h3 className="text-2xl font-black text-white">4. Kľúčové slová</h3>
          <p className="mt-2 text-sm text-gray-400">
            Slová oddeľ čiarkou. Použijú sa pri vyhľadávaní zdrojov a
            generovaní textu.
          </p>
        </div>

        <InputField
          label="Kľúčové slová"
          value={keywordsText}
          onChange={setKeywordsText}
          placeholder="napr. umelá inteligencia, vzdelávanie, LLM, personalizované učenie"
        />

        {parseKeywords(keywordsText).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {parseKeywords(keywordsText).map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-full bg-purple-600/30 px-3 py-1 text-sm text-purple-100"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 z-10 rounded-3xl border border-white/10 bg-[#020617]/95 p-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-400">
            Po uložení sa profil nastaví ako aktívny a použije sa v AI písaní,
            zdrojoch, audite aj obhajobe.
          </div>

          <button
            type="button"
            onClick={submitForm}
            className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white transition hover:opacity-90"
          >
            Uložiť prácu
          </button>
        </div>
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
        {mode === 'supervisor' && (
          <SupervisorModule activeProfile={activeProfile} />
        )}
        {mode === 'audit' && <AuditModule activeProfile={activeProfile} />}
        {mode === 'defense' && <DefenseModule activeProfile={activeProfile} />}
        {mode === 'translate' && <TranslateModule />}
        {mode === 'analysis' && <AnalysisModule activeProfile={activeProfile} />}
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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {featureCards.map((feature) => {
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
        })}
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

  const minAssignmentLength = 100;
  const assignmentLength = assignment.trim().length;

  const generateText = async () => {
    setError('');
    setSavedForSupervisor(false);

    if (assignment.trim().length < minAssignmentLength) {
      setError(
        `Zadanie pre AI je príliš krátke. Doplň aspoň ${minAssignmentLength} znakov.`,
      );
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const text = String(data?.text || data?.result || '').trim();

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
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri generovaní textu.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const saveForSupervisor = () => {
    const cleanText = generatedText.trim();

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

  return (
    <ModuleLayout>
      {!activeProfile && (
        <Notice type="warning">
          Profil práce zatiaľ nie je vytvorený. Text sa dá generovať aj bez
          profilu, ale výsledok bude menej presný.
        </Notice>
      )}

      <InputField
        label="Názov kapitoly"
        value={chapterTitle}
        onChange={setChapterTitle}
        placeholder="Napr. Teoretické východiská práce"
      />

      <SelectField
        label="Typ výstupu"
        value={outputType}
        onChange={setOutputType}
        options={[
          'Úvod',
          'Kapitola',
          'Podkapitola',
          'Záver',
          'Abstrakt',
          'Anotácia',
        ]}
      />

      <label className="block">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-gray-300">
            Zadanie pre AI
          </div>

          <div
            className={`rounded-full px-3 py-1 text-xs font-black ${
              assignmentLength >= minAssignmentLength
                ? 'bg-green-500/10 text-green-300'
                : 'bg-yellow-500/10 text-yellow-300'
            }`}
          >
            {assignmentLength}/{minAssignmentLength} znakov
          </div>
        </div>

        <textarea
          value={assignment}
          onChange={(event) => setAssignment(event.target.value)}
          rows={8}
          placeholder="Popíš, čo má AI napísať. Uveď rozsah, štýl, obsah a požiadavky..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateText}
          disabled={isGenerating || assignmentLength < minAssignmentLength}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText size={20} />
          {isGenerating
            ? 'Generujem text...'
            : assignmentLength < minAssignmentLength
              ? `Doplň zadanie (${assignmentLength}/${minAssignmentLength})`
              : 'Generovať text'}
        </button>

        <button
          type="button"
          onClick={saveForSupervisor}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold transition hover:bg-white/15"
        >
          Uložiť pre AI vedúceho
        </button>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      {savedForSupervisor && (
        <Notice type="success">Text bol uložený pre AI vedúceho práce.</Notice>
      )}

      <TextareaField
        label="Vygenerovaný text"
        value={generatedText}
        onChange={(value) => {
          setGeneratedText(value);
          localStorage.setItem('latest_generated_work_text', value);
        }}
        rows={16}
        placeholder="Tu sa zobrazí vygenerovaný text z AI..."
      />
    </ModuleLayout>
  );
}

function SourcesModule() {
  return (
    <ModuleLayout>
      <Input
        label="Téma vyhľadávania"
        placeholder="Napr. inkluzívne vzdelávanie"
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
          options={['Všetko', 'Len PDF', 'Open Access', 'Články', 'Štúdie']}
        />

        <Select label="Jazyk" options={['EN', 'SK', 'CZ', 'DE']} />
      </div>

      <ActionButton icon={Search} label="Vyhľadať zdroje" />
    </ModuleLayout>
  );
}

function SupervisorModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const currentYear = new Date().getFullYear();

  const [text, setText] = useState(() => {
    if (typeof window === 'undefined') return '';

    return localStorage.getItem('latest_generated_work_text') || '';
  });

  const [reviewType, setReviewType] = useState('Komplexná kontrola');
  const [strictness, setStrictness] = useState('Prísny, ale vecný vedúci');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minLength = 300;
  const textLength = text.trim().length;

  const supervisorRules = [
    `Aktuálny rok je ${currentYear}.`,
    `Rok 2025 ani ${currentYear} sa nesmie označiť ako budúcnosť.`,
    `Ako „zdroj z budúcnosti“ označ iba rok vyšší ako ${currentYear}.`,
    'Kontroluj rozpory medzi anotáciou, abstraktom, výsledkami a záverom.',
    'Hodnoť metodológiu, hypotézy, tabuľky, interpretáciu a citácie.',
    'Buď kritický, ale profesionálny a nepíš nepravdivé upozornenia.',
  ];

  const runSupervisorReview = async () => {
    setError('');
    setResult('');

    if (text.trim().length < minLength) {
      setError(`Vlož aspoň ${minLength} znakov textu na kontrolu.`);
      return;
    }

    setLoading(true);

    const systemInstruction = `
Si AI vedúci záverečnej práce.

Aktuálny rok je ${currentYear}.

DÔLEŽITÉ PRAVIDLO PRE CITÁCIE A ROKY:
- Nikdy neoznačuj rok 2025 ako budúcnosť.
- Nikdy neoznačuj rok ${currentYear} ako budúcnosť.
- Za zdroj z budúcnosti označ iba rok vyšší ako ${currentYear}.
- Ak zdroj obsahuje rok 2025 alebo ${currentYear}, môže byť platný.
- Pri zdrojoch z rokov 2025 a ${currentYear} môžeš odporučiť overenie iba vtedy, ak sú neúplné, chýbajú v literatúre alebo pôsobia vymyslene.
- Nepíš vetu typu „keďže je rok ${currentYear}, rok 2025 je nemožný“.

ÚLOHA:
Poskytni odbornú spätnú väzbu ako vedúci práce.
Buď kritický, ale vecný.
Hľadaj rozpory v texte, metodológii, výsledkoch, citáciách, tabuľkách a interpretácii.
Ak nájdeš problém, vysvetli ho presne a navrhni opravu.

Výstup štruktúruj:
1. Celkové hodnotenie
2. Silné stránky
3. Slabé miesta
4. Rozpory v texte
5. Metodológia a výsledky
6. Citácie a zdroje
7. Konkrétne odporúčania
8. Otázky vedúceho práce
9. Skóre kvality
10. Priorita opráv
`.trim();

    try {
      const response = await fetch('/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          reviewType,
          strictness,
          activeProfile,
          currentYear,
          systemInstruction,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'AI vedúci momentálne nevrátil hodnotenie.',
        );
      }

      const output = String(data.result || data.text || data.output || '').trim();

      if (!output) {
        throw new Error('AI vedúci nevrátil žiadny text.');
      }

      setResult(output);
      localStorage.setItem('latest_supervisor_review', output);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri kontrole AI vedúcim.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLatestText = () => {
    if (typeof window === 'undefined') return;

    const latest = localStorage.getItem('latest_generated_work_text') || '';

    if (!latest.trim()) {
      setError('Nenašiel som uložený text z AI chatu.');
      return;
    }

    setText(latest);
    setError('');
  };

  return (
    <ModuleLayout>
      <section className="overflow-hidden rounded-[32px] border border-purple-500/25 bg-[#050816] shadow-2xl shadow-black/30">
        <div className="relative border-b border-white/10 bg-gradient-to-br from-[#12071f] via-[#070a16] to-[#020617] p-6 md:p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/30">
                <GraduationCap size={32} />
              </div>

              <div>
                <div className="mb-3 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-purple-200">
                  Akademický konzultant
                </div>

                <h3 className="text-3xl font-black tracking-tight text-white">
                  AI vedúci práce
                </h3>

                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">
                  Vlož text práce a získaj odbornú spätnú väzbu k logike,
                  metodológii, argumentácii, citáciám, výsledkom a celkovej
                  pripravenosti práce na odovzdanie.
                </p>

                {activeProfile && (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Aktívna práca
                        </div>
                        <div className="mt-1 line-clamp-2 font-black text-white">
                          {activeProfile.title || 'Bez názvu'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Typ práce
                        </div>
                        <div className="mt-1 font-black text-white">
                          {activeProfile.type || 'Neurčené'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Citovanie
                        </div>
                        <div className="mt-1 font-black text-white">
                          {activeProfile.citation || 'Neurčené'}
                        </div>
                      </div>
                    </div>

                    {activeProfile.topic && (
                      <div className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
                        <span className="font-bold text-purple-200">
                          Téma:
                        </span>{' '}
                        {activeProfile.topic}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full shrink-0 rounded-3xl border border-white/10 bg-white/[0.04] p-5 xl:w-[390px]">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <div className="font-black text-white">Kontrolné pravidlá</div>
              </div>

              <div className="space-y-3">
                {supervisorRules.map((rule) => (
                  <div
                    key={rule}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#020617] p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-3">
            <SelectField
              label="Typ kontroly"
              value={reviewType}
              onChange={setReviewType}
              options={[
                'Komplexná kontrola',
                'Kontrola metodológie',
                'Kontrola výsledkov',
                'Kontrola citácií',
                'Kontrola logiky a argumentácie',
                'Príprava na konzultáciu',
              ]}
            />

            <SelectField
              label="Štýl spätnej väzby"
              value={strictness}
              onChange={setStrictness}
              options={[
                'Prísny, ale vecný vedúci',
                'Konštruktívny konzultant',
                'Veľmi detailná odborná kontrola',
                'Krátke prioritné odporúčania',
              ]}
            />

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadLatestText}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                Načítať posledný text z AI chatu
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-300">
                  Text práce na kontrolu
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    textLength >= minLength
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-yellow-500/10 text-yellow-300'
                  }`}
                >
                  {textLength}/{minLength} znakov
                </div>
              </div>

              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={18}
                placeholder="Vlož sem kapitolu, abstrakt, výsledky alebo celú časť práce..."
                className="w-full rounded-3xl border border-white/10 bg-[#0b1020] px-5 py-5 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-purple-500"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSupervisorReview}
              disabled={loading || textLength < minLength}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <GraduationCap size={20} />
              {loading
                ? 'AI vedúci kontroluje text...'
                : textLength < minLength
                  ? `Doplň text (${textLength}/${minLength})`
                  : 'Spustiť kontrolu AI vedúcim'}
            </button>

            <button
              type="button"
              onClick={() => {
                setText('');
                setResult('');
                setError('');
              }}
              className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/15"
            >
              Vyčistiť
            </button>
          </div>

          {error && (
            <div className="mt-5">
              <Notice type="error">{error}</Notice>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-[28px] border border-purple-500/25 bg-[#080d1d] p-6 shadow-2xl shadow-purple-950/20">
              <div className="mb-4 flex items-center gap-3">
                <GraduationCap className="h-6 w-6 text-purple-300" />
                <h4 className="text-xl font-black text-white">
                  Hodnotenie AI vedúceho práce
                </h4>
              </div>

              <div className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-black/25 p-5 text-sm leading-7 text-slate-200">
                {result}
              </div>
            </div>
          )}
        </div>
      </section>
    </ModuleLayout>
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
    activeProfile?.citation || 'ISO 690',
  );
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAudit = async () => {
    setError('');
    setResult('');

    if (text.trim().length < 300) {
      setError('Vlož aspoň 300 znakov textu na audit kvality.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri audite kvality.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      <TextareaField
        label="Text na audit kvality"
        value={text}
        onChange={setText}
        rows={12}
        placeholder="Vlož sem kapitolu, úvod, záver alebo inú časť práce..."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectField
          label="Kontrola"
          value={checkType}
          onChange={setCheckType}
          options={[
            'Všetko',
            'Logika',
            'Metodológia',
            'Argumentácia',
            'Štylistika',
            'Citácie',
            'Štruktúra práce',
          ]}
        />

        <SelectField
          label="Výstup"
          value={outputType}
          onChange={setOutputType}
          options={[
            'Detailná správa',
            'Bodové hodnotenie',
            'Odporúčania',
            'Prísna kritika',
          ]}
        />

        <SelectField
          label="Citačná norma"
          value={citationStyle}
          onChange={setCitationStyle}
          options={['ISO 690', 'APA', 'APA 7', 'Harvard', 'MLA', 'Chicago']}
        />
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

      {error && <Notice type="error">{error}</Notice>}

      {result && <ResultBox title="Výsledok auditu kvality" text={result} />}
    </ModuleLayout>
  );
}

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
      '',
  );
  const [defenseType, setDefenseType] = useState('Bakalárska');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeProfile) return;

    setTitle(activeProfile.title || '');
    setSummary(
      activeProfile.annotation ||
        activeProfile.goal ||
        activeProfile.topic ||
        '',
    );

    if (activeProfile.type) {
      setDefenseType(activeProfile.type);
    }
  }, [activeProfile]);

  const generateDefense = async () => {
    setError('');
    setResult('');

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, defenseType, activeProfile }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || 'Nepodarilo sa pripraviť obhajobu.');
      }

      setResult(data.result || JSON.stringify(data.slides || [], null, 2));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri príprave obhajoby.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      <InputField
        label="Názov práce"
        value={title}
        onChange={setTitle}
        placeholder="Názov záverečnej práce"
      />

      <TextareaField
        label="Stručný obsah práce"
        value={summary}
        onChange={setSummary}
        rows={8}
        placeholder="Vlož abstrakt, cieľ práce, metodológiu alebo stručný opis práce..."
      />

      <SelectField
        label="Typ obhajoby"
        value={defenseType}
        onChange={setDefenseType}
        options={[
          'Bakalárska',
          'Diplomová',
          'Seminárna',
          'Dizertačná',
          'Projektová',
        ]}
      />

      <button
        type="button"
        onClick={generateDefense}
        disabled={loading}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Presentation size={20} />
        {loading ? 'Vytváram obhajobu...' : 'Vytvoriť obhajobu'}
      </button>

      {error && <Notice type="error">{error}</Notice>}

      {result && <ResultBox title="Výsledok obhajoby" text={result} />}
    </ModuleLayout>
  );
}

function TranslateModule() {
  const [sourceLanguage, setSourceLanguage] = useState('Angličtina');
  const [targetLanguage, setTargetLanguage] = useState('Slovenčina');
  const [style, setStyle] = useState('Akademický');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');

  const translateText = async () => {
    const text = inputText.trim();

    if (!text) {
      setError('Najprv vlož text na preklad.');
      return;
    }

    setIsTranslating(true);
    setError('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceLanguage, targetLanguage, style, text }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Preklad sa nepodaril.');
      }

      setTranslatedText(String(data.translatedText || '').trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Neznáma chyba pri preklade.',
      );
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <ModuleLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          label="Z jazyka"
          value={sourceLanguage}
          onChange={setSourceLanguage}
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

        <SelectField
          label="Do jazyka"
          value={targetLanguage}
          onChange={setTargetLanguage}
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

      <SelectField
        label="Štýl prekladu"
        value={style}
        onChange={setStyle}
        options={['Akademický', 'Odborný', 'Jednoduchý', 'Formálny', 'Doslovný']}
      />

      <TextareaField
        label="Text na preklad"
        value={inputText}
        onChange={setInputText}
        rows={9}
        placeholder="Vlož text, ktorý chceš preložiť..."
      />

      <button
        type="button"
        onClick={translateText}
        disabled={isTranslating}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Languages size={20} />
        {isTranslating ? 'Prekladám text...' : 'Preložiť text'}
      </button>

      {error && <Notice type="error">{error}</Notice>}

      <TextareaField
        label="Výsledný preklad"
        value={translatedText}
        onChange={setTranslatedText}
        rows={10}
        placeholder="Tu sa zobrazí preložený text..."
      />
    </ModuleLayout>
  );
}

function AnalysisModule({
  activeProfile,
}: {
  activeProfile: SavedProfile | null;
}) {
  const [analysisGoal, setAnalysisGoal] = useState(activeProfile?.goal || '');
  const [dataDescription, setDataDescription] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    setError('');
    setResult('');

    if (!analysisGoal.trim()) {
      setError('Doplň cieľ práce alebo cieľ analytickej časti.');
      return;
    }

    if (dataDescription.trim().length < 30) {
      setError('Vlož opis dát aspoň v rozsahu 30 znakov.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisGoal, dataDescription, activeProfile }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || 'Analýza dát zlyhala.');
      }

      setResult(data.result || '');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri analýze dát.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      <Notice type="info">
        Modul je pripravený pre JASP, SPSS, Excel, CSV alebo ručný opis dát.
      </Notice>

      <TextareaField
        label="Cieľ práce / cieľ analytickej časti"
        value={analysisGoal}
        onChange={setAnalysisGoal}
        rows={4}
        placeholder="Napr. Cieľom práce je zistiť vzťah medzi..."
      />

      <TextareaField
        label="Opis dát alebo výsledkov"
        value={dataDescription}
        onChange={setDataDescription}
        rows={8}
        placeholder="Popíš premenné, tabuľky, hypotézy, výpočty alebo sem vlož výstupy..."
      />

      <button
        type="button"
        onClick={runAnalysis}
        disabled={loading}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <BarChart3 size={20} />
        {loading ? 'Analyzujem výsledky...' : 'Analyzovať dáta'}
      </button>

      {error && <Notice type="error">{error}</Notice>}

      {result && <ResultBox title="Text do analytickej časti" text={result} />}
    </ModuleLayout>
  );
}

function PlanningModule() {
  const [deadline, setDeadline] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [planType, setPlanType] = useState('Týždenný plán');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createPlan = async () => {
    setError('');
    setResult('');

    if (!deadline.trim()) {
      setError('Zadaj termín odovzdania práce.');
      return;
    }

    if (currentState.trim().length < 20) {
      setError('Napíš aktuálny stav práce aspoň v rozsahu 20 znakov.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline, currentState, planType }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || 'Nepodarilo sa vytvoriť plán práce.');
      }

      setResult(data.plan || '');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Neznáma chyba pri vytváraní plánu práce.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModuleLayout>
      <InputField
        label="Termín odovzdania"
        value={deadline}
        onChange={setDeadline}
        placeholder="Napr. 30. 6. 2026"
      />

      <SelectField
        label="Typ plánu"
        value={planType}
        onChange={setPlanType}
        options={[
          'Denný plán',
          'Týždenný plán',
          'Mesačný plán',
          'Plán kapitol',
          'Plán výskumu',
          'Plán pred obhajobou',
        ]}
      />

      <TextareaField
        label="Aktuálny stav práce"
        value={currentState}
        onChange={setCurrentState}
        rows={8}
        placeholder="Napíš, čo už máš hotové a čo ešte chýba..."
      />

      <button
        type="button"
        onClick={createPlan}
        disabled={loading}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CalendarDays size={20} />
        {loading ? 'Vytváram plán...' : 'Vytvoriť plán práce'}
      </button>

      {error && <Notice type="error">{error}</Notice>}

      {result && <ResultBox title="Výsledný plán práce" text={result} />}
    </ModuleLayout>
  );
}

function EmailModule() {
  const [emailType, setEmailType] = useState('Email vedúcemu');
  const [recipient, setRecipient] = useState('Vedúci práce');
  const [request, setRequest] = useState('');
  const [tone, setTone] = useState('Profesionálny a slušný');
  const [language, setLanguage] = useState('Slovenčina');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const buildPrompt = () => {
    return `
Vytvor hotový email.

Jazyk: ${language}
Typ emailu: ${emailType}
Komu: ${recipient}
Tón: ${tone}

Požiadavka používateľa:
${request}

Formát:
Predmet:
...

Text emailu:
...
`.trim();
  };

  const copyPrompt = async () => {
    setError('');
    setCopied(false);

    if (request.trim().length < 10) {
      setError('Napíš požiadavku pre email aspoň v rozsahu 10 znakov.');
      return;
    }

    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch {
      setError('Nepodarilo sa skopírovať zadanie.');
    }
  };

  return (
    <ModuleLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField
          label="Typ emailu"
          value={emailType}
          onChange={setEmailType}
          options={[
            'Email vedúcemu',
            'Žiadosť o konzultáciu',
            'Odovzdanie kapitoly',
            'Žiadosť o kontrolu osnovy',
            'Žiadosť o posúdenie témy',
            'Ospravedlnenie',
            'Formálny email škole',
          ]}
        />

        <InputField
          label="Komu"
          value={recipient}
          onChange={setRecipient}
          placeholder="Napr. vedúci práce, školiteľ, konzultant"
        />

        <SelectField
          label="Tón emailu"
          value={tone}
          onChange={setTone}
          options={[
            'Profesionálny a slušný',
            'Veľmi formálny',
            'Krátky a vecný',
            'Úctivý akademický',
          ]}
        />

        <SelectField
          label="Jazyk emailu"
          value={language}
          onChange={setLanguage}
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

      <TextareaField
        label="Obsah / požiadavka"
        value={request}
        onChange={setRequest}
        rows={7}
        placeholder="Napr. Chcem sa opýtať vedúceho, či môžem poslať prvú kapitolu..."
      />

      <button
        type="button"
        onClick={copyPrompt}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold transition hover:opacity-90"
      >
        <Mail size={20} />
        {copied ? 'Zadanie skopírované' : 'Skopírovať zadanie'}
      </button>

      {error && <Notice type="error">{error}</Notice>}
      {copied && <Notice type="success">Zadanie bolo skopírované.</Notice>}
    </ModuleLayout>
  );
}

function PlagiarismModule() {
  const [text, setText] = useState('');
  const [workType, setWorkType] = useState('Bakalárska práca');
  const [citationStyle, setCitationStyle] = useState('ISO 690');
  const [language, setLanguage] = useState('SK');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runOriginalityCheck = async () => {
    setError('');
    setResult(null);

    if (text.trim().length < 300) {
      setError('Vlož aspoň 300 znakov textu.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/originality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, workType, citationStyle, language }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.message || data?.error || 'Kontrola zlyhala.');
      }

      setResult(data);
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
      <Notice type="info">
        Predbežná kontrola originality je orientačná a nenahrádza oficiálnu
        školskú kontrolu originality.
      </Notice>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SelectField
          label="Typ práce"
          value={workType}
          onChange={setWorkType}
          options={[
            'Bakalárska práca',
            'Diplomová práca',
            'Seminárna práca',
            'Dizertačná práca',
            'Rigorózna práca',
          ]}
        />

        <SelectField
          label="Citačná norma"
          value={citationStyle}
          onChange={setCitationStyle}
          options={['ISO 690', 'APA 7', 'Harvard', 'MLA', 'Chicago']}
        />

        <SelectField
          label="Jazyk"
          value={language}
          onChange={setLanguage}
          options={['SK', 'CZ', 'EN', 'DE']}
        />
      </div>

      <TextareaField
        label="Text práce"
        value={text}
        onChange={setText}
        rows={16}
        placeholder="Vlož sem text práce, kapitolu alebo časť záverečnej práce..."
      />

      <button
        type="button"
        onClick={runOriginalityCheck}
        disabled={loading}
        className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Kontrolujem originalitu...' : 'Spustiť kontrolu originality'}
      </button>

      {error && <Notice type="error">{error}</Notice>}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <ScoreCard
              label="Skóre originality"
              value={String(result.originalityScore ?? '—')}
              suffix="%"
            />
            <ScoreCard
              label="Riziko podobnosti"
              value={String(result.similarityRiskScore ?? '—')}
              suffix="%"
            />
            <ScoreCard
              label="Autentickosť textu"
              value={String(result.authenticityScore ?? '—')}
              suffix="%"
            />
          </div>

          <ResultBox
            title="Protokol predbežnej kontroly originality"
            text={
              typeof result.report === 'string'
                ? result.report
                : JSON.stringify(result, null, 2)
            }
          />
        </div>
      )}
    </ModuleLayout>
  );
}

// =====================================================
// PACKAGES
// =====================================================

function PackagesPage({ subActive }: { subActive: boolean }) {
  const [selectedPlan, setSelectedPlan] = useState<string>('month');
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

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <section>
        <div className="mb-8">
          <h2 className="text-4xl font-black text-white">Balíčky a doplnky</h2>

          <p className="mt-3 text-lg text-gray-400">
            Najprv si aktivuj plán, potom si môžeš dokúpiť doplnky.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
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

                <h3 className="text-2xl font-black text-white">{plan.name}</h3>

                <p className="mt-2 text-sm text-gray-400">
                  {plan.description}
                </p>

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

                <div className="mt-1 text-sm text-gray-400">{plan.period}</div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <PackageStat label="Limit" value={plan.pages} />
                  <PackageStat label="Práce" value={plan.works} />
                  <PackageStat label="AI vedúci" value={plan.supervisor} />
                  <PackageStat label="Audit" value={plan.audit} />
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
          <h3 className="text-2xl font-black text-white">Doplnkové služby</h3>

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
    </div>
  );
}

function PackageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-gray-500">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}

// =====================================================
// SETTINGS / ADMIN / SIMPLE PAGES
// =====================================================

function SettingsPage({
  user,
  subActive,
  logout,
}: {
  user: DashboardUser;
  subActive: boolean;
  logout: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-3xl font-black">Nastavenia účtu</h2>
        <p className="mt-2 text-gray-400">
          Základné nastavenia používateľa, balíka a prístupu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Meno" value={user.name || 'Nezadané'} />
        <InfoCard label="E-mail" value={user.email || 'Nezadaný'} />
        <InfoCard label="Rola" value={user.role} />
        <InfoCard label="Balík" value={user.plan || 'free'} />
        <InfoCard
          label="Stav predplatného"
          value={subActive ? 'Aktívne' : 'Free'}
        />
      </div>

      <button
        type="button"
        onClick={logout}
        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 font-bold text-red-200 transition hover:bg-red-500/20"
      >
        Odhlásiť sa
      </button>
    </div>
  );
}

function AdminPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-8">
        <div className="mb-3 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-300">
          Admin sekcia
        </div>

        <h2 className="text-4xl font-black text-white">{title}</h2>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-100/80">
          {text}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Stav" value="Pripravené" />
        <InfoCard label="Napojenie" value="Supabase / Stripe" />
        <InfoCard label="Režim" value="Admin free" />
      </div>
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
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
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

      <select className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500">
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

function InputField({
  label,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  wide,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? 'md:col-span-2' : ''}`}>
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-gray-300">{label}</div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-[#0f1324] px-4 py-4 text-white outline-none focus:border-purple-500"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Notice({
  type,
  children,
}: {
  type: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
}) {
  const styles: Record<'info' | 'success' | 'warning' | 'error', string> = {
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    success: 'border-green-500/30 bg-green-500/10 text-green-100',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
  };

  return (
    <div className={`rounded-2xl border p-4 text-sm leading-6 ${styles[type]}`}>
      {children}
    </div>
  );
}

function ResultBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1324] p-6">
      <div className="mb-3 text-lg font-black text-white">{title}</div>

      <div className="whitespace-pre-wrap text-sm leading-7 text-gray-200">
        {text}
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6">
      <div className="text-sm text-purple-200">{label}</div>

      <div className="mt-2 text-4xl font-black text-purple-300">
        {value}
        {suffix}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

// =====================================================
// TEXT HELPERS
// =====================================================

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