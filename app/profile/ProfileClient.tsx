'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  PlayCircle,
  Save,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/components/LanguageProvider';
import type { AppLanguage } from '@/lib/i18n';

type CitationStyle = 'apa7' | 'iso690' | 'stn_iso690' | 'chicago';

type ProfileData = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    country: string | null;
    currency: string | null;
    plan: string | null;
    video_tutorial_seen: boolean | null;
    created_at: string;
  } | null;
};

type WorkProfile = {
  id: string;

  title: string;
  topic: string;
  type: string;
  level: string;
  field: string;
  specialization: string;
  supervisor: string;

  interfaceLanguage: AppLanguage;
  workLanguage: AppLanguage;
  citationStyle: CitationStyle;

  annotation: string;
  goal: string;
  researchProblem: string;
  methodology: string;
  hypotheses: string;
  researchQuestions: string;
  practicalPart: string;
  scientificContribution: string;
  sourcesRequirement: string;

  structure: string;
  requiredSections: string;
  recommendedLength: string;
  aiInstruction: string;

  createdAt: string;
  updatedAt: string;
};

const TEXTS: Record<
  AppLanguage,
  {
    user: string;
    menu: string;
    profile: string;
    chat: string;
    logout: string;
    loadingUser: string;
    loadingWork: string;
    accountActive: string;
    profileTitle: string;
    profileDescription: string;
    secureLoginTitle: string;
    secureLoginText: string;
    ownDocumentsTitle: string;
    ownDocumentsText: string;
    planTitle: string;
    accountStateTitle: string;
    currentPlan: string;
    currency: string;
    email: string;
    myWorksTitle: string;
    myWorksDescription: string;
    saveWorkProfile: string;
    saving: string;
    saveChanges: string;
    savedSuccess: string;
    title: string;
    titlePlaceholder: string;
    topic: string;
    topicPlaceholder: string;
    workType: string;
    seminar: string;
    bachelor: string;
    master: string;
    dissertation: string;
    rigorous: string;
    article: string;
    other: string;
    level: string;
    levelPlaceholder: string;
    field: string;
    fieldPlaceholder: string;
    specialization: string;
    specializationPlaceholder: string;
    supervisor: string;
    supervisorPlaceholder: string;
    citationStyle: string;
    interfaceLanguageInfo: string;
    interfaceLanguageInfoText: string;
    workLanguage: string;
    annotation: string;
    annotationPlaceholder: string;
    goal: string;
    goalPlaceholder: string;
    researchProblem: string;
    researchProblemPlaceholder: string;
    methodology: string;
    methodologyPlaceholder: string;
    hypotheses: string;
    hypothesesPlaceholder: string;
    researchQuestions: string;
    researchQuestionsPlaceholder: string;
    practicalPart: string;
    practicalPartPlaceholder: string;
    scientificContribution: string;
    scientificContributionPlaceholder: string;
    sourcesRequirement: string;
    sourcesRequirementPlaceholder: string;
    structure: string;
    structurePlaceholder: string;
    requiredSections: string;
    requiredSectionsPlaceholder: string;
    recommendedLength: string;
    recommendedLengthPlaceholder: string;
    aiInstruction: string;
    aiInstructionPlaceholder: string;
    lastChange: string;
    videoTitle: string;
    videoText: string;
    videoPlaceholder: string;
    deleteTitle: string;
    deleteText: string;
    deletePlaceholder: string;
    deleteButton: string;
    deleting: string;
    deleteConfirmError: string;
    deleteConfirmQuestion: string;
    userLoadError: string;
    workSaveError: string;
    deleteError: string;
  }
