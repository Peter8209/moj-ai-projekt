import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { gunzipSync } from 'zlib';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// ================= TYPES =================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

type ModuleKey =
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'chat'
  | 'unknown';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SavedProfile = {
  title?: string;
  topic?: string;
  type?: string;
  level?: string;
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
  schema?: {
    label?: string;
    description?: string;
    recommendedLength?: string;
    structure?: string[];
    requiredSections?: string[];
    aiInstruction?: string;
  };
};

type ProjectDocument = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
  type?: string | null;
  extracted_text?: string | null;
  created_at?: string;
};

type ModelResult = {
  model: any;
  providerLabel: string;
};

type SourceMode = 'uploaded_documents_first';

type SourceSettings = {
  sourceMode: SourceMode;
  validateAttachmentsAgainstProfile: boolean;
  requireSourceList: boolean;
  allowAiKnowledgeFallback: boolean;
};

type PreparedFileMetadata = {
  originalId?: string;
  originalName?: string;
  originalSize?: number;
  originalType?: string;
  preparedName?: string;
  preparedSize?: number;
  preparedType?: string;
  compressionMode?: string;
  extractionStatus?: string;
  extractionMethod?: string;
  extractionMessage?: string;
  detectedSourcesCount?: number;
  detectedSources?: BibliographicCandidate[];
  detectedAuthors?: string[];
  formattedSources?: string;
  warning?: string;
};

type BibliographicCandidate = {
  raw: string;
  authors: string[];
  year: string | null;
  title: string | null;
  doi: string | null;
  url: string | null;
  sourceType: 'book' | 'article' | 'web' | 'software' | 'unknown';
};

type ExtractedAttachment = {
  name: string;
  originalName: string;
  preparedName: string;
  type: string;
  size: number;
  compressedSize: number;
  decompressedSize: number;
  extension: string;
  effectiveExtension: string;
  label: string;
  isGzip: boolean;
  wasDecompressed: boolean;
  compressionWithinLimit: boolean;
  compressionStatus: string;
  extractedText: string;
  extractedChars: number;
  extractedPreview: string;
  status: string;
  error?: string | null;
  warning?: string | null;
  bibliographicCandidates: BibliographicCandidate[];
  detectedAuthors: string[];
  formattedSources: string;
};

// ================= LIMITS =================

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;

// Dôležité: toto rieši chybu context window.
const maxExtractedCharsPerAttachment = 18_000;
const maxClientExtractedChars = 45_000;
const maxProjectDocumentChars = 18_000;
const maxAttachmentContextChars = 80_000;
const maxSystemPromptChars = 110_000;
const maxSingleMessageChars = 10_000;
const maxTotalMessagesChars = 30_000;
const maxDetectedSourcesPerAttachment = 80;

// ================= PROJECT DOCUMENTS =================

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) return [];

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('zedpera_documents')
      .select(
        'id, project_id, file_name, file_path, file_size, file_type, type, extracted_text, created_at',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error('LOAD_PROJECT_DOCUMENTS_ERROR:', error);
      return [];
    }

    return (data || []) as ProjectDocument[];
  } catch (error) {
    console.error('LOAD_PROJECT_DOCUMENTS_FATAL_ERROR:', error);
    return [];
  }
}

// ================= GENERAL HELPERS =================

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== 'string') return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toCleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value: string): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function limitText(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]`;
}

function limitMiddle(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) return cleaned;

  const half = Math.floor(maxLength / 2);

  return `${cleaned.slice(0, half)}

[STRED TEXTU BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]

