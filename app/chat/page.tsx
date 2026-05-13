'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Brain,
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

// ================= TYPES =================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
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

// Dôležité: nech neposielame celý 90-stranový dokument do AI.
// Zdroje a citácie pošleme celé v štruktúrovanej forme, text len skrátene.
const maxClientExtractedCharsPerFile = 25_000;
const maxTotalExtractedContextChars = 60_000;
const maxDetectedSourcesForChat = 120;
const maxDetectedAuthorsForChat = 120;
const maxInTextCitationsForChat = 200;
const maxDetectedSourcesSummaryChars = 28_000;

// Musíš mať lokálne vo verejnom priečinku: public/pdfjs/pdf.worker.min.mjs
const pdfWorkerSrc = '/pdfjs/pdf.worker.min.mjs';

const agents: { key: Agent; label: string }[] = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'openai', label: 'OPEN AI' },
  { key: 'claude', label: 'Claude' },
  { key: 'mistral', label: 'Mistral' },
  { key: 'grok', label: 'Grok' },
];

const suggestions: {
  title: string;
  instruction: string;
  icon: any;
}[] = [
  {
    title: 'Navrhni mi úvod mojej práce',
    instruction:
      'Na základe uloženého profilu práce vytvor profesionálny akademický úvod práce. Použi profil práce a priložené dokumenty. Na konci vždy vypíš použité zdroje a autorov.',
    icon: PenLine,
  },
  {
    title: 'Napíš mi abstrakt',
    instruction:
      'Na základe uloženého profilu práce vytvor akademický abstrakt. Má obsahovať tému, cieľ, problém, metodológiu, výsledky alebo očakávaný prínos. Na konci vždy vypíš použité zdroje a autorov.',
    icon: BookOpen,
  },
  {
    title: 'Navrhni štruktúru kapitol',
    instruction:
      'Na základe uloženého profilu práce navrhni detailnú štruktúru kapitol a podkapitol. Rešpektuj typ práce, cieľ, metodológiu, praktickú časť a logické akademické členenie.',
    icon: GraduationCap,
  },
  {
    title: 'Napíš návrh kapitoly',
    instruction:
      'Na základe uloženého profilu práce priprav návrh kapitoly. Najprv navrhni osnovu kapitoly, potom podkapitoly a následne ukážkový odborný text. Na konci vždy vypíš použité zdroje a autorov.',
    icon: FileText,
  },
  {
    title: 'Spracuj zdroje a citácie',
    instruction:
      'Správaj sa ako citačná špecialistka. Analyzuj priložené dokumenty a profil práce. Identifikuj všetky citácie priamo v texte, autorov, roky, názvy diel, DOI, URL a priprav ich podľa citačnej normy z profilu. Nevymýšľaj zdroje.',
    icon: Library,
  },
  {
    title: 'Prepíš text akademicky',
    instruction:
      'Prepíš text do akademického jazyka. Zachovaj význam, zlepši odborný štýl, plynulosť a logiku. Ak sú priložené dokumenty, zohľadni ich.',
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
  ];

  const sourceSectionNames = [
    'POUŽITÉ ZDROJE A AUTORI',
    'POUŽITÉ ZDROJE',
    'ZDROJE A AUTORI',
    'ZDROJE',
  ];

  const normalizedMainSectionNames = mainSectionNames.map(
    normalizeSectionHeading,
  );

  const findLineIndexByHeading = (wantedNames: string[]) => {
    const wanted = wantedNames.map(normalizeSectionHeading);

    for (let i = 0; i < lines.length; i += 1) {
      const normalizedLine = normalizeSectionHeading(lines[i]);

      if (wanted.includes(normalizedLine)) {
        return i;
      }
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

  if (!sources) {
    const sourceRegexes = [
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
    const sourceLine = findLineIndexByHeading(sourceSectionNames);

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

function normalizeProfile(raw: any): SavedProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.profile && typeof raw.profile === 'object') {
    return {
      ...raw.profile,
      schema: raw.schema || raw.profile.schema,
      workLanguage: raw.workLanguage || raw.profile.workLanguage,
      savedAt: raw.savedAt || raw.generatedAt || raw.profile.savedAt,
    };
  }

  return raw as SavedProfile;
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

function buildAttachmentPrompt(files: AttachedFile[]) {
  if (!files.length) return 'Používateľ nepriložil žiadne dokumenty.';

  return files
    .map((item, index) => {
      const extractable = isTextExtractableFile(item.name)
        ? 'áno'
        : 'nie alebo iba čiastočne';

      return `${index + 1}. ${item.name} – ${getFileKindLabel(
        item.name,
      )}, ${formatBytes(item.size)}, textová extrakcia: ${extractable}`;
    })
    .join('\n');
}

function ensureSourcesSection(text: string) {
  const cleaned = cleanAiOutput(text);

  const hasSourcesHeading =
    /(?:^|\n)\s*={0,3}\s*použité\s+zdroje\s+a\s+autori\s*={0,3}\s*:?\s*(?:\n|$)/i.test(
      cleaned,
    ) ||
    /(?:^|\n)\s*={0,3}\s*použité\s+zdroje\s*={0,3}\s*:?\s*(?:\n|$)/i.test(
      cleaned,
    ) ||
    /(?:^|\n)\s*={0,3}\s*zdroje\s+a\s+autori\s*={0,3}\s*:?\s*(?:\n|$)/i.test(
      cleaned,
    ) ||
    /(?:^|\n)\s*={0,3}\s*zdroje\s*={0,3}\s*:?\s*(?:\n|$)/i.test(cleaned);

  if (hasSourcesHeading) {
    return cleaned;
  }

  return `${cleaned}

=== POUŽITÉ ZDROJE ===
Úplný bibliografický záznam je potrebné overiť.`;
}

async function gzipBlob(blob: Blob): Promise<Blob> {
  const CompressionStreamConstructor = window.CompressionStream;

  if (!CompressionStreamConstructor) {
    return blob;
  }

  const stream = blob.stream().pipeThrough(
    new CompressionStreamConstructor('gzip'),
  );

  return await new Response(stream).blob();
}

function truncateByChars(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;

  return `${text.slice(
    0,
    maxChars,
  )}\n\n[Text bol skrátený, aby sa vošiel do technického limitu pred odoslaním do AI.]`;
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
        type: window.CompressionStream
          ? 'application/gzip'
          : 'text/plain;charset=utf-8',
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
    type: window.CompressionStream
      ? 'application/gzip'
      : 'text/plain;charset=utf-8',
  });
}

// ================= PDF FRONTEND EXTRACTION =================

async function extractPdfTextInBrowser(file: File) {
  const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => String(item?.str || '').trim())
      .filter(Boolean)
      .join(' ');

    if (pageText.trim()) {
      pages.push(`STRANA ${pageNumber}\n${pageText}`);
    }
  }

  return cleanAiOutput(pages.join('\n\n------------------------------\n\n'));
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

  const parentheticalRegex =
    /\(([^()]{2,280}?\b(?:18|19|20)\d{2}[a-z]?(?:[^()]*)?)\)/gi;

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
function normalizeForMatch(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  if (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('www.')
  ) {
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

  const beforeYear =
    normalizedLine.split(/\b(18|19|20)\d{2}[a-z]?\b/i)[0] || '';

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

    if (surname) {
      authors.push(`${surname}, ${initials}`.trim());
    }
  }

  if (authors.length > 0) {
    return uniqueArray(authors).slice(0, 20);
  }

  const candidates = cleaned
    .split(/\s*(?:;|&|\ba\b|\band\b)\s*/i)
    .map((part) => normalizeAuthorDisplay(part))
    .filter((part) => {
      if (part.length < 3) return false;
      if (!/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part)) return false;
      if (/^(in|from|retrieved|dostupné|available|vol|no|pp)$/i.test(part)) {
        return false;
      }

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

  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const afterYear = working.split(/\((18|19|20)\d{2}[a-z]?\)|\b(18|19|20)\d{2}[a-z]?\b/i).pop();

  if (afterYear && afterYear.trim().length > 8) {
    return afterYear
      .replace(/^[).,\s:-]+/, '')
      .split(/\.\s+/)[0]
      .trim()
      .slice(0, 220);
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return parts[1].slice(0, 220);
  }

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
      [
        source.raw?.slice(0, 180),
        source.doi || '',
        source.url || '',
        source.title || '',
        source.year || '',
      ]
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
      sourceType:
        existing.sourceType !== 'unknown' ? existing.sourceType : source.sourceType,
      inTextCitations: [
        ...(existing.inTextCitations || []),
        ...(source.inTextCitations || []),
      ],
      occurrenceCount:
        (existing.occurrenceCount || 0) + (source.occurrenceCount || 0),
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

    if (key && !bibliographyByKey.has(key)) {
      bibliographyByKey.set(key, item);
    }
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
      title: 'údaj je potrebné overiť',
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
    const alreadyIncluded = result.some(
      (source) => getSourceCitationKey(source) === key && key,
    );

    if (!alreadyIncluded) {
      result.push(item);
    }
  }

  return mergeSources(result);
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy. Ak sú zdroje v texte, treba ich manuálne overiť alebo doplniť čitateľnejší zoznam literatúry.';
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

      return `${index + 1}. Pôvodný záznam:
${item.raw}

Autori: ${
        item.authors.length
          ? item.authors.join(', ')
          : 'neuvedené alebo potrebné overiť'
      }
Rok: ${item.year || 'údaj je potrebné overiť'}
Názov publikácie / zdroja: ${item.title || 'údaj je potrebné overiť'}
Typ zdroja: ${item.sourceType}
DOI: ${item.doi || 'neuvedené'}
URL: ${item.url || 'neuvedené'}${citationInfo}`;
    })
    .join('\n\n');
}

function formatSimpleBibliographicSources(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Úplný bibliografický záznam je potrebné overiť.';
  }

  return candidates
    .map((item) => {
      if (item.raw?.trim()) {
        return item.raw.trim();
      }

      const authorText = item.authors.length
        ? item.authors.join(', ')
        : 'Autor je potrebné overiť';

      const yearText = item.year || 'rok je potrebné overiť';
      const titleText = item.title || 'názov je potrebné overiť';
      const doiOrUrl = item.doi || item.url || '';

      return `${authorText} (${yearText}). ${titleText}.${
        doiOrUrl ? ` ${doiOrUrl}` : ''
      }`.trim();
    })
    .join('\n');
}



function normalizeAuthors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueArray(value.map((item) => String(item || '')));
  }

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
        raw: normalizeSlovakCitationText(
          String(item?.raw || item?.citation || item?.text || ''),
        ).trim(),
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
    .filter(
      (item) => item.raw || item.authors.length || item.title || item.doi || item.url,
    );
}

function extractTextFromExtractApi(data: ExtractTextApiResponse) {
  return cleanAiOutput(
    String(data.extractedText || data.text || data.content || '').trim(),
  );
}

function extractSourcesFromExtractApi(data: ExtractTextApiResponse) {
  const fromBibliography = normalizeDetectedSources(
    data.bibliography?.detectedSources,
  );
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

  for (const citation of preparedFiles.flatMap(
    (file) => file.inTextCitations || [],
  )) {
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
  if (!citations.length) {
    return 'Neboli automaticky nájdené žiadne citácie v texte.';
  }

  return citations
    .map((citation, index) => {
      return `${index + 1}. ${citation.raw}
Autori v texte: ${citation.authors.length ? citation.authors.join(', ') : 'neuvedené alebo potrebné overiť'}
Rok: ${citation.year || 'údaj je potrebné overiť'}
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
Autori nájdení v dokumente: ${
      file.detectedAuthors?.length
        ? file.detectedAuthors.join(', ')
        : 'neuvedené alebo potrebné overiť'
    }

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
${allAuthors.length ? allAuthors.join(', ') : 'Autori neboli automaticky identifikovaní alebo ich treba overiť.'}

C. Formátované bibliografické záznamy a zdroje z literatúry
${formatBibliographicCandidates(sources)}

D. Priložené dokumenty použité ako podklad
${
  files.length
    ? files.map((file, index) => `${index + 1}. ${file.originalName}`).join('\n')
    : 'Neboli priložené žiadne dokumenty.'
}

E. Neúplné alebo neoveriteľné zdroje
Ak je pri zdroji uvedené „údaj je potrebné overiť“, znamená to, že citácia bola nájdená v texte, ale celý bibliografický záznam sa nepodarilo automaticky jednoznačne spárovať.

F. AI odporúčané zdroje na doplnenie
Nevymýšľaj nové zdroje. Najprv doplň alebo skontroluj zdroje z časti Literatúra v pôvodnom dokumente.`;
}

function extractUsedTextCitations(text: string) {
  const citations: { raw: string; authorPart: string; year: string }[] = [];

  const regex = /\(([^()]{2,120}?),\s*((?:19|20)\d{2}|n\.d\.)\)/gi;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const authorPart = cleanAiOutput(match[1] || '');
    const year = cleanAiOutput(match[2] || '');

    if (!authorPart || !year) continue;

    // odstráni technické odkazy, ktoré nie sú citácie
    if (/napr|obr|tab|kap|str|s\./i.test(authorPart)) continue;

    citations.push({
      raw,
      authorPart,
      year,
    });
  }

  const map = new Map<
    string,
    { raw: string; authorPart: string; year: string }
  >();

  for (const item of citations) {
    const key = `${item.authorPart}-${item.year}`.toLowerCase();

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}


function sourceMatchesCitation(
  source: BibliographicCandidate,
  citation: { authorPart: string; year: string },
) {
  const yearMatches =
    !citation.year ||
    source.year === citation.year ||
    source.raw.includes(citation.year);

  const normalizedRaw = normalizeForMatch(
    `${source.raw} ${source.authors.join(' ')}`,
  );

  const normalizedAuthorPart = normalizeForMatch(
    citation.authorPart
      .replace(/et\s+al\.?/gi, '')
      .replace(/a\s+kol\.?/gi, '')
      .replace(/&/g, ' ')
      .replace(/\ba\b/gi, ' '),
  );

  const authorTokens = normalizedAuthorPart
    .split(' ')
    .filter((token) => token.length >= 3);

  const authorMatches = authorTokens.some((token) =>
    normalizedRaw.includes(token),
  );

  return yearMatches && authorMatches;
}

function filterSourcesByUsedCitations(
  sources: BibliographicCandidate[],
  usedText: string,
  forceAll: boolean,
) {
  if (forceAll) return sources;

 const citations = extractUsedTextCitations(usedText);

  if (!citations.length) {
    return sources.slice(0, 20);
  }

  const usedSources = sources.filter((source) =>
    citations.some((citation) => sourceMatchesCitation(source, citation)),
  );

  return usedSources.length ? usedSources : sources.slice(0, 20);
}

function buildFallbackSourcesSection({
  preparedFiles,
  usedText,
  forceAll,
}: {
  preparedFiles: PreparedFile[];
  usedText: string;
  forceAll: boolean;
}) {
  const allSources = flattenDetectedSources(preparedFiles);

  const usedSources = filterSourcesByUsedCitations(
    allSources,
    usedText,
    forceAll,
  );

  return formatSimpleBibliographicSources(usedSources);
}



// ================= API CALLS =================

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
    throw new Error(
      errorText || `Extrakčný endpoint vrátil neplatnú odpoveď ${res.status}.`,
    );
  }

  if (!res.ok || data.ok === false) {
    throw new Error(
      data.error ||
        data.message ||
        `Extrakcia zlyhala pre súbor ${originalName}.`,
    );
  }

  const extractedText = extractTextFromExtractApi(data);

  if (!extractedText.trim()) {
    throw new Error(
      data.message ||
        `Extrakcia prebehla, ale text zo súboru ${originalName} je prázdny.`,
    );
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
Autori nájdení v dokumente: ${
      item.detectedAuthors.length
        ? item.detectedAuthors.join(', ')
        : 'neuvedené alebo potrebné overiť'
    }

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

function buildPreparedFilesSummary(preparedFiles: PreparedFile[]) {
  if (!preparedFiles.length) {
    return 'Žiadne prílohy neboli pripravené na odoslanie.';
  }

  return preparedFiles
    .map((item, index) => {
      return `${index + 1}. ${item.originalName}
- Pôvodná veľkosť: ${formatBytes(item.originalSize)}
- Po kompresii / príprave: ${formatBytes(item.preparedSize)}
- Režim kompresie: ${item.compressionMode}
- Stav extrakcie: ${item.extractionStatus}
- Metóda extrakcie: ${item.extractionMethod || 'neuvedené'}
- Citácie v texte: ${item.inTextCitations?.length || 0}
- Detegované zdroje: ${item.detectedSources?.length || 0}
- Detegovaní autori: ${
        item.detectedAuthors?.length ? item.detectedAuthors.join(', ') : 'neuvedené'
      }
- Upozornenie: ${item.warning || 'bez upozornenia'}`;
    })
    .join('\n\n');
}

// ================= PAGE =================

export default function ChatPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [agent, setAgent] = useState<Agent>('gemini');
  const [activeProfile, setActiveProfile] = useState<SavedProfile | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [processingLog, setProcessingLog] = useState<ProcessingLogItem[]>([]);
  const [isListening, setIsListening] = useState(false);

  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');

  const [selectedTextState, setSelectedTextState] =
    useState<SelectedTextState | null>(null);

  const [popup, setPopup] = useState(false);
  const [popupData, setPopupData] = useState<ParsedResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const resultTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canvasTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activeAgentLabel = useMemo(() => {
    return agents.find((item) => item.key === agent)?.label || 'Gemini';
  }, [agent]);

  const exportTitle = useMemo(() => {
    const base = activeProfile?.title || 'Zedpera výstup';
    return base.trim() || 'Zedpera výstup';
  }, [activeProfile]);

  const canSubmit =
    isMounted &&
    !isLoading &&
    (input.trim().length > 0 || attachedFiles.length > 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const activeRaw = localStorage.getItem('active_profile');
    const profileRaw = localStorage.getItem('profile');
    const profilesRaw = localStorage.getItem('profiles_full');

    const active = normalizeProfile(safeJsonParse<any>(activeRaw));
    const profile = normalizeProfile(safeJsonParse<any>(profileRaw));
    const profiles = safeJsonParse<any[]>(profilesRaw);

    if (active) {
      setActiveProfile(active);
      return;
    }

    if (profile) {
      setActiveProfile(profile);
      return;
    }

    if (Array.isArray(profiles) && profiles.length > 0) {
      setActiveProfile(normalizeProfile(profiles[0]));
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, processingLog]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopup(false);
        setCanvasOpen(false);
        setSelectedTextState(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateProcessingLog = (
    id: string,
    patch: Partial<ProcessingLogItem>,
  ) => {
    setProcessingLog((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const preparePdfInBrowser = async (item: AttachedFile): Promise<PreparedFile> => {
    updateProcessingLog(item.id, {
      status: 'extracting',
      message:
        'PDF extrahujem priamo v prehliadači cez pdfjs-dist. Následne detegujem citácie v texte a literatúru.',
      originalSize: item.size,
    });

    const rawText = await extractPdfTextInBrowser(item.file);

    if (!rawText.trim()) {
      throw new Error(
        'PDF neobsahuje čitateľný text alebo ide o skenované PDF. Na skenované PDF treba OCR.',
      );
    }

    const inTextCitations = extractInTextCitations(rawText);
    const bibliographySources = extractBibliographicCandidates(rawText);

    const detectedSources = pairInTextCitationsWithBibliography({
      citations: inTextCitations,
      bibliography: bibliographySources,
    });

    const detectedAuthors = uniqueArray([
      ...inTextCitations.flatMap((citation) => citation.authors),
      ...detectedSources.flatMap((source) => source.authors || []),
    ]);

    const extractedText = truncateByChars(
      rawText,
      maxClientExtractedCharsPerFile,
    );



    const textPackage = `
NÁZOV SÚBORU: ${item.name}
PÔVODNÁ VEĽKOSŤ: ${formatBytes(item.size)}
REŽIM: PDF bolo extrahované priamo v prehliadači cez pdfjs-dist.

CITÁCIE NÁJDENÉ PRIAMO V TEXTE:
${formatInTextCitations(inTextCitations)}

AUTORI NÁJDENÍ V DOKUMENTE:
${detectedAuthors.length ? detectedAuthors.join(', ') : 'neuvedené alebo potrebné overiť'}

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(detectedSources)}

TEXT:
${extractedText}
`.trim();

    const textGzipFile = await createGzipTextFile({
      text: textPackage,
      fileName: `${item.name}.extracted.txt.gz`,
    });

    updateProcessingLog(item.id, {
      status: 'extracted',
      message: `Znaky: ${extractedText.length}. Citácie v texte: ${inTextCitations.length}. Zdroje: ${detectedSources.length}. Autori: ${detectedAuthors.length}.`,
      originalSize: item.size,
      preparedSize: textGzipFile.size,
      extractedChars: extractedText.length,
      detectedSourcesCount: detectedSources.length,
      detectedAuthorsCount: detectedAuthors.length,
      detectedInTextCitationsCount: inTextCitations.length,
    });

    return {
      originalId: item.id,
      originalName: item.name,
      originalSize: item.size,
      originalType: item.type,
      preparedName: textGzipFile.name,
      preparedSize: textGzipFile.size,
      preparedType: textGzipFile.type,
      compressionMode: 'gzip_extracted_text',
      file: textGzipFile,
      extractedText,
      extractionMethod: 'pdfjs-browser',
      extractionMessage:
        'PDF bolo extrahované priamo v prehliadači cez pdfjs-dist.',
      detectedSources,
      inTextCitations,
      detectedAuthors,
      formattedSources: formatAllDetectedSources({
        citations: inTextCitations,
        sources: detectedSources,
        files: [],
      }),
      extractionStatus: 'client_extracted',
      warning: undefined,
    };
  };

  const prepareBackendFile = async (item: AttachedFile): Promise<PreparedFile> => {
    updateProcessingLog(item.id, {
      status: 'compressing',
      message: 'Komprimujem súbor na pozadí pred extrakciou.',
    });

    const gzipBlobResult = await gzipBlob(item.file);

    const preparedName = `${item.name}.gz`;
    const preparedFile = new File([gzipBlobResult], preparedName, {
      type: window.CompressionStream
        ? 'application/gzip'
        : item.type || 'application/octet-stream',
    });

    updateProcessingLog(item.id, {
      status: 'compressed',
      message: `Súbor bol komprimovaný na ${formatBytes(
        preparedFile.size,
      )}. Spúšťam extrakciu cez /api/extract-text.`,
      preparedSize: preparedFile.size,
      warning:
        preparedFile.size > maxCompressedFileSizeBytes
          ? `Kompresia má ${formatBytes(
              preparedFile.size,
            )}, čo je viac ako 1 MB. Napriek tomu sa súbor posiela na /api/extract-text, aby server skúsil rozbalenie a extrakciu.`
          : undefined,
    });

    updateProcessingLog(item.id, {
      status: 'extracting',
      message:
        'Volám /api/extract-text. Endpoint má rozbaliť komprimovaný súbor, extrahovať text a vrátiť autorov a publikácie.',
      preparedSize: preparedFile.size,
    });

    let extraction;
    let usedCompressed = false;

    try {
      extraction = await callExtractTextApi({
        file: preparedFile,
        fileName: preparedName,
        originalName: item.name,
        compressed: true,
      });
      usedCompressed = true;
    } catch (compressedError) {
      updateProcessingLog(item.id, {
        status: 'extracting',
        message:
          'Extrakcia z komprimovaného súboru zlyhala. Skúšam fallback: odoslať pôvodný súbor do /api/extract-text.',
        warning:
          compressedError instanceof Error
            ? compressedError.message
            : 'Extrakcia z komprimovaného súboru zlyhala.',
      });

      extraction = await callExtractTextApi({
        file: item.file,
        fileName: item.name,
        originalName: item.name,
        compressed: false,
      });
      usedCompressed = false;
    }

    const extractedText = truncateByChars(
      extraction.extractedText,
      maxClientExtractedCharsPerFile,
    );

    updateProcessingLog(item.id, {
      status: 'extracted',
      message: `Znaky: ${extractedText.length}. Citácie v texte: ${extraction.inTextCitations.length}. Zdroje: ${extraction.detectedSources.length}. Autori: ${extraction.detectedAuthors.length}.`,
      preparedSize: usedCompressed ? preparedFile.size : item.size,
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
      preparedName: usedCompressed ? preparedName : item.name,
      preparedSize: usedCompressed ? preparedFile.size : item.size,
      preparedType: usedCompressed
        ? preparedFile.type
        : item.type || 'application/octet-stream',
      compressionMode: usedCompressed ? 'gzip_original' : 'raw_small_text',
      file: usedCompressed ? preparedFile : item.file,
      extractedText,
      extractionMethod: extraction.method,
      extractionMessage: extraction.message,
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
      warning:
        usedCompressed && preparedFile.size > maxCompressedFileSizeBytes
          ? 'Súbor bol komprimovaný, ale po kompresii má viac ako 1 MB. Extrakcia sa napriek tomu podarila cez /api/extract-text.'
          : undefined,
    };
  };

  const prepareFilesBeforeSend = async (files: AttachedFile[]) => {
    if (!files.length) return [];

    setProcessingLog(
      files.map((file) => ({
        id: file.id,
        name: file.name,
        status: 'waiting',
        message: isPdfFile(file.name)
          ? 'PDF čaká na extrakciu priamo v prehliadači cez pdfjs-dist.'
          : 'Čaká na kompresiu a extrakciu cez /api/extract-text.',
        originalSize: file.size,
      })),
    );

    const preparedFiles: PreparedFile[] = [];

    for (const item of files) {
      try {
        if (isPdfFile(item.name)) {
          const preparedPdf = await preparePdfInBrowser(item);
          preparedFiles.push(preparedPdf);
          continue;
        }

        const backendPreparedFile = await prepareBackendFile(item);
        preparedFiles.push(backendPreparedFile);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Nepodarilo sa pripraviť alebo extrahovať súbor.';

        updateProcessingLog(item.id, {
          status: 'error',
          message,
          warning: message,
        });

        const metadataText = `
NÁZOV SÚBORU: ${item.name}
TYP: ${item.type || 'nezistený'}
DRUH: ${getFileKindLabel(item.name)}
PÔVODNÁ VEĽKOSŤ: ${formatBytes(item.size)}
STAV EXTRAKCIE: Extrakcia zlyhala.
CHYBA: ${message}

POKYNY PRE AI:
- Nevymýšľaj obsah, autorov, publikácie, citácie ani zdroje.
- Jasne uveď, že obsah prílohy sa nepodarilo overene načítať.
`.trim();

        const fallbackFile = await createGzipTextFile({
          text: metadataText,
          fileName: `${item.name}.failed-metadata.txt.gz`,
        });

        preparedFiles.push({
          originalId: item.id,
          originalName: item.name,
          originalSize: item.size,
          originalType: item.type,
          preparedName: fallbackFile.name,
          preparedSize: fallbackFile.size,
          preparedType: fallbackFile.type,
          compressionMode: 'gzip_metadata_only',
          file: fallbackFile,
          extractedText: metadataText,
          extractionMethod: 'failed',
          extractionMessage: message,
          detectedSources: [],
          inTextCitations: [],
          detectedAuthors: [],
          formattedSources: '',
          extractionStatus: 'failed',
          warning: message,
        });
      }
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

    setAttachedFiles((prev) => {
      const next = [...prev];

      for (const file of validFiles) {
        if (next.length >= maxFilesCount) {
          alert(
            `Dosiahnutý limit príloh.\n\nMaximálny počet súborov je ${maxFilesCount}.`,
          );
          break;
        }

        const duplicate = next.some(
          (item) => item.name === file.name && item.size === file.size,
        );

        if (!duplicate) next.push(file);
      }

      return next;
    });

    setProcessingLog([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id));
    setProcessingLog((prev) => prev.filter((item) => item.id !== id));
  };

  const startDictation = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        'Diktovanie nie je v tomto prehliadači podporované. Skús Google Chrome.',
      );
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

    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');

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

function normalizeForMatch(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function userAskedForAllSources(value: string) {
  const normalized = normalizeForMatch(value);

  return (
    normalized.includes('vsetky zdroje') ||
    normalized.includes('vsetkych zdrojov') ||
    normalized.includes('vsetci autori') ||
    normalized.includes('vsetkych autorov') ||
    normalized.includes('vsetky mena') ||
    normalized.includes('vsetky mena autorov') ||
    normalized.includes('zoznam literatury') ||
    normalized.includes('bibliografia') ||
    normalized.includes('spracuj zdroje') ||
    normalized.includes('spracuj citacie') ||
    normalized.includes('vypis vsetko') ||
    normalized.includes('vypis vsetky')
  );
}
const buildFinalUserPrompt = ({
  apiUserText,
  preparedFiles,
  extractedContext,
}: {
  apiUserText: string;
  preparedFiles: PreparedFile[];
  extractedContext: string;
}) => {
  const citationStyle = activeProfile?.citation || 'ISO 690';
  const detectedSourcesSummary = buildDetectedSourcesSummary(preparedFiles);
  const allAuthors = flattenDetectedAuthors(preparedFiles).slice(
    0,
    maxDetectedAuthorsForChat,
  );

  const forceAllSources = userAskedForAllSources(apiUserText);

  return `

${apiUserText.trim() || 'Spracuj priložené dokumenty podľa aktívneho profilu práce.'}

AKTÍVNY PROFIL PRÁCE:
- Názov práce: ${activeProfile?.title || 'nezadané'}
- Téma: ${activeProfile?.topic || activeProfile?.title || 'nezadané'}
- Typ práce: ${activeProfile?.type || activeProfile?.schema?.label || 'nezadané'}
- Odbor: ${activeProfile?.field || 'nezadané'}
- Vedúci práce: ${activeProfile?.supervisor || 'nezadané'}
- Cieľ práce: ${activeProfile?.goal || 'nezadané'}
- Výskumný problém: ${activeProfile?.problem || 'nezadané'}
- Metodológia: ${activeProfile?.methodology || 'nezadané'}
- Citačná norma: ${citationStyle}
- Jazyk práce: ${activeProfile?.workLanguage || activeProfile?.language || 'SK'}

PRILOŽENÉ DOKUMENTY:
${buildAttachmentPrompt(attachedFiles)}

STAV SPRACOVANIA PRÍLOH:
${buildPreparedFilesSummary(preparedFiles)}

REŽIM ZDROJOV:
${
  forceAllSources
    ? 'Používateľ žiada všetky zdroje, všetkých autorov alebo bibliografiu. Vypíš všetky detegované zdroje.'
    : 'Používateľ žiada odborný text. V závere vypíš iba tie zdroje, ktoré boli reálne použité ako citácie v hlavnom texte.'
}

VŠETCI AUTOMATICKY NÁJDENÍ AUTORI:
${allAuthors.length ? allAuthors.join(', ') : 'Autori neboli automaticky identifikovaní alebo ich treba overiť.'}

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${truncateByChars(detectedSourcesSummary, maxDetectedSourcesSummaryChars)}

EXTRAHOVANÝ TEXT Z PRÍLOH:
${extractedContext.trim() || 'Text z príloh nebol dostupný. Ak extrakcia zlyhala, nevymýšľaj obsah, autorov ani zdroje.'}

POVINNÝ FORMÁT VÝSTUPU:

Výstup musí byť čistý akademický text vo Word štýle.

Nepíš tieto technické nadpisy:
- VÝSTUP
- ANALÝZA
- SKÓRE
- ODPORÚČANIA
- DETEGOVANÉ ZDROJE
- TECHNICKÁ ANALÝZA

Výstup musí mať túto štruktúru:

Názov práce alebo názov spracovanej témy
Číslo a názov kapitoly alebo podkapitoly

Súvislý odborný text v odsekoch.

V hlavnom texte používaj citácie priamo v texte podľa citačnej normy klienta: ${citationStyle}.

Ak je citačná norma APA, používaj napríklad:
(Ondrík et al., 2004)

Ak je citačná norma ISO 690 alebo iná norma, prispôsob odkazy presne tejto norme.

Použité zdroje

Na konci výstupu musí byť iba jednoduchá sekcia:

Použité zdroje

Pod tento nadpis vypíš iba čisté bibliografické záznamy zdrojov, ktoré boli reálne použité a citované v hlavnom texte.

Nepíš technické podsekcie:
A. Zdroje nájdené v priložených dokumentoch
B. Formátované bibliografické záznamy
C. Varianty odkazov v texte
D. Priložené dokumenty použité ako podklad
E. Autori nájdení v dokumentoch
F. Neúplné alebo neoveriteľné zdroje

Nepíš samostatne:
- zoznam autorov
- varianty parentetických odkazov
- varianty naratívnych odkazov
- názvy príloh
- technické poznámky
- informácie o extrakcii
- text „zdroje neboli dodané“, ak bol v dokumente nájdený autor, rok alebo bibliografický záznam

Každý zdroj uveď ako samostatný bibliografický záznam podľa citačnej normy klienta: ${citationStyle}.

Príklad správneho výstupu zdroja pri APA:

Ondrík, P., Mikulíková, D., & Kraic, J. (2004). Závislosť medzi dĺžkovou variabilitou génu β-amy1 a aktivitou β-amylázy jačmeňa. Nova Biotechnologica, 4(2), 245-253.

VŠEOBECNÉ PRAVIDLO PRE VŠETKY PRÍLOHY:

1. Pri každej priloženej prílohe najprv identifikuj skutočných autorov dokumentu, rok, názov článku, názov časopisu/knihy/dokumentu, ročník, číslo a strany, ak sú dostupné.
2. Ako primárny zdroj použi autora alebo autorov dokumentu, ktorý bol vložený ako príloha.
3. V hlavnom texte používaj meno autora a rok podľa citačného štýlu klienta.
4. Na konci v časti „Použité zdroje“ vypíš iba bibliografické záznamy zdrojov, ktoré boli reálne citované v hlavnom texte.
5. Ak používateľ výslovne žiada všetky zdroje, všetkých autorov, bibliografiu alebo zoznam literatúry, vypíš všetky detegované bibliografické záznamy, ale stále bez technických podsekcií A, B, C, D, E, F.
6. Každá citácia použitá v hlavnom texte musí mať zodpovedajúci bibliografický záznam na konci.
7. Ak sa v hlavnom texte objaví citácia napríklad (Ondrík et al., 2004), na konci musí byť bibliografický záznam k tomuto autorovi alebo autorom, ak je dostupný v podkladoch.
8. Nikdy nepíš „Zdroje neboli dodané“, ak boli v texte alebo extrahovanom dokumente nájdené citácie, autori, roky alebo bibliografické záznamy.
9. Nevymýšľaj chýbajúce údaje. Pri neúplnom zdroji napíš iba: Úplný bibliografický záznam je potrebné overiť.
10. Výstup musí byť bez markdown znakov #, ##, **, --- a bez tabuľkových značiek.
11. Výstup musí vyzerať ako hotový text do Word dokumentu.
`.trim();
};

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content,
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
    if (!isMounted || isLoading) return;

    if (!activeProfile) {
      appendAssistantMessage(
        '⚠️ Najprv si vytvor a ulož profil práce. Potom môžeš pokračovať v AI Chate, aby systém vedel pracovať podľa názvu práce, typu práce, cieľa, metodológie a citačnej normy.',
      );
      return;
    }

    const visibleMessage: ChatMessage = {
      role: 'user',
      content:
        visibleUserText.trim() ||
        `Spracuj priložené dokumenty (${attachedFiles.length})`,
    };

    setMessages((prev) => [...prev, visibleMessage]);
    setInput('');
    setIsLoading(true);
    setPopup(false);
    setPopupData(null);

    try {
      const preparedFiles = await prepareFilesBeforeSend(attachedFiles);
      const extractedContext = buildExtractedContext(preparedFiles);
      const detectedSourcesSummary = buildDetectedSourcesSummary(preparedFiles);
      const detectedSources = flattenDetectedSources(preparedFiles).slice(
        0,
        maxDetectedSourcesForChat,
      );
      const detectedAuthors = flattenDetectedAuthors(preparedFiles).slice(
        0,
        maxDetectedAuthorsForChat,
      );
      const inTextCitations = flattenInTextCitations(preparedFiles).slice(
        0,
        maxInTextCitationsForChat,
      );


const forceAllSources = userAskedForAllSources(apiUserText);


      const finalPrompt = buildFinalUserPrompt({
        apiUserText,
        preparedFiles,
        extractedContext,
      });

      // Dôležité: neposielame celú históriu chatu, lebo to vyhadzovalo context-window error.
      const apiMessages = [
        {
          role: 'user' as const,
          content: finalPrompt,
        },
      ];

      const formData = new FormData();

      formData.append('agent', agent);
      formData.append('module', 'chat');
      formData.append('messages', JSON.stringify(apiMessages));
      formData.append('profile', JSON.stringify(activeProfile || null));

      if (activeProfile?.id) {
        formData.append('projectId', activeProfile.id);
      }

      formData.append('sourceMode', 'uploaded_documents_first');
      formData.append('validateAttachmentsAgainstProfile', 'true');
      formData.append('requireSourceList', 'true');
      formData.append('allowAiKnowledgeFallback', 'true');

      formData.append('extractUploadedText', 'false');
      formData.append('useExtractedTextFirst', 'true');
      formData.append('returnExtractedFilesInfo', 'true');
      formData.append('contextaCitationFormat', 'true');
      formData.append('fallbackWhenAttachmentNotRelated', 'true');
      formData.append('detectBibliographicSources', 'true');
      formData.append('requireAllDetectedAuthorsAndPublications', 'true');

      // Úmyselne neposielame celý extractedContext duplicitne ešte aj v samostatnom poli.
      formData.append('clientExtractedText', '');
      formData.append('clientDetectedSourcesSummary', detectedSourcesSummary);
      formData.append('clientDetectedSources', JSON.stringify(detectedSources));
      formData.append('clientDetectedAuthors', JSON.stringify(detectedAuthors));
      formData.append('clientInTextCitations', JSON.stringify(inTextCitations));
      formData.append(
        'preparedFilesSummary',
        buildPreparedFilesSummary(preparedFiles),
      );

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
            pdfExtractedInBrowser: isPdfFile(item.name),
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

      setProcessingLog((prev) =>
        prev.map((item) =>
          item.status === 'ready' ||
          item.status === 'extracted' ||
          item.status === 'metadata_only'
            ? {
                ...item,
                status: 'ready',
                message:
                  item.message + ' Text sa spracováva...',
              }
            : item,
        ),
      );

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

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
          `❌ API chyba ${res.status}

${errorMessage}${modelHelp}

Skús dočasne prepnúť model na Gemini alebo OPEN AI a pozri terminál pri /api/chat.`,
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

        fullText =
          String(
            data.output ||
              data.result ||
              data.message ||
              data.text ||
              data.answer ||
              '',
          ).trim() || '';

        if (!fullText && data.ok === false) {
          appendAssistantMessage(
            `❌ API nevrátilo výstup.

${data.message || data.error || 'Neznáma chyba API.'}`,
          );
          return;
        }

        if (!fullText) {
          fullText =
            'API odpovedalo úspešne, ale nevrátilo žiadny textový výstup.';
        }

        fullText = ensureSourcesSection(fullText);

        const visibleText = cleanAiOutput(fullText);

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: 'assistant',
            content: visibleText,
          };

          return updated;
        });
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

        fullText = ensureSourcesSection(fullText);
      }

      const cleanedFullText = cleanAiOutput(fullText);
      const parsed = parseSections(cleanedFullText);

   const mainOutputText = parsed.output || cleanedFullText;

const fallbackSourcesForUsedText = buildFallbackSourcesSection({
  preparedFiles,
  usedText: mainOutputText,
  forceAll: forceAllSources,
});

const parsedSourcesAreValid =
  parsed.sources &&
  !parsed.sources.toLowerCase().includes('zdroje neboli dodané') &&
  !parsed.sources.toLowerCase().includes('neboli dodané') &&
  !parsed.sources.toLowerCase().includes('nepodarilo overene načítať');

const finalSources = parsedSourcesAreValid
  ? parsed.sources
  : fallbackSourcesForUsedText;

const cleanedMainOutput = cleanAiOutput(
  mainOutputText
    .replace(/===\s*VÝSTUP\s*===/gi, '')
    .replace(/===\s*ANALÝZA\s*===/gi, '')
    .replace(/===\s*SKÓRE\s*===/gi, '')
    .replace(/===\s*ODPORÚČANIA\s*===/gi, '')
    .replace(/===\s*POUŽITÉ ZDROJE A AUTORI\s*===/gi, 'Použité zdroje')
    .replace(/===\s*POUŽITÉ ZDROJE\s*===/gi, 'Použité zdroje'),
);

const outputAlreadyHasSources =
  /použité\s+zdroje/i.test(cleanedMainOutput) ||
  /pouzite\s+zdroje/i.test(normalizeForMatch(cleanedMainOutput));

const finalSourcesClean = cleanAiOutput(finalSources)
  .replace(/^Použité zdroje a autori\s*/i, '')
  .replace(/^Použité zdroje\s*/i, '')
  .replace(/^A\.\s*Zdroje nájdené v priložených dokumentoch\s*/gim, '')
  .replace(/^B\.\s*Formátované bibliografické záznamy\s*/gim, '')
  .replace(/^C\.\s*Varianty odkazov v texte\s*/gim, '')
  .replace(/^D\.\s*Priložené dokumenty použité ako podklad\s*/gim, '')
  .replace(/^E\.\s*Autori nájdení v dokumentoch\s*/gim, '')
  .replace(/^F\.\s*Neúplné alebo neoveriteľné zdroje\s*/gim, '')
  .trim();

const finalTextForCanvas = outputAlreadyHasSources
  ? cleanedMainOutput
  : `${cleanedMainOutput}

Použité zdroje

${finalSourcesClean}`.trim();

      const finalParsed: ParsedResult = {
        ...parsed,
        sources: finalSources,
      };

      setResult(finalTextForCanvas);
      setCanvasText(finalTextForCanvas);

      const looksLikeError =
        finalParsed.output.includes('AI_APICallError') ||
        finalParsed.output.includes('API error') ||
        finalParsed.output.includes('model is not found') ||
        finalParsed.output.includes('not found for API version') ||
        finalParsed.output.includes('Forbidden') ||
        finalParsed.output.includes('Unauthorized');

      if (
        !looksLikeError &&
        (finalParsed.output ||
          finalParsed.analysis ||
          finalParsed.score ||
          finalParsed.tips ||
          finalParsed.sources)
      ) {
        setPopupData(finalParsed);
        setPopup(true);
      }
    } catch (error) {
      console.error('CHAT SEND ERROR:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Nastala chyba pri komunikácii s API.';

      appendAssistantMessage(
        `❌ Nepodarilo sa spracovať požiadavku.

${message}

Skontroluj terminál pri /api/extract-text a /api/chat.`,
      );
    } finally {
      setIsLoading(false);
    }
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
      apiUserText: item.instruction,
    });
  };

  const resetChat = () => {
    setMessages([]);
    setInput('');
    setResult('');
    setCanvasText('');
    setPopup(false);
    setPopupData(null);
    setSelectedTextState(null);
    setProcessingLog([]);

    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  };

  const handleTextSelection = (target: 'result' | 'canvas') => {
    const element =
      target === 'result'
        ? resultTextareaRef.current
        : canvasTextareaRef.current;

    if (!element) return;

    const start = element.selectionStart;
    const end = element.selectionEnd;

    if (start === end) {
      setSelectedTextState(null);
      return;
    }

    const selected = element.value.slice(start, end);

    if (!selected.trim()) {
      setSelectedTextState(null);
      return;
    }

    setSelectedTextState({
      target,
      start,
      end,
      text: selected,
    });
  };

  const replaceSelectedText = (replacement: string) => {
    if (!selectedTextState) return;

    const cleaned = cleanAiOutput(replacement);

    if (selectedTextState.target === 'result') {
      setResult((prev) => {
        const next =
          prev.slice(0, selectedTextState.start) +
          cleaned +
          prev.slice(selectedTextState.end);

        setCanvasText(next);
        return next;
      });
    } else {
      setCanvasText((prev) => {
        return (
          prev.slice(0, selectedTextState.start) +
          cleaned +
          prev.slice(selectedTextState.end)
        );
      });
    }

    setSelectedTextState(null);
  };

  const editSelectedText = async (
    mode: 'academic' | 'shorten' | 'expand' | 'grammar',
  ) => {
    if (!selectedTextState || isLoading) return;

    const instructions: Record<typeof mode, string> = {
      academic:
        'Prepíš označený text do profesionálneho akademického jazyka. Zachovaj význam, nezmeň fakty, nepridávaj vymyslené zdroje.',
      shorten:
        'Skráť označený text, zachovaj hlavné myšlienky, odstráň opakovania a ponechaj akademický štýl.',
      expand:
        'Rozšír označený text odborne a akademicky. Zachovaj význam, doplň logické vysvetlenie, ale nevymýšľaj zdroje.',
      grammar:
        'Oprav gramatiku, štylistiku, interpunkciu a plynulosť označeného textu. Zachovaj význam.',
    };

    setIsLoading(true);

    try {
      const prompt = `
${instructions[mode]}

Označený text:
"""
${selectedTextState.text}
"""

Vráť iba upravený text bez nadpisov, bez markdown znakov a bez komentára.
`.trim();

      const formData = new FormData();

      formData.append('agent', agent);
      formData.append(
        'messages',
        JSON.stringify([
          {
            role: 'user',
            content: prompt,
          },
        ]),
      );
      formData.append('profile', JSON.stringify(activeProfile || null));
      formData.append('editSelectedTextOnly', 'true');

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readApiErrorResponse(res));
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
        );
      } else {
        if (!res.body) {
          throw new Error('API nevrátilo stream odpovede.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          editedText += decoder.decode(value, { stream: true });
        }
      }

      if (!editedText.trim()) {
        throw new Error('AI nevrátila upravený text.');
      }

      replaceSelectedText(editedText);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Nepodarilo sa upraviť označený text.';

      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        html,
        body {
          overflow: hidden;
          background: #050711;
        }

        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }
      `}</style>

      <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#050711] text-white">
        <div className="mx-auto flex h-screen min-h-0 w-full max-w-[1500px] flex-col overflow-hidden px-4 py-3 md:px-8">
          <header className="shrink-0 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                <RefreshCcw className="h-4 w-4" />
                + Nový chat
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

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#070a16] shadow-2xl shadow-black/30">
            <div
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-8"
            >
              {messages.length === 0 ? (
                <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center py-4">
                  <div className="mb-5 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                      <Brain className="h-6 w-6" />
                    </div>

                    <h3 className="text-3xl font-black">
                      Začnite konverzáciu
                    </h3>

                    <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Najprv má byť vyplnený profil práce. Potom môžeš písať,
                      kontrolovať text, nahrávať podklady a upravovať označené
                      časti výstupu.
                    </p>
                  </div>

                  <div className="grid w-full gap-3 md:grid-cols-3">
                    {suggestions.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => runSuggestion(item)}
                          disabled={!isMounted || isLoading || !activeProfile}
                          className="group flex min-h-[76px] items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.055] p-4 text-left transition hover:border-violet-400/50 hover:bg-white/[0.085] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 transition group-hover:bg-violet-600 group-hover:text-white">
                            <Icon className="h-5 w-5" />
                          </span>

                          <span className="text-sm font-black leading-5 text-slate-100">
                            {item.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-5xl space-y-5 pb-2">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-5 py-4 text-sm leading-7 shadow-lg ${
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
                        Spracovanie príloh, citácií v texte a zdrojov
                      </div>

                      <div className="space-y-2">
                        {processingLog.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-slate-300"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-black text-white">
                                {item.name}
                              </div>

                              <div
                                className={`rounded-xl px-3 py-1 text-[10px] font-black uppercase ${
                                  item.status === 'error'
                                    ? 'bg-red-500/20 text-red-100'
                                    : item.status === 'extracted' ||
                                        item.status === 'ready'
                                      ? 'bg-emerald-500/20 text-emerald-100'
                                      : item.status === 'metadata_only'
                                        ? 'bg-amber-500/20 text-amber-100'
                                        : 'bg-violet-500/20 text-violet-100'
                                }`}
                              >
                                {item.status}
                              </div>
                            </div>

                            <div className="mt-1 leading-5 text-slate-400">
                              {item.message}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                              {item.originalSize ? (
                                <span>
                                  pôvodne: {formatBytes(item.originalSize)}
                                </span>
                              ) : null}

                              {item.preparedSize ? (
                                <span>
                                  po príprave: {formatBytes(item.preparedSize)}
                                </span>
                              ) : null}

                              {typeof item.extractedChars === 'number' ? (
                                <span>
                                  extrahované znaky: {item.extractedChars}
                                </span>
                              ) : null}

                              {typeof item.detectedInTextCitationsCount ===
                              'number' ? (
                                <span>
                                  citácie v texte:{' '}
                                  {item.detectedInTextCitationsCount}
                                </span>
                              ) : null}

                              {typeof item.detectedSourcesCount === 'number' ? (
                                <span>
                                  detegované zdroje: {item.detectedSourcesCount}
                                </span>
                              ) : null}

                              {typeof item.detectedAuthorsCount === 'number' ? (
                                <span>autori: {item.detectedAuthorsCount}</span>
                              ) : null}
                            </div>

                            {item.warning ? (
                              <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                                {item.warning}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-white/10 bg-white/[0.065] px-5 py-4 text-sm font-bold text-violet-200">
                        🤖 {activeAgentLabel} spracúva požiadavku...
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#070a16]/95 px-4 py-3 backdrop-blur md:px-8">
              <div className="mx-auto max-w-6xl rounded-[28px] border border-violet-500/40 bg-violet-950/30 p-3 shadow-2xl shadow-violet-950/40">
                {attachedFiles.length > 0 && (
                  <div className="mb-3 max-h-[110px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                      <UploadCloud className="h-4 w-4 text-violet-300" />
                      Pripojené podklady ({attachedFiles.length}/
                      {maxFilesCount})
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs text-violet-100"
                        >
                          <FileText className="h-4 w-4 shrink-0" />

                          <span className="rounded-lg bg-violet-600/30 px-2 py-1 text-[10px] font-black uppercase text-violet-100">
                            {getFileKindLabel(file.name)}
                          </span>

                          <span className="max-w-[210px] truncate font-bold">
                            {file.name}
                          </span>

                          <span className="shrink-0 text-[11px] text-violet-200/70">
                            {formatBytes(file.size)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="shrink-0 rounded-full p-1 text-violet-100 transition hover:bg-white/10"
                          >
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

                    {agents.map((item) => {
                      const active = agent === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setAgent(item.key)}
                          disabled={!isMounted || isLoading}
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
                  className="flex items-end gap-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={allowedFileAccept}
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isMounted || isLoading}
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
                    placeholder={
                      attachedFiles.length > 0
                        ? 'Napíšte správu alebo odošlite len priložené dokumenty...'
                        : 'Napíšte správu...'
                    }
                    className="min-h-[48px] max-h-[120px] flex-1 resize-none rounded-2xl bg-white/[0.035] px-4 py-3 text-base leading-6 text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.06]"
                  />

                  <button
                    type="button"
                    onClick={startDictation}
                    disabled={!isMounted || isLoading}
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
                  <div className="text-sm font-black text-white">
                    Označený text
                  </div>
                  <div className="mt-1 max-h-[70px] overflow-y-auto text-xs leading-5 text-slate-400">
                    {selectedTextState.text}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTextState(null)}
                  className="rounded-2xl bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => editSelectedText('academic')}
                  disabled={isLoading}
                  className="rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  Akademicky upraviť
                </button>

                <button
                  type="button"
                  onClick={() => editSelectedText('shorten')}
                  disabled={isLoading}
                  className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  Skrátiť
                </button>

                <button
                  type="button"
                  onClick={() => editSelectedText('expand')}
                  disabled={isLoading}
                  className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  Rozšíriť
                </button>

                <button
                  type="button"
                  onClick={() => editSelectedText('grammar')}
                  disabled={isLoading}
                  className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
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
                    <p className="text-sm text-slate-400">
                      Text môžeš označiť myšou a upraviť iba vybranú časť.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadDoc}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                    >
                      <Download className="h-4 w-4" />
                      DOC
                    </button>

                    <button
                      type="button"
                      onClick={downloadPdf}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15"
                    >
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
                        setPopup(false);
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

                <div className="grid min-h-0 flex-1 gap-5 overflow-hidden p-6 md:grid-cols-[1fr_330px]">
                  <textarea
                    ref={resultTextareaRef}
                    value={result}
                    onChange={(event) => {
                      setResult(event.target.value);
                      setCanvasText(event.target.value);
                    }}
                    onSelect={() => handleTextSelection('result')}
                    className="min-h-[60vh] resize-none rounded-3xl border border-white/10 bg-black/20 p-6 text-sm leading-8 text-slate-100 outline-none focus:border-violet-400/60"
                  />

                  <div className="space-y-4 overflow-y-auto">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">📊 Skóre</h3>
                      <div className="text-2xl font-black text-emerald-400">
                        {popupData?.score || '—'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">⚠️ Analýza</h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {popupData?.analysis || 'Bez analýzy.'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                      <h3 className="mb-2 font-black">✏️ Odporúčania</h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {popupData?.tips || 'Bez odporúčaní.'}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                      <h3 className="mb-2 font-black text-emerald-200">
                        📚 Zdroje
                      </h3>
                      <div className="whitespace-pre-wrap text-sm leading-6 text-emerald-50/90">
                        {popupData?.sources ||
                          'Zdroje neboli dodané alebo sa ich nepodarilo overene načítať.'}
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
                    <p className="text-sm text-slate-400">
                      Aj tu môžeš označiť časť textu a upraviť iba vybraný úsek.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadDoc}
                      disabled={!canvasText.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      DOC
                    </button>

                    <button
                      type="button"
                      onClick={downloadPdf}
                      disabled={!canvasText.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => setCanvasOpen(false)}
                      className="rounded-2xl bg-red-500/90 p-3 text-white hover:bg-red-400"
                    >
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
