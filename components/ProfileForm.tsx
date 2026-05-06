'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
};

type ProfileFormProps = {
  onClose?: () => void;
  onSave?: (data: SavedProfile) => void;
};

// ================= OPTIONS =================

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

// ================= TRANSLATIONS =================

const UI: Record<
  Lang,
  {
    pageTitle: string;
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
    generate: string;
    generating: string;
    save: string;
    titlePlaceholder: string;
    topicPlaceholder: string;
    fieldPlaceholder: string;
    supervisorPlaceholder: string;
    keywords: string;
    keywordPlaceholder: string;
    keywordsHint: string;
    validation: string;
    activeTemplate: string;
    aiProfile: string;
  }
> = {
  SK: {
    pageTitle: 'Nová práca',
    subtitle:
      'AI z tohto profilu vytvorí celú akademickú prácu podľa zvoleného typu, jazyka práce a citačnej normy.',
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
    generate: 'Vytvoriť prácu',
    generating: 'Generujem prácu...',
    save: 'Uložiť profil',
    titlePlaceholder: 'Názov práce',
    topicPlaceholder: 'Téma práce',
    fieldPlaceholder: 'Odbor / predmet / oblasť',
    supervisorPlaceholder: 'Vedúci práce / školiteľ',
    keywords: 'Kľúčové slová',
    keywordPlaceholder: 'Pridať kľúčové slovo',
    keywordsHint: 'Odporúčané: 5 – 15 kľúčových slov.',
    validation: 'Vyplň názov práce a typ práce.',
    activeTemplate: 'Aktívna šablóna',
    aiProfile: 'AI profil',
  },
  CZ: {
    pageTitle: 'Profil práce',
    subtitle:
      'AI z tohoto profilu vytvoří celou akademickou práci podle zvoleného typu, jazyka práce a citační normy.',
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
    generate: 'Vytvořit práci',
    generating: 'Generuji práci...',
    save: 'Uložit profil',
    titlePlaceholder: 'Název práce',
    topicPlaceholder: 'Téma práce',
    fieldPlaceholder: 'Obor / předmět / oblast',
    supervisorPlaceholder: 'Vedoucí práce / školitel',
    keywords: 'Klíčová slova',
    keywordPlaceholder: 'Přidat klíčové slovo',
    keywordsHint: 'Doporučeno: 5 – 15 klíčových slov.',
    validation: 'Vyplň název práce a typ práce.',
    activeTemplate: 'Aktivní šablona',
    aiProfile: 'AI profil',
  },
  EN: {
    pageTitle: 'Work Profile',
    subtitle:
      'AI will generate the full academic work according to the selected type, work language and citation standard.',
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
    generate: 'Generate work',
    generating: 'Generating work...',
    save: 'Save profile',
    titlePlaceholder: 'Title of the work',
    topicPlaceholder: 'Topic',
    fieldPlaceholder: 'Field / subject / area',
    supervisorPlaceholder: 'Supervisor',
    keywords: 'Keywords',
    keywordPlaceholder: 'Add keyword',
    keywordsHint: 'Recommended: 5–15 keywords.',
    validation: 'Please fill in the title and work type.',
    activeTemplate: 'Active template',
    aiProfile: 'AI profile',
  },
  DE: {
    pageTitle: 'Arbeitsprofil',
    subtitle:
      'Die KI erstellt die vollständige akademische Arbeit nach Typ, Arbeitssprache und Zitiernorm.',
    workType: 'Art der Arbeit',
    level: 'Fachniveau',
    language: 'Sprache der Oberfläche',
    workLanguage: 'Sprache der Arbeit',
    workLanguageHint:
      'Wählen Sie die Sprache, in der die KI die endgültige akademische Arbeit erstellen soll.',
    basic: 'Grunddaten',
    academicProfile: 'Akademisches Profil',
    structure: 'Struktur der Arbeit',
    requiredSections: 'Pflichtteile',
    citation: 'Zitierweise',
    recommendedLength: 'Empfohlener Umfang',
    preview: 'Profilvorschau',
    generate: 'Arbeit erstellen',
    generating: 'Arbeit wird erstellt...',
    save: 'Profil speichern',
    titlePlaceholder: 'Titel der Arbeit',
    topicPlaceholder: 'Thema',
    fieldPlaceholder: 'Fachgebiet / Bereich',
    supervisorPlaceholder: 'Betreuer',
    keywords: 'Schlüsselwörter',
    keywordPlaceholder: 'Schlüsselwort hinzufügen',
    keywordsHint: 'Empfohlen: 5–15 Schlüsselwörter.',
    validation: 'Bitte Titel und Arbeitstyp ausfüllen.',
    activeTemplate: 'Aktive Vorlage',
    aiProfile: 'KI-Profil',
  },
  PL: {
    pageTitle: 'Profil pracy',
    subtitle:
      'AI utworzy pełną pracę akademicką zgodnie z typem, językiem pracy i normą cytowania.',
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
    generate: 'Utwórz pracę',
    generating: 'Generuję pracę...',
    save: 'Zapisz profil',
    titlePlaceholder: 'Tytuł pracy',
    topicPlaceholder: 'Temat pracy',
    fieldPlaceholder: 'Kierunek / przedmiot / obszar',
    supervisorPlaceholder: 'Promotor',
    keywords: 'Słowa kluczowe',
    keywordPlaceholder: 'Dodaj słowo kluczowe',
    keywordsHint: 'Zalecane: 5–15 słów kluczowych.',
    validation: 'Uzupełnij tytuł i typ pracy.',
    activeTemplate: 'Aktywny szablon',
    aiProfile: 'Profil AI',
  },
  HU: {
    pageTitle: 'Dolgozatprofil',
    subtitle:
      'Az AI a kiválasztott típus, dolgozatnyelv és hivatkozási szabvány szerint elkészíti a teljes munkát.',
    workType: 'Munka típusa',
    level: 'Szakmai szint',
    language: 'Felület nyelve',
    workLanguage: 'A dolgozat nyelve',
    workLanguageHint:
      'Válassza ki, milyen nyelven készüljön el a végleges akadémiai munka.',
    basic: 'Alapadatok',
    academicProfile: 'Akadémiai profil',
    structure: 'A munka szerkezete',
    requiredSections: 'Kötelező részek',
    citation: 'Hivatkozási stílus',
    recommendedLength: 'Ajánlott terjedelem',
    preview: 'Profil előnézet',
    generate: 'Munka létrehozása',
    generating: 'Munka generálása...',
    save: 'Profil mentése',
    titlePlaceholder: 'A munka címe',
    topicPlaceholder: 'Téma',
    fieldPlaceholder: 'Szak / tantárgy / terület',
    supervisorPlaceholder: 'Témavezető',
    keywords: 'Kulcsszavak',
    keywordPlaceholder: 'Kulcsszó hozzáadása',
    keywordsHint: 'Ajánlott: 5–15 kulcsszó.',
    validation: 'Töltse ki a címet és a munka típusát.',
    activeTemplate: 'Aktív sablon',
    aiProfile: 'AI profil',
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

// ================= FIELD LABELS =================

function fieldText(
  key: DynamicFieldKey,
  lang: Lang
): { label: string; placeholder: string } {
  const map: Record<
    DynamicFieldKey,
    Record<Lang, { label: string; placeholder: string }>
  > = {
    annotation: {
      SK: {
        label: 'Anotácia',
        placeholder: 'Stručne popíšte, o čom bude práca a aký problém rieši.',
      },
      CZ: {
        label: 'Anotace',
        placeholder: 'Stručně popište, o čem bude práce a jaký problém řeší.',
      },
      EN: {
        label: 'Annotation',
        placeholder: 'Briefly describe the work and the problem it addresses.',
      },
      DE: {
        label: 'Annotation',
        placeholder: 'Beschreiben Sie kurz Thema und Problem der Arbeit.',
      },
      PL: {
        label: 'Streszczenie',
        placeholder: 'Krótko opisz temat pracy i problem, który rozwiązuje.',
      },
      HU: {
        label: 'Annotáció',
        placeholder: 'Röviden írja le a dolgozat témáját és problémáját.',
      },
    },
    goal: {
      SK: {
        label: 'Cieľ práce',
        placeholder: 'Definujte hlavný cieľ práce.',
      },
      CZ: {
        label: 'Cíl práce',
        placeholder: 'Definujte hlavní cíl práce.',
      },
      EN: {
        label: 'Objective',
        placeholder: 'Define the main objective of the work.',
      },
      DE: {
        label: 'Ziel der Arbeit',
        placeholder: 'Definieren Sie das Hauptziel der Arbeit.',
      },
      PL: {
        label: 'Cel pracy',
        placeholder: 'Zdefiniuj główny cel pracy.',
      },
      HU: {
        label: 'A munka célja',
        placeholder: 'Határozza meg a dolgozat fő célját.',
      },
    },
    problem: {
      SK: {
        label: 'Výskumný problém',
        placeholder: 'Aký odborný alebo výskumný problém bude práca riešiť?',
      },
      CZ: {
        label: 'Výzkumný problém',
        placeholder: 'Jaký odborný nebo výzkumný problém bude práce řešit?',
      },
      EN: {
        label: 'Research problem',
        placeholder:
          'What research or professional problem will the work address?',
      },
      DE: {
        label: 'Forschungsproblem',
        placeholder: 'Welches Forschungs- oder Fachproblem wird behandelt?',
      },
      PL: {
        label: 'Problem badawczy',
        placeholder:
          'Jaki problem badawczy lub zawodowy zostanie rozwiązany?',
      },
      HU: {
        label: 'Kutatási probléma',
        placeholder:
          'Milyen szakmai vagy kutatási problémát vizsgál a munka?',
      },
    },
    methodology: {
      SK: {
        label: 'Metodológia / metodika',
        placeholder:
          'Napr. analýza, komparácia, dotazník, rozhovor, prípadová štúdia, experiment.',
      },
      CZ: {
        label: 'Metodologie / metodika',
        placeholder:
          'Např. analýza, komparace, dotazník, rozhovor, případová studie, experiment.',
      },
      EN: {
        label: 'Methodology',
        placeholder:
          'E.g. analysis, comparison, questionnaire, interview, case study, experiment.',
      },
      DE: {
        label: 'Methodik',
        placeholder:
          'Z. B. Analyse, Vergleich, Fragebogen, Interview, Fallstudie, Experiment.',
      },
      PL: {
        label: 'Metodologia',
        placeholder:
          'Np. analiza, porównanie, ankieta, wywiad, studium przypadku, eksperyment.',
      },
      HU: {
        label: 'Módszertan',
        placeholder:
          'Pl. elemzés, összehasonlítás, kérdőív, interjú, esettanulmány, kísérlet.',
      },
    },
    hypotheses: {
      SK: {
        label: 'Hypotézy',
        placeholder: 'Uveďte hypotézy, ktoré má práca overovať.',
      },
      CZ: {
        label: 'Hypotézy',
        placeholder: 'Uveďte hypotézy, které má práce ověřovat.',
      },
      EN: {
        label: 'Hypotheses',
        placeholder: 'Enter the hypotheses to be tested.',
      },
      DE: {
        label: 'Hypothesen',
        placeholder: 'Geben Sie die zu prüfenden Hypothesen ein.',
      },
      PL: {
        label: 'Hipotezy',
        placeholder: 'Wpisz hipotezy do weryfikacji.',
      },
      HU: {
        label: 'Hipotézisek',
        placeholder: 'Adja meg az ellenőrizendő hipotéziseket.',
      },
    },
    researchQuestions: {
      SK: {
        label: 'Výskumné otázky',
        placeholder: 'Uveďte hlavné a čiastkové výskumné otázky.',
      },
      CZ: {
        label: 'Výzkumné otázky',
        placeholder: 'Uveďte hlavní a dílčí výzkumné otázky.',
      },
      EN: {
        label: 'Research questions',
        placeholder: 'Enter main and partial research questions.',
      },
      DE: {
        label: 'Forschungsfragen',
        placeholder: 'Geben Sie Haupt- und Teilforschungsfragen ein.',
      },
      PL: {
        label: 'Pytania badawcze',
        placeholder: 'Wpisz główne i szczegółowe pytania badawcze.',
      },
      HU: {
        label: 'Kutatási kérdések',
        placeholder: 'Adja meg a fő és részletes kutatási kérdéseket.',
      },
    },
    practicalPart: {
      SK: {
        label: 'Praktická časť',
        placeholder:
          'Popíšte, čo má obsahovať praktická alebo analytická časť.',
      },
      CZ: {
        label: 'Praktická část',
        placeholder: 'Popište obsah praktické nebo analytické části.',
      },
      EN: {
        label: 'Practical part',
        placeholder: 'Describe the practical or analytical part.',
      },
      DE: {
        label: 'Praktischer Teil',
        placeholder:
          'Beschreiben Sie den praktischen oder analytischen Teil.',
      },
      PL: {
        label: 'Część praktyczna',
        placeholder: 'Opisz część praktyczną lub analityczną.',
      },
      HU: {
        label: 'Gyakorlati rész',
        placeholder: 'Írja le a gyakorlati vagy elemző részt.',
      },
    },
    scientificContribution: {
      SK: {
        label: 'Vedecký / odborný prínos',
        placeholder:
          'Čo nové práca prináša do teórie, vedy alebo odbornej praxe?',
      },
      CZ: {
        label: 'Vědecký / odborný přínos',
        placeholder:
          'Co nového práce přináší do teorie, vědy nebo odborné praxe?',
      },
      EN: {
        label: 'Scientific / professional contribution',
        placeholder:
          'What new contribution does the work bring to theory, science or practice?',
      },
      DE: {
        label: 'Wissenschaftlicher / fachlicher Beitrag',
        placeholder: 'Welchen neuen Beitrag leistet die Arbeit?',
      },
      PL: {
        label: 'Wkład naukowy / zawodowy',
        placeholder: 'Jaki nowy wkład wnosi praca?',
      },
      HU: {
        label: 'Tudományos / szakmai hozzájárulás',
        placeholder: 'Milyen új hozzájárulást nyújt a munka?',
      },
    },
    businessProblem: {
      SK: {
        label: 'Firemný / manažérsky problém',
        placeholder:
          'Aký konkrétny problém vo firme, organizácii alebo procese má práca riešiť?',
      },
      CZ: {
        label: 'Firemní / manažerský problém',
        placeholder:
          'Jaký konkrétní problém ve firmě nebo procesu má práce řešit?',
      },
      EN: {
        label: 'Business / management problem',
        placeholder:
          'What specific business, organizational or process problem should be solved?',
      },
      DE: {
        label: 'Unternehmens- / Managementproblem',
        placeholder:
          'Welches konkrete Unternehmens- oder Prozessproblem soll gelöst werden?',
      },
      PL: {
        label: 'Problem biznesowy / menedżerski',
        placeholder:
          'Jaki konkretny problem firmy lub procesu ma zostać rozwiązany?',
      },
      HU: {
        label: 'Üzleti / menedzsment probléma',
        placeholder:
          'Milyen konkrét üzleti vagy szervezeti problémát kell megoldani?',
      },
    },
    businessGoal: {
      SK: {
        label: 'Manažérsky cieľ',
        placeholder:
          'Napr. zníženie nákladov, optimalizácia procesov, zvýšenie výkonu, stratégia rastu.',
      },
      CZ: {
        label: 'Manažerský cíl',
        placeholder:
          'Např. snížení nákladů, optimalizace procesů, zvýšení výkonu.',
      },
      EN: {
        label: 'Management objective',
        placeholder:
          'E.g. cost reduction, process optimization, performance improvement, growth strategy.',
      },
      DE: {
        label: 'Managementziel',
        placeholder:
          'Z. B. Kostensenkung, Prozessoptimierung, Leistungssteigerung.',
      },
      PL: {
        label: 'Cel menedżerski',
        placeholder:
          'Np. redukcja kosztów, optymalizacja procesów, wzrost efektywności.',
      },
      HU: {
        label: 'Menedzsment cél',
        placeholder:
          'Pl. költségcsökkentés, folyamatoptimalizálás, teljesítménynövelés.',
      },
    },
    implementation: {
      SK: {
        label: 'Implementačný plán',
        placeholder: 'Ako sa má navrhnuté riešenie zaviesť do praxe?',
      },
      CZ: {
        label: 'Implementační plán',
        placeholder: 'Jak se má navržené řešení zavést do praxe?',
      },
      EN: {
        label: 'Implementation plan',
        placeholder: 'How should the proposed solution be implemented?',
      },
      DE: {
        label: 'Implementierungsplan',
        placeholder: 'Wie soll die Lösung umgesetzt werden?',
      },
      PL: {
        label: 'Plan wdrożenia',
        placeholder: 'Jak należy wdrożyć proponowane rozwiązanie?',
      },
      HU: {
        label: 'Megvalósítási terv',
        placeholder: 'Hogyan kell bevezetni a javasolt megoldást?',
      },
    },
    caseStudy: {
      SK: {
        label: 'Prípadová štúdia / organizácia',
        placeholder:
          'Uveďte firmu, školu, inštitúciu, odvetvie alebo konkrétny prípad.',
      },
      CZ: {
        label: 'Případová studie / organizace',
        placeholder:
          'Uveďte firmu, školu, instituci, odvětví nebo konkrétní případ.',
      },
      EN: {
        label: 'Case study / organization',
        placeholder:
          'Enter company, school, institution, sector or specific case.',
      },
      DE: {
        label: 'Fallstudie / Organisation',
        placeholder:
          'Geben Sie Unternehmen, Institution, Branche oder Fall ein.',
      },
      PL: {
        label: 'Studium przypadku / organizacja',
        placeholder:
          'Wpisz firmę, instytucję, branżę lub konkretny przypadek.',
      },
      HU: {
        label: 'Esettanulmány / szervezet',
        placeholder:
          'Adja meg a céget, intézményt, ágazatot vagy konkrét esetet.',
      },
    },
    reflection: {
      SK: {
        label: 'Reflexia / hodnotenie',
        placeholder:
          'Popíšte vlastné hodnotenie, skúsenosti, limity a odporúčania.',
      },
      CZ: {
        label: 'Reflexe / hodnocení',
        placeholder:
          'Popište vlastní hodnocení, zkušenosti, limity a doporučení.',
      },
      EN: {
        label: 'Reflection / evaluation',
        placeholder:
          'Describe evaluation, experience, limitations and recommendations.',
      },
      DE: {
        label: 'Reflexion / Bewertung',
        placeholder:
          'Beschreiben Sie Bewertung, Erfahrungen, Grenzen und Empfehlungen.',
      },
      PL: {
        label: 'Refleksja / ocena',
        placeholder:
          'Opisz ocenę, doświadczenia, ograniczenia i rekomendacje.',
      },
      HU: {
        label: 'Reflexió / értékelés',
        placeholder:
          'Írja le az értékelést, tapasztalatokat, korlátokat és ajánlásokat.',
      },
    },
    sourcesRequirement: {
      SK: {
        label: 'Požiadavky na zdroje',
        placeholder:
          'Napr. minimálne 20 odborných zdrojov, vedecké články, normy, zákony, knihy.',
      },
      CZ: {
        label: 'Požadavky na zdroje',
        placeholder:
          'Např. minimálně 20 odborných zdrojů, vědecké články, normy, zákony.',
      },
      EN: {
        label: 'Source requirements',
        placeholder:
          'E.g. at least 20 scholarly sources, articles, standards, laws, books.',
      },
      DE: {
        label: 'Anforderungen an Quellen',
        placeholder:
          'Z. B. mindestens 20 Fachquellen, Artikel, Normen, Gesetze.',
      },
      PL: {
        label: 'Wymagania dotyczące źródeł',
        placeholder:
          'Np. minimum 20 źródeł naukowych, artykuły, normy, ustawy.',
      },
      HU: {
        label: 'Forráskövetelmények',
        placeholder:
          'Pl. legalább 20 szakmai forrás, cikkek, szabványok, törvények.',
      },
    },
  };

  return map[key][lang];
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

// ================= SCHEMA BY WORK TYPE =================

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
          ? 'Esej je argumentačný alebo reflexívny text. Nepoužíva sa rovnaká štruktúra ako pri bakalárskej alebo diplomovej práci.'
          : 'Essay is an argumentative or reflective text. It must not use the same structure as a bachelor or master thesis.',
      recommendedLength: '3 – 8 strán',
      citationOptions: ['APA7', 'MLA9', 'Chicago', 'Harvard'],
      structure:
        lang === 'SK'
          ? [
              'Úvod',
              'Hlavná téza',
              'Argumentácia',
              'Protiargumenty',
              'Vlastný postoj',
              'Záver',
            ]
          : [
              'Introduction',
              'Main thesis',
              'Arguments',
              'Counterarguments',
              'Own position',
              'Conclusion',
            ],
      requiredSections:
        lang === 'SK'
          ? ['Téza', 'Argumenty', 'Vlastný postoj', 'Záver']
          : ['Thesis', 'Arguments', 'Own position', 'Conclusion'],
      fields: [
        makeField('annotation', lang, false, 3),
        makeField('goal', lang, true, 3),
        makeField('reflection', lang, true, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate an essay only. Do not create thesis methodology, hypotheses, research design, supervisor sections or empirical results. Use argumentative structure.',
    };
  }

  if (type === 'seminar') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Seminárna práca má jednoduchšiu akademickú štruktúru. Zameriava sa na spracovanie témy, teóriu, základnú analýzu a zdroje.'
          : 'Seminar paper uses a simpler academic structure focused on theory, basic analysis and sources.',
      recommendedLength: '8 – 20 strán',
      citationOptions: commonCitation,
      structure:
        lang === 'SK'
          ? [
              'Úvod',
              'Teoretická časť',
              'Analytická časť',
              'Diskusia',
              'Záver',
              'Zoznam zdrojov',
            ]
          : [
              'Introduction',
              'Theoretical part',
              'Analytical part',
              'Discussion',
              'Conclusion',
              'References',
            ],
      requiredSections:
        lang === 'SK'
          ? ['Úvod', 'Teoretická časť', 'Analýza', 'Záver', 'Zdroje']
          : ['Introduction', 'Theory', 'Analysis', 'Conclusion', 'References'],
      fields: [
        makeField('annotation', lang, false, 3),
        makeField('goal', lang, true, 3),
        makeField('practicalPart', lang, false, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate a seminar paper. Use a simpler academic structure, theory, basic analysis and conclusion. Do not overcomplicate it as a dissertation.',
    };
  }

  if (type === 'bachelor') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Bakalárska práca musí mať jasný cieľ, teoretickú časť, metodiku a praktickú alebo analytickú časť.'
          : 'Bachelor thesis requires objective, theory, methodology and practical or analytical part.',
      recommendedLength: '30 – 45 strán',
      citationOptions: commonCitation,
      structure:
        lang === 'SK'
          ? [
              'Abstrakt',
              'Úvod',
              'Teoretické východiská',
              'Cieľ práce',
              'Metodika',
              'Praktická / analytická časť',
              'Diskusia',
              'Záver',
              'Zoznam literatúry',
              'Prílohy',
            ]
          : [
              'Abstract',
              'Introduction',
              'Theoretical background',
              'Objective',
              'Methodology',
              'Practical / analytical part',
              'Discussion',
              'Conclusion',
              'References',
              'Appendices',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Abstrakt',
              'Úvod',
              'Cieľ',
              'Metodika',
              'Praktická časť',
              'Záver',
              'Zdroje',
            ]
          : [
              'Abstract',
              'Introduction',
              'Objective',
              'Methodology',
              'Practical part',
              'Conclusion',
              'References',
            ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 4),
        makeField('goal', lang, true, 3),
        makeField('methodology', lang, true, 4),
        makeField('practicalPart', lang, true, 4),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate a bachelor thesis. Include theoretical background, objective, methodology, practical or analytical part, discussion and conclusion.',
    };
  }

  if (type === 'master' || type === 'msc') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Diplomová alebo MSc. práca musí obsahovať hlbšiu analýzu, metodológiu, výskumné otázky alebo hypotézy, výsledky a diskusiu.'
          : 'Master or MSc thesis requires deeper analysis, methodology, research questions or hypotheses, results and discussion.',
      recommendedLength: '50 – 80 strán',
      citationOptions: commonCitation,
      structure:
        lang === 'SK'
          ? [
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
            ]
          : [
              'Abstract',
              'Introduction',
              'State of the art',
              'Objectives',
              'Research questions / hypotheses',
              'Methodology',
              'Results',
              'Discussion',
              'Solution proposal',
              'Conclusion',
              'References',
              'Appendices',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Abstrakt',
              'Úvod',
              'Ciele',
              'Výskumné otázky / hypotézy',
              'Metodológia',
              'Výsledky',
              'Diskusia',
              'Záver',
            ]
          : [
              'Abstract',
              'Introduction',
              'Objectives',
              'Research questions / hypotheses',
              'Methodology',
              'Results',
              'Discussion',
              'Conclusion',
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
        'Generate a master/MSc thesis. Include deeper academic analysis, methodology, research questions or hypotheses, results, discussion and solution proposal.',
    };
  }

  if (type === 'dissertation') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Dizertačná práca vyžaduje originálny vedecký prínos, výskumný dizajn, hypotézy, metodológiu, výsledky a publikovateľné závery.'
          : 'Dissertation requires original scientific contribution, research design, hypotheses, methodology, results and publishable conclusions.',
      recommendedLength: '100 – 180 strán',
      citationOptions: ['APA7', 'ISO690', 'STN_ISO_690', 'Chicago'],
      structure:
        lang === 'SK'
          ? [
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
            ]
          : [
              'Abstract',
              'Introduction',
              'Theoretical framework',
              'State of knowledge',
              'Research problem',
              'Objectives, questions and hypotheses',
              'Research methodology',
              'Research results',
              'Discussion',
              'Original scientific contribution',
              'Research limitations',
              'Conclusion',
              'Author publications',
              'References',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Výskumný problém',
              'Hypotézy',
              'Metodológia',
              'Výsledky',
              'Diskusia',
              'Vedecký prínos',
            ]
          : [
              'Research problem',
              'Hypotheses',
              'Methodology',
              'Results',
              'Discussion',
              'Scientific contribution',
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
        'Generate a doctoral dissertation. Require original scientific contribution, research design, hypotheses, methodology, results, discussion and limitations.',
    };
  }

  if (type === 'habilitation' || type === 'rigorous') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Rigorózna alebo habilitačná práca musí preukázať vysokú odbornú úroveň, samostatný vedecký prístup a jasný prínos.'
          : 'Rigorous or habilitation thesis must demonstrate advanced expertise, independent scientific approach and clear contribution.',
      recommendedLength:
        type === 'habilitation' ? '120 – 250 strán' : '70 – 120 strán',
      citationOptions: ['APA7', 'ISO690', 'STN_ISO_690', 'Chicago'],
      structure:
        lang === 'SK'
          ? [
              'Abstrakt',
              'Úvod',
              'Teoretický rámec',
              'Analýza súčasného stavu',
              'Výskumný problém',
              'Metodológia',
              'Výsledky',
              'Diskusia',
              'Odborný / vedecký prínos',
              'Záver',
              'Literatúra',
            ]
          : [
              'Abstract',
              'Introduction',
              'Theoretical framework',
              'State-of-the-art analysis',
              'Research problem',
              'Methodology',
              'Results',
              'Discussion',
              'Professional / scientific contribution',
              'Conclusion',
              'References',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Teoretický rámec',
              'Výskumný problém',
              'Metodológia',
              'Výsledky',
              'Prínos',
            ]
          : [
              'Theoretical framework',
              'Research problem',
              'Methodology',
              'Results',
              'Contribution',
            ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 5),
        makeField('goal', lang, true, 4),
        makeField('methodology', lang, true, 5),
        makeField('scientificContribution', lang, true, 5),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate an advanced academic thesis. Emphasize theoretical framework, methodology, results, discussion and scientific/professional contribution.',
    };
  }

  if (type === 'mba') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'MBA práca má praktický manažérsky charakter. Rieši problém firmy, procesov, stratégie alebo riadenia.'
          : 'MBA thesis is practical and managerial. It solves a business, process, strategy or management problem.',
      recommendedLength: '35 – 60 strán',
      citationOptions: ['APA7', 'Harvard', 'Chicago'],
      structure:
        lang === 'SK'
          ? [
              'Manažérske zhrnutie',
              'Opis organizácie',
              'Definícia firemného problému',
              'Analýza súčasného stavu',
              'Strategické možnosti',
              'Návrh riešenia',
              'Implementačný plán',
              'Finančné a rizikové vyhodnotenie',
              'Záver',
            ]
          : [
              'Executive summary',
              'Organization description',
              'Business problem definition',
              'Current-state analysis',
              'Strategic options',
              'Solution proposal',
              'Implementation plan',
              'Financial and risk evaluation',
              'Conclusion',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Manažérske zhrnutie',
              'Firemný problém',
              'Analýza',
              'Návrh riešenia',
              'Implementácia',
            ]
          : [
              'Executive summary',
              'Business problem',
              'Analysis',
              'Solution proposal',
              'Implementation',
            ],
      fields: [
        makeField('caseStudy', lang, true, 3),
        makeField('businessProblem', lang, true, 4),
        makeField('businessGoal', lang, true, 4),
        makeField('methodology', lang, false, 4),
        makeField('implementation', lang, true, 5),
        makeField('sourcesRequirement', lang, false, 3),
      ],
      aiInstruction:
        'Generate an MBA thesis. Do not use classical dissertation structure. Focus on business problem, current-state analysis, strategy, solution proposal and implementation.',
    };
  }

  if (type === 'dba') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'DBA práca kombinuje aplikovaný výskum, strategický manažment a originálny prínos pre prax.'
          : 'DBA thesis combines applied research, strategic management and original contribution to practice.',
      recommendedLength: '80 – 150 strán',
      citationOptions: ['APA7', 'Harvard', 'Chicago'],
      structure:
        lang === 'SK'
          ? [
              'Executive summary',
              'Výskumný a manažérsky problém',
              'Teoretický rámec',
              'Aplikovaná metodológia',
              'Empirická časť',
              'Strategické vyhodnotenie',
              'Originálny prínos pre prax',
              'Implementácia',
              'Záver',
            ]
          : [
              'Executive summary',
              'Research and management problem',
              'Theoretical framework',
              'Applied methodology',
              'Empirical part',
              'Strategic evaluation',
              'Original contribution to practice',
              'Implementation',
              'Conclusion',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Výskumný problém',
              'Aplikovaná metodológia',
              'Empirické výsledky',
              'Prínos pre prax',
            ]
          : [
              'Research problem',
              'Applied methodology',
              'Empirical results',
              'Contribution to practice',
            ],
      fields: [
        makeField('caseStudy', lang, true, 3),
        makeField('businessProblem', lang, true, 4),
        makeField('problem', lang, true, 4),
        makeField('researchQuestions', lang, true, 4),
        makeField('methodology', lang, true, 6),
        makeField('scientificContribution', lang, true, 5),
        makeField('implementation', lang, true, 5),
      ],
      aiInstruction:
        'Generate a DBA thesis. Combine applied research, business strategy, empirical analysis and original contribution to managerial practice.',
    };
  }

  if (type === 'attestation') {
    return {
      typeKey: type,
      label,
      description:
        lang === 'SK'
          ? 'Atestačná práca sa zameriava na odbornú prax, pedagogické alebo profesijné kompetencie, metodické riešenie a reflexiu.'
          : 'Attestation thesis focuses on professional practice, competencies, methodology and reflection.',
      recommendedLength: '25 – 50 strán',
      citationOptions: commonCitation,
      structure:
        lang === 'SK'
          ? [
              'Úvod',
              'Profesijný kontext',
              'Teoretické východiská',
              'Opis problému z praxe',
              'Metodické riešenie',
              'Realizácia',
              'Reflexia a hodnotenie',
              'Záver',
            ]
          : [
              'Introduction',
              'Professional context',
              'Theoretical background',
              'Practice-based problem',
              'Methodological solution',
              'Implementation',
              'Reflection and evaluation',
              'Conclusion',
            ],
      requiredSections:
        lang === 'SK'
          ? [
              'Profesijný problém',
              'Metodické riešenie',
              'Realizácia',
              'Reflexia',
            ]
          : [
              'Professional problem',
              'Methodological solution',
              'Implementation',
              'Reflection',
            ],
      fields: [
        makeField('annotation', lang, true, 3),
        makeField('problem', lang, true, 4),
        makeField('methodology', lang, true, 4),
        makeField('practicalPart', lang, true, 4),
        makeField('reflection', lang, true, 4),
      ],
      aiInstruction:
        'Generate an attestation thesis. Focus on professional practice, methodology, implementation, reflection and evaluation.',
    };
  }

  return {
    typeKey: type,
    label,
    description:
      lang === 'SK'
        ? 'Tento typ práce má stredne náročnú odbornú štruktúru s dôrazom na zrozumiteľnosť, tému, cieľ, praktickú časť a záver.'
        : 'This type of work uses a medium-level professional structure focused on clarity, topic, objective, practical part and conclusion.',
    recommendedLength: '15 – 35 strán',
    citationOptions: commonCitation,
    structure:
      lang === 'SK'
        ? [
            'Úvod',
            'Teoretická časť',
            'Praktická časť',
            'Vyhodnotenie',
            'Záver',
            'Zdroje',
          ]
        : [
            'Introduction',
            'Theoretical part',
            'Practical part',
            'Evaluation',
            'Conclusion',
            'References',
          ],
    requiredSections:
      lang === 'SK'
        ? ['Úvod', 'Teória', 'Praktická časť', 'Záver']
        : ['Introduction', 'Theory', 'Practical part', 'Conclusion'],
    fields: [
      makeField('annotation', lang, false, 3),
      makeField('goal', lang, true, 3),
      makeField('methodology', lang, false, 4),
      makeField('practicalPart', lang, true, 4),
      makeField('sourcesRequirement', lang, false, 3),
    ],
    aiInstruction:
      'Generate a medium-level academic/professional work. Use clear structure, theory, practical part, evaluation and conclusion.',
  };
}

