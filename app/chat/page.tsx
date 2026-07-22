'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  languages,
  type AppLanguage,
} from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  FileText,
  GraduationCap,
  Home,
  Library,
  Mic,
  Paintbrush,
  Paperclip,
  PenLine,
  RefreshCcw,
  Send,
  UploadCloud,
  X,
} from 'lucide-react';

// =====================================================
// ARCHITEKTÚRA CHATU
// =====================================================
// Chat stránka je jediný vstupný bod pre AI prácu používateľa:
// 1. prijme prílohy,
// 2. extrahuje text, autorov, citácie a bibliografické kandidáty,
// 3. vytvorí jednotný chatPayload a hlavný pracovný prompt,
// 4. odošle štruktúrovaný kontext do /api/chat.
//
// /api/chat naďalej drží bezpečnostné pravidlá, limity, overovanie zdrojov,
// výber modelu a finálne systémové inštrukcie. Prompt z chat-page je doplnková
// pracovná inštrukcia a nemôže prepísať serverové bezpečnostné pravidlá.
// =====================================================

// ================= TYPES =================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type ChatRouteContext = {
  projectId: string;
  profileId: string;
  agent: Agent | null;
  language: AppLanguage | null;
  interfaceLanguage: AppLanguage | null;
  workLanguage: AppLanguage | null;
  from: string;
};

function isAgent(value: unknown): value is Agent {
  return (
    value === 'openai' ||
    value === 'claude' ||
    value === 'gemini' ||
    value === 'grok' ||
    value === 'mistral'
  );
}

function readChatRouteContext(): ChatRouteContext {
  if (typeof window === 'undefined') {
    return {
      projectId: '',
      profileId: '',
      agent: null,
      language: null,
      interfaceLanguage: null,
      workLanguage: null,
      from: '',
    };
  }

  const params = new URLSearchParams(window.location.search);
  const projectId = String(
    params.get('projectId') || params.get('profileId') || '',
  ).trim();
  const profileId = String(
    params.get('profileId') || params.get('projectId') || '',
  ).trim();

  const rawAgent = params.get('agent');
  const rawLanguage = params.get('language');
  const rawInterfaceLanguage = params.get('interfaceLanguage');
  const rawWorkLanguage = params.get('workLanguage');

  return {
    projectId,
    profileId,
    agent: isAgent(rawAgent) ? rawAgent : null,
    language: isValidAppLanguage(rawLanguage) ? rawLanguage : null,
    interfaceLanguage: isValidAppLanguage(rawInterfaceLanguage)
      ? rawInterfaceLanguage
      : null,
    workLanguage: isValidAppLanguage(rawWorkLanguage)
      ? rawWorkLanguage
      : null,
    from: String(params.get('from') || '').trim(),
  };
}

function findProfileById(
  candidates: Array<SavedProfile | null>,
  projectId: string,
): SavedProfile | null {
  const normalizedId = String(projectId || '').trim();

  if (!normalizedId) {
    return candidates.find(Boolean) || null;
  }

  return (
    candidates.find(
      (candidate) =>
        candidate && String(candidate.id || '').trim() === normalizedId,
    ) || null
  );
}

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AttachmentUsageState = {
  attachmentsUsed: number;
  attachmentsAdded: number;
  lastUploadedAt: string | null;
  trackingAvailable: boolean;
};

type ChatApiPayload = {
  version: '2026-07-21';
  requestId: string;
  module: 'chat';
  agent: Agent;
  projectId: string | null;
  routeContext: ChatRouteContext;
  userInstruction: string;
  mainPrompt: string;
  profile: SavedProfile | null;
  language: AppLanguage;
  citationStyle: string;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
    preparedName: string;
    extractionStatus: PreparedFile['extractionStatus'];
    extractedCharacters: number;
    detectedSourcesCount: number;
    detectedAuthorsCount: number;
    inTextCitationsCount: number;
  }>;
  sourceContext: {
    mode: 'uploaded_documents_first';
    extractedText: string;
    detectedSourcesSummary: string;
    detectedSources: BibliographicCandidate[];
    detectedAuthors: string[];
    inTextCitations: InTextCitation[];
  };
};

type FileProcessingStatus =
  | 'waiting'
  | 'compressing'
  | 'compressed'
  | 'extracting'
  | 'extracted'
  | 'metadata_only'
  | 'ready'
  | 'error';

type InTextCitation = {
  raw: string;
  authorText: string;
  authors: string[];
  year: string;
  key: string;
  count: number;
};

type BibliographicCandidate = {
  raw: string;
  authors: string[];
  year: string | null;
  title: string | null;
  doi: string | null;
  url: string | null;
  sourceType: 'book' | 'article' | 'web' | 'software' | 'unknown';
  citationKey?: string;
  inTextCitations?: InTextCitation[];
  occurrenceCount?: number;
  matchedFromText?: boolean;
};

type ExtractTextApiResponse = {
  ok?: boolean;
  text?: string;
  extractedText?: string;
  content?: string;
  method?: string;
  message?: string;
  error?: string;
  meta?: {
    fileName?: string;
    extension?: string;
    size?: number;
    type?: string | null;
    chars?: number;
    pages?: number | null;
    [key: string]: unknown;
  };
  bibliography?: {
    authors?: string[] | string;
    detectedSources?: BibliographicCandidate[];
    detectedSourcesCount?: number;
    formatted?: string;
    formattedSources?: string;
    sources?: string;
    raw?: string;
    [key: string]: unknown;
  };
  detectedSources?: BibliographicCandidate[];
  authors?: string[] | string;
  formattedSources?: string;
  sources?: string;
};

type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  file: File;
};

type PreparedFile = {
  originalId: string;
  originalName: string;
  originalSize: number;
  originalType: string;
  preparedName: string;
  preparedSize: number;
  preparedType: string;
  compressionMode:
    | 'gzip_original'
    | 'gzip_extracted_text'
    | 'gzip_metadata_only'
    | 'raw_small_text';
  file: File;
  extractedText: string;
  extractionMethod?: string;
  extractionMessage?: string;
  detectedSources: BibliographicCandidate[];
  inTextCitations: InTextCitation[];
  detectedAuthors: string[];
  formattedSources: string;
  extractionStatus:
    | 'client_extracted'
    | 'backend_required'
    | 'metadata_only'
    | 'not_extractable'
    | 'failed';
  warning?: string;
};

type ProcessingLogItem = {
  id: string;
  name: string;
  status: FileProcessingStatus;
  message: string;
  originalSize?: number;
  preparedSize?: number;
  extractedChars?: number;
  detectedSourcesCount?: number;
  detectedAuthorsCount?: number;
  detectedInTextCitationsCount?: number;
  warning?: string;
};

type SavedProfile = {
  id?: string;
  type?: string;
  level?: string;
  title?: string;
  topic?: string;
  field?: string;
  supervisor?: string;
  citation?: string;
citationStyle?: string;


  // hlavný jazyk celého systému
  language?: string;

  // jazyk rozhrania
  interfaceLanguage?: string;

  // jazyk práce, AI chatu a modulov
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

type ParsedResult = {
  output: string;
  analysis: string;
  score: string;
  tips: string;
  sources: string;
};

type SelectedTextState = {
  target: 'result' | 'canvas';
  start: number;
  end: number;
  text: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
    CompressionStream?: any;
  }
}

// ================= CONFIG =================




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

const backendExtractableExtensions = [
  '.docx',
  '.doc',
  '.odt',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.rtf',
  '.md',
  '.csv',
];

const allowedFileAccept = allowedFileExtensions.join(',');

const maxFilesCount = 20;
const maxFileSizeMb = 50;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;
const safeCompressedTargetBytes = 950 * 1024;

const maxClientExtractedCharsPerFile = 25_000;
const maxTotalExtractedContextChars = 60_000;
const maxDetectedSourcesForChat = 120;
const maxDetectedAuthorsForChat = 120;
const maxInTextCitationsForChat = 200;


const defaultAgents: { key: Agent; label: string }[] = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'openai', label: 'OPEN AI' },
  { key: 'claude', label: 'Claude' },
  { key: 'mistral', label: 'Mistral' },
  { key: 'grok', label: 'Grok' },
];

const suggestions: {
  title: string;
  action: string;
  icon: any;
}[] = [
  {
    title: 'Navrhni mi úvod mojej práce',
    action: 'intro',
    icon: PenLine,
  },
  {
    title: 'Napíš mi abstrakt',
    action: 'abstract',
    icon: BookOpen,
  },
  {
    title: 'Navrhni štruktúru kapitol',
    action: 'chapters',
    icon: GraduationCap,
  },
  {
    title: 'Napíš návrh kapitoly',
    action: 'chapter-draft',
    icon: FileText,
  },
  {
    title: 'Spracuj zdroje a citácie',
    action: 'sources-and-citations',
    icon: Library,
  },
  {
    title: 'Prepíš text akademicky',
    action: 'academic-rewrite',
    icon: BookOpen,
  },
];

// ================= BASIC HELPERS =================

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function isAllowedUploadFile(file: File) {
  return allowedFileExtensions.includes(getFileExtension(file.name));
}

function isPdfFile(fileName: string) {
  return getFileExtension(fileName) === '.pdf';
}

function isTextExtractableFile(fileName: string) {
  if (isPdfFile(fileName)) return true;
  return backendExtractableExtensions.includes(getFileExtension(fileName));
}

function getFileKindLabel(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === '.pdf') return 'PDF';

  if (['.doc', '.docx', '.txt', '.rtf', '.odt', '.md'].includes(extension)) {
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

function cleanAiOutput(text: string) {
  return String(text || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\u0000/g, '')
    .replace(/[ŢȚ]/g, 'Ž')
    .replace(/[ţț]/g, 'ž')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeForMatch(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isChapterLikeRequest(value: string) {
  const normalized = normalizeForMatch(value);

  return (
    /\bkapitola\s+\d+(?:\.\d+)*\b/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)*\s*[\.:]\s*[a-z]/i.test(normalized) ||
    normalized.includes('uvod') ||
    normalized.includes('sablona') ||
    normalized.includes('sablona vyssie') ||
    normalized.includes('rovnaky zdroj') ||
    normalized.includes('musi to byt v takomto tvare') ||
    normalized.includes('identicka struktura') ||
    normalized.includes('text zo zedpery') ||
    normalized.includes('uprav kapitolu') ||
    normalized.includes('vytvor kapitolu') ||
    normalized.includes('pouzity zdroj pre kapitolu') ||
    normalized.includes('pouzita literatura pre kapitolu')
  );
}

function normalizeSectionHeading(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^=+/g, '')
    .replace(/=+$/g, '')
    .replace(/^#+/g, '')
    .replace(/:$/g, '')
    .replace(/^[\d.)\s-]+/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSections(text: string): ParsedResult {
  const cleanedText = cleanAiOutput(text);
  const lines = cleanedText.split('\n');

  const mainSectionNames = [
    'VÝSTUP',
    'ANALÝZA',
    'SKÓRE',
    'ODPORÚČANIA',
    'POUŽITÉ ZDROJE A AUTORI',
    'POUŽITÉ ZDROJE',
    'ZDROJE A AUTORI',
    'ZDROJE',
    'PRIMÁRNE ZDROJE',
    'PRIMARNE ZDROJE',
    'SEKUNDÁRNE ZDROJE',
    'SEKUNDARNE ZDROJE',
  ];

  const sourceSectionNames = [
    'POUŽITÉ ZDROJE A AUTORI',
    'POUŽITÉ ZDROJE',
    'ZDROJE A AUTORI',
    'ZDROJE',
    'PRIMÁRNE ZDROJE',
    'PRIMARNE ZDROJE',
  ];

  const normalizedMainSectionNames = mainSectionNames.map(normalizeSectionHeading);

  const findLineIndexByHeading = (wantedNames: string[]) => {
    const wanted = wantedNames.map(normalizeSectionHeading);

    for (let i = 0; i < lines.length; i += 1) {
      const normalizedLine = normalizeSectionHeading(lines[i]);

      if (wanted.includes(normalizedLine)) return i;
    }

    return -1;
  };

  const findSection = (wantedNames: string[]) => {
    const startLine = findLineIndexByHeading(wantedNames);

    if (startLine === -1) return '';

    let endLine = lines.length;

    for (let i = startLine + 1; i < lines.length; i += 1) {
      const normalizedLine = normalizeSectionHeading(lines[i]);

      if (normalizedMainSectionNames.includes(normalizedLine)) {
        endLine = i;
        break;
      }
    }

    return cleanAiOutput(lines.slice(startLine + 1, endLine).join('\n'));
  };

  let output = findSection(['VÝSTUP']);
  const analysis = findSection(['ANALÝZA']);
  const score = findSection(['SKÓRE']);
  const tips = findSection(['ODPORÚČANIA']);

  let sources =
    findSection(['POUŽITÉ ZDROJE A AUTORI']) ||
    findSection(['POUŽITÉ ZDROJE']) ||
    findSection(['ZDROJE A AUTORI']) ||
    findSection(['ZDROJE']);

  const primaryIndex = findLineIndexByHeading(['PRIMÁRNE ZDROJE', 'PRIMARNE ZDROJE']);

  if (primaryIndex >= 0) {
    sources = cleanAiOutput(lines.slice(primaryIndex).join('\n'));
  }

  if (!sources) {
    const sourceRegexes = [
      /(?:^|\n)\s*={0,3}\s*prim[aá]rne\s+zdroje\s*={0,3}\s*:?\s*(?:\n|$)/i,
      /(?:^|\n)\s*={0,3}\s*použité\s+zdroje\s+a\s+autori\s*={0,3}\s*:?\s*(?:\n|$)/i,
      /(?:^|\n)\s*={0,3}\s*použité\s+zdroje\s*={0,3}\s*:?\s*(?:\n|$)/i,
      /(?:^|\n)\s*={0,3}\s*zdroje\s+a\s+autori\s*={0,3}\s*:?\s*(?:\n|$)/i,
      /(?:^|\n)\s*={0,3}\s*zdroje\s*={0,3}\s*:?\s*(?:\n|$)/i,
    ];

    for (const regex of sourceRegexes) {
      const match = cleanedText.match(regex);

      if (match && typeof match.index === 'number') {
        sources = cleanAiOutput(cleanedText.slice(match.index + match[0].length));
        break;
      }
    }
  }

  if (!output) {
    const sourceLine = primaryIndex >= 0 ? primaryIndex : findLineIndexByHeading(sourceSectionNames);

    if (sourceLine >= 0) {
      output = cleanAiOutput(lines.slice(0, sourceLine).join('\n'));
    } else {
      output = cleanedText;
    }
  }

  if (sources && output.includes(sources)) {
    output = cleanAiOutput(output.replace(sources, ''));
  }

  return {
    output: cleanAiOutput(output),
    analysis: cleanAiOutput(analysis),
    score: cleanAiOutput(score),
    tips: cleanAiOutput(tips),
    sources: cleanAiOutput(sources),
  };
}

function uniqueArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  );
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

function createFileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
function isValidAppLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'sk' ||
    value === 'cs' ||
    value === 'en' ||
    value === 'de' ||
    value === 'pl' ||
    value === 'hu'
  );
}

function getStoredSystemLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'sk';

  const stored =
    localStorage.getItem('zedpera_language') ||
    localStorage.getItem('zedpera_system_language') ||
    localStorage.getItem('zedpera_work_language') ||
    'sk';

  return isValidAppLanguage(stored) ? stored : 'sk';
}

function withSystemLanguageProfile(
  profile: SavedProfile | null,
  systemLanguage: AppLanguage,
): SavedProfile | null {
  const baseProfile: SavedProfile =
    profile && typeof profile === 'object'
      ? profile
      : {
          language: systemLanguage,
          interfaceLanguage: systemLanguage,
          workLanguage: systemLanguage,
          citation: 'ISO',
          citationStyle: 'ISO',
        };

  const normalized = normalizeProfile(baseProfile);

  if (!normalized) {
    return {
      language: systemLanguage,
      interfaceLanguage: systemLanguage,
      workLanguage: systemLanguage,
      citation: 'ISO',
      citationStyle: 'ISO',
    };
  }

  return {
    ...normalized,

    // Jazyk aplikácie / rozhrania.
    language: systemLanguage,
    interfaceLanguage: systemLanguage,

    // DÔLEŽITÉ:
    // AI chat a generovanie majú ísť podľa aktuálneho jazyka rozhrania,
    // nie podľa starého uloženého jazyka profilu.
    workLanguage: systemLanguage,

    citationStyle: normalizeCitationStyle(
      normalized.citationStyle || normalized.citation,
    ),
    citation: normalizeCitationStyle(
      normalized.citationStyle || normalized.citation,
    ),
  };
}

  

type CitationStyleMode =
  | 'APA'
  | 'HARVARD'
  | 'ISO'
  | 'FOOTNOTE_REFERENCES';

/**
 * Zjednotí všetky historické a lokalizované hodnoty citačnej normy
 * na štyri režimy, ktoré ZEDPERA podporuje v AI chate.
 *
 * Profil práce zostáva jediným zdrojom pravdy. Frontend neposiela vlastnú
 * voľbu mimo profilu, iba bezpečne normalizuje staršie uložené hodnoty.
 */
function getCitationStyleMode(
  value?: string | null,
): CitationStyleMode {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    normalized.includes('referencie pod ciarou') ||
    normalized.includes('poznamky pod ciarou') ||
    normalized.includes('pod ciarou') ||
    normalized.includes('footnote') ||
    normalized.includes('numeric') ||
    normalized.includes('vancouver') ||
    normalized.includes('chicago')
  ) {
    return 'FOOTNOTE_REFERENCES';
  }

  if (
    normalized.includes('harvard') ||
    normalized.includes('harvad')
  ) {
    return 'HARVARD';
  }

  if (normalized.includes('apa')) {
    return 'APA';
  }

  return 'ISO';
}

function normalizeCitationStyle(
  value?: string | null,
): string {
  const mode = getCitationStyleMode(value);

  if (mode === 'APA') return 'APA';
  if (mode === 'HARVARD') return 'HARVARD';
  if (mode === 'FOOTNOTE_REFERENCES') {
    return 'REFERENCIE POD ČIAROU';
  }

  return 'ISO';
}

function buildCitationStyleInstructions(
  citationStyle: string,
): string {
  const mode = getCitationStyleMode(citationStyle);

  if (mode === 'FOOTNOTE_REFERENCES') {
    return [
      'CITAČNÝ REŽIM: REFERENCIE POD ČIAROU.',
      'V texte používaj iba malé referenčné čísla v hranatých zátvorkách: [1], [2], [3].',
      'Každé číslo použité v texte musí označovať presne tú istú položku v záverečnom zozname zdrojov.',
      'Číslovanie musí byť spoločné a priebežné: najprv primárne zdroje, potom sekundárne zdroje.',
      'Nevytváraj autor–rok citácie v okrúhlych zátvorkách.',
    ].join('\n');
  }

  const modeLabel =
    mode === 'APA'
      ? 'APA'
      : mode === 'HARVARD'
        ? 'HARVARD'
        : 'ISO';

  return [
    `CITAČNÝ REŽIM: ${modeLabel}.`,
    'V texte používaj výhradne citačný tvar (Priezvisko, rok).',
    'V texte nepoužívaj referenčné čísla [1], [2], [3].',
    'V záverečných sekciách Primárne zdroje a Sekundárne zdroje nepoužívaj poradové ani referenčné čísla.',
    'Bibliografické záznamy formátuj podľa normy uloženej v profile práce.',
  ].join('\n');
}


