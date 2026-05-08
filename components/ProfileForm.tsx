'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Library,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ================= TYPES =================

type Lang = 'SK' | 'CZ' | 'EN' | 'DE' | 'PL' | 'HU';

type WorkTypeKey =
  | 'seminar'
  | 'essay'
  | 'maturita'
  | 'bachelor'
  | 'master'
  | 'graduate'
  | 'rigorous'
  | 'dissertation'
  | 'habilitation'
  | 'mba'
  | 'dba'
  | 'attestation'
  | 'msc';

type LevelKey =
  | 'expert'
  | 'academic'
  | 'standard'
  | 'simple'
  | 'public';

type CitationKey =
  | 'APA7'
  | 'ISO690'
  | 'STN_ISO_690'
  | 'Harvard'
  | 'MLA9'
  | 'Chicago';

type DynamicFieldKey =
  | 'annotation'
  | 'goal'
  | 'problem'
  | 'methodology'
  | 'hypotheses'
  | 'researchQuestions'
  | 'practicalPart'
  | 'scientificContribution'
  | 'businessProblem'
  | 'businessGoal'
  | 'implementation'
  | 'caseStudy'
  | 'reflection'
  | 'sourcesRequirement';

type DynamicField = {
  key: DynamicFieldKey;
  label: string;
  placeholder: string;
  required?: boolean;
  rows?: number;
};

type WorkSchema = {
  typeKey: WorkTypeKey;
  label: string;
  description: string;
  recommendedLength: string;
  citationOptions: CitationKey[];
  structure: string[];
  requiredSections: string[];
  fields: DynamicField[];
  aiInstruction: string;
};

type Profile = {
  type: WorkTypeKey;
  level: LevelKey;
  title: string;
  topic: string;
  field: string;
  supervisor: string;
  citation: CitationKey;
  language: Lang;
  workLanguage: Lang;
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
  keywordsList: string[];
};

type SavedProfile = Profile & {
  id: string;
  schema?: WorkSchema;
  interfaceLanguage?: Lang;
  savedAt?: string;
  keywords?: string[];
};

type ProfileFormProps = {
  initialProfile?: Partial<SavedProfile> | null;
  onClose?: () => void;
  onSave?: (data: SavedProfile) => void;
};

// ================= CONSTANTS =================

const LANGS: Lang[] = ['SK', 'CZ', 'EN', 'DE', 'PL', 'HU'];

const LEVELS: LevelKey[] = [
  'expert',
  'academic',
  'standard',
  'simple',
  'public',
];

const WORK_TYPES: WorkTypeKey[] = [
  'seminar',
  'essay',
  'maturita',
  'bachelor',
  'master',
  'graduate',
  'rigorous',
  'dissertation',
  'habilitation',
  'mba',
  'dba',
  'attestation',
  'msc',
];

const ALWAYS_VISIBLE_DYNAMIC_FIELDS: DynamicFieldKey[] = [
  'annotation',
  'problem',
  'goal',
  'methodology',
  'researchQuestions',
  'hypotheses',
  'practicalPart',
  'sourcesRequirement',
];

const emptyProfile: Profile = {
  type: 'bachelor',
  level: 'expert',
  title: '',
  topic: '',
  field: '',
  supervisor: '',
  citation: 'STN_ISO_690',
  language: 'SK',
  workLanguage: 'SK',
  annotation: '',
  goal: '',
  problem: '',
  methodology: '',
  hypotheses: '',
  researchQuestions: '',
  practicalPart: '',
  scientificContribution: '',
  businessProblem: '',
  businessGoal: '',
  implementation: '',
  caseStudy: '',
  reflection: '',
  sourcesRequirement: '',
  keywordsList: [],
};

// ================= TRANSLATIONS =================

const UI: Record<
  Lang,
  {
    pageTitle: string;
    editTitle: string;
    subtitle: string;
    workType: string;
    level: string;
    language: string;
    workLanguage: string;
    workLanguageHint: string;
    basic: string;
    academicProfile: string;
    structure: string;
    requiredSections: string;
    citation: string;
    recommendedLength: string;
    preview: string;
    save: string;
    saveChanges: string;
    saving: string;
    titlePlaceholder: string;
    topicPlaceholder: string;
    fieldPlaceholder: string;
    supervisorPlaceholder: string;
    keywords: string;
    keywordPlaceholder: string;
    keywordsHint: string;
    activeTemplate: string;
    aiProfile: string;
    close: string;
    requiredNote: string;
  }
