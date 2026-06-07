'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import {
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Languages,
  Mail,
  Menu,
  Mic,
  Paintbrush,
  Paperclip,
  Presentation,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import AnalysisResultsModal from '@/components/analysis/AnalysisResultsModal';
import type { AnalysisResult } from '@/components/analysis/analysisTypes';
import { useLanguage } from '@/components/LanguageProvider';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import ImprovementBox from '@/components/ImprovementBox';
import MobileDashboardNavigation from '@/components/dashboard/MobileDashboardNavigation';
import { useRouter } from 'next/navigation';


// ================= TYPES =================

type ModuleKey =
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'humanizer';

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';
type LanguageCode = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

type TranslationStyle =
  | 'academic'
  | 'formal'
  | 'natural'
  | 'simple';

type EmailType =
  | 'supervisor'
  | 'teacher'
  | 'consultation'
  | 'deadline'
  | 'request'
  | 'apology'
  | 'business'
  | 'other';

type EmailTone =
  | 'professional'
  | 'formal'
  | 'friendly'
  | 'polite'
  | 'urgent'
  | 'short';

type SelectOption<T extends string = string> = {
  value: T;
  labelKey: string;
};

type ClickableChoice<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type DashboardSelectorTranslations = {
  translationFrom: string;
  translationTo: string;
  translationStyle: string;
  emailType: string;
  emailTone: string;

  languages: {
    slovak: string;
    czech: string;
    english: string;
    german: string;
    polish: string;
    hungarian: string;
  };

  translationStyles: {
    academic: string;
    formal: string;
    natural: string;
    simple: string;
  };

  emailTypes: {
    supervisor: string;
    teacher: string;
    consultation: string;
    deadline: string;
    request: string;
    apology: string;
    business: string;
    other: string;
  };

  emailTones: {
    professional: string;
    formal: string;
    friendly: string;
    polite: string;
    urgent: string;
    short: string;
  };
};

function getDashboardSelectorTranslations(t: any): DashboardSelectorTranslations {
  const fallback: DashboardSelectorTranslations = {
    translationFrom: 'Preložiť z jazyka',
    translationTo: 'Preložiť do jazyka',
    translationStyle: 'Štýl prekladu',
    emailType: 'Typ emailu',
    emailTone: 'Tón emailu',

    languages: {
      slovak: 'Slovenčina',
      czech: 'Čeština',
      english: 'Angličtina',
      german: 'Nemčina',
      polish: 'Poľština',
      hungarian: 'Maďarčina',
    },

    translationStyles: {
      academic: 'Akademický',
      formal: 'Formálny',
      natural: 'Prirodzený',
      simple: 'Jednoduchý',
    },

    emailTypes: {
      supervisor: 'Email vedúcemu práce',
      teacher: 'Email vyučujúcemu',
      consultation: 'Žiadosť o konzultáciu',
      deadline: 'Termín / odovzdanie',
      request: 'Žiadosť',
      apology: 'Ospravedlnenie',
      business: 'Obchodný email',
      other: 'Iný email',
    },

    emailTones: {
      professional: 'Profesionálny',
      formal: 'Formálny',
      friendly: 'Priateľský',
      polite: 'Zdvorilý',
      urgent: 'Urgentný',
      short: 'Krátky a vecný',
    },
  };

  return {
    ...fallback,
    ...(t?.dashboardTools?.selectors || {}),

    languages: {
      ...fallback.languages,
      ...(t?.dashboardTools?.selectors?.languages || {}),
    },

    translationStyles: {
      ...fallback.translationStyles,
      ...(t?.dashboardTools?.selectors?.translationStyles || {}),
    },

    emailTypes: {
      ...fallback.emailTypes,
      ...(t?.dashboardTools?.selectors?.emailTypes || {}),
    },

    emailTones: {
      ...fallback.emailTones,
      ...(t?.dashboardTools?.selectors?.emailTones || {}),
    },
  };
}

function createLanguageSelectOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<LanguageCode>> {
  return [
    {
      value: 'sk',
      label: selectorTranslations.languages.slovak,
      description: 'Slovak',
    },
    {
      value: 'cs',
      label: selectorTranslations.languages.czech,
      description: 'Czech',
    },
    {
      value: 'en',
      label: selectorTranslations.languages.english,
      description: 'English',
    },
    {
      value: 'de',
      label: selectorTranslations.languages.german,
      description: 'German',
    },
    {
      value: 'pl',
      label: selectorTranslations.languages.polish,
      description: 'Polish',
    },
    {
      value: 'hu',
      label: selectorTranslations.languages.hungarian,
      description: 'Hungarian',
    },
  ];
}

function createTranslationStyleOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<TranslationStyle>> {
  return [
    {
      value: 'academic',
      label: selectorTranslations.translationStyles.academic,
      description: 'Odborný štýl pre akademické práce',
    },
    {
      value: 'formal',
      label: selectorTranslations.translationStyles.formal,
      description: 'Oficiálny a profesionálny štýl',
    },
    {
      value: 'natural',
      label: selectorTranslations.translationStyles.natural,
      description: 'Plynulý a prirodzený jazyk',
    },
    {
      value: 'simple',
      label: selectorTranslations.translationStyles.simple,
      description: 'Jednoduchý a zrozumiteľný text',
    },
  ];
}

function createEmailTypeOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<EmailType>> {
  return [
    {
      value: 'supervisor',
      label: selectorTranslations.emailTypes.supervisor,
      description: 'Správa pre školiteľa alebo konzultanta',
    },
    {
      value: 'teacher',
      label: selectorTranslations.emailTypes.teacher,
      description: 'Formálna správa pre pedagóga',
    },
    {
      value: 'consultation',
      label: selectorTranslations.emailTypes.consultation,
      description: 'Dohodnutie termínu konzultácie',
    },
    {
      value: 'deadline',
      label: selectorTranslations.emailTypes.deadline,
      description: 'Komunikácia k termínu práce',
    },
    {
      value: 'request',
      label: selectorTranslations.emailTypes.request,
      description: 'Formálna alebo administratívna žiadosť',
    },
    {
      value: 'apology',
      label: selectorTranslations.emailTypes.apology,
      description: 'Slušné a profesionálne ospravedlnenie',
    },
    {
      value: 'business',
      label: selectorTranslations.emailTypes.business,
      description: 'Profesionálna obchodná komunikácia',
    },
    {
      value: 'other',
      label: selectorTranslations.emailTypes.other,
      description: 'Vlastný typ emailovej správy',
    },
  ];
}

function createEmailToneOptions(
  selectorTranslations: DashboardSelectorTranslations,
): Array<ClickableChoice<EmailTone>> {
  return [
    {
      value: 'professional',
      label: selectorTranslations.emailTones.professional,
      description: 'Vecný a reprezentatívny tón',
    },
    {
      value: 'formal',
      label: selectorTranslations.emailTones.formal,
      description: 'Úradný a presný tón komunikácie',
    },
    {
      value: 'friendly',
      label: selectorTranslations.emailTones.friendly,
      description: 'Milý, ale stále slušný prejav',
    },
    {
      value: 'polite',
      label: selectorTranslations.emailTones.polite,
      description: 'Rešpektujúci a kultivovaný tón',
    },
    {
      value: 'urgent',
      label: selectorTranslations.emailTones.urgent,
      description: 'Dôrazný email s jasnou prioritou',
    },
    {
      value: 'short',
      label: selectorTranslations.emailTones.short,
      description: 'Stručná správa bez zbytočností',
    },
  ];
}

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt?: string;
  text?: string;
  content?: string;
  file?: File;
};

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;

  // odbornosť výstupu: akademická, vysoko odborná, štandardná...
  expertise?: string;
  workExpertise?: string;
  specializationLevel?: string;

  supervisor?: string;
  citation?: string;
  language?: string;

  // jazyk rozhrania
  interfaceLanguage?: string;

  // jazyk práce / jazyk výstupu
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
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
};

type SlideContent = {
  title: string;
  body: string[];
};

type ApiAnalysisResponse = Partial<AnalysisResult> & {
  ok?: boolean;
  error?: string;
  message?: string;
  frequencyTables?: unknown[];
  files?: unknown[];
  extractedFiles?: unknown[];
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

// ================= CONFIG =================

const defaultAgent: Agent = 'gemini';

const ORIGINALITY_PROTOCOL_STORAGE_KEY =
  'zedpera_originality_protocol_result';

const allowedFileExtensions = [
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

const allowedFileAccept = allowedFileExtensions.join(',');

const maxFilesCount = 12;
const maxFileSizeMb = 30;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const moduleInfos: {
  key: ModuleKey;
  translationKey:
    | 'aiSupervisor'
    | 'qualityAudit'
    | 'defense'
    | 'translation'
    | 'dataAnalysis'
    | 'planning'
    | 'emails'
    | 'originalityCheck'
    | 'textHumanization';
  infoClassName: string;
}[] = [
  {
    key: 'supervisor',
    translationKey: 'aiSupervisor',
    infoClassName:
      'mb-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100',
  },
  {
    key: 'quality',
    translationKey: 'qualityAudit',
    infoClassName:
      'mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100',
  },
  {
    key: 'defense',
    translationKey: 'defense',
    infoClassName:
      'mb-4 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm text-purple-100',
  },
  {
    key: 'translation',
    translationKey: 'translation',
    infoClassName:
      'mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100',
  },
  {
    key: 'data',
    translationKey: 'dataAnalysis',
    infoClassName:
      'mb-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100',
  },
  {
    key: 'planning',
    translationKey: 'planning',
    infoClassName:
      'mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100',
  },
  {
    key: 'emails',
    translationKey: 'emails',
    infoClassName:
      'mb-4 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm text-pink-100',
  },

  // {
//   key: 'originality',
//   translationKey: 'originalityCheck',
//   infoClassName:
//     'mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100',
// },

  {
    key: 'humanizer',
    translationKey: 'textHumanization',
    infoClassName:
      'mb-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-sm text-fuchsia-100',
  },
];

// ================= HELPERS =================

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function isAllowedUploadFile(file: File) {
  return allowedFileExtensions.includes(getFileExtension(file.name));
}

function createFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

type SystemLanguage = 'sk' | 'cs' | 'en' | 'de' | 'pl' | 'hu';

function isValidSystemLanguage(value: unknown): value is SystemLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function getStoredSystemLanguage(): SystemLanguage {
  if (typeof window === 'undefined') return 'sk';

  const stored =
    localStorage.getItem('zedpera_language') ||
    localStorage.getItem('zedpera_system_language') ||
    'sk';

  return isValidSystemLanguage(stored) ? stored : 'sk';
}

function withSystemLanguageProfile(
  profile: SavedProfile | null,
  systemLanguage: SystemLanguage,
): SavedProfile | null {
  if (!profile) {
    return {
      language: systemLanguage,
      interfaceLanguage: systemLanguage,
      workLanguage: systemLanguage,
    };
  }

  return {
    ...profile,

    // language necháme podľa profilu, ak existuje
    language: profile.language || systemLanguage,

    // interfaceLanguage je jazyk rozhrania
    interfaceLanguage: systemLanguage,

    // workLanguage NESMIE prepísať jazyk rozhrania
    workLanguage:
      profile.workLanguage ||
      profile.language ||
      systemLanguage,
  };
}

function prepareProfileForApi(
  profile: SavedProfile | null,
  systemLanguage: SystemLanguage,
): SavedProfile | null {
  if (!profile) return null;

  return {
    ...profile,
    language: profile.language || systemLanguage,
    interfaceLanguage: systemLanguage,
    workLanguage:
      profile.workLanguage ||
      profile.language ||
      systemLanguage,
  };
}

function persistSystemLanguage(systemLanguage: SystemLanguage) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('zedpera_language', systemLanguage);
  localStorage.setItem('zedpera_system_language', systemLanguage);
  

  document.documentElement.lang = systemLanguage;
  document.documentElement.setAttribute('data-language', systemLanguage);
  document.documentElement.setAttribute('data-system-language', systemLanguage);
  document.documentElement.setAttribute('data-work-language', systemLanguage);
}

function normalizeProfile(raw: any): SavedProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.profile && typeof raw.profile === 'object') {
    return {
  ...raw.profile,
  schema: raw.schema || raw.profile.schema,
  language: raw.language || raw.profile.language,
  interfaceLanguage: raw.interfaceLanguage || raw.profile.interfaceLanguage,
  workLanguage: raw.workLanguage || raw.profile.workLanguage,
  savedAt: raw.savedAt || raw.generatedAt || raw.profile.savedAt,
};
  }

  return raw as SavedProfile;
}

