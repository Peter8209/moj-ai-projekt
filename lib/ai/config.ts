/**
 * Centrálna konfigurácia všetkých AI agentov ZEDPERA.
 *
 * Tento súbor používajú:
 * - lib/ai/client/ai-fetch.ts
 * - lib/ai/source-mode.ts
 * - lib/ai/build-agent-prompt.ts
 * - app/api/chat/route.ts
 * - všetky ostatné AI API route.ts
 *
 * Dôležité:
 * - úspešná odpoveď sa nezdržuje,
 * - technická chyba sa zobrazí najskôr po 30 sekundách,
 * - validačné chyby sa môžu zobraziť okamžite,
 * - skutočný timeout požiadavky je 120 sekúnd.
 */

export const AI_MIN_ERROR_DELAY_MS = 30_000;

export const AI_SLOW_PROCESSING_NOTICE_MS = 30_000;

export const AI_REQUEST_TIMEOUT_MS = 120_000;

export const AI_SERVER_MAX_DURATION_SECONDS = 120;

export const MIN_EXTRACTED_ATTACHMENT_LENGTH = 50;

/**
 * Maximálna veľkosť jednej prílohy.
 *
 * 20 MB = 20 × 1024 × 1024 bajtov.
 * Hodnotu môžete zmeniť podľa svojho balíka alebo hostingu.
 */
export const AI_MAX_ATTACHMENT_SIZE_BYTES =
  20 * 1024 * 1024;

/**
 * Maximálny počet príloh použitý iba ako technická poistka.
 *
 * Skutočný používateľský limit sa musí načítať zo serverových
 * entitlementov. Táto hodnota nemá nahrádzať attachmentLimit
 * používateľského balíka.
 */
export const AI_HARD_MAX_ATTACHMENTS = 20;

/**
 * Maximálna dĺžka jedného extrahovaného dokumentu,
 * ktorá sa odošle modelu.
 *
 * Chráni request pred príliš veľkým obsahom.
 */
export const AI_MAX_ATTACHMENT_TEXT_LENGTH =
  250_000;

/**
 * Maximálna celková dĺžka textu všetkých príloh.
 */
export const AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH =
  500_000;

/**
 * Model použitý pre bežný AI chat.
 *
 * Model možno prepísať cez:
 * OPENAI_MODEL
 */
export const AI_DEFAULT_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  'gpt-5.6';

/**
 * Model pre jednoduchšie alebo pomocné úlohy.
 */
export const AI_FAST_MODEL =
  process.env.OPENAI_FAST_MODEL?.trim() ||
  AI_DEFAULT_MODEL;

/**
 * Počet tokenov výstupu.
 */
export const AI_DEFAULT_MAX_OUTPUT_TOKENS = 8_000;

/**
 * Kontext webového vyhľadávania.
 */
export const AI_WEB_SEARCH_CONTEXT_SIZE =
  'high' as const;

/**
 * Zapnutie webového vyhľadávania bez prílohy.
 *
 * Predvolene je zapnuté.
 *
 * Vypnutie:
 * AI_WEB_SEARCH_ENABLED=false
 */
export const AI_WEB_SEARCH_ENABLED =
  process.env.AI_WEB_SEARCH_ENABLED !==
  'false';

/**
 * Pri vloženej použiteľnej prílohe nebude web automaticky
 * zapnutý. Príloha bude primárnym zdrojom.
 *
 * Zapnutie webu aj pri prílohách:
 * AI_WEB_SEARCH_WITH_ATTACHMENTS=true
 */
export const AI_WEB_SEARCH_WITH_ATTACHMENTS =
  process.env
    .AI_WEB_SEARCH_WITH_ATTACHMENTS ===
  'true';

/**
 * Zapnutie úplného zoznamu zdrojov z webového vyhľadávania.
 */
export const AI_INCLUDE_WEB_SEARCH_SOURCES = true;

/**
 * Podporované typy príloh.
 */
export const AI_SUPPORTED_ATTACHMENT_MIME_TYPES =
  [
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

    'application/json',
  ] as const;

/**
 * Podporované prípony.
 *
 * Kontrolujte MIME typ aj príponu. Niektoré prehliadače
 * môžu pri odoslaní súboru uviesť neúplný MIME typ.
 */
export const AI_SUPPORTED_ATTACHMENT_EXTENSIONS =
  [
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
  ] as const;

/**
 * Chyby, ktoré sa majú používateľovi zobraziť okamžite.
 *
 * Ide o chyby, ktoré sa ďalším čakaním nevyriešia.
 */
export const AI_IMMEDIATE_ERROR_CODES = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'ATTACHMENT_LIMIT',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
] as const;