> = {
  SK: {
    pageTitle: 'Nová práca',
    editTitle: 'Upraviť profil práce',
    subtitle:
      'AI z tohto profilu vytvorí akademickú prácu podľa typu, jazyka práce a citačnej normy.',
    workType: 'Typ práce',
    level: 'Odbornosť',
    language: 'Jazyk rozhrania',
    workLanguage: 'Jazyk práce',
    workLanguageHint:
      'Vyber jazyk, v ktorom má AI vytvoriť výslednú akademickú prácu.',
    basic: 'Základné údaje',
    academicProfile: 'Akademický profil',
    structure: 'Štruktúra práce',
    requiredSections: 'Povinné časti',
    citation: 'Citovanie',
    recommendedLength: 'Odporúčaný rozsah',
    preview: 'Náhľad profilu',
    save: 'Uložiť profil',
    saveChanges: 'Uložiť zmeny profilu',
    saving: 'Ukladám...',
    titlePlaceholder: 'Názov práce',
    topicPlaceholder: 'Téma práce',
    fieldPlaceholder: 'Odbor / predmet / oblasť',
    supervisorPlaceholder: 'Vedúci práce / školiteľ',
    keywords: 'Kľúčové slová',
    keywordPlaceholder: 'Pridať kľúčové slovo',
    keywordsHint: 'Odporúčané: 5 – 15 kľúčových slov.',
    activeTemplate: 'Aktívna šablóna',
    aiProfile: 'AI profil',
    close: 'Zavrieť',
    requiredNote: 'Povinné polia sú označené hviezdičkou.',
  },
  CZ: {
    pageTitle: 'Profil práce',
    editTitle: 'Upravit profil práce',
    subtitle:
      'AI z tohoto profilu vytvoří akademickou práci podle typu, jazyka práce a citační normy.',
    workType: 'Typ práce',
    level: 'Odbornost',
    language: 'Jazyk rozhraní',
    workLanguage: 'Jazyk práce',
    workLanguageHint:
      'Vyber jazyk, ve kterém má AI vytvořit výslednou akademickou práci.',
    basic: 'Základní údaje',
    academicProfile: 'Akademický profil',
    structure: 'Struktura práce',
    requiredSections: 'Povinné části',
    citation: 'Citování',
    recommendedLength: 'Doporučený rozsah',
    preview: 'Náhled profilu',
    save: 'Uložit profil',
    saveChanges: 'Uložit změny profilu',
    saving: 'Ukládám...',
    titlePlaceholder: 'Název práce',
    topicPlaceholder: 'Téma práce',
    fieldPlaceholder: 'Obor / předmět / oblast',
    supervisorPlaceholder: 'Vedoucí práce / školitel',
    keywords: 'Klíčová slova',
    keywordPlaceholder: 'Přidat klíčové slovo',
    keywordsHint: 'Doporučeno: 5 – 15 klíčových slov.',
    activeTemplate: 'Aktivní šablona',
    aiProfile: 'AI profil',
    close: 'Zavřít',
    requiredNote: 'Povinná pole jsou označena hvězdičkou.',
  },
  EN: {
    pageTitle: 'Work Profile',
    editTitle: 'Edit Work Profile',
    subtitle:
      'AI will generate academic work according to the selected type, language and citation standard.',
    workType: 'Work type',
    level: 'Expertise level',
    language: 'Interface language',
    workLanguage: 'Language of the work',
    workLanguageHint:
      'Choose the language in which AI should generate the final academic work.',
    basic: 'Basic information',
    academicProfile: 'Academic profile',
    structure: 'Work structure',
    requiredSections: 'Required sections',
    citation: 'Citation style',
    recommendedLength: 'Recommended length',
    preview: 'Profile preview',
    save: 'Save profile',
    saveChanges: 'Save profile changes',
    saving: 'Saving...',
    titlePlaceholder: 'Title of the work',
    topicPlaceholder: 'Topic',
    fieldPlaceholder: 'Field / subject / area',
    supervisorPlaceholder: 'Supervisor',
    keywords: 'Keywords',
    keywordPlaceholder: 'Add keyword',
    keywordsHint: 'Recommended: 5–15 keywords.',
    activeTemplate: 'Active template',
    aiProfile: 'AI profile',
    close: 'Close',
    requiredNote: 'Required fields are marked with an asterisk.',
  },
  DE: {
    pageTitle: 'Arbeitsprofil',
    editTitle: 'Arbeitsprofil bearbeiten',
    subtitle:
      'Die KI erstellt die akademische Arbeit nach Typ, Sprache und Zitiernorm.',
    workType: 'Art der Arbeit',
    level: 'Fachniveau',
    language: 'Sprache der Oberfläche',
    workLanguage: 'Sprache der Arbeit',
    workLanguageHint:
      'Wählen Sie die Sprache, in der die KI die Arbeit erstellen soll.',
    basic: 'Grunddaten',
    academicProfile: 'Akademisches Profil',
    structure: 'Struktur der Arbeit',
    requiredSections: 'Pflichtteile',
    citation: 'Zitierweise',
    recommendedLength: 'Empfohlener Umfang',
    preview: 'Profilvorschau',
    save: 'Profil speichern',
    saveChanges: 'Änderungen speichern',
    saving: 'Speichern...',
    titlePlaceholder: 'Titel der Arbeit',
    topicPlaceholder: 'Thema',
    fieldPlaceholder: 'Fachgebiet / Bereich',
    supervisorPlaceholder: 'Betreuer',
    keywords: 'Schlüsselwörter',
    keywordPlaceholder: 'Schlüsselwort hinzufügen',
    keywordsHint: 'Empfohlen: 5–15 Schlüsselwörter.',
    activeTemplate: 'Aktive Vorlage',
    aiProfile: 'KI-Profil',
    close: 'Schließen',
    requiredNote: 'Pflichtfelder sind mit einem Stern markiert.',
  },
  PL: {
    pageTitle: 'Profil pracy',
    editTitle: 'Edytuj profil pracy',
    subtitle:
      'AI utworzy pracę akademicką zgodnie z typem, językiem i normą cytowania.',
    workType: 'Typ pracy',
    level: 'Poziom specjalizacji',
    language: 'Język interfejsu',
    workLanguage: 'Język pracy',
    workLanguageHint:
      'Wybierz język, w którym AI ma utworzyć końcową pracę akademicką.',
    basic: 'Dane podstawowe',
    academicProfile: 'Profil akademicki',
    structure: 'Struktura pracy',
    requiredSections: 'Części obowiązkowe',
    citation: 'Styl cytowania',
    recommendedLength: 'Zalecana objętość',
    preview: 'Podgląd profilu',
    save: 'Zapisz profil',
    saveChanges: 'Zapisz zmiany profilu',
    saving: 'Zapisuję...',
    titlePlaceholder: 'Tytuł pracy',
    topicPlaceholder: 'Temat pracy',
    fieldPlaceholder: 'Kierunek / przedmiot / obszar',
    supervisorPlaceholder: 'Promotor',
    keywords: 'Słowa kluczowe',
    keywordPlaceholder: 'Dodaj słowo kluczowe',
    keywordsHint: 'Zalecane: 5–15 słów kluczowych.',
    activeTemplate: 'Aktywny szablon',
    aiProfile: 'Profil AI',
    close: 'Zamknij',
    requiredNote: 'Pola wymagane są oznaczone gwiazdką.',
  },
  HU: {
    pageTitle: 'Dolgozatprofil',
    editTitle: 'Dolgozatprofil szerkesztése',
    subtitle:
      'Az AI a kiválasztott típus, nyelv és hivatkozási szabvány szerint készíti el a munkát.',
    workType: 'Munka típusa',
    level: 'Szakmai szint',
    language: 'Felület nyelve',
    workLanguage: 'A dolgozat nyelve',
    workLanguageHint:
      'Válassza ki, milyen nyelven készüljön el az akadémiai munka.',
    basic: 'Alapadatok',
    academicProfile: 'Akadémiai profil',
    structure: 'A munka szerkezete',
    requiredSections: 'Kötelező részek',
    citation: 'Hivatkozási stílus',
    recommendedLength: 'Ajánlott terjedelem',
    preview: 'Profil előnézet',
    save: 'Profil mentése',
    saveChanges: 'Módosítások mentése',
    saving: 'Mentés...',
    titlePlaceholder: 'A munka címe',
    topicPlaceholder: 'Téma',
    fieldPlaceholder: 'Szak / tantárgy / terület',
    supervisorPlaceholder: 'Témavezető',
    keywords: 'Kulcsszavak',
    keywordPlaceholder: 'Kulcsszó hozzáadása',
    keywordsHint: 'Ajánlott: 5–15 kulcsszó.',
    activeTemplate: 'Aktív sablon',
    aiProfile: 'AI profil',
    close: 'Bezárás',
    requiredNote: 'A kötelező mezők csillaggal vannak jelölve.',
  },
};

