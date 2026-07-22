import { generateText, streamText } from 'ai';
import { randomUUID } from 'node:crypto';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { NextResponse } from 'next/server';
import { gunzipSync } from 'zlib';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeProfile } from '@/lib/profile-storage';
import { getCitationLabel } from '@/lib/citations';
import {
  CHARACTERS_PER_PAGE,
  PageLimitError,
  consumePagesForOutput,
  countGeneratedPages,
  getOutputTokenLimit,
  requireAvailablePages,
  type PageQuota,
} from '@/lib/page-quota';
import {
  AttachmentLimitError,
  EntitlementError,
  FeatureAccessError,
  MODULE_FEATURE_MAP,
  PromptLimitError,
  consumeSuccessfulPrompt,
  entitlementErrorResponse,
  getFeatureLabel,
  requireModuleAccess,
  serializeEntitlements,
  type AppModuleKey,
  type CurrentEntitlements,
} from '@/lib/entitlements';
import type { FeatureKey } from '@/lib/billing/catalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

// =====================================================
// TYPES
// =====================================================

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';
type AppLanguage = 'sk' | 'cs' | 'cz' | 'en' | 'de' | 'pl' | 'hu';

type ModuleKey =
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'humanizer'
  | 'chat'
  | 'unknown';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Súbor prijatý cez Request.formData(). Nepoužívame instanceof File,
 * pretože v serverless runtime môže objekt pochádzať z iného JS realm-u.
 */
type UploadedFile = Blob & {
  name: string;
  lastModified?: number;
};

type NativeAttachmentPart =
  | {
      type: 'image';
      image: Uint8Array;
      mediaType: string;
    }
  | {
      type: 'file';
      data: Uint8Array;
      mediaType: string;
      filename?: string;
    };

type NativeAttachmentBundle = {
  parts: NativeAttachmentPart[];
  fileNames: string[];
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

  // Text môže prísť z /api/extract-text alebo z klientského fallbacku.
  extractedText?: string;
  extracted_text?: string;
  text?: string;
  content?: string;
  rawText?: string;

  // Voliteľný binárny fallback. Používa sa iba vtedy, ak frontend odošle
  // skutočný obsah súboru ako base64/data URL namiesto multipart File objektu.
  base64?: string;
  fileBase64?: string;
  bytesBase64?: string;
  dataUrl?: string;
  mimeType?: string;
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

const maxCompressedFileSizeBytes = 30 * 1024 * 1024;
const maxDecompressedFileSizeBytes = 60 * 1024 * 1024;
const maxExtractedCharsPerAttachment = 40_000;
const maxClientExtractedChars = 60_000;
const maxProjectDocumentChars = 24_000;
const maxAttachmentContextChars = 96_000;
const maxPriorityAttachmentContextChars = 84_000;
const maxSystemPromptChars = 150_000;
const MAX_ATTACHMENTS_TO_PROCESS = 24;
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
// SOURCE SAFETY
// =====================================================

const forbiddenInternalSourcePatterns = [
  /\bZEDPERA\b/gi,
  /\bZedpera\b/gi,
  /\bZedpera\s*AI\b/gi,
  /\bnáš\s+systém\b/gi,
  /\bnas\s+system\b/gi,
  /\binterný\s+nástroj\b/gi,
  /\binterny\s+nastroj\b/gi,
  /\btáto\s+aplikácia\b/gi,
  /\btato\s+aplikacia\b/gi,
];

function containsForbiddenInternalSource(value: string) {
  const text = String(value || '');
  return forbiddenInternalSourcePatterns.some((pattern) => pattern.test(text));
}


// =====================================================
// BASIC HELPERS
// =====================================================

function normalizeAppLanguage(value: unknown, fallback: AppLanguage = 'sk'): AppLanguage {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'sk' || normalized === 'slovak' || normalized === 'slovenčina' || normalized === 'slovencina') {
    return 'sk';
  }

  if (
    normalized === 'cs' ||
    normalized === 'cz' ||
    normalized === 'czech' ||
    normalized === 'čeština' ||
    normalized === 'cestina'
  ) {
    return 'cs';
  }

  if (normalized === 'en' || normalized === 'english' || normalized === 'angličtina' || normalized === 'anglictina') {
    return 'en';
  }

  if (normalized === 'de' || normalized === 'german' || normalized === 'nemčina' || normalized === 'nemcina') {
    return 'de';
  }

  if (normalized === 'pl' || normalized === 'polish' || normalized === 'poľština' || normalized === 'polstina') {
    return 'pl';
  }

  if (normalized === 'hu' || normalized === 'hungarian' || normalized === 'maďarčina' || normalized === 'madarcina') {
    return 'hu';
  }

  return fallback;
}

function getLanguageName(language: AppLanguage): string {
  const names: Record<AppLanguage, string> = {
    sk: 'slovenčina',
    cs: 'čeština',
    cz: 'čeština',
    en: 'angličtina',
    de: 'nemčina',
    pl: 'poľština',
    hu: 'maďarčina',
  };

  return names[language] || 'slovenčina';
}

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


const REQUIRED_VERIFICATION_NOTICE = 'Údaje sú potrebné overiť.';

/**
 * Zjednotí nesprávne alebo staršie formulácie upozornenia na overenie údajov.
 * Klient nikdy nemá dostať vetu „údaje nie sú potrebné overiť“ ani nejednotné
 * tvary „údaj je potrebné overiť“ alebo „údaje je potrebné overiť“.
 */
function normalizeVerificationNotices(value: string): string {
  return String(value || '')
    .replace(
      /\búdaj(?:e)?\s+nie\s+sú\s+potrebné\s+overiť\.?/gi,
      REQUIRED_VERIFICATION_NOTICE,
    )
    .replace(
      /\búdaj(?:e)?\s+(?:je|sú)\s+potrebné\s+overiť\.?/gi,
      REQUIRED_VERIFICATION_NOTICE,
    )
    .replace(
      /\búdaj(?:e)?\s+treba\s+overiť\.?/gi,
      REQUIRED_VERIFICATION_NOTICE,
    )
    .replace(
      /\bautor(?:i)?\s+(?:je|sú)\s+potrebné\s+overiť\.?/gi,
      REQUIRED_VERIFICATION_NOTICE,
    )
    .replace(/(?:Údaje sú potrebné overiť\.\s*){2,}/g, REQUIRED_VERIFICATION_NOTICE)
    .trim();
}

function cleanClientVisibleOutput(text: string, module: ModuleKey): string {
  let output = normalizeText(text || '');

  output = output
    .replace(/^\s*AI\s*vedúci\s*práce\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s*vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s*veduci\s*prace\s*[-–—:]*\s*/i, '')
    .replace(/^\s*AI\s*veduci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Ako\s+AI\s*vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Ako\s+AI\s*veduci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Výstup\s+nebude\s+začínať\s+textom\s+AI\s*Vedúci\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Toto\s+je\s+systémová\s+informácia\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Systémová\s+inštrukcia\s*[-–—:]*\s*/i, '')
    .replace(/^\s*Interná\s+poznámka\s*[-–—:]*\s*/i, '')
    .replace(/\[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API\.\]/gi, '')
    .replace(/\[STRED TEXTU BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API\.\]/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  if (module === 'supervisor') {
    output = output
      .replace(/^\s*Hodnotenie\s+modulu\s+AI\s*vedúci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Modul\s*:\s*AI\s*vedúci\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Výstup\s*[-–—:]*\s*/i, '')
      .trim();
  }

  if (module === 'quality') {
    output = output
      .replace(/^\s*Audit\s+kvality\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Tu\s+je\s+audit\s+kvality\s*[-–—:]*\s*/i, '')
      .trim();
  }

  if (module === 'defense') {
    output = output
      .replace(/^\s*Obhajoba\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Prezentácia\s*[-–—:]*\s*/i, '')
      .trim();
  }

  if (module === 'humanizer') {
    output = output
      .replace(/^\s*Humanizácia\s+textu\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Humanizovaný\s+text\s*[-–—:]*\s*/i, '')
      .replace(/^\s*Upravený\s+text\s*[-–—:]*\s*/i, '')
      .trim();
  }

  return normalizeVerificationNotices(output);
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

function getSystemLanguageFromProfile(profile: SavedProfile | null): AppLanguage {
  return normalizeAppLanguage(
    profile?.workLanguage ||
      profile?.interfaceLanguage ||
      profile?.language ||
      'sk',
    'sk',
  );
}

type CitationStyleMode =
  | 'APA'
  | 'HARVARD'
  | 'ISO'
  | 'FOOTNOTE_REFERENCES';

function getCitationStyleMode(
  value?: string | null,
): CitationStyleMode {
  const normalized = normalizeForSemanticMatch(
    String(value || ''),
  )
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

function getCitationStyle(
  profile: SavedProfile | null,
) {
  return normalizeCitationStyle(
    toCleanString(profile?.citationStyle) ||
      toCleanString(profile?.citation) ||
      'ISO',
  );
}

function isFootnoteCitationStyle(
  value?: string | null,
): boolean {
  return (
    getCitationStyleMode(value) ===
    'FOOTNOTE_REFERENCES'
  );
}

function buildCitationStyleRuleBlock(
  citationStyle: string,
): string {
  const normalizedStyle =
    normalizeCitationStyle(citationStyle);
  const mode =
    getCitationStyleMode(normalizedStyle);

  if (mode === 'FOOTNOTE_REFERENCES') {
    return [
      `AKTÍVNY CITAČNÝ REŽIM: ${normalizedStyle}.`,
      'V texte používaj iba malé referenčné čísla v hranatých zátvorkách: [1], [2], [3].',
      'Každé číslo použité v texte musí mať presne rovnaké číslo pri zodpovedajúcom zdroji v záverečnom zozname.',
      'Číslovanie je spoločné a priebežné: najprv primárne zdroje, potom sekundárne zdroje.',
      'Nevytváraj autor–rok citácie v okrúhlych zátvorkách.',
      'Nikdy nepouži číslo, ktoré nie je uvedené v citačnom registri.',
    ].join('\n');
  }

  return [
    `AKTÍVNY CITAČNÝ REŽIM: ${normalizedStyle}.`,
    'V texte používaj výhradne citačný tvar (Priezvisko, rok).',
    'V texte nepoužívaj referenčné čísla [1], [2], [3].',
    'V sekciách Primárne zdroje a Sekundárne zdroje nepoužívaj poradové ani referenčné čísla.',
    'Bibliografické záznamy formátuj podľa aktívnej normy z profilu práce.',
  ].join('\n');
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
    value === 'humanizer' ||
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
// ROBUST REQUEST / ATTACHMENT HELPERS
// =====================================================

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value === 'string' || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<UploadedFile> & {
    arrayBuffer?: unknown;
  };

  return (
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.size === 'number' &&
    candidate.size >= 0 &&
    typeof candidate.type === 'string' &&
    typeof candidate.name === 'string'
  );
}

function collectUploadedFiles(formData: FormData): UploadedFile[] {
  const uniqueFiles = new Map<string, UploadedFile>();

  // Prechádzame všetky polia, nie iba files/file/attachments.
  // Frontend môže používať aj attachments[], uploadedFiles, document_0 a pod.
  for (const [, value] of formData.entries()) {
    if (!isUploadedFile(value)) continue;
    if (value.size <= 0 || !value.name.trim()) continue;

    const key = [
      value.name,
      value.size,
      value.type,
      value.lastModified || 0,
    ].join('|');

    if (!uniqueFiles.has(key)) {
      uniqueFiles.set(key, value);
    }
  }

  return Array.from(uniqueFiles.values());
}

function normalizeBase64Payload(value: unknown): {
  base64: string;
  mimeType: string;
} | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const dataUrlMatch = trimmed.match(
    /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=\s]+)$/i,
  );

  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1] || 'application/octet-stream',
      base64: dataUrlMatch[2].replace(/\s+/g, ''),
    };
  }

  const compact = trimmed.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;

  return {
    mimeType: 'application/octet-stream',
    base64: compact,
  };
}

function createUploadedFileFromBase64({
  payload,
  fileName,
  mimeType,
}: {
  payload: unknown;
  fileName: string;
  mimeType?: string;
}): UploadedFile | null {
  const normalized = normalizeBase64Payload(payload);
  if (!normalized) return null;

  try {
    const buffer = Buffer.from(normalized.base64, 'base64');

    if (
      buffer.length <= 0 ||
      buffer.length > maxCompressedFileSizeBytes
    ) {
      return null;
    }

    const blob = new Blob([buffer], {
      type:
        mimeType ||
        normalized.mimeType ||
        'application/octet-stream',
    });

    return Object.assign(blob, {
      name: fileName || 'priloha.bin',
      lastModified: Date.now(),
    }) as UploadedFile;
  } catch {
    return null;
  }
}

function collectBase64UploadedFiles(
  value: unknown,
  depth = 0,
): UploadedFile[] {
  if (depth > 5 || value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      collectBase64UploadedFiles(item, depth + 1),
    );
  }

  if (typeof value !== 'object') return [];

  const item = value as Record<string, unknown>;
  const fileName =
    toCleanString(item.originalName) ||
    toCleanString(item.preparedName) ||
    toCleanString(item.fileName) ||
    toCleanString(item.name) ||
    'priloha.bin';

  const mimeType =
    toCleanString(item.mimeType) ||
    toCleanString(item.originalType) ||
    toCleanString(item.preparedType) ||
    toCleanString(item.type) ||
    'application/octet-stream';

  const directFile = createUploadedFileFromBase64({
    payload:
      item.dataUrl ??
      item.fileBase64 ??
      item.bytesBase64 ??
      item.base64,
    fileName,
    mimeType,
  });

  const nested = [
    item.attachments,
    item.files,
    item.preparedFilesMetadata,
    item.filesMetadata,
  ].flatMap((nestedValue) =>
    collectBase64UploadedFiles(nestedValue, depth + 1),
  );

  return directFile ? [directFile, ...nested] : nested;
}

function mergeUploadedFiles(
  ...groups: UploadedFile[][]
): UploadedFile[] {
  const uniqueFiles = new Map<string, UploadedFile>();

  for (const file of groups.flat()) {
    if (!isUploadedFile(file) || file.size <= 0) continue;

    const key = [
      file.name,
      file.size,
      file.type,
      file.lastModified || 0,
    ].join('|');

    if (!uniqueFiles.has(key)) {
      uniqueFiles.set(key, file);
    }
  }

  return Array.from(uniqueFiles.values());
}

function collectTextFragments(value: unknown, depth = 0): string[] {
  if (depth > 5 || value === null || value === undefined) return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Niektoré klienty pošlú pole alebo objekt serializovaný ako JSON.
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        return collectTextFragments(JSON.parse(trimmed), depth + 1);
      } catch {
        // Nie každý text začínajúci { alebo [ je JSON; ponecháme ho ako text.
      }
    }

    return [trimmed];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextFragments(item, depth + 1));
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const textKeys = [
      'clientExtractedText',
      'extractedText',
      'extracted_text',
      'attachmentText',
      'attachmentTexts',
      'text',
      'content',
      'rawText',
      'documentText',
      'fileText',
      'parsedText',
      'ocrText',
    ];

    return textKeys.flatMap((key) =>
      collectTextFragments(objectValue[key], depth + 1),
    );
  }

  return [];
}

function mergeExtractedTextPayloads(...values: unknown[]): string {
  const fragments = uniqueArray(
    values
      .flatMap((value) => collectTextFragments(value))
      .map((value) => normalizeText(value))
      .filter(Boolean),
  );

  if (!fragments.length) return '';

  return limitMiddle(
    fragments.join('\n\n-----------------\n\n'),
    maxClientExtractedChars,
  );
}

function getPreparedMetadataExtractedText(
  metadata: PreparedFileMetadata | null | undefined,
): string {
  if (!metadata) return '';

  return mergeExtractedTextPayloads(
    metadata.extractedText,
    metadata.extracted_text,
    metadata.text,
    metadata.content,
    metadata.rawText,
  );
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
  if (/údaj(?:e)? (?:je|sú) potrebné overiť|neuvedené|pôvodný záznam|autori:|citácie v texte|doi:|url:/i.test(title)) return false;
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

      return `${index + 1}. Pôvodný záznam:\n${item.raw || 'neuvedené'}\n\nAutori: ${cleanValidAuthors(item.authors || []).join(', ') || 'Údaje sú potrebné overiť.'}\nRok: ${item.year || REQUIRED_VERIFICATION_NOTICE}\nNázov publikácie / zdroja: ${item.title || REQUIRED_VERIFICATION_NOTICE}\nČasopis / zdroj: ${item.journal || 'neuvedené'}\nTyp zdroja: ${item.sourceType}\nDOI: ${item.doi || 'neuvedené'}\nURL: ${item.url || 'neuvedené'}${citationInfo}`;
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

function getSourceTail(
  source: BibliographicCandidate,
): string {
  const journal = normalizeText(
    source.journal || '',
  )
    .replace(/\.$/, '')
    .trim();
  const volume = normalizeText(
    source.volume || '',
  )
    .replace(/\.$/, '')
    .trim();
  const issue = normalizeText(
    source.issue || '',
  )
    .replace(/\.$/, '')
    .trim();
  const pages = normalizeText(
    source.pages || '',
  )
    .replace(/--/g, '–')
    .replace(/\.$/, '')
    .trim();

  const parts: string[] = [];

  if (journal) {
    let journalPart = journal;

    if (volume && issue) {
      journalPart += `, ${volume}(${issue})`;
    } else if (volume) {
      journalPart += `, ${volume}`;
    }

    if (pages) {
      journalPart += `, ${pages}`;
    }

    parts.push(journalPart);
  } else if (pages) {
    parts.push(pages);
  }

  if (source.doi) {
    parts.push(
      `https://doi.org/${source.doi
        .replace(/^https?:\/\/doi\.org\//i, '')
        .trim()}`,
    );
  } else if (source.url) {
    parts.push(source.url);
  }

  return parts
    .filter(Boolean)
    .join('. ')
    .replace(/\.{2,}/g, '.')
    .trim();
}

function formatCandidateAsApaLike(
  source: BibliographicCandidate,
) {
  const authors = formatAuthorsApa(
    source.authors || [],
  );
  const year = source.year || '';
  const title = normalizeText(
    source.title || '',
  )
    .replace(/\.$/, '')
    .trim();

  if (!authors || !year || !title) {
    return '';
  }

  let output = `${authors} (${year}). ${title}.`;
  const tail = getSourceTail(source);

  if (tail) {
    output += ` ${tail}`;
    if (!/[.!?]$/.test(output)) output += '.';
  }

  return output
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCandidateAsHarvard(
  source: BibliographicCandidate,
) {
  const authors = formatAuthorsApa(
    source.authors || [],
  );
  const year = source.year || '';
  const title = normalizeText(
    source.title || '',
  )
    .replace(/\.$/, '')
    .trim();

  if (!authors || !year || !title) {
    return '';
  }

  const tail = getSourceTail(source);
  let output =
    `${authors} (${year}) '${title}'.`;

  if (tail) {
    output += ` ${tail}`;
    if (!/[.!?]$/.test(output)) output += '.';
  }

  return output
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCandidateAsIso(
  source: BibliographicCandidate,
) {
  const authors = cleanValidAuthors(
    source.authors || [],
  );
  const year = source.year || '';
  const title = normalizeText(
    source.title || '',
  )
    .replace(/\.$/, '')
    .trim();

  if (!authors.length || !year || !title) {
    return '';
  }

  const authorText = authors.join('; ');
  const tail = getSourceTail(source);

  let output =
    `${authorText}. ${title}. ${year}.`;

  if (tail) {
    output += ` ${tail}`;
    if (!/[.!?]$/.test(output)) output += '.';
  }

  return output
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCandidateByCitationStyle(
  source: BibliographicCandidate,
  citationStyle: string,
) {
  const mode =
    getCitationStyleMode(citationStyle);

  if (mode === 'APA') {
    return formatCandidateAsApaLike(source);
  }

  if (mode === 'HARVARD') {
    return formatCandidateAsHarvard(source);
  }

  return formatCandidateAsIso(source);
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

function formatCandidateForFinalLiterature(
  source: BibliographicCandidate,
  citationStyle = 'ISO',
) {
  const raw = normalizeText(
    source.raw || '',
  )
    .replace(/\s+/g, ' ')
    .trim();
  const authors = cleanValidAuthors(
    source.authors || [],
  );

  if (looksLikeRawOcrPage(raw)) return '';
  if (looksLikeIncompleteInitialCitation(raw)) {
    return '';
  }

  if (
    isSourceCompleteEnoughForSecondary({
      ...source,
      authors,
    })
  ) {
    const structured =
      formatCandidateByCitationStyle(
        {
          ...source,
          authors,
        },
        citationStyle,
      );

    if (structured) {
      return appendCitedAccordingToIfNeeded({
        formatted: structured,
        source,
      });
    }
  }

  const rawLooksUsable =
    raw.length >= 20 &&
    raw.length <= 900 &&
    looksLikeCompleteApaBibliography(raw) &&
    !raw
      .toLowerCase()
      .includes(
        REQUIRED_VERIFICATION_NOTICE.toLowerCase(),
      ) &&
    !raw.toLowerCase().includes('neuvedené') &&
    !raw
      .toLowerCase()
      .includes('autor je potrebné overiť') &&
    !raw.toLowerCase().includes('rok chýba');

  if (rawLooksUsable) {
    return appendCitedAccordingToIfNeeded({
      formatted: raw,
      source,
    });
  }

  return '';
}

function removeIncompleteSourceLines(text: string) {
  return normalizeText(text)
    .split('\n')
    .filter((line) => {
      const current = line.trim();
      if (!current) return true;

      if (containsForbiddenInternalSource(current)) return false;

      if (/^\d+\.\s*[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]\.?\s*\((18|19|20)\d{2}/i.test(current)) return false;
      if (
        /údaj(?:e)? (?:je|sú) potrebné overiť|Autor(?:i)? (?:je|sú) potrebné overiť|Rok chýba|Neúplná citácia/i.test(
          current,
        )
      ) {
        // Pri primárnej prílohe musí používateľ vidieť, ktorý údaj sa
        // nepodarilo z dokumentu bezpečne určiť. Neúplné sekundárne
        // bibliografické položky sa naďalej odstránia.
        return /^(Autor prílohy|Citácia v texte|Bibliografická citácia)/i.test(
          current,
        );
      }

      return true;
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeExistingSourceTail(text: string) {
  const cleaned = normalizeText(text);

  const headings = [
    'Primárne zdroje',
    'Primarne zdroje',
    'Sekundárne zdroje',
    'Sekundarne zdroje',
    'Použitá literatúra',
    'Pouzita literatura',
    'Použité zdroje',
    'Pouzite zdroje',
    'Zdroje a autori',
    'Použité zdroje a autori',
    'Pouzite zdroje a autori',
    'Literatúra',
    'Literatura',
    'Bibliografia',
    'References',
  ];

  const escaped = headings
    .map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:[*_\\-–—]+\\s*)?(?:\\d+\\.\\s*)?(?:\\*\\*)?\\s*(?:${escaped})\\s*(?:\\*\\*)?\\s*:?\\s*\\n[\\s\\S]*$`,
    'i',
  );

  const match = cleaned.match(regex);

  if (match && typeof match.index === 'number') {
    return cleaned.slice(0, match.index).trim();
  }

  return cleaned;
}


function getPrimarySecondaryHeadingPositions(text: string) {
  const output = normalizeText(text);
  const positions: Array<{
    index: number;
    heading: 'primary' | 'secondary';
    lineStart: number;
  }> = [];

  const headingRegex =
    /(^|\n|[.!?]\s+)(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje)\s*(?=\n|$)/gi;

  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(output)) !== null) {
    const prefix = match[1] || '';
    const rawHeading = normalizeForSemanticMatch(match[2] || '');
    const headingIndex = match.index + prefix.length;
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

  const nextDuplicateHeading = positions.find(
    (item) => item.index > firstSecondary.index && (item.heading === 'primary' || item.heading === 'secondary'),
  );

  if (!nextDuplicateHeading) return output;

  return output.slice(0, nextDuplicateHeading.lineStart).trim();
}

function removeDuplicatePrimarySecondarySourceBlocks(text: string) {
  let output = normalizeText(text);

  output = cutEverythingAfterSecondSourceBlock(output);

  const positions = getPrimarySecondaryHeadingPositions(output);
  const firstPrimary = positions.find((item) => item.heading === 'primary');
  const firstSecondary = positions.find(
    (item) => item.heading === 'secondary' && (!firstPrimary || item.index > firstPrimary.index),
  );

  if (!firstPrimary || !firstSecondary) return output;

  const duplicateAfterSecondary = positions.find(
    (item) => item.index > firstSecondary.index && (item.heading === 'primary' || item.heading === 'secondary'),
  );

  if (duplicateAfterSecondary) {
    output = output.slice(0, duplicateAfterSecondary.lineStart).trim();
  }

  return output;
}

function removeBrokenSourceGarbageLines(text: string) {
  return normalizeText(text)
    .split('\n')
    .filter((line) => {
      const current = line.trim();
      if (!current) return true;

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

function removeForbiddenInternalSourcesFromOutput(text: string) {
  return normalizeText(text)
    .split('\n')
    .filter((line) => !containsForbiddenInternalSource(line))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function finalizeSourceSections(text: string) {
  return removeForbiddenInternalSourcesFromOutput(
    removeBrokenSourceGarbageLines(
      removeDuplicatePrimarySecondarySourceBlocks(removeIncompleteSourceLines(text)),
    ),
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

function extractAttachmentYearFromFirstPages(
  file: ExtractedAttachment,
): string | null {
  const headerText = normalizeText(file.extractedText || '')
    .slice(0, 12_000);

  const headerLines = headerText
    .split('\n')
    .map((line) => normalizeText(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !/^STRANA\s+\d+$/i.test(line))
    .filter((line) => !/^PAGE\s+\d+$/i.test(line))
    .slice(0, 45);

  const preferredPatterns = [
    /\b(?:published|publication|vydané|vydane|rok|copyright|©)\s*[:,-]?\s*((?:18|19|20)\d{2})\b/i,
    /\b((?:18|19|20)\d{2})\b/,
  ];

  for (const pattern of preferredPatterns) {
    for (const line of headerLines) {
      const match = line.match(pattern);
      if (match?.[1]) return match[1];
    }
  }

  return null;
}

function formatPrimaryInTextCitation({
  authors,
  year,
  citationStyle,
  referenceNumber,
}: {
  authors: string[];
  year: string | null;
  citationStyle: string;
  referenceNumber?: number;
}) {
  if (
    isFootnoteCitationStyle(citationStyle)
  ) {
    return referenceNumber
      ? `[${referenceNumber}]`
      : REQUIRED_VERIFICATION_NOTICE;
  }

  if (!authors.length || !year) {
    return REQUIRED_VERIFICATION_NOTICE;
  }

  const firstAuthor = normalizeText(
    authors[0] || '',
  )
    .replace(/,.*/, '')
    .trim();

  if (!firstAuthor) {
    return REQUIRED_VERIFICATION_NOTICE;
  }

  return authors.length > 1
    ? `(${firstAuthor} et al., ${year})`
    : `(${firstAuthor}, ${year})`;
}

function formatPrimaryBibliographicCitation({
  documentName,
  authors,
  year,
  citationStyle,
}: {
  documentName: string;
  authors: string[];
  year: string | null;
  citationStyle: string;
}) {
  const title =
    normalizeAttachmentDocumentName(
      documentName,
    );
  const mode =
    getCitationStyleMode(citationStyle);
  const safeAuthors =
    cleanValidAuthors(authors);
  const yearText =
    year || REQUIRED_VERIFICATION_NOTICE;

  if (!safeAuthors.length) {
    return `${REQUIRED_VERIFICATION_NOTICE} ${title}. ${yearText}.`;
  }

  if (mode === 'APA') {
    const authorText =
      formatAuthorsApa(safeAuthors);

    return `${authorText} (${yearText}). ${title} [PDF].`;
  }

  if (mode === 'HARVARD') {
    const authorText =
      formatAuthorsApa(safeAuthors);

    return `${authorText} (${yearText}) '${title}' [PDF].`;
  }

  const authorText =
    safeAuthors.join('; ');

  return `${authorText}. ${title} [PDF]. ${yearText}.`;
}

type PrimaryCitationRecord = {
  documentName: string;
  authors: string[];
  year: string | null;
  bibliography: string;
  displayText: string;
};

function buildPrimaryCitationRecords({
  detectedSourcesForOutput,
  extractedFiles,
  attachmentWasRelevant = true,
  citationStyle = 'ISO',
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  attachmentWasRelevant?: boolean;
  citationStyle?: string;
}): PrimaryCitationRecord[] {
  if (!attachmentWasRelevant) return [];

  const normalizedCitationStyle =
    normalizeCitationStyle(citationStyle);

  const byDocument = new Map<
    string,
    {
      documentName: string;
      authors: string[];
      year: string | null;
    }
  >();

  for (const file of extractedFiles) {
    const documentName =
      normalizeAttachmentDocumentName(
        file.originalName ||
          file.name ||
          file.preparedName ||
          '',
      );

    if (
      !documentName ||
      looksLikeRawOcrPage(documentName)
    ) {
      continue;
    }

    const key =
      normalizeForSemanticMatch(
        documentName,
      );

    if (!key) continue;

    byDocument.set(key, {
      documentName,
      authors: cleanValidAuthors(
        extractAttachmentAuthorsFromFirstPages(
          file,
        ),
      ),
      year:
        extractAttachmentYearFromFirstPages(
          file,
        ),
    });
  }

  for (const source of detectedSourcesForOutput) {
    const documentName =
      normalizeAttachmentDocumentName(
        source.sourceDocumentName || '',
      );

    if (
      !documentName ||
      looksLikeRawOcrPage(documentName)
    ) {
      continue;
    }

    const key =
      normalizeForSemanticMatch(
        documentName,
      );

    if (!key) continue;

    const existing =
      byDocument.get(key);

    byDocument.set(key, {
      documentName:
        existing?.documentName ||
        documentName,
      authors: cleanValidAuthors(
        existing?.authors?.length
          ? existing.authors
          : source.authors || [],
      ),
      year:
        existing?.year ||
        source.year ||
        null,
    });
  }

  return Array.from(byDocument.values())
    .map((item, index) => {
      const referenceNumber = index + 1;
      const bibliography =
        formatPrimaryBibliographicCitation({
          documentName:
            item.documentName,
          authors: item.authors,
          year: item.year,
          citationStyle:
            normalizedCitationStyle,
        });
      const inTextCitation =
        formatPrimaryInTextCitation({
          authors: item.authors,
          year: item.year,
          citationStyle:
            normalizedCitationStyle,
          referenceNumber,
        });
      const authorText =
        item.authors.length
          ? item.authors.join(', ')
          : REQUIRED_VERIFICATION_NOTICE;

      return {
        ...item,
        bibliography,
        displayText: [
          `Názov prílohy: ${item.documentName}`,
          `Autor prílohy: ${authorText}`,
          `Citácia v texte: ${inTextCitation}`,
          `Bibliografická citácia (${normalizedCitationStyle}): ${bibliography}`,
        ].join('\n'),
      };
    })
    .slice(0, maxFinalSourcesInOutput);
}

function buildPrimaryDocumentSources({
  detectedSourcesForOutput,
  extractedFiles,
  attachmentWasRelevant = true,
  citationStyle = 'ISO',
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  attachmentWasRelevant?: boolean;
  citationStyle?: string;
}) {
  return buildPrimaryCitationRecords({
    detectedSourcesForOutput,
    extractedFiles,
    attachmentWasRelevant,
    citationStyle,
  }).map((record) => record.displayText);
}


function removePrimarySourcePlaceholder(text: string, extractedFiles: ExtractedAttachment[]) {
  const firstFileName =
    extractedFiles[0]?.originalName ||
    extractedFiles[0]?.name ||
    extractedFiles[0]?.preparedName ||
    '';

  if (!firstFileName) {
    return normalizeText(text).replace(
      /\[N[aá]zov\s+pr[ií]lohy\]\.\s*Autor\s+pr[ií]lohy\s*\/\s*zisten[ií]\s+autori\s+pr[ií]lohy:\s*\[autori\s+alebo\s+nezisten[eé]\]\.?/gi,
      'Primárny dokument nebol jednoznačne identifikovaný z priložených súborov.',
    );
  }

  return normalizeText(text).replace(
    /\[N[aá]zov\s+pr[ií]lohy\]\.\s*Autor\s+pr[ií]lohy\s*\/\s*zisten[ií]\s+autori\s+pr[ií]lohy:\s*\[autori\s+alebo\s+nezisten[eé]\]\.?/gi,
    `${firstFileName}. Autor prílohy / zistení autori prílohy: nezistené z extrahovaného textu.`,
  );
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

  if (!citation.year || !normalizedLine.includes(String(citation.year).toLowerCase())) {
    return false;
  }

  const authorNeedles = uniqueArray([
    citation.authorText,
    ...citationAuthors,
    ...citationAuthors.map((author) => author.replace(/,.*/, '').trim()),
    ...citationAuthors.map((author) => author.split(',')[0]?.trim() || ''),
  ])
    .map(normalizeCitationIdentityForOutput)
    .filter((value) => value.length >= 3);

  return authorNeedles.some((needle) => normalizedLine.includes(needle));
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
  citationStyle = 'ISO',
}: {
  citation: InTextCitation;
  detectedSourcesForOutput: BibliographicCandidate[];
  citationStyle?: string;
}) {
  const matched = findAnySourceForCitation({ citation, sources: detectedSourcesForOutput });

  if (matched) {
    const formatted =
      formatCandidateForFinalLiterature(
        {
          ...matched,
          matchedFromText: true,
          inTextCitations: [
            ...(matched.inTextCitations || []),
            citation,
          ],
          citedAccordingTo:
            matched.citedAccordingTo ||
            matched.sourceDocumentName ||
            null,
        },
        citationStyle,
      );

    if (formatted) return formatted;
  }

  const authors = cleanValidAuthors(citation.authors || []);
  const authorText = authors.length
    ? authors.join(', ')
    : normalizeText(citation.authorText || 'Autor neuvedený');

  const usedAs = citation.raw || `(${citation.authorText}, ${citation.year})`;

  const hasAttachmentSource = detectedSourcesForOutput.some(
    (source) =>
      source.origin === 'attachment' ||
      Boolean(source.sourceDocumentName) ||
      Boolean(source.citedAccordingTo),
  );

  const hasProjectSource = detectedSourcesForOutput.some((source) => source.origin === 'project');

  const hasExternalSource = detectedSourcesForOutput.some(
    (source) => source.origin === 'semantic_scholar' || source.origin === 'crossref',
  );

  if (matched?.sourceDocumentName || matched?.citedAccordingTo || matched?.origin === 'attachment') {
    const accordingTo = matched.citedAccordingTo || matched.sourceDocumentName || '';

    const base = `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z použitej prílohy, ale úplný bibliografický riadok sa z extrahovaného textu nepodarilo bezpečne zostaviť.`;

    return accordingTo ? `${base} Cit. podľa ${accordingTo}.` : base;
  }

  if (matched?.origin === 'project') {
    const accordingTo = matched.citedAccordingTo || matched.sourceDocumentName || '';

    const base = `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z projektového dokumentu, ale úplný bibliografický riadok sa z uloženého textu nepodarilo bezpečne zostaviť.`;

    return accordingTo ? `${base} Cit. podľa ${accordingTo}.` : base;
  }

  if (matched?.origin === 'semantic_scholar' || matched?.origin === 'crossref') {
    return `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z overených externých akademických zdrojov, ale úplný bibliografický riadok sa nepodarilo bezpečne zostaviť.`;
  }

  if (hasAttachmentSource) {
    return `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný zo zdrojov súvisiacich s prílohou, ale úplný bibliografický riadok sa z extrahovaného textu nepodarilo bezpečne zostaviť.`;
  }

  if (hasProjectSource) {
    return `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z projektových dokumentov, ale úplný bibliografický riadok sa nepodarilo bezpečne zostaviť.`;
  }

  if (hasExternalSource) {
    return `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Záznam bol rozpoznaný z overených externých akademických zdrojov, ale úplný bibliografický riadok sa nepodarilo bezpečne zostaviť.`;
  }

  return `${authorText} (${citation.year}). Citácia použitá priamo v texte: ${usedAs}. Úplný bibliografický riadok sa nepodarilo bezpečne zostaviť z dostupných údajov.`;
}

function completeSecondarySourcesWithEveryInTextCitation({
  secondarySources,
  citationsFromGeneratedText,
  detectedSourcesForOutput,
  citationStyle = 'ISO',
}: {
  secondarySources: string[];
  citationsFromGeneratedText: InTextCitation[];
  detectedSourcesForOutput: BibliographicCandidate[];
  citationStyle?: string;
}) {
  const completed = [...secondarySources];

  for (const citation of citationsFromGeneratedText) {
    const alreadyPresent = completed.some((line) => secondaryLineAlreadyRepresentsCitation(line, citation));
    if (alreadyPresent) continue;

    const fallback =
      formatCitationAsSecondaryFallback({
        citation,
        detectedSourcesForOutput,
        citationStyle,
      });
    if (fallback) completed.push(fallback);
  }

  return completed;
}

function buildSecondaryLiteratureFromUsedCitations({
  detectedSourcesForOutput,
  generatedText,
  externalSources = [],
  citationStyle = 'ISO',
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  generatedText: string;
  externalSources?: VerifiedSource[];
  citationStyle?: string;
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
      const formatted =
        formatCandidateForFinalLiterature(
          {
            ...matched,
            matchedFromText: true,
            inTextCitations: [
              ...(matched.inTextCitations || []),
              citation,
            ],
            citedAccordingTo:
              accordingTo,
          },
          citationStyle,
        );
      if (formatted) secondary.push(formatted);
      continue;
    }

    const externalMatched =
      externalSources.find(
        (source) =>
          source.citationText ===
          citation.raw,
      );

    if (externalMatched) {
      const formattedExternal =
        formatCandidateForFinalLiterature(
          verifiedSourceToBibliographicCandidate(
            externalMatched,
          ),
          citationStyle,
        );

      if (formattedExternal) {
        secondary.push(
          formattedExternal,
        );
      }
    }
  }

  for (const source of detectedSources) {
    const firstAuthor = cleanValidAuthors(source.authors || [])[0]?.replace(/,.*/, '').trim();
    if (!firstAuthor || !source.year) continue;
    const safeFirstAuthor = firstAuthor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${safeFirstAuthor}[^.]{0,120}${source.year}`, 'i');
    if (!pattern.test(generatedText)) continue;
    const accordingTo = accordingToCandidates.find((label) => !label.toLowerCase().startsWith(firstAuthor.toLowerCase())) || source.citedAccordingTo || source.sourceDocumentName || null;
    const formatted =
      formatCandidateForFinalLiterature(
        {
          ...source,
          matchedFromText: true,
          citedAccordingTo:
            accordingTo,
        },
        citationStyle,
      );
    if (formatted) secondary.push(formatted);
  }

  for (const verified of externalSources) {
    if (
      !verified.citationText ||
      !generatedText.includes(
        verified.citationText,
      )
    ) {
      continue;
    }

    const formattedVerified =
      formatCandidateForFinalLiterature(
        verifiedSourceToBibliographicCandidate(
          verified,
        ),
        citationStyle,
      );

    if (formattedVerified) {
      secondary.push(
        formattedVerified,
      );
    }
  }

  const completedSecondary =
    completeSecondarySourcesWithEveryInTextCitation({
      secondarySources: secondary,
      citationsFromGeneratedText,
      detectedSourcesForOutput,
      citationStyle,
    });

  return uniqueArray(
    completedSecondary
      .map((item) => normalizeText(item).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .filter((item) => !looksLikeIncompleteInitialCitation(item))
      .filter((item) => !/Autori:\s*|Pôvodný záznam|DOI:\s*neuvedené|URL:\s*neuvedené/i.test(item)),
  ).slice(0, maxFinalSourcesInOutput);
}



type FinalCitationRecord = {
  kind: 'primary' | 'secondary';
  displayText: string;
  bibliography: string;
  authors: string[];
  year: string | null;
  number: number;
};

function getCitationFamilyName(
  authors: string[],
): string {
  const firstAuthor =
    cleanValidAuthors(authors)[0] || '';

  return normalizeText(firstAuthor)
    .replace(/,.*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-1)[0] || '';
}

function buildAuthorYearCitationForRecord(
  record: Pick<
    FinalCitationRecord,
    'authors' | 'year'
  >,
): string {
  const familyName =
    getCitationFamilyName(record.authors);

  if (!familyName || !record.year) {
    return '';
  }

  return record.authors.length > 1
    ? `(${familyName} et al., ${record.year})`
    : `(${familyName}, ${record.year})`;
}

function buildAllSecondaryCitationRecords({
  detectedSourcesForOutput,
  externalSources = [],
  citationStyle,
  startNumber,
}: {
  detectedSourcesForOutput: BibliographicCandidate[];
  externalSources?: VerifiedSource[];
  citationStyle: string;
  startNumber: number;
}): FinalCitationRecord[] {
  const candidates =
    mergeBibliographicCandidates(
      detectedSourcesForOutput,
      externalSources.map(
        verifiedSourceToBibliographicCandidate,
      ),
    )
      .filter(candidateHasUsableData)
      .filter(isSourceCompleteEnoughForSecondary)
      .filter(
        (source) =>
          !looksLikeRawOcrPage(
            source.raw || '',
          ),
      )
      .filter(
        (source) =>
          !looksLikeIncompleteInitialCitation(
            source.raw || '',
          ),
      );

  const unique = new Map<
    string,
    Omit<FinalCitationRecord, 'number'>
  >();

  for (const source of candidates) {
    const bibliography =
      formatCandidateForFinalLiterature(
        source,
        citationStyle,
      );

    if (!bibliography) continue;

    const key =
      getSourceCitationKey(source) ||
      normalizeForSemanticMatch(
        bibliography,
      );

    if (!key || unique.has(key)) continue;

    unique.set(key, {
      kind: 'secondary',
      displayText: bibliography,
      bibliography,
      authors: cleanValidAuthors(
        source.authors || [],
      ),
      year: source.year || null,
    });
  }

  return Array.from(unique.values())
    .slice(0, maxFinalSourcesInOutput)
    .map((record, index) => ({
      ...record,
      number: startNumber + index,
    }));
}

function buildUsedSecondaryCitationRecords({
  allRecords,
  usedBibliography,
}: {
  allRecords: FinalCitationRecord[];
  usedBibliography: string[];
}): FinalCitationRecord[] {
  const normalizedUsed =
    new Set(
      usedBibliography
        .map((item) =>
          normalizeForSemanticMatch(item),
        )
        .filter(Boolean),
    );

  const matched =
    allRecords.filter((record) => {
      const normalizedRecord =
        normalizeForSemanticMatch(
          record.bibliography,
        );

      if (
        normalizedUsed.has(
          normalizedRecord,
        )
      ) {
        return true;
      }

      return Array.from(normalizedUsed).some(
        (item) =>
          item.length >= 24 &&
          (
            normalizedRecord.includes(item) ||
            item.includes(normalizedRecord)
          ),
      );
    });

  if (matched.length) {
    return matched;
  }

  return usedBibliography
    .map((bibliography, index) => ({
      kind: 'secondary' as const,
      displayText: bibliography,
      bibliography,
      authors: [],
      year: null,
      number: index + 1,
    }))
    .filter(
      (record) =>
        Boolean(record.bibliography.trim()),
    );
}


function mergeCitationRecords(
  records: FinalCitationRecord[],
): FinalCitationRecord[] {
  const unique = new Map<
    string,
    FinalCitationRecord
  >();

  for (const record of records) {
    const key =
      normalizeForSemanticMatch(
        record.bibliography ||
          record.displayText,
      );

    if (!key) continue;

    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, record);
      continue;
    }

    unique.set(key, {
      ...existing,
      authors:
        existing.authors.length
          ? existing.authors
          : record.authors,
      year:
        existing.year ||
        record.year,
      number: Math.min(
        existing.number,
        record.number,
      ),
    });
  }

  return Array.from(
    unique.values(),
  );
}

function replaceAuthorYearWithFootnoteMarkers({
  text,
  records,
}: {
  text: string;
  records: FinalCitationRecord[];
}): string {
  let output = normalizeText(text);

  for (const record of records) {
    const familyName =
      getCitationFamilyName(
        record.authors,
      );

    if (
      !familyName ||
      !record.year
    ) {
      continue;
    }

    const escapedFamily =
      familyName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );
    const escapedYear =
      String(record.year).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

    const parenthetical =
      new RegExp(
        `\\(\\s*${escapedFamily}(?:\\s+(?:et\\s+al\\.?|a\\s+kol\\.?))?(?:\\s*(?:,|;|&|a)\\s*[^()]{1,100})?\\s*,?\\s*${escapedYear}[a-z]?\\s*\\)`,
        'gi',
      );

    output = output.replace(
      parenthetical,
      `[${record.number}]`,
    );
  }

  return output;
}

function replaceNumericMarkersWithAuthorYear({
  text,
  records,
}: {
  text: string;
  records: FinalCitationRecord[];
}): string {
  const byNumber = new Map(
    records.map((record) => [
      record.number,
      record,
    ]),
  );

  return normalizeText(text)
    .replace(
      /\[(\d{1,3})\]/g,
      (_match, rawNumber: string) => {
        const record = byNumber.get(
          Number(rawNumber),
        );

        if (!record) return '';

        return (
          buildAuthorYearCitationForRecord(
            record,
          ) || ''
        );
      },
    )
    .replace(
      /\s+([,.!?;:])/g,
      '$1',
    )
    .replace(
      /\s{2,}/g,
      ' ',
    )
    .replace(
      /\n{4,}/g,
      '\n\n\n',
    )
    .trim();
}

function appendPrimaryFootnoteWhenMissing({
  text,
  primaryRecords,
}: {
  text: string;
  primaryRecords: FinalCitationRecord[];
}): string {
  const cleaned = normalizeText(text);

  if (
    !primaryRecords.length ||
    /\[\d{1,3}\]/.test(cleaned)
  ) {
    return cleaned;
  }

  const firstReference =
    primaryRecords[0];

  const paragraphs =
    cleaned.split(/\n\s*\n/);

  const targetIndex =
    paragraphs.findIndex((paragraph) => {
      const value = paragraph.trim();

      return (
        value.length >= 80 &&
        !/^(Primárne zdroje|Sekundárne zdroje)/i.test(
          value,
        )
      );
    });

  if (targetIndex < 0) {
    return cleaned
      ? `${cleaned} [${firstReference.number}]`
      : cleaned;
  }

  paragraphs[targetIndex] =
    `${paragraphs[targetIndex]
      .trim()
      .replace(/\s*$/, '')} [${firstReference.number}]`;

  return paragraphs.join('\n\n');
}

function renumberFootnoteRecords({
  text,
  records,
}: {
  text: string;
  records: FinalCitationRecord[];
}): {
  text: string;
  records: FinalCitationRecord[];
} {
  const usedNumbers =
    new Set(
      extractNumericCitationsFromText(
        text,
      ),
    );

  const selected =
    records.filter(
      (record) =>
        record.kind === 'primary' ||
        usedNumbers.has(record.number),
    );

  const normalizedSelected =
    selected.length
      ? selected
      : records.filter(
          (record) =>
            record.kind === 'primary',
        );

  const numberMap = new Map<
    number,
    number
  >();

  const renumbered =
    normalizedSelected.map(
      (record, index) => {
        const nextNumber = index + 1;

        numberMap.set(
          record.number,
          nextNumber,
        );

        return {
          ...record,
          number: nextNumber,
        };
      },
    );

  const normalizedText =
    normalizeText(text)
      .replace(
        /\[(\d{1,3})\]/g,
        (_match, rawNumber: string) => {
          const nextNumber =
            numberMap.get(
              Number(rawNumber),
            );

          return nextNumber
            ? `[${nextNumber}]`
            : '';
        },
      )
      .replace(
        /\s+([,.!?;:])/g,
        '$1',
      )
      .replace(
        /\s{2,}/g,
        ' ',
      )
      .replace(
        /\n{4,}/g,
        '\n\n\n',
      )
      .trim();

  return {
    text: normalizedText,
    records: renumbered,
  };
}

function formatMultilineSourceItem({
  text,
  prefix,
}: {
  text: string;
  prefix: string;
}): string {
  const lines = normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return '';

  const indentation =
    ' '.repeat(prefix.length);

  return [
    `${prefix}${lines[0]}`,
    ...lines
      .slice(1)
      .map(
        (line) =>
          `${indentation}${line}`,
      ),
  ].join('\n');
}

function formatCitationAwareSourceBlock({
  records,
  citationStyle,
}: {
  records: FinalCitationRecord[];
  citationStyle: string;
}): string {
  if (!records.length) return '';

  const footnoteMode =
    isFootnoteCitationStyle(
      citationStyle,
    );

  return records
    .map((record) =>
      formatMultilineSourceItem({
        text: record.displayText,
        prefix: footnoteMode
          ? `[${record.number}] `
          : '- ',
      }),
    )
    .filter(Boolean)
    .join('\n\n');
}

function buildCitationRegistryInstruction({
  citationStyle,
  extractedFiles,
  detectedSourcesForOutput,
  externalSources = [],
}: {
  citationStyle: string;
  extractedFiles: ExtractedAttachment[];
  detectedSourcesForOutput: BibliographicCandidate[];
  externalSources?: VerifiedSource[];
}): string {
  const normalizedStyle =
    normalizeCitationStyle(
      citationStyle,
    );
  const primaryRecords =
    buildPrimaryCitationRecords({
      detectedSourcesForOutput,
      extractedFiles,
      attachmentWasRelevant:
        extractedFiles.length > 0,
      citationStyle:
        normalizedStyle,
    }).map((record, index) => ({
      kind: 'primary' as const,
      displayText:
        record.displayText,
      bibliography:
        record.bibliography,
      authors: record.authors,
      year: record.year,
      number: index + 1,
    }));

  const secondaryRecords =
    buildAllSecondaryCitationRecords({
      detectedSourcesForOutput,
      externalSources,
      citationStyle:
        normalizedStyle,
      startNumber:
        primaryRecords.length + 1,
    }).slice(0, 60);

  if (
    !isFootnoteCitationStyle(
      normalizedStyle,
    )
  ) {
    return buildCitationStyleRuleBlock(
      normalizedStyle,
    );
  }

  const registry = [
    ...primaryRecords,
    ...secondaryRecords,
  ];

  const registryLines =
    registry.length
      ? registry.map((record) =>
          `[${record.number}] ${
            record.kind === 'primary'
              ? 'PRIMÁRNY'
              : 'SEKUNDÁRNY'
          }: ${record.bibliography}`,
        )
      : [
          'Register je zatiaľ prázdny. Nepoužívaj žiadne referenčné číslo.',
        ];

  return [
    buildCitationStyleRuleBlock(
      normalizedStyle,
    ),
    '',
    'ZÁVÄZNÝ CITAČNÝ REGISTER PRE TÚTO ODPOVEĎ:',
    ...registryLines,
  ].join('\n');
}

function buildCitationAwareFinalOutput({
  text,
  detectedSourcesForOutput,
  extractedFiles,
  externalSources = [],
  attachmentWasRelevant,
  citationStyle,
}: {
  text: string;
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  externalSources?: VerifiedSource[];
  attachmentWasRelevant: boolean;
  citationStyle: string;
}): string {
  const normalizedStyle =
    normalizeCitationStyle(
      citationStyle,
    );
  const mode =
    getCitationStyleMode(
      normalizedStyle,
    );
  const cleanedText =
    normalizeText(text);
  const bodyWithoutSources =
    removeExistingSourceTail(
      cleanedText,
    );

  const primaryRecords =
    buildPrimaryCitationRecords({
      detectedSourcesForOutput,
      extractedFiles,
      attachmentWasRelevant,
      citationStyle:
        normalizedStyle,
    }).map((record, index) => ({
      kind: 'primary' as const,
      displayText:
        record.displayText,
      bibliography:
        record.bibliography,
      authors: record.authors,
      year: record.year,
      number: index + 1,
    }));

  const allSecondaryRecords =
    buildAllSecondaryCitationRecords({
      detectedSourcesForOutput,
      externalSources,
      citationStyle:
        normalizedStyle,
      startNumber:
        primaryRecords.length + 1,
    });

  const usedSecondaryBibliography =
    buildSecondaryLiteratureFromUsedCitations({
      detectedSourcesForOutput,
      generatedText: cleanedText,
      externalSources,
      citationStyle:
        normalizedStyle,
    });

  let secondaryRecords: FinalCitationRecord[] =
    buildUsedSecondaryCitationRecords({
      allRecords:
        allSecondaryRecords,
      usedBibliography:
        usedSecondaryBibliography,
    }).map((record, index) => ({
      ...record,
      number:
        primaryRecords.length +
        index +
        1,
    }));

  let normalizedBody =
    bodyWithoutSources;

  let finalPrimaryRecords: FinalCitationRecord[] =
    primaryRecords;
  let finalSecondaryRecords: FinalCitationRecord[] =
    secondaryRecords;

  if (
    mode === 'FOOTNOTE_REFERENCES'
  ) {
    const preliminaryRecords = [
      ...primaryRecords,
      ...allSecondaryRecords,
    ];

    normalizedBody =
      replaceAuthorYearWithFootnoteMarkers({
        text: normalizedBody,
        records:
          preliminaryRecords,
      });

    normalizedBody =
      appendPrimaryFootnoteWhenMissing({
        text: normalizedBody,
        primaryRecords,
      });

    const usedNumbers =
      new Set(
        extractNumericCitationsFromText(
          normalizedBody,
        ),
      );

    const numericSecondary =
      allSecondaryRecords.filter(
        (record) =>
          usedNumbers.has(
            record.number,
          ),
      );

    if (numericSecondary.length) {
      secondaryRecords =
        mergeCitationRecords([
          ...numericSecondary,
          ...secondaryRecords,
        ]);
    }

    const synchronized =
      renumberFootnoteRecords({
        text: normalizedBody,
        records: [
          ...primaryRecords,
          ...secondaryRecords,
        ],
      });

    normalizedBody =
      synchronized.text;
    finalPrimaryRecords =
      synchronized.records.filter(
        (record) =>
          record.kind === 'primary',
      );
    finalSecondaryRecords =
      synchronized.records.filter(
        (record) =>
          record.kind === 'secondary',
      );
  } else {
    const records = [
      ...primaryRecords,
      ...secondaryRecords,
    ].map((record, index) => ({
      ...record,
      number: index + 1,
    }));

    normalizedBody =
      replaceNumericMarkersWithAuthorYear({
        text: normalizedBody,
        records,
      });

    finalPrimaryRecords =
      records.filter(
        (record) =>
          record.kind === 'primary',
      );
    finalSecondaryRecords =
      records.filter(
        (record) =>
          record.kind === 'secondary',
      );
  }

  const primaryBlock =
    formatCitationAwareSourceBlock({
      records:
        finalPrimaryRecords,
      citationStyle:
        normalizedStyle,
    }) ||
    (
      attachmentWasRelevant
        ? 'Neuvedené. Relevantný primárny dokument nebol jednoznačne identifikovaný.'
        : 'Žiadne prílohy neboli dodané, preto neboli použité žiadne primárne zdroje.'
    );

  const secondaryBlock =
    formatCitationAwareSourceBlock({
      records:
        finalSecondaryRecords,
      citationStyle:
        normalizedStyle,
    }) ||
    'Neuvedené. V texte nebol použitý žiadny bezpečne identifikovaný sekundárny zdroj.';

  const finalBlock = [
    'Primárne zdroje',
    '',
    primaryBlock,
    '',
    'Sekundárne zdroje',
    '',
    secondaryBlock,
    '',
    `Počet spracovaných príloh: ${extractedFiles.length}`,
  ].join('\n');

  return finalizeSourceSections(
    `${normalizedBody}\n\n${finalBlock}`.trim(),
  );
}


function ensureOutputHasPrimarySecondarySources({
  text,
  detectedSourcesForOutput,
  extractedFiles,
  externalSources = [],
  attachmentWasRelevant = true,
  citationStyle = 'ISO',
}: {
  text: string;
  detectedSourcesForOutput: BibliographicCandidate[];
  extractedFiles: ExtractedAttachment[];
  externalSources?: VerifiedSource[];
  attachmentWasRelevant?: boolean;
  citationStyle?: string;
}) {
  return buildCitationAwareFinalOutput({
    text,
    detectedSourcesForOutput,
    extractedFiles,
    externalSources,
    attachmentWasRelevant,
    citationStyle,
  });
}

function formatPrimaryAndSecondarySourcesOnly(
  candidates: BibliographicCandidate[],
  citationStyle = 'ISO',
) {
  const normalizedStyle =
    normalizeCitationStyle(
      citationStyle,
    );
  const footnoteMode =
    isFootnoteCitationStyle(
      normalizedStyle,
    );

  const unique =
    mergeBibliographicCandidates(
      candidates,
    )
      .filter(candidateHasUsableData)
      .filter(
        (source) =>
          !looksLikeRawOcrPage(
            source.raw || '',
          ),
      )
      .filter(
        (source) =>
          !looksLikeIncompleteInitialCitation(
            source.raw || '',
          ),
      );

  const primaryDocuments =
    uniqueArray(
      unique
        .map(
          (source) =>
            source.sourceDocumentName ||
            '',
        )
        .filter(Boolean)
        .map((name) =>
          normalizeText(name)
            .replace(/\s+/g, ' ')
            .trim(),
        ),
    );

  const secondary =
    unique
      .map((item) =>
        formatCandidateForFinalLiterature(
          item,
          normalizedStyle,
        ),
      )
      .filter(Boolean);

  const primaryText =
    primaryDocuments.length
      ? primaryDocuments
          .map((item, index) =>
            footnoteMode
              ? `[${index + 1}] ${item}`
              : `- ${item}`,
          )
          .join('\n')
      : 'Neuvedené.';

  const secondaryStart =
    primaryDocuments.length + 1;

  const secondaryText =
    secondary.length
      ? secondary
          .map((item, index) =>
            footnoteMode
              ? `[${secondaryStart + index}] ${item}`
              : `- ${item}`,
          )
          .join('\n')
      : 'Neuvedené.';

  return finalizeSourceSections(
    `Primárne zdroje\n\n${primaryText}\n\nSekundárne zdroje\n\n${secondaryText}`.trim(),
  );
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
    .filter((source) => !source.bibliographyText.toLowerCase().includes(REQUIRED_VERIFICATION_NOTICE.toLowerCase()))
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

function isGzipFile(file: UploadedFile) {
  return (file.name || '').toLowerCase().endsWith('.gz') || file.type === 'application/gzip' || file.type === 'application/x-gzip';
}

function isAllowedAttachment(file: UploadedFile) {
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

async function getUsableFileBuffer(file: UploadedFile) {
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const gzip = isGzipFile(file);

  if (originalBuffer.length === 0) {
    throw new Error('EMPTY_ATTACHMENT: Priložený súbor je prázdny.');
  }

  if (originalBuffer.length > maxCompressedFileSizeBytes) {
    throw new Error(
      `ATTACHMENT_TOO_LARGE: Súbor má ${originalBuffer.length} bajtov. Maximálna povolená veľkosť je ${maxCompressedFileSizeBytes} bajtov (30 MB).`,
    );
  }

  if (!gzip) {
    return {
      usableBuffer: originalBuffer,
      compressedSize: originalBuffer.length,
      decompressedSize: originalBuffer.length,
      wasDecompressed: false,
      compressionWithinLimit: true,
      compressionStatus: 'Súbor je v povolenom limite do 30 MB.',
    };
  }

  const decompressed = safeGunzip(originalBuffer);

  if (decompressed.length > maxDecompressedFileSizeBytes) {
    throw new Error(
      `DECOMPRESSED_ATTACHMENT_TOO_LARGE: Rozbalený súbor má ${decompressed.length} bajtov. Maximálna povolená rozbalená veľkosť je ${maxDecompressedFileSizeBytes} bajtov (60 MB).`,
    );
  }

  return {
    usableBuffer: decompressed,
    compressedSize: originalBuffer.length,
    decompressedSize: decompressed.length,
    wasDecompressed: true,
    compressionWithinLimit: true,
    compressionStatus: 'Komprimovaný súbor je v povolenom limite a bol úspešne rozbalený.',
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  type PdfTextResult = {
    text?: unknown;
  };

  type PdfParserInstance = {
    getText: () => Promise<PdfTextResult | string>;
    destroy?: () => Promise<void> | void;
  };

  type PdfParserConstructor = new (
    options: Record<string, unknown>,
  ) => PdfParserInstance;

  type LegacyPdfParser = (
    input: Buffer,
  ) => Promise<PdfTextResult | string>;

  /**
   * Dôležité pre Next.js/Node.js:
   *
   * Nepoužívame import `pdf-parse/worker`. Tento subpath nie je dostupný
   * vo všetkých publikovaných verziách balíka pdf-parse a Turbopack ho preto
   * nedokáže pri builde bezpečne vyriešiť. Serverový Node.js variant používa
   * priamo hlavný export `pdf-parse`; explicitný worker je určený najmä pre
   * browser build.
   */
  const importedModule = (await import(
    'pdf-parse'
  )) as Record<string, unknown>;

  const defaultExport = importedModule.default;
  const nestedDefault =
    defaultExport && typeof defaultExport === 'object'
      ? (defaultExport as Record<string, unknown>).default
      : undefined;

  const moduleCandidates: unknown[] = [
    importedModule,
    defaultExport,
    nestedDefault,
  ].filter(Boolean);

  const parserErrors: string[] = [];

  // pdf-parse v2/v3: import { PDFParse } from 'pdf-parse'
  for (const candidate of moduleCandidates) {
    if (
      !candidate ||
      (typeof candidate !== 'object' &&
        typeof candidate !== 'function')
    ) {
      continue;
    }

    const candidateRecord =
      candidate as Record<string, unknown>;
    const constructorCandidate =
      candidateRecord.PDFParse;

    if (typeof constructorCandidate !== 'function') {
      continue;
    }

    const PDFParseConstructor =
      constructorCandidate as PdfParserConstructor;
    const parser = new PDFParseConstructor({
      data: new Uint8Array(buffer),
    });

    try {
      const result = await parser.getText();
      const extracted = normalizeText(
        typeof result === 'string'
          ? result
          : String(result?.text || ''),
      );

      if (extracted) return extracted;
    } catch (error) {
      parserErrors.push(
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      if (typeof parser.destroy === 'function') {
        await Promise.resolve(parser.destroy()).catch(
          () => undefined,
        );
      }
    }
  }

  // pdf-parse v1: default export je funkcia pdfParse(buffer).
  for (const candidate of moduleCandidates) {
    if (typeof candidate !== 'function') continue;

    try {
      const result = await (
        candidate as LegacyPdfParser
      )(buffer);

      const extracted = normalizeText(
        typeof result === 'string'
          ? result
          : String(result?.text || ''),
      );

      if (extracted) return extracted;
    } catch (error) {
      parserErrors.push(
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

  const technicalDetail = Array.from(
    new Set(parserErrors.map((value) => value.trim()).filter(Boolean)),
  )
    .slice(0, 3)
    .join(' | ');

  throw new Error(
    [
      'PDF_PARSER_NOT_AVAILABLE: PDF sa nepodarilo spracovať na serveri.',
      'Skontrolujte nainštalovaný balík pdf-parse a textovú vrstvu dokumentu.',
      technicalDetail ? `Technický detail: ${technicalDetail}` : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  type MammothApi = {
    extractRawText: (
      input: { buffer: Buffer },
    ) => Promise<{ value?: unknown }>;
  };

  const importedModule = (await import(
    'mammoth'
  )) as Record<string, unknown>;

  const defaultExport =
    importedModule.default &&
    typeof importedModule.default === 'object'
      ? importedModule.default as Record<string, unknown>
      : importedModule.default;

  const candidates: unknown[] = [
    importedModule,
    defaultExport,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (
      !candidate ||
      (typeof candidate !== 'object' &&
        typeof candidate !== 'function')
    ) {
      continue;
    }

    const candidateRecord =
      candidate as Record<string, unknown>;

    const extractRawText =
      candidateRecord.extractRawText;

    if (typeof extractRawText !== 'function') {
      continue;
    }

    const result = await (
      extractRawText as MammothApi['extractRawText']
    )({ buffer });

    const extracted = normalizeText(
      String(result?.value || ''),
    );

    if (extracted) {
      return extracted;
    }
  }

  throw new Error(
    'DOCX_PARSER_NOT_AVAILABLE: Balík Mammoth sa načítal, ale neposkytol funkciu extractRawText alebo dokument neobsahuje čitateľný text.',
  );
}


function getNativeAttachmentMediaType(
  file: UploadedFile,
): string | null {
  const extension =
    getEffectiveExtension(file.name);

  const explicitType =
    String(file.type || '')
      .trim()
      .toLowerCase();

  if (
    explicitType.startsWith('image/')
  ) {
    return explicitType;
  }

  if (explicitType === 'application/pdf') {
    return explicitType;
  }

  const byExtension: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  return byExtension[extension] || null;
}

async function buildNativeAttachmentBundle({
  files,
  extractedFiles,
}: {
  files: UploadedFile[];
  extractedFiles: ExtractedAttachment[];
}): Promise<NativeAttachmentBundle> {
  const unreadNames = new Set(
    extractedFiles
      .filter(
        (file) =>
          file.extractedChars <= 0 ||
          !file.extractedText.trim(),
      )
      .flatMap((file) => [
        file.preparedName,
        file.originalName,
        file.name,
      ])
      .filter(Boolean),
  );

  const parts: NativeAttachmentPart[] = [];
  const fileNames: string[] = [];

  for (
    const file of files.slice(
      0,
      MAX_ATTACHMENTS_TO_PROCESS,
    )
  ) {
    if (
      unreadNames.size > 0 &&
      !unreadNames.has(file.name)
    ) {
      continue;
    }

    const mediaType =
      getNativeAttachmentMediaType(file);

    if (!mediaType) {
      continue;
    }

    const bufferInfo =
      await getUsableFileBuffer(file);

    const data = new Uint8Array(
      bufferInfo.usableBuffer,
    );

    if (mediaType.startsWith('image/')) {
      parts.push({
        type: 'image',
        image: data,
        mediaType,
      });
    } else {
      parts.push({
        type: 'file',
        data,
        mediaType,
        filename: file.name,
      });
    }

    fileNames.push(file.name);
  }

  return {
    parts,
    fileNames,
  };
}

function appendNativeAttachmentPartsToMessages(
  normalizedMessages: ChatMessage[],
  nativeAttachmentParts: NativeAttachmentPart[],
): any[] {
  if (nativeAttachmentParts.length === 0) {
    return normalizedMessages;
  }

  const messages = normalizedMessages.map(
    (message) => ({
      ...message,
    }),
  ) as any[];

  let userIndex = -1;

  for (
    let index = messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    if (messages[index]?.role === 'user') {
      userIndex = index;
      break;
    }
  }

  const instruction = [
    'Prečítaj všetky priložené súbory, ktoré sú súčasťou tejto správy.',
    'Pri PDF alebo obrázku použi priamo vizuálny a dokumentový obsah.',
    'Nevyhlasuj, že príloha nie je dostupná, pokiaľ je súčasťou správy.',
  ].join(' ');

  if (userIndex < 0) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: instruction,
        },
        ...nativeAttachmentParts,
      ],
    });

    return messages;
  }

  const originalText = String(
    messages[userIndex]?.content || '',
  );

  messages[userIndex] = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `${originalText}\n\n${instruction}`.trim(),
      },
      ...nativeAttachmentParts,
    ],
  };

  return messages;
}

function getNativeAttachmentReaderModels(): ModelResult[] {
  const readers: ModelResult[] = [];

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    readers.push({
      model: google(
        process.env.GOOGLE_ATTACHMENT_MODEL ||
          process.env.GOOGLE_MODEL ||
          'gemini-2.5-flash',
      ) as any,
      providerLabel: 'Gemini attachment reader',
    });
  }

  if (process.env.OPENAI_API_KEY) {
    readers.push({
      model: openai(
        process.env.OPENAI_ATTACHMENT_MODEL ||
          'gpt-4o',
      ),
      providerLabel: 'OpenAI attachment reader',
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    readers.push({
      model: anthropic(
        process.env.ANTHROPIC_ATTACHMENT_MODEL ||
          process.env.ANTHROPIC_MODEL ||
          'claude-sonnet-4-6',
      ) as any,
      providerLabel: 'Claude attachment reader',
    });
  }

  return readers;
}

async function extractTextWithNativeAttachmentReader({
  parts,
  fileNames,
}: NativeAttachmentBundle): Promise<string> {
  if (parts.length === 0) {
    return '';
  }

  const readers = getNativeAttachmentReaderModels();

  if (!readers.length) {
    console.warn('CHAT_NATIVE_ATTACHMENT_READER_UNAVAILABLE:', {
      files: fileNames,
      message:
        'Nie je nastavený žiadny multimodálny model pre PDF alebo obrázky.',
    });
    return '';
  }

  const errors: string[] = [];

  for (const reader of readers) {
    try {
      const result = await generateText({
        model: reader.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Extrahuj a prepíš všetok čitateľný text z každého priloženého dokumentu alebo obrázka.',
                  'Zachovaj nadpisy, odseky, tabuľkové hodnoty, citácie, zoznam literatúry a poradie strán.',
                  'Nevytváraj súhrn, interpretáciu ani komentár.',
                  'Nevynechávaj odborné termíny, mená autorov, roky, DOI ani URL.',
                  `Súbory: ${fileNames.join(', ') || 'neuvedené'}.`,
                ].join(' '),
              },
              ...parts,
            ],
          },
        ] as any,
        temperature: 0,
        maxOutputTokens: 16_000,
      });

      const extracted = normalizeText(result.text || '');

      console.log('CHAT_NATIVE_ATTACHMENT_READER:', {
        provider: reader.providerLabel,
        files: fileNames,
        extractedCharacters: extracted.length,
      });

      if (extracted.length >= 40) {
        return extracted;
      }

      errors.push(
        `${reader.providerLabel}: model vrátil prázdny alebo príliš krátky text.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      errors.push(`${reader.providerLabel}: ${message}`);

      console.warn('CHAT_NATIVE_ATTACHMENT_READER_WARNING:', {
        provider: reader.providerLabel,
        files: fileNames,
        message,
      });
    }
  }

  console.error('CHAT_NATIVE_ATTACHMENT_READER_FAILED:', {
    files: fileNames,
    errors,
  });

  return '';
}

function getPreparedMetadataForFile(file: UploadedFile, preparedFilesMetadata: PreparedFileMetadata[]) {
  const fileName = file.name || '';
  return preparedFilesMetadata.find((item) => item.preparedName === fileName) || preparedFilesMetadata.find((item) => item.originalName === fileName) || null;
}

async function extractTextFromSingleFile(file: UploadedFile, preparedFilesMetadata: PreparedFileMetadata[]): Promise<ExtractedAttachment> {
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
  const metadataExtractedText = getPreparedMetadataExtractedText(preparedMetadata);

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
      let fallbackText = normalizeText(metadataExtractedText);
      let fallbackMethod = fallbackText
        ? 'client_or_preprocessed_fallback'
        : '';

      if (!fallbackText && getNativeAttachmentMediaType(file)) {
        const nativeBundle = await buildNativeAttachmentBundle({
          files: [file],
          extractedFiles: [],
        });

        fallbackText = normalizeText(
          await extractTextWithNativeAttachmentReader(nativeBundle),
        );

        if (fallbackText) {
          fallbackMethod = 'native_multimodal_reader';
        }
      }

      const fallbackCitations = fallbackText
        ? extractInTextCitations(fallbackText)
        : [];
      const fallbackCandidates = fallbackText
        ? extractBibliographicCandidates(fallbackText, 'attachment')
        : [];
      const bibliographicCandidates = mergeBibliographicCandidates(
        metadataCandidates,
        metadataCitationSources,
        fallbackCandidates,
        buildLiteratureFromInTextCitations(fallbackCitations, 'citation'),
      ).map((source) => ({
        ...source,
        sourceDocumentName: source.sourceDocumentName || originalName,
        citedAccordingTo: source.citedAccordingTo || originalName,
      }));

      return {
        ...base,
        compressedSize: bufferInfo.compressedSize,
        decompressedSize: bufferInfo.decompressedSize,
        wasDecompressed: bufferInfo.wasDecompressed,
        compressionWithinLimit: bufferInfo.compressionWithinLimit,
        compressionStatus: bufferInfo.compressionStatus,
        extractedText: limitText(fallbackText, maxExtractedCharsPerAttachment),
        extractedChars: fallbackText.length,
        extractedPreview: fallbackText.slice(0, 1200),
        status: fallbackText
          ? fallbackMethod === 'native_multimodal_reader'
            ? 'Text bol úspešne extrahovaný multimodálnym čítačom.'
            : 'Text bol prevzatý z klientského alebo predspracovaného fallbacku.'
          : 'Súbor bol priložený, ale z tohto typu sa nepodarilo extrahovať text.',
        error: null,
        bibliographicCandidates,
        inTextCitations: uniqueArray(
          [...metadataInTextCitations, ...fallbackCitations].map((item) =>
            JSON.stringify(item),
          ),
        ).map((item) => JSON.parse(item) as InTextCitation),
        detectedAuthors: cleanValidAuthors([
          ...metadataAuthors,
          ...fallbackCitations.flatMap((citation) => citation.authors || []),
          ...extractAuthorsFromCandidates(bibliographicCandidates),
        ]),
      };
    }

    let extractedText = '';
    if (['.txt', '.md', '.csv'].includes(effectiveExtension)) extractedText = normalizeText(bufferInfo.usableBuffer.toString('utf8'));
    else if (effectiveExtension === '.rtf') extractedText = normalizeText(stripRtf(bufferInfo.usableBuffer.toString('utf8')));
    else if (effectiveExtension === '.docx') extractedText = await extractDocxText(bufferInfo.usableBuffer);
    else if (effectiveExtension === '.pdf') extractedText = await extractPdfText(bufferInfo.usableBuffer);

    extractedText = normalizeText(extractedText) || normalizeText(metadataExtractedText);

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
    const fallbackText = normalizeText(metadataExtractedText);

    if (fallbackText) {
      const fallbackCitations = extractInTextCitations(fallbackText);
      const fallbackCandidates = mergeBibliographicCandidates(
        metadataCandidates,
        metadataCitationSources,
        extractBibliographicCandidates(fallbackText, 'attachment'),
        buildLiteratureFromInTextCitations(fallbackCitations, 'citation'),
      ).map((source) => ({
        ...source,
        sourceDocumentName: source.sourceDocumentName || originalName,
        citedAccordingTo: source.citedAccordingTo || originalName,
      }));

      return {
        ...base,
        compressedSize: size,
        decompressedSize: size,
        wasDecompressed: false,
        compressionWithinLimit: size <= maxCompressedFileSizeBytes,
        compressionStatus: 'Serverová extrakcia zlyhala; použitý bol text z klientského alebo predspracovaného fallbacku.',
        extractedText: limitText(fallbackText, maxExtractedCharsPerAttachment),
        extractedChars: fallbackText.length,
        extractedPreview: fallbackText.slice(0, 1200),
        status: 'Text bol úspešne načítaný z fallbacku po zlyhaní serverovej extrakcie.',
        error: null,
        warning: [base.warning, message].filter(Boolean).join(' | '),
        bibliographicCandidates: fallbackCandidates,
        inTextCitations: uniqueArray(
          [...metadataInTextCitations, ...fallbackCitations].map((item) =>
            JSON.stringify(item),
          ),
        ).map((item) => JSON.parse(item) as InTextCitation),
        detectedAuthors: cleanValidAuthors([
          ...metadataAuthors,
          ...fallbackCitations.flatMap((citation) => citation.authors || []),
          ...extractAuthorsFromCandidates(fallbackCandidates),
        ]),
      };
    }

    // Posledný serverový fallback pre PDF a obrázky:
    // súbor sa odošle priamo multimodálnemu modelu ako FilePart.
    // Týmto sa spracujú aj skenované PDF bez textovej vrstvy.
    if (getNativeAttachmentMediaType(file)) {
      try {
        const nativeBundle = await buildNativeAttachmentBundle({
          files: [file],
          extractedFiles: [],
        });

        const nativeText = normalizeText(
          await extractTextWithNativeAttachmentReader(nativeBundle),
        );

        if (nativeText) {
          const nativeCitations =
            extractInTextCitations(nativeText);
          const nativeCandidates =
            mergeBibliographicCandidates(
              metadataCandidates,
              metadataCitationSources,
              extractBibliographicCandidates(
                nativeText,
                'attachment',
              ),
              buildLiteratureFromInTextCitations(
                nativeCitations,
                'citation',
              ),
            ).map((source) => ({
              ...source,
              sourceDocumentName:
                source.sourceDocumentName ||
                originalName,
              citedAccordingTo:
                source.citedAccordingTo ||
                originalName,
            }));

          const inTextCitations =
            uniqueArray(
              [
                ...metadataInTextCitations,
                ...nativeCitations,
              ].map((item) =>
                JSON.stringify(item),
              ),
            ).map(
              (item) =>
                JSON.parse(item) as InTextCitation,
            );

          return {
            ...base,
            compressedSize: size,
            decompressedSize: size,
            wasDecompressed: false,
            compressionWithinLimit:
              size <= maxCompressedFileSizeBytes,
            compressionStatus:
              'Klasická extrakcia zlyhala; súbor bol úspešne spracovaný multimodálnym čítačom.',
            extractedText: limitText(
              nativeText,
              maxExtractedCharsPerAttachment,
            ),
            extractedChars: nativeText.length,
            extractedPreview:
              nativeText.slice(0, 1200),
            status:
              'Text bol úspešne extrahovaný multimodálnym čítačom PDF/OCR.',
            error: null,
            warning: [
              base.warning,
              `Klasický parser: ${message}`,
            ]
              .filter(Boolean)
              .join(' | '),
            bibliographicCandidates:
              nativeCandidates,
            inTextCitations,
            detectedAuthors:
              cleanValidAuthors([
                ...metadataAuthors,
                ...inTextCitations.flatMap(
                  (citation) =>
                    citation.authors || [],
                ),
                ...extractAuthorsFromCandidates(
                  nativeCandidates,
                ),
              ]),
          };
        }
      } catch (nativeError) {
        console.error(
          'CHAT_NATIVE_SINGLE_FILE_EXTRACTION_FAILED:',
          {
            file: originalName,
            parserError: message,
            nativeError:
              nativeError instanceof Error
                ? nativeError.message
                : String(nativeError),
          },
        );
      }
    }

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
  `Autori:
${authors.length ? authors.join(', ') : 'Autori neboli automaticky identifikovaní alebo ich treba overiť.'}

Detegované bibliografické záznamy:
${formatBibliographicCandidates(mergedSources)}

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
  files: UploadedFile[];
  preparedFilesMetadata: PreparedFileMetadata[];
  clientExtractedText: string;
  preparedFilesSummary: string;
  clientDetectedSourcesSummary: string;
  clientDetectedSources: BibliographicCandidate[];
}) {
  const extractedFiles: ExtractedAttachment[] = [];

  for (const file of files.slice(0, MAX_ATTACHMENTS_TO_PROCESS)) {
    extractedFiles.push(await extractTextFromSingleFile(file, preparedFilesMetadata));
  }

  const compactSources = buildCompactSourceSummary({ clientDetectedSourcesSummary, clientDetectedSources, extractedFiles });
  const attachmentTexts: string[] = [];

  if (preparedFilesSummary.trim()) {
    attachmentTexts.push(
      `TECHNICKÝ PREHĽAD PRÍLOH\n${limitText(preparedFilesSummary, 12_000)}`,
    );
  }

  const hasMeaningfulCompactSources =
    compactSources.sources.length > 0 ||
    compactSources.authors.length > 0 ||
    clientDetectedSourcesSummary.trim().length > 0;

  if (hasMeaningfulCompactSources) {
    attachmentTexts.push(compactSources.text);
  }

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
    attachmentTexts.push(`PRILOŽENÝ SÚBOR\nNázov pôvodného súboru: ${file.originalName}\nNázov prijatého súboru: ${file.preparedName}\nTyp: ${file.label}\nStav extrakcie: ${file.status}\nPočet extrahovaných znakov: ${file.extractedChars}\nPočet citácií v texte: ${file.inTextCitations.length}\nPočet detegovaných bibliografických kandidátov: ${file.bibliographicCandidates.length}\nAutori: ${file.detectedAuthors.length ? file.detectedAuthors.join(', ') : 'Údaje sú potrebné overiť.'}\nChyba: ${file.error || 'bez chyby'}\n\nCITÁCIE V TEXTE:\n${file.inTextCitations.map((citation, index) => `${index + 1}. ${citation.raw}`).join('\n') || 'neuvedené'}\n\nDETEGOVANÉ ZDROJE:\n${formatBibliographicCandidates(file.bibliographicCandidates)}\n\nEXTRAHOVANÝ TEXT:\n${file.extractedText || '[Text nebol extrahovaný alebo nie je dostupný.]'}`);
  }

  const combinedAttachmentText = attachmentTexts
    .join('\n\n-----------------\n\n')
    .trim();

  return {
    extractedFiles,
    attachmentTexts: combinedAttachmentText
      ? [limitText(combinedAttachmentText, maxAttachmentContextChars)]
      : [],
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

  // Aktuálne nahratá príloha je explicitná voľba používateľa.
  // Automatická tokenová kontrola je preto iba informatívna a nesmie zablokovať
  // načítanie dokumentu pri agentoch s krátkym alebo všeobecným profilom.
  const hasExplicitCurrentUpload =
    extractedFiles.some(
      (file) => file.extractedText.trim().length > 0 && !file.error,
    ) ||
    attachmentTexts.some((item) =>
      /EXTRAHOVANÝ TEXT Z \/api\/extract-text|PRILOŽENÝ SÚBOR/i.test(item),
    );

  const isRelevant =
    hasExplicitCurrentUpload ||
    matchedTokens.length >= 3 ||
    relevanceRatio >= 0.04;

  return { hasAttachmentContent, isRelevant, matchedTokens, profileTokens, attachmentTokens, relevanceRatio };
}

// =====================================================
// PROMPTS
// =====================================================

function buildProfileSummary(profile: SavedProfile | null) {
  if (!profile) return 'Profil práce nebol dodaný.';
  const keywords = getKeywords(profile);

  const citationStyle = getCitationStyle(profile);
const workLanguage = getWorkLanguage(profile);
const interfaceLanguage =
  profile.interfaceLanguage ||
  profile.language ||
  'sk';

const structure = Array.isArray(profile.schema?.structure)
  ? profile.schema?.structure.join(' | ')
  : typeof profile.schema?.structure === 'string'
    ? profile.schema.structure
    : 'Neuvedené';

const requiredSections = Array.isArray(profile.schema?.requiredSections)
  ? profile.schema?.requiredSections.join(' | ')
  : typeof profile.schema?.requiredSections === 'string'
    ? profile.schema.requiredSections
    : 'Neuvedené';

return `
AKTUÁLNY PROFIL PRÁCE:

Názov práce:
${profile.title || 'Neuvedené'}

Téma práce:
${profile.topic || 'Neuvedené'}

Typ práce:
${profile.schema?.label || profile.type || 'Neuvedené'}

Úroveň / odbornosť:
${profile.level || 'Neuvedené'}

Odbor / predmet / oblasť:
${profile.field || 'Neuvedené'}

Vedúci práce:
${profile.supervisor || 'Neuvedené'}

Jazyk rozhrania:
${interfaceLanguage}

Jazyk práce / jazyk výstupu:
${workLanguage}

Citačná norma:
${citationStyle}

Záväzné pravidlá citačného režimu:
${buildCitationStyleRuleBlock(citationStyle)}

Anotácia:
${profile.annotation || 'Neuvedené'}

Cieľ práce:
${profile.goal || 'Neuvedené'}

Výskumný problém:
${profile.problem || 'Neuvedené'}

Metodológia:
${profile.methodology || 'Neuvedené'}

Hypotézy:
${profile.hypotheses || 'Neuvedené'}

Výskumné otázky:
${profile.researchQuestions || 'Neuvedené'}

Praktická / analytická časť:
${profile.practicalPart || 'Neuvedené'}

Vedecký / odborný prínos:
${profile.scientificContribution || 'Neuvedené'}

Podnikateľský / aplikačný problém:
${profile.businessProblem || 'Neuvedené'}

Podnikateľský / aplikačný cieľ:
${profile.businessGoal || 'Neuvedené'}

Implementácia:
${profile.implementation || 'Neuvedené'}

Prípadová štúdia:
${profile.caseStudy || 'Neuvedené'}

Reflexia:
${profile.reflection || 'Neuvedené'}

Požiadavky na zdroje:
${profile.sourcesRequirement || 'Neuvedené'}

Kľúčové slová:
${keywords.length ? keywords.join(', ') : 'Neuvedené'}

Odporúčaný rozsah:
${profile.schema?.recommendedLength || 'Neuvedené'}

Štruktúra práce:
${structure}

Povinné časti:
${requiredSections}

Špecifická inštrukcia typu práce:
${profile.schema?.aiInstruction || 'Neuvedené'}

POVINNÉ PRAVIDLÁ PRE AI:
- Aktuálny profil určuje tému, cieľ, odbor, jazyk a citačnú normu.
- Ak sú v aktuálnej požiadavke dostupné prílohy alebo extrahovaný text, ich odborný obsah má prednosť pred všeobecnými údajmi profilu.
- Profil nesmie nahradiť ani prehlušiť konkrétne údaje z príloh; slúži iba na zasadenie príloh do témy práce.
- Výstup generuj v jazyku práce: ${workLanguage}.
- Citačný štýl musí byť presne: ${citationStyle}.
- Ak používateľ zmenil profil, pracuj s najnovšou verziou profilu.
- Nevymýšľaj autorov, DOI, URL, ISBN ani neexistujúce publikácie.
- Ak údaj nie je dostupný, napíš presne: Údaje sú potrebné overiť.
- Ak prílohy nie sú dostupné, generuj podľa profilu práce.
- Pri akademických výstupoch rozlišuj primárne a sekundárne zdroje.
`.trim();
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

  return `POVOLENÉ OVERENÉ EXTERNÉ AKADEMICKÉ ZDROJE:\nTieto zdroje boli nájdené cez Semantic Scholar alebo Crossref. Pri tvorbe akademického textu používaj iba citácie uvedené nižšie alebo úplné zdroje extrahované z relevantných príloh.\n\n${externalResearch.sources.map((source) => `- Citácia autor–rok: ${source.citationText}\n  Bibliografický záznam: ${source.bibliographyText}`).join('\n\n')}\n\nKRITICKÉ PRAVIDLÁ:\n1. V texte používaj iba citácie uvedené vyššie alebo citácie jednoznačne zistené z relevantných príloh.\n2. Nevytváraj fiktívnych autorov, roky, DOI, URL ani vydavateľské údaje.\n3. Ak zdroj nie je úplný, nepouži ho ako primárny citovaný zdroj.`;
}

function buildAcademicChapterRules() {
  return `ŠPECIÁLNY REŽIM PRE AKADEMICKÉ KAPITOLY MÁ NAJVYŠŠIU PRIORITU.

ABSOLÚTNE PRAVIDLÁ:
1. Aktívny profil určuje rámec práce (názov, téma, cieľ, metodológia, odbor, jazyk a citačná norma), ale ak sú priložené dokumenty, odborné tvrdenia a konkrétne údaje musia vychádzať prednostne z ich extrahovaného obsahu.
2. Ak používateľ žiada prvú kapitolu alebo úvod, nevytváraj abstrakt namiesto úvodu.
3. Ak používateľ žiada kapitolu, vytvor plnohodnotný akademický text v rozsahu primeranom požiadavke a dostupnému limitu.
4. Text musí mať logickú štruktúru, odborné odseky a vecnú nadväznosť.
5. Norma a forma citovania sa vždy preberajú z aktívneho profilu práce.
6. ZEDPERA podporuje štyri záväzné režimy:
   - APA: citácie v texte vo forme (Priezvisko, rok), bez referenčných čísel v texte a bez číslovania zdrojov.
   - HARVARD: citácie v texte vo forme (Priezvisko, rok), bez referenčných čísel v texte a bez číslovania zdrojov.
   - ISO: citácie v texte vo forme (Priezvisko, rok), bez referenčných čísel v texte a bez číslovania zdrojov.
   - REFERENCIE POD ČIAROU: citácie v texte vo forme [1], [2], [3]; rovnaké čísla musia označovať rovnaké zdroje v záverečnom zozname.
7. Pri odborných tvrdeniach používaj iba zdroje, ktoré sú dostupné v prílohách, projektových dokumentoch alebo v overených externých výsledkoch.
8. Nevymýšľaj autorov, roky, DOI, URL, čísla strán ani vydavateľské údaje.
9. Primárne zdroje sú použité prílohy alebo projektové dokumenty. Pri každom uveď názov, autora prílohy, citačný tvar v texte a bibliografický záznam podľa profilu.
10. Sekundárne zdroje sú úplné odborné bibliografické záznamy reálne použité v texte.
11. Zoznam literatúry z priloženého článku nepatrí medzi primárne zdroje; jeho jednotlivé položky možno zaradiť iba medzi sekundárne zdroje a iba vtedy, keď boli vo výstupe skutočne použité.
12. Názvy zdrojov, mená autorov, DOI, URL a názvy časopisov ponechaj v pôvodnom tvare.
13. Neúplný bibliografický záznam nevypisuj ako hotový zdroj. Chýbajúci údaj označ vetou: Údaje sú potrebné overiť.
14. Do literatúry nevkladaj surový OCR text, technické bloky, označenia STRANA/PAGE ani interné údaje systému.
15. Na konci výstupu musí byť iba jedna dvojica sekcií: Primárne zdroje a Sekundárne zdroje.
16. Server po vygenerovaní výstupu deterministicky skontroluje citačný režim, odstráni konfliktné číslovanie a zosúladí citácie v texte so záverečným zoznamom zdrojov.`;
}

function buildAttachmentBlock(attachmentTexts: string[]) {
  return attachmentTexts.length ? `\nPRILOŽENÉ SÚBORY A PODKLADY:\n${attachmentTexts.join('\n\n-----------------\n\n')}\n` : '\nPRILOŽENÉ SÚBORY A PODKLADY: Žiadne.\n';
}


function buildPriorityAttachmentContext({
  extractedFiles,
  clientExtractedText,
  projectDocumentTexts,
}: {
  extractedFiles: ExtractedAttachment[];
  clientExtractedText: string;
  projectDocumentTexts: string[];
}): string {
  const blocks: string[] = [];

  for (const file of extractedFiles) {
    const extractedText = normalizeText(file.extractedText || '');
    if (!extractedText) continue;

    blocks.push(
      `PRÍLOHA: ${file.originalName}\nStav: ${file.status}\nObsah:\n${limitMiddle(
        extractedText,
        32_000,
      )}`,
    );
  }

  const normalizedClientText = normalizeText(clientExtractedText);
  if (normalizedClientText) {
    blocks.push(
      `TEXT PRÍLOH EXTRAHOVANÝ KLIENTOM ALEBO /api/extract-text:\n${limitMiddle(
        normalizedClientText,
        40_000,
      )}`,
    );
  }

  for (const projectText of projectDocumentTexts) {
    const normalizedProjectText = normalizeText(projectText);
    if (!normalizedProjectText) continue;

    blocks.push(
      limitMiddle(normalizedProjectText, 28_000),
    );
  }

  const uniqueBlocks = uniqueArray(blocks);
  if (!uniqueBlocks.length) return '';

  return limitMiddle(
    uniqueBlocks.join('\n\n==============================\n\n'),
    maxPriorityAttachmentContextChars,
  );
}

function buildFinalSystemPrompt({
  baseSystemPrompt,
  priorityAttachmentContext,
  profileCitationStyle,
  citationRegistryInstruction,
  pageQuota,
}: {
  baseSystemPrompt: string;
  priorityAttachmentContext: string;
  profileCitationStyle: string;
  citationRegistryInstruction?: string;
  pageQuota: PageQuota;
}): string {
  const normalizedCitationStyle =
    normalizeCitationStyle(
      profileCitationStyle,
    );

  const attachmentPrefix =
    priorityAttachmentContext
      ? `KRITICKÝ KONTEXT PRÍLOH – PREČÍTAJ PRED ODPOVEĎOU:
Používateľ priložil dokumenty a ich text bol extrahovaný na serveri alebo doručený ako bezpečný fallback. Pri odpovedi musíš vychádzať z nasledujúceho obsahu. Nikdy netvrď, že prílohu nevidíš alebo nevieš čítať, keď je jej text uvedený nižšie.

${priorityAttachmentContext}`
      : `KRITICKÝ KONTEXT PRÍLOH:
V tejto požiadavke nebol dostupný žiadny použiteľný extrahovaný text prílohy.`;

  const citationRules =
    citationRegistryInstruction?.trim() ||
    buildCitationStyleRuleBlock(
      normalizedCitationStyle,
    );

  const citationAndQuotaRules = [
    'AKTUÁLNA CITAČNÁ NORMA Z PROFILU PRÁCE:',
    normalizedCitationStyle,
    '',
    citationRules,
    '',
    'ZÁVÄZNÉ PRAVIDLÁ PRE ZDROJE:',
    '- Norma a forma citovania sa vždy preberajú z aktívneho profilu práce.',
    '- Na konci zachovaj samostatné sekcie Primárne zdroje a Sekundárne zdroje.',
    '- Primárny zdroj je použitá príloha; sekundárne zdroje sú odborné publikácie reálne použité v texte.',
    '- Nevymýšľaj autorov, rok, DOI, URL ani bibliografické údaje.',
    `- Ak údaj nie je možné bezpečne určiť, použi presnú vetu: ${REQUIRED_VERIFICATION_NOTICE}`,
    '',
    buildPageLimitInstruction(
      pageQuota,
    ),
  ].join('\n');

  const reservedCharacters =
    attachmentPrefix.length +
    citationAndQuotaRules.length +
    12;

  const availableForBase = Math.max(
    maxSystemPromptChars -
      reservedCharacters,
    20_000,
  );

  const safeBaseSystemPrompt =
    limitMiddle(
      baseSystemPrompt,
      availableForBase,
    );

  return limitMiddle(
    [
      attachmentPrefix,
      safeBaseSystemPrompt,
      citationAndQuotaRules,
    ].join(
      '\n\n========================================\n\n',
    ),
    maxSystemPromptChars,
  );
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
  outputLanguage,
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
  outputLanguage: AppLanguage;
}) {
    const languageInstruction = `JAZYKOVÉ NASTAVENIE:
Zvolený jazyk odpovede z používateľského rozhrania je: ${outputLanguage} = ${getLanguageName(outputLanguage)}.

POVINNÉ PRAVIDLO:
Odpovedaj v jazyku: ${getLanguageName(outputLanguage)}.
Toto nastavenie má prednosť pred jazykom profilu práce, pokiaľ používateľ výslovne nepožiada o iný jazyk.`;

  const attachmentBlock = buildAttachmentBlock(attachmentTexts);
  const strictAttachmentRules = `PRAVIDLÁ PRE PRÁCU S PRÍLOHAMI:
- Ak blok PRILOŽENÉ SÚBORY A PODKLADY obsahuje extrahovaný text, musíš ho skutočne prečítať a použiť pri odpovedi.
- Nikdy netvrď, že nemáš prístup k prílohe, ak je jej text uvedený v systémovom kontexte.
- Názvy súborov, osoby, dátumy, sumy a odborné údaje preberaj presne z prílohy; nevymýšľaj chýbajúce údaje.
- Ak text prílohy chýba alebo extrakcia zlyhala, oznám konkrétne, že obsah súboru nebol dostupný, nie všeobecne, že prílohy nepodporuješ.`;

  if (module === 'translation') {
    return `${buildStrictTranslationPrompt()}

${languageInstruction}

${strictAttachmentRules}

${attachmentBlock}`;
  }

  if (module === 'emails') {
    return `${buildStrictEmailPrompt()}

${languageInstruction}

${strictAttachmentRules}

${attachmentBlock}`;
  }

  if (module === 'planning') {
    return `${buildStrictPlanningPrompt(profile)}

${languageInstruction}

${strictAttachmentRules}

${attachmentBlock}`;
  }


const lockedProfileTitle =
  profile?.title?.trim() ||
  profile?.topic?.trim() ||
  'nezadaná hlavná téma';

const strictProfileLock = `
AKTÍVNY PROFIL PRÁCE – TEMATICKÝ A FORMÁLNY RÁMEC:
ID profilu / projektu: ${profile?.id || 'neuvedené'}
Hlavná téma / názov práce: ${lockedProfileTitle}
Typ práce: ${profile?.type || 'neuvedené'}
Stupeň / úroveň: ${profile?.level || 'neuvedené'}
Odbor: ${profile?.field || 'neuvedené'}
Vedúci práce: ${profile?.supervisor || 'neuvedené'}
Cieľ práce: ${profile?.goal || 'neuvedené'}
Výskumný problém: ${profile?.problem || 'neuvedené'}
Metodológia: ${profile?.methodology || 'neuvedené'}
Výskumné otázky: ${profile?.researchQuestions || 'neuvedené'}
Kľúčové slová: ${getKeywords(profile).join(', ') || 'neuvedené'}
Citačná norma: ${getCitationStyle(profile)}
Jazyk práce: ${getWorkLanguage(profile)}

PRAVIDLÁ PROFILU A PRÍLOH:
1. Profil určuje tému, cieľ, odbor, jazyk a citačnú normu výstupu.
2. Ak používateľ v aktuálnej požiadavke priložil dokumenty, ich extrahovaný odborný obsah je hlavný vecný podklad odpovede.
3. Profil nesmie nahradiť konkrétne fakty, pojmy, výsledky, tabuľky, citácie ani bibliografiu z príloh.
4. Pri konflikte medzi všeobecným údajom profilu a konkrétnym údajom v relevantnej prílohe použi údaj z prílohy a zasadíš ho do rámca profilu.
5. História starších chatov nesmie prepísať aktuálny profil ani aktuálne prílohy.
6. Všeobecné požiadavky ako „napíš úvod“, „spracuj kapitolu“ alebo „spracuj zdroje“ aplikuj na aktívny profil a na obsah práve priložených dokumentov.
7. Ak príloha tematicky nesúvisí s profilom, uveď tento nesúlad jasne; napriek tomu prílohu prečítaj a nepredstieraj, že jej obsah nebol dostupný.
`;


  const prompt = `Si ZEDPERA, profesionálny akademický asistent pre písanie, kontrolu a odborné vedenie akademických prác.

${languageInstruction}

AKTÍVNY PROFIL PRÁCE URČUJE TEMATICKÝ A FORMÁLNY RÁMEC. AK SÚ PRILOŽENÉ DOKUMENTY, ICH EXTRAHOVANÝ OBSAH JE HLAVNÝ VECNÝ ZDROJ ODPOVEDE.

${strictProfileLock}

AKTÍVNY ŠPECIÁLNY REŽIM KAPITOLY: ${isChapterRequest ? 'Áno' : 'Nie'}
Požadované číslo kapitoly: ${requestedChapterNumber || 'neurčené'}
REŽIM IBA ZDROJE: ${sourcesOnly ? 'Áno' : 'Nie'}
Prílohy podľa automatickej kontroly súvisia s profilom: ${relevance.isRelevant ? 'Áno' : 'Nie'}
Zhodné odborné výrazy: ${relevance.matchedTokens.slice(0, 80).join(', ') || 'žiadne'}

${buildAcademicChapterRules()}

${buildVerifiedSourcePackPrompt(externalResearch)}

HLAVNÝ POSTUP:
1. Najvyššiu prioritu má konkrétna požiadavka používateľa. Nerob inú úlohu, než o ktorú používateľ žiada. Ak používateľ žiada 1. kapitolu, píš 1. kapitolu; ak žiada úvod, píš úvod; ak žiada zdroje, rieš zdroje.
2. Hneď potom rešpektuj aktívny profil práce: názov, tému, cieľ, problém, metodológiu, odbor, jazyk a citačnú normu.
3. Ako odborný obsahový základ použi najprv relevantnú prílohu alebo projektový dokument. Z prílohy vytiahni odborný obsah, citácie v texte a bibliografiu.
4. Až následne dopĺňaj cez AI a overené externé akademické zdroje zo Semantic Scholar/Crossref, aby text sedel na profil práce a bol odborne úplný.
5. V akademickom texte vždy používaj citácie priamo v texte podľa citačnej normy v profile.
6. Na konci uveď Primárne zdroje a Sekundárne zdroje.
7. Ak sú k dispozícii zdroje z článku, príloh, projektových dokumentov, Semantic Scholar alebo Crossref, musia byť použité a vypísané úplne.
8. Kapitola nesmie byť krátka. Pri žiadosti o kapitolu vytvor rozsiahly akademický text minimálne približne 1 200 slov, ak používateľ neurčil inak.
9. Pri žiadosti o 1. kapitolu nesmieš vytvoriť abstrakt; vytvor úvodnú kapitolu podľa profilu práce.
10. Ak je požiadavka všeobecná, napríklad „napíš abstrakt“, „navrhni úvod“, „spracuj kapitolu“, vždy ju aplikuj iba na uzamknutý aktívny profil uvedený vyššie.
11. Nikdy nepreberaj názov, tému alebo cieľ z iného profilu, z histórie chatu alebo z najnovšieho záznamu v databáze.

JAZYKOVÉ NASTAVENIE:
Zvolený jazyk z používateľského rozhrania: ${outputLanguage} = ${getLanguageName(outputLanguage)}.
Jazyk práce uložený v profile: ${getWorkLanguage(profile)}.

POVINNÉ PRAVIDLO PRE JAZYK:
Odpovedaj výhradne v jazyku: ${getLanguageName(outputLanguage)}.
Toto nastavenie má prednosť pred jazykom profilu práce, pokiaľ používateľ v aktuálnej správe výslovne nepožiada o iný jazyk.

DÔLEŽITÉ:
- Neprekladaj automaticky názov práce, ak je uložený v profile v inom jazyku.
- Neprepisuj citácie, mená autorov, názvy dokumentov, DOI, URL ani bibliografické údaje do iného jazyka.
- Jazykové prepnutie sa týka hlavne odpovede, vysvetlenia, akademického textu, analýzy, odporúčaní a UI výstupu.
- Citačná norma zostáva podľa profilu práce.

JAZYK ODPOVEDE: ${getLanguageName(outputLanguage)}
JAZYK PRÁCE Z PROFILU: ${getWorkLanguage(profile)}
CITAČNÁ NORMA: ${getCitationStyle(profile)}

KOMPLETNÝ ULOŽENÝ PROFIL PRÁCE:
${buildProfileSummary(profile)}

${buildAttachmentBlock(attachmentTexts)}

POVINNÉ SPRACOVANIE PRÍLOH:
- Ak je vyššie uvedený extrahovaný text prílohy, považuj ho za priamo dostupný obsah dokumentu.
- Pri odpovedi z neho vychádzaj prednostne a nikdy netvrď, že súbor nevieš otvoriť alebo že k nemu nemáš prístup.
- Ak používateľ žiada analýzu, audit, obhajobu, humanizáciu, originalitu, preklad, email alebo plánovanie podľa prílohy, spracuj presne obsah prílohy.
- Chýbajúce alebo nečitateľné údaje označ ako nedostupné; nevymýšľaj ich.

PRAVIDLÁ PRE ZDROJE:
1. Primárne zdroje = názov dokumentu alebo názvy dokumentov, z ktorých výstup čerpá, vrátane autora/autorov samotnej prílohy, ak sa dajú bezpečne zistiť z titulnej/úvodnej časti.
2. Sekundárne zdroje = úplné bibliografické zdroje, ktoré sú citované alebo uvedené priamo v texte výstupu. Každý sekundárny zdroj musí mať aspoň autora, rok, názov, zdroj/časopis alebo strany/DOI/URL.
3. Ak článok obsahuje zoznam literatúry, nikdy ho nepremiestňuj do primárnych zdrojov; do sekundárnych zdrojov uveď iba tie záznamy, ktoré sú v texte výstupu skutočne citované alebo použité.
4. Do výstupu nevkladaj neúplné zdroje typu B. (2019), H. (2020), R. (2017), „Údaje sú potrebné overiť.“, „Autor je potrebné overiť“ alebo „Rok chýba“.
5. Názvy zdrojov, mená autorov, DOI, URL, názvy časopisov a bibliografické údaje ponechaj v pôvodnom tvare. Neprekladaj ich len preto, že používateľ prepne jazyk aplikácie.
6. Ak je odpoveď v inom jazyku ako jazyk zdroja, prelož iba vysvetľujúci text, nie samotný bibliografický záznam.
7. Sekcie „Primárne zdroje“ a „Sekundárne zdroje“ ponechaj v slovenčine.
8. Norma a forma citovania sa vždy preberajú z aktívneho profilu práce.

${buildCitationStyleRuleBlock(getCitationStyle(profile))}

NASTAVENIA:
Kontrola príloh podľa profilu práce: ${settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'}
Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}
Povolené všeobecné znalosti AI: ${settings.allowAiKnowledgeFallback ? 'áno' : 'nie'}
Externé akademické zdroje Semantic Scholar/Crossref: ${settings.useExternalAcademicSources ? 'áno' : 'nie'}


PRAVIDLO PRE ZDROJE:
Nikdy neuvádzaj Zedpera, ZEDPERA, Zedpera AI, náš systém, túto aplikáciu ani interný nástroj ako autora, zdroj, publikáciu, databázu, URL, DOI alebo položku v literatúre.
Zedpera je iba pracovný nástroj používateľa, nie akademický zdroj.
Ak zdroj nie je overiteľný, nepíš ho ako bibliografický záznam.
Použi iba reálne externé zdroje, prílohy používateľa alebo overené zdroje zo Semantic Scholar/Crossref.


FORMÁT:
Ak je kapitola: akademický text s citáciami v odsekoch, potom Primárne zdroje a Sekundárne zdroje.
Ak je iba zdroje: vráť iba Primárne zdroje a Sekundárne zdroje.
Ak nejde o kapitolu, použi sekcie === VÝSTUP ===, === ANALÝZA ===, === SKÓRE ===, === ODPORÚČANIA ===, === POUŽITÉ ZDROJE A AUTORI ===.`;

  return limitText(prompt, maxSystemPromptChars);
}

// =====================================================
// OUTPUT CLEANING
// =====================================================


function removeFalseAttachmentFailureNotices(
  value: string,
  extractedFiles: ExtractedAttachment[],
): string {
  const hasReadableAttachment =
    extractedFiles.some(
      (file) =>
        file.extractedChars > 0 &&
        file.extractedText.trim().length > 0 &&
        !file.error,
    );

  if (!hasReadableAttachment) {
    return normalizeText(value);
  }

  return normalizeText(value)
    .replace(
      /Pozn[aá]mka\s+k\s+použit[ýy]m\s+zdrojom\s*:\s*Priložen[ýy]\s+dokument[\s\S]{0,900}?(?:nebol\s+použit[ýy][^.\n]*\.|technickej\s+chyby[^.\n]*\.)/gi,
      '',
    )
    .replace(
      /Priložen[ýy]\s+dokument[\s\S]{0,500}?obsah\s+nebolo\s+možn[eé]\s+extrahovať[\s\S]{0,500}?(?:\.|\n)/gi,
      '',
    )
    .replace(
      /Výstup\s+bol\s+zostaven[ýy]\s+z\s+profilu\s+práce[\s\S]{0,350}?(?:\.|\n)/gi,
      '',
    )
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function buildInTextCitationFromSource(source: BibliographicCandidate) {
  const authors = cleanValidAuthors(source.authors || []);
  if (!authors.length || !source.year) return '';
  const firstAuthor = authors[0].replace(/,.*/, '').replace(/\s+/g, ' ').trim();
  if (!firstAuthor || isInvalidAuthorFragment(firstAuthor)) return '';
  return authors.length > 1 ? `(${firstAuthor} et al., ${source.year})` : `(${firstAuthor}, ${source.year})`;
}

function extractNumericCitationsFromText(text: string) {
  const cleaned = normalizeText(text || '');
  const sourceSectionStart = cleaned.search(
    /\n\s*(Primárne zdroje|Primarne zdroje|Sekundárne zdroje|Sekundarne zdroje|Použitá literatúra|Použité zdroje|Literatúra|Bibliografia|References)\s*\n/i,
  );

  const body =
    sourceSectionStart >= 0 ? cleaned.slice(0, sourceSectionStart) : cleaned;

  const found = new Set<number>();

  for (const match of body.matchAll(/\[(\d{1,3})\]/g)) {
    const number = Number(match[1]);

    if (Number.isFinite(number) && number > 0) {
      found.add(number);
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

function extractNumberedBibliographyItems(text: string) {
  const cleaned = normalizeText(text || '');
  const found = new Set<number>();

  for (const match of cleaned.matchAll(/(?:^|\n)\s*\[?(\d{1,3})\]?[.)]?\s+/g)) {
    const number = Number(match[1]);

    if (Number.isFinite(number) && number > 0) {
      found.add(number);
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

function removeUnmatchedNumericCitations(text: string) {
  const cleaned = normalizeText(text || '');
  const usedNumbers = extractNumericCitationsFromText(cleaned);

  if (!usedNumbers.length) return cleaned;

  const bibliographyNumbers = extractNumberedBibliographyItems(cleaned);

  if (!bibliographyNumbers.length) {
    return cleaned.replace(/\s*\[\d{1,3}\]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  const allowed = new Set(bibliographyNumbers);

  return cleaned
    .replace(/\[(\d{1,3})\]/g, (match, value) => {
      const number = Number(value);
      return allowed.has(number) ? match : '';
    })
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function warnAboutCitationMismatch(text: string) {
  const cleaned = normalizeText(text || '');
  const usedNumbers = extractNumericCitationsFromText(cleaned);

  if (!usedNumbers.length) return cleaned;

  const bibliographyNumbers = extractNumberedBibliographyItems(cleaned);
  const bibliographySet = new Set(bibliographyNumbers);

  const missing = usedNumbers.filter((number) => !bibliographySet.has(number));

  if (!missing.length) return cleaned;

  return `${cleaned}

Poznámka ku kontrole zdrojov:
Vo výstupe boli odstránené alebo skontrolované číselné citácie, ktoré nemali zodpovedajúcu položku v zozname literatúry: ${missing
    .map((number) => `[${number}]`)
    .join(', ')}.`;
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
  citationStyle = 'ISO',
}: {
  text: string;
  sourcePack: VerifiedSource[];
  extractedFiles: ExtractedAttachment[];
  attachmentWasRelevant: boolean;
  detectedSourcesForOutput?: BibliographicCandidate[];
  citationStyle?: string;
}) {
  return buildCitationAwareFinalOutput({
    text,
    detectedSourcesForOutput,
    extractedFiles,
    externalSources: sourcePack,
    attachmentWasRelevant,
    citationStyle,
  });
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


type LimitedPageOutput = {
  output: string;
  wasTruncated: boolean;
  maximumCharacters: number;
};

function isPageLimitError(error: unknown) {
  if (error instanceof PageLimitError) return true;

  const message =
    error instanceof Error
      ? error.message
      : String(error || '');

  return message.includes('PAGE_LIMIT_REACHED');
}

function pageLimitErrorResponse(error?: unknown) {
  const message =
    error instanceof Error &&
    error.message.trim()
      ? error.message
      : 'Stránkový limit bol vyčerpaný. Pre pokračovanie si dokúpte ďalšie strany.';

  return NextResponse.json(
    {
      ok: false,
      code: 'PAGE_LIMIT_REACHED',
      message,
      detail:
        'Používateľ už nemá k dispozícii žiadne voľné strany. Po úspešnom dokúpení extra strán sa generovanie automaticky odblokuje.',
      pageLimitReached: true,
      purchaseUrl: '/pricing#doplnkove-sluzby',
    },
    {
      status: 402,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function buildPageLimitInstruction(pageQuota: PageQuota) {
  if (
    pageQuota.isUnlimited ||
    pageQuota.isAdmin ||
    pageQuota.hasUnlimitedAccess
  ) {
    return `
STRÁNKOVÝ LIMIT POUŽÍVATEĽA:
- Používateľ má neobmedzený administrátorský prístup.
- Stránkový limit sa na túto požiadavku nevzťahuje.
- Výstup vytvor v rozsahu primeranom požiadavke používateľa a technickému limitu modelu.
`.trim();
  }

  return `
STRÁNKOVÝ LIMIT POUŽÍVATEĽA:
- Celkový limit: ${pageQuota.pageLimit} normostrán.
- Už použité: ${pageQuota.pagesUsed} normostrán.
- Zostáva pred touto požiadavkou: ${pageQuota.pagesRemaining} normostrán.
- Jedna normostrana sa v systéme počíta ako ${CHARACTERS_PER_PAGE} znakov vrátane medzier.
- Výstup nesmie prekročiť zostávajúci počet normostrán.
- Keď je požadovaný rozsah väčší než zostatok, vytvor maximálny zmysluplný výstup v rámci zostávajúceho limitu.
`.trim();
}

function limitOutputToRemainingPages(
  value: string,
  remainingPages: number | null | undefined,
  isUnlimited = false,
): LimitedPageOutput {
  const output = String(value || '');

  if (isUnlimited) {
    return {
      output,
      wasTruncated: false,
      maximumCharacters: Number.MAX_SAFE_INTEGER,
    };
  }

  const safeRemainingPages =
    typeof remainingPages === 'number' &&
    Number.isFinite(remainingPages)
      ? Math.max(remainingPages, 0)
      : 0;

  const maximumCharacters =
    safeRemainingPages *
    CHARACTERS_PER_PAGE;

  if (maximumCharacters <= 0) {
    throw new PageLimitError();
  }

  if (output.length <= maximumCharacters) {
    return {
      output,
      wasTruncated: false,
      maximumCharacters,
    };
  }

  const notice =
    '\n\n[Výstup bol ukončený po dosiahnutí zostávajúceho stránkového limitu.]';

  const availableForContent = Math.max(
    maximumCharacters - notice.length,
    0,
  );

  const limitedOutput = `${output
    .slice(0, availableForContent)
    .trimEnd()}${notice}`.slice(
    0,
    maximumCharacters,
  );

  return {
    output: limitedOutput,
    wasTruncated: true,
    maximumCharacters,
  };
}


function splitOutputBodyAndSourceTail(value: string): {
  body: string;
  sourceTail: string;
} {
  const cleaned = normalizeText(value);
  const positions = getPrimarySecondaryHeadingPositions(cleaned);
  const firstPrimary = positions.find(
    (item) => item.heading === 'primary',
  );

  if (!firstPrimary) {
    return {
      body: cleaned,
      sourceTail: '',
    };
  }

  return {
    body: cleaned.slice(0, firstPrimary.lineStart).trim(),
    sourceTail: cleaned.slice(firstPrimary.lineStart).trim(),
  };
}

function limitOutputPreservingSourceTail(
  value: string,
  remainingPages: number | null | undefined,
  isUnlimited = false,
): LimitedPageOutput {
  if (isUnlimited) {
    return {
      output: String(value || ''),
      wasTruncated: false,
      maximumCharacters: Number.MAX_SAFE_INTEGER,
    };
  }

  const safeRemainingPages =
    typeof remainingPages === 'number' &&
    Number.isFinite(remainingPages)
      ? Math.max(remainingPages, 0)
      : 0;

  const maximumCharacters =
    safeRemainingPages * CHARACTERS_PER_PAGE;

  if (maximumCharacters <= 0) {
    throw new PageLimitError();
  }

  const cleaned = normalizeText(value);
  if (cleaned.length <= maximumCharacters) {
    return {
      output: cleaned,
      wasTruncated: false,
      maximumCharacters,
    };
  }

  const { body, sourceTail } =
    splitOutputBodyAndSourceTail(cleaned);

  // Ak zdrojový blok neexistuje, použije sa pôvodné obmedzenie.
  if (!sourceTail) {
    return limitOutputToRemainingPages(
      cleaned,
      remainingPages,
      false,
    );
  }

  const truncationNotice =
    '[Hlavný text bol skrátený po dosiahnutí zostávajúceho stránkového limitu.]';

  // Zdroje majú byť zachované vždy. Pri extrémne malom zostatku
  // sa skráti ich diagnostická časť, nie však nadpisy oboch sekcií.
  const minimumSourceTail = [
    'Primárne zdroje',
    '',
    'Zdrojový zoznam sa nezmestil do zostávajúceho stránkového limitu.',
    '',
    'Sekundárne zdroje',
    '',
    'Zdrojový zoznam sa nezmestil do zostávajúceho stránkového limitu.',
  ].join('\n');

  let safeSourceTail = sourceTail;
  const sourceBudget = Math.max(
    Math.floor(maximumCharacters * 0.35),
    Math.min(sourceTail.length, 2400),
  );

  if (safeSourceTail.length > sourceBudget) {
    safeSourceTail = `${safeSourceTail
      .slice(0, Math.max(sourceBudget - 80, 0))
      .trimEnd()}

[Zoznam zdrojov bol skrátený podľa zostávajúceho stránkového limitu.]`;
  }

  if (safeSourceTail.length >= maximumCharacters) {
    safeSourceTail = minimumSourceTail.slice(
      0,
      maximumCharacters,
    );
  }

  const separatorLength = 2;
  const noticeBlock = `\n\n${truncationNotice}`;
  const availableForBody = Math.max(
    maximumCharacters -
      safeSourceTail.length -
      noticeBlock.length -
      separatorLength,
    0,
  );

  const limitedBody =
    body.length > availableForBody
      ? body.slice(0, availableForBody).trimEnd()
      : body;

  const output = [
    limitedBody,
    body.length > availableForBody
      ? truncationNotice
      : '',
    safeSourceTail,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, maximumCharacters);

  return {
    output,
    wasTruncated: true,
    maximumCharacters,
  };
}

function extractSourceSectionsForResponse(value: string): {
  sources: string;
  primarySources: string;
  secondarySources: string;
} {
  const cleaned = normalizeText(value);
  const positions = getPrimarySecondaryHeadingPositions(cleaned);
  const primary = positions.find(
    (item) => item.heading === 'primary',
  );
  const secondary = positions.find(
    (item) =>
      item.heading === 'secondary' &&
      (!primary || item.index > primary.index),
  );

  if (!primary || !secondary) {
    return {
      sources: '',
      primarySources: '',
      secondarySources: '',
    };
  }

  const primarySources = cleaned
    .slice(
      primary.index +
        'Primárne zdroje'.length,
      secondary.lineStart,
    )
    .trim();

  const secondarySources = cleaned
    .slice(
      secondary.index +
        'Sekundárne zdroje'.length,
    )
    .trim();

  return {
    sources: cleaned.slice(primary.lineStart).trim(),
    primarySources,
    secondarySources,
  };
}

function createPageUsagePayload({
  quota,
  output,
  requestId,
  outputWasTruncated,
}: {
  quota: PageQuota;
  output: string;
  requestId: string;
  outputWasTruncated: boolean;
}) {
  const pagesGeneratedThisRequest =
    countGeneratedPages(output);

  return {
    ...quota,
    pagesGeneratedThisRequest,
    pagesConsumedThisRequest:
      quota.isUnlimited ||
      quota.isAdmin ||
      quota.hasUnlimitedAccess
        ? 0
        : pagesGeneratedThisRequest,
    charactersGenerated:
      String(output || '').length,
    charactersPerPage:
      CHARACTERS_PER_PAGE,
    requestId,
    outputWasTruncated,
  };
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
  return NextResponse.json(
    {
      ok: false,
      code: error.code,
      message: error.message,
      detail: error.detail,
      rawMessage: error.rawMessage,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function jsonSimpleErrorResponse({ code, message, detail, status }: { code: string; message: string; detail: string; status: number }) {
  return NextResponse.json(
    { ok: false, code, message, detail },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

// =====================================================
// ENTITLEMENT HELPERS
// =====================================================

type PromptUsageResult = Awaited<
  ReturnType<typeof consumeSuccessfulPrompt>
>;

type EntitlementGuardResult = {
  entitlements: CurrentEntitlements;
  entitlementModule: AppModuleKey;
  requiredFeatures: FeatureKey[];
  receivedAttachments: number;
};

function resolveEntitlementModule(
  module: ModuleKey,
): AppModuleKey {
  // Pôvodný endpoint podporoval aj požiadavky bez explicitného modulu.
  // Takúto požiadavku zachováme a z pohľadu balíka ju vyhodnotíme ako AI chat.
  return module === 'unknown'
    ? 'chat'
    : module;
}

function isExplicitChapterGenerationRequest(
  value: string,
): boolean {
  const normalized =
    normalizeForSemanticMatch(value);

  return [
    'napis kapitolu',
    'napis prvu kapitolu',
    'vytvor kapitolu',
    'spracuj kapitolu',
    'dokonci kapitolu',
    'rozsir kapitolu',
    'dopln kapitolu',
    'napis uvod',
    'vytvor uvod',
    'spracuj uvod',
    'write chapter',
    'create chapter',
    'generate chapter',
  ].some((pattern) =>
    normalized.includes(pattern),
  );
}

function detectAdditionalRequiredFeatures({
  module,
  isChapterRequest,
  sourcesOnly,
  lastUserMessage,
}: {
  module: ModuleKey;
  isChapterRequest: boolean;
  sourcesOnly: boolean;
  lastUserMessage: string;
}): FeatureKey[] {
  const requiredFeatures = new Set<FeatureKey>();
  const normalizedMessage =
    normalizeForSemanticMatch(lastUserMessage);

  const supportsSupervisorActions =
    module === 'supervisor' ||
    module === 'chat' ||
    module === 'unknown';

  // Kapitoly sa nesmú obísť cez všeobecný AI chat,
  // ale samotná zmienka o kapitole pri audite alebo preklade
  // nesmie zablokovať pôvodnú funkcionalitu.
  if (
    supportsSupervisorActions &&
    isChapterRequest &&
    isExplicitChapterGenerationRequest(
      lastUserMessage,
    )
  ) {
    requiredFeatures.add(
      'chapter-generation',
    );
  }

  // Samostatné vytvorenie zoznamu zdrojov sa kontroluje
  // iba v AI školiteľovi a všeobecnom AI chate.
  if (
    supportsSupervisorActions &&
    sourcesOnly
  ) {
    requiredFeatures.add('citations');
  }

  // Explicitná požiadavka na osnovu alebo štruktúru práce.
  if (
    (module === 'supervisor' ||
      module === 'chat' ||
      module === 'unknown') &&
    (
      normalizedMessage.includes(
        'navrhni osnovu',
      ) ||
      normalizedMessage.includes(
        'vytvor osnovu',
      ) ||
      normalizedMessage.includes(
        'struktura prace',
      ) ||
      normalizedMessage.includes(
        'štruktúra práce',
      ) ||
      normalizedMessage.includes(
        'outline',
      )
    )
  ) {
    requiredFeatures.add(
      'outline-generation',
    );
  }

  return Array.from(requiredFeatures);
}

function countReceivedAttachments({
  files,
  preparedFilesMetadata,
  clientExtractedText,
}: {
  files: UploadedFile[];
  preparedFilesMetadata: PreparedFileMetadata[];
  clientExtractedText: string;
}): number {
  const metadataKeys = new Set<string>();

  for (const item of preparedFilesMetadata) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const key = [
      item.originalId || '',
      item.originalName || '',
      item.preparedName || '',
      item.originalSize ?? '',
    ].join('|');

    if (key.replace(/\|/g, '').trim()) {
      metadataKeys.add(key);
    }
  }

  const clientTextAttachmentCount =
    clientExtractedText.trim().length > 0
      ? 1
      : 0;

  // Súbory a metadata často opisujú tie isté prílohy,
  // preto ich nesčítavame. Použijeme najvyšší známy počet.
  return Math.max(
    files.length,
    metadataKeys.size,
    clientTextAttachmentCount,
  );
}

async function requireChatRequestEntitlements({
  module,
  isChapterRequest,
  sourcesOnly,
  lastUserMessage,
  receivedAttachments,
}: {
  module: ModuleKey;
  isChapterRequest: boolean;
  sourcesOnly: boolean;
  lastUserMessage: string;
  receivedAttachments: number;
}): Promise<EntitlementGuardResult> {
  const entitlementModule =
    resolveEntitlementModule(module);

  // Jedno načítanie oprávnení zároveň overí prihlásenie
  // a základnú funkciu priradenú k modulu.
  const entitlements =
    await requireModuleAccess(
      entitlementModule,
    );

  const moduleFeature =
    MODULE_FEATURE_MAP[
      entitlementModule === 'unknown'
        ? 'chat'
        : entitlementModule
    ];

  const additionalFeatures =
    detectAdditionalRequiredFeatures({
      module,
      isChapterRequest,
      sourcesOnly,
      lastUserMessage,
    });

  const requiredFeatures = Array.from(
    new Set<FeatureKey>([
      moduleFeature,
      ...additionalFeatures,
    ]),
  );

  for (const feature of additionalFeatures) {
    if (
      !entitlements.isAdmin &&
      !entitlements.hasUnlimitedAccess &&
      !entitlements.features.has(feature)
    ) {
      throw new FeatureAccessError(
        feature,
      );
    }
  }

  if (
    !entitlements.isAdmin &&
    !entitlements.hasUnlimitedAccess &&
    entitlements.promptLimit !== null &&
    entitlements.promptsUsed >=
      entitlements.promptLimit
  ) {
    throw new PromptLimitError({
      promptLimit:
        entitlements.promptLimit,
      promptsUsed:
        entitlements.promptsUsed,
    });
  }

  const attachmentLimit =
    entitlements.attachmentLimit;

  if (
    !entitlements.isAdmin &&
    !entitlements.hasUnlimitedAccess &&
    attachmentLimit !== null &&
    receivedAttachments > attachmentLimit
  ) {
    throw new AttachmentLimitError({
      attachmentLimit,
      receivedAttachments,
    });
  }

  return {
    entitlements,
    entitlementModule,
    requiredFeatures,
    receivedAttachments,
  };
}

function serializeEntitlementGuard(
  guard: EntitlementGuardResult,
  promptUsage?: PromptUsageResult,
) {
  const serialized =
    serializeEntitlements(
      guard.entitlements,
    );

  return {
    ...serialized,
    ...(promptUsage
      ? {
          promptLimit:
            promptUsage.promptLimit,
          promptsUsed:
            promptUsage.promptsUsed,
          promptsRemaining:
            promptUsage.promptsRemaining,
          promptLimitReached:
            promptUsage.promptLimitReached,
        }
      : {}),
    access: {
      module:
        guard.entitlementModule,
      requiredFeatures:
        guard.requiredFeatures,
      requiredFeatureLabels:
        guard.requiredFeatures.map(
          getFeatureLabel,
        ),
      receivedAttachments:
        guard.receivedAttachments,
    },
  };
}

function entitlementApiErrorResponse(
  error: unknown,
) {
  const serialized =
    entitlementErrorResponse(error);

  return NextResponse.json(
    serialized.body,
    {
      status: serialized.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

// =====================================================
// RESPONSE HELPERS
// =====================================================

async function createStreamResponse({
  model,
  systemPrompt,
  normalizedMessages,
  module,
  pageQuota,
  pageRequestId,
  entitlementGuard,
  nativeAttachmentParts = [],
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  module: ModuleKey;
  pageQuota: PageQuota;
  pageRequestId: string;
  entitlementGuard: EntitlementGuardResult;
  nativeAttachmentParts?: NativeAttachmentPart[];
}) {
  const effectiveOutputTokens = getOutputTokenLimit(
    pageQuota.pagesRemaining,
    streamOutputTokens,
    {
      isUnlimited:
        pageQuota.isUnlimited ||
        pageQuota.isAdmin ||
        pageQuota.hasUnlimitedAccess,
    },
  );

  if (effectiveOutputTokens <= 0) {
    throw new PageLimitError();
  }

  const modelMessages =
    appendNativeAttachmentPartsToMessages(
      normalizedMessages,
      nativeAttachmentParts,
    );

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages as any,
    temperature: 0.2,
    maxOutputTokens: effectiveOutputTokens,
  });

  const encoder = new TextEncoder();
  const maximumCharacters =
    pageQuota.isUnlimited ||
    pageQuota.isAdmin ||
    pageQuota.hasUnlimitedAccess
      ? Number.POSITIVE_INFINITY
      : Math.max(
          pageQuota.pagesRemaining ?? 0,
          0,
        ) * CHARACTERS_PER_PAGE;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let deliveredOutput = '';
      let outputWasTruncated = false;

      try {
        for await (const chunk of result.textStream) {
          const currentChunk =
            String(chunk || '');

          if (!currentChunk) continue;

          const remainingCharacters =
            maximumCharacters -
            deliveredOutput.length;

          if (remainingCharacters <= 0) {
            outputWasTruncated = true;
            break;
          }

          if (
            currentChunk.length <=
            remainingCharacters
          ) {
            deliveredOutput += currentChunk;

            controller.enqueue(
              encoder.encode(currentChunk),
            );

            continue;
          }

          const notice =
            '\n\n[Výstup bol ukončený po dosiahnutí zostávajúceho stránkového limitu.]';

          const availableForContent =
            Math.max(
              remainingCharacters -
                notice.length,
              0,
            );

          const finalChunk =
            `${currentChunk.slice(
              0,
              availableForContent,
            )}${notice}`.slice(
              0,
              remainingCharacters,
            );

          deliveredOutput += finalChunk;
          outputWasTruncated = true;

          if (finalChunk) {
            controller.enqueue(
              encoder.encode(finalChunk),
            );
          }

          break;
        }

        if (deliveredOutput.trim()) {
          // Prompt sa odpočíta až po úspešnom vytvorení viditeľného výstupu.
          const promptUsage =
            await consumeSuccessfulPrompt();

          const updatedQuota =
            await consumePagesForOutput({
              text: deliveredOutput,
              module,
              requestId: pageRequestId,
            });

          console.log(
            'PROMPT_USAGE_STREAM_CONSUMED:',
            {
              requestId: pageRequestId,
              module,
              ...promptUsage,
            },
          );

          console.log(
            'PAGE_QUOTA_STREAM_CONSUMED:',
            createPageUsagePayload({
              quota: updatedQuota,
              output: deliveredOutput,
              requestId: pageRequestId,
              outputWasTruncated,
            }),
          );
        }

        controller.close();
      } catch (error) {
        console.error(
          'PAGE_QUOTA_STREAM_ERROR:',
          error,
        );

        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type':
        'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Zedpera-Page-Request-Id':
        pageRequestId,
      'X-Zedpera-Page-Limit':
        pageQuota.isUnlimited ||
        pageQuota.isAdmin ||
        pageQuota.hasUnlimitedAccess
          ? 'unlimited'
          : String(pageQuota.pageLimit),
      'X-Zedpera-Pages-Used-Before':
        String(pageQuota.pagesUsed),
      'X-Zedpera-Pages-Remaining-Before':
        pageQuota.isUnlimited ||
        pageQuota.isAdmin ||
        pageQuota.hasUnlimitedAccess
          ? 'unlimited'
          : String(pageQuota.pagesRemaining),
      'X-Zedpera-Is-Admin':
        String(entitlementGuard.entitlements.isAdmin),
      'X-Zedpera-Unlimited-Access':
        String(
          entitlementGuard.entitlements.hasUnlimitedAccess,
        ),
      'X-Zedpera-Characters-Per-Page':
        String(CHARACTERS_PER_PAGE),
      'X-Zedpera-Plan-Id':
        entitlementGuard.entitlements.planId,
      'X-Zedpera-Plan-Name':
        encodeURIComponent(
          entitlementGuard.entitlements.planName,
        ),
      'X-Zedpera-Prompt-Limit':
        entitlementGuard.entitlements.promptLimit === null
          ? 'unlimited'
          : String(
              entitlementGuard.entitlements.promptLimit,
            ),
      'X-Zedpera-Prompts-Used-Before':
        String(
          entitlementGuard.entitlements.promptsUsed,
        ),
      'X-Zedpera-Attachment-Limit':
        entitlementGuard.entitlements.attachmentLimit === null
          ? 'unlimited'
          : String(entitlementGuard.entitlements.attachmentLimit),
      'X-Zedpera-Required-Features':
        entitlementGuard.requiredFeatures.join(','),
    },
  });
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
  profile,
  projectId,
  settings,
  relevance,
  detectedSourcesForOutput,
  externalResearch,
  pageQuota,
  pageRequestId,
  entitlementGuard,
  nativeAttachmentParts = [],
  nativeAttachmentFileNames = [],
}: {
  model: any;
  systemPrompt: string;
  normalizedMessages: ChatMessage[];
  extractedFiles: ExtractedAttachment[];
  providerLabel: string;
  module: ModuleKey;
  isChapterRequest: boolean;
  sourcesOnly: boolean;
  profile: SavedProfile | null;
  projectId: string | null;
  settings: SourceSettings;
  relevance: ProfileRelevanceResult;
  detectedSourcesForOutput: BibliographicCandidate[];
  externalResearch: ExternalResearchResult;
  pageQuota: PageQuota;
  pageRequestId: string;
  entitlementGuard: EntitlementGuardResult;
  nativeAttachmentParts?: NativeAttachmentPart[];
  nativeAttachmentFileNames?: string[];
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

  const requestedOutputTokens =
    isChapterRequest || sourcesOnly
      ? chapterOutputTokens
      : defaultOutputTokens;

  const effectiveOutputTokens =
    getOutputTokenLimit(
      pageQuota.pagesRemaining,
      requestedOutputTokens,
      {
        isUnlimited:
          pageQuota.isUnlimited ||
          pageQuota.isAdmin ||
          pageQuota.hasUnlimitedAccess,
      },
    );

  if (effectiveOutputTokens <= 0) {
    throw new PageLimitError();
  }

  // Finálny zvolený model dostáva jednotný textový kontext.
  // PDF a obrázky sa čítajú v samostatnej extrakčnej vrstve vyššie.
  // Týmto sa zabezpečí rovnaké správanie aj pre Mistral a Grok,
  // ktoré nemusia podporovať PDF FilePart priamo.
  const modelMessages = normalizedMessages;

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: modelMessages as any,
    temperature: 0.2,
    maxOutputTokens: effectiveOutputTokens,
  });

  let output = isStrictNoAcademicTailModule(module)
  ? cleanStrictOutput(result.text || '', module)
  : result.text || '';

output = cleanClientVisibleOutput(output, module);
output = removeForbiddenInternalSourcesFromOutput(output);

if (!isStrictNoAcademicTailModule(module)) {
  output = removePrimarySourcePlaceholder(output, extractedFiles);
}

if (isChapterRequest || sourcesOnly || module === 'chat') {
  const lastUserMessage = getLastUserMessage(normalizedMessages);

  output = cleanAcademicChapterOutput(output, lastUserMessage);
  output = finalizeSourceSections(output);

  const activeCitationStyle =
    getCitationStyle(profile);

  // Citačné značky sa neodstraňujú pred zostavením registra.
  // Funkcia buildCitationAwareFinalOutput ich následne deterministicky
  // prevedie podľa profilu: autor–rok pre APA/HARVARD/ISO alebo
  // zosúladené referenčné čísla pre režim Referencie pod čiarou.
  output =
    removeForbiddenInternalSourcesFromOutput(
      output,
    );

  // Najprv zabezpečíme reálne citácie z príloh a overeného externého balíka.
  // Citácia sa doplní iba z kandidáta, ktorý má použiteľného autora a rok.
  output = ensureChapterHasInTextCitations({
    text: output,
    sources: detectedSourcesForOutput,
  });

  output = ensureParagraphCitationsFromVerifiedSources(
    output,
    externalResearch.sources,
  );

  // Zdroje sa zostavia deterministicky až po vygenerovaní hlavného textu.
  // Poradie je vždy: primárny dokument a jeho presná citácia, sekundárne
  // zdroje použité v texte a napokon počet spracovaných príloh.
  output = appendVerifiedBibliography({
    text: output,
    sourcePack:
      externalResearch.sources,
    extractedFiles,
    attachmentWasRelevant:
      extractedFiles.some(
        (file) =>
          file.extractedChars > 0 &&
          file.extractedText.trim().length > 0 &&
          !file.error,
      ),
    detectedSourcesForOutput,
    citationStyle:
      activeCitationStyle,
  });

  output = removeFalseAttachmentFailureNotices(
    output,
    extractedFiles,
  );
}

output = normalizeVerificationNotices(output);

const limitedPageOutput =
  limitOutputPreservingSourceTail(
    output,
    pageQuota.pagesRemaining,
    pageQuota.isUnlimited ||
      pageQuota.isAdmin ||
      pageQuota.hasUnlimitedAccess,
  );

output = limitedPageOutput.output;

const responseSourceSections =
  extractSourceSectionsForResponse(output);

// Prompt sa odpočíta iba po úspešnom vygenerovaní a vyčistení výstupu.
const promptUsage =
  await consumeSuccessfulPrompt();

const updatedPageQuota =
  await consumePagesForOutput({
    text: output,
    module,
    requestId: pageRequestId,
  });

console.log(
  'PROMPT_USAGE_JSON_CONSUMED:',
  {
    requestId: pageRequestId,
    module,
    ...promptUsage,
  },
);

const pageUsage =
  createPageUsagePayload({
    quota: updatedPageQuota,
    output,
    requestId: pageRequestId,
    outputWasTruncated:
      limitedPageOutput.wasTruncated,
  });

console.log(
  'PAGE_QUOTA_JSON_CONSUMED:',
  pageUsage,
);

await saveGeneratedHistory({
  module,
  profile,
  projectId,
  input: getLastUserMessage(normalizedMessages),
  output,
  provider: providerLabel,
  files: extractedFilesPayload.map((file) => ({
    name: file.name,
    originalName: file.originalName,
    type: file.type,
    size: file.size,
    status: file.status,
  })),
});

  return NextResponse.json({
    ok: true,
    provider: providerLabel,
    output,
    sources:
      responseSourceSections.sources,
    primarySources:
      responseSourceSections.primarySources,
    secondarySources:
      responseSourceSections.secondarySources,
    isAdmin:
      entitlementGuard.entitlements.isAdmin,
    hasUnlimitedAccess:
      entitlementGuard.entitlements.hasUnlimitedAccess,
    entitlements:
      serializeEntitlementGuard(
        entitlementGuard,
        promptUsage,
      ),
    promptUsage,
    profileRelevance: relevance,
    externalResearch,
    extractedFiles: extractedFilesPayload,
    attachmentProcessing: {
      receivedFiles: extractedFilesPayload.length,
      successfullyReadFiles:
        new Set([
          ...extractedFilesPayload
            .filter(
              (file) =>
                file.extractedChars > 0 &&
                !file.error,
            )
            .map(
              (file) =>
                file.preparedName ||
                file.originalName ||
                file.name,
            ),
          ...nativeAttachmentFileNames,
        ]).size,
      extractedCharacters:
        extractedFilesPayload.reduce(
          (sum, file) =>
            sum + file.extractedChars,
          0,
        ),
      nativeAttachmentFiles:
        nativeAttachmentFileNames,
      nativeAttachmentRead:
        nativeAttachmentFileNames.length > 0,
      serverReadAttachments:
        extractedFilesPayload.some(
          (file) =>
            file.extractedChars > 0 &&
            !file.error,
        ) ||
        nativeAttachmentFileNames.length > 0,
    },
    pageUsage,
    extractedFilesInfo: extractedFilesPayload.map((file) => ({
      fileName: file.originalName || file.name,
      preparedName: file.preparedName,
      extension: file.effectiveExtension,
      characters: file.extractedChars,
      ok:
        (
          file.extractedChars > 0 &&
          !file.error
        ) ||
        nativeAttachmentFileNames.includes(
          file.preparedName,
        ) ||
        nativeAttachmentFileNames.includes(
          file.originalName,
        ),
      status:
        nativeAttachmentFileNames.includes(
          file.preparedName,
        ) ||
        nativeAttachmentFileNames.includes(
          file.originalName,
        )
          ? 'Súbor bol odovzdaný priamo multimodálnemu modelu.'
          : file.status,
      error:
        nativeAttachmentFileNames.includes(
          file.preparedName,
        ) ||
        nativeAttachmentFileNames.includes(
          file.originalName,
        )
          ? null
          : file.error || null,
    })),
    sourcePolicy: {
      sourceConstruction:
        'backend_enforced_from_attachments_and_verified_sources',
      backendDidNotAppendSources: false,
      backendOnlyCleanedOutput: false,
      backendAppendedOrRebuiltSources: true,
      attachmentWasRelevant:
        relevance.hasAttachmentContent &&
        relevance.isRelevant,
      usedAttachmentAsSource:
        extractedFilesPayload.some(
          (file) =>
            file.extractedChars > 0 &&
            !file.error,
        ),
      usedAiKnowledgeFallback:
        settings.allowAiKnowledgeFallback &&
        externalResearch.sources.length > 0,
      usedSemanticScholarOrCrossref:
        externalResearch.sources.length > 0,
      detectedSourcesCount:
        detectedSourcesForOutput.length,
      returnedSourceSections:
        Boolean(
          responseSourceSections.sources,
        ),
    },
  });
}

function getHistoryType(module: ModuleKey) {
  if (module === 'supervisor') return 'supervisor';
  if (module === 'quality') return 'quality';
  if (module === 'defense') return 'defense';
  if (module === 'translation') return 'translation';
  if (module === 'data') return 'data';
  if (module === 'planning') return 'planning';
  if (module === 'emails') return 'emails';
  if (module === 'originality') return 'originality';
  if (module === 'humanizer') return 'humanizer';
  if (module === 'chat') return 'chat';

  return 'chat';
}

function getHistoryTitle({
  module,
  profile,
  input,
}: {
  module: ModuleKey;
  profile: SavedProfile | null;
  input: string;
}) {
  if (profile?.title?.trim()) {
    return profile.title.trim();
  }

  const cleanedInput = normalizeText(input || '');

  if (cleanedInput.length > 8) {
    return cleanedInput.slice(0, 90);
  }

  if (module === 'supervisor') return 'AI vedúci';
  if (module === 'quality') return 'Audit kvality';
  if (module === 'defense') return 'Obhajoba práce';
  if (module === 'translation') return 'Preklad';
  if (module === 'data') return 'Analýza dát';
  if (module === 'planning') return 'Plánovanie';
  if (module === 'emails') return 'Email';
  if (module === 'originality') return 'Originalita práce';
  if (module === 'humanizer') return 'Humanizácia textu';

  return 'AI výstup';
}

function getHistoryPreview(output: string) {
  return normalizeText(output || '')
    .replace(/\s+/g, ' ')
    .slice(0, 350);
}

async function saveGeneratedHistory({
  module,
  profile,
  projectId,
  input,
  output,
  provider,
  files,
}: {
  module: ModuleKey;
  profile: SavedProfile | null;
  projectId: string | null;
  input: string;
  output: string;
  provider: string;
  files: {
    name: string;
    originalName: string;
    type: string;
    size: number;
    status: string;
  }[];
}) {
  const cleanedOutput = normalizeText(output || '');

  if (!cleanedOutput) return;

  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('zedpera_history').insert({
      project_id: projectId || null,
      profile_id: profile?.id || null,
      profile_title: profile?.title || null,
      type: getHistoryType(module),
      title: getHistoryTitle({
        module,
        profile,
        input,
      }),
      input: limitText(input || '', 8000),
      output: limitText(cleanedOutput, 120000),
      preview: getHistoryPreview(cleanedOutput),
      files,
      provider,
    });

    if (error) {
      console.error('SAVE_HISTORY_ERROR:', error);
    }
  } catch (error) {
    console.error('SAVE_HISTORY_FATAL_ERROR:', error);
  }
}



function normalizeProfileForChat(raw: any): SavedProfile | null {
  const normalizedBase = normalizeProfile(raw);

  if (!normalizedBase) return null;

  const normalized: any = normalizedBase;
  const rawSchema: any = normalized.schema || {};

  const structure = Array.isArray(rawSchema.structure)
    ? rawSchema.structure
    : typeof rawSchema.structure === 'string' && rawSchema.structure.trim()
      ? [rawSchema.structure]
      : [];

  const requiredSections = Array.isArray(rawSchema.requiredSections)
    ? rawSchema.requiredSections
    : typeof rawSchema.requiredSections === 'string' && rawSchema.requiredSections.trim()
      ? [rawSchema.requiredSections]
      : [];

  return {
    id: normalized.id,
    title: normalized.title || '',
    topic: normalized.topic || '',
    type: normalized.type || '',
    level: normalized.level || '',
    field: normalized.field || '',
    supervisor: normalized.supervisor || '',

    citation: normalizeCitationStyle(
      normalized.citation ||
        normalized.citationStyle ||
        'ISO',
    ),
    citationStyle: normalizeCitationStyle(
      normalized.citationStyle ||
        normalized.citation ||
        'ISO',
    ),

    language: normalized.language || normalized.interfaceLanguage || 'sk',
    interfaceLanguage:
      normalized.interfaceLanguage || normalized.language || 'sk',
    workLanguage:
      normalized.workLanguage || normalized.language || 'sk',

    annotation: normalized.annotation || '',
    goal: normalized.goal || '',
    problem:
      normalized.problem ||
      normalized.researchProblem ||
      normalized.research_problem ||
      '',
    methodology: normalized.methodology || '',
    hypotheses: normalized.hypotheses || '',
    researchQuestions:
      normalized.researchQuestions ||
      normalized.research_questions ||
      '',
    practicalPart:
      normalized.practicalPart ||
      normalized.practical_part ||
      '',
    scientificContribution:
      normalized.scientificContribution ||
      normalized.scientific_contribution ||
      '',
    sourcesRequirement:
      normalized.sourcesRequirement ||
      normalized.sources_requirement ||
      '',

    businessProblem: normalized.businessProblem || '',
    businessGoal: normalized.businessGoal || '',
    implementation: normalized.implementation || '',
    caseStudy: normalized.caseStudy || '',
    reflection: normalized.reflection || '',

    keywordsList: Array.isArray(normalized.keywordsList)
      ? normalized.keywordsList
      : [],

    keywords: Array.isArray(normalized.keywords)
      ? normalized.keywords
      : [],

    savedAt:
      normalized.savedAt ||
      normalized.saved_at ||
      normalized.updatedAt ||
      normalized.updated_at ||
      '',

    schema: {
      label: rawSchema.label || '',
      description: rawSchema.description || '',
      recommendedLength: rawSchema.recommendedLength || '',
      structure,
      requiredSections,
      aiInstruction: rawSchema.aiInstruction || '',
    },
  };
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
    let files: UploadedFile[] = [];
    let projectId: string | null = null;
    let outputLanguage: AppLanguage = 'sk';
    let clientRequestId =
      req.headers
        .get('x-request-id')
        ?.trim() || '';

    let validateAttachmentsAgainstProfile = false;
    let requireSourceList = true;
    let allowAiKnowledgeFallback = true;
    let useExternalAcademicSources = true;
    let returnExtractedFilesInfo = false;

    let clientExtractedText = '';
    let preparedFilesSummary = '';
    let clientDetectedSourcesSummary = '';
    let clientDetectedSources: BibliographicCandidate[] = [];
    let preparedFilesMetadata: PreparedFileMetadata[] = [];

    // =====================================================
    // REQUEST: multipart/form-data
    // =====================================================
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      clientRequestId =
        formData
          .get('requestId')
          ?.toString()
          .trim() ||
        clientRequestId;

      rawAgent = formData.get('agent')?.toString() || 'gemini';
      module = normalizeModule(formData.get('module')?.toString());
      messages = parseJson<ChatMessage[]>(formData.get('messages'), []);
      const rawProfileFromForm = parseJson<SavedProfile | null>(
  formData.get('profile'),
  null,
);

profile = normalizeProfileForChat(rawProfileFromForm);
projectId = formData.get('projectId')?.toString() || profile?.id || null;

// =====================================================
// JAZYK VÝSTUPU = JAZYK ROZHRANIA
// =====================================================
// Priorita:
// 1. interfaceLanguage z frontendu
// 2. systemLanguage z frontendu
// 3. language z frontendu
// 4. outputLanguage z frontendu
// 5. až potom profil
// 6. až úplne nakoniec fallback sk
//
// Dôležité:
// profile.workLanguage nesmie mať prednosť,
// lebo starý profil môže mať uložené sk.
const interfaceLanguageFromRequest =
  formData.get('interfaceLanguage') ||
  formData.get('systemLanguage') ||
  formData.get('language') ||
  formData.get('outputLanguage') ||
  profile?.interfaceLanguage ||
  profile?.language ||
  profile?.workLanguage ||
  'sk';

outputLanguage = normalizeAppLanguage(interfaceLanguageFromRequest, 'sk');

const requestedCitationStyle =
  normalizeCitationStyle(
    formData
      .get('citationStyle')
      ?.toString() ||
      formData
        .get('citation')
        ?.toString() ||
      profile?.citationStyle ||
      profile?.citation ||
      'ISO',
  );

if (profile) {
  profile = {
    ...profile,

    // Všetky jazykové polia zjednotíme podľa jazyka rozhrania.
    // AI potom nemá dôvod padnúť späť do slovenčiny.
    language: outputLanguage,
    interfaceLanguage: outputLanguage,
    workLanguage: outputLanguage,

    citationStyle: requestedCitationStyle,
    citation: requestedCitationStyle,
  };
}

      validateAttachmentsAgainstProfile = asBoolean(
        formData.get('validateAttachmentsAgainstProfile'),
        false,
      );

      requireSourceList = asBoolean(
        formData.get('requireSourceList'),
        true,
      );

      allowAiKnowledgeFallback = asBoolean(
        formData.get('allowAiKnowledgeFallback'),
        true,
      );

      useExternalAcademicSources = asBoolean(
        formData.get('useExternalAcademicSources'),
        true,
      );

      returnExtractedFilesInfo = asBoolean(
        formData.get('returnExtractedFilesInfo'),
        false,
      );

      preparedFilesMetadata = parseJson<PreparedFileMetadata[]>(
        formData.get('preparedFilesMetadata'),
        [],
      );

      clientExtractedText = mergeExtractedTextPayloads(
        formData.getAll('clientExtractedText'),
        formData.getAll('extractedText'),
        formData.getAll('extractedTexts'),
        formData.getAll('attachmentText'),
        formData.getAll('attachmentTexts'),
        formData.getAll('documentText'),
        formData.getAll('fileText'),
        formData.getAll('parsedText'),
        preparedFilesMetadata,
      );

      preparedFilesSummary = mergeExtractedTextPayloads(
        formData.getAll('preparedFilesSummary'),
        formData.getAll('filesSummary'),
        formData.getAll('attachmentSummary'),
      );

      clientDetectedSourcesSummary = mergeExtractedTextPayloads(
        formData.getAll('clientDetectedSourcesSummary'),
        formData.getAll('detectedSourcesSummary'),
      );

      clientDetectedSources = normalizeBibliographicCandidates(
        parseJson<BibliographicCandidate[]>(
          formData.get('clientDetectedSources'),
          [],
        ),
      );

      files = mergeUploadedFiles(
        collectUploadedFiles(formData),
        collectBase64UploadedFiles(preparedFilesMetadata),
      );

      console.log('CHAT_ATTACHMENT_UPLOAD_DEBUG:', {
        formKeys: Array.from(new Set(Array.from(formData.keys()))),
        clientExtractedChars: clientExtractedText.length,
        preparedMetadataCount: preparedFilesMetadata.length,
        count: files.length,
        files: files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          extension: getEffectiveExtension(file.name),
        })),
      });
    }

    // =====================================================
    // REQUEST: JSON
    // =====================================================
    else {
      const body = await req.json().catch(() => null);

      clientRequestId =
        toCleanString(body?.requestId) ||
        clientRequestId;

      rawAgent = body?.agent || 'gemini';
      module = normalizeModule(body?.module);

      messages = Array.isArray(body?.messages)
        ? body.messages
        : body?.message || body?.text || body?.question
          ? [
              {
                role: 'user',
                content: [body?.text, body?.question, body?.message]
                  .filter(Boolean)
                  .join('\n\n'),
              },
            ]
          : [];

   profile = normalizeProfileForChat(
  body?.activeProfile ||
    body?.profile ||
    body?.savedProfile ||
    null,
);

      projectId = body?.projectId || profile?.id || null;

      const interfaceLanguageFromRequest =
  body?.interfaceLanguage ||
  body?.systemLanguage ||
  body?.language ||
  body?.outputLanguage ||
  profile?.interfaceLanguage ||
  profile?.language ||
  profile?.workLanguage ||
  'sk';

outputLanguage = normalizeAppLanguage(interfaceLanguageFromRequest, 'sk');

      const requestedCitationStyle =
        normalizeCitationStyle(
          body?.citationStyle ||
            body?.citation ||
            profile?.citationStyle ||
            profile?.citation ||
            'ISO',
        );

      if (profile) {
  profile = {
    ...profile,

    language: outputLanguage,
    interfaceLanguage: outputLanguage,
    workLanguage: outputLanguage,

    citationStyle: requestedCitationStyle,
    citation: requestedCitationStyle,
  };
}

      clientExtractedText = mergeExtractedTextPayloads(
        body?.clientExtractedText,
        body?.extractedText,
        body?.extractedTexts,
        body?.attachmentText,
        body?.attachmentTexts,
        body?.documentText,
        body?.fileText,
        body?.parsedText,
        body?.attachments,
        body?.files,
        body?.preparedFilesMetadata,
        body?.filesMetadata,
      );

      preparedFilesSummary = mergeExtractedTextPayloads(
        body?.preparedFilesSummary,
        body?.filesSummary,
        body?.attachmentSummary,
      );

      clientDetectedSourcesSummary = mergeExtractedTextPayloads(
        body?.clientDetectedSourcesSummary,
        body?.detectedSourcesSummary,
      );

      validateAttachmentsAgainstProfile =
        typeof body?.validateAttachmentsAgainstProfile === 'boolean'
          ? body.validateAttachmentsAgainstProfile
          : false;

      requireSourceList =
        typeof body?.requireSourceList === 'boolean'
          ? body.requireSourceList
          : true;

      allowAiKnowledgeFallback =
        typeof body?.allowAiKnowledgeFallback === 'boolean'
          ? body.allowAiKnowledgeFallback
          : true;

      useExternalAcademicSources =
        typeof body?.useExternalAcademicSources === 'boolean'
          ? body.useExternalAcademicSources
          : false;

      returnExtractedFilesInfo =
        typeof body?.returnExtractedFilesInfo === 'boolean'
          ? body.returnExtractedFilesInfo
          : false;

      preparedFilesMetadata = Array.isArray(body?.preparedFilesMetadata)
        ? body.preparedFilesMetadata
        : Array.isArray(body?.filesMetadata)
          ? body.filesMetadata
          : [];

      clientDetectedSources = normalizeBibliographicCandidates(
        Array.isArray(body?.clientDetectedSources)
          ? body.clientDetectedSources
          : [],
      );

      files = mergeUploadedFiles(
        collectBase64UploadedFiles(preparedFilesMetadata),
        collectBase64UploadedFiles(body?.attachments),
        collectBase64UploadedFiles(body?.files),
      );
    }

    // =====================================================
// NAČÍTANIE KONKRÉTNE VYBRANÉHO PROFILU PODĽA projectId
// =====================================================
try {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id && projectId) {
    const { data: selectedProfileFromDb, error } = await supabase
      .from('zedpera_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', projectId)
      .maybeSingle();

    if (!error && selectedProfileFromDb) {
      const normalizedDbProfile = normalizeProfileForChat(
        selectedProfileFromDb.full_profile || selectedProfileFromDb,
      );

      if (normalizedDbProfile) {
        profile = {
          ...normalizedDbProfile,

          workLanguage:
            profile?.workLanguage ||
            normalizedDbProfile.workLanguage ||
            normalizedDbProfile.language ||
            outputLanguage,

          language:
            profile?.language ||
            normalizedDbProfile.language ||
            outputLanguage,

          interfaceLanguage:
            profile?.interfaceLanguage ||
            normalizedDbProfile.interfaceLanguage ||
            normalizedDbProfile.language ||
            outputLanguage,

          citationStyle:
            normalizeCitationStyle(
              profile?.citationStyle ||
                normalizedDbProfile.citationStyle ||
                normalizedDbProfile.citation ||
                'ISO',
            ),

          citation:
            normalizeCitationStyle(
              profile?.citation ||
                normalizedDbProfile.citation ||
                normalizedDbProfile.citationStyle ||
                'ISO',
            ),
        };

        outputLanguage = normalizeAppLanguage(
          profile.workLanguage || profile.language || outputLanguage,
          'sk',
        );
      }
    }
  }
} catch (error) {
  console.error('LOAD_SELECTED_PROJECT_PROFILE_IN_CHAT_ROUTE_ERROR:', error);
}

    // =====================================================
    // AGENT
    // =====================================================
    if (!isAllowedAgent(rawAgent)) {
      return jsonSimpleErrorResponse({
        code: 'UNKNOWN_AGENT',
        message: `Neznámy AI agent: ${String(rawAgent)}.`,
        detail:
          'Použi jeden z podporovaných agentov: openai, claude, gemini, grok alebo mistral.',
        status: 400,
      });
    }

    const agent = rawAgent;
    const normalizedMessages = normalizeMessages(messages);

    if (!normalizedMessages.length) {
      return jsonSimpleErrorResponse({
        code: 'MISSING_MESSAGES',
        message: 'Chýbajú správy pre AI.',
        detail:
          'Frontend musí odoslať aspoň jednu používateľskú správu v poli messages.',
        status: 400,
      });
    }

    const lastUserMessage = getLastUserMessage(normalizedMessages);
    const isChapterRequest = isAcademicChapterRequest(normalizedMessages);
    const requestedChapterNumber = detectChapterNumberFromText(lastUserMessage);
    const sourcesOnly = userWantsSourcesOnly(normalizedMessages);

    const receivedAttachments =
      countReceivedAttachments({
        files,
        preparedFilesMetadata,
        clientExtractedText,
      });

    const entitlementGuard =
      await requireChatRequestEntitlements({
        module,
        isChapterRequest,
        sourcesOnly,
        lastUserMessage,
        receivedAttachments,
      });

    console.log(
      'CHAT_ENTITLEMENTS_GRANTED:',
      {
        module,
        entitlementModule:
          entitlementGuard.entitlementModule,
        planId:
          entitlementGuard.entitlements.planId,
        isAdmin:
          entitlementGuard.entitlements.isAdmin,
        hasUnlimitedAccess:
          entitlementGuard.entitlements.hasUnlimitedAccess,
        requiredFeatures:
          entitlementGuard.requiredFeatures,
        promptLimit:
          entitlementGuard.entitlements.promptLimit,
        promptsUsed:
          entitlementGuard.entitlements.promptsUsed,
        promptsRemaining:
          entitlementGuard.entitlements.promptsRemaining,
        attachmentLimit:
          entitlementGuard.entitlements.attachmentLimit,
        receivedAttachments,
      },
    );

    const pageRequestId =
      clientRequestId ||
      randomUUID();

    let pageQuota: PageQuota;

    try {
      pageQuota =
        await requireAvailablePages();
    } catch (quotaError) {
      if (isPageLimitError(quotaError)) {
        return pageLimitErrorResponse(
          quotaError,
        );
      }

      throw quotaError;
    }

    console.log(
      'PAGE_QUOTA_BEFORE_GENERATION:',
      {
        requestId: pageRequestId,
        module,
        planId: pageQuota.planId,
        isAdmin: pageQuota.isAdmin,
        isUnlimited: pageQuota.isUnlimited,
        pageLimit:
          pageQuota.isUnlimited ||
          pageQuota.isAdmin ||
          pageQuota.hasUnlimitedAccess
            ? 'unlimited'
            : pageQuota.pageLimit,
        pagesUsed:
          pageQuota.pagesUsed,
        pagesRemaining:
          pageQuota.isUnlimited ||
          pageQuota.isAdmin ||
          pageQuota.hasUnlimitedAccess
            ? 'unlimited'
            : pageQuota.pagesRemaining,
        charactersPerPage:
          CHARACTERS_PER_PAGE,
      },
    );

    // =====================================================
    // PRÍLOHY
    // =====================================================
    let attachmentExtraction =
      await extractAttachmentTexts({
        files,
        preparedFilesMetadata,
        clientExtractedText,
        preparedFilesSummary,
        clientDetectedSourcesSummary,
        clientDetectedSources,
      });

    let nativeAttachmentBundle =
      await buildNativeAttachmentBundle({
        files,
        extractedFiles:
          attachmentExtraction.extractedFiles,
      });

    let successfullyExtractedFiles =
      attachmentExtraction.extractedFiles.filter(
        (file) =>
          file.extractedChars > 0 &&
          file.extractedText.trim().length > 0 &&
          !file.error,
      );

    if (
      files.length > 0 &&
      successfullyExtractedFiles.length === 0 &&
      !clientExtractedText.trim() &&
      nativeAttachmentBundle.parts.length > 0
    ) {
      const nativeExtractedText =
        await extractTextWithNativeAttachmentReader(
          nativeAttachmentBundle,
        );

      if (nativeExtractedText) {
        clientExtractedText =
          nativeExtractedText;

        attachmentExtraction =
          await extractAttachmentTexts({
            files,
            preparedFilesMetadata,
            clientExtractedText,
            preparedFilesSummary,
            clientDetectedSourcesSummary,
            clientDetectedSources,
          });

        successfullyExtractedFiles =
          attachmentExtraction.extractedFiles.filter(
            (file) =>
              file.extractedChars > 0 &&
              file.extractedText.trim().length > 0 &&
              !file.error,
          );
      }
    }

    const {
      extractedFiles,
      attachmentTexts:
        uploadedAttachmentTexts,
      compactSources,
    } = attachmentExtraction;

    nativeAttachmentBundle =
      await buildNativeAttachmentBundle({
        files,
        extractedFiles,
      });

    const extractableUploadedFiles = files.filter((file) =>
      extractableAttachmentExtensions.includes(
        getEffectiveExtension(file.name),
      ),
    );

    console.log('CHAT_ATTACHMENT_EXTRACTION_DEBUG:', {
      receivedFiles: files.length,
      extractableFiles: extractableUploadedFiles.length,
      successfullyExtractedFiles: successfullyExtractedFiles.length,
      nativeAttachmentFiles:
        nativeAttachmentBundle.fileNames,
      details: extractedFiles.map((file) => ({
        name: file.originalName,
        preparedName: file.preparedName,
        extension: file.effectiveExtension,
        extractedChars: file.extractedChars,
        status: file.status,
        error: file.error || null,
      })),
    });

    if (
      files.length > 0 &&
      successfullyExtractedFiles.length === 0 &&
      !clientExtractedText.trim() &&
      nativeAttachmentBundle.parts.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: 'ATTACHMENT_EXTRACTION_FAILED',
          message:
            'Príloha bola prijatá, ale nepodarilo sa z nej načítať text.',
          detail:
            'Súbor bol doručený do /api/chat, ale neobsahoval použiteľnú textovú vrstvu a nebol doručený ani OCR text. Server sa pokúsil spracovať PDF cez pdf-parse a DOCX cez Mammoth. Pri skenovanom PDF alebo obrázku musí frontend odoslať OCR text v poli clientExtractedText alebo extractedText, prípadne binárny obsah súboru v multipart/form-data.',
          extractedFiles: extractedFiles.map((file) => ({
            name: file.originalName,
            preparedName: file.preparedName,
            extension: file.effectiveExtension,
            extractedChars: file.extractedChars,
            status: file.status,
            error: file.error || null,
          })),
          extractedFilesInfo: extractedFiles.map((file) => ({
            fileName: file.originalName,
            preparedName: file.preparedName,
            extension: file.effectiveExtension,
            characters: file.extractedChars,
            ok:
              file.extractedChars > 0 &&
              file.extractedText.trim().length > 0 &&
              !file.error,
            status: file.status,
            error: file.error || null,
          })),
        },
        { status: 422 },
      );
    }

    const hasSuccessfullyExtractedUpload =
      successfullyExtractedFiles.length > 0 ||
      clientExtractedText.trim().length > 0;

    // =====================================================
    // PROJEKTOVÉ DOKUMENTY
    // =====================================================
    const projectDocuments = await loadProjectDocuments(projectId);

    const projectDocumentSources: BibliographicCandidate[] = [];

    const projectDocumentTexts = projectDocuments.map((doc, index) => {
      const extractedText = normalizeText(doc.extracted_text || '');

      const bibliographicCandidates = mergeBibliographicCandidates(
        extractBibliographicCandidates(extractedText, 'project'),
        buildLiteratureFromInTextCitations(
          extractInTextCitations(extractedText),
          'project',
        ),
      ).map((source) => ({
        ...source,
        sourceDocumentName: source.sourceDocumentName || doc.file_name,
        citedAccordingTo: source.citedAccordingTo || doc.file_name,
      }));

      projectDocumentSources.push(...bibliographicCandidates);

      return `DOKUMENT ZO SUPABASE ${index + 1}
Názov: ${doc.file_name}
Typ: ${doc.file_type || doc.type || 'neuvedené'}
Veľkosť: ${doc.file_size || 0} bajtov
Počet extrahovaných znakov: ${extractedText.length}
Počet detegovaných bibliografických kandidátov: ${bibliographicCandidates.length}

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(bibliographicCandidates)}

EXTRAHOVANÝ TEXT:
${
  extractedText
    ? limitMiddle(extractedText, maxProjectDocumentChars)
    : '[Dokument nemá uložený extrahovaný text]'
}`;
    });

    const attachmentTexts = [
      ...uploadedAttachmentTexts,
      ...projectDocumentTexts,
    ];

    const priorityAttachmentContext =
      buildPriorityAttachmentContext({
        extractedFiles,
        clientExtractedText,
        projectDocumentTexts,
      });

    console.log('CHAT_ATTACHMENT_CONTEXT_READY:', {
      uploadedFiles: files.length,
      extractedFiles: successfullyExtractedFiles.length,
      extractedCharacters: extractedFiles.reduce(
        (sum, file) => sum + file.extractedChars,
        0,
      ),
      clientExtractedCharacters: clientExtractedText.length,
      projectDocuments: projectDocuments.length,
      priorityContextCharacters: priorityAttachmentContext.length,
    });

    // =====================================================
    // ZDROJE
    // =====================================================
    const detectedSourcesForOutput = mergeBibliographicCandidates(
      clientDetectedSources,
      compactSources.sources,
      extractedFiles.flatMap((file) => file.bibliographicCandidates),
      extractedFiles.flatMap((file) =>
        buildLiteratureFromInTextCitations(
          file.inTextCitations || [],
          'citation',
        ),
      ),
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

    const settings: SourceSettings = {
      sourceMode: 'uploaded_documents_first',
      validateAttachmentsAgainstProfile,
      requireSourceList: isStrictNoAcademicTailModule(module)
        ? false
        : requireSourceList,
      allowAiKnowledgeFallback:
        module === 'translation' ? false : allowAiKnowledgeFallback,
      useExternalAcademicSources:
        !isStrictNoAcademicTailModule(module) && useExternalAcademicSources,
    };

    const shouldSearchExternalSources =
      settings.useExternalAcademicSources &&
      settings.allowAiKnowledgeFallback &&
      (isChapterRequest || sourcesOnly || module === 'chat') &&
      (
        !hasSuccessfullyExtractedUpload ||
        !relevance.hasAttachmentContent ||
        !relevance.isRelevant ||
        detectedSourcesForOutput.length < 3
      );

    const externalResearchSeed = [
      lastUserMessage,
      ...extractedFiles
        .filter(
          (file) =>
            file.extractedChars > 0 &&
            file.extractedText.trim().length > 0,
        )
        .map((file) =>
          [
            file.originalName,
            file.extractedPreview,
          ].join(' '),
        ),
      ...detectedSourcesForOutput
        .slice(0, 8)
        .map((source) =>
          [
            source.title,
            source.authors?.join(' '),
            source.year,
          ]
            .filter(Boolean)
            .join(' '),
        ),
    ]
      .filter(Boolean)
      .join(' ');

    const externalResearch = await buildVerifiedSourcePack({
      profile,
      userMessage:
        externalResearchSeed,
      shouldSearch:
        shouldSearchExternalSources,
    });

    const finalDetectedSourcesForOutput = mergeBibliographicCandidates(
      detectedSourcesForOutput,
      externalResearch.sources.map(verifiedSourceToBibliographicCandidate),
    );

    // =====================================================
    // PÔVODNÝ SYSTEM PROMPT + CITAČNÝ ŠTÝL Z PROFILU
    // =====================================================
    const systemPrompt = buildSystemPrompt({
      profile,
      attachmentTexts,
      settings,
      module,
      isChapterRequest,
      requestedChapterNumber,
      relevance,
      sourcesOnly,
      externalResearch,
      outputLanguage,
    });

    const profileCitationStyle =
      getCitationStyle(profile);

    const citationRegistryInstruction =
      buildCitationRegistryInstruction({
        citationStyle:
          profileCitationStyle,
        extractedFiles,
        detectedSourcesForOutput:
          finalDetectedSourcesForOutput,
        externalSources:
          externalResearch.sources,
      });

    const nativeAttachmentInstruction =
      nativeAttachmentBundle.parts.length > 0
        ? [
            '',
            'PRIAMO PRILOŽENÉ MULTIMODÁLNE SÚBORY:',
            `Súbory: ${nativeAttachmentBundle.fileNames.join(', ')}.`,
            'Tieto súbory sú priamo súčasťou poslednej používateľskej správy.',
            'Model ich musí prečítať vizuálne alebo ako dokument a nesmie tvrdiť, že príloha nie je dostupná.',
          ].join('\n')
        : '';

    const finalSystemPrompt = buildFinalSystemPrompt({
      baseSystemPrompt:
        `${systemPrompt}${nativeAttachmentInstruction}`,
      priorityAttachmentContext,
      profileCitationStyle,
      citationRegistryInstruction,
      pageQuota,
    });

    // =====================================================
    // MODEL
    // =====================================================
    try {
      const primary = getModelByAgent(agent);

      if (
        returnExtractedFilesInfo ||
        isChapterRequest ||
        sourcesOnly ||
        module === 'chat'
      ) {
        return await createJsonResponse({
          model: primary.model,
          systemPrompt: finalSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: primary.providerLabel,
          module,
          profile,
          projectId,
          isChapterRequest,
          sourcesOnly,
          settings,
          relevance,
          detectedSourcesForOutput: finalDetectedSourcesForOutput,
          externalResearch,
          pageQuota,
          pageRequestId,
          entitlementGuard,
          nativeAttachmentParts:
            nativeAttachmentBundle.parts,
          nativeAttachmentFileNames:
            nativeAttachmentBundle.fileNames,
        });
      }

      return await createStreamResponse({
        model: primary.model,
        systemPrompt: finalSystemPrompt,
        normalizedMessages,
        module,
        pageQuota,
        pageRequestId,
        entitlementGuard,
        nativeAttachmentParts:
          nativeAttachmentBundle.parts,
      });
    } catch (primaryError) {
      console.error('PRIMARY_MODEL_ERROR:', primaryError);

      if (isPageLimitError(primaryError)) {
        return pageLimitErrorResponse(
          primaryError,
        );
      }

      if (isContextWindowError(primaryError)) {
        return jsonErrorResponse(translateApiErrorToSlovak(primaryError), 413);
      }

      if (!isModelNotFoundError(primaryError)) {
        throw primaryError;
      }

      const fallback = getFallbackModel();

      const fallbackSystemPrompt = isStrictNoAcademicTailModule(module)
        ? finalSystemPrompt
        : limitText(
            `${finalSystemPrompt}

TECHNICKÁ POZNÁMKA:
Vybraný model nebol dostupný alebo bol odmietnutý poskytovateľom. Odpovedáš cez náhradný model: ${fallback.providerLabel}.

Dodrž:
- zdroje musíš vytvoriť ty ako model priamo vo výstupe,
- backend zdroje automaticky nedopĺňa,
- pri kapitolách používaj zdroje z relevantných príloh, projektových dokumentov alebo overené zdroje zo Semantic Scholar/Crossref,
- nepoužívaj fiktívne citácie,
- citácie musia byť priamo v texte,
- na konci uveď iba jednu dvojicu sekcií: Primárne zdroje a Sekundárne zdroje,
- primárne zdroje musia byť názvy dokumentov, z ktorých text čerpá, a autor/autori samotnej prílohy, ak sa dajú zistiť,
- sekundárne zdroje musia obsahovať úplné bibliografické záznamy všetkých citácií použitých priamo v texte,
- ak príloha nebola použitá alebo nebola relevantná, nikdy nepíš, že zdroj bol rozpoznaný z prílohy,
- nepoužívaj iniciály typu H., R., S. ako mená autorov.`,
            maxSystemPromptChars,
          );

      if (
        returnExtractedFilesInfo ||
        isChapterRequest ||
        sourcesOnly ||
        module === 'chat'
      ) {
        return await createJsonResponse({
          model: fallback.model,
          systemPrompt: fallbackSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: fallback.providerLabel,
          module,
          profile,
          projectId,
          isChapterRequest,
          sourcesOnly,
          settings,
          relevance,
          detectedSourcesForOutput: finalDetectedSourcesForOutput,
          externalResearch,
          pageQuota,
          pageRequestId,
          entitlementGuard,
          nativeAttachmentParts:
            nativeAttachmentBundle.parts,
          nativeAttachmentFileNames:
            nativeAttachmentBundle.fileNames,
        });
      }

      return await createStreamResponse({
        model: fallback.model,
        systemPrompt: fallbackSystemPrompt,
        normalizedMessages,
        module,
        pageQuota,
        pageRequestId,
        entitlementGuard,
        nativeAttachmentParts:
          nativeAttachmentBundle.parts,
      });
    }
  } catch (error) {
    console.error('CHAT_API_ERROR:', error);

    if (error instanceof EntitlementError) {
      return entitlementApiErrorResponse(
        error,
      );
    }

    if (isPageLimitError(error)) {
      return pageLimitErrorResponse(error);
    }

    return jsonErrorResponse(
      translateApiErrorToSlovak(error),
      500,
    );
  }
}
