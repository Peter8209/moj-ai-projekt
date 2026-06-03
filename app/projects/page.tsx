'use client';

import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  GraduationCap,
  GripVertical,
  Home,
  Library,
  LibraryBig,
  LogOut,
  MessageCircle,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type WorkTypeKey =
  | 'essay'
  | 'seminar'
  | 'semester'
  | 'bachelor'
  | 'diploma'
  | 'rigorous'
  | 'dissertation'
  | 'habilitation'
  | 'soc'
  | 'caseStudy'
  | 'researchPaper'
  | 'article'
  | 'reflection'
  | 'project'
  | 'businessPlan'
  | 'technicalReport'
  | 'laboratoryReport'
  | 'thesisProposal';

type CitationStyleKey =
  | 'apa7'
  | 'harvard'
  | 'iso690'
  | 'footnotes';

type WorkTemplate = {
  key: WorkTypeKey;
  label: string;
  description: string;
  level: string;
  recommendedLength: string;
  defaultCitationStyle: CitationStyleKey;
  structure: string[];
  requiredSections: string[];
  methodologyHint: string;
  aiInstruction: string;
};

type CitationStyle = {
  key: CitationStyleKey;
  label: string;
  description: string;
  disciplines: string[];
};

type SavedProfile = {
  id: string;
  user_id?: string;
  type?: string;
  typeKey?: WorkTypeKey;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
  citationStyle?: string;
  language?: string;
  interfaceLanguage?: string;
  workLanguage?: string;
  annotation?: string;
  goal?: string;
  problem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  businessProblem?: string;
  businessGoal?: string;
  implementation?: string;
  caseStudy?: string;
  reflection?: string;
  sourcesRequirement?: string;
  keywordsList?: string[];
  keywords?: string[];
  savedAt?: string;
  created_at?: string;
  updated_at?: string;
  schema?: {
    typeKey?: string;
    label?: string;
    description?: string;
    recommendedLength?: string;
    citationOptions?: string[];
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
  full_profile?: any;
  work_language?: string;
  research_questions?: string;
  practical_part?: string;
  scientific_contribution?: string;
  business_problem?: string;
  business_goal?: string;
  case_study?: string;
  sources_requirement?: string;
  keywords_list?: string[];
};

type ProfileWizardState = {
  id: string;
  typeKey: WorkTypeKey;
  type: string;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  level: string;
  language: string;
  interfaceLanguage: string;
  workLanguage: string;
  citation: CitationStyleKey;
  citationStyle: string;
  annotation: string;
  goal: string;
  problem: string;
  methodology: string;
  hypotheses: string;
  researchQuestions: string;
  practicalPart: string;
  scientificContribution: string;
  businessProblem: string;
  businessGoal: string;
  implementation: string;
  caseStudy: string;
  reflection: string;
  sourcesRequirement: string;
  keywordsText: string;
  recommendedLength: string;
  structure: string[];
  requiredSections: string[];
  aiInstruction: string;
  savedAt: string;
  updated_at: string;
};

type DropPosition = 'before' | 'after';

type AppDialogVariant = 'info' | 'success' | 'warning' | 'danger' | 'error';

type AppNoticeState = {
  label?: string;
  title: string;
  message: string;
  detail?: string;
  detailLabel?: string;
  closeLabel?: string;
  variant?: AppDialogVariant;
} | null;

type AppConfirmState = {
  label?: string;
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  processingLabel?: string;
  variant?: AppDialogVariant;
  onConfirm: () => void | Promise<void>;
} | null;

const PROJECT_ORDER_KEY = 'zedpera_projects_order';
const WIZARD_DRAFT_KEY = 'zedpera_profile_wizard_draft';
const NEW_PROFILE_QUERY_KEY = 'new';

function clearProfileWizardDraft() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
  } catch (error) {
    console.warn('CLEAR PROFILE WIZARD DRAFT WARNING:', error);
  }
}


