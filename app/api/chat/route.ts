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
  detectedSourcesCount?: number;
  detectedSources?: BibliographicCandidate[];
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
};

// ================= LIMITS =================

const maxCompressedFileSizeBytes = 1 * 1024 * 1024;
const maxExtractedCharsPerAttachment = 50000;
const maxClientExtractedChars = 180000;
const maxDetectedSourcesPerAttachment = 120;

// ================= PROJECT DOCUMENTS =================

async function loadProjectDocuments(projectId: string | null) {
  if (!projectId) {
    return [];
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('zedpera_documents')
    .select(
      'id, project_id, file_name, file_path, file_size, file_type, type, extracted_text, created_at',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('LOAD_PROJECT_DOCUMENTS_ERROR:', error);
    return [];
  }

  return (data || []) as ProjectDocument[];
}

// ================= GENERAL HELPERS =================

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

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

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength)}

[TEXT BOL SKRÁTENÝ PRE TECHNICKÝ LIMIT API.]`;
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

function normalizeMessages(messages: ChatMessage[]) {
  return messages
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
      content: message.content.trim(),
    }));
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
  if (!profile) {
    return [];
  }

  const fromKeywordsList = Array.isArray(profile.keywordsList)
    ? profile.keywordsList
    : [];

  const fromKeywords = Array.isArray(profile.keywords) ? profile.keywords : [];

  return [...fromKeywordsList, ...fromKeywords]
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);
}

function normalizeSourceMode(value: unknown): SourceMode {
  if (value === 'uploaded_documents_first') {
    return 'uploaded_documents_first';
  }

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

// ================= BIBLIOGRAPHIC DETECTION =================

function uniqueArray(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
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
  return match?.[0] || null;
}

function extractUrl(line: string) {
  const match = line.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i);
  return match?.[0] || null;
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
      if (/^(in|from|retrieved|dostupné|available|vol|no|pp|pages|journal)$/i.test(part)) return false;

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

  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const afterYear = working.split(/\((19|20)\d{2}\)|\b(19|20)\d{2}\b/).pop();

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
  const trimmed = line.trim();

  if (trimmed.length < 20) return false;

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

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values()).slice(0, maxDetectedSourcesPerAttachment);
}

function formatBibliographicCandidates(candidates: BibliographicCandidate[]) {
  if (!candidates.length) {
    return 'Neboli automaticky detegované žiadne bibliografické záznamy. Ak sú zdroje v texte, treba ich manuálne overiť alebo doplniť čitateľnejší zoznam literatúry.';
  }

  return candidates
    .map((item, index) => {
      return `${index + 1}. Pôvodný záznam:
${item.raw}

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
      const key = `${item.raw?.slice(0, 180) || ''}-${item.doi || ''}-${item.url || ''}`;

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }
  }

  return Array.from(unique.values());
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

const extractableAttachmentExtensions = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.rtf',
];

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');

  if (index === -1) {
    return '';
  }

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
  const effectiveName = getEffectiveFileName(fileName);
  return getFileExtension(effectiveName);
}

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
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa rozbaliť gzip súbor.';

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
  const preparedMetadata = getPreparedMetadataForFile(
    file,
    preparedFilesMetadata,
  );

  const preparedName = file.name || 'neznamy-subor';
  const originalName =
    preparedMetadata?.originalName ||
    removeGzipSuffix(preparedName) ||
    preparedName;

  const type = file.type || 'application/octet-stream';
  const size = file.size || 0;
  const extension = getFileExtension(preparedName);
  const effectiveExtension = getEffectiveExtension(preparedName);
  const label = getAttachmentLabel(preparedName);
  const gzip = isGzipFile(file);
  const metadataCandidates = preparedMetadata?.detectedSources || [];

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
      };
    }

    const limited = limitText(extractedText, maxExtractedCharsPerAttachment);
    const detectedCandidates = extractBibliographicCandidates(extractedText);
    const bibliographicCandidates = mergeBibliographicCandidates(
      metadataCandidates,
      detectedCandidates,
    );

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
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa extrahovať text zo súboru.';

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
    };
  }
}

async function extractAttachmentTexts(
  files: File[],
  preparedFilesMetadata: PreparedFileMetadata[],
  clientExtractedText: string,
  preparedFilesSummary: string,
  clientDetectedSourcesSummary: string,
  clientDetectedSources: BibliographicCandidate[],
) {
  const extractedFiles: ExtractedAttachment[] = [];

  if (files.length) {
    for (const file of files) {
      const extracted = await extractTextFromSingleFile(
        file,
        preparedFilesMetadata,
      );
      extractedFiles.push(extracted);
    }
  }

  const attachmentTexts: string[] = [];

  if (preparedFilesSummary.trim()) {
    attachmentTexts.push(`TECHNICKÝ PREHĽAD KOMPRESIE A PRÍPRAVY PRÍLOH
${preparedFilesSummary.trim()}`);
  }

  if (clientDetectedSourcesSummary.trim() || clientDetectedSources.length > 0) {
    attachmentTexts.push(`DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE POSLANÉ Z FRONTENDU
${clientDetectedSourcesSummary.trim() || formatBibliographicCandidates(clientDetectedSources)}`);
  }

  if (clientExtractedText.trim()) {
    const frontendCandidates = mergeBibliographicCandidates(
      clientDetectedSources,
      extractBibliographicCandidates(clientExtractedText),
    );

    attachmentTexts.push(`EXTRAHOVANÝ TEXT POSLANÝ Z FRONTENDU
Stav: Frontend najprv pripravil prílohy, komprimoval ich do 1 MB a extrahoval dostupný text.
Poznámka: Tento text použi ako prvý zdrojový podklad pred všeobecnými znalosťami AI.

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(frontendCandidates)}

${limitText(clientExtractedText, maxClientExtractedChars)}`);
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
Upozornenie: ${file.warning || 'bez upozornenia'}
Chyba: ${file.error || 'bez chyby'}

DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE:
${formatBibliographicCandidates(file.bibliographicCandidates)}

EXTRAHOVANÝ TEXT:
${textBlock}`);
  }

  return {
    extractedFiles,
    attachmentTexts,
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
  if (!profile) {
    return 'Profil práce nebol dodaný.';
  }

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
- Nepíš slovo "Preklad".
- Nepíš "Preložený text:".
- Nepíš "Výstup:".
- Nepíš vysvetlenie.
- Nepíš komentár.
- Nepíš analýzu.
- Nepíš odporúčania.
- Nepíš zdroje.
- Nepíš použitú literatúru.
- Nepíš SEO.
- Nepíš skóre.
- Nepíš akademické hodnotenie.
- Nepíš nič pred prekladom ani nič po preklade.
- Nevytváraj nový obsah.
- Nepridávaj informácie, ktoré nie sú v pôvodnom texte.
- Zachovaj význam pôvodného textu.
- Zachovaj odseky, ak sú v texte.
- Ak používateľ pošle iba jedno slovo, prelož iba jedno slovo.
- Ak používateľ pošle krátku vetu, prelož iba krátku vetu.
- Ignoruj všetky globálne akademické šablóny.
- Ignoruj požiadavky na zdroje, citácie, analýzu, skóre a odporúčania.
- Nepoužívaj Markdown znaky, hviezdičky, mriežky ani oddeľovače.
`.trim();
}

function buildStrictEmailPrompt() {
  return `
Si profesionálny asistent na písanie emailov.

Toto je špeciálny režim EMAIL.

PRÍSNE PRAVIDLÁ:
- Tvoja jediná úloha je vytvoriť jeden použiteľný email.
- Výstup musí obsahovať iba predmet a text emailu.
- Nepíš SEO.
- Nepíš odporúčania.
- Nepíš použité zdroje.
- Nepíš zdroje.
- Nepíš analýzu.
- Nepíš skóre.
- Nepíš komentár.
- Nepíš vysvetlenie.
- Nepíš akademické hodnotenie.
- Nepíš kontrolné body.
- Nepíš doplnkové sekcie po emaili.
- Nepíš časti s názvom "ODPORÚČANIA", "SEO", "POUŽITÉ ZDROJE", "ANALÝZA", "SKÓRE", "ZÁVER".
- Nekopíruj iba zadanie používateľa.
- Email musí byť plynulý, formálny a pripravený na odoslanie.
- Ak chýba meno adresáta, použi neutrálne oslovenie "Dobrý deň,".
- Ak chýba podpis, ukonči email všeobecne "S pozdravom,".
- Nepoužívaj Markdown znaky, hviezdičky, mriežky ani oddeľovače.

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
- Tvoja úloha je vytvoriť realistický harmonogram práce.
- Nevymýšľaj dátum odovzdania.
- Nevymýšľaj rok odovzdania.
- Nikdy nepíš rok 2031, ak ho používateľ výslovne nezadal.
- Ak používateľ nezadal termín, napíš presne: Termín odovzdania nebol zadaný.
- Ak termín nie je zadaný, vytvor plán podľa etáp bez finálneho konkrétneho dátumu.
- Ak je termín zadaný, vypočítaj plán spätne od zadaného termínu.
- Nepíš SEO.
- Nepíš zdroje.
- Nepíš použité zdroje.
- Nepíš akademickú analýzu.
- Nepíš skóre.
- Nepíš citačné odporúčania.
- Nepíš bibliografiu.
- Nepíš globálne akademické sekcie.
- Nepoužívaj Markdown znaky, hviezdičky, mriežky ani oddeľovače.
- Výstup musí byť použiteľný ako plán práce.

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

function buildSystemPrompt(
  profile: SavedProfile | null,
  attachmentTexts: string[],
  settings: SourceSettings,
  module: ModuleKey,
) {
  if (module === 'translation') {
    return buildStrictTranslationPrompt();
  }

  if (module === 'emails') {
    return buildStrictEmailPrompt();
  }

  if (module === 'planning') {
    return buildStrictPlanningPrompt(profile);
  }

  const keywords = getKeywords(profile);

  const structureText =
    profile?.schema?.structure && profile.schema.structure.length > 0
      ? profile.schema.structure
          .map((item, index) => `${index + 1}. ${item}`)
          .join('\n')
      : 'Neuvedené';

  const requiredSectionsText =
    profile?.schema?.requiredSections &&
    profile.schema.requiredSections.length > 0
      ? profile.schema.requiredSections.map((item) => `- ${item}`).join('\n')
      : 'Neuvedené';

  const attachmentsBlock = buildAttachmentBlock(attachmentTexts);
  const workLanguage = getWorkLanguage(profile);
  const citationStyle = getCitationStyle(profile);
  const hasAttachments = attachmentTexts.length > 0;

  const documentSourceRules = `
PRAVIDLÁ PRE KOMPRESIU, EXTRAKCIU, PRILOŽENÉ DOKUMENTY, ZDROJE A RELEVANTNOSŤ:

1. Prílohy môžu byť doručené ako gzip súbory s príponou .gz.
2. Ak je súbor gzip, musí byť najprv rozbalený a až potom sa z neho hodnotí alebo extrahuje text.
3. Kompresný limit jednej prílohy je 1 MB. Ak je uvedené, že kompresia do 1 MB bola splnená, považuj súbor za technicky pripravený.
4. Ak je uvedené, že kompresia do 1 MB nebola splnená, uveď to v časti ANALÝZA a odporúč zmenšiť alebo rozdeliť dokument.
5. Ak je v podkladoch uvedený EXTRAHOVANÝ TEXT POSLANÝ Z FRONTENDU, použi ho ako primárny zdrojový podklad.
6. Ak server po rozbalení gzip úspešne extrahoval text, použi extrahovaný text ako primárny zdrojový podklad.
7. Ak je v podkladoch uvedený blok DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE, musíš ho použiť pri tvorbe sekcie POUŽITÉ ZDROJE A AUTORI.
8. V sekcii POUŽITÉ ZDROJE A AUTORI vypíš všetkých autorov, roky, názvy publikácií, DOI a URL, ktoré boli detegované z extrahovaného textu.
9. Ak je autor alebo rok neúplný, nepokúšaj sa ho vymyslieť. Napíš: údaj je potrebné overiť.
10. Ak je názov publikácie neúplný alebo nejasný, napíš: názov je potrebné overiť podľa pôvodného dokumentu.
11. Použité publikácie rozdeľ do skupín: A. Detegované zdroje z extrahovaného textu, B. Autori nájdení v dokumentoch, C. Publikácie a dokumenty použité ako podklad, D. Neúplné zdroje, ktoré treba overiť, E. AI odporúčané zdroje na doplnenie.
12. Ak boli v texte nájdené bibliografické záznamy, nesmieš napísať, že zdroje neboli dodané.
13. Ak boli nájdené iba mená autorov bez úplných publikácií, vypíš ich v časti Autori nájdení v dokumentoch a uveď, že bibliografický záznam je potrebné doplniť.
14. Ak boli nájdené DOI alebo URL, vypíš ich presne tak, ako boli v extrahovanom texte.
15. Semantic Scholar je vypnutý. Nepoužívaj Semantic Scholar, neuvádzaj ho ako zdroj a nespomínaj, že z neho čerpáš.
16. Primárny zdrojový základ tvoria: extrahovaný text z priložených dokumentov používateľa, dokumenty načítané zo Supabase, text zadaný používateľom v konverzácii a uložený Profil práce.
17. Ak sa z prílohy podarilo extrahovať text, musíš tento extrahovaný text použiť ako prvý zdrojový podklad pred všeobecnými znalosťami AI.
18. Nikdy nepíš, že obsah nebol extrahovaný, ak je pri prílohe uvedené: Stav extrakcie: Text bol úspešne extrahovaný. alebo Súbor bol najprv rozbalený z gzip a text bol úspešne extrahovaný.
19. Ak je pri prílohe extrahovaný text, ale neobsahuje úplné bibliografické údaje, napíš: Text bol extrahovaný, ale neobsahuje úplné bibliografické údaje.
20. Najprv posúď, či priložené dokumenty tematicky zodpovedajú Profilu práce.
21. Profil práce je rozhodujúci. Príloha je relevantná iba vtedy, ak súvisí s témou, cieľom, problémom, metodológiou, odborom alebo kľúčovými slovami profilu.
22. Ak je príloha nesúvisiaca s profilom práce, nepoužívaj ju ako odborný zdroj pre hlavný text.
23. Ak príloha nesúvisí s prácou, pokračuj pôvodným spôsobom: vychádzaj z profilu práce, odpovedz na požiadavku používateľa, transparentne uveď, že príloha nebola použitá a nevymýšľaj, že si z nej čerpal.
24. Ak sú priložené dokumenty relevantné a ich text je dostupný, čerpaj z nich a v sekcii zdrojov vypíš názov dokumentu, typ dokumentu, autorov, rok, názov publikácie alebo dokumentu, vydavateľa, časopis, inštitúciu alebo web, URL alebo DOI.
25. Ak sú priložené dokumenty, ale neobsahujú žiadne identifikovateľné bibliografické zdroje, jasne napíš: V priložených dokumentoch sa nenachádzajú žiadne identifikovateľné bibliografické zdroje.
26. Ak sú priložené dokumenty, ale server neextrahoval ich obsah, jasne napíš, že nemôžeš overiť zdroje vo vnútri dokumentu, pretože máš dostupný iba názov, typ a veľkosť súboru.
27. Ak nie sú priložené žiadne dokumenty a používateľ chce vytvoriť odborný text, môžeš použiť všeobecné znalosti AI modelu, ale musíš jasne uviesť: Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.
28. Ak používaš všeobecné znalosti AI modelu, nesmieš predstierať, že si čerpal z konkrétneho priloženého dokumentu.
29. Ak uvedieš vlastné odborné zdroje, označ ich presne ako: AI odporúčané zdroje na overenie a doplnenie.
30. Ak odporúčaš všeobecne známe odborné publikácie, uvádzaj iba údaje, ktorými si si primerane istý. Nevymýšľaj DOI, URL, čísla strán, vydanie ani presný názov kapitoly.
31. Ak si nie si istý bibliografickým údajom, napíš: údaj je potrebné overiť.
32. Pri akademickom texte používaj citačný štýl podľa profilu práce: ${citationStyle}.
33. Nevymýšľaj falošné bibliografické údaje. Ak údaj nie je dostupný, napíš: neuvedené.
34. Ak používateľ požiada o prácu, kapitolu, úvod, teóriu, abstrakt alebo metodológiu, sekcia POUŽITÉ ZDROJE A AUTORI musí byť vždy prítomná.
35. Ak je zapnutá kontrola príloh podľa profilu práce: ${
    settings.validateAttachmentsAgainstProfile ? 'áno' : 'nie'
  }.
36. Povinný zoznam zdrojov: ${settings.requireSourceList ? 'áno' : 'nie'}.
37. Povolené použiť všeobecné znalosti AI pri chýbajúcich prílohách: ${
    settings.allowAiKnowledgeFallback ? 'áno' : 'nie'
  }.
38. Aktuálny zdrojový režim: ${settings.sourceMode}.
`;

  const citationSpecialistRules = `
ŠPECIÁLNY REŽIM PRE CITÁCIE, BIBLIOGRAFIU A ZDROJE:

Tento režim použi vždy, keď používateľ žiada spracovať zdroje, pripraviť bibliografiu, opraviť citácie, citovať podľa APA 7 alebo ISO 690, spracovať zoznam literatúry, vytvoriť odkazy v texte, analyzovať výstupy zo softvéru JASP, SPSS, Jamovi, R, Excel alebo keď priložený dokument obsahuje zoznam literatúry, bibliografické záznamy, autorov, roky, názvy kníh, článkov, softvér alebo štatistické výstupy.

POVINNÉ SPRACOVANIE ZDROJOV:
1. Najprv identifikuj všetky zdroje uvedené v extrahovanom texte dokumentov.
2. Ak existuje blok DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE, považuj ho za predbežnú extrakciu a vypíš všetky jeho záznamy.
3. Ak dokument obsahuje neúplný zoznam literatúry, zachovaj všetky dostupné údaje.
4. Chýbajúce roky, vydania, spoluautorov, vydavateľov, DOI, URL alebo verzie softvéru označ vetou: údaj je potrebné overiť.
5. Nikdy nevymýšľaj DOI, URL, vydanie, čísla strán ani presné roky, ak nie sú dostupné.
6. Ak sa v dokumente nachádza "a kol.", odporuč doplniť všetkých spoluautorov.
7. Ak dokument obsahuje výstupy zo štatistického softvéru, uveď softvér ako samostatný zdroj.
8. Ak sa v dokumente nachádza JASP, priprav citáciu softvéru JASP.
9. Ak nie je známa verzia softvéru JASP, použi n.d. alebo upozorni, že verziu treba doplniť.

POVINNÁ ŠTRUKTÚRA ODPOVEDE PRI CITÁCIÁCH:
A) Formátované bibliografické záznamy
B) Varianty odkazov v texte
C) Špeciálne prípady
D) Validácia a korekcia
E) Finálny zoznam literatúry
F) Odporúčaná veta do metodológie

PRAVIDLÁ APA 7:
- Pri knihách sa v APA 7 neuvádza miesto vydania.
- Pri troch a viacerých autoroch sa v texte používa "et al.".
- Pri softvéri sa uvádza autor alebo tím, rok, názov, verzia, typ v hranatých zátvorkách a URL.
- Ak rok nie je známy, použi (n.d.) a upozorni, že údaj treba overiť.

PRAVIDLÁ ISO 690:
- Ak profil práce vyžaduje ISO 690, priprav záznamy podľa ISO 690.
- Ak používateľ výslovne žiada APA 7, použi APA 7 aj vtedy, keď profil obsahuje inú normu.

DÔLEŽITÉ:
- Primárne vychádzaj zo zdrojov v priložených dokumentoch.
- Ak zdroj nie je v dokumente, jasne ho označ ako AI odporúčaný zdroj na overenie.
- Neprezentuj odporúčaný zdroj ako overene nájdený v prílohe.
- Výstup má byť profesionálny, štruktúrovaný a vhodný na vloženie do Word dokumentu.
`;

  return `
Si ZEDPERA, profesionálny akademický AI asistent, AI vedúci práce a citačná špecialistka.

HLAVNÝ PRACOVNÝ POSTUP:
1. Najprv vychádzaj z uloženého Profilu práce.
2. Následne použi extrahovaný text z priložených dokumentov a dokumenty zo Supabase.
3. Ak je súbor komprimovaný ako .gz, najprv musí byť rozbalený a až potom použitý.
4. Ak je pri prílohe extrahovaný text, musíš ho použiť pred všeobecnými znalosťami AI.
5. Ak je dostupný blok DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE, použi ho pri tvorbe zdrojov.
6. Semantic Scholar je vypnutý a nesmie sa použiť.
7. Ak existujú prílohy, najprv posúď ich tematickú relevantnosť voči Profilu práce.
8. Ak sú prílohy relevantné a ich text je dostupný, použi ich ako primárny podklad.
9. Ak prílohy chýbajú, môžeš vychádzať zo všeobecných znalostí AI modelu, ale musíš to transparentne uviesť.
10. Ak prílohy neobsahujú zdroje, musíš to transparentne uviesť.
11. Ak prílohy nesúvisia s profilom práce, musíš upozorniť, že nezodpovedajú profilu práce.
12. Nikdy nepíš, že obsah nebol extrahovaný, ak je nižšie uvedený extrahovaný text.
13. Ak príloha nesúvisí s profilom práce, pokračuj pôvodným spôsobom podľa profilu a požiadavky používateľa.

HLAVNÉ PRAVIDLÁ:
- Odpovedaj v jazyku práce: ${workLanguage}.
- Vychádzaj prednostne z uloženého profilu práce.
- Text má byť odborne napísaný, logický a vhodný pre akademické písanie.
- Ak niečo v profile chýba, uveď, čo odporúčaš doplniť.
- Nevymýšľaj konkrétne bibliografické údaje, ak nie sú priamo dostupné.
- Nepoužívaj falošné citácie, autorov, DOI ani názvy článkov.
- Nepoužívaj Markdown formátovanie ako tučný text, mriežky, hviezdičky, oddeľovače ani kódové bloky.
- Nadpisy píš obyčajným textom bez znakov #, *, _, \`.
- Výstup musí byť čistý text vhodný na priame vloženie do Word dokumentu.

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

${documentSourceRules}

${citationSpecialistRules}

FORMÁT ODPOVEDE:
Použi presne tieto sekcie. Nepoužívaj Markdown znaky, hviezdičky, mriežky ani kódové bloky.

=== VÝSTUP ===
Sem napíš hlavný výstup ako čistý akademický text. Ak používateľ žiada citácie alebo zdroje, priprav odpoveď ako citačná špecialistka v štruktúre A až F.

=== ANALÝZA ===
Stručne vysvetli:
- z ktorých údajov profilu si čerpal,
- či boli priložené dokumenty,
- či boli prílohy komprimované do 1 MB,
- či boli gzip prílohy rozbalené,
- či bol text príloh extrahovaný,
- či boli automaticky detegované zdroje, autori a publikácie,
- či priložené dokumenty tematicky zodpovedajú profilu práce,
- či sa v priložených dokumentoch nachádzajú identifikovateľné bibliografické zdroje,
- či bol text vytvorený aj zo všeobecných znalostí AI modelu.

=== SKÓRE ===
Napíš iba číslo od 0 do 100 a krátke slovné hodnotenie. Skóre zníž, ak chýbajú relevantné zdroje, chýba extrahovaný obsah príloh, kompresia prekročila 1 MB alebo prílohy nezodpovedajú profilu práce.

=== ODPORÚČANIA ===
Uveď konkrétne odporúčania v čistom texte bez Markdown symbolov.

=== POUŽITÉ ZDROJE A AUTORI ===
A. Detegované zdroje z extrahovaného textu
Vypíš všetky zdroje, ktoré boli nájdené v bloku DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE. Pri každom zdroji uveď pôvodný záznam, autorov, rok, názov publikácie, typ zdroja, DOI, URL a čo treba overiť.

B. Autori nájdení v dokumentoch
Vypíš všetkých autorov identifikovaných z extrahovaného textu. Ak sú mená neúplné, napíš: údaj je potrebné overiť.

C. Formátované bibliografické záznamy
Uprav dostupné zdroje podľa citačnej normy z profilu práce. Ak chýbajú údaje, nevymýšľaj ich a napíš: údaj je potrebné overiť.

D. Priložené dokumenty použité ako podklad
Vypíš názvy relevantných príloh, z ktorých si čerpal.

E. Upozornenia k nerelevantným alebo neoveriteľným prílohám
Vypíš prílohy, ktoré nesúvisia s profilom práce alebo ktorých obsah nebolo možné overiť.

F. AI odporúčané zdroje na overenie a doplnenie
Ak sú zdroje neúplné, odporuč odborné zdroje na doplnenie, ale jasne ich označ ako odporúčané, nie ako overene použité.
`;
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

  throw new Error(
    'Nie je nastavený žiadny AI provider. Doplň aspoň jeden API kľúč.',
  );
}

function isModelNotFoundError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('model') &&
    (message.includes('not found') ||
      message.includes('404') ||
      message.includes('not supported') ||
      message.includes('invalid model'))
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
    maxOutputTokens: 4500,
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
}: {
  model: ModelResult['model'];
  systemPrompt: string;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  extractedFiles: ExtractedAttachment[];
  providerLabel: string;
  module: ModuleKey;
}) {
  const result = await generateText({
    model,
    system: systemPrompt,
    messages: normalizedMessages,
    temperature: 0.2,
    maxOutputTokens: 4500,
  });

  const rawOutput = result.text || '';
  const output = isStrictNoAcademicTailModule(module)
    ? cleanStrictOutput(rawOutput, module)
    : rawOutput;

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
      clientDetectedSources = parseJson<BibliographicCandidate[]>(
        formData.get('clientDetectedSources'),
        [],
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
      clientDetectedSources = Array.isArray(body?.clientDetectedSources)
        ? body.clientDetectedSources
        : [];

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

    const { extractedFiles, attachmentTexts: uploadedAttachmentTexts } =
      await extractAttachmentTexts(
        files,
        preparedFilesMetadata,
        clientExtractedText,
        preparedFilesSummary,
        clientDetectedSourcesSummary,
        clientDetectedSources,
      );

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
${extractedText ? limitText(extractedText, 50000) : '[Dokument nemá uložený extrahovaný text]'}`;
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

    const systemPrompt = buildSystemPrompt(
      profile,
      attachmentTexts,
      settings,
      module,
    );

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
        });
      }

      return await createStreamResponse({
        model: primary.model,
        systemPrompt,
        normalizedMessages,
      });
    } catch (primaryError) {
      console.error('PRIMARY_MODEL_ERROR:', primaryError);

      if (!isModelNotFoundError(primaryError)) {
        throw primaryError;
      }

      const fallback = getFallbackModel();

      const fallbackSystemPrompt = isStrictNoAcademicTailModule(module)
        ? systemPrompt
        : `
${systemPrompt}

TECHNICKÁ POZNÁMKA:
Vybraný model nebol dostupný alebo bol odmietnutý poskytovateľom.
Odpovedáš cez náhradný model: ${fallback.providerLabel}.

Aj pri náhradnom modeli musíš dodržať pravidlo:
Na konci akademickej odpovede vždy uveď sekciu:

=== POUŽITÉ ZDROJE A AUTORI ===

Ak bol text z príloh extrahovaný, musíš ho použiť ako prvý zdrojový podklad.
Ak bol súbor doručený ako gzip, musí byť posudzovaný až po rozbalení.
Ak je dostupný blok DETEGOVANÉ ZDROJE, AUTORI A PUBLIKÁCIE, musíš vypísať všetkých autorov, publikácie, roky, DOI a URL.
Ak používateľ žiada spracovanie citácií, musíš odpovedať ako citačná špecialistka a použiť štruktúru:
A) Formátované bibliografické záznamy
B) Varianty odkazov v texte
C) Špeciálne prípady
D) Validácia a korekcia
E) Finálny zoznam literatúry
F) Odporúčaná veta do metodológie

Semantic Scholar je vypnutý.
Používaj iba Profil práce, extrahovaný text z priložených dokumentov, dokumenty zo Supabase, text používateľa a všeobecné znalosti AI modelu.
Ak príloha nesúvisí s profilom práce, nepoužívaj ju ako odborný zdroj a pokračuj pôvodným spôsobom podľa profilu práce.
Ak neboli dodané overiteľné zdroje, nevymýšľaj ich a jasne uveď:
Text bol vytvorený z uloženého profilu práce a zo všeobecných znalostí AI modelu. Neboli dodané overiteľné priložené zdroje.
`;

      if (returnExtractedFilesInfo) {
        return await createJsonResponse({
          model: fallback.model,
          systemPrompt: fallbackSystemPrompt,
          normalizedMessages,
          extractedFiles,
          providerLabel: fallback.providerLabel,
          module,
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
      error instanceof Error
        ? error.message
        : 'Neznáma chyba servera v /api/chat';

    return new Response(`API error 500: ${message}`, {
      status: 500,
    });
  }
}