function normalizeProfile(raw: any): SavedProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  const source =
    raw.profile && typeof raw.profile === 'object'
      ? {
          ...raw.profile,
          ...raw,
          schema: raw.schema || raw.profile.schema,
        }
      : raw;

  const citationStyle = normalizeCitationStyle(
    source.citationStyle ||
      source.citation ||
      source.citation_style ||
      'ISO',
  );

  return {
    id: source.id || source.profile_id,

    type: source.type || 'bachelor',
    level: source.level || '',
    title:
  source.title ||
  source.profileTitle ||
  source.workTitle ||
  source.name ||
  '',

topic:
  source.topic ||
  source.title ||
  source.profileTitle ||
  source.workTitle ||
  source.name ||
  '',
    field: source.field || '',
    supervisor: source.supervisor || '',

    citation: citationStyle,
    citationStyle,

    language:
      source.language ||
      source.interfaceLanguage ||
      source.interface_language ||
      'sk',

    interfaceLanguage:
      source.interfaceLanguage ||
      source.interface_language ||
      source.language ||
      'sk',

    workLanguage:
      source.workLanguage ||
      source.work_language ||
      source.language ||
      'sk',

    annotation: source.annotation || '',
    goal: source.goal || '',
    problem:
      source.problem ||
      source.researchProblem ||
      source.research_problem ||
      '',

    methodology: source.methodology || '',
    hypotheses: source.hypotheses || '',
    researchQuestions:
      source.researchQuestions ||
      source.research_questions ||
      '',

    practicalPart:
      source.practicalPart ||
      source.practical_part ||
      '',

    scientificContribution:
      source.scientificContribution ||
      source.scientific_contribution ||
      '',

    businessProblem: source.businessProblem || '',
    businessGoal: source.businessGoal || '',
    implementation: source.implementation || '',
    caseStudy: source.caseStudy || '',
    reflection: source.reflection || '',
    sourcesRequirement:
      source.sourcesRequirement ||
      source.sources_requirement ||
      '',

    keywordsList: source.keywordsList || [],
    keywords: source.keywords || [],

    savedAt:
      source.savedAt ||
      source.saved_at ||
      source.updatedAt ||
      source.updated_at ||
      source.createdAt ||
      source.created_at ||
      new Date().toISOString(),

    schema: source.schema || {
      recommendedLength:
        source.recommendedLength ||
        source.recommended_length ||
        '',
      structure:
        source.structure ||
        [],
      requiredSections:
        source.requiredSections ||
        source.required_sections ||
        [],
      aiInstruction:
        source.aiInstruction ||
        source.ai_instruction ||
        '',
    },
  };
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
  const paragraphs = text
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
      font-size: 22pt;
      margin-bottom: 24px;
    }
    p {
      margin: 0 0 12px 0;
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
          data?.reason ||
          data?.code ||
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

async function gzipBlob(blob: Blob): Promise<Blob> {
  const CompressionStreamConstructor = window.CompressionStream;

  if (!CompressionStreamConstructor) return blob;

  const stream = blob.stream().pipeThrough(new CompressionStreamConstructor('gzip'));

  return await new Response(stream).blob();
}

function truncateByChars(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;

  return `${text.slice(0, maxChars)}

[Text bol skrátený pre technický limit.]`;
}

async function createGzipTextFile({
  text,
  fileName,
  targetBytes = safeCompressedTargetBytes,
}: {
  text: string;
  fileName: string;
  targetBytes?: number;
}) {
  let workingText = text;

  for (let i = 0; i < 8; i += 1) {
    const blob = new Blob([workingText], {
      type: 'text/plain;charset=utf-8',
    });

    const gz = await gzipBlob(blob);

    if (gz.size <= targetBytes) {
      return new File([gz], fileName, {
        type: window.CompressionStream ? 'application/gzip' : 'text/plain;charset=utf-8',
      });
    }

    const ratio = Math.max(0.45, targetBytes / Math.max(gz.size, 1));
    const nextLength = Math.max(2000, Math.floor(workingText.length * ratio));
    workingText = truncateByChars(workingText, nextLength);
  }

  const finalText = truncateByChars(workingText, 30_000);
  const finalBlob = new Blob([finalText], {
    type: 'text/plain;charset=utf-8',
  });
  const finalGz = await gzipBlob(finalBlob);

  return new File([finalGz], fileName, {
    type: window.CompressionStream ? 'application/gzip' : 'text/plain;charset=utf-8',
  });
}

// ================= SOURCE DETECTION =================

function normalizeSlovakCitationText(value: string) {
  return String(value || '')
    .replace(/[ŢȚ]/g, 'Ž')
    .replace(/[ţț]/g, 'ž')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCitationKeyPart(value: string) {
  return normalizeSlovakCitationText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\bET\s+AL\.?/g, '')
    .replace(/\bA\s+KOL\.?/g, '')
    .replace(/\bAND\b/g, ' ')
    .replace(/\bA\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAuthorDisplay(value: string) {
  const cleaned = normalizeSlovakCitationText(value)
    .replace(/\bet al\.?/gi, 'et al.')
    .replace(/\ba kol\.?/gi, 'a kol.')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  if (cleaned.includes(',')) {
    return cleaned
      .split(',')
      .map((part) => part.trim())
      .map((part, index) => {
        if (index === 0 && part === part.toUpperCase() && part.length > 2) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }

        return part;
      })
      .join(', ');
  }

  return cleaned
    .split(/\s+/)
    .map((part) => {
      if (part === part.toUpperCase() && part.length > 2) {
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }

      return part;
    })
    .join(' ');
}

function extractAuthorsFromCitationAuthorText(authorText: string) {
  const cleaned = normalizeSlovakCitationText(authorText)
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .trim();

  return uniqueArray(
    cleaned
      .split(/\s*(?:,|;|&|\ba\b|\band\b)\s*/i)
      .map((part) => normalizeAuthorDisplay(part))
      .filter((part) => {
        if (part.length < 2) return false;
        if (/^(et|al|kol)$/i.test(part)) return false;
        if (!/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part)) return false;

        return true;
      }),
  );
}

function buildCitationKey(authors: string[], year: string) {
  const authorKey = authors
    .map((author) => normalizeCitationKeyPart(author))
    .filter(Boolean)
    .join(' ');

  return `${authorKey}|${year}`;
}

function extractInTextCitations(text: string): InTextCitation[] {
  const cleaned = normalizeSlovakCitationText(cleanAiOutput(text));
  const found = new Map<string, InTextCitation>();

  const addCitation = (rawValue: string) => {
    const raw = normalizeSlovakCitationText(rawValue)
      .replace(/^\(/, '')
      .replace(/\)$/, '')
      .trim();

    if (!raw) return;

    const chunks = raw
      .split(/\s*;\s*/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    for (const chunk of chunks) {
      const match =
        chunk.match(/^(.{2,160}?)[,\s]+((?:18|19|20)\d{2}[a-z]?)$/i) ||
        chunk.match(
          /^(.{2,160}?)[,\s]+((?:18|19|20)\d{2}[a-z]?)(?:\s*[,.:].*)?$/i,
        );

      if (!match) continue;

      const authorText = normalizeSlovakCitationText(match[1] || '')
        .replace(/^\s*(pozri|viď|cf\.|see)\s+/i, '')
        .trim();

      const year = String(match[2] || '').trim();

      if (!authorText || !year) continue;

      if (
        /^(vol|no|p|s|str|tab|obr|ročník|číslo)$/i.test(authorText) ||
        authorText.length > 140
      ) {
        continue;
      }

      const authors = extractAuthorsFromCitationAuthorText(authorText);

      if (!authors.length) continue;

      const key = buildCitationKey(authors, year);
      const existing = found.get(key);

      if (existing) {
        existing.count += 1;
        continue;
      }

      found.set(key, {
        raw: `(${authorText}, ${year})`,
        authorText,
        authors,
        year,
        key,
        count: 1,
      });
    }
  };

  const parentheticalRegex = /\(([^()]{2,280}?\b(?:18|19|20)\d{2}[a-z]?(?:[^()]*)?)\)/gi;

  for (const match of cleaned.matchAll(parentheticalRegex)) {
    addCitation(match[1] || '');
  }

  const narrativeRegex =
    /\b([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+(?:\s+(?:a|and)\s+[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+|\s+et\s+al\.?|\s+a\s+kol\.?)?)\s*\(((?:18|19|20)\d{2}[a-z]?)\)/gi;

  for (const match of cleaned.matchAll(narrativeRegex)) {
    const authorText = normalizeSlovakCitationText(match[1] || '');
    const year = String(match[2] || '').trim();
    const authors = extractAuthorsFromCitationAuthorText(authorText);

    if (!authors.length || !year) continue;

    const key = buildCitationKey(authors, year);
    const existing = found.get(key);

    if (existing) {
      existing.count += 1;
      continue;
    }

    found.set(key, {
      raw: `${authorText} (${year})`,
      authorText,
      authors,
      year,
      key,
      count: 1,
    });
  }

  return Array.from(found.values()).sort((a, b) => {
    const byAuthor = a.authorText.localeCompare(b.authorText, 'sk');

    if (byAuthor !== 0) return byAuthor;

    return a.year.localeCompare(b.year);
  });
}

function detectSourceType(line: string): BibliographicCandidate['sourceType'] {
  const lower = line.toLowerCase();

  if (
    lower.includes('[computer software]') ||
    lower.includes('software') ||
    lower.includes('jasp') ||
    lower.includes('spss') ||
    lower.includes('jamovi') ||
    lower.includes('r foundation')
  ) {
    return 'software';
  }

  if (lower.includes('http://') || lower.includes('https://') || lower.includes('www.')) {
    return 'web';
  }

  if (
    lower.includes('doi') ||
    lower.includes('journal') ||
    lower.includes('vol.') ||
    lower.includes('volume') ||
    lower.includes('issue') ||
    lower.includes('časopis') ||
    lower.includes('štúdia') ||
    lower.includes('article')
  ) {
    return 'article';
  }

  if (
    lower.includes('vydavateľ') ||
    lower.includes('publisher') ||
    lower.includes('isbn') ||
    lower.includes('monografia') ||
    lower.includes('book')
  ) {
    return 'book';
  }

  return 'unknown';
}

function extractDoi(line: string) {
  const match = line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match?.[0] || null;
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i);
  return match?.[0] || null;
}

function extractYear(line: string) {
  const match =
    line.match(/\((18|19|20)\d{2}[a-z]?\)/i) ||
    line.match(/\b(18|19|20)\d{2}[a-z]?\b/i) ||
    line.match(/\bn\.d\.\b/i);

  return match?.[0]?.replace(/[()]/g, '') || null;
}

function extractAuthors(line: string) {
  const normalizedLine = normalizeSlovakCitationText(line);
  const beforeYear = normalizedLine.split(/\b(18|19|20)\d{2}[a-z]?\b/i)[0] || '';

  const cleaned = beforeYear
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const authors: string[] = [];

  const surnameInitialRegex =
    /([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-záäčďéíĺľňóôŕšťúýž.' -]{1,60}),\s*((?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.\s*){1,5})/g;

  for (const match of cleaned.matchAll(surnameInitialRegex)) {
    const surname = normalizeAuthorDisplay(match[1] || '');
    const initials = String(match[2] || '').replace(/\s+/g, ' ').trim();

    if (surname) authors.push(`${surname}, ${initials}`.trim());
  }

  if (authors.length > 0) return uniqueArray(authors).slice(0, 20);

  const candidates = cleaned
    .split(/\s*(?:;|&|\ba\b|\band\b)\s*/i)
    .map((part) => normalizeAuthorDisplay(part))
    .filter((part) => {
      if (part.length < 3) return false;
      if (!/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part)) return false;
      if (/^(in|from|retrieved|dostupné|available|vol|no|pp)$/i.test(part)) return false;

      return true;
    });

  return uniqueArray(candidates).slice(0, 20);
}

function extractTitle(line: string) {
  let working = normalizeSlovakCitationText(line.trim());

  working = working.replace(/^[-•\d.)\s]+/, '');
  working = working.replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '');
  working = working.replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, '');

  const quoted =
    working.match(/"([^"]{5,180})"/) ||
    working.match(/„([^“”]{5,180})“/) ||
    working.match(/'([^']{5,180})'/);

  if (quoted?.[1]) return quoted[1].trim();

  const afterYear = working
    .split(/\((18|19|20)\d{2}[a-z]?\)|\b(18|19|20)\d{2}[a-z]?\b/i)
    .pop();

  if (afterYear && afterYear.trim().length > 8) {
    return afterYear
      .replace(/^[).,\s:-]+/, '')
      .split(/\.\s+/)[0]
      .trim()
      .slice(0, 220);
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) return parts[1].slice(0, 220);

  return null;
}

function looksLikeBibliographicLine(line: string) {
  const trimmed = normalizeSlovakCitationText(line.trim());

  if (trimmed.length < 20) return false;

  const hasYear = /\b(18|19|20)\d{2}[a-z]?\b|\bn\.d\.\b/i.test(trimmed);
  const hasDoi = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(trimmed);
  const hasUrl = /https?:\/\/|www\./i.test(trimmed);
  const hasCitationWords =
    /publisher|journal|doi|isbn|vydavateľ|časopis|university|press|jasp|spss|software|available|dostupné|retrieved|vol\.|volume|issue|pages|pp\.|p\.|s\.|in\s/i.test(
      trimmed,
    );
  const hasAuthorPattern =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-záäčďéíĺľňóôŕšťúýž.' -]+,\s*[A-Z]/.test(
      trimmed,
    ) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+\s+\([12]\d{3}\)/.test(
      trimmed,
    );

  return hasDoi || hasUrl || (hasYear && (hasCitationWords || hasAuthorPattern));
}

function extractBibliographicCandidates(text: string) {
  const cleaned = cleanAiOutput(text);

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const joinedMultilineCandidates: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';

    joinedMultilineCandidates.push(current);

    if (current.length < 220 && next) {
      joinedMultilineCandidates.push(`${current} ${next}`.trim());
    }

    if (current.length < 180 && next && next2) {
      joinedMultilineCandidates.push(`${current} ${next} ${next2}`.trim());
    }
  }

  const candidates: BibliographicCandidate[] = [];

  for (const line of joinedMultilineCandidates) {
    if (!looksLikeBibliographicLine(line)) continue;

    const authors = extractAuthors(line);
    const year = extractYear(line);

    candidates.push({
      raw: normalizeSlovakCitationText(line).slice(0, 1000),
      authors,
      year,
      title: extractTitle(line),
      doi: extractDoi(line),
      url: extractUrl(line),
      sourceType: detectSourceType(line),
      citationKey: authors.length && year ? buildCitationKey(authors, year) : undefined,
    });
  }

  return mergeSources(candidates).slice(0, 300);
}

function getSourceCitationKey(source: BibliographicCandidate) {
  if (source.citationKey) return source.citationKey;
  if (!source.authors.length || !source.year) return '';

  return buildCitationKey(source.authors, source.year);
}

function mergeSources(sources: BibliographicCandidate[]) {
  const map = new Map<string, BibliographicCandidate>();

  for (const source of sources) {
    const key =
      getSourceCitationKey(source) ||
      [source.raw?.slice(0, 180), source.doi || '', source.url || '', source.title || '', source.year || '']
        .join('|')
        .toLowerCase();

    const existing = map.get(key);

    if (!existing) {
      map.set(key, source);
      continue;
    }

    map.set(key, {
      ...existing,
      raw: existing.raw.length >= source.raw.length ? existing.raw : source.raw,
      authors: uniqueArray([...existing.authors, ...source.authors]),
      year: existing.year || source.year,
      title:
        existing.title && existing.title !== 'údaj je potrebné overiť'
          ? existing.title
          : source.title,
      doi: existing.doi || source.doi,
      url: existing.url || source.url,
      sourceType: existing.sourceType !== 'unknown' ? existing.sourceType : source.sourceType,
      inTextCitations: [...(existing.inTextCitations || []), ...(source.inTextCitations || [])],
      occurrenceCount: (existing.occurrenceCount || 0) + (source.occurrenceCount || 0),
      matchedFromText: existing.matchedFromText || source.matchedFromText,
    });
  }

  return Array.from(map.values());
}

function pairInTextCitationsWithBibliography({
  citations,
  bibliography,
}: {
  citations: InTextCitation[];
  bibliography: BibliographicCandidate[];
}) {
  const bibliographyByKey = new Map<string, BibliographicCandidate>();

  for (const item of bibliography) {
    const key = getSourceCitationKey(item);

    if (key && !bibliographyByKey.has(key)) bibliographyByKey.set(key, item);
  }

  const result: BibliographicCandidate[] = [];

  for (const citation of citations) {
    const matched = bibliographyByKey.get(citation.key);

    if (matched) {
      result.push({
        ...matched,
        citationKey: citation.key,
        inTextCitations: [...(matched.inTextCitations || []), citation],
        occurrenceCount: (matched.occurrenceCount || 0) + citation.count,
        matchedFromText: true,
      });
      continue;
    }

    result.push({
      raw: citation.raw,
      authors: citation.authors,
      year: citation.year,
      title: null,
      doi: null,
      url: null,
      sourceType: 'unknown',
      citationKey: citation.key,
      inTextCitations: [citation],
      occurrenceCount: citation.count,
      matchedFromText: true,
    });
  }

  for (const item of bibliography) {
    const key = getSourceCitationKey(item);
    const alreadyIncluded = result.some((source) => getSourceCitationKey(source) === key && key);

    if (!alreadyIncluded) result.push(item);
  }

  return mergeSources(result);
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) return 'Neboli automaticky detegované žiadne bibliografické záznamy.';

  return candidates
    .map((item, index) => {
      const citationInfo = item.inTextCitations?.length
        ? `\nCitácie v texte: ${item.inTextCitations
            .map((citation) => citation.raw)
            .join('; ')}\nPočet výskytov v texte: ${
            item.occurrenceCount || item.inTextCitations.length
          }`
        : '';

      return `${index + 1}. Pôvodný záznam:
${item.raw}

Autori: ${item.authors.length ? item.authors.join(', ') : 'neuvedené'}
Rok: ${item.year || 'neuvedené'}
Názov publikácie / zdroja: ${item.title || 'neuvedené'}
Typ zdroja: ${item.sourceType}
DOI: ${item.doi || 'neuvedené'}
URL: ${item.url || 'neuvedené'}${citationInfo}`;
    })
    .join('\n\n');
}

function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueArray(value.map((item) => String(item || '')));

  if (typeof value === 'string') {
    return uniqueArray(
      value
        .split(/\n|,|;|\band\b|\ba\b/gi)
        .map((item) => normalizeAuthorDisplay(item.trim())),
    );
  }

  return [];
}