const WORK_TEMPLATES: Record<WorkTypeKey, WorkTemplate> = {
  essay: {
    key: 'essay',
    label: 'Esej',
    description: 'Argumentačný alebo reflexívny odborný text.',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '3 – 8 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Názov eseje', 'Úvod s tézou', 'Vymedzenie problému', 'Argumentačná časť', 'Protiargument', 'Vlastné stanovisko', 'Záver', 'Zoznam literatúry'],
    requiredSections: ['Úvod', 'Téza', 'Argumenty', 'Protiargument', 'Záver', 'Zdroje'],
    methodologyHint: 'Esej musí mať jasnú tézu, argumenty, príklady, kritické porovnanie a vlastný záver.',
    aiInstruction: 'Vytváraj akademickú esej s jasnou tézou, súvislou argumentáciou a odborným štýlom.',
  },
  seminar: {
    key: 'seminar',
    label: 'Seminárna práca',
    description: 'Krátka odborná školská práca so zdrojmi.',
    level: 'Stredoškolské / bakalárske štúdium',
    recommendedLength: '8 – 15 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Obsah', 'Úvod', 'Cieľ práce', 'Teoretická časť', 'Analytická alebo praktická časť', 'Záver', 'Zoznam použitej literatúry', 'Prílohy'],
    requiredSections: ['Úvod', 'Cieľ práce', 'Teoretická časť', 'Záver', 'Zdroje'],
    methodologyHint: 'Seminárna práca má preukázať schopnosť pracovať s odbornou literatúrou a správne citovať.',
    aiInstruction: 'Vytváraj odborný text seminárnej práce s jasnou štruktúrou, citáciami a vecným akademickým štýlom.',
  },
  semester: {
    key: 'semester',
    label: 'Semestrálna práca',
    description: 'Práca k predmetu s riešením zadania.',
    level: 'Vysokoškolské štúdium',
    recommendedLength: '10 – 20 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Zadanie práce', 'Obsah', 'Úvod', 'Cieľ práce', 'Teoretické východiská', 'Riešenie úlohy', 'Vyhodnotenie', 'Záver', 'Literatúra', 'Prílohy'],
    requiredSections: ['Zadanie', 'Cieľ práce', 'Riešenie', 'Vyhodnotenie', 'Záver'],
    methodologyHint: 'Semestrálna práca má ukázať zvládnutie témy a aplikáciu poznatkov na konkrétnu úlohu.',
    aiInstruction: 'Vytváraj štruktúrovanú semestrálnu prácu s dôrazom na riešenie zadania a kontrolovateľné závery.',
  },
  bachelor: {
    key: 'bachelor',
    label: 'Bakalárska práca',
    description: 'Záverečná práca bakalárskeho štúdia.',
    level: 'Bakalárske štúdium',
    recommendedLength: '30 – 50 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Zadanie práce', 'Čestné vyhlásenie', 'Poďakovanie', 'Abstrakt', 'Kľúčové slová', 'Obsah', 'Zoznam skratiek', 'Úvod', 'Cieľ práce', 'Metodika práce', 'Teoretická časť', 'Analytická alebo praktická časť', 'Diskusia', 'Záver', 'Zoznam použitej literatúry', 'Prílohy'],
    requiredSections: ['Abstrakt', 'Úvod', 'Cieľ práce', 'Metodika', 'Teoretická časť', 'Praktická časť', 'Záver', 'Literatúra'],
    methodologyHint: 'Bakalárska práca má preukázať orientáciu v odbore, prácu so zdrojmi a spracovanie odborného problému.',
    aiInstruction: 'Vytváraj akademický text bakalárskej práce s metodikou, odbornou terminológiou, citáciami a jasnými závermi.',
  },
  diploma: {
    key: 'diploma',
    label: 'Diplomová práca',
    description: 'Záverečná práca magisterského alebo inžinierskeho štúdia.',
    level: 'Magisterské / inžinierske štúdium',
    recommendedLength: '50 – 80 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Zadanie práce', 'Čestné vyhlásenie', 'Poďakovanie', 'Abstrakt', 'Abstract', 'Kľúčové slová', 'Obsah', 'Zoznam obrázkov', 'Zoznam tabuliek', 'Zoznam skratiek', 'Úvod', 'Cieľ práce', 'Výskumný problém', 'Metodológia', 'Teoretické východiská', 'Analytická časť', 'Výskumná alebo praktická časť', 'Diskusia', 'Odporúčania pre prax', 'Záver', 'Zoznam použitej literatúry', 'Prílohy'],
    requiredSections: ['Abstrakt', 'Úvod', 'Cieľ práce', 'Metodológia', 'Teoretická časť', 'Výskumná/praktická časť', 'Diskusia', 'Záver', 'Literatúra'],
    methodologyHint: 'Diplomová práca musí mať hlbšie výskumné alebo aplikačné spracovanie, jasnú metodológiu a vyhodnotenie.',
    aiInstruction: 'Vytváraj odborný text diplomovej práce s výskumným problémom, metodológiou, analytickou časťou a diskusiou.',
  },
  rigorous: {
    key: 'rigorous',
    label: 'Rigorózna práca',
    description: 'Odborná práca pre rigorózne konanie.',
    level: 'Rigorózne konanie',
    recommendedLength: '70 – 120 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Vyhlásenie', 'Abstrakt', 'Obsah', 'Úvod', 'Stav poznania', 'Cieľ práce', 'Metodológia', 'Hlavné kapitoly', 'Diskusia', 'Záver', 'Zoznam literatúry', 'Prílohy'],
    requiredSections: ['Úvod', 'Stav poznania', 'Metodológia', 'Odborná analýza', 'Záver', 'Literatúra'],
    methodologyHint: 'Rigorózna práca musí preukázať vyššiu odbornú samostatnosť a hlbšiu vedecko-odbornú argumentáciu.',
    aiInstruction: 'Vytváraj rigorózny odborný text s dôrazom na vedeckú argumentáciu, stav poznania, metodiku a vlastný prínos.',
  },
  dissertation: {
    key: 'dissertation',
    label: 'Dizertačná práca',
    description: 'Doktorandská vedecká práca s originálnym výskumom.',
    level: 'Doktorandské štúdium',
    recommendedLength: '100 – 180 strán',
    defaultCitationStyle: 'apa7',
    structure: ['Titulná strana', 'Vyhlásenie', 'Poďakovanie', 'Abstrakt', 'Abstract', 'Obsah', 'Zoznam skratiek', 'Úvod', 'Výskumný problém', 'Stav vedeckého poznania', 'Ciele dizertačnej práce', 'Výskumné otázky a hypotézy', 'Metodológia výskumu', 'Výsledky výskumu', 'Diskusia', 'Vedecký prínos', 'Limity výskumu', 'Záver', 'Zoznam literatúry', 'Publikačná činnosť autora', 'Prílohy'],
    requiredSections: ['Výskumný problém', 'Stav poznania', 'Hypotézy/otázky', 'Metodológia', 'Výsledky', 'Diskusia', 'Vedecký prínos', 'Záver'],
    methodologyHint: 'Dizertačná práca musí prinášať nový vedecký poznatok, originálny výskum a jasne formulovaný prínos.',
    aiInstruction: 'Vytváraj vedecký text dizertačnej práce s dôrazom na výskumnú originalitu, metodologickú presnosť a prínos.',
  },
  habilitation: {
    key: 'habilitation',
    label: 'Habilitačná práca',
    description: 'Vedecká práca pre habilitačné konanie.',
    level: 'Habilitačné konanie',
    recommendedLength: '120 – 250 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Obsah', 'Úvod', 'Vedecký kontext', 'Autorský prínos', 'Syntéza výskumných výsledkov', 'Metodologické východiská', 'Hlavné kapitoly', 'Diskusia', 'Záver', 'Zoznam literatúry', 'Prehľad publikačnej činnosti'],
    requiredSections: ['Vedecký kontext', 'Autorský prínos', 'Syntéza výsledkov', 'Diskusia', 'Záver'],
    methodologyHint: 'Habilitačná práca musí preukázať vedeckú zrelosť, systematický výskum a významný prínos autora.',
    aiInstruction: 'Vytváraj vysoko odborný vedecký text s dôrazom na syntézu poznania, autorský prínos a akademickú argumentáciu.',
  },
  soc: {
    key: 'soc',
    label: 'SOČ / odborná stredoškolská práca',
    description: 'Stredoškolská odborná práca.',
    level: 'Stredoškolské štúdium',
    recommendedLength: '15 – 25 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Čestné vyhlásenie', 'Poďakovanie', 'Obsah', 'Úvod', 'Cieľ práce', 'Teoretická časť', 'Praktická časť', 'Výsledky', 'Záver', 'Použitá literatúra', 'Prílohy'],
    requiredSections: ['Úvod', 'Cieľ', 'Teoretická časť', 'Praktická časť', 'Záver', 'Literatúra'],
    methodologyHint: 'SOČ má byť zrozumiteľná, prakticky zameraná a musí ukázať samostatnú prácu študenta.',
    aiInstruction: 'Vytváraj odbornú, ale zrozumiteľnú prácu vhodnú pre stredoškolskú odbornú činnosť.',
  },
  caseStudy: {
    key: 'caseStudy',
    label: 'Prípadová štúdia',
    description: 'Analýza konkrétneho prípadu a návrh riešení.',
    level: 'Odborné / vysokoškolské štúdium',
    recommendedLength: '8 – 25 strán',
    defaultCitationStyle: 'apa7',
    structure: ['Názov prípadovej štúdie', 'Úvod', 'Opis prípadu', 'Kontext problému', 'Analýza situácie', 'Možné riešenia', 'Vyhodnotenie riešení', 'Odporúčanie', 'Záver', 'Zdroje'],
    requiredSections: ['Opis prípadu', 'Analýza', 'Riešenia', 'Odporúčanie', 'Záver'],
    methodologyHint: 'Prípadová štúdia musí pracovať s konkrétnym prípadom, analyzovať okolnosti a navrhnúť riešenia.',
    aiInstruction: 'Vytváraj analytickú prípadovú štúdiu s jasným opisom problému, argumentovaným riešením a odporúčaním.',
  },
  researchPaper: {
    key: 'researchPaper',
    label: 'Výskumná štúdia',
    description: 'Akademická štúdia v štýle IMRaD.',
    level: 'Akademické / vedecké štúdium',
    recommendedLength: '15 – 40 strán',
    defaultCitationStyle: 'apa7',
    structure: ['Názov', 'Abstrakt', 'Kľúčové slová', 'Úvod', 'Prehľad literatúry', 'Metodológia', 'Výsledky', 'Diskusia', 'Záver', 'Referencie'],
    requiredSections: ['Abstrakt', 'Úvod', 'Metodológia', 'Výsledky', 'Diskusia', 'Referencie'],
    methodologyHint: 'Výskumná štúdia musí mať výskumný problém, metodiku, výsledky a interpretáciu.',
    aiInstruction: 'Vytváraj vedeckú štúdiu v štýle IMRaD s dôrazom na presnosť, metodológiu, výsledky a citácie.',
  },
  article: {
    key: 'article',
    label: 'Odborný článok',
    description: 'Publikačne použiteľný odborný text.',
    level: 'Odborná / akademická publikácia',
    recommendedLength: '6 – 20 strán',
    defaultCitationStyle: 'apa7',
    structure: ['Názov článku', 'Abstrakt', 'Kľúčové slová', 'Úvod', 'Jadro článku', 'Diskusia', 'Záver', 'Zoznam literatúry'],
    requiredSections: ['Abstrakt', 'Úvod', 'Jadro článku', 'Záver', 'Literatúra'],
    methodologyHint: 'Odborný článok musí byť vecný, koncentrovaný, argumentačne jasný a publikačne použiteľný.',
    aiInstruction: 'Vytváraj odborný článok so súvislou argumentáciou, akademickým štýlom, citáciami a jasným záverom.',
  },
  reflection: {
    key: 'reflection',
    label: 'Reflexia',
    description: 'Reflexívny odborný text.',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '2 – 6 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Názov reflexie', 'Úvod', 'Opis skúsenosti alebo problému', 'Osobná analýza', 'Odborné prepojenie', 'Poučenie', 'Záver'],
    requiredSections: ['Opis skúsenosti', 'Vlastná reflexia', 'Odborné prepojenie', 'Záver'],
    methodologyHint: 'Reflexia má obsahovať vlastné premýšľanie, hodnotenie skúsenosti a odborné prepojenie s témou.',
    aiInstruction: 'Vytváraj reflexívny text s odborným podtónom a priestorom pre osobné hodnotenie.',
  },
  project: {
    key: 'project',
    label: 'Projektová práca',
    description: 'Praktický projekt s návrhom riešenia.',
    level: 'Školský / odborný projekt',
    recommendedLength: '10 – 40 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Opis projektu', 'Cieľ projektu', 'Východiská', 'Návrh riešenia', 'Realizácia', 'Časový harmonogram', 'Rozpočet', 'Riziká', 'Vyhodnotenie', 'Záver', 'Zdroje'],
    requiredSections: ['Cieľ projektu', 'Návrh riešenia', 'Realizácia', 'Vyhodnotenie', 'Záver'],
    methodologyHint: 'Projektová práca musí ukázať cieľ, postup, zdroje, realizáciu a merateľné vyhodnotenie.',
    aiInstruction: 'Vytváraj projektovú prácu s praktickým riešením, harmonogramom, vyhodnotením a odborným štýlom.',
  },
  businessPlan: {
    key: 'businessPlan',
    label: 'Podnikateľský plán',
    description: 'Ekonomický a manažérsky dokument.',
    level: 'Odborná / ekonomická práca',
    recommendedLength: '15 – 40 strán',
    defaultCitationStyle: 'harvard',
    structure: ['Executive summary', 'Opis podnikateľského zámeru', 'Produkt alebo služba', 'Analýza trhu', 'Cieľová skupina', 'Marketingová stratégia', 'Prevádzkový plán', 'Finančný plán', 'Riziká', 'Záver'],
    requiredSections: ['Opis zámeru', 'Trh', 'Marketing', 'Financie', 'Riziká', 'Záver'],
    methodologyHint: 'Podnikateľský plán musí byť praktický, číselne podložený a zameraný na realizovateľnosť.',
    aiInstruction: 'Vytváraj profesionálny podnikateľský plán s dôrazom na trh, financie, riziká a realizovateľnosť.',
  },
  technicalReport: {
    key: 'technicalReport',
    label: 'Technická správa',
    description: 'Technický opis, výpočty, normy a postup.',
    level: 'Technické / inžinierske štúdium',
    recommendedLength: '10 – 50 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Titulná strana', 'Zadanie', 'Technický opis', 'Vstupné podmienky', 'Návrh riešenia', 'Výpočty', 'Materiály', 'Technologický postup', 'Bezpečnostné požiadavky', 'Záver', 'Prílohy'],
    requiredSections: ['Technický opis', 'Návrh riešenia', 'Výpočty', 'Záver'],
    methodologyHint: 'Technická správa musí byť presná, kontrolovateľná a musí obsahovať technické parametre, normy a výpočty.',
    aiInstruction: 'Vytváraj technickú správu s vecným opisom, výpočtami, normami, materiálmi a presným technickým jazykom.',
  },
  laboratoryReport: {
    key: 'laboratoryReport',
    label: 'Laboratórny protokol',
    description: 'Protokol z merania alebo experimentu.',
    level: 'Stredoškolské / vysokoškolské štúdium',
    recommendedLength: '3 – 12 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Názov merania', 'Cieľ merania', 'Teoretický základ', 'Pomôcky a zariadenia', 'Postup merania', 'Namerané hodnoty', 'Výpočty', 'Vyhodnotenie', 'Záver'],
    requiredSections: ['Cieľ', 'Postup', 'Hodnoty', 'Výpočty', 'Záver'],
    methodologyHint: 'Laboratórny protokol musí byť presný, reprodukovateľný a musí obsahovať postup, dáta, výpočty a vyhodnotenie.',
    aiInstruction: 'Vytváraj laboratórny protokol s dôrazom na meranie, postup, tabuľky, výpočty a odborné vyhodnotenie.',
  },
  thesisProposal: {
    key: 'thesisProposal',
    label: 'Návrh záverečnej práce',
    description: 'Profil témy, cieľov, metodológie a štruktúry.',
    level: 'Bakalárske / magisterské / doktorandské štúdium',
    recommendedLength: '5 – 15 strán',
    defaultCitationStyle: 'iso690',
    structure: ['Pracovný názov', 'Vymedzenie témy', 'Výskumný problém', 'Ciele práce', 'Výskumné otázky', 'Metodológia', 'Predpokladaná štruktúra', 'Predbežný zoznam literatúry', 'Harmonogram'],
    requiredSections: ['Téma', 'Cieľ', 'Výskumný problém', 'Metodológia', 'Štruktúra', 'Literatúra'],
    methodologyHint: 'Návrh práce musí presne ukázať, čo bude študent skúmať, ako to bude skúmať a aký výsledok očakáva.',
    aiInstruction: 'Vytváraj návrh záverečnej práce s jasným výskumným problémom, cieľmi, otázkami, metodikou a štruktúrou.',
  },
};

const CITATION_STYLES: CitationStyle[] = [
  {
    key: 'apa7',
    label: 'APA',
    description:
      'Autor-dátum systém. V texte sa používa tvar (Priezvisko, rok). Zoznam zdrojov sa na konci delí na primárne a sekundárne zdroje bez referenčných čísel.',
    disciplines: ['autor-dátum', 'Priezvisko, rok', 'bez čísiel v texte'],
  },
  {
    key: 'harvard',
    label: 'Harvard',
    description:
      'Autor-dátum systém. V texte sa používa tvar (Priezvisko, rok). Zoznam zdrojov sa na konci delí na primárne a sekundárne zdroje bez referenčných čísel.',
    disciplines: ['autor-dátum', 'Priezvisko, rok', 'bez čísiel v texte'],
  },
  {
    key: 'iso690',
    label: 'ISO',
    description:
      'Autor-dátum citačný režim podľa ISO. V texte ostáva odkaz v tvare (Priezvisko, rok) a na konci sa vypíšu primárne a sekundárne zdroje bez referenčných čísel.',
    disciplines: ['ISO', 'autor-dátum', 'bez čísiel v texte'],
  },
  {
    key: 'footnotes',
    label: 'Referencie pod čiarou',
    description:
      'Číselný režim. V texte sa ponechajú malé odkazy v hranatých zátvorkách, napríklad [1]. Použité čísla v texte sa musia zhodovať s číslami v zozname zdrojov.',
    disciplines: ['číselné odkazy', '[1]', 'zhoda čísiel so zdrojmi'],
  },
];

const STEPS = [
  { id: 1, title: 'Typ práce', subtitle: 'Výber šablóny', icon: FileText },
  { id: 2, title: 'Identita práce', subtitle: 'Názov, odbor, jazyk', icon: GraduationCap },
  { id: 3, title: 'Výskumné nastavenie', subtitle: 'Cieľ a metodológia', icon: LibraryBig },
  { id: 4, title: 'Norma a štruktúra', subtitle: 'Povinné časti', icon: ShieldCheck },
  { id: 5, title: 'Kontrola a uloženie', subtitle: 'Finálny profil', icon: Save },
];

function createProfileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isValidUuid(value?: string | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value).trim(),
  );
}

function createSafeProfileId(value?: string | null) {
  if (isValidUuid(value)) return String(value);
  return createProfileId();
}

