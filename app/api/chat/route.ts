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

type InTextCitation = {
  raw: string;
  authorText: string;
  authors: string[];
  year: string;
  key: string;
  count: number;
};

type SavedProfile = {
  id?: string;
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
  inTextCitations?: InTextCitation[];
  inTextCitationsCount?: number;
  detectedAuthors?: string[];
  formattedSources?: string;
  warning?: string;
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
  inTextCitations: InTextCitation[];
  detectedAuthors: string[];
  formattedSources: string;
};

type SlovakApiError = {
  code: string;
  message: string;
  detail: string;
  rawMessage?: string;
};

type ProfileRelevanceResult = {
  hasAttachmentContent: boolean;
  isRelevant: boolean;
  matchedTokens: string[];
  profileTokens: string[];
  attachmentTokens: string[];
  relevanceRatio: number;
};

// ================= LIMITS =================

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;
const maxExtractedCharsPerAttachment = 18_000;
const maxClientExtractedChars = 45_000;
const maxProjectDocumentChars = 18_000;
const maxAttachmentContextChars = 80_000;
const maxSystemPromptChars = 110_000;
const maxSingleMessageChars = 10_000;
const maxTotalMessagesChars = 30_000;
const maxDetectedSourcesPerAttachment = 80;
const defaultOutputTokens = 5000;
const streamOutputTokens = 7000;
const chapterOutputTokens = 9000;

const unrelatedProfileMessage =
  'Príloha obsahovo nesúvisí s profilom práce, preto ju nie je možné odborne zapracovať do tejto kapitoly bez rizika vecne nesprávneho obsahu.';

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
    .replace(/[ŢȚ]/g, 'Ž')
    .replace(/[ţț]/g, 'ž')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function normalizeForSemanticMatch(value: string): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9áäčďéíĺľňóôŕšťúýž\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limitText(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API. Ak odpoveď nebude úplná, použi väčší model s väčším kontextovým oknom, napríklad GPT-4.1, Gemini 2.5 Pro alebo Claude Sonnet s väčším limitom.]`;
}

function limitMiddle(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);

  if (cleaned.length <= maxLength) return cleaned;

  const half = Math.floor(maxLength / 2);

  return `${cleaned.slice(0, half)}

[STRED TEXTU BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API. Ak treba spracovať celý dokument bez skrátenia, použi model s väčším kontextovým oknom alebo rozdeľ dokument na menšie časti.]

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

function normalizeAuthorName(value: string) {
  return normalizeText(value)
    .replace(/\bet al\.?/gi, 'et al.')
    .replace(/\ba kol\.?/gi, 'a kol.')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCitationKeyPart(value: string) {
  return normalizeText(value)
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

function extractAuthorsFromCitationAuthorText(authorText: string) {
  const cleaned = normalizeAuthorName(authorText)
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .trim();

  return uniqueArray(
    cleaned
      .split(/\s*(?:,|;|&|\ba\b|\band\b)\s*/i)
      .map((part) => normalizeAuthorName(part))
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

function getSourceCitationKey(source: BibliographicCandidate) {
  if (source.citationKey) return source.citationKey;
  if (!source.authors?.length || !source.year) return '';
  return buildCitationKey(source.authors, source.year);
}

function extractInTextCitations(text: string): InTextCitation[] {
  const cleaned = normalizeText(text);
  const found = new Map<string, InTextCitation>();

  const addCitation = (rawValue: string) => {
    const raw = normalizeText(rawValue)
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

      const authorText = normalizeText(match[1] || '')
        .replace(/^\s*(pozri|viď|cf\.|see)\s+/i, '')
        .trim();

      const year = String(match[2] || '').trim();
      if (!authorText || !year) continue;
      if (/^(vol|no|p|s|str|tab|obr|ročník|číslo)$/i.test(authorText)) continue;
      if (authorText.length > 140) continue;

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
    const authorText = normalizeText(match[1] || '');
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
    output =
      'Spracuj požiadavku používateľa podľa kompletného profilu práce a extrahovaných podkladov.';
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

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;

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
  return fileName.toLowerCase().endsWith('.gz') ? fileName.slice(0, -3) : fileName;
}

function getEffectiveFileName(fileName: string) {
  return removeGzipSuffix(fileName);
}

function getEffectiveExtension(fileName: string) {
  return getFileExtension(getEffectiveFileName(fileName));
}

function isLikelyChapterRequestText(text: string) {
  const normalized = normalizeForSemanticMatch(text);

  return (
    /\bkapitola\s+\d+(?:\.\d+)*\b/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)*\s*[\.:]\s*[a-z]/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)+\s*$/i.test(normalized) ||
    normalized.includes('sablona') ||
    normalized.includes('rovnaky zdroj') ||
    normalized.includes('musi to byt v takomto tvare') ||
    normalized.includes('identicka struktura') ||
    normalized.includes('text zo zedpery') ||
    normalized.includes('uprav kapitolu') ||
    normalized.includes('vytvor kapitolu') ||
    normalized.includes('spracuj kapitolu') ||
    normalized.includes('napis kapitolu') ||
    normalized.includes('kapitolu') ||
    normalized.includes('kapitola') ||
    normalized.includes('uvod')
  );
}

function detectChapterNumberFromText(text: string) {
  const normalized = normalizeText(text);
  const match =
    normalized.match(/\bkapitola\s+(\d+(?:\.\d+)*)\b/i) ||
    normalized.match(/^\s*(\d+(?:\.\d+)*)\s*[\.:]\s*[a-záäčďéíĺľňóôŕšťúýž]/i) ||
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

function userWantsSourcesOnly(messages: ChatMessage[]) {
  const normalized = normalizeForSemanticMatch(getLastUserMessage(messages));

  const wantsSources =
    normalized.includes('zdroje') ||
    normalized.includes('literatura') ||
    normalized.includes('bibliografia') ||
    normalized.includes('autori') ||
    normalized.includes('citacie') ||
    normalized.includes('primarne zdroje') ||
    normalized.includes('sekundarne zdroje') ||
    normalized.includes('vypis zdroje') ||
    normalized.includes('spracuj zdroje') ||
    normalized.includes('pouzite zdroje');

  const wantsText =
    normalized.includes('napis kapitolu') ||
    normalized.includes('vytvor kapitolu') ||
    normalized.includes('uprav kapitolu') ||
    normalized.includes('napis uvod') ||
    normalized.includes('napis abstrakt') ||
    normalized.includes('vytvor text') ||
    normalized.includes('odborny text') ||
    normalized.includes('akademicky text');

  return wantsSources && !wantsText;
}

// ================= PROFILE RELEVANCE =================

const semanticStopWords = new Set([
  'a',
  'aj',
  'ako',
  'ale',
  'alebo',
  'ani',
  'bez',
  'bude',
  'budu',
  'by',
  'bol',
  'bola',
  'bolo',
  'boli',
  'cez',
  'co',
  'do',
  'ho',
  'ich',
  'je',
  'jej',
  'jemu',
  'ju',
  'k',
  'ku',
  'ma',
  'mi',
  'na',
  'nad',
  'nie',
  'od',
  'pre',
  'pri',
  's',
  'sa',
  'si',
  'som',
  'su',
  'ta',
  'tak',
  'to',
  'tu',
  'uz',
  'v',
  'vo',
  'z',
  'za',
  'ze',
  'the',
  'and',
  'or',
  'of',
  'in',
  'on',
  'for',
  'with',
  'to',
  'from',
  'by',
  'is',
  'are',
  'was',
  'were',
  'this',
  'that',
  'these',
  'those',
  'work',
  'study',
  'paper',
  'chapter',
  'source',
  'sources',
  'profile',
  'text',
  'document',
]);

function getMeaningfulTokens(value: string) {
  const normalized = normalizeForSemanticMatch(value);

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !semanticStopWords.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function buildProfileRelevanceText(profile: SavedProfile | null) {
  if (!profile) return '';

  const keywords = getKeywords(profile);

  return normalizeText(
    [
      profile.title,
      profile.topic,
      profile.type,
      profile.level,
      profile.field,
      profile.supervisor,
      profile.citation,
      profile.language,
      profile.workLanguage,
      profile.annotation,
      profile.goal,
      profile.problem,
      profile.methodology,
      profile.hypotheses,
      profile.researchQuestions,
      profile.practicalPart,
      profile.scientificContribution,
      profile.businessProblem,
      profile.businessGoal,
      profile.implementation,
      profile.caseStudy,
      profile.reflection,
      profile.sourcesRequirement,
      keywords.join(' '),
      profile.schema?.label,
      profile.schema?.description,
      profile.schema?.recommendedLength,
      profile.schema?.structure?.join(' '),
      profile.schema?.requiredSections?.join(' '),
      profile.schema?.aiInstruction,
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function buildAttachmentRelevanceText({
  attachmentTexts,
  extractedFiles,
  detectedSourcesForOutput,
}: {
  attachmentTexts: string[];
  extractedFiles: ExtractedAttachment[];
  detectedSourcesForOutput: BibliographicCandidate[];
}) {
  return normalizeText(
    [
      attachmentTexts.join('\n'),
      extractedFiles
        .map((file) =>
          [
            file.originalName,
            file.preparedName,
            file.label,
            file.extractedText,
            file.extractedPreview,
            file.detectedAuthors.join(' '),
            file.bibliographicCandidates
              .map((source) =>
                [
                  source.raw,
                  source.title,
                  source.authors.join(' '),
                  source.year,
                  source.doi,
                  source.url,
                ]
                  .filter(Boolean)
                  .join(' '),
              )
              .join('\n'),
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
      detectedSourcesForOutput
        .map((source) =>
          [source.raw, source.title, source.authors.join(' '), source.year, source.doi, source.url]
            .filter(Boolean)
            .join(' '),
        )
        .join('\n'),
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function detectAttachmentProfileRelevance({
  profile,
  attachmentTexts,
  extractedFiles,
  detectedSourcesForOutput,
}: {
  profile: SavedProfile | null;
  attachmentTexts: string[];
  extractedFiles: ExtractedAttachment[];
  detectedSourcesForOutput: BibliographicCandidate[];
}): ProfileRelevanceResult {
  const hasAttachmentContent =
    attachmentTexts.some((item) => item.trim().length > 100) ||
    extractedFiles.some(
      (file) =>
        file.extractedText.trim().length > 100 || file.bibliographicCandidates.length > 0,
    ) ||
    detectedSourcesForOutput.length > 0;

  if (!hasAttachmentContent) {
    return {
      hasAttachmentContent,
      isRelevant: true,
      matchedTokens: [],
      profileTokens: [],
      attachmentTokens: [],
      relevanceRatio: 0,
    };
  }

  const profileText = buildProfileRelevanceText(profile);
  const attachmentText = buildAttachmentRelevanceText({
    attachmentTexts,
    extractedFiles,
    detectedSourcesForOutput,
  });

  const profileTokens = uniqueArray(getMeaningfulTokens(profileText));
  const attachmentTokens = uniqueArray(getMeaningfulTokens(attachmentText));
  const attachmentTokenSet = new Set(attachmentTokens);

  if (profileTokens.length === 0) {
    return {
      hasAttachmentContent,
      isRelevant: true,
      matchedTokens: [],
      profileTokens,
      attachmentTokens,
      relevanceRatio: 0,
    };
  }

  const matchedTokens = profileTokens.filter((token) => attachmentTokenSet.has(token));

  const importantProfileFields = [
    profile?.title,
    profile?.topic,
    profile?.field,
    profile?.goal,
    profile?.problem,
    profile?.methodology,
    profile?.researchQuestions,
    profile?.practicalPart,
    profile?.scientificContribution,
    profile?.businessProblem,
    profile?.businessGoal,
    profile?.implementation,
    profile?.caseStudy,
    ...(Array.isArray(profile?.keywordsList) ? profile.keywordsList : []),
    ...(Array.isArray(profile?.keywords) ? profile.keywords : []),
  ]
    .filter(Boolean)
    .join(' ');

  const importantTokens = uniqueArray(getMeaningfulTokens(importantProfileFields));
  const importantMatches = importantTokens.filter((token) => attachmentTokenSet.has(token));

  const relevanceRatio = matchedTokens.length / Math.max(profileTokens.length, 1);
  const importantRatio = importantMatches.length / Math.max(importantTokens.length, 1);

  const isRelevant =
    importantMatches.length >= 2 ||
    matchedTokens.length >= 5 ||
    relevanceRatio >= 0.08 ||
    importantRatio >= 0.12;

  return {
    hasAttachmentContent,
    isRelevant,
    matchedTokens,
    profileTokens,
    attachmentTokens,
    relevanceRatio,
  };
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
    line.match(/\((18|19|20)\d{2}[a-z]?\)/i) ||
    line.match(/\b(18|19|20)\d{2}[a-z]?\b/i) ||
    line.match(/\bn\.d\.\b/i);

  return match?.[0]?.replace(/[()]/g, '') || null;
}

function extractAuthors(line: string) {
  const beforeYear =
    line.split(/\((18|19|20)\d{2}[a-z]?\)|\b(18|19|20)\d{2}[a-z]?\b/i)[0] || '';

  const cleaned = beforeYear
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
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
        ) || /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]+,\s*[A-Z]/.test(part)
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
  const trimmed = line.trim();

  if (trimmed.length < 20) return false;
  if (trimmed.length > 1600) return false;

  const hasYear = /\b(18|19|20)\d{2}[a-z]?\b|\bn\.d\.\b/i.test(trimmed);
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

    const authors = extractAuthors(line);
    const year = extractYear(line);

    candidates.push({
      raw: line.slice(0, 1000),
      authors,
      year,
      title: extractTitle(line),
      doi: extractDoi(line),
      url: extractUrl(line),
      sourceType: detectSourceType(line),
      citationKey: authors.length && year ? buildCitationKey(authors, year) : undefined,
    });
  }

  const unique = new Map<string, BibliographicCandidate>();

  for (const item of candidates) {
    const key = `${normalizeForSemanticMatch(item.raw).slice(0, 220)}-${
      item.doi || ''
    }-${item.url || ''}`;

    if (!unique.has(key)) unique.set(key, item);
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function normalizeBibliographicCandidates(value: unknown): BibliographicCandidate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => {
      const authors = Array.isArray(item?.authors)
        ? item.authors
            .map((author: unknown) => String(author || '').trim())
            .filter(Boolean)
        : typeof item?.authors === 'string'
          ? item.authors
              .split(/,|;|\n/)
              .map((author: string) => author.trim())
              .filter(Boolean)
          : [];

      const year = item?.year ? String(item.year) : null;

      return {
        raw: String(item?.raw || item?.citation || item?.text || '').trim(),
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
        citationKey:
          item?.citationKey || (authors.length && year ? buildCitationKey(authors, year) : undefined),
        inTextCitations: Array.isArray(item?.inTextCitations) ? item.inTextCitations : [],
        occurrenceCount: typeof item?.occurrenceCount === 'number' ? item.occurrenceCount : 0,
        matchedFromText: Boolean(item?.matchedFromText),
      } satisfies BibliographicCandidate;
    })
    .filter(
      (item) => item.raw || item.authors.length || item.title || item.doi || item.url,
    );
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy.';
  }

  return candidates
    .slice(0, maxDetectedSourcesPerAttachment)
    .map((item, index) => {
      const citationInfo = item.inTextCitations?.length
        ? `\nCitácie v texte: ${item.inTextCitations
            .map((citation) => citation.raw)
            .join('; ')}\nPočet výskytov v texte: ${
            item.occurrenceCount || item.inTextCitations.length
          }`
        : '';

      return `${index + 1}. Pôvodný záznam:
${item.raw || 'neuvedené'}

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

function mergeBibliographicCandidates(
  ...groups: Array<BibliographicCandidate[] | undefined | null>
) {
  const unique = new Map<string, BibliographicCandidate>();

  for (const group of groups) {
    for (const item of group || []) {
      const authors = Array.isArray(item.authors) ? item.authors : [];
      const year = item.year || null;

      const normalizedItem: BibliographicCandidate = {
        raw: String(item.raw || '').trim(),
        authors,
        year,
        title: item.title || null,
        doi: item.doi || null,
        url: item.url || null,
        sourceType: item.sourceType || 'unknown',
        citationKey: item.citationKey || (authors.length && year ? buildCitationKey(authors, year) : undefined),
        inTextCitations: Array.isArray(item.inTextCitations) ? item.inTextCitations : [],
        occurrenceCount: item.occurrenceCount || 0,
        matchedFromText: Boolean(item.matchedFromText),
      };

      const key =
        getSourceCitationKey(normalizedItem) ||
        `${normalizeForSemanticMatch(normalizedItem.raw).slice(0, 220)}-${
          normalizedItem.doi || ''
        }-${normalizedItem.url || ''}-${normalizeForSemanticMatch(
          normalizedItem.title || '',
        ).slice(0, 120)}`;

      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, normalizedItem);
        continue;
      }

      unique.set(key, {
        ...existing,
        raw:
          existing.raw.length >= normalizedItem.raw.length
            ? existing.raw
            : normalizedItem.raw,
        authors: uniqueArray([...existing.authors, ...normalizedItem.authors]),
        year: existing.year || normalizedItem.year,
        title:
          existing.title && existing.title !== 'údaj je potrebné overiť'
            ? existing.title
            : normalizedItem.title,
        doi: existing.doi || normalizedItem.doi,
        url: existing.url || normalizedItem.url,
        sourceType:
          existing.sourceType !== 'unknown' ? existing.sourceType : normalizedItem.sourceType,
        citationKey: existing.citationKey || normalizedItem.citationKey,
        inTextCitations: [
          ...(existing.inTextCitations || []),
          ...(normalizedItem.inTextCitations || []),
        ],
        occurrenceCount: (existing.occurrenceCount || 0) + (normalizedItem.occurrenceCount || 0),
        matchedFromText: existing.matchedFromText || normalizedItem.matchedFromText,
      });
    }
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function extractAuthorsFromCandidates(candidates: BibliographicCandidate[]) {
  return uniqueArray(candidates.flatMap((item) => item.authors || []));
}

function buildLiteratureFromInTextCitations(citations: InTextCitation[]) {
  return citations.map((citation) => {
    return {
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
    } satisfies BibliographicCandidate;
  });
}

function looksLikeRawOcrPage(value: string) {
  const normalized = normalizeForSemanticMatch(value);

  return (
    normalized.includes('strana 1') ||
    normalized.includes('strana 2') ||
    normalized.includes('strana 3') ||
    normalized.includes('strana 4') ||
    normalized.includes('strana 5') ||
    normalized.includes('page 1') ||
    normalized.includes('page 2') ||
    normalized.includes('extrahovany text') ||
    normalized.includes('text prilohy') ||
    normalized.includes('technicky prehlad priloh') ||
    normalized.includes('prilozeny subor') ||
    normalized.length > 900
  );
}

function candidateHasUsableData(source: BibliographicCandidate) {
  return Boolean(
    source.raw?.trim() ||
      source.authors?.length ||
      source.year ||
      source.title ||
      source.doi ||
      source.url,
  );
}

function buildInTextCitationFromSource(source: BibliographicCandidate) {
  if (!source.authors?.length || !source.year) return '';

  const firstAuthor = source.authors[0]
    .replace(/,.*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!firstAuthor) return '';

  if (source.authors.length > 1) return `(${firstAuthor} et al., ${source.year})`;
  return `(${firstAuthor}, ${source.year})`;
}

function textAlreadyHasCitation(text: string) {
  return /\([^()]{2,160}\b(?:18|19|20)\d{2}[a-z]?[^()]*\)/i.test(text);
}

function ensureChapterHasInTextCitations({
  text,
  sources,
}: {
  text: string;
  sources: BibliographicCandidate[];
}) {
  const output = normalizeText(text);
  if (textAlreadyHasCitation(output)) return output;

  const usableSource = sources.find(
    (source) =>
      candidateHasUsableData(source) &&
      !looksLikeRawOcrPage(source.raw || '') &&
      source.authors?.length &&
      source.year,
  );

  const citation = usableSource ? buildInTextCitationFromSource(usableSource) : '';
  if (!citation) return output;

  const literatureStart = output.search(
    /\n\s*(Primárne zdroje|Primarne zdroje|Použitá literatúra|Použité zdroje|Zdroje)\s*\n/i,
  );

  const body = literatureStart >= 0 ? output.slice(0, literatureStart).trim() : output;
  const tail = literatureStart >= 0 ? output.slice(literatureStart).trim() : '';

  const paragraphs = body.split(/\n\s*\n/);
  let inserted = 0;

  const updatedParagraphs = paragraphs.map((paragraph, index) => {
    const trimmed = paragraph.trim();

    if (index === 0) return paragraph;
    if (inserted >= 4) return paragraph;
    if (trimmed.length < 180) return paragraph;
    if (textAlreadyHasCitation(trimmed)) return paragraph;

    inserted += 1;
    return `${trimmed.replace(/[.!?]?\s*$/, '')} ${citation}.`;
  });

  const nextBody = updatedParagraphs.join('\n\n').trim();
  return tail ? `${nextBody}\n\n${tail}` : nextBody;
}

function formatCandidateForFinalLiterature(source: BibliographicCandidate) {
  const raw = normalizeText(source.raw || '').replace(/\s+/g, ' ').trim();

  const rawLooksUsable =
    raw.length >= 20 &&
    raw.length <= 500 &&
    !looksLikeRawOcrPage(raw) &&
    !raw.toLowerCase().includes('údaj je potrebné overiť') &&
    !raw.toLowerCase().includes('neuvedené');

  if (rawLooksUsable) return raw;

  const authors = source.authors?.length
    ? source.authors.join(', ')
    : 'Autor je potrebné overiť';

  const year = source.year || 'Rok chýba';
  const title =
    source.title && source.title !== 'údaj je potrebné overiť'
      ? source.title
      : 'údaj je potrebné overiť';
  const doi = source.doi ? ` DOI: ${source.doi}.` : '';
  const url = source.url ? ` Dostupné z: ${source.url}.` : '';

  return `${authors} (${year}). ${title}.${doi}${url}`.trim();
}

function buildPrimarySecondaryLiterature({
  detectedSourcesForOutput,
  generatedText,
  extractedFiles,
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  generatedText: string;
  extractedFiles: ExtractedAttachment[];
}) {
  const citationsFromGeneratedText = extractInTextCitations(generatedText);
  const citationSources = buildLiteratureFromInTextCitations(citationsFromGeneratedText);

  const detectedSources = mergeBibliographicCandidates(
    detectedSourcesForOutput,
    extractedFiles.flatMap((file) => file.bibliographicCandidates || []),
  ).filter((source) => !looksLikeRawOcrPage(source.raw || ''));

  const primarySources = mergeBibliographicCandidates(
    citationSources,
    detectedSources.filter((source) => {
      const key = getSourceCitationKey(source);
      if (!key) return false;
      return citationSources.some((citationSource) => getSourceCitationKey(citationSource) === key);
    }),
  )
    .filter(candidateHasUsableData)
    .filter((source) => !looksLikeRawOcrPage(source.raw || ''));

  const fallbackPrimary = primarySources.length
    ? primarySources
    : detectedSources.filter((source) => source.authors?.length && source.year).slice(0, 8);

  const secondarySources = mergeBibliographicCandidates(
    extractedFiles.flatMap((file) => {
      const good = (file.bibliographicCandidates || []).find(
        (source) => candidateHasUsableData(source) && !looksLikeRawOcrPage(source.raw || ''),
      );
      return good ? [good] : [];
    }),
  )
    .filter(candidateHasUsableData)
    .filter((source) => !looksLikeRawOcrPage(source.raw || ''));

  const primary = uniqueArray(
    fallbackPrimary.map(formatCandidateForFinalLiterature).map((item) => item.trim()).filter(Boolean),
  );

  const secondary = uniqueArray(
    secondarySources.map(formatCandidateForFinalLiterature).map((item) => item.trim()).filter(Boolean),
  );

  return { primary, secondary };
}

function ensureOutputHasPrimarySecondarySources({
  text,
  detectedSourcesForOutput,
  extractedFiles,
}: {
  text: string;
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
}) {
  const cleanedText = normalizeText(text);

  const literature = buildPrimarySecondaryLiterature({
    detectedSourcesForOutput,
    generatedText: cleanedText,
    extractedFiles,
  });

  if (!literature.primary.length && !literature.secondary.length) return cleanedText;

  const primaryBlock = literature.primary.length
    ? literature.primary.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené. V texte neboli rozpoznané priame citácie.';

  const secondaryBlock = literature.secondary.length
    ? literature.secondary.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené. Zdroj prílohy sa nepodarilo jednoznačne určiť.';

  const finalBlock = `Primárne zdroje\n\n${primaryBlock}\n\nSekundárne zdroje\n\n${secondaryBlock}`;

  const sourceSectionRegex =
    /\n\s*(Primárne zdroje|Primarne zdroje|Použitá literatúra(?:\s+pre\s+kapitolu\s+\d+(?:\.\d+)*)?|Použitý zdroj\s+pre\s+kapitolu\s+\d+(?:\.\d+)*|Použité zdroje(?:\s+a\s+autori)?|Zdroje(?:\s+a\s+autori)?)\s*\n[\s\S]*$/i;

  const match = cleanedText.match(sourceSectionRegex);

  if (match && typeof match.index === 'number') {
    const before = cleanedText.slice(0, match.index).trim();
    return `${before}\n\n${finalBlock}`.trim();
  }

  return `${cleanedText}\n\n${finalBlock}`.trim();
}

function formatPrimaryAndSecondarySourcesOnly(candidates: BibliographicCandidate[]) {
  const unique = mergeBibliographicCandidates(candidates).filter(
    (source) => candidateHasUsableData(source) && !looksLikeRawOcrPage(source.raw || ''),
  );

  const primary = unique.filter((item) => item.matchedFromText || item.inTextCitations?.length);
  const secondary = unique.filter((item) => !primary.includes(item));

  const primaryText = primary.length
    ? primary.map((item, index) => `${index + 1}. ${formatCandidateForFinalLiterature(item)}`).join('\n')
    : 'Neuvedené.';

  const secondaryText = secondary.length
    ? secondary.map((item, index) => `${index + 1}. ${formatCandidateForFinalLiterature(item)}`).join('\n')
    : 'Neuvedené.';

  return `Primárne zdroje

${primaryText}

Sekundárne zdroje

${secondaryText}`.trim();
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
  if (['.txt', '.rtf', '.odt', '.md'].includes(extension)) return 'Textový dokument';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) return 'Obrázok';
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
    const message = error instanceof Error ? error.message : 'Nepodarilo sa rozbaliť gzip súbor.';
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

function getPreparedMetadataForFile(file: File, preparedFilesMetadata: PreparedFileMetadata[]) {
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
  const metadataCandidates = normalizeBibliographicCandidates(preparedMetadata?.detectedSources || []);
  const metadataInTextCitations = Array.isArray(preparedMetadata?.inTextCitations)
    ? preparedMetadata.inTextCitations
    : [];
  const metadataCitationSources = buildLiteratureFromInTextCitations(metadataInTextCitations);
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
      bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
      inTextCitations: metadataInTextCitations,
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
        bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
        inTextCitations: metadataInTextCitations,
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
        bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
        inTextCitations: metadataInTextCitations,
        detectedAuthors: metadataAuthors,
        formattedSources: metadataFormattedSources,
      };
    }

    const detectedInTextCitations = extractInTextCitations(extractedText);
    const detectedCitationSources = buildLiteratureFromInTextCitations(detectedInTextCitations);
    const detectedCandidates = extractBibliographicCandidates(extractedText);
    const bibliographicCandidates = mergeBibliographicCandidates(
      metadataCandidates,
      metadataCitationSources,
      detectedCandidates,
      detectedCitationSources,
    );

    const inTextCitations = uniqueArray(
      [...metadataInTextCitations, ...detectedInTextCitations].map((item) => JSON.stringify(item)),
    ).map((item) => JSON.parse(item) as InTextCitation);

    const detectedAuthors = uniqueArray([
      ...metadataAuthors,
      ...inTextCitations.flatMap((citation) => citation.authors || []),
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
      inTextCitations,
      detectedAuthors,
      formattedSources: metadataFormattedSources,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nepodarilo sa extrahovať text zo súboru.';

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
      bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
      inTextCitations: metadataInTextCitations,
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
  const fileCitationSources = extractedFiles.flatMap((file) =>
    buildLiteratureFromInTextCitations(file.inTextCitations || []),
  );
  const mergedSources = mergeBibliographicCandidates(clientDetectedSources, fileSources, fileCitationSources);

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
    const frontendCitations = extractInTextCitations(clientExtractedText);
    const frontendCitationSources = buildLiteratureFromInTextCitations(frontendCitations);
    const frontendCandidates = mergeBibliographicCandidates(
      clientDetectedSources,
      extractBibliographicCandidates(clientExtractedText),
      frontendCitationSources,
    );

    attachmentTexts.push(`EXTRAHOVANÝ TEXT Z /api/extract-text ALEBO FRONTENDU
Stav: Text bol extrahovaný pred volaním /api/chat.
Použi tento text ako hlavný podklad, ale pracuj iba s dostupnými údajmi.
Počet citácií priamo v texte: ${frontendCitations.length}
Počet detegovaných zdrojov: ${frontendCandidates.length}

CITÁCIE V TEXTE:
${frontendCitations.map((citation, index) => `${index + 1}. ${citation.raw}`).join('\n') || 'neuvedené'}

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
Počet citácií v texte: ${file.inTextCitations.length}
Počet detegovaných bibliografických kandidátov: ${file.bibliographicCandidates.length}
Autori: ${file.detectedAuthors.length ? file.detectedAuthors.join(', ') : 'neuvedené alebo potrebné overiť'}
Upozornenie: ${file.warning || 'bez upozornenia'}
Chyba: ${file.error || 'bez chyby'}

CITÁCIE V TEXTE:
${file.inTextCitations.map((citation, index) => `${index + 1}. ${citation.raw}`).join('\n') || 'neuvedené'}

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
  if (!attachmentTexts.length) return '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';

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
Anotácia: ${profile?.annotation || 'Neuvedené'}
Cieľ práce: ${profile?.goal || 'Neuvedené'}
Výskumný problém: ${profile?.problem || 'Neuvedené'}
Metodológia: ${profile?.methodology || 'Neuvedené'}
Hypotézy: ${profile?.hypotheses || 'Neuvedené'}
Výskumné otázky: ${profile?.researchQuestions || 'Neuvedené'}
Praktická / analytická časť: ${profile?.practicalPart || 'Neuvedené'}
Vedecký / odborný prínos: ${profile?.scientificContribution || 'Neuvedené'}
Firemný / manažérsky problém: ${profile?.businessProblem || 'Neuvedené'}
Manažérsky cieľ: ${profile?.businessGoal || 'Neuvedené'}
Implementácia: ${profile?.implementation || 'Neuvedené'}
Prípadová štúdia: ${profile?.caseStudy || 'Neuvedené'}
Reflexia: ${profile?.reflection || 'Neuvedené'}
Požiadavky na zdroje: ${profile?.sourcesRequirement || 'Neuvedené'}
Kľúčové slová: ${keywords.length > 0 ? keywords.join(', ') : 'Neuvedené'}
Štruktúra práce: ${profile?.schema?.structure?.join(' | ') || 'Neuvedené'}
Povinné časti: ${profile?.schema?.requiredSections?.join(' | ') || 'Neuvedené'}
Špecifická inštrukcia typu práce: ${profile?.schema?.aiInstruction || 'Neuvedené'}
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

KOMPLETNÝ PROFIL PRÁCE:
${buildProfileSummary(profile)}

PRÍSNE PRAVIDLÁ:
- Vytvor realistický harmonogram práce podľa kompletného profilu.
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
ŠPECIÁLNY REŽIM PRE AKADEMICKÉ KAPITOLY MÁ NAJVYŠŠIU PRIORITU.

Aktivuje sa vždy, keď používateľ žiada kapitolu, napríklad:
- Kapitola 1
- Kapitola 1.1
- 1. Úvod
- 1.1
- uprav kapitolu
- vytvor kapitolu
- napíš kapitolu
- text musí byť ako šablóna
- použi rovnakú štruktúru ako vzor
- spracuj text podľa profilu práce

ABSOLÚTNE PRAVIDLÁ PRE KAPITOLU:

1. Ak používateľ žiada kapitolu, výstup musí byť iba samotná kapitola.

2. Kapitola musí kompletne vychádzať z profilu práce. Povinne zohľadni názov práce, tému, typ práce, odbor, cieľ, výskumný problém, metodológiu, hypotézy, výskumné otázky, praktickú časť, vedecký prínos, kľúčové slová, citačnú normu, jazyk práce, štruktúru práce a povinné časti.

3. Príloha alebo zdroj sa smie použiť iba vtedy, ak obsahovo súvisí s profilom práce.

4. Ak priložený dokument obsahovo nesúvisí s profilom práce, nevytváraj kapitolu. Vráť presne túto vetu:
${unrelatedProfileMessage}

5. Nepíš technické sekcie:
=== VÝSTUP ===
=== ANALÝZA ===
=== SKÓRE ===
=== ODPORÚČANIA ===
=== POUŽITÉ ZDROJE A AUTORI ===
A. Detegované zdroje z extrahovaného textu
B. Autori nájdení v dokumentoch
C. Formátované bibliografické záznamy
D. Priložené dokumenty použité ako podklad
E. Upozornenia
F. Zdroje, ktoré treba overiť

6. Nepíš krátky všeobecný text. Kapitola musí byť odborná, vecná, súvislá a prispôsobená konkrétnemu profilu práce.

7. Nadpis kapitoly musí vychádzať z požiadavky používateľa a profilu práce.

Zakázané všeobecné nadpisy:
1.1 Odborný názov kapitoly
KAPITOLA 1.1: Abstrakt
1.1 Abstrakt
Abstrakt
Názov kapitoly
Konkrétny odborný názov kapitoly

8. Ak používateľ žiada kapitolu 1 a neuvedie iný názov, použi formát:
1. Úvod

9. Ak používateľ žiada kapitolu 1.1, použi formát:
1.1 [odborný názov podľa témy práce a obsahu profilu]

10. Ak používateľ poskytne šablónu, napodobni jej štruktúru, dĺžku, akademický štýl, spôsob citovania a logiku členenia.

11. Ak používateľ neposkytne šablónu, vytvor kapitolu podľa akademických pravidiel: odborný nadpis, súvislé odseky, vymedzenie problému, prepojenie na cieľ práce, metodológiu, výskumné otázky alebo hypotézy, praktickú alebo analytickú časť a citácie iba z dostupných zdrojov.

12. Surový OCR text nikdy nevkladaj do kapitoly.
Zakázané v hlavnej kapitole:
STRANA 1
STRANA 2
PAGE 1
rozbité OCR vety
duplicitné úryvky
technické bloky extrakcie
zoznam autorov bez bibliografického záznamu
názvy súborov ako odborný text
informácie o kompresii
informácie o extrakcii

13. Pri akademickej kapitole povinne používaj citácie priamo v texte. Každý odborný odsek, ktorý vychádza z príloh, detegovaných zdrojov alebo bibliografických záznamov, musí obsahovať relevantnú citáciu v texte, napríklad (Ondrík et al., 2004), (Clark et al., 2003), (Dellaporta et al., 1983).

14. Nepíš kapitolu bez citácií, ak sú dostupní autori, roky alebo citácie z príloh.

15. Na konci kapitoly vždy vytvor presne tieto dve sekcie:
Primárne zdroje
Sekundárne zdroje

16. Primárne zdroje sú iba tie zdroje, ktoré boli priamo citované v texte kapitoly.

17. Sekundárne zdroje sú hlavné priložené dokumenty alebo zdroje príloh, z ktorých bol obsah spracovaný.

18. Do literatúry nikdy nevkladaj surový OCR text, označenia STRANA, PAGE, technické bloky, súhrny strán ani celé úryvky článku.

19. Ak je dostupná iba citácia v texte, uveď ju ako neúplný zdroj na overenie.

20. Nevymýšľaj zdroje, autorov, roky, názvy článkov, časopisov, DOI ani URL.
`.trim();
}

function buildSystemPrompt({
  profile,
  attachmentTexts,
  settings,
  module,
  isChapterRequest,
  requestedChapterNumber,
  relevance,
  sourcesOnly,
}: {
  profile: SavedProfile | null;
  attachmentTexts: string[];
  settings: SourceSettings;
  module: ModuleKey;
  isChapterRequest: boolean;
  requestedChapterNumber: string | null;
  relevance: ProfileRelevanceResult;
  sourcesOnly: boolean;
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

KOMPLETNÝ PROFIL PRÁCE JE HLAVNÝ ZDROJ KONTEXTU.
Každá odpoveď musí vychádzať z profilu práce. Nepíš všeobecný text mimo profilu.

AKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY:
${isChapterRequest ? 'Áno' : 'Nie'}
${requestedChapterNumber ? `Požadované číslo kapitoly: ${requestedChapterNumber}` : 'Požadované číslo kapitoly: neurčené'}

REŽIM IBA ZDROJE:
${sourcesOnly ? 'Áno' : 'Nie'}

KONTROLA SÚVISU PRÍLOH S PROFILOM:
Sú dostupné prílohy alebo zdroje: ${relevance.hasAttachmentContent ? 'Áno' : 'Nie'}
Prílohy podľa automatickej kontroly súvisia s profilom: ${relevance.isRelevant ? 'Áno' : 'Nie'}
Počet zhodných odborných výrazov: ${relevance.matchedTokens.length}
Zhodné výrazy:
${relevance.matchedTokens.slice(0, 80).join(', ') || 'žiadne'}

Ak príloha nesúvisí s profilom práce, vráť presne:
${unrelatedProfileMessage}

${chapterRules}

HLAVNÝ POSTUP:
1. Najprv vychádzaj z uloženého profilu práce.
2. Použi všetky vyplnené informácie z profilu práce.
3. Potom použi extrahovaný text z príloh a dokumentov iba vtedy, ak obsahovo súvisia s profilom.
4. Ak existuje extrahovaný text a súvisí s profilom, použi ho pred všeobecnými znalosťami AI.
5. Ak ide o kapitolu, nepíš technické sekcie, ale iba čistý akademický text kapitoly.
6. Nevymýšľaj zdroje, autorov, DOI, URL, roky, vydavateľov ani čísla strán.
7. Ak údaj chýba, napíš: údaj je potrebné overiť.
8. Semantic Scholar je vypnutý.
9. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

JAZYK ODPOVEDE:
${workLanguage}

CITAČNÁ NORMA:
${citationStyle}

KOMPLETNÝ ULOŽENÝ PROFIL PRÁCE:
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
1. Ak používateľ žiada zdroje, bibliografiu, literatúru, autorov alebo citácie, výstup musí obsahovať iba:
Primárne zdroje

Sekundárne zdroje

2. Pri výstupe iba zdroje nepíš úvod, vysvetlenie, analýzu, skóre, odporúčania ani technické poznámky.
3. Pri výstupe iba zdroje nesmie byť žiadny text okolo dvoch sekcií Primárne zdroje a Sekundárne zdroje.
4. Ak sú zdroje v extrahovanom texte, nesmieš napísať, že zdroje neboli dodané.
5. Ak príloha nesúvisí s profilom práce, nepoužívaj ju ako odborný zdroj.
6. Ak používateľ žiada kapitolu, úvod, abstrakt, osnovu, analýzu alebo odborný text, nevypisuj iba zdroje. Vtedy vytvor požadovaný akademický text podľa kompletného profilu práce.

NASTAVENIA:
Kontrola príloh podľa profilu práce: ${settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'}
Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}
Povolené všeobecné znalosti AI: ${settings.allowAiKnowledgeFallback ? 'áno' : 'nie'}
Zdrojový režim: ${settings.sourceMode}

FORMÁT ODPOVEDE:

Ak je REŽIM IBA ZDROJE = Áno:
Vráť iba:

Primárne zdroje

[zoznam]

Sekundárne zdroje

[zoznam]

Ak je AKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY = Áno:
Vráť iba samotnú kapitolu v akademickom tvare podľa profilu práce a prípadnej šablóny používateľa.

V hlavnom texte kapitoly musia byť pri odborných tvrdeniach citácie v texte.
Nepíš len literatúru na konci bez citácií v odsekoch.

Na konci kapitoly musia byť vždy dve sekcie:
Primárne zdroje
Sekundárne zdroje

Primárne zdroje = iba zdroje, ktoré sú priamo citované v texte kapitoly.
Sekundárne zdroje = priložené dokumenty alebo zdroje príloh, z ktorých bol obsah spracovaný.

Do týchto sekcií uveď iba reálne dostupné zdroje z príloh, extrahovaného textu, citácií alebo profilu.
Nevymýšľaj zdroje.

Ak je AKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY = Nie a REŽIM IBA ZDROJE = Nie, použi tento bežný formát:

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text podľa kompletného profilu práce.

=== ANALÝZA ===
Stručne vysvetli:
- z ktorých údajov profilu si čerpal,
- či boli priložené dokumenty,
- či priložené dokumenty tematicky zodpovedajú profilu práce,
- či boli automaticky detegované zdroje, autori a publikácie,
- či bol text vytvorený aj zo všeobecných znalostí AI modelu.

=== SKÓRE ===
Napíš iba číslo od 0 do 100 a krátke slovné hodnotenie.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania v čistom texte bez Markdown symbolov.

=== POUŽITÉ ZDROJE A AUTORI ===
Uveď iba zdroje súvisiace s profilom práce.
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

  output = output
    .replace(/^===\s*VÝSTUP\s*===\s*/i, '')
    .replace(/^VÝSTUP\s*:\s*/i, '')
    .trim();

  output = output.replace(/^KAPITOLA\s+(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i, '$1 Úvod\n\n');
  output = output.replace(/^(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i, '$1 Úvod\n\n');
  output = output.replace(/^(\d+(?:\.\d+)*)\s+Odborný\s+názov\s+kapitoly\s*/i, '$1\n\n');
  output = output.replace(/^Konkrétny\s+odborný\s+názov\s+kapitoly\s*/i, '');

  const forbiddenSections = [
    '=== ANALÝZA ===',
    '=== SKÓRE ===',
    '=== ODPORÚČANIA ===',
    '=== POUŽITÉ ZDROJE A AUTORI ===',
    'A. Detegované zdroje z extrahovaného textu',
    'A Detegované zdroje z extrahovaného textu',
    'B. Autori nájdení v dokumentoch',
    'C. Formátované bibliografické záznamy',
    'D. Priložené dokumenty použité ako podklad',
    'E. Upozornenia',
    'F. Zdroje, ktoré treba overiť',
    'TECHNICKÝ PREHĽAD PRÍLOH',
    'PRILOŽENÝ SÚBOR',
    'EXTRAHOVANÝ TEXT',
  ];

  for (const section of forbiddenSections) {
    const index = output.toLowerCase().indexOf(section.toLowerCase());
    if (index > 0) output = output.slice(0, index).trim();
  }

  output = output.replace(/\n\s*STRANA\s+\d+\s+/gi, '\n');
  output = output.replace(/\n\s*PAGE\s+\d+\s+/gi, '\n');
  output = output.replace(/\n{4,}/g, '\n\n\n');

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
    if (subjectIndex > 0) output = output.slice(subjectIndex).trim();
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
    if (!process.env.OPENAI_API_KEY) throw new Error('Chýba OPENAI_API_KEY pre GPT.');

    return {
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      providerLabel: 'GPT',
    };
  }

  if (agent === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Chýba ANTHROPIC_API_KEY pre Claude.');

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
    if (!process.env.XAI_API_KEY) throw new Error('Chýba XAI_API_KEY pre Grok.');

    return {
      model: xai(process.env.XAI_MODEL || 'grok-3') as any,
      providerLabel: 'Grok',
    };
  }

  if (agent === 'mistral') {
    if (!process.env.MISTRAL_API_KEY) throw new Error('Chýba MISTRAL_API_KEY pre Mistral.');

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return 'Neznáma chyba.';
  }
}

function isModelNotFoundError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('404') ||
      message.includes('not supported') ||
      message.includes('invalid model') ||
      message.includes('not found for api version'))
  );
}

function isContextWindowError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('context window') ||
    message.includes('maximum context') ||
    message.includes('input exceeds') ||
    message.includes('too many tokens') ||
    message.includes('token limit') ||
    message.includes('prompt is too long') ||
    message.includes('input is too long') ||
    message.includes('maximum number of tokens')
  );
}

// ================= SLOVAK ERROR RESPONSES =================

function translateApiErrorToSlovak(error: unknown): SlovakApiError {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Neznáma chyba servera.';

  const message = rawMessage.toLowerCase();

  if (
    message.includes('model is not found') ||
    message.includes('model not found') ||
    message.includes('not found for api version') ||
    message.includes('invalid model') ||
    message.includes('not supported') ||
    (message.includes('model') && message.includes('404'))
  ) {
    return {
      code: 'MODEL_NOT_FOUND',
      message: 'Zvolený AI model sa nepodarilo nájsť alebo nie je dostupný pre aktuálnu verziu API.',
      detail:
        'Skontroluj názov modelu v .env súbore. Dočasne prepni model na Gemini alebo OpenAI, prípadne použi dostupný model s väčším kontextovým oknom.',
      rawMessage,
    };
  }

  if (
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('incorrect api key') ||
    message.includes('authentication') ||
    message.includes('401')
  ) {
    return {
      code: 'INVALID_API_KEY',
      message: 'API kľúč je neplatný, chýba alebo nemá oprávnenie na použitie zvoleného AI modelu.',
      detail:
        'Skontroluj API kľúč v nastaveniach prostredia: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, MISTRAL_API_KEY alebo XAI_API_KEY.',
      rawMessage,
    };
  }

  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('403')
  ) {
    return {
      code: 'ACCESS_DENIED',
      message: 'Prístup k zvolenému AI modelu alebo službe bol zamietnutý.',
      detail: 'Skontroluj oprávnenia účtu, dostupnosť modelu a billing u poskytovateľa AI služby.',
      rawMessage,
    };
  }

  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('quota') ||
    message.includes('429')
  ) {
    return {
      code: 'RATE_LIMIT',
      message: 'Bol prekročený limit požiadaviek alebo kreditov pre AI službu.',
      detail: 'Skús požiadavku zopakovať neskôr alebo skontroluj limity, kredity a billing u poskytovateľa AI služby.',
      rawMessage,
    };
  }

  if (isContextWindowError(error)) {
    return {
      code: 'CONTEXT_TOO_LARGE',
      message: 'Vstup je príliš veľký pre kontextové okno AI modelu.',
      detail:
        'Text bol skrátený, ale stále je príliš veľký. Použi iný model s väčším kontextovým oknom, napríklad GPT-4.1, Gemini 2.5 Pro alebo Claude Sonnet s vyšším limitom. Prípadne zmenši počet príloh alebo rozdeľ dokument na menšie časti.',
      rawMessage,
    };
  }

  if (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Nepodarilo sa spojiť s AI službou alebo server prekročil časový limit.',
      detail: 'Skús požiadavku zopakovať. Ak chyba pretrváva, skontroluj internetové pripojenie, Vercel logy alebo dostupnosť poskytovateľa AI.',
      rawMessage,
    };
  }

  if (
    message.includes('billing') ||
    message.includes('insufficient_quota') ||
    message.includes('insufficient quota') ||
    message.includes('credits')
  ) {
    return {
      code: 'BILLING_ERROR',
      message: 'AI účet nemá aktívny billing alebo dostatočný kredit.',
      detail: 'Skontroluj fakturáciu, kredit alebo plán u poskytovateľa AI služby.',
      rawMessage,
    };
  }

  if (
    message.includes('chýba openai_api_key') ||
    message.includes('chýba anthropic_api_key') ||
    message.includes('chýba google_generative_ai_api_key') ||
    message.includes('chýba mistral_api_key') ||
    message.includes('chýba xai_api_key') ||
    message.includes('nie je nastavený žiadny ai provider')
  ) {
    return {
      code: 'MISSING_API_KEY',
      message: 'Chýba API kľúč pre zvoleného AI poskytovateľa.',
      detail: 'Doplň potrebný API kľúč do .env alebo do nastavení vo Verceli a potom redeployni projekt.',
      rawMessage,
    };
  }

  if (
    message.includes('gzip_decompression_failed') ||
    message.includes('gunzip') ||
    message.includes('incorrect header check')
  ) {
    return {
      code: 'GZIP_DECOMPRESSION_FAILED',
      message: 'Komprimovaný súbor sa nepodarilo rozbaliť.',
      detail: 'Skontroluj, či je súbor skutočne vo formáte gzip alebo ho odošli ako pôvodný dokument bez kompresie.',
      rawMessage,
    };
  }

  return {
    code: 'AI_API_ERROR',
    message: 'AI služba vrátila chybu pri spracovaní požiadavky.',
    detail: 'Detail technickej chyby je dostupný v serverových logoch. Skontroluj /api/chat vo Verceli alebo lokálny terminál.',
    rawMessage,
  };
}

function jsonErrorResponse(error: SlovakApiError, status: number) {
  return NextResponse.json(
    {
      ok: false,
      code: error.code,
      message: error.message,
      detail: error.detail,
      rawMessage: error.rawMessage,
    },
    { status },
  );
}

function jsonSimpleErrorResponse({
  code,
  message,
  detail,
  status,
}: {
  code: string;
  message: string;
  detail: string;
  status: number;
}) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      detail,
    },
    { status },
  );
}

// ================= AI RESPONSE HELPERS =================

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
    maxOutputTokens: streamOutputTokens,
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
  sourcesOnly,
  settings,
  relevance,
  detectedSourcesForOutput,
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  extractedFiles: ExtractedAttachment[];
  providerLabel: string;
  module: ModuleKey;
  isChapterRequest: boolean;
  sourcesOnly: boolean;
  settings: SourceSettings;
  relevance: ProfileRelevanceResult;
  detectedSourcesForOutput: BibliographicCandidate[];
}) {
  const extractedFilesPayload = extractedFiles.map((file) => ({
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
    inTextCitations: file.inTextCitations,
    detectedAuthors: file.detectedAuthors,
    formattedSources: file.formattedSources,
  }));

  if (
    settings.validateAttachmentsAgainstProfile &&
    relevance.hasAttachmentContent &&
    !relevance.isRelevant
  ) {
    return NextResponse.json({
      ok: true,
      provider: providerLabel,
      output: unrelatedProfileMessage,
      profileRelevance: relevance,
      extractedFiles: extractedFilesPayload,
    });
  }

  if (module === 'chat' && sourcesOnly) {
    const output = ensureOutputHasPrimarySecondarySources({
      text: '',
      detectedSourcesForOutput,
      extractedFiles,
    }).trim() || formatPrimaryAndSecondarySourcesOnly(detectedSourcesForOutput);

    return NextResponse.json({
      ok: true,
      provider: providerLabel,
      output,
      profileRelevance: relevance,
      extractedFiles: extractedFilesPayload,
    });
  }

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.2,
    maxOutputTokens: isChapterRequest ? chapterOutputTokens : defaultOutputTokens,
  });

  const rawOutput = result.text || '';
  let output = isStrictNoAcademicTailModule(module) ? cleanStrictOutput(rawOutput, module) : rawOutput;

  if (isChapterRequest) {
    output = cleanAcademicChapterOutput(output);
    output = ensureChapterHasInTextCitations({
      text: output,
      sources: detectedSourcesForOutput,
    });
    output = ensureOutputHasPrimarySecondarySources({
      text: output,
      detectedSourcesForOutput,
      extractedFiles,
    });
  }

  return NextResponse.json({
    ok: true,
    provider: providerLabel,
    output,
    profileRelevance: relevance,
    extractedFiles: extractedFilesPayload,
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

      allowAiKnowledgeFallback = asBoolean(formData.get('allowAiKnowledgeFallback'), true);

      returnExtractedFilesInfo = asBoolean(formData.get('returnExtractedFilesInfo'), false);

      clientExtractedText = toCleanString(formData.get('clientExtractedText'));
      preparedFilesSummary = toCleanString(formData.get('preparedFilesSummary'));
      clientDetectedSourcesSummary = toCleanString(formData.get('clientDetectedSourcesSummary'));

      clientDetectedSources = normalizeBibliographicCandidates(
        parseJson<BibliographicCandidate[]>(formData.get('clientDetectedSources'), []),
      );

      preparedFilesMetadata = parseJson<PreparedFileMetadata[]>(
        formData.get('preparedFilesMetadata'),
        [],
      );

      files = formData.getAll('files').filter((item): item is File => item instanceof File);
    } else {
      const body = await req.json().catch(() => null);

      rawAgent = body?.agent || 'gemini';
      module = normalizeModule(body?.module);
      messages = Array.isArray(body?.messages) ? body.messages : [];
      profile = body?.profile || body?.activeProfile || body?.savedProfile || null;
      projectId = body?.projectId || null;

      sourceMode = normalizeSourceMode(body?.sourceMode);
      validateAttachmentsAgainstProfile = body?.validateAttachmentsAgainstProfile !== false;
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
      return jsonSimpleErrorResponse({
        code: 'UNKNOWN_AGENT',
        message: `Neznámy AI agent: ${String(rawAgent)}.`,
        detail: 'Použi jeden z podporovaných agentov: openai, claude, gemini, grok alebo mistral.',
        status: 400,
      });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (normalizedMessages.length === 0) {
      return jsonSimpleErrorResponse({
        code: 'MISSING_MESSAGES',
        message: 'Chýbajú správy pre AI.',
        detail: 'Frontend musí odoslať aspoň jednu používateľskú správu v poli messages.',
        status: 400,
      });
    }

    const lastUserMessage = getLastUserMessage(normalizedMessages);
    const isChapterRequest = isAcademicChapterRequest(normalizedMessages);
    const requestedChapterNumber = detectChapterNumberFromText(lastUserMessage);
    const sourcesOnly = userWantsSourcesOnly(normalizedMessages);

    const {
      extractedFiles,
      attachmentTexts: uploadedAttachmentTexts,
      compactSources,
    } = await extractAttachmentTexts({
      files,
      preparedFilesMetadata,
      clientExtractedText,
      preparedFilesSummary,
      clientDetectedSourcesSummary,
      clientDetectedSources,
    });

    const hasCurrentUpload =
      files.length > 0 ||
      clientExtractedText.trim().length > 0 ||
      preparedFilesSummary.trim().length > 0 ||
      clientDetectedSources.length > 0 ||
      preparedFilesMetadata.length > 0;

    const projectDocuments =
      isStrictNoAcademicTailModule(module) || hasCurrentUpload
        ? []
        : await loadProjectDocuments(projectId);

    const projectDocumentSources: BibliographicCandidate[] = [];

    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const documentType = doc.file_type || doc.type || 'neuvedené';
      const extractedText = normalizeText(doc.extracted_text || '');
      const bibliographicCandidates = mergeBibliographicCandidates(
        extractBibliographicCandidates(extractedText),
        buildLiteratureFromInTextCitations(extractInTextCitations(extractedText)),
      );

      projectDocumentSources.push(...bibliographicCandidates);

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

    const detectedSourcesForOutput = mergeBibliographicCandidates(
      clientDetectedSources,
      compactSources.sources,
      extractedFiles.flatMap((file) => file.bibliographicCandidates),
      extractedFiles.flatMap((file) => buildLiteratureFromInTextCitations(file.inTextCitations || [])),
      projectDocumentSources,
    );

    const relevance = detectAttachmentProfileRelevance({
      profile,
      attachmentTexts,
      extractedFiles,
      detectedSourcesForOutput,
    });

    console.log('PROFILE_RELEVANCE_DEBUG:', {
      hasAttachmentContent: relevance.hasAttachmentContent,
      isRelevant: relevance.isRelevant,
      matchedTokensCount: relevance.matchedTokens.length,
      matchedTokens: relevance.matchedTokens.slice(0, 80),
      profileTokensCount: relevance.profileTokens.length,
      attachmentTokensCount: relevance.attachmentTokens.length,
      relevanceRatio: relevance.relevanceRatio,
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
        inTextCitations: file.inTextCitations.length,
        authors: file.detectedAuthors.length,
        status: file.status,
        error: file.error,
        warning: file.warning,
        preview: file.extractedPreview.slice(0, 200),
      })),
    );

    const settings: SourceSettings = {
      sourceMode,
      validateAttachmentsAgainstProfile,
      requireSourceList: isStrictNoAcademicTailModule(module) ? false : requireSourceList,
      allowAiKnowledgeFallback: module === 'translation' ? false : allowAiKnowledgeFallback,
    };

    const systemPrompt = buildSystemPrompt({
      profile,
      attachmentTexts,
      settings,
      module,
      isChapterRequest,
      requestedChapterNumber,
      relevance,
      sourcesOnly,
    });

    try {
      const primary = getModelByAgent(agent);

      if (returnExtractedFilesInfo || isChapterRequest || sourcesOnly || module === 'chat') {
        return await createJsonResponse({
          model: primary.model,
          systemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: primary.providerLabel,
          module,
          isChapterRequest,
          sourcesOnly,
          settings,
          relevance,
          detectedSourcesForOutput,
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
        return jsonErrorResponse(translateApiErrorToSlovak(primaryError), 413);
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

Ak sa text skracuje alebo výstup nie je úplný, je potrebné použiť model s väčším kontextovým oknom.

Ak používateľ žiada kapitolu, dodrž špeciálny režim kapitoly:
- čerpaj z kompletného profilu práce,
- vráť iba samotnú kapitolu,
- nevytváraj kapitolu z prílohy, ktorá nesúvisí s profilom,
- nepíš technické sekcie ANALÝZA, SKÓRE, ODPORÚČANIA ani POUŽITÉ ZDROJE A AUTORI,
- OCR text použi iba ako podklad,
- v texte kapitoly používaj citácie priamo v odsekoch,
- na konci uveď iba Primárne zdroje a Sekundárne zdroje,
- nevkladaj STRANA, PAGE ani technické OCR bloky do literatúry.

Ak používateľ žiada iba zdroje, vráť iba:
Primárne zdroje

Sekundárne zdroje
`,
            maxSystemPromptChars,
          );

      if (returnExtractedFilesInfo || isChapterRequest || sourcesOnly || module === 'chat') {
        return await createJsonResponse({
          model: fallback.model,
          systemPrompt: fallbackSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: fallback.providerLabel,
          module,
          isChapterRequest,
          sourcesOnly,
          settings,
          relevance,
          detectedSourcesForOutput,
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
    return jsonErrorResponse(translateApiErrorToSlovak(error), 500);
  }
}