function normalizeDetectedSources(value: unknown): BibliographicCandidate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => {
      const authors = normalizeAuthors(item?.authors);
      const year = item?.year ? String(item.year) : null;

      return {
        raw: normalizeSlovakCitationText(String(item?.raw || item?.citation || item?.text || '')).trim(),
        authors,
        year,
        title: item?.title ? String(item.title) : null,
        doi: item?.doi ? String(item.doi) : null,
        url: item?.url ? String(item.url) : null,
        sourceType:
          item?.sourceType === 'book' ||
          item?.sourceType === 'article' ||
          item?.sourceType === 'web' ||
          item?.sourceType === 'software' ||
          item?.sourceType === 'unknown'
            ? item.sourceType
            : 'unknown',
        citationKey: authors.length && year ? buildCitationKey(authors, year) : undefined,
      } satisfies BibliographicCandidate;
    })
    .filter((item) => item.raw || item.authors.length || item.title || item.doi || item.url);
}

function extractTextFromExtractApi(data: ExtractTextApiResponse) {
  return cleanAiOutput(String(data.extractedText || data.text || data.content || '').trim());
}

function extractSourcesFromExtractApi(data: ExtractTextApiResponse) {
  const fromBibliography = normalizeDetectedSources(data.bibliography?.detectedSources);
  const fromRoot = normalizeDetectedSources(data.detectedSources);

  return [...fromBibliography, ...fromRoot];
}

function extractAuthorsFromExtractApi(data: ExtractTextApiResponse) {
  const bibliographyAuthors = normalizeAuthors(data.bibliography?.authors);
  const rootAuthors = normalizeAuthors(data.authors);

  return uniqueArray([...bibliographyAuthors, ...rootAuthors]);
}

function extractFormattedSourcesFromExtractApi(data: ExtractTextApiResponse) {
  return cleanAiOutput(
    String(
      data.bibliography?.formatted ||
        data.bibliography?.formattedSources ||
        data.bibliography?.sources ||
        data.bibliography?.raw ||
        data.formattedSources ||
        data.sources ||
        '',
    ),
  );
}

function flattenDetectedSources(preparedFiles: PreparedFile[]) {
  return mergeSources(preparedFiles.flatMap((file) => file.detectedSources || []));
}

function flattenInTextCitations(preparedFiles: PreparedFile[]) {
  const map = new Map<string, InTextCitation>();

  for (const citation of preparedFiles.flatMap((file) => file.inTextCitations || [])) {
    const existing = map.get(citation.key);

    if (existing) {
      existing.count += citation.count;
      continue;
    }

    map.set(citation.key, { ...citation });
  }

  return Array.from(map.values()).sort((a, b) => {
    const byAuthor = a.authorText.localeCompare(b.authorText, 'sk');
    if (byAuthor !== 0) return byAuthor;
    return a.year.localeCompare(b.year);
  });
}

function flattenDetectedAuthors(preparedFiles: PreparedFile[]) {
  return uniqueArray([
    ...preparedFiles.flatMap((file) => file.detectedAuthors || []),
    ...preparedFiles.flatMap((file) =>
      (file.inTextCitations || []).flatMap((citation) => citation.authors),
    ),
    ...preparedFiles.flatMap((file) =>
      (file.detectedSources || []).flatMap((source) => source.authors),
    ),
  ]);
}

function formatInTextCitations(citations: InTextCitation[]) {
  if (!citations.length) return 'Neboli automaticky nájdené žiadne citácie v texte.';

  return citations
    .map((citation, index) => {
      return `${index + 1}. ${citation.raw}
Autori v texte: ${citation.authors.length ? citation.authors.join(', ') : 'neuvedené'}
Rok: ${citation.year || 'neuvedené'}
Počet výskytov: ${citation.count || 1}`;
    })
    .join('\n\n');
}

function buildDetectedSourcesSummary(preparedFiles: PreparedFile[]) {
  if (!preparedFiles.length) {
    return 'Žiadne prílohy neboli pripravené, preto neboli detegované žiadne zdroje.';
  }

  const blocks = preparedFiles.map((file, index) => {
    return `PRÍLOHA ${index + 1}: ${file.originalName}
Stav extrakcie: ${file.extractionStatus}
Metóda extrakcie: ${file.extractionMethod || 'neuvedené'}
Správa extrakcie: ${file.extractionMessage || 'neuvedené'}
Počet citácií nájdených priamo v texte: ${file.inTextCitations?.length || 0}
Počet detegovaných bibliografických kandidátov: ${file.detectedSources?.length || 0}
Autori nájdení v dokumente: ${file.detectedAuthors?.length ? file.detectedAuthors.join(', ') : 'neuvedené'}

CITÁCIE NÁJDENÉ PRIAMO V TEXTE:
${formatInTextCitations(file.inTextCitations || [])}

FORMÁTOVANÉ ZDROJE:
${file.formattedSources || 'neuvedené'}

AUTOMATICKY DETEGOVANÉ BIBLIOGRAFICKÉ KANDIDÁTY:
${formatBibliographicCandidates(file.detectedSources || [])}`;
  });

  return blocks.join('\n\n--------------------\n\n');
}

function formatAllDetectedSources({
  citations,
  sources,
  files,
}: {
  citations: InTextCitation[];
  sources: BibliographicCandidate[];
  files: PreparedFile[];
}) {
  const allAuthors = uniqueArray([
    ...citations.flatMap((item) => item.authors),
    ...sources.flatMap((item) => item.authors),
  ]);

  return `A. Citácie nájdené priamo v texte práce
${formatInTextCitations(citations)}

B. Autori nájdení v dokumentoch
${allAuthors.length ? allAuthors.join(', ') : 'Autori neboli automaticky identifikovaní.'}

C. Formátované bibliografické záznamy a zdroje z literatúry
${formatBibliographicCandidates(sources)}

D. Priložené dokumenty použité ako podklad
${files.length ? files.map((file, index) => `${index + 1}. ${file.originalName}`).join('\n') : 'Neboli priložené žiadne dokumenty.'}`;
}

async function callExtractTextApi({
  file,
  fileName,
  originalName,
  compressed,
}: {
  file: File;
  fileName: string;
  originalName: string;
  compressed: boolean;
}) {
  const formData = new FormData();

  formData.append('file', file, fileName);
  formData.append('fileName', fileName);
  formData.append('originalName', originalName);
  formData.append('isCompressed', compressed ? 'true' : 'false');
  formData.append('mustDecompressBeforeExtraction', compressed ? 'true' : 'false');
  formData.append('detectBibliographicSources', 'true');
  formData.append('requireAuthorsAndPublications', 'true');

  const res = await fetch('/api/extract-text', {
    method: 'POST',
    body: formData,
  });

  const contentType = res.headers.get('content-type') || '';

  let data: ExtractTextApiResponse;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const errorText = await res.text();
    throw new Error(errorText || `Extrakčný endpoint vrátil neplatnú odpoveď ${res.status}.`);
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.message || `Extrakcia zlyhala pre súbor ${originalName}.`);
  }

  const extractedText = extractTextFromExtractApi(data);

  if (!extractedText.trim()) {
    throw new Error(data.message || `Extrakcia prebehla, ale text zo súboru ${originalName} je prázdny.`);
  }

  const apiDetectedSources = extractSourcesFromExtractApi(data);
  const apiAuthors = extractAuthorsFromExtractApi(data);
  const apiFormattedSources = extractFormattedSourcesFromExtractApi(data);
  const inTextCitations = extractInTextCitations(extractedText);
  const localDetectedSources = extractBibliographicCandidates(extractedText);

  const pairedSources = pairInTextCitationsWithBibliography({
    citations: inTextCitations,
    bibliography: mergeSources([...apiDetectedSources, ...localDetectedSources]),
  });

  const mergedSources = mergeSources(pairedSources);

  const mergedAuthors = uniqueArray([
    ...apiAuthors,
    ...inTextCitations.flatMap((citation) => citation.authors),
    ...mergedSources.flatMap((source) => source.authors || []),
  ]);

  return {
    extractedText,
    method: data.method || 'extract-text',
    message: data.message || 'Text bol úspešne extrahovaný.',
    detectedSources: mergedSources,
    inTextCitations,
    detectedAuthors: mergedAuthors,
    formattedSources: apiFormattedSources,
    meta: data.meta || {},
  };
}

// ================= CONTEXT BUILDERS =================

function buildExtractedContext(preparedFiles: PreparedFile[]) {
  const blocks: string[] = [];

  for (const item of preparedFiles) {
    if (!item.extractedText?.trim()) continue;

    blocks.push(`
=== EXTRAHOVANÝ TEXT Z PRÍLOHY ===
Súbor: ${item.originalName}
Pôvodná veľkosť: ${formatBytes(item.originalSize)}
Komprimovaná veľkosť: ${formatBytes(item.preparedSize)}
Stav extrakcie: ${item.extractionStatus}
Metóda extrakcie: ${item.extractionMethod || 'neuvedené'}
Správa extrakcie: ${item.extractionMessage || 'neuvedené'}
Počet citácií nájdených priamo v texte: ${item.inTextCitations?.length || 0}
Počet detegovaných zdrojov: ${item.detectedSources?.length || 0}
Autori nájdení v dokumente: ${item.detectedAuthors.length ? item.detectedAuthors.join(', ') : 'neuvedené'}

CITÁCIE NÁJDENÉ PRIAMO V TEXTE:
${formatInTextCitations(item.inTextCitations || [])}

FORMÁTOVANÉ ZDROJE:
${item.formattedSources || 'neuvedené'}

ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(item.detectedSources || [])}

TEXT PRÍLOHY:
${truncateByChars(item.extractedText, maxClientExtractedCharsPerFile)}
`.trim());
  }

  const full = blocks.join('\n\n');

  return truncateByChars(full, maxTotalExtractedContextChars);
}

function createChatRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `chat-${crypto.randomUUID()}`;
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildMainChatPrompt({
  profile,
  userInstruction,
  attachmentCount,
}: {
  profile: SavedProfile | null;
  userInstruction: string;
  attachmentCount: number;
}) {
  const profileTitle =
    profile?.title ||
    profile?.topic ||
    'neuvedená téma práce';
  const citationStyle = normalizeCitationStyle(
    profile?.citationStyle ||
      profile?.citation ||
      'ISO',
  );

  return [
    'HLAVNÁ PRACOVNÁ INŠTRUKCIA Z CHAT-PAGE:',
    `Spracuj požiadavku používateľa pre aktívny profil „${profileTitle}“.`,
    `Používateľská požiadavka: ${userInstruction || 'Spracuj priložené dokumenty.'}`,
    `Počet odosielaných príloh: ${attachmentCount}.`,
    'Najprv vyťaž údaje, tvrdenia, mená, dátumy, tabuľky, citácie a zdroje z príloh.',
    'Potom doplň iba chýbajúce odborné údaje pomocou overiteľných akademických zdrojov.',
    `Citačná norma z profilu práce: ${citationStyle}.`,
    buildCitationStyleInstructions(citationStyle),
    'Na konci vždy zachovaj samostatné sekcie Primárne zdroje a Sekundárne zdroje.',
    'Nevymýšľaj zdroje, DOI, URL, autorov ani fakty. Neisté údaje jasne označ na overenie.',
    'Výsledok musí nadväzovať na aktívny profil, používateľský príkaz a spracovaný obsah príloh.',
  ].join('\n');
}

// ================= PAGE =================