function getPublicErrorDetail(error: unknown) {
  if (process.env.NODE_ENV !== 'development') return undefined;
  return error instanceof Error ? error.message : String(error || 'Neznáma technická chyba');
}

function normalizeWorkType(value?: string | null): WorkTypeKey {
  if (!value) return 'essay';
  const normalized = String(value).trim().toLowerCase();
  const map: Record<string, WorkTypeKey> = {
    master: 'diploma',
    graduate: 'diploma',
    maturita: 'soc',
    maturitná: 'soc',
    seminarna: 'seminar',
    seminárna: 'seminar',
    bakalarska: 'bachelor',
    bakalárska: 'bachelor',
    diplomova: 'diploma',
    diplomová: 'diploma',
    dizertacna: 'dissertation',
    dizertačná: 'dissertation',
    habilitacna: 'habilitation',
    habilitačná: 'habilitation',
  };
  if (map[normalized]) return map[normalized];
  const found = Object.values(WORK_TEMPLATES).find(
    (template) => template.key.toLowerCase() === normalized || template.label.toLowerCase() === normalized,
  );
  return found?.key ?? 'essay';
}

function normalizeCitationToKey(value?: string | null): CitationStyleKey {
  const raw = String(value || '').trim().toLowerCase();

  if (raw.includes('apa')) return 'apa7';
  if (raw.includes('harvard')) return 'harvard';

  if (
    raw.includes('referencie pod čiarou') ||
    raw.includes('referencie pod ciarou') ||
    raw.includes('pod čiarou') ||
    raw.includes('pod ciarou') ||
    raw.includes('footnote') ||
    raw.includes('poznámk') ||
    raw.includes('poznamk') ||
    raw.includes('čísel') ||
    raw.includes('cisel') ||
    raw.includes('numeric') ||
    raw.includes('number') ||
    raw.includes('iso690_numeric') ||
    raw.includes('chicago') ||
    raw.includes('vancouver') ||
    raw.includes('ieee')
  ) {
    return 'footnotes';
  }

  if (raw.includes('iso')) return 'iso690';

  if (CITATION_STYLES.some((item) => item.key === raw)) {
    return raw as CitationStyleKey;
  }

  return 'iso690';
}

function citationLabel(key: CitationStyleKey | string) {
  return CITATION_STYLES.find((item) => item.key === key)?.label || String(key || 'ISO 690');
}

function formatLanguageBadge(value?: string | null) {
  const normalized = String(value || 'sk').trim().toLowerCase();
  const map: Record<string, string> = {
    sk: 'SK · Slovenčina',
    cs: 'CZ · Čeština',
    cz: 'CZ · Čeština',
    en: 'EN · English',
    de: 'DE · Deutsch',
    pl: 'PL · Polski',
    hu: 'HU · Magyar',
  };

  return map[normalized] || normalized.toUpperCase();
}

function getStoredLanguage() {
  if (typeof window === 'undefined') return 'sk';

  const stored =
    localStorage.getItem('zedpera_language') ||
    localStorage.getItem('zedpera_system_language') ||
    localStorage.getItem('zedpera_work_language') ||
    'sk';

  const normalized = String(stored || 'sk').trim().toLowerCase();

  if (['sk', 'cs', 'cz', 'en', 'de', 'pl', 'hu'].includes(normalized)) {
    return normalized === 'cz' ? 'cs' : normalized;
  }

  return 'sk';
}

function getLanguageNameForAi(language: string) {
  const normalized = String(language || 'sk').trim().toLowerCase();
  const names: Record<string, string> = {
    sk: 'Slovak',
    cs: 'Czech',
    en: 'English',
    de: 'German',
    pl: 'Polish',
    hu: 'Hungarian',
  };

  return names[normalized] || 'Slovak';
}

function stripJsonCodeFence(value: string) {
  return String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeParseTranslatedJson(value: string) {
  const cleaned = stripJsonCodeFence(value);

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function translateUiDialogByAi<T extends Record<string, any>>(payload: {
  targetLanguage: string;
  fallback: T;
  kind: 'notice' | 'confirm';
}) {
  const language = String(payload.targetLanguage || 'sk').trim().toLowerCase();

  if (language === 'sk') {
    return payload.fallback;
  }

  try {
    const formData = new FormData();

    formData.append('agent', 'gemini');
    formData.append('module', 'translation');
    formData.append('language', language);
    formData.append('interfaceLanguage', language);
    formData.append('systemLanguage', language);
    formData.append('outputLanguage', language);
    formData.append('workLanguage', language);

    formData.append(
      'messages',
      JSON.stringify([
        {
          role: 'user',
          content: `Translate the following UI system dialog to ${getLanguageNameForAi(language)}.

Return only valid JSON. Do not use markdown. Do not add explanations.
Preserve the exact same JSON keys. Translate only user-visible string values.
Keep technical detail factual and concise.

JSON:
${JSON.stringify(payload.fallback, null, 2)}`,
        },
      ]),
    );

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`AI translation failed with status ${res.status}.`);
    }

    const contentType = res.headers.get('content-type') || '';
    let raw = '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      raw = String(data.output || data.result || data.message || data.text || data.answer || '');
    } else {
      raw = await res.text();
    }

    const parsed = safeParseTranslatedJson(raw);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI translation returned invalid JSON.');
    }

    return {
      ...payload.fallback,
      ...parsed,
    } as T;
  } catch (error) {
    console.warn('AI_UI_DIALOG_TRANSLATION_WARNING:', error);
    return payload.fallback;
  }
}

async function translateNoticeByAi(notice: NonNullable<AppNoticeState>) {
  const fallback = {
    label: notice.label || 'Systémová správa',
    title: notice.title,
    message: notice.message,
    detail: notice.detail || '',
    detailLabel: notice.detailLabel || 'Technický detail',
    closeLabel: notice.closeLabel || 'Rozumiem',
  };

  const translated = await translateUiDialogByAi({
    targetLanguage: getStoredLanguage(),
    fallback,
    kind: 'notice',
  });

  return {
    ...notice,
    label: translated.label || fallback.label,
    title: translated.title || fallback.title,
    message: translated.message || fallback.message,
    detail: notice.detail ? translated.detail || notice.detail : notice.detail,
    detailLabel: translated.detailLabel || fallback.detailLabel,
    closeLabel: translated.closeLabel || fallback.closeLabel,
  };
}

async function translateConfirmByAi(dialog: NonNullable<AppConfirmState>) {
  const fallback = {
    label: dialog.label || 'Potvrdenie akcie',
    title: dialog.title,
    message: dialog.message,
    detail: dialog.detail || '',
    confirmLabel: dialog.confirmLabel,
    cancelLabel: dialog.cancelLabel,
    processingLabel: dialog.processingLabel || 'Spracúvam...',
  };

  const translated = await translateUiDialogByAi({
    targetLanguage: getStoredLanguage(),
    fallback,
    kind: 'confirm',
  });

  return {
    ...dialog,
    label: translated.label || fallback.label,
    title: translated.title || fallback.title,
    message: translated.message || fallback.message,
    detail: dialog.detail ? translated.detail || dialog.detail : dialog.detail,
    confirmLabel: translated.confirmLabel || fallback.confirmLabel,
    cancelLabel: translated.cancelLabel || fallback.cancelLabel,
    processingLabel: translated.processingLabel || fallback.processingLabel,
  };
}


function normalizeTextValue(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeKeywordsInput(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item ?? '').split(','))
      .map((item) => normalizeTextValue(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeKeywordsInput(parsed);
    } catch {
      // bežný text oddelený čiarkami / bodkočiarkami
    }

    return trimmed
      .split(/[,;\n]+/)
      .map((item) => normalizeTextValue(item))
      .filter(Boolean);
  }

  return [];
}

function keywordsToText(value: unknown) {
  return normalizeKeywordsInput(value).join(', ');
}

function buildSavedProfileFromWizard(profile: ProfileWizardState): SavedProfile {
  const keywordsList = normalizeKeywordsInput(profile.keywordsText);

  return normalizeProfileBeforeSave({
    id: profile.id,
    typeKey: profile.typeKey,
    type: profile.type,
    title: profile.title,
    topic: profile.topic || '',
    field: profile.field,
    supervisor: profile.supervisor,
    level: profile.level,
    language: profile.language,
    interfaceLanguage: profile.interfaceLanguage,
    workLanguage: profile.workLanguage,
    citation: citationLabel(profile.citation),
    citationStyle: citationLabel(profile.citation),
    annotation: profile.annotation,
    goal: profile.goal,
    problem: profile.problem,
    methodology: profile.methodology,
    hypotheses: profile.hypotheses,
    researchQuestions: profile.researchQuestions,
    practicalPart: profile.practicalPart,
    scientificContribution: profile.scientificContribution,
    businessProblem: profile.businessProblem,
    businessGoal: profile.businessGoal,
    implementation: profile.implementation,
    caseStudy: profile.caseStudy,
    reflection: profile.reflection,
    sourcesRequirement: profile.sourcesRequirement,
    keywordsList,
    keywords: keywordsList,
    savedAt: profile.savedAt,
    updated_at: new Date().toISOString(),
  });
}

function createWizardProfileFromTemplate(template: WorkTemplate, existing?: Partial<SavedProfile> | null): ProfileWizardState {
  const language = getStoredLanguage();
  const workLanguage = language;
  const citation = normalizeCitationToKey(existing?.citation || existing?.citationStyle || template.defaultCitationStyle);
  const keywordsText =
    keywordsToText((existing as any)?.keywordsText) ||
    keywordsToText(existing?.keywordsList) ||
    keywordsToText(existing?.keywords_list) ||
    keywordsToText(existing?.keywords);

  return {
    id: createSafeProfileId(existing?.id),
    typeKey: template.key,
    type: template.label,
    title: existing?.title || '',
    topic: existing?.topic || '',
    field: existing?.field || '',
    supervisor: existing?.supervisor || '',
    level: template.level,
    language,
    interfaceLanguage: existing?.interfaceLanguage || language,
    workLanguage,
    citation,
    citationStyle: citationLabel(citation),
    annotation: existing?.annotation || '',
    goal: existing?.goal || '',
    problem: existing?.problem || '',
    methodology: existing?.methodology || '',
    hypotheses: existing?.hypotheses || '',
    researchQuestions: existing?.researchQuestions || existing?.research_questions || '',
    practicalPart: existing?.practicalPart || existing?.practical_part || '',
    scientificContribution: existing?.scientificContribution || existing?.scientific_contribution || '',
    businessProblem: existing?.businessProblem || existing?.business_problem || '',
    businessGoal: existing?.businessGoal || existing?.business_goal || '',
    implementation: existing?.implementation || '',
    caseStudy: existing?.caseStudy || existing?.case_study || '',
    reflection: existing?.reflection || '',
    sourcesRequirement: existing?.sourcesRequirement || existing?.sources_requirement || '',
    keywordsText,
    recommendedLength: template.recommendedLength,
    structure: template.structure,
    requiredSections: template.requiredSections,
    aiInstruction: template.aiInstruction,
    savedAt: existing?.savedAt || existing?.updated_at || existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeProfileForApp(row: any): SavedProfile {
  const full = row?.full_profile || row || {};
  const id = createSafeProfileId(row?.id || full.id);
  const typeKey = normalizeWorkType(row?.typeKey || row?.type || full.typeKey || full.type || full.schema?.typeKey);
  const template = WORK_TEMPLATES[typeKey];
  const citation = row?.citation || full.citation || full.citationStyle || citationLabel(template.defaultCitationStyle);

  return {
    ...full,
    id,
    user_id: row?.user_id || full.user_id,
    typeKey,
    type: row?.type || full.type || template.label,
    title: row?.title || full.title || 'Bez názvu',
    level: row?.level || full.level || template.level,
    topic: row?.topic || full.topic || '',
    field: row?.field || full.field || '',
    supervisor: row?.supervisor || full.supervisor || '',
    citation,
    citationStyle: full.citationStyle || citation,
    language: getStoredLanguage(),
    interfaceLanguage: getStoredLanguage(),
    workLanguage: getStoredLanguage(),
    annotation: row?.annotation || full.annotation || '',
    goal: row?.goal || full.goal || '',
    problem: row?.problem || full.problem || '',
    methodology: row?.methodology || full.methodology || '',
    hypotheses: row?.hypotheses || full.hypotheses || '',
    researchQuestions: row?.research_questions || full.researchQuestions || full.research_questions || '',
    practicalPart: row?.practical_part || full.practicalPart || full.practical_part || '',
    scientificContribution: row?.scientific_contribution || full.scientificContribution || full.scientific_contribution || '',
    businessProblem: row?.business_problem || full.businessProblem || full.business_problem || '',
    businessGoal: row?.business_goal || full.businessGoal || full.business_goal || '',
    implementation: row?.implementation || full.implementation || '',
    caseStudy: row?.case_study || full.caseStudy || full.case_study || '',
    reflection: row?.reflection || full.reflection || '',
    sourcesRequirement: row?.sources_requirement || full.sourcesRequirement || full.sources_requirement || '',
    keywordsList: normalizeKeywordsInput(row?.keywords_list || full.keywordsList || full.keywords || (full as any).keywordsText),
    keywords: normalizeKeywordsInput(row?.keywords_list || full.keywords || full.keywordsList || (full as any).keywordsText),
    schema: row?.schema || full.schema || {
      typeKey: template.key,
      label: template.label,
      description: template.description,
      recommendedLength: template.recommendedLength,
      structure: template.structure,
      requiredSections: template.requiredSections,
      aiInstruction: template.aiInstruction,
    },
    savedAt: row?.updated_at || row?.created_at || full.savedAt || full.updated_at || full.created_at || new Date().toISOString(),
    created_at: row?.created_at || full.created_at,
    updated_at: row?.updated_at || full.updated_at,
    full_profile: row?.full_profile || full,
  };
}

function normalizeProfileBeforeSave(profile: SavedProfile, fallbackId?: string): SavedProfile {
  const now = new Date().toISOString();
  const typeKey = normalizeWorkType(profile.typeKey || profile.type || profile.schema?.typeKey);
  const template = WORK_TEMPLATES[typeKey];
  const citationKey = normalizeCitationToKey(profile.citation || profile.citationStyle);
  const normalized: SavedProfile = {
    ...profile,
    id: createSafeProfileId(profile.id || fallbackId),
    typeKey,
    type: template.label,
    title: profile.title || 'Bez názvu',
    level: template.level,
    citation: citationLabel(citationKey),
    citationStyle: citationLabel(citationKey),
    language: getStoredLanguage(),
    interfaceLanguage: getStoredLanguage(),
    workLanguage: getStoredLanguage(),
    researchQuestions: profile.researchQuestions || profile.research_questions || '',
    practicalPart: profile.practicalPart || profile.practical_part || '',
    scientificContribution: profile.scientificContribution || profile.scientific_contribution || '',
    businessProblem: profile.businessProblem || profile.business_problem || '',
    businessGoal: profile.businessGoal || profile.business_goal || '',
    caseStudy: profile.caseStudy || profile.case_study || '',
    sourcesRequirement: profile.sourcesRequirement || profile.sources_requirement || '',
    keywordsList: normalizeKeywordsInput(profile.keywordsList || profile.keywords_list || profile.keywords),
    keywords: normalizeKeywordsInput(profile.keywords || profile.keywordsList || profile.keywords_list),
    schema: {
      typeKey: template.key,
      label: template.label,
      description: template.description,
      recommendedLength: template.recommendedLength,
      structure: template.structure,
      requiredSections: template.requiredSections,
      aiInstruction: template.aiInstruction,
    },
    savedAt: now,
    updated_at: now,
  };

  return { ...normalized, full_profile: { ...normalized, full_profile: undefined } };
}

function buildSupabaseProfilePayload(profile: SavedProfile, userId?: string) {
  const fullProfile = { ...profile, full_profile: undefined };
  return {
    id: createSafeProfileId(profile.id),
    user_id: userId || profile.user_id || null,
    title: profile.title || 'Bez názvu',
    type: profile.type || null,
    level: profile.level || null,
    topic: profile.topic || null,
    field: profile.field || null,
    supervisor: profile.supervisor || null,
    citation: profile.citation || null,
    language: getStoredLanguage(),
    work_language: getStoredLanguage(),
    annotation: profile.annotation || null,
    goal: profile.goal || null,
    problem: profile.problem || null,
    methodology: profile.methodology || null,
    hypotheses: profile.hypotheses || null,
    research_questions: profile.researchQuestions || profile.research_questions || null,
    practical_part: profile.practicalPart || profile.practical_part || null,
    scientific_contribution: profile.scientificContribution || profile.scientific_contribution || null,
    business_problem: profile.businessProblem || profile.business_problem || null,
    business_goal: profile.businessGoal || profile.business_goal || null,
    implementation: profile.implementation || null,
    case_study: profile.caseStudy || profile.case_study || null,
    reflection: profile.reflection || null,
    sources_requirement: profile.sourcesRequirement || profile.sources_requirement || null,
    keywords_list: normalizeKeywordsInput(profile.keywordsList || profile.keywords_list || profile.keywords),
    schema: profile.schema || null,
    full_profile: fullProfile,
    updated_at: new Date().toISOString(),
  };
}

function readProfilesFromLocalStorage(): SavedProfile[] {
  try {
    const raw = localStorage.getItem('profiles_full');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object').map((item) => normalizeProfileForApp(item));
  } catch {
    return [];
  }
}

function mergeProfiles(localProfiles: SavedProfile[], supabaseProfiles: SavedProfile[]) {
  const map = new Map<string, SavedProfile>();
  for (const profile of localProfiles) if (profile?.id) map.set(profile.id, profile);
  for (const profile of supabaseProfiles) {
    if (!profile?.id) continue;
    const existing = map.get(profile.id);
    if (!existing) {
      map.set(profile.id, profile);
      continue;
    }
    const existingTime = existing.savedAt ? new Date(existing.savedAt).getTime() : 0;
    const incomingTime = profile.savedAt ? new Date(profile.savedAt).getTime() : 0;
    map.set(profile.id, incomingTime >= existingTime ? profile : existing);
  }
  return Array.from(map.values());
}

export default function ProjectsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SavedProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<SavedProfile | null>(null);
  const [profileWizardOpen, setProfileWizardOpen] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [draggedProfileId, setDraggedProfileId] = useState<string | null>(null);
  const [dragOverProfileId, setDragOverProfileId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>('before');
  const [notice, setNotice] = useState<AppNoticeState>(null);
  const [confirmDialog, setConfirmDialog] = useState<AppConfirmState>(null);

  const showNotice = async (nextNotice: NonNullable<AppNoticeState>) => {
    const translatedNotice = await translateNoticeByAi(nextNotice);
    setNotice(translatedNotice);
  };

  const showConfirmDialog = async (nextDialog: NonNullable<AppConfirmState>) => {
    const translatedDialog = await translateConfirmByAi(nextDialog);
    setConfirmDialog(translatedDialog);
  };

  const closeNotice = () => {
    setNotice(null);
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  useEffect(() => {
    loadActiveProfile();
    const localProfiles = applySavedOrder(readProfilesFromLocalStorage());
    if (localProfiles.length > 0) setProfiles(localProfiles);
    void loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const shouldOpenNewProfile =
      new URLSearchParams(window.location.search).get(NEW_PROFILE_QUERY_KEY) === '1';

    if (!shouldOpenNewProfile) return;

    startEmptyProfileWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToMenu = () => router.push('/dashboard');

  const goToChatWithProfile = (profile: SavedProfile) => {
    selectProfileForGeneration(profile);
    router.push('/chat');
  };

  const startEmptyProfileWizard = () => {
    clearProfileWizardDraft();
    setSelectedProfile(null);
    setEditingProfile(null);
    setProfileWizardOpen(true);
  };

  const openNewProfile = () => {
    startEmptyProfileWizard();
  };

  const openBlankProfile = () => {
    startEmptyProfileWizard();
  };

  const loadActiveProfile = () => {
    try {
      const activeRaw = localStorage.getItem('active_profile');
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      setActiveProfileId(isValidUuid(active?.id) ? active.id : null);
    } catch {
      setActiveProfileId(null);
    }
  };

  const getSavedOrder = () => {
    try {
      const raw = localStorage.getItem(PROJECT_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  };

  const applySavedOrder = (items: SavedProfile[]) => {
    const savedOrder = getSavedOrder();
    if (savedOrder.length === 0) {
      return [...items].sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
    }
    const orderIndex = new Map<string, number>();
    savedOrder.forEach((id, index) => orderIndex.set(id, index));
    return [...items].sort((a, b) => {
      const indexA = orderIndex.has(a.id) ? Number(orderIndex.get(a.id)) : Number.MAX_SAFE_INTEGER;
      const indexB = orderIndex.has(b.id) ? Number(orderIndex.get(b.id)) : Number.MAX_SAFE_INTEGER;
      if (indexA !== indexB) return indexA - indexB;
      return new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime();
    });
  };

  const saveProfilesLocally = (items: SavedProfile[]) => {
    localStorage.setItem('profiles_full', JSON.stringify(items));
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(items.map((item) => item.id)));
  };

  const syncActiveProfileWithList = (items: SavedProfile[]) => {
    try {
      const activeRaw = localStorage.getItem('active_profile');
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      if (!active?.id) return;
      const found = items.find((profile) => profile.id === active.id);
      if (found) {
        localStorage.setItem('active_profile', JSON.stringify(found));
        localStorage.setItem('profile', JSON.stringify(found));
        setActiveProfileId(found.id);
      } else {
        setActiveProfileId(null);
      }
    } catch {
      setActiveProfileId(null);
    }
  };

  const loadProfiles = async () => {
    const localProfiles = readProfilesFromLocalStorage();

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        const ordered = applySavedOrder(localProfiles);
        setProfiles(ordered);
        saveProfilesLocally(ordered);
        syncActiveProfileWithList(ordered);
        return;
      }

      const { data, error } = await supabase
        .from('zedpera_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('SUPABASE LOAD PROFILES WARNING:', error);
        const ordered = applySavedOrder(localProfiles);
        setProfiles(ordered);
        saveProfilesLocally(ordered);
        syncActiveProfileWithList(ordered);
        return;
      }

      const supabaseProfiles: SavedProfile[] = (data || []).map((row: any) =>
        normalizeProfileForApp(row),
      );
      const ordered = applySavedOrder(mergeProfiles(localProfiles, supabaseProfiles));
      setProfiles(ordered);
      saveProfilesLocally(ordered);
      syncActiveProfileWithList(ordered);
    } catch (error) {
      console.warn('LOAD PROFILES WARNING:', error);
      const ordered = applySavedOrder(localProfiles);
      setProfiles(ordered);
      saveProfilesLocally(ordered);
      syncActiveProfileWithList(ordered);
    }
  };

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) =>
      [profile.title, profile.field, profile.supervisor, profile.schema?.label, profile.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [profiles, search]);

  const selectProfileForGeneration = (profile: SavedProfile) => {
    const interfaceLanguage = getStoredLanguage();
    const safeProfile = {
      ...profile,
      id: createSafeProfileId(profile.id),
      language: interfaceLanguage,
      interfaceLanguage,
      workLanguage: interfaceLanguage,
    };

    localStorage.setItem('active_profile', JSON.stringify(safeProfile));
    localStorage.setItem('profile', JSON.stringify(safeProfile));
    setActiveProfileId(safeProfile.id);
  };

  const openProfile = (profile: SavedProfile) => setSelectedProfile(profile);
  const closeProfile = () => setSelectedProfile(null);

  const openEditProfile = (profile: SavedProfile) => {
    const interfaceLanguage = getStoredLanguage();
    const safeProfile = {
      ...profile,
      id: createSafeProfileId(profile.id),
      language: interfaceLanguage,
      interfaceLanguage,
      workLanguage: interfaceLanguage,
    };

    setEditingProfile(safeProfile);
    setProfileWizardOpen(true);
    localStorage.setItem('active_profile', JSON.stringify(safeProfile));
    localStorage.setItem('profile', JSON.stringify(safeProfile));
    setActiveProfileId(safeProfile.id);
  };

  const closeProfileWizard = () => {
    setProfileWizardOpen(false);
    setEditingProfile(null);
  };

  const handleProfileSaved = async (updatedProfile: SavedProfile) => {
    if (isSavingProfile) return;
    setIsSavingProfile(true);

    const normalizedProfile = normalizeProfileBeforeSave(updatedProfile, editingProfile?.id);
    const nextProfiles = profiles.some((profile) => profile.id === normalizedProfile.id)
      ? profiles.map((profile) => (profile.id === normalizedProfile.id ? normalizedProfile : profile))
      : [normalizedProfile, ...profiles];

    setProfiles(nextProfiles);
    setSelectedProfile(normalizedProfile);
    setEditingProfile(null);
    setProfileWizardOpen(false);
    setActiveProfileId(normalizedProfile.id);
    saveProfilesLocally(nextProfiles);
    localStorage.setItem('profile', JSON.stringify(normalizedProfile));
    localStorage.setItem('active_profile', JSON.stringify(normalizedProfile));

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        await showNotice({
          title: 'Profil práce je uložený lokálne',
          message:
            'Profil práce bol uložený v tomto prehliadači. Po prihlásení používateľa sa bude môcť synchronizovať aj so serverovou databázou.',
          variant: 'success',
        });
        return;
      }

      const payload = buildSupabaseProfilePayload(normalizedProfile, user.id);
      const { data, error } = await supabase
        .from('zedpera_profiles')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.warn('SUPABASE SAVE PROFILE WARNING:', error);
        await showNotice({
          title: 'Profil práce je uložený lokálne',
          message:
            'Profil práce je bezpečne uložený v tomto zariadení. Serverová synchronizácia sa nepodarila dokončiť, preto skontrolujte prihlásenie a oprávnenia v Supabase.',
          detail: getPublicErrorDetail(error),
          variant: 'warning',
        });
        return;
      }

      if (data) {
        const savedProfile = normalizeProfileForApp(data);
        const syncedProfiles = nextProfiles.some((profile) => profile.id === savedProfile.id)
          ? nextProfiles.map((profile) => (profile.id === savedProfile.id ? savedProfile : profile))
          : [savedProfile, ...nextProfiles];
        setProfiles(syncedProfiles);
        setSelectedProfile(savedProfile);
        setActiveProfileId(savedProfile.id);
        saveProfilesLocally(syncedProfiles);
        localStorage.setItem('profile', JSON.stringify(savedProfile));
        localStorage.setItem('active_profile', JSON.stringify(savedProfile));
      }

      await loadProfiles();

      await showNotice({
        title: 'Profil práce je uložený',
        message:
          'Profil práce bol úspešne uložený. AI chat a všetky moduly budú odteraz používať aktuálne nastavenia tejto práce.',
        variant: 'success',
      });
    } catch (error) {
      console.warn('PROFILE SAVE WARNING:', error);
      await showNotice({
        title: 'Profil práce je uložený lokálne',
        message:
          'Profil práce je uložený v tomto zariadení. Serverová synchronizácia sa momentálne nepodarila pre technický problém alebo prerušené pripojenie.',
        detail: getPublicErrorDetail(error),
        variant: 'warning',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const deleteProfile = async (id: string) => {
    const next = profiles.filter((profile) => profile.id !== id);
    setProfiles(next);
    saveProfilesLocally(next);

    try {
      const activeRaw = localStorage.getItem('active_profile');
      const active = activeRaw ? JSON.parse(activeRaw) : null;
      if (active?.id === id) {
        localStorage.removeItem('active_profile');
        localStorage.removeItem('profile');
        setActiveProfileId(null);
      }
    } catch {
      localStorage.removeItem('active_profile');
      localStorage.removeItem('profile');
      setActiveProfileId(null);
    }

    if (selectedProfile?.id === id) setSelectedProfile(null);
    if (editingProfile?.id === id) closeProfileWizard();

    if (!isValidUuid(id)) {
      await showNotice({
        title: 'Práca bola odstránená',
        message:
          'Práca bola odstránená z lokálneho zoznamu. Tento záznam nebol synchronizovaný so serverom, preto nebolo potrebné odstraňovať ho zo Supabase.',
        variant: 'success',
      });
      return;
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        await showNotice({
          title: 'Práca bola odstránená lokálne',
          message:
            'Práca bola odstránená z tohto zariadenia. Serverové odstránenie sa nevykonalo, pretože používateľ nie je prihlásený.',
          variant: 'warning',
        });
        return;
      }

      const { error } = await supabase
        .from('zedpera_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.warn('DELETE PROFILE WARNING:', error);
        await showNotice({
          title: 'Práca bola odstránená lokálne',
          message:
            'Práca bola odstránená z tohto zariadenia. Serverová synchronizácia sa momentálne nepodarila dokončiť.',
          detail: getPublicErrorDetail(error),
          variant: 'warning',
        });
        return;
      }

      await showNotice({
        title: 'Práca bola odstránená',
        message:
          'Práca bola úspešne odstránená zo zoznamu aj zo serverovej databázy.',
        variant: 'success',
      });
    } catch (error) {
      console.warn('DELETE PROFILE WARNING:', error);
      await showNotice({
        title: 'Práca bola odstránená lokálne',
        message:
          'Práca bola odstránená z tohto zariadenia. Serverová synchronizácia sa nepodarila pre technický problém alebo prerušené pripojenie.',
        detail: getPublicErrorDetail(error),
        variant: 'warning',
      });
    }
  };

  const requestDeleteProfile = (profile: SavedProfile) => {
    const profileTitle = profile.title?.trim() || 'Bez názvu';

    void showConfirmDialog({
      title: 'Odstrániť prácu zo zoznamu?',
      message:
        `Chystáte sa odstrániť prácu „${profileTitle}“. Táto akcia odstráni prácu z aktuálneho zoznamu a zároveň sa pokúsi odstrániť jej záznam zo servera.`,
      detail:
        'Ak bola táto práca nastavená ako aktívna, po odstránení sa automaticky zruší jej výber na generovanie.',
      confirmLabel: 'Áno, odstrániť prácu',
      cancelLabel: 'Zrušiť akciu',
      variant: 'danger',
      onConfirm: async () => {
        await deleteProfile(profile.id);
      },
    });
  };

  const moveProfile = (dragId: string, targetId: string, position: DropPosition) => {
    if (dragId === targetId) return;
    setProfiles((current) => {
      const oldIndex = current.findIndex((item) => item.id === dragId);
      if (oldIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);
      const updatedTargetIndex = next.findIndex((item) => item.id === targetId);
      if (updatedTargetIndex === -1) return current;
      const insertIndex = position === 'before' ? updatedTargetIndex : updatedTargetIndex + 1;
      next.splice(insertIndex, 0, moved);
      saveProfilesLocally(next);
      return next;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, profileId: string) => {
    setDraggedProfileId(profileId);
    setDragOverProfileId(null);
    setDropPosition('before');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', profileId);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, profileId: string) => {
    event.preventDefault();
    if (!draggedProfileId || draggedProfileId === profileId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;
    setDragOverProfileId(profileId);
    setDropPosition(event.clientY < middleY ? 'before' : 'after');
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetProfileId: string) => {
    event.preventDefault();
    const dragId = draggedProfileId || event.dataTransfer.getData('text/plain') || '';
    if (dragId) moveProfile(dragId, targetProfileId, dropPosition);
    setDraggedProfileId(null);
    setDragOverProfileId(null);
    setDropPosition('before');
  };

  const handleDragEnd = () => {
    setDraggedProfileId(null);
    setDragOverProfileId(null);
    setDropPosition('before');
  };

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#020617] text-white">
      <div className="mx-auto min-h-dvh max-w-7xl px-4 pb-32 pt-4 md:px-8 md:pb-40 md:pt-6">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={goToMenu} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black text-white transition hover:border-violet-400/50 hover:bg-white/[0.14]">
              <Home className="h-5 w-5" />
              Menu
            </button>
            <button type="button" onClick={openBlankProfile} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 text-sm font-black text-white transition hover:border-violet-400/50 hover:bg-white/[0.14]">
              <User className="h-5 w-5" />
              Vytvoriť prázdny profil
            </button>
            <button type="button" onClick={openNewProfile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-violet-950/30 transition hover:opacity-90">
              <Plus className="h-5 w-5" />
              Nová práca
            </button>
          </div>

          <div className="relative w-full xl:w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hľadať podľa názvu, odboru, vedúceho..." className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-4 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500" />
          </div>
        </div>

        {draggedProfileId && <div className="sticky top-3 z-30 mb-5 rounded-2xl border border-violet-400/40 bg-violet-600/20 px-5 py-4 text-sm font-black text-violet-100 shadow-2xl shadow-violet-950/30 backdrop-blur">Presúvaš kartu. Nájdi miesto a pusti ju na fialový pás „Pusti sem“.</div>}

        {filteredProfiles.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
            <p className="mb-5 text-slate-300">Zatiaľ tu nie je uložená žiadna práca.</p>
            <button type="button" onClick={openNewProfile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 font-black text-white transition hover:opacity-90">
              <Plus className="h-5 w-5" />
              Nová práca
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => {
              const isActive = activeProfileId === profile.id;
              const isDragging = draggedProfileId === profile.id;
              const isDragOver = dragOverProfileId === profile.id;
              return (
                <div key={profile.id} className="relative">
                  {isDragOver && dropPosition === 'before' && <DropIndicator text="Pusti sem – karta sa vloží pred túto prácu" />}
                  <article onDragOver={(event) => handleDragOver(event, profile.id)} onDrop={(event) => handleDrop(event, profile.id)} onDragEnd={handleDragEnd} className={`group relative rounded-3xl border p-5 transition duration-200 ${isActive ? 'border-emerald-400/50 bg-emerald-500/[0.055]' : 'border-white/10 bg-white/[0.045] hover:border-violet-400/50 hover:bg-white/[0.07]'} ${isDragging ? 'scale-[0.97] border-violet-400 bg-violet-500/10 opacity-45 ring-4 ring-violet-400/30' : ''} ${isDragOver ? 'scale-[1.01] border-violet-300 bg-violet-500/[0.12] shadow-2xl shadow-violet-950/40 ring-4 ring-violet-400/40' : ''}`}>
                    {isDragOver && <div className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-dashed border-violet-300/70" />}
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <button type="button" draggable onDragStart={(event) => handleDragStart(event, profile.id)} onDragEnd={handleDragEnd} className={`inline-flex cursor-grab items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition active:cursor-grabbing ${isDragging ? 'border-violet-300 bg-violet-600 text-white' : 'border-violet-400/40 bg-violet-500/15 text-violet-100 hover:border-violet-300 hover:bg-violet-500/25'}`} aria-label="Presunúť kartu">
                        <GripVertical className="h-4 w-4" />
                        Presuň kartu
                      </button>
                      {isActive && <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-200">Aktívna</div>}
                    </div>

                    <button type="button" onClick={() => openProfile(profile)} className="block w-full text-left">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isActive ? 'bg-emerald-500/15 text-emerald-200' : 'bg-violet-500/15 text-violet-200'}`}>
                          {isActive ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-violet-600/20 text-violet-200'}`}>{isActive ? 'Vybratá práca' : profile.schema?.label || formatWorkType(profile.type)}</span>
                      </div>
                      <h2 className="line-clamp-2 text-xl font-black text-white">{profile.title || 'Bez názvu'}</h2>
                      <div className="mt-4 space-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" /><span>{formatDate(profile.savedAt)}</span></div>
                        {profile.field && <div className="flex items-center gap-2"><Library className="h-4 w-4 text-slate-500" /><span className="line-clamp-1">{profile.field}</span></div>}
                        {profile.supervisor && <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-500" /><span className="line-clamp-1">{profile.supervisor}</span></div>}
                      </div>
                    </button>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => selectProfileForGeneration(profile)} className={`rounded-xl px-4 py-2 text-sm font-black text-white transition ${isActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'}`}>{isActive ? 'Táto práca je vybratá' : 'Vybrať na generovanie'}</button>
                      <button type="button" onClick={() => goToChatWithProfile(profile)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-500">Pokračovať v práci</button>
                      <button type="button" onClick={() => openProfile(profile)} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.1]">Otvoriť</button>
                      <button type="button" onClick={() => openEditProfile(profile)} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-100 transition hover:bg-violet-500/20">Upraviť</button>
                      <button type="button" onClick={() => requestDeleteProfile(profile)} className="ml-auto rounded-xl bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 hover:text-red-200" aria-label="Odstrániť prácu"><Trash2 className="h-5 w-5" /></button>
                    </div>
                  </article>
                  {isDragOver && dropPosition === 'after' && <DropIndicator text="Pusti sem – karta sa vloží za túto prácu" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-[#020617] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-violet-300">Detail práce</div>
                <h2 className="text-2xl font-black text-white">{selectedProfile.title || 'Bez názvu'}</h2>
                <p className="mt-1 text-sm text-slate-400">Tu môžeš prácu otvoriť, upraviť alebo vybrať na generovanie textu.</p>
              </div>
              <button type="button" onClick={closeProfile} className="rounded-2xl bg-red-500/90 p-3 text-white transition hover:bg-red-400" aria-label="Zavrieť profil"><X size={20} /></button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto bg-[#020617]">
              <ProjectDetail profile={selectedProfile} activeProfileId={activeProfileId} onBack={closeProfile} onDelete={() => requestDeleteProfile(selectedProfile)} onEdit={() => openEditProfile(selectedProfile)} onSelect={() => selectProfileForGeneration(selectedProfile)} onContinue={() => goToChatWithProfile(selectedProfile)} />
            </div>
          </div>
        </div>
      )}

      {profileWizardOpen && (
        <div className="fixed inset-0 z-[9999] h-dvh w-dvw overflow-hidden bg-[#020617] text-white">
          {isSavingProfile && (
            <div className="fixed left-0 right-0 top-0 z-[10000] border-b border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-100 backdrop-blur">
              Ukladám profil.
            </div>
          )}

          <ProfileWizardModal
            key={editingProfile?.id || 'new-empty-profile'}
            initialProfile={editingProfile}
            onSave={(updatedProfile) => void handleProfileSaved(updatedProfile)}
            onClose={closeProfileWizard}
            onMenu={() => router.push('/dashboard')}
          />
        </div>
      )}

      {notice && <ProfessionalNoticeDialog notice={notice} onClose={closeNotice} />}

      {confirmDialog && (
        <ProfessionalConfirmDialog
          dialog={confirmDialog}
          onClose={closeConfirmDialog}
        />
      )}
    </main>
  );
}


function ProfessionalNoticeDialog({
  notice,
  onClose,
}: {
  notice: NonNullable<AppNoticeState>;
  onClose: () => void;
}) {
  const variant = notice.variant || 'info';
  const styles = getDialogVariantStyles(variant);

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#070a16] text-white shadow-2xl shadow-black/50">
        <div className={`h-1.5 ${styles.bar}`} />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText}`}>
              {variant === 'success' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : variant === 'danger' || variant === 'error' ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <Sparkles className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {notice.label || 'Systémová správa'}
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                {notice.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                {notice.message}
              </p>

              {notice.detail && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-xs leading-6 text-slate-400">
                  <div className="mb-1 font-black uppercase tracking-[0.16em] text-slate-500">
                    {notice.detailLabel || 'Technický detail'}
                  </div>
                  {notice.detail}
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-slate-200"
            >
              {notice.closeLabel || 'Rozumiem'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfessionalConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: NonNullable<AppConfirmState>;
  onClose: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const variant = dialog.variant || 'warning';
  const styles = getDialogVariantStyles(variant);

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await dialog.onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#070a16] text-white shadow-2xl shadow-black/50">
        <div className={`h-1.5 ${styles.bar}`} />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconText}`}>
              {variant === 'danger' ? (
                <Trash2 className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                {dialog.label || 'Potvrdenie akcie'}
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                {dialog.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                {dialog.message}
              </p>

              {dialog.detail && (
                <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                  {dialog.detail}
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-6 text-sm font-black text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dialog.cancelLabel}
            </button>

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isProcessing}
              className={`inline-flex min-h-[46px] items-center justify-center rounded-2xl px-6 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.button}`}
            >
              {isProcessing ? dialog.processingLabel || 'Spracúvam...' : dialog.confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getDialogVariantStyles(variant: AppDialogVariant) {
  if (variant === 'success') {
    return {
      bar: 'bg-emerald-500',
      iconBg: 'bg-emerald-500/15',
      iconText: 'text-emerald-200',
      button: 'bg-emerald-600 hover:bg-emerald-500',
    };
  }

  if (variant === 'danger' || variant === 'error') {
    return {
      bar: 'bg-red-500',
      iconBg: 'bg-red-500/15',
      iconText: 'text-red-200',
      button: 'bg-red-600 hover:bg-red-500',
    };
  }

  if (variant === 'warning') {
    return {
      bar: 'bg-amber-500',
      iconBg: 'bg-amber-500/15',
      iconText: 'text-amber-200',
      button: 'bg-amber-600 hover:bg-amber-500',
    };
  }

  return {
    bar: 'bg-blue-500',
    iconBg: 'bg-blue-500/15',
    iconText: 'text-blue-200',
    button: 'bg-blue-600 hover:bg-blue-500',
  };
}



function upsertProfileIntoLocalStorage(profile: SavedProfile) {
  if (typeof window === 'undefined') return;

  try {
    const current = readProfilesFromLocalStorage();
    const exists = current.some((item) => item.id === profile.id);
    const next = exists
      ? current.map((item) => (item.id === profile.id ? profile : item))
      : [profile, ...current];

    localStorage.setItem('profiles_full', JSON.stringify(next));
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(next.map((item) => item.id)));
  } catch (error) {
    console.warn('PROFILE WIZARD LOCAL UPSERT WARNING:', error);
  }
}

function isWizardFieldFilled(key: keyof ProfileWizardState, value: unknown) {
  if (key === 'keywordsText') {
    return normalizeKeywordsInput(value).length > 0;
  }

  return normalizeTextValue(value).length > 0;
}

function getWizardFieldDisplayValue(label: string, value: unknown) {
  if (label === 'Kľúčové slová') {
    return keywordsToText(value);
  }

  return normalizeTextValue(value);
}

function getWizardFieldStatusLabel(label: string, filled: boolean, required: boolean) {
  if (filled) {
    return 'Vyplnené';
  }

  return required ? 'Chýba' : 'Voliteľné';
}

function readWizardDraft(initialProfile: SavedProfile | null, initialTypeKey: WorkTypeKey): ProfileWizardState | null {
  if (typeof window === 'undefined') return null;

  // Pri novej práci nikdy nenačítavame posledný rozpracovaný alebo aktívny profil.
  // Draft používame iba pri úprave existujúcej práce, kde sa ID draftu musí zhodovať.
  if (!initialProfile?.id) return null;

  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed || typeof parsed !== 'object') return null;

    if (!parsed.id || parsed.id !== initialProfile.id) {
      return null;
    }

    const typeKey = normalizeWorkType(parsed.typeKey || parsed.type || initialTypeKey);
    const template = WORK_TEMPLATES[typeKey];
    const restored = createWizardProfileFromTemplate(template, parsed as any);

    return {
      ...restored,
      ...parsed,
      id: createSafeProfileId(parsed.id || initialProfile?.id),
      typeKey,
      type: template.label,
      level: template.level,
      citation: normalizeCitationToKey(parsed.citation || parsed.citationStyle || template.defaultCitationStyle),
      citationStyle: citationLabel(normalizeCitationToKey(parsed.citation || parsed.citationStyle || template.defaultCitationStyle)),
      keywordsText:
        normalizeTextValue(parsed.keywordsText) ||
        keywordsToText(parsed.keywordsList || parsed.keywords_list || parsed.keywords),
      updated_at: parsed.updated_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function ProfileWizardModal({
  initialProfile,
  onSave,
  onClose,
  onMenu,
}: {
  initialProfile: SavedProfile | null;
  onSave: (profile: SavedProfile) => void;
  onClose: () => void;
  onMenu: () => void;
}) {
  const initialTypeKey = normalizeWorkType(
    initialProfile?.typeKey ||
      initialProfile?.type ||
      initialProfile?.schema?.typeKey,
  );

  const [activeStep, setActiveStep] = useState(1);

  const [profile, setProfile] = useState<ProfileWizardState>(() =>
    readWizardDraft(initialProfile, initialTypeKey) ||
    createWizardProfileFromTemplate(
      WORK_TEMPLATES[initialTypeKey],
      initialProfile,
    ),
  );


  const activeTemplate = WORK_TEMPLATES[profile.typeKey];
  const currentLanguageLabel = formatLanguageBadge(
    profile.workLanguage || profile.language || getStoredLanguage(),
  );

  const requiredProfileFields = useMemo(
    () => [
      { key: 'title' as const, label: 'Názov práce', step: 2 },
      { key: 'field' as const, label: 'Odbor / predmet / oblasť', step: 2 },
      { key: 'workLanguage' as const, label: 'Jazyk práce', step: 2 },
      { key: 'annotation' as const, label: 'Anotácia', step: 2 },
      { key: 'goal' as const, label: 'Cieľ práce', step: 3 },
      { key: 'problem' as const, label: 'Výskumný problém', step: 3 },
      { key: 'methodology' as const, label: 'Metodológia', step: 3 },
      { key: 'researchQuestions' as const, label: 'Výskumné otázky', step: 3 },
      { key: 'keywordsText' as const, label: 'Kľúčové slová', step: 2 },
    ],
    [],
  );

  const missingFields = useMemo(
    () =>
      requiredProfileFields.filter((item) => {
        const value = profile[item.key];
        return !isWizardFieldFilled(item.key, value);
      }),
    [profile, requiredProfileFields],
  );

  const persistWizardDraftImmediately = (nextProfile: ProfileWizardState) => {
    if (typeof window === 'undefined') return;

    try {
      const normalizedWizardProfile: ProfileWizardState = {
        ...nextProfile,
        keywordsText: keywordsToText(nextProfile.keywordsText),
        updated_at: nextProfile.updated_at || new Date().toISOString(),
      };

      const draftProfile = buildSavedProfileFromWizard(normalizedWizardProfile);

      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(normalizedWizardProfile));
      localStorage.setItem('profile', JSON.stringify(draftProfile));
      localStorage.setItem('active_profile', JSON.stringify(draftProfile));
      localStorage.setItem(
        'zedpera_work_language',
        draftProfile.workLanguage || draftProfile.language || 'sk',
      );

      upsertProfileIntoLocalStorage(draftProfile);

      window.dispatchEvent(
        new CustomEvent('zedpera-profile-updated', {
          detail: draftProfile,
        }),
      );
      window.dispatchEvent(new CustomEvent('zedpera-profile-change'));
      window.dispatchEvent(
        new CustomEvent('zedpera:active-profile-changed', {
          detail: draftProfile,
        }),
      );
    } catch (error) {
      console.warn('PROFILE WIZARD IMMEDIATE SAVE WARNING:', error);
    }
  };

  const commitWizardProfile = (
    updater:
      | ProfileWizardState
      | ((previousProfile: ProfileWizardState) => ProfileWizardState),
  ) => {
    setProfile((previousProfile) => {
      const nextProfile =
        typeof updater === 'function' ? updater(previousProfile) : updater;

      persistWizardDraftImmediately(nextProfile);

      return nextProfile;
    });
  };

  const updateProfile = <K extends keyof ProfileWizardState>(
    key: K,
    value: ProfileWizardState[K],
  ) => {
    commitWizardProfile((prev) => ({
      ...prev,
      [key]: value,
      updated_at: new Date().toISOString(),
    }));
  };

  const updateInlineField = (key: keyof ProfileWizardState, value: string) => {
    const nextValue = key === 'keywordsText' ? value : String(value || '');

    commitWizardProfile((prev) => ({
      ...prev,
      [key]: nextValue,
      updated_at: new Date().toISOString(),
    }));
  };

  const handleSelectWorkType = (typeKey: WorkTypeKey) => {
    const template = WORK_TEMPLATES[typeKey];

    commitWizardProfile((prev) => ({
      ...prev,
      typeKey: template.key,
      type: template.label,
      level: template.level,
      citation: template.defaultCitationStyle,
      citationStyle: citationLabel(template.defaultCitationStyle),
      recommendedLength: template.recommendedLength,
      structure: template.structure,
      requiredSections: template.requiredSections,
      aiInstruction: template.aiInstruction,
      updated_at: new Date().toISOString(),
    }));

    setActiveStep(2);
  };

  const handleSelectCitation = (citation: CitationStyleKey) => {
    commitWizardProfile((prev) => ({
      ...prev,
      citation,
      citationStyle: citationLabel(citation),
      updated_at: new Date().toISOString(),
    }));
  };

  const createEmptyProfile = () => {
    clearProfileWizardDraft();
    const empty = createWizardProfileFromTemplate(WORK_TEMPLATES.essay, null);
    commitWizardProfile(empty);
    setActiveStep(1);
  };

  const buildFinalProfile = (): SavedProfile => buildSavedProfileFromWizard(profile);

  const saveWizardProfile = () => {
    persistWizardDraftImmediately(profile);

    const finalProfile = buildFinalProfile();

    localStorage.setItem('active_profile', JSON.stringify(finalProfile));
    localStorage.setItem('profile', JSON.stringify(finalProfile));
    localStorage.setItem(
      'zedpera_work_language',
      finalProfile.workLanguage || finalProfile.language || 'sk',
    );

    window.dispatchEvent(
      new CustomEvent('zedpera-profile-updated', {
        detail: finalProfile,
      }),
    );

    window.dispatchEvent(new CustomEvent('zedpera-profile-change'));

    onSave(finalProfile);
  };

  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(profile));

      const draftProfile = buildSavedProfileFromWizard(profile);
      localStorage.setItem('profile', JSON.stringify(draftProfile));
      localStorage.setItem('active_profile', JSON.stringify(draftProfile));
      localStorage.setItem(
        'zedpera_work_language',
        draftProfile.workLanguage || draftProfile.language || 'sk',
      );
      upsertProfileIntoLocalStorage(draftProfile);

      window.dispatchEvent(
        new CustomEvent('zedpera-profile-updated', {
          detail: draftProfile,
        }),
      );
      window.dispatchEvent(new CustomEvent('zedpera-profile-change'));
    } catch (error) {
      console.warn('PROFILE WIZARD AUTOSAVE WARNING:', error);
    }
  }, [profile]);

  const canGoBack = activeStep > 1;
  const canGoNext = activeStep < 5;

  return (
    <section className="flex h-dvh w-dvw flex-col overflow-hidden bg-[#020617] text-white">
      <style jsx global>{`
        html,
        body {
          overflow: hidden !important;
        }

        .zedpera-wizard-no-scrollbar {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
        }

        .zedpera-wizard-no-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      `}</style>

      <header className="shrink-0 border-b border-white/10 bg-[#070a16] px-4 py-3 shadow-2xl shadow-black/30 xl:px-6">
        <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/40">
              <Sparkles className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
                Wizard profil práce
              </div>

              <div className="mt-2 inline-flex min-h-[38px] items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100">
                <span className="text-slate-400">Aktuálny jazyk:</span>
                <span>{currentLanguageLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onMenu}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white transition hover:bg-white/[0.12]"
            >
              <Home size={18} />
              Menu
            </button>

            <button
              type="button"
              onClick={createEmptyProfile}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
            >
              <Plus size={18} />
              Prázdny profil
            </button>

            <button
              type="button"
              onClick={saveWizardProfile}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500"
            >
              <Save size={18} />
              Uložiť
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/90 text-white transition hover:bg-red-400"
              aria-label="Zavrieť wizard"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[320px_1fr]">
        <aside className="hidden overflow-hidden border-r border-white/10 bg-[#070a16] p-4 xl:block">
          <div className="grid gap-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const active = activeStep === step.id;
              const done = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`flex min-h-[78px] items-center gap-3 rounded-3xl border p-4 text-left transition ${
                    active
                      ? 'border-violet-400/50 bg-violet-600/20 text-white shadow-xl shadow-violet-950/30'
                      : done
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      active
                        ? 'bg-violet-500 text-white'
                        : done
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {step.id}. {step.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                      {step.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="zedpera-wizard-no-scrollbar min-h-0 overflow-y-auto overflow-x-hidden bg-[#020617] p-3 pb-6 xl:p-5 xl:pb-8">
          <div className="zedpera-wizard-no-scrollbar mb-3 flex gap-2 overflow-x-auto overflow-y-hidden xl:hidden">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`h-10 flex-1 rounded-2xl text-xs font-black ${
                  activeStep === step.id
                    ? 'bg-violet-600 text-white'
                    : 'border border-white/10 bg-white/[0.06] text-slate-300'
                }`}
              >
                {step.id}
              </button>
            ))}
          </div>

          <div className="min-h-full rounded-[2rem] border border-white/10 bg-[#070a16] p-4 shadow-2xl shadow-black/30 xl:p-5">
            {activeStep === 1 && (
              <WizardPanel
                title="Typ práce"
                subtitle="Vyber šablónu. Po kliknutí sa automaticky nastaví typ práce, odporúčaný rozsah, štruktúra a citačná norma."
              >
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                  {Object.values(WORK_TEMPLATES).map((template) => {
                    const active = profile.typeKey === template.key;

                    return (
                      <button
                        key={template.key}
                        type="button"
                        onClick={() => handleSelectWorkType(template.key)}
                        className={`flex min-h-[92px] flex-col justify-between rounded-2xl border p-3 text-left transition ${
                          active
                            ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                            : 'border-white/10 bg-white/[0.05] text-slate-200 hover:border-violet-400/50 hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="line-clamp-2 text-sm font-black">
                          {template.label}
                        </span>
                        <span
                          className={`mt-2 line-clamp-2 text-[11px] font-semibold ${
                            active ? 'text-violet-100' : 'text-slate-400'
                          }`}
                        >
                          {template.recommendedLength}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </WizardPanel>
            )}

            {activeStep === 2 && (
              <WizardPanel
                title="Identita práce"
                subtitle="Tému, odbor, jazyk, kľúčové slová a anotáciu vyplň priamo v poliach. Zmeny sa priebežne zapisujú do profilu."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <ClickEditField
                    label="Názov práce"
                    value={profile.title}
                    placeholder="Napr. Vplyv umelej inteligencie na akademické písanie"
                    required
                    onChange={(value) => updateInlineField('title', value)}
                  />

                  <ClickEditField
                    label="Odbor / predmet / oblasť"
                    value={profile.field}
                    placeholder="Napr. pedagogika, manažment, informatika"
                    required
                    onChange={(value) => updateInlineField('field', value)}
                  />

                  <ClickEditField
                    label="Vedúci práce / školiteľ"
                    value={profile.supervisor}
                    placeholder="Meno vedúceho práce"
                    onChange={(value) => updateInlineField('supervisor', value)}
                  />

                  <ClickEditField
                    label="Jazyk práce"
                    value={profile.workLanguage}
                    placeholder="sk, cs, en, de, pl, hu"
                    required
                    onChange={(value) => updateInlineField('workLanguage', value)}
                  />

                  <ClickEditField
                    label="Kľúčové slová"
                    value={profile.keywordsText}
                    placeholder="AI, akademické písanie, metodológia"
                    required
                    onChange={(value) => updateInlineField('keywordsText', value)}
                  />

                  <ClickEditField
                    label="Anotácia"
                    value={profile.annotation}
                    placeholder="Stručne popíš, o čom práca je."
                    required
                    multiline
                    onChange={(value) => updateInlineField('annotation', value)}
                  />
                </div>

                <MissingFieldsPanel
                  missingFields={missingFields}
                  onGoToStep={setActiveStep}
                />
              </WizardPanel>
            )}

            {activeStep === 3 && (
              <WizardPanel
                title="Výskumné nastavenie"
                subtitle="Text vypĺňaj priamo v poliach. Zmeny sa priebežne zapisujú do profilu a ostanú zachované pri ďalšom kroku."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <ClickEditField
                    label="Cieľ práce"
                    value={profile.goal}
                    placeholder="Čo je cieľom práce?"
                    required
                    multiline
                    onChange={(value) => updateInlineField('goal', value)}
                  />

                  <ClickEditField
                    label="Výskumný problém"
                    value={profile.problem}
                    placeholder="Aký problém práca rieši?"
                    required
                    multiline
                    onChange={(value) => updateInlineField('problem', value)}
                  />

                  <ClickEditField
                    label="Metodológia"
                    value={profile.methodology}
                    placeholder={activeTemplate.methodologyHint}
                    required
                    multiline
                    onChange={(value) => updateInlineField('methodology', value)}
                  />

                  <ClickEditField
                    label="Výskumné otázky"
                    value={profile.researchQuestions}
                    placeholder="Výskumné otázky"
                    required
                    multiline
                    onChange={(value) => updateInlineField('researchQuestions', value)}
                  />

                  <ClickEditField
                    label="Hypotézy"
                    value={profile.hypotheses}
                    placeholder="Hypotézy práce"
                    multiline
                    onChange={(value) => updateInlineField('hypotheses', value)}
                  />

                  <ClickEditField
                    label="Praktická / analytická časť"
                    value={profile.practicalPart}
                    placeholder="Popíš praktickú alebo analytickú časť."
                    multiline
                    onChange={(value) => updateInlineField('practicalPart', value)}
                  />
                </div>

                <MissingFieldsPanel
                  missingFields={missingFields}
                  onGoToStep={setActiveStep}
                />
              </WizardPanel>
            )}

            {activeStep === 4 && (
              <WizardPanel
                title="Norma a štruktúra"
                subtitle="Klikateľná citačná norma, odporúčaný rozsah a štruktúra práce."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                    {CITATION_STYLES.map((style) => {
                      const active = profile.citation === style.key;

                      return (
                        <button
                          key={style.key}
                          type="button"
                          onClick={() => handleSelectCitation(style.key)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            active
                              ? 'border-blue-300 bg-blue-600 text-white'
                              : 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="line-clamp-2 text-xs font-black">
                            {style.label}
                          </span>
                          <span
                            className={`mt-1 line-clamp-2 block text-[10px] font-semibold ${
                              active ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {style.disciplines.join(', ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3">
                    <ClickEditField
                      label="Odporúčaný rozsah"
                      value={profile.recommendedLength}
                      placeholder="Napr. 30 – 50 strán"
                    onChange={(value) => updateInlineField('recommendedLength', value)}
                  />

                    <CompactList
                      title="Štruktúra práce"
                      items={profile.structure}
                    />

                    <CompactList
                      title="Povinné sekcie"
                      items={profile.requiredSections}
                    />
                  </div>
                </div>
              </WizardPanel>
            )}

            {activeStep === 5 && (
              <WizardPanel
                title="Kontrola a uloženie"
                subtitle="Skontroluj finálny profil. Po uložení sa nastaví ako aktívny profil pre generovanie."
              >
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                  <InfoBox title="Typ práce" text={profile.type} />
                  <InfoBox
                    title="Názov práce"
                    text={profile.title || 'Bez názvu'}
                  />
                  <InfoBox title="Odbor" text={profile.field || 'Neuvedené'} />
                  <InfoBox
                    title="Jazyk práce"
                    text={profile.workLanguage || 'sk'}
                  />
                  <InfoBox
                    title="Citačná norma"
                    text={citationLabel(profile.citation)}
                  />
                  <InfoBox title="Rozsah" text={profile.recommendedLength} />
                  <InfoBox
                    title="Vedúci práce"
                    text={profile.supervisor || 'Neuvedené'}
                  />
                  <InfoBox
                    title="Kľúčové slová"
                    text={profile.keywordsText || 'Neuvedené'}
                  />

                  <div className="xl:col-span-3">
                    <MissingFieldsPanel
                      missingFields={missingFields}
                      onGoToStep={setActiveStep}
                    />
                  </div>

                  <div className="xl:col-span-3">
                    <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">
                        AI inštrukcia
                      </div>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-blue-100">
                        {profile.aiInstruction}
                      </p>
                    </div>
                  </div>
                </div>
              </WizardPanel>
            )}
          </div>
        </main>
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-[#070a16] px-4 py-3 xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => setActiveStep((step) => Math.max(1, step - 1))}
            className="min-h-[44px] rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Predchádzajúci krok
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`h-3 rounded-full transition ${
                  activeStep === step.id
                    ? 'w-10 bg-violet-500'
                    : 'w-3 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Krok ${step.id}`}
              />
            ))}
          </div>

          {canGoNext ? (
            <button
              type="button"
              onClick={() => setActiveStep((step) => Math.min(5, step + 1))}
              className="min-h-[44px] rounded-2xl bg-blue-600 px-6 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Ďalší krok
            </button>
          ) : (
            <button
              type="button"
              onClick={saveWizardProfile}
              className="min-h-[44px] rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-500"
            >
              Uložiť profil práce
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

function WizardPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-full flex-col">
      <div className="shrink-0 pb-4">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-violet-300">
          Wizard profil práce
        </div>
        <h2 className="mt-2 text-2xl font-black text-white xl:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-5xl text-sm font-semibold leading-6 text-slate-400">
          {subtitle}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-visible">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const sharedClass =
    'w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:bg-white/[0.08]';

  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>

      {rows > 1 ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${sharedClass} min-h-[96px] resize-none py-3`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${sharedClass} h-[48px]`}
        />
      )}
    </label>
  );
}


function ClickEditField({
  label,
  value,
  placeholder,
  required = false,
  multiline = false,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const displayValue = getWizardFieldDisplayValue(label, value);
  const filled =
    label === 'Kľúčové slová'
      ? normalizeKeywordsInput(value).length > 0
      : Boolean(displayValue);
  const statusLabel = getWizardFieldStatusLabel(label, filled, required);

  const inputClass = `mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:bg-white/[0.08] ${
    filled
      ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
      : required
        ? 'border-amber-400/35 bg-amber-500/[0.07]'
        : 'border-white/10 bg-white/[0.05]'
  }`;

  return (
    <label
      className={`block rounded-3xl border p-4 text-left transition ${
        filled
          ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
          : required
            ? 'border-amber-400/35 bg-amber-500/[0.07]'
            : 'border-white/10 bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            filled
              ? 'bg-emerald-500/15 text-emerald-200'
              : required
                ? 'bg-amber-500/15 text-amber-200'
                : 'bg-white/10 text-slate-400'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {multiline ? (
        <textarea
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || 'Vyplňte hodnotu'}
          rows={5}
          className={`${inputClass} min-h-[132px] resize-none`}
        />
      ) : (
        <input
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || 'Vyplňte hodnotu'}
          className={inputClass}
        />
      )}

      <div className="mt-2 text-[11px] font-semibold text-slate-500">
        Hodnota sa zapisuje priamo do profilu. Pred odchodom pokračuj cez Ďalší krok alebo Uložiť profil práce.
      </div>
    </label>
  );
}

function MissingFieldsPanel({
  missingFields,
  onGoToStep,
}: {
  missingFields: { label: string; step: number }[];
  onGoToStep: (step: number) => void;
}) {
  if (missingFields.length === 0) {
    return (
      <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-3 text-sm font-black text-emerald-100">
          <CheckCircle2 className="h-5 w-5" />
          Všetky dôležité polia sú vyplnené.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-3xl border border-amber-400/25 bg-amber-500/10 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
        Čo ešte chýba vyplniť
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {missingFields.map((item) => (
          <button
            key={`${item.step}-${item.label}`}
            type="button"
            onClick={() => onGoToStep(item.step)}
            className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-100 transition hover:bg-amber-400/20"
          >
            Krok {item.step}: {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-h-[86px] rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-black text-white">
        {text || 'Neuvedené'}
      </div>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-2">
        {items.slice(0, 8).map((item) => (
          <div
            key={item}
            className="line-clamp-1 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-300"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function DropIndicator({ text }: { text: string }) {
  return <div className="my-3 flex items-center gap-3 rounded-2xl border border-violet-300/60 bg-violet-600/25 px-4 py-3 text-sm font-black text-violet-50 shadow-2xl shadow-violet-950/40 ring-2 ring-violet-400/30"><div className="h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_22px_rgba(221,214,254,0.9)]" />{text}</div>;
}

function ProjectDetail({ profile, activeProfileId, onBack, onDelete, onEdit, onSelect, onContinue }: { profile: SavedProfile; activeProfileId: string | null; onBack: () => void; onDelete: () => void; onEdit: () => void; onSelect: () => void; onContinue: () => void }) {
  const isActive = activeProfileId === profile.id;
  const keywords = profile.keywordsList || profile.keywords || [];
  return (
    <div className="p-5 md:p-8">
      <div className="mb-6 flex flex-wrap gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-bold text-white transition hover:bg-white/[0.1]"><ArrowLeft className="h-5 w-5" />Späť</button>
        <button type="button" onClick={onSelect} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-black text-white transition ${isActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-violet-600 hover:bg-violet-500'}`}>{isActive ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}{isActive ? 'Táto práca je vybratá' : 'Vybrať na generovanie'}</button>
        <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black text-white transition hover:bg-blue-500"><Sparkles className="h-5 w-5" />Pokračovať v práci</button>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 font-bold text-violet-100 transition hover:bg-violet-500/20"><FileText className="h-5 w-5" />Upraviť</button>
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-bold text-red-200 transition hover:bg-red-500/20"><Trash2 className="h-5 w-5" />Odstrániť</button>
      </div>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div><div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${isActive ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-violet-400/30 bg-violet-500/10 text-violet-200'}`}>{isActive ? <><CheckCircle2 className="h-4 w-4" />Práca vybratá na generovanie</> : <><FileText className="h-4 w-4" />Detail práce</>}</div><h1 className="max-w-4xl text-4xl font-black tracking-tight">{profile.title || 'Bez názvu'}</h1><p className="mt-3 text-slate-400">Uložené: {formatDate(profile.savedAt)}</p></div>
          <div className="rounded-3xl border border-white/10 bg-[#111525] p-5"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Typ práce</p><p className="mt-2 text-xl font-black">{profile.schema?.label || formatWorkType(profile.type)}</p>{profile.schema?.recommendedLength && <p className="mt-1 text-sm text-slate-400">{profile.schema.recommendedLength}</p>}</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><InfoCard label="Názov práce" value={profile.title} /><InfoCard label="Typ práce" value={profile.schema?.label || profile.type} /><InfoCard label="Odbornosť" value={profile.level} /><InfoCard label="Jazyk rozhrania" value={profile.language} /><InfoCard label="Jazyk práce" value={profile.workLanguage} /><InfoCard label="Citovanie" value={profile.citation} /><InfoCard label="Odbor / predmet / oblasť" value={profile.field} /><InfoCard label="Vedúci práce / školiteľ" value={profile.supervisor} /></div>
        <div className="mt-8 grid gap-5 xl:grid-cols-2"><LongCard label="Anotácia" value={profile.annotation} /><LongCard label="Cieľ práce" value={profile.goal} /><LongCard label="Výskumný problém" value={profile.problem} /><LongCard label="Metodológia" value={profile.methodology} /><LongCard label="Hypotézy" value={profile.hypotheses} /><LongCard label="Výskumné otázky" value={profile.researchQuestions} /><LongCard label="Praktická časť" value={profile.practicalPart} /><LongCard label="Vedecký / odborný prínos" value={profile.scientificContribution} /><LongCard label="Firemný / manažérsky problém" value={profile.businessProblem} /><LongCard label="Manažérsky cieľ" value={profile.businessGoal} /><LongCard label="Implementácia" value={profile.implementation} /><LongCard label="Prípadová štúdia" value={profile.caseStudy} /><LongCard label="Reflexia" value={profile.reflection} /><LongCard label="Požiadavky na zdroje" value={profile.sourcesRequirement} /></div>
        {keywords.length > 0 && <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5"><h2 className="mb-4 text-xl font-black">Kľúčové slová</h2><div className="flex flex-wrap gap-2">{keywords.map((keyword, index) => <span key={`${keyword}-${index}`} className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">{keyword}</span>)}</div></div>}
        {profile.schema?.structure && profile.schema.structure.length > 0 && <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5"><h2 className="mb-4 text-xl font-black">Štruktúra práce</h2><ol className="space-y-3">{profile.schema.structure.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-sm text-slate-300"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200">{index + 1}</span><span className="pt-1">{item}</span></li>)}</ol></div>}
        {profile.schema?.requiredSections && profile.schema.requiredSections.length > 0 && <div className="mt-8 rounded-3xl border border-white/10 bg-[#111525] p-5"><h2 className="mb-4 text-xl font-black">Povinné časti</h2><div className="flex flex-wrap gap-2">{profile.schema.requiredSections.map((item, index) => <span key={`${item}-${index}`} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">{item}</span>)}</div></div>}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#111525] p-4"><p className="text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p><p className="mt-2 text-sm font-bold text-white">{value || 'Nevyplnené'}</p></div>;
}

function LongCard({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null;
  return <div className="rounded-3xl border border-white/10 bg-[#111525] p-5"><p className="mb-3 text-xs uppercase tracking-[0.15em] text-slate-500">{label}</p><p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{value}</p></div>;
}

function formatDate(value?: string) {
  if (!value) return 'Bez dátumu';
  try {
    return new Intl.DateTimeFormat('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatWorkType(type?: string) {
  if (!type) return 'Neurčený typ';
  const typeKey = normalizeWorkType(type);
  return WORK_TEMPLATES[typeKey]?.label || type;
}
