"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import type { AppLanguage } from "@/lib/i18n";

type CitationStyle = "apa7" | "iso690" | "stn_iso690" | "chicago";

type WorkType =
  | "seminar"
  | "essay"
  | "maturita"
  | "bachelor"
  | "master"
  | "graduate"
  | "rigorous"
  | "dissertation"
  | "habilitation"
  | "mba"
  | "dba"
  | "attestation"
  | "msc"
  | "article"
  | "other";

type WorkTemplate = {
  type: WorkType;
  label: Partial<Record<AppLanguage, string>>;
  description: Partial<Record<AppLanguage, string>>;
  defaultLevel: Partial<Record<AppLanguage, string>>;
  defaultCitationStyle: CitationStyle;
  recommendedLength: Partial<Record<AppLanguage, string>>;
  structure: Partial<Record<AppLanguage, string[]>>;
  requiredSections: Partial<Record<AppLanguage, string[]>>;
  aiInstruction: Partial<Record<AppLanguage, string>>;
};

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
  type: WorkType;
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

type StoredWorkProfile = Partial<WorkProfile> & {
  workType?: unknown;
  work_type?: unknown;
  citation?: unknown;
  citationNorm?: unknown;
  citation_style?: unknown;
};

type ProfileTab = "academic" | "basic" | "structure" | "account";
type EditorMode = "input" | "textarea";

type EditorState = {
  title: string;
  subtitle?: string;
  placeholder?: string;
  value: string;
  mode: EditorMode;
  rows?: number;
  onSave: (value: string) => void;
};

type UIText = {
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
  createEmptyProfile: string;
  createEmptyProfileConfirm: string;
  emptyProfileCreated: string;
  saveWorkProfile: string;
  saving: string;
  saveChanges: string;
  savedSuccess: string;
  savedLocalOnly: string;
  title: string;
  titlePlaceholder: string;
  topic: string;
  topicPlaceholder: string;
  workType: string;
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
  activeTemplate: string;
  selectedTemplate: string;
  templateLoaded: string;
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
  editWindow: string;
  openEditor: string;
  filled: string;
  empty: string;
  open: string;
  cancel: string;
  save: string;
  chooseByClick: string;
};

const TEXTS: Record<AppLanguage, UIText> = {
  sk: {
    user: "Používateľ",
    menu: "Menu",
    profile: "Profil",
    chat: "AI chat",
    logout: "Odhlásiť sa",
    loadingUser: "Načítavam profil používateľa...",
    loadingWork: "Načítavam profil práce...",
    accountActive: "Konto aktívne",
    profileTitle: "Profil používateľa",
    profileDescription:
      "Tu sa nachádza používateľské konto, prihlásenie, plán, mena, história služieb, bezpečnostné nastavenia a profil práce, podľa ktorého sa generujú výstupy v AI chate.",
    secureLoginTitle: "Bezpečné prihlásenie",
    secureLoginText:
      "Každý používateľ sa prihlasuje do vlastného účtu. Dáta sú filtrované podľa ID prihláseného používateľa.",
    ownDocumentsTitle: "Vlastné dokumenty",
    ownDocumentsText:
      "Používateľ vidí iba svoje dokumenty, výstupy, históriu a nastavenia.",
    planTitle: "Plán a platby",
    accountStateTitle: "Stav konta",
    currentPlan: "Aktuálny plán",
    currency: "Mena",
    email: "E-mail",
    myWorksTitle: "Moje práce",
    myWorksDescription:
      "Vyberte typ práce. Po kliknutí sa priamo v tejto časti načíta presná šablóna pre daný typ práce.",
    createEmptyProfile: "Vytvoriť prázdny profil",
    createEmptyProfileConfirm:
      "Naozaj chcete vytvoriť nový prázdny profil práce? Aktuálne rozpísané údaje sa prepíšu.",
    emptyProfileCreated:
      "Bol vytvorený nový prázdny profil práce. Vyplňte údaje a kliknite na uloženie.",
    saveWorkProfile: "Uložiť profil práce",
    saving: "Ukladám...",
    saveChanges: "Uložiť zmeny",
    savedSuccess:
      "Profil práce bol uložený. AI chat a moduly budú používať aktuálne údaje.",
    savedLocalOnly:
      "Profil práce bol uložený lokálne v prehliadači. Do databázy sa uloží po prihlásení používateľa.",
    title: "Názov práce",
    titlePlaceholder: "Napr. Vplyv umelej inteligencie na akademické písanie",
    topic: "Téma práce",
    topicPlaceholder: "Téma práce",
    workType: "Typ práce",
    level: "Stupeň / úroveň",
    levelPlaceholder: "Napr. bakalárske štúdium, magisterské štúdium",
    field: "Odbor",
    fieldPlaceholder: "Napr. manažment, právo, informatika",
    specialization: "Odbornosť / špecializácia",
    specializationPlaceholder: "Špecializácia práce",
    supervisor: "Vedúci práce",
    supervisorPlaceholder: "Meno vedúceho práce",
    citationStyle: "Citačná norma",
    interfaceLanguageInfo: "Jazyk rozhrania",
    interfaceLanguageInfoText:
      "Jazyk rozhrania sa nastavuje globálne jazykovou mutáciou stránky, nie ručne v profile práce.",
    workLanguage: "Jazyk práce / výstupov",
    activeTemplate: "Aktívna šablóna",
    selectedTemplate: "Vybraná šablóna",
    templateLoaded: "Šablóna načítaná priamo v Moje práce",
    annotation: "Anotácia",
    annotationPlaceholder: "Stručná anotácia práce",
    goal: "Cieľ práce",
    goalPlaceholder: "Cieľ práce",
    researchProblem: "Výskumný problém",
    researchProblemPlaceholder: "Výskumný problém",
    methodology: "Metodológia",
    methodologyPlaceholder: "Metodológia práce",
    hypotheses: "Hypotézy",
    hypothesesPlaceholder: "Hypotézy práce",
    researchQuestions: "Výskumné otázky",
    researchQuestionsPlaceholder: "Výskumné otázky",
    practicalPart: "Praktická časť",
    practicalPartPlaceholder: "Popis praktickej časti",
    scientificContribution: "Odborný prínos",
    scientificContributionPlaceholder: "Odborný alebo vedecký prínos",
    sourcesRequirement: "Požiadavky na zdroje",
    sourcesRequirementPlaceholder:
      "Napr. minimálne 15 odborných zdrojov, zahraničné zdroje, zdroje po roku 2020...",
    structure: "Štruktúra práce",
    structurePlaceholder: "Štruktúra práce podľa typu práce",
    requiredSections: "Povinné sekcie",
    requiredSectionsPlaceholder: "Povinné časti práce",
    recommendedLength: "Odporúčaný rozsah",
    recommendedLengthPlaceholder: "Napr. 40 – 60 strán",
    aiInstruction: "Dodatočná AI inštrukcia",
    aiInstructionPlaceholder: "Špeciálne pokyny pre AI generovanie",
    lastChange: "Posledná zmena",
    videoTitle: "Video návod",
    videoText:
      "Video návod bude vložený po finálnom odsúhlasení vnútorného rozhrania. Používateľ ho uvidí priamo vo svojom profile.",
    videoPlaceholder: "Video návod bude doplnený po schválení systému",
    deleteTitle: "Zrušenie účtu",
    deleteText:
      "Po zrušení účtu sa odstráni používateľský profil, nahrané dokumenty a súvisiace dáta používateľa. Táto akcia je nezvratná.",
    deletePlaceholder: "Pre potvrdenie napíšte: ZMAZAŤ",
    deleteButton: "Zrušiť účet",
    deleting: "Odstraňujem...",
    deleteConfirmError: "Pre potvrdenie napíšte presne: ZMAZAŤ",
    deleteConfirmQuestion:
      "Naozaj chcete zrušiť účet? Táto akcia vymaže profil aj dokumenty a nedá sa vrátiť späť.",
    userLoadError: "Profil používateľa sa nepodarilo načítať.",
    workSaveError: "Profil práce sa nepodarilo uložiť.",
    deleteError: "Účet sa nepodarilo odstrániť.",
    editWindow: "Editačné okno",
    openEditor: "Kliknutím otvoríte editačné okno",
    filled: "Vyplnené",
    empty: "Prázdne",
    open: "Otvoriť",
    cancel: "Zrušiť",
    save: "Uložiť",
    chooseByClick: "Vyberte možnosť jedným kliknutím.",
  },
  cs: {
    user: "Uživatel",
    menu: "Menu",
    profile: "Profil",
    chat: "AI chat",
    logout: "Odhlásit se",
    loadingUser: "Načítám profil uživatele...",
    loadingWork: "Načítám profil práce...",
    accountActive: "Účet aktivní",
    profileTitle: "Profil uživatele",
    profileDescription:
      "Zde se nachází uživatelský účet, přihlášení, plán, měna, historie služeb, bezpečnostní nastavení a profil práce.",
    secureLoginTitle: "Bezpečné přihlášení",
    secureLoginText:
      "Každý uživatel se přihlašuje do vlastního účtu. Data jsou filtrována podle ID přihlášeného uživatele.",
    ownDocumentsTitle: "Vlastní dokumenty",
    ownDocumentsText:
      "Uživatel vidí pouze své dokumenty, výstupy, historii a nastavení.",
    planTitle: "Plán a platby",
    accountStateTitle: "Stav účtu",
    currentPlan: "Aktuální plán",
    currency: "Měna",
    email: "E-mail",
    myWorksTitle: "Moje práce",
    myWorksDescription:
      "Vyberte typ práce. Po kliknutí se přímo v této části načte přesná šablona.",
    createEmptyProfile: "Vytvořit prázdný profil",
    createEmptyProfileConfirm:
      "Opravdu chcete vytvořit nový prázdný profil práce? Aktuální údaje se přepíší.",
    emptyProfileCreated: "Byl vytvořen nový prázdný profil práce.",
    saveWorkProfile: "Uložit profil práce",
    saving: "Ukládám...",
    saveChanges: "Uložit změny",
    savedSuccess: "Profil práce byl uložen.",
    savedLocalOnly: "Profil práce byl uložen lokálně v prohlížeči.",
    title: "Název práce",
    titlePlaceholder: "Např. Vliv umělé inteligence na akademické psaní",
    topic: "Téma práce",
    topicPlaceholder: "Téma práce",
    workType: "Typ práce",
    level: "Stupeň / úroveň",
    levelPlaceholder: "Např. bakalářské studium, magisterské studium",
    field: "Obor",
    fieldPlaceholder: "Např. management, právo, informatika",
    specialization: "Odbornost / specializace",
    specializationPlaceholder: "Specializace práce",
    supervisor: "Vedoucí práce",
    supervisorPlaceholder: "Jméno vedoucího práce",
    citationStyle: "Citační norma",
    interfaceLanguageInfo: "Jazyk rozhraní",
    interfaceLanguageInfoText:
      "Jazyk rozhraní se nastavuje globálně, ne ručně v profilu práce.",
    workLanguage: "Jazyk práce / výstupů",
    activeTemplate: "Aktivní šablona",
    selectedTemplate: "Vybraná šablona",
    templateLoaded: "Šablona načtena přímo v Moje práce",
    annotation: "Anotace",
    annotationPlaceholder: "Stručná anotace práce",
    goal: "Cíl práce",
    goalPlaceholder: "Cíl práce",
    researchProblem: "Výzkumný problém",
    researchProblemPlaceholder: "Výzkumný problém",
    methodology: "Metodologie",
    methodologyPlaceholder: "Metodologie práce",
    hypotheses: "Hypotézy",
    hypothesesPlaceholder: "Hypotézy práce",
    researchQuestions: "Výzkumné otázky",
    researchQuestionsPlaceholder: "Výzkumné otázky",
    practicalPart: "Praktická část",
    practicalPartPlaceholder: "Popis praktické části",
    scientificContribution: "Odborný přínos",
    scientificContributionPlaceholder: "Odborný nebo vědecký přínos",
    sourcesRequirement: "Požadavky na zdroje",
    sourcesRequirementPlaceholder: "Požadavky na zdroje",
    structure: "Struktura práce",
    structurePlaceholder: "Struktura práce podle typu práce",
    requiredSections: "Povinné sekce",
    requiredSectionsPlaceholder: "Povinné části práce",
    recommendedLength: "Doporučený rozsah",
    recommendedLengthPlaceholder: "Např. 40–60 stran",
    aiInstruction: "Dodatečná AI instrukce",
    aiInstructionPlaceholder: "Speciální pokyny pro AI generování",
    lastChange: "Poslední změna",
    videoTitle: "Video návod",
    videoText: "Video návod bude vložen po finálním odsouhlasení rozhraní.",
    videoPlaceholder: "Video návod bude doplněn po schválení systému",
    deleteTitle: "Zrušení účtu",
    deleteText: "Po zrušení účtu se odstraní profil a dokumenty.",
    deletePlaceholder: "Pro potvrzení napište: ZMAZAŤ",
    deleteButton: "Zrušit účet",
    deleting: "Odstraňuji...",
    deleteConfirmError: "Pro potvrzení napište přesně: ZMAZAŤ",
    deleteConfirmQuestion: "Opravdu chcete zrušit účet?",
    userLoadError: "Profil uživatele se nepodařilo načíst.",
    workSaveError: "Profil práce se nepodařilo uložit.",
    deleteError: "Účet se nepodařilo odstranit.",
    editWindow: "Editační okno",
    openEditor: "Kliknutím otevřete editační okno",
    filled: "Vyplněno",
    empty: "Prázdné",
    open: "Otevřít",
    cancel: "Zrušit",
    save: "Uložit",
    chooseByClick: "Vyberte možnost jedním kliknutím.",
  },
  en: {
    user: "User",
    menu: "Menu",
    profile: "Profile",
    chat: "AI chat",
    logout: "Log out",
    loadingUser: "Loading user profile...",
    loadingWork: "Loading work profile...",
    accountActive: "Account active",
    profileTitle: "User profile",
    profileDescription:
      "This section contains the user account, login, plan, currency, history and work profile.",
    secureLoginTitle: "Secure login",
    secureLoginText: "Each user signs in to their own account.",
    ownDocumentsTitle: "Own documents",
    ownDocumentsText:
      "The user can see only their own documents, outputs and settings.",
    planTitle: "Plan and payments",
    accountStateTitle: "Account status",
    currentPlan: "Current plan",
    currency: "Currency",
    email: "Email",
    myWorksTitle: "My works",
    myWorksDescription:
      "Choose a work type. The exact template will load directly in this section.",
    createEmptyProfile: "Create empty profile",
    createEmptyProfileConfirm: "Create a new empty work profile?",
    emptyProfileCreated: "A new empty work profile has been created.",
    saveWorkProfile: "Save work profile",
    saving: "Saving...",
    saveChanges: "Save changes",
    savedSuccess: "The work profile has been saved.",
    savedLocalOnly: "The work profile was saved locally in the browser.",
    title: "Work title",
    titlePlaceholder: "For example: The impact of AI on academic writing",
    topic: "Work topic",
    topicPlaceholder: "Work topic",
    workType: "Work type",
    level: "Level",
    levelPlaceholder: "For example: bachelor study, master study",
    field: "Field",
    fieldPlaceholder: "For example: management, law, computer science",
    specialization: "Expertise / specialization",
    specializationPlaceholder: "Work specialization",
    supervisor: "Supervisor",
    supervisorPlaceholder: "Supervisor name",
    citationStyle: "Citation style",
    interfaceLanguageInfo: "Interface language",
    interfaceLanguageInfoText:
      "The interface language is controlled globally, not manually in the work profile.",
    workLanguage: "Language of the work / outputs",
    activeTemplate: "Active template",
    selectedTemplate: "Selected template",
    templateLoaded: "Template loaded directly in My works",
    annotation: "Annotation",
    annotationPlaceholder: "Short work annotation",
    goal: "Work objective",
    goalPlaceholder: "Work objective",
    researchProblem: "Research problem",
    researchProblemPlaceholder: "Research problem",
    methodology: "Methodology",
    methodologyPlaceholder: "Work methodology",
    hypotheses: "Hypotheses",
    hypothesesPlaceholder: "Work hypotheses",
    researchQuestions: "Research questions",
    researchQuestionsPlaceholder: "Research questions",
    practicalPart: "Practical part",
    practicalPartPlaceholder: "Description of the practical part",
    scientificContribution: "Scientific contribution",
    scientificContributionPlaceholder: "Academic or scientific contribution",
    sourcesRequirement: "Source requirements",
    sourcesRequirementPlaceholder: "Source requirements",
    structure: "Work structure",
    structurePlaceholder: "Work structure by type",
    requiredSections: "Required sections",
    requiredSectionsPlaceholder: "Required parts of the work",
    recommendedLength: "Recommended length",
    recommendedLengthPlaceholder: "For example: 40–60 pages",
    aiInstruction: "Additional AI instruction",
    aiInstructionPlaceholder: "Special instructions for AI generation",
    lastChange: "Last change",
    videoTitle: "Video tutorial",
    videoText: "The video tutorial will be added after final approval.",
    videoPlaceholder: "The video tutorial will be added after system approval",
    deleteTitle: "Delete account",
    deleteText:
      "After account deletion, the profile and documents will be removed.",
    deletePlaceholder: "To confirm, type: ZMAZAŤ",
    deleteButton: "Delete account",
    deleting: "Deleting...",
    deleteConfirmError: "To confirm, type exactly: ZMAZAŤ",
    deleteConfirmQuestion: "Do you really want to delete the account?",
    userLoadError: "The user profile could not be loaded.",
    workSaveError: "The work profile could not be saved.",
    deleteError: "The account could not be deleted.",
    editWindow: "Edit window",
    openEditor: "Click to open edit window",
    filled: "Filled",
    empty: "Empty",
    open: "Open",
    cancel: "Cancel",
    save: "Save",
    chooseByClick: "Choose an option with one click.",
  },
  de: {} as UIText,
  pl: {} as UIText,
  hu: {} as UIText,
};

function uiText(language: AppLanguage): UIText {
  if (language === "de" || language === "pl" || language === "hu")
    return TEXTS.en;
  return TEXTS[language] || TEXTS.sk;
}

const WORK_TYPE_ORDER: WorkType[] = [
  "seminar",
  "essay",
  "maturita",
  "bachelor",
  "master",
  "graduate",
  "rigorous",
  "dissertation",
  "habilitation",
  "mba",
  "dba",
  "attestation",
  "msc",
  "article",
  "other",
];

const WORK_TEMPLATES: Record<WorkType, WorkTemplate> = {
  seminar: {
    type: "seminar",
    label: {
      sk: "Seminárna práca",
      cs: "Seminární práce",
      en: "Seminar paper",
    },
    description: {
      sk: "Krátka odborná školská práca s úvodom, jadrom a záverom.",
      cs: "Krátká odborná školní práce s úvodem, jádrem a závěrem.",
      en: "A shorter academic school paper with introduction, main body and conclusion.",
    },
    defaultLevel: {
      sk: "Štandardná akademická úroveň",
      cs: "Standardní akademická úroveň",
      en: "Standard academic level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "5 – 15 strán podľa predmetu",
      cs: "5–15 stran podle předmětu",
      en: "5–15 pages depending on subject",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Obsah",
        "Úvod",
        "Jadro práce",
        "Záver",
        "Zoznam použitej literatúry",
        "Prílohy, ak sú potrebné",
      ],
      cs: [
        "Titulní strana",
        "Obsah",
        "Úvod",
        "Jádro práce",
        "Závěr",
        "Seznam použité literatury",
        "Přílohy, pokud jsou potřebné",
      ],
      en: [
        "Title page",
        "Table of contents",
        "Introduction",
        "Main body",
        "Conclusion",
        "References",
        "Appendices if needed",
      ],
    },
    requiredSections: {
      sk: [
        "Titulná strana",
        "Obsah",
        "Úvod",
        "Jadro práce",
        "Záver",
        "Zoznam použitej literatúry",
      ],
      cs: [
        "Titulní strana",
        "Obsah",
        "Úvod",
        "Jádro práce",
        "Závěr",
        "Seznam použité literatury",
      ],
      en: [
        "Title page",
        "Table of contents",
        "Introduction",
        "Main body",
        "Conclusion",
        "References",
      ],
    },
    aiInstruction: {
      sk: "Generuj seminárnu prácu, nie bakalársku. Dodrž štruktúru: titulná strana, obsah, úvod, jadro práce, záver, zoznam literatúry a prílohy podľa potreby.",
      cs: "Generuj seminární práci, ne bakalářskou.",
      en: "Generate a seminar paper, not a bachelor thesis.",
    },
  },
  essay: {
    type: "essay",
    label: { sk: "Esej", cs: "Esej", en: "Essay" },
    description: {
      sk: "Argumentačný alebo reflexívny text s tézou, argumentmi a vlastným stanoviskom.",
      cs: "Argumentační nebo reflexivní text s tezí, argumenty a vlastním stanoviskem.",
      en: "An argumentative or reflective text with thesis, arguments and own position.",
    },
    defaultLevel: {
      sk: "Argumentačná akademická úroveň",
      cs: "Argumentační akademická úroveň",
      en: "Argumentative academic level",
    },
    defaultCitationStyle: "apa7",
    recommendedLength: { sk: "2 – 8 strán", cs: "2–8 stran", en: "2–8 pages" },
    structure: {
      sk: [
        "Názov eseje",
        "Úvodná téza",
        "Argumentačná časť",
        "Vlastné stanovisko",
        "Záver",
        "Literatúra, ak sa používa",
      ],
      cs: [
        "Název eseje",
        "Úvodní teze",
        "Argumentační část",
        "Vlastní stanovisko",
        "Závěr",
        "Literatura, pokud se používá",
      ],
      en: [
        "Essay title",
        "Introductory thesis",
        "Argumentation",
        "Own position",
        "Conclusion",
        "References if used",
      ],
    },
    requiredSections: {
      sk: [
        "Názov eseje",
        "Úvodná téza",
        "Argumentačná časť",
        "Vlastné stanovisko",
        "Záver",
      ],
      cs: [
        "Název eseje",
        "Úvodní teze",
        "Argumentační část",
        "Vlastní stanovisko",
        "Závěr",
      ],
      en: [
        "Essay title",
        "Introductory thesis",
        "Argumentation",
        "Own position",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj esej. Nepoužívaj prísnu štruktúru bakalárskej alebo diplomovej práce. Dôraz je na tézu, argumentáciu, vlastné stanovisko a záver.",
      cs: "Generuj esej s tezí, argumentací a vlastním stanoviskem.",
      en: "Generate an essay with thesis, argumentation, own position and conclusion.",
    },
  },
  maturita: {
    type: "maturita",
    label: {
      sk: "Maturitná práca / SOČ",
      cs: "Maturitní práce / SOČ",
      en: "Graduation paper",
    },
    description: {
      sk: "Stredoškolská odborná práca alebo SOČ s teoretickou a praktickou časťou.",
      cs: "Středoškolská odborná práce nebo SOČ s teoretickou a praktickou částí.",
      en: "A secondary-school graduation paper with theoretical and practical part.",
    },
    defaultLevel: {
      sk: "Stredoškolská odborná úroveň",
      cs: "Středoškolská odborná úroveň",
      en: "Secondary-school academic level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "15 – 30 strán podľa školy",
      cs: "15–30 stran podle školy",
      en: "15–30 pages depending on school",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Čestné vyhlásenie",
        "Poďakovanie, voliteľné",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretická časť",
        "Praktická časť",
        "Záver",
        "Zoznam literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Čestné prohlášení",
        "Poděkování, volitelné",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretická část",
        "Praktická část",
        "Závěr",
        "Seznam literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Declaration",
        "Acknowledgements optional",
        "Abstract",
        "Table of contents",
        "Introduction",
        "Theoretical part",
        "Practical part",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Titulná strana",
        "Čestné vyhlásenie",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretická časť",
        "Praktická časť",
        "Záver",
        "Zoznam literatúry",
      ],
      cs: [
        "Titulní strana",
        "Čestné prohlášení",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretická část",
        "Praktická část",
        "Závěr",
        "Seznam literatury",
      ],
      en: [
        "Title page",
        "Declaration",
        "Abstract",
        "Table of contents",
        "Introduction",
        "Theory",
        "Practice",
        "Conclusion",
        "References",
      ],
    },
    aiInstruction: {
      sk: "Generuj maturitnú prácu / SOČ so stredoškolskou odbornou úrovňou.",
      cs: "Generuj maturitní práci / SOČ.",
      en: "Generate a secondary-school graduation paper.",
    },
  },
  bachelor: {
    type: "bachelor",
    label: {
      sk: "Bakalárska práca",
      cs: "Bakalářská práce",
      en: "Bachelor thesis",
    },
    description: {
      sk: "Záverečná vysokoškolská práca s teoretickou a praktickou alebo analytickou časťou.",
      cs: "Závěrečná vysokoškolská práce s teoretickou a praktickou nebo analytickou částí.",
      en: "A university bachelor thesis with theoretical and practical or analytical part.",
    },
    defaultLevel: {
      sk: "Bakalárske štúdium",
      cs: "Bakalářské studium",
      en: "Bachelor level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "30 – 50 strán",
      cs: "30–50 stran",
      en: "30–50 pages",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Zadanie práce",
        "Čestné vyhlásenie",
        "Poďakovanie, voliteľné",
        "Abstrakt v slovenskom jazyku",
        "Abstract v anglickom jazyku",
        "Kľúčové slová",
        "Obsah",
        "Zoznam skratiek, ak treba",
        "Úvod",
        "Teoretická časť",
        "Praktická / analytická časť",
        "Záver",
        "Zoznam použitej literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Zadání práce",
        "Čestné prohlášení",
        "Poděkování, volitelné",
        "Abstrakt v českém jazyce",
        "Abstract v anglickém jazyce",
        "Klíčová slova",
        "Obsah",
        "Seznam zkratek, pokud je třeba",
        "Úvod",
        "Teoretická část",
        "Praktická / analytická část",
        "Závěr",
        "Seznam použité literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Thesis assignment",
        "Declaration",
        "Acknowledgements optional",
        "Abstract in the work language",
        "Abstract in English",
        "Keywords",
        "Table of contents",
        "List of abbreviations if needed",
        "Introduction",
        "Theoretical part",
        "Practical / analytical part",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Titulná strana",
        "Zadanie práce",
        "Čestné vyhlásenie",
        "Abstrakt SK",
        "Abstract EN",
        "Kľúčové slová",
        "Obsah",
        "Úvod",
        "Teoretická časť",
        "Praktická / analytická časť",
        "Záver",
        "Zoznam literatúry",
      ],
      cs: [
        "Titulní strana",
        "Zadání práce",
        "Čestné prohlášení",
        "Abstrakt",
        "Abstract",
        "Klíčová slova",
        "Obsah",
        "Úvod",
        "Teoretická část",
        "Praktická / analytická část",
        "Závěr",
        "Seznam literatury",
      ],
      en: [
        "Title page",
        "Assignment",
        "Declaration",
        "Abstract",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Theory",
        "Practical / analytical part",
        "Conclusion",
        "References",
      ],
    },
    aiInstruction: {
      sk: "Generuj bakalársku prácu. Použi štruktúru bakalárskej práce podľa STN ISO 690 alebo internej smernice školy.",
      cs: "Generuj bakalářskou práci.",
      en: "Generate a bachelor thesis.",
    },
  },
  master: {
    type: "master",
    label: {
      sk: "Diplomová práca",
      cs: "Diplomová práce",
      en: "Master thesis",
    },
    description: {
      sk: "Hlbšia odborná práca s metodológiou, analýzou, návrhovou časťou a diskusiou.",
      cs: "Hlubší odborná práce s metodologií a diskusí.",
      en: "A deeper academic work with methodology, analysis, proposal and discussion.",
    },
    defaultLevel: {
      sk: "Magisterské / inžinierske štúdium",
      cs: "Magisterské / inženýrské studium",
      en: "Master level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "50 – 80 strán",
      cs: "50–80 stran",
      en: "50–80 pages",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Zadanie práce",
        "Čestné vyhlásenie",
        "Poďakovanie",
        "Abstrakt",
        "Abstract",
        "Kľúčové slová",
        "Obsah",
        "Úvod",
        "Teoretické východiská",
        "Metodológia",
        "Analytická / výskumná časť",
        "Návrhová / aplikačná časť",
        "Diskusia",
        "Záver",
        "Zoznam použitej literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Zadání práce",
        "Čestné prohlášení",
        "Poděkování",
        "Abstrakt",
        "Abstract",
        "Klíčová slova",
        "Obsah",
        "Úvod",
        "Teoretická východiska",
        "Metodologie",
        "Analytická / výzkumná část",
        "Návrhová / aplikační část",
        "Diskuse",
        "Závěr",
        "Seznam použité literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Assignment",
        "Declaration",
        "Acknowledgements",
        "Abstract",
        "Abstract in English",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Theoretical background",
        "Methodology",
        "Analytical / research part",
        "Proposal / application part",
        "Discussion",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Abstrakt",
        "Úvod",
        "Teoretické východiská",
        "Metodológia",
        "Analytická / výskumná časť",
        "Návrhová / aplikačná časť",
        "Diskusia",
        "Záver",
      ],
      cs: [
        "Abstrakt",
        "Úvod",
        "Teoretická východiska",
        "Metodologie",
        "Analytická část",
        "Návrhová část",
        "Diskuse",
        "Závěr",
      ],
      en: [
        "Abstract",
        "Introduction",
        "Theoretical background",
        "Methodology",
        "Analysis",
        "Proposal",
        "Discussion",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj diplomovú prácu, nie bakalársku. Musí byť hlbšia, odbornejšia a obsahovať metodológiu, výskumnú alebo návrhovú časť a diskusiu.",
      cs: "Generuj diplomovou práci.",
      en: "Generate a master thesis.",
    },
  },
  graduate: {
    type: "graduate",
    label: {
      sk: "Absolventská práca",
      cs: "Absolventská práce",
      en: "Graduate thesis",
    },
    description: {
      sk: "Profesijná alebo vyššia odborná práca s dôrazom na prax.",
      cs: "Profesní nebo vyšší odborná práce.",
      en: "A professionally oriented graduate thesis.",
    },
    defaultLevel: {
      sk: "Vyššie odborné / profesijné štúdium",
      cs: "Vyšší odborné / profesní studium",
      en: "Graduate professional level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "25 – 40 strán",
      cs: "25–40 stran",
      en: "25–40 pages",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Charakteristika problému",
        "Teoretické východiská",
        "Praktická časť",
        "Návrh riešenia",
        "Vyhodnotenie",
        "Záver",
        "Zoznam literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Charakteristika problému",
        "Teoretická východiska",
        "Praktická část",
        "Návrh řešení",
        "Vyhodnocení",
        "Závěr",
        "Seznam literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Abstract",
        "Table of contents",
        "Introduction",
        "Problem description",
        "Theoretical background",
        "Practical part",
        "Solution proposal",
        "Evaluation",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Úvod",
        "Charakteristika problému",
        "Teoretická časť",
        "Praktická časť",
        "Návrh riešenia",
        "Záver",
      ],
      cs: [
        "Úvod",
        "Charakteristika problému",
        "Teoretická část",
        "Praktická část",
        "Návrh řešení",
        "Závěr",
      ],
      en: [
        "Introduction",
        "Problem description",
        "Theory",
        "Practice",
        "Solution proposal",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj absolventskú prácu s dôrazom na praktickú aplikáciu.",
      cs: "Generuj absolventskou práci.",
      en: "Generate a graduate thesis.",
    },
  },
  rigorous: {
    type: "rigorous",
    label: {
      sk: "Rigorózna práca",
      cs: "Rigorózní práce",
      en: "Rigorous thesis",
    },
    description: {
      sk: "Vyššia odborná práca ako diplomová práca.",
      cs: "Vyšší odborná práce než diplomová práce.",
      en: "A higher-level academic thesis than a master thesis.",
    },
    defaultLevel: {
      sk: "Pokročilá akademická úroveň",
      cs: "Pokročilá akademická úroveň",
      en: "Advanced academic level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "80 – 120 strán podľa fakulty",
      cs: "80–120 stran podle fakulty",
      en: "80–120 pages depending on faculty",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretické východiská",
        "Metodológia",
        "Odborná / výskumná časť",
        "Diskusia",
        "Záver",
        "Literatúra",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Teoretická východiska",
        "Metodologie",
        "Odborná / výzkumná část",
        "Diskuse",
        "Závěr",
        "Literatura",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Abstract",
        "Table of contents",
        "Introduction",
        "Theoretical background",
        "Methodology",
        "Expert / research part",
        "Discussion",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Abstrakt",
        "Úvod",
        "Teoretické východiská",
        "Metodológia",
        "Odborná / výskumná časť",
        "Diskusia",
        "Záver",
      ],
      cs: [
        "Abstrakt",
        "Úvod",
        "Teoretická východiska",
        "Metodologie",
        "Odborná / výzkumná část",
        "Diskuse",
        "Závěr",
      ],
      en: [
        "Abstract",
        "Introduction",
        "Theoretical background",
        "Methodology",
        "Research part",
        "Discussion",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj rigoróznu prácu s vyššou odbornou úrovňou ako diplomová práca.",
      cs: "Generuj rigorózní práci.",
      en: "Generate a rigorous thesis.",
    },
  },
  dissertation: {
    type: "dissertation",
    label: {
      sk: "Dizertačná práca",
      cs: "Disertační práce",
      en: "Dissertation",
    },
    description: {
      sk: "Doktorandská vedecká práca s vlastným vedeckým prínosom.",
      cs: "Doktorská vědecká práce s vlastním vědeckým přínosem.",
      en: "A doctoral scientific work with original contribution.",
    },
    defaultLevel: {
      sk: "Doktorandská vedecká úroveň",
      cs: "Doktorská vědecká úroveň",
      en: "Doctoral scientific level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "100 – 200 strán podľa odboru",
      cs: "100–200 stran podle oboru",
      en: "100–200 pages depending on field",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Zadanie / tézy",
        "Čestné vyhlásenie",
        "Abstrakt SK",
        "Abstract EN",
        "Kľúčové slová",
        "Obsah",
        "Úvod",
        "Súčasný stav riešenej problematiky",
        "Ciele dizertačnej práce",
        "Hypotézy / výskumné otázky",
        "Metodológia",
        "Výsledky výskumu",
        "Diskusia",
        "Vedecký prínos",
        "Záver",
        "Zoznam publikácií autora",
        "Zoznam literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Zadání / teze",
        "Čestné prohlášení",
        "Abstrakt",
        "Abstract",
        "Klíčová slova",
        "Obsah",
        "Úvod",
        "Současný stav řešené problematiky",
        "Cíle disertační práce",
        "Hypotézy / výzkumné otázky",
        "Metodologie",
        "Výsledky výzkumu",
        "Diskuse",
        "Vědecký přínos",
        "Závěr",
        "Seznam publikací autora",
        "Seznam literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Assignment / theses",
        "Declaration",
        "Abstract",
        "Abstract in English",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Current state of the issue",
        "Dissertation objectives",
        "Hypotheses / research questions",
        "Methodology",
        "Research results",
        "Discussion",
        "Scientific contribution",
        "Conclusion",
        "Author publications",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Súčasný stav problematiky",
        "Ciele dizertačnej práce",
        "Hypotézy / výskumné otázky",
        "Metodológia",
        "Výsledky výskumu",
        "Diskusia",
        "Vedecký prínos",
        "Zoznam publikácií autora",
      ],
      cs: [
        "Současný stav problematiky",
        "Cíle disertační práce",
        "Hypotézy / výzkumné otázky",
        "Metodologie",
        "Výsledky výzkumu",
        "Diskuse",
        "Vědecký přínos",
        "Publikace autora",
      ],
      en: [
        "Current state",
        "Objectives",
        "Hypotheses / research questions",
        "Methodology",
        "Research results",
        "Discussion",
        "Scientific contribution",
        "Author publications",
      ],
    },
    aiInstruction: {
      sk: "Generuj dizertačnú prácu. Musí obsahovať vlastný vedecký prínos, výskumný problém, hypotézy alebo výskumné otázky, metodológiu, výsledky, diskusiu a zoznam publikácií autora.",
      cs: "Generuj disertační práci s vlastním vědeckým přínosem.",
      en: "Generate a dissertation with original scientific contribution.",
    },
  },
  habilitation: {
    type: "habilitation",
    label: {
      sk: "Habilitačná práca",
      cs: "Habilitační práce",
      en: "Habilitation thesis",
    },
    description: {
      sk: "Nie je klasická študentská práca; hodnotí vedecký, odborný a pedagogický prínos autora.",
      cs: "Není klasická studentská práce.",
      en: "Not a standard student thesis; evaluates scientific and pedagogical contribution.",
    },
    defaultLevel: {
      sk: "Najvyššia vedecko-odborná úroveň",
      cs: "Nejvyšší vědecko-odborná úroveň",
      en: "Highest scientific academic level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "Podľa habilitačného konania a odboru",
      cs: "Podle habilitačního řízení a oboru",
      en: "According to habilitation procedure and field",
    },
    structure: {
      sk: [
        "Odborný profil autora",
        "Vedecko-pedagogická činnosť",
        "Hlavné vedecké výsledky",
        "Publikácie",
        "Výskumný prínos",
        "Záver",
        "Literatúra",
        "Prílohy",
      ],
      cs: [
        "Odborný profil autora",
        "Vědecko-pedagogická činnost",
        "Hlavní vědecké výsledky",
        "Publikace",
        "Výzkumný přínos",
        "Závěr",
        "Literatura",
        "Přílohy",
      ],
      en: [
        "Author professional profile",
        "Scientific and pedagogical activity",
        "Main scientific results",
        "Publications",
        "Research contribution",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Odborný profil autora",
        "Vedecko-pedagogická činnosť",
        "Hlavné vedecké výsledky",
        "Publikácie",
        "Výskumný prínos",
      ],
      cs: [
        "Odborný profil autora",
        "Vědecko-pedagogická činnost",
        "Hlavní vědecké výsledky",
        "Publikace",
        "Výzkumný přínos",
      ],
      en: [
        "Author profile",
        "Scientific and pedagogical activity",
        "Main results",
        "Publications",
        "Research contribution",
      ],
    },
    aiInstruction: {
      sk: "Generuj habilitačnú prácu. Nejde o klasickú študentskú prácu; zdôrazni vedecký, odborný a pedagogický prínos autora.",
      cs: "Generuj habilitační práci.",
      en: "Generate a habilitation thesis.",
    },
  },
  mba: {
    type: "mba",
    label: { sk: "MBA práca", cs: "MBA práce", en: "MBA thesis" },
    description: {
      sk: "Prakticky orientovaná práca na manažérske rozhodovanie, biznis problém a riešenie.",
      cs: "Prakticky orientovaná práce na manažerské rozhodování.",
      en: "A practical thesis focused on management decision-making and business problem solving.",
    },
    defaultLevel: {
      sk: "Manažérska profesijná úroveň",
      cs: "Manažerská profesní úroveň",
      en: "Management professional level",
    },
    defaultCitationStyle: "apa7",
    recommendedLength: {
      sk: "Podľa programu MBA, prakticky orientované",
      cs: "Podle programu MBA, prakticky orientované",
      en: "According to MBA programme",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Manažérske zhrnutie",
        "Úvod",
        "Popis firmy / problému",
        "Analýza súčasného stavu",
        "Návrh riešenia",
        "Implementácia",
        "Prínosy a riziká",
        "Záver",
        "Literatúra",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Manažerské shrnutí",
        "Úvod",
        "Popis firmy / problému",
        "Analýza současného stavu",
        "Návrh řešení",
        "Implementace",
        "Přínosy a rizika",
        "Závěr",
        "Literatura",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Executive summary",
        "Introduction",
        "Company / problem description",
        "Current state analysis",
        "Solution proposal",
        "Implementation",
        "Benefits and risks",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Manažérske zhrnutie",
        "Popis firmy / problému",
        "Analýza súčasného stavu",
        "Návrh riešenia",
        "Implementácia",
        "Prínosy a riziká",
      ],
      cs: [
        "Manažerské shrnutí",
        "Popis firmy / problému",
        "Analýza současného stavu",
        "Návrh řešení",
        "Implementace",
        "Přínosy a rizika",
      ],
      en: [
        "Executive summary",
        "Business problem",
        "Analysis",
        "Solution proposal",
        "Implementation",
        "Benefits and risks",
      ],
    },
    aiInstruction: {
      sk: "Generuj MBA prácu prakticky orientovanú na manažérske rozhodovanie, biznis problém a riešenie.",
      cs: "Generuj MBA práci.",
      en: "Generate an MBA thesis.",
    },
  },
  dba: {
    type: "dba",
    label: { sk: "DBA práca", cs: "DBA práce", en: "DBA thesis" },
    description: {
      sk: "Prakticko-výskumná práca na úrovni doktorandského štúdia v biznise.",
      cs: "Prakticko-výzkumná práce doktorské úrovně v byznysu.",
      en: "A doctoral-level applied business research thesis.",
    },
    defaultLevel: {
      sk: "Doktorandská prakticko-výskumná úroveň v biznise",
      cs: "Doktorská prakticko-výzkumná úroveň v byznysu",
      en: "Doctoral applied business level",
    },
    defaultCitationStyle: "apa7",
    recommendedLength: {
      sk: "Podľa programu DBA, doktorandská úroveň",
      cs: "Podle programu DBA, doktorská úroveň",
      en: "According to DBA programme",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Abstrakt",
        "Úvod",
        "Výskumný problém",
        "Teoretické východiská",
        "Metodológia",
        "Prípadová štúdia / výskum",
        "Výsledky",
        "Manažérske odporúčania",
        "Vedecký a praktický prínos",
        "Záver",
        "Literatúra",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Abstrakt",
        "Úvod",
        "Výzkumný problém",
        "Teoretická východiska",
        "Metodologie",
        "Případová studie / výzkum",
        "Výsledky",
        "Manažerská doporučení",
        "Vědecký a praktický přínos",
        "Závěr",
        "Literatura",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Abstract",
        "Introduction",
        "Research problem",
        "Theoretical background",
        "Methodology",
        "Case study / research",
        "Results",
        "Management recommendations",
        "Scientific and practical contribution",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Výskumný problém",
        "Teoretické východiská",
        "Metodológia",
        "Prípadová štúdia / výskum",
        "Výsledky",
        "Manažérske odporúčania",
        "Vedecký a praktický prínos",
      ],
      cs: [
        "Výzkumný problém",
        "Teoretická východiska",
        "Metodologie",
        "Případová studie / výzkum",
        "Výsledky",
        "Manažerská doporučení",
        "Vědecký a praktický přínos",
      ],
      en: [
        "Research problem",
        "Theory",
        "Methodology",
        "Case study / research",
        "Results",
        "Management recommendations",
        "Contribution",
      ],
    },
    aiInstruction: {
      sk: "Generuj DBA prácu ako prakticko-výskumnú prácu na úrovni doktorandského štúdia v biznise.",
      cs: "Generuj DBA práci.",
      en: "Generate a DBA thesis.",
    },
  },
  attestation: {
    type: "attestation",
    label: {
      sk: "Atestačná práca",
      cs: "Atestační práce",
      en: "Attestation thesis",
    },
    description: {
      sk: "Profesijná atestačná práca s dôrazom na prax, reflexiu a zlepšenie procesu.",
      cs: "Profesní atestační práce.",
      en: "Professional attestation thesis.",
    },
    defaultLevel: {
      sk: "Profesijná odborná úroveň",
      cs: "Profesní odborná úroveň",
      en: "Professional academic level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "25 – 40 strán podľa profesijnej požiadavky",
      cs: "25–40 stran",
      en: "25–40 pages",
    },
    structure: {
      sk: [
        "Titulná strana",
        "Čestné vyhlásenie",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Charakteristika odbornej praxe",
        "Teoretické východiská",
        "Opis problému z praxe",
        "Návrh riešenia alebo intervencie",
        "Realizácia a vyhodnotenie",
        "Reflexia autora",
        "Záver",
        "Zoznam literatúry",
        "Prílohy",
      ],
      cs: [
        "Titulní strana",
        "Čestné prohlášení",
        "Abstrakt",
        "Obsah",
        "Úvod",
        "Charakteristika odborné praxe",
        "Teoretická východiska",
        "Popis problému z praxe",
        "Návrh řešení nebo intervence",
        "Realizace a vyhodnocení",
        "Reflexe autora",
        "Závěr",
        "Seznam literatury",
        "Přílohy",
      ],
      en: [
        "Title page",
        "Declaration",
        "Abstract",
        "Table of contents",
        "Introduction",
        "Professional practice description",
        "Theoretical background",
        "Problem from practice",
        "Solution or intervention proposal",
        "Implementation and evaluation",
        "Author reflection",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Úvod",
        "Charakteristika odbornej praxe",
        "Opis problému z praxe",
        "Návrh riešenia",
        "Realizácia a vyhodnotenie",
        "Reflexia autora",
        "Záver",
      ],
      cs: [
        "Úvod",
        "Charakteristika odborné praxe",
        "Popis problému z praxe",
        "Návrh řešení",
        "Realizace a vyhodnocení",
        "Reflexe autora",
        "Závěr",
      ],
      en: [
        "Introduction",
        "Professional practice",
        "Problem from practice",
        "Solution proposal",
        "Implementation and evaluation",
        "Reflection",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj atestačnú prácu. Táto šablóna sa nesmie načítať pri kliknutí na bakalársku ani inú prácu.",
      cs: "Generuj atestační práci.",
      en: "Generate an attestation thesis.",
    },
  },
  msc: {
    type: "msc",
    label: { sk: "MSc. práca", cs: "MSc. práce", en: "MSc thesis" },
    description: {
      sk: "Magisterská práca medzinárodného typu.",
      cs: "Magisterská práce mezinárodního typu.",
      en: "International-style master thesis.",
    },
    defaultLevel: {
      sk: "Magisterská akademická úroveň",
      cs: "Magisterská akademická úroveň",
      en: "MSc academic level",
    },
    defaultCitationStyle: "apa7",
    recommendedLength: {
      sk: "50 – 80 strán",
      cs: "50–80 stran",
      en: "50–80 pages",
    },
    structure: {
      sk: [
        "Title page",
        "Declaration",
        "Abstract",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
        "References",
        "Appendices",
      ],
      cs: [
        "Title page",
        "Declaration",
        "Abstract",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
        "References",
        "Appendices",
      ],
      en: [
        "Title page",
        "Declaration",
        "Abstract",
        "Keywords",
        "Table of contents",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
        "References",
        "Appendices",
      ],
    },
    requiredSections: {
      sk: [
        "Abstract",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
      ],
      cs: [
        "Abstract",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
      ],
      en: [
        "Abstract",
        "Introduction",
        "Literature review",
        "Methodology",
        "Results",
        "Discussion",
        "Conclusion",
      ],
    },
    aiInstruction: {
      sk: "Generuj MSc. prácu v medzinárodnom akademickom štýle.",
      cs: "Generuj MSc. práci.",
      en: "Generate an MSc thesis.",
    },
  },
  article: {
    type: "article",
    label: {
      sk: "Odborný článok",
      cs: "Odborný článek",
      en: "Academic article",
    },
    description: {
      sk: "Odborný článok podľa publikačnej štruktúry, najčastejšie IMRaD.",
      cs: "Odborný článek podle publikační struktury.",
      en: "Academic article, usually following IMRaD.",
    },
    defaultLevel: {
      sk: "Publikačná odborná úroveň",
      cs: "Publikační odborná úroveň",
      en: "Publication academic level",
    },
    defaultCitationStyle: "apa7",
    recommendedLength: {
      sk: "6 – 20 strán podľa časopisu",
      cs: "6–20 stran podle časopisu",
      en: "6–20 pages depending on journal",
    },
    structure: {
      sk: [
        "Názov článku",
        "Autor",
        "Abstrakt",
        "Kľúčové slová",
        "Úvod",
        "Metodológia",
        "Výsledky",
        "Diskusia",
        "Záver",
        "Zoznam literatúry",
      ],
      cs: [
        "Název článku",
        "Autor",
        "Abstrakt",
        "Klíčová slova",
        "Úvod",
        "Metodologie",
        "Výsledky",
        "Diskuse",
        "Závěr",
        "Seznam literatury",
      ],
      en: [
        "Article title",
        "Author",
        "Abstract",
        "Keywords",
        "Introduction",
        "Methods",
        "Results",
        "Discussion",
        "Conclusion",
        "References",
      ],
    },
    requiredSections: {
      sk: [
        "Názov článku",
        "Autor",
        "Abstrakt",
        "Kľúčové slová",
        "Úvod",
        "Metodológia",
        "Výsledky",
        "Diskusia",
        "Záver",
        "Zoznam literatúry",
      ],
      cs: [
        "Název článku",
        "Autor",
        "Abstrakt",
        "Klíčová slova",
        "Úvod",
        "Metodologie",
        "Výsledky",
        "Diskuse",
        "Závěr",
        "Seznam literatury",
      ],
      en: [
        "Article title",
        "Author",
        "Abstract",
        "Keywords",
        "Introduction",
        "Methods",
        "Results",
        "Discussion",
        "Conclusion",
        "References",
      ],
    },
    aiInstruction: {
      sk: "Generuj odborný článok podľa štruktúry IMRaD: Introduction, Methods, Results, Discussion. Pridaj abstrakt, kľúčové slová a zoznam literatúry.",
      cs: "Generuj odborný článek podle IMRaD.",
      en: "Generate an academic article using IMRaD.",
    },
  },
  other: {
    type: "other",
    label: { sk: "Iné", cs: "Jiné", en: "Other" },
    description: {
      sk: "Univerzálna odborná šablóna podľa zadania.",
      cs: "Univerzální odborná šablona podle zadání.",
      en: "Universal professional template.",
    },
    defaultLevel: {
      sk: "Štandardná odborná úroveň",
      cs: "Standardní odborná úroveň",
      en: "Standard professional level",
    },
    defaultCitationStyle: "stn_iso690",
    recommendedLength: {
      sk: "Podľa zadania",
      cs: "Podle zadání",
      en: "According to assignment",
    },
    structure: {
      sk: [
        "Úvod",
        "Cieľ",
        "Teoretický rámec",
        "Hlavná časť",
        "Vyhodnotenie",
        "Záver",
        "Zdroje",
      ],
      cs: [
        "Úvod",
        "Cíl",
        "Teoretický rámec",
        "Hlavní část",
        "Vyhodnocení",
        "Závěr",
        "Zdroje",
      ],
      en: [
        "Introduction",
        "Objective",
        "Theoretical framework",
        "Main body",
        "Evaluation",
        "Conclusion",
        "References",
      ],
    },
    requiredSections: {
      sk: ["Úvod", "Cieľ", "Hlavná časť", "Záver", "Zdroje"],
      cs: ["Úvod", "Cíl", "Hlavní část", "Závěr", "Zdroje"],
      en: [
        "Introduction",
        "Objective",
        "Main body",
        "Conclusion",
        "References",
      ],
    },
    aiInstruction: {
      sk: "Generuj odborný výstup podľa zadania.",
      cs: "Generuj odborný výstup podle zadání.",
      en: "Generate a professional output according to assignment.",
    },
  },
};

const CITATION_OPTIONS: { value: CitationStyle; label: string }[] = [
  { value: "apa7", label: "APA 7" },
  { value: "iso690", label: "ISO 690" },
  { value: "stn_iso690", label: "STN ISO 690" },
  { value: "chicago", label: "Chicago" },
];

function getLocalizedValue<T>(
  value: Partial<Record<AppLanguage, T>>,
  language: AppLanguage,
): T {
  return (value[language] ??
    value.sk ??
    value.cs ??
    value.en ??
    Object.values(value)[0]) as T;
}

function isWorkType(value: unknown): value is WorkType {
  return (
    typeof value === "string" && WORK_TYPE_ORDER.includes(value as WorkType)
  );
}

function isCitationStyle(value: unknown): value is CitationStyle {
  return (
    typeof value === "string" &&
    CITATION_OPTIONS.some((item) => item.value === value)
  );
}

function normalizeStoredCitationStyle(value: unknown): CitationStyle | null {
  const raw = String(value || "")
    .toLowerCase()
    .trim();
  const compact = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_.-]+/g, "");

  if (isCitationStyle(raw)) return raw;
  if (compact === "apa7" || compact === "apa") return "apa7";
  if (compact === "iso690") return "iso690";
  if (compact === "stniso690" || compact === "stn690") return "stn_iso690";
  if (compact === "chicago") return "chicago";

  return null;
}

function normalizeStoredWorkType(value: unknown): WorkType {
  const raw = String(value || "")
    .toLowerCase()
    .trim();
  const compact = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (isWorkType(raw)) return raw;
  if (isWorkType(compact)) return compact;

  // Táto fuzzy normalizácia sa používa iba pri načítaní starých uložených profilov.
  // Pri kliknutí na kartičku sa používa presný kľúč z WORK_TYPE_ORDER, aby sa nikdy
  // nestalo, že klik na bakalársku prácu otvorí MBA alebo inú šablónu.
  if (compact.includes("semin")) return "seminar";
  if (compact.includes("esej") || compact.includes("essay")) return "essay";
  if (compact.includes("matur") || compact.includes("soc")) return "maturita";
  if (compact.includes("bakal") || compact.includes("bachelor"))
    return "bachelor";
  if (compact.includes("diplom") || compact.includes("master")) return "master";
  if (compact.includes("absolvent") || compact.includes("graduate"))
    return "graduate";
  if (compact.includes("rigor")) return "rigorous";
  if (
    compact.includes("dizert") ||
    compact.includes("disert") ||
    compact.includes("dissert")
  )
    return "dissertation";
  if (compact.includes("habil")) return "habilitation";
  if (compact === "mba" || compact.includes("mba ")) return "mba";
  if (compact === "dba" || compact.includes("dba ")) return "dba";
  if (compact.includes("atest")) return "attestation";
  if (compact.includes("msc")) return "msc";
  if (
    compact.includes("article") ||
    compact.includes("clan") ||
    compact.includes("član")
  )
    return "article";
  if (compact.includes("ine") || compact.includes("other")) return "other";

  return "bachelor";
}

function getTemplate(type: WorkType): WorkTemplate {
  return WORK_TEMPLATES[type];
}

function templateLabel(type: WorkType, language: AppLanguage): string {
  return getLocalizedValue(getTemplate(type).label, language) || "—";
}

function templateDescription(type: WorkType, language: AppLanguage): string {
  return getLocalizedValue(getTemplate(type).description, language) || "";
}

function templateLevel(type: WorkType, language: AppLanguage): string {
  return getLocalizedValue(getTemplate(type).defaultLevel, language) || "";
}

function templateLength(type: WorkType, language: AppLanguage): string {
  return getLocalizedValue(getTemplate(type).recommendedLength, language) || "";
}

function templateStructure(type: WorkType, language: AppLanguage): string {
  return (getLocalizedValue(getTemplate(type).structure, language) || []).join(
    "\n",
  );
}

function templateRequired(type: WorkType, language: AppLanguage): string {
  return (
    getLocalizedValue(getTemplate(type).requiredSections, language) || []
  ).join("\n");
}

function templateInstruction(type: WorkType, language: AppLanguage): string {
  return getLocalizedValue(getTemplate(type).aiInstruction, language) || "";
}

function getLanguageName(language: AppLanguage): string {
  switch (language) {
    case "sk":
      return "Slovenčina";
    case "cs":
      return "Čeština";
    case "en":
      return "English";
    case "de":
      return "Deutsch";
    case "pl":
      return "Polski";
    case "hu":
      return "Magyar";
    default:
      return "Slovenčina";
  }
}

function createProfileId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `profile_${Date.now()}`;
}

function applyTemplateToProfile(
  current: Partial<WorkProfile>,
  requestedType: unknown,
  language: AppLanguage,
  preserveUserFields = true,
): WorkProfile {
  const now = new Date().toISOString();
  const stored = current as StoredWorkProfile;
  const requested =
    requestedType ?? stored.type ?? stored.workType ?? stored.work_type;
  const type = isWorkType(requested)
    ? requested
    : normalizeStoredWorkType(requested);
  const template = getTemplate(type);
  const storedCitation = normalizeStoredCitationStyle(
    stored.citationStyle ??
      stored.citation ??
      stored.citationNorm ??
      stored.citation_style,
  );

  return {
    id: current.id || createProfileId(),
    title: preserveUserFields ? current.title || "" : "",
    topic: preserveUserFields ? current.topic || "" : "",
    type,
    level: templateLevel(type, language),
    field: preserveUserFields ? current.field || "" : "",
    specialization: preserveUserFields ? current.specialization || "" : "",
    supervisor: preserveUserFields ? current.supervisor || "" : "",
    interfaceLanguage: language,
    workLanguage: language,
    citationStyle: preserveUserFields
      ? storedCitation || template.defaultCitationStyle
      : template.defaultCitationStyle,
    annotation: preserveUserFields ? current.annotation || "" : "",
    goal: preserveUserFields ? current.goal || "" : "",
    researchProblem: preserveUserFields ? current.researchProblem || "" : "",
    methodology: preserveUserFields ? current.methodology || "" : "",
    hypotheses: preserveUserFields ? current.hypotheses || "" : "",
    researchQuestions: preserveUserFields
      ? current.researchQuestions || ""
      : "",
    practicalPart: preserveUserFields ? current.practicalPart || "" : "",
    scientificContribution: preserveUserFields
      ? current.scientificContribution || ""
      : "",
    sourcesRequirement: preserveUserFields
      ? current.sourcesRequirement || ""
      : "",
    structure: templateStructure(type, language),
    requiredSections: templateRequired(type, language),
    recommendedLength: templateLength(type, language),
    aiInstruction: templateInstruction(type, language),
    createdAt: current.createdAt || now,
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
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AppLanguage>("zedpera-language-change", {
      detail: profile.interfaceLanguage,
    }),
  );
  window.dispatchEvent(new CustomEvent("zedpera-profile-change"));
  window.dispatchEvent(
    new CustomEvent("zedpera:active-profile-changed", { detail: profile }),
  );
}

function saveWorkProfileLocal(profile: WorkProfile) {
  if (typeof window === "undefined") return;

  const storedProfile = {
    ...profile,
    workType: profile.type,
    work_type: profile.type,
    citation: profile.citationStyle,
    citationNorm: profile.citationStyle,
    citation_style: profile.citationStyle,
  };

  localStorage.setItem("active_profile", JSON.stringify(storedProfile));
  localStorage.setItem("profile", JSON.stringify(storedProfile));
  localStorage.setItem("zedpera_language", profile.interfaceLanguage);
  localStorage.setItem("zedpera_system_language", profile.interfaceLanguage);

  const profiles =
    safeJsonParse<WorkProfile[]>(localStorage.getItem("profiles_full")) || [];
  const withoutCurrent = Array.isArray(profiles)
    ? profiles.filter((item) => item.id !== profile.id)
    : [];

  localStorage.setItem(
    "profiles_full",
    JSON.stringify([storedProfile, ...withoutCurrent]),
  );
  dispatchProfileEvents(profile);
}

function loadWorkProfileLocal(language: AppLanguage): WorkProfile | null {
  if (typeof window === "undefined") return null;

  const keys = ["active_profile", "profile"];

  for (const key of keys) {
    const parsed = safeJsonParse<StoredWorkProfile>(localStorage.getItem(key));

    if (parsed?.id) {
      const storedType =
        parsed.type ?? parsed.workType ?? parsed.work_type ?? "bachelor";
      return applyTemplateToProfile(parsed, storedType, language, true);
    }
  }

  return null;
}

export default function ProfileClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const u = useMemo(() => uiText(language), [language]);

  const [activeTab, setActiveTab] = useState<ProfileTab>("academic");
  const [data, setData] = useState<ProfileData | null>(null);
  const [workProfile, setWorkProfile] = useState<WorkProfile>(() =>
    applyTemplateToProfile({}, "bachelor", language, false),
  );
  const [loading, setLoading] = useState(true);
  const [workProfileLoading, setWorkProfileLoading] = useState(true);
  const [savingWorkProfile, setSavingWorkProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const didMountLanguageEffect = useRef(false);

  const activeWorkType = isWorkType(workProfile.type)
    ? workProfile.type
    : normalizeStoredWorkType(workProfile.type);
  const currentTemplate = getTemplate(activeWorkType);
  const workTypeLabel = templateLabel(activeWorkType, language);
  const workTypeDescription = templateDescription(activeWorkType, language);
  const citationLabel =
    CITATION_OPTIONS.find((item) => item.value === workProfile.citationStyle)
      ?.label || "STN ISO 690";

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      await fetch("/api/profile/init", { method: "POST" });

      const res = await fetch("/api/profile/me", {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || u.userLoadError);
      }

      setData(json);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : u.userLoadError);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkProfile() {
    setWorkProfileLoading(true);
    setError("");

    try {
      const localProfile = loadWorkProfileLocal(language);

      if (localProfile) {
        const fixedLocalProfile = applyTemplateToProfile(
          localProfile,
          localProfile.type || "bachelor",
          language,
          true,
        );

        setWorkProfile(fixedLocalProfile);
        saveWorkProfileLocal(fixedLocalProfile);
        return;
      }

      const emptyProfile = applyTemplateToProfile(
        {},
        "bachelor",
        language,
        false,
      );
      setWorkProfile(emptyProfile);
      saveWorkProfileLocal(emptyProfile);
    } catch (err: unknown) {
      console.error("LOAD WORK PROFILE ERROR:", err);

      const fallbackProfile = applyTemplateToProfile(
        {},
        "bachelor",
        language,
        false,
      );
      setWorkProfile(fallbackProfile);
      saveWorkProfileLocal(fallbackProfile);
    } finally {
      setWorkProfileLoading(false);
    }
  }

  function createNewEmptyWorkProfile() {
    const confirmed = window.confirm(u.createEmptyProfileConfirm);
    if (!confirmed) return;

    const emptyProfile = applyTemplateToProfile(
      {},
      "bachelor",
      language,
      false,
    );
    setError("");
    setSuccess(u.emptyProfileCreated);
    setWorkProfile(emptyProfile);
    saveWorkProfileLocal(emptyProfile);
    setActiveTab("academic");
  }

  function selectWorkType(type: WorkType) {
    setSuccess("");
    setError("");
    setEditor(null);
    setActiveTab("academic");

    if (!isWorkType(type)) return;

    setWorkProfile((current) => {
      const template = getTemplate(type);
      const updated: WorkProfile = {
        ...applyTemplateToProfile(current, type, language, true),
        type,
        citationStyle: template.defaultCitationStyle,
        interfaceLanguage: language,
        workLanguage: language,
        updatedAt: new Date().toISOString(),
      };

      saveWorkProfileLocal(updated);

      void fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updated,
          workType: updated.type,
          work_type: updated.type,
          citation: updated.citationStyle,
          citationNorm: updated.citationStyle,
          citation_style: updated.citationStyle,
        }),
      }).catch((err) => {
        console.warn("PROFILE TYPE SAVE SKIPPED:", err);
      });

      return updated;
    });
  }

  function updateWorkProfileField<K extends keyof WorkProfile>(
    key: K,
    value: WorkProfile[K],
  ) {
    setSuccess("");

    if (key === "type") {
      selectWorkType(
        isWorkType(value) ? value : normalizeStoredWorkType(value),
      );
      return;
    }

    setWorkProfile((current) => {
      const updated: WorkProfile = {
        ...current,
        [key]: value,
        interfaceLanguage: language,
        workLanguage: language,
        updatedAt: new Date().toISOString(),
      };

      if (key === "citationStyle") {
        const normalizedCitation = normalizeStoredCitationStyle(value);
        if (normalizedCitation) updated.citationStyle = normalizedCitation;
      }

      saveWorkProfileLocal(updated);
      return updated;
    });
  }

  function openTextEditor(
    title: string,
    key: keyof WorkProfile,
    placeholder?: string,
    mode: EditorMode = "textarea",
    rows = 8,
  ) {
    setEditor({
      title,
      subtitle: u.myWorksTitle,
      placeholder,
      value: String(workProfile[key] || ""),
      mode,
      rows,
      onSave: (value) =>
        updateWorkProfileField(key, value as WorkProfile[typeof key]),
    });
  }

  function saveEditorValue(value: string) {
    if (!editor) return;
    editor.onSave(value);
    setEditor(null);
  }

  async function saveWorkProfile() {
    setSavingWorkProfile(true);
    setError("");
    setSuccess("");

    try {
      const updatedProfile = applyTemplateToProfile(
        workProfile,
        workProfile.type,
        language,
        true,
      );

      setWorkProfile(updatedProfile);
      saveWorkProfileLocal(updatedProfile);

      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedProfile,
          workType: updatedProfile.type,
          work_type: updatedProfile.type,
          citation: updatedProfile.citationStyle,
          citationNorm: updatedProfile.citationStyle,
          citation_style: updatedProfile.citationStyle,
        }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok || !json?.ok) {
        if (!data?.user?.id) {
          setSuccess(u.savedLocalOnly);
          return;
        }

        throw new Error(json?.error || u.workSaveError);
      }

      setSuccess(u.savedSuccess);
    } catch (err: unknown) {
      if (!data?.user?.id) {
        setSuccess(u.savedLocalOnly);
      } else {
        setError(err instanceof Error ? err.message : u.workSaveError);
      }
    } finally {
      setSavingWorkProfile(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "ZMAZAŤ") {
      setError(u.deleteConfirmError);
      return;
    }

    const confirmed = window.confirm(u.deleteConfirmQuestion);
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/profile/delete-account", {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || u.deleteError);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("active_profile");
        localStorage.removeItem("profile");
        localStorage.removeItem("profiles_full");
        localStorage.removeItem("generated_texts");
        localStorage.removeItem("chat_history");
        localStorage.removeItem("saved_outputs");
        localStorage.removeItem("latest_generated_work_text");
        localStorage.removeItem("zedpera_originality_protocol_result");
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : u.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  async function logout() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    loadProfile();
    loadWorkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMountLanguageEffect.current) {
      didMountLanguageEffect.current = true;
      return;
    }

    setWorkProfile((current) => {
      const safeType = isWorkType(current.type)
        ? current.type
        : normalizeStoredWorkType(current.type);

      const updated = applyTemplateToProfile(current, safeType, language, true);
      saveWorkProfileLocal(updated);
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                {data?.user?.email || "Neprihlásený používateľ"}
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
            <button
              type="button"
              onClick={createNewEmptyWorkProfile}
              className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              {u.createEmptyProfile}
            </button>
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

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {u.interfaceLanguageInfo}
            </p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
              {getLanguageName(language)}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {u.interfaceLanguageInfoText}
            </p>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                  <BookOpen className="h-4 w-4" />
                  {u.myWorksTitle}
                </div>
                <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
                  {u.profileTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {u.profileDescription}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={createNewEmptyWorkProfile}
                  disabled={savingWorkProfile}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/30 dark:bg-white/10 dark:text-blue-200 dark:hover:bg-white/15"
                >
                  <Plus className="h-4 w-4" />
                  {u.createEmptyProfile}
                </button>
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

          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab("academic")}
              className={tabButtonClass(activeTab === "academic")}
            >
              <BookOpen className="h-4 w-4" />
              {u.myWorksTitle}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={tabButtonClass(activeTab === "basic")}
            >
              <FileText className="h-4 w-4" />
              {u.profile}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("structure")}
              className={tabButtonClass(activeTab === "structure")}
            >
              <CheckCircle2 className="h-4 w-4" />
              {u.structure}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={tabButtonClass(activeTab === "account")}
            >
              <User className="h-4 w-4" />
              {u.accountStateTitle}
            </button>
          </div>

          {activeTab === "account" && (
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
                text={`${u.currentPlan}: ${data?.profile?.plan || "free"} | ${u.currency}: ${data?.profile?.currency || "EUR"}`}
              />
              <InfoCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                title={u.accountStateTitle}
                text={`${u.email}: ${data?.user?.email || ""}`}
              />
            </div>
          )}

          <section className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-500/30 dark:bg-white/5">
            {workProfileLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-slate-300">
                {u.loadingWork}
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === "academic" && (
                  <div className="space-y-6">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <ChoicePanel
                        title={u.workType}
                        value={workTypeLabel}
                        hint={u.chooseByClick}
                      >
                        <div className="grid max-h-[430px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                          {WORK_TYPE_ORDER.map((type) => (
                            <SelectCard
                              key={type}
                              active={activeWorkType === type}
                              title={templateLabel(type, language)}
                              subtitle={templateDescription(type, language)}
                              onClick={() => selectWorkType(type)}
                            />
                          ))}
                        </div>
                      </ChoicePanel>

                      <ChoicePanel
                        title={u.citationStyle}
                        value={citationLabel}
                        hint={u.chooseByClick}
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          {CITATION_OPTIONS.map((item) => (
                            <SelectCard
                              key={item.value}
                              active={workProfile.citationStyle === item.value}
                              title={item.label}
                              subtitle={u.citationStyle}
                              onClick={() =>
                                updateWorkProfileField(
                                  "citationStyle",
                                  item.value,
                                )
                              }
                            />
                          ))}
                        </div>
                      </ChoicePanel>
                    </div>

                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">
                        {u.activeTemplate}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {workTypeLabel}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-100">
                        {workTypeDescription}
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <MiniInfo
                          label={u.recommendedLength}
                          value={workProfile.recommendedLength}
                        />
                        <MiniInfo
                          label={u.citationStyle}
                          value={citationLabel}
                        />
                        <MiniInfo
                          label={u.workLanguage}
                          value={getLanguageName(language)}
                        />
                      </div>
                      <p className="mt-4 text-xs font-bold text-emerald-700 dark:text-emerald-200/90">
                        {u.templateLoaded}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <OpenProfileCard
                        u={u}
                        label={u.structure}
                        value={workProfile.structure}
                        placeholder={u.structurePlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.structure,
                            "structure",
                            u.structurePlaceholder,
                            "textarea",
                            16,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.requiredSections}
                        value={workProfile.requiredSections}
                        placeholder={u.requiredSectionsPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.requiredSections,
                            "requiredSections",
                            u.requiredSectionsPlaceholder,
                            "textarea",
                            12,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.recommendedLength}
                        value={workProfile.recommendedLength}
                        placeholder={u.recommendedLengthPlaceholder}
                        mode="input"
                        onOpen={() =>
                          openTextEditor(
                            u.recommendedLength,
                            "recommendedLength",
                            u.recommendedLengthPlaceholder,
                            "input",
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.aiInstruction}
                        value={workProfile.aiInstruction}
                        placeholder={u.aiInstructionPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.aiInstruction,
                            "aiInstruction",
                            u.aiInstructionPlaceholder,
                            "textarea",
                            10,
                          )
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <OpenProfileCard
                        u={u}
                        label={u.annotation}
                        value={workProfile.annotation}
                        placeholder={u.annotationPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.annotation,
                            "annotation",
                            u.annotationPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.goal}
                        value={workProfile.goal}
                        placeholder={u.goalPlaceholder}
                        onOpen={() =>
                          openTextEditor(u.goal, "goal", u.goalPlaceholder)
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.researchProblem}
                        value={workProfile.researchProblem}
                        placeholder={u.researchProblemPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.researchProblem,
                            "researchProblem",
                            u.researchProblemPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.methodology}
                        value={workProfile.methodology}
                        placeholder={u.methodologyPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.methodology,
                            "methodology",
                            u.methodologyPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.hypotheses}
                        value={workProfile.hypotheses}
                        placeholder={u.hypothesesPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.hypotheses,
                            "hypotheses",
                            u.hypothesesPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.researchQuestions}
                        value={workProfile.researchQuestions}
                        placeholder={u.researchQuestionsPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.researchQuestions,
                            "researchQuestions",
                            u.researchQuestionsPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.practicalPart}
                        value={workProfile.practicalPart}
                        placeholder={u.practicalPartPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.practicalPart,
                            "practicalPart",
                            u.practicalPartPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.scientificContribution}
                        value={workProfile.scientificContribution}
                        placeholder={u.scientificContributionPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.scientificContribution,
                            "scientificContribution",
                            u.scientificContributionPlaceholder,
                          )
                        }
                      />
                      <OpenProfileCard
                        u={u}
                        label={u.sourcesRequirement}
                        value={workProfile.sourcesRequirement}
                        placeholder={u.sourcesRequirementPlaceholder}
                        onOpen={() =>
                          openTextEditor(
                            u.sourcesRequirement,
                            "sourcesRequirement",
                            u.sourcesRequirementPlaceholder,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {activeTab === "basic" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <OpenProfileCard
                      u={u}
                      label={u.title}
                      value={workProfile.title}
                      placeholder={u.titlePlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.title,
                          "title",
                          u.titlePlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.topic}
                      value={workProfile.topic}
                      placeholder={u.topicPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.topic,
                          "topic",
                          u.topicPlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.level}
                      value={workProfile.level}
                      placeholder={u.levelPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.level,
                          "level",
                          u.levelPlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.field}
                      value={workProfile.field}
                      placeholder={u.fieldPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.field,
                          "field",
                          u.fieldPlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.specialization}
                      value={workProfile.specialization}
                      placeholder={u.specializationPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.specialization,
                          "specialization",
                          u.specializationPlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.supervisor}
                      value={workProfile.supervisor}
                      placeholder={u.supervisorPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.supervisor,
                          "supervisor",
                          u.supervisorPlaceholder,
                          "input",
                        )
                      }
                    />
                  </div>
                )}

                {activeTab === "structure" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <OpenProfileCard
                      u={u}
                      label={u.structure}
                      value={workProfile.structure}
                      placeholder={u.structurePlaceholder}
                      onOpen={() =>
                        openTextEditor(
                          u.structure,
                          "structure",
                          u.structurePlaceholder,
                          "textarea",
                          16,
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.requiredSections}
                      value={workProfile.requiredSections}
                      placeholder={u.requiredSectionsPlaceholder}
                      onOpen={() =>
                        openTextEditor(
                          u.requiredSections,
                          "requiredSections",
                          u.requiredSectionsPlaceholder,
                          "textarea",
                          12,
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.recommendedLength}
                      value={workProfile.recommendedLength}
                      placeholder={u.recommendedLengthPlaceholder}
                      mode="input"
                      onOpen={() =>
                        openTextEditor(
                          u.recommendedLength,
                          "recommendedLength",
                          u.recommendedLengthPlaceholder,
                          "input",
                        )
                      }
                    />
                    <OpenProfileCard
                      u={u}
                      label={u.aiInstruction}
                      value={workProfile.aiInstruction}
                      placeholder={u.aiInstructionPlaceholder}
                      onOpen={() =>
                        openTextEditor(
                          u.aiInstruction,
                          "aiInstruction",
                          u.aiInstructionPlaceholder,
                          "textarea",
                          10,
                        )
                      }
                    />
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-black/20 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-slate-600 dark:text-slate-300">
                    {u.lastChange}:{" "}
                    <strong>
                      {new Date(workProfile.updatedAt).toLocaleString("sk-SK")}
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
                onChange={(event) => setDeleteConfirm(event.target.value)}
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

      {editor && (
        <ProfileEditorModal
          u={u}
          editor={editor}
          onCancel={() => setEditor(null)}
          onSave={saveEditorValue}
        />
      )}
    </main>
  );
}

function tabButtonClass(active: boolean) {
  return [
    "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition",
    active
      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
  ].join(" ");
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/70 p-3 dark:border-emerald-500/20 dark:bg-black/20">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200/80">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
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

function ChoicePanel({
  title,
  value,
  hint,
  children,
}: {
  title: string;
  value: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
          {value}
        </span>
      </div>
      {children}
    </section>
  );
}

function SelectCard({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group min-h-[86px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5",
        active
          ? "border-blue-500 bg-blue-600/15 shadow-lg shadow-blue-950/10 dark:bg-blue-500/20"
          : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <span
          className={[
            "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            active
              ? "border-blue-500 bg-blue-600"
              : "border-slate-300 bg-white dark:border-white/20 dark:bg-white/5",
          ].join(" ")}
        >
          {active && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      </div>
    </button>
  );
}

function OpenProfileCard({
  u,
  label,
  placeholder,
  value,
  mode = "textarea",
  onOpen,
}: {
  u: UIText;
  label: string;
  placeholder: string;
  value: string;
  mode?: EditorMode;
  onOpen: () => void;
}) {
  const filled = Boolean(value.trim());

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full min-h-[144px] cursor-pointer flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {label}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {u.openEditor}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          <Pencil className="h-4 w-4" />
        </span>
      </div>
      <div
        className={[
          "flex-1 overflow-hidden rounded-2xl border px-3 py-2 text-sm leading-6",
          filled
            ? "border-slate-200 bg-slate-50 text-slate-800 dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
            : "border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-black/20 dark:text-slate-500",
          mode === "input" ? "flex items-center" : "",
        ].join(" ")}
      >
        <p
          className={
            mode === "textarea"
              ? "line-clamp-4 whitespace-pre-wrap"
              : "line-clamp-1"
          }
        >
          {filled ? value : placeholder}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span
          className={
            filled
              ? "font-bold text-emerald-600 dark:text-emerald-300"
              : "font-bold text-slate-400"
          }
        >
          {filled ? u.filled : u.empty}
        </span>
        <span className="font-black text-blue-600 transition group-hover:text-blue-700 dark:text-blue-300">
          {u.open}
        </span>
      </div>
    </button>
  );
}

function ProfileEditorModal({
  u,
  editor,
  onCancel,
  onSave,
}: {
  u: UIText;
  editor: EditorState;
  onCancel: () => void;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(editor.value);

  useEffect(() => {
    setDraft(editor.value);
  }, [editor.value]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onSave(draft);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draft, onCancel, onSave]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
      <div className="flex h-[min(760px,calc(100vh-48px))] w-[min(980px,calc(100vw-32px))] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl shadow-black/40 dark:bg-[#070b18]">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                <Pencil className="h-3.5 w-3.5" />
                {u.editWindow}
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">
                {editor.title}
              </h2>
              {editor.subtitle && (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {editor.subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              aria-label="Zavrieť bez uloženia"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 p-5 md:p-6">
          {editor.mode === "input" ? (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={editor.placeholder}
              className="h-16 w-full rounded-3xl border border-slate-200 bg-white px-5 text-lg font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#111525] dark:text-white dark:placeholder:text-slate-500"
            />
          ) : (
            <textarea
              autoFocus
              value={draft}
              rows={editor.rows || 12}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={editor.placeholder}
              className="h-full w-full resize-none rounded-3xl border border-slate-200 bg-white p-5 text-base leading-8 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#111525] dark:text-white dark:placeholder:text-slate-500"
            />
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03] md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {u.cancel}
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {u.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