export default function ChatPage() {
  const router = useRouter();

  // ================= THEME / LIGHT-DARK MODE =================

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('zedpera-theme');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      return;
    }

    // Predvolený režim bude tmavý
    localStorage.setItem('zedpera-theme', 'dark');
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

      localStorage.setItem('zedpera-theme', nextTheme);
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');

      return nextTheme;
    });
  };

  // ================= BASIC STATE =================

  const [language, setLanguage] = useState<AppLanguage>('sk');
  const [agent, setAgent] = useState<Agent>('gemini');
  const [agentsOrder, setAgentsOrder] = useState(defaultAgents);
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);
  const [routeContext, setRouteContext] = useState<ChatRouteContext>(() =>
    readChatRouteContext(),
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ================= FILES / PROCESSING =================

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [processingLog, setProcessingLog] = useState<ProcessingLogItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [attachmentUsage, setAttachmentUsage] = useState<AttachmentUsageState>({
    attachmentsUsed: 0,
    attachmentsAdded: 0,
    lastUploadedAt: null,
    trackingAvailable: true,
  });
  const [isAttachmentUsageLoading, setIsAttachmentUsageLoading] = useState(true);

  // ================= CANVAS =================

  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  // ================= SELECTION / POPUP =================

  const [selectedTextState, setSelectedTextState] = useState<SelectedTextState | null>(null);
  const selectedTextStateRef = useRef<SelectedTextState | null>(null);

  const [popupData, setPopupData] = useState<ParsedResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [isEditingSelection, setIsEditingSelection] = useState(false);

  // ================= REFS =================

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const resultTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ================= MEMO =================

  const activeAgentLabel = useMemo(() => {
    return agentsOrder.find((item) => item.key === agent)?.label || 'Gemini';
  }, [agent, agentsOrder]);


  const exportTitle = useMemo(() => {
    const base = activeProfile?.title || 'Zedpera výstup';
    return base.trim() || 'Zedpera výstup';
  }, [activeProfile]);

  const effectiveProjectId = useMemo(
    () =>
      String(
        activeProfile?.id ||
          routeContext.projectId ||
          routeContext.profileId ||
          '',
      ).trim(),
    [activeProfile?.id, routeContext.profileId, routeContext.projectId],
  );

  const canSubmit =
  !isLoading &&
  (input.trim().length > 0 || attachedFiles.length > 0);


  const refreshAttachmentUsage = useCallback(async () => {
    setIsAttachmentUsageLoading(true);

    try {
      const response = await fetch('/api/attachments/usage', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status !== 401) {
          setAttachmentUsage((current) => ({
            ...current,
            trackingAvailable: false,
          }));
        }
        return;
      }

      const data = await response.json();

      setAttachmentUsage({
        attachmentsUsed: Number(data?.attachmentsUsed || 0),
        attachmentsAdded: Number(data?.attachmentsAdded || 0),
        lastUploadedAt: data?.lastUploadedAt || null,
        trackingAvailable: data?.trackingAvailable !== false,
      });
    } catch (error) {
      console.error('LOAD_ATTACHMENT_USAGE_ERROR:', error);
    } finally {
      setIsAttachmentUsageLoading(false);
    }
  }, []);

  const recordNewAttachmentUploads = useCallback(
    async (items: AttachedFile[]) => {
      if (!items.length) return;

      const requestId = `attachment-upload-${createChatRequestId()}`;
      setIsAttachmentUsageLoading(true);

      try {
        const response = await fetch('/api/attachments/usage', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
          body: JSON.stringify({
            requestId,
            projectId: effectiveProjectId || null,
            module: 'chat',
            items: items.map((item) => ({
              id: item.id,
              name: item.name,
              size: item.size,
              type: item.type,
              uploadedAt: item.uploadedAt,
            })),
          }),
        });

        if (!response.ok) {
          if (response.status !== 401) {
            console.error(
              'ATTACHMENT_USAGE_UPLOAD_HTTP_ERROR:',
              response.status,
            );
          }
          return;
        }

        const data = await response.json();

        setAttachmentUsage({
          attachmentsUsed: Number(data?.attachmentsUsed || 0),
          attachmentsAdded: Number(data?.attachmentsAdded || 0),
          lastUploadedAt: data?.lastUploadedAt || null,
          trackingAvailable: data?.trackingAvailable !== false,
        });
      } catch (error) {
        console.error('ATTACHMENT_USAGE_UPLOAD_ERROR:', error);
      } finally {
        setIsAttachmentUsageLoading(false);
      }
    },
    [effectiveProjectId],
  );

  const applyAttachmentUsageFromResponse = useCallback((response: Response) => {
    const usedHeader = response.headers.get('X-Zedpera-Attachments-Used');
    const addedHeader = response.headers.get('X-Zedpera-Attachments-Added');
    const trackingHeader = response.headers.get('X-Zedpera-Attachment-Tracking');

    if (usedHeader === null && addedHeader === null && trackingHeader === null) return;

    setAttachmentUsage((current) => ({
      ...current,
      attachmentsUsed:
        usedHeader !== null && Number.isFinite(Number(usedHeader))
          ? Number(usedHeader)
          : current.attachmentsUsed,
      attachmentsAdded:
        addedHeader !== null && Number.isFinite(Number(addedHeader))
          ? Number(addedHeader)
          : current.attachmentsAdded,
      trackingAvailable:
        trackingHeader === null
          ? current.trackingAvailable
          : trackingHeader === 'enabled',
    }));
  }, []);

  useEffect(() => {
    void refreshAttachmentUsage();
  }, [refreshAttachmentUsage]);


const saveChatToHistory = async ({
  userMessage,
  assistantMessage,
}: {
  userMessage: string;
  assistantMessage: string;
}) => {
  try {
    const cleanUserMessage = cleanAiOutput(userMessage);
    const cleanAssistantMessage = cleanAiOutput(assistantMessage);

    if (!cleanUserMessage && !cleanAssistantMessage) return;

    const title =
      cleanUserMessage.length > 90
        ? `${cleanUserMessage.slice(0, 90)}...`
        : cleanUserMessage || 'Nový chat';

    const content = `POUŽÍVATEĽ:
${cleanUserMessage}

AI ODPOVEĎ:
${cleanAssistantMessage}`;

    await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'chat',
        title,
        preview: cleanAssistantMessage.slice(0, 250) || cleanUserMessage.slice(0, 250),
        content,
      }),
    });
  } catch (error) {
    console.error('SAVE_CHAT_HISTORY_ERROR:', error);
  }
};

const handleSelectAgent = (nextAgent: Agent) => {
  setAgent(nextAgent);

  setAgentsOrder((current) => {
    const selected = current.find((item) => item.key === nextAgent);
    const others = current.filter((item) => item.key !== nextAgent);

    if (!selected) return current;

    return [selected, ...others];
  });
};

useEffect(() => {
  if (typeof window === 'undefined') return;

  const raw = localStorage.getItem('zedpera_continue_chat_context');

  if (!raw) return;

  try {
    const context = JSON.parse(raw);

    localStorage.removeItem('zedpera_continue_chat_context');

    const userMessage = String(context?.user_message || '').trim();
    const assistantMessage = String(context?.assistant_message || '').trim();
    const createdAt = String(context?.created_at || new Date().toISOString());

    const historyMessages: ChatMessage[] = [];

    if (userMessage) {
      historyMessages.push({
        role: 'user',
        content: userMessage,
      });
    }

    if (assistantMessage) {
      historyMessages.push({
        role: 'assistant',
        content: assistantMessage,
      });
    }

    setMessages((currentMessages) => {
      const alreadyHasSameHistory = currentMessages.some(
        (message) =>
          message.content === userMessage ||
          message.content === assistantMessage,
      );

      if (alreadyHasSameHistory) return currentMessages;

      return [...currentMessages, ...historyMessages];
    });

    // DÔLEŽITÉ:
    // Pri návrate z histórie sa nesmie automaticky spustiť AI.
    // Používateľ musí najprv napísať nový príkaz.
    setInput('');
    setIsLoading(false);
  } catch (error) {
    console.error('LOAD_CHAT_HISTORY_CONTEXT_ERROR:', error);

    localStorage.removeItem('zedpera_continue_chat_context');
    setInput('');
    setIsLoading(false);
  }
}, []);


    


useEffect(() => {
  let cancelled = false;

  const persistProfile = (
    profileValue: SavedProfile | null,
    systemLanguage: AppLanguage,
  ) => {
    if (!profileValue || cancelled) return;

    const withLanguage = withSystemLanguageProfile(
      profileValue,
      systemLanguage,
    );

    if (!withLanguage) return;

    setActiveProfile(withLanguage);
    localStorage.setItem('active_profile', JSON.stringify(withLanguage));
    localStorage.setItem('profile', JSON.stringify(withLanguage));
  };

  const loadProfile = async () => {
    const route = readChatRouteContext();
    setRouteContext(route);

    if (route.agent) {
      handleSelectAgent(route.agent);
    }

    const systemLanguage =
      route.workLanguage ||
      route.interfaceLanguage ||
      route.language ||
      getStoredSystemLanguage();

    setLanguage(systemLanguage);

    localStorage.setItem('zedpera_language', systemLanguage);
    localStorage.setItem('zedpera_system_language', systemLanguage);
    localStorage.setItem('zedpera_work_language', systemLanguage);

    document.documentElement.lang = systemLanguage;
    document.documentElement.setAttribute('data-language', systemLanguage);
    document.documentElement.setAttribute(
      'data-system-language',
      systemLanguage,
    );
    document.documentElement.setAttribute(
      'data-work-language',
      systemLanguage,
    );

    const activeRaw = localStorage.getItem('active_profile');
    const profileRaw = localStorage.getItem('profile');
    const profilesRaw = localStorage.getItem('profiles_full');

    const active = normalizeProfile(safeJsonParse<any>(activeRaw));
    const profile = normalizeProfile(safeJsonParse<any>(profileRaw));
    const profiles = safeJsonParse<any[]>(profilesRaw);
    const normalizedProfiles = Array.isArray(profiles)
      ? profiles.map((item) => normalizeProfile(item)).filter(Boolean)
      : [];

    const requestedProjectId = route.projectId || route.profileId;
    const localSelectedProfile = findProfileById(
      [active, profile, ...normalizedProfiles],
      requestedProjectId,
    );

    if (localSelectedProfile) {
      persistProfile(localSelectedProfile, systemLanguage);
      return;
    }

    try {
      const query = new URLSearchParams();

      if (requestedProjectId) {
        query.set('projectId', requestedProjectId);
        query.set('profileId', requestedProjectId);
      }

      const profileUrl = query.size
        ? `/api/profile/get?${query.toString()}`
        : '/api/profile/get';

      const res = await fetch(profileUrl, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });

      if (res.status === 401) {
        const returnTo = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        router.replace(`/login?returnTo=${returnTo}`);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const rawDbProfile =
          data?.profile ||
          data?.activeProfile ||
          data?.data?.profile ||
          null;
        const dbProfile = normalizeProfile(rawDbProfile);

        const profileMatchesRequest =
          !requestedProjectId ||
          !dbProfile?.id ||
          String(dbProfile.id).trim() === requestedProjectId;

        if (dbProfile && profileMatchesRequest) {
          persistProfile(
            {
              ...dbProfile,
              id: dbProfile.id || requestedProjectId || undefined,
            },
            systemLanguage,
          );
          return;
        }
      }
    } catch (error) {
      console.error('LOAD_PROFILE_FROM_DB_ERROR:', error);
    }

    // /api/chat vie načítať úplný profil priamo zo Supabase podľa projectId.
    // Preto frontend pri príchode z dashboardu vytvorí bezpečný minimálny
    // kontext a neblokuje používateľa len preto, že localStorage ešte profil nemá.
    if (requestedProjectId && !cancelled) {
      persistProfile(
        {
          id: requestedProjectId,
          title: 'Načítaný projekt',
          topic: '',
          language: systemLanguage,
          interfaceLanguage: systemLanguage,
          workLanguage: systemLanguage,
          citation: 'ISO',
          citationStyle: 'ISO',
        },
        systemLanguage,
      );
    }
  };

  void loadProfile();

  const onProfileUpdated = (event: Event) => {
    const custom = event as CustomEvent;

    if (!custom.detail) return;

    const route = readChatRouteContext();
    const systemLanguage =
      route.workLanguage ||
      route.interfaceLanguage ||
      route.language ||
      getStoredSystemLanguage();
    const normalized = normalizeProfile(custom.detail);

    persistProfile(normalized, systemLanguage);
  };

  window.addEventListener('zedpera-profile-updated', onProfileUpdated);
  window.addEventListener('zedpera:active-profile-changed', onProfileUpdated);

  return () => {
    cancelled = true;
    window.removeEventListener('zedpera-profile-updated', onProfileUpdated);
    window.removeEventListener(
      'zedpera:active-profile-changed',
      onProfileUpdated,
    );
  };
}, [router]);






const handleSelectLanguage = async (nextLanguage: AppLanguage) => {
  setLanguage(nextLanguage);

localStorage.setItem('zedpera_language', nextLanguage);
localStorage.setItem('zedpera_system_language', nextLanguage);

document.documentElement.lang = nextLanguage;
document.documentElement.setAttribute('data-language', nextLanguage);
document.documentElement.setAttribute('data-system-language', nextLanguage);
document.documentElement.setAttribute(
  'data-work-language',
  activeProfile?.workLanguage || nextLanguage,
);

const updatedProfile = withSystemLanguageProfile(activeProfile, nextLanguage);
setActiveProfile(updatedProfile);

if (updatedProfile) {
  localStorage.setItem('active_profile', JSON.stringify(updatedProfile));
  localStorage.setItem('profile', JSON.stringify(updatedProfile));
}

window.dispatchEvent(
  new CustomEvent<AppLanguage>('zedpera-language-change', {
    detail: nextLanguage,
  }),
);

window.dispatchEvent(
  new CustomEvent<AppLanguage>('zedpera-system-language-change', {
    detail: nextLanguage,
  }),
);

window.dispatchEvent(
  new CustomEvent<AppLanguage>('zedpera-work-language-change', {
    detail: nextLanguage,
  }),
);

window.dispatchEvent(new CustomEvent('zedpera-profile-change'));

  const textToTranslate = result.trim() || canvasText.trim();

  if (!textToTranslate || isLoading || isEditingSelection) {
    return;
  }

  try {
    setIsLoading(true);

    const formData = new FormData();

    formData.append('agent', agent);
    formData.append('module', 'translation');
    formData.append('language', nextLanguage);
formData.append('outputLanguage', nextLanguage);
formData.append('systemLanguage', nextLanguage);
formData.append('workLanguage', nextLanguage);
formData.append('profile', JSON.stringify(updatedProfile || null));

    formData.append(
      'messages',
      JSON.stringify([
        {
          role: 'user',
          content: `Prelož celý nasledujúci text do jazyka: ${nextLanguage}.

Dôležité:
- Prelož celý hlavný text.
- Zachovaj odborný význam.
- Zachovaj štruktúru odsekov a nadpisov.
- Neprekladaj mená autorov.
- Neprekladaj DOI, URL a bibliografické identifikátory.
- Citácie v texte ponechaj v rovnakom tvare, napr. (Autor, rok).
- Vráť iba preložený text.

TEXT:
${textToTranslate}`,
        },
      ]),
    );

    const res = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, text/event-stream',
      },
      body: formData,
    });

    if (!res.ok) {
      const errorMessage = await readApiErrorResponse(res);
      throw new Error(errorMessage);
    }

    const contentType = res.headers.get('content-type') || '';
    let translatedText = '';

    if (contentType.includes('application/json')) {
      const data = await res.json();

      translatedText = String(
        data.output ||
          data.result ||
          data.message ||
          data.text ||
          data.answer ||
          '',
      ).trim();
    } else {
      if (!res.body) {
        throw new Error('API nevrátilo odpoveď.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        translatedText += decoder.decode(value, { stream: true });
      }
    }

    const cleanedTranslatedText = cleanAiOutput(translatedText);

    if (!cleanedTranslatedText) {
      throw new Error('Preklad nevrátil žiadny text.');
    }

    setResult(cleanedTranslatedText);
    setCanvasText(cleanedTranslatedText);

    if (popupData) {
      setPopupData(parseSections(cleanedTranslatedText));
    }
  } catch (error) {
    console.error('LANGUAGE_TRANSLATION_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa preložiť aktuálny výstup.';

    alert(`Jazyk bol prepnutý, ale aktuálny výstup sa nepodarilo preložiť.

${message}`);
  } finally {
    setIsLoading(false);
  }
};

  const updateProcessingLog = (id: string, patch: Partial<ProcessingLogItem>) => {
    setProcessingLog((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const prepareBackendFile = async (item: AttachedFile): Promise<PreparedFile> => {
    const pdfFile = isPdfFile(item.name);

    updateProcessingLog(item.id, {
      status: 'extracting',
      message: 'Extrahujem obsah prílohy.',
      originalSize: item.size,
    });

    let extraction;
    let fileForChat = item.file;
    let preparedName = item.name;
    let preparedType = item.type || 'application/octet-stream';
    let preparedSize = item.size;
    let compressionMode: PreparedFile['compressionMode'] = 'raw_small_text';

    try {
      // PDF sa posiela v pôvodnom binárnom tvare. Klientsky pdfjs worker
      // sa nepoužíva; extrakciu vykoná serverová route.
      if (pdfFile) {
        extraction = await callExtractTextApi({
          file: item.file,
          fileName: item.name,
          originalName: item.name,
          compressed: false,
        });
      } else {
        const gzipBlobResult = await gzipBlob(item.file);
        const compressedName = `${item.name}.gz`;
        const compressedFile = new File([gzipBlobResult], compressedName, {
          type: window.CompressionStream
            ? 'application/gzip'
            : item.type || 'application/octet-stream',
        });

        try {
          extraction = await callExtractTextApi({
            file: compressedFile,
            fileName: compressedName,
            originalName: item.name,
            compressed: true,
          });

          fileForChat = compressedFile;
          preparedName = compressedName;
          preparedType = compressedFile.type;
          preparedSize = compressedFile.size;
          compressionMode = 'gzip_original';
        } catch {
          extraction = await callExtractTextApi({
            file: item.file,
            fileName: item.name,
            originalName: item.name,
            compressed: false,
          });
        }
      }

      const extractedText = truncateByChars(
        extraction.extractedText,
        maxClientExtractedCharsPerFile,
      );

      updateProcessingLog(item.id, {
        status: 'extracted',
        message: 'Obsah prílohy bol úspešne extrahovaný.',
        preparedSize,
        extractedChars: extractedText.length,
        detectedSourcesCount: extraction.detectedSources.length,
        detectedAuthorsCount: extraction.detectedAuthors.length,
        detectedInTextCitationsCount: extraction.inTextCitations.length,
      });

      return {
        originalId: item.id,
        originalName: item.name,
        originalSize: item.size,
        originalType: item.type,
        preparedName,
        preparedSize,
        preparedType,
        compressionMode,
        file: fileForChat,
        extractedText,
        extractionMethod: extraction.method || 'server',
        extractionMessage: 'Obsah prílohy bol extrahovaný na serveri.',
        detectedSources: extraction.detectedSources,
        inTextCitations: extraction.inTextCitations,
        detectedAuthors: extraction.detectedAuthors,
        formattedSources:
          extraction.formattedSources ||
          formatAllDetectedSources({
            citations: extraction.inTextCitations,
            sources: extraction.detectedSources,
            files: [],
          }),
        extractionStatus: 'client_extracted',
        warning: undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Extrakciu prílohy sa nepodarilo dokončiť pred odoslaním.';

      // Pôvodný súbor sa napriek zlyhaniu pomocnej extrakcie odošle do
      // /api/chat, kde sa vykoná hlavná serverová extrakcia.
      updateProcessingLog(item.id, {
        status: 'ready',
        message: 'Príloha bola odoslaná na serverové spracovanie.',
        warning: undefined,
      });

      return {
        originalId: item.id,
        originalName: item.name,
        originalSize: item.size,
        originalType: item.type,
        preparedName: item.name,
        preparedSize: item.size,
        preparedType: item.type || 'application/octet-stream',
        compressionMode: 'raw_small_text',
        file: item.file,
        extractedText: '',
        extractionMethod: 'server_fallback',
        extractionMessage: message,
        detectedSources: [],
        inTextCitations: [],
        detectedAuthors: [],
        formattedSources: '',
        extractionStatus: 'backend_required',
        warning: undefined,
      };
    }
  };

  const prepareFilesBeforeSend = async (files: AttachedFile[]) => {
    if (!files.length) return [];

    setProcessingLog(
      files.map((file) => ({
        id: file.id,
        name: file.name,
        status: 'waiting',
        message: 'Čaká na extrakciu obsahu prílohy.',
        originalSize: file.size,
      })),
    );

    const preparedFiles: PreparedFile[] = [];

    for (const item of files) {
      preparedFiles.push(await prepareBackendFile(item));
    }

    return preparedFiles;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);
    const validFiles: AttachedFile[] = [];

    for (const file of incomingFiles) {
      if (!isAllowedUploadFile(file)) {
        alert(
          `Súbor "${file.name}" má nepodporovaný formát.\n\nPovolené formáty:\nPDF, DOC, DOCX, TXT, RTF, ODT, MD, JPG, PNG, WEBP, GIF, XLS, XLSX, CSV, PPT, PPTX.`,
        );
        continue;
      }

      if (file.size > maxFileSizeBytes) {
        alert(
          `Súbor "${file.name}" je príliš veľký.\n\nMaximálna veľkosť jedného súboru je ${maxFileSizeMb} MB.\nTento súbor má ${formatBytes(file.size)}.`,
        );
        continue;
      }

      validFiles.push({
        id: createFileId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        file,
      });
    }

    if (validFiles.length === 0) return;

    const nextFiles = [...attachedFiles];
    const newlyAcceptedFiles: AttachedFile[] = [];

    for (const file of validFiles) {
      const alreadyExists = nextFiles.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.type === file.type,
      );

      if (alreadyExists) continue;

      if (nextFiles.length >= maxFilesCount) {
        alert(
          `Dosiahnutý limit príloh.\n\nMaximálny počet súborov je ${maxFilesCount}.`,
        );
        break;
      }

      nextFiles.push(file);
      newlyAcceptedFiles.push(file);
    }

    setAttachedFiles(nextFiles);

    // Počíta sa každá skutočne prijatá príloha už pri nahratí do chatu.
    // Rovnaké klientské ID sa pri následnom /api/chat nezapočíta druhýkrát.
    if (newlyAcceptedFiles.length > 0) {
      void recordNewAttachmentUploads(newlyAcceptedFiles);
    }

    setProcessingLog([]);
    setResult('');
    setCanvasText('');
    setPopupData(null);
    setSelectedTextState(null);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
    setProcessingLog((prev) => prev.filter((item) => item.id !== id));
  };

  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Diktovanie nie je v tomto prehliadači podporované. Skús Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'sk-SK';
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

  const getExportText = () => {
    if (canvasText.trim()) return canvasText.trim();
    if (result.trim()) return result.trim();

    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');

    return lastAssistant?.content || '';
  };

  const downloadDoc = () => {
    const text = getExportText();
    if (!text.trim()) return;

    const fileBase = sanitizeFileName(exportTitle);
    const html = createDocHtml(exportTitle, text);

    downloadBlob({
      content: html,
      fileName: `${fileBase}.doc`,
      mimeType: 'application/msword;charset=utf-8',
    });
  };

  const copyOutput = async () => {
    const text = getExportText();

    if (!text.trim()) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch (error) {
      console.error('COPY_OUTPUT_ERROR:', error);
      setCopyStatus('error');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    }
  };

  const downloadPdf = () => {
    const text = getExportText();
    if (!text.trim()) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      alert('Prehliadač zablokoval otvorenie PDF okna. Povoľ pop-up okná.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createDocHtml(exportTitle, text));
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: cleanAiOutput(content),
      },
    ]);
  };

  const sendPromptToApi = async ({
    visibleUserText,
    apiUserText,
  }: {
    visibleUserText: string;
    apiUserText: string;
  }) => {
   if (isLoading) return;;

    if (!activeProfile) {
      appendAssistantMessage(
        '⚠️ Najprv si vytvor a ulož profil práce. Potom môžeš pokračovať v AI Chate, aby systém vedel pracovať podľa názvu práce, typu práce, cieľa, metodológie a citačnej normy.',
      );
      return;
    }

    const visibleMessage: ChatMessage = {
      role: 'user',
      content: visibleUserText.trim() || `Spracuj priložené dokumenty (${attachedFiles.length})`,
    };

    setMessages((prev) => [...prev, visibleMessage]);
   setInput('');
    setIsLoading(true);
    setPopupData(null);

    try {
      const preparedFiles = await prepareFilesBeforeSend(attachedFiles);
      const extractedContext = buildExtractedContext(preparedFiles);
      const detectedSourcesSummary = buildDetectedSourcesSummary(preparedFiles);

      const detectedSources = flattenDetectedSources(preparedFiles).slice(0, maxDetectedSourcesForChat);
      const detectedAuthors = flattenDetectedAuthors(preparedFiles).slice(0, maxDetectedAuthorsForChat);
      const inTextCitations = flattenInTextCitations(preparedFiles).slice(0, maxInTextCitationsForChat);

      const isChapterRequest = isChapterLikeRequest(apiUserText || visibleUserText || input);

      const apiMessages: ChatMessage[] = [
        {
          role: 'user',
          content:
            apiUserText.trim() ||
            visibleUserText.trim() ||
            `Spracuj priložené dokumenty (${attachedFiles.length}) podľa aktívneho profilu práce.`,
        },
      ];

      const requestId = createChatRequestId();
      const mainPrompt = buildMainChatPrompt({
        profile: activeProfile,
        userInstruction: apiMessages[0]?.content || '',
        attachmentCount: attachedFiles.length,
      });

      const formData = new FormData();

const systemLanguage = getStoredSystemLanguage();

const normalizedProfileForApi = withSystemLanguageProfile(
  activeProfile,
  systemLanguage,
);

const profileForApi: SavedProfile | null = normalizedProfileForApi
  ? {
      ...normalizedProfileForApi,
      id: normalizedProfileForApi.id || effectiveProjectId || undefined,
    }
  : effectiveProjectId
    ? withSystemLanguageProfile(
        {
          id: effectiveProjectId,
          language: systemLanguage,
          interfaceLanguage: systemLanguage,
          workLanguage: systemLanguage,
          citation: 'ISO',
          citationStyle: 'ISO',
        },
        systemLanguage,
      )
    : null;

const outputLanguage =
  profileForApi?.workLanguage ||
  profileForApi?.language ||
  systemLanguage;

const effectiveCitationStyle =
  normalizeCitationStyle(
    profileForApi?.citationStyle ||
      profileForApi?.citation ||
      'ISO',
  );

setLanguage(systemLanguage);
setActiveProfile(profileForApi);

if (profileForApi) {
  localStorage.setItem('active_profile', JSON.stringify(profileForApi));
  localStorage.setItem('profile', JSON.stringify(profileForApi));
}

formData.append('requestId', requestId);
formData.append('agent', agent);
formData.append('module', 'chat');
formData.append('mainPrompt', mainPrompt);

formData.append('language', systemLanguage);
formData.append('interfaceLanguage', systemLanguage);
formData.append('systemLanguage', systemLanguage);

formData.append('outputLanguage', outputLanguage);
formData.append('workLanguage', outputLanguage);

formData.append(
  'citationStyle',
  effectiveCitationStyle,
);
formData.append(
  'citation',
  effectiveCitationStyle,
);
formData.append(
  'citationMode',
  getCitationStyleMode(effectiveCitationStyle),
);

formData.append('messages', JSON.stringify(apiMessages));
formData.append('profile', JSON.stringify(profileForApi || null));

    if (effectiveProjectId) {
      formData.append('projectId', effectiveProjectId);
      formData.append('profileId', effectiveProjectId);
    }

      formData.append('sourceMode', 'uploaded_documents_first');
      formData.append('validateAttachmentsAgainstProfile', 'false');
      formData.append('requireSourceList', 'true');
      formData.append('allowAiKnowledgeFallback', 'true');
      formData.append('returnExtractedFilesInfo', 'true');
      formData.append('isChapterRequest', isChapterRequest ? 'true' : 'false');

      // Konfiguračné prepínače pre /api/chat.
      // Nie sú to prompty. Pravidlá spracovania musia byť implementované v /api/chat.
      formData.append('enableExternalResearch', 'true');
      formData.append('useExternalAcademicSources', 'true');
      formData.append('useSemanticScholar', 'true');
      formData.append('useCrossref', 'true');
      formData.append('requireVerifiedSources', 'true');
      formData.append('requireInlineCitations', 'true');
      formData.append('requirePrimarySecondarySources', 'true');
      formData.append('rejectInventedCitations', 'true');

      formData.append('clientExtractedText', extractedContext);
      formData.append('clientDetectedSourcesSummary', detectedSourcesSummary || '');
      formData.append('clientDetectedSources', JSON.stringify(detectedSources || []));
      formData.append('clientDetectedAuthors', JSON.stringify(detectedAuthors || []));
      formData.append('clientInTextCitations', JSON.stringify(inTextCitations || []));

      for (const preparedFile of preparedFiles) {
        formData.append('files', preparedFile.file, preparedFile.preparedName);
      }

      formData.append(
        'filesMetadata',
        JSON.stringify(
          attachedFiles.map((item) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            kind: getFileKindLabel(item.name),
            extractable: isTextExtractableFile(item.name),
            pdfExtractedInBrowser: false,
            uploadedAt: item.uploadedAt,
          })),
        ),
      );

      formData.append(
        'preparedFilesMetadata',
        JSON.stringify(
          preparedFiles.map((item) => ({
            originalId: item.originalId,
            originalName: item.originalName,
            originalSize: item.originalSize,
            originalType: item.originalType,
            preparedName: item.preparedName,
            preparedSize: item.preparedSize,
            preparedType: item.preparedType,
            compressionMode: item.compressionMode,
            extractionStatus: item.extractionStatus,
            extractionMethod: item.extractionMethod,
            extractionMessage: item.extractionMessage,
            detectedSourcesCount: item.detectedSources?.length || 0,
            detectedSources: item.detectedSources || [],
            inTextCitations: item.inTextCitations || [],
            inTextCitationsCount: item.inTextCitations?.length || 0,
            detectedAuthors: item.detectedAuthors || [],
            formattedSources: item.formattedSources || '',
            warning: item.warning || '',
          })),
        ),
      );

      const preparedByOriginalId = new Map(
        preparedFiles.map((item) => [item.originalId, item]),
      );

      const chatPayload: ChatApiPayload = {
        version: '2026-07-21',
        requestId,
        module: 'chat',
        agent,
        projectId: effectiveProjectId || null,
        routeContext,
        userInstruction: apiMessages[0]?.content || '',
        mainPrompt,
        profile: profileForApi,
        language: outputLanguage as AppLanguage,
        citationStyle:
          effectiveCitationStyle,
        attachments: attachedFiles.map((item) => {
          const prepared = preparedByOriginalId.get(item.id);

          return {
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            uploadedAt: item.uploadedAt,
            preparedName: prepared?.preparedName || item.name,
            extractionStatus: prepared?.extractionStatus || 'not_extractable',
            extractedCharacters: prepared?.extractedText?.length || 0,
            detectedSourcesCount: prepared?.detectedSources?.length || 0,
            detectedAuthorsCount: prepared?.detectedAuthors?.length || 0,
            inTextCitationsCount: prepared?.inTextCitations?.length || 0,
          };
        }),
        sourceContext: {
          mode: 'uploaded_documents_first',
          extractedText: extractedContext,
          detectedSourcesSummary: detectedSourcesSummary || '',
          detectedSources,
          detectedAuthors,
          inTextCitations,
        },
      };

      formData.append('chatPayload', JSON.stringify(chatPayload));

      setProcessingLog((prev) =>
        prev.map((item) =>
          item.status === 'ready' ||
          item.status === 'extracted' ||
          item.status === 'metadata_only'
            ? {
                ...item,
                status: 'ready',
                message: 'Extrakcia prílohy bola dokončená.',
              }
            : item,
        ),
      );

      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/plain, text/event-stream',
          'x-request-id': requestId,
        },
        body: formData,
      });

      applyAttachmentUsageFromResponse(res);

      if (!res.ok) {
        const errorMessage = await readApiErrorResponse(res);

        const modelHelp =
          agent === 'claude'
            ? '\n\nClaude API chyba znamená najčastejšie zlý ANTHROPIC_API_KEY, zlý názov modelu, context window limit alebo nenastavený billing v Anthropic konzole.'
            : agent === 'grok'
              ? '\n\nGrok API chyba znamená najčastejšie, že xAI účet nemá kredity alebo licenciu.'
              : agent === 'mistral'
                ? '\n\nMistral API chyba znamená najčastejšie zlý MISTRAL_API_KEY alebo nesprávny názov modelu.'
                : '';

        appendAssistantMessage(
          `❌ API chyba ${res.status}\n\n${errorMessage}${modelHelp}\n\nSkús dočasne prepnúť model na Gemini alebo OPEN AI a pozri terminál pri /api/chat.`,
        );

        return;
      }

      const contentType = res.headers.get('content-type') || '';
      let fullText = '';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
        },
      ]);

      if (contentType.includes('application/json')) {
        const data = await res.json();

        if (data?.attachmentUsage) {
          setAttachmentUsage({
            attachmentsUsed: Number(data.attachmentUsage.attachmentsUsed || 0),
            attachmentsAdded: Number(data.attachmentUsage.attachmentsAdded || 0),
            lastUploadedAt: data.attachmentUsage.lastUploadedAt || null,
            trackingAvailable: data.attachmentUsage.trackingAvailable !== false,
          });
        }

        fullText =
          String(data.output || data.result || data.message || data.text || data.answer || '').trim() || '';

        if (!fullText && data.ok === false) {
          appendAssistantMessage(
            `❌ API nevrátilo výstup.\n\n${data.message || data.error || 'Neznáma chyba API.'}`,
          );
          return;
        }

        if (!fullText) fullText = 'API odpovedalo úspešne, ale nevrátilo žiadny textový výstup.';
      } else {
        if (!res.body) {
          appendAssistantMessage('❌ API nevrátilo stream odpovede.');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          const visibleText = cleanAiOutput(fullText);

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: visibleText,
            };
            return updated;
          });
        }
      }

      const finalTextFromApi = cleanAiOutput(fullText);
      const parsed = parseSections(finalTextFromApi);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: finalTextFromApi,
        };
        return updated;
      });

      setResult(finalTextFromApi);
      setCanvasText(finalTextFromApi);

const currentUserMessage =
  visibleUserText.trim() ||
  apiUserText.trim() ||
  attachedFiles.map((file) => file.name).join(', ') ||
  'Používateľ odoslal prílohu.';

await saveChatToHistory({
  userMessage: currentUserMessage,
  assistantMessage: finalTextFromApi,
});
      const finalParsed: ParsedResult = {
  ...parsed,
  output: parsed.output || finalTextFromApi,
  sources: parsed.sources || '',
};
      const looksLikeError =
        finalParsed.output.includes('AI_APICallError') ||
        finalParsed.output.includes('API error') ||
        finalParsed.output.includes('model is not found') ||
        finalParsed.output.includes('not found for API version') ||
        finalParsed.output.includes('Forbidden') ||
        finalParsed.output.includes('Unauthorized');

      if (
        !looksLikeError &&
        (finalParsed.output || finalParsed.analysis || finalParsed.score || finalParsed.tips || finalParsed.sources)
      ) {
        setPopupData(finalParsed);
      }
    } catch (error) {
      console.error('CHAT SEND ERROR:', error);

      const message = error instanceof Error ? error.message : 'Nastala chyba pri komunikácii s API.';

      appendAssistantMessage(
        `❌ Nepodarilo sa spracovať požiadavku.\n\n${message}`,
      );
    } finally {
      setIsLoading(false);
      setAttachedFiles([]);
      setProcessingLog([]);
      void refreshAttachmentUsage();

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetChat = () => {
  setMessages([]);
  setInput('');
  setResult('');
  setCanvasText('');
  setPopupData(null);
  setSelectedTextState(null);
  selectedTextStateRef.current = null;
  setProcessingLog([]);
  setAttachedFiles([]);

  if (fileInputRef.current) fileInputRef.current.value = '';
  if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0;
};

  const sendMessage = async () => {
    const text = input.trim();
    if (!canSubmit) return;

    await sendPromptToApi({
      visibleUserText: text,
      apiUserText: text,
    });
  };

  const runSuggestion = async (item: (typeof suggestions)[number]) => {
    await sendPromptToApi({
      visibleUserText: item.title,
      apiUserText: item.title,
    });
  };

const handleTextSelection = (target: 'result' | 'canvas') => {
  const element =
    target === 'result' ? resultTextareaRef.current : canvasTextareaRef.current;

  if (!element) return;

  const start = element.selectionStart;
  const end = element.selectionEnd;

  if (start === end) {
    return;
  }

  const selected = element.value.slice(start, end);

  if (!selected.trim()) {
    selectedTextStateRef.current = null;
    setSelectedTextState(null);
    return;
  }

  const nextSelection: SelectedTextState = {
    target,
    start,
    end,
    text: selected,
  };

  selectedTextStateRef.current = nextSelection;
  setSelectedTextState(nextSelection);
};

const replaceSelectedText = (
  replacement: string,
  selectionOverride?: SelectedTextState | null,
) => {
  const selection =
    selectionOverride || selectedTextStateRef.current || selectedTextState;

  if (!selection) return;

  const cleaned = cleanAiOutput(replacement);

  if (!cleaned) return;

  if (selection.target === 'result') {
    setResult((prev) => {
      const next =
        prev.slice(0, selection.start) +
        cleaned +
        prev.slice(selection.end);

      setCanvasText(next);
      return next;
    });
  } else {
    setCanvasText((prev) => {
      const next =
        prev.slice(0, selection.start) +
        cleaned +
        prev.slice(selection.end);

      return next;
    });
  }

  selectedTextStateRef.current = null;
  setSelectedTextState(null);
};

const getEditInstruction = (
  mode: 'academic' | 'shorten' | 'expand' | 'grammar',
) => {
  if (mode === 'academic') {
    return 'Uprav označený text akademicky, odborne, plynulo a štylisticky vhodne. Zachovaj pôvodný význam. Nevkladaj nové zdroje, nové citácie ani nové fakty.';
  }

  if (mode === 'shorten') {
    return 'Skráť označený text. Zachovaj hlavný význam, odborný tón a logiku textu. Nevkladaj nové zdroje ani nové citácie.';
  }

  if (mode === 'expand') {
    return 'Rozšír označený text odborne a akademicky. Zachovaj pôvodný význam a kontext. Nevymýšľaj nové fakty, zdroje ani citácie.';
  }

  return 'Oprav gramatiku, štylistiku, interpunkciu a plynulosť označeného textu. Zachovaj pôvodný význam. Nevkladaj nové zdroje ani nové citácie.';
};

const editSelectedText = async (
  mode: 'academic' | 'shorten' | 'expand' | 'grammar',
) => {
  const selection = selectedTextStateRef.current || selectedTextState;

  if (!selection || isEditingSelection) return;

  const selectedText = selection.text.trim();

  if (!selectedText) {
    alert('Nie je označený žiadny text na úpravu.');
    return;
  }

  setIsEditingSelection(true);

  try {
    const instruction = getEditInstruction(mode);

    const formData = new FormData();

    formData.append('agent', agent);
    formData.append('module', 'chat');
    formData.append('profile', JSON.stringify(activeProfile || null));

    formData.append('editSelectedTextOnly', 'true');
    formData.append('editMode', mode);
    formData.append('selectedText', selectedText);

    formData.append('requireSourceList', 'false');
    formData.append('allowAiKnowledgeFallback', 'true');
    formData.append('validateAttachmentsAgainstProfile', 'false');
    formData.append('returnExtractedFilesInfo', 'false');

    formData.append(
      'messages',
      JSON.stringify([
        {
          role: 'user',
          content: `${instruction}

OZNAČENÝ TEXT:
${selectedText}

Vráť iba finálny upravený text. Nepíš vysvetlenie, analýzu, skóre, odporúčania ani zdroje.`,
        },
      ]),
    );

    const res = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, text/event-stream',
      },
      body: formData,
    });

    if (!res.ok) {
      const errorMessage = await readApiErrorResponse(res);
      throw new Error(errorMessage);
    }

    const contentType = res.headers.get('content-type') || '';
    let editedText = '';

    if (contentType.includes('application/json')) {
      const data = await res.json();

      editedText = String(
        data.output ||
          data.result ||
          data.message ||
          data.text ||
          data.answer ||
          '',
      ).trim();
    } else {
      if (!res.body) {
        throw new Error('API nevrátilo odpoveď.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        editedText += decoder.decode(value, { stream: true });
      }
    }

    const cleanedEditedText = cleanAiOutput(editedText);

    if (!cleanedEditedText) {
      throw new Error('AI nevrátila upravený text.');
    }

    replaceSelectedText(cleanedEditedText, selection);
  } catch (error) {
    console.error('EDIT_SELECTED_TEXT_ERROR:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Označený text sa nepodarilo upraviť.';

    alert(
      `Označený text sa nepodarilo upraviť.

${message}

Skúste požiadavku zopakovať alebo dočasne prepnúť na iný AI model.`,
    );
  } finally {
    setIsEditingSelection(false);
  }
};

  return (
    <>
<style jsx global>{`
  html,
  body {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    background: #050711;
  }

  * {
    box-sizing: border-box;
  }

  textarea,
  input,
  button,
  select {
    font-size: 16px;
  }
`}</style>

      <div className="flex min-h-screen w-full overflow-x-hidden bg-[#050711] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col overflow-visible px-3 py-3 md:h-screen md:min-h-0 md:overflow-hidden md:px-8">
          <header className="sticky top-0 z-30 shrink-0 border-b border-white/10 bg-[#050711]/95 pb-3 backdrop-blur">
           <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
              >
                <Home className="h-4 w-4" />
                Menu
              </button>



              <button
                type="button"
                onClick={resetChat}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-700/30 transition hover:bg-violet-500"
              >
                <RefreshCcw className="h-4 w-4" />+ Nový chat
              </button>
            </div>
          </header>

          {!activeProfile && (
            <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <b>Najprv je potrebné uložiť profil práce.</b> AI Chat má
                  logicky nasledovať až po vyplnení profilu, aby vedel pracovať
                  podľa názvu práce, typu práce, cieľa, metodológie a citačnej
                  normy.
                </div>
              </div>
            </div>
          )}

          <section className="shrink-0 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                Aktívny profil:{' '}
                <span className="font-black text-white">
                  {activeProfile?.title || 'Nie je vybraný'}
                </span>
              </div>
            </div>
          </section>

          <div className="relative flex min-h-[calc(100vh-230px)] flex-1 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/30 md:min-h-0 md:rounded-[30px]">
           <div ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-28 md:px-8 md:pb-4">
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center py-4">
                  <div className="mb-5 text-center">
  
</div>

            <div className="grid w-full gap-3 md:grid-cols-3">
  {suggestions.map((item) => {
    const Icon = item.icon;
   const disabled = isLoading || !activeProfile;

    return (
      <div
        key={item.title}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => {
          if (disabled) return;
          runSuggestion(item);
        }}
        onKeyDown={(event) => {
          if (disabled) return;

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            runSuggestion(item);
          }
        }}
        className={`group flex min-h-[76px] items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-left transition ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:border-violet-400/50 hover:bg-white/[0.085]'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>

        <span className="text-sm font-black leading-5 text-slate-100">
          {item.title}
        </span>
      </div>
    );
  })}
</div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-5xl space-y-4 pb-2">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[92%] break-words whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-7 shadow-lg md:max-w-[85%] md:px-5 md:py-4 ${
                          message.role === 'user'
                            ? 'bg-violet-600 text-white shadow-violet-700/20'
                            : 'border border-white/10 bg-white/[0.065] text-slate-200 shadow-black/20'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {processingLog.length > 0 && isLoading && (
                    <div className="rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-black text-violet-100">
                        <UploadCloud className="h-4 w-4" />
                        Extrakcia príloh
                      </div>

                      <div className="space-y-2">
                        {processingLog.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300"
                          >
                            <div className="font-black text-white">{item.name}</div>
                            <div className="mt-1 leading-5 text-slate-300">
                              {item.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#070a16]/95 px-4 py-3 backdrop-blur md:px-8">
              <div className="mx-auto max-w-6xl rounded-[28px] border border-violet-500/40 bg-violet-950/30 p-3 shadow-2xl shadow-violet-950/40">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-400/20 bg-black/20 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-violet-100">
                    <Paperclip className="h-4 w-4 text-violet-300" />
                    <span>
                      Počet nahraných príloh: <strong>{attachedFiles.length}</strong>
                    </span>
                  </div>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="mb-3 max-h-[110px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                      <UploadCloud className="h-4 w-4 text-violet-300" />
                      Pripojené podklady ({attachedFiles.length})
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="rounded-lg bg-violet-600/30 px-2 py-1 text-[10px] font-black uppercase text-violet-100">
                            {getFileKindLabel(file.name)}
                          </span>
                          <span className="max-w-[210px] truncate font-bold">{file.name}</span>
                          <span className="shrink-0 text-[11px] text-violet-200/70">{formatBytes(file.size)}</span>
                          <button type="button" onClick={() => removeFile(file.id)} className="shrink-0 rounded-full p-1 text-violet-100 transition hover:bg-white/10">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Model
                    </span>

                {agentsOrder.map((item) => {
  const active = agent === item.key;

  return (
    <button
      key={item.key}
      type="button"
      onClick={() => handleSelectAgent(item.key)}
     disabled={isLoading}
      className={`rounded-2xl px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-800/40'
          : 'border border-white/10 bg-white/[0.055] text-slate-300 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white'
      }`}
    >
      {item.label}
    </button>
  );
})}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCanvasOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white"
                  >
                    <Paintbrush className="h-4 w-4" />
                    Canvas
                  </button>
                </div>

               <form
  onSubmit={(event) => {
    event.preventDefault();
    sendMessage();
  }}
  className="flex items-end gap-2 md:gap-3"
>
                
                  <input ref={fileInputRef} type="file" accept={allowedFileAccept} multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                   disabled={isLoading}
                    className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title={`Priložiť súbory, max. ${maxFilesCount} súborov, max. ${maxFileSizeMb} MB na súbor`}
                  >
                    <Paperclip className="h-6 w-6" />
                  </button>

                  <textarea
                    value={input}
                    rows={2}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={attachedFiles.length > 0 ? 'Napíšte správu alebo odošlite len priložené dokumenty...' : 'Napíšte správu...'}
                    className="min-h-[52px] max-h-[150px] min-w-0 flex-1 resize-none rounded-2xl bg-white/[0.055] px-4 py-3 text-base font-semibold leading-6 text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.08]"
                  />

                  <button
                    type="button"
                    onClick={startDictation}
                    disabled={isLoading}
                    className={`mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isListening
                        ? 'border-red-400/50 bg-red-500 text-white shadow-lg shadow-red-700/30'
                        : 'border-white/10 bg-white/[0.055] text-slate-300 hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white'
                    }`}
                    title="Diktovať"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!canSubmit || !activeProfile}
                    className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/40 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Odoslať"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {selectedTextState && (
            <div className="fixed bottom-6 left-1/2 z-[80] w-[calc(100%-32px)] max-w-4xl -translate-x-1/2 rounded-3xl border border-violet-400/30 bg-[#0b1020] p-4 shadow-2xl shadow-black/40">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">Označený text</div>
                  <div className="mt-1 max-h-[70px] overflow-y-auto text-xs leading-5 text-slate-400">
                    {selectedTextState.text}
                  </div>
                </div>

                <button
  type="button"
  onClick={() => {
    selectedTextStateRef.current = null;
    setSelectedTextState(null);
  }}
  className="rounded-2xl bg-white/10 p-2 text-white hover:bg-white/20"
>
  <X className="h-4 w-4" />
</button>
              </div>

              <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editSelectedText('academic')}
    disabled={isEditingSelection}
    className="rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isEditingSelection ? 'Upravujem...' : 'Akademicky upraviť'}
  </button>

  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editSelectedText('shorten')}
    disabled={isEditingSelection}
    className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    Skrátiť
  </button>

  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editSelectedText('expand')}
    disabled={isEditingSelection}
    className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    Rozšíriť
  </button>

  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={() => editSelectedText('grammar')}
    disabled={isEditingSelection}
    className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    Opraviť gramatiku
  </button>
</div>

             
            </div>
          )}

          {result && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#070a16] px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-black">📄 Výstup</h2>
                    <p className="text-sm text-slate-400">Text môžeš označiť myšou a upraviť iba vybranú časť.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={copyOutput} disabled={!getExportText().trim()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
                      {copyStatus === 'copied' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copyStatus === 'copied' ? 'Skopírované' : copyStatus === 'error' ? 'Chyba' : 'Kopírovať'}
                    </button>

                    <button type="button" onClick={downloadDoc} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">
                      <Download className="h-4 w-4" />
                      DOC
                    </button>

                    <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">
                      <FileDown className="h-4 w-4" />
                      PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCanvasText(result);
                        setCanvasOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500"
                    >
                      <Paintbrush className="h-4 w-4" />
                      Canvas
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResult('');
                        setPopupData(null);
                        setSelectedTextState(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400"
                    >
                      <X className="h-4 w-4" />
                      Zavrieť
                    </button>
                  </div>
                </div>

               <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_330px] md:gap-5 md:overflow-hidden md:p-6">
                  <textarea
                    ref={resultTextareaRef}
                    value={result}
                    onChange={(event) => {
                      setResult(event.target.value);
                      setCanvasText(event.target.value);
                    }}
                    onSelect={() => handleTextSelection('result')}
                    className="min-h-[45vh] resize-none rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100 outline-none focus:border-violet-400/60 md:min-h-[60vh] md:p-6 md:leading-8"
                  />

                  <div className="space-y-4 overflow-y-auto">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">📊 Skóre</h3>
                      <div className="text-2xl font-black text-emerald-400">{popupData?.score || '—'}</div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">⚠️ Analýza</h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{popupData?.analysis || 'Bez analýzy.'}</div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">✏️ Odporúčania</h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{popupData?.tips || 'Bez odporúčaní.'}</div>
                    </div>

                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                      <h3 className="mb-2 font-black text-emerald-200">📚 Zdroje</h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-emerald-50/90">
                        {popupData?.sources || 'Zdroje sú súčasťou hlavného výstupu alebo neboli v samostatnej sekcii rozpoznané.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {canvasOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
              <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#070a16] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div>
                    <h2 className="text-2xl font-black">Canvas</h2>
                    <p className="text-sm text-slate-400">Aj tu môžeš označiť časť textu a upraviť iba vybraný úsek.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={copyOutput} disabled={!getExportText().trim()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
                      {copyStatus === 'copied' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copyStatus === 'copied' ? 'Skopírované' : copyStatus === 'error' ? 'Chyba' : 'Kopírovať'}
                    </button>

                    <button type="button" onClick={downloadDoc} disabled={!canvasText.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
                      <Download className="h-4 w-4" />
                      DOC
                    </button>

                    <button type="button" onClick={downloadPdf} disabled={!canvasText.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40">
                      <FileDown className="h-4 w-4" />
                      PDF
                    </button>

                    <button type="button" onClick={() => setCanvasOpen(false)} className="rounded-2xl bg-red-500/90 p-3 text-white hover:bg-red-400">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <textarea
                  ref={canvasTextareaRef}
                  value={canvasText}
                  onChange={(event) => setCanvasText(event.target.value)}
                  onSelect={() => handleTextSelection('canvas')}
                  placeholder="Canvas je zatiaľ prázdny."
                  className="flex-1 resize-none bg-[#050711] p-6 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