/**
 * Chyby, ktoré sa zobrazia najskôr po 30 sekundách.
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

/**
 * Kompletná centrálna konfigurácia.
 */
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

    maxTextLengthPerAttachment:
      AI_MAX_ATTACHMENT_TEXT_LENGTH,

    maxTotalTextLength:
      AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH,

    supportedMimeTypes:
      AI_SUPPORTED_ATTACHMENT_MIME_TYPES,

    supportedExtensions:
      AI_SUPPORTED_ATTACHMENT_EXTENSIONS,
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

/**
 * Kontrola, či sa daná chyba má zobraziť okamžite.
 */
export function isImmediateAiError(
  code: string,
): boolean {
  return (
    AI_IMMEDIATE_ERROR_CODES as readonly string[]
  ).includes(code);
}

/**
 * Kontrola, či sa má chybová hláška oneskoriť.
 */
export function shouldDelayAiError(
  code: string,
): boolean {
  return !isImmediateAiError(code);
}

/**
 * Vypočíta, koľko milisekúnd ešte treba počkať,
 * aby sa chyba nezobrazila skôr než po 30 sekundách.
 */
export function getRemainingErrorDelay(
  startedAt: number,
  currentTime = Date.now(),
): number {
  const elapsed =
    currentTime - startedAt;

  return Math.max(
    0,
    AI_MIN_ERROR_DELAY_MS - elapsed,
  );
}

/**
 * Čakanie na minimálny čas pred zobrazením chyby.
 *
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

/**
 * Kontrola podporovaného MIME typu.
 */
export function isSupportedAttachmentMimeType(
  mimeType: string | null | undefined,
): boolean {
  if (!mimeType) {
    return false;
  }

  return (
    AI_SUPPORTED_ATTACHMENT_MIME_TYPES as readonly string[]
  ).includes(
    mimeType.toLowerCase().trim(),
  );
}

/**
 * Získanie prípony súboru.
 */
export function getFileExtension(
  filename: string,
): string {
  const normalized =
    filename.trim().toLowerCase();

  const dotIndex =
    normalized.lastIndexOf('.');

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
  const extension =
    getFileExtension(filename);

  return (
    AI_SUPPORTED_ATTACHMENT_EXTENSIONS as readonly string[]
  ).includes(extension);
}

/**
 * Celková kontrola podporovaného súboru.
 *
 * Ak prehliadač nepošle MIME typ, rozhoduje prípona.
 */
export function isSupportedAttachment(
  file: {
    name: string;
    type?: string | null;
  },
): boolean {
  const validExtension =
    isSupportedAttachmentExtension(
      file.name,
    );

  if (!file.type) {
    return validExtension;
  }

  return (
    isSupportedAttachmentMimeType(
      file.type,
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
    size <=
      AI_MAX_ATTACHMENT_SIZE_BYTES
  );
}

/**
 * Kontrola, či extrahovaný obsah prílohy obsahuje
 * dostatočné množstvo textu.
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
 * Ak existuje aspoň jedna úspešne spracovaná príloha,
 * prílohy sú primárnym zdrojom.
 *
 * Ak použiteľná príloha neexistuje, použije sa web.
 */
export function resolveAiSourceMode(
  attachments:
    | Array<{
        extractedText?: string | null;
      }>
    | null
    | undefined,
): AiSourceMode {
  const hasUsableAttachment =
    attachments?.some((attachment) =>
      hasUsableAttachmentText(
        attachment.extractedText,
      ),
    ) ?? false;

  return hasUsableAttachment
    ? 'attachments'
    : 'web';
}

/**
 * Rozhodne, či sa má pre konkrétnu požiadavku
 * aktivovať webové vyhľadávanie.
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
 *
 * Pri vypnutom webe alebo pri režime príloh môže
 * funkcia vrátiť prázdne pole.
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
 * Vytvorí zoznam doplňujúcich dát, ktoré má OpenAI
 * vrátiť pri webovom vyhľadávaní.
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
 * Oreže extrahovaný text jednej prílohy.
 */
export function limitAttachmentText(
  text: string,
): string {
  const normalized = text.trim();

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
 * Oreže celkový kontext všetkých príloh.
 */
export function limitTotalAttachmentText(
  text: string,
): string {
  if (
    text.length <=
    AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH
  ) {
    return text;
  }

  return text.slice(
    0,
    AI_MAX_TOTAL_ATTACHMENT_TEXT_LENGTH,
  );
}

/**
 * Bezpečné načítanie serverovej hodnoty maxDuration.
 *
 * Použitie v route.ts:
 *
 * export const maxDuration =
 *   AI_SERVER_MAX_DURATION_SECONDS;
 */
export function getAiServerMaxDuration(): number {
  return AI_SERVER_MAX_DURATION_SECONDS;
}