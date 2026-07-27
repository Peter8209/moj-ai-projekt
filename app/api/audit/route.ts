import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { generateText } from 'ai';
import { openai as aiSdkOpenAi } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';
import {
  EntitlementError,
  PromptLimitError,
  consumeSuccessfulPrompt,
  requireModuleAccess,
  serializeEntitlements,
} from '@/lib/entitlements';
import {
  CHARACTERS_PER_PAGE,
  PageLimitError,
  consumePagesForOutput,
  getOutputTokenLimit,
  requireAvailablePages,
  type PageQuota,
} from '@/lib/page-quota';
import {
  recordCurrentUserAttachmentUsage,
  type AttachmentUsageItem,
  type AttachmentUsageSnapshot,
} from '@/lib/attachment-usage';
import { zedperaUnknownErrorJson } from '@/lib/zedpera-api-errors.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

let cachedOpenAiClient: OpenAI | null = null;
let cachedAnthropicProvider: ReturnType<typeof createAnthropic> | null = null;

const AUDIT_END_MARKER = 'KONIEC AUDITU';

/**
 * Audit musí prijať aj krátky pokyn alebo krátky úsek textu. Pôvodná
 * hranica 300 znakov spôsobovala HTTP 400 pri pokynoch ako
 * „Skontroluj mi 1. kapitolu“ a globálny error provider ich následne
 * zobrazil ako UNKNOWN_ERROR.
 */
const MIN_TEXT_LENGTH = 1;
const MIN_EXTRACTED_ATTACHMENT_LENGTH = 50;
const MAX_AUDIT_ATTACHMENTS = 20;
const MAX_MANUAL_TEXT_LENGTH = 80_000;
const MAX_ATTACHMENT_TEXT_LENGTH = 180_000;
const MAX_TOTAL_SOURCE_LENGTH = 240_000;
const MAX_USER_INSTRUCTION_LENGTH = 8_000;
const MAX_BINARY_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_BINARY_ATTACHMENT_BYTES = 60 * 1024 * 1024;
const PROVIDER_REQUEST_TIMEOUT_MS = 180_000;
const DEFAULT_AUDIT_OUTPUT_TOKENS = 6_000;
const MAX_AUDIT_OUTPUT_TOKENS = 12_000;

type Agent = 'openai' | 'claude' | 'gemini' | 'grok' | 'mistral';

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
  researchProblem?: string;
  methodology?: string;
  hypotheses?: string;
  researchQuestions?: string;
  practicalPart?: string;
  scientificContribution?: string;
  sourcesRequirement?: string;

  keywords?: string[];
  keywordsList?: string[];
};

type UploadedAttachment = {
  id?: string;
  name?: string;
  filename?: string;
  originalName?: string;
  type?: string;
  mimeType?: string;
  size?: number;
  extension?: string;
  url?: string;
  path?: string;

  text?: string;
  content?: string;
  extractedText?: string;
  markdown?: string;
  rawText?: string;

  wasCompressed?: boolean;
  originalSize?: number;
  finalSize?: number;
  binaryAvailable?: boolean;
};

type BinaryAuditFile = {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
};

type ParsedAuditRequest = {
  body: AuditRequest;
  binaryFiles: BinaryAuditFile[];
  requestMode: 'json' | 'multipart';
};

class AuditRequestValidationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: string;

  constructor(code: string, message: string, detail: string, status: number) {
    super(message);
    this.name = 'AuditRequestValidationError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

type AuditRequest = {
  agent?: Agent | string;
  model?: string;
  module?: string;
  featureKey?: string;
  projectId?: string;
  profileId?: string;

  text?: string;
  input?: string;
  message?: string;
  question?: string;
  prompt?: string;
  instruction?: string;
  userInstruction?: string;
  sourceText?: string;
  clientExtractedText?: string;
  extractedText?: string;
  attachmentText?: string;

  checkType?: string;
  qualityMode?: string;
  outputType?: string;
  outputMode?: string;
  citationStyle?: string;
  requestId?: string;

  activeProfile?: SavedProfile | null;
  profile?: SavedProfile | null;

  attachments?: UploadedAttachment[];

  title?: string;
  workType?: string;
  language?: string;

  cleanOutput?: boolean;
  removeBrokenEncoding?: boolean;
  outputFormat?: string;
  requireEndMarker?: string;
  maxOutputTokens?: number;

  auditDate?: string;
  auditScope?: string;
  profileContext?: string;
  attachmentsContext?: string;
  auditReferenceDate?: string;
  auditReferenceIsoDate?: string;
  auditCurrentYear?: number;
  currentYear?: number;
  temporalValidation?: {
    currentYear?: number;
    auditDate?: string;
    futureYearRule?: string;
  };
};

type CitationAuditResult = {
  expectedStyle: string;
  detectedStyles: string[];
  hasMismatch: boolean;
  warnings: string[];
};

type AttachmentRelevanceResult = {
  name: string;
  score: number;
  related: boolean;
  matchedKeywords: string[];
  warning?: string;
};

type AuditDateInfo = {
  auditDate: string;
  auditIsoDate: string;
  currentYear: number;
};

function getAuditDateInfo(body?: AuditRequest): AuditDateInfo {
  const now = new Date();

  const serverCurrentYear = now.getFullYear();

  const requestedYear =
    Number(body?.auditCurrentYear) ||
    Number(body?.currentYear) ||
    Number(body?.temporalValidation?.currentYear);

  const currentYear =
    Number.isFinite(requestedYear) && requestedYear >= 2020
      ? Math.max(serverCurrentYear, Math.round(requestedYear))
      : serverCurrentYear;

  const auditDate =
    cleanText(body?.auditReferenceDate) ||
    cleanText(body?.auditDate) ||
    cleanText(body?.temporalValidation?.auditDate) ||
    new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);

  const auditIsoDate = body?.auditReferenceIsoDate || now.toISOString();

  return {
    auditDate,
    auditIsoDate,
    currentYear,
  };
}

function buildDateRules(dateInfo: AuditDateInfo): string {
  return `
REFERENČNÝ DÁTUM AUDITU:
- Dátum auditu: ${dateInfo.auditDate}
- ISO dátum auditu: ${dateInfo.auditIsoDate}
- Aktuálny rok: ${dateInfo.currentYear}

PRAVIDLÁ PRE KONTROLU ROKOV A ČASOVÝCH ÚDAJOV:
1. Pri hodnotení rokov, dátumov a časových formulácií používaj výhradne referenčný dátum auditu uvedený vyššie.
2. Aktuálny rok je ${dateInfo.currentYear}.
3. Roky menšie alebo rovné ${dateInfo.currentYear} nikdy neoznačuj ako budúcnosť.
4. Ako budúce označ iba roky väčšie ako ${dateInfo.currentYear}.
5. Rok ${dateInfo.currentYear} je aktuálny rok, nie budúcnosť.
6. Roky 2025 a 2026 neoznačuj automaticky ako budúcnosť. Posudzuj ich podľa aktuálneho roka ${dateInfo.currentYear}.
7. Ak je aktuálny rok ${dateInfo.currentYear}, potom každý rok menší alebo rovný ${dateInfo.currentYear} považuj za minulý alebo aktuálny, nie budúci.
8. Neupozorňuj na rok ako chybný iba preto, že je vyšší než interný tréningový dátum modelu.
9. Ak text obsahuje roky 2025 alebo 2026 a aktuálny rok je ${dateInfo.currentYear} alebo vyšší, nepíš, že ide o budúce roky.
10. Ak nie je zistený skutočný problém s časovými údajmi, napíš, že časové údaje boli posúdené podľa aktuálneho dátumu auditu a nebol zistený problém s budúcimi rokmi.
`.trim();
}

function cleanText(value: unknown): string {
  return String(value || '')
    .replace(/\uFEFF/g, '')
    .replace(/\u200B/g, '')
    .replace(/\u200C/g, '')
    .replace(/\u200D/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/Â+/g, '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã¤/g, 'ä')
    .replace(/Ãč/g, 'č')
    .replace(/Ä/g, 'č')
    .replace(/Ä/g, 'ď')
    .replace(/Ã©/g, 'é')
    .replace(/Ä›/g, 'ě')
    .replace(/Ã­/g, 'í')
    .replace(/Äľ/g, 'ľ')
    .replace(/Ä¾/g, 'ľ')
    .replace(/Åˆ/g, 'ň')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã´/g, 'ô')
    .replace(/Å•/g, 'ŕ')
    .replace(/Å¡/g, 'š')
    .replace(/Å¥/g, 'ť')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã½/g, 'ý')
    .replace(/Å¾/g, 'ž')
    .replace(/ÄŚ/g, 'Č')
    .replace(/ÄŽ/g, 'Ď')
    .replace(/Ã‰/g, 'É')
    .replace(/Ä˝/g, 'Ľ')
    .replace(/Å‡/g, 'Ň')
    .replace(/Ã“/g, 'Ó')
    .replace(/Å Š/g, 'Š')
    .replace(/Å½/g, 'Ž')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}


type AuditInputParts = {
  instruction: string;
  sourceText: string;
  instructionOnly: boolean;
};

function firstNonEmptyText(...values: unknown[]): string {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }

  return '';
}

function normalizeForInstructionDetection(value: string): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeAuditInstruction(value: string): boolean {
  const normalized = normalizeForInstructionDetection(value);

  if (!normalized || normalized.length > 700) return false;

  return /^(skontroluj|prever|posud|zhodnot|analyzuj|audituj|oprav|pozri|precitaj|check|review|audit|analyse|analyze|evaluate|kontrollier|pruf|prüf|sprawd|ocen|oceń|ellenoriz|ellenőriz|vizsgald|vizsgáld)\b/i.test(
    normalized,
  );
}

/**
 * Podporuje tri bežné vstupy:
 * 1. samotný text kapitoly,
 * 2. krátky pokyn bez textu,
 * 3. prvý riadok ako pokyn a ďalšie riadky ako kontrolovaný text.
 */
function splitAuditInput(value: string): AuditInputParts {
  const cleaned = cleanText(value);

  if (!cleaned) {
    return {
      instruction: '',
      sourceText: '',
      instructionOnly: false,
    };
  }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const firstLine = lines[0] || '';
  const remainingText = lines.slice(1).join('\n').trim();

  if (looksLikeAuditInstruction(firstLine)) {
    return {
      instruction: firstLine.slice(0, MAX_USER_INSTRUCTION_LENGTH),
      sourceText: remainingText,
      instructionOnly: !remainingText,
    };
  }

  if (looksLikeAuditInstruction(cleaned)) {
    return {
      instruction: cleaned.slice(0, MAX_USER_INSTRUCTION_LENGTH),
      sourceText: '',
      instructionOnly: true,
    };
  }

  return {
    instruction: '',
    sourceText: cleaned,
    instructionOnly: false,
  };
}

function resolveAuditCheckType(body: AuditRequest): string {
  const explicit = cleanText(body.checkType);
  if (explicit) return explicit;

  const mode = cleanText(body.qualityMode).toLowerCase();

  if (mode === 'style') return 'Štylistika a akademický jazyk';
  if (mode === 'citations') return 'Citácie a citačná norma';
  if (mode === 'logic') return 'Logika, nadväznosť a argumentácia';

  return 'Všetko';
}

function resolveAuditOutputType(body: AuditRequest): string {
  return cleanText(body.outputType) || cleanText(body.outputMode) || 'Detailná správa';
}

function createAuditErrorResponse({
  requestId,
  code,
  message,
  detail,
  status,
  extra,
}: {
  requestId: string;
  code: string;
  message: string;
  detail?: string;
  status: number;
  extra?: Record<string, unknown>;
}) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      error: message,
      detail: detail || '',
      requestId,
      endpoint: '/api/audit',
      module: 'quality',
      ...(extra || {}),
    },
    { status },
  );
}


function normalizeAuditErrorDetail(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const errorInfo = value as Record<string, unknown>;
    const candidate =
      errorInfo.detail ||
      errorInfo.message ||
      errorInfo.error ||
      errorInfo.rawMessage;

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

function buildMissingSourceGuidance(instruction: string, language: string): string {
  const normalizedLanguage = normalizePlainText(language);

  if (normalizedLanguage.includes('english') || normalizedLanguage === 'en') {
    return [
      'I can review only the selected chapter or section.',
      `Your instruction was received: ${instruction}`,
      'Paste the chapter text into the field or upload the document. You can keep the instruction above the text, for example: “Review the logic and academic quality of Chapter 1.”',
      'No quality score was generated because the chapter content was not included.',
    ].join('\n\n');
  }

  return [
    'Môžem skontrolovať iba vybranú kapitolu alebo konkrétnu časť práce.',
    `Pokyn bol prijatý: ${instruction}`,
    'Do textového poľa vložte obsah kapitoly alebo nahrajte dokument. Pokyn môžete ponechať v prvom riadku, napríklad: „Skontroluj logiku a odbornú úroveň 1. kapitoly.“',
    'Hodnotenie ani skóre nebolo vytvorené, pretože obsah kapitoly nebol priložený.',
  ].join('\n\n');
}

function normalizePlainText(value: unknown): string {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limitText(value: string, maxLength: number) {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxLength) {
    return {
      text: cleaned,
      truncated: false,
      originalLength: cleaned.length,
      usedLength: cleaned.length,
    };
  }

  return {
    text: cleaned.slice(0, maxLength).trim(),
    truncated: true,
    originalLength: cleaned.length,
    usedLength: maxLength,
  };
}

function removeBadAuditStart(value: string): string {
  return cleanText(value)
    .replace(/^Audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^AI\s+audit\s+kvality\s*[-–—:]?.*$/im, '')
    .replace(/^Ako\s+audit\s+kvality\s*,?\s*/i, '')
    .replace(/^Ako\s+AI\s+audítor\s*,?\s*/i, '')
    .replace(/^Ako\s+AI\s+model\s*,?\s*/i, '')
    .replace(/^Dobrý\s+deň\s*,?\s*/i, '')
    .replace(/^Vážený\s+študent\s*,?\s*/i, '')
    .replace(/^Predmet\s*:.*$/gim, '')
    .replace(/^Email\s*:.*$/gim, '')
    .replace(/^Interná\s+inštrukcia\s*:.*$/gim, '')
    .replace(/^Systémová\s+inštrukcia\s*:.*$/gim, '')
    .replace(/^Technická\s+poznámka\s+pre\s+systém\s*:.*$/gim, '')
    .replace(/^Výstup\s+nebude\s+začínať.*$/gim, '')
    .replace(/^Klient\s+nemá\s+vidieť.*$/gim, '')
    .replace(/^Model\s+má.*$/gim, '')
    .replace(/^Použi\s+aktuálny\s+profil.*$/gim, '')
    .replace(/^Tento\s+výstup\s+bol\s+vygenerovaný.*$/gim, '')
    .replace(/klient nemá vidieť/gi, '')
    .replace(/kozmetické úpravy/gi, '')
    .replace(/interné pravidlá/gi, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function removeEndMarker(value: string): string {
  return cleanText(value)
    .replace(new RegExp(`\\s*${AUDIT_END_MARKER}\\s*$`, 'i'), '')
    .trim();
}

function hasEndMarker(value: string): boolean {
  return cleanText(value).toUpperCase().includes(AUDIT_END_MARKER);
}

function getProfileKeywords(profile?: SavedProfile | null): string {
  if (!profile) return 'nezadané';

  if (Array.isArray(profile.keywords) && profile.keywords.length > 0) {
    return profile.keywords.map(cleanText).filter(Boolean).join(', ');
  }

  if (Array.isArray(profile.keywordsList) && profile.keywordsList.length > 0) {
    return profile.keywordsList.map(cleanText).filter(Boolean).join(', ');
  }

  return 'nezadané';
}

function formatFileSize(bytes?: number): string {
  if (!bytes || Number.isNaN(bytes)) return 'nezadané';

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getAttachmentName(file: UploadedAttachment, index: number): string {
  return cleanText(
    file.name ||
      file.filename ||
      file.originalName ||
      `priloha-${index + 1}`,
  );
}

function getAttachmentType(file: UploadedAttachment): string {
  return cleanText(file.type || file.mimeType || file.extension || 'nezadané');
}

function getAttachmentText(file: UploadedAttachment): string {
  return cleanText(
    file.text ||
      file.content ||
      file.extractedText ||
      file.markdown ||
      file.rawText ||
      '',
  );
}

function normalizeAttachments(value: unknown): UploadedAttachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item) => item && typeof item === 'object') as UploadedAttachment[];
}

function getTotalAttachmentTextLength(attachments: UploadedAttachment[]): number {
  return attachments.reduce((total, file) => {
    return total + getAttachmentText(file).length;
  }, 0);
}

function resolveTitle(body: AuditRequest, profile?: SavedProfile | null): string {
  return (
    cleanText(body.title) ||
    cleanText(profile?.title) ||
    cleanText(profile?.topic) ||
    'Kontrolovaná akademická práca'
  );
}

function resolveWorkType(body: AuditRequest, profile?: SavedProfile | null): string {
  return (
    cleanText(body.workType) ||
    cleanText(profile?.type) ||
    'akademická práca'
  );
}

function resolveLanguage(body: AuditRequest, profile?: SavedProfile | null): string {
  return (
    cleanText(body.language) ||
    cleanText(profile?.workLanguage) ||
    cleanText(profile?.language) ||
    'slovenčina'
  );
}

function resolveResearchProblem(profile?: SavedProfile | null): string {
  return cleanText(profile?.problem) || cleanText(profile?.researchProblem) || 'nezadané';
}

function resolveCitationStyle(body: AuditRequest, profile?: SavedProfile | null): string {
  return (
    cleanText(body.citationStyle) ||
    cleanText(profile?.citation) ||
    'ISO 690'
  );
}

function resolveMaxOutputTokens(body: AuditRequest): number {
  const requested = Number(body.maxOutputTokens);

  if (Number.isFinite(requested) && requested >= 1_000) {
    return Math.min(
      Math.round(requested),
      MAX_AUDIT_OUTPUT_TOKENS,
    );
  }

  return DEFAULT_AUDIT_OUTPUT_TOKENS;
}


function normalizeAgent(value: unknown): Agent {
  const normalized = cleanText(value).toLowerCase();

  if (
    normalized === 'openai' ||
    normalized === 'claude' ||
    normalized === 'gemini' ||
    normalized === 'grok' ||
    normalized === 'mistral'
  ) {
    return normalized;
  }

  return 'openai';
}

function getOpenAiClient(): OpenAI {
  const apiKey = cleanText(process.env.OPENAI_API_KEY);

  if (!apiKey) {
    throw new Error('Chýba OPENAI_API_KEY pre Audit kvality.');
  }

  if (!cachedOpenAiClient) {
    cachedOpenAiClient = new OpenAI({ apiKey });
  }

  return cachedOpenAiClient;
}

function getAnthropicProvider() {
  if (cachedAnthropicProvider) {
    return cachedAnthropicProvider;
  }

  const apiKey =
    cleanText(process.env.ANTHROPIC_API_KEY) ||
    cleanText(process.env.CLAUDE_API_KEY);

  const authToken = cleanText(
    process.env.ANTHROPIC_AUTH_TOKEN,
  );

  if (!apiKey && !authToken) {
    throw new Error(
      'Chýba ANTHROPIC_API_KEY, CLAUDE_API_KEY alebo ANTHROPIC_AUTH_TOKEN pre Claude.',
    );
  }

  cachedAnthropicProvider = createAnthropic(
    apiKey ? { apiKey } : { authToken },
  );

  return cachedAnthropicProvider;
}

type AuditProvider = {
  agent: Agent;
  providerLabel: string;
  modelId: string;
  model: any;
};

function getAuditProvider(agent: Agent): AuditProvider {
  if (agent === 'openai') {
    const apiKey = cleanText(
      process.env.OPENAI_API_KEY,
    );

    if (!apiKey) {
      throw new Error(
        'Chýba OPENAI_API_KEY pre OpenAI Audit kvality.',
      );
    }

    const modelId =
      cleanText(
        process.env.OPENAI_AUDIT_MODEL,
      ) ||
      cleanText(
        process.env.OPENAI_MODEL,
      ) ||
      'gpt-5.1';

    return {
      agent,
      providerLabel: 'OpenAI',
      modelId,
      model: aiSdkOpenAi(modelId),
    };
  }

  if (agent === 'claude') {
    const modelId =
      cleanText(
        process.env.ANTHROPIC_AUDIT_MODEL,
      ) ||
      cleanText(
        process.env.ANTHROPIC_MODEL,
      ) ||
      cleanText(
        process.env.CLAUDE_MODEL,
      ) ||
      'claude-sonnet-4-6';

    return {
      agent,
      providerLabel: 'Claude',
      modelId,
      model: getAnthropicProvider()(modelId) as any,
    };
  }

  if (agent === 'gemini') {
    if (
      !cleanText(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      )
    ) {
      throw new Error(
        'Chýba GOOGLE_GENERATIVE_AI_API_KEY pre Gemini Audit kvality.',
      );
    }

    const modelId =
      cleanText(
        process.env.GOOGLE_AUDIT_MODEL,
      ) ||
      cleanText(
        process.env.GOOGLE_MODEL,
      ) ||
      'gemini-2.5-flash';

    return {
      agent,
      providerLabel: 'Gemini',
      modelId,
      model: google(modelId) as any,
    };
  }

  if (agent === 'grok') {
    if (!cleanText(process.env.XAI_API_KEY)) {
      throw new Error(
        'Chýba XAI_API_KEY pre Grok Audit kvality.',
      );
    }

    const modelId =
      cleanText(
        process.env.XAI_AUDIT_MODEL,
      ) ||
      cleanText(
        process.env.XAI_MODEL,
      ) ||
      'grok-3';

    return {
      agent,
      providerLabel: 'Grok',
      modelId,
      model: xai(modelId) as any,
    };
  }

  if (
    !cleanText(
      process.env.MISTRAL_API_KEY,
    )
  ) {
    throw new Error(
      'Chýba MISTRAL_API_KEY pre Mistral Audit kvality.',
    );
  }

  const modelId =
    cleanText(
      process.env.MISTRAL_AUDIT_MODEL,
    ) ||
    cleanText(
      process.env.MISTRAL_MODEL,
    ) ||
    'mistral-small-latest';

  return {
    agent: 'mistral',
    providerLabel: 'Mistral',
    modelId,
    model: mistral(modelId) as any,
  };
}

function hasProviderCredentials(
  agent: Agent,
): boolean {
  if (agent === 'openai') {
    return Boolean(
      cleanText(process.env.OPENAI_API_KEY),
    );
  }

  if (agent === 'claude') {
    return Boolean(
      cleanText(
        process.env.ANTHROPIC_API_KEY,
      ) ||
        cleanText(
          process.env.CLAUDE_API_KEY,
        ) ||
        cleanText(
          process.env.ANTHROPIC_AUTH_TOKEN,
        ),
    );
  }

  if (agent === 'gemini') {
    return Boolean(
      cleanText(
        process.env
          .GOOGLE_GENERATIVE_AI_API_KEY,
      ),
    );
  }

  if (agent === 'grok') {
    return Boolean(
      cleanText(process.env.XAI_API_KEY),
    );
  }

  return Boolean(
    cleanText(
      process.env.MISTRAL_API_KEY,
    ),
  );
}

function getConfiguredFallbackProviders(
  excludedAgent: Agent,
): AuditProvider[] {
  const allowFallback =
    cleanText(
      process.env.AUDIT_ALLOW_PROVIDER_FALLBACK,
    ).toLowerCase() === 'true';

  if (!allowFallback) {
    return [];
  }

  const requestedOrder = (
    cleanText(
      process.env.AUDIT_FALLBACK_ORDER,
    ) ||
    'claude,openai,gemini,mistral,grok'
  )
    .split(',')
    .map((value) =>
      normalizeAgent(value),
    );

  const uniqueOrder =
    Array.from(
      new Set<Agent>(requestedOrder),
    );

  const providers: AuditProvider[] = [];

  for (const agent of uniqueOrder) {
    if (
      agent === excludedAgent ||
      !hasProviderCredentials(agent)
    ) {
      continue;
    }

    try {
      providers.push(
        getAuditProvider(agent),
      );
    } catch (error) {
      console.warn(
        'AUDIT_FALLBACK_PROVIDER_INIT_WARNING:',
        {
          agent,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );
    }
  }

  return providers;
}

function normalizeCitationStyle(style: string | undefined | null): string {
  const value = cleanText(style).toLowerCase();

  if (!value) return 'neuvedená';
  if (value.includes('apa')) return 'APA';
  if (value.includes('chicago')) return 'Chicago';
  if (value.includes('iso')) return 'ISO 690';
  if (value.includes('mla')) return 'MLA';
  if (value.includes('harvard')) return 'Harvard';
  if (value.includes('vancouver')) return 'Vancouver';

  return cleanText(style);
}

function hasApaPattern(text: string): boolean {
  const source = cleanText(text);

  const patterns = [
    /\(([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+,\s?\d{4}[a-z]?)\)/,
    /\(([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+ et al\.,\s?\d{4}[a-z]?)\)/i,
    /[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+\s?\(\d{4}[a-z]?\)/,
    /\([A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+ & [A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][a-záčďéíĺľňóôŕšťúýž]+,\s?\d{4}[a-z]?\)/,
  ];

  return patterns.some((pattern) => pattern.test(source));
}

function hasChicagoPattern(text: string): boolean {
  const source = cleanText(text);

  const patterns = [
    /\bIbid\.|\bibid\./,
    /\bpoznámka pod čiarou\b/i,
    /\bfootnote\b/i,
    /\bnotes and bibliography\b/i,
    /\bBibliography\b/i,
    /\bBibliografia\b/i,
    /(?:^|\n)\s*\d+\.\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ][^.\n]+,\s[^.\n]+/,
  ];

  return patterns.some((pattern) => pattern.test(source));
}

function hasIso690Pattern(text: string): boolean {
  const source = cleanText(text);

  const patterns = [
    /[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]{2,},\s+[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/,
    /\bDostupné na internete\b/i,
    /\bAvailable from\b/i,
    /\bISBN\b/i,
    /\bISSN\b/i,
    /\bDOI\b/i,
  ];

  return patterns.some((pattern) => pattern.test(source));
}

function auditCitationStyle(
  text: string,
  expectedStyleRaw: string | undefined | null,
): CitationAuditResult {
  const expectedStyle = normalizeCitationStyle(expectedStyleRaw);
  const detectedStyles: string[] = [];
  const warnings: string[] = [];

  const source = cleanText(text);

  if (!source.trim()) {
    return {
      expectedStyle,
      detectedStyles,
      hasMismatch: false,
      warnings: [
        'Text neobsahuje dostatok údajov na spoľahlivú kontrolu citačnej normy.',
      ],
    };
  }

  if (hasApaPattern(source)) detectedStyles.push('APA');
  if (hasChicagoPattern(source)) detectedStyles.push('Chicago');
  if (hasIso690Pattern(source)) detectedStyles.push('ISO 690');

  const uniqueDetected = Array.from(new Set(detectedStyles));

  const hasMismatch =
    expectedStyle !== 'neuvedená' &&
    uniqueDetected.length > 0 &&
    !uniqueDetected.includes(expectedStyle);

  if (hasMismatch) {
    warnings.push(
      `V profile práce je nastavená citačná norma ${expectedStyle}, ale v texte boli rozpoznané znaky citačného štýlu ${uniqueDetected.join(
        ', ',
      )}.`,
    );
  }

  if (expectedStyle === 'Chicago' && uniqueDetected.includes('APA')) {
    warnings.push(
      'Text pravdepodobne používa APA citácie typu autor – rok v zátvorke, čo nie je v súlade s nastavenou citačnou normou Chicago.',
    );
  }

  if (expectedStyle === 'APA' && uniqueDetected.includes('Chicago')) {
    warnings.push(
      'Text pravdepodobne používa poznámkový alebo bibliografický štýl typický pre Chicago, hoci v profile je nastavená norma APA.',
    );
  }

  if (expectedStyle === 'ISO 690' && uniqueDetected.includes('APA')) {
    warnings.push(
      'Text pravdepodobne používa APA citácie typu autor – rok. Pri nastavenej norme ISO 690 treba upraviť citácie a bibliografické záznamy podľa ISO 690.',
    );
  }

  if (uniqueDetected.length === 0) {
    warnings.push(
      'V texte sa nepodarilo spoľahlivo rozpoznať citačný štýl. Odporúča sa manuálna kontrola citácií a zoznamu literatúry.',
    );
  }

  return {
    expectedStyle,
    detectedStyles: uniqueDetected,
    hasMismatch,
    warnings,
  };
}

function extractKeywords(value: string): string[] {
  const stopwords = new Set([
    'a',
    'aj',
    'ale',
    'alebo',
    'ako',
    'bez',
    'bol',
    'bola',
    'boli',
    'bude',
    'budú',
    'cez',
    'čo',
    'do',
    'je',
    'jeho',
    'jej',
    'ich',
    'ktorý',
    'ktorá',
    'ktoré',
    'na',
    'nad',
    'nie',
    'od',
    'pod',
    'pre',
    'pri',
    'sa',
    'si',
    'sme',
    'sú',
    'táto',
    'tento',
    'tieto',
    'to',
    'vo',
    'v',
    'z',
    'za',
    'zo',
    'the',
    'and',
    'or',
    'of',
    'to',
    'in',
    'for',
    'with',
  ]);

  return normalizePlainText(value)
    .split(' ')
    .filter((word) => word.length >= 4 && !stopwords.has(word));
}

function checkAttachmentProfileRelevance(
  attachment: UploadedAttachment,
  index: number,
  profile?: SavedProfile | null,
): AttachmentRelevanceResult {
  const name = getAttachmentName(attachment, index);

  const profileText = [
    profile?.title,
    profile?.topic,
    profile?.field,
    profile?.annotation,
    profile?.goal,
    resolveResearchProblem(profile),
    profile?.methodology,
    profile?.hypotheses,
    profile?.researchQuestions,
    profile?.practicalPart,
    profile?.scientificContribution,
    profile?.sourcesRequirement,
    getProfileKeywords(profile),
  ]
    .filter(Boolean)
    .join(' ');

  const extractedAttachmentText = getAttachmentText(attachment);
  const attachmentText = [name, extractedAttachmentText]
    .filter(Boolean)
    .join(' ');

  if (!cleanText(profileText)) {
    return {
      name,
      score: 0,
      related: true,
      matchedKeywords: [],
      warning: undefined,
    };
  }

  if (!cleanText(extractedAttachmentText) && attachment.binaryAvailable) {
    return {
      name,
      score: 0,
      related: true,
      matchedKeywords: [],
      warning: undefined,
    };
  }

  if (!cleanText(attachmentText)) {
    return {
      name,
      score: 0,
      related: true,
      matchedKeywords: [],
      warning: undefined,
    };
  }

  const profileKeywords = Array.from(new Set(extractKeywords(profileText)));
  const normalizedAttachment = normalizePlainText(attachmentText);

  const matchedKeywords = profileKeywords.filter((keyword) =>
    normalizedAttachment.includes(keyword),
  );

  const score =
    profileKeywords.length === 0
      ? 0
      : Math.round((matchedKeywords.length / profileKeywords.length) * 100);

  const related = score >= 15 || matchedKeywords.length >= 3;

  return {
    name,
    score,
    related,
    matchedKeywords,
    warning: related
      ? undefined
      : `Príloha "${name}" pravdepodobne nesúvisí s aktívnym profilom práce. Zhoda s profilom je iba ${score} %.`,
  };
}

function buildAttachmentsBlock(attachments: UploadedAttachment[]): string {
  if (!attachments.length) {
    return 'Neboli priložené žiadne prílohy.';
  }

  let totalUsedLength = 0;

  return attachments
    .map((file, index) => {
      const name = getAttachmentName(file, index);
      const type = getAttachmentType(file);
      const size = formatFileSize(file.size);
      const originalFileText = getAttachmentText(file);

      const remainingLimit = Math.max(0, MAX_TOTAL_SOURCE_LENGTH - totalUsedLength);
      const fileLimit = Math.min(MAX_ATTACHMENT_TEXT_LENGTH, remainingLimit);

      const limitedFileText = limitText(originalFileText, fileLimit);
      totalUsedLength += limitedFileText.usedLength;

      const truncationInfo = limitedFileText.truncated
        ? `Text prílohy bol skrátený z ${limitedFileText.originalLength} na ${limitedFileText.usedLength} znakov, aby sa audit neodsekol.`
        : 'Text prílohy nebol skrátený.';

      const compressionInfo =
        file.wasCompressed || file.originalSize || file.finalSize
          ? `Kompresia: ${
              file.wasCompressed
                ? `súbor bol komprimovaný z ${formatFileSize(file.originalSize)} na ${formatFileSize(file.finalSize || file.size)}`
                : 'súbor nebol komprimovaný'
            }.`
          : 'Kompresia: nezadané.';

      return `
PRÍLOHA ${index + 1}
Názov súboru: ${name}
Typ súboru: ${type}
Veľkosť: ${size}
URL / cesta: ${file.url || file.path || 'nezadané'}
Stav textu: ${truncationInfo}
${compressionInfo}

OBSAH PRÍLOHY:
"""
${
  limitedFileText.text ||
  (file.binaryAvailable
    ? 'Binárny obsah prílohy je priložený priamo k požiadavke modelu. Prečítaj ho ako primárny podklad auditu.'
    : 'Text z prílohy nebol dostupný. Príloha neobsahuje použiteľný extrahovaný text ani binárny obsah.')
}
"""
`;
    })
    .join('\n\n----------------------------------------\n\n');
}

function buildVisibleWarnings(
  citationAudit: CitationAuditResult,
  attachmentRelevanceResults: AttachmentRelevanceResult[],
): string {
  const attachmentWarnings = attachmentRelevanceResults
    .filter((item) => !item.related && item.warning)
    .map((item) => item.warning as string);

  const allWarnings = [
    ...citationAudit.warnings,
    ...attachmentWarnings,
  ].filter(Boolean);

  if (!allWarnings.length) return '';

  return `
=== UPOZORNENIA ===

${allWarnings.map((warning, index) => `${index + 1}. ${warning}`).join('\n')}
`.trim();
}

function buildProfileBlock(
  profile: SavedProfile | null,
  title: string,
  workType: string,
  language: string,
  citationStyle: string,
): string {
  return `
- ID profilu: ${profile?.id || 'nezadané'}
- Názov práce: ${title}
- Téma: ${profile?.topic || 'nezadané'}
- Typ práce: ${workType}
- Úroveň: ${profile?.level || 'nezadané'}
- Odbor: ${profile?.field || 'nezadané'}
- Vedúci práce: ${profile?.supervisor || 'nezadané'}
- Jazyk práce: ${language}
- Citačný štýl: ${citationStyle}
- Anotácia: ${profile?.annotation || 'nezadané'}
- Cieľ práce: ${profile?.goal || 'nezadané'}
- Výskumný problém: ${resolveResearchProblem(profile)}
- Metodológia: ${profile?.methodology || 'nezadané'}
- Hypotézy: ${profile?.hypotheses || 'nezadané'}
- Výskumné otázky: ${profile?.researchQuestions || 'nezadané'}
- Praktická časť: ${profile?.practicalPart || 'nezadané'}
- Odborný prínos: ${profile?.scientificContribution || 'nezadané'}
- Požiadavky na zdroje: ${profile?.sourcesRequirement || 'nezadané'}
- Kľúčové slová: ${getProfileKeywords(profile)}
`.trim();
}


function buildQualityModeInstruction(
  bodyCheckType: string,
): string {
  const normalized =
    cleanText(bodyCheckType)
      .toLowerCase();

  if (
    normalized.includes(
      'štylist',
    ) ||
    normalized.includes(
      'stylist',
    )
  ) {
    return `
REŽIM AUDITU – ŠTYLISTIKA A AKADEMICKÝ JAZYK:
- Kontroluj najmä akademickosť, terminológiu, vetnú stavbu, plynulosť, zrozumiteľnosť, opakovanie slov, nevhodné formulácie a formálnosť.
- Obsahové tvrdenie označ ako problém iba vtedy, keď je jeho nepresnosť z textu jednoznačná.
- Pri každej zásadnej štylistickej chybe uveď konkrétnu opravenú formuláciu.
`.trim();
  }

  if (
    normalized.includes(
      'citáci',
    ) ||
    normalized.includes(
      'citaci',
    )
  ) {
    return `
REŽIM AUDITU – CITÁCIE A CITAČNÁ NORMA:
- Kontroluj odkazy v texte, súlad autor–rok/číselného systému, konzistentnosť zoznamu literatúry a úplnosť bibliografických údajov, ktoré sú v podklade skutočne uvedené.
- Nevytváraj nové zdroje, autorov, DOI, URL, ISBN, ISSN ani vydavateľské údaje.
- Ak je záznam neúplný, presne pomenuj, ktorý údaj chýba.
- Pri zistenom nesúlade uveď konkrétny návrh opravy tvaru citácie.
`.trim();
  }

  if (
    normalized.includes(
      'logik',
    ) ||
    normalized.includes(
      'argument',
    )
  ) {
    return `
REŽIM AUDITU – LOGIKA, NADVÄZNOSŤ A ARGUMENTÁCIA:
- Kontroluj vnútornú súdržnosť, poradie tvrdení, nadväznosť odsekov, duplicity, rozpory a prepojenie cieľa, problému, metodológie, výsledkov a záverov.
- Pri každom logickom probléme uveď konkrétny spôsob opravy alebo odporúčané preusporiadanie.
`.trim();
  }

  return `
REŽIM AUDITU – KOMPLETNÝ ODBORNÝ AUDIT:
- Posúď štylistiku, logiku, štruktúru, metodológiu, odbornú presnosť, citácie, súlad s profilom práce a praktickú použiteľnosť textu.
- Výstup nesmie zostať iba pri kritike; ku každému zásadnému problému pridaj konkrétnu opravu.
`.trim();
}

function buildAuditOutputModeInstruction(
  outputType: string,
): string {
  const normalized =
    cleanText(outputType)
      .toLowerCase();

  if (
    normalized.includes(
      'struč',
    ) ||
    normalized ===
      'short' ||
    normalized ===
      'concise'
  ) {
    return `
REŽIM VÝSTUPU – STRUČNÝ:
- Zameraj sa iba na najdôležitejšie zistenia.
- Uveď najviac 7 hlavných problémov.
- Prepíš najviac 5 najdôležitejších viet.
- Nevytváraj kompletnú prepracovanú verziu dlhého textu; uveď iba vzorové opravené pasáže.
`.trim();
  }

  return `
REŽIM VÝSTUPU – DETAILNÝ:
- Vytvor plnohodnotnú odbornú správu.
- Každý zásadný problém vysvetli a pridaj konkrétny návrh opravy.
- Časť „ZAPRACOVANÁ UPRAVENÁ VERZIA“ je povinná.
- Ak auditovaný text nie je extrémne dlhý, prepíš celý kontrolovaný text do kvalitnejšej akademickej podoby.
- Ak je text príliš dlhý na úplné prepísanie v jednom výstupe, prepíš najproblematickejšie súvislé pasáže a transparentne uveď, ktoré časti zostali bez kompletného prepisu.
`.trim();
}

function buildAuditPrompt({
  text,
  userInstruction,
  attachmentsBlock,
  checkType,
  outputType,
  citationStyle,
  profile,
  hasAttachments,
  title,
  workType,
  language,
  manualTextWasTruncated,
  citationAudit,
  attachmentRelevanceResults,
  dateInfo,
}: {
  text: string;
  userInstruction: string;
  attachmentsBlock: string;
  checkType: string;
  outputType: string;
  citationStyle: string;
  profile?: SavedProfile | null;
  hasAttachments: boolean;
  title: string;
  workType: string;
  language: string;
  manualTextWasTruncated: boolean;
  citationAudit: CitationAuditResult;
  attachmentRelevanceResults: AttachmentRelevanceResult[];
  dateInfo: AuditDateInfo;
}): string {
  const profileBlock = buildProfileBlock(profile || null, title, workType, language, citationStyle);

  const automaticWarnings = buildVisibleWarnings(citationAudit, attachmentRelevanceResults);

  const dateRules = buildDateRules(dateInfo);
  const qualityModeInstruction =
    buildQualityModeInstruction(checkType);
  const outputModeInstruction =
    buildAuditOutputModeInstruction(outputType);

  return `
Si odborný akademický hodnotiteľ, metodológ, školiteľ a odborný korektor.

Tvojou úlohou je vykonať CIELENÝ ALEBO KOMPLETNÝ AUDIT KVALITY AKADEMICKEJ PRÁCE podľa pokynu používateľa a aktuálneho profilu práce.

Ak používateľ žiada skontrolovať iba jednu kapitolu, podkapitolu, úvod, záver, metodiku alebo inú vybranú časť, hodnotíš výhradne túto časť. Nesimuluj audit celej práce a nevyvodzuj závery o častiach, ktoré neboli poskytnuté.

KRITICKÉ PRAVIDLÁ:
1. Výstup musí byť dokončený a musí sa skončiť presnou vetou: ${AUDIT_END_MARKER}
2. Nepíš email.
3. Nepíš oslovenie.
4. Nepíš predmet emailu.
5. Nepíš úvod typu "Ako AI audítor".
6. Nepoužívaj markdown značky #, ##, **, --- ani kódové bloky.
7. Nepoužívaj nečitateľné alebo poškodené znaky.
8. Nevymýšľaj konkrétne bibliografické záznamy, autorov, DOI ani URL.
9. Ak treba citácie, odporuč iba typ zdroja: ISO norma, AOAC metóda, odborný článok, učebnica, metodická príručka alebo štandardizovaný laboratórny postup.
10. Buď konkrétny. Nepíš všeobecné frázy.
11. Pri ukážkach prepísaných viet uveď maximálne 5 viet, aby sa výstup neodsekol.
12. Ak ide o chemickú, biologickú, potravinársku alebo laboratórnu metodiku, skontroluj aj odbornú správnosť činidiel, indikátorov, koncentrácií, výpočtov, jednotiek a postupu.
13. Ak text obsahuje odbornú chybu, pomenuj ju priamo a navrhni správne znenie.
14. Vždy posúď súlad textu s profilom práce.
15. Vždy posúď, či citačný štýl v texte zodpovedá citačnej norme v profile.
16. Ak profil vyžaduje Chicago a text obsahuje APA citácie typu autor – rok, musíš na to jasne upozorniť.
17. Ak príloha nesúvisí s profilom práce, musíš na to jasne upozorniť.
18. Výstup musí byť klientsky čistý. Nepíš interné systémové poznámky.
19. Pri kontrole rokov, dátumov a časových údajov musíš použiť reálny dátum auditu uvedený v časti "REFERENČNÝ DÁTUM AUDITU".
20. Roky 2025 a 2026 neoznačuj automaticky ako budúcnosť. Ako budúcnosť označ iba roky väčšie ako aktuálny rok ${dateInfo.currentYear}.

${dateRules}

PROFIL PRÁCE:
${profileBlock}

NASTAVENIE AUDITU:
- Typ kontroly: ${checkType}
- Typ výstupu: ${outputType}

${qualityModeInstruction}

${outputModeInstruction}

POKYN POUŽÍVATEĽA:
${userInstruction || 'Používateľ nezadal samostatný pokyn. Vykonaj audit vloženého textu alebo príloh.'}

PRAVIDLO ROZSAHU:
- Rešpektuj presný pokyn používateľa.
- Ak žiada kontrolu jednej kapitoly alebo jednej časti, neposudzuj celú prácu ako hotový dokument.
- Ak je dostupný iba krátky úsek textu, vykonaj primerane cielenú kontrolu tohto úseku.

ZDROJ TEXTU:
${
  hasAttachments
    ? 'Používateľ vložil text a/alebo nahral prílohy. Pri audite zohľadni ručne vložený text aj obsah príloh.'
    : 'Používateľ vložil text ručne.'
}

TECHNICKÁ INFORMÁCIA:
${
  manualTextWasTruncated
    ? 'Ručne vložený text bol technicky skrátený, aby sa výstup neodsekol. V audite to uveď ako obmedzenie.'
    : 'Ručne vložený text nebol technicky skrátený.'
}

AUTOMATICKÉ KONTROLY:
- Očakávaná citačná norma: ${citationAudit.expectedStyle}
- Rozpoznané citačné štýly: ${
    citationAudit.detectedStyles.length
      ? citationAudit.detectedStyles.join(', ')
      : 'nerozpoznané'
  }
- Nesúlad citačnej normy: ${citationAudit.hasMismatch ? 'áno' : 'nie'}
- Kontrola príloh voči profilu:
${
  attachmentRelevanceResults.length
    ? attachmentRelevanceResults
        .map(
          (item) =>
            `  - ${item.name}: zhoda ${item.score} %, ${
              item.related ? 'pravdepodobne súvisí s profilom' : 'pravdepodobne nesúvisí s profilom'
            }`,
        )
        .join('\n')
    : '  - prílohy neboli nahraté'
}

${automaticWarnings || 'Automatické upozornenia: bez zásadných upozornení.'}

TEXT VLOŽENÝ RUČNE:
"""
${text || 'Text nebol vložený ručne. Audit vykonaj z priložených súborov, ak je ich obsah dostupný.'}
"""

PRÍLOHY NA AUDIT:
${attachmentsBlock}

POVINNÁ ŠTRUKTÚRA VÝSTUPU:

=== UPOZORNENIA ===
Ak existuje nesúlad citačnej normy, nesúlad prílohy s profilom, chýbajúci extrahovaný text alebo technický problém, uveď to tu.
Ak nie je žiadne upozornenie, napíš: Neboli zistené zásadné technické upozornenia.

=== STRUČNÉ HODNOTENIE ===
Zhodnoť celkovú kvalitu textu, akademickú úroveň, odbornú presnosť a použiteľnosť do práce. Uveď 5 až 8 viet.

=== SÚLAD S PROFILOM PRÁCE ===
Posúď súlad s názvom, témou, cieľom práce, výskumným problémom, metodológiou, hypotézami, výskumnými otázkami, jazykom práce a požiadavkami na zdroje.

=== SILNÉ STRÁNKY ===
Uveď konkrétne silné stránky textu.

=== SLABÉ STRÁNKY ===
Uveď konkrétne slabiny textu.

=== KONKRÉTNE ODBORNÉ CHYBY A OPRAVY ===
Pri každej chybe uveď:
- čo je problém,
- ako to opraviť,
- prečo je oprava dôležitá.

Ak sa v texte nachádza laboratórna metóda, posúď najmä:
- správnosť použitého titrantu,
- indikátor a jeho farebnú zmenu,
- princíp metódy,
- činidlá a koncentrácie,
- prístroje,
- výpočet výsledku,
- prepočet na obsah bielkovín alebo inú sledovanú veličinu,
- potrebu citovať normu alebo štandardizovanú metódu.

=== LOGIKA A ŠTRUKTÚRA ===
Zhodnoť členenie, nadväznosť odsekov, argumentáciu a vnútornú súdržnosť.

=== METODOLÓGIA ===
Zhodnoť, či metodická časť obsahuje dostatočný opis postupu, vzoriek, prístrojov, činidiel, podmienok merania, výpočtov a kontroly kvality.

=== CITAČNÁ NORMA A ZDROJE ===
Zhodnoť, či text rešpektuje citačný štýl nastavený v profile.
Ak je v profile Chicago, ale text používa APA, jasne to napíš.
Nevymýšľaj konkrétne bibliografické záznamy.

=== AKADEMICKÝ ŠTÝL ===
Zhodnoť jazyk, formálnosť, odbornosť, terminológiu, štylistiku a zrozumiteľnosť.

=== KONTROLA ČASOVÝCH ÚDAJOV ===
Skontroluj roky, dátumy a časové formulácie v texte.
Použi výhradne tieto hodnoty:
- Dátum auditu: ${dateInfo.auditDate}
- Aktuálny rok: ${dateInfo.currentYear}

Roky menšie alebo rovné ${dateInfo.currentYear} nepovažuj za budúcnosť.
Ako budúcnosť označ iba roky väčšie ako ${dateInfo.currentYear}.
Roky 2025 a 2026 neoznačuj automaticky ako budúcnosť.
Ak nie sú zistené problémy s časovými údajmi, napíš: Časové údaje sú posúdené podľa aktuálneho dátumu auditu a nebol zistený problém s budúcimi rokmi.

=== KONKRÉTNE PREPÍSANÉ VETY ===
Pri každej úprave použi presne tento tvar:
Pôvodná veta:
Problém:
Opravená veta:

Pri detailnom výstupe vyber minimálne 5 najdôležitejších problémových viet, ak ich text obsahuje.
Pri stručnom výstupe vyber najviac 5 viet.

=== ZAPRACOVANÁ UPRAVENÁ VERZIA ===
Pri detailnom audite vytvor aj zapracovanú akademicky upravenú verziu kontrolovaného textu alebo jeho najproblematickejších súvislých častí.
Zachovaj pôvodný význam, fakty, čísla a citácie.
Nevymýšľaj chýbajúce údaje.
Ak niečo nemožno bezpečne doplniť, označ to formuláciou: údaj je potrebné doplniť.

=== ODPORÚČANÉ DOPLNENIA ===
Napíš, čo má autor doplniť do práce.

=== SKÓRE KVALITY OD 0 DO 100 ===
Uveď presne tieto riadky:
Logika:
Metodológia:
Citácie:
Akademický štýl:
Odborná presnosť:
Súlad s profilom:
Časové údaje:
Celkové skóre:

=== PRIORITA OPRÁV ===
Rozdeľ opravy na:
Urgentné:
Dôležité:
Odporúčané:

=== TECHNICKÉ UPOZORNENIE ===
Ak text obsahoval poškodené znaky, nečitateľné časti, chýbajúci extrahovaný text alebo bol skrátený, uveď to tu.
Ak nie, napíš, že technické problémy neboli zistené.

Na úplný koniec napíš presne:
${AUDIT_END_MARKER}
`.trim();
}

function buildSystemMessage(dateInfo: AuditDateInfo): string {
  return `
${GLOBAL_ACADEMIC_SYSTEM_PROMPT || ''}

Si prísny, ale konštruktívny akademický školiteľ, metodológ a odborný korektor.
Hodnotíš kvalitu textu, logiku, štruktúru, metodológiu, citácie, odbornú presnosť, súlad s profilom práce a akademický štýl.
Výstup musí byť praktický, konkrétny, formálny a použiteľný pre študenta alebo autora práce.
Nepíš email, oslovenie ani marketingový text.
Nepíš interné technické inštrukcie.
Nevymýšľaj zdroje.
Vždy dokonči odpoveď koncovou značkou ${AUDIT_END_MARKER}.

${buildDateRules(dateInfo)}

Dôležité:
Pri kontrole rokov nepoužívaj interný tréningový dátum modelu.
Používaj iba reálny serverový dátum auditu.
Roky 2025 a 2026 neoznačuj automaticky ako budúcnosť.
Ako budúcnosť označ iba roky väčšie ako ${dateInfo.currentYear}.
`.trim();
}

function buildClientCleanResult(value: string): string {
  return removeEndMarker(removeBadAuditStart(value))
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonValue<T>(value: string, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isBinaryFormEntry(value: FormDataEntryValue): value is File {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as File;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.size === 'number' &&
    typeof candidate.arrayBuffer === 'function'
  );
}

async function parseAuditRequest(req: NextRequest): Promise<ParsedAuditRequest> {
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    const body = (await req.json()) as AuditRequest;
    return {
      body,
      binaryFiles: [],
      requestMode: 'json',
    };
  }

  const formData = await req.formData();
  const profile = parseJsonValue<SavedProfile | null>(
    formString(formData, 'profile'),
    null,
  );
  const activeProfile = parseJsonValue<SavedProfile | null>(
    formString(formData, 'activeProfile'),
    profile,
  );

  const preparedMetadata = parseJsonValue<UploadedAttachment[]>(
    formString(formData, 'preparedFilesMetadata'),
    [],
  );
  const explicitAttachments = parseJsonValue<UploadedAttachment[]>(
    formString(formData, 'attachments'),
    [],
  );

  const body: AuditRequest = {
    requestId: formString(formData, 'requestId') || undefined,
    agent:
      formString(formData, 'agent') ||
      formString(formData, 'model') ||
      undefined,
    model: formString(formData, 'model') || undefined,
    module: formString(formData, 'module') || 'quality',
    featureKey: formString(formData, 'featureKey') || undefined,
    projectId: formString(formData, 'projectId') || undefined,
    profileId: formString(formData, 'profileId') || undefined,
    input: formString(formData, 'input') || undefined,
    text: formString(formData, 'text') || undefined,
    message: formString(formData, 'message') || undefined,
    question: formString(formData, 'question') || undefined,
    prompt: formString(formData, 'prompt') || undefined,
    instruction: formString(formData, 'instruction') || undefined,
    userInstruction: formString(formData, 'userInstruction') || undefined,
    sourceText: formString(formData, 'sourceText') || undefined,
    clientExtractedText:
      formString(formData, 'clientExtractedText') || undefined,
    extractedText: formString(formData, 'extractedText') || undefined,
    attachmentText: formString(formData, 'attachmentText') || undefined,
    checkType: formString(formData, 'checkType') || undefined,
    qualityMode: formString(formData, 'qualityMode') || undefined,
    outputType: formString(formData, 'outputType') || undefined,
    outputMode: formString(formData, 'outputMode') || undefined,
    auditScope: formString(formData, 'auditScope') || undefined,
    profileContext: formString(formData, 'profileContext') || undefined,
    attachmentsContext: formString(formData, 'attachmentsContext') || undefined,
    maxOutputTokens:
      Number(formString(formData, 'maxOutputTokens')) || undefined,
    citationStyle:
      formString(formData, 'citationStyle') ||
      formString(formData, 'citation') ||
      undefined,
    title: formString(formData, 'title') || undefined,
    workType: formString(formData, 'workType') || undefined,
    language:
      formString(formData, 'language') ||
      formString(formData, 'workLanguage') ||
      undefined,
    profile,
    activeProfile,
    attachments: explicitAttachments.length
      ? explicitAttachments
      : preparedMetadata,
  };

  const rawFiles = formData
    .getAll('files')
    .filter(isBinaryFormEntry)
    .filter((file) => file.size > 0);

  if (rawFiles.length > MAX_AUDIT_ATTACHMENTS) {
    throw new AuditRequestValidationError(
      'ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED',
      'Nahrali ste viac ako 20 príloh.',
      'Audit kvality dokáže v jednej požiadavke spracovať maximálne 20 príloh.',
      400,
    );
  }

  let totalBytes = 0;
  const binaryFiles: BinaryAuditFile[] = [];

  for (const file of rawFiles) {
    if (file.size > MAX_BINARY_ATTACHMENT_SIZE_BYTES) {
      throw new AuditRequestValidationError(
        'ATTACHMENT_TOO_LARGE',
        `Súbor "${file.name}" je príliš veľký.`,
        'Maximálna veľkosť jednej prílohy pre Audit kvality je 30 MB.',
        413,
      );
    }

    totalBytes += file.size;

    if (totalBytes > MAX_TOTAL_BINARY_ATTACHMENT_BYTES) {
      throw new AuditRequestValidationError(
        'ATTACHMENTS_TOTAL_SIZE_TOO_LARGE',
        'Celková veľkosť príloh je príliš veľká.',
        'V jednej požiadavke auditu odošlite maximálne 60 MB binárnych príloh.',
        413,
      );
    }

    binaryFiles.push({
      name: file.name || 'priloha',
      type: file.type || 'application/octet-stream',
      size: file.size,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
  }

  return {
    body,
    binaryFiles,
    requestMode: 'multipart',
  };
}

function getResponsesOutputText(response: any): string {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  if (!Array.isArray(response?.output)) return '';

  return response.output
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .map((content: any) =>
      typeof content?.text === 'string'
        ? content.text
        : typeof content?.output_text === 'string'
          ? content.output_text
          : '',
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}

function buildBinaryModelInputs(binaryFiles: BinaryAuditFile[]): any[] {
  return binaryFiles.map((file) => {
    const base64 = file.bytes.toString('base64');

    if (file.type.startsWith('image/')) {
      return {
        type: 'input_image',
        image_url: `data:${file.type};base64,${base64}`,
        detail: 'auto',
      };
    }

    return {
      type: 'input_file',
      filename: file.name,
      file_data: base64,
    };
  });
}


function buildAiSdkBinaryParts(
  binaryFiles: BinaryAuditFile[],
): any[] {
  return binaryFiles.map((file) => {
    const data = new Uint8Array(file.bytes);

    if (file.type.startsWith('image/')) {
      return {
        type: 'image',
        image: data,
        mediaType: file.type,
      };
    }

    return {
      type: 'file',
      data,
      mediaType:
        file.type ||
        'application/octet-stream',
      filename: file.name,
    };
  });
}

type AuditModelRunResult = {
  rawResult: string;
  finishReason: string | null;
  providerMode:
    | 'ai-sdk-text'
    | 'ai-sdk-native-file-input'
    | 'openai-responses-file-input';
  provider: AuditProvider;
  fallbackUsed: boolean;
  fallbackFrom?: Agent;
};

async function generateAuditWithProvider({
  provider,
  prompt,
  maxCompletionTokens,
  dateInfo,
  binaryFiles,
}: {
  provider: AuditProvider;
  prompt: string;
  maxCompletionTokens: number;
  dateInfo: AuditDateInfo;
  binaryFiles: BinaryAuditFile[];
}): Promise<AuditModelRunResult> {
  const system = buildSystemMessage(
    dateInfo,
  );

  /**
   * OpenAI binárne prílohy posielame cez Responses API.
   * Je to najspoľahlivejšia cesta pre PDF a input_file a zároveň
   * nevyžaduje, aby frontend odosielal rovnaký súbor dvakrát.
   */
  if (
    provider.agent === 'openai' &&
    binaryFiles.length > 0
  ) {
    const openai =
      getOpenAiClient();

    const responsesApi =
      (openai as any).responses;

    if (
      !responsesApi ||
      typeof responsesApi.create !==
        'function'
    ) {
      throw new Error(
        'Nainštalovaná verzia balíka openai nepodporuje Responses API s input_file. Aktualizujte balík openai.',
      );
    }

    const response =
      await responsesApi.create(
        {
          model: provider.modelId,
          max_output_tokens:
            maxCompletionTokens,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: system,
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `${prompt}

PRAVIDLO PRE PRIAMO PRILOŽENÉ SÚBORY:
Binárne súbory sú súčasťou tejto požiadavky Auditu kvality.
Prečítaj ich ako primárny podklad auditu.
Nevyhlasuj, že príloha chýba, pokiaľ je priamo súčasťou správy.`,
                },
                ...buildBinaryModelInputs(
                  binaryFiles,
                ),
              ],
            },
          ],
        },
        {
          timeout:
            PROVIDER_REQUEST_TIMEOUT_MS,
        },
      );

    return {
      rawResult:
        getResponsesOutputText(response),
      finishReason:
        typeof response?.status ===
        'string'
          ? response.status
          : null,
      providerMode:
        'openai-responses-file-input',
      provider,
      fallbackUsed: false,
    };
  }

  const messages =
    binaryFiles.length > 0
      ? ([
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${prompt}

PRAVIDLO PRE PRIAMO PRILOŽENÉ SÚBORY:
Všetky binárne súbory priložené k tejto správe sú vstupom Auditu kvality.
Prečítaj PDF, obrázky alebo podporované dokumenty priamo.
Nevyhlasuj, že príloha nie je dostupná, ak je súčasťou tejto správy.`,
              },
              ...buildAiSdkBinaryParts(
                binaryFiles,
              ),
            ],
          },
        ] as any)
      : undefined;

  const result =
    await generateText({
      model: provider.model,
      system,
      ...(messages
        ? { messages }
        : { prompt }),
      maxOutputTokens:
        maxCompletionTokens,
      maxRetries: 0,
      timeout: {
        totalMs:
          PROVIDER_REQUEST_TIMEOUT_MS,
        stepMs:
          PROVIDER_REQUEST_TIMEOUT_MS,
      },
    });

  return {
    rawResult:
      result.text || '',
    finishReason:
      result.finishReason
        ? String(result.finishReason)
        : null,
    providerMode:
      binaryFiles.length > 0
        ? 'ai-sdk-native-file-input'
        : 'ai-sdk-text',
    provider,
    fallbackUsed: false,
  };
}

async function runAuditModel({
  agent,
  prompt,
  maxCompletionTokens,
  dateInfo,
  binaryFiles,
}: {
  agent: Agent;
  prompt: string;
  maxCompletionTokens: number;
  dateInfo: AuditDateInfo;
  binaryFiles: BinaryAuditFile[];
}): Promise<AuditModelRunResult> {
  const primaryProvider =
    getAuditProvider(agent);

  try {
    return await generateAuditWithProvider({
      provider: primaryProvider,
      prompt,
      maxCompletionTokens,
      dateInfo,
      binaryFiles,
    });
  } catch (primaryError) {
    console.error(
      'AUDIT_PRIMARY_PROVIDER_ERROR:',
      {
        agent:
          primaryProvider.agent,
        provider:
          primaryProvider.providerLabel,
        model:
          primaryProvider.modelId,
        error:
          primaryError instanceof Error
            ? primaryError.message
            : String(primaryError),
      },
    );

    const fallbacks =
      getConfiguredFallbackProviders(
        primaryProvider.agent,
      );

    if (!fallbacks.length) {
      throw primaryError;
    }

    let lastError: unknown =
      primaryError;

    for (const fallback of fallbacks) {
      try {
        const result =
          await generateAuditWithProvider({
            provider: fallback,
            prompt,
            maxCompletionTokens,
            dateInfo,
            binaryFiles,
          });

        return {
          ...result,
          fallbackUsed: true,
          fallbackFrom:
            primaryProvider.agent,
        };
      } catch (fallbackError) {
        lastError =
          fallbackError;

        console.warn(
          'AUDIT_FALLBACK_PROVIDER_ERROR:',
          {
            agent:
              fallback.agent,
            provider:
              fallback.providerLabel,
            model:
              fallback.modelId,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(
                    fallbackError,
                  ),
          },
        );
      }
    }

    throw lastError;
  }
}

type PromptUsageResult = Awaited<
  ReturnType<
    typeof consumeSuccessfulPrompt
  >
>;

function ensurePromptAvailable(
  entitlements: Awaited<
    ReturnType<
      typeof requireModuleAccess
    >
  >,
) {
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
}

function buildAttachmentUsageItemsForAudit({
  attachments,
  binaryFiles,
}: {
  attachments: UploadedAttachment[];
  binaryFiles: BinaryAuditFile[];
}): AttachmentUsageItem[] {
  const items =
    new Map<
      string,
      AttachmentUsageItem
    >();

  attachments.forEach(
    (item, index) => {
      const name =
        cleanText(
          item.originalName,
        ) ||
        cleanText(item.name) ||
        cleanText(item.filename) ||
        `priloha-${index + 1}`;

      const size =
        Number.isFinite(
          Number(item.size),
        )
          ? Math.max(
              0,
              Math.round(
                Number(item.size),
              ),
            )
          : 0;

      const id =
        cleanText(item.id);

      const key =
        id ||
        `${name}|${size}`;

      items.set(key, {
        id: id || null,
        name,
        size,
        type:
          cleanText(
            item.type,
          ) ||
          cleanText(
            item.mimeType,
          ) ||
          null,
        uploadedAt: null,
      });
    },
  );

  binaryFiles.forEach(
    (file, index) => {
      const key =
        `${file.name}|${file.size}`;

      if (items.has(key)) {
        return;
      }

      const duplicate =
        Array.from(
          items.values(),
        ).some(
          (item) =>
            item.name === file.name &&
            item.size === file.size,
        );

      if (duplicate) {
        return;
      }

      items.set(
        `${key}|binary-${index}`,
        {
          id: null,
          name: file.name,
          size: file.size,
          type:
            file.type || null,
          uploadedAt: null,
        },
      );
    },
  );

  return Array.from(
    items.values(),
  );
}

function buildPageUsagePayload({
  quota,
  output,
  requestId,
}: {
  quota: PageQuota;
  output: string;
  requestId: string;
}) {
  const characters =
    output.length;

  const generatedPages =
    characters > 0
      ? Math.max(
          1,
          Math.ceil(
            characters /
              CHARACTERS_PER_PAGE,
          ),
        )
      : 0;

  return {
    ...quota,
    requestId,
    generatedCharacters:
      characters,
    generatedPages,
  };
}

function serializeAuditEntitlements(
  entitlements: Awaited<
    ReturnType<
      typeof requireModuleAccess
    >
  >,
  promptUsage?: PromptUsageResult,
) {
  return {
    ...serializeEntitlements(
      entitlements,
    ),
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
      module: 'quality',
      feature: 'quality-audit',
    },
  };
}

function getUniqueReceivedAttachmentCount({
  attachments,
  binaryFiles,
}: {
  attachments: UploadedAttachment[];
  binaryFiles: BinaryAuditFile[];
}) {
  const keys =
    new Set<string>();

  attachments.forEach(
    (attachment, index) => {
      const name =
        getAttachmentName(
          attachment,
          index,
        );
      const size =
        Number(
          attachment.size || 0,
        );

      keys.add(
        `${name}|${size}`,
      );
    },
  );

  binaryFiles.forEach(
    (file) => {
      keys.add(
        `${file.name}|${file.size}`,
      );
    },
  );

  return keys.size;
}


export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: '/api/audit',
      module: 'quality',
      standalone: true,
      providers: {
        openai:
          hasProviderCredentials(
            'openai',
          ),
        claude:
          hasProviderCredentials(
            'claude',
          ),
        gemini:
          hasProviderCredentials(
            'gemini',
          ),
        grok:
          hasProviderCredentials(
            'grok',
          ),
        mistral:
          hasProviderCredentials(
            'mistral',
          ),
      },
      limits: {
        maxAttachments:
          MAX_AUDIT_ATTACHMENTS,
        maxSingleBinaryBytes:
          MAX_BINARY_ATTACHMENT_SIZE_BYTES,
        maxTotalBinaryBytes:
          MAX_TOTAL_BINARY_ATTACHMENT_BYTES,
        maxManualTextCharacters:
          MAX_MANUAL_TEXT_LENGTH,
        maxAttachmentTextCharacters:
          MAX_ATTACHMENT_TEXT_LENGTH,
        maxTotalAttachmentTextCharacters:
          MAX_TOTAL_SOURCE_LENGTH,
        maxOutputTokens:
          MAX_AUDIT_OUTPUT_TOKENS,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
      },
    },
  );
}

export async function POST(
  req: NextRequest,
) {
  const requestId =
    req.headers
      .get('x-request-id')
      ?.trim() ||
    randomUUID();

  let attachmentUsage:
    | AttachmentUsageSnapshot
    | null = null;

  try {
    /**
     * Audit má vlastný serverový entitlement guard.
     * Nestačí skryť tlačidlo na frontende – prístup sa overuje aj tu.
     */
    const entitlements =
      await requireModuleAccess(
        'quality',
      );

    ensurePromptAvailable(
      entitlements,
    );

    let parsedRequest:
      ParsedAuditRequest;

    try {
      parsedRequest =
        await parseAuditRequest(
          req,
        );
    } catch (error) {
      if (
        error instanceof
        AuditRequestValidationError
      ) {
        return createAuditErrorResponse(
          {
            requestId,
            code: error.code,
            message:
              error.message,
            detail:
              error.detail,
            status:
              error.status,
          },
        );
      }

      return createAuditErrorResponse(
        {
          requestId,
          code:
            'INVALID_AUDIT_REQUEST_BODY',
          message:
            'Požiadavku Auditu kvality sa nepodarilo načítať.',
          detail:
            'Endpoint /api/audit prijíma JSON aj multipart/form-data. Binárne prílohy posielajte v poli files a extrahovaný text v attachments[].extractedText, clientExtractedText alebo extractedText.',
          status: 400,
        },
      );
    }

    const {
      body,
      binaryFiles,
      requestMode,
    } = parsedRequest;

    const agent =
      normalizeAgent(
        body.agent ||
          body.model,
      );

    if (
      !hasProviderCredentials(
        agent,
      )
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'AI_PROVIDER_NOT_CONFIGURED',
          message:
            'Vybraný AI agent pre Audit kvality nie je nakonfigurovaný.',
          detail:
            `Vybraný agent: ${agent}. Skontrolujte serverovú API premennú pre tohto poskytovateľa.`,
          status: 500,
          extra: {
            agent,
          },
        },
      );
    }

    const dateInfo =
      getAuditDateInfo(body);

    const profile =
      body.activeProfile ||
      body.profile ||
      null;

    const projectId =
      cleanText(
        body.projectId,
      ) ||
      cleanText(
        body.profileId,
      ) ||
      cleanText(profile?.id) ||
      null;

    const messageCandidate =
      cleanText(body.message);

    const promptCandidate =
      cleanText(body.prompt);

    /**
     * Frontend posiela aj vygenerovaný prompt. Ten nesmie byť omylom
     * považovaný za auditovaný akademický text.
     */
    const safeMessageCandidate =
      messageCandidate &&
      messageCandidate !==
        promptCandidate
        ? messageCandidate
        : '';

    const rawUserInput =
      firstNonEmptyText(
        body.input,
        body.question,
        safeMessageCandidate,
        body.text,
      );

    const splitInput =
      splitAuditInput(
        rawUserInput,
      );

    const userInstruction =
      firstNonEmptyText(
        body.userInstruction,
        body.instruction,
        splitInput.instruction,
        body.question,
        looksLikeAuditInstruction(
          body.message || '',
        )
          ? body.message
          : '',
        looksLikeAuditInstruction(
          body.text || '',
        )
          ? body.text
          : '',
      ).slice(
        0,
        MAX_USER_INSTRUCTION_LENGTH,
      );

    const topLevelAttachmentText =
      firstNonEmptyText(
        body.sourceText,
        body.clientExtractedText,
        body.extractedText,
        body.attachmentText,
      );

    let attachments =
      normalizeAttachments(
        body.attachments,
      );

    /**
     * Binárny súbor môže byť súčasne reprezentovaný aj metadata objektom
     * v attachments. Nepridávame ho dvakrát; iba označíme binaryAvailable.
     */
    for (
      const binaryFile
      of binaryFiles
    ) {
      const existingIndex =
        attachments.findIndex(
          (attachment, index) => {
            const name =
              getAttachmentName(
                attachment,
                index,
              );

            const sameName =
              name ===
              binaryFile.name;

            const declaredSize =
              Number(
                attachment.size ||
                  0,
              );

            const sameSize =
              !declaredSize ||
              declaredSize ===
                binaryFile.size;

            return (
              sameName &&
              sameSize
            );
          },
        );

      if (
        existingIndex < 0
      ) {
        attachments.push({
          name:
            binaryFile.name,
          type:
            binaryFile.type,
          size:
            binaryFile.size,
          binaryAvailable:
            true,
        });
      } else {
        attachments[
          existingIndex
        ] = {
          ...attachments[
            existingIndex
          ],
          binaryAvailable:
            true,
        };
      }
    }

    if (
      topLevelAttachmentText &&
      !attachments.some(
        (attachment) =>
          getAttachmentText(
            attachment,
          ) ===
          topLevelAttachmentText,
      )
    ) {
      attachments.push({
        name:
          'Extrahovaný text priložených dokumentov',
        type:
          'text/plain',
        size:
          topLevelAttachmentText.length,
        extractedText:
          topLevelAttachmentText,
      });
    }

    const receivedAttachments =
      getUniqueReceivedAttachmentCount(
        {
          attachments,
          binaryFiles,
        },
      );

    if (
      receivedAttachments >
      MAX_AUDIT_ATTACHMENTS
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED',
          message:
            'V jednej požiadavke je príliš veľa príloh.',
          detail:
            `Audit kvality dokáže bezpečne spracovať maximálne ${MAX_AUDIT_ATTACHMENTS} príloh v jednej požiadavke.`,
          status: 400,
          extra: {
            attachmentLimit:
              MAX_AUDIT_ATTACHMENTS,
            receivedAttachments,
          },
        },
      );
    }

    const userAttachmentLimit =
      entitlements.isAdmin ||
      entitlements.hasUnlimitedAccess
        ? Number.MAX_SAFE_INTEGER
        : (
            entitlements.attachmentLimit ??
            0
          );

    if (
      receivedAttachments >
      userAttachmentLimit
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'ATTACHMENT_LIMIT_REACHED',
          message:
            'Počet príloh prekračuje limit vášho balíka.',
          detail:
            `Váš balík povoľuje maximálne ${userAttachmentLimit} príloh v jednej požiadavke.`,
          status: 402,
          extra: {
            attachmentLimit:
              userAttachmentLimit,
            receivedAttachments,
            purchaseUrl:
              '/pricing#doplnkove-sluzby',
          },
        },
      );
    }

    const attachmentItems =
      buildAttachmentUsageItemsForAudit(
        {
          attachments,
          binaryFiles,
        },
      );

    attachmentUsage =
      await recordCurrentUserAttachmentUsage(
        {
          requestId,
          projectId,
          module:
            'quality',
          items:
            attachmentItems,
          fallbackCount:
            attachmentItems.length,
        },
      );

    if (
      attachmentUsage.trackingAvailable &&
      !attachmentUsage.isUnlimited &&
      attachmentUsage.attachmentLimit !==
        null &&
      attachmentUsage.attachmentsUsed >
        attachmentUsage.attachmentLimit
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'ATTACHMENT_LIMIT_REACHED',
          message:
            'Bol dosiahnutý limit príloh vášho balíka.',
          detail:
            'Odstráňte nepotrebné prílohy alebo rozšírte balík.',
          status: 402,
          extra: {
            attachmentLimit:
              attachmentUsage.attachmentLimit,
            attachmentsUsed:
              attachmentUsage.attachmentsUsed,
            attachmentsRemaining:
              attachmentUsage.attachmentsRemaining,
            receivedAttachments,
            purchaseUrl:
              '/pricing#doplnkove-sluzby',
          },
        },
      );
    }

    const manualSourceText =
      splitInput.sourceText ||
      (
        !looksLikeAuditInstruction(
          rawUserInput,
        )
          ? rawUserInput
          : ''
      );

    const limitedManualText =
      limitText(
        manualSourceText,
        MAX_MANUAL_TEXT_LENGTH,
      );

    const text =
      limitedManualText.text;

    const checkType =
      resolveAuditCheckType(
        body,
      );

    const outputType =
      resolveAuditOutputType(
        body,
      );

    const title =
      resolveTitle(
        body,
        profile,
      );

    const workType =
      resolveWorkType(
        body,
        profile,
      );

    const language =
      resolveLanguage(
        body,
        profile,
      );

    const citationStyle =
      resolveCitationStyle(
        body,
        profile,
      );

    const attachmentsBlock =
      buildAttachmentsBlock(
        attachments,
      );

    const extractedAttachmentTextLength =
      getTotalAttachmentTextLength(
        attachments,
      );

    const hasText =
      text.length >=
      MIN_TEXT_LENGTH;

    const hasAttachments =
      receivedAttachments > 0;

    const hasUsableAttachmentText =
      extractedAttachmentTextLength >=
      MIN_EXTRACTED_ATTACHMENT_LENGTH;

    const hasBinaryAttachmentInput =
      binaryFiles.length > 0;

    const hasUsableAttachmentInput =
      hasUsableAttachmentText ||
      hasBinaryAttachmentInput;

    const hasInstruction =
      Boolean(
        userInstruction,
      );

    if (
      !hasText &&
      !hasAttachments &&
      !hasInstruction
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'AUDIT_INPUT_REQUIRED',
          message:
            'Vložte text, krátky pokyn alebo nahrajte prílohu na Audit kvality.',
          detail:
            'Je možné skontrolovať vetu, odsek, kapitolu, metodiku alebo celú prácu.',
          status: 400,
        },
      );
    }

    if (
      !hasText &&
      hasAttachments &&
      !hasUsableAttachmentInput
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'ATTACHMENT_EXTRACTION_FAILED',
          message:
            'Príloha bola prijatá, ale jej obsah sa nepodarilo načítať.',
          detail:
            'Skontrolujte /api/extract-text alebo odošlite binárny súbor v poli files. Audit prijíma aj attachments[].extractedText.',
          status: 422,
          extra: {
            receivedAttachments,
            extractedAttachmentTextLength,
          },
        },
      );
    }

    /**
     * Krátky pokyn bez auditovaného textu nie je technická chyba.
     * Vrátime HTTP 200, aby sa globálne technické modálne okno
     * nezobrazovalo bez reálnej chyby.
     */
    if (
      hasInstruction &&
      !hasText &&
      !hasUsableAttachmentInput
    ) {
      const guidance =
        buildMissingSourceGuidance(
          userInstruction,
          language,
        );

      return NextResponse.json(
        {
          ok: true,
          code:
            'AUDIT_SOURCE_TEXT_REQUIRED',
          requestId,
          output:
            guidance,
          result:
            guidance,
          text:
            guidance,
          message:
            guidance,
          answer:
            guidance,
          completed:
            true,
          requiresSourceText:
            true,
          attachmentProcessing:
            {
              receivedFiles:
                receivedAttachments,
              successfullyReadFiles:
                0,
              extractedCharacters:
                0,
              mode:
                'no-source-text',
            },
          entitlements:
            serializeAuditEntitlements(
              entitlements,
            ),
          attachmentUsage,
          meta: {
            module:
              'quality',
            endpoint:
              '/api/audit',
            standalone:
              true,
            instructionOnly:
              true,
            agent,
            hasProfile:
              Boolean(profile),
            title,
            workType,
            language,
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store, no-cache, must-revalidate',
            'X-Request-Id':
              requestId,
          },
        },
      );
    }

    let pageQuota:
      PageQuota;

    try {
      pageQuota =
        await requireAvailablePages();
    } catch (error) {
      if (
        error instanceof
        PageLimitError
      ) {
        return zedperaUnknownErrorJson(
          error,
          {
            request: req,
            endpoint:
              '/api/audit',
            module:
              'quality',
          },
        );
      }

      throw error;
    }

    const combinedTextForChecks =
      [
        text,
        ...attachments.map(
          (item) =>
            getAttachmentText(
              item,
            ),
        ),
      ]
        .filter(Boolean)
        .join('\n\n');

    const citationAudit =
      binaryFiles.length >
        0 &&
      !cleanText(
        combinedTextForChecks,
      )
        ? {
            expectedStyle:
              normalizeCitationStyle(
                citationStyle,
              ),
            detectedStyles:
              [],
            hasMismatch:
              false,
            warnings: [],
          }
        : auditCitationStyle(
            combinedTextForChecks,
            citationStyle,
          );

    const attachmentRelevanceResults =
      attachments.map(
        (
          attachment,
          index,
        ) =>
          checkAttachmentProfileRelevance(
            attachment,
            index,
            profile,
          ),
      );

    const prompt =
      buildAuditPrompt({
        text,
        userInstruction,
        attachmentsBlock,
        checkType,
        outputType,
        citationStyle,
        profile,
        hasAttachments,
        title,
        workType,
        language,
        manualTextWasTruncated:
          limitedManualText.truncated,
        citationAudit,
        attachmentRelevanceResults,
        dateInfo,
      });

    const requestedOutputTokens =
      resolveMaxOutputTokens(
        body,
      );

    const maxCompletionTokens =
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

    if (
      maxCompletionTokens <= 0
    ) {
      throw new PageLimitError();
    }

    console.log(
      'AUDIT_REQUEST_READY:',
      {
        requestId,
        endpoint:
          '/api/audit',
        agent,
        requestMode,
        qualityMode:
          body.qualityMode ||
          'all',
        outputMode:
          body.outputMode ||
          'detailed',
        receivedAttachments,
        extractedAttachmentTextLength,
        binaryFiles:
          binaryFiles.map(
            (file) => ({
              name:
                file.name,
              size:
                file.size,
              type:
                file.type,
            }),
          ),
        title,
        workType,
        citationStyle,
        maxCompletionTokens,
        pageLimit:
          pageQuota.pageLimit,
        pagesRemaining:
          pageQuota.pagesRemaining,
      },
    );

    const modelResult =
      await runAuditModel({
        agent,
        prompt,
        maxCompletionTokens,
        dateInfo,
        binaryFiles,
      });

    const rawResult =
      modelResult.rawResult;

    const cleanedResult =
      buildClientCleanResult(
        rawResult,
      );

    if (
      !cleanedResult.trim()
    ) {
      return createAuditErrorResponse(
        {
          requestId,
          code:
            'EMPTY_AUDIT_OUTPUT',
          message:
            'Audit bol spracovaný, ale AI nevrátila použiteľný výsledok.',
          detail:
            `Poskytovateľ ${modelResult.provider.providerLabel}, model ${modelResult.provider.modelId}, nevrátil text.`,
          status: 502,
          extra: {
            agent:
              modelResult.provider.agent,
            provider:
              modelResult.provider.providerLabel,
            model:
              modelResult.provider.modelId,
          },
        },
      );
    }

    const completed =
      hasEndMarker(
        rawResult,
      );

    const visibleWarnings =
      [
        ...citationAudit.warnings,
        ...attachmentRelevanceResults
          .filter(
            (item) =>
              Boolean(
                item.warning,
              ),
          )
          .map(
            (item) =>
              item.warning as string,
          ),
      ].filter(Boolean);

    /**
     * Kvóty sa odpočítajú až po úspešnom vytvorení použiteľného výsledku.
     */
    const promptUsage =
      await consumeSuccessfulPrompt();

    const updatedPageQuota =
      await consumePagesForOutput(
        {
          text:
            cleanedResult,
          module:
            'quality',
          requestId,
        },
      );

    const pageUsage =
      buildPageUsagePayload(
        {
          quota:
            updatedPageQuota,
          output:
            cleanedResult,
          requestId,
        },
      );

    const readableTextNames =
      attachments
        .filter(
          (attachment) =>
            Boolean(
              getAttachmentText(
                attachment,
              ),
            ),
        )
        .map(
          (
            attachment,
            index,
          ) =>
            getAttachmentName(
              attachment,
              index,
            ),
        );

    const successfullyReadFileKeys =
      new Set<string>(
        [
          ...readableTextNames,
          ...binaryFiles.map(
            (file) =>
              file.name,
          ),
        ],
      );

    const attachmentProcessing =
      {
        receivedFiles:
          receivedAttachments,
        successfullyReadFiles:
          successfullyReadFileKeys.size,
        extractedCharacters:
          extractedAttachmentTextLength,
        nativeAttachmentFiles:
          binaryFiles.map(
            (file) =>
              file.name,
          ),
        nativeAttachmentRead:
          binaryFiles.length >
          0,
        serverReadAttachments:
          successfullyReadFileKeys.size >
          0,
        mode:
          binaryFiles.length >
          0
            ? modelResult.providerMode
            : 'extracted-text',
        warnings:
          visibleWarnings,
      };

    return NextResponse.json(
      {
        ok: true,
        requestId,

        output:
          cleanedResult,
        result:
          cleanedResult,
        text:
          cleanedResult,
        message:
          cleanedResult,
        answer:
          cleanedResult,

        completed,
        warning:
          completed
            ? ''
            : 'Výstup bol vytvorený, ale model nevrátil internú koncovú značku. Výsledok je možné použiť; pri veľmi dlhom texte zvážte audit po kapitolách.',

        exportTypes: [
          'docx',
          'pdf',
        ],

        provider:
          modelResult.provider.providerLabel,
        agent:
          modelResult.provider.agent,
        model:
          modelResult.provider.modelId,
        fallbackUsed:
          modelResult.fallbackUsed,
        fallbackFrom:
          modelResult.fallbackFrom ||
          null,

        attachmentProcessing,
        attachmentUsage,

        citationAudit,
        attachmentRelevanceResults,

        dateAudit: {
          auditDate:
            dateInfo.auditDate,
          auditIsoDate:
            dateInfo.auditIsoDate,
          currentYear:
            dateInfo.currentYear,
          futureYearRule:
            `Ako budúcnosť sa označia iba roky väčšie ako ${dateInfo.currentYear}.`,
        },

        entitlements:
          serializeAuditEntitlements(
            entitlements,
            promptUsage,
          ),

        promptUsage,
        pageUsage,

        meta: {
          endpoint:
            '/api/audit',
          standalone:
            true,
          module:
            'quality',

          requestedAgent:
            agent,
          usedAgent:
            modelResult.provider.agent,
          provider:
            modelResult.provider.providerLabel,
          model:
            modelResult.provider.modelId,
          providerMode:
            modelResult.providerMode,
          fallbackUsed:
            modelResult.fallbackUsed,

          checkType,
          outputType,
          qualityMode:
            body.qualityMode ||
            'all',
          outputMode:
            body.outputMode ||
            'detailed',
          auditScope:
            body.auditScope ||
            'auto',

          citationStyle,
          title,
          workType,
          language,
          hasProfile:
            Boolean(profile),
          projectId,

          instruction:
            userInstruction,
          focusedAudit:
            Boolean(
              userInstruction,
            ),

          auditDate:
            dateInfo.auditDate,
          auditIsoDate:
            dateInfo.auditIsoDate,
          currentYear:
            dateInfo.currentYear,

          textLength:
            manualSourceText.length,
          usedTextLength:
            text.length,
          manualTextWasTruncated:
            limitedManualText.truncated,

          attachmentsCount:
            receivedAttachments,
          binaryAttachmentsCount:
            binaryFiles.length,
          extractedAttachmentTextLength,

          requestedOutputTokens,
          maxCompletionTokens,
          requestMode,
          finishReason:
            modelResult.finishReason,
          completed,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
          'X-Request-Id':
            requestId,
          'X-Zedpera-Module':
            'quality',
          'X-Zedpera-Provider':
            modelResult.provider.agent,
          'X-Zedpera-Model':
            encodeURIComponent(
              modelResult.provider.modelId,
            ),
        },
      },
    );
  } catch (error) {
    console.error(
      'AUDIT_API_ERROR:',
      {
        requestId,
        error,
      },
    );

    if (
      error instanceof
        EntitlementError ||
      error instanceof
        PromptLimitError ||
      error instanceof
        PageLimitError
    ) {
      return zedperaUnknownErrorJson(
        error,
        {
          request: req,
          endpoint:
            '/api/audit',
          module:
            'quality',
        },
      );
    }

    const fallbackMessage =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa vykonať Audit kvality.';

    const mappedError =
      getZedperaErrorMessage(
        fallbackMessage,
      );

    const safeMessage =
      normalizeAuditErrorDetail(
        mappedError,
        fallbackMessage ||
          'Nepodarilo sa vykonať Audit kvality.',
      );

    return createAuditErrorResponse(
      {
        requestId,
        code:
          'AUDIT_GENERATION_FAILED',
        message:
          'Audit kvality sa nepodarilo dokončiť.',
        detail:
          safeMessage,
        status: 500,
        extra: {
          attachmentUsage,
        },
      },
    );
  }
}
