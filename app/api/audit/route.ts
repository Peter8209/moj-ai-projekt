import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GLOBAL_ACADEMIC_SYSTEM_PROMPT } from '@/lib/ai-system-prompt';
import { getZedperaErrorMessage } from '@/lib/api-error-messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
const MAX_MANUAL_TEXT_LENGTH = 30000;
const MAX_ATTACHMENT_TEXT_LENGTH = 30000;
const MAX_TOTAL_SOURCE_LENGTH = 50000;
const MAX_USER_INSTRUCTION_LENGTH = 2000;

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
};

type AuditRequest = {
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

  if (Number.isFinite(requested) && requested >= 2000) {
    return Math.min(Math.round(requested), 6000);
  }

  return 4500;
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

  const attachmentText = [
    name,
    getAttachmentText(attachment),
  ]
    .filter(Boolean)
    .join(' ');

  if (!cleanText(profileText) || !cleanText(attachmentText)) {
    return {
      name,
      score: 0,
      related: true,
      matchedKeywords: [],
      warning:
        'Súlad prílohy s profilom práce nebolo možné úplne vyhodnotiť, pretože chýba profil alebo extrahovaný text prílohy.',
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
  'Text z prílohy nebol dostupný. Ak ide o PDF/DOCX, skontroluj, či /api/uploads extrahuje text zo súboru a vracia ho v poli text, content alebo extractedText.'
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

=== UKÁŽKY UPRAVENÝCH VIET ===
Uveď maximálne 5 vzorových viet. Každú vetu uveď vo forme:
Pôvodný problém:
Lepšia formulácia:

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

export async function POST(req: NextRequest) {
  const requestId =
    req.headers.get('x-request-id')?.trim() ||
    randomUUID();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return createAuditErrorResponse({
        requestId,
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'Audit kvality momentálne nie je dostupný.',
        detail:
          'Chýba OPENAI_API_KEY v prostredí aplikácie. Nastavte ho vo Verceli alebo v .env.local.',
        status: 500,
      });
    }

    let body: AuditRequest;

    try {
      body = (await req.json()) as AuditRequest;
    } catch {
      return createAuditErrorResponse({
        requestId,
        code: 'INVALID_JSON_BODY',
        message: 'Požiadavku auditu sa nepodarilo načítať.',
        detail: 'Endpoint /api/audit očakáva JSON požiadavku.',
        status: 400,
      });
    }

    const dateInfo = getAuditDateInfo(body);
    const profile = body.activeProfile || body.profile || null;

    const rawUserInput = firstNonEmptyText(
      body.input,
      body.question,
      body.message,
      body.text,
    );

    const splitInput = splitAuditInput(rawUserInput);

    const userInstruction = firstNonEmptyText(
      body.userInstruction,
      splitInput.instruction,
      body.question,
      looksLikeAuditInstruction(body.message || '') ? body.message : '',
      looksLikeAuditInstruction(body.text || '') ? body.text : '',
    ).slice(0, MAX_USER_INSTRUCTION_LENGTH);

    const topLevelAttachmentText = firstNonEmptyText(
      body.sourceText,
      body.clientExtractedText,
      body.extractedText,
      body.attachmentText,
    );

    let attachments = normalizeAttachments(body.attachments);

    if (
      topLevelAttachmentText &&
      !attachments.some(
        (attachment) =>
          getAttachmentText(attachment) === topLevelAttachmentText,
      )
    ) {
      attachments = [
        ...attachments,
        {
          name: 'Extrahovaný text priložených dokumentov',
          type: 'text/plain',
          size: topLevelAttachmentText.length,
          extractedText: topLevelAttachmentText,
        },
      ];
    }

    if (attachments.length > MAX_AUDIT_ATTACHMENTS) {
      return createAuditErrorResponse({
        requestId,
        code: 'ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED',
        message: 'Nahrali ste viac ako 20 príloh.',
        detail:
          'Audit kvality dokáže v jednej požiadavke spracovať maximálne 20 príloh. Odstráňte nadbytočné prílohy a odošlite požiadavku znova.',
        status: 400,
        extra: {
          attachmentLimit: MAX_AUDIT_ATTACHMENTS,
          receivedAttachments: attachments.length,
        },
      });
    }

    const manualSourceText =
      splitInput.sourceText ||
      (!looksLikeAuditInstruction(rawUserInput) ? rawUserInput : '');

    const limitedManualText = limitText(
      manualSourceText,
      MAX_MANUAL_TEXT_LENGTH,
    );

    const text = limitedManualText.text;
    const checkType = resolveAuditCheckType(body);
    const outputType = resolveAuditOutputType(body);

    const title = resolveTitle(body, profile);
    const workType = resolveWorkType(body, profile);
    const language = resolveLanguage(body, profile);
    const citationStyle = resolveCitationStyle(body, profile);

    const attachmentsBlock = buildAttachmentsBlock(attachments);
    const extractedAttachmentTextLength =
      getTotalAttachmentTextLength(attachments);

    const hasText = text.length >= MIN_TEXT_LENGTH;
    const hasAttachments = attachments.length > 0;
    const hasUsableAttachmentText =
      extractedAttachmentTextLength >=
      MIN_EXTRACTED_ATTACHMENT_LENGTH;
    const hasInstruction = Boolean(userInstruction);

    if (!hasText && !hasAttachments && !hasInstruction) {
      return createAuditErrorResponse({
        requestId,
        code: 'AUDIT_INPUT_REQUIRED',
        message:
          'Vložte text, krátky pokyn alebo nahrajte prílohu na audit kvality.',
        detail:
          'Je možné skontrolovať aj jednu vetu, odsek, kapitolu alebo konkrétnu časť práce. Minimálny limit 300 znakov sa už neuplatňuje.',
        status: 400,
      });
    }

    if (!hasText && hasAttachments && !hasUsableAttachmentText) {
      return createAuditErrorResponse({
        requestId,
        code: 'ATTACHMENT_EXTRACTION_FAILED',
        message:
          'Príloha bola nahratá, ale jej text sa nepodarilo načítať.',
        detail:
          'Skontrolujte extrakciu PDF/DOCX. Endpoint musí vrátiť text v poli text, content, extractedText, clientExtractedText alebo attachmentText.',
        status: 422,
      });
    }

    /**
     * Samotný príkaz bez obsahu nie je technická chyba. Endpoint vráti
     * používateľovi normálnu odpoveď HTTP 200 a vysvetlí, ako má priložiť
     * konkrétnu kapitolu. Tým sa nespustí globálny UNKNOWN_ERROR modal.
     */
    if (
      hasInstruction &&
      !hasText &&
      !hasUsableAttachmentText
    ) {
      const guidance = buildMissingSourceGuidance(
        userInstruction,
        language,
      );

      return NextResponse.json({
        ok: true,
        code: 'AUDIT_SOURCE_TEXT_REQUIRED',
        requestId,
        output: guidance,
        result: guidance,
        text: guidance,
        message: guidance,
        completed: true,
        requiresSourceText: true,
        meta: {
          module: 'quality',
          instructionOnly: true,
          hasProfile: Boolean(profile),
          title,
          workType,
          language,
        },
      });
    }

    const combinedTextForChecks = [
      text,
      ...attachments.map((item) => getAttachmentText(item)),
    ]
      .filter(Boolean)
      .join('\n\n');

    const citationAudit = auditCitationStyle(
      combinedTextForChecks,
      citationStyle,
    );

    const attachmentRelevanceResults = attachments.map(
      (attachment, index) =>
        checkAttachmentProfileRelevance(
          attachment,
          index,
          profile,
        ),
    );

    const prompt = buildAuditPrompt({
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
      manualTextWasTruncated: limitedManualText.truncated,
      citationAudit,
      attachmentRelevanceResults,
      dateInfo,
    });

    const maxCompletionTokens = resolveMaxOutputTokens(body);
    const auditModel =
      process.env.OPENAI_AUDIT_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-4.1-mini';

    const completion = await openai.chat.completions.create({
      model: auditModel,
      temperature: 0.2,
      max_tokens: maxCompletionTokens,
      presence_penalty: 0,
      frequency_penalty: 0.1,
      messages: [
        {
          role: 'system',
          content: buildSystemMessage(dateInfo),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const rawResult = completion.choices[0]?.message?.content || '';
    const cleanedResult = buildClientCleanResult(rawResult);

    if (!cleanedResult.trim()) {
      return createAuditErrorResponse({
        requestId,
        code: 'EMPTY_AUDIT_OUTPUT',
        message: 'Audit bol spracovaný, ale AI nevrátila použiteľný výsledok.',
        detail:
          'Skontrolujte model OPENAI_AUDIT_MODEL/OPENAI_MODEL a serverové logy.',
        status: 502,
      });
    }

    const completed = hasEndMarker(rawResult);
    const visibleWarnings = buildVisibleWarnings(
      citationAudit,
      attachmentRelevanceResults,
    );

    const finalResult = [visibleWarnings, cleanedResult]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return NextResponse.json({
      ok: true,
      requestId,
      output: finalResult,
      result: finalResult,
      text: finalResult,
      message: finalResult,
      completed,
      warning: completed
        ? ''
        : 'Audit sa pravdepodobne neukončil úplne. Auditujte kratší úsek alebo zvýšte maxOutputTokens.',
      exportTypes: ['docx', 'pdf'],
      citationAudit,
      attachmentRelevanceResults,
      dateAudit: {
        auditDate: dateInfo.auditDate,
        auditIsoDate: dateInfo.auditIsoDate,
        currentYear: dateInfo.currentYear,
        futureYearRule: `Ako budúcnosť sa označia iba roky väčšie ako ${dateInfo.currentYear}.`,
      },
      meta: {
        module: 'quality',
        checkType,
        outputType,
        citationStyle,
        title,
        workType,
        language,
        hasProfile: Boolean(profile),
        instruction: userInstruction,
        focusedAudit: Boolean(userInstruction),
        auditDate: dateInfo.auditDate,
        auditIsoDate: dateInfo.auditIsoDate,
        currentYear: dateInfo.currentYear,
        textLength: manualSourceText.length,
        usedTextLength: text.length,
        manualTextWasTruncated: limitedManualText.truncated,
        attachmentsCount: attachments.length,
        extractedAttachmentTextLength,
        maxCompletionTokens,
        model: auditModel,
        finishReason: completion.choices[0]?.finish_reason || null,
        completed,
      },
    });
  } catch (error) {
    console.error('AUDIT_ERROR:', {
      requestId,
      error,
    });

    const fallbackMessage =
      error instanceof Error
        ? error.message
        : 'Nepodarilo sa vykonať audit kvality práce.';

    const mappedError = getZedperaErrorMessage(fallbackMessage);
    const safeMessage = normalizeAuditErrorDetail(
      mappedError,
      fallbackMessage || 'Nepodarilo sa vykonať audit kvality práce.',
    );

    return createAuditErrorResponse({
      requestId,
      code: 'AUDIT_GENERATION_FAILED',
      message: 'Audit kvality sa nepodarilo dokončiť.',
      detail: safeMessage,
      status: 500,
    });
  }
}