// ================= INITIAL STATE =================

const initialProfile: Profile = {
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

// ================= COMPONENT =================

export default function ProfileForm({ onClose, onSave }: ProfileFormProps) {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isSaving, setIsSaving] = useState(false);

  const labels = UI[profile.language];

  const schema = useMemo(
    () => getSchema(profile.type, profile.language),
    [profile.type, profile.language]
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
    return {
      ...profile,
      id: Date.now().toString(),
      schema,
      interfaceLanguage: profile.language,
      workLanguage: profile.workLanguage,
      savedAt: new Date().toISOString(),
    };
  };

  const savePayloadToStorage = (payload: SavedProfile) => {
    localStorage.setItem('profile', JSON.stringify(payload));
    localStorage.setItem('active_profile', JSON.stringify(payload));

    const oldProfilesRaw = localStorage.getItem('profiles_full');
    const oldProfiles = oldProfilesRaw ? JSON.parse(oldProfilesRaw) : [];
    const profiles = Array.isArray(oldProfiles) ? oldProfiles : [];

    const newProfiles = [
      payload,
      ...profiles.filter((item: SavedProfile) => item.id !== payload.id),
    ];

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
    const profileId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();

    const payload: SavedProfile = {
      ...profile,
      id: profileId,
      schema,
      interfaceLanguage: profile.language,
      workLanguage: profile.workLanguage,
      savedAt: new Date().toISOString(),
    };

    // 1. Uloženie lokálne do prehliadača
    savePayloadToStorage(payload);

const supabase = createClient();

    // 2. Uloženie do Supabase
    const { error } = await supabase.from('zedpera_profiles').insert({
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
      created_at: payload.savedAt,
      updated_at: payload.savedAt,
    });

    if (error) {
      console.error('SUPABASE PROFILE SAVE ERROR:', error);

      alert(
        profile.language === 'SK'
          ? `Profil sa uložil lokálne, ale nie do Supabase: ${error.message}`
          : `Profile was saved locally, but not to Supabase: ${error.message}`
      );

      return;
    }

    onSave?.(payload);
    onClose?.();

    alert(profile.language === 'SK' ? 'Profil bol uložený.' : 'Profile saved.');

    router.push('/projects');
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
          {/* HEADER */}
          <header className="border-b border-white/10 bg-[#050816] px-6 py-7 md:px-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-200">
                  <Sparkles className="h-4 w-4" />
                  ZEDPERA AI
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  {labels.pageTitle}
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
            {/* LEFT */}
            <div className="space-y-9">
              {/* TYPE */}
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

              {/* LEVEL */}
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

              {/* INTERFACE LANGUAGE */}
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

              {/* WORK LANGUAGE */}
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

              {/* BASIC */}
              <Section
                title={labels.basic}
                icon={<FileText className="h-5 w-5" />}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    value={profile.title}
                    placeholder={labels.titlePlaceholder}
                    onChange={(value) => update('title', value)}
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

              {/* ACADEMIC SETTINGS */}
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

                <div className="mt-6 grid gap-5">
                  {schema.fields.map((field) => (
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

              {/* KEYWORDS */}
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

              {/* CTA */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
  onClick={saveProfile}
  disabled={isSaving}
  type="button"
  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-base font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
>
  <Save className="h-5 w-5" />
  {isSaving ? 'Ukladám...' : labels.save}
</button>
              </div>
            </div>

            {/* RIGHT PREVIEW */}
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
                    <InfoBox
                      label={labels.language}
                      value={profile.language}
                    />

                    <InfoBox
                      label={labels.workLanguage}
                      value={profile.workLanguage}
                    />

                    <InfoBox
                      label={labels.citation}
                      value={profile.citation}
                    />

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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111525] p-4">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-sm font-black text-white">
        {value || '—'}
      </p>
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