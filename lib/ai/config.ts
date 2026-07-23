/**
 * Centrálna konfigurácia všetkých AI agentov ZEDPERA.
 *
 * Cieľ súboru:
 * - jednotný technický limit maximálne 20 príloh,
 * - okamžitá a zrozumiteľná chyba pri 21 a viac prílohách,
 * - rovnaké limity pre /api/chat a /api/extract-text,
 * - bezpečné limity veľkosti a extrahovaného textu,
 * - jednotné rozhodovanie medzi prílohami a webovým vyhľadávaním,
 * - zachovanie kompatibility s existujúcimi importmi.
 *
 * Tento súbor používajú najmä:
 * - lib/ai/client/ai-fetch.ts
 * - lib/ai/source-mode.ts
 * - lib/ai/build-agent-prompt.ts
 * - app/api/chat/route.ts
 * - app/api/extract-text/route.ts
 * - ostatné AI API route.ts
 */

// =====================================================
// ČASOVANIE A SERVEROVÉ LIMITY
// =====================================================

/**
 * Technické chyby sa na klientovi zobrazia najskôr po 30 sekundách.
 * Validačné chyby, napríklad prekročenie počtu príloh, sa zobrazia okamžite.
 */
export const AI_MIN_ERROR_DELAY_MS = 30_000;

/**
 * Po tomto čase môže klient zobraziť informáciu, že spracovanie stále prebieha.
 */
export const AI_SLOW_PROCESSING_NOTICE_MS = 30_000;

/**
 * Maximálny čas jednej AI požiadavky na klientovi/serveri.
 */
export const AI_REQUEST_TIMEOUT_MS = 120_000;

/**
 * Hodnota pre Next.js/Vercel route:
 *
 * export const maxDuration = AI_SERVER_MAX_DURATION_SECONDS;
 */
export const AI_SERVER_MAX_DURATION_SECONDS = 120;

// =====================================================
// PRÍLOHY
// =====================================================

/**
 * Minimálny počet znakov, pri ktorom sa extrahovaný obsah považuje
 * za použiteľný text prílohy.
 */
export const MIN_EXTRACTED_ATTACHMENT_LENGTH = 50;

/**
 * Maximálna veľkosť jednej prílohy.
 *
 * 20 MB = 20 × 1024 × 1024 bajtov.
 */
export const AI_MAX_ATTACHMENT_SIZE_BYTES =
  20 * 1024 * 1024;

/**
 * Pevný technický limit jednej požiadavky.
 *
 * - 1 až 20 príloh: požiadavka je povolená,
 * - 21 a viac príloh: požiadavka sa odmietne stavom HTTP 400,
 * - prílohy nad limit sa nesmú potichu zahodiť ani orezať.
 */
export const AI_HARD_MAX_ATTACHMENTS = 20;

/**
 * Maximálny počet znakov extrahovaných z jedného súboru endpointom
 * /api/extract-text.
 */
export const AI_MAX_EXTRACTED_CHARS_PER_ATTACHMENT =
  40_000;

/**
 * Maximálny spoločný extrahovaný text všetkých príloh vo výsledku
 * endpointu /api/extract-text.
 */
export const AI_MAX_COMBINED_EXTRACTED_CHARS =
  600_000;

/**
 * Maximálna dĺžka textu jedného dokumentu, ktorý môže byť ďalej
 * pripravovaný pre AI model.
 */
export const AI_MAX_ATTACHMENT_TEXT_LENGTH =
  250_000;

/**
 * Maximálna celková dĺžka pripraveného textu všetkých príloh.
 */
export const AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH =
  500_000;

/**
 * Jednotný chybový kód pri prekročení počtu príloh.
 */
export const AI_ATTACHMENT_LIMIT_ERROR_CODE =
  'ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED' as const;

/**
 * HTTP status validačnej chyby počtu príloh.
 */
export const AI_ATTACHMENT_LIMIT_HTTP_STATUS = 400;

/**
 * Základná používateľská hláška.
 */
export const AI_ATTACHMENT_LIMIT_MESSAGE =
  `Nahrali ste viac ako ${AI_HARD_MAX_ATTACHMENTS} príloh. ` +
  `Maximálny povolený počet príloh je ${AI_HARD_MAX_ATTACHMENTS}.`;

/**
 * Odporúčaný postup pre používateľa.
 */
export const AI_ATTACHMENT_LIMIT_DETAIL =
  'Odstráňte nadbytočné prílohy a odošlite požiadavku znova.';

/**
 * Podporované MIME typy príloh.
 *
 * Zoznam zahŕňa formáty, ktoré môže aplikácia odoslať modelu priamo,
 * aj formáty, z ktorých /api/extract-text vie získať text.
 */
export const AI_SUPPORTED_ATTACHMENT_MIME_TYPES = [
  'application/pdf',

  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  'text/plain',
  'text/csv',
  'text/markdown',
  'text/rtf',
  'text/html',
  'text/xml',

  'application/json',
  'application/rtf',
  'application/xml',
  'application/xhtml+xml',
] as const;

/**
 * Podporované prípony.
 *
 * MIME typ nemusí byť v prehliadači vždy správny, preto sa kontroluje
 * aj prípona súboru.
 */
export const AI_SUPPORTED_ATTACHMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.md',
  '.json',
  '.rtf',
  '.xml',
  '.html',
  '.htm',
] as const;

/**
 * Formáty, z ktorých opravený /api/extract-text vie serverovo
 * extrahovať text.
 */
export const AI_TEXT_EXTRACTABLE_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.csv',
  '.md',
  '.json',
  '.rtf',
  '.xml',
  '.html',
  '.htm',
] as const;

// =====================================================
// MODELY A WEBOVÉ VYHĽADÁVANIE
// =====================================================

/**
 * Model použitý pre bežný AI chat.
 * Hodnotu možno prepísať premennou OPENAI_MODEL.
 */
export const AI_DEFAULT_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  'gpt-5.6';

/**
 * Model pre pomocné a jednoduchšie úlohy.
 */
export const AI_FAST_MODEL =
  process.env.OPENAI_FAST_MODEL?.trim() ||
  AI_DEFAULT_MODEL;

/**
 * Predvolený maximálny počet výstupných tokenov.
 */
export const AI_DEFAULT_MAX_OUTPUT_TOKENS = 8_000;

/**
 * Kontext webového vyhľadávania.
 */
export const AI_WEB_SEARCH_CONTEXT_SIZE =
  'high' as const;

/**
 * Webové vyhľadávanie bez použiteľnej prílohy je predvolene zapnuté.
 *
 * Vypnutie vo Verceli:
 * AI_WEB_SEARCH_ENABLED=false
 */
export const AI_WEB_SEARCH_ENABLED =
  process.env.AI_WEB_SEARCH_ENABLED !== 'false';

/**
 * Pri použiteľných prílohách je web predvolene vypnutý, aby prílohy
 * zostali primárnym zdrojom.
 *
 * Zapnutie vo Verceli:
 * AI_WEB_SEARCH_WITH_ATTACHMENTS=true
 */
export const AI_WEB_SEARCH_WITH_ATTACHMENTS =
  process.env.AI_WEB_SEARCH_WITH_ATTACHMENTS ===
  'true';

/**
 * OpenAI môže vrátiť aj zoznam zdrojov použitých webovým vyhľadávaním.
 */
export const AI_INCLUDE_WEB_SEARCH_SOURCES = true;

// =====================================================
// CHYBOVÉ KÓDY
// =====================================================

/**
 * Validačné chyby, ktoré sa majú zobraziť okamžite.
 * Čakanie 30 sekúnd ich nevyrieši.
 */
export const AI_IMMEDIATE_ERROR_CODES = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'INVALID_REQUEST',
  'INVALID_REQUEST_BODY',
  'INVALID_MULTIPART_FORM_DATA',
  'MISSING_ATTACHMENTS',
  'ATTACHMENT_LIMIT',
  AI_ATTACHMENT_LIMIT_ERROR_CODE,
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
] as const;

/**
 * Technické chyby, ktoré sa môžu na klientovi zobraziť až po
 * minimálnom čase spracovania.
 */
export const AI_DELAYED_ERROR_CODES = [
  'ATTACHMENT_PROCESSING_FAILED',
  'EMPTY_ATTACHMENT_CONTENT',
  'GENERATION_FAILED',
  'UPSTREAM_TIMEOUT',
  'NETWORK_ERROR',
  'INVALID_RESPONSE',
  'UNKNOWN_ERROR',
] as const;

export type AiImmediateErrorCode =
  (typeof AI_IMMEDIATE_ERROR_CODES)[number];

export type AiDelayedErrorCode =
  (typeof AI_DELAYED_ERROR_CODES)[number];

export type AiConfiguredErrorCode =
  | AiImmediateErrorCode
  | AiDelayedErrorCode;

export type AiSourceMode =
  | 'attachments'
  | 'web';

export type AiAgentRequestMode =
  | 'standard'
  | 'analysis'
  | 'translation'
  | 'defense'
  | 'humanizer'
  | 'quality-audit'
  | 'planning'
  | 'emails'
  | 'citations';

export type AttachmentCountValidation =
  | {
      ok: true;
      receivedAttachments: number;
      attachmentLimit: number;
    }
  | {
      ok: false;
      code: typeof AI_ATTACHMENT_LIMIT_ERROR_CODE;
      status: typeof AI_ATTACHMENT_LIMIT_HTTP_STATUS;
      message: string;
      detail: string;
      receivedAttachments: number;
      attachmentLimit: number;
    };

export type AiAttachmentTextCandidate = {
  extractedText?: string | null;
  extracted_text?: string | null;
  text?: string | null;
  content?: string | null;
};

// =====================================================
// KOMPLETNÁ CENTRÁLNA KONFIGURÁCIA
// =====================================================

export const AI_CONFIG = {
  timing: {
    minimumErrorDelayMs:
      AI_MIN_ERROR_DELAY_MS,
    slowProcessingNoticeMs:
      AI_SLOW_PROCESSING_NOTICE_MS,
    requestTimeoutMs:
      AI_REQUEST_TIMEOUT_MS,
    serverMaxDurationSeconds:
      AI_SERVER_MAX_DURATION_SECONDS,
  },

  attachments: {
    minimumExtractedTextLength:
      MIN_EXTRACTED_ATTACHMENT_LENGTH,
    maxFileSizeBytes:
      AI_MAX_ATTACHMENT_SIZE_BYTES,
    hardMaxAttachments:
      AI_HARD_MAX_ATTACHMENTS,
    maxExtractedCharsPerAttachment:
      AI_MAX_EXTRACTED_CHARS_PER_ATTACHMENT,
    maxCombinedExtractedChars:
      AI_MAX_COMBINED_EXTRACTED_CHARS,
    maxTextLengthPerAttachment:
      AI_MAX_ATTACHMENT_TEXT_LENGTH,
    maxTotalTextLength:
      AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH,
    supportedMimeTypes:
      AI_SUPPORTED_ATTACHMENT_MIME_TYPES,
    supportedExtensions:
      AI_SUPPORTED_ATTACHMENT_EXTENSIONS,
    textExtractableExtensions:
      AI_TEXT_EXTRACTABLE_EXTENSIONS,
    limitError: {
      code: AI_ATTACHMENT_LIMIT_ERROR_CODE,
      status: AI_ATTACHMENT_LIMIT_HTTP_STATUS,
      message: AI_ATTACHMENT_LIMIT_MESSAGE,
      detail: AI_ATTACHMENT_LIMIT_DETAIL,
    },
  },

  models: {
    default: AI_DEFAULT_MODEL,
    fast: AI_FAST_MODEL,
    maxOutputTokens:
      AI_DEFAULT_MAX_OUTPUT_TOKENS,
  },

  webSearch: {
    enabled: AI_WEB_SEARCH_ENABLED,
    enabledWithAttachments:
      AI_WEB_SEARCH_WITH_ATTACHMENTS,
    searchContextSize:
      AI_WEB_SEARCH_CONTEXT_SIZE,
    includeSources:
      AI_INCLUDE_WEB_SEARCH_SOURCES,
  },

  errors: {
    immediate:
      AI_IMMEDIATE_ERROR_CODES,
    delayed:
      AI_DELAYED_ERROR_CODES,
  },
} as const;

// =====================================================
// POMOCNÉ FUNKCIE PRE POČET PRÍLOH
// =====================================================

/**
 * Normalizuje počet príloh na bezpečné nezáporné celé číslo.
 */
export function normalizeAttachmentCount(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

/**
 * Overí, či počet príloh neprekračuje pevný technický limit.
 */
export function isAttachmentCountAllowed(
  receivedAttachments: number,
): boolean {
  return (
    normalizeAttachmentCount(receivedAttachments) <=
    AI_HARD_MAX_ATTACHMENTS
  );
}

/**
 * Vráti jednotnú validačnú odpoveď pre /api/chat aj /api/extract-text.
 */
export function validateAttachmentCount(
  receivedAttachments: number,
): AttachmentCountValidation {
  const received =
    normalizeAttachmentCount(receivedAttachments);

  if (received <= AI_HARD_MAX_ATTACHMENTS) {
    return {
      ok: true,
      receivedAttachments: received,
      attachmentLimit:
        AI_HARD_MAX_ATTACHMENTS,
    };
  }

  return {
    ok: false,
    code: AI_ATTACHMENT_LIMIT_ERROR_CODE,
    status: AI_ATTACHMENT_LIMIT_HTTP_STATUS,
    message: AI_ATTACHMENT_LIMIT_MESSAGE,
    detail: AI_ATTACHMENT_LIMIT_DETAIL,
    receivedAttachments: received,
    attachmentLimit:
      AI_HARD_MAX_ATTACHMENTS,
  };
}

/**
 * Vráti celú hlášku vhodnú na priame zobrazenie používateľovi.
 */
export function getAttachmentLimitUserMessage(
  receivedAttachments?: number,
): string {
  const received =
    typeof receivedAttachments === 'number'
      ? normalizeAttachmentCount(receivedAttachments)
      : null;

  const receivedPart =
    received !== null
      ? ` Prijatý počet príloh: ${received}.`
      : '';

  return (
    `${AI_ATTACHMENT_LIMIT_MESSAGE}${receivedPart} ` +
    AI_ATTACHMENT_LIMIT_DETAIL
  );
}

// =====================================================
// POMOCNÉ FUNKCIE PRE CHYBY
// =====================================================

/**
 * Normalizuje chybový kód pred porovnaním.
 */
export function normalizeAiErrorCode(
  code: string | null | undefined,
): string {
  return String(code || 'UNKNOWN_ERROR')
    .trim()
    .toUpperCase();
}

/**
 * Kontrola, či sa daná chyba má zobraziť okamžite.
 */
export function isImmediateAiError(
  code: string,
): boolean {
  const normalized = normalizeAiErrorCode(code);

  return (
    AI_IMMEDIATE_ERROR_CODES as readonly string[]
  ).includes(normalized);
}

/**
 * Kontrola, či sa má chybová hláška oneskoriť.
 *
 * Neznámy chybový kód sa považuje za technickú chybu a oneskorí sa.
 */
export function shouldDelayAiError(
  code: string,
): boolean {
  return !isImmediateAiError(code);
}

/**
 * Vypočíta zostávajúci čas do minimálneho zobrazenia technickej chyby.
 */
export function getRemainingErrorDelay(
  startedAt: number,
  currentTime = Date.now(),
): number {
  const safeStartedAt =
    Number.isFinite(startedAt)
      ? startedAt
      : currentTime;

  const safeCurrentTime =
    Number.isFinite(currentTime)
      ? currentTime
      : Date.now();

  const elapsed = Math.max(
    0,
    safeCurrentTime - safeStartedAt,
  );

  return Math.max(
    0,
    AI_MIN_ERROR_DELAY_MS - elapsed,
  );
}

/**
 * Čakanie na minimálny čas pred zobrazením technickej chyby.
 * Funkcia sa používa iba na klientovi.
 */
export async function waitForMinimumErrorDelay(
  startedAt: number,
): Promise<void> {
  const remaining =
    getRemainingErrorDelay(startedAt);

  if (remaining <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}

// =====================================================
// POMOCNÉ FUNKCIE PRE FORMÁTY A VEĽKOSŤ
// =====================================================

/**
 * Normalizuje MIME typ; odstráni napríklad charset z hodnoty
 * "text/plain; charset=utf-8".
 */
export function normalizeAttachmentMimeType(
  mimeType: string | null | undefined,
): string {
  return String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
}

/**
 * Kontrola podporovaného MIME typu.
 */
export function isSupportedAttachmentMimeType(
  mimeType: string | null | undefined,
): boolean {
  const normalized =
    normalizeAttachmentMimeType(mimeType);

  if (!normalized) {
    return false;
  }

  return (
    AI_SUPPORTED_ATTACHMENT_MIME_TYPES as readonly string[]
  ).includes(normalized);
}

/**
 * Získanie prípony súboru.
 */
export function getFileExtension(
  filename: string,
): string {
  const normalized = String(filename || '')
    .trim()
    .toLowerCase()
    .split('?')[0]
    .split('#')[0];

  const dotIndex = normalized.lastIndexOf('.');

  if (dotIndex < 0) {
    return '';
  }

  return normalized.slice(dotIndex);
}

/**
 * Kontrola podporovanej prípony.
 */
export function isSupportedAttachmentExtension(
  filename: string,
): boolean {
  const extension = getFileExtension(filename);

  return (
    AI_SUPPORTED_ATTACHMENT_EXTENSIONS as readonly string[]
  ).includes(extension);
}

/**
 * Kontrola, či /api/extract-text pozná serverový parser pre danú príponu.
 */
export function isTextExtractableAttachment(
  filename: string,
): boolean {
  const extension = getFileExtension(filename);

  return (
    AI_TEXT_EXTRACTABLE_EXTENSIONS as readonly string[]
  ).includes(extension);
}

/**
 * Celková kontrola podporovaného súboru.
 *
 * Ak je prípona podporovaná, neodmietne sa súbor iba preto, že prehliadač
 * poslal všeobecný MIME typ application/octet-stream.
 */
export function isSupportedAttachment(
  file: {
    name: string;
    type?: string | null;
  },
): boolean {
  const validExtension =
    isSupportedAttachmentExtension(file.name);

  const normalizedMimeType =
    normalizeAttachmentMimeType(file.type);

  if (
    !normalizedMimeType ||
    normalizedMimeType ===
      'application/octet-stream'
  ) {
    return validExtension;
  }

  return (
    isSupportedAttachmentMimeType(
      normalizedMimeType,
    ) || validExtension
  );
}

/**
 * Kontrola veľkosti súboru.
 */
export function isAttachmentSizeAllowed(
  size: number,
): boolean {
  return (
    Number.isFinite(size) &&
    size > 0 &&
    size <= AI_MAX_ATTACHMENT_SIZE_BYTES
  );
}

// =====================================================
// POMOCNÉ FUNKCIE PRE EXTRAHOVANÝ TEXT
// =====================================================

/**
 * Získa text z podporovaných názvov polí používaných endpointmi.
 */
export function getAttachmentExtractedText(
  attachment:
    | AiAttachmentTextCandidate
    | null
    | undefined,
): string {
  if (!attachment) {
    return '';
  }

  const candidates = [
    attachment.extractedText,
    attachment.extracted_text,
    attachment.text,
    attachment.content,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === 'string' &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return '';
}

/**
 * Kontrola, či extrahovaný obsah prílohy obsahuje dostatok textu.
 */
export function hasUsableAttachmentText(
  text: string | null | undefined,
): boolean {
  return (
    typeof text === 'string' &&
    text.trim().length >=
      MIN_EXTRACTED_ATTACHMENT_LENGTH
  );
}

/**
 * Určenie zdrojového režimu.
 *
 * Ak existuje aspoň jedna použiteľná príloha, prílohy sú primárnym zdrojom.
 * Ak použiteľná príloha neexistuje, použije sa web.
 */
export function resolveAiSourceMode(
  attachments:
    | AiAttachmentTextCandidate[]
    | null
    | undefined,
): AiSourceMode {
  const hasUsableAttachment =
    attachments?.some((attachment) =>
      hasUsableAttachmentText(
        getAttachmentExtractedText(attachment),
      ),
    ) ?? false;

  return hasUsableAttachment
    ? 'attachments'
    : 'web';
}

/**
 * Oreže extrahovaný text jednej prílohy.
 */
export function limitAttachmentText(
  text: string,
): string {
  const normalized = String(text || '').trim();

  if (
    normalized.length <=
    AI_MAX_ATTACHMENT_TEXT_LENGTH
  ) {
    return normalized;
  }

  return normalized.slice(
    0,
    AI_MAX_ATTACHMENT_TEXT_LENGTH,
  );
}

/**
 * Oreže text extrahovaný endpointom /api/extract-text z jedného súboru.
 */
export function limitExtractedAttachmentText(
  text: string,
): string {
  const normalized = String(text || '').trim();

  if (
    normalized.length <=
    AI_MAX_EXTRACTED_CHARS_PER_ATTACHMENT
  ) {
    return normalized;
  }

  return normalized.slice(
    0,
    AI_MAX_EXTRACTED_CHARS_PER_ATTACHMENT,
  );
}

/**
 * Oreže celkový pripravený kontext všetkých príloh.
 */
export function limitTotalAttachmentText(
  text: string,
): string {
  const normalized = String(text || '').trim();

  if (
    normalized.length <=
    AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH
  ) {
    return normalized;
  }

  return normalized.slice(
    0,
    AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH,
  );
}

/**
 * Oreže spoločný extrahovaný text endpointu /api/extract-text.
 */
export function limitCombinedExtractedText(
  text: string,
): string {
  const normalized = String(text || '').trim();

  if (
    normalized.length <=
    AI_MAX_COMBINED_EXTRACTED_CHARS
  ) {
    return normalized;
  }

  return normalized.slice(
    0,
    AI_MAX_COMBINED_EXTRACTED_CHARS,
  );
}

// =====================================================
// WEBOVÉ VYHĽADÁVANIE
// =====================================================

/**
 * Rozhodne, či sa má aktivovať webové vyhľadávanie.
 */
export function shouldUseWebSearch(
  sourceMode: AiSourceMode,
): boolean {
  if (!AI_WEB_SEARCH_ENABLED) {
    return false;
  }

  if (sourceMode === 'web') {
    return true;
  }

  return AI_WEB_SEARCH_WITH_ATTACHMENTS;
}

/**
 * Vytvorí konfiguráciu OpenAI web_search nástroja.
 */
export function createWebSearchTools(
  sourceMode: AiSourceMode,
): Array<{
  type: 'web_search';
  search_context_size:
    typeof AI_WEB_SEARCH_CONTEXT_SIZE;
}> {
  if (!shouldUseWebSearch(sourceMode)) {
    return [];
  }

  return [
    {
      type: 'web_search',
      search_context_size:
        AI_WEB_SEARCH_CONTEXT_SIZE,
    },
  ];
}

/**
 * Vytvorí zoznam doplňujúcich dát, ktoré má OpenAI vrátiť
 * pri webovom vyhľadávaní.
 */
export function createOpenAiInclude(
  sourceMode: AiSourceMode,
): string[] {
  if (
    !shouldUseWebSearch(sourceMode) ||
    !AI_INCLUDE_WEB_SEARCH_SOURCES
  ) {
    return [];
  }

  return [
    'web_search_call.action.sources',
  ];
}

/**
 * Bezpečné načítanie serverovej hodnoty maxDuration.
 */
export function getAiServerMaxDuration(): number {
  return AI_SERVER_MAX_DURATION_SECONDS;
}