function fixEncodingArtifacts(text: string) {
  return String(text || '')
    .replace(/\uFFFD/g, '')
    .replace(/Â/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Ã´/g, 'ô')
    .replace(/Ã„/g, 'Ä')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Á')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Äº/g, 'ĺ')
    .replace(/Å¡/g, 'š')
    .replace(/Å /g, 'Š')
    .replace(/Å¾/g, 'ž')
    .replace(/Å½/g, 'Ž')
    .replace(/Å¥/g, 'ť')
    .replace(/Å¤/g, 'Ť')
    .replace(/Åˆ/g, 'ň')
    .replace(/Å‡/g, 'Ň')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å”/g, 'Ŕ')
    .replace(/Å/g, '')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '...')
    .replace(/â€˘/g, '•')
    .replace(/ðŸ“„/g, '')
    .replace(/ðŸ“Š/g, '')
    .replace(/ðŸ“š/g, '')
    .replace(/ðŸ¤–/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function removeBadGeneratedPrefix(text: string) {
  return String(text || '')
    .replace(/^\s*AI\s+vedúci\s+práce\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s+vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s+veduci\s+prace\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s+veduci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Ako\s+AI\s+vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Ako\s+AI\s+veduci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Výstup\s+nebude\s+začínať\s+textom\s+AI\s*Vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Toto\s+je\s+systémová\s+informácia\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Systémová\s+inštrukcia\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Interná\s+poznámka\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Výstup\s*[-–—:]*\s*/i, '')
    .replace(
      /^\s*Prezentácia\s*[-–—:]*\s*(?=Názov práce|Cieľ práce|Úvod|Slide|Snímka)/i,
      '',
    );

}

function cleanAiOutput(text: string) {
  return fixEncodingArtifacts(String(text || ''))
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanFinalOutput(text: string) {
  return removeBadGeneratedPrefix(cleanAiOutput(text))
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function stripModuleExtraSections(text: string, moduleKey: ModuleKey) {
  let cleaned = cleanFinalOutput(text);

  const moduleName = String(moduleKey);

  // Spoločné čistenie pre všetky moduly
  cleaned = cleaned
    .replace(/\n*\s*Interná poznámka\s*:?[\s\S]*$/i, '')
    .replace(/\n*\s*Systémová inštrukcia\s*:?[\s\S]*$/i, '')
    .replace(/\n*\s*Toto je systémová informácia\s*:?[\s\S]*$/i, '')
    .replace(/\bprimárny zdroj\b/gi, '')
    .replace(/\bsekundárny zdroj\b/gi, '')
    .replace(/\binterný zdroj\b/gi, '')
    .replace(/\banalyzovaný zdroj\b/gi, '')
    .replace(/\bpodľa nahratého súboru\b/gi, '')
    .replace(/\bpodľa prílohy\b/gi, '')
    .replace(/\bpoužívateľ nahral súbor\b/gi, '')
    .replace(/\bdokument obsahuje\b/gi, '')
    .replace(/\bprompt\b/gi, '')
    .replace(/\bmodel\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // AI vedúci, Audit kvality, Obhajoba
  if (['supervisor', 'quality', 'audit', 'defense'].includes(moduleName)) {
    cleaned = cleaned
      .replace(/^\s*AI\s+vedúci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*AI\s+veduci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Ako\s+AI\s+vedúci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Ako\s+AI\s+veduci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Výstup\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Výsledok\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Tu je výstup\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Tu je výsledok\s*[-–—:]*\s*/i, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned;
  }

  // Preklad
  if (moduleName === 'translation') {
    cleaned = cleaned
      .replace(/\n*\s*={2,}\s*ANAL[ÝY]ZA\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*={2,}\s*SK[ÓO]RE\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*={2,}\s*ODPOR[ÚU]ČANIE\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*ANAL[ÝY]ZA\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*SK[ÓO]RE\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*ODPOR[ÚU]ČANIE\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*Koment[áa]r\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*Vysvetlenie\s*:?[\s\S]*$/i, '')
      .replace(/^\s*Preložený text\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Preklad\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Tu je preklad\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Výsledok prekladu\s*[:\-–—]*\s*/i, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned;
  }

  // Emailový modul
  if (moduleName === 'emails') {
    cleaned = cleaned
      .replace(/\n*\s*={2,}\s*ANAL[ÝY]ZA\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*={2,}\s*SK[ÓO]RE\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*={2,}\s*ODPOR[ÚU]ČANIE\s*={2,}[\s\S]*$/i, '')
      .replace(/\n*\s*ANAL[ÝY]ZA\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*SK[ÓO]RE\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*ODPOR[ÚU]ČANIE\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*Koment[áa]r\s*:?[\s\S]*$/i, '')
      .replace(/\n*\s*Vysvetlenie\s*:?[\s\S]*$/i, '')
      .replace(/^\s*Vytvorený email\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Email\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Tu je profesionálny email\s*[:\-–—]*\s*/i, '')
      .replace(/^\s*Tu je návrh emailu\s*[:\-–—]*\s*/i, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const subjectIndex = cleaned.search(/(^|\n)\s*Predmet\s*:/i);

    if (subjectIndex > 0) {
      cleaned = cleaned.slice(subjectIndex).trim();
    }

    return cleaned;
  }

  return cleaned;
}

function sanitizeFileName(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'zedpera-vystup'
  );
}

function htmlEscape(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createDocHtml(title: string, text: string) {
  const paragraphs = cleanFinalOutput(text)
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p>&nbsp;</p>';
      return `<p>${htmlEscape(line)}</p>`;
    })
    .join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      padding: 40px;
    }
    h1 {
      font-size: 20pt;
      margin-bottom: 24px;
    }
    p {
      margin: 0 0 11px 0;
    }
  </style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  ${paragraphs}
</body>
</html>
`;
}

function splitTextToSlides(text: string): SlideContent[] {
  const cleaned = cleanFinalOutput(text);

  if (!cleaned.trim()) return [];

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const slides: SlideContent[] = [];
  let currentTitle = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const isSlideTitle =
      /^snímka\s*\d+/i.test(line) ||
      /^slide\s*\d+/i.test(line) ||
      /^časť\s+[a-z]/i.test(line) ||
      /^[0-9]+\.\s+/.test(line);

    if (isSlideTitle) {
      if (currentTitle || currentBody.length) {
        slides.push({
          title: currentTitle || 'Snímka',
          body: currentBody,
        });
      }

      currentTitle = line;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentTitle || currentBody.length) {
    slides.push({
      title: currentTitle || 'Prezentácia',
      body: currentBody,
    });
  }

  if (slides.length === 0) {
    return [
      {
        title: 'Prezentácia',
        body: lines,
      },
    ];
  }

  return slides;
}

function splitLongTextLine(line: string, maxLength = 180) {
  const value = String(line || '').trim();

  if (value.length <= maxLength) return [value];

  const parts: string[] = [];
  let rest = value;

  while (rest.length > maxLength) {
    let cutIndex = rest.lastIndexOf(' ', maxLength);

    if (cutIndex < 80) {
      cutIndex = maxLength;
    }

    parts.push(rest.slice(0, cutIndex).trim());
    rest = rest.slice(cutIndex).trim();
  }

  if (rest) {
    parts.push(rest);
  }

  return parts;
}

function expandSlideBody(body: string[]) {
  const expanded: string[] = [];

  body.forEach((line) => {
    splitLongTextLine(line, 180).forEach((part) => {
      if (part.trim()) expanded.push(part.trim());
    });
  });

  return expanded;
}

function paginateSlideBody(body: string[], maxItemsPerSlide = 6) {
  const expanded = expandSlideBody(body);
  const pages: string[][] = [];

  for (let index = 0; index < expanded.length; index += maxItemsPerSlide) {
    pages.push(expanded.slice(index, index + maxItemsPerSlide));
  }

  return pages.length ? pages : [[]];
}

function downloadBlob({
  content,
  fileName,
  mimeType,
}: {
  content: BlobPart;
  fileName: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getWorkType(profile: SavedProfile | null) {
  return profile?.type || profile?.schema?.label || 'Neuvedené';
}


function getExpertise(profile: SavedProfile | null) {
  return (
    profile?.expertise ||
    profile?.workExpertise ||
    profile?.specializationLevel ||
    'Neuvedené'
  );
}
function getCitationStyle(profile: SavedProfile | null) {
  return profile?.citation || 'ISO 690';
}

function getWorkLanguage(profile: SavedProfile | null) {
  return (
    profile?.workLanguage ||
    profile?.language ||
    getStoredSystemLanguage()
  );
}

function buildProfileBlock(profile: SavedProfile | null) {
  if (!profile) {
    return 'Profil práce nebol vybraný.';
  }

  const keywords =
    profile.keywordsList && profile.keywordsList.length > 0
      ? profile.keywordsList
      : profile.keywords || [];

  return `
Názov práce: ${profile.title || 'Neuvedené'}
Téma práce: ${profile.topic || 'Neuvedené'}
Typ práce: ${getWorkType(profile)}
Odbornosť výstupu: ${getExpertise(profile)}
Odbor: ${profile.field || 'Neuvedené'}
Vedúci práce: ${profile.supervisor || 'Neuvedené'}
Citačná norma: ${getCitationStyle(profile)}
Jazyk práce: ${getWorkLanguage(profile)}
Cieľ práce: ${profile.goal || 'Neuvedené'}
Výskumný problém: ${profile.problem || 'Neuvedené'}
Metodológia: ${profile.methodology || 'Neuvedené'}
Výskumné otázky: ${profile.researchQuestions || 'Neuvedené'}
Hypotézy: ${profile.hypotheses || 'Neuvedené'}
Praktická časť: ${profile.practicalPart || 'Neuvedené'}
Vedecký prínos: ${profile.scientificContribution || 'Neuvedené'}
Požiadavky na zdroje: ${profile.sourcesRequirement || 'Neuvedené'}
Kľúčové slová: ${keywords.length ? keywords.join(', ') : 'Neuvedené'}
`.trim();
}

function buildAttachmentBlock(files: AttachedFile[]) {
  if (!files.length) {
    return 'Používateľ nepriložil žiadne súbory.';
  }

  return files
    .map((file, index) => {
      return `${index + 1}. ${file.name} (${file.type || 'neznámy typ'}, ${formatBytes(
        file.size,
      )})`;
    })
    .join('\n');
}

async function readApiErrorResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await res.json();

      return String(
        data?.message ||
          data?.error ||
          data?.detail ||
          data?.details ||
          `API error ${res.status}`,
      );
    }

    const text = await res.text();
    const cleaned = text.trim();

    if (!cleaned) return `API error ${res.status}`;

    if (
      cleaned.startsWith('<!DOCTYPE') ||
      cleaned.startsWith('<html') ||
      cleaned.includes('__next_error__')
    ) {
      return `Server vrátil chybu ${res.status}. Detail pozri v termináli.`;
    }

    return cleaned.length > 1200 ? `${cleaned.slice(0, 1200)}...` : cleaned;
  } catch {
    return `API error ${res.status}`;
  }
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getTodaySkDate() {
  const today = new Date();
  return today.toLocaleDateString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizeYear(year: string) {
  if (year.length === 2) {
    const numeric = Number(year);
    return numeric >= 70 ? 1900 + numeric : 2000 + numeric;
  }

  return Number(year);
}

function extractDatesFromText(text: string) {
  const value = String(text || '');
  const dates: Date[] = [];

  const dotRegex = /\b(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})\b/g;
  const isoRegex = /\b(\d{4})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\b/g;

  let match: RegExpExecArray | null;

  while ((match = dotRegex.exec(value)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = normalizeYear(match[3]);

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      dates.push(date);
    }
  }

  while ((match = isoRegex.exec(value)) !== null) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      dates.push(date);
    }
  }

  return dates;
}

function validatePlanningDatesNoPast(text: string) {
  const dates = extractDatesFromText(text);
  const today = getTodayStart();

  const pastDates = dates.filter((date) => date.getTime() < today.getTime());

  if (pastDates.length === 0) {
    return {
      ok: true,
      message: '',
    };
  }

  const uniquePastDates = Array.from(
    new Set(
      pastDates.map((date) =>
        date.toLocaleDateString('sk-SK', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      ),
    ),
  );

  return {
    ok: false,
    message: `Plánovanie nemôže obsahovať dátum v minulosti. Dnes je ${getTodaySkDate()}. Uprav tieto dátumy: ${uniquePastDates.join(
      ', ',
    )}.`,
  };
}

function createTextFileFromInput(text: string) {
  const cleaned = cleanFinalOutput(text);

  return new File([cleaned], 'vlozene-data-alebo-vysledky.txt', {
    type: 'text/plain;charset=utf-8',
  });
}

function normalizeAnalysisResult(data: ApiAnalysisResponse): AnalysisResult {
  const anyData = data as any;

  const frequencies = Array.isArray(anyData.frequencies)
    ? anyData.frequencies
    : Array.isArray(anyData.frequencyTables)
      ? anyData.frequencyTables
      : Array.isArray(anyData.frequency_tables)
        ? anyData.frequency_tables
        : [];

  const extractedFiles = Array.isArray(anyData.files)
    ? anyData.files
    : Array.isArray(anyData.extractedFiles)
      ? anyData.extractedFiles
      : Array.isArray(anyData.attachments)
        ? anyData.attachments
        : [];

  const variables = Array.isArray(anyData.variables)
    ? anyData.variables
    : Array.isArray(anyData.detectedVariables)
      ? anyData.detectedVariables
      : Array.isArray(anyData.columns)
        ? anyData.columns
        : [];

  const warnings = Array.isArray(anyData.warnings)
    ? anyData.warnings
    : Array.isArray(anyData.alerts)
      ? anyData.alerts
      : [];

  const recommendedTests = Array.isArray(anyData.recommendedTests)
    ? anyData.recommendedTests
    : Array.isArray(anyData.tests)
      ? anyData.tests
      : Array.isArray(anyData.recommended_tests)
        ? anyData.recommended_tests
        : [];

  const recommendedCharts = Array.isArray(anyData.recommendedCharts)
    ? anyData.recommendedCharts
    : Array.isArray(anyData.charts)
      ? anyData.charts
      : Array.isArray(anyData.recommended_charts)
        ? anyData.recommended_charts
        : [];

  const excelTables = Array.isArray(anyData.excelTables)
    ? anyData.excelTables
    : Array.isArray(anyData.tables)
      ? anyData.tables
      : Array.isArray(anyData.excel_tables)
        ? anyData.excel_tables
        : [];

  const descriptiveStatistics = Array.isArray(anyData.descriptiveStatistics)
    ? anyData.descriptiveStatistics
    : Array.isArray(anyData.descriptive_statistics)
      ? anyData.descriptive_statistics
      : Array.isArray(anyData.statistics)
        ? anyData.statistics
        : [];

  const hypothesisTests = Array.isArray(anyData.hypothesisTests)
    ? anyData.hypothesisTests
    : Array.isArray(anyData.hypothesis_tests)
      ? anyData.hypothesis_tests
      : Array.isArray(anyData.testResults)
        ? anyData.testResults
        : [];

  const selectedAnalyses = Array.isArray(anyData.selectedAnalyses)
    ? anyData.selectedAnalyses
    : Array.isArray(anyData.selected_analyses)
      ? anyData.selected_analyses
      : [];

  const summary =
    anyData.summary ||
    createAnalysisSummary({
      variablesCount: variables.length,
      frequenciesCount: frequencies.length,
      filesCount: extractedFiles.length,
      warningsCount: warnings.length,
    });

  const fullText =
    anyData.fullText ||
    anyData.fullResult ||
    anyData.text ||
    anyData.output ||
    anyData.result ||
    anyData.interpretation ||
    '';

  const practicalText =
    anyData.practicalText ||
    anyData.practical_text ||
    anyData.interpretation ||
    'Do praktickej časti je vhodné zaradiť deskriptívnu štatistiku, frekvenčné tabuľky, grafy a následne testovanie hypotéz podľa typu premenných.';

  return {
    ok: Boolean(data.ok),
    title: anyData.title || 'Výsledky analýzy dát',
    summary,
    warnings,
    variables,
    frequencies,
    recommendedTests,
    recommendedCharts,
    excelTables,
    practicalText,
    fullText,

    dataDescription: anyData.dataDescription || anyData.data_description || '',
    selectedAnalyses,
    descriptiveStatistics,
    hypothesisTests,
    interpretation: anyData.interpretation || practicalText || fullText || '',
  } as AnalysisResult;
}

function createAnalysisSummary({
  variablesCount,
  frequenciesCount,
  filesCount,
  warningsCount,
}: {
  variablesCount: number;
  frequenciesCount: number;
  filesCount: number;
  warningsCount: number;
}) {
  return [
    `Spracovaných súborov: ${filesCount}.`,
    `Identifikovaných premenných: ${variablesCount}.`,
    `Vytvorených frekvenčných tabuliek: ${frequenciesCount}.`,
    warningsCount > 0
      ? `Počas spracovania vzniklo ${warningsCount} upozornení.`
      : 'Spracovanie prebehlo bez zásadných upozornení.',
  ].join('\n');
}

function createAnalysisOutputText(data: AnalysisResult) {
  const warningsBlock =
    data.warnings && data.warnings.length > 0
      ? `Upozornenia:\n${data.warnings.map((item) => `- ${item}`).join('\n')}`
      : '';

  const variablesBlock =
    data.variables && data.variables.length > 0
      ? `Identifikované premenné:\n${data.variables
          .map((item: any) => {
            const name = item.name || item.variable || 'Premenná';
            const valid = item.valid ?? 'neuvedené';
            const mean = item.mean ?? 'neuvedené';
            const sd = item.stdDeviation ?? item.std ?? 'neuvedené';

            return `- ${name}: validné hodnoty ${valid}, priemer ${mean}, SD ${sd}`;
          })
          .join('\n')}`
      : '';


const descriptiveBlock =
  data.descriptiveStatistics && data.descriptiveStatistics.length > 0
    ? `Deskriptívna štatistika:\n${data.descriptiveStatistics
        .map((item: any) => {
          const name = item.name || item.variable || item.premenna || 'Premenná';
          const valid = item.valid ?? item.n ?? item.count ?? 'neuvedené';
          const missing = item.missing ?? 'neuvedené';
          const mean = item.mean ?? item.M ?? 'neuvedené';
          const median = item.median ?? item.Md ?? 'neuvedené';
          const sd = item.stdDeviation ?? item.sd ?? item.SD ?? 'neuvedené';
          const min = item.minimum ?? item.min ?? 'neuvedené';
          const max = item.maximum ?? item.max ?? 'neuvedené';
          const skewness = item.skewness ?? 'neuvedené';
          const kurtosis = item.kurtosis ?? 'neuvedené';

          return `- ${name}: N = ${valid}, chýbajúce = ${missing}, M = ${mean}, Md = ${median}, SD = ${sd}, Min = ${min}, Max = ${max}, šikmosť = ${skewness}, špicatosť = ${kurtosis}`;
        })
        .join('\n')}`
    : '';

const hypothesisTestsBlock =
  data.hypothesisTests && data.hypothesisTests.length > 0
    ? `Výsledky štatistických testov:\n${data.hypothesisTests
        .map((item: any) => {
          const test = item.test || item.name || 'Štatistický test';
          const variable = item.variable || item.variables || item.dependentVariable || '';
          const statistic = item.statistic ?? item.value ?? item.t ?? item.r ?? 'neuvedené';
          const pValue = item.pValue ?? item.p ?? 'neuvedené';
          const interpretation =
            item.interpretation || item.result || item.conclusion || 'Interpretáciu je potrebné doplniť podľa výsledku.';

          return `- ${test}${variable ? ` (${variable})` : ''}: štatistika = ${statistic}, p = ${pValue}. ${interpretation}`;
        })
        .join('\n')}`
    : '';


  const chartsBlock =
    data.recommendedCharts && data.recommendedCharts.length > 0
      ? `Odporúčané grafy:\n${data.recommendedCharts
          .map(
            (item: any) =>
              `- ${item.title || 'Graf'} (${item.type || 'typ neuvedený'}): ${
                item.reason || 'vhodné na vizualizáciu výsledkov'
              }`,
          )
          .join('\n')}`
      : '';

  const testsBlock =
    data.recommendedTests && data.recommendedTests.length > 0
      ? `Odporúčané štatistické testy:\n${data.recommendedTests
          .map(
            (item: any) =>
              `- ${item.test || 'Test'}: ${
                item.hypothesis || item.reason || 'overenie hypotézy'
              }`,
          )
          .join('\n')}`
      : '';

  const tablesBlock =
    data.excelTables && data.excelTables.length > 0
      ? `Odporúčané tabuľky do práce:\n${data.excelTables
          .map((item) => `- ${item}`)
          .join('\n')}`
      : '';

  return cleanFinalOutput(
  [
    data.title || 'Výsledky analýzy',
    '',
    data.summary || '',
    '',
    warningsBlock,
    '',
    variablesBlock,
    '',
    descriptiveBlock,
    '',
    chartsBlock,
    '',
    testsBlock,
    '',
    hypothesisTestsBlock,
    '',
    tablesBlock,
    '',
    data.practicalText || '',
    '',
    data.fullText || '',
  ]
    .filter(Boolean)
    .join('\n'),
);
}




type ClickableOptionGroupProps<T extends string> = {
  label: string;
  value: T;
  options: ClickableChoice<T>[];
  onChange: (value: T) => void;
  columns?: 'languages' | 'styles' | 'emails';
};

function ClickableOptionGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 'languages',
}: ClickableOptionGroupProps<T>) {
  const gridClass =
    columns === 'styles'
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 'emails'
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#03111f]/95 p-5 shadow-inner shadow-black/40">
      <div className="mb-5 flex items-center gap-3">
        <p className="shrink-0 text-xs font-black uppercase tracking-[0.24em] text-slate-100">
          {label}
        </p>

        <div className="h-px flex-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent" />
      </div>

      <div className={`grid ${gridClass} gap-3`}>
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              title={option.label}
              className={[
                'group relative min-h-[74px] w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-[#020617]',
                isActive
                  ? 'border-violet-300 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-xl shadow-violet-950/60'
                  : 'border-white/10 bg-[#050b16] text-white shadow-lg shadow-black/25 hover:-translate-y-0.5 hover:border-violet-300/60 hover:bg-[#0b1224]',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200',
                  isActive
                    ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_38%)] opacity-100'
                    : 'group-hover:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.25),transparent_40%)] group-hover:opacity-100',
                ].join(' ')}
              />

              <span className="relative z-10 flex min-w-0 items-center justify-between gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-normal break-words text-[15px] font-black leading-5 text-white">
                    {option.label}
                  </span>

                  {option.description ? (
                    <span
                      className={[
                        'mt-1 block whitespace-normal break-words text-xs font-bold leading-5',
                        isActive ? 'text-violet-50' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {option.description}
                    </span>
                  ) : null}
                </span>

                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition',
                    isActive
                      ? 'border-white bg-white'
                      : 'border-white/20 bg-white/5 group-hover:border-violet-300',
                  ].join(' ')}
                >
                  {isActive ? (
                    <span className="h-3 w-3 rounded-full bg-violet-600" />
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================= PAGE =================

export default function DashboardPage() {
  const router = useRouter();
  const agent = defaultAgent;
  const { t } = useLanguage();

  const [activeModule, setActiveModule] = useState<ModuleKey>('supervisor');
const [mobileModuleMenuOpen, setMobileModuleMenuOpen] = useState(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [input, setInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
const [activeAttachmentText, setActiveAttachmentText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  const [qualityMode, setQualityMode] = useState('style');
  const [outputMode, setOutputMode] = useState('detailed');
  const [translationFrom, setTranslationFrom] = useState<LanguageCode>('sk');
const [translationTo, setTranslationTo] = useState<LanguageCode>('hu');
const [translationStyle, setTranslationStyle] =
  useState<TranslationStyle>('academic');

const [emailType, setEmailType] = useState<EmailType>('supervisor');
const [emailTone, setEmailTone] = useState<EmailTone>('professional');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
const resultRef = useRef<HTMLDivElement | null>(null);
const mobileToolPanelRef = useRef<HTMLDivElement | null>(null);

  const activeModuleInfo = useMemo(() => {
  return (
    moduleInfos.find((item) => item.key === activeModule) || moduleInfos[0]
  );
}, [activeModule]);
const activeTranslationKey = activeModuleInfo.translationKey;

const activeModuleLabel =
  t.dashboardTools.tools[activeTranslationKey];

const activeModuleButtonLabel =
  t.dashboardTools.buttons[activeTranslationKey];

const activeModuleInputLabel =
  t.dashboardTools.inputLabels?.[activeTranslationKey] ||
  t.dashboardTools.common.assignmentLabel;

const activeModulePlaceholder =
  t.dashboardTools.placeholders[activeTranslationKey];

const activeModuleInfoText =
  t.dashboardTools.infoTexts?.[activeTranslationKey] ||
  t.dashboardTools.common.infoText;

const activeModuleResultTitle =
  t.dashboardTools.resultTitles?.[activeTranslationKey] ||
  activeModuleLabel;

const activeModuleCard =
  t.dashboardTools.cards?.[activeTranslationKey];

const activeModuleTexts =
  t.dashboardTools.modules?.[activeTranslationKey];

const activeModuleIntro =
  activeModuleTexts?.intro || activeModuleInfoText;

const activeModuleInputHelp =
  activeModuleTexts?.inputHelp || activeModulePlaceholder;

const activeModuleResultHelp =
  activeModuleTexts?.resultHelp || '';

const activeModuleEmptyState =
  activeModuleTexts?.emptyState || 'Zatiaľ nie je vložený žiadny text.';

const activeModuleCardTitle =
  activeModuleCard?.title || activeModuleLabel;

const activeModuleCardSubtitle =
  activeModuleCard?.subtitle || 'AI nástroj';

const activeModuleCardDescription =
  activeModuleCard?.description || activeModuleIntro;


const exportTitle = useMemo(() => {
  return `${activeModuleLabel} - ${
    activeProfile?.title || 'output'
  }`.trim();
}, [activeModuleLabel, activeProfile]);


const selectorTranslations = getDashboardSelectorTranslations(t);

const languageSelectOptions = createLanguageSelectOptions(selectorTranslations);

const translationStyleOptions =
  createTranslationStyleOptions(selectorTranslations);

const emailTypeOptions = createEmailTypeOptions(selectorTranslations);

const emailToneOptions = createEmailToneOptions(selectorTranslations);

const getLanguageLabel = (value: LanguageCode): string => {
  const option = languageSelectOptions.find(
    (languageOption) => languageOption.value === value,
  );

  return option?.label ?? value;
};

const getTranslationStyleLabel = (value: TranslationStyle): string => {
  const option = translationStyleOptions.find(
    (styleOption) => styleOption.value === value,
  );

  return option?.label ?? value;
};

const getEmailTypeLabel = (value: EmailType): string => {
  const option = emailTypeOptions.find(
    (emailTypeOption) => emailTypeOption.value === value,
  );

  return option?.label ?? value;
};

const getEmailToneLabel = (value: EmailTone): string => {
  const option = emailToneOptions.find(
    (emailToneOption) => emailToneOption.value === value,
  );

  return option?.label ?? value;
};

function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  labels: Record<string, string>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white">
        {label}
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="w-full cursor-pointer appearance-none rounded-2xl border border-white/15 bg-black px-4 py-3 pr-11 text-sm font-bold text-white outline-none transition hover:border-white/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-black text-white"
            >
              {labels?.[option.labelKey] || option.value}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
      </div>
    </label>
  );
}





useEffect(() => {
  function handleActiveProfileChanged(event: Event) {
    const customEvent = event as CustomEvent<SavedProfile>;

    if (!customEvent.detail) return;

    const systemLanguage = getStoredSystemLanguage();

    const normalizedProfile = prepareProfileForApi(
      customEvent.detail,
      systemLanguage,
    );

    if (!normalizedProfile) return;

    setActiveProfile(normalizedProfile);

    try {
      localStorage.setItem('active_profile', JSON.stringify(normalizedProfile));
      localStorage.setItem('profile', JSON.stringify(normalizedProfile));
    } catch {
      // localStorage nemusí byť dostupný
    }
  }

  window.addEventListener(
    'zedpera:active-profile-changed',
    handleActiveProfileChanged,
  );

  return () => {
    window.removeEventListener(
      'zedpera:active-profile-changed',
      handleActiveProfileChanged,
    );
  };
}, []);



 useEffect(() => {
  const systemLanguage = getStoredSystemLanguage();
  persistSystemLanguage(systemLanguage);

  const activeRaw = localStorage.getItem('active_profile');
  const profileRaw = localStorage.getItem('profile');
  const active = normalizeProfile(safeJsonParse<any>(activeRaw));
  const profile = normalizeProfile(safeJsonParse<any>(profileRaw));

  const selectedProfile = active || profile || null;

  const profileWithLanguage = prepareProfileForApi(
    selectedProfile,
    systemLanguage,
  );

  setActiveProfile(profileWithLanguage);

  if (profileWithLanguage) {
    localStorage.setItem('active_profile', JSON.stringify(profileWithLanguage));
    localStorage.setItem('profile', JSON.stringify(profileWithLanguage));
  }
}, []);

  useEffect(() => {
    setInput('');
    setSecondaryInput('');
    setResult('');
    setAttachedFiles([]);
    setCanvasText('');
    setAnalysisResult(null);
    setAnalysisModalOpen(false);
  }, [activeModule]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of incomingFiles) {
      if (!isAllowedUploadFile(file)) {
        alert(
          `Súbor "${file.name}" má nepodporovaný formát. Povolené sú PDF, Word, TXT, RTF, ODT, obrázky, Excel, CSV a PowerPoint.`,
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        alert(
          `Súbor "${file.name}" je príliš veľký. Maximum je ${maxFileSizeMb} MB.`,
        );
        continue;
      }

    validFiles.push({
  id: createFileId(),
  name: file.name,
  size: file.size,
  type: file.type || 'application/octet-stream',
  file,
});
    }

    if (validFiles.length === 0) return;

    setAttachedFiles((prev) => {
      const next = [...prev];

      for (const file of validFiles) {
        if (next.length >= maxFilesCount) {
          alert(`Môžete priložiť maximálne ${maxFilesCount} súborov.`);
          break;
        }

        const duplicate = next.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (!duplicate) next.push(file);
      }

      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const resetCurrentModule = () => {
    setInput('');
    setSecondaryInput('');
    setResult('');
    setCanvasText('');
    setAttachedFiles([]);
    setAnalysisResult(null);
    setAnalysisModalOpen(false);
  };



async function saveHistoryItem(inputData: {
  module: ModuleKey;
  title: string;
  userMessage: string;
  assistantMessage: string;
  result?: Record<string, unknown>;
}) {
  if (!inputData.assistantMessage.trim()) return;

  const localItem = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `history_${Date.now()}`,
    profile_id: activeProfile?.id || null,
    module: inputData.module,
    title: inputData.title,
    user_message: inputData.userMessage,
    assistant_message: inputData.assistantMessage,
    result: inputData.result || {},
    created_at: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem('chat_history');
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];

    localStorage.setItem(
      'chat_history',
      JSON.stringify([localItem, ...list].slice(0, 300)),
    );
  } catch (error) {
    console.warn('Lokálna história sa neuložila:', error);
  }

  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        profileId: activeProfile?.id || null,
        module: inputData.module,
        title: inputData.title,
        userMessage: inputData.userMessage,
        assistantMessage: inputData.assistantMessage,
        result: inputData.result || {},
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      console.warn(
        'História sa neuložila do databázy:',
        data?.error || `HTTP ${res.status}`,
      );
    }
  } catch (error) {
    console.warn('História sa neuložila do databázy:', error);
  }
}

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Diktovanie nie je podporované. Skús Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();

   const systemLanguage = getStoredSystemLanguage();

const speechLanguageMap: Record<SystemLanguage, string> = {
  sk: 'sk-SK',
  cs: 'cs-CZ',
  en: 'en-US',
  de: 'de-DE',
  pl: 'pl-PL',
  hu: 'hu-HU',
};

recognition.lang = speechLanguageMap[systemLanguage] || 'sk-SK';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';

      if (transcript) {
        setInput((prev) => `${prev}${prev.trim() ? ' ' : ''}${transcript}`);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const buildModulePrompt = () => {
const moduleKey  = String(activeModule);
  const systemLanguage = getStoredSystemLanguage();
const profileForPrompt = prepareProfileForApi(
  activeProfile,
  systemLanguage,
);
  const profileBlock = buildProfileBlock(profileForPrompt);
  const citationStyle = getCitationStyle(profileForPrompt);
  const workLanguage = getWorkLanguage(profileForPrompt);
  const attachmentBlock = buildAttachmentBlock(attachedFiles);

    const baseRules = `
PROFIL PRÁCE:
${profileBlock}

PRILOŽENÉ SÚBORY:
${attachmentBlock}

DÔLEŽITÉ PRAVIDLÁ PRE VŠETKY MODULY:
- Hlavný jazyk celého systému je: ${workLanguage}.
- Výstup musí byť v jazyku práce: ${workLanguage}.
- Všetky odpovede, nadpisy, vysvetlenia, tabuľky, odporúčania a texty musia byť v tomto jazyku.
- Výstup píš ako čistý text vhodný do Wordu.
- Nepíš Markdown znaky ako #, ##, ###, **, *, --- ani kódové bloky.
- Nevkladaj na úplný začiatok technické nadpisy typu „AI vedúci“, „Audit kvality“, „Obhajoba“, „Výstup“ ani názov modulu.
- Nepoužívaj poškodené znaky, kódovanie ani nečitateľné symboly.
- Nevymýšľaj zdroje, autorov, DOI, URL, roky ani vydavateľov.
- Ak údaj chýba, napíš: údaj je potrebné overiť.
- Ak sú priložené súbory, najprv over, či súvisia s aktívnym profilom práce.
- Ak priložený dokument pravdepodobne nesúvisí s profilom práce, jasne uveď upozornenie a nepouži ho ako hlavný zdroj.
- Ak príloha súvisí s profilom práce, použi jej extrahovaný text ako hlavný podklad.
- Ak sú priložené súbory, v závere uveď, z ktorých príloh sa čerpalo.
- Citačná norma: ${citationStyle}.
`.trim();

    if (moduleKey  === 'supervisor') {
      return `
${baseRules}

ÚLOHA:
Správaj sa ako odborný vedúci akademickej práce. Skontroluj logiku, cieľ, výskumný problém, metodológiu, štruktúru, argumentáciu a nadväznosť práce.

TEXT NA KONTROLU:
${input || 'Použi text z priložených dokumentov, ak je dostupný.'}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
Hodnotenie práce: ${activeProfile?.title || 'bez názvu'}

POVINNÁ ŠTRUKTÚRA:
1. Celkové hodnotenie práce
2. Silné stránky
3. Slabé stránky
4. Logika a nadväznosť textu
5. Cieľ, výskumný problém a metodológia
6. Chýbajúce časti alebo nedostatočne rozpracované miesta
7. Konkrétne pripomienky vedúceho práce
8. Odporúčané opravy
9. Otázky na konzultáciu
10. Skóre kvality 0–100
`.trim();
    }

    if (moduleKey  === 'quality') {
  const modeInstruction =
    qualityMode === 'style'
      ? `
Kontroluj výhradne štylistiku, jazyk, akademickosť, plynulosť viet, nevhodné formulácie, zrozumiteľnosť a formálnosť textu.
Nehodnoť obsah práce ako celok.
Pri každej slabej alebo neakademickej formulácii uveď aj konkrétnu prepísanú verziu.
`.trim()
      : qualityMode === 'citations'
        ? `
Kontroluj výhradne citácie, odkazy v texte, zoznam literatúry, úplnosť bibliografických údajov a súlad s citačnou normou.
Nehodnoť celú prácu obsahovo.
Ak zistíš problém s citáciou, uveď aj návrh, ako má byť citácia alebo odkaz opravený.
Nevymýšľaj neexistujúce zdroje, autorov, DOI, URL ani vydavateľov.
`.trim()
        : qualityMode === 'logic'
          ? `
Kontroluj logiku, nadväznosť, argumentáciu, duplicity, vnútornú súdržnosť textu a prepojenie cieľa, problému, metodológie a záverov.
Pri každom logickom probléme uveď aj návrh opravy alebo odporúčanú preformulovanú verziu.
`.trim()
          : `
Urob celkový audit kvality akademickej práce.
Jasne oddeľ štylistiku, logiku, citácie, metodológiu, odbornú presnosť a praktické odporúčania.
Výstup nesmie byť iba kritika. Musí obsahovať aj konkrétne prepísané vety a zapracovanú upravenú verziu textu.
`.trim();

  return `
${baseRules}

ÚLOHA:
Urob audit kvality akademickej práce.

Cieľom nie je iba kritizovať text. Cieľom je používateľovi prakticky pomôcť text zlepšiť.

REŽIM KONTROLY:
${qualityMode}

PRESNÁ INŠTRUKCIA:
${modeInstruction}

TEXT NA KONTROLU:
${input || 'Použi text z priložených dokumentov, ak je dostupný.'}

ZAČIATOK ODPOVEDE:
Začni priamo nadpisom:
${activeProfile?.title || 'Audit kontrolovaného textu'}

POVINNÁ ŠTRUKTÚRA:

1. Stručné hodnotenie kvality textu
Uveď 3 až 5 viet. Zhodnoť odbornú úroveň, akademickosť, zrozumiteľnosť a celkovú použiteľnosť textu.

2. Nájdené problémy
Vypíš konkrétne problémy v texte.
Nepíš všeobecné frázy.
Pri každom probléme uveď, prečo je problém dôležitý.

3. Konkrétne pripomienky
Uveď praktické pripomienky k textu.
Zameraj sa na:
- nepresné formulácie,
- slabé alebo neakademické vety,
- nelogické nadväznosti,
- chýbajúce vysvetlenia,
- duplicity,
- odborné nepresnosti,
- problémy s citáciami, ak sa v texte nachádzajú.

4. Prepísané vety
Táto časť je povinná.

Pri každej úprave použi presný formát:

Pôvodná veta:
Problém:
Opravená veta:

Ak text obsahuje viac slabých viet, vyber minimálne 5 najdôležitejších viet a prepíš ich.
Ak text obsahuje menej viet, prepíš všetky problematické vety.

5. Zapracovaná upravená verzia textu
Táto časť je povinná.

Prepíš celý kontrolovaný text do lepšej akademickej podoby.
Zachovaj pôvodný význam.
Zlepši:
- štylistiku,
- odborný jazyk,
- logickú nadväznosť,
- plynulosť,
- formálnosť,
- presnosť formulácií.

Ak niektoré údaje chýbajú, nevymýšľaj ich. Napíš: údaj je potrebné doplniť.

6. Skóre kvality od 0 do 100
Uveď číselné skóre a krátke vysvetlenie, prečo bolo pridelené.

7. Odporúčané ďalšie kroky
Uveď konkrétne kroky, ktoré má používateľ urobiť ďalej.

DÔLEŽITÉ PRAVIDLÁ:
- Nepíš iba kritiku.
- Každý zásadný problém musí mať aj návrh opravy.
- Ak označíš vetu ako slabú, musíš ju aj prepísať.
- Výstup musí byť prakticky použiteľný pre študenta.
- Nevymýšľaj zdroje, autorov, DOI, URL, roky ani vydavateľov.
- Nepoužívaj markdown znaky ako #, ##, **, --- ani kódové bloky.
- Nepíš technický úvod.
- Nezačínaj odpoveď slovami „Audit kvality“ ani „Tu je audit“.
`.trim();
}

    if (moduleKey  === 'defense') {
      return `
${baseRules}

ÚLOHA:
Priprav kompletnú obhajobu práce. Musí vzniknúť aj prezentácia, aj sprievodný text, aj otázky a odpovede.

TEXT / PODKLAD:
${input || 'Použi aktívny profil práce a priložené dokumenty.'}

ZAČIATOK ODPOVEDE:
Začni priamo názvom práce:
${activeProfile?.title || 'Prezentácia k obhajobe práce'}

POVINNÁ ŠTRUKTÚRA VÝSTUPU:
ČASŤ A: PREZENTÁCIA – OBSAH SNÍMOK
ČASŤ B: SPRIEVODNÝ TEXT K PREZENTÁCII
ČASŤ C: OTÁZKY KOMISIE A VZOROVÉ ODPOVEDE
ČASŤ D: SLABÉ MIESTA PRÁCE
ČASŤ E: KRÁTKA VERZIA OBHAJOBY NA 3–5 MINÚT
ČASŤ F: KONTROLA PRÍLOH

DÔLEŽITÉ:
- Prezentáciu priprav tak, aby sa dala exportovať do PPTX.
- Každú snímku označ ako „Snímka 1“, „Snímka 2“, „Snímka 3“.
- Pri každej snímke uveď krátke body vhodné do prezentácie.
- Vypíš celý obsah, neskracuj odpoveď.
`.trim();
    }

 if (moduleKey === 'translation') {
  return `
${baseRules}

ÚLOHA:
Prelož text akademicky, prirodzene a presne.

Zo jazyka: ${getLanguageLabel(translationFrom)}
Do jazyka: ${getLanguageLabel(translationTo)}
Štýl prekladu: ${getTranslationStyleLabel(translationStyle)}

TEXT NA PREKLAD:
${input}

PRÍSNE PRAVIDLÁ PRE VÝSTUP:
- Vráť iba samotný preložený text.
- Nepíš nadpis „Preklad“.
- Nepíš „Preložený text“.
- Nepíš analýzu.
- Nepíš skóre.
- Nepíš komentár k prekladu.
- Nepíš vysvetlenie.
- Nepíš hodnotenie.
- Nepíš odporúčania.
- Nepíš časti ako „ANALÝZA“, „SKÓRE“, „ODPORÚČANIE“.
- Neuvádzaj, že text bol preložený.
- Začni priamo prvým slovom preloženého textu.
`.trim();
}

    if (moduleKey === 'data') {
  return `
${baseRules}

ÚLOHA:
Analyzuj priložené dáta, tabuľky alebo štatistické výstupy.

ZADANIE ANALÝZY:
${input || 'Použi priložené dátové súbory, ak sú dostupné.'}

POVINNÝ VÝSTUP:
1. Popis dát
2. Identifikované premenné
3. Frekvenčná analýza
4. Deskriptívna štatistika
5. Korelačná analýza Pearson/Spearman, ak je vhodná podľa typu premenných
6. T-testy alebo iné testy rozdielov, ak sú vhodné podľa typu premenných
7. Odporúčané grafy
8. Interpretácia výsledkov do praktickej časti práce
9. Upozornenia na chýbajúce alebo nevhodné údaje

PRAVIDLÁ:
- Používaj slovenské názvy stĺpcov a štatistík.
- Premenné uvádzaj podľa názvov zo súboru.
- Pri deskriptívnej štatistike uvádzaj: N, chýbajúce hodnoty, M, medián, SD, minimum, maximum, suma, šikmosť a špicatosť.
- Pri frekvenciách uvádzaj hodnotu, počet, percento, validné percento a kumulatívne percento.
- Pri grafoch navrhni vhodný typ: stĺpcový graf, koláčový graf, histogram alebo boxplot.
- Nevymýšľaj výsledky, ktoré nie sú v dátach dostupné.
`.trim();
}

    if (moduleKey  === 'planning') {
      return `
${baseRules}

ÚLOHA:
Vytvor iba predbežný a orientačný plán práce bez markdown znakov.

DNEŠNÝ DÁTUM:
${getTodaySkDate()}

ZADANIE:
${input}

PRAVIDLÁ PRE PLÁNOVANIE:
- Plánovanie nesmie obsahovať termíny v minulosti.
- Všetky dátumy musia byť od dnešného dátumu alebo v budúcnosti.
- Harmonogram musí byť označený ako predbežný / orientačný.
- Ak používateľ zadal termín odovzdania, rozvrhni etapy spätne iba v rozsahu, ktorý nezasahuje do minulosti.
- Ak je termín príliš blízko, upozorni, že plán je rizikový.
- Nepíš, že ide o záväzný termínový plán.
- Použi formulácie: predbežne, orientačne, odporúčané, navrhovaný harmonogram.

VÝSTUP:
1. Predbežné upozornenie
2. Orientačný harmonogram
3. Etapy práce
4. Kontrolné body
5. Riziká pri nedodržaní termínov
6. Odporúčanie na ďalší postup
`.trim();
    }

    if (moduleKey === 'emails') {
  return `
${baseRules}

ÚLOHA:
Vytvor profesionálny email.

Typ emailu: ${getEmailTypeLabel(emailType)}
Tón: ${getEmailToneLabel(emailTone)}

ČO MÁ EMAIL RIEŠIŤ:
${input}

PRÍSNE PRAVIDLÁ PRE VÝSTUP:
- Vráť iba hotový email.
- Nepíš analýzu.
- Nepíš skóre.
- Nepíš komentár.
- Nepíš odporúčania.
- Nepíš vysvetlenie.
- Nepíš časti ako „ANALÝZA“, „SKÓRE“, „ODPORÚČANIE“.
- Nepíš text typu „Tu je návrh emailu“.
- Nepíš žiadny text pred predmetom.
- Nepíš žiadny text po emaile.
- Výstup musí obsahovať iba:
Predmet:
Text emailu:

POVINNÝ FORMÁT:
Predmet: ...

Text emailu:
...
`.trim();
}

    return input;
  };



const selectDashboardModule = useCallback((moduleKey: ModuleKey) => {
  setActiveModule(moduleKey);
  setMobileMenuOpen(false);

  window.setTimeout(() => {
    mobileToolPanelRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, 80);
}, []);

async function runModule() {
  if (isLoading) return;

  const hasUsableProfile = Boolean(
    activeProfile &&
      (
        activeProfile.id ||
        activeProfile.title ||
        activeProfile.topic ||
        activeProfile.type ||
        activeProfile.schema?.label
      ),
  );

  const hasDefenseInput = Boolean(input.trim() || attachedFiles.length > 0 || hasUsableProfile);

  if (!hasUsableProfile && activeModule !== 'defense') {
    alert(
      'Najprv vyberte alebo vytvorte profil práce. Systém nevie, ku ktorej práci má výstup priradiť.',
    );
    return;
  }

  if (activeModule === 'defense' && !hasDefenseInput) {
    alert(
      'Na vytvorenie prezentácie nahrajte prácu, vložte text alebo vyberte profil práce.',
    );
    return;
  }

  if (activeModule !== 'defense' && !activeProfile?.type && !activeProfile?.schema?.label) {
    alert('V aktívnom profile chýba typ práce. Skontrolujte profil práce.');
    return;
  }

  if (activeModule !== 'defense' && !activeProfile?.workLanguage && !activeProfile?.language) {
    alert('V aktívnom profile chýba jazyk práce. Skontrolujte profil práce.');
    return;
  }

  setIsLoading(true);
  setResult('');
  setAnalysisResult(null);
  setAnalysisModalOpen(false);

  try {
    // ================= ANALÝZA DÁT =================
    if (activeModule === 'data') {
      const formData = new FormData();

      const systemLanguage = getStoredSystemLanguage();
      persistSystemLanguage(systemLanguage);

      const profileForApi = prepareProfileForApi(
  activeProfile,
  systemLanguage,
);

const finalWorkLanguage = getWorkLanguage(profileForApi);

formData.append('language', finalWorkLanguage);
formData.append('outputLanguage', finalWorkLanguage);
formData.append('systemLanguage', systemLanguage);
formData.append('interfaceLanguage', systemLanguage);
formData.append('workLanguage', finalWorkLanguage);

      formData.append('analysisGoal', input || '');
formData.append('dataDescription', input || '');
formData.append('activeProfile', JSON.stringify(profileForApi || null));
formData.append('profile', JSON.stringify(profileForApi || null));

      if (profileForApi?.id) {
        formData.append('projectId', profileForApi.id);
      }

      attachedFiles.forEach((item) => {
        if (item.file instanceof File) {
          formData.append('files', item.file, item.name);
        }
      });

      if (input.trim()) {
        const textFile = createTextFileFromInput(input);
        formData.append('files', textFile, textFile.name);
      }

      const res = await fetch('/api/analysis/files', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readApiErrorResponse(res));
      }

      const rawData = (await res.json()) as ApiAnalysisResponse;

      if (!rawData?.ok) {
        throw new Error(
          rawData?.error || rawData?.message || 'Analýza dát zlyhala.',
        );
      }

      const normalizedData = normalizeAnalysisResult(rawData);

      setAnalysisResult(normalizedData);
      setAnalysisModalOpen(true);

      const output = createAnalysisOutputText(normalizedData);

      setResult(output);
      setCanvasText(output);

     await saveHistoryItem({
  module: 'data',
  title: activeModuleResultTitle,
  userMessage: input || 'Analýza dát zo súborov.',
  assistantMessage: output,
  result: {
    analysis: normalizedData,
    profileTitle: profileForApi?.title || '',
          attachedFiles: attachedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);

      return;
    }

    // ================= ORIGINALITA =================
    // ================= ORIGINALITA =================
if (activeModule === 'originality') {
  const formData = new FormData();

  const systemLanguage = getStoredSystemLanguage();
  persistSystemLanguage(systemLanguage);

  const profileForApi = prepareProfileForApi(
    activeProfile,
    systemLanguage,
  );

  const finalWorkLanguage = getWorkLanguage(profileForApi);

  formData.append('agent', agent);
  formData.append('text', input);
  formData.append('activeProfile', JSON.stringify(profileForApi || null));
  formData.append('profile', JSON.stringify(profileForApi || null));

  formData.append(
    'profileSnapshot',
    JSON.stringify({
      id: profileForApi?.id || null,
      title: profileForApi?.title || '',
      topic: profileForApi?.topic || '',
      type: getWorkType(profileForApi),
      expertise: getExpertise(profileForApi),
      workLanguage: getWorkLanguage(profileForApi),
      citation: getCitationStyle(profileForApi),
    }),
  );

  formData.append('language', finalWorkLanguage);
  formData.append('outputLanguage', finalWorkLanguage);
  formData.append('systemLanguage', systemLanguage);
  formData.append('interfaceLanguage', systemLanguage);
  formData.append('workLanguage', finalWorkLanguage);

  formData.append(
    'title',
    profileForApi?.title ||
      activeProfile?.title ||
      'Kontrola originality',
  );

  formData.append(
    'author',
    (profileForApi as any)?.author ||
      (activeProfile as any)?.author ||
      '',
  );

  formData.append(
    'authorName',
    (profileForApi as any)?.authorName ||
      (profileForApi as any)?.author ||
      (activeProfile as any)?.authorName ||
      (activeProfile as any)?.author ||
      '',
  );

  formData.append(
    'school',
    (profileForApi as any)?.school ||
      (activeProfile as any)?.school ||
      '',
  );

  formData.append(
    'faculty',
    (profileForApi as any)?.faculty ||
      (activeProfile as any)?.faculty ||
      '',
  );

  formData.append(
    'studyProgram',
    (profileForApi as any)?.studyProgram ||
      (activeProfile as any)?.studyProgram ||
      '',
  );

  formData.append(
    'supervisor',
    profileForApi?.supervisor ||
      activeProfile?.supervisor ||
      '',
  );

  formData.append(
    'workType',
    getWorkType(profileForApi),
  );

  formData.append(
    'citationStyle',
    getCitationStyle(profileForApi),
  );

  formData.append('checkAuthenticity', 'true');

  if (profileForApi?.id) {
    formData.append('profileId', profileForApi.id);
    formData.append('projectId', profileForApi.id);
  }

  attachedFiles.forEach((item) => {
    if (!item.file) return;
    formData.append('files', item.file, item.name || item.file.name);
  });

  let protocolWindow: Window | null = null;

  try {
    localStorage.removeItem(ORIGINALITY_PROTOCOL_STORAGE_KEY);
    sessionStorage.removeItem(ORIGINALITY_PROTOCOL_STORAGE_KEY);

    protocolWindow = window.open(
      '/originality/protocol?loading=1',
      '_blank',
      'width=1300,height=900,noopener,noreferrer',
    );
  } catch {
    protocolWindow = null;
  }

  const res = await fetch('/api/originality', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await readApiErrorResponse(res));
  }

  const data = await res.json();

  if (!data || data.ok === false) {
    throw new Error(
      data?.message ||
        data?.error ||
        'Kontrola originality nevrátila platný výsledok.',
    );
  }

  const protocolPayload = {
    ...data,
    result: data,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  localStorage.setItem(
    ORIGINALITY_PROTOCOL_STORAGE_KEY,
    JSON.stringify(protocolPayload),
  );

  sessionStorage.setItem(
    ORIGINALITY_PROTOCOL_STORAGE_KEY,
    JSON.stringify(protocolPayload),
  );

  const similarityScore =
    data?.score ??
    data?.similarityRiskScore ??
    data?.similarityScore ??
    data?.percent ??
    data?.overallPercent ??
    'neuvedené';

  const output = cleanFinalOutput(
    [
      'Kontrola originality bola dokončená.',
      '',
      `Percento podobnosti: ${
        typeof similarityScore === 'number'
          ? `${similarityScore.toFixed(2).replace('.', ',')}%`
          : similarityScore
      }`,
      '',
      data?.summary || '',
      '',
      data?.recommendation || '',
      '',
      'Kompletný vizuálny protokol s grafmi, histogramom, tabuľkami a pasážami bol otvorený na samostatnej podstránke.',
    ].join('\n'),
  );

  setResult(output);
  setCanvasText(output);

  await saveHistoryItem({
    module: 'originality',
    title: 'Kontrola originality',
    userMessage: input || 'Kontrola originality z nahraného dokumentu.',
    assistantMessage: output,
    result: {
      originality: data,
      profileTitle: activeProfile?.title || '',
      profileId: activeProfile?.id || null,
      attachedFiles: attachedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    },
  });

  const protocolUrl = `/originality/protocol?ts=${Date.now()}`;

  if (protocolWindow && !protocolWindow.closed) {
    protocolWindow.location.href = protocolUrl;
    protocolWindow.focus();
  } else {
    window.open(
      protocolUrl,
      '_blank',
      'width=1300,height=900,noopener,noreferrer',
    );
  }

  setTimeout(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 150);

  return;
}

    const prompt = buildModulePrompt();

// ================= HUMANIZÁCIA TEXTU =================
if (activeModule === 'humanizer') {
  const textToHumanize = input.trim();

  if (!textToHumanize) {
    alert('Najprv vlož text, ktorý chceš humanizovať.');
    return;
  }

  if (textToHumanize.length < 20) {
    alert('Text na humanizáciu musí mať aspoň 20 znakov.');
    return;
  }

  const systemLanguage = getStoredSystemLanguage();
  persistSystemLanguage(systemLanguage);

  const res = await fetch('/api/humanizer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({
      text: textToHumanize,
      language: systemLanguage,
      outputLanguage: systemLanguage,
      profile: activeProfile || null,
    }),
  });

  if (!res.ok) {
    throw new Error(await readApiErrorResponse(res));
  }

  const data = await res.json();

  if (!data?.ok) {
    throw new Error(
      data?.message || data?.error || 'Humanizácia textu zlyhala.',
    );
  }

  const output = cleanFinalOutput(
    data.humanizedText || data.output || data.text || '',
  );

  if (!output) {
    throw new Error('Humanizátor nevrátil žiadny text.');
  }

  setResult(output);
  setCanvasText(output);

  try {
    localStorage.setItem('latest_generated_work_text', output);
    localStorage.setItem('last_ai_output', output);
  } catch {
    // localStorage nemusí byť dostupný
  }

  await saveHistoryItem({
    module: 'humanizer',
    title: 'Humanizácia textu',
    userMessage: textToHumanize,
    assistantMessage: output,
    result: {
      profileTitle: activeProfile?.title || '',
      profileId: activeProfile?.id || null,
    },
  });

  setTimeout(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 150);

  return;
}

    // ================= OBHAJOBA =================
    if (activeModule === 'defense') {
      const formData = new FormData();

      const systemLanguage = getStoredSystemLanguage();
      persistSystemLanguage(systemLanguage);

      const profileForApi = prepareProfileForApi(
  activeProfile,
  systemLanguage,
);

const finalWorkLanguage = getWorkLanguage(profileForApi);

      const fallbackSummary = [
        profileForApi?.annotation,
        profileForApi?.goal,
        profileForApi?.problem,
        profileForApi?.methodology,
        profileForApi?.hypotheses,
        profileForApi?.researchQuestions,
        profileForApi?.practicalPart,
        profileForApi?.scientificContribution,
      ]
        .filter(Boolean)
        .join('\n\n');

      formData.append(
        'title',
        profileForApi?.title ||
          activeProfile?.title ||
          'Obhajoba záverečnej práce',
      );

      formData.append('summary', input.trim() || fallbackSummary);

      formData.append(
        'defenseType',
        profileForApi?.type ||
          profileForApi?.schema?.label ||
          'Záverečná práca',
      );

      formData.append('activeProfile', JSON.stringify(profileForApi || null));
      formData.append('profile', JSON.stringify(profileForApi || null));

formData.append(
  'profileSnapshot',
  JSON.stringify({
    id: profileForApi?.id || null,
    title: profileForApi?.title || '',
    topic: profileForApi?.topic || '',
    type: getWorkType(profileForApi),
    expertise: getExpertise(profileForApi),
    workLanguage: getWorkLanguage(profileForApi),
    citation: getCitationStyle(profileForApi),
  }),
);



      formData.append('language', finalWorkLanguage);
formData.append('outputLanguage', finalWorkLanguage);
formData.append('systemLanguage', systemLanguage);
formData.append('interfaceLanguage', systemLanguage);
formData.append('workLanguage', finalWorkLanguage);

      if (profileForApi?.id) {
        formData.append('projectId', profileForApi.id);
      }

      attachedFiles.forEach((item) => {
        if (!(item.file instanceof File)) return;

        formData.append('reviews', item.file, item.name || item.file.name);
        formData.append('files', item.file, item.name || item.file.name);
      });

      const res = await fetch('/api/defense', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readApiErrorResponse(res));
      }

      const data = await res.json();

      if (!data || data.ok === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            'Obhajoba nevrátila platný výsledok.',
        );
      }

      const output =
        data.textOutput ||
        (Array.isArray(data.slides)
          ? data.slides
              .map((slide: any, index: number) => {
                const bullets = Array.isArray(slide.bullets)
                  ? slide.bullets.map((item: string) => `- ${item}`).join('\n')
                  : '';

                return [
                  `Snímka ${index + 1}: ${slide.title || 'Bez názvu'}`,
                  bullets,
                  slide.speakerNotes
                    ? `Poznámky k vystúpeniu: ${slide.speakerNotes}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n');
              })
              .join('\n\n')
          : '');

      const cleaned = stripModuleExtraSections(
        output || 'Obhajoba bola vytvorená, ale neobsahuje textový výstup.',
        'defense',
      );

      setResult(cleaned);
      setCanvasText(cleaned);

      try {
        localStorage.setItem('latest_generated_work_text', cleaned);
        localStorage.setItem('last_ai_output', cleaned);
      } catch {
        // localStorage nemusí byť dostupný
      }

      await saveHistoryItem({
        module: 'defense',
        title: 'Obhajoba práce',
        userMessage: input || 'Obhajoba vytvorená podľa profilu práce.',
        assistantMessage: cleaned,
        result: {
          profileTitle: activeProfile?.title || '',
          profileId: activeProfile?.id || null,
          attachedFiles: attachedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);

      return;
    }

    // ================= BEŽNÉ MODULY =================
    const apiMessages = [
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const formData = new FormData();

    const systemLanguage = getStoredSystemLanguage();
    persistSystemLanguage(systemLanguage);

    const profileForApi = prepareProfileForApi(
  activeProfile,
  systemLanguage,
);

const finalWorkLanguage = getWorkLanguage(profileForApi);

    formData.append('agent', agent);
    formData.append('module', activeModule);

    formData.append('language', finalWorkLanguage);
formData.append('outputLanguage', finalWorkLanguage);
formData.append('systemLanguage', systemLanguage);
formData.append('interfaceLanguage', systemLanguage);
formData.append('workLanguage', finalWorkLanguage);

    formData.append('messages', JSON.stringify(apiMessages));
    formData.append('profile', JSON.stringify(profileForApi || null));

formData.append(
  'profileSnapshot',
  JSON.stringify({
    id: profileForApi?.id || null,
    title: profileForApi?.title || '',
    topic: profileForApi?.topic || '',
    type: getWorkType(profileForApi),
    expertise: getExpertise(profileForApi),
    workLanguage: getWorkLanguage(profileForApi),
    citation: getCitationStyle(profileForApi),
  }),
);


    formData.append('useSemanticScholar', 'false');
    formData.append('sourceMode', 'uploaded_documents_first');
    formData.append('validateAttachmentsAgainstProfile', 'true');
    formData.append('requireSourceList', 'true');

    formData.append('allowAiKnowledgeFallback', 'true');
    formData.append('extractUploadedText', 'true');
    formData.append('useExtractedTextFirst', 'true');
    formData.append('returnExtractedFilesInfo', 'true');

    formData.append('contextaCitationFormat', 'false');
    formData.append(
      'filesMetadata',
      JSON.stringify(
        attachedFiles.map((item) => ({
          name: item.name,
          size: item.size,
          type: item.type,
          extension: getFileExtension(item.name),
        })),
      ),
    );

    if (profileForApi?.id) {
      formData.append('projectId', profileForApi.id);
    }

    attachedFiles.forEach((item) => {
      if (item.file instanceof File) {
        formData.append('files', item.file, item.name || item.file.name);
      }
    });

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(await readApiErrorResponse(res));
    }

    const contentType = res.headers.get('content-type') || '';

    let fullText = '';

    if (contentType.includes('application/json')) {
      const data = await res.json();

      fullText =
        data.output ||
        data.result ||
        data.message ||
        data.text ||
        data.answer ||
        '';

      if (!fullText && data.ok === false) {
        throw new Error(data.message || data.error || 'API nevrátilo výstup.');
      }
    } else {
      if (!res.body) {
        throw new Error('API nevrátilo odpoveď.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setResult(stripModuleExtraSections(fullText, activeModule));
      }
    }

    let cleaned = stripModuleExtraSections(fullText, activeModule);

    if (activeModule === 'planning') {
      cleaned = cleanFinalOutput(
        [
          'Predbežný orientačný harmonogram',
          '',
          'Upozornenie: Tento plán je len predbežný a orientačný. Nejde o záväzný termínový plán. Termíny je potrebné priebežne upravovať podľa reálneho stavu práce.',
          '',
          cleaned,
        ].join('\n'),
      );
    }

    cleaned = stripModuleExtraSections(cleaned, activeModule);

    setResult(cleaned);
    setCanvasText(cleaned);

    try {
      localStorage.setItem('latest_generated_work_text', cleaned);
      localStorage.setItem('last_ai_output', cleaned);
    } catch {
      // localStorage nemusí byť dostupný v niektorých režimoch prehliadača
    }

    await saveHistoryItem({
      module: activeModule,
      title: activeModuleResultTitle,
      userMessage: input || secondaryInput || 'Bez textového zadania.',
      assistantMessage: cleaned,
      result: {
        profileTitle: activeProfile?.title || '',
        profileId: activeProfile?.id || null,
        attachedFiles: attachedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      },
    });

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nastala chyba pri spracovaní požiadavky.';

    setResult(`Chyba:\n${cleanFinalOutput(message)}`);
  } finally {
    setIsLoading(false);
  }
}
  
const downloadPdf = () => {
  const text = stripModuleExtraSections(canvasText || result, activeModule);

  if (!text.trim()) {
    alert('Najprv vygenerujte výstup, až potom je možné vytvoriť PDF.');
    return;
  }

  const title =
    activeModule === 'defense'
      ? 'Prezentácia, sprievodný text a obhajoba'
      : exportTitle || 'ZEDPERA výstup';

  const html = createDocHtml(title, text);

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Prehliadač zablokoval otvorenie PDF okna. Povoľte vyskakovacie okná.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};


  const downloadDoc = () => {
    const text = stripModuleExtraSections(canvasText || result, activeModule);

    if (!text.trim()) return;

    const fileBase = sanitizeFileName(exportTitle);
    const html = createDocHtml(exportTitle, text);

    downloadBlob({
      content: html,
      fileName: `${fileBase}.doc`,
      mimeType: 'application/msword;charset=utf-8',
    });
  };

const downloadAnalysisExport = async (format: 'word' | 'pdf' | 'xlsx') => {
  if (!analysisResult) {
    alert('Najskôr musí byť vytvorený výsledok analýzy.');
    return;
  }

  try {
    const response = await fetch('/api/analyze-data/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format,
        title: analysisResult.title || 'Výsledky analýzy dát',
        result: analysisResult,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Export analýzy sa nepodarilo vytvoriť.');
    }

    const blob = await response.blob();

    const extension =
      format === 'word' ? 'doc' : format === 'pdf' ? 'pdf' : 'xlsx';

    const fileName = `vysledky-analyzy-dat.${extension}`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('EXPORT_ANALYSIS_ERROR:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa exportovať výsledky analýzy.',
    );
  }
};

const downloadExcel = () => {
  const text = stripModuleExtraSections(canvasText || result || '', activeModule);

  if (!text.trim()) {
    alert('Nie je čo exportovať do Excelu.');
    return;
  }

  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      poradie: index + 1,
      text: line,
    }));

  const escapeCell = (value: string | number) => {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csv = [
    ['Poradie', 'Text'].map(escapeCell).join(';'),
    ...rows.map((row) =>
      [row.poradie, row.text].map(escapeCell).join(';'),
    ),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${activeModule || 'zedpera'}-vystup.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};


 const downloadPpt = async () => {
  const text = stripModuleExtraSections(canvasText || result, activeModule);

  if (!text.trim()) {
    alert('Najprv vygenerujte obhajobu alebo výstup, až potom je možné stiahnuť PPTX.');
    return;
  }

  const pptTitle =
    activeProfile?.title ||
    activeProfile?.topic ||
    'Obhajoba záverečnej práce';

  const defenseType =
    activeProfile?.type ||
    activeProfile?.schema?.label ||
    'Obhajoba záverečnej práce';

  const slides = [
    {
      title: pptTitle,
      layout: 'section',
      bullets: [
        defenseType,
        activeProfile?.field || 'Odbor je potrebné doplniť',
        activeProfile?.topic || 'Téma práce je potrebné doplniť',
      ],
      speakerNotes:
        'Na úvod stručne predstavte názov práce, odbor, typ práce a dôvod výberu témy.',
      visualSuggestion:
        'Titulný slide s názvom práce a moderným akademickým pozadím.',
    },
    {
      title: 'Význam a aktuálnosť témy',
      layout: 'bullets',
      bullets: [
        activeProfile?.annotation ||
          'Téma je významná z odborného alebo praktického hľadiska.',
        'Práca reaguje na konkrétny problém v danej oblasti.',
        'Zvolená téma má priamu väzbu na odbor a prax.',
      ],
      speakerNotes:
        'Vysvetlite, prečo je téma dôležitá a aký problém práca rieši.',
      visualSuggestion: 'Schéma kontextu témy alebo karta s problémom.',
    },
    {
      title: 'Cieľ práce',
      layout: 'quote',
      bullets: [
        activeProfile?.goal ||
          'Cieľ práce je potrebné doplniť podľa finálneho zadania.',
      ],
      speakerNotes:
        'Cieľ povedzte jasne, jednou až dvomi vetami.',
      visualSuggestion: 'Veľká karta s hlavným cieľom práce.',
    },
    {
      title: 'Výskumný problém, otázky a hypotézy',
      layout: 'split',
      bullets: [
        activeProfile?.problem ||
          activeProfile?.researchQuestions ||
          'Výskumný problém alebo výskumné otázky je potrebné doplniť.',
        activeProfile?.hypotheses ||
          'Hypotézy je potrebné doplniť, ak boli súčasťou práce.',
        'Otázky a hypotézy majú byť prepojené s cieľom práce.',
      ],
      speakerNotes:
        'Ukážte, čo práca skúmala, overovala alebo analyzovala.',
      visualSuggestion: 'Dvojstĺpcové rozloženie: otázky a hypotézy.',
    },
    {
      title: 'Teoretické východiská',
      layout: 'bullets',
      bullets: [
        'Teoretická časť vysvetľuje hlavné pojmy a odborné súvislosti.',
        'Použité zdroje vytvárajú základ pre praktickú alebo analytickú časť.',
        'Teória je prepojená s cieľom a riešeným problémom práce.',
      ],
      speakerNotes:
        'Nevymenúvajte celú teóriu. Vyberte iba pojmy dôležité pre cieľ práce.',
      visualSuggestion: 'Schéma hlavných pojmov alebo konceptov.',
    },
    {
      title: 'Metodológia práce',
      layout: 'bullets',
      bullets: [
        activeProfile?.methodology ||
          'Metodologický postup je potrebné doplniť podľa finálnej práce.',
        'Metódy boli zvolené podľa cieľa a charakteru skúmanej témy.',
        'Postup spracovania má umožniť zodpovedať výskumné otázky alebo overiť hypotézy.',
      ],
      speakerNotes:
        'Vysvetlite, ako bola práca spracovaná a prečo boli zvolené dané metódy.',
      visualSuggestion: 'Procesná schéma krokov metodiky.',
    },
    {
      title: 'Praktická časť práce',
      layout: 'bullets',
      bullets: [
        activeProfile?.practicalPart ||
          'Praktická časť je potrebné doplniť podľa obsahu práce.',
        'Táto časť prepája teoretické poznatky s vlastným spracovaním témy.',
        'Dôležité je vysvetliť zdroj dát, postup a spôsob vyhodnotenia.',
      ],
      speakerNotes:
        'Stručne predstavte, čo tvorilo praktickú časť práce.',
      visualSuggestion: 'Karta s dátami, vzorkou alebo postupom.',
    },
    {
      title: 'Hlavné výsledky práce',
      layout: 'chart',
      bullets: [
        'Výsledky je potrebné predstaviť vecne a priamo vo vzťahu k cieľu práce.',
        'Najdôležitejšie zistenia majú byť podložené údajmi alebo argumentáciou.',
        'Výsledky tvoria základ pre diskusiu a odporúčania.',
      ],
      speakerNotes:
        'Pri výsledkoch hovorte konkrétne. Vyberte iba najdôležitejšie zistenia.',
      visualSuggestion: 'Graf alebo tabuľka s najdôležitejšími výsledkami.',
    },
    {
      title: 'Interpretácia výsledkov',
      layout: 'split',
      bullets: [
        'Výsledky je potrebné interpretovať vo vzťahu k cieľu práce.',
        'Diskusia ukazuje, čo zistenia znamenajú pre riešený problém.',
        'Interpretácia prepája výsledky s teoretickými východiskami.',
      ],
      speakerNotes:
        'Neopakujte iba výsledky. Vysvetlite ich význam a dopad.',
      visualSuggestion: 'Porovnanie: výsledok a význam pre prácu.',
    },
    {
      title: 'Prínos práce',
      layout: 'quote',
      bullets: [
        activeProfile?.scientificContribution ||
          'Prínos práce je potrebné pomenovať podľa výsledkov a cieľa práce.',
        'Práca môže byť využiteľná v odbornej praxi alebo ďalšom výskume.',
        'Vlastný prínos autora spočíva v spracovaní, analýze a vyhodnotení témy.',
      ],
      speakerNotes:
        'Zdôraznite, čo práca prináša a komu môžu byť výsledky užitočné.',
      visualSuggestion: 'Dve karty: prínos pre prax a prínos pre odbor.',
    },
    {
      title: 'Limity práce',
      layout: 'bullets',
      bullets: [
        'Každá práca má obmedzenia, ktoré je vhodné pomenovať vecne a odborne.',
        'Limity môžu súvisieť s rozsahom, dátami, vzorkou, metódou alebo dostupnosťou zdrojov.',
        'Ich pomenovanie ukazuje odbornú zrelosť autora.',
      ],
      speakerNotes:
        'Limity nepôsobia negatívne, ak ich vysvetlíte pokojne a odborne.',
      visualSuggestion: 'Tri krátke karty s limitmi práce.',
    },
    {
      title: 'Otázky komisie a pripravené odpovede',
      layout: 'bullets',
      bullets: [
        'Prečo ste si vybrali túto tému?',
        'Ako cieľ práce súvisí s použitou metodológiou?',
        'Aký je hlavný prínos práce?',
        'Aké boli najväčšie limity spracovania?',
        'Ako by bolo možné vo výskume pokračovať?',
      ],
      speakerNotes:
        'Na otázky odpovedajte stručne, priamo a odborne.',
      visualSuggestion: 'Slide s ikonou otázok a odpovedí.',
    },
    {
      title: 'Záver obhajoby',
      layout: 'closing',
      bullets: [
        'Práca sa zamerala na riešenie stanovenej témy a cieľa.',
        'Výsledky poskytujú podklad pre odborné zhodnotenie a odporúčania.',
        'Ďakujem za pozornosť a som pripravený/pripravená odpovedať na otázky.',
      ],
      speakerNotes:
        'Záver má byť krátky, sebavedomý a vecný.',
      visualSuggestion: 'Čistý záverečný slide s poďakovaním.',
    },
  ];

  try {
    const response = await fetch('/api/defense/pptx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: pptTitle,
        workTitle: pptTitle,
        defenseType,
        theme: 'academic',
        slides,
        sourceText: [
          activeProfile ? buildProfileBlock(activeProfile) : '',
          '',
          text,
        ]
          .filter(Boolean)
          .join('\n\n'),
        extractedWorkText: text,
        attachmentText: activeAttachmentText || '',
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await readApiErrorResponse(response);
      throw new Error(errorText || 'PPTX prezentáciu sa nepodarilo vytvoriť.');
    }

    const blob = await response.blob();

    if (!blob || blob.size === 0) {
      throw new Error('Server vrátil prázdny PPTX súbor.');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${sanitizeFileName(pptTitle)}.pptx`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('PPTX_EXPORT_ERROR:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Prezentáciu sa nepodarilo vytvoriť.',
    );
  }
};



  return (
    <>
    <style jsx global>{`
  html,
  body {
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  html {
    background: #f8fafc;
  }

  html.dark {
    background: #050711;
  }

  body {
    background: #f8fafc;
  }

  html.dark body {
    background: #050711;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(139, 92, 246, 0.7)
      rgba(15, 23, 42, 0.12);
  }

  html.dark * {
    scrollbar-color: rgba(139, 92, 246, 0.7)
      rgba(255, 255, 255, 0.06);
  }

  *::-webkit-scrollbar {
    width: 10px;
    height: 8px;
  }

  *::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.08);
    border-radius: 999px;
  }

  html.dark *::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.06);
  }

  *::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.75);
    border-radius: 999px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(168, 85, 247, 0.95);
  }

  .no-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .no-scrollbar::-webkit-scrollbar {
    width: 0 !important;
    height: 0 !important;
    display: none !important;
  }
`}</style>

    <main className="flex min-h-screen w-full bg-slate-50 text-slate-950 transition-colors duration-300 dark:bg-[#050711] dark:text-white">
        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
         <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-[#050711]/95 px-4 py-4 backdrop-blur-xl md:px-8">
  <div className="flex flex-col gap-4">
    {/* DESKTOP MENU */}
    <div className="hidden flex-wrap items-center gap-2 xl:flex">
      {moduleInfos.map((item) => {
        const active = activeModule === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => selectDashboardModule(item.key)}
            className={`inline-flex min-h-[56px] items-center justify-center rounded-2xl border px-6 py-3 text-sm font-black transition ${
              active
                ? 'border-violet-400/40 bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                : 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            {t.dashboardTools.tools[item.translationKey]}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => router.push('/projects?new=1')}
        className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-500"
      >
        <FileText className="h-4 w-4" />
        Nová práca
      </button>

      <button
        type="button"
        onClick={() => router.push('/projects')}
        className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-300 shadow-sm transition hover:bg-white/[0.1] hover:text-white"
      >
        <BookOpen className="h-4 w-4" />
        Moje práce
      </button>

      <button
        type="button"
        onClick={() => router.push('/video')}
        className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 shadow-sm transition hover:bg-cyan-500/20"
      >
        <Presentation className="h-4 w-4" />
        Videonávody
      </button>

      <div className="shrink-0">
        <ThemeToggleButton />
      </div>
    </div>

    {/* MOBILE MENU */}
    <MobileDashboardNavigation
      activeModule={activeModule}
      activeModuleLabel={activeModuleLabel}
      activeModuleSubtitle={activeModuleCardSubtitle}
      activeProfileTitle={
        activeProfile?.title ||
        activeProfile?.topic ||
        'Nie je vybraná žiadna práca'
      }
      activeProfileType={
        activeProfile?.type ||
        activeProfile?.schema?.label ||
        ''
      }
      moduleInfos={moduleInfos}
      t={t}
      onSelectModule={(moduleKey) =>
        selectDashboardModule(moduleKey as ModuleKey)
      }
      onNavigate={(path) => {
        setMobileMenuOpen(false);
        setMobileModuleMenuOpen(false);
        router.push(path);
      }}
    />
  </div>
</header>

{activeModule === 'planning' && (

                  <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    Dnešný dátum: {getTodaySkDate()}.
                  </div>
                )}

          
{activeModule === 'translation' && (
  <div className="mb-5 rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">
    <div className="mb-4 flex items-center gap-2">
      <Languages className="h-5 w-5 text-sky-200" />
      <h3 className="text-lg font-black text-white">
        {activeModuleLabel}
      </h3>
    </div>

    <div className="grid grid-cols-1 gap-5">
  <ClickableOptionGroup<LanguageCode>
    label={selectorTranslations.translationFrom || 'Source language'}
    value={translationFrom}
    options={languageSelectOptions}
    onChange={setTranslationFrom}
  />

  <ClickableOptionGroup<LanguageCode>
    label={selectorTranslations.translationTo || 'Target language'}
    value={translationTo}
    options={languageSelectOptions}
    onChange={setTranslationTo}
  />

  <ClickableOptionGroup<TranslationStyle>
    label={selectorTranslations.translationStyle || 'Translation style'}
    value={translationStyle}
    options={translationStyleOptions}
    onChange={setTranslationStyle}
  />
</div>

  </div>
)}

{activeModule === 'emails' && (
  <div className="mb-5 rounded-3xl border border-pink-400/20 bg-pink-500/10 p-4">
    <div className="mb-4 flex items-center gap-2">
      <Mail className="h-5 w-5 text-pink-200" />
      <h3 className="text-lg font-black text-white">
        {activeModuleLabel}
      </h3>
    </div>

   <div className="grid grid-cols-1 gap-5">
  <ClickableOptionGroup<EmailType>
    label={selectorTranslations.emailType || 'Email type'}
    value={emailType}
    options={emailTypeOptions}
    onChange={setEmailType}
  />

  <ClickableOptionGroup<EmailTone>
    label={selectorTranslations.emailTone || 'Email tone'}
    value={emailTone}
    options={emailToneOptions}
    onChange={setEmailTone}
  />
</div>
  </div>
)}

<div className={String(activeModuleInfo.infoClassName)}>
  {activeModuleIntro}
</div>

                {(activeModule === 'supervisor' ||
                  activeModule === 'quality' ||
                  activeModule === 'defense' ||
                  activeModule === 'data' ||
                  activeModule === 'originality') && (
                  <FileUploadBox
                    files={attachedFiles}
                    fileInputRef={fileInputRef}
                    onFiles={handleFiles}
                    onRemove={removeFile}
                  />
                )}

<div className="mt-4">
  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-300">
    {activeModuleInputLabel}
  </label>

  <p className="mb-3 text-xs font-semibold leading-5 text-slate-400">
    {activeModuleInputHelp}
  </p>

  <textarea
    value={input}
    onChange={(event) => setInput(event.target.value)}
    placeholder={activeModulePlaceholder}
    className="min-h-[190px] w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm leading-7 text-slate-950 outline-none placeholder:text-slate-400 transition-colors duration-300 focus:border-violet-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500"
  />

{activeModule === 'data' && (
  <p className="mt-2 text-xs text-slate-400">
    Môžete priložiť Excel, CSV, PDF, Word, TXT alebo výstupy z JASP/SPSS. Po spracovaní sa otvorí samostatné okno s výsledkami analýzy, tabuľkami, premennými, grafmi a odporúčanými testami.
  </p>
)}

                <div className="mt-6 grid gap-3 pb-6 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                  {activeModule === 'supervisor' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
{isLoading ? (
  <>
    <RefreshCcw className="h-4 w-4 animate-spin" />
    Spracúvam...
  </>
) : (
  <>
    <Send className="h-4 w-4" />
    {activeModuleButtonLabel}
  </>
)}
</button>
)}

{activeModule === 'quality' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť audit kvality
      </>
    )}
  </button>
)}

{activeModule === 'defense' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-violet-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/40 ring-2 ring-violet-400/40 transition hover:bg-violet-600 hover:ring-violet-300/70 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-60 disabled:shadow-none disabled:ring-0"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Generujem obhajobu...
      </>
    ) : (
      <>
        <Presentation className="h-4 w-4" />
        Vygenerovať sprievodný text prezentácie
      </>
    )}
  </button>
)}


{activeModule === 'data' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť analýzu dát
      </>
    )}
  </button>
)}

{activeModule === 'planning' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť plánovanie
      </>
    )}
  </button>
)}

{activeModule === 'emails' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť email
      </>
    )}
  </button>
)}

{activeModule === 'originality' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť kontrolu originality
      </>
    )}
  </button>
)}

{activeModule === 'humanizer' && (
  <button
    type="button"
    onClick={runModule}
    disabled={isLoading}
    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {isLoading ? (
      <>
        <RefreshCcw className="h-4 w-4 animate-spin" />
        Spracúvam...
      </>
    ) : (
      <>
        <Send className="h-4 w-4" />
        Spustiť humanizáciu textu
      </>
    )}
  </button>
)}

                  <button
                    type="button"
                    onClick={startDictation}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                      isListening
                        ? 'border-red-400/50 bg-red-500 text-white'
                        : 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    Diktovať
                  </button>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 hover:bg-white/[0.1]"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Canvas
                  </button>

                  <button
                    type="button"
                    onClick={resetCurrentModule}
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Vyčistiť
                  </button>

                 {activeModule === 'data' && analysisResult && (
  <button
    type="button"
    onClick={() => setAnalysisModalOpen(true)}
    className="inline-flex items-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100 hover:bg-blue-500/20"
  >
    <Search className="h-4 w-4" />
    Otvoriť výsledky analýzy
  </button>
)}
                </div>
              </div>
<section
  ref={mobileToolPanelRef}
  className="scroll-mt-32 rounded-[28px] border border-white/10 bg-[#070a16] p-5 shadow-2xl shadow-black/30"
>
  <div className="mb-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">
          {activeModuleCardSubtitle}
        </p>

        <h1 className="mt-2 text-2xl font-black text-white">
          {activeModuleCardTitle}
        </h1>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
          {activeModuleCardDescription}
        </p>
      </div>

      <button
        type="button"
        onClick={resetCurrentModule}
        className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-white hover:bg-white/[0.1]"
      >
        Vymazať
      </button>
    </div>
  </div>

  {activeProfile && (
    <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
        Aktívna práca
      </p>

      <p className="mt-2 text-sm font-black text-white">
        {activeProfile.title || activeProfile.topic || 'Bez názvu práce'}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-400">
        {activeProfile.type ||
          activeProfile.schema?.label ||
          'Typ práce nie je vyplnený'}
      </p>
    </div>
  )}

  {activeModule === 'translation' && (
    <div className="mb-5 rounded-3xl border border-sky-400/20 bg-sky-500/10 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Languages className="h-5 w-5 text-sky-200" />
        <h3 className="text-lg font-black text-white">
          {activeModuleLabel}
        </h3>
      </div>

     <div className="grid grid-cols-1 gap-5">
        <ClickableOptionGroup<LanguageCode>
          label={selectorTranslations.translationFrom || 'Source language'}
          value={translationFrom}
          options={languageSelectOptions}
          onChange={setTranslationFrom}
        />

        <ClickableOptionGroup<LanguageCode>
          label={selectorTranslations.translationTo || 'Target language'}
          value={translationTo}
          options={languageSelectOptions}
          onChange={setTranslationTo}
        />

        <ClickableOptionGroup<TranslationStyle>
          label={selectorTranslations.translationStyle || 'Translation style'}
          value={translationStyle}
          options={translationStyleOptions}
          onChange={setTranslationStyle}
        />
      </div>
    </div>
  )}

  {activeModule === 'emails' && (
    <div className="mb-5 rounded-3xl border border-pink-400/20 bg-pink-500/10 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Mail className="h-5 w-5 text-pink-200" />
        <h3 className="text-lg font-black text-white">
          {activeModuleLabel}
        </h3>
      </div>

     <div className="grid grid-cols-1 gap-5">
        <ClickableOptionGroup<EmailType>
          label={selectorTranslations.emailType || 'Email type'}
          value={emailType}
          options={emailTypeOptions}
          onChange={setEmailType}
        />

        <ClickableOptionGroup<EmailTone>
          label={selectorTranslations.emailTone || 'Email tone'}
          value={emailTone}
          options={emailToneOptions}
          onChange={setEmailTone}
        />
      </div>
    </div>
  )}

  <div className={String(activeModuleInfo.infoClassName)}>
    {activeModuleIntro}
  </div>

  {(activeModule === 'supervisor' ||
    activeModule === 'quality' ||
    activeModule === 'defense' ||
    activeModule === 'data' ||
    activeModule === 'originality') && (
    <FileUploadBox
      files={attachedFiles}
      fileInputRef={fileInputRef}
      onFiles={handleFiles}
      onRemove={removeFile}
    />
  )}

  <div className="mt-4">
    <label className="mb-2 block text-sm font-black text-slate-300">
      {activeModuleInputLabel}
    </label>

    <p className="mb-3 text-xs font-semibold leading-5 text-slate-400">
      {activeModuleInputHelp}
    </p>

    <textarea
      value={input}
      onChange={(event) => setInput(event.target.value)}
      placeholder={activeModulePlaceholder}
      className="min-h-[190px] w-full resize-y rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-500 transition-colors duration-300 focus:border-violet-500"
    />

    {activeModule === 'data' && (
      <p className="mt-2 text-xs text-slate-400">
        Môžete priložiť Excel, CSV, PDF, Word, TXT alebo výstupy z JASP/SPSS.
        Po spracovaní sa otvorí samostatné okno s výsledkami analýzy,
        tabuľkami, premennými, grafmi a odporúčanými testami.
      </p>
    )}
  </div>

  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <button
      type="button"
      onClick={runModule}
      disabled={isLoading}
      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? (
        <>
          <RefreshCcw className="h-4 w-4 animate-spin" />
          Spracúvam...
        </>
      ) : (
        <>
          <Send className="h-4 w-4" />
          {activeModuleButtonLabel}
        </>
      )}
    </button>

    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-sm font-black text-white transition hover:bg-white/[0.1]"
    >
      <Paperclip className="h-4 w-4" />
      Priložiť súbor
    </button>

    <button
      type="button"
      onClick={startDictation}
      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-sm font-black text-white transition hover:bg-white/[0.1]"
    >
      <Mic className="h-4 w-4" />
      {isListening ? 'Počúvam...' : 'Diktovať'}
    </button>

    <button
      type="button"
      onClick={() => {
        setCanvasText(result || input || '');
        setCanvasOpen(true);
      }}
      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-sm font-black text-white transition hover:bg-white/[0.1]"
    >
      <Paintbrush className="h-4 w-4" />
      Canvas
    </button>

    {analysisResult && activeModule === 'data' && (
      <button
        type="button"
        onClick={() => setAnalysisModalOpen(true)}
        className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-6 py-4 text-sm font-black text-blue-100 transition hover:bg-blue-500/20"
      >
        <Search className="h-4 w-4" />
        Otvoriť výsledky analýzy
      </button>
    )}
  </div>

  {activeModuleResultHelp && (
    <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
      {activeModuleResultHelp}
    </p>
  )}
</section>
</section>
</main>

{canvasOpen && (
  <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h2 className="text-lg font-black text-white">Canvas</h2>
          <p className="text-sm font-semibold text-slate-400">
            Upravte alebo skopírujte výsledný text.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCanvasOpen(false)}
          className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-white transition hover:bg-white/[0.12]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <textarea
        value={canvasText}
        onChange={(event) => setCanvasText(event.target.value)}
        className="min-h-0 flex-1 resize-none border-0 bg-[#050814] p-6 text-sm font-semibold leading-7 text-white outline-none"
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(canvasText || '');
          }}
          className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.12]"
        >
          Kopírovať
        </button>

        <button
          type="button"
          onClick={() => setCanvasOpen(false)}
          className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
        >
          Zavrieť
        </button>
      </div>
    </div>
  </div>
)}

<AnalysisResultsModal
  open={analysisModalOpen}
  result={analysisResult}
  onClose={() => setAnalysisModalOpen(false)}
/>
</>
);
}

// ================= COMPONENTS =================

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue} className="bg-[#070a16]">
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileUploadBox({
  files,
  fileInputRef,
  onFiles,
  onRemove,
}: {
  files: AttachedFile[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFileAccept}
        multiple
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-slate-200">
            <UploadCloud className="h-4 w-4 text-violet-300" />
            Prílohy
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Nahraj PDF, DOCX, TXT, Excel, CSV, PPT alebo obrázky. Pri analýze
            dát systém otvorí výsledky v samostatnom modálnom okne.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-100 hover:bg-violet-500/20"
        >
          <Paperclip className="h-4 w-4" />
          Priložiť súbor
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100"
            >
              <FileText className="h-4 w-4 shrink-0" />

              <span className="max-w-[240px] truncate font-bold">
                {file.name}
              </span>

              <span className="shrink-0 text-violet-200/70">
                {formatBytes(file.size)}
              </span>

              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="shrink-0 rounded-full p-1 text-violet-100 hover:bg-white/10"
                title="Odstrániť súbor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



