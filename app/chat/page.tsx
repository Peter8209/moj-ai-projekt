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
  Bot,
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

import {
  useZedperaErrorCenter,
} from '@/components/system/ZedperaErrorProvider';
import {
  createZedperaError,
  createZedperaErrorFromUnknown,
} from '@/lib/zedpera-errors';
import {
  readZedperaApiError,
} from '@/lib/zedpera-fetch';

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

const EMPTY_CHAT_ROUTE_CONTEXT: ChatRouteContext = {
  projectId: '',
  profileId: '',
  agent: null,
  language: null,
  interfaceLanguage: null,
  workLanguage: null,
  from: '',
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
    mode: 'uploaded_documents_first' | 'verified_web_sources';
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
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  isbn?: string | null;
  issn?: string | null;
  publisher?: string | null;
  edition?: string | null;
  place?: string | null;
  publicationDate?: string | null;
  accessDate?: string | null;
  totalPages?: number | null;
  usedPages?: string | null;
  sourceType: 'book' | 'article' | 'web' | 'software' | 'unknown';
  citationKey?: string;
  inTextCitations?: InTextCitation[];
  occurrenceCount?: number;
  matchedFromText?: boolean;
  sourceDocumentName?: string | null;
  citedAccordingTo?: string | null;
  origin?: 'attachment' | 'citation' | 'project' | 'semantic_scholar' | 'crossref' | 'ai' | 'unknown';
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
  pageCount?: number | null;
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

const maxFilesCount = 10;
const maxFileSizeMb = 50;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

// Do /api/chat neposielame desať veľkých originálov naraz. Každá príloha
// sa najprv prečíta a do hlavného chatu sa odošle kompaktná textová
// reprezentácia. Pôvodný vstupný limit 50 MB na jeden súbor zostáva.
// Prenosový rozpočet musí počítať aj s multipart hlavičkami a JSON metadátami.
// Extrahovaný text sa neposiela duplicitne v preparedFilesMetadata/chatPayload.
const maxPreparedMultipartBytes = 2_200_000;
const minPreparedFileTargetBytes = 128 * 1024;
const maxPreparedFileTargetBytes = 384 * 1024;
const maxDirectFallbackFileBytes = 1_200_000;
const attachmentExtractionTimeoutMs = 60_000;

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;
const safeCompressedTargetBytes = 950 * 1024;

const maxClientExtractedCharsPerFile = 60_000;
const maxTotalExtractedContextChars = 160_000;
const maxDetectedSourcesForChat = 120;
const maxDetectedAuthorsForChat = 120;
const maxInTextCitationsForChat = 200;

const streamedApiErrorPrefix =
  '__ZEDPERA_STREAM_ERROR__:';


const defaultAgents: { key: Agent; label: string }[] = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'openai', label: 'OPEN AI' },
  { key: 'claude', label: 'Claude' },
  { key: 'mistral', label: 'Mistral' },
  { key: 'grok', label: 'Grok' },
];

const analyzingLabels: Record<AppLanguage, string> = {
  sk: 'Analyzujem',
  cs: 'Analyzuji',
  en: 'Analyzing',
  de: 'Analysiere',
  pl: 'Analizuję',
  hu: 'Elemzek',
};

function getAnalyzingLabel(language: AppLanguage): string {
  return analyzingLabels[language] || analyzingLabels.sk;
}

function ThinkingRobot({
  language,
}: {
  language: AppLanguage;
}) {
  const label = getAnalyzingLabel(language);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex items-center gap-3"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15 text-violet-100 shadow-lg shadow-violet-950/30">
        <Bot className="h-6 w-6 animate-pulse" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-violet-300/40 bg-[#17102b] text-violet-200">
          <Brain className="h-3 w-3 animate-pulse" />
        </span>
      </span>

      <span className="font-black text-slate-100">{label}</span>

      <span aria-hidden="true" className="inline-flex items-end gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.30s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" />
      </span>
    </div>
  );
}

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
  // Zachovávame Markdown nadpisy, odrážky a podčiarkovníky vo vzorcoch.
  // Predchádzajúca verzia odstraňovala ##/### aj _..._, čím sa správne
  // štruktúrovaný akademický výstup zmenil na súvislý „wall of text“.
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
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function renderInlineAcademicText(value: string) {
  const parts = String(value || '').split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold?.[1]) {
      return <strong key={`bold-${index}`} className="font-semibold text-slate-100">{bold[1]}</strong>;
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

function StructuredAcademicText({ text }: { text: string }) {
  const lines = cleanAiOutput(text).split('\n');

  return (
    <div className="space-y-1">
      {lines.map((rawLine, index) => {
        const line = rawLine.trimEnd();
        const heading = line.match(/^(#{2,4})\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          const headingClass = level === 2
            ? 'mt-5 mb-2 text-base font-black tracking-tight text-white first:mt-0'
            : 'mt-4 mb-1.5 text-sm font-bold text-slate-100 first:mt-0';
          return <div key={`h-${index}`} className={headingClass}>{renderInlineAcademicText(heading[2])}</div>;
        }

        const bullet = line.match(/^\s*[-•*]\s+(.+)$/);
        if (bullet) {
          return (
            <div key={`b-${index}`} className="flex items-start gap-2 pl-1">
              <span aria-hidden="true" className="mt-[0.62rem] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
              <span className="min-w-0 flex-1">{renderInlineAcademicText(bullet[1])}</span>
            </div>
          );
        }

        const numbered = line.match(/^\s*(\d+[.)])\s+(.+)$/);
        if (numbered) {
          return (
            <div key={`n-${index}`} className="flex items-start gap-2 pl-1">
              <span className="shrink-0 font-semibold text-violet-200">{numbered[1]}</span>
              <span className="min-w-0 flex-1">{renderInlineAcademicText(numbered[2])}</span>
            </div>
          );
        }

        if (!line.trim()) return <div key={`sp-${index}`} className="h-2" />;

        return (
          <p key={`p-${index}`} className="whitespace-pre-wrap">
            {renderInlineAcademicText(line)}
          </p>
        );
      })}
    </div>
  );
}

function cleanExtractedAcademicText(value: string) {
  const normalized = String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[ \t]+/g, ' ');

  const lines = normalized.split('\n').map((line) => line.trim());
  const frequencies = new Map<string, number>();

  for (const line of lines) {
    if (!line || line.length < 3 || line.length > 160) continue;
    if (/^(?:LITERATÚRA|LITERATURA|REFERENCES|BIBLIOGRAFIA|ABSTRACT|ABSTRAKT|ÚVOD|INTRODUCTION)$/i.test(line)) continue;
    const key = normalizeForMatch(line);
    if (!key) continue;
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
  }

  const seenRepeated = new Set<string>();
  const cleanedLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      cleanedLines.push('');
      continue;
    }

    // Čisté označenia strán zachovávame. Backend ich môže použiť na
    // overenie konkrétnych strán, z ktorých sa pri tvorbe textu čerpalo.
    if (/^[-–—]\s*\d{1,4}\s*[-–—]$/.test(line)) {
      continue;
    }

    const key = normalizeForMatch(line);
    const isRepeatedHeaderOrFooter = Boolean(key) && (frequencies.get(key) || 0) >= 3;
    if (isRepeatedHeaderOrFooter) {
      if (seenRepeated.has(key)) continue;
      seenRepeated.add(key);
    }

    cleanedLines.push(line);
  }

  return cleanedLines
    .join('\n')
    .replace(/([A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž])-\n([a-záäčďéíĺľňóôŕšťúýž])/g, '$1$2')
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
    'SEKUNDÁRNE DOPLNKOVÉ ZDROJE',
    'SEKUNDARNE DOPLNKOVE ZDROJE',
  ];

  const sourceSectionNames = [
    'POUŽITÉ ZDROJE A AUTORI',
    'POUŽITÉ ZDROJE',
    'ZDROJE A AUTORI',
    'ZDROJE',
    'PRIMÁRNE ZDROJE',
    'PRIMARNE ZDROJE',
    'SEKUNDÁRNE ZDROJE',
    'SEKUNDARNE ZDROJE',
    'SEKUNDÁRNE DOPLNKOVÉ ZDROJE',
    'SEKUNDARNE DOPLNKOVE ZDROJE',
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


type StreamedApiErrorPayload = {
  code?: string;
  message?: string;
  error?: string;
  detail?: string;
  status?: number;
  requestId?: string;
};

function stripInternalStreamPayload(value: string): string {
  const text = String(value || '');
  const completeMarkerIndex = text.indexOf(streamedApiErrorPrefix);

  if (completeMarkerIndex >= 0) {
    return text.slice(0, completeMarkerIndex);
  }

  // Marker môže byť rozdelený medzi dva streamované chunky. Už prvú časť
  // interného technického prefixu preto skryjeme pred používateľom.
  const partialMarkerIndex = text.lastIndexOf('__ZEDPERA_');

  if (partialMarkerIndex >= 0) {
    return text.slice(0, partialMarkerIndex);
  }

  return text;
}

function readStreamedApiError(
  value: string,
): StreamedApiErrorPayload | null {
  const markerIndex = value.indexOf(
    streamedApiErrorPrefix,
  );

  if (markerIndex < 0) return null;

  const rawPayload = value
    .slice(
      markerIndex +
        streamedApiErrorPrefix.length,
    )
    .trim();

  if (!rawPayload) {
    return {
      code: 'API_UNAVAILABLE',
      message:
        'AI služba ukončila spracovanie bez použiteľnej odpovede.',
    };
  }

  try {
    return JSON.parse(
      rawPayload,
    ) as StreamedApiErrorPayload;
  } catch {
    return {
      code: 'API_UNAVAILABLE',
      message: rawPayload,
    };
  }
}

function getCompactPreparedFileName(
  originalName: string,
): string {
  const baseName = originalName.replace(
    /\.[^.]+$/,
    '',
  );

  return `${sanitizeFileName(
    baseName || originalName,
  )}.extracted.txt`;
}

async function readLocalTextFallback(
  file: File,
): Promise<string> {
  const extension = getFileExtension(
    file.name,
  );

  if (
    ![
      '.txt',
      '.md',
      '.csv',
      '.rtf',
    ].includes(extension)
  ) {
    return '';
  }

  return cleanAiOutput(
    await file.text(),
  );
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
    'V záverečných sekciách Primárne zdroje a Sekundárne / doplnkové zdroje nepoužívaj poradové ani referenčné čísla.',
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

  if (lower.includes('isbn')) return 'book';

  if (
    lower.includes('issn') ||
    lower.includes('doi') ||
    lower.includes('journal') ||
    lower.includes('vol.') ||
    lower.includes('volume') ||
    lower.includes('issue') ||
    lower.includes('časopis') ||
    lower.includes('štúdia') ||
    lower.includes('article') ||
    /\b(?:j\.|plant|cereal|biol\.|physiol\.|breed\.)\b/i.test(line)
  ) {
    return 'article';
  }

  if (lower.includes('http://') || lower.includes('https://') || lower.includes('www.')) {
    return 'web';
  }

  if (
    lower.includes('vydavateľ') ||
    lower.includes('publisher') ||
    lower.includes('monografia') ||
    lower.includes('book') ||
    lower.includes('press')
  ) {
    return 'book';
  }

  return 'unknown';
}

function extractDoi(line: string) {
  const match = line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i);
  return match?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractIsbn(line: string) {
  const match = line.match(/\bISBN(?:-1[03])?\s*:?\s*((?:97[89][\s-]?)?[0-9][0-9\s-]{8,16}[0-9X])\b/i);
  return match?.[1]?.replace(/\s+/g, '').trim() || null;
}

function extractIssn(line: string) {
  const match = line.match(/\bISSN\s*:?\s*([0-9]{4}[\s-]?[0-9]{3}[0-9X])\b/i);
  return match?.[1]?.replace(/\s+/g, '').replace(/^(\d{4})(\d{4})$/, '$1-$2') || null;
}

function extractPages(line: string) {
  const explicit = line.match(/(?:\bs\.|\bstr\.|\bpp\.|\bpages?)\s*:?\s*([0-9]+\s*[–—-]\s*[0-9]+)/i);
  const generic = line.match(/\b([0-9]{1,4}\s*[–—-]\s*[0-9]{1,4})\b/);
  return (explicit?.[1] || generic?.[1] || null)?.replace(/\s+/g, '').replace(/[—-]/g, '–') || null;
}

function extractYear(line: string) {
  const match =
    line.match(/\((18|19|20)\d{2}[a-z]?\)/i) ||
    line.match(/\b(18|19|20)\d{2}[a-z]?\b/i) ||
    line.match(/\bn\.d\.\b/i);

  return match?.[0]?.replace(/[()]/g, '') || null;
}

function isPlausibleBibliographicAuthor(value: string) {
  const cleaned = normalizeAuthorDisplay(value)
    .replace(/[;,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 3 || cleaned.length > 100) return false;
  if (/\d/.test(cleaned)) return false;
  if (/\b(?:literatúra|literatura|references|reference|journal|press|publisher|university|nitra|genet|chem|biosys|encyclopedia|volume|issue|pages?|doi|issn|isbn|abstract|summary|metóda|metoda)\b/i.test(cleaned)) return false;

  const tokens = cleaned
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const singleLetterTokens = tokens.filter((token) => /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]$/i.test(token));
  const surnameLikeTokens = tokens.filter((token) => /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž'’\-]{2,}$/i.test(token));

  // Odmietne OCR artefakty typu „Genet., A. I. W. T. A.“ bez reálneho priezviska.
  if (singleLetterTokens.length >= 3 && surnameLikeTokens.length === 0) return false;

  return surnameLikeTokens.length >= 1 || /,\s*(?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*){1,5}$/i.test(cleaned);
}

function extractAuthors(line: string) {
  const normalizedLine = normalizeSlovakCitationText(line);
  const beforeYear = normalizedLine.split(/\b(18|19|20)\d{2}[a-z]?\b/i)[0] || '';

  const authorRegion = beforeYear.includes(':')
    ? beforeYear.slice(0, beforeYear.indexOf(':'))
    : beforeYear;

  const cleaned = authorRegion
    .replace(/\bet\s+al\.?/gi, '')
    .replace(/\ba\s+kol\.?/gi, '')
    .replace(/^[-•\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const authors: string[] = [];
  const initialsPattern = /^(?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*){1,6}$/;
  const surnamePattern = /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-záäčďéíĺľňóôŕšťúýž.'’\-]{1,80}$/;

  const segments = cleaned
    .replace(/\s+(?:&|and)\s+/gi, ';')
    .split(/\s*;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const tokens = segment
      .split(/\s*,\s*/)
      .map((token) => token.trim())
      .filter(Boolean);

    let index = 0;
    while (index < tokens.length) {
      const surname = tokens[index] || '';
      const initials = tokens[index + 1] || '';

      if (surnamePattern.test(surname) && initialsPattern.test(initials)) {
        authors.push(
          `${normalizeAuthorDisplay(surname)}, ${normalizeAuthorDisplay(initials)}`,
        );
        index += 2;
        continue;
      }

      const fullName = normalizeAuthorDisplay(surname);
      if (
        fullName.length >= 3 &&
        fullName.length <= 120 &&
        /[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(fullName) &&
        !/\b(?:http|www\.|doi|isbn|issn|volume|issue|pages?|journal|press)\b/i.test(fullName)
      ) {
        authors.push(fullName);
      }

      index += 1;
    }
  }

  return uniqueArray(authors)
    .filter(isPlausibleBibliographicAuthor)
    .slice(0, 20);
}

function extractTitle(line: string) {
  let working = normalizeSlovakCitationText(line.trim())
    .replace(/^[-•\d.)\s]+/, '')
    .replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '')
    .replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, '');

  const quoted =
    working.match(/"([^"]{5,320})"/) ||
    working.match(/„([^“”]{5,320})“/) ||
    working.match(/'([^']{5,320})'/);

  if (quoted?.[1]) return quoted[1].trim();

  const colonIndex = working.indexOf(':');
  if (colonIndex > 0 && colonIndex < 280) {
    const afterColon = working.slice(colonIndex + 1).trim();
    const titleBeforeJournal = afterColon.match(/^(.+?)[.]\s+(?=[A-Z][A-Za-z. ]{2,80},?\s*\d)/);
    if (titleBeforeJournal?.[1]) return titleBeforeJournal[1].replace(/\.$/, '').trim().slice(0, 420);
  }

  const yearMatch = working.match(/\b(?:18|19|20)\d{2}[a-z]?\b/i);
  if (yearMatch && typeof yearMatch.index === 'number') {
    const beforeYear = working.slice(0, yearMatch.index).trim();
    const colon = beforeYear.indexOf(':');
    const candidate = colon >= 0 ? beforeYear.slice(colon + 1) : beforeYear;
    const parts = candidate.split(/\.\s+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[0].slice(0, 420);
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1].slice(0, 420);

  return null;
}

function extractBibliographySectionText(text: string) {
  const cleaned = cleanAiOutput(text);
  const heading = /(?:^|\n)\s*(?:ZOZNAM\s+)?(?:POUŽITEJ\s+|POUŽITÁ\s+|POUŽITE\s+)?(?:LITERATÚRA|LITERATURA|BIBLIOGRAFIA|REFERENCES|REFERENCE LIST|POUŽITÉ ZDROJE)\s*:?[ \t]*(?:\n|$)/i;
  const match = heading.exec(cleaned);

  if (match && typeof match.index === 'number') {
    return cleaned.slice(match.index + match[0].length).trim();
  }

  // Bez identifikovanej bibliografie sa text článku nesmie meniť na zoznam
  // sekundárnych zdrojov. Ako bezpečný OCR fallback akceptujeme iba blok
  // viacerých bibliografických záznamov v poslednej časti dokumentu.
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 6) return '';

  const tailStart = Math.floor(lines.length * 0.55);
  const tail = lines.slice(tailStart);
  const referenceIndexes = tail
    .map((line, index) => (looksLikeBibliographicLine(line) ? index : -1))
    .filter((index) => index >= 0);

  if (referenceIndexes.length < 3) return '';

  return tail.slice(referenceIndexes[0]).join('\n').trim();
}

function looksLikeBibliographicLine(line: string) {
  const trimmed = normalizeSlovakCitationText(line.trim());
  if (trimmed.length < 20 || trimmed.length > 1800) return false;
  if (/^(SÚBOR|FILE|STRANA|PAGE|ABSTRAKT|ABSTRACT|KĽÚČOVÉ SLOVÁ|KEYWORDS)\s*:/i.test(trimmed)) return false;

  const hasYear = /\b(18|19|20)\d{2}[a-z]?\b|\bn\.d\.\b/i.test(trimmed);
  const hasDoi = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(trimmed);
  const hasUrl = /https?:\/\/|www\./i.test(trimmed);
  const hasIdentifier = /\b(?:ISBN|ISSN)\b/i.test(trimmed);
  const hasPages = /(?:\bs\.|\bstr\.|\bpp\.|\bpages?)\s*\d+\s*[–—-]\s*\d+/i.test(trimmed);
  const hasCitationWords =
    /publisher|journal|doi|isbn|issn|vydavateľ|časopis|university|press|available|dostupné|retrieved|vol\.|volume|issue|pages|pp\.|\bs\./i.test(trimmed);
  const hasAuthorPattern =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-záäčďéíĺľňóôŕšťúýž.'’ -]+,\s*[A-Z]/.test(trimmed) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'’ -]+\s+\([12]\d{3}\)/.test(trimmed);

  return hasDoi || hasIdentifier || (hasYear && (hasCitationWords || hasAuthorPattern || hasPages));
}

function inferJournalVolumeIssue(line: string) {
  const normalized = normalizeSlovakCitationText(line);
  const yearMatch = normalized.match(/\b(?:18|19|20)\d{2}[a-z]?\b/i);
  const beforeYear = yearMatch && typeof yearMatch.index === 'number'
    ? normalized.slice(0, yearMatch.index).replace(/[,;\s]+$/, '')
    : normalized;
  const colonIndex = beforeYear.indexOf(':');
  const afterAuthors = colonIndex >= 0 ? beforeYear.slice(colonIndex + 1).trim() : beforeYear;
  const titleSplit = afterAuthors.match(/^(.+?)[.]\s+(.+)$/);
  const tail = titleSplit?.[2]?.trim() || '';
  const parts = tail.split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return { journal: null, volume: null, issue: null };
  const last = parts[parts.length - 1] || '';
  const volumeIssue = last.match(/^(\d+[A-Za-z]?)(?:\s*\(([^)]+)\))?$/);
  return {
    journal: (volumeIssue ? parts.slice(0, -1).join(', ') : tail) || null,
    volume: volumeIssue?.[1] || null,
    issue: volumeIssue?.[2] || null,
  };
}

function extractBibliographicCandidates(text: string) {
  const bibliographyText = extractBibliographySectionText(text);
  const lines = bibliographyText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const joinedMultilineCandidates: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const parts = [lines[i]];
    for (let offset = 0; offset < 5 && i + offset < lines.length; offset += 1) {
      if (offset > 0) parts.push(lines[i + offset]);
      const candidate = normalizeSlovakCitationText(parts.join(' '));
      joinedMultilineCandidates.push(candidate);
      if (/\b(?:18|19|20)\d{2}[a-z]?\b/i.test(candidate) && /(?:\bs\.|\bstr\.|\bpp\.|\bpages?|doi|isbn|issn|https?:\/\/|www\.)/i.test(candidate)) {
        break;
      }
    }
  }

  const candidates: BibliographicCandidate[] = [];

  for (const line of joinedMultilineCandidates) {
    if (!looksLikeBibliographicLine(line)) continue;

    const authors = extractAuthors(line);
    const year = extractYear(line);
    const { journal, volume, issue } = inferJournalVolumeIssue(line);
    const title = extractTitle(line);
    const item: BibliographicCandidate = {
      raw: normalizeSlovakCitationText(line).slice(0, 1600),
      authors,
      year,
      title,
      doi: extractDoi(line),
      url: extractUrl(line),
      journal,
      volume,
      issue,
      pages: extractPages(line),
      isbn: extractIsbn(line),
      issn: extractIssn(line),
      sourceType: detectSourceType(line),
      citationKey: authors.length && year ? buildCitationKey(authors, year) : undefined,
      origin: 'attachment',
    };

    const hasIdentity = authors.length > 0 && Boolean(year) && Boolean(title);
    if (hasIdentity || item.doi || item.isbn || item.issn) candidates.push(item);
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
      journal: existing.journal || source.journal || null,
      volume: existing.volume || source.volume || null,
      issue: existing.issue || source.issue || null,
      pages: existing.pages || source.pages || null,
      isbn: existing.isbn || source.isbn || null,
      issn: existing.issn || source.issn || null,
      publisher: existing.publisher || source.publisher || null,
      edition: existing.edition || source.edition || null,
      place: existing.place || source.place || null,
      publicationDate: existing.publicationDate || source.publicationDate || null,
      accessDate: existing.accessDate || source.accessDate || null,
      totalPages: existing.totalPages || source.totalPages || null,
      usedPages: existing.usedPages || source.usedPages || null,
      sourceType: existing.sourceType !== 'unknown' ? existing.sourceType : source.sourceType,
      inTextCitations: [...(existing.inTextCitations || []), ...(source.inTextCitations || [])],
      occurrenceCount: (existing.occurrenceCount || 0) + (source.occurrenceCount || 0),
      matchedFromText: existing.matchedFromText || source.matchedFromText,
      sourceDocumentName: existing.sourceDocumentName || source.sourceDocumentName || null,
      citedAccordingTo: existing.citedAccordingTo || source.citedAccordingTo || null,
      origin: existing.origin || source.origin || 'unknown',
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
  const completeBibliography = mergeSources(bibliography);

  // Sekundárny zdroj vznikne iba párovaním citácie v texte s plným záznamom
  // z bibliografie toho istého dokumentu. Samotná citácia „(PARKER a RING 2001)“
  // nikdy nevytvorí pseudo-bibliografický záznam.
  return completeBibliography.map((source) => {
    const sourceAuthors = normalizeAuthors(source.authors);
    const firstSourceAuthor = normalizeForMatch(
      sourceAuthors[0]?.replace(/,.*/, '') || '',
    );

    const matchedCitations = citations.filter((citation) => {
      if (!citation.year || !source.year || citation.year !== source.year) {
        return false;
      }

      if (citation.key && getSourceCitationKey(source) === citation.key) {
        return true;
      }

      const firstCitationAuthor = normalizeForMatch(
        citation.authors?.[0]?.replace(/,.*/, '') || citation.authorText || '',
      );

      return Boolean(
        firstSourceAuthor &&
          firstCitationAuthor &&
          firstSourceAuthor === firstCitationAuthor,
      );
    });

    return {
      ...source,
      inTextCitations: uniqueArray(
        [
          ...(source.inTextCitations || []),
          ...matchedCitations,
        ].map((item) => JSON.stringify(item)),
      ).map((item) => JSON.parse(item) as InTextCitation),
      occurrenceCount:
        (source.occurrenceCount || 0) +
        matchedCitations.reduce((sum, citation) => sum + (citation.count || 1), 0),
      matchedFromText:
        Boolean(source.matchedFromText) || matchedCitations.length > 0,
    };
  });
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy.';
  }

  return candidates
    .map((item, index) => {
      const citationInfo = item.inTextCitations?.length
        ? `\nCitácie v texte: ${item.inTextCitations
            .map((citation) => citation.raw)
            .join('; ')}\nPočet výskytov v texte: ${
            item.occurrenceCount || item.inTextCitations.length
          }`
        : '';

      const totalExtent = item.totalPages
        ? `${item.totalPages} strán`
        : item.pages
          ? `rozsah ${item.pages}`
          : 'neuvedené';

      return `${index + 1}. Pôvodný záznam:\n${item.raw}\n\nAutor/autori: ${
        item.authors.length ? item.authors.join('; ') : 'neuvedený'
      }\nRok: ${item.year || 'neuvedený'}\nCelý názov zdroja: ${
        item.title || 'neuvedený'
      }\nČasopis / zborník: ${item.journal || 'neuvedené'}\nVydavateľstvo: ${
        item.publisher || 'neuvedené'
      }\nMiesto vydania: ${item.place || 'neuvedené'}\nVydanie: ${
        item.edition || 'neuvedené'
      }\nRočník / zväzok: ${item.volume || 'neuvedené'}\nČíslo: ${
        item.issue || 'neuvedené'
      }\nCelkový rozsah / rozsah článku: ${totalExtent}\nPoužité strany: ${
        item.usedPages || 'nepodarilo sa spoľahlivo identifikovať'
      }\nISBN: ${item.isbn || 'neuvedené'}\nISSN: ${
        item.issn || 'neuvedené'
      }\nTyp zdroja: ${item.sourceType}\nDOI: ${
        item.doi || 'neuvedené'
      }\nURL: ${item.url || 'neuvedené'}\nDátum publikovania: ${
        item.publicationDate || 'neuvedené'
      }\nDátum prístupu: ${item.accessDate || 'neuvedené'}\nPríloha / zdrojový dokument: ${
        item.sourceDocumentName || 'neuvedené'
      }${citationInfo}`;
    })
    .join('\n\n');
}

function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueArray(
      value
        .map((item) => normalizeAuthorDisplay(String(item || '')))
        .filter(Boolean),
    );
  }

  if (typeof value === 'string') {
    const structured = extractAuthors(value);
    if (structured.length) return structured;

    return uniqueArray(
      value
        .split(/\n|;|\band\b|\ba\b/gi)
        .map((item) => normalizeAuthorDisplay(item.trim()))
        .filter(Boolean),
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
        journal: item?.journal ? String(item.journal) : null,
        volume: item?.volume ? String(item.volume) : null,
        issue: item?.issue ? String(item.issue) : null,
        pages: item?.pages ? String(item.pages) : null,
        isbn: item?.isbn ? String(item.isbn) : null,
        issn: item?.issn ? String(item.issn) : null,
        publisher: item?.publisher ? String(item.publisher) : null,
        edition: item?.edition ? String(item.edition) : null,
        place: item?.place ? String(item.place) : null,
        publicationDate: item?.publicationDate ? String(item.publicationDate) : null,
        accessDate: item?.accessDate ? String(item.accessDate) : null,
        totalPages: Number.isFinite(Number(item?.totalPages)) ? Number(item.totalPages) : null,
        usedPages: item?.usedPages ? String(item.usedPages) : null,
        sourceType:
          item?.sourceType === 'book' ||
          item?.sourceType === 'article' ||
          item?.sourceType === 'web' ||
          item?.sourceType === 'software' ||
          item?.sourceType === 'unknown'
            ? item.sourceType
            : 'unknown',
        citationKey: item?.citationKey || (authors.length && year ? buildCitationKey(authors, year) : undefined),
        inTextCitations: Array.isArray(item?.inTextCitations) ? item.inTextCitations : [],
        occurrenceCount: typeof item?.occurrenceCount === 'number' ? item.occurrenceCount : 0,
        matchedFromText: Boolean(item?.matchedFromText),
        sourceDocumentName: item?.sourceDocumentName ? String(item.sourceDocumentName) : null,
        citedAccordingTo: item?.citedAccordingTo ? String(item.citedAccordingTo) : null,
        origin: item?.origin || 'attachment',
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
  formData.append('preserveRawBibliography', 'true');
  formData.append('preserveMultilineTitle', 'true');
  formData.append('detectIsbnIssn', 'true');
  formData.append('detectPageRanges', 'true');
  formData.append('preservePageBoundaries', 'true');
  formData.append('preservePageNumbers', 'true');

  /**
   * /api/extract-text je pomocná predspracovacia fáza. Globálny
   * ZedperaErrorProvider zachytáva neúspešné fetch() volania na /api/* a
   * zobrazí technické okno ešte predtým, než má chat šancu použiť lokálny
   * fallback. Preto tento interný request zámerne neposielame cez fetch().
   *
   * XMLHttpRequest sa používa iba pre túto pomocnú extrakciu. Finálne
   * /api/chat volanie zostáva na fetch(), takže skutočná chyba chatu sa
   * používateľovi naďalej zobrazí štandardným spôsobom.
   */
  const extractionResponse = await new Promise<{
    status: number;
    ok: boolean;
    contentType: string;
    body: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', '/api/extract-text', true);
    xhr.timeout = attachmentExtractionTimeoutMs;
    xhr.responseType = 'text';
    xhr.setRequestHeader(
      'x-zedpera-background-request',
      'true',
    );
    xhr.setRequestHeader(
      'x-zedpera-error-delay-ms',
      '300000',
    );

    xhr.onload = () => {
      resolve({
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        contentType:
          xhr.getResponseHeader('content-type') || '',
        body: String(xhr.responseText || ''),
      });
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Nepodarilo sa spojiť s extrakčným endpointom pre súbor „${originalName}“.`,
        ),
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          `Extrakcia súboru „${originalName}“ prekročila ${Math.round(
            attachmentExtractionTimeoutMs / 1000,
          )} sekúnd. Súbor bude vynechaný a ostatné prílohy sa spracujú ďalej.`,
        ),
      );
    };

    xhr.onabort = () => {
      reject(
        new Error(
          `Extrakcia súboru „${originalName}“ bola prerušená.`,
        ),
      );
    };

    xhr.send(formData);
  });

  let data: ExtractTextApiResponse;

  if (
    extractionResponse.contentType.includes(
      'application/json',
    )
  ) {
    try {
      data = JSON.parse(
        extractionResponse.body || '{}',
      ) as ExtractTextApiResponse;
    } catch {
      throw new Error(
        `Extrakčný endpoint vrátil neplatný JSON pre súbor „${originalName}“.`,
      );
    }
  } else {
    throw new Error(
      extractionResponse.body ||
        `Extrakčný endpoint vrátil neplatnú odpoveď ${extractionResponse.status}.`,
    );
  }

  if (!extractionResponse.ok || data.ok === false) {
    throw new Error(
      data.error ||
        data.message ||
        `Extrakcia zlyhala pre súbor ${originalName}.`,
    );
  }

  const extractedText = cleanExtractedAcademicText(extractTextFromExtractApi(data));

  if (!extractedText.trim()) {
    throw new Error(data.message || `Extrakcia prebehla, ale text zo súboru ${originalName} je prázdny.`);
  }

  const apiDetectedSources = extractSourcesFromExtractApi(data);
  const apiAuthors = extractAuthorsFromExtractApi(data);
  const inTextCitations = extractInTextCitations(extractedText);
  const localDetectedSources = extractBibliographicCandidates(extractedText);

  // Lokálny parser má k dispozícii celý extrahovaný text a cielene číta iba
  // bibliografiu dokumentu. Má preto prednosť pred staršími metadátami z
  // /api/extract-text, ktoré mohli vzniknúť z prvého riadku alebo z citácie
  // v tele článku. API kandidáta použijeme iba ako fallback a len ak má
  // autora, rok aj názov.
  const safeApiDetectedSources = apiDetectedSources.filter((source) =>
    source.authors.length > 0 &&
    Boolean(source.year) &&
    Boolean(source.title) &&
    String(source.raw || '').trim().length >= 30,
  );
  const bibliographyCandidates = localDetectedSources.length
    ? localDetectedSources
    : safeApiDetectedSources;

  const pairedSources = pairInTextCitationsWithBibliography({
    citations: inTextCitations,
    bibliography: bibliographyCandidates,
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
    pageCount: Number.isFinite(Number(data.meta?.pages)) ? Number(data.meta?.pages) : null,
    detectedSources: mergedSources,
    inTextCitations,
    detectedAuthors: mergedAuthors,
    formattedSources: formatBibliographicCandidates(mergedSources),
    meta: data.meta || {},
  };
}

// ================= CONTEXT BUILDERS =================

function buildExtractedContext(preparedFiles: PreparedFile[]) {
  const readableFiles = preparedFiles.filter(
    (item) => item.extractedText?.trim(),
  );

  if (!readableFiles.length) return '';

  // Každá príloha dostane vlastný spravodlivý kontextový rozpočet.
  // Posledné súbory sa preto neodrežú iba preto, že prvá príloha bola dlhá.
  const perFileBudget = Math.max(
    7_000,
    Math.floor(
      maxTotalExtractedContextChars /
        readableFiles.length,
    ),
  );

  const metadataBudget = Math.max(
    1_800,
    Math.floor(perFileBudget * 0.28),
  );

  const textBudget = Math.max(
    4_500,
    perFileBudget - metadataBudget,
  );

  return readableFiles
    .map((item) => {
      const metadata = `
Súbor: ${item.originalName}
Pôvodná veľkosť: ${formatBytes(item.originalSize)}
Prenosová veľkosť: ${formatBytes(item.preparedSize)}
Stav extrakcie: ${item.extractionStatus}
Metóda extrakcie: ${item.extractionMethod || 'neuvedené'}
Správa extrakcie: ${item.extractionMessage || 'neuvedené'}
Počet citácií nájdených priamo v texte: ${item.inTextCitations?.length || 0}
Počet detegovaných zdrojov: ${item.detectedSources?.length || 0}
Autori nájdení v dokumente: ${item.detectedAuthors.length ? item.detectedAuthors.join(', ') : 'neuvedené'}

CITÁCIE A ZDROJE Z PRÍLOHY:
${truncateByChars(
  [
    formatInTextCitations(item.inTextCitations || []),
    item.formattedSources || '',
    formatBibliographicCandidates(item.detectedSources || []),
  ]
    .filter(Boolean)
    .join('\n\n'),
  metadataBudget,
)}`.trim();

      const attachmentText = truncateByChars(
        item.extractedText,
        Math.min(
          maxClientExtractedCharsPerFile,
          textBudget,
        ),
      );

      return `=== EXTRAHOVANÝ TEXT Z PRÍLOHY ===
${metadata}

TEXT PRÍLOHY:
${attachmentText}`;
    })
    .join(
      '\n\n========================================\n\n',
    );
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
  const hasAttachments = attachmentCount > 0;

  return [
    'REŽIM SOURCE-GROUNDED AKADEMICKÉHO PÍSANIA:',
    `Používateľská požiadavka: ${userInstruction || 'Spracuj priložené dokumenty.'}`,
    `Aktívny profil / cieľová práca: „${profileTitle}“.`,
    `Počet aktuálne priložených dokumentov: ${attachmentCount}.`,
    '',
    'HIERARCHIA PODKLADOV:',
    '1. Presný pokyn používateľa určuje, čo sa má vytvoriť.',
    hasAttachments
      ? '2. Aktuálne priložené dokumenty sú primárnym odborným a evidenčným podkladom. Považuj ich za zámerne vybrané používateľom; nevyraďuj ich iba preto, že majú slabú slovnú zhodu s profilom.'
      : '2. Bez aktuálnej prílohy používaj iba bezpečne dostupný profil a overené akademické zdroje.',
    '3. Profil určuje cieľové zaradenie textu, jazyk, citačnú normu a – ak je dostupná – štruktúru práce. Profil nesmie prehlušiť konkrétny obsah prílohy.',
    '',
    'POVINNÝ INTERNÝ POSTUP PRED PÍSANÍM:',
    'A. Najprv urč typ výstupu: kapitola, podkapitola, úvod, analýza, prepis alebo iná úloha.',
    hasAttachments
      ? 'B. Prečítaj priložený dokument ako celok: titulný blok, abstrakt/súhrn, jadro textu, metodiku, výsledky, diskusiu a bibliografiu. Vytvor si internú mapu: tvrdenie -> miesto v dokumente -> autor/rok -> bibliografický záznam.'
      : 'B. Bez prílohy pracuj iba s podkladmi, ktoré možno bezpečne overiť.',
    'C. Ak používateľ žiada kapitolu, nevytváraj lineárny súhrn článku. Syntetizuj odbornú kapitolu, v ktorej je článok zdrojom dôkazov pre relevantné časti textu.',
    'D. Ak profil obsahuje osnovu alebo názov požadovanej kapitoly, použi ju ako cieľovú štruktúru. Ak ju neobsahuje, vytvor prirodzenú odbornú štruktúru podľa zadania a obsahu prílohy.',
    'E. Pred odoslaním skontroluj, že každé konkrétne číslo, výsledok, atribúcia autora alebo špecifické vedecké tvrdenie má oporu v dostupnom zdroji a že citácia je vložená priamo do toho odseku, ktorého tvrdenie podporuje.',
    '',
    'ŠTÝL AKADEMICKÉHO VÝSTUPU:',
    'Píš prirodzene, odborne a argumentačne. Text nesmie pôsobiť ako výpis z PDF ani ako generický AI súhrn.',
    'Pri kapitole používaj číslované akademické nadpisy typu „1. Názov“, „1.1 Podkapitola“, „1.2 Podkapitola“. Markdownové ##/### používaj iba vtedy, keď ich používateľ výslovne žiada.',
    'Odseky prepájaj logickými prechodmi. Odrážky používaj iba tam, kde ide prirodzene o výpočet, klasifikáciu, kroky alebo vlastnosti.',
    'Nevkladaj do tela textu technické vety typu „podľa nahratej prílohy“, „AI analyzovala súbor“ alebo opis interného procesu.',
    '',
    hasAttachments
      ? 'PRI AKTUÁLNEJ PRÍLOHE JE ZAKÁZANÉ DOPĹŇAŤ ODBORNÉ FAKTY Z PAMÄTE MODELU. Dovolené sú iba jazykové prechody a štylistické spojenia bez nových vecných tvrdení. Každé odborné tvrdenie, číslo, výsledok, autor, rok alebo bibliografický údaj musí vychádzať z aktuálnej prílohy a musí byť citovaný priamo v texte.'
      : 'Pri výstupe bez prílohy nevymýšľaj fakty ani bibliografiu a používaj iba overiteľné akademické zdroje.',
    '',
    'ZDROJOVÁ PROVENIENCIA:',
    hasAttachments
      ? 'Primárny zdroj je samotná použitá publikácia. Identifikuj jej skutočný celý názov, všetkých bezpečne zistených autorov, rok a dostupné bibliografické údaje; názov súboru je iba technická informácia „Zdrojový súbor“.'
      : 'Bez prílohy používaj iba dôveryhodne overené bibliografické záznamy.',
    hasAttachments
      ? 'Ak priložená publikácia cituje inú prácu a túto pôvodnú prácu si priamo nedostal ani nezískal ako overený externý zdroj, zachovaj v texte nepriamu provenienciu – napr. „(Autor, rok, cit. v PrimárnyAutor et al., rok)“ alebo jazykovo ekvivalentný tvar. Netvár sa, že si pôvodnú prácu čítal priamo.'
      : 'Citácie bez prílohy musia smerovať na reálne overené zdroje.',
    hasAttachments
      ? 'Úplný sekundárny bibliografický záznam môže byť použitý iba vtedy, keď sa citácia autor–rok bezpečne spáruje s úplným záznamom v bibliografii prílohy. OCR fragment ani samotné meno a rok nestačia.'
      : 'Neúplné alebo neisté bibliografické záznamy nepoužívaj.',
    `Citačná norma z profilu práce: ${citationStyle}.`,
    buildCitationStyleInstructions(citationStyle),
    'Na konci ponechaj samostatné sekcie Primárne zdroje a Sekundárne / doplnkové zdroje. V oboch sekciách vypisuj iba hotové bibliografické záznamy podľa aktívnej citačnej normy; nevypisuj interné polia, diagnostické poznámky ani formulárové položky typu Autor/autori, Rok, Názov, Typ zdroja, Použité strany alebo Príloha / zdrojový dokument.',
    'PRIMÁRNE ZDROJE – každý skutočne použitý primárny dokument zapíš ako jeden štandardný bibliografický záznam podľa normy profilu, napr. AUTOR(I): Názov. Časopis / vydavateľské údaje, ročník, rok, strany, DOI/ISBN/ISSN podľa dostupnosti. Nevypisuj pomocné názvy polí.',
    'Strany, ročník, číslo, DOI, ISBN, ISSN, vydavateľa alebo URL vlož priamo do bibliografického záznamu iba vtedy, keď sú bezpečne dostupné. Chýbajúci údaj nevymýšľaj a nevytváraj kvôli nemu osobitný diagnostický riadok.',
    'SEKUNDÁRNE / DOPLNKOVÉ ZDROJE – uveď iba úplné bibliografické záznamy zdrojov, ktoré boli reálne citované v texte a bezpečne spárované s bibliografiou primárneho dokumentu. Nevypisuj k nim komentár „Použité v práci“, „Prevzaté z“ ani internú provenienciu; tá patrí iba do interného spracovania.',
    'Citácie musia byť priamo v texte a každý zdroj uvedený na konci musí mať väzbu na citáciu v texte. Nevymýšľaj zdroje, DOI, URL, autorov, roky, ISBN, ISSN, rozsahy ani čísla strán. Interný názov súboru používaj iba na serverové párovanie, nie ako viditeľnú položku bibliografie.',
  ].join('\n');
}

// ================= PAGE =================

export default function ChatPage() {
  const router = useRouter();
  const {
    error: systemError,
    showError: showSystemError,
    clearError: clearSystemError,
  } = useZedperaErrorCenter();

  const systemBlocked =
    systemError?.blocking === true;

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
  // Dôležité pre hydratáciu Next.js:
  // prvý serverový aj klientsky render musia mať identický stav.
  // URL parametre načítame až v existujúcom useEffecte nižšie.
  const [routeContext, setRouteContext] =
    useState<ChatRouteContext>(EMPTY_CHAT_ROUTE_CONTEXT);

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
  !systemBlocked &&
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






const handleSelectLanguage = (nextLanguage: AppLanguage) => {
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

  const updatedProfile = withSystemLanguageProfile(
    activeProfile,
    nextLanguage,
  );
  setActiveProfile(updatedProfile);

  if (updatedProfile) {
    localStorage.setItem(
      'active_profile',
      JSON.stringify(updatedProfile),
    );
    localStorage.setItem(
      'profile',
      JSON.stringify(updatedProfile),
    );
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
};

  const updateProcessingLog = (id: string, patch: Partial<ProcessingLogItem>) => {
    setProcessingLog((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const prepareBackendFile = async (
    item: AttachedFile,
    options: {
      targetBytes: number;
      extractedCharLimit: number;
      sourceLimit: number;
      authorLimit: number;
      citationLimit: number;
    },
  ): Promise<PreparedFile> => {
    updateProcessingLog(item.id, {
      status: 'extracting',
      message:
        'Načítavam obsah prílohy a pripravujem kompaktný prenos pre /api/chat.',
      originalSize: item.size,
    });

    try {
      let extraction: Awaited<
        ReturnType<
          typeof callExtractTextApi
        >
      >;

      try {
        extraction = await callExtractTextApi({
          file: item.file,
          fileName: item.name,
          originalName: item.name,
          compressed: false,
        });
      } catch (apiError) {
        const localText = cleanExtractedAcademicText(
          await readLocalTextFallback(item.file),
        );

        if (!localText) throw apiError;

        // Pomocný /api/extract-text mohol vrátiť napr. 413, ale lokálny
        // fallback je použiteľný. Takýto medzikrok nie je finálna chyba chatu.
        clearSystemError();

        const localCitations =
          extractInTextCitations(localText);
        const localSources =
          pairInTextCitationsWithBibliography({
            citations: localCitations,
            bibliography:
              extractBibliographicCandidates(
                localText,
              ),
          });

        extraction = {
          extractedText: localText,
          method: 'browser-file-text',
          message:
            'Text bol načítaný priamo v prehliadači.',
          pageCount: null,
          detectedSources: localSources,
          inTextCitations: localCitations,
          detectedAuthors: uniqueArray([
            ...localCitations.flatMap(
              (citation) => citation.authors,
            ),
            ...localSources.flatMap(
              (source) => source.authors,
            ),
          ]),
          formattedSources:
            formatBibliographicCandidates(
              localSources,
            ),
          meta: {},
        };
      }

      const extractedText = truncateByChars(
        extraction.extractedText,
        options.extractedCharLimit,
      );

      const preparedName =
        getCompactPreparedFileName(
          item.name,
        );
      const preparedFile = new File(
        [extractedText],
        preparedName,
        {
          type: 'text/plain;charset=utf-8',
        },
      );

      const detectedSources =
        extraction.detectedSources.slice(
          0,
          options.sourceLimit,
        );
      const inTextCitations =
        extraction.inTextCitations.slice(
          0,
          options.citationLimit,
        );
      const detectedAuthors =
        extraction.detectedAuthors.slice(
          0,
          options.authorLimit,
        );
      const formattedSources =
        truncateByChars(
          extraction.formattedSources ||
            formatAllDetectedSources({
              citations: inTextCitations,
              sources: detectedSources,
              files: [],
            }),
          8_000,
        );

      updateProcessingLog(item.id, {
        status: 'extracted',
        message:
          'Príloha bola prečítaná a pripravená ako kompaktný text pre spoločné spracovanie až 10 dokumentov.',
        preparedSize:
          preparedFile.size,
        extractedChars:
          extractedText.length,
        detectedSourcesCount:
          detectedSources.length,
        detectedAuthorsCount:
          detectedAuthors.length,
        detectedInTextCitationsCount:
          inTextCitations.length,
      });

      return {
        originalId: item.id,
        originalName: item.name,
        originalSize: item.size,
        originalType: item.type,
        preparedName,
        preparedSize:
          preparedFile.size,
        preparedType:
          preparedFile.type ||
          'text/plain;charset=utf-8',
        compressionMode:
          'raw_small_text',
        file: preparedFile,
        extractedText,
        extractionMethod:
          extraction.method ||
          'extract-text',
        extractionMessage:
          extraction.message ||
          'Obsah prílohy bol extrahovaný a skomprimovaný.',
        pageCount: extraction.pageCount || null,
        detectedSources,
        inTextCitations,
        detectedAuthors,
        formattedSources,
        extractionStatus:
          'client_extracted',
        warning: undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Extrakcia prílohy zlyhala.';

      // Malý súbor môže ešte bezpečne spracovať serverový parser/OCR.
      // Veľký nečitateľný originál neposielame naslepo, pretože by prekročil
      // bezpečný limit požiadavky a zablokoval aj ostatné použiteľné prílohy.
      if (
        item.size <=
        Math.min(
          options.targetBytes,
          maxDirectFallbackFileBytes,
        )
      ) {
        updateProcessingLog(item.id, {
          status: 'ready',
          message:
            'Pomocná extrakcia zlyhala; malý originál spracuje serverový parser alebo OCR.',
          preparedSize: item.size,
          warning: message,
        });

        clearSystemError();

        return {
          originalId: item.id,
          originalName: item.name,
          originalSize: item.size,
          originalType: item.type,
          preparedName: item.name,
          preparedSize: item.size,
          preparedType:
            item.type ||
            'application/octet-stream',
          compressionMode:
            'raw_small_text',
          file: item.file,
          extractedText: '',
          extractionMethod:
            'server_parser_and_multimodal_fallback',
          extractionMessage: message,
          pageCount: null,
          detectedSources: [],
          inTextCitations: [],
          detectedAuthors: [],
          formattedSources: '',
          extractionStatus:
            'backend_required',
          warning: message,
        };
      }

      updateProcessingLog(item.id, {
        status: 'error',
        message:
          'Obsah prílohy sa nepodarilo prečítať. Súbor nebol odoslaný naslepo.',
        warning: message,
      });

      throw new Error(
        `Súbor „${item.name}“ sa nepodarilo extrahovať a jeho veľkosť ${formatBytes(item.size)} nie je bezpečné odoslať priamo. Skontrolujte, či dokument obsahuje textovú vrstvu alebo OCR. Technický detail: ${message}`,
      );
    }
  };

  const prepareFilesBeforeSend = async (
    files: AttachedFile[],
  ) => {
    if (!files.length) return [];

    if (files.length > maxFilesCount) {
      throw new Error(
        `V jednej požiadavke možno spracovať maximálne  ${maxFilesCount}  príloh.`,
      );
    }

    setProcessingLog(
      files.map((file) => ({
        id: file.id,
        name: file.name,
        status: 'waiting',
        message:
          'Čaká na extrakciu obsahu prílohy.',
        originalSize: file.size,
      })),
    );

    const fileCount = Math.max(
      files.length,
      1,
    );
    const targetBytes = Math.max(
      minPreparedFileTargetBytes,
      Math.min(
        maxPreparedFileTargetBytes,
        Math.floor(
          maxPreparedMultipartBytes /
            fileCount,
        ),
      ),
    );
    const extractedCharLimit = Math.max(
      7_000,
      Math.min(
        maxClientExtractedCharsPerFile,
        Math.floor(
          maxTotalExtractedContextChars /
            fileCount,
        ),
      ),
    );
    const sourceLimit = Math.max(
      8,
      Math.floor(
        maxDetectedSourcesForChat /
          fileCount,
      ),
    );
    const authorLimit = Math.max(
      8,
      Math.floor(
        maxDetectedAuthorsForChat /
          fileCount,
      ),
    );
    const citationLimit = Math.max(
      10,
      Math.floor(
        maxInTextCitationsForChat /
          fileCount,
      ),
    );

    const preparedFiles = new Array<PreparedFile | null>(
      files.length,
    );
    let nextFileIndex = 0;

    const prepareWorker = async () => {
      while (true) {
        const currentIndex =
          nextFileIndex;
        nextFileIndex += 1;

        if (currentIndex >= files.length) {
          return;
        }

        const currentFile =
          files[currentIndex];

        try {
          const prepared =
            await prepareBackendFile(
              currentFile,
              {
                targetBytes,
                extractedCharLimit,
                sourceLimit,
                authorLimit,
                citationLimit,
              },
            );

          preparedFiles[currentIndex] = {
            ...prepared,
            detectedSources: (prepared.detectedSources || []).map((source) => ({
              ...source,
              sourceDocumentName:
                source.sourceDocumentName || prepared.originalName,
              citedAccordingTo:
                source.citedAccordingTo || prepared.originalName,
            })),
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Prílohu sa nepodarilo pripraviť.';

          preparedFiles[currentIndex] = null;

          updateProcessingLog(
            currentFile.id,
            {
              status: 'error',
              message:
                'Táto príloha bola vynechaná. Ostatné prílohy sa spracujú ďalej.',
              warning: message,
            },
          );

          console.warn(
            'CHAT_ATTACHMENT_PREPARATION_SKIPPED:',
            {
              fileName:
                currentFile.name,
              message,
            },
          );

          // Jedna pomocná extrakcia môže zlyhať, pričom ostatné prílohy
          // zostávajú použiteľné. Blokujúca hláška sa zobrazí až vtedy,
          // keď zlyhá celá požiadavka alebo server nemá žiadny vstup.
          clearSystemError();
        }
      }
    };

    await Promise.all(
      Array.from(
        {
          length: Math.min(
            2,
            files.length,
          ),
        },
        () => prepareWorker(),
      ),
    );

    const successfulPreparedFiles =
      preparedFiles.filter(
        (
          file,
        ): file is PreparedFile =>
          Boolean(file),
      );

    if (
      successfulPreparedFiles.length === 0
    ) {
      throw new Error(
        'Nepodarilo sa pripraviť ani jednu použiteľnú prílohu. Skontrolujte textovú vrstvu PDF alebo OCR.',
      );
    }

    const preparedBytes =
      successfulPreparedFiles.reduce(
        (sum, file) =>
          sum + file.preparedSize,
        0,
      );

    if (
      preparedBytes >
      maxPreparedMultipartBytes
    ) {
      throw new Error(
        `Pripravené prílohy majú spolu ${formatBytes(preparedBytes)}. Bezpečný prenosový limit je ${formatBytes(maxPreparedMultipartBytes)}. Znížte rozsah alebo počet dokumentov.`,
      );
    }

    return successfulPreparedFiles;
  };

  const handleFiles = (files: FileList | null) => {
    if (
      systemBlocked ||
      !files ||
      files.length === 0
    ) {
      return;
    }

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

    // Prílohy sa zatiaľ iba pripravia v UI.
    // Do spotreby sa zapíšu až po úspešnom serverovom prečítaní v /api/chat.

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
    if (systemBlocked) return;

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


  const removePendingAssistantMessage = () => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];

      if (
        lastMessage?.role === 'assistant' &&
        !lastMessage.content.trim()
      ) {
        return prev.slice(0, -1);
      }

      return prev;
    });
  };

  const sendPromptToApi = async ({
    visibleUserText,
    apiUserText,
  }: {
    visibleUserText: string;
    apiUserText: string;
  }) => {
    if (systemBlocked) return;
    if (isLoading) return;

    if (!activeProfile) {
      appendAssistantMessage(
        '⚠️ Najprv si vytvor a ulož profil práce. Potom môžeš pokračovať v AI Chate, aby systém vedel pracovať podľa názvu práce, typu práce, cieľa, metodológie a citačnej normy.',
      );
      return;
    }

    // Každé nové generovanie začína čisté 30-sekundové okno.
    // Tým sa zabráni tomu, aby po úspešnom opakovaní vyskočila stará chyba.
    clearSystemError();

    const visibleMessage: ChatMessage = {
      role: 'user',
      content: visibleUserText.trim() || `Spracuj priložené dokumenty (${attachedFiles.length})`,
    };

    setMessages((prev) => [...prev, visibleMessage]);
   setInput('');
    setIsLoading(true);
    setPopupData(null);

    let requestSucceeded = false;

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

      formData.append(
        'sourceMode',
        attachedFiles.length > 0
          ? 'uploaded_documents_first'
          : 'verified_web_sources',
      );
      formData.append('validateAttachmentsAgainstProfile', 'false');
      formData.append('requireSourceList', 'true');

      // Pri prílohách ostáva externé vyhľadávanie aj odborný fallback z pamäte vypnutý.
      // Model smie vytvárať iba jazykové prechody bez nových vecných tvrdení;
      // fakty, čísla, autori a citácie musia zostať ukotvené v prílohách.
      const allowExternalSourcesForThisRequest =
        attachedFiles.length === 0;

      formData.append(
        'allowAiKnowledgeFallback',
        allowExternalSourcesForThisRequest ? 'true' : 'false',
      );
      formData.append('returnExtractedFilesInfo', 'true');
      formData.append('isChapterRequest', isChapterRequest ? 'true' : 'false');

      // Externé akademické zdroje sa zapínajú automaticky iba bez príloh.
      formData.append(
        'enableExternalResearch',
        allowExternalSourcesForThisRequest ? 'true' : 'false',
      );
      formData.append(
        'useExternalAcademicSources',
        allowExternalSourcesForThisRequest ? 'true' : 'false',
      );
      formData.append(
        'useSemanticScholar',
        allowExternalSourcesForThisRequest ? 'true' : 'false',
      );
      formData.append(
        'useCrossref',
        allowExternalSourcesForThisRequest ? 'true' : 'false',
      );
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
            uploadedAt:
              attachedFiles.find(
                (file) =>
                  file.id ===
                  item.originalId,
              )?.uploadedAt || null,
            preparedName: item.preparedName,
            preparedSize: item.preparedSize,
            preparedType: item.preparedType,
            compressionMode: item.compressionMode,
            extractionStatus: item.extractionStatus,
            extractionMethod: item.extractionMethod,
            extractionMessage: item.extractionMessage,
            pageCount: item.pageCount || null,
            // Plný text už ide v clientExtractedText a v pripravenom súbore.
            // Nezdvojujeme ho v JSON metadátach, aby multipart požiadavka zbytočne nerástla.
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
          mode:
            attachedFiles.length > 0
              ? 'uploaded_documents_first'
              : 'verified_web_sources',
          // Detailný obsah je už odoslaný samostatnými poľami FormData.
          // chatPayload slúži iba ako ľahký diagnostický obal a nesmie duplikovať payload.
          extractedText: '',
          detectedSourcesSummary: '',
          detectedSources: [],
          detectedAuthors: [],
          inTextCitations: [],
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
          'x-zedpera-error-delay-ms': '30000',
        },
        body: formData,
      });

      applyAttachmentUsageFromResponse(res);

      if (!res.ok) {
        const apiError =
          await readZedperaApiError(
            res,
            {
              language,
              endpoint: '/api/chat',
              module: 'chat',
              requestId,
            },
          );

        showSystemError(
          apiError.descriptor,
        );

        if (apiError.status === 401) {
          router.replace(
            '/login?returnTo=/chat',
          );
        }

        return;
      }

      const contentType = res.headers.get('content-type') || '';
      let fullText = '';
      let attachmentWarningText = '';

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
            attachmentsUsed: Number(
              data.attachmentUsage.attachmentsUsed || 0,
            ),
            attachmentsAdded: Number(
              data.attachmentUsage.attachmentsAdded || 0,
            ),
            lastUploadedAt:
              data.attachmentUsage.lastUploadedAt || null,
            trackingAvailable:
              data.attachmentUsage.trackingAvailable !== false,
          });
        }

        if (attachedFiles.length > 0) {
          const attachmentProcessing =
            data?.attachmentProcessing || {};
          const receivedFiles = Number(
            attachmentProcessing.receivedFiles || 0,
          );
          const successfullyReadFiles = Number(
            attachmentProcessing.successfullyReadFiles || 0,
          );
          const serverReadAttachments =
            attachmentProcessing.serverReadAttachments === true;

          const fileDiagnostics = Array.isArray(
            data?.extractedFilesInfo,
          )
            ? data.extractedFilesInfo
                .filter((item: any) => item?.ok !== true)
                .map(
                  (item: any) =>
                    `${item.fileName || item.preparedName || 'Súbor'}: ${
                      item.status ||
                      item.error ||
                      'neznámy stav'
                    }`,
                )
                .join('\n')
            : '';

          const serverWarnings = Array.isArray(
            attachmentProcessing.warnings,
          )
            ? attachmentProcessing.warnings
                .map((item: unknown) => String(item || '').trim())
                .filter(Boolean)
            : [];

          if (
            successfullyReadFiles <= 0 ||
            !serverReadAttachments
          ) {
            throw new Error(
              [
                'Server neprečítal žiadnu použiteľnú prílohu.',
                fileDiagnostics,
              ]
                .filter(Boolean)
                .join('\n\n'),
            );
          }

          if (
            receivedFiles < attachedFiles.length ||
            successfullyReadFiles < attachedFiles.length ||
            serverWarnings.length > 0
          ) {
            attachmentWarningText = [
              ...serverWarnings,
              receivedFiles < attachedFiles.length
                ? `Server prijal ${receivedFiles} z ${attachedFiles.length} príloh.`
                : '',
              successfullyReadFiles < attachedFiles.length
                ? `Použiteľne prečítané prílohy: ${successfullyReadFiles}/${attachedFiles.length}.`
                : '',
              fileDiagnostics,
            ]
              .filter(Boolean)
              .join('\n');
          }
        }

        fullText =
          String(
            data.output ||
              data.result ||
              data.message ||
              data.text ||
              data.answer ||
              '',
          ).trim() || '';

        const apiSources = String(
          data.sources || '',
        ).trim();

        if (
          apiSources &&
          !/(^|\n)\s*Prim[aá]rne\s+zdroje\s*(\n|$)/i.test(
            fullText,
          )
        ) {
          fullText = `${fullText}\n\n${apiSources}`.trim();
        }

        if (
          attachmentWarningText &&
          !fullText.includes('Upozornenie k prílohám')
        ) {
          fullText = `${fullText}

Upozornenie k prílohám
${attachmentWarningText}`.trim();
        }

        if (!fullText && data.ok === false) {
          removePendingAssistantMessage();
          showSystemError(
            createZedperaError(
              String(
                data.code ||
                  'API_UNAVAILABLE',
              ),
              {
                endpoint: '/api/chat',
                module: 'chat',
                requestId,
                serverMessage:
                  data.message ||
                  data.error,
                serverDetail:
                  data.detail,
              },
              {
                language,
              },
            ),
          );
          return;
        }

        if (!fullText) {
          removePendingAssistantMessage();
          showSystemError(
            createZedperaError(
              'API_UNAVAILABLE',
              {
                endpoint: '/api/chat',
                module: 'chat',
                requestId,
              },
              {
                language,
              },
            ),
          );
          return;
        }
      } else {
        if (!res.body) {
          removePendingAssistantMessage();
          showSystemError(
            createZedperaError(
              'API_UNAVAILABLE',
              {
                endpoint: '/api/chat',
                module: 'chat',
                requestId,
              },
              {
                language,
              },
            ),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          const visibleText = cleanAiOutput(
            stripInternalStreamPayload(fullText),
          );

          // Heartbeat medzery a interné chybové payloady sa nesmú zobraziť
          // ako prázdna alebo technická správa. Kým nie je dostupný reálny
          // text, v bubline ostáva lokalizovaný stav „Analyzujem“.
          if (visibleText) {
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
      }

      const streamedError =
        readStreamedApiError(fullText);
      const usableStreamOutput = cleanAiOutput(
        stripInternalStreamPayload(fullText),
      );

      // Poskytovateľ môže výnimočne poslať použiteľný text a až potom technický
      // koncový marker (napr. pri oneskorenom fallbacku/proxy chybe). Používateľ
      // nesmie dostať súčasne hotový výsledok aj chybové okno.
      if (streamedError && !usableStreamOutput) {
        removePendingAssistantMessage();
        showSystemError(
          createZedperaError(
            String(
              streamedError.code ||
                'API_UNAVAILABLE',
            ),
            {
              endpoint: '/api/chat',
              module: 'chat',
              requestId:
                streamedError.requestId ||
                requestId,
              serverMessage:
                streamedError.message ||
                streamedError.error,
              serverDetail:
                streamedError.detail,
            },
            { language },
          ),
        );
        return;
      }

      if (streamedError && usableStreamOutput) {
        console.warn(
          'CHAT_STREAM_LATE_ERROR_SUPPRESSED:',
          streamedError,
        );
        clearSystemError();
      }

      const finalTextFromApi =
        usableStreamOutput ||
        cleanAiOutput(stripInternalStreamPayload(fullText));
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

      requestSucceeded = !looksLikeError;

      if (requestSucceeded) {
        // Úspešný finálny výsledok má prednosť pred oneskorenou chybou
        // pomocnej extrakcie. Používateľ nesmie vidieť hotový text spolu
        // s technickým modalom pre už zotavený medzikrok.
        clearSystemError();
      }

      if (
        requestSucceeded &&
        attachedFiles.length > 0
      ) {
        await recordNewAttachmentUploads(
          attachedFiles,
        );
      }
    } catch (error) {
      console.error(
        'CHAT_SEND_ERROR:',
        error,
      );

      removePendingAssistantMessage();
      showSystemError(
        createZedperaErrorFromUnknown(
          error,
          {
            language,
            endpoint: '/api/chat',
            module: 'chat',
          },
        ),
      );
    } finally {
      setIsLoading(false);

      if (requestSucceeded) {
        setAttachedFiles([]);
        setProcessingLog([]);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      void refreshAttachmentUsage();
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

    setPopupData((current) =>
      current
        ? {
            ...current,
            output:
              current.output.slice(0, selection.start) +
              cleaned +
              current.output.slice(selection.end),
            sources: current.sources,
          }
        : current,
    );
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


type OriginalSelectedCitation = {
  value: string;
};

function extractOriginalSelectedTextCitations(
  value: string,
): OriginalSelectedCitation[] {
  const text = String(value || '');
  const found: string[] = [];

  // Zachytí celé vyvážené zátvorky obsahujúce rok, vrátane prípadov
  // typu „(Wrigley C. W.: Cereal Chem. 78, 6. (2001))“.
  let depth = 0;
  let start = -1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '(') {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === ')' && depth > 0) {
      depth -= 1;

      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, index + 1);

        if (/\b(?:18|19|20)\d{2}[a-z]?\b/i.test(candidate)) {
          found.push(candidate);
        }

        start = -1;
      }
    }
  }

  for (const match of text.matchAll(
    /\[(?:\d{1,3})(?:\s*[,;–-]\s*\d{1,3})*\]/g,
  )) {
    if (match[0]) found.push(match[0]);
  }

  return uniqueArray(found).map((citation) => ({
    value: citation,
  }));
}

function stripSourceSectionsFromSelectedEdit(value: string) {
  const cleaned = cleanAiOutput(
    stripInternalStreamPayload(value),
  )
    .replace(/^\s*={0,3}\s*VÝSTUP\s*={0,3}\s*:?[\s\n]*/i, '')
    .replace(/^\s*VÝSTUP\s*:\s*/i, '')
    .trim();

  const sourceHeadingPattern =
    /(?:^|\n)\s*(?:={0,3}\s*)?(?:Prim[aá]rne\s+zdroje|Sekund[aá]rne(?:\s*\/\s*doplnkov[eé])?\s+zdroje|Použit[eé]\s+zdroje(?:\s+a\s+autori)?|Zdroje(?:\s+a\s+autori)?|ANALÝZA|SKÓRE|ODPORÚČANIA)(?:\s*={0,3})?\s*:?(?:\n|$)/i;

  const sourceMatch = sourceHeadingPattern.exec(cleaned);

  return cleanAiOutput(
    sourceMatch && typeof sourceMatch.index === 'number'
      ? cleaned.slice(0, sourceMatch.index)
      : cleaned,
  )
    // Bezpečnostná poistka pre staršie odpovede. Interný token sa nikdy
    // nesmie zobraziť používateľovi.
    .replace(
      /\[?\[?\s*ZEDPERA[\s_-]*CITATION[\s_-]*\d+\s*\]?\]?/gi,
      '',
    )
    .replace(
      /ZXQ[\s_-]*CITATION[\s_-]*\d+[\s_-]*QXZ/gi,
      '',
    )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function validateSelectedTextCitations(
  value: string,
  citations: OriginalSelectedCitation[],
) {
  const cleaned = stripSourceSectionsFromSelectedEdit(value);

  // Server vracia pôvodné citácie deterministicky. Klient ich už neprenáša
  // cez viditeľné placeholdery. Ak by starší backend citáciu vynechal,
  // radšej necháme čistý text a zalogujeme diagnostiku, než aby sme vložili
  // internú značku ZEDPERA do akademického textu.
  const missing = citations
    .map((item) => item.value)
    .filter((citation) => !cleaned.includes(citation));

  if (missing.length > 0) {
    console.warn(
      'EDIT_SELECTED_TEXT_CITATION_MISMATCH:',
      missing,
    );
  }

  return cleaned;
}

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

  const originalCitations =
    extractOriginalSelectedTextCitations(
      selectedText,
    );

  // Úprava označeného textu je nová AI operácia.
  // Staré čakajúce hlášky sa zrušia a nová sa môže zobraziť až po 30 sekundách.
  clearSystemError();
  setIsEditingSelection(true);

  try {
    const instruction = getEditInstruction(mode);
    const requestId =
      createChatRequestId();

    const formData = new FormData();

    formData.append(
      'requestId',
      requestId,
    );
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

ZÁVÄZNÉ PRAVIDLÁ:
- Vráť iba finálny upravený text.
- Nevypisuj Primárne zdroje, Sekundárne / doplnkové zdroje, použitú literatúru, analýzu, skóre ani odporúčania.
- Pôvodné citácie, bibliografické odkazy, DOI a URL ponechaj presne v pôvodnom tvare a na logicky rovnakom mieste.
- Nevytváraj interné značky ani placeholdery.`,
        },
      ]),
    );

    const res = await fetch('/api/chat', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/plain, text/event-stream',
        'x-request-id': requestId,
        'x-zedpera-error-delay-ms': '30000',
      },
      body: formData,
    });

    if (!res.ok) {
      const apiError =
        await readZedperaApiError(
          res,
          {
            language,
            endpoint: '/api/chat',
            module: 'chat',
            requestId,
          },
        );

      showSystemError(
        apiError.descriptor,
      );

      if (apiError.status === 401) {
        router.replace(
          '/login?returnTo=/chat',
        );
      }

      return;
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
        showSystemError(
          createZedperaError(
            'API_UNAVAILABLE',
            {
              endpoint: '/api/chat',
              module: 'chat',
              requestId,
            },
            {
              language,
            },
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        editedText += decoder.decode(value, { stream: true });
      }
    }

    const streamedEditError =
      readStreamedApiError(editedText);
    const visibleEditedText =
      stripInternalStreamPayload(editedText);

    if (
      streamedEditError &&
      !cleanAiOutput(visibleEditedText)
    ) {
      showSystemError(
        createZedperaError(
          String(
            streamedEditError.code ||
              'API_UNAVAILABLE',
          ),
          {
            endpoint: '/api/chat',
            module: 'chat',
            requestId:
              streamedEditError.requestId ||
              requestId,
            serverMessage:
              streamedEditError.message ||
              streamedEditError.error,
            serverDetail:
              streamedEditError.detail,
          },
          {
            language,
          },
        ),
      );
      return;
    }

    if (
      streamedEditError &&
      cleanAiOutput(visibleEditedText)
    ) {
      console.warn(
        'EDIT_STREAM_LATE_ERROR_SUPPRESSED:',
        streamedEditError,
      );
      clearSystemError();
    }

    const cleanedEditedText =
      validateSelectedTextCitations(
        visibleEditedText,
        originalCitations,
      );

    if (!cleanedEditedText) {
      showSystemError(
        createZedperaError(
          'API_UNAVAILABLE',
          {
            endpoint: '/api/chat',
            module: 'chat',
            requestId,
          },
          {
            language,
          },
        ),
      );
      return;
    }

    replaceSelectedText(cleanedEditedText, selection);
  } catch (error) {
    console.error(
      'EDIT_SELECTED_TEXT_ERROR:',
      error,
    );

    showSystemError(
      createZedperaErrorFromUnknown(
        error,
        {
          language,
          endpoint: '/api/chat',
          module: 'chat',
        },
      ),
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
                  {messages.map((message, index) => {
                    const isPendingAssistant =
                      message.role === 'assistant' &&
                      isLoading &&
                      index === messages.length - 1 &&
                      !message.content.trim();

                    return (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[92%] break-words whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-7 shadow-lg md:max-w-[85%] md:px-5 md:py-4 ${
                            message.role === 'user'
                              ? 'bg-violet-600 text-white shadow-violet-700/20'
                              : 'border border-white/10 bg-white/[0.065] text-slate-200 shadow-black/20'
                          }`}
                        >
                          {isPendingAssistant ? (
                            <ThinkingRobot language={language} />
                          ) : message.role === 'assistant' ? (
                            <StructuredAcademicText text={message.content} />
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isLoading &&
                    messages[messages.length - 1]?.role !== 'assistant' && (
                      <div className="flex justify-start">
                        <div className="max-w-[92%] rounded-3xl border border-violet-400/20 bg-white/[0.065] px-4 py-3 text-sm leading-7 text-slate-200 shadow-lg shadow-black/20 md:max-w-[85%] md:px-5 md:py-4">
                          <ThinkingRobot language={language} />
                        </div>
                      </div>
                    )}

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
                              {item.status === 'waiting'
                                ? 'Čaká sa na extrakciu obsahu prílohy.'
                                : 'Načítavam obsah prílohy.'}
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
                <div className="mb-3 rounded-2xl border border-violet-400/20 bg-black/20 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-bold text-violet-100">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Paperclip className="h-4 w-4 shrink-0 text-violet-300" />
                      <span>Počet nahraných príloh:</span>
                      <strong className="rounded-md bg-violet-500/20 px-2 py-0.5">
                        {attachedFiles.length} / {maxFilesCount}
                      </strong>
                    </span>

                    <span
                      aria-hidden="true"
                      className="hidden h-4 w-px bg-violet-300/25 sm:block"
                    />

                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold leading-5 text-violet-200/75">
                      <span>Kapacita:</span>
                      <span className="inline-flex items-center gap-1">
                        <span>maximálne</span>
                        <strong className="font-black text-violet-100">
                          {maxFilesCount}
                        </strong>
                        <span>príloh</span>
                      </span>
                      <span aria-hidden="true" className="text-violet-300/50">
                        •
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span>max.</span>
                        <strong className="font-black text-violet-100">
                          {maxFileSizeMb}
                        </strong>
                        <span>MB na jednu prílohu</span>
                      </span>
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
     disabled={isLoading || systemBlocked}
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
                   disabled={isLoading || systemBlocked}
                    className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title={`Priložiť súbory: maximálne ${maxFilesCount} príloh, kapacita ${maxFileSizeMb} MB na jeden súbor`}
                  >
                    <Paperclip className="h-6 w-6" />
                  </button>

                  <textarea
                    value={input}
                    rows={2}
                    disabled={systemBlocked}
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
                    disabled={isLoading || systemBlocked}
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
                    aria-live="polite"
                    aria-label={
                      isLoading
                        ? `${activeAgentLabel}: ${getAnalyzingLabel(language)}`
                        : 'Odoslať správu'
                    }
                    className={`mb-1 flex h-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/40 transition-all duration-300 hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-70 ${
                      isLoading ? 'min-w-[148px] gap-2 px-4' : 'w-12'
                    }`}
                    title={
                      isLoading
                        ? `${activeAgentLabel}: ${getAnalyzingLabel(language)}`
                        : 'Odoslať'
                    }
                  >
                    {isLoading ? (
                      <>
                        <span className="relative flex h-6 w-6 items-center justify-center">
                          <Bot className="h-5 w-5 animate-pulse" />
                          <Brain className="absolute -right-1 -top-1 h-3 w-3 animate-pulse" />
                        </span>
                        <span className="whitespace-nowrap text-xs font-black">
                          {getAnalyzingLabel(language)}
                        </span>
                      </>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
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
                    onMouseUp={() => handleTextSelection('result')}
                    onKeyUp={() => handleTextSelection('result')}
                    onTouchEnd={() => handleTextSelection('result')}
                    className="min-h-[45vh] resize-none rounded-3xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-100 outline-none focus:border-violet-400/60 md:min-h-[60vh] md:p-6 md:leading-8"
                  />

                  <div className="overflow-y-auto">
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
                  onMouseUp={() => handleTextSelection('canvas')}
                  onKeyUp={() => handleTextSelection('canvas')}
                  onTouchEnd={() => handleTextSelection('canvas')}
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