const WORK_LABELS: Record<WorkTypeKey, Record<Lang, string>> = {
  seminar: {
    SK: 'Seminárna práca',
    CZ: 'Seminární práce',
    EN: 'Seminar paper',
    DE: 'Seminararbeit',
    PL: 'Praca seminaryjna',
    HU: 'Szemináriumi munka',
  },
  essay: {
    SK: 'Esej',
    CZ: 'Esej',
    EN: 'Essay',
    DE: 'Essay',
    PL: 'Esej',
    HU: 'Esszé',
  },
  maturita: {
    SK: 'Maturitná práca',
    CZ: 'Maturitní práce',
    EN: 'Graduation paper',
    DE: 'Maturaarbeit',
    PL: 'Praca maturalna',
    HU: 'Érettségi munka',
  },
  bachelor: {
    SK: 'Bakalárska práca',
    CZ: 'Bakalářská práce',
    EN: 'Bachelor thesis',
    DE: 'Bachelorarbeit',
    PL: 'Praca licencjacka',
    HU: 'Alapszakos szakdolgozat',
  },
  master: {
    SK: 'Diplomová práca',
    CZ: 'Diplomová práce',
    EN: 'Master thesis',
    DE: 'Masterarbeit',
    PL: 'Praca magisterska',
    HU: 'Mesterszakos szakdolgozat',
  },
  graduate: {
    SK: 'Absolventská práca',
    CZ: 'Absolventská práce',
    EN: 'Graduate thesis',
    DE: 'Abschlussarbeit',
    PL: 'Praca absolwencka',
    HU: 'Zárómunka',
  },
  rigorous: {
    SK: 'Rigorózna práca',
    CZ: 'Rigorózní práce',
    EN: 'Rigorous thesis',
    DE: 'Rigorosumsarbeit',
    PL: 'Praca rygorystyczna',
    HU: 'Rigorózus dolgozat',
  },
  dissertation: {
    SK: 'Dizertačná práca',
    CZ: 'Disertační práce',
    EN: 'Dissertation',
    DE: 'Dissertation',
    PL: 'Rozprawa doktorska',
    HU: 'Doktori értekezés',
  },
  habilitation: {
    SK: 'Habilitačná práca',
    CZ: 'Habilitační práce',
    EN: 'Habilitation thesis',
    DE: 'Habilitationsschrift',
    PL: 'Praca habilitacyjna',
    HU: 'Habilitációs dolgozat',
  },
  mba: {
    SK: 'MBA práca',
    CZ: 'MBA práce',
    EN: 'MBA thesis',
    DE: 'MBA-Arbeit',
    PL: 'Praca MBA',
    HU: 'MBA dolgozat',
  },
  dba: {
    SK: 'DBA práca',
    CZ: 'DBA práce',
    EN: 'DBA thesis',
    DE: 'DBA-Arbeit',
    PL: 'Praca DBA',
    HU: 'DBA dolgozat',
  },
  attestation: {
    SK: 'Atestačná práca',
    CZ: 'Atestační práce',
    EN: 'Attestation thesis',
    DE: 'Attestationsarbeit',
    PL: 'Praca atestacyjna',
    HU: 'Minősítő dolgozat',
  },
  msc: {
    SK: 'MSc. práca',
    CZ: 'MSc. práce',
    EN: 'MSc thesis',
    DE: 'MSc-Arbeit',
    PL: 'Praca MSc',
    HU: 'MSc dolgozat',
  },
};

const LEVEL_LABELS: Record<LevelKey, Record<Lang, string>> = {
  expert: {
    SK: 'Vysoko odborná',
    CZ: 'Vysoce odborná',
    EN: 'Highly expert',
    DE: 'Sehr fachlich',
    PL: 'Wysoce specjalistyczna',
    HU: 'Magas szakmai szint',
  },
  academic: {
    SK: 'Akademická',
    CZ: 'Akademická',
    EN: 'Academic',
    DE: 'Akademisch',
    PL: 'Akademicka',
    HU: 'Akadémiai',
  },
  standard: {
    SK: 'Štandardná',
    CZ: 'Standardní',
    EN: 'Standard',
    DE: 'Standard',
    PL: 'Standardowa',
    HU: 'Általános',
  },
  simple: {
    SK: 'Zjednodušená',
    CZ: 'Zjednodušená',
    EN: 'Simplified',
    DE: 'Vereinfacht',
    PL: 'Uproszczona',
    HU: 'Egyszerűsített',
  },
  public: {
    SK: 'Pre verejnosť',
    CZ: 'Pro veřejnost',
    EN: 'For public audience',
    DE: 'Für Öffentlichkeit',
    PL: 'Dla opinii publicznej',
    HU: 'Közérthető',
  },
};

// ================= HELPERS =================

function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang);
}

function isLevel(value: unknown): value is LevelKey {
  return LEVELS.includes(value as LevelKey);
}

function isCitation(value: unknown): value is CitationKey {
  return [
    'APA7',
    'ISO690',
    'STN_ISO_690',
    'Harvard',
    'MLA9',
    'Chicago',
  ].includes(value as CitationKey);
}

function normalizeWorkType(value: unknown): WorkTypeKey {
  const raw = String(value || '').toLowerCase().trim();

  if (WORK_TYPES.includes(raw as WorkTypeKey)) {
    return raw as WorkTypeKey;
  }

  if (raw.includes('semin')) return 'seminar';
  if (raw.includes('esej') || raw.includes('essay')) return 'essay';
  if (raw.includes('matur')) return 'maturita';
  if (raw.includes('bakal') || raw.includes('bachelor')) return 'bachelor';
  if (raw.includes('diplom') || raw.includes('master')) return 'master';
  if (raw.includes('absolvent') || raw.includes('graduate')) return 'graduate';
  if (raw.includes('rigor')) return 'rigorous';
  if (raw.includes('dizert') || raw.includes('dissert')) return 'dissertation';
  if (raw.includes('habil')) return 'habilitation';
  if (raw.includes('mba')) return 'mba';
  if (raw.includes('dba')) return 'dba';
  if (raw.includes('atest')) return 'attestation';
  if (raw.includes('msc')) return 'msc';

  return 'bachelor';
}

function normalizeCitation(value: unknown): CitationKey {
  const raw = String(value || '').trim();

  if (isCitation(raw)) return raw;

  const upper = raw.toUpperCase();

  if (upper.includes('APA')) return 'APA7';
  if (upper.includes('STN')) return 'STN_ISO_690';
  if (upper.includes('ISO')) return 'ISO690';
  if (upper.includes('HARVARD')) return 'Harvard';
  if (upper.includes('MLA')) return 'MLA9';
  if (upper.includes('CHICAGO')) return 'Chicago';

  return 'STN_ISO_690';
}

function normalizeKeywords(value: unknown, fallback: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (Array.isArray(fallback)) {
    return fallback.map((item) => String(item).trim()).filter(Boolean);
  }

  return [];
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function readString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return '';
}

function fieldText(
  key: DynamicFieldKey,
  lang: Lang
): { label: string; placeholder: string } {
  const sk: Record<DynamicFieldKey, { label: string; placeholder: string }> = {
    annotation: {
      label: 'Anotácia',
      placeholder: 'Stručne popíšte, o čom bude práca a aký problém rieši.',
    },
    goal: {
      label: 'Cieľ práce',
      placeholder: 'Definujte hlavný cieľ práce.',
    },
    problem: {
      label: 'Výskumný problém',
      placeholder: 'Aký odborný alebo výskumný problém bude práca riešiť?',
    },
    methodology: {
      label: 'Metodológia / metodika',
      placeholder:
        'Napr. analýza, komparácia, dotazník, rozhovor, prípadová štúdia, experiment.',
    },
    hypotheses: {
      label: 'Hypotézy',
      placeholder:
        'Uveďte hypotézy, ktoré má práca overovať. Napr. H1: Predpokladáme, že...',
    },
    researchQuestions: {
      label: 'Výskumné otázky',
      placeholder:
        'Uveďte hlavné a čiastkové výskumné otázky. Napr. VO1: Aký je aktuálny stav...',
    },
    practicalPart: {
      label: 'Praktická časť',
      placeholder: 'Popíšte, čo má obsahovať praktická alebo analytická časť.',
    },
    scientificContribution: {
      label: 'Vedecký / odborný prínos',
      placeholder:
        'Čo nové práca prináša do teórie, vedy alebo odbornej praxe?',
    },
    businessProblem: {
      label: 'Firemný / manažérsky problém',
      placeholder:
        'Aký konkrétny problém vo firme, organizácii alebo procese má práca riešiť?',
    },
    businessGoal: {
      label: 'Manažérsky cieľ',
      placeholder:
        'Napr. zníženie nákladov, optimalizácia procesov, zvýšenie výkonu.',
    },
    implementation: {
      label: 'Implementačný plán',
      placeholder: 'Ako sa má navrhnuté riešenie zaviesť do praxe?',
    },
    caseStudy: {
      label: 'Prípadová štúdia / organizácia',
      placeholder:
        'Uveďte firmu, školu, inštitúciu, odvetvie alebo konkrétny prípad.',
    },
    reflection: {
      label: 'Reflexia / hodnotenie',
      placeholder:
        'Popíšte vlastné hodnotenie, skúsenosti, limity a odporúčania.',
    },
    sourcesRequirement: {
      label: 'Požiadavky na zdroje',
      placeholder:
        'Napr. minimálne 20 odborných zdrojov, vedecké články, normy, zákony, knihy.',
    },
  };

  if (lang === 'CZ') {
    return {
      label: sk[key].label
        .replace('Cieľ', 'Cíl')
        .replace('Výskumný', 'Výzkumný')
        .replace('Výskumné', 'Výzkumné')
        .replace('Praktická časť', 'Praktická část')
        .replace('Požiadavky', 'Požadavky'),
      placeholder: sk[key].placeholder,
    };
  }

  if (lang === 'EN') {
    const en: Record<DynamicFieldKey, { label: string; placeholder: string }> = {
      annotation: {
        label: 'Annotation',
        placeholder: 'Briefly describe the work and the problem it addresses.',
      },
      goal: {
        label: 'Objective',
        placeholder: 'Define the main objective of the work.',
      },
      problem: {
        label: 'Research problem',
        placeholder:
          'What research or professional problem will the work address?',
      },
      methodology: {
        label: 'Methodology',
        placeholder:
          'E.g. analysis, comparison, questionnaire, interview, case study, experiment.',
      },
      hypotheses: {
        label: 'Hypotheses',
        placeholder: 'Enter the hypotheses to be tested.',
      },
      researchQuestions: {
        label: 'Research questions',
        placeholder: 'Enter main and partial research questions.',
      },
      practicalPart: {
        label: 'Practical part',
        placeholder: 'Describe the practical or analytical part.',
      },
      scientificContribution: {
        label: 'Scientific / professional contribution',
        placeholder:
          'What new contribution does the work bring to theory, science or practice?',
      },
      businessProblem: {
        label: 'Business / management problem',
        placeholder:
          'What specific business, organizational or process problem should be solved?',
      },
      businessGoal: {
        label: 'Management objective',
        placeholder:
          'E.g. cost reduction, process optimization, performance improvement.',
      },
      implementation: {
        label: 'Implementation plan',
        placeholder: 'How should the proposed solution be implemented?',
      },
      caseStudy: {
        label: 'Case study / organization',
        placeholder:
          'Enter company, school, institution, sector or specific case.',
      },
      reflection: {
        label: 'Reflection / evaluation',
        placeholder:
          'Describe evaluation, experience, limitations and recommendations.',
      },
      sourcesRequirement: {
        label: 'Source requirements',
        placeholder:
          'E.g. at least 20 scholarly sources, articles, standards, laws, books.',
      },
    };

    return en[key];
  }

  return sk[key];
}

function makeField(
  key: DynamicFieldKey,
  lang: Lang,
  required = false,
  rows = 4
): DynamicField {
  const text = fieldText(key, lang);

  return {
    key,
    label: text.label,
    placeholder: text.placeholder,
    required,
    rows,
  };
}

function addAlwaysVisibleFields(
  fields: DynamicField[],
  lang: Lang
): DynamicField[] {
  const used = new Set(fields.map((field) => field.key));
  const result = [...fields];

  for (const key of ALWAYS_VISIBLE_DYNAMIC_FIELDS) {
    if (!used.has(key)) {
      result.push(makeField(key, lang, false, key === 'methodology' ? 5 : 4));
      used.add(key);
    }
  }

  return result;
}

// ================= SCHEMA =================

function getSchema(type: WorkTypeKey, lang: Lang): WorkSchema {
  const label = WORK_LABELS[type][lang];
  const commonCitation: CitationKey[] = [
    'APA7',
    'ISO690',
    'STN_ISO_690',
    'Harvard',
  ];

  if (type === 'essay') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Esej je argumentačný alebo reflexívny text. Nepoužíva sa rovnaká štruktúra ako pri bakalárskej práci.'
          : 'Essay is an argumentative or reflective text.',
      recommendedLength: '3 – 8 strán',
      citationOptions: ['APA7', 'MLA9', 'Chicago', 'Harvard'],
      structure: [
        'Úvod',
        'Hlavná téza',
        'Argumentácia',
        'Protiargumenty',
        'Vlastný postoj',
        'Záver',
      ],
      requiredSections: ['Téza', 'Argumenty', 'Vlastný postoj', 'Záver'],
      fields: [
        makeField('annotation', lang, false, 3),
        makeField('goal', lang, true, 3),
        makeField('reflection', lang, true, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction: 'Generate an essay only. Use argumentative structure.',
    };
  }

  if (type === 'seminar') {
    return {
      typeKey: type,
      label,
      description:
        'Seminárna práca má jednoduchšiu akademickú štruktúru so zameraním na tému, teóriu, analýzu a zdroje.',
      recommendedLength: '8 – 20 strán',
      citationOptions: commonCitation,
      structure: [
        'Úvod',
        'Teoretická časť',
        'Analytická časť',
        'Diskusia',
        'Záver',
        'Zoznam zdrojov',
      ],
      requiredSections: [
        'Úvod',
        'Teoretická časť',
        'Analýza',
        'Záver',
        'Zdroje',
      ],
      fields: [
        makeField('annotation', lang, false, 3),
        makeField('goal', lang, true, 3),
        makeField('methodology', lang, false, 4),
        makeField('researchQuestions', lang, false, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('practicalPart', lang, false, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate a seminar paper with theory, basic analysis and conclusion.',
    };
  }

  if (type === 'bachelor') {
    return {
      typeKey: type,
      label,
      description:
        'Bakalárska práca musí mať jasný cieľ, teoretickú časť, metodiku a praktickú alebo analytickú časť.',
      recommendedLength: '30 – 45 strán',
      citationOptions: commonCitation,
      structure: [
        'Abstrakt',
        'Úvod',
        'Teoretické východiská',
        'Cieľ práce',
        'Výskumný problém',
        'Výskumné otázky / hypotézy',
        'Metodika',
        'Praktická / analytická časť',
        'Diskusia',
        'Záver',
        'Zoznam literatúry',
        'Prílohy',
      ],
      requiredSections: [
        'Abstrakt',
        'Úvod',
        'Cieľ',
        'Výskumný problém',
        'Výskumné otázky / hypotézy',
        'Metodika',
        'Praktická časť',
        'Záver',
        'Zdroje',
      ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 4),
        makeField('goal', lang, true, 3),
        makeField('researchQuestions', lang, false, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('methodology', lang, true, 4),
        makeField('practicalPart', lang, true, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate a bachelor thesis with theory, objective, research problem, research questions or hypotheses, methodology and practical part.',
    };
  }

  if (type === 'master' || type === 'msc') {
    return {
      typeKey: type,
      label,
      description:
        'Diplomová alebo MSc. práca musí obsahovať hlbšiu analýzu, metodológiu, výskumné otázky alebo hypotézy, výsledky a diskusiu.',
      recommendedLength: '50 – 80 strán',
      citationOptions: commonCitation,
      structure: [
        'Abstrakt',
        'Úvod',
        'Súčasný stav riešenej problematiky',
        'Ciele práce',
        'Výskumné otázky / hypotézy',
        'Metodológia',
        'Výsledky',
        'Diskusia',
        'Návrh riešenia',
        'Záver',
        'Zoznam literatúry',
        'Prílohy',
      ],
      requiredSections: [
        'Abstrakt',
        'Úvod',
        'Ciele',
        'Výskumné otázky / hypotézy',
        'Metodológia',
        'Výsledky',
        'Diskusia',
        'Záver',
      ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 4),
        makeField('goal', lang, true, 3),
        makeField('researchQuestions', lang, true, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('methodology', lang, true, 5),
        makeField('practicalPart', lang, true, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate a master thesis with deeper analysis, methodology, research questions, results and discussion.',
    };
  }

  if (type === 'dissertation') {
    return {
      typeKey: type,
      label,
      description:
        'Dizertačná práca vyžaduje originálny vedecký prínos, výskumný dizajn, hypotézy, metodológiu, výsledky a publikovateľné závery.',
      recommendedLength: '100 – 180 strán',
      citationOptions: ['APA7', 'ISO690', 'STN_ISO_690', 'Chicago'],
      structure: [
        'Abstrakt',
        'Úvod',
        'Teoretický rámec',
        'Prehľad súčasného stavu poznania',
        'Výskumný problém',
        'Ciele, otázky a hypotézy',
        'Metodológia výskumu',
        'Výsledky výskumu',
        'Diskusia',
        'Originálny vedecký prínos',
        'Limity výskumu',
        'Záver',
        'Publikácie autora',
        'Zoznam literatúry',
      ],
      requiredSections: [
        'Výskumný problém',
        'Výskumné otázky',
        'Hypotézy',
        'Metodológia',
        'Výsledky',
        'Diskusia',
        'Vedecký prínos',
      ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 5),
        makeField('goal', lang, true, 4),
        makeField('researchQuestions', lang, true, 4),
        makeField('hypotheses', lang, true, 5),
        makeField('methodology', lang, true, 6),
        makeField('scientificContribution', lang, true, 5),
        makeField('sourcesRequirement', lang, true, 3),
      ],
      aiInstruction:
        'Generate a doctoral dissertation with original scientific contribution.',
    };
  }

  if (type === 'mba') {
    return {
      typeKey: type,
      label,
      description:
        'MBA práca má praktický manažérsky charakter. Rieši problém firmy, procesov, stratégie alebo riadenia.',
      recommendedLength: '35 – 60 strán',
      citationOptions: ['APA7', 'Harvard', 'Chicago'],
      structure: [
        'Manažérske zhrnutie',
        'Opis organizácie',
        'Definícia firemného problému',
        'Analýza súčasného stavu',
        'Strategické možnosti',
        'Návrh riešenia',
        'Implementačný plán',
        'Finančné a rizikové vyhodnotenie',
        'Záver',
      ],
      requiredSections: [
        'Manažérske zhrnutie',
        'Firemný problém',
        'Analýza',
        'Návrh riešenia',
        'Implementácia',
      ],
      fields: [
        makeField('caseStudy', lang, true, 3),
        makeField('businessProblem', lang, true, 4),
        makeField('businessGoal', lang, true, 4),
        makeField('methodology', lang, false, 4),
        makeField('researchQuestions', lang, false, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('implementation', lang, true, 5),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate an MBA thesis focused on business problem, strategy and implementation.',
    };
  }

  if (type === 'dba') {
    return {
      typeKey: type,
      label,
      description:
        'DBA práca kombinuje aplikovaný výskum, strategický manažment a originálny prínos pre prax.',
      recommendedLength: '80 – 150 strán',
      citationOptions: ['APA7', 'Harvard', 'Chicago'],
      structure: [
        'Executive summary',
        'Výskumný a manažérsky problém',
        'Teoretický rámec',
        'Aplikovaná metodológia',
        'Empirická časť',
        'Strategické vyhodnotenie',
        'Originálny prínos pre prax',
        'Implementácia',
        'Záver',
      ],
      requiredSections: [
        'Výskumný problém',
        'Výskumné otázky',
        'Aplikovaná metodológia',
        'Empirické výsledky',
        'Prínos pre prax',
      ],
      fields: [
        makeField('caseStudy', lang, true, 3),
        makeField('businessProblem', lang, true, 4),
        makeField('problem', lang, true, 4),
        makeField('researchQuestions', lang, true, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('methodology', lang, true, 6),
        makeField('scientificContribution', lang, true, 5),
        makeField('implementation', lang, true, 5),
      ],
      aiInstruction:
        'Generate a DBA thesis combining applied research, business strategy and empirical analysis.',
    };
  }

  if (type === 'attestation') {
    return {
      typeKey: type,
      label,
      description:
        'Atestačná práca sa zameriava na odbornú prax, profesijné kompetencie, metodické riešenie a reflexiu.',
      recommendedLength: '25 – 50 strán',
      citationOptions: commonCitation,
      structure: [
        'Úvod',
        'Profesijný kontext',
        'Teoretické východiská',
        'Opis problému z praxe',
        'Metodické riešenie',
        'Realizácia',
        'Reflexia a hodnotenie',
        'Záver',
      ],
      requiredSections: [
        'Profesijný problém',
        'Metodické riešenie',
        'Realizácia',
        'Reflexia',
      ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 4),
        makeField('goal', lang, false, 3),
        makeField('researchQuestions', lang, false, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('methodology', lang, true, 4),
        makeField('practicalPart', lang, true, 4),
        makeField('reflection', lang, true, 4),
      ],
      aiInstruction:
        'Generate an attestation thesis focused on professional practice and reflection.',
    };
  }

  if (type === 'rigorous' || type === 'habilitation') {
    return {
      typeKey: type,
      label,
      description:
        'Rigorózna alebo habilitačná práca musí preukázať vysokú odbornú úroveň, samostatný vedecký prístup a jasný prínos.',
      recommendedLength:
        type === 'habilitation' ? '120 – 250 strán' : '70 – 120 strán',
      citationOptions: ['APA7', 'ISO690', 'STN_ISO_690', 'Chicago'],
      structure: [
        'Abstrakt',
        'Úvod',
        'Teoretický rámec',
        'Analýza súčasného stavu',
        'Výskumný problém',
        'Výskumné otázky / hypotézy',
        'Metodológia',
        'Výsledky',
        'Diskusia',
        'Odborný / vedecký prínos',
        'Záver',
        'Literatúra',
      ],
      requiredSections: [
        'Teoretický rámec',
        'Výskumný problém',
        'Výskumné otázky / hypotézy',
        'Metodológia',
        'Výsledky',
        'Prínos',
      ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 5),
        makeField('goal', lang, true, 4),
        makeField('researchQuestions', lang, false, 4),
        makeField('hypotheses', lang, false, 4),
        makeField('methodology', lang, true, 5),
        makeField('scientificContribution', lang, true, 5),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate an advanced academic thesis emphasizing theory, methodology, results and contribution.',
    };
  }

  return {
    typeKey: type,
    label,
    description:
      'Tento typ práce má stredne náročnú odbornú štruktúru s dôrazom na tému, cieľ, výskumné otázky, metodiku, praktickú časť a záver.',
    recommendedLength: '15 – 35 strán',
    citationOptions: commonCitation,
    structure: [
      'Úvod',
      'Teoretická časť',
      'Cieľ práce',
      'Výskumné otázky / hypotézy',
      'Metodika',
      'Praktická časť',
      'Vyhodnotenie',
      'Záver',
      'Zdroje',
    ],
    requiredSections: [
      'Úvod',
      'Teória',
      'Cieľ',
      'Výskumné otázky / hypotézy',
      'Metodika',
      'Praktická časť',
      'Záver',
    ],
    fields: [
      makeField('annotation', lang, false, 3),
      makeField('problem', lang, false, 4),
      makeField('goal', lang, true, 3),
      makeField('researchQuestions', lang, false, 4),
      makeField('hypotheses', lang, false, 4),
      makeField('methodology', lang, false, 4),
      makeField('practicalPart', lang, true, 4),
      makeField('sourcesRequirement', lang, false, 3),
    ],
    aiInstruction: 'Generate a medium-level academic or professional work.',
  };
}

function normalizeInitialProfile(
  initialProfile?: Partial<SavedProfile> | null
): Profile {
  if (!initialProfile) return emptyProfile;

  const raw = initialProfile as Record<string, unknown>;

  const language = isLang(initialProfile.language)
    ? initialProfile.language
    : emptyProfile.language;

  const workLanguage = isLang(initialProfile.workLanguage)
    ? initialProfile.workLanguage
    : isLang(raw.work_language)
      ? raw.work_language
      : language;

  const type = normalizeWorkType(initialProfile.type);

  const level = isLevel(initialProfile.level)
    ? initialProfile.level
    : emptyProfile.level;

  return {
    ...emptyProfile,
    type,
    level,
    title: readString(raw, ['title']),
    topic: readString(raw, ['topic']),
    field: readString(raw, ['field']),
    supervisor: readString(raw, ['supervisor']),
    citation: normalizeCitation(initialProfile.citation),
    language,
    workLanguage,
    annotation: readString(raw, ['annotation']),
    goal: readString(raw, ['goal']),
    problem: readString(raw, ['problem']),
    methodology: readString(raw, ['methodology']),
    hypotheses: readString(raw, ['hypotheses']),
    researchQuestions: readString(raw, [
      'researchQuestions',
      'research_questions',
    ]),
    practicalPart: readString(raw, ['practicalPart', 'practical_part']),
    scientificContribution: readString(raw, [
      'scientificContribution',
      'scientific_contribution',
    ]),
    businessProblem: readString(raw, ['businessProblem', 'business_problem']),
    businessGoal: readString(raw, ['businessGoal', 'business_goal']),
    implementation: readString(raw, ['implementation']),
    caseStudy: readString(raw, ['caseStudy', 'case_study']),
    reflection: readString(raw, ['reflection']),
    sourcesRequirement: readString(raw, [
      'sourcesRequirement',
      'sources_requirement',
    ]),
    keywordsList: normalizeKeywords(
      initialProfile.keywordsList,
      initialProfile.keywords
    ),
  };
}

// ================= COMPONENT =================

export default function ProfileForm({
  onSave,
  onClose,
  initialProfile,
}: ProfileFormProps) {
  const [profile, setProfile] = useState<Profile>(() =>
    normalizeInitialProfile(initialProfile)
  );

  const [editingId, setEditingId] = useState<string | null>(
    initialProfile?.id || null
  );

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfile(normalizeInitialProfile(initialProfile));
    setEditingId(initialProfile?.id || null);
  }, [initialProfile]);

  const labels = UI[profile.language];

  const schema = useMemo(
    () => getSchema(profile.type, profile.language),
    [profile.type, profile.language]
  );

  const visibleFields = useMemo(
    () => addAlwaysVisibleFields(schema.fields, profile.language),
    [schema.fields, profile.language]
  );

  const schemaForSave = useMemo<WorkSchema>(
    () => ({
      ...schema,
      fields: visibleFields,
    }),
    [schema, visibleFields]
  );

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateDynamicField = (key: DynamicFieldKey, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const changeLanguage = (lang: Lang) => {
    setProfile((prev) => ({
      ...prev,
      language: lang,
    }));
  };

  const changeWorkLanguage = (lang: Lang) => {
    setProfile((prev) => ({
      ...prev,
      workLanguage: lang,
    }));
  };

  const changeWorkType = (type: WorkTypeKey) => {
    const nextSchema = getSchema(type, profile.language);

    setProfile((prev) => ({
      ...prev,
      type,
      citation: nextSchema.citationOptions[0],
    }));
  };

  const createPayload = (): SavedProfile => {
    const id =
      editingId ||
      initialProfile?.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString());

    return {
      ...profile,
      id,
      schema: schemaForSave,
      interfaceLanguage: profile.language,
      workLanguage: profile.workLanguage,
      keywords: profile.keywordsList,
      keywordsList: profile.keywordsList,
      savedAt: new Date().toISOString(),
    };
  };

  const savePayloadToStorage = (payload: SavedProfile) => {
    localStorage.setItem('profile', JSON.stringify(payload));
    localStorage.setItem('active_profile', JSON.stringify(payload));

    const oldProfiles = safeJsonParse<SavedProfile[]>(
      localStorage.getItem('profiles_full'),
      []
    );

    const profiles = Array.isArray(oldProfiles) ? oldProfiles : [];

    const exists = profiles.some((item) => item.id === payload.id);

    const newProfiles = exists
      ? profiles.map((item) => (item.id === payload.id ? payload : item))
      : [payload, ...profiles];

    localStorage.setItem('profiles_full', JSON.stringify(newProfiles));
  };

  const saveProfile = async () => {
    if (!profile.title.trim()) {
      alert(
        profile.language === 'SK'
          ? 'Vyplň názov práce.'
          : 'Please fill in the title of the work.'
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = createPayload();

      savePayloadToStorage(payload);

      const supabase = createClient();

      const { error } = await supabase.from('zedpera_profiles').upsert(
        {
          id: payload.id,
          title: payload.title,
          type: payload.type,
          level: payload.level,
          topic: payload.topic,
          field: payload.field,
          supervisor: payload.supervisor,
          citation: payload.citation,
          language: payload.language,
          work_language: payload.workLanguage,
          annotation: payload.annotation,
          goal: payload.goal,
          problem: payload.problem,
          methodology: payload.methodology,
          hypotheses: payload.hypotheses,
          research_questions: payload.researchQuestions,
          practical_part: payload.practicalPart,
          scientific_contribution: payload.scientificContribution,
          business_problem: payload.businessProblem,
          business_goal: payload.businessGoal,
          implementation: payload.implementation,
          case_study: payload.caseStudy,
          reflection: payload.reflection,
          sources_requirement: payload.sourcesRequirement,
          keywords_list: payload.keywordsList,
          schema: payload.schema,
          full_profile: payload,
          updated_at: payload.savedAt,
        },
        {
          onConflict: 'id',
        }
      );

      if (error) {
        console.error('SUPABASE PROFILE SAVE ERROR:', error);

        alert(
          profile.language === 'SK'
            ? `Profil sa uložil lokálne, ale nie do Supabase: ${error.message}`
            : `Profile was saved locally, but not to Supabase: ${error.message}`
        );

        onSave?.(payload);
        onClose?.();
        return;
      }

      onSave?.(payload);
      onClose?.();

      alert(
        profile.language === 'SK'
          ? editingId
            ? 'Profil bol upravený.'
            : 'Profil bol uložený.'
          : editingId
            ? 'Profile updated.'
            : 'Profile saved.'
      );
    } catch (error) {
      console.error('PROFILE SAVE ERROR:', error);

      alert(
        profile.language === 'SK'
          ? 'Nastala chyba pri ukladaní profilu.'
          : 'An error occurred while saving the profile.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8 md:px-8">
        <div className="overflow-hidden rounded-[32px] border border-slate-800 bg-[#050816] shadow-2xl shadow-slate-950/40">
          <header className="border-b border-white/10 bg-[#050816] px-6 py-7 md:px-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">
                  <Sparkles className="h-4 w-4" />
                  ZEDPERA AI
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  {editingId ? labels.editTitle : labels.pageTitle}
                </h1>

                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400 md:text-lg">
                  {labels.subtitle}
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {labels.activeTemplate}
                </p>

                <p className="mt-2 text-xl font-black text-white">
                  {schema.label}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {schema.recommendedLength}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-8 p-6 md:p-10 xl:grid-cols-[1fr_420px]">
            <div className="space-y-9">
              <Section
                title={labels.workType}
                icon={<BookOpen className="h-5 w-5" />}
              >
                <div className="flex flex-wrap gap-3">
                  {WORK_TYPES.map((type) => (
                    <Chip
                      key={type}
                      active={profile.type === type}
                      onClick={() => changeWorkType(type)}
                    >
                      {WORK_LABELS[type][profile.language]}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section
                title={labels.level}
                icon={<GraduationCap className="h-5 w-5" />}
              >
                <div className="flex flex-wrap gap-3">
                  {LEVELS.map((level) => (
                    <Chip
                      key={level}
                      active={profile.level === level}
                      onClick={() => update('level', level)}
                    >
                      {LEVEL_LABELS[level][profile.language]}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section
                title={labels.language}
                icon={<Languages className="h-5 w-5" />}
              >
                <div className="flex flex-wrap gap-3">
                  {LANGS.map((lang) => (
                    <Chip
                      key={lang}
                      active={profile.language === lang}
                      onClick={() => changeLanguage(lang)}
                    >
                      {lang}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section
                title={labels.workLanguage}
                icon={<Languages className="h-5 w-5" />}
              >
                <p className="mb-4 text-sm leading-6 text-slate-400">
                  {labels.workLanguageHint}
                </p>

                <div className="flex flex-wrap gap-3">
                  {LANGS.map((lang) => (
                    <Chip
                      key={lang}
                      active={profile.workLanguage === lang}
                      onClick={() => changeWorkLanguage(lang)}
                    >
                      {lang}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section
                title={labels.basic}
                icon={<FileText className="h-5 w-5" />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={profile.title}
                    placeholder={labels.titlePlaceholder}
                    onChange={(value) => update('title', value)}
                  />

                  <Input
                    value={profile.topic}
                    placeholder={labels.topicPlaceholder}
                    onChange={(value) => update('topic', value)}
                  />

                  <Input
                    value={profile.field}
                    placeholder={labels.fieldPlaceholder}
                    onChange={(value) => update('field', value)}
                  />

                  <Input
                    value={profile.supervisor}
                    placeholder={labels.supervisorPlaceholder}
                    onChange={(value) => update('supervisor', value)}
                  />
                </div>
              </Section>

              <Section
                title={labels.academicProfile}
                icon={<Target className="h-5 w-5" />}
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-white">
                      {labels.citation}
                    </label>

                    <select
                      value={profile.citation}
                      onChange={(event) =>
                        update('citation', event.target.value as CitationKey)
                      }
                      className="w-full rounded-2xl border border-white/10 bg-[#111525] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                    >
                      {schema.citationOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <InfoBox
                    label={labels.recommendedLength}
                    value={schema.recommendedLength}
                  />
                </div>

                <p className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100">
                  {labels.requiredNote}
                </p>

                <div className="mt-6 grid gap-5">
                  {visibleFields.map((field) => (
                    <Textarea
                      key={field.key}
                      label={field.label}
                      required={field.required}
                      rows={field.rows || 4}
                      value={String(profile[field.key] || '')}
                      placeholder={field.placeholder}
                      onChange={(value) =>
                        updateDynamicField(field.key, value)
                      }
                    />
                  ))}
                </div>
              </Section>

              <Section
                title={labels.keywords}
                icon={<Library className="h-5 w-5" />}
              >
                <KeywordsInput
                  value={profile.keywordsList}
                  placeholder={labels.keywordPlaceholder}
                  hint={labels.keywordsHint}
                  onChange={(value) => update('keywordsList', value)}
                />
              </Section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={saveProfile}
                  disabled={isSaving}
                  type="button"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-base font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-5 w-5" />
                  {isSaving
                    ? labels.saving
                    : editingId
                      ? labels.saveChanges
                      : labels.save}
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base font-black text-white transition hover:bg-white/10"
                  >
                    {labels.close}
                  </button>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <Panel
                title={labels.preview}
                icon={<Sparkles className="h-5 w-5" />}
              >
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {labels.workType}
                    </p>

                    <p className="mt-2 text-xl font-black text-white">
                      {schema.label}
                    </p>
                  </div>

                  <p className="text-sm leading-6 text-slate-300">
                    {schema.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox label={labels.language} value={profile.language} />

                    <InfoBox
                      label={labels.workLanguage}
                      value={profile.workLanguage}
                    />

                    <InfoBox label={labels.citation} value={profile.citation} />

                    <InfoBox
                      label={labels.level}
                      value={LEVEL_LABELS[profile.level][profile.language]}
                    />

                    <InfoBox
                      label={labels.aiProfile}
                      value={schema.typeKey.toUpperCase()}
                    />
                  </div>
                </div>
              </Panel>

              <Panel
                title={labels.structure}
                icon={<CheckCircle2 className="h-5 w-5" />}
              >
                <ol className="space-y-3">
                  {schema.structure.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="flex gap-3 text-sm text-slate-300"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-black text-violet-200">
                        {index + 1}
                      </span>

                      <span className="pt-1">{item}</span>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel
                title={labels.requiredSections}
                icon={<GraduationCap className="h-5 w-5" />}
              >
                <div className="flex flex-wrap gap-2">
                  {schema.requiredSections.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

// ================= UI COMPONENTS =================

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 md:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
          {icon}
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
          {icon}
        </div>

        <h3 className="text-lg font-black text-white">{title}</h3>
      </div>

      {children}
    </section>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-white/10 bg-[#111525] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
    />
  );
}

function Textarea({
  label,
  placeholder,
  value,
  onChange,
  required,
  rows = 4,
}: {
  label: string;
  placeholder: string;
  value: string;
  required?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white">
        {label}
        {required && <span className="ml-1 text-violet-300">*</span>}
      </label>

      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-[#111525] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
      />
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'rounded-full px-4 py-2 text-sm font-bold transition',
        active
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-700/30'
          : 'bg-white/10 text-slate-200 hover:bg-white/15',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111525] p-4">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-sm font-black text-white">{value || '—'}</p>
    </div>
  );
}

function KeywordsInput({
  value,
  onChange,
  placeholder,
  hint,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  hint: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const keyword = input.trim();

    if (!keyword) return;

    if (value.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
      setInput('');
      return;
    }

    onChange([...value, keyword]);
    setInput('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-2xl border border-white/10 bg-[#111525] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
        />

        <button
          type="button"
          onClick={add}
          className="rounded-2xl bg-violet-600 px-5 text-lg font-black text-white transition hover:bg-violet-500"
        >
          +
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {value.map((keyword, index) => (
          <button
            key={`${keyword}-${index}`}
            onClick={() => remove(index)}
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-red-600"
          >
            {keyword}
            <Trash2 className="h-3 w-3" />
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {hint} Aktuálne: {value.length}
      </p>
    </div>
  );
}