> = {
  sk: {
    user: 'Používateľ',
    menu: 'Menu',
    profile: 'Profil',
    chat: 'AI chat',
    logout: 'Odhlásiť sa',
    loadingUser: 'Načítavam profil používateľa...',
    loadingWork: 'Načítavam profil práce...',
    accountActive: 'Konto aktívne',
    profileTitle: 'Profil používateľa',
    profileDescription:
      'Tu sa nachádza používateľské konto, prihlásenie, plán, mena, história služieb, bezpečnostné nastavenia a profil práce, podľa ktorého sa generujú výstupy v AI chate.',
    secureLoginTitle: 'Bezpečné prihlásenie',
    secureLoginText:
      'Každý používateľ sa prihlasuje do vlastného účtu. Dáta sú filtrované podľa ID prihláseného používateľa.',
    ownDocumentsTitle: 'Vlastné dokumenty',
    ownDocumentsText:
      'Používateľ vidí iba svoje dokumenty, výstupy, históriu a nastavenia.',
    planTitle: 'Plán a platby',
    accountStateTitle: 'Stav konta',
    currentPlan: 'Aktuálny plán',
    currency: 'Mena',
    email: 'E-mail',
    myWorksTitle: 'Moje práce',
    myWorksDescription:
      'Toto je základný profil práce. Každá zmena sa ukladá do pamäte prehliadača a po kliknutí na uloženie aj do databázy. AI chat a moduly musia pracovať s aktuálnym názvom práce, typom práce, jazykom práce, citačnou normou, cieľom, metodológiou, hypotézami a požiadavkami na zdroje.',
    saveWorkProfile: 'Uložiť profil práce',
    saving: 'Ukladám...',
    saveChanges: 'Uložiť zmeny',
    savedSuccess:
      'Profil práce bol uložený. AI chat a moduly budú používať aktuálne údaje.',
    title: 'Názov práce',
    titlePlaceholder: 'Napr. Vplyv umelej inteligencie na akademické písanie',
    topic: 'Téma práce',
    topicPlaceholder: 'Téma práce',
    workType: 'Typ práce',
    seminar: 'Seminárna práca',
    bachelor: 'Bakalárska práca',
    master: 'Diplomová práca',
    dissertation: 'Dizertačná práca',
    rigorous: 'Rigorózna práca',
    article: 'Odborný článok',
    other: 'Iné',
    level: 'Stupeň / úroveň',
    levelPlaceholder: 'Napr. bakalárske štúdium, magisterské štúdium',
    field: 'Odbor',
    fieldPlaceholder: 'Napr. manažment, právo, informatika',
    specialization: 'Odbornosť / špecializácia',
    specializationPlaceholder: 'Špecializácia práce',
    supervisor: 'Vedúci práce',
    supervisorPlaceholder: 'Meno vedúceho práce',
    citationStyle: 'Citačná norma',
    interfaceLanguageInfo: 'Jazyk rozhrania',
    interfaceLanguageInfoText:
      'Jazyk rozhrania sa nastavuje globálne jazykovou mutáciou stránky, nie ručne v profile práce.',
    workLanguage: 'Jazyk práce / výstupov',
    annotation: 'Anotácia',
    annotationPlaceholder: 'Stručná anotácia práce',
    goal: 'Cieľ práce',
    goalPlaceholder: 'Cieľ práce',
    researchProblem: 'Výskumný problém',
    researchProblemPlaceholder: 'Výskumný problém',
    methodology: 'Metodológia',
    methodologyPlaceholder: 'Metodológia práce',
    hypotheses: 'Hypotézy',
    hypothesesPlaceholder: 'Hypotézy práce',
    researchQuestions: 'Výskumné otázky',
    researchQuestionsPlaceholder: 'Výskumné otázky',
    practicalPart: 'Praktická časť',
    practicalPartPlaceholder: 'Popis praktickej časti',
    scientificContribution: 'Odborný prínos',
    scientificContributionPlaceholder: 'Odborný alebo vedecký prínos',
    sourcesRequirement: 'Požiadavky na zdroje',
    sourcesRequirementPlaceholder:
      'Napr. minimálne 15 odborných zdrojov, zahraničné zdroje, zdroje po roku 2020...',
    structure: 'Štruktúra práce',
    structurePlaceholder:
      'Napr. úvod, teoretická časť, praktická časť, diskusia, záver',
    requiredSections: 'Povinné sekcie',
    requiredSectionsPlaceholder: 'Povinné časti práce',
    recommendedLength: 'Odporúčaný rozsah',
    recommendedLengthPlaceholder: 'Napr. 40 – 60 strán',
    aiInstruction: 'Dodatočná AI inštrukcia',
    aiInstructionPlaceholder: 'Špeciálne pokyny pre AI generovanie',
    lastChange: 'Posledná zmena',
    videoTitle: 'Video návod',
    videoText:
      'Video návod bude vložený po finálnom odsúhlasení vnútorného rozhrania. Používateľ ho uvidí priamo vo svojom profile.',
    videoPlaceholder: 'Video návod bude doplnený po schválení systému',
    deleteTitle: 'Zrušenie účtu',
    deleteText:
      'Po zrušení účtu sa odstráni používateľský profil, nahrané dokumenty a súvisiace dáta používateľa. Táto akcia je nezvratná.',
    deletePlaceholder: 'Pre potvrdenie napíšte: ZMAZAŤ',
    deleteButton: 'Zrušiť účet',
    deleting: 'Odstraňujem...',
    deleteConfirmError: 'Pre potvrdenie napíšte presne: ZMAZAŤ',
    deleteConfirmQuestion:
      'Naozaj chcete zrušiť účet? Táto akcia vymaže profil aj dokumenty a nedá sa vrátiť späť.',
    userLoadError: 'Profil používateľa sa nepodarilo načítať.',
    workSaveError: 'Profil práce sa nepodarilo uložiť.',
    deleteError: 'Účet sa nepodarilo odstrániť.',
  },

  cs: {
    user: 'Uživatel',
    menu: 'Menu',
    profile: 'Profil',
    chat: 'AI chat',
    logout: 'Odhlásit se',
    loadingUser: 'Načítám profil uživatele...',
    loadingWork: 'Načítám profil práce...',
    accountActive: 'Účet aktivní',
    profileTitle: 'Profil uživatele',
    profileDescription:
      'Zde se nachází uživatelský účet, přihlášení, plán, měna, historie služeb, bezpečnostní nastavení a profil práce, podle kterého se generují výstupy v AI chatu.',
    secureLoginTitle: 'Bezpečné přihlášení',
    secureLoginText:
      'Každý uživatel se přihlašuje do vlastního účtu. Data jsou filtrována podle ID přihlášeného uživatele.',
    ownDocumentsTitle: 'Vlastní dokumenty',
    ownDocumentsText:
      'Uživatel vidí pouze své dokumenty, výstupy, historii a nastavení.',
    planTitle: 'Plán a platby',
    accountStateTitle: 'Stav účtu',
    currentPlan: 'Aktuální plán',
    currency: 'Měna',
    email: 'E-mail',
    myWorksTitle: 'Moje práce',
    myWorksDescription:
      'Toto je základní profil práce. Každá změna se ukládá do paměti prohlížeče a po kliknutí na uložení také do databáze. AI chat a moduly musí pracovat s aktuálním názvem práce, typem práce, jazykem práce, citační normou, cílem, metodologií, hypotézami a požadavky na zdroje.',
    saveWorkProfile: 'Uložit profil práce',
    saving: 'Ukládám...',
    saveChanges: 'Uložit změny',
    savedSuccess:
      'Profil práce byl uložen. AI chat a moduly budou používat aktuální údaje.',
    title: 'Název práce',
    titlePlaceholder: 'Např. Vliv umělé inteligence na akademické psaní',
    topic: 'Téma práce',
    topicPlaceholder: 'Téma práce',
    workType: 'Typ práce',
    seminar: 'Seminární práce',
    bachelor: 'Bakalářská práce',
    master: 'Diplomová práce',
    dissertation: 'Disertační práce',
    rigorous: 'Rigorózní práce',
    article: 'Odborný článek',
    other: 'Jiné',
    level: 'Stupeň / úroveň',
    levelPlaceholder: 'Např. bakalářské studium, magisterské studium',
    field: 'Obor',
    fieldPlaceholder: 'Např. management, právo, informatika',
    specialization: 'Odbornost / specializace',
    specializationPlaceholder: 'Specializace práce',
    supervisor: 'Vedoucí práce',
    supervisorPlaceholder: 'Jméno vedoucího práce',
    citationStyle: 'Citační norma',
    interfaceLanguageInfo: 'Jazyk rozhraní',
    interfaceLanguageInfoText:
      'Jazyk rozhraní se nastavuje globální jazykovou mutací stránky, ne ručně v profilu práce.',
    workLanguage: 'Jazyk práce / výstupů',
    annotation: 'Anotace',
    annotationPlaceholder: 'Stručná anotace práce',
    goal: 'Cíl práce',
    goalPlaceholder: 'Cíl práce',
    researchProblem: 'Výzkumný problém',
    researchProblemPlaceholder: 'Výzkumný problém',
    methodology: 'Metodologie',
    methodologyPlaceholder: 'Metodologie práce',
    hypotheses: 'Hypotézy',
    hypothesesPlaceholder: 'Hypotézy práce',
    researchQuestions: 'Výzkumné otázky',
    researchQuestionsPlaceholder: 'Výzkumné otázky',
    practicalPart: 'Praktická část',
    practicalPartPlaceholder: 'Popis praktické části',
    scientificContribution: 'Odborný přínos',
    scientificContributionPlaceholder: 'Odborný nebo vědecký přínos',
    sourcesRequirement: 'Požadavky na zdroje',
    sourcesRequirementPlaceholder:
      'Např. minimálně 15 odborných zdrojů, zahraniční zdroje, zdroje po roce 2020...',
    structure: 'Struktura práce',
    structurePlaceholder:
      'Např. úvod, teoretická část, praktická část, diskuse, závěr',
    requiredSections: 'Povinné sekce',
    requiredSectionsPlaceholder: 'Povinné části práce',
    recommendedLength: 'Doporučený rozsah',
    recommendedLengthPlaceholder: 'Např. 40–60 stran',
    aiInstruction: 'Dodatečná AI instrukce',
    aiInstructionPlaceholder: 'Speciální pokyny pro AI generování',
    lastChange: 'Poslední změna',
    videoTitle: 'Video návod',
    videoText:
      'Video návod bude vložen po finálním odsouhlasení vnitřního rozhraní. Uživatel jej uvidí přímo ve svém profilu.',
    videoPlaceholder: 'Video návod bude doplněn po schválení systému',
    deleteTitle: 'Zrušení účtu',
    deleteText:
      'Po zrušení účtu se odstraní uživatelský profil, nahrané dokumenty a související data uživatele. Tato akce je nevratná.',
    deletePlaceholder: 'Pro potvrzení napište: ZMAZAŤ',
    deleteButton: 'Zrušit účet',
    deleting: 'Odstraňuji...',
    deleteConfirmError: 'Pro potvrzení napište přesně: ZMAZAŤ',
    deleteConfirmQuestion:
      'Opravdu chcete zrušit účet? Tato akce smaže profil i dokumenty a nelze ji vrátit zpět.',
    userLoadError: 'Profil uživatele se nepodařilo načíst.',
    workSaveError: 'Profil práce se nepodařilo uložit.',
    deleteError: 'Účet se nepodařilo odstranit.',
  },

  en: {
    user: 'User',
    menu: 'Menu',
    profile: 'Profile',
    chat: 'AI chat',
    logout: 'Log out',
    loadingUser: 'Loading user profile...',
    loadingWork: 'Loading work profile...',
    accountActive: 'Account active',
    profileTitle: 'User profile',
    profileDescription:
      'This section contains the user account, login, plan, currency, service history, security settings and the work profile used for generating AI chat outputs.',
    secureLoginTitle: 'Secure login',
    secureLoginText:
      'Each user signs in to their own account. Data is filtered by the signed-in user ID.',
    ownDocumentsTitle: 'Own documents',
    ownDocumentsText:
      'The user can see only their own documents, outputs, history and settings.',
    planTitle: 'Plan and payments',
    accountStateTitle: 'Account status',
    currentPlan: 'Current plan',
    currency: 'Currency',
    email: 'Email',
    myWorksTitle: 'My works',
    myWorksDescription:
      'This is the basic work profile. Every change is saved to browser memory and, after clicking save, also to the database. The AI chat and modules must use the current work title, work type, work language, citation style, objective, methodology, hypotheses and source requirements.',
    saveWorkProfile: 'Save work profile',
    saving: 'Saving...',
    saveChanges: 'Save changes',
    savedSuccess:
      'The work profile has been saved. The AI chat and modules will use the current data.',
    title: 'Work title',
    titlePlaceholder: 'For example: The impact of AI on academic writing',
    topic: 'Work topic',
    topicPlaceholder: 'Work topic',
    workType: 'Work type',
    seminar: 'Seminar paper',
    bachelor: 'Bachelor thesis',
    master: 'Master thesis',
    dissertation: 'Dissertation',
    rigorous: 'Rigorous thesis',
    article: 'Academic article',
    other: 'Other',
    level: 'Level',
    levelPlaceholder: 'For example: bachelor study, master study',
    field: 'Field',
    fieldPlaceholder: 'For example: management, law, computer science',
    specialization: 'Expertise / specialization',
    specializationPlaceholder: 'Work specialization',
    supervisor: 'Supervisor',
    supervisorPlaceholder: 'Supervisor name',
    citationStyle: 'Citation style',
    interfaceLanguageInfo: 'Interface language',
    interfaceLanguageInfoText:
      'The interface language is controlled globally by the website language version, not manually in the work profile.',
    workLanguage: 'Language of the work / outputs',
    annotation: 'Annotation',
    annotationPlaceholder: 'Short work annotation',
    goal: 'Work objective',
    goalPlaceholder: 'Work objective',
    researchProblem: 'Research problem',
    researchProblemPlaceholder: 'Research problem',
    methodology: 'Methodology',
    methodologyPlaceholder: 'Work methodology',
    hypotheses: 'Hypotheses',
    hypothesesPlaceholder: 'Work hypotheses',
    researchQuestions: 'Research questions',
    researchQuestionsPlaceholder: 'Research questions',
    practicalPart: 'Practical part',
    practicalPartPlaceholder: 'Description of the practical part',
    scientificContribution: 'Scientific contribution',
    scientificContributionPlaceholder: 'Academic or scientific contribution',
    sourcesRequirement: 'Source requirements',
    sourcesRequirementPlaceholder:
      'For example: at least 15 academic sources, foreign sources, sources after 2020...',
    structure: 'Work structure',
    structurePlaceholder:
      'For example: introduction, theoretical part, practical part, discussion, conclusion',
    requiredSections: 'Required sections',
    requiredSectionsPlaceholder: 'Required parts of the work',
    recommendedLength: 'Recommended length',
    recommendedLengthPlaceholder: 'For example: 40–60 pages',
    aiInstruction: 'Additional AI instruction',
    aiInstructionPlaceholder: 'Special instructions for AI generation',
    lastChange: 'Last change',
    videoTitle: 'Video tutorial',
    videoText:
      'The video tutorial will be added after the internal interface is finally approved. The user will see it directly in their profile.',
    videoPlaceholder: 'The video tutorial will be added after system approval',
    deleteTitle: 'Delete account',
    deleteText:
      'After account deletion, the user profile, uploaded documents and related user data will be removed. This action cannot be undone.',
    deletePlaceholder: 'To confirm, type: ZMAZAŤ',
    deleteButton: 'Delete account',
    deleting: 'Deleting...',
    deleteConfirmError: 'To confirm, type exactly: ZMAZAŤ',
    deleteConfirmQuestion:
      'Do you really want to delete the account? This action will delete the profile and documents and cannot be undone.',
    userLoadError: 'The user profile could not be loaded.',
    workSaveError: 'The work profile could not be saved.',
    deleteError: 'The account could not be deleted.',
  },

  de: {} as any,
  pl: {} as any,
  hu: {} as any,
};

function uiText(language: AppLanguage) {
  if (language === 'de' || language === 'pl' || language === 'hu') {
    return TEXTS.en;
  }

  return TEXTS[language] || TEXTS.sk;
}

function createEmptyWorkProfile(interfaceLanguage: AppLanguage = 'sk'): WorkProfile {
  const now = new Date().toISOString();

  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `profile_${Date.now()}`,

    title: '',
    topic: '',
    type: 'bachelor',
    level: '',
    field: '',
    specialization: '',
    supervisor: '',

    interfaceLanguage,
    workLanguage: 'sk',
    citationStyle: 'stn_iso690',

    annotation: '',
    goal: '',
    researchProblem: '',
    methodology: '',
    hypotheses: '',
    researchQuestions: '',
    practicalPart: '',
    scientificContribution: '',
    sourcesRequirement: '',

    structure: '',
    requiredSections: '',
    recommendedLength: '',
    aiInstruction: '',

    createdAt: now,
    updatedAt: now,
  };
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function dispatchProfileEvents(profile: WorkProfile) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>('zedpera-language-change', {
      detail: profile.interfaceLanguage,
    }),
  );

  window.dispatchEvent(new CustomEvent('zedpera-profile-change'));
}

function saveWorkProfileLocal(profile: WorkProfile) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('active_profile', JSON.stringify(profile));
  localStorage.setItem('profile', JSON.stringify(profile));
  localStorage.setItem('zedpera_language', profile.interfaceLanguage);

  const rawProfiles = localStorage.getItem('profiles_full');
  const profiles = safeJsonParse<WorkProfile[]>(rawProfiles) || [];

  const withoutCurrent = Array.isArray(profiles)
    ? profiles.filter((item) => item.id !== profile.id)
    : [];

  const nextProfiles = [profile, ...withoutCurrent];

  localStorage.setItem('profiles_full', JSON.stringify(nextProfiles));

  dispatchProfileEvents(profile);
}

function loadWorkProfileLocal(interfaceLanguage: AppLanguage): WorkProfile | null {
  if (typeof window === 'undefined') return null;

  const keys = ['active_profile', 'profile'];

  for (const key of keys) {
    const parsed = safeJsonParse<Partial<WorkProfile>>(localStorage.getItem(key));

    if (parsed?.id) {
      return {
        ...createEmptyWorkProfile(interfaceLanguage),
        ...parsed,
        interfaceLanguage,
        workLanguage: parsed.workLanguage || 'sk',
        citationStyle: parsed.citationStyle || 'stn_iso690',
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        createdAt: parsed.createdAt || new Date().toISOString(),
      };
    }
  }

  return null;
}

function normalizeWorkProfile(
  profile: Partial<WorkProfile> | null,
  interfaceLanguage: AppLanguage,
): WorkProfile {
  const empty = createEmptyWorkProfile(interfaceLanguage);

  if (!profile) return empty;

  return {
    ...empty,
    ...profile,
    id: profile.id || empty.id,
    title: profile.title || '',
    topic: profile.topic || '',
    type: profile.type || 'bachelor',
    level: profile.level || '',
    field: profile.field || '',
    specialization: profile.specialization || '',
    supervisor: profile.supervisor || '',
    interfaceLanguage,
    workLanguage: profile.workLanguage || 'sk',
    citationStyle: profile.citationStyle || 'stn_iso690',
    annotation: profile.annotation || '',
    goal: profile.goal || '',
    researchProblem: profile.researchProblem || '',
    methodology: profile.methodology || '',
    hypotheses: profile.hypotheses || '',
    researchQuestions: profile.researchQuestions || '',
    practicalPart: profile.practicalPart || '',
    scientificContribution: profile.scientificContribution || '',
    sourcesRequirement: profile.sourcesRequirement || '',
    structure: profile.structure || '',
    requiredSections: profile.requiredSections || '',
    recommendedLength: profile.recommendedLength || '',
    aiInstruction: profile.aiInstruction || '',
    createdAt: profile.createdAt || empty.createdAt,
    updatedAt: profile.updatedAt || empty.updatedAt,
  };
}

function getLanguageName(language: AppLanguage) {
  switch (language) {
    case 'sk':
      return 'Slovenčina';
    case 'cs':
      return 'Čeština';
    case 'en':
      return 'English';
    case 'de':
      return 'Deutsch';
    case 'pl':
      return 'Polski';
    case 'hu':
      return 'Magyar';
    default:
      return 'Slovenčina';
  }
}

export default function ProfileClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const u = useMemo(() => uiText(language), [language]);

  const [data, setData] = useState<ProfileData | null>(null);
  const [workProfile, setWorkProfile] = useState<WorkProfile>(() =>
    createEmptyWorkProfile(language),
  );

  const [loading, setLoading] = useState(true);
  const [workProfileLoading, setWorkProfileLoading] = useState(true);
  const [savingWorkProfile, setSavingWorkProfile] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadProfile() {
    setLoading(true);
    setError('');

    try {
      await fetch('/api/profile/init', {
        method: 'POST',
      });

      const res = await fetch('/api/profile/me', {
        method: 'GET',
        cache: 'no-store',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || u.userLoadError);
      }

      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : u.userLoadError);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkProfile() {
    setWorkProfileLoading(true);

    const localProfile = loadWorkProfileLocal(language);

    if (localProfile) {
      setWorkProfile(localProfile);
    }

    try {
      const res = await fetch('/api/profile/get', {
        method: 'GET',
        cache: 'no-store',
      });

      const json = await res.json();

      if (res.ok && json.ok && json.profile) {
        const normalized = normalizeWorkProfile(json.profile, language);
        setWorkProfile(normalized);
        saveWorkProfileLocal(normalized);
      }
    } catch {
      // If the server endpoint is not ready yet, local storage remains the fallback.
    } finally {
      setWorkProfileLoading(false);
    }
  }

  function updateWorkProfileField<K extends keyof WorkProfile>(
    key: K,
    value: WorkProfile[K],
  ) {
    setSuccess('');

    setWorkProfile((current) => {
      const updated: WorkProfile = {
        ...current,
        interfaceLanguage: language,
        [key]: value,
        updatedAt: new Date().toISOString(),
      };

      saveWorkProfileLocal(updated);
      return updated;
    });
  }

  async function saveWorkProfile() {
    setSavingWorkProfile(true);
    setError('');
    setSuccess('');

    try {
      const updatedProfile: WorkProfile = {
        ...workProfile,
        interfaceLanguage: language,
        updatedAt: new Date().toISOString(),
      };

      setWorkProfile(updatedProfile);
      saveWorkProfileLocal(updatedProfile);

      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || u.workSaveError);
      }

      setSuccess(u.savedSuccess);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : u.workSaveError);
    } finally {
      setSavingWorkProfile(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'ZMAZAŤ') {
      setError(u.deleteConfirmError);
      return;
    }

    const confirmed = window.confirm(u.deleteConfirmQuestion);

    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || u.deleteError);
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('active_profile');
        localStorage.removeItem('profile');
        localStorage.removeItem('profiles_full');
        localStorage.removeItem('generated_texts');
        localStorage.removeItem('chat_history');
        localStorage.removeItem('saved_outputs');
        localStorage.removeItem('latest_generated_work_text');
        localStorage.removeItem('zedpera_originality_protocol_result');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : u.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    await fetch('/auth/signout', {
      method: 'POST',
    });

    router.push('/');
    router.refresh();
  }

  useEffect(() => {
    loadProfile();
    loadWorkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setWorkProfile((current) => {
      if (current.interfaceLanguage === language) {
        return current;
      }

      const updated: WorkProfile = {
        ...current,
        interfaceLanguage: language,
        updatedAt: new Date().toISOString(),
      };

      saveWorkProfileLocal(updated);
      return updated;
    });
  }, [language]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#020617] dark:text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
            {u.loadingUser}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 transition-colors dark:bg-[#020617] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <User className="h-6 w-6" />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {u.user}
              </div>
              <div className="break-all text-sm font-bold">
                {data?.user.email}
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            <a
              href="/dashboard"
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {u.menu}
            </a>

            <a
              href="/profile"
              className="block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              {u.profile}
            </a>

            <a
              href="/chat"
              className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {u.chat}
            </a>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              {u.logout}
            </button>
          </nav>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {u.profileTitle}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {u.profileDescription}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {u.accountActive}
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {success}
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title={u.secureLoginTitle}
              text={u.secureLoginText}
            />

            <InfoCard
              icon={<FileText className="h-5 w-5" />}
              title={u.ownDocumentsTitle}
              text={u.ownDocumentsText}
            />

            <InfoCard
              icon={<CreditCard className="h-5 w-5" />}
              title={u.planTitle}
              text={`${u.currentPlan}: ${data?.profile?.plan || 'free'} | ${
                u.currency
              }: ${data?.profile?.currency || 'EUR'}`}
            />

            <InfoCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={u.accountStateTitle}
              text={`${u.email}: ${data?.user.email || ''}`}
            />
          </div>

          <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-500/30 dark:bg-white/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                  <h2 className="text-xl font-black">{u.myWorksTitle}</h2>
                </div>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {u.myWorksDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={saveWorkProfile}
                disabled={savingWorkProfile}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingWorkProfile ? u.saving : u.saveWorkProfile}
              </button>
            </div>

            {workProfileLoading ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                {u.loadingWork}
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={u.title}>
                    <input
                      value={workProfile.title}
                      onChange={(event) =>
                        updateWorkProfileField('title', event.target.value)
                      }
                      placeholder={u.titlePlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.topic}>
                    <input
                      value={workProfile.topic}
                      onChange={(event) =>
                        updateWorkProfileField('topic', event.target.value)
                      }
                      placeholder={u.topicPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.workType}>
                    <select
                      value={workProfile.type}
                      onChange={(event) =>
                        updateWorkProfileField('type', event.target.value)
                      }
                      className="input"
                    >
                      <option value="seminar">{u.seminar}</option>
                      <option value="bachelor">{u.bachelor}</option>
                      <option value="master">{u.master}</option>
                      <option value="dissertation">{u.dissertation}</option>
                      <option value="rigorous">{u.rigorous}</option>
                      <option value="article">{u.article}</option>
                      <option value="other">{u.other}</option>
                    </select>
                  </Field>

                  <Field label={u.level}>
                    <input
                      value={workProfile.level}
                      onChange={(event) =>
                        updateWorkProfileField('level', event.target.value)
                      }
                      placeholder={u.levelPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.field}>
                    <input
                      value={workProfile.field}
                      onChange={(event) =>
                        updateWorkProfileField('field', event.target.value)
                      }
                      placeholder={u.fieldPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.specialization}>
                    <input
                      value={workProfile.specialization}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'specialization',
                          event.target.value,
                        )
                      }
                      placeholder={u.specializationPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.supervisor}>
                    <input
                      value={workProfile.supervisor}
                      onChange={(event) =>
                        updateWorkProfileField('supervisor', event.target.value)
                      }
                      placeholder={u.supervisorPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.citationStyle}>
                    <select
                      value={workProfile.citationStyle}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'citationStyle',
                          event.target.value as CitationStyle,
                        )
                      }
                      className="input"
                    >
                      <option value="apa7">APA 7</option>
                      <option value="iso690">ISO 690</option>
                      <option value="stn_iso690">STN ISO 690</option>
                      <option value="chicago">Chicago</option>
                    </select>
                  </Field>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                    <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {u.interfaceLanguageInfo}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {getLanguageName(language)}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {u.interfaceLanguageInfoText}
                    </p>
                  </div>

                  <Field label={u.workLanguage}>
                    <select
                      value={workProfile.workLanguage}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'workLanguage',
                          event.target.value as AppLanguage,
                        )
                      }
                      className="input"
                    >
                      <option value="sk">Slovenčina</option>
                      <option value="cs">Čeština</option>
                      <option value="en">English</option>
                      <option value="de">Deutsch</option>
                      <option value="pl">Polski</option>
                      <option value="hu">Magyar</option>
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4">
                  <Field label={u.annotation}>
                    <textarea
                      value={workProfile.annotation}
                      onChange={(event) =>
                        updateWorkProfileField('annotation', event.target.value)
                      }
                      placeholder={u.annotationPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.goal}>
                    <textarea
                      value={workProfile.goal}
                      onChange={(event) =>
                        updateWorkProfileField('goal', event.target.value)
                      }
                      placeholder={u.goalPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.researchProblem}>
                    <textarea
                      value={workProfile.researchProblem}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'researchProblem',
                          event.target.value,
                        )
                      }
                      placeholder={u.researchProblemPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.methodology}>
                    <textarea
                      value={workProfile.methodology}
                      onChange={(event) =>
                        updateWorkProfileField('methodology', event.target.value)
                      }
                      placeholder={u.methodologyPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.hypotheses}>
                    <textarea
                      value={workProfile.hypotheses}
                      onChange={(event) =>
                        updateWorkProfileField('hypotheses', event.target.value)
                      }
                      placeholder={u.hypothesesPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.researchQuestions}>
                    <textarea
                      value={workProfile.researchQuestions}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'researchQuestions',
                          event.target.value,
                        )
                      }
                      placeholder={u.researchQuestionsPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.practicalPart}>
                    <textarea
                      value={workProfile.practicalPart}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'practicalPart',
                          event.target.value,
                        )
                      }
                      placeholder={u.practicalPartPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.scientificContribution}>
                    <textarea
                      value={workProfile.scientificContribution}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'scientificContribution',
                          event.target.value,
                        )
                      }
                      placeholder={u.scientificContributionPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.sourcesRequirement}>
                    <textarea
                      value={workProfile.sourcesRequirement}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'sourcesRequirement',
                          event.target.value,
                        )
                      }
                      placeholder={u.sourcesRequirementPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.structure}>
                    <textarea
                      value={workProfile.structure}
                      onChange={(event) =>
                        updateWorkProfileField('structure', event.target.value)
                      }
                      placeholder={u.structurePlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.requiredSections}>
                    <textarea
                      value={workProfile.requiredSections}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'requiredSections',
                          event.target.value,
                        )
                      }
                      placeholder={u.requiredSectionsPlaceholder}
                      className="textarea"
                    />
                  </Field>

                  <Field label={u.recommendedLength}>
                    <input
                      value={workProfile.recommendedLength}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'recommendedLength',
                          event.target.value,
                        )
                      }
                      placeholder={u.recommendedLengthPlaceholder}
                      className="input"
                    />
                  </Field>

                  <Field label={u.aiInstruction}>
                    <textarea
                      value={workProfile.aiInstruction}
                      onChange={(event) =>
                        updateWorkProfileField(
                          'aiInstruction',
                          event.target.value,
                        )
                      }
                      placeholder={u.aiInstructionPlaceholder}
                      className="textarea"
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-black/20 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-slate-600 dark:text-slate-300">
                    {u.lastChange}:{' '}
                    <strong>
                      {new Date(workProfile.updatedAt).toLocaleString('sk-SK')}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={saveWorkProfile}
                    disabled={savingWorkProfile}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingWorkProfile ? u.saving : u.saveChanges}
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              <h2 className="text-xl font-black">{u.videoTitle}</h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {u.videoText}
            </p>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
              <div className="flex aspect-video items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="mx-auto h-14 w-14 text-slate-400" />
                  <div className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {u.videoPlaceholder}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
              <h2 className="text-xl font-black text-red-700 dark:text-red-200">
                {u.deleteTitle}
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-red-700 dark:text-red-200">
              {u.deleteText}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={u.deletePlaceholder}
                className="min-h-[48px] flex-1 rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-400 dark:border-red-500/30 dark:bg-black/30 dark:text-white"
              />

              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleting}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? u.deleting : u.deleteButton}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .input {
          min-height: 46px;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(15 23 42);
          outline: none;
        }

        .textarea {
          min-height: 120px;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: rgb(15 23 42);
          outline: none;
          resize: vertical;
        }

        .input:focus,
        .textarea:focus {
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.35);
          border-color: rgb(59 130 246);
        }

        :global(.dark) .input,
        :global(.dark) .textarea {
          border-color: rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
          color: white;
        }

        :global(.dark) .input::placeholder,
        :global(.dark) .textarea::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }
      `}</style>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white">
          {icon}
        </div>
        <h3 className="font-black">{title}</h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {text}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}