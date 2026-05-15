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

// =====================================================
// TYPES
// =====================================================

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

type SourceOrigin =
  | 'attachment'
  | 'citation'
  | 'project'
  | 'semantic_scholar'
  | 'crossref'
  | 'ai'
  | 'unknown';

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
  sourceType: 'book' | 'article' | 'web' | 'software' | 'unknown';
  citationKey?: string;
  inTextCitations?: InTextCitation[];
  occurrenceCount?: number;
  matchedFromText?: boolean;
  origin?: SourceOrigin;
  sourceDocumentName?: string | null;
  citedAccordingTo?: string | null;
};

type VerifiedSource = {
  id: string;
  authors: string[];
  year: string;
  title: string;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
  citationText: string;
  bibliographyText: string;
  origin: 'semantic_scholar' | 'crossref';
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

type ProfileRelevanceResult = {
  hasAttachmentContent: boolean;
  isRelevant: boolean;
  matchedTokens: string[];
  profileTokens: string[];
  attachmentTokens: string[];
  relevanceRatio: number;
};

type SourceSettings = {
  sourceMode: 'uploaded_documents_first';
  validateAttachmentsAgainstProfile: boolean;
  requireSourceList: boolean;
  allowAiKnowledgeFallback: boolean;
  useExternalAcademicSources: boolean;
};

type ExternalResearchResult = {
  query: string;
  sources: VerifiedSource[];
  status: 'used' | 'skipped' | 'failed';
  message: string;
};

type ModelResult = {
  model: any;
  providerLabel: string;
};

type SlovakApiError = {
  code: string;
  message: string;
  detail: string;
  rawMessage?: string;
};

// =====================================================
// LIMITS
// =====================================================

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;
const maxExtractedCharsPerAttachment = 18_000;
const maxClientExtractedChars = 45_000;
const maxProjectDocumentChars = 18_000;
const maxAttachmentContextChars = 80_000;
const maxSystemPromptChars = 110_000;
const maxSingleMessageChars = 10_000;
const maxTotalMessagesChars = 30_000;
const maxDetectedSourcesPerAttachment = 300;
const maxFinalSourcesInOutput = 300;
const maxExternalVerifiedSources = 12;
const maxExternalResearchQueryLength = 260;

const defaultOutputTokens = 5000;
const streamOutputTokens = 7000;
const chapterOutputTokens = 9000;

// =====================================================
// BASIC HELPERS
// =====================================================

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

  return `${cleaned.slice(0, maxLength)}\n\n[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]`;
}

function limitMiddle(value: string, maxLength: number): string {
  const cleaned = normalizeText(value);
  if (cleaned.length <= maxLength) return cleaned;

  const half = Math.floor(maxLength / 2);
  return `${cleaned.slice(0, half)}\n\n[STRED TEXTU BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]\n\n${cleaned.slice(-half)}`;
}

function uniqueArray(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function normalizeAuthorName(value: string) {
  return normalizeText(value)
    .replace(/\bet al\.?/gi, 'et al.')
    .replace(/\ba kol\.?/gi, 'a kol.')
    .replace(/\s+/g, ' ')
    .trim();
}

function isInvalidAuthorFragment(value: string) {
  const cleaned = normalizeAuthorName(value)
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return true;
  if (/^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]$/i.test(cleaned)) return true;
  if (/^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{1,2}$/i.test(cleaned)) return true;

  return /^(et|al|kol|vol|no|pp|p|s|str|tab|obr|kap|ročník|rocnik|číslo|cislo|journal|press|publisher|doi|available|retrieved|from|in|page|pages|abstract|introduction|biotechnologica|nova biotechnologica)$/i.test(cleaned);
}

function cleanValidAuthors(authors: unknown) {
  const safeAuthors = Array.isArray(authors)
    ? authors
    : typeof authors === 'string'
      ? authors.split(/,|;|\n|\band\b|\ba\b/gi)
      : [];

  return uniqueArray(
    safeAuthors
      .map((author) => normalizeAuthorName(String(author || '')))
      .filter((author) => !isInvalidAuthorFragment(author))
      .filter((author) => author.length >= 3),
  );
}

function hasValidAuthorName(authors: string[]) {
  return cleanValidAuthors(authors).length > 0;
}

function looksLikeIncompleteInitialCitation(value: string) {
  return /^[(]?\s*[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*,?\s*(?:18|19|20)\d{2}[a-z]?\s*[)]?\.?$/i.test(normalizeText(value));
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

function buildCitationKey(authors: string[], year: string) {
  const authorKey = cleanValidAuthors(authors)
    .map((author) => normalizeCitationKeyPart(author))
    .filter(Boolean)
    .join(' ');

  return `${authorKey}|${year}`;
}

function getSourceCitationKey(source: BibliographicCandidate) {
  if (source.citationKey) return source.citationKey;

  const validAuthors = cleanValidAuthors(source.authors || []);
  if (!validAuthors.length || !source.year) return '';

  return buildCitationKey(validAuthors, source.year);
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return '';
  return fileName.slice(index).toLowerCase();
}

function removeGzipSuffix(fileName: string) {
  return fileName.toLowerCase().endsWith('.gz') ? fileName.slice(0, -3) : fileName;
}

function getEffectiveExtension(fileName: string) {
  return getFileExtension(removeGzipSuffix(fileName));
}

function getWorkLanguage(profile: SavedProfile | null) {
  return toCleanString(profile?.workLanguage) || toCleanString(profile?.language) || 'slovenčina';
}

function getCitationStyle(profile: SavedProfile | null) {
  return toCleanString(profile?.citation) || 'APA';
}

function getKeywords(profile: SavedProfile | null) {
  if (!profile) return [];
  return [
    ...(Array.isArray(profile.keywordsList) ? profile.keywordsList : []),
    ...(Array.isArray(profile.keywords) ? profile.keywords : []),
  ]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function isAllowedAgent(value: unknown): value is Agent {
  return value === 'openai' || value === 'claude' || value === 'gemini' || value === 'grok' || value === 'mistral';
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

// =====================================================
// MESSAGE DETECTION
// =====================================================

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
    if (index >= 0 && (firstCutIndex === -1 || index < firstCutIndex)) firstCutIndex = index;
  }

  if (firstCutIndex > 0) output = output.slice(0, firstCutIndex).trim();

  return limitText(output || 'Spracuj požiadavku používateľa podľa kompletného profilu práce a dostupných podkladov.', maxSingleMessageChars);
}

function normalizeMessages(messages: ChatMessage[]) {
  const cleaned = messages
    .filter(
      (message) =>
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim().length > 0,
    )
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

function getLastUserMessage(messages: ChatMessage[]) {
  const last = [...messages].reverse().find((message) => message.role === 'user');
  return last?.content || '';
}

function isLikelyChapterRequestText(text: string) {
  const normalized = normalizeForSemanticMatch(text);

  return (
    /\bkapitola\s+\d+(?:\.\d+)*\b/i.test(normalized) ||
    /\b\d+\s*kapitola\b/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)*\s*[\.:]\s*[a-z]/i.test(normalized) ||
    /^\s*\d+(?:\.\d+)+\s*$/i.test(normalized) ||
    normalized.includes('napis 1 kapitolu') ||
    normalized.includes('napis prvu kapitolu') ||
    normalized.includes('prva kapitola') ||
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
    normalized.match(/\b(\d+(?:\.\d+)*)\s*\.?\s*kapitola\b/i) ||
    normalized.match(/^\s*(\d+(?:\.\d+)*)\s*[\.:]\s*[a-záäčďéíĺľňóôŕšťúýž]/i) ||
    normalized.match(/^\s*(\d+(?:\.\d+)+)\b/i) ||
    normalized.match(/\b(\d+(?:\.\d+)+)\b/i);

  if (match?.[1]) return match[1];
  if (/\bprv[áaúu]\s+kapitola\b/i.test(normalized)) return '1';
  return null;
}

function isAcademicChapterRequest(messages: ChatMessage[]) {
  return isLikelyChapterRequestText(getLastUserMessage(messages));
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

// =====================================================
// IN-TEXT CITATIONS AND BIBLIOGRAPHY
// =====================================================

function extractAuthorsFromCitationAuthorText(authorText: string) {
  const cleaned = normalizeAuthorName(authorText)
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .trim();

  return cleanValidAuthors(
    cleaned
      .split(/\s*(?:,|;|&|\ba\b|\band\b)\s*/i)
      .map((part) => normalizeAuthorName(part)),
  );
}

function extractInTextCitations(text: string): InTextCitation[] {
  const cleaned = normalizeText(text);
  const found = new Map<string, InTextCitation>();

  const addCitation = (rawValue: string) => {
    const raw = normalizeText(rawValue).replace(/^\(/, '').replace(/\)$/, '').trim();
    if (!raw) return;

    const chunks = raw.split(/\s*;\s*/).map((chunk) => chunk.trim()).filter(Boolean);

    for (const chunk of chunks) {
      if (looksLikeIncompleteInitialCitation(chunk)) continue;

      const match =
        chunk.match(/^(.{2,160}?)[,\s]+((?:18|19|20)\d{2}[a-z]?)$/i) ||
        chunk.match(/^(.{2,160}?)[,\s]+((?:18|19|20)\d{2}[a-z]?)(?:\s*[,.:].*)?$/i);

      if (!match) continue;

      const authorText = normalizeText(match[1] || '')
        .replace(/^\s*(pozri|viď|cf\.|see)\s+/i, '')
        .trim();
      const year = String(match[2] || '').trim();

      if (!authorText || !year || authorText.length > 140) continue;
      if (/^(vol|no|p|s|str|tab|obr|ročník|číslo)$/i.test(authorText)) continue;

      const authors = extractAuthorsFromCitationAuthorText(authorText);
      if (!authors.length) continue;

      const key = buildCitationKey(authors, year);
      const existing = found.get(key);

      if (existing) existing.count += 1;
      else found.set(key, { raw: `(${authorText}, ${year})`, authorText, authors, year, key, count: 1 });
    }
  };

  for (const match of cleaned.matchAll(/\(([^()]{2,280}?\b(?:18|19|20)\d{2}[a-z]?(?:[^()]*)?)\)/gi)) {
    addCitation(match[1] || '');
  }

  for (const match of cleaned.matchAll(/\b([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+(?:\s+(?:a|and)\s+[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]+|\s+et\s+al\.?|\s+a\s+kol\.?)?)\s*\(((?:18|19|20)\d{2}[a-z]?)\)/gi)) {
    const authorText = normalizeText(match[1] || '');
    const year = String(match[2] || '').trim();
    const authors = extractAuthorsFromCitationAuthorText(authorText);
    if (!authors.length || !year) continue;

    const key = buildCitationKey(authors, year);
    const existing = found.get(key);
    if (existing) existing.count += 1;
    else found.set(key, { raw: `${authorText} (${year})`, authorText, authors, year, key, count: 1 });
  }

  return Array.from(found.values()).sort((a, b) => a.authorText.localeCompare(b.authorText, 'sk') || a.year.localeCompare(b.year));
}


function titleCaseNamePart(value: string) {
  return normalizeText(value || '')
    .toLowerCase()
    .replace(/(^|[\s\-'])[a-záäčďéíĺľňóôŕšťúýž]/g, (match) => match.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInitials(value: string) {
  return normalizeText(value || '')
    .replace(/([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ])\.?/g, '$1. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReferenceAuthors(authorPart: string) {
  const input = normalizeText(authorPart || '')
    .replace(/^[-•\d.)\s]+/, '')
    .replace(/\bet\s+al\.?/gi, '')
    .replace(/\ba\s+kol\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const authors: string[] = [];
  const surnameCommaInitials = /([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'’\-]+)\s*,\s*((?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?,?\s*){1,6})/g;

  let match: RegExpExecArray | null;
  while ((match = surnameCommaInitials.exec(input)) !== null) {
    const surname = titleCaseNamePart(match[1] || '');
    const initials = normalizeInitials(match[2] || '');
    const author = `${surname}, ${initials}`.replace(/\s+/g, ' ').trim();
    if (surname && initials && !isInvalidAuthorFragment(surname)) authors.push(author);
  }

  for (const part of input.split(/\s*,\s*/).filter(Boolean)) {
    const m = part.match(/^([A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽA-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'’\-]+)\s+((?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*){1,6})$/);
    if (!m) continue;
    const surname = titleCaseNamePart(m[1] || '');
    const initials = normalizeInitials(m[2] || '');
    const author = `${surname}, ${initials}`.replace(/\s+/g, ' ').trim();
    if (surname && initials && !isInvalidAuthorFragment(surname)) authors.push(author);
  }

  return cleanValidAuthors(authors).slice(0, 20);
}

function expandJournalAbbreviation(value: string) {
  const journal = normalizeText(value || '').replace(/\s+/g, ' ').replace(/\.$/, '').trim();
  const dictionary: Record<string, string> = {
    'Plant Physiol. Biochem': 'Plant Physiology and Biochemistry',
    'Plant Mol. Biol. Rep': 'Plant Molecular Biology Reporter',
    'J. Cereal Sci': 'Journal of Cereal Science',
    'J. Plant Physiol': 'Journal of Plant Physiology',
    'J. Inst. Brew': 'Journal of the Institute of Brewing',
    'Plant Breed': 'Plant Breeding',
  };
  return dictionary[journal] || journal;
}

function parseStructuredReferenceLine(line: string, origin: SourceOrigin = 'attachment'): BibliographicCandidate | null {
  const raw = normalizeText(line).replace(/\s+/g, ' ').replace(/^[-•\d.)\s]+/, '').trim();
  if (!raw || raw.length < 35) return null;
  if (/^Nova\s+Biotechnologica\s*\(/i.test(raw)) return null;
  if (/^Poďakovanie|^Abstract:|^Key\s+Words:/i.test(raw)) return null;

  const yearMatch = raw.match(/\b((?:18|19|20)\d{2}[a-z]?)\b/i);
  if (!yearMatch || typeof yearMatch.index !== 'number') return null;
  const year = yearMatch[1];
  const pagesMatch = raw.match(/(?:\bs\.\s*|pp\.\s*|pages?\s*)?([0-9]+\s*[–-]\s*[0-9]+)(?:\.|$)/i);
  const pages = pagesMatch?.[1]?.replace(/\s+/g, '').replace(/-/g, '–') || null;

  let authorPart = '';
  let rest = '';
  const colonIndex = raw.indexOf(':');
  if (colonIndex > 0 && colonIndex < 260) {
    authorPart = raw.slice(0, colonIndex).trim();
    rest = raw.slice(colonIndex + 1).trim();
  } else {
    const noColon = raw.match(/^(.{8,220}?(?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.\s*){1,6})\s+(.+)$/);
    if (!noColon) return null;
    authorPart = noColon[1].trim();
    rest = noColon[2].trim();
  }

  const authors = parseReferenceAuthors(authorPart);
  if (!authors.length) return null;

  const yearIndexInRest = rest.search(/\b(?:18|19|20)\d{2}[a-z]?\b/i);
  if (yearIndexInRest < 0) return null;
  const beforeYear = rest.slice(0, yearIndexInRest).replace(/[,;\s]+$/, '').trim();
  const titleJournalMatch = beforeYear.match(/^(.+?)\.\s+(.+)$/);
  if (!titleJournalMatch) return null;

  const title = normalizeText(titleJournalMatch[1] || '').replace(/\.$/, '').trim();
  const journalAndVolume = normalizeText(titleJournalMatch[2] || '').replace(/[,;\s]+$/, '').trim();
  if (!title || title.length < 6 || !journalAndVolume) return null;

  const journalParts = journalAndVolume.split(',').map((part) => part.trim()).filter(Boolean);
  const volumeCandidate = journalParts.length > 1 ? journalParts[journalParts.length - 1] : null;
  const journal = expandJournalAbbreviation(journalParts.length > 1 ? journalParts.slice(0, -1).join(', ') : journalAndVolume);
  const volume = volumeCandidate && /^[0-9]+[A-Za-z]?$/.test(volumeCandidate) ? volumeCandidate : null;

  return {
    raw,
    authors,
    year,
    title,
    journal,
    volume,
    issue: null,
    pages,
    doi: extractDoi(raw),
    url: extractUrl(raw),
    sourceType: 'article',
    citationKey: buildCitationKey(authors, year),
    origin,
  };
}

function isSourceCompleteEnoughForSecondary(source: BibliographicCandidate) {
  const authors = cleanValidAuthors(source.authors || []);
  const title = normalizeText(source.title || '').trim();
  const year = normalizeText(source.year || '').trim();
  if (!authors.length || !year || !title) return false;
  if (/údaj je potrebné overiť|neuvedené|pôvodný záznam|autori:|citácie v texte|doi:|url:/i.test(title)) return false;
  if (/biotechnologica/i.test(authors.join(' ')) && authors.length === 1) return false;
  if (looksLikeRawOcrPage(source.raw || '')) return false;
  if (looksLikeIncompleteInitialCitation(source.raw || '')) return false;
  return Boolean(source.journal || source.pages || source.doi || source.url || looksLikeCompleteApaBibliography(source.raw || ''));
}

function citationToAccordingToLabel(citation: InTextCitation) {
  const authorText = normalizeText(citation.authorText || '').replace(/,\s*$/g, '').trim();
  if (!authorText || !citation.year) return '';
  return `${authorText} (${citation.year})`;
}

function citationMatchesSource(citation: InTextCitation, source: BibliographicCandidate) {
  const sourceKey = getSourceCitationKey(source);
  if (sourceKey && sourceKey === citation.key) return true;
  const sourceAuthors = cleanValidAuthors(source.authors || []);
  const citationAuthors = cleanValidAuthors(citation.authors || []);
  if (!sourceAuthors.length || !citationAuthors.length || !source.year || source.year !== citation.year) return false;
  const sourceFirst = normalizeCitationKeyPart(sourceAuthors[0].replace(/,.*/, ''));
  const citationFirst = normalizeCitationKeyPart(citationAuthors[0].replace(/,.*/, ''));
  return Boolean(sourceFirst && citationFirst && sourceFirst === citationFirst);
}

function detectSourceType(line: string): BibliographicCandidate['sourceType'] {
  const lower = line.toLowerCase();

  if (lower.includes('software') || lower.includes('jasp') || lower.includes('spss') || lower.includes('jamovi')) return 'software';
  if (/https?:\/\/|www\.|retrieved from|dostupné/i.test(lower)) return 'web';
  if (/doi|journal|vol\.|volume|issue|časopis|štúdia|article/i.test(lower)) return 'article';
  if (/vydavateľ|publisher|isbn|monografia|book|press/i.test(lower)) return 'book';

  return 'unknown';
}

function extractDoi(line: string) {
  return line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i)?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractUrl(line: string) {
  return line.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i)?.[0]?.replace(/[.,;)]$/, '') || null;
}

function extractYear(line: string) {
  return (
    line.match(/\((18|19|20)\d{2}[a-z]?\)/i) ||
    line.match(/\b(18|19|20)\d{2}[a-z]?\b/i) ||
    line.match(/\bn\.d\.\b/i)
  )?.[0]?.replace(/[()]/g, '') || null;
}

function extractAuthors(line: string) {
  const beforeYear = line.split(/\((18|19|20)\d{2}[a-z]?\)|\b(18|19|20)\d{2}[a-z]?\b/i)[0] || '';
  const cleaned = beforeYear
    .replace(/\bet al\.?/gi, '')
    .replace(/\ba kol\.?/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-•\d.)\s]+/, '')
    .trim();

  const candidates = cleaned
    .split(/\s*(?:;|&|\ba\b|\band\b)\s*/i)
    .flatMap((part) => {
      if (/^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^,]{1,80},\s*[A-Z]/.test(part)) return [part.trim()];
      return part.split(/,\s*/).map((item) => item.trim());
    })
    .filter((part) => part.length >= 3 && part.length <= 120 && /[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(part))
    .filter((part) => !/^(in|from|retrieved|dostupné|available|vol|no|pp|pages|journal|university|press|publisher)$/i.test(part));

  return cleanValidAuthors(candidates).slice(0, 20);
}

function extractTitle(line: string) {
  let working = line.trim()
    .replace(/^[-•\d.)\s]+/, '')
    .replace(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi, '')
    .replace(/https?:\/\/[^\s)]+|www\.[^\s)]+/gi, '');

  const quoted = working.match(/"([^"]{5,180})"/) || working.match(/„([^“”]{5,180})“/) || working.match(/'([^']{5,180})'/);
  if (quoted?.[1]) return quoted[1].trim();

  const afterYear = working.split(/\((18|19|20)\d{2}[a-z]?\)|\b(18|19|20)\d{2}[a-z]?\b/i).pop();
  if (afterYear && afterYear.trim().length > 8) {
    return afterYear.replace(/^[).,\s:-]+/, '').split(/\.\s+/)[0].trim().slice(0, 220);
  }

  const parts = working.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1].slice(0, 220);

  return null;
}

function looksLikeBibliographicLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.length < 20 || trimmed.length > 1600) return false;
  if (looksLikeIncompleteInitialCitation(trimmed)) return false;

  const hasYear = /\b(18|19|20)\d{2}[a-z]?\b|\bn\.d\.\b/i.test(trimmed);
  const hasDoi = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(trimmed);
  const hasUrl = /https?:\/\/|www\./i.test(trimmed);
  const hasCitationWords = /publisher|journal|doi|isbn|vydavateľ|časopis|university|press|jasp|spss|software|available|dostupné|retrieved|vol\.|volume|issue|pages|pp\./i.test(trimmed);
  const hasAuthorPattern =
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+,\s*[A-Z]/.test(trimmed) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.' -]+\s+\([12]\d{3}\)/.test(trimmed);

  return hasDoi || hasUrl || (hasYear && (hasCitationWords || hasAuthorPattern));
}

function extractBibliographicCandidates(text: string, origin: SourceOrigin = 'attachment') {
  const cleaned = normalizeText(text);
  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
  const candidatesToCheck: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i];
    const next = lines[i + 1] || '';
    const next2 = lines[i + 2] || '';
    const next3 = lines[i + 3] || '';
    candidatesToCheck.push(current);
    if (current.length < 240 && next) candidatesToCheck.push(`${current} ${next}`.trim());
    if (current.length < 220 && next && next2) candidatesToCheck.push(`${current} ${next} ${next2}`.trim());
    if (current.length < 190 && next && next2 && next3) candidatesToCheck.push(`${current} ${next} ${next2} ${next3}`.trim());
  }

  const candidates: BibliographicCandidate[] = [];

  for (const line of candidatesToCheck) {
    const structured = parseStructuredReferenceLine(line, origin);
    if (structured) {
      candidates.push(structured);
      continue;
    }

    if (!looksLikeBibliographicLine(line)) continue;
    const authors = cleanValidAuthors(extractAuthors(line));
    const year = extractYear(line);
    const item: BibliographicCandidate = {
      raw: line.slice(0, 1000),
      authors,
      year,
      title: extractTitle(line),
      doi: extractDoi(line),
      url: extractUrl(line),
      sourceType: detectSourceType(line),
      citationKey: authors.length && year ? buildCitationKey(authors, year) : undefined,
      origin,
    };
    if (isSourceCompleteEnoughForSecondary(item) || item.doi || item.url) candidates.push(item);
  }

  const unique = new Map<string, BibliographicCandidate>();
  for (const item of candidates) {
    const key = getSourceCitationKey(item) || `${normalizeForSemanticMatch(item.raw).slice(0, 220)}-${item.doi || ''}-${item.url || ''}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function normalizeBibliographicCandidates(value: unknown): BibliographicCandidate[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => {
      const authors = cleanValidAuthors(
        Array.isArray(item?.authors)
          ? item.authors.map((author: unknown) => String(author || '').trim())
          : typeof item?.authors === 'string'
            ? item.authors.split(/,|;|\n/).map((author: string) => author.trim())
            : [],
      );
      const year = item?.year ? String(item.year) : null;

      return {
        raw: String(item?.raw || item?.citation || item?.text || '').trim(),
        authors,
        year,
        title: item?.title ? String(item.title) : null,
        doi: item?.doi ? String(item.doi) : null,
        url: item?.url ? String(item.url) : null,
        journal: item?.journal ? String(item.journal) : null,
        volume: item?.volume ? String(item.volume) : null,
        issue: item?.issue ? String(item.issue) : null,
        pages: item?.pages ? String(item.pages) : null,
        sourceType: ['book', 'article', 'web', 'software', 'unknown'].includes(item?.sourceType) ? item.sourceType : 'unknown',
        citationKey: item?.citationKey || (authors.length && year ? buildCitationKey(authors, year) : undefined),
        inTextCitations: Array.isArray(item?.inTextCitations) ? item.inTextCitations : [],
        occurrenceCount: typeof item?.occurrenceCount === 'number' ? item.occurrenceCount : 0,
        matchedFromText: Boolean(item?.matchedFromText),
        origin: item?.origin || 'attachment',
      } satisfies BibliographicCandidate;
    })
    .filter((item) => item.raw || item.authors.length || item.title || item.doi || item.url);
}

function mergeBibliographicCandidates(...groups: Array<BibliographicCandidate[] | undefined | null>) {
  const unique = new Map<string, BibliographicCandidate>();

  for (const group of groups) {
    for (const item of group || []) {
      const authors = cleanValidAuthors(Array.isArray(item.authors) ? item.authors : []);
      const year = item.year || null;
      const normalizedItem: BibliographicCandidate = {
        raw: String(item.raw || '').trim(),
        authors,
        year,
        title: item.title || null,
        doi: item.doi || null,
        url: item.url || null,
        journal: item.journal || null,
        volume: item.volume || null,
        issue: item.issue || null,
        pages: item.pages || null,
        sourceType: item.sourceType || 'unknown',
        citationKey: item.citationKey || (authors.length && year ? buildCitationKey(authors, year) : undefined),
        inTextCitations: Array.isArray(item.inTextCitations) ? item.inTextCitations : [],
        occurrenceCount: item.occurrenceCount || 0,
        matchedFromText: Boolean(item.matchedFromText),
        origin: item.origin || 'unknown',
        sourceDocumentName: item.sourceDocumentName || null,
        citedAccordingTo: item.citedAccordingTo || null,
      };

      const key =
        getSourceCitationKey(normalizedItem) ||
        normalizedItem.doi?.toLowerCase() ||
        `${normalizeForSemanticMatch(normalizedItem.raw).slice(0, 220)}-${normalizedItem.url || ''}-${normalizeForSemanticMatch(normalizedItem.title || '').slice(0, 120)}-${normalizedItem.year || ''}`;

      const existing = unique.get(key);

      if (!existing) {
        unique.set(key, normalizedItem);
        continue;
      }

      unique.set(key, {
        ...existing,
        raw: existing.raw.length >= normalizedItem.raw.length ? existing.raw : normalizedItem.raw,
        authors: cleanValidAuthors([...existing.authors, ...normalizedItem.authors]),
        year: existing.year || normalizedItem.year,
        title: existing.title || normalizedItem.title,
        doi: existing.doi || normalizedItem.doi,
        url: existing.url || normalizedItem.url,
        journal: existing.journal || normalizedItem.journal,
        volume: existing.volume || normalizedItem.volume,
        issue: existing.issue || normalizedItem.issue,
        pages: existing.pages || normalizedItem.pages,
        sourceType: existing.sourceType !== 'unknown' ? existing.sourceType : normalizedItem.sourceType,
        citationKey: existing.citationKey || normalizedItem.citationKey,
        inTextCitations: [...(existing.inTextCitations || []), ...(normalizedItem.inTextCitations || [])],
        occurrenceCount: (existing.occurrenceCount || 0) + (normalizedItem.occurrenceCount || 0),
        matchedFromText: existing.matchedFromText || normalizedItem.matchedFromText,
        origin: existing.origin || normalizedItem.origin,
        sourceDocumentName: existing.sourceDocumentName || normalizedItem.sourceDocumentName || null,
        citedAccordingTo: existing.citedAccordingTo || normalizedItem.citedAccordingTo || null,
      });
    }
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function buildLiteratureFromInTextCitations(citations: InTextCitation[], origin: SourceOrigin = 'citation') {
  return citations
    .map((citation) => {
      const authors = cleanValidAuthors(citation.authors || []);
      return {
        raw: citation.raw,
        authors,
        year: citation.year,
        title: null,
        doi: null,
        url: null,
        sourceType: 'unknown',
        citationKey: buildCitationKey(authors, citation.year),
        inTextCitations: [citation],
        occurrenceCount: citation.count,
        matchedFromText: true,
        origin,
      } satisfies BibliographicCandidate;
    })
    .filter((item) => item.authors.length && item.year);
}

function extractAuthorsFromCandidates(candidates: BibliographicCandidate[]) {
  return cleanValidAuthors(candidates.flatMap((item) => item.authors || []));
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) return 'Neboli automaticky detegované žiadne bibliografické záznamy.';

  return candidates
    .slice(0, maxDetectedSourcesPerAttachment)
    .map((item, index) => {
      const citationInfo = item.inTextCitations?.length
        ? `\nCitácie v texte: ${item.inTextCitations.map((citation) => citation.raw).join('; ')}\nPočet výskytov v texte: ${item.occurrenceCount || item.inTextCitations.length}`
        : '';

      return `${index + 1}. Pôvodný záznam:\n${item.raw || 'neuvedené'}\n\nAutori: ${cleanValidAuthors(item.authors || []).join(', ') || 'neuvedené alebo potrebné overiť'}\nRok: ${item.year || 'údaj je potrebné overiť'}\nNázov publikácie / zdroja: ${item.title || 'údaj je potrebné overiť'}\nČasopis / zdroj: ${item.journal || 'neuvedené'}\nTyp zdroja: ${item.sourceType}\nDOI: ${item.doi || 'neuvedené'}\nURL: ${item.url || 'neuvedené'}${citationInfo}`;
    })
    .join('\n\n');
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
    normalized.includes('detegovane zdroje') ||
    normalized.includes('povodny zaznam') ||
    normalized.includes('doi neuvedene') ||
    normalized.includes('url neuvedene') ||
    normalized.length > 1200
  );
}

function candidateHasUsableData(source: BibliographicCandidate) {
  const raw = normalizeText(source.raw || '');

  if (looksLikeRawOcrPage(raw)) return false;
  if (looksLikeIncompleteInitialCitation(raw)) return false;

  const authors = cleanValidAuthors(source.authors || []);

  return Boolean(
    raw.trim() ||
      authors.length ||
      source.year ||
      source.title ||
      source.doi ||
      source.url,
  );
}


function splitNameForApa(author: string) {
  const cleaned = normalizeAuthorName(author);
  if (!cleaned || isInvalidAuthorFragment(cleaned)) return '';

  if (cleaned.includes(',')) {
    const [family, given] = cleaned.split(',').map((part) => part.trim());
    const initials = (given || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => `${name.charAt(0).toUpperCase()}.`)
      .join(' ');
    return initials ? `${family}, ${initials}` : family;
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];

  const family = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map((name) => `${name.charAt(0).toUpperCase()}.`).join(' ');
  return initials ? `${family}, ${initials}` : family;
}

function formatAuthorsApa(authors: string[]) {
  const formatted = cleanValidAuthors(authors).map(splitNameForApa).filter(Boolean);
  if (!formatted.length) return '';
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  if (formatted.length <= 20) return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
  return `${formatted.slice(0, 19).join(', ')}, ... ${formatted[formatted.length - 1]}`;
}

function formatCandidateAsApaLike(source: BibliographicCandidate) {
  const authors = formatAuthorsApa(source.authors || []);
  const year = source.year || '';
  const title = normalizeText(source.title || '').replace(/\.$/, '').trim();
  if (!authors || !year || !title) return '';

  let output = `${authors} (${year}). ${title}.`;

  const journal = normalizeText(source.journal || '').replace(/\.$/, '').trim();
  const volume = normalizeText(source.volume || '').replace(/\.$/, '').trim();
  const issue = normalizeText(source.issue || '').replace(/\.$/, '').trim();
  const pages = normalizeText(source.pages || '').replace(/--/g, '–').replace(/\.$/, '').trim();

  if (journal) {
    output += ` ${journal}`;
    if (volume && issue) output += `, ${volume}(${issue})`;
    else if (volume) output += `, ${volume}`;
    if (pages) output += `, ${pages}`;
    output += '.';
  }

  if (source.doi) output += ` https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()}`;
  else if (source.url) output += ` ${source.url}`;

  return output.replace(/\s+/g, ' ').trim();
}


function normalizeDocumentNameForCitation(value: string) {
  return normalizeText(value || '')
    .replace(/\.(pdf|docx?|txt|rtf|odt|md|csv|xlsx?|pptx?|gz)$/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildShortCitationLabelFromAuthors(authors: string[], year: string | null) {
  const cleanedAuthors = cleanValidAuthors(authors || []);
  if (!cleanedAuthors.length || !year) return '';

  const firstAuthor = cleanedAuthors[0]
    .replace(/,.*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!firstAuthor || isInvalidAuthorFragment(firstAuthor)) return '';

  return cleanedAuthors.length > 1 ? `${firstAuthor} et al. (${year})` : `${firstAuthor} (${year})`;
}

function buildCitedAccordingToLabel(source: BibliographicCandidate) {
  const explicit = normalizeText(source.citedAccordingTo || '').replace(/\s+/g, ' ').trim();
  if (explicit) return explicit;

  const documentName = normalizeDocumentNameForCitation(source.sourceDocumentName || '');
  if (documentName) return documentName;

  return '';
}

function appendCitedAccordingToIfNeeded({
  formatted,
  source,
}: {
  formatted: string;
  source: BibliographicCandidate;
}) {
  const cleaned = normalizeText(formatted).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (/\bCit\.\s+podľa\b/i.test(cleaned)) return cleaned;

  const needsAccordingTo =
    source.origin === 'attachment' ||
    source.origin === 'project' ||
    source.origin === 'citation' ||
    Boolean(source.sourceDocumentName) ||
    Boolean(source.citedAccordingTo);

  if (!needsAccordingTo) return cleaned;

  const label = buildCitedAccordingToLabel(source);
  if (!label) return cleaned;

  return `${cleaned.replace(/\s*$/, '')} Cit. podľa ${label}.`;
}

function looksLikeCompleteApaBibliography(value: string) {
  const cleaned = normalizeText(value).replace(/\s+/g, ' ').trim();
  return /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^\n]{2,220}\((18|19|20)\d{2}[a-z]?\)\.[^\n]{8,}\.[^\n]{4,},\s*\d+/i.test(cleaned) ||
    /^[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^\n]{2,220}\((18|19|20)\d{2}[a-z]?\)\.[^\n]{8,}\./i.test(cleaned);
}

function formatCandidateForFinalLiterature(source: BibliographicCandidate) {
  const raw = normalizeText(source.raw || '').replace(/\s+/g, ' ').trim();
  const authors = cleanValidAuthors(source.authors || []);

  if (looksLikeRawOcrPage(raw)) return '';
  if (looksLikeIncompleteInitialCitation(raw)) return '';

  if (isSourceCompleteEnoughForSecondary({ ...source, authors })) {
    const structured = formatCandidateAsApaLike({
      ...source,
      authors,
    });

    if (structured) {
      return appendCitedAccordingToIfNeeded({ formatted: structured, source });
    }
  }

  const rawLooksUsable =
    raw.length >= 20 &&
    raw.length <= 900 &&
    looksLikeCompleteApaBibliography(raw) &&
    !raw.toLowerCase().includes('údaj je potrebné overiť') &&
    !raw.toLowerCase().includes('neuvedené') &&
    !raw.toLowerCase().includes('autor je potrebné overiť') &&
    !raw.toLowerCase().includes('rok chýba');

  if (rawLooksUsable) return appendCitedAccordingToIfNeeded({ formatted: raw, source });
  return '';
}

function removeIncompleteSourceLines(text: string) {
  return normalizeText(text)
    .split('\n')
    .filter((line) => {
      const current = line.trim();
      if (!current) return true;
      if (/^\d+\.\s*[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*\((18|19|20)\d{2}/i.test(current)) return false;
      if (/údaj je potrebné overiť|Autor je potrebné overiť|Rok chýba|Neúplná citácia/i.test(current)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function getPrimarySecondaryHeadingPositions(text: string) {
  const output = normalizeText(text);
  const positions: Array<{
    index: number;
    heading: 'primary' | 'secondary';
    lineStart: number;
  }> = [];

  // Zachytáva aj chybný prípad, keď model napojí ďalší nadpis do posledného riadku:
  // "... Cit. podľa dokumentu.pdf. Primárne zdroje".
  const headingRegex = /(^|\n|[.!?]\s+)(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje)\s*(?=\n|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(output)) !== null) {
    const prefix = match[1] || '';
    const rawHeading = normalizeForSemanticMatch(match[2] || '');
    const headingIndex = (match.index || 0) + prefix.length;
    const lineStart = output.lastIndexOf('\n', headingIndex) + 1;

    positions.push({
      index: headingIndex,
      lineStart,
      heading: rawHeading.includes('primarne') ? 'primary' : 'secondary',
    });
  }

  return positions.sort((a, b) => a.index - b.index);
}

function outputAlreadyContainsPrimaryAndSecondarySources(text: string) {
  const positions = getPrimarySecondaryHeadingPositions(text);
  return positions.some((item) => item.heading === 'primary') && positions.some((item) => item.heading === 'secondary');
}

function cutEverythingAfterSecondSourceBlock(text: string) {
  const output = normalizeText(text);
  const positions = getPrimarySecondaryHeadingPositions(output);

  const firstPrimary = positions.find((item) => item.heading === 'primary');
  if (!firstPrimary) return output;

  const firstSecondary = positions.find(
    (item) => item.heading === 'secondary' && item.index > firstPrimary.index,
  );
  if (!firstSecondary) return output;

  const duplicateHeading = positions.find(
    (item) => item.index > firstSecondary.index && (item.heading === 'primary' || item.heading === 'secondary'),
  );

  if (!duplicateHeading) return output;

  // Ak je duplicitný nadpis nalepený za bodkou v tom istom riadku, režeme presne od nadpisu.
  // Ak je na samostatnom riadku, režeme od začiatku riadka, aby nezostal prázdny alebo poškodený riadok.
  const cutIndex = duplicateHeading.lineStart < duplicateHeading.index
    ? duplicateHeading.index
    : duplicateHeading.lineStart;

  return output.slice(0, cutIndex).trim();
}

function removeDuplicatePrimarySecondarySourceBlocks(text: string) {
  let output = normalizeText(text);

  // Najprv odstráni opakované celé bloky Primárne/Sekundárne zdroje.
  output = cutEverythingAfterSecondSourceBlock(output);

  // Potom odstráni prípadné zvyškové duplicitné nadpisy, ak ich model vložil bez správnych odriadkovaní.
  const positions = getPrimarySecondaryHeadingPositions(output);
  const primaryPositions = positions.filter((item) => item.heading === 'primary');
  const secondaryPositions = positions.filter((item) => item.heading === 'secondary');

  const duplicatePrimary = primaryPositions[1]?.index;
  const duplicateSecondary = secondaryPositions[1]?.index;
  const cutIndex = Math.min(
    duplicatePrimary ?? Number.POSITIVE_INFINITY,
    duplicateSecondary ?? Number.POSITIVE_INFINITY,
  );

  if (Number.isFinite(cutIndex) && cutIndex > 0) {
    output = output.slice(0, cutIndex).trim();
  }

  return output;
}

function removeBrokenSourceGarbageLines(text: string) {
  return normalizeText(text)
    .split('\n')
    .filter((line) => {
      const current = line.trim();
      if (!current) return true;

      // Odstraňuje OCR/parsovacie nezmysly, ktoré sa objavovali ako duplicitné zdroje.
      if (/Autor prílohy\s*\/\s*zistení autori:\s*(DOI:|URL:|Citácie v texte:|DETEGOVANÉ ZDROJE|Strana\s+\d+|PAGE\s+\d+|roku\.?$)/i.test(current)) return false;
      if (/^\d+\.\s*\([^)]*\bS\.\s*\d+\.?\s*N\.\s*B\./i.test(current)) return false;
      if (/^\d+\.\s*\([^)]*D\.\s*N\.\s*U\.\s*N\.\s*C\.\s*V\.\s*T\./i.test(current)) return false;
      if (/^\d+\.\s*DETEGOVANÉ\s+ZDROJE/i.test(current)) return false;
      if (/^\d+\.\s*\(?(CLARK|DELLAPORTA|EGLINTON|EVANS|GIBSON|GUNKEL|KANEKO|KIHARA|PARIS),\s*D\.\s*N\.\s*U/i.test(current)) return false;
      if (/^\d+\.\s*\(,\s*N\.\s*B\./i.test(current)) return false;

      return true;
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function finalizeSourceSections(text: string) {
  return removeBrokenSourceGarbageLines(
    removeDuplicatePrimarySecondarySourceBlocks(removeIncompleteSourceLines(text)),
  );
}

function normalizeAttachmentDocumentName(value: string) {
  return normalizeText(value || '')
    .replace(/\.extracted\.txt\.gz$/i, '')
    .replace(/\.failed-metadata\.txt\.gz$/i, '')
    .replace(/\.gz$/i, '')
    .replace(/\s*\(\d+\)\s*(?=\.pdf$|\.docx$|\.doc$|\.txt$|$)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAttachmentTitleFromFileName(value: string) {
  return normalizeAttachmentDocumentName(value)
    .replace(/\.(pdf|docx?|txt|rtf|odt|md|csv|xlsx?|pptx?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanupPossibleAttachmentAuthor(value: string) {
  let output = normalizeText(value || '')
    .replace(/\bSTRANA\s+\d+\b/gi, ' ')
    .replace(/\bPAGE\s+\d+\b/gi, ' ')
    .replace(/\bDETEGOVANÉ\s+ZDROJE[\s\S]*$/gi, ' ')
    .replace(/\bLiteratúra\b[\s\S]*$/gi, ' ')
    .replace(/\bLiteratura\b[\s\S]*$/gi, ' ')
    .replace(/\bReferences\b[\s\S]*$/gi, ' ')
    .replace(/\bBibliografia\b[\s\S]*$/gi, ' ')
    .replace(/\bDOI\s*:\s*[^,;.]+/gi, ' ')
    .replace(/\bURL\s*:\s*[^,;.]+/gi, ' ')
    .replace(/\bCitácie\s+v\s+texte\s*:/gi, ' ')
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  output = output
    .split(/\s*,\s*|\s*;\s*|\s+&\s+|\s+and\s+/i)
    .map((part) => normalizeAuthorName(part))
    .filter((part) => part.length >= 3)
    .filter((part) => !isInvalidAuthorFragment(part))
    .filter((part) => !/^(literatúra|literatura|references|bibliografia|abstract|abstrakt|súhrn|summary|keywords|kľúčové slová)$/i.test(part))
    .filter((part) => !/\b(?:journal|volume|issue|pages|doi|url|publisher|university|press|strana|page)\b/i.test(part))
    .join(', ');

  return normalizeText(output).replace(/\s+/g, ' ').trim();
}

function looksLikeAuthorHeaderLine(line: string) {
  const cleaned = normalizeText(line).replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  if (cleaned.length < 4 || cleaned.length > 260) return false;
  if (/\b(?:abstract|abstrakt|súhrn|summary|keywords|kľúčové slová|úvod|introduction|literatúra|literatura|references|bibliografia)\b/i.test(cleaned)) return false;
  if (/\b(?:journal|volume|issue|pages|doi|url|publisher|university|press)\b/i.test(cleaned)) return false;
  if (/\b(?:18|19|20)\d{2}\b/.test(cleaned) && cleaned.length > 80) return false;

  const surnameInitials = /\b[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]{2,},\s*(?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.\s*){1,4}\b/.test(cleaned);
  const initialsSurname = /\b(?:[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.\s*){1,4}[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][A-Za-zÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž.'-]{2,}\b/.test(cleaned);
  const multipleNames = cleaned.split(/\s*,\s*|\s+&\s+|\s+and\s+/i).filter((part) => /[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž]{2,}/.test(part)).length >= 1;

  return surnameInitials || initialsSurname || multipleNames;
}

function extractAttachmentAuthorsFromFirstPages(file: ExtractedAttachment) {
  const title = normalizeAttachmentTitleFromFileName(file.originalName || file.name || file.preparedName || '');
  const titleNorm = normalizeForSemanticMatch(title);
  const text = normalizeText(file.extractedText || file.extractedPreview || '');
  if (!text.trim()) return [];

  const headerText = text
    .split(/\n\s*(Literatúra|Literatura|References|Bibliografia|Zoznam použitej literatúry)\s*\n/i)[0]
    .split(/\n\s*(Abstract|Abstrakt|Súhrn|Summary|Keywords|Kľúčové slová|Úvod|Introduction)\s*\n/i)[0]
    .slice(0, 5000);

  const lines = headerText
    .split('\n')
    .map((line) => normalizeText(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !/^STRANA\s+\d+$/i.test(line))
    .filter((line) => !/^PAGE\s+\d+$/i.test(line));

  const candidates: string[] = [];
  const titleLineIndexes: number[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const lineNorm = normalizeForSemanticMatch(lines[i]);
    if (titleNorm && lineNorm.includes(titleNorm.slice(0, Math.min(titleNorm.length, 35)))) {
      titleLineIndexes.push(i);
    }
  }

  const allowedIndexes = new Set<number>();
  for (const index of titleLineIndexes) {
    for (let offset = -3; offset <= 5; offset += 1) allowedIndexes.add(index + offset);
  }

  if (!allowedIndexes.size) {
    for (let i = 0; i < Math.min(lines.length, 18); i += 1) allowedIndexes.add(i);
  }

  for (const index of Array.from(allowedIndexes).sort((a, b) => a - b)) {
    const line = lines[index];
    if (!line || !looksLikeAuthorHeaderLine(line)) continue;
    candidates.push(line);
  }

  return uniqueArray(
    candidates
      .map((candidate) => cleanupPossibleAttachmentAuthor(candidate))
      .flatMap((candidate) => candidate.split(/\s*,\s*(?=[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záäčďéíĺľňóôŕšťúýž])/))
      .map((candidate) => cleanupPossibleAttachmentAuthor(candidate))
      .filter(Boolean)
      .filter((candidate) => candidate.length >= 3 && candidate.length <= 120),
  ).slice(0, 8);
}

function formatPrimaryDocumentSourceLine({
  documentName,
  authors,
}: {
  documentName: string;
  authors?: unknown;
}) {
  const safeDocumentName = normalizeAttachmentDocumentName(documentName);

  const safeAuthors = cleanValidAuthors(authors)
    .filter((author) => !looksLikeRawOcrPage(author))
    .filter(
      (author) =>
        !/^(biotechnologica|nova biotechnologica|literatúra|literatura|references|abstract|abstrakt)$/i.test(
          author,
        ),
    )
    .slice(0, 8);

  if (!safeDocumentName) return '';

  return safeAuthors.length
    ? `${safeDocumentName}. Autor prílohy / zistení autori prílohy: ${safeAuthors.join(
        ', ',
      )}.`
    : `${safeDocumentName}. Autor prílohy / zistení autori prílohy: nezistené z extrahovaného textu.`;
}

function buildPrimaryDocumentSources({
  detectedSourcesForOutput,
  extractedFiles,
  attachmentWasRelevant = true,
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  attachmentWasRelevant?: boolean;
}) {
  // PRIMÁRNY ZDROJ = dokument/príloha ako celok + autor/autori samotnej prílohy, ak sa dajú
  // bezpečne zistiť z titulnej/úvodnej časti. Nie je to zoznam autorov citovaných v literatúre.
  // Funkcia zámerne nevracia [] iba preto, že automatická relevancia vyšla slabo; ak systém
  // z prílohy vyťažil citácie alebo názov dokumentu, primárny zdroj sa musí ukázať.
  const byDocument = new Map<string, { documentName: string; authors: string[] }>();

  for (const file of extractedFiles) {
    const documentName = normalizeAttachmentDocumentName(
      file.originalName || file.name || file.preparedName || '',
    );
    if (!documentName || looksLikeRawOcrPage(documentName)) continue;

    const key = normalizeForSemanticMatch(documentName);
    if (!key) continue;

    const headerAuthors = extractAttachmentAuthorsFromFirstPages(file);
    const existing = byDocument.get(key);

    byDocument.set(key, {
      documentName,
      authors: cleanValidAuthors([...(existing?.authors || []), ...headerAuthors]),
    });
  }

  for (const source of detectedSourcesForOutput) {
    const documentName = normalizeAttachmentDocumentName(source.sourceDocumentName || '');
    if (!documentName || looksLikeRawOcrPage(documentName)) continue;

    const key = normalizeForSemanticMatch(documentName);
    if (!key) continue;

    const existing = byDocument.get(key);

    // Authors from BibliographicCandidate are usually secondary/reference authors, so use them
    // only when we do not have extractedFiles for this document and the source looks like the
    // article itself. This prevents Clark, Dellaporta, etc. from being repeated as attachment authors.
    const mayUseSourceAuthors =
      !existing?.authors?.length &&
      source.origin !== 'citation' &&
      source.matchedFromText !== true &&
      Boolean(source.title) &&
      normalizeForSemanticMatch(documentName).includes(
        normalizeForSemanticMatch(String(source.title || '')).slice(0, 24),
      );

    byDocument.set(key, {
      documentName: existing?.documentName || documentName,
      authors: cleanValidAuthors([
        ...(existing?.authors || []),
        ...(mayUseSourceAuthors ? source.authors || [] : []),
      ]),
    });
  }

  if (!attachmentWasRelevant && byDocument.size === 0) return [];

  return Array.from(byDocument.values())
    .map(formatPrimaryDocumentSourceLine)
    .filter(Boolean)
    .slice(0, maxFinalSourcesInOutput);
}

function normalizeCitationIdentityForOutput(value: string) {
  return normalizeForSemanticMatch(value)
    .replace(/\bet\s+al\b/g, '')
    .replace(/\ba\s+kol\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function secondaryLineAlreadyRepresentsCitation(line: string, citation: InTextCitation) {
  const normalizedLine = normalizeCitationIdentityForOutput(line);
  const citationAuthors = cleanValidAuthors(citation.authors || []);
  const authorNeedles = uniqueArray([
    citation.authorText,
    ...citationAuthors,
    ...citationAuthors.map((author) => author.replace(/,.*/, '').trim()),
  ])
    .map(normalizeCitationIdentityForOutput)
    .filter(Boolean);

  if (!citation.year || !normalizedLine.includes(String(citation.year).toLowerCase())) return false;
  return authorNeedles.some((needle) => needle.length >= 3 && normalizedLine.includes(needle));
}

function sourceHasCompleteBibliographicForm(source: BibliographicCandidate) {
  return Boolean(formatCandidateForFinalLiterature(source));
}

function scoreSourceMatchForCitation(source: BibliographicCandidate, citation: InTextCitation) {
  let score = 0;

  if (citationMatchesSource(citation, source)) score += 100;
  if (sourceHasCompleteBibliographicForm(source)) score += 80;
  if (isSourceCompleteEnoughForSecondary(source)) score += 60;
  if (source.origin === 'attachment' || source.origin === 'project') score += 25;
  if (source.sourceDocumentName) score += 10;
  if (source.pages) score += 8;
  if (source.journal) score += 8;
  if (source.doi) score += 8;
  if (source.title) score += 5;
  if ((source.raw || '').length > 80) score += 3;

  return score;
}

function findAnySourceForCitation({
  citation,
  sources,
}: {
  citation: InTextCitation;
  sources: BibliographicCandidate[];
}) {
  const allSources = mergeBibliographicCandidates(sources).filter(candidateHasUsableData);

  const strictMatches = allSources.filter((source) => citationMatchesSource(citation, source));
  if (strictMatches.length) {
    return strictMatches.sort(
      (a, b) => scoreSourceMatchForCitation(b, citation) - scoreSourceMatchForCitation(a, citation),
    )[0];
  }

  const citationAuthors = cleanValidAuthors(citation.authors || []);
  const citationFirst = normalizeCitationKeyPart(
    citationAuthors[0]?.replace(/,.*/, '') || citation.authorText || '',
  );

  const looseMatches = allSources.filter((source) => {
    const haystack = normalizeCitationKeyPart(
      [source.raw, source.title, source.authors?.join(' '), source.year]
        .filter(Boolean)
        .join(' '),
    );

    if (!citation.year || !haystack.includes(String(citation.year))) return false;
    return Boolean(citationFirst && haystack.includes(citationFirst));
  });

  if (looseMatches.length) {
    return looseMatches.sort(
      (a, b) => scoreSourceMatchForCitation(b, citation) - scoreSourceMatchForCitation(a, citation),
    )[0];
  }

  return null;
}

function formatCitationAsSecondaryFallback({
  citation,
  detectedSourcesForOutput,
}: {
  citation: InTextCitation;
  detectedSourcesForOutput: BibliographicCandidate[];
}) {
  const matched = findAnySourceForCitation({ citation, sources: detectedSourcesForOutput });

  if (matched) {
    const formatted = formatCandidateForFinalLiterature({
      ...matched,
      matchedFromText: true,
      inTextCitations: [...(matched.inTextCitations || []), citation],
      citedAccordingTo: matched.citedAccordingTo || matched.sourceDocumentName || null,
    });

    if (formatted) return formatted;
  }

  const authors = cleanValidAuthors(citation.authors || []);
  const authorText = authors.length ? authors.join(', ') : normalizeText(citation.authorText || 'Autor neuvedený');
  const usedAs = citation.raw || `(${citation.authorText}, ${citation.year})`;
  const accordingTo = matched?.citedAccordingTo || matched?.sourceDocumentName || '';

  const base = `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z použitej prílohy, ale úplný bibliografický riadok sa z extrahovaného textu nepodarilo bezpečne zostaviť.`;
  return accordingTo ? `${base} Cit. podľa ${accordingTo}.` : base;
}

function completeSecondarySourcesWithEveryInTextCitation({
  secondarySources,
  citationsFromGeneratedText,
  detectedSourcesForOutput,
}: {
  secondarySources: string[];
  citationsFromGeneratedText: InTextCitation[];
  detectedSourcesForOutput: BibliographicCandidate[];
}) {
  const completed = [...secondarySources];

  for (const citation of citationsFromGeneratedText) {
    const alreadyPresent = completed.some((line) => secondaryLineAlreadyRepresentsCitation(line, citation));
    if (alreadyPresent) continue;

    const fallback = formatCitationAsSecondaryFallback({ citation, detectedSourcesForOutput });
    if (fallback) completed.push(fallback);
  }

  return completed;
}

function buildSecondaryLiteratureFromUsedCitations({
  detectedSourcesForOutput,
  generatedText,
  externalSources = [],
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  generatedText: string;
  externalSources?: VerifiedSource[];
}) {
  const citationsFromGeneratedText = extractInTextCitations(generatedText);
  const detectedSources = mergeBibliographicCandidates(detectedSourcesForOutput)
    .filter(candidateHasUsableData)
    .filter(isSourceCompleteEnoughForSecondary)
    .filter((source) => !looksLikeRawOcrPage(source.raw || ''))
    .filter((source) => !looksLikeIncompleteInitialCitation(source.raw || ''));

  const accordingToCandidates = citationsFromGeneratedText
    .slice()
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map(citationToAccordingToLabel)
    .filter(Boolean);

  const secondary: string[] = [];

  for (const citation of citationsFromGeneratedText) {
    const matched = detectedSources.find((source) => citationMatchesSource(citation, source));
    if (matched) {
      const ownAccordingTo = citationToAccordingToLabel(citation);
      const accordingTo = accordingToCandidates.find((label) => label && label !== ownAccordingTo) || matched.citedAccordingTo || matched.sourceDocumentName || null;
      const formatted = formatCandidateForFinalLiterature({
        ...matched,
        matchedFromText: true,
        inTextCitations: [...(matched.inTextCitations || []), citation],
        citedAccordingTo: accordingTo,
      });
      if (formatted) secondary.push(formatted);
      continue;
    }

    const externalMatched = externalSources.find((source) => source.citationText === citation.raw);
    if (externalMatched?.bibliographyText) secondary.push(externalMatched.bibliographyText);
  }

  for (const source of detectedSources) {
    const firstAuthor = cleanValidAuthors(source.authors || [])[0]?.replace(/,.*/, '').trim();
    if (!firstAuthor || !source.year) continue;
    const safeFirstAuthor = firstAuthor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${safeFirstAuthor}[^.]{0,120}${source.year}`, 'i');
    if (!pattern.test(generatedText)) continue;
    const accordingTo = accordingToCandidates.find((label) => !label.toLowerCase().startsWith(firstAuthor.toLowerCase())) || source.citedAccordingTo || source.sourceDocumentName || null;
    const formatted = formatCandidateForFinalLiterature({ ...source, matchedFromText: true, citedAccordingTo: accordingTo });
    if (formatted) secondary.push(formatted);
  }

  for (const verified of externalSources) {
    if (verified.citationText && generatedText.includes(verified.citationText) && verified.bibliographyText) secondary.push(verified.bibliographyText);
  }

  const completedSecondary = completeSecondarySourcesWithEveryInTextCitation({
    secondarySources: secondary,
    citationsFromGeneratedText,
    detectedSourcesForOutput,
  });

  return uniqueArray(
    completedSecondary
      .map((item) => normalizeText(item).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((item) => !looksLikeIncompleteInitialCitation(item))
      .filter((item) => !/Autori:\s*|Pôvodný záznam|DOI:\s*neuvedené|URL:\s*neuvedené/i.test(item)),
  ).slice(0, maxFinalSourcesInOutput);
}

function removeExistingSourceTail(text: string) {
  const cleaned = normalizeText(text);
  const match = cleaned.match(/\n\s*(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje|Použitá literatúra(?:\s+pre\s+kapitolu\s+\d+(?:\.\d+)*)?|Použitý zdroj\s+pre\s+kapitolu\s+\d+(?:\.\d+)*|Použité zdroje(?:\s+a\s+autori)?|Zdroje(?:\s+a\s+autori)?)\s*\n[\s\S]*$/i);
  if (match && typeof match.index === 'number') return cleaned.slice(0, match.index).trim();
  return cleaned;
}


function ensureOutputHasPrimarySecondarySources({
  text,
  detectedSourcesForOutput,
  extractedFiles,
  externalSources = [],
  attachmentWasRelevant = true,
}: {
  text: string;
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  externalSources?: VerifiedSource[];
  attachmentWasRelevant?: boolean;
}) {
  const cleanedText = normalizeText(text);
  const bodyWithoutSources = removeExistingSourceTail(cleanedText);

  const primaryDocuments = buildPrimaryDocumentSources({
    detectedSourcesForOutput,
    extractedFiles,
    attachmentWasRelevant,
  });

  const secondarySources = buildSecondaryLiteratureFromUsedCitations({
    detectedSourcesForOutput,
    generatedText: cleanedText,
    externalSources,
  });

  const primaryBlock = primaryDocuments.length
    ? primaryDocuments.map((item, index) => `${index + 1}. ${item}`).join('\n')
   : 'Vlastné odborné zdroje AI modelu použité pri generovaní textu podľa aktívneho profilu práce.';

  const secondaryBlock = secondarySources.length
    ? secondarySources.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené. V texte nebola nájdená žiadna citácia vo forme autor – rok.';

  const finalBlock = `Primárne zdroje\n\n${primaryBlock}\n\nSekundárne zdroje\n\n${secondaryBlock}`;

  return finalizeSourceSections(`${bodyWithoutSources}\n\n${finalBlock}`.trim());
}

function formatPrimaryAndSecondarySourcesOnly(candidates: BibliographicCandidate[]) {
  const unique = mergeBibliographicCandidates(candidates)
    .filter(candidateHasUsableData)
    .filter((source) => !looksLikeRawOcrPage(source.raw || ''))
    .filter((source) => !looksLikeIncompleteInitialCitation(source.raw || ''));

  const primaryDocuments = uniqueArray(
    unique
      .map((source) => source.sourceDocumentName || '')
      .filter(Boolean)
      .map((name) => normalizeText(name).replace(/\s+/g, ' ').trim()),
  );

  const secondary = unique;

  const primaryText = primaryDocuments.length
    ? primaryDocuments.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené.';

  const secondaryText = secondary.length
    ? secondary.map((item, index) => `${index + 1}. ${formatCandidateForFinalLiterature(item)}`).filter((line) => !/^\d+\.\s*$/.test(line)).join('\n')
    : 'Neuvedené.';

  return finalizeSourceSections(`Primárne zdroje\n\n${primaryText}\n\nSekundárne zdroje\n\n${secondaryText}`.trim());
}

// =====================================================
// EXTERNAL ACADEMIC SOURCES: SEMANTIC SCHOLAR + CROSSREF
// =====================================================

const semanticStopWords = new Set([
  'a', 'aj', 'ako', 'ale', 'alebo', 'ani', 'bez', 'bude', 'budu', 'by', 'bol', 'bola', 'bolo', 'boli', 'cez', 'co', 'do', 'ho', 'ich', 'je', 'jej', 'jemu', 'ju', 'k', 'ku', 'ma', 'mi', 'na', 'nad', 'nie', 'od', 'pre', 'pri', 's', 'sa', 'si', 'som', 'su', 'ta', 'tak', 'to', 'tu', 'uz', 'v', 'vo', 'z', 'za', 'ze', 'the', 'and', 'or', 'of', 'in', 'on', 'for', 'with', 'to', 'from', 'by', 'is', 'are', 'was', 'were', 'this', 'that', 'these', 'those', 'work', 'study', 'paper', 'chapter', 'source', 'sources', 'profile', 'text', 'document',
]);

function buildResearchQuery({ profile, userMessage }: { profile: SavedProfile | null; userMessage: string }) {
  const keywords = getKeywords(profile);
  const raw = [
    profile?.title,
    profile?.topic,
    profile?.field,
    profile?.goal,
    profile?.problem,
    profile?.methodology,
    profile?.researchQuestions,
    profile?.practicalPart,
    profile?.scientificContribution,
    profile?.sourcesRequirement,
    keywords.join(' '),
    userMessage,
  ].filter(Boolean).join(' ');

  return limitText(
    normalizeForSemanticMatch(raw)
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .filter((token) => !semanticStopWords.has(token))
      .filter((token) => !/^\d+$/.test(token))
      .slice(0, 28)
      .join(' '),
    maxExternalResearchQueryLength,
  );
}

function buildVerifiedInTextCitation(source: VerifiedSource) {
  const authors = cleanValidAuthors(source.authors || []);
  if (!authors.length || !source.year) return '';

  const firstAuthor = authors[0].replace(/,.*/, '').replace(/\s+/g, ' ').trim();
  if (!firstAuthor || isInvalidAuthorFragment(firstAuthor)) return '';

  return authors.length === 1 ? `(${firstAuthor}, ${source.year})` : `(${firstAuthor} et al., ${source.year})`;
}

function formatVerifiedSourceApa(source: {
  authors: string[];
  year: string;
  title: string;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
}) {
  const authors = formatAuthorsApa(source.authors || []);
  const year = String(source.year || '').trim();
  const title = normalizeText(source.title || '').replace(/\.$/, '').trim();
  if (!authors || !year || !title) return '';

  const journal = normalizeText(source.journal || '').replace(/\.$/, '').trim();
  const volume = normalizeText(source.volume || '').replace(/\.$/, '').trim();
  const issue = normalizeText(source.issue || '').replace(/\.$/, '').trim();
  const pages = normalizeText(source.pages || '').replace(/--/g, '–').replace(/\.$/, '').trim();

  let output = `${authors} (${year}). ${title}.`;
  if (journal) {
    output += ` ${journal}`;
    if (volume && issue) output += `, ${volume}(${issue})`;
    else if (volume) output += `, ${volume}`;
    if (pages) output += `, ${pages}`;
    output += '.';
  }

  if (source.doi) output += ` https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//i, '').trim()}`;
  else if (source.url) output += ` ${source.url}`;

  return output.replace(/\s+/g, ' ').trim();
}

function verifiedSourceToBibliographicCandidate(source: VerifiedSource): BibliographicCandidate {
  return {
    raw: source.bibliographyText,
    authors: source.authors,
    year: source.year,
    title: source.title,
    doi: source.doi || null,
    url: source.url || null,
    journal: source.journal || null,
    volume: source.volume || null,
    issue: source.issue || null,
    pages: source.pages || null,
    sourceType: 'article',
    citationKey: buildCitationKey(source.authors, source.year),
    matchedFromText: true,
    origin: source.origin,
  };
}

function normalizeVerifiedSourceKey(source: VerifiedSource) {
  return source.doi?.toLowerCase() || `${normalizeForSemanticMatch(source.title)}-${source.year}`;
}

async function searchSemanticScholarVerifiedSources(query: string): Promise<VerifiedSource[]> {
  if (!normalizeText(query) || query.length < 4) return [];

  try {
    const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(maxExternalVerifiedSources));
    url.searchParams.set('fields', 'paperId,title,year,authors,venue,url,externalIds,publicationVenue,publicationDate');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;

    const res = await fetch(url.toString(), { method: 'GET', headers, cache: 'no-store' });
    if (!res.ok) {
      console.error('SEMANTIC_SCHOLAR_SEARCH_ERROR:', res.status);
      return [];
    }

    const data = await res.json();

    return (Array.isArray(data?.data) ? data.data : [])
      .map((item: any): VerifiedSource | null => {
        const title = normalizeText(item?.title || '');
        const year = item?.year ? String(item.year) : '';
        const authors = Array.isArray(item?.authors) ? cleanValidAuthors(item.authors.map((author: any) => String(author?.name || '').trim())) : [];
        const journal = normalizeText(item?.publicationVenue?.name || item?.venue || '') || null;
        const doi = item?.externalIds?.DOI ? String(item.externalIds.DOI).trim() : null;
        const urlValue = item?.url ? String(item.url).trim() : null;

        if (!title || !year || !authors.length) return null;

        const source: VerifiedSource = {
          id: String(item?.paperId || doi || title),
          authors,
          year,
          title,
          journal,
          volume: null,
          issue: null,
          pages: null,
          doi,
          url: urlValue,
          citationText: '',
          bibliographyText: '',
          origin: 'semantic_scholar',
        };

        source.citationText = buildVerifiedInTextCitation(source);
        source.bibliographyText = formatVerifiedSourceApa(source);
        return source.citationText && source.bibliographyText ? source : null;
      })
      .filter(Boolean)
      .slice(0, maxExternalVerifiedSources) as VerifiedSource[];
  } catch (error) {
    console.error('SEMANTIC_SCHOLAR_SEARCH_FATAL_ERROR:', error);
    return [];
  }
}

async function searchCrossrefVerifiedSources(query: string): Promise<VerifiedSource[]> {
  if (!normalizeText(query) || query.length < 4) return [];

  try {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query.bibliographic', query);
    url.searchParams.set('rows', String(maxExternalVerifiedSources));
    url.searchParams.set('select', 'DOI,title,author,issued,container-title,URL,volume,issue,page,type,publisher');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'Zedpera/1.0 (mailto:tutka.peter@gmail.com)' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('CROSSREF_SEARCH_ERROR:', res.status);
      return [];
    }

    const data = await res.json();

    return (Array.isArray(data?.message?.items) ? data.message.items : [])
      .map((item: any): VerifiedSource | null => {
        const title = Array.isArray(item?.title) ? normalizeText(item.title[0] || '') : '';
        const authors = Array.isArray(item?.author)
          ? cleanValidAuthors(
              item.author.map((author: any) => {
                const family = String(author?.family || '').trim();
                const given = String(author?.given || '').trim();
                return family && given ? `${family}, ${given}` : family || given || '';
              }),
            )
          : [];
        const year = item?.issued?.['date-parts']?.[0]?.[0] ? String(item.issued['date-parts'][0][0]) : '';
        const journal = Array.isArray(item?.['container-title']) ? normalizeText(item['container-title'][0] || '') : '';
        const doi = item?.DOI ? String(item.DOI).trim() : null;
        const urlValue = item?.URL ? String(item.URL).trim() : null;
        const volume = item?.volume ? String(item.volume).trim() : null;
        const issue = item?.issue ? String(item.issue).trim() : null;
        const pages = item?.page ? String(item.page).replace(/--/g, '–').trim() : null;

        if (!title || !year || !authors.length) return null;

        const source: VerifiedSource = {
          id: String(doi || title),
          authors,
          year,
          title,
          journal,
          volume,
          issue,
          pages,
          doi,
          url: urlValue,
          citationText: '',
          bibliographyText: '',
          origin: 'crossref',
        };

        source.citationText = buildVerifiedInTextCitation(source);
        source.bibliographyText = formatVerifiedSourceApa(source);
        return source.citationText && source.bibliographyText ? source : null;
      })
      .filter(Boolean)
      .slice(0, maxExternalVerifiedSources) as VerifiedSource[];
  } catch (error) {
    console.error('CROSSREF_SEARCH_FATAL_ERROR:', error);
    return [];
  }
}

async function buildVerifiedSourcePack({
  profile,
  userMessage,
  shouldSearch,
}: {
  profile: SavedProfile | null;
  userMessage: string;
  shouldSearch: boolean;
}): Promise<ExternalResearchResult> {
  if (!shouldSearch) return { query: '', sources: [], status: 'skipped', message: 'Externé vyhľadanie akademických zdrojov nebolo potrebné.' };

  const query = buildResearchQuery({ profile, userMessage });
  if (!query) return { query: '', sources: [], status: 'failed', message: 'Nepodarilo sa zostaviť vyhľadávací dopyt zo zadania a profilu.' };

  const [crossrefSources, semanticSources] = await Promise.all([searchCrossrefVerifiedSources(query), searchSemanticScholarVerifiedSources(query)]);
  const merged = new Map<string, VerifiedSource>();

  for (const source of [...crossrefSources, ...semanticSources]) {
    const key = normalizeVerifiedSourceKey(source);
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, source);
      continue;
    }

    const better: VerifiedSource = {
      ...existing,
      journal: existing.journal || source.journal,
      volume: existing.volume || source.volume,
      issue: existing.issue || source.issue,
      pages: existing.pages || source.pages,
      doi: existing.doi || source.doi,
      url: existing.url || source.url,
    };
    better.citationText = buildVerifiedInTextCitation(better);
    better.bibliographyText = formatVerifiedSourceApa(better);
    merged.set(key, better);
  }

  const sources = Array.from(merged.values())
    .filter((source) => source.citationText && source.bibliographyText)
    .filter((source) => !source.bibliographyText.toLowerCase().includes('údaj je potrebné overiť'))
    .filter((source) => !looksLikeIncompleteInitialCitation(source.bibliographyText))
    .slice(0, maxExternalVerifiedSources);

  return {
    query,
    sources,
    status: sources.length ? 'used' : 'failed',
    message: sources.length ? `Boli nájdené overené externé akademické zdroje cez Semantic Scholar/Crossref. Počet: ${sources.length}.` : 'Nepodarilo sa nájsť použiteľné overené akademické zdroje.',
  };
}

// =====================================================
// FILE EXTRACTION
// =====================================================

const allowedAttachmentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.gz'];
const extractableAttachmentExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.rtf'];

function isGzipFile(file: File) {
  return (file.name || '').toLowerCase().endsWith('.gz') || file.type === 'application/gzip' || file.type === 'application/x-gzip';
}

function isAllowedAttachment(file: File) {
  const extension = getFileExtension(file.name);
  const effectiveExtension = getEffectiveExtension(file.name);
  return allowedAttachmentExtensions.includes(extension) || allowedAttachmentExtensions.includes(effectiveExtension);
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
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const gzip = isGzipFile(file);

  if (!gzip) {
    return {
      usableBuffer: originalBuffer,
      compressedSize: originalBuffer.length,
      decompressedSize: originalBuffer.length,
      wasDecompressed: false,
      compressionWithinLimit: originalBuffer.length <= maxCompressedFileSizeBytes,
      compressionStatus: originalBuffer.length <= maxCompressedFileSizeBytes ? 'Súbor nie je gzip, ale veľkosť je do 1 MB.' : 'Súbor nie je gzip a veľkosť je väčšia ako 1 MB.',
    };
  }

  const decompressed = safeGunzip(originalBuffer);
  return {
    usableBuffer: decompressed,
    compressedSize: originalBuffer.length,
    decompressedSize: decompressed.length,
    wasDecompressed: true,
    compressionWithinLimit: originalBuffer.length <= maxCompressedFileSizeBytes,
    compressionStatus: originalBuffer.length <= maxCompressedFileSizeBytes ? 'Komprimovaný súbor je do 1 MB a bol úspešne rozbalený.' : 'Komprimovaný súbor je väčší ako 1 MB, ale bol úspešne rozbalený.',
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
  return preparedFilesMetadata.find((item) => item.preparedName === fileName) || preparedFilesMetadata.find((item) => item.originalName === fileName) || null;
}

async function extractTextFromSingleFile(file: File, preparedFilesMetadata: PreparedFileMetadata[]): Promise<ExtractedAttachment> {
  const preparedMetadata = getPreparedMetadataForFile(file, preparedFilesMetadata);
  const preparedName = file.name || 'neznamy-subor';
  const originalName = preparedMetadata?.originalName || removeGzipSuffix(preparedName) || preparedName;
  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(preparedName);
  const effectiveExtension = getEffectiveExtension(preparedName);
  const label = getAttachmentLabel(preparedName);
  const gzip = isGzipFile(file);

  const metadataCandidates = normalizeBibliographicCandidates(preparedMetadata?.detectedSources || []);
  const metadataInTextCitations = Array.isArray(preparedMetadata?.inTextCitations) ? preparedMetadata.inTextCitations : [];
  const metadataCitationSources = buildLiteratureFromInTextCitations(metadataInTextCitations, 'citation');
  const metadataAuthors = Array.isArray(preparedMetadata?.detectedAuthors) ? cleanValidAuthors(preparedMetadata.detectedAuthors) : [];
  const metadataFormattedSources = preparedMetadata?.formattedSources || '';

  const base = {
    name: originalName,
    originalName,
    preparedName,
    type,
    size,
    extension,
    effectiveExtension,
    label,
    isGzip: gzip,
    warning: preparedMetadata?.warning || null,
    formattedSources: metadataFormattedSources,
  };

  if (!isAllowedAttachment(file)) {
    return {
      ...base,
      compressedSize: size,
      decompressedSize: 0,
      wasDecompressed: false,
      compressionWithinLimit: size <= maxCompressedFileSizeBytes,
      compressionStatus: 'Nepodporovaný formát súboru.',
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Nepodporovaný formát súboru.',
      error: 'Nepodporovaný formát súboru.',
      bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
      inTextCitations: metadataInTextCitations,
      detectedAuthors: metadataAuthors,
    };
  }

  try {
    const bufferInfo = await getUsableFileBuffer(file);

    if (!extractableAttachmentExtensions.includes(effectiveExtension)) {
      return {
        ...base,
        compressedSize: bufferInfo.compressedSize,
        decompressedSize: bufferInfo.decompressedSize,
        wasDecompressed: bufferInfo.wasDecompressed,
        compressionWithinLimit: bufferInfo.compressionWithinLimit,
        compressionStatus: bufferInfo.compressionStatus,
        extractedText: '',
        extractedChars: 0,
        extractedPreview: '',
        status: 'Súbor bol priložený, ale z tohto typu sa v tejto API trase neextrahuje text.',
        error: null,
        bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
        inTextCitations: metadataInTextCitations,
        detectedAuthors: metadataAuthors,
      };
    }

    let extractedText = '';
    if (['.txt', '.md', '.csv'].includes(effectiveExtension)) extractedText = normalizeText(bufferInfo.usableBuffer.toString('utf8'));
    else if (effectiveExtension === '.rtf') extractedText = normalizeText(stripRtf(bufferInfo.usableBuffer.toString('utf8')));
    else if (effectiveExtension === '.docx') extractedText = await extractDocxText(bufferInfo.usableBuffer);
    else if (effectiveExtension === '.pdf') extractedText = await extractPdfText(bufferInfo.usableBuffer);

    const detectedInTextCitations = extractInTextCitations(extractedText);
    const detectedCandidates = extractBibliographicCandidates(extractedText, 'attachment');
    const bibliographicCandidates = mergeBibliographicCandidates(metadataCandidates, metadataCitationSources, detectedCandidates, buildLiteratureFromInTextCitations(detectedInTextCitations, 'citation')).map((source) => ({
      ...source,
      sourceDocumentName: source.sourceDocumentName || originalName,
      citedAccordingTo: source.citedAccordingTo || originalName,
    }));

    const inTextCitations = uniqueArray([...metadataInTextCitations, ...detectedInTextCitations].map((item) => JSON.stringify(item))).map((item) => JSON.parse(item) as InTextCitation);
    const detectedAuthors = cleanValidAuthors([...metadataAuthors, ...inTextCitations.flatMap((citation) => citation.authors || []), ...extractAuthorsFromCandidates(bibliographicCandidates)]);

    return {
      ...base,
      compressedSize: bufferInfo.compressedSize,
      decompressedSize: bufferInfo.decompressedSize,
      wasDecompressed: bufferInfo.wasDecompressed,
      compressionWithinLimit: bufferInfo.compressionWithinLimit,
      compressionStatus: bufferInfo.compressionStatus,
      extractedText: limitText(extractedText, maxExtractedCharsPerAttachment),
      extractedChars: extractedText.length,
      extractedPreview: extractedText.slice(0, 1200),
      status: extractedText.trim() ? (bufferInfo.wasDecompressed ? 'Súbor bol najprv rozbalený z gzip a text bol úspešne extrahovaný.' : 'Text bol úspešne extrahovaný.') : 'Text sa nepodarilo extrahovať alebo je súbor prázdny.',
      error: null,
      bibliographicCandidates,
      inTextCitations,
      detectedAuthors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nepodarilo sa extrahovať text zo súboru.';
    return {
      ...base,
      compressedSize: size,
      decompressedSize: 0,
      wasDecompressed: false,
      compressionWithinLimit: size <= maxCompressedFileSizeBytes,
      compressionStatus: gzip ? 'Súbor je gzip, ale rozbalenie alebo extrakcia zlyhala.' : 'Súbor nie je gzip a extrakcia zlyhala.',
      extractedText: '',
      extractedChars: 0,
      extractedPreview: '',
      status: 'Extrakcia zlyhala.',
      error: message,
      bibliographicCandidates: mergeBibliographicCandidates(metadataCandidates, metadataCitationSources),
      inTextCitations: metadataInTextCitations,
      detectedAuthors: metadataAuthors,
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
  const mergedSources = mergeBibliographicCandidates(
    clientDetectedSources,
    extractedFiles.flatMap((file) => file.bibliographicCandidates || []),
    extractedFiles.flatMap((file) => buildLiteratureFromInTextCitations(file.inTextCitations || [], 'citation')),
  );

  const authors = cleanValidAuthors([...extractAuthorsFromCandidates(mergedSources), ...extractedFiles.flatMap((file) => file.detectedAuthors || [])]);

  return {
    sources: mergedSources,
    authors,
    text: limitText(
      `SÚHRN DETEGOVANÝCH ZDROJOV A AUTOROV\n\nAutori:\n${authors.length ? authors.join(', ') : 'Autori neboli automaticky identifikovaní alebo ich treba overiť.'}\n\nDetegované bibliografické záznamy:\n${formatBibliographicCandidates(mergedSources)}\n\nDoplňujúci súhrn z frontendu:\n${clientDetectedSourcesSummary || 'neuvedené'}`,
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

  for (const file of files.slice(0, 8)) {
    extractedFiles.push(await extractTextFromSingleFile(file, preparedFilesMetadata));
  }

  const compactSources = buildCompactSourceSummary({ clientDetectedSourcesSummary, clientDetectedSources, extractedFiles });
  const attachmentTexts: string[] = [];

  if (preparedFilesSummary.trim()) attachmentTexts.push(`TECHNICKÝ PREHĽAD PRÍLOH\n${limitText(preparedFilesSummary, 12_000)}`);
  attachmentTexts.push(compactSources.text);

  if (clientExtractedText.trim()) {
    const frontendCitations = extractInTextCitations(clientExtractedText);
    const frontendCandidates = mergeBibliographicCandidates(
      clientDetectedSources,
      extractBibliographicCandidates(clientExtractedText, 'attachment'),
      buildLiteratureFromInTextCitations(frontendCitations, 'citation'),
    );

    attachmentTexts.push(`EXTRAHOVANÝ TEXT Z /api/extract-text ALEBO FRONTENDU\nStav: Text bol extrahovaný pred volaním /api/chat.\nPočet citácií priamo v texte: ${frontendCitations.length}\nPočet detegovaných zdrojov: ${frontendCandidates.length}\n\nCITÁCIE V TEXTE:\n${frontendCitations.map((citation, index) => `${index + 1}. ${citation.raw}`).join('\n') || 'neuvedené'}\n\nDETEGOVANÉ ZDROJE:\n${formatBibliographicCandidates(frontendCandidates)}\n\nTEXT:\n${limitMiddle(clientExtractedText, maxClientExtractedChars)}`);
  }

  for (const file of extractedFiles) {
    attachmentTexts.push(`PRILOŽENÝ SÚBOR\nNázov pôvodného súboru: ${file.originalName}\nNázov prijatého súboru: ${file.preparedName}\nTyp: ${file.label}\nStav extrakcie: ${file.status}\nPočet extrahovaných znakov: ${file.extractedChars}\nPočet citácií v texte: ${file.inTextCitations.length}\nPočet detegovaných bibliografických kandidátov: ${file.bibliographicCandidates.length}\nAutori: ${file.detectedAuthors.length ? file.detectedAuthors.join(', ') : 'neuvedené alebo potrebné overiť'}\nChyba: ${file.error || 'bez chyby'}\n\nCITÁCIE V TEXTE:\n${file.inTextCitations.map((citation, index) => `${index + 1}. ${citation.raw}`).join('\n') || 'neuvedené'}\n\nDETEGOVANÉ ZDROJE:\n${formatBibliographicCandidates(file.bibliographicCandidates)}\n\nEXTRAHOVANÝ TEXT:\n${file.extractedText || '[Text nebol extrahovaný alebo nie je dostupný.]'}`);
  }

  return {
    extractedFiles,
    attachmentTexts: [limitText(attachmentTexts.join('\n\n-----------------\n\n'), maxAttachmentContextChars)],
    compactSources,
  };
}

// =====================================================
// PROJECT DOCUMENTS + RELEVANCE
// =====================================================

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) return [];

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('zedpera_documents')
      .select('id, project_id, file_name, file_path, file_size, file_type, type, extracted_text, created_at')
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

function getMeaningfulTokens(value: string) {
  return normalizeForSemanticMatch(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .filter((token) => !semanticStopWords.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function buildProfileRelevanceText(profile: SavedProfile | null) {
  if (!profile) return '';
  const keywords = getKeywords(profile);

  return normalizeText([
    profile.title,
    profile.topic,
    profile.type,
    profile.level,
    profile.field,
    profile.annotation,
    profile.goal,
    profile.problem,
    profile.methodology,
    profile.researchQuestions,
    profile.practicalPart,
    profile.scientificContribution,
    profile.sourcesRequirement,
    keywords.join(' '),
    profile.schema?.label,
    profile.schema?.description,
    profile.schema?.structure?.join(' '),
    profile.schema?.requiredSections?.join(' '),
    profile.schema?.aiInstruction,
  ].filter(Boolean).join('\n'));
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
    extractedFiles.some((file) => file.extractedText.trim().length > 100 || file.bibliographicCandidates.length > 0) ||
    detectedSourcesForOutput.length > 0;

  if (!hasAttachmentContent) {
    return { hasAttachmentContent, isRelevant: true, matchedTokens: [], profileTokens: [], attachmentTokens: [], relevanceRatio: 0 };
  }

  const profileTokens = uniqueArray(getMeaningfulTokens(buildProfileRelevanceText(profile)));
  const attachmentTokens = uniqueArray(
    getMeaningfulTokens(
      [
        attachmentTexts.join('\n'),
        extractedFiles.map((file) => `${file.originalName}\n${file.extractedText}\n${file.detectedAuthors.join(' ')}`).join('\n'),
        detectedSourcesForOutput.map((source) => `${source.raw} ${source.title} ${source.authors.join(' ')} ${source.year}`).join('\n'),
      ].join('\n'),
    ),
  );

  if (!profileTokens.length) {
    return { hasAttachmentContent, isRelevant: true, matchedTokens: [], profileTokens, attachmentTokens, relevanceRatio: 0 };
  }

  const attachmentTokenSet = new Set(attachmentTokens);
  const matchedTokens = profileTokens.filter((token) => attachmentTokenSet.has(token));
  const relevanceRatio = matchedTokens.length / Math.max(profileTokens.length, 1);
  const isRelevant = matchedTokens.length >= 5 || relevanceRatio >= 0.08;

  return { hasAttachmentContent, isRelevant, matchedTokens, profileTokens, attachmentTokens, relevanceRatio };
}

// =====================================================
// PROMPTS
// =====================================================

function buildProfileSummary(profile: SavedProfile | null) {
  if (!profile) return 'Profil práce nebol dodaný.';
  const keywords = getKeywords(profile);

  return `Názov práce: ${profile.title || 'Neuvedené'}\nTéma práce: ${profile.topic || 'Neuvedené'}\nTyp práce: ${profile.schema?.label || profile.type || 'Neuvedené'}\nÚroveň / odbornosť: ${profile.level || 'Neuvedené'}\nOdbor / predmet / oblasť: ${profile.field || 'Neuvedené'}\nVedúci práce: ${profile.supervisor || 'Neuvedené'}\nCitačná norma: ${getCitationStyle(profile)}\nJazyk práce: ${getWorkLanguage(profile)}\nAnotácia: ${profile.annotation || 'Neuvedené'}\nCieľ práce: ${profile.goal || 'Neuvedené'}\nVýskumný problém: ${profile.problem || 'Neuvedené'}\nMetodológia: ${profile.methodology || 'Neuvedené'}\nHypotézy: ${profile.hypotheses || 'Neuvedené'}\nVýskumné otázky: ${profile.researchQuestions || 'Neuvedené'}\nPraktická / analytická časť: ${profile.practicalPart || 'Neuvedené'}\nVedecký / odborný prínos: ${profile.scientificContribution || 'Neuvedené'}\nPožiadavky na zdroje: ${profile.sourcesRequirement || 'Neuvedené'}\nKľúčové slová: ${keywords.length ? keywords.join(', ') : 'Neuvedené'}\nŠtruktúra práce: ${profile.schema?.structure?.join(' | ') || 'Neuvedené'}\nPovinné časti: ${profile.schema?.requiredSections?.join(' | ') || 'Neuvedené'}\nŠpecifická inštrukcia typu práce: ${profile.schema?.aiInstruction || 'Neuvedené'}`;
}

function buildStrictTranslationPrompt() {
  return `Si profesionálny prekladač. Vráť iba samotný preložený text. Nepíš zdroje, analýzu ani vysvetlenie.`;
}

function buildStrictEmailPrompt() {
  return `Si profesionálny asistent na písanie emailov. Výstup musí obsahovať iba predmet a text emailu. Nepíš zdroje, analýzu, skóre ani odporúčania.\n\nPOVINNÝ FORMÁT:\nPredmet:\n[vlož predmet emailu]\n\nText emailu:\n[vlož hotový email]`;
}

function buildStrictPlanningPrompt(profile: SavedProfile | null) {
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

  return `Si plánovač akademickej práce.\n\nDNEŠNÝ DÁTUM:\n${date}\n\nKOMPLETNÝ PROFIL PRÁCE:\n${buildProfileSummary(profile)}\n\nVytvor realistický harmonogram podľa profilu. Ak používateľ nezadal termín, napíš presne: Termín odovzdania nebol zadaný.`;
}

function buildVerifiedSourcePackPrompt(externalResearch: ExternalResearchResult) {
  if (!externalResearch.sources.length) {
    return `POVOLENÉ OVERENÉ EXTERNÉ AKADEMICKÉ ZDROJE:\nNeboli nájdené použiteľné overené externé zdroje.\n\nKRITICKÉ PRAVIDLO:\nAk nie sú nájdené overené externé zdroje a nie sú dostupné úplné zdroje z príloh, nepíš fiktívne citácie. Zakázané sú všeobecné vymyslené citácie typu Smith & Jones, Johnson & Williams, Brown & Davis, Green & White, Taylor & Anderson, Roberts & Hall, Miller & Wilson.`;
  }

  return `POVOLENÉ OVERENÉ EXTERNÉ AKADEMICKÉ ZDROJE:\nTieto zdroje boli nájdené cez Semantic Scholar alebo Crossref. Pri tvorbe akademického textu používaj iba citácie uvedené nižšie alebo úplné zdroje extrahované z relevantných príloh.\n\n${externalResearch.sources.map((source, index) => `${index + 1}. Citácia v texte: ${source.citationText}\nBibliografický záznam: ${source.bibliographyText}`).join('\n\n')}\n\nKRITICKÉ PRAVIDLÁ:\n1. V texte používaj iba citácie uvedené vyššie alebo citácie jednoznačne zistené z relevantných príloh.\n2. Nevytváraj fiktívnych autorov, roky, DOI, URL ani vydavateľské údaje.\n3. Ak zdroj nie je úplný, nepouži ho ako primárny citovaný zdroj.`;
}

function buildAcademicChapterRules() {
  return `ŠPECIÁLNY REŽIM PRE AKADEMICKÉ KAPITOLY MÁ NAJVYŠŠIU PRIORITU.

ABSOLÚTNE PRAVIDLÁ:
1. Výstup musí vychádzať z aktívneho profilu práce: názov práce, téma, cieľ, metodológia, výskumný problém, odbor, jazyk a citačná norma.
2. Ak používateľ napíše „napíš 1. kapitolu“, „napíš prvú kapitolu“, „kapitola 1“ alebo „1. Úvod“, NIKDY nepíš abstrakt. Prvá kapitola je vždy 1. Úvod alebo vecný odborný názov úvodu podľa profilu.
3. Ak používateľ žiada kapitolu, výstup musí byť rozsiahly akademický text. Nepíš krátky text na pol strany. Cieľový rozsah je minimálne 1 200 až 1 800 slov, ak používateľ neurčí kratší rozsah. Ak technický limit nestačí, napíš maximálne možný rozsiahly text a zachovaj odborné odseky.
4. Text musí mať viacero plnohodnotných odsekov. Nepíš iba stručný prehľad, poznámky ani osnovu.
5. Citácie v texte musia byť podľa citačnej normy uvedenej v aktívnom profile práce. Ak profil uvádza APA, používaj tvar (Autor, rok). Ak profil uvádza ISO 690, používaj tvar prijateľný pre ISO 690 podľa nastavenia profilu. Vždy rešpektuj profil.
6. Pri každom odbornom odseku musí byť citácia priamo v texte. Odborné tvrdenia bez citácie nie sú povolené.
7. Nevymýšľaj autorov, roky, DOI, URL, čísla strán ani vydavateľské údaje.
8. Primárne zdroje = priložený alebo projektový dokument použitý ako obsahový podklad + autor/autori samotnej prílohy, ak sa dajú zistiť z titulnej/úvodnej časti.
9. Primárne zdroje nesmú obsahovať autorov zo zoznamu literatúry článku, DOI ani URL citovaných sekundárnych zdrojov. Formát: [Názov prílohy]. Autor prílohy / zistení autori prílohy: [autori alebo nezistené].
10. Sekundárne zdroje = úplné odborné bibliografické zdroje, ktoré sú citované alebo uvedené priamo v texte vygenerovaného výstupu.
11. Sekundárne zdroje musia byť vypísané iba v úplnej bibliografickej forme. Neúplný záznam sa nesmie vypísať. Správny tvar je napríklad:
Sathe, S. K., Kshirsagar, H. H., & Roux, K. H. (2005). Advances in seed protein research: A perspective on seed allergens. Journal of Food Science, 70(6), R93–R120.
Kiening, M., et al. (2005). Sandwich immunoassays for the determination of peanut and hazelnut traces in foods. Journal of Agricultural and Food Chemistry, 53(9), 3321–3327. Cit. podľa Sathe et al. (2005).
Osman, A. A., et al. (2001). A monoclonal antibody that recognizes a potential coeliac-toxic repetitive epitope in gliadins. European Journal of Gastroenterology & Hepatology, 13(10), 1189–1193. Cit. podľa Sathe et al. (2005).
12. Ak je sekundárny zdroj citovaný sprostredkovane cez priložený dokument alebo článok, dopíš na koniec záznamu: Cit. podľa Autor et al. (rok). Ak autor článku nie je spoľahlivo zistený, až potom použi názov dokumentu.
13. Do výstupu nikdy nevkladaj hlášku, že príloha obsahovo nesúvisí s aktívnym profilom práce. Ak príloha nesúvisí, jednoducho ju nepouži ako odborný zdroj a pokračuj podľa profilu a overených zdrojov.
14. Do literatúry nikdy nevkladaj surový OCR text, STRANA, PAGE, technické bloky, názvy extrakčných sekcií, B. (2019), H. (2020), R. (2017), „údaj je potrebné overiť“, „Autor je potrebné overiť“ alebo „Rok chýba“.
15. Na konci kapitoly musí byť iba jedna dvojica sekcií: Primárne zdroje a Sekundárne zdroje. Duplicitné spodné sekcie sa nesmú vytvárať.`;
}

function buildAttachmentBlock(attachmentTexts: string[]) {
  return attachmentTexts.length ? `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join('\n\n-----------------\n\n')}\n` : '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';
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
  externalResearch,
}: {
  profile: SavedProfile | null;
  attachmentTexts: string[];
  settings: SourceSettings;
  module: ModuleKey;
  isChapterRequest: boolean;
  requestedChapterNumber: string | null;
  relevance: ProfileRelevanceResult;
  sourcesOnly: boolean;
  externalResearch: ExternalResearchResult;
}) {
  if (module === 'translation') return buildStrictTranslationPrompt();
  if (module === 'emails') return buildStrictEmailPrompt();
  if (module === 'planning') return buildStrictPlanningPrompt(profile);

  const prompt = `Si ZEDPERA, profesionálny akademický AI asistent, AI vedúci práce a citačná špecialistka.\n\nKOMPLETNÝ PROFIL PRÁCE JE HLAVNÝ ZDROJ KONTEXTU. Každá odpoveď musí vychádzať z profilu práce.\n\nAKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY: ${isChapterRequest ? 'Áno' : 'Nie'}\nPožadované číslo kapitoly: ${requestedChapterNumber || 'neurčené'}\nREŽIM IBA ZDROJE: ${sourcesOnly ? 'Áno' : 'Nie'}\nPrílohy podľa automatickej kontroly súvisia s profilom: ${relevance.isRelevant ? 'Áno' : 'Nie'}\nZhodné odborné výrazy: ${relevance.matchedTokens.slice(0, 80).join(', ') || 'žiadne'}\n\n${buildAcademicChapterRules()}\n\n${buildVerifiedSourcePackPrompt(externalResearch)}\n\nHLAVNÝ POSTUP:
1. Najvyššiu prioritu má konkrétna požiadavka používateľa. Nerob inú úlohu, než o ktorú používateľ žiada. Ak používateľ žiada 1. kapitolu, píš 1. kapitolu; ak žiada úvod, píš úvod; ak žiada zdroje, rieš zdroje.
2. Hneď potom rešpektuj aktívny profil práce: názov, tému, cieľ, problém, metodológiu, odbor, jazyk a citačnú normu.
3. Ako odborný obsahový základ použi najprv relevantnú prílohu alebo projektový dokument. Z prílohy vytiahni odborný obsah, citácie v texte a bibliografiu.
4. Až následne dopĺňaj cez AI a overené externé akademické zdroje zo Semantic Scholar/Crossref, aby text sedel na profil práce a bol odborne úplný.
5. V akademickom texte vždy používaj citácie priamo v texte podľa citačnej normy v profile.
6. Na konci uveď Primárne zdroje a Sekundárne zdroje.
7. Ak sú k dispozícii zdroje z článku, príloh, projektových dokumentov, Semantic Scholar alebo Crossref, musia byť použité a vypísané úplne.
8. Kapitola nesmie byť krátka. Pri žiadosti o kapitolu vytvor rozsiahly akademický text minimálne približne 1 200 slov, ak používateľ neurčil inak.
9. Pri žiadosti o 1. kapitolu nesmieš vytvoriť abstrakt; vytvor úvodnú kapitolu podľa profilu práce.\n\nJAZYK ODPOVEDE: ${getWorkLanguage(profile)}\nCITAČNÁ NORMA: ${getCitationStyle(profile)}\n\nKOMPLETNÝ ULOŽENÝ PROFIL PRÁCE:\n${buildProfileSummary(profile)}\n\n${buildAttachmentBlock(attachmentTexts)}\n\nPRAVIDLÁ PRE ZDROJE:\n1. Primárne zdroje = názov dokumentu alebo názvy dokumentov, z ktorých výstup čerpá, vrátane autora/autorov samotnej prílohy, ak sa dajú bezpečne zistiť z titulnej/úvodnej časti.\n2. Sekundárne zdroje = úplné bibliografické zdroje, ktoré sú citované alebo uvedené priamo v texte výstupu. Každý sekundárny zdroj musí mať aspoň autora, rok, názov, zdroj/časopis alebo strany/DOI/URL.\n3. Ak článok obsahuje zoznam literatúry, nikdy ho nepremiestňuj do primárnych zdrojov; do sekundárnych zdrojov uveď iba tie záznamy, ktoré sú v texte výstupu skutočne citované alebo použité.\n4. Do výstupu nevkladaj neúplné zdroje typu B. (2019), H. (2020), R. (2017), „údaj je potrebné overiť“, „Autor je potrebné overiť“ alebo „Rok chýba“.\n\nNASTAVENIA:\nKontrola príloh podľa profilu práce: ${settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'}\nPovinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}\nPovolené všeobecné znalosti AI: ${settings.allowAiKnowledgeFallback ? 'áno' : 'nie'}\nExterné akademické zdroje Semantic Scholar/Crossref: ${settings.useExternalAcademicSources ? 'áno' : 'nie'}\n\nFORMÁT:\nAk je kapitola: akademický text s citáciami v odsekoch, potom Primárne zdroje a Sekundárne zdroje.\nAk je iba zdroje: vráť iba Primárne zdroje a Sekundárne zdroje.\nAk nejde o kapitolu, použi sekcie === VÝSTUP ===, === ANALÝZA ===, === SKÓRE ===, === ODPORÚČANIA ===, === POUŽITÉ ZDROJE A AUTORI ===.`;

  return limitText(prompt, maxSystemPromptChars);
}

// =====================================================
// OUTPUT CLEANING
// =====================================================

function buildInTextCitationFromSource(source: BibliographicCandidate) {
  const authors = cleanValidAuthors(source.authors || []);
  if (!authors.length || !source.year) return '';
  const firstAuthor = authors[0].replace(/,.*/, '').replace(/\s+/g, ' ').trim();
  if (!firstAuthor || isInvalidAuthorFragment(firstAuthor)) return '';
  return authors.length > 1 ? `(${firstAuthor} et al., ${source.year})` : `(${firstAuthor}, ${source.year})`;
}

function textAlreadyHasCitation(text: string) {
  return /\([^()]{2,160}\b(?:18|19|20)\d{2}[a-z]?[^()]*\)/i.test(text);
}

function ensureChapterHasInTextCitations({ text, sources }: { text: string; sources: BibliographicCandidate[] }) {
  const output = normalizeText(text);
  const usableSources = sources
    .filter((source) => candidateHasUsableData(source) && !looksLikeRawOcrPage(source.raw || '') && cleanValidAuthors(source.authors || []).length && source.year)
    .slice(0, 8);

  if (!usableSources.length) return output;

  const literatureStart = output.search(/\n\s*(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje|Použitá literatúra|Použité zdroje|Zdroje)\s*\n/i);
  const body = literatureStart >= 0 ? output.slice(0, literatureStart).trim() : output;
  const tail = literatureStart >= 0 ? output.slice(literatureStart).trim() : '';

  let inserted = 0;
  const paragraphs = body.split(/\n\s*\n/).map((paragraph, index) => {
    const trimmed = paragraph.trim();
    if (index === 0 && trimmed.length < 140) return paragraph;
    if (trimmed.length < 160) return paragraph;
    if (textAlreadyHasCitation(trimmed)) return paragraph;

    const citation = buildInTextCitationFromSource(usableSources[inserted % usableSources.length]);
    if (!citation) return paragraph;

    inserted += 1;
    return `${trimmed.replace(/[.!?]?\s*$/, '')} ${citation}.`;
  });

  const nextBody = paragraphs.join('\n\n').trim();
  return tail ? `${nextBody}\n\n${tail}` : nextBody;
}

function cleanAcademicChapterOutput(text: string, lastUserMessage = '') {
  let output = normalizeText(text)
    .replace(/^===\s*VÝSTUP\s*===\s*/i, '')
    .replace(/^VÝSTUP\s*:\s*/i, '')
    .trim();

  const firstChapter = /\b1\s*[\.)]?\s*kapitola\b/i.test(lastUserMessage) || /\bkapitola\s+1\b/i.test(lastUserMessage) || /\bprv[áaúu]\s+kapitola\b/i.test(lastUserMessage) || /^\s*1\s*[\.:]\s*/i.test(lastUserMessage);

  if (firstChapter) {
    output = output
      .replace(/^KAPITOLA\s+1(?:\.0)?\s*[:\-–—]\s*Abstrakt\s*/i, '1. Úvod\n\n')
      .replace(/^1(?:\.0)?\s*[:\-–—]\s*Abstrakt\s*/i, '1. Úvod\n\n')
      .replace(/^Abstrakt\s*[:\-–—]?\s*/i, '1. Úvod\n\n')
      .replace(/(^|\n)\s*Abstrakt\s*[:\-–—]?\s*/gi, (_match, prefix) => `${prefix}1. Úvod\n\n`);
  }

  output = output
    .replace(/^KAPITOLA\s+(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i, '$1 Úvod\n\n')
    .replace(/^(\d+(?:\.\d+)*)\s*[:\-–—]\s*Abstrakt\s*/i, '$1 Úvod\n\n')
    .replace(/^(\d+(?:\.\d+)*)\s+Odborný\s+názov\s+kapitoly\s*/i, '$1\n\n')
    .replace(/^Konkrétny\s+odborný\s+názov\s+kapitoly\s*/i, '')
    .replace(/\n\s*STRANA\s+\d+\s+/gi, '\n')
    .replace(/\n\s*PAGE\s+\d+\s+/gi, '\n')
    .replace(/\([^()]*\b(?:Smith\s*&\s*Jones|Johnson\s*&\s*Williams|Brown\s*&\s*Davis|Green\s*&\s*White|Taylor\s*&\s*Anderson|Roberts\s*&\s*Hall|Miller\s*&\s*Wilson)\b[^()]*\)/gi, '')
    .replace(/\n{4,}/g, '\n\n\n');

  for (const section of [
    '=== ANALÝZA ===',
    '=== SKÓRE ===',
    '=== ODPORÚČANIA ===',
    '=== POUŽITÉ ZDROJE A AUTORI ===',
    'A. Detegované zdroje z extrahovaného textu',
    'B. Autori nájdení v dokumentoch',
    'C. Formátované bibliografické záznamy',
    'D. Priložené dokumenty použité ako podklad',
    'E. Upozornenia',
    'F. Zdroje, ktoré treba overiť',
    'TECHNICKÝ PREHĽAD PRÍLOH',
    'PRILOŽENÝ SÚBOR',
    'EXTRAHOVANÝ TEXT',
  ]) {
    const index = output.toLowerCase().indexOf(section.toLowerCase());
    if (index > 0) output = output.slice(0, index).trim();
  }

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

  if (module === 'translation') output = output.replace(/^výstup\s*:\s*/i, '').replace(/^preklad\s*:\s*/i, '').replace(/^preložený text\s*:\s*/i, '').trim();
  if (module === 'emails') {
    const subjectIndex = output.toLowerCase().indexOf('predmet:');
    if (subjectIndex > 0) output = output.slice(subjectIndex).trim();
  }

  return output.trim();
}

function removeUnknownCitations(text: string, verifiedSources: VerifiedSource[]) {
  if (!verifiedSources.length) return normalizeText(text);
  const allowed = new Set(verifiedSources.map((source) => source.citationText));
  const fallback = verifiedSources[0]?.citationText || '';

  return normalizeText(text).replace(/\([^()]{2,180}?\b(?:18|19|20)\d{2}[a-z]?[^()]*\)/gi, (citation) => (allowed.has(citation) ? citation : fallback));
}

function ensureParagraphCitationsFromVerifiedSources(text: string, sourcePack: VerifiedSource[]) {
  const cleaned = normalizeText(text);
  if (!sourcePack.length) return cleaned;

  const index = cleaned.search(/\n\s*(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje|Použitá literatúra|Použité zdroje|Zdroje)\s*\n/i);
  const body = index >= 0 ? cleaned.slice(0, index).trim() : cleaned;
  const tail = index >= 0 ? cleaned.slice(index).trim() : '';

  let sourceIndex = 0;
  const paragraphs = body.split(/\n\s*\n/).map((paragraph, paragraphIndex) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return paragraph;
    if (paragraphIndex === 0 && trimmed.length < 120) return paragraph;
    if (trimmed.length < 160) return paragraph;
    if (textAlreadyHasCitation(trimmed)) return paragraph;

    const citation = sourcePack[sourceIndex % sourcePack.length]?.citationText;
    if (!citation) return paragraph;
    sourceIndex += 1;

    return `${trimmed.replace(/[.!?]?\s*$/, '')} ${citation}.`;
  });

  const next = paragraphs.join('\n\n').trim();
  return tail ? `${next}\n\n${tail}` : next;
}

function appendVerifiedBibliography({
  text,
  sourcePack,
  extractedFiles,
  attachmentWasRelevant,
  detectedSourcesForOutput = [],
}: {
  text: string;
  sourcePack: VerifiedSource[];
  extractedFiles: ExtractedAttachment[];
  attachmentWasRelevant: boolean;
  detectedSourcesForOutput?: BibliographicCandidate[];
}) {
  const cleaned = normalizeText(text);
  const bodyWithoutSources = removeExistingSourceTail(cleaned);

  const primaryDocuments = buildPrimaryDocumentSources({
    detectedSourcesForOutput,
    extractedFiles,
    attachmentWasRelevant,
  });

  const usedVerifiedSources = sourcePack.filter((source) => cleaned.includes(source.citationText));
  const secondarySources = uniqueArray([
    ...usedVerifiedSources.map((source) => source.bibliographyText),
    ...buildSecondaryLiteratureFromUsedCitations({
      detectedSourcesForOutput,
      generatedText: cleaned,
      externalSources: sourcePack,
    }),
  ]).slice(0, maxFinalSourcesInOutput);

  const primaryBlock = primaryDocuments.length
    ? primaryDocuments.map((item, index) => `${index + 1}. ${item}`).join('\n')
    : 'Neuvedené. Text nečerpal z konkrétneho priloženého dokumentu alebo názov dokumentu nebol dostupný.';

  const secondaryBlock = secondarySources.length
    ? secondarySources.map((source, index) => `${index + 1}. ${source}`).join('\n')
    : 'Neuvedené. V texte nebola nájdená žiadna citácia vo forme autor – rok.';

  const finalBlock = `Primárne zdroje\n\n${primaryBlock}\n\nSekundárne zdroje\n\n${secondaryBlock}`;

  return finalizeSourceSections(`${bodyWithoutSources}\n\n${finalBlock}`.trim());

}

// =====================================================
// MODELS + ERRORS
// =====================================================

function getModelByAgent(agent: Agent): ModelResult {
  if (agent === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('Chýba OPENAI_API_KEY pre GPT.');
    return { model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'), providerLabel: 'GPT' };
  }

  if (agent === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Chýba ANTHROPIC_API_KEY pre Claude.');
    return { model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any, providerLabel: 'Claude' };
  }

  if (agent === 'gemini') {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Chýba GOOGLE_GENERATIVE_AI_API_KEY pre Gemini.');
    return { model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any, providerLabel: 'Gemini' };
  }

  if (agent === 'grok') {
    if (!process.env.XAI_API_KEY) throw new Error('Chýba XAI_API_KEY pre Grok.');
    return { model: xai(process.env.XAI_MODEL || 'grok-3') as any, providerLabel: 'Grok' };
  }

  if (agent === 'mistral') {
    if (!process.env.MISTRAL_API_KEY) throw new Error('Chýba MISTRAL_API_KEY pre Mistral.');
    return { model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any, providerLabel: 'Mistral' };
  }

  throw new Error(`Neznámy AI agent: ${agent}`);
}

function getFallbackModel(): ModelResult {
  if (process.env.OPENAI_API_KEY) return { model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'), providerLabel: 'GPT fallback' };
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return { model: google(process.env.GOOGLE_MODEL || 'gemini-2.5-flash') as any, providerLabel: 'Gemini fallback' };
  if (process.env.ANTHROPIC_API_KEY) return { model: anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6') as any, providerLabel: 'Claude fallback' };
  if (process.env.MISTRAL_API_KEY) return { model: mistral(process.env.MISTRAL_MODEL || 'mistral-small-latest') as any, providerLabel: 'Mistral fallback' };
  if (process.env.XAI_API_KEY) return { model: xai(process.env.XAI_MODEL || 'grok-3') as any, providerLabel: 'Grok fallback' };
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
  return message.includes('model') && (message.includes('not found') || message.includes('404') || message.includes('not supported') || message.includes('invalid model') || message.includes('not found for api version'));
}

function isContextWindowError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('context window') || message.includes('maximum context') || message.includes('input exceeds') || message.includes('too many tokens') || message.includes('token limit') || message.includes('prompt is too long') || message.includes('input is too long') || message.includes('maximum number of tokens');
}

function translateApiErrorToSlovak(error: unknown): SlovakApiError {
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Neznáma chyba servera.';
  const message = rawMessage.toLowerCase();

  if (isModelNotFoundError(error)) return { code: 'MODEL_NOT_FOUND', message: 'Zvolený AI model sa nepodarilo nájsť alebo nie je dostupný pre aktuálnu verziu API.', detail: 'Skontroluj názov modelu v .env súbore. Dočasne prepni model na Gemini alebo OpenAI.', rawMessage };
  if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('authentication') || message.includes('401')) return { code: 'INVALID_API_KEY', message: 'API kľúč je neplatný, chýba alebo nemá oprávnenie na použitie zvoleného AI modelu.', detail: 'Skontroluj API kľúče v nastaveniach prostredia.', rawMessage };
  if (message.includes('forbidden') || message.includes('permission') || message.includes('403')) return { code: 'ACCESS_DENIED', message: 'Prístup k zvolenému AI modelu alebo službe bol zamietnutý.', detail: 'Skontroluj oprávnenia účtu, dostupnosť modelu a billing.', rawMessage };
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('quota') || message.includes('429')) return { code: 'RATE_LIMIT', message: 'Bol prekročený limit požiadaviek alebo kreditov pre AI službu.', detail: 'Skús požiadavku zopakovať neskôr alebo skontroluj limity.', rawMessage };
  if (isContextWindowError(error)) return { code: 'CONTEXT_TOO_LARGE', message: 'Vstup je príliš veľký pre kontextové okno AI modelu.', detail: 'Použi väčší model alebo zmenši počet príloh.', rawMessage };
  if (message.includes('gzip_decompression_failed') || message.includes('gunzip')) return { code: 'GZIP_DECOMPRESSION_FAILED', message: 'Komprimovaný súbor sa nepodarilo rozbaliť.', detail: 'Skontroluj gzip súbor.', rawMessage };

  return { code: 'AI_API_ERROR', message: 'AI služba vrátila chybu pri spracovaní požiadavky.', detail: 'Skontroluj /api/chat vo Verceli alebo lokálny terminál.', rawMessage };
}

function jsonErrorResponse(error: SlovakApiError, status: number) {
  return NextResponse.json({ ok: false, code: error.code, message: error.message, detail: error.detail, rawMessage: error.rawMessage }, { status });
}

function jsonSimpleErrorResponse({ code, message, detail, status }: { code: string; message: string; detail: string; status: number }) {
  return NextResponse.json({ ok: false, code, message, detail }, { status });
}

// =====================================================
// RESPONSE HELPERS
// =====================================================

async function createStreamResponse({ model, systemPrompt, normalizedMessages }: { model: ModelResult['model']; systemPrompt: string; normalizedMessages: ReturnType<typeof normalizeMessages> }) {
  const result = streamText({ model, system: systemPrompt, messages: normalizedMessages, temperature: 0.2, maxOutputTokens: streamOutputTokens });
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
  externalResearch,
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
  externalResearch: ExternalResearchResult;
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

  if (module === 'chat' && sourcesOnly) {
    const primaryDocuments = buildPrimaryDocumentSources({
      detectedSourcesForOutput,
      extractedFiles,
      attachmentWasRelevant: relevance.hasAttachmentContent,
    });

    const secondarySources = buildSecondaryLiteratureFromUsedCitations({
      detectedSourcesForOutput,
      generatedText: getLastUserMessage(normalizedMessages),
      externalSources: externalResearch.sources,
    });

    const output = `Primárne zdroje

${
      primaryDocuments.length
        ? primaryDocuments.map((item, index) => `${index + 1}. ${item}`).join('\n')
        : 'Neuvedené.'
    }

Sekundárne zdroje

${
      secondarySources.length
        ? secondarySources.map((item, index) => `${index + 1}. ${item}`).join('\n')
        : 'Neuvedené.'
    }`;

    return NextResponse.json({ ok: true, provider: providerLabel, output: finalizeSourceSections(output), profileRelevance: relevance, externalResearch, extractedFiles: extractedFilesPayload });
  }

  const result = await generateText({ model, system: systemPrompt, messages: normalizedMessages, temperature: 0.2, maxOutputTokens: isChapterRequest ? chapterOutputTokens : defaultOutputTokens });
  let output = isStrictNoAcademicTailModule(module) ? cleanStrictOutput(result.text || '', module) : result.text || '';

  if (isChapterRequest) {
    const lastUserMessage = getLastUserMessage(normalizedMessages);
    const finalSources = mergeBibliographicCandidates(detectedSourcesForOutput, externalResearch.sources.map(verifiedSourceToBibliographicCandidate));

    output = cleanAcademicChapterOutput(output, lastUserMessage);

    if (externalResearch.sources.length > 0 && (!relevance.hasAttachmentContent || !relevance.isRelevant)) {
      output = ensureParagraphCitationsFromVerifiedSources(output, externalResearch.sources);
      output = removeUnknownCitations(output, externalResearch.sources);
      output = appendVerifiedBibliography({ text: output, sourcePack: externalResearch.sources, extractedFiles, attachmentWasRelevant: relevance.hasAttachmentContent, detectedSourcesForOutput: finalSources });
    } else {
      output = ensureChapterHasInTextCitations({ text: output, sources: finalSources });
      output = ensureOutputHasPrimarySecondarySources({ text: output, detectedSourcesForOutput: finalSources, extractedFiles, externalSources: externalResearch.sources, attachmentWasRelevant: relevance.hasAttachmentContent });
    }

    output = finalizeSourceSections(output);
  }

  return NextResponse.json({
    ok: true,
    provider: providerLabel,
    output,
    profileRelevance: relevance,
    externalResearch,
    extractedFiles: extractedFilesPayload,
    sourcePolicy: {
      attachmentWasRelevant: relevance.isRelevant,
      usedAttachmentAsSource: relevance.hasAttachmentContent && relevance.isRelevant,
      usedAiKnowledgeFallback: settings.allowAiKnowledgeFallback && (!relevance.hasAttachmentContent || !relevance.isRelevant),
      usedSemanticScholarOrCrossref: externalResearch.sources.length > 0,
    },
  });
}

// =====================================================
// API ROUTE
// =====================================================

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let rawAgent: unknown = 'gemini';
    let module: ModuleKey = 'unknown';
    let messages: ChatMessage[] = [];
    let profile: SavedProfile | null = null;
    let files: File[] = [];
    let projectId: string | null = null;

    let validateAttachmentsAgainstProfile = true;
    let requireSourceList = true;
    let allowAiKnowledgeFallback = true;
    let useExternalAcademicSources = true;
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

      validateAttachmentsAgainstProfile = asBoolean(formData.get('validateAttachmentsAgainstProfile'), true);
      requireSourceList = asBoolean(formData.get('requireSourceList'), true);
      allowAiKnowledgeFallback = asBoolean(formData.get('allowAiKnowledgeFallback'), true);
      useExternalAcademicSources = asBoolean(formData.get('useExternalAcademicSources'), true);
      returnExtractedFilesInfo = asBoolean(formData.get('returnExtractedFilesInfo'), false);

      clientExtractedText = toCleanString(formData.get('clientExtractedText'));
      preparedFilesSummary = toCleanString(formData.get('preparedFilesSummary'));
      clientDetectedSourcesSummary = toCleanString(formData.get('clientDetectedSourcesSummary'));
      clientDetectedSources = normalizeBibliographicCandidates(parseJson<BibliographicCandidate[]>(formData.get('clientDetectedSources'), []));
      preparedFilesMetadata = parseJson<PreparedFileMetadata[]>(formData.get('preparedFilesMetadata'), []);
      files = formData.getAll('files').filter((item): item is File => item instanceof File);
    } else {
      const body = await req.json().catch(() => null);

      rawAgent = body?.agent || 'gemini';
      module = normalizeModule(body?.module);
      messages = Array.isArray(body?.messages) ? body.messages : [];
      profile = body?.profile || body?.activeProfile || body?.savedProfile || null;
      projectId = body?.projectId || null;

      validateAttachmentsAgainstProfile = body?.validateAttachmentsAgainstProfile !== false;
      requireSourceList = body?.requireSourceList !== false;
      allowAiKnowledgeFallback = body?.allowAiKnowledgeFallback !== false;
      useExternalAcademicSources = body?.useExternalAcademicSources !== false;
      returnExtractedFilesInfo = body?.returnExtractedFilesInfo === true;

      clientExtractedText = toCleanString(body?.clientExtractedText);
      preparedFilesSummary = toCleanString(body?.preparedFilesSummary);
      clientDetectedSourcesSummary = toCleanString(body?.clientDetectedSourcesSummary);
      clientDetectedSources = normalizeBibliographicCandidates(Array.isArray(body?.clientDetectedSources) ? body.clientDetectedSources : []);
      preparedFilesMetadata = Array.isArray(body?.preparedFilesMetadata) ? body.preparedFilesMetadata : [];
      files = [];
    }

    if (!isAllowedAgent(rawAgent)) {
      return jsonSimpleErrorResponse({ code: 'UNKNOWN_AGENT', message: `Neznámy AI agent: ${String(rawAgent)}.`, detail: 'Použi jeden z podporovaných agentov: openai, claude, gemini, grok alebo mistral.', status: 400 });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (!normalizedMessages.length) {
      return jsonSimpleErrorResponse({ code: 'MISSING_MESSAGES', message: 'Chýbajú správy pre AI.', detail: 'Frontend musí odoslať aspoň jednu používateľskú správu v poli messages.', status: 400 });
    }

    const lastUserMessage = getLastUserMessage(normalizedMessages);
    const isChapterRequest = isAcademicChapterRequest(normalizedMessages);
    const requestedChapterNumber = detectChapterNumberFromText(lastUserMessage);
    const sourcesOnly = userWantsSourcesOnly(normalizedMessages);

    const { extractedFiles, attachmentTexts: uploadedAttachmentTexts, compactSources } = await extractAttachmentTexts({ files, preparedFilesMetadata, clientExtractedText, preparedFilesSummary, clientDetectedSourcesSummary, clientDetectedSources });

    const hasCurrentUpload = files.length > 0 || clientExtractedText.trim().length > 0 || preparedFilesSummary.trim().length > 0 || clientDetectedSources.length > 0 || preparedFilesMetadata.length > 0;
    const projectDocuments = isStrictNoAcademicTailModule(module) || hasCurrentUpload ? [] : await loadProjectDocuments(projectId);

    const projectDocumentSources: BibliographicCandidate[] = [];
    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const extractedText = normalizeText(doc.extracted_text || '');
      const bibliographicCandidates = mergeBibliographicCandidates(
        extractBibliographicCandidates(extractedText, 'project'),
        buildLiteratureFromInTextCitations(extractInTextCitations(extractedText), 'project'),
      ).map((source) => ({
        ...source,
        sourceDocumentName: source.sourceDocumentName || doc.file_name,
        citedAccordingTo: source.citedAccordingTo || doc.file_name,
      }));
      projectDocumentSources.push(...bibliographicCandidates);

      return `DOKUMENT ZO SUPABASE ${index + 1}\nNázov: ${doc.file_name}\nTyp: ${doc.file_type || doc.type || 'neuvedené'}\nVeľkosť: ${doc.file_size || 0} bajtov\nPočet extrahovaných znakov: ${extractedText.length}\nPočet detegovaných bibliografických kandidátov: ${bibliographicCandidates.length}\n\nDETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:\n${formatBibliographicCandidates(bibliographicCandidates)}\n\nEXTRAHOVANÝ TEXT:\n${extractedText ? limitMiddle(extractedText, maxProjectDocumentChars) : '[Dokument nemá uložený extrahovaný text]'}`;
    });

    const attachmentTexts = isStrictNoAcademicTailModule(module) ? uploadedAttachmentTexts : [...uploadedAttachmentTexts, ...projectDocumentTexts];

    const detectedSourcesForOutput = mergeBibliographicCandidates(
      clientDetectedSources,
      compactSources.sources,
      extractedFiles.flatMap((file) => file.bibliographicCandidates),
      extractedFiles.flatMap((file) => buildLiteratureFromInTextCitations(file.inTextCitations || [], 'citation')),
      projectDocumentSources,
    );

    const relevance = detectAttachmentProfileRelevance({ profile, attachmentTexts, extractedFiles, detectedSourcesForOutput });

    console.log('PROFILE_RELEVANCE_DEBUG:', {
      hasAttachmentContent: relevance.hasAttachmentContent,
      isRelevant: relevance.isRelevant,
      matchedTokensCount: relevance.matchedTokens.length,
      matchedTokens: relevance.matchedTokens.slice(0, 80),
      profileTokensCount: relevance.profileTokens.length,
      attachmentTokensCount: relevance.attachmentTokens.length,
      relevanceRatio: relevance.relevanceRatio,
    });

    const settings: SourceSettings = {
      sourceMode: 'uploaded_documents_first',
      validateAttachmentsAgainstProfile,
      requireSourceList: isStrictNoAcademicTailModule(module) ? false : requireSourceList,
      allowAiKnowledgeFallback: module === 'translation' ? false : allowAiKnowledgeFallback,
      useExternalAcademicSources: !isStrictNoAcademicTailModule(module) && useExternalAcademicSources,
    };

    const shouldSearchExternalSources =
      settings.useExternalAcademicSources &&
      settings.allowAiKnowledgeFallback &&
      (isChapterRequest || sourcesOnly || module === 'chat') &&
      (!relevance.hasAttachmentContent || !relevance.isRelevant || detectedSourcesForOutput.length < 3);

    const externalResearch = await buildVerifiedSourcePack({ profile, userMessage: lastUserMessage, shouldSearch: shouldSearchExternalSources });

    const finalDetectedSourcesForOutput = mergeBibliographicCandidates(detectedSourcesForOutput, externalResearch.sources.map(verifiedSourceToBibliographicCandidate));

    const systemPrompt = buildSystemPrompt({ profile, attachmentTexts, settings, module, isChapterRequest, requestedChapterNumber, relevance, sourcesOnly, externalResearch });

    try {
      const primary = getModelByAgent(agent);

      if (returnExtractedFilesInfo || isChapterRequest || sourcesOnly || module === 'chat') {
        return await createJsonResponse({ model: primary.model, systemPrompt, normalizedMessages, extractedFiles, providerLabel: primary.providerLabel, module, isChapterRequest, sourcesOnly, settings, relevance, detectedSourcesForOutput: finalDetectedSourcesForOutput, externalResearch });
      }

      return await createStreamResponse({ model: primary.model, systemPrompt, normalizedMessages });
    } catch (primaryError) {
      console.error('PRIMARY_MODEL_ERROR:', primaryError);

      if (isContextWindowError(primaryError)) return jsonErrorResponse(translateApiErrorToSlovak(primaryError), 413);
      if (!isModelNotFoundError(primaryError)) throw primaryError;

      const fallback = getFallbackModel();
      const fallbackSystemPrompt = isStrictNoAcademicTailModule(module)
        ? systemPrompt
        : limitText(`${systemPrompt}\n\nTECHNICKÁ POZNÁMKA:\nVybraný model nebol dostupný alebo bol odmietnutý poskytovateľom. Odpovedáš cez náhradný model: ${fallback.providerLabel}.\n\nDodrž:\n- pri kapitolách používaj zdroje z článku alebo overené zdroje zo Semantic Scholar/Crossref,\n- nepoužívaj fiktívne citácie,\n- citácie musia byť priamo v texte,\n- na konci uveď Primárne zdroje a Sekundárne zdroje,\n- primárne zdroje musia byť názvy dokumentov, z ktorých text čerpá, a autor/autori samotnej prílohy, ak sa dajú zistiť,
- sekundárne zdroje musia obsahovať všetky citácie autor–rok použité priamo v texte; ak úplný záznam nie je rozpoznaný, uveď aspoň citáciu použitú v texte a upozorni, že úplný záznam treba doplniť podľa literatúry prílohy,\n- nepoužívaj iniciály typu H., R., S. ako mená autorov.`, maxSystemPromptChars);

      if (returnExtractedFilesInfo || isChapterRequest || sourcesOnly || module === 'chat') {
        return await createJsonResponse({ model: fallback.model, systemPrompt: fallbackSystemPrompt, normalizedMessages, extractedFiles, providerLabel: fallback.providerLabel, module, isChapterRequest, sourcesOnly, settings, relevance, detectedSourcesForOutput: finalDetectedSourcesForOutput, externalResearch });
      }

      return await createStreamResponse({ model: fallback.model, systemPrompt: fallbackSystemPrompt, normalizedMessages });
    }
  } catch (error) {
    console.error('CHAT_API_ERROR:', error);
    return jsonErrorResponse(translateApiErrorToSlovak(error), 500);
  }
}