${cleaned.slice(-half)}`;
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

function isAllowedAgent(value: unknown): value is Agent {
  return (
    value === 'openai' ||
    value === 'claude' ||
    value === 'gemini' ||
    value === 'grok' ||
    value === 'mistral'
  );
}

function normalizeModule(value: unknown): ModuleKey {
  if (
    value === 'supervisor' ||
    value === 'quality' ||
    value === 'defense' ||
    value === 'translation' ||
    value === 'data' ||
    value === 'planning' ||
    value === 'emails' ||
    value === 'originality' ||
    value === 'chat'
  ) {
    return value;
  }

  return 'unknown';
}

function stripDuplicatedLargePromptSections(content: string) {
  let output = normalizeText(content);

  const cutMarkers = [
    'AKTÍVNY PROFIL PRÁCE:',
    'PRILOŽENÉ DOKUMENTY:',
    'STAV KOMPRESIE A EXTRAKCIE:',
    'STAV KOMPRESIE A EXTRAKCIE CEZ /api/extract-text:',
    'DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:',
    'EXTRAHOVANÝ TEXT Z PRÍLOH:',
    'POVINNÉ PRAVIDLÁ SPRACOVANIA:',
    'VÝSTUP VRÁŤ PRESNE V TOMTO FORMÁTE:',
  ];

  let firstCutIndex = -1;

  for (const marker of cutMarkers) {
    const index = output.indexOf(marker);

    if (index >= 0 && (firstCutIndex === -1 || index < firstCutIndex)) {
      firstCutIndex = index;
    }
  }

  if (firstCutIndex > 0) {
    output = output.slice(0, firstCutIndex).trim();
  }

  if (!output) {
    output = 'Spracuj požiadavku používateľa podľa profilu práce a extrahovaných podkladov.';
  }

  return limitText(output, maxSingleMessageChars);
}

function normalizeMessages(messages: ChatMessage[]) {
  const cleaned = messages
    .filter((message) => {
      return (
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0
      );
    })
    .map((message) => ({
      role: message.role,
      content: stripDuplicatedLargePromptSections(message.content),
    }));

  const lastMessages = cleaned.slice(-8);
  let total = 0;
  const result: ChatMessage[] = [];

  for (let i = lastMessages.length - 1; i >= 0; i -= 1) {
    const message = lastMessages[i];
    const nextTotal = total + message.content.length;

    if (nextTotal > maxTotalMessagesChars && result.length > 0) break;

    result.unshift(message);
    total = nextTotal;
  }

  return result;
}

function getWorkLanguage(profile: SavedProfile | null) {
  return (
    toCleanString(profile?.workLanguage) ||
    toCleanString(profile?.language) ||
    'slovenčina'
  );
}

function getCitationStyle(profile: SavedProfile | null) {
  return toCleanString(profile?.citation) || 'ISO 690';
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return [];

  const fromKeywordsList = Array.isArray(profile.keywordsList)
    ? profile.keywordsList
    : [];

  const fromKeywords = Array.isArray(profile.keywords) ? profile.keywords : [];

  return [...fromKeywordsList, ...fromKeywords]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function normalizeSourceMode(value: unknown): SourceMode {
  if (value === 'uploaded_documents_first') return 'uploaded_documents_first';

  return 'uploaded_documents_first';
}

function asBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value === null) return fallback;

  const normalized = String(value).toLowerCase().trim();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function isStrictNoAcademicTailModule(module: ModuleKey) {
  return module === 'translation' || module === 'emails' || module === 'planning';
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) return '';

  return fileName.slice(index).toLowerCase();
}

function removeGzipSuffix(fileName: string) {
  return fileName.toLowerCase().endsWith('.gz')
    ? fileName.slice(0, -3)
    : fileName;
}

function getEffectiveFileName(fileName: string) {
  return removeGzipSuffix(fileName);
}

function getEffectiveExtension(fileName: string) {
  return getFileExtension(getEffectiveFileName(fileName));
}

function isLikelyChapterRequestText(text: string) {
  const normalized = normalizeText(text).toLowerCase();

  return (
    /\bkapitola\s+\d+(?:\.\d+)*\b/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)+\s*[:.-]?\s*/i.test(normalized) ||
    normalized.includes('šablóna vyššie') ||
    normalized.includes('identická štruktúra') ||
    normalized.includes('text zo zedpery') ||
    normalized.includes('kapitolu')
  );
}

function detectChapterNumberFromText(text: string) {
  const normalized = normalizeText(text);
  const match =
    normalized.match(/\bkapitola\s+(\d+(?:\.\d+)*)\b/i) ||
    normalized.match(/^\s*(\d+(?:\.\d+)+)\b/i) ||
    normalized.match(/\b(\d+(?:\.\d+)+)\b/i);

  return match?.[1] || null;
}

function getLastUserMessage(messages: ChatMessage[]) {
  const last = [...messages].reverse().find((message) => message.role === 'user');
  return last?.content || '';
}

function isAcademicChapterRequest(messages: ChatMessage[]) {
  const lastUserMessage = getLastUserMessage(messages);
  return isLikelyChapterRequestText(lastUserMessage);
}

// ================= BIBLIOGRAPHIC DETECTION =================

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
    lower.includes('www.') ||
    lower.includes('retrieved from') ||
    lower.includes('dostupné')
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

function extractYear(line: string) {
  const match =
    line.match(/\((19|20)\d{2}\)/) ||
    line.match(/\b(19|20)\d{2}\b/) ||
    line.match(/\bn\.d\.\b/i);

  return match?.[0]?.replace(/[()]/g, '') || null;
}

function extractAuthors(line: string) {
  const beforeYear = line.split(/\((19|20)\d{2}\)|\b(19|20)\d{2}\b/)[0] || '';

  const cleaned = beforeYear
    .replace(/\bet al\./gi, '')
    .replace(/\ba kol\./gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-•\d.)\s]+/, '')
    .trim();

  const candidates = cleaned
    .split(/\s*(?:;|&|\ba\b|\band\b)\s*/i)
    .flatMap((part) => {
      if (/^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^,]{1,80},\s*[A-Z]/.test(part)) {
        return [part.trim()];
      }

      return part.split(/,\s*/).map((item) => item.trim());
    })
    .filter((part) => {
      if (part.length < 3) return false;
      if (part.length > 120) return false;
      if (!/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part)) return false;

      if (
        /^(in|from|retrieved|dostupné|available|vol|no|pp|pages|journal|university|press|publisher)$/i.test(
          part,
        )
      ) {
        return false;
      }

      return (
        /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+$/.test(
          part,
        ) ||
        /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]+,\s*[A-Z]/.test(part)
      );
    });

  return uniqueArray(candidates).slice(0, 12);
}

function extractTitle(line: string) {
  let working = line.trim();

  working = working.replace(/^[-•\d.)\s]+/, '');
  working = working.replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '');
  working = working.replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, '');

  const quoted =
    working.match(/"([^"]{5,180})"/) ||
    working.match(/„([^“”]{5,180})“/) ||
    working.match(/'([^']{5,180})'/);

  if (quoted?.[1]) return quoted[1].trim();

  const afterYear = working.split(/\((19|20)\d{2}\)|\b(19|20)\d{2}\b/).pop();

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
  const trimmed = line.trim();

  if (trimmed.length < 20) return false;
  if (trimmed.length > 1600) return false;

  const hasYear = /\b(19|20)\d{2}\b|\bn\.d\.\b/i.test(trimmed);
  const hasDoi = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(trimmed);
  const hasUrl = /https?:\/\/|www\./i.test(trimmed);
  const hasCitationWords =
    /publisher|journal|doi|isbn|vydavateľ|časopis|university|press|jasp|spss|software|available|dostupné|retrieved|vol\.|volume|issue|pages|pp\./i.test(
      trimmed,
    );
  const hasAuthorPattern =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+,\s*[A-Z]/.test(
      trimmed,
    ) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+\s+\([12]\d{3}\)/.test(
      trimmed,
    );

  return hasDoi || hasUrl || (hasYear && (hasCitationWords || hasAuthorPattern));
}

function extractBibliographicCandidates(text: string) {
  const cleaned = normalizeText(text);

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const candidatesToCheck: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';

    candidatesToCheck.push(current);

    if (current.length < 180 && next) {
      candidatesToCheck.push(`${current} ${next}`.trim());
    }

    if (current.length < 140 && next && next2) {
      candidatesToCheck.push(`${current} ${next} ${next2}`.trim());
    }
  }

  const candidates: BibliographicCandidate[] = [];

  for (const line of candidatesToCheck) {
    if (!looksLikeBibliographicLine(line)) continue;

    candidates.push({
      raw: line.slice(0, 1000),
      authors: extractAuthors(line),
      year: extractYear(line),
      title: extractTitle(line),
      doi: extractDoi(line),
      url: extractUrl(line),
      sourceType: detectSourceType(line),
    });
  }

  const unique = new Map<string, BibliographicCandidate>();

  for (const item of candidates) {
    const key = `${item.raw.slice(0, 180)}-${item.doi || ''}-${item.url || ''}`;

    if (!unique.has(key)) unique.set(key, item);
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function normalizeBibliographicCandidates(value: unknown): BibliographicCandidate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      raw: String(item?.raw || item?.citation || item?.text || '').trim(),
      authors: Array.isArray(item?.authors)
        ? item.authors.map((author: unknown) => String(author || '').trim()).filter(Boolean)
        : typeof item?.authors === 'string'
          ? item.authors.split(/,|;|\n/).map((author: string) => author.trim()).filter(Boolean)
          : [],
      year: item?.year ? String(item.year) : null,
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
    }))
    .filter((item) => item.raw || item.authors.length || item.title || item.doi || item.url);
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy. Ak sú zdroje v texte, treba ich manuálne overiť alebo doplniť čitateľnejší zoznam literatúry.';
  }

  return candidates
    .slice(0, maxDetectedSourcesPerAttachment)
    .map((item, index) => {
      return `${index + 1}. Pôvodný záznam:
${item.raw || 'neuvedené'}

Autori: ${item.authors.length ? item.authors.join(', ') : 'neuvedené alebo potrebné overiť'}
Rok: ${item.year || 'údaj je potrebné overiť'}
Názov publikácie / zdroja: ${item.title || 'údaj je potrebné overiť'}
Typ zdroja: ${item.sourceType}
DOI: ${item.doi || 'neuvedené'}
URL: ${item.url || 'neuvedené'}`;
    })
    .join('\n\n');
}

function mergeBibliographicCandidates(
  ...groups: Array<BibliographicCandidate[] | undefined | null>
) {
  const unique = new Map<string, BibliographicCandidate>();

  for (const group of groups) {
    for (const item of group || []) {
      const normalizedItem: BibliographicCandidate = {
        raw: String(item.raw || '').trim(),
        authors: Array.isArray(item.authors) ? item.authors : [],
        year: item.year || null,
        title: item.title || null,
        doi: item.doi || null,
        url: item.url || null,
        sourceType: item.sourceType || 'unknown',
      };

      const key = `${normalizedItem.raw.slice(0, 180)}-${normalizedItem.doi || ''}-${normalizedItem.url || ''}`;

      if (!unique.has(key)) unique.set(key, normalizedItem);
    }
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function extractAuthorsFromCandidates(candidates: BibliographicCandidate[]) {
  return uniqueArray(candidates.flatMap((item) => item.authors || []));
}

// ================= ATTACHMENTS =================

const allowedAttachmentExtensions = [
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
  '.gz',
];

const extractableAttachmentExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.rtf'];

function isGzipFile(file: File) {
  const fileName = file.name || '';
  const fileType = file.type || '';

  return (
    fileName.toLowerCase().endsWith('.gz') ||
    fileType === 'application/gzip' ||
    fileType === 'application/x-gzip'
  );
}

function isAllowedAttachment(file: File) {
  const extension = getFileExtension(file.name);
  const effectiveExtension = getEffectiveExtension(file.name);

  return (
    allowedAttachmentExtensions.includes(extension) ||
    allowedAttachmentExtensions.includes(effectiveExtension)
  );
}

function getAttachmentLabel(fileName: string) {
  const extension = getEffectiveExtension(fileName);

  if (extension === '.pdf') return 'PDF dokument';
  if (['.doc', '.docx'].includes(extension)) return 'Word dokument';

  if (['.txt', '.rtf', '.odt', '.md'].includes(extension)) {
    return 'Textový dokument';
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
    return 'Obrázok';
  }

  if (['.xls', '.xlsx', '.csv'].includes(extension)) return 'Tabuľka';
  if (['.ppt', '.pptx'].includes(extension)) return 'Prezentácia';
  if (extension === '.gz') return 'Komprimovaný súbor';

  return 'Súbor';
}

function stripRtf(value: string): string {
  return value
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
    .replace(/\\[a-zA-Z]+\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeGunzip(buffer: Buffer) {
  try {
    return gunzipSync(buffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Nepodarilo sa rozbaliť gzip súbor.';

    throw new Error(`GZIP_DECOMPRESSION_FAILED: ${message}`);
  }
}

async function getUsableFileBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const originalBuffer = Buffer.from(arrayBuffer);
  const gzip = isGzipFile(file);

  if (!gzip) {
    return {
      originalBuffer,
      usableBuffer: originalBuffer,
      compressedSize: originalBuffer.length,
      decompressedSize: originalBuffer.length,
      wasDecompressed: false,
      compressionWithinLimit: originalBuffer.length <= maxCompressedFileSizeBytes,
      compressionStatus:
        originalBuffer.length <= maxCompressedFileSizeBytes
          ? 'Súbor nie je gzip, ale veľkosť je do 1 MB.'
          : 'Súbor nie je gzip a veľkosť je väčšia ako 1 MB.',
    };
  }

  const decompressed = safeGunzip(originalBuffer);

  return {
    originalBuffer,
    usableBuffer: decompressed,
    compressedSize: originalBuffer.length,
    decompressedSize: decompressed.length,
    wasDecompressed: true,
    compressionWithinLimit: originalBuffer.length <= maxCompressedFileSizeBytes,
    compressionStatus:
      originalBuffer.length <= maxCompressedFileSizeBytes
        ? 'Komprimovaný súbor je do 1 MB a bol úspešne rozbalený.'
        : 'Komprimovaný súbor je väčší ako 1 MB, ale bol úspešne rozbalený.',
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const result = await pdfParse(buffer);

  return normalizeText(result?.text || '');
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });

  return normalizeText(result.value || '');
}

function getPreparedMetadataForFile(
  file: File,
  preparedFilesMetadata: PreparedFileMetadata[],
) {
  const fileName = file.name || '';

  return (
    preparedFilesMetadata.find((item) => item.preparedName === fileName) ||
    preparedFilesMetadata.find((item) => item.originalName === fileName) ||
    null
  );
}

async function extractTextFromSingleFile(
  file: File,
  preparedFilesMetadata: PreparedFileMetadata[],
): Promise<ExtractedAttachment> {
  const preparedMetadata = getPreparedMetadataForFile(file, preparedFilesMetadata);

  const preparedName = file.name || 'neznamy-subor';
  const originalName =
    preparedMetadata?.originalName || removeGzipSuffix(preparedName) || preparedName;

  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(preparedName);
  const effectiveExtension = getEffectiveExtension(preparedName);
  const label = getAttachmentLabel(preparedName);
  const gzip = isGzipFile(file);
  const metadataCandidates = normalizeBibliographicCandidates(
    preparedMetadata?.detectedSources || [],
  );
  const metadataAuthors = Array.isArray(preparedMetadata?.detectedAuthors)
    ? preparedMetadata.detectedAuthors
    : [];
  const metadataFormattedSources = preparedMetadata?.formattedSources || '';

  if (!isAllowedAttachment(file)) {
    return {
      name: originalName,
      originalName,
      preparedName,
      type,
      size,
      compressedSize: size,
      decompressedSize: 0,
      extension,
      effectiveExtension,
      label,
      isGzip: gzip,
      wasDecompressed: false,
      compressionWithinLimit: size <= maxCompressedFileSizeBytes,
      compressionStatus: 'Nepodporovaný formát súboru.',
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Nepodporovaný formát súboru.',
      error: 'Nepodporovaný formát súboru.',
      warning: preparedMetadata?.warning || null,
      bibliographicCandidates: metadataCandidates,
      detectedAuthors: metadataAuthors,
      formattedSources: metadataFormattedSources,
    };
  }

  try {
    const {
      usableBuffer,
      compressedSize,
      decompressedSize,
      wasDecompressed,
      compressionWithinLimit,
      compressionStatus,
    } = await getUsableFileBuffer(file);

    if (!extractableAttachmentExtensions.includes(effectiveExtension)) {
      return {
        name: originalName,
        originalName,
        preparedName,
        type,
        size,
        compressedSize,
        decompressedSize,
        extension,
        effectiveExtension,
        label,
        isGzip: gzip,
        wasDecompressed,
        compressionWithinLimit,
        compressionStatus,
        extractedText: '',
        extractedChars: 0,
        extractedPreview: '',
        status:
          'Súbor bol priložený, ale z tohto typu sa v tejto API trase neextrahuje text. AI má dostupný iba názov, typ, veľkosť a stav kompresie.',
        error: null,
        warning: preparedMetadata?.warning || null,
        bibliographicCandidates: metadataCandidates,
        detectedAuthors: metadataAuthors,
        formattedSources: metadataFormattedSources,
      };
    }

    let extractedText = '';

    if (['.txt', '.md', '.csv'].includes(effectiveExtension)) {
      extractedText = normalizeText(usableBuffer.toString('utf8'));
    } else if (effectiveExtension === '.rtf') {
      extractedText = normalizeText(stripRtf(usableBuffer.toString('utf8')));
    } else if (effectiveExtension === '.docx') {
      extractedText = await extractDocxText(usableBuffer);
    } else if (effectiveExtension === '.pdf') {
      extractedText = await extractPdfText(usableBuffer);
    }

    if (!extractedText.trim()) {
      return {
        name: originalName,
        originalName,
        preparedName,
        type,
        size,
        compressedSize,
        decompressedSize,
        extension,
        effectiveExtension,
        label,
        isGzip: gzip,
        wasDecompressed,
        compressionWithinLimit,
        compressionStatus,
        extractedText: '',
        extractedChars: 0,
        extractedPreview: '',
        status:
          effectiveExtension === '.pdf'
            ? 'Text sa nepodarilo extrahovať. PDF môže byť skenované ako obrázok alebo môže obsahovať iba obrazové strany.'
            : 'Text sa nepodarilo extrahovať alebo je súbor prázdny.',
        error: null,
        warning: preparedMetadata?.warning || null,
        bibliographicCandidates: metadataCandidates,
        detectedAuthors: metadataAuthors,
        formattedSources: metadataFormattedSources,
      };
    }

    const detectedCandidates = extractBibliographicCandidates(extractedText);
    const bibliographicCandidates = mergeBibliographicCandidates(
      metadataCandidates,
      detectedCandidates,
    );

    const detectedAuthors = uniqueArray([
      ...metadataAuthors,
      ...extractAuthorsFromCandidates(bibliographicCandidates),
    ]);

    const limited = limitText(extractedText, maxExtractedCharsPerAttachment);

    return {
      name: originalName,
      originalName,
      preparedName,
      type,
      size,
      compressedSize,
      decompressedSize,
      extension,
      effectiveExtension,
      label,
      isGzip: gzip,
      wasDecompressed,
      compressionWithinLimit,
      compressionStatus,
      extractedText: limited,
      extractedChars: extractedText.length,
      extractedPreview: extractedText.slice(0, 1200),
      status: wasDecompressed
        ? 'Súbor bol najprv rozbalený z gzip a text bol úspešne extrahovaný.'
        : 'Text bol úspešne extrahovaný.',
      error: null,
      warning: preparedMetadata?.warning || null,
      bibliographicCandidates,
      detectedAuthors,
      formattedSources: metadataFormattedSources,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Nepodarilo sa extrahovať text zo súboru.';

    return {
      name: originalName,
      originalName,
      preparedName,
      type,
      size,
      compressedSize: size,
      decompressedSize: 0,
      extension,
      effectiveExtension,
      label,
      isGzip: gzip,
      wasDecompressed: false,
      compressionWithinLimit: size <= maxCompressedFileSizeBytes,
      compressionStatus: gzip
        ? 'Súbor je gzip, ale rozbalenie alebo extrakcia zlyhala.'
        : 'Súbor nie je gzip a extrakcia zlyhala.',
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Extrakcia zlyhala.',
      error: message,
      warning: preparedMetadata?.warning || null,
      bibliographicCandidates: metadataCandidates,
      detectedAuthors: metadataAuthors,
      formattedSources: metadataFormattedSources,
    };
  }
}

function buildCompactSourceSummary({
  clientDetectedSourcesSummary,
  clientDetectedSources,
  extractedFiles,
}: {
  clientDetectedSourcesSummary: string;
  clientDetectedSources: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
}) {
  const fileSources = extractedFiles.flatMap((file) => file.bibliographicCandidates || []);
  const mergedSources = mergeBibliographicCandidates(clientDetectedSources, fileSources);

  const authors = uniqueArray([
    ...extractAuthorsFromCandidates(mergedSources),
    ...extractedFiles.flatMap((file) => file.detectedAuthors || []),
  ]);

  const formatted = formatBibliographicCandidates(mergedSources);

  return {
    sources: mergedSources,
    authors,
    text: limitText(
      `SÚHRN DETEGOVANÝCH ZDROJOV A AUTOROV

Autori:
${authors.length ? authors.join(', ') : 'Autori neboli automaticky identifikovaní alebo ich treba overiť.'}

Detegované bibliografické záznamy:
${formatted}

Doplňujúci súhrn z frontendu:
${clientDetectedSourcesSummary || 'neuvedené'}`,
      24_000,
    ),
  };
}

async function extractAttachmentTexts({
  files,
  preparedFilesMetadata,
  clientExtractedText,
  preparedFilesSummary,
  clientDetectedSourcesSummary,
  clientDetectedSources,
}: {
  files: File[];
  preparedFilesMetadata: PreparedFileMetadata[];
  clientExtractedText: string;
  preparedFilesSummary: string;
  clientDetectedSourcesSummary: string;
  clientDetectedSources: BibliographicCandidate[];
}) {
  const extractedFiles: ExtractedAttachment[] = [];

  if (files.length) {
    for (const file of files.slice(0, 8)) {
      const extracted = await extractTextFromSingleFile(file, preparedFilesMetadata);
      extractedFiles.push(extracted);
    }
  }

  const compactSources = buildCompactSourceSummary({
    clientDetectedSourcesSummary,
    clientDetectedSources,
    extractedFiles,
  });

  const attachmentTexts: string[] = [];

  if (preparedFilesSummary.trim()) {
    attachmentTexts.push(`TECHNICKÝ PREHĽAD PRÍLOH
${limitText(preparedFilesSummary, 12_000)}`);
  }

  attachmentTexts.push(compactSources.text);

  if (clientExtractedText.trim()) {
    const frontendCandidates = mergeBibliographicCandidates(
      clientDetectedSources,
      extractBibliographicCandidates(clientExtractedText),
    );

    attachmentTexts.push(`EXTRAHOVANÝ TEXT Z /api/extract-text ALEBO FRONTENDU
Stav: Text bol extrahovaný pred volaním /api/chat.
Použi tento text ako hlavný podklad, ale pracuj iba s dostupnými údajmi.
Počet detegovaných zdrojov: ${frontendCandidates.length}

DETEGOVANÉ ZDROJE:
${formatBibliographicCandidates(frontendCandidates)}

TEXT:
${limitMiddle(clientExtractedText, maxClientExtractedChars)}`);
  }

  for (const file of extractedFiles) {
    const textBlock =
      file.extractedText && file.extractedText.trim().length > 0
        ? file.extractedText
        : '[Text nebol extrahovaný alebo nie je dostupný.]';

    attachmentTexts.push(`PRILOŽENÝ SÚBOR
Názov pôvodného súboru: ${file.originalName}
Názov prijatého súboru: ${file.preparedName}
Typ: ${file.label}
MIME: ${file.type}
Prípona prijatého súboru: ${file.extension || 'neuvedené'}
Efektívna prípona po rozbalení: ${file.effectiveExtension || 'neuvedené'}
Veľkosť prijatého súboru: ${file.size} bajtov
Komprimovaná veľkosť: ${file.compressedSize} bajtov
Veľkosť po rozbalení: ${file.decompressedSize} bajtov
Je gzip: ${file.isGzip ? 'áno' : 'nie'}
Bol rozbalený pred extrakciou: ${file.wasDecompressed ? 'áno' : 'nie'}
Kompresia do 1 MB: ${file.compressionWithinLimit ? 'áno' : 'nie'}
Stav kompresie: ${file.compressionStatus}
Stav extrakcie: ${file.status}
Počet extrahovaných znakov: ${file.extractedChars}
Počet detegovaných bibliografických kandidátov: ${file.bibliographicCandidates.length}
Autori: ${file.detectedAuthors.length ? file.detectedAuthors.join(', ') : 'neuvedené alebo potrebné overiť'}
Upozornenie: ${file.warning || 'bez upozornenia'}
Chyba: ${file.error || 'bez chyby'}

DETEGOVANÉ ZDROJE:
${formatBibliographicCandidates(file.bibliographicCandidates)}

EXTRAHOVANÝ TEXT:
${textBlock}`);
  }

  const joined = attachmentTexts.join('\n\n-----------------\n\n');

  return {
    extractedFiles,
    attachmentTexts: [limitText(joined, maxAttachmentContextChars)],
    compactSources,
  };
}

// ================= SYSTEM PROMPTS =================

function buildAttachmentBlock(attachmentTexts: string[]) {
  if (!attachmentTexts.length) {
    return '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';
  }

  return `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join(
    '\n\n-----------------\n\n',
  )}\n`;
}

function buildProfileSummary(profile: SavedProfile | null) {
  if (!profile) return 'Profil práce nebol dodaný.';

  const keywords = getKeywords(profile);

  return `
Názov práce: ${profile?.title || 'Neuvedené'}
Téma práce: ${profile?.topic || 'Neuvedené'}
Typ práce: ${profile?.schema?.label || profile?.type || 'Neuvedené'}
Úroveň / odbornosť: ${profile?.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile?.field || 'Neuvedené'}
Vedúci práce: ${profile?.supervisor || 'Neuvedené'}
Citačná norma: ${getCitationStyle(profile)}
Jazyk práce: ${getWorkLanguage(profile)}
Cieľ práce: ${profile?.goal || 'Neuvedené'}
Výskumný problém: ${profile?.problem || 'Neuvedené'}
Metodológia: ${profile?.methodology || 'Neuvedené'}
Výskumné otázky: ${profile?.researchQuestions || 'Neuvedené'}
Praktická / analytická časť: ${profile?.practicalPart || 'Neuvedené'}
Kľúčové slová: ${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}
`.trim();
}

function buildStrictTranslationPrompt() {
  return `
Si profesionálny prekladač.

Toto je špeciálny režim PREKLAD.

PRÍSNE PRAVIDLÁ:
- Tvoja jediná úloha je preložiť text používateľa.
- Vráť iba samotný preložený text.
- Nepíš nadpis.
- Nepíš vysvetlenie.
- Nepíš analýzu.
- Nepíš odporúčania.
- Nepíš zdroje.
- Nepoužívaj Markdown znaky.
`.trim();
}

function buildStrictEmailPrompt() {
  return `
Si profesionálny asistent na písanie emailov.

Toto je špeciálny režim EMAIL.

PRÍSNE PRAVIDLÁ:
- Tvoja jediná úloha je vytvoriť jeden použiteľný email.
- Výstup musí obsahovať iba predmet a text emailu.
- Nepíš zdroje, analýzu, skóre ani odporúčania.
- Email musí byť plynulý, formálny a pripravený na odoslanie.
- Nepoužívaj Markdown znaky.

POVINNÝ FORMÁT:
Predmet:
[vlož predmet emailu]

Text emailu:
[vlož hotový email]
`.trim();
}

function buildStrictPlanningPrompt(profile: SavedProfile | null) {
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, '0')}.${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}.${today.getFullYear()}`;

  return `
Si plánovač akademickej práce.

Toto je špeciálny režim PLÁNOVANIE.

DNEŠNÝ DÁTUM:
${date}

PROFIL PRÁCE:
${buildProfileSummary(profile)}

PRÍSNE PRAVIDLÁ:
- Vytvor realistický harmonogram práce.
- Nevymýšľaj dátum odovzdania.
- Ak používateľ nezadal termín, napíš presne: Termín odovzdania nebol zadaný.
- Nepíš zdroje, analýzu ani skóre.
- Nepoužívaj Markdown znaky.

POVINNÝ FORMÁT:
1. Východisková situácia
2. Termín odovzdania
3. Etapy práce
4. Harmonogram
5. Kontrolné body
6. Riziká omeškania
7. Najbližší konkrétny krok
`.trim();
}

function buildAcademicChapterRules() {
  return `
ŠPECIÁLNY REŽIM PRE AKADEMICKÉ KAPITOLY:

Tieto pravidlá majú najvyššiu prioritu vždy, keď používateľ zadá napríklad:
- Kapitola 1.1
- kapitola 1.1
- 1.1
- uprav kapitolu
- vytvor kapitolu
- zachovaj identickú štruktúru šablóny
- text zo Zedpery nižšie
- šablóna vyššie

POVINNÝ VÝSTUP PRE KAPITOLU:

1. Výstup NESMIE začínať slovom Abstrakt, ak používateľ výslovne nežiadal abstrakt.
2. Nikdy nepíš nadpis typu:
KAPITOLA 1.1: Abstrakt
KAPITOLA 1.1 - Abstrakt
1.1 Abstrakt

3. Nadpis kapitoly musí byť vo forme:
1.1 Odborný názov kapitoly

4. Ak používateľ poskytol šablónu, musíš zachovať jej logiku:
- najprv odborný nadpis kapitoly,
- potom súvislý akademický text v odsekoch,
- priebežné citácie v texte,
- na konci samostatná sekcia Použitý zdroj pre kapitolu X.X,
- pod ňou riadny bibliografický záznam.

5. Hlavný akademický text nesmie obsahovať surové OCR fragmenty, napríklad:
STRANA 1
STRANA 2
Nova Biotechnologica (2004) 245
neúplné OCR vety
rozbité medzery v slovách
duplicitné pasáže z PDF
technické bloky z extrakcie
zoznam samostatných autorov bez bibliografického záznamu

6. Text zo Zedpery, OCR alebo PDF používaj iba ako podklad. Musíš ho preformulovať do čistej akademickej kapitoly.

7. Ak je v podklade jasne identifikovaný hlavný zdroj, uveď na konci iba relevantný zdroj pre danú kapitolu vo forme:
Použitý zdroj pre kapitolu 1.1

Ondrík, P., Mikulíková, D., & Kraic, J. (2004). Závislosť medzi dĺžkovou variabilitou génu B-amy1 a aktivitou β-amylázy jačmeňa. Nova Biotechnologica, 245–253.

8. Ak je k dispozícii viac overiteľných zdrojov, uveď ich až v bibliograficky čistej podobe. Nevypisuj neúplné OCR fragmenty ako samostatné zdroje.

9. Nepoužívaj všeobecné frázy:
Abstrakt dizertačnej práce sa zameriava...
Táto práca sa zaoberá...
V tejto práci sa analyzujú...
ak používateľ žiada konkrétnu kapitolu.

10. Používaj vecný akademický výklad:
- definícia témy,
- odborný kontext,
- mechanizmus,
- význam pre oblasť,
- empirické zistenia zo zdroja,
- metodické súvislosti,
- napojenie na tému práce,
- syntetický záver odseku.

11. Citácie v texte píš priebežne, napríklad:
(Ondrík, Mikulíková, & Kraic, 2004)
alebo
(Ondrík et al., 2004)

12. Ak používateľ chce štruktúru ako vzor hore a text zo Zedpery nižšie, hlavný výstup musí vyzerať ako vzor hore, nie ako surový výstup zo Zedpery.

13. Ak je požiadavka kapitola, v sekcii === VÝSTUP === uveď iba čistú kapitolu v tomto formáte:

1.1 Názov kapitoly

Prvý odborný odsek.

Druhý odborný odsek.

Ďalšie odborné odseky.

Použitý zdroj pre kapitolu 1.1

Bibliografický záznam.

14. V kapitole nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.
`.trim();
}

function buildSystemPrompt({
  profile,
  attachmentTexts,
  settings,
  module,
  isChapterRequest,
  requestedChapterNumber,
}: {
  profile: SavedProfile | null;
  attachmentTexts: string[];
  settings: SourceSettings;
  module: ModuleKey;
  isChapterRequest: boolean;
  requestedChapterNumber: string | null;
}) {
  if (module === 'translation') return buildStrictTranslationPrompt();
  if (module === 'emails') return buildStrictEmailPrompt();
  if (module === 'planning') return buildStrictPlanningPrompt(profile);

  const keywords = getKeywords(profile);

  const structureText =
    profile?.schema?.structure && profile.schema.structure.length > 0
      ? profile.schema.structure.map((item, index) => `${index + 1}. ${item}`).join('\n')
      : 'Neuvedené';

  const requiredSectionsText =
    profile?.schema?.requiredSections && profile.schema.requiredSections.length > 0
      ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
      : 'Neuvedené';

  const attachmentsBlock = buildAttachmentBlock(attachmentTexts);
  const workLanguage = getWorkLanguage(profile);
  const citationStyle = getCitationStyle(profile);
  const hasAttachments = attachmentTexts.length > 0;

  const chapterRules = buildAcademicChapterRules();

  const prompt = `
Si ZEDPERA, profesionálny akademický AI asistent, AI vedúci práce a citačná špecialistka.

AKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY:
${isChapterRequest ? 'Áno' : 'Nie'}
${requestedChapterNumber ? `Požadované číslo kapitoly: ${requestedChapterNumber}` : 'Požadované číslo kapitoly: neurčené'}

${chapterRules}

HLAVNÝ POSTUP:
1. Najprv vychádzaj z uloženého profilu práce.
2. Potom použi extrahovaný text z príloh a dokumentov.
3. Ak existuje extrahovaný text, použi ho pred všeobecnými znalosťami AI.
4. Ak existujú detegované zdroje, autorov a publikácie musíš vypísať v sekcii POUŽITÉ ZDROJE A AUTORI, ale pri kapitole nesmieš miešať surové OCR fragmenty do hlavného textu.
5. Nevymýšľaj zdroje, autorov, DOI, URL, roky, vydavateľov ani čísla strán.
6. Ak údaj chýba, napíš: údaj je potrebné overiť.
7. Semantic Scholar je vypnutý.
8. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

JAZYK ODPOVEDE:
${workLanguage}

CITAČNÁ NORMA:
${citationStyle}

ULOŽENÝ PROFIL PRÁCE:
Názov práce: ${profile?.title || 'Neuvedené'}
Téma práce: ${profile?.topic || 'Neuvedené'}
Typ práce: ${profile?.schema?.label || profile?.type || 'Neuvedené'}
Úroveň / odbornosť: ${profile?.level || 'Neuvedené'}
Odbor / predmet / oblasť: ${profile?.field || 'Neuvedené'}
Vedúci práce: ${profile?.supervisor || 'Neuvedené'}
Citačná norma: ${citationStyle}
Jazyk rozhrania: ${profile?.language || 'Neuvedené'}
Jazyk práce: ${workLanguage}
Odporúčaný rozsah: ${profile?.schema?.recommendedLength || 'Neuvedené'}

Anotácia:
${profile?.annotation || 'Neuvedené'}

Cieľ práce:
${profile?.goal || 'Neuvedené'}

Výskumný problém:
${profile?.problem || 'Neuvedené'}

Metodológia:
${profile?.methodology || 'Neuvedené'}

Hypotézy:
${profile?.hypotheses || 'Neuvedené'}

Výskumné otázky:
${profile?.researchQuestions || 'Neuvedené'}

Praktická / analytická časť:
${profile?.practicalPart || 'Neuvedené'}

Vedecký / odborný prínos:
${profile?.scientificContribution || 'Neuvedené'}

Firemný / manažérsky problém:
${profile?.businessProblem || 'Neuvedené'}

Manažérsky cieľ:
${profile?.businessGoal || 'Neuvedené'}

Implementácia:
${profile?.implementation || 'Neuvedené'}

Prípadová štúdia:
${profile?.caseStudy || 'Neuvedené'}

Reflexia:
${profile?.reflection || 'Neuvedené'}

Požiadavky na zdroje:
${profile?.sourcesRequirement || 'Neuvedené'}

Kľúčové slová:
${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}

Štruktúra práce:
${structureText}

Povinné časti:
${requiredSectionsText}

Špecifická inštrukcia typu práce:
${profile?.schema?.aiInstruction || 'Neuvedené'}

INFORMÁCIA O PRÍLOHÁCH:
Počet dostupných prílohových blokov: ${attachmentTexts.length}
Sú priložené dokumenty: ${hasAttachments ? 'Áno' : 'Nie'}

${attachmentsBlock}

PRAVIDLÁ PRE ZDROJE:
1. Ak boli v extrahovanom texte nájdené zdroje, nesmieš napísať, že zdroje neboli dodané.
2. Pri bežnej odpovedi v sekcii POUŽITÉ ZDROJE A AUTORI vypíš:
A. Detegované zdroje z extrahovaného textu
B. Autori nájdení v dokumentoch
C. Formátované bibliografické záznamy
D. Priložené dokumenty použité ako podklad
E. Upozornenia k nerelevantným alebo neoveriteľným prílohám
F. Zdroje, ktoré treba overiť alebo doplniť
3. Pri kapitole v hlavnom výstupe uveď iba čistú sekciu Použitý zdroj pre kapitolu ${requestedChapterNumber || 'X.X'} a bibliografický záznam relevantného zdroja.
4. Ak boli nájdené iba mená autorov bez úplných publikácií, vypíš ich mimo hlavnej kapitoly a uveď, že bibliografický záznam treba doplniť.
5. Ak boli nájdené DOI alebo URL, vypíš ich presne.
6. Ak je príloha nesúvisiaca s profilom práce, nepoužívaj ju ako odborný zdroj.
7. Ak neboli dodané overiteľné zdroje, uveď: Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.

NASTAVENIA:
Kontrola príloh podľa profilu práce: ${settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'}
Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}
Povolené všeobecné znalosti AI: ${settings.allowAiKnowledgeFallback ? 'áno' : 'nie'}
Zdrojový režim: ${settings.sourceMode}

FORMÁT ODPOVEDE:
Použi presne tieto sekcie. Nepoužívaj Markdown znaky.

Ak je aktívny špeciálny režim kapitoly, potom v sekcii === VÝSTUP === musí byť čistá akademická kapitola podľa šablóny. Nesmie začínať slovom Abstrakt a nesmie obsahovať surový OCR text.

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text.

=== ANALÝZA ===
Stručne vysvetli:
- z ktorých údajov profilu si čerpal,
- či boli priložené dokumenty,
- či boli prílohy komprimované,
- či boli gzip prílohy rozbalené,
- či bol text príloh extrahovaný,
- či boli automaticky detegované zdroje, autori a publikácie,
- či priložené dokumenty tematicky zodpovedajú profilu práce,
- či bol text vytvorený aj zo všeobecných znalostí AI modelu.

=== SKÓRE ===
Napíš iba číslo od 0 do 100 a krátke slovné hodnotenie.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania v čistom texte bez Markdown symbolov.

=== POUŽITÉ ZDROJE A AUTORI ===
A. Detegované zdroje z extrahovaného textu
B. Autori nájdení v dokumentoch
C. Formátované bibliografické záznamy
D. Priložené dokumenty použité ako podklad
E. Upozornenia k nerelevantným alebo neoveriteľným prílohám
F. Zdroje, ktoré treba overiť alebo doplniť
`;

  return limitText(prompt, maxSystemPromptChars);
}

// ================= OUTPUT CLEANING =================

function removeAfterForbiddenHeading(text: string, headings: string[]) {
  let output = normalizeText(text);

  for (const heading of headings) {
    const regex = new RegExp(
      `\\n\\s*(?:={2,}\\s*)?(?:\\d+\\.\\s*)?(?:[-–—•]\\s*)?${heading}\\s*:?\\s*(?:={2,})?\\s*\\n`,
      'i',
    );

    const match = output.match(regex);

    if (match && typeof match.index === 'number') {
      output = output.slice(0, match.index).trim();
    }
  }

  return output.trim();
}

function cleanAcademicChapterOutput(text: string) {
  let output = normalizeText(text);

  output = output.replace(
    /^KAPITOLA\s+(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i,
    '$1 Odborná kapitola\n\n',
  );

  output = output.replace(
    /^(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i,
    '$1 Odborná kapitola\n\n',
  );

  output = output.replace(
    /^Abstrakt\s+dizertačnej\s+práce\s+sa\s+zameriava/gi,
    'Táto kapitola sa zameriava',
  );

  output = output.replace(/\n\s*STRANA\s+\d+\s+/gi, '\n');
  output = output.replace(/\n\s*PAGE\s+\d+\s+/gi, '\n');

  return normalizeText(output);
}

function cleanStrictOutput(text: string, module: ModuleKey) {
  let output = normalizeText(text)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .trim();

  if (module === 'translation') {
    output = output
      .replace(/^výstup\s*:\s*/i, '')
      .replace(/^preklad\s*:\s*/i, '')
      .replace(/^preložený text\s*:\s*/i, '')
      .replace(/^tu je preklad\s*:\s*/i, '')
      .trim();

    output = removeAfterForbiddenHeading(output, [
      'analýza',
      'skóre',
      'odporúčania',
      'odporúčanie',
      'použité zdroje',
      'zdroje',
      'seo',
      'poznámka',
      'komentár',
      'vysvetlenie',
    ]);
  }

  if (module === 'emails') {
    output = removeAfterForbiddenHeading(output, [
      'analýza',
      'skóre',
      'odporúčania',
      'odporúčanie',
      'použité zdroje',
      'zdroje',
      'seo',
      'poznámka',
      'komentár',
      'vysvetlenie',
      'záver',
    ]);

    const subjectIndex = output.toLowerCase().indexOf('predmet:');

    if (subjectIndex > 0) {
      output = output.slice(subjectIndex).trim();
    }
  }

  if (module === 'planning') {
    output = removeAfterForbiddenHeading(output, [
      'analýza',
      'skóre',
      'použité zdroje',
      'zdroje',
      'seo',
      'bibliografia',
      'literatúra',
    ]);
  }

  return output.trim();
}

// ================= AI MODEL ROUTER =================

function getModelByAgent(agent: Agent): ModelResult {
  if (agent === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Chýba OPENAI_API_KEY pre GPT.');
    }

    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT',
    };
  }

  if (agent === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Chýba ANTHROPIC_API_KEY pre Claude.');
    }

    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude',
    };
  }

  if (agent === 'gemini') {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Chýba GOOGLE_GENERATIVE_AI_API_KEY pre Gemini.');
    }

    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini',
    };
  }

  if (agent === 'grok') {
    if (!process.env.XAI_API_KEY) {
      throw new Error('Chýba XAI_API_KEY pre Grok.');
    }

    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok',
    };
  }

  if (agent === 'mistral') {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('Chýba MISTRAL_API_KEY pre Mistral.');
    }

    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral',
    };
  }

  throw new Error(`Neznámy AI agent: ${agent}`);
}

function getFallbackModel(): ModelResult {
  if (process.env.OPENAI_API_KEY) {
    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT fallback',
    };
  }

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any,
      providerLabel: 'Gemini fallback',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any,
      providerLabel: 'Claude fallback',
    };
  }

  if (process.env.MISTRAL_API_KEY) {
    return {
      model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any,
      providerLabel: 'Mistral fallback',
    };
  }

  if (process.env.XAI_API_KEY) {
    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok fallback',
    };
  }

  throw new Error('Nie je nastavený žiadny AI provider. Doplň aspoň jeden API kľúč.');
}

function isModelNotFoundError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('404') ||
      message.includes('not supported') ||
      message.includes('invalid model'))
  );
}

function isContextWindowError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    message.includes('context window') ||
    message.includes('maximum context') ||
    message.includes('input exceeds') ||
    message.includes('too many tokens') ||
    message.includes('token limit') ||
    message.includes('prompt is too long')
  );
}

async function createStreamResponse({
  model,
  systemPrompt,
  normalizedMessages,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
}) {
  const result = streamText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.2,
    maxOutputTokens: 3500,
  });

  return result.toTextStreamResponse();
}

async function createJsonResponse({
  model,
  systemPrompt,
  normalizedMessages,
  extractedFiles,
  providerLabel,
  module,
  isChapterRequest,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  extractedFiles: ExtractedAttachment[];
  providerLabel: string;
  module: ModuleKey;
  isChapterRequest: boolean;
}) {
  const result = await generateText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.2,
    maxOutputTokens: 3500,
  });

  const rawOutput = result.text || '';
  let output = isStrictNoAcademicTailModule(module)
    ? cleanStrictOutput(rawOutput, module)
    : rawOutput;

  if (isChapterRequest) {
    output = cleanAcademicChapterOutput(output);
  }

  return NextResponse.json({
    ok: true,
    provider: providerLabel,
    output,
    extractedFiles: extractedFiles.map((file) => ({
      name: file.name,
      originalName: file.originalName,
      preparedName: file.preparedName,
      type: file.type,
      size: file.size,
      compressedSize: file.compressedSize,
      decompressedSize: file.decompressedSize,
      extension: file.extension,
      effectiveExtension: file.effectiveExtension,
      label: file.label,
      isGzip: file.isGzip,
      wasDecompressed: file.wasDecompressed,
      compressionWithinLimit: file.compressionWithinLimit,
      compressionStatus: file.compressionStatus,
      extractedChars: file.extractedChars,
      extractedPreview: file.extractedPreview,
      status: file.status,
      error: file.error || null,
      warning: file.warning || null,
      bibliographicCandidates: file.bibliographicCandidates,
      detectedAuthors: file.detectedAuthors,
      formattedSources: file.formattedSources,
    })),
  });
}

// ================= API ROUTE =================

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let rawAgent: unknown = 'gemini';
    let module: ModuleKey = 'unknown';
    let messages: ChatMessage[] = [];
    let profile: SavedProfile | null = null;
    let files: File[] = [];
    let projectId: string | null = null;

    let sourceMode: SourceMode = 'uploaded_documents_first';
    let validateAttachmentsAgainstProfile = true;
    let requireSourceList = true;
    let allowAiKnowledgeFallback = true;
    let returnExtractedFilesInfo = false;

    let clientExtractedText = '';
    let preparedFilesSummary = '';
    let clientDetectedSourcesSummary = '';
    let clientDetectedSources: BibliographicCandidate[] = [];
    let preparedFilesMetadata: PreparedFileMetadata[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      rawAgent = formData.get('agent')?.toString() || 'gemini';
      module = normalizeModule(formData.get('module')?.toString());
      messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
      profile = parseJson<SavedProfile | null>(formData.get('profile'), null);
      projectId = formData.get('projectId')?.toString() || null;

      sourceMode = normalizeSourceMode(formData.get('sourceMode')?.toString());

      validateAttachmentsAgainstProfile = asBoolean(
        formData.get('validateAttachmentsAgainstProfile'),
        true,
      );

      requireSourceList = asBoolean(formData.get('requireSourceList'), true);

      allowAiKnowledgeFallback = asBoolean(
        formData.get('allowAiKnowledgeFallback'),
        true,
      );

      returnExtractedFilesInfo = asBoolean(
        formData.get('returnExtractedFilesInfo'),
        false,
      );

      clientExtractedText = toCleanString(formData.get('clientExtractedText'));
      preparedFilesSummary = toCleanString(formData.get('preparedFilesSummary'));

      clientDetectedSourcesSummary = toCleanString(
        formData.get('clientDetectedSourcesSummary'),
      );

      clientDetectedSources = normalizeBibliographicCandidates(
        parseJson<BibliographicCandidate[]>(formData.get('clientDetectedSources'), []),
      );

      preparedFilesMetadata = parseJson<PreparedFileMetadata[]>(
        formData.get('preparedFilesMetadata'),
        [],
      );

      files = formData
        .getAll('files')
        .filter((item): item is File => item instanceof File);
    } else {
      const body = await req.json().catch(() => null);

      rawAgent = body?.agent || 'gemini';
      module = normalizeModule(body?.module);
      messages = Array.isArray(body?.messages) ? body.messages : [];
      profile = body?.profile || body?.activeProfile || body?.savedProfile || null;
      projectId = body?.projectId || null;

      sourceMode = normalizeSourceMode(body?.sourceMode);

      validateAttachmentsAgainstProfile =
        body?.validateAttachmentsAgainstProfile !== false;

      requireSourceList = body?.requireSourceList !== false;
      allowAiKnowledgeFallback = body?.allowAiKnowledgeFallback !== false;
      returnExtractedFilesInfo = body?.returnExtractedFilesInfo === true;

      clientExtractedText = toCleanString(body?.clientExtractedText);
      preparedFilesSummary = toCleanString(body?.preparedFilesSummary);
      clientDetectedSourcesSummary = toCleanString(body?.clientDetectedSourcesSummary);

      clientDetectedSources = normalizeBibliographicCandidates(
        Array.isArray(body?.clientDetectedSources) ? body.clientDetectedSources : [],
      );

      preparedFilesMetadata = Array.isArray(body?.preparedFilesMetadata)
        ? body.preparedFilesMetadata
        : [];

      files = [];
    }

    if (!isAllowedAgent(rawAgent)) {
      return new Response(`Neznámy AI agent: ${String(rawAgent)}`, {
        status: 400,
      });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (normalizedMessages.length === 0) {
      return new Response('Chýbajú správy pre AI.', {
        status: 400,
      });
    }

    const lastUserMessage = getLastUserMessage(normalizedMessages);
    const isChapterRequest = isAcademicChapterRequest(normalizedMessages);
    const requestedChapterNumber = detectChapterNumberFromText(lastUserMessage);

    const {
      extractedFiles,
      attachmentTexts: uploadedAttachmentTexts,
    } = await extractAttachmentTexts({
      files,
      preparedFilesMetadata,
      clientExtractedText,
      preparedFilesSummary,
      clientDetectedSourcesSummary,
      clientDetectedSources,
    });

    console.log(
      'EXTRACTED_FILES_DEBUG:',
      extractedFiles.map((file) => ({
        name: file.name,
        originalName: file.originalName,
        preparedName: file.preparedName,
        extension: file.extension,
        effectiveExtension: file.effectiveExtension,
        isGzip: file.isGzip,
        wasDecompressed: file.wasDecompressed,
        compressedSize: file.compressedSize,
        decompressedSize: file.decompressedSize,
        compressionWithinLimit: file.compressionWithinLimit,
        compressionStatus: file.compressionStatus,
        chars: file.extractedChars,
        bibliographicCandidates: file.bibliographicCandidates.length,
        authors: file.detectedAuthors.length,
        status: file.status,
        error: file.error,
        warning: file.warning,
        preview: file.extractedPreview.slice(0, 200),
      })),
    );

    const projectDocuments = isStrictNoAcademicTailModule(module)
      ? []
      : await loadProjectDocuments(projectId);

    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const documentType = doc.file_type || doc.type || 'neuvedené';
      const extractedText = normalizeText(doc.extracted_text || '');
      const bibliographicCandidates = extractBibliographicCandidates(extractedText);

      return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${documentType}
Veľkosť: ${doc.file_size || 0} bajtov
Stav extrakcie: ${
        extractedText
          ? 'Dokument má uložený extrahovaný text.'
          : 'Dokument nemá uložený extrahovaný text.'
      }
Počet extrahovaných znakov: ${extractedText.length}
Počet detegovaných bibliografických kandidátov: ${bibliographicCandidates.length}

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(bibliographicCandidates)}

EXTRAHOVANÝ TEXT:
${extractedText ? limitMiddle(extractedText, maxProjectDocumentChars) : '[Dokument nemá uložený extrahovaný text]'}`;
    });

    const attachmentTexts = isStrictNoAcademicTailModule(module)
      ? uploadedAttachmentTexts
      : [...uploadedAttachmentTexts, ...projectDocumentTexts];

    const settings: SourceSettings = {
      sourceMode,
      validateAttachmentsAgainstProfile,
      requireSourceList: isStrictNoAcademicTailModule(module)
        ? false
        : requireSourceList,
      allowAiKnowledgeFallback:
        module === 'translation' ? false : allowAiKnowledgeFallback,
    };

    const systemPrompt = buildSystemPrompt({
      profile,
      attachmentTexts,
      settings,
      module,
      isChapterRequest,
      requestedChapterNumber,
    });

    try {
      const primary = getModelByAgent(agent);

      if (returnExtractedFilesInfo) {
        return await createJsonResponse({
          model: primary.model,
          systemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: primary.providerLabel,
          module,
          isChapterRequest,
        });
      }

      return await createStreamResponse({
        model: primary.model,
        systemPrompt,
        normalizedMessages,
      });
    } catch (primaryError) {
      console.error('PRIMARY_MODEL_ERROR:', primaryError);

      if (isContextWindowError(primaryError)) {
        return new Response(
          `API error 413: Vstup je stále príliš veľký pre kontextové okno modelu. Skrátil som text v /api/chat, ale treba ešte zmenšiť vstup vo frontende: neposielaj EXTRAHOVANÝ TEXT Z PRÍLOH aj v messages aj v clientExtractedText. Stačí posielať clientExtractedText a v messages iba krátku požiadavku používateľa.`,
          { status: 413 },
        );
      }

      if (!isModelNotFoundError(primaryError)) {
        throw primaryError;
      }

      const fallback = getFallbackModel();

      const fallbackSystemPrompt = isStrictNoAcademicTailModule(module)
        ? systemPrompt
        : limitText(
            `${systemPrompt}

TECHNICKÁ POZNÁMKA:
Vybraný model nebol dostupný alebo bol odmietnutý poskytovateľom.
Odpovedáš cez náhradný model: ${fallback.providerLabel}.

Aj pri náhradnom modeli musíš dodržať sekciu:
=== POUŽITÉ ZDROJE A AUTORI ===

Ak bol text z príloh extrahovaný, použi ho ako prvý zdrojový podklad.
Ak je dostupný blok DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE, vypíš autorov, publikácie, roky, DOI a URL.
Semantic Scholar je vypnutý.

Ak používateľ žiada kapitolu, dodrž špeciálny režim kapitoly:
- nezačni slovom Abstrakt,
- nepíš KAPITOLA X.X: Abstrakt,
- v sekcii === VÝSTUP === vytvor čistú akademickú kapitolu,
- OCR text použi iba ako podklad,
- na konci hlavnej kapitoly uveď Použitý zdroj pre kapitolu ${requestedChapterNumber || 'X.X'}.
`,
            maxSystemPromptChars,
          );

      if (returnExtractedFilesInfo) {
        return await createJsonResponse({
          model: fallback.model,
          systemPrompt: fallbackSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: fallback.providerLabel,
          module,
          isChapterRequest,
        });
      }

      return await createStreamResponse({
        model: fallback.model,
        systemPrompt: fallbackSystemPrompt,
        normalizedMessages,
      });
    }
  } catch (error) {
    console.error('CHAT_API_ERROR:', error);

    const message =
      error instanceof Error ? error.message : 'Neznáma chyba servera v /api/chat';

    return new Response(`API error 500: ${message}`, {
      status: 500,
    });
  }
}