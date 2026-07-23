/**
 * ZEDPERA – CENTRALIZOVANÝ KATALÓG API, AI A SYSTÉMOVÝCH CHÝB
 *
 * Tento súbor je jediný zdroj pravdy pre:
 * - používateľské chybové hlášky,
 * - stabilné technické kódy,
 * - HTTP statusy,
 * - závažnosť, blokovanie a možnosť opakovania,
 * - limity príloh, promptov a strán,
 * - chyby AI poskytovateľov, Supabase, Stripe, exportov a analýzy dát,
 * - bezpečné serializovanie API odpovedí,
 * - spätnú kompatibilitu so starou funkciou getZedperaErrorMessage().
 *
 * Bezpečnostné pravidlo:
 * Raw chyba, stack trace, API kľúč, SQL detail ani interná konfigurácia sa
 * používateľovi nikdy nezobrazujú automaticky. Technické údaje sú dostupné
 * iba administrátorovi alebo vo vývojovom režime.
 */

export type ZedperaLanguage = "sk" | "cs" | "en" | "de" | "pl" | "hu";

export type ZedperaErrorSeverity =
  | "info"
  | "warning"
  | "error"
  | "critical";

export type ZedperaErrorCategory =
  | "authentication"
  | "authorization"
  | "billing"
  | "attachment"
  | "validation"
  | "network"
  | "provider"
  | "data"
  | "export"
  | "database"
  | "sources"
  | "payment"
  | "configuration"
  | "profile"
  | "project"
  | "history"
  | "system";

export type ZedperaKnownErrorCode =
  | "AUTH_REQUIRED"
  | "SESSION_EXPIRED"
  | "ACCESS_DENIED"
  | "FEATURE_NOT_INCLUDED"
  | "PROMPT_LIMIT_REACHED"
  | "PAGE_LIMIT_REACHED"
  | "ATTACHMENT_LIMIT_REACHED"
  | "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED"
  | "ATTACHMENT_FILE_TOO_LARGE"
  | "ATTACHMENT_UNSUPPORTED_TYPE"
  | "ATTACHMENT_DUPLICATE"
  | "ATTACHMENT_NOT_RECEIVED"
  | "ATTACHMENT_EXTRACTION_FAILED"
  | "ATTACHMENT_TRACKING_UNAVAILABLE"
  | "PAYLOAD_TOO_LARGE"
  | "PROVIDER_CONTEXT_TOO_LARGE"
  | "MISSING_MESSAGES"
  | "EMPTY_INPUT"
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "METHOD_NOT_ALLOWED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "REQUEST_TIMEOUT"
  | "NETWORK_ERROR"
  | "API_UNAVAILABLE"
  | "PROVIDER_INVALID_API_KEY"
  | "PROVIDER_ACCESS_DENIED"
  | "PROVIDER_BILLING_EXHAUSTED"
  | "PROVIDER_QUOTA_EXCEEDED"
  | "PROVIDER_MODEL_NOT_FOUND"
  | "PROVIDER_BAD_GATEWAY"
  | "AI_RESPONSE_INVALID"
  | "AI_CONTENT_BLOCKED"
  | "FILE_PROCESSING_FAILED"
  | "PDF_OCR_REQUIRED"
  | "DATA_FILE_REQUIRED"
  | "DATA_FILE_INVALID"
  | "DATA_PREPARATION_FAILED"
  | "DATA_ANALYSIS_FAILED"
  | "EXPORT_FAILED"
  | "DATABASE_ERROR"
  | "ACADEMIC_SOURCES_ERROR"
  | "PAYMENT_FAILED"
  | "MISSING_ENVIRONMENT_VARIABLE"
  | "PROFILE_LOAD_FAILED"
  | "PROFILE_SAVE_FAILED"
  | "PROJECT_LOAD_FAILED"
  | "HISTORY_SAVE_FAILED"
  | "INTERNAL_SERVER_ERROR"
  | "UNKNOWN_ERROR";

export type ZedperaErrorCode =
  | ZedperaKnownErrorCode
  | (string & {});

export type ZedperaErrorActionKind =
  | "login"
  | "pricing"
  | "capacity"
  | "retry"
  | "back"
  | "switch-model"
  | "contact-support"
  | "none";

export type ZedperaErrorContext = {
  endpoint?: string | null;
  module?: string | null;
  field?: string | null;
  requestId?: string | null;
  errorId?: string | null;

  attachmentLimit?: number | null;
  attachmentsUsed?: number | null;
  attachmentsRemaining?: number | null;
  receivedAttachments?: number | null;
  maxRequestAttachments?: number | null;
  maxFileSizeMb?: number | null;
  maxTotalUploadMb?: number | null;
  fileName?: string | null;
  allowedTypes?: string[] | null;

  promptLimit?: number | null;
  promptsUsed?: number | null;
  promptsRemaining?: number | null;

  pageLimit?: number | null;
  pagesUsed?: number | null;
  pagesRemaining?: number | null;

  featureLabel?: string | null;
  planName?: string | null;
  provider?: string | null;
  selectedModel?: string | null;
  sourceProvider?: string | null;

  retryAfterSeconds?: number | null;
  purchaseUrl?: string | null;
  loginUrl?: string | null;
  supportUrl?: string | null;

  status?: number | null;
  serverCode?: string | null;
  serverMessage?: string | null;
  serverDetail?: string | null;
  rawMessage?: string | null;

  [key: string]: unknown;
};

/**
 * Rozšírený typ pôvodného ZedperaErrorInfo.
 * Zachováva všetky pôvodné polia a pridáva štruktúrované údaje pre API a UI.
 */
export type ZedperaErrorInfo = {
  ok: false;
  code: ZedperaErrorCode;
  canonicalCode: ZedperaKnownErrorCode;
  technicalCode: string;
  status: number;

  title: string;
  message: string;
  reason: string;
  solution: string;
  userAction: string;
  adminAction: string;
  detail?: string;
  technicalDetail?: string;

  category: ZedperaErrorCategory;
  severity: ZedperaErrorSeverity;
  retryable: boolean;
  blocking: boolean;

  actionKind: ZedperaErrorActionKind;
  actionLabel?: string;
  actionUrl?: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;

  requestId?: string;
  errorId?: string;
  endpoint?: string;
  module?: string;

  attachmentLimit?: number | null;
  attachmentsUsed?: number | null;
  attachmentsRemaining?: number | null;
  receivedAttachments?: number | null;
  maxRequestAttachments?: number | null;
  maxFileSizeMb?: number | null;
  maxTotalUploadMb?: number | null;

  promptLimit?: number | null;
  promptsUsed?: number | null;
  promptsRemaining?: number | null;

  pageLimit?: number | null;
  pagesUsed?: number | null;
  pagesRemaining?: number | null;

  retryAfterSeconds?: number | null;
};

export type ZedperaErrorDescriptor = ZedperaErrorInfo;

export type ZedperaApiErrorBody = {
  ok: false;
  success: false;
  code: string;
  technicalCode: string;
  status: number;

  title: string;
  message: string;
  reason: string;
  solution: string;
  userAction: string;

  category: ZedperaErrorCategory;
  severity: ZedperaErrorSeverity;
  retryable: boolean;
  blocking: boolean;

  actionKind: ZedperaErrorActionKind;
  actionLabel?: string;
  actionUrl?: string;

  requestId?: string;
  errorId?: string;
  endpoint?: string;
  module?: string;

  attachmentLimit?: number | null;
  attachmentsUsed?: number | null;
  attachmentsRemaining?: number | null;
  receivedAttachments?: number | null;
  maxRequestAttachments?: number | null;
  maxFileSizeMb?: number | null;
  maxTotalUploadMb?: number | null;

  promptLimit?: number | null;
  promptsUsed?: number | null;
  promptsRemaining?: number | null;

  pageLimit?: number | null;
  pagesUsed?: number | null;
  pagesRemaining?: number | null;

  retryAfterSeconds?: number | null;

  /**
   * Posiela sa iba vo vývojovom režime alebo do admin rozhrania.
   */
  adminAction?: string;
  technicalDetail?: string;
};

type ErrorDefinition = {
  status: number;
  category: ZedperaErrorCategory;
  severity: ZedperaErrorSeverity;
  retryable: boolean;
  blocking: boolean;
  actionKind: ZedperaErrorActionKind;
};

type ErrorCopy = {
  title: string;
  message: string;
  reason: string;
  solution: string;
  userAction: string;
  adminAction: string;
};

type UiLabels = {
  close: string;
  retry: string;
  login: string;
  pricing: string;
  capacity: string;
  back: string;
  switchModel: string;
  contactSupport: string;
  details: string;
  hideDetails: string;
  whatHappened: string;
  howToContinue: string;
  recommendedAction: string;
  technicalInformation: string;
  copyReference: string;
  copied: string;
  limit: string;
  used: string;
  remaining: string;
  inRequest: string;
  attachmentLimit: string;
  promptLimit: string;
  pageLimit: string;
  referenceId: string;
  blockingError: string;
};

const DEFINITIONS: Record<ZedperaKnownErrorCode, ErrorDefinition> = {
  AUTH_REQUIRED: d(401, "authentication", "warning", false, true, "login"),
  SESSION_EXPIRED: d(401, "authentication", "warning", false, true, "login"),
  ACCESS_DENIED: d(403, "authorization", "error", false, true, "back"),
  FEATURE_NOT_INCLUDED: d(403, "billing", "warning", false, true, "pricing"),
  PROMPT_LIMIT_REACHED: d(402, "billing", "warning", false, true, "pricing"),
  PAGE_LIMIT_REACHED: d(402, "billing", "warning", false, true, "capacity"),

  ATTACHMENT_LIMIT_REACHED: d(402, "attachment", "warning", false, true, "capacity"),
  ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED: d(413, "attachment", "warning", true, false, "none"),
  ATTACHMENT_FILE_TOO_LARGE: d(413, "attachment", "warning", true, false, "none"),
  ATTACHMENT_UNSUPPORTED_TYPE: d(415, "attachment", "warning", true, false, "none"),
  ATTACHMENT_DUPLICATE: d(409, "attachment", "info", true, false, "none"),
  ATTACHMENT_NOT_RECEIVED: d(422, "attachment", "error", true, false, "retry"),
  ATTACHMENT_EXTRACTION_FAILED: d(422, "attachment", "error", true, false, "retry"),
  ATTACHMENT_TRACKING_UNAVAILABLE: d(503, "attachment", "warning", true, false, "retry"),
  PAYLOAD_TOO_LARGE: d(413, "validation", "warning", true, false, "none"),

  PROVIDER_CONTEXT_TOO_LARGE: d(413, "provider", "warning", true, false, "none"),
  MISSING_MESSAGES: d(400, "validation", "warning", true, false, "none"),
  EMPTY_INPUT: d(400, "validation", "warning", true, false, "none"),
  INVALID_REQUEST: d(400, "validation", "warning", true, false, "none"),
  VALIDATION_ERROR: d(422, "validation", "warning", true, false, "none"),
  METHOD_NOT_ALLOWED: d(405, "validation", "error", false, false, "back"),
  NOT_FOUND: d(404, "system", "warning", false, false, "back"),

  RATE_LIMITED: d(429, "provider", "warning", true, false, "retry"),
  REQUEST_TIMEOUT: d(504, "network", "error", true, false, "retry"),
  NETWORK_ERROR: d(503, "network", "error", true, false, "retry"),
  API_UNAVAILABLE: d(503, "system", "error", true, false, "retry"),

  PROVIDER_INVALID_API_KEY: d(502, "provider", "critical", false, false, "switch-model"),
  PROVIDER_ACCESS_DENIED: d(502, "provider", "error", false, false, "switch-model"),
  PROVIDER_BILLING_EXHAUSTED: d(503, "provider", "critical", true, false, "switch-model"),
  PROVIDER_QUOTA_EXCEEDED: d(503, "provider", "error", true, false, "switch-model"),
  PROVIDER_MODEL_NOT_FOUND: d(502, "provider", "error", true, false, "switch-model"),
  PROVIDER_BAD_GATEWAY: d(502, "provider", "error", true, false, "switch-model"),
  AI_RESPONSE_INVALID: d(502, "provider", "error", true, false, "retry"),
  AI_CONTENT_BLOCKED: d(422, "provider", "warning", true, false, "none"),

  FILE_PROCESSING_FAILED: d(422, "attachment", "warning", true, false, "retry"),
  PDF_OCR_REQUIRED: d(422, "attachment", "warning", true, false, "none"),

  DATA_FILE_REQUIRED: d(400, "data", "warning", true, false, "none"),
  DATA_FILE_INVALID: d(422, "data", "warning", true, false, "none"),
  DATA_PREPARATION_FAILED: d(422, "data", "error", true, false, "retry"),
  DATA_ANALYSIS_FAILED: d(500, "data", "error", true, false, "retry"),
  EXPORT_FAILED: d(500, "export", "error", true, false, "retry"),

  DATABASE_ERROR: d(500, "database", "error", true, false, "retry"),
  ACADEMIC_SOURCES_ERROR: d(503, "sources", "warning", true, false, "retry"),
  PAYMENT_FAILED: d(402, "payment", "error", true, false, "pricing"),
  MISSING_ENVIRONMENT_VARIABLE: d(500, "configuration", "critical", false, false, "contact-support"),

  PROFILE_LOAD_FAILED: d(500, "profile", "error", true, false, "retry"),
  PROFILE_SAVE_FAILED: d(500, "profile", "error", true, false, "retry"),
  PROJECT_LOAD_FAILED: d(500, "project", "error", true, false, "retry"),
  HISTORY_SAVE_FAILED: d(500, "history", "warning", true, false, "retry"),

  INTERNAL_SERVER_ERROR: d(500, "system", "critical", true, false, "retry"),
  UNKNOWN_ERROR: d(500, "system", "error", true, false, "retry"),
};

function d(
  status: number,
  category: ZedperaErrorCategory,
  severity: ZedperaErrorSeverity,
  retryable: boolean,
  blocking: boolean,
  actionKind: ZedperaErrorActionKind,
): ErrorDefinition {
  return {
    status,
    category,
    severity,
    retryable,
    blocking,
    actionKind,
  };
}

const CODE_ALIASES: Record<string, ZedperaKnownErrorCode> = {
  UNAUTHENTICATED: "AUTH_REQUIRED",
  AUTHENTICATION_REQUIRED: "AUTH_REQUIRED",
  LOGIN_REQUIRED: "AUTH_REQUIRED",
  INVALID_SESSION: "SESSION_EXPIRED",
  TOKEN_EXPIRED: "SESSION_EXPIRED",
  FORBIDDEN: "ACCESS_DENIED",
  PERMISSION_DENIED: "ACCESS_DENIED",

  REQUIRED_FEATURES_MISSING: "FEATURE_NOT_INCLUDED",
  NO_REQUIRED_FEATURE_INCLUDED: "FEATURE_NOT_INCLUDED",
  MODULE_NOT_INCLUDED: "FEATURE_NOT_INCLUDED",

  ATTACHMENT_COUNT_LIMIT_REACHED: "ATTACHMENT_LIMIT_REACHED",
  TOO_MANY_ATTACHMENTS: "ATTACHMENT_LIMIT_REACHED",
  ATTACHMENT_QUOTA_REACHED: "ATTACHMENT_LIMIT_REACHED",
  FILE_TOO_LARGE: "ATTACHMENT_FILE_TOO_LARGE",
  UNSUPPORTED_FILE_TYPE: "ATTACHMENT_UNSUPPORTED_TYPE",
  INVALID_FILE_TYPE: "ATTACHMENT_UNSUPPORTED_TYPE",
  ATTACHMENT_UPLOAD_FAILED: "ATTACHMENT_NOT_RECEIVED",
  ATTACHMENT_PARSE_FAILED: "ATTACHMENT_EXTRACTION_FAILED",
  EXTRACTION_FAILED: "ATTACHMENT_EXTRACTION_FAILED",
  GZIP_DECOMPRESSION_FAILED: "ATTACHMENT_EXTRACTION_FAILED",

  FUNCTION_PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  REQUEST_ENTITY_TOO_LARGE: "PAYLOAD_TOO_LARGE",

  INVALID_API_KEY: "PROVIDER_INVALID_API_KEY",
  PROVIDER_AUTH_ERROR: "PROVIDER_INVALID_API_KEY",
  MODEL_ACCESS_DENIED: "PROVIDER_ACCESS_DENIED",
  INSUFFICIENT_QUOTA: "PROVIDER_BILLING_EXHAUSTED",
  BILLING_HARD_LIMIT_REACHED: "PROVIDER_BILLING_EXHAUSTED",
  MODEL_NOT_FOUND: "PROVIDER_MODEL_NOT_FOUND",
  AI_MODEL_NOT_FOUND: "PROVIDER_MODEL_NOT_FOUND",
  CONTEXT_TOO_LARGE: "PROVIDER_CONTEXT_TOO_LARGE",
  CONTEXT_WINDOW_EXCEEDED: "PROVIDER_CONTEXT_TOO_LARGE",
  CONTEXT_LENGTH_EXCEEDED: "PROVIDER_CONTEXT_TOO_LARGE",
  RATE_LIMIT: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
  AI_API_ERROR: "API_UNAVAILABLE",
  BAD_GATEWAY: "PROVIDER_BAD_GATEWAY",
  INVALID_AI_RESPONSE: "AI_RESPONSE_INVALID",
  AI_INVALID_JSON_RESPONSE: "AI_RESPONSE_INVALID",
  CONTENT_BLOCKED: "AI_CONTENT_BLOCKED",
  SAFETY_BLOCKED: "AI_CONTENT_BLOCKED",

  FILE_REQUIRED: "DATA_FILE_REQUIRED",
  MISSING_FILE: "DATA_FILE_REQUIRED",
  INVALID_DATA_FILE: "DATA_FILE_INVALID",
  INVALID_EXTENSION: "DATA_FILE_INVALID",
  INVALID_FILE_EXTENSION: "DATA_FILE_INVALID",
  FILE_READ_FAILED: "DATA_FILE_INVALID",
  PREPARE_FAILED: "DATA_PREPARATION_FAILED",
  WORKBOOK_READ_FAILED: "DATA_PREPARATION_FAILED",
  WORKBOOK_GENERATION_FAILED: "DATA_PREPARATION_FAILED",
  EMPTY_WORKBOOK: "DATA_FILE_INVALID",
  EMPTY_SHEET: "DATA_FILE_INVALID",
  PREPARED_FILE_MISSING: "DATA_PREPARATION_FAILED",
  PREPARED_FILE_INVALID: "DATA_PREPARATION_FAILED",
  ANALYSIS_FAILED: "DATA_ANALYSIS_FAILED",

  SUPABASE_ERROR: "DATABASE_ERROR",
  POSTGRES_ERROR: "DATABASE_ERROR",
  SQL_ERROR: "DATABASE_ERROR",
  SOURCES_FAILED: "ACADEMIC_SOURCES_ERROR",
  STRIPE_ERROR: "PAYMENT_FAILED",
  CHECKOUT_FAILED: "PAYMENT_FAILED",
  WEBHOOK_FAILED: "PAYMENT_FAILED",
  REQUIRED_ENVIRONMENT_VARIABLE_MISSING: "MISSING_ENVIRONMENT_VARIABLE",

  PROFILE_ERROR: "PROFILE_LOAD_FAILED",
  PROJECT_ERROR: "PROJECT_LOAD_FAILED",
  HISTORY_ERROR: "HISTORY_SAVE_FAILED",

  ENTITLEMENT_ERROR: "INTERNAL_SERVER_ERROR",
  ENTITLEMENTS_LOAD_FAILED: "INTERNAL_SERVER_ERROR",
  ENTITLEMENTS_SCHEMA_INCOMPATIBLE: "INTERNAL_SERVER_ERROR",
  ENTITLEMENTS_RECORD_MISSING: "INTERNAL_SERVER_ERROR",
  UNKNOWN_AGENT: "INVALID_REQUEST",
  UNKNOWN_MODULE: "INVALID_REQUEST",
  INVALID_CONTENT_TYPE: "INVALID_REQUEST",
  INVALID_FORM_DATA: "INVALID_REQUEST",
  MULTIPLE_FILES_NOT_SUPPORTED: "INVALID_REQUEST",
};

const UI_LABELS: Record<ZedperaLanguage, UiLabels> = {
  sk: {
    close: "Zavrieť",
    retry: "Skúsiť znova",
    login: "Prihlásiť sa",
    pricing: "Zobraziť balíky",
    capacity: "Dokúpiť kapacitu",
    back: "Späť na dashboard",
    switchModel: "Zmeniť AI model",
    contactSupport: "Kontaktovať podporu",
    details: "Zobraziť technické údaje",
    hideDetails: "Skryť technické údaje",
    whatHappened: "Čo sa stalo",
    howToContinue: "Ako pokračovať",
    recommendedAction: "Odporúčaný postup",
    technicalInformation: "Technické informácie",
    copyReference: "Kopírovať referenčné ID",
    copied: "Skopírované",
    limit: "Limit",
    used: "Použité",
    remaining: "Zostáva",
    inRequest: "V požiadavke",
    attachmentLimit: "Prílohy",
    promptLimit: "AI požiadavky",
    pageLimit: "Strany",
    referenceId: "Referenčné ID",
    blockingError: "Blokujúca chyba",
  },
  cs: {
    close: "Zavřít",
    retry: "Zkusit znovu",
    login: "Přihlásit se",
    pricing: "Zobrazit balíčky",
    capacity: "Navýšit kapacitu",
    back: "Zpět na dashboard",
    switchModel: "Změnit AI model",
    contactSupport: "Kontaktovat podporu",
    details: "Zobrazit technické údaje",
    hideDetails: "Skrýt technické údaje",
    whatHappened: "Co se stalo",
    howToContinue: "Jak pokračovat",
    recommendedAction: "Doporučený postup",
    technicalInformation: "Technické informace",
    copyReference: "Kopírovat referenční ID",
    copied: "Zkopírováno",
    limit: "Limit",
    used: "Použito",
    remaining: "Zbývá",
    inRequest: "V požadavku",
    attachmentLimit: "Přílohy",
    promptLimit: "AI požadavky",
    pageLimit: "Strany",
    referenceId: "Referenční ID",
    blockingError: "Blokující chyba",
  },
  en: {
    close: "Close",
    retry: "Try again",
    login: "Sign in",
    pricing: "View plans",
    capacity: "Increase capacity",
    back: "Back to dashboard",
    switchModel: "Change AI model",
    contactSupport: "Contact support",
    details: "Show technical details",
    hideDetails: "Hide technical details",
    whatHappened: "What happened",
    howToContinue: "How to continue",
    recommendedAction: "Recommended action",
    technicalInformation: "Technical information",
    copyReference: "Copy reference ID",
    copied: "Copied",
    limit: "Limit",
    used: "Used",
    remaining: "Remaining",
    inRequest: "In request",
    attachmentLimit: "Attachments",
    promptLimit: "AI requests",
    pageLimit: "Pages",
    referenceId: "Reference ID",
    blockingError: "Blocking error",
  },
  de: {
    close: "Schließen",
    retry: "Erneut versuchen",
    login: "Anmelden",
    pricing: "Pakete anzeigen",
    capacity: "Kapazität erhöhen",
    back: "Zurück zum Dashboard",
    switchModel: "KI-Modell wechseln",
    contactSupport: "Support kontaktieren",
    details: "Technische Details anzeigen",
    hideDetails: "Technische Details ausblenden",
    whatHappened: "Was ist passiert",
    howToContinue: "So geht es weiter",
    recommendedAction: "Empfohlene Aktion",
    technicalInformation: "Technische Informationen",
    copyReference: "Referenz-ID kopieren",
    copied: "Kopiert",
    limit: "Limit",
    used: "Verwendet",
    remaining: "Verbleibend",
    inRequest: "In der Anfrage",
    attachmentLimit: "Anhänge",
    promptLimit: "KI-Anfragen",
    pageLimit: "Seiten",
    referenceId: "Referenz-ID",
    blockingError: "Blockierender Fehler",
  },
  pl: {
    close: "Zamknij",
    retry: "Spróbuj ponownie",
    login: "Zaloguj się",
    pricing: "Zobacz pakiety",
    capacity: "Zwiększ limit",
    back: "Wróć do panelu",
    switchModel: "Zmień model AI",
    contactSupport: "Skontaktuj się z pomocą",
    details: "Pokaż dane techniczne",
    hideDetails: "Ukryj dane techniczne",
    whatHappened: "Co się stało",
    howToContinue: "Jak kontynuować",
    recommendedAction: "Zalecane działanie",
    technicalInformation: "Informacje techniczne",
    copyReference: "Kopiuj identyfikator",
    copied: "Skopiowano",
    limit: "Limit",
    used: "Użyto",
    remaining: "Pozostało",
    inRequest: "W żądaniu",
    attachmentLimit: "Załączniki",
    promptLimit: "Żądania AI",
    pageLimit: "Strony",
    referenceId: "Identyfikator",
    blockingError: "Błąd blokujący",
  },
  hu: {
    close: "Bezárás",
    retry: "Újrapróbálás",
    login: "Bejelentkezés",
    pricing: "Csomagok megtekintése",
    capacity: "Kapacitás növelése",
    back: "Vissza az irányítópultra",
    switchModel: "AI-modell váltása",
    contactSupport: "Kapcsolat a támogatással",
    details: "Technikai adatok megjelenítése",
    hideDetails: "Technikai adatok elrejtése",
    whatHappened: "Mi történt",
    howToContinue: "Hogyan tovább",
    recommendedAction: "Javasolt lépés",
    technicalInformation: "Technikai információk",
    copyReference: "Hivatkozási ID másolása",
    copied: "Másolva",
    limit: "Korlát",
    used: "Felhasznált",
    remaining: "Fennmaradó",
    inRequest: "A kérésben",
    attachmentLimit: "Mellékletek",
    promptLimit: "AI-kérések",
    pageLimit: "Oldalak",
    referenceId: "Hivatkozási ID",
    blockingError: "Blokkoló hiba",
  },
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(0, Math.trunc(numeric))
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  source: Record<string, unknown> | null,
  keys: string[],
): string {
  if (!source) return "";

  for (const key of keys) {
    const value = cleanText(source[key]);
    if (value) return value;
  }

  return "";
}

function readNumber(
  source: Record<string, unknown> | null,
  keys: string[],
): number | null {
  if (!source) return null;

  for (const key of keys) {
    const numeric = safeInteger(source[key]);
    if (numeric !== null) return numeric;
  }

  return null;
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeErrorText(error: unknown): string {
  if (!error) return "";

  const record = asRecord(error);

  if (
    error instanceof Error ||
    (record &&
      (typeof record.message === "string" ||
        typeof record.name === "string"))
  ) {
    return [
      error instanceof Error
        ? error.name
        : record?.name,
      error instanceof Error
        ? error.message
        : record?.message,
      error instanceof Error
        ? (
            error as Error & {
              cause?: unknown;
            }
          ).cause
        : record?.cause,
      record?.code,
      record?.status,
      record?.detail,
    ]
      .map((value) => {
        try {
          return typeof value === "string"
            ? value
            : JSON.stringify(value);
        } catch {
          return String(value || "");
        }
      })
      .join(" ")
      .toLowerCase();
  }

  try {
    return JSON.stringify(error).toLowerCase();
  } catch {
    return String(error).toLowerCase();
  }
}

export function normalizeZedperaLanguage(
  value: unknown,
): ZedperaLanguage {
  const normalized = cleanText(value).toLowerCase();

  if (normalized === "cz") return "cs";

  return normalized === "sk" ||
    normalized === "cs" ||
    normalized === "en" ||
    normalized === "de" ||
    normalized === "pl" ||
    normalized === "hu"
    ? normalized
    : "sk";
}

export function getZedperaUiLabels(
  language?: ZedperaLanguage | string | null,
): UiLabels {
  return UI_LABELS[normalizeZedperaLanguage(language)];
}

export function getZedperaCommonCopy(
  language?: ZedperaLanguage | string | null,
) {
  const labels = getZedperaUiLabels(language);

  return {
    actions: {
      login: labels.login,
      pricing: labels.pricing,
      pages: labels.capacity,
      retry: labels.retry,
      back: labels.back,
      close: labels.close,
      details: labels.details,
      hideDetails: labels.hideDetails,
    },
    requestReference: labels.referenceId,
    generic: buildCopy("UNKNOWN_ERROR", {}, normalizeZedperaLanguage(language)),
  };
}

function attachmentWord(count: number): string {
  if (count === 1) return "prílohu";
  if (count >= 2 && count <= 4) return "prílohy";
  return "príloh";
}

function pageWord(count: number): string {
  if (count === 1) return "stranu";
  if (count >= 2 && count <= 4) return "strany";
  return "strán";
}

function formatAllowedTypes(types: string[] | null | undefined): string {
  const safe = Array.isArray(types)
    ? uniqueStrings(types)
    : [];

  return safe.length > 0
    ? safe.join(", ")
    : "PDF, DOCX, XLSX, CSV, TXT, JPG, PNG, WEBP a PPTX";
}

function buildCopy(
  code: ZedperaKnownErrorCode,
  context: ZedperaErrorContext,
  language: ZedperaLanguage,
): ErrorCopy {
  const attachmentLimit = safeInteger(context.attachmentLimit);
  const attachmentsUsed = safeInteger(context.attachmentsUsed);
  const attachmentsRemaining = safeInteger(context.attachmentsRemaining);
  const receivedAttachments = safeInteger(context.receivedAttachments);
  const maxRequestAttachments = safeInteger(context.maxRequestAttachments);
  const maxFileSizeMb = safeInteger(context.maxFileSizeMb);
  const maxTotalUploadMb = safeInteger(context.maxTotalUploadMb);
  const promptLimit = safeInteger(context.promptLimit);
  const promptsRemaining = safeInteger(context.promptsRemaining);
  const pageLimit = safeInteger(context.pageLimit);
  const pagesRemaining = safeInteger(context.pagesRemaining);
  const retryAfter = safeInteger(context.retryAfterSeconds);

  const fileName = cleanText(context.fileName);
  const featureLabel = cleanText(context.featureLabel);
  const planName = cleanText(context.planName);
  const provider = cleanText(context.provider);
  const model = cleanText(context.selectedModel);
  const sourceProvider = cleanText(context.sourceProvider);

  /**
   * Hlavný detailný katalóg je v slovenčine.
   * Ostatné jazyky majú profesionálny lokalizovaný fallback pre kritické
   * používateľské situácie a môžu sa ďalej rozšíriť bez zmeny API kontraktu.
   */
  if (language !== "sk") {
    const localized = buildLocalizedCoreCopy(code, context, language);
    if (localized) return localized;
  }

  switch (code) {
    case "AUTH_REQUIRED":
      return c(
        "Je potrebné prihlásenie",
        "Pre pokračovanie sa prihláste do svojho účtu ZEDPERA.",
        "Požadovaná operácia pracuje s osobnými projektmi, limitmi alebo uloženými údajmi používateľa.",
        "Prihláste sa a potom sa vráťte k rozpracovanej požiadavke.",
        "Použite tlačidlo Prihlásiť sa. Rozpracovaný obsah ponechajte otvorený.",
        "Skontrolovať Supabase session, cookies, middleware a návratovú URL po prihlásení.",
      );

    case "SESSION_EXPIRED":
      return c(
        "Platnosť relácie vypršala",
        "Z bezpečnostných dôvodov bola vaša relácia ukončená.",
        "Prihlasovací token už nie je platný alebo sa relácia nedala obnoviť.",
        "Prihláste sa znova. Po prihlásení môžete pokračovať v práci.",
        "Neobnovujte stránku skôr, než si skopírujete dôležitý neuložený text.",
        "Skontrolovať Supabase refresh token, cookie flags, server/client auth klienta a časovú synchronizáciu.",
      );

    case "ACCESS_DENIED":
      return c(
        "Prístup bol zamietnutý",
        "Na vykonanie tejto operácie nemáte dostatočné oprávnenie.",
        "Účet nemá požadovanú rolu, prístup k projektu alebo oprávnenie na daný záznam.",
        "Vráťte sa na dashboard alebo použite účet s potrebným oprávnením.",
        "Skontrolujte, či pracujete v správnom účte a projekte.",
        "Skontrolovať RLS, vlastníctvo záznamu, admin rolu a serverové autorizačné kontroly.",
      );

    case "FEATURE_NOT_INCLUDED":
      return c(
        "Funkcia nie je súčasťou aktívneho balíka",
        featureLabel
          ? `Funkcia „${featureLabel}“ nie je dostupná v balíku${planName ? ` ${planName}` : ""}.`
          : "Požadovaná funkcia nie je dostupná v aktívnom balíku.",
        "Aktívny plán alebo doplnky neobsahujú oprávnenie potrebné pre tento modul.",
        "Vyberte vyšší balík alebo doplnok, ktorý túto funkciu obsahuje.",
        "Otvorte ponuku balíkov a porovnajte dostupné funkcie.",
        "Skontrolovať FeatureKey, mapovanie modulu, entitlement záznam a Stripe aktiváciu produktu.",
      );

    case "PROMPT_LIMIT_REACHED":
      return c(
        "Limit AI požiadaviek bol vyčerpaný",
        promptLimit !== null
          ? `Aktívny balík obsahuje ${promptLimit} AI požiadaviek a ďalšia požiadavka už nie je dostupná.`
          : "Aktívny balík už neobsahuje ďalšiu dostupnú AI požiadavku.",
        "Počet úspešne spotrebovaných AI požiadaviek dosiahol limit balíka.",
        "Aktivujte vyšší balík alebo počkajte na obnovenie limitu, ak ho váš plán podporuje.",
        promptsRemaining !== null
          ? `Aktuálne zostáva ${promptsRemaining} požiadaviek.`
          : "Otvorte ponuku balíkov a vyberte vhodné rozšírenie.",
        "Skontrolovať RPC odpočet promptov, idempotenciu requestId a administrátorský bypass.",
      );

    case "PAGE_LIMIT_REACHED":
      return c(
        "Limit strán bol vyčerpaný",
        pageLimit !== null
          ? `Aktívny balík umožňuje vytvoriť ${pageLimit} ${pageWord(pageLimit)} a dostupný rozsah bol využitý.`
          : "Dostupný rozsah strán bol využitý.",
        "Súčet už vytvorených strán a nového výstupu prekročil celkový limit projektu.",
        "Dokúpte ďalšie strany alebo aktivujte balík s vyšším rozsahom.",
        pagesRemaining !== null
          ? `Aktuálne zostáva ${pagesRemaining} ${pageWord(pagesRemaining)}.`
          : "Otvorte doplnkové služby a navýšte rozsah projektu.",
        "Skontrolovať page-quota log, CHARACTERS_PER_PAGE, TOKENS_PER_PAGE, idempotenciu a admin bypass.",
      );

    case "ATTACHMENT_LIMIT_REACHED": {
      const limitSentence =
        attachmentLimit !== null
          ? `Váš aktuálny balík umožňuje prijať najviac ${attachmentLimit} ${attachmentWord(attachmentLimit)} celkovo.`
          : "Limit prijatých príloh bol dosiahnutý.";

      const requestSentence =
        receivedAttachments !== null
          ? ` Táto požiadavka obsahuje ${receivedAttachments} ${attachmentWord(receivedAttachments)}.`
          : "";

      const usedSentence =
        attachmentsUsed !== null
          ? ` Systém už eviduje ${attachmentsUsed} prijatých príloh.`
          : "";

      const remainingSentence =
        attachmentsRemaining !== null
          ? ` Aktuálne vám zostáva ${attachmentsRemaining} ${attachmentWord(attachmentsRemaining)}.`
          : "";

      return c(
        "Limit príloh bol dosiahnutý",
        `${limitSentence}${requestSentence}${usedSentence}${remainingSentence}`,
        "Každý jedinečný súbor sa po prijatí serverom započíta ako jedna príloha bez ohľadu na jeho veľkosť alebo formát.",
        "Pre pokračovanie navýšte kapacitu svojho balíka. Odstránenie už prijatého súboru z formulára kredit neobnoví.",
        "Dokúpte ďalšie strany alebo aktivujte balík s vyšším celkovým limitom.",
        "Skontrolovať zedpera_attachment_usage_log, unikátny attachment_key, requestId, totalPageLimit a serverový odpočet v /api/chat alebo /api/analyze-data/prepare.",
      );
    }

    case "ATTACHMENT_REQUEST_SAFETY_LIMIT_REACHED":
      return c(
        "V jednej požiadavke je príliš veľa príloh",
        maxRequestAttachments !== null
          ? `Jedna požiadavka môže technicky obsahovať maximálne ${maxRequestAttachments} ${attachmentWord(maxRequestAttachments)}.`
          : "Počet súborov v jednej požiadavke prekročil technický bezpečnostný limit.",
        "Technický limit jednej požiadavky chráni server, extrakciu textu a AI model pred príliš rozsiahlym vstupom.",
        "Rozdeľte súbory do viacerých samostatných požiadaviek.",
        "Nahrajte iba dokumenty potrebné pre aktuálny krok práce.",
        "Skontrolovať maxFilesCount, server multipart limit, Vercel body limit a paralelnú extrakciu.",
      );

    case "ATTACHMENT_FILE_TOO_LARGE":
      return c(
        "Súbor je príliš veľký",
        `${fileName ? `Súbor „${fileName}“` : "Vybraný súbor"} prekračuje maximálnu povolenú veľkosť${maxFileSizeMb !== null ? ` ${maxFileSizeMb} MB` : ""}.`,
        "Veľkosť jedného súboru presiahla technický limit uploadu alebo bezpečného spracovania.",
        "Zmenšite súbor, optimalizujte obrázky alebo dokument rozdeľte na menšie časti.",
        maxTotalUploadMb !== null
          ? `Sledujte aj maximálnu spoločnú veľkosť ${maxTotalUploadMb} MB pre jednu požiadavku.`
          : "Nahrajte menšiu verziu dokumentu.",
        "Skontrolovať limity frontendu, route runtime, reverse proxy, Vercel Functions a knižnice na extrakciu.",
      );

    case "ATTACHMENT_UNSUPPORTED_TYPE":
      return c(
        "Nepodporovaný formát súboru",
        `${fileName ? `Súbor „${fileName}“` : "Vybraný súbor"} nie je možné spracovať v tomto formáte.`,
        "Prípona, MIME typ alebo skutočný obsah súboru nezodpovedá povoleným formátom.",
        `Použite podporovaný formát: ${formatAllowedTypes(context.allowedTypes)}.`,
        "Súbor prekonvertujte do PDF, DOCX, XLSX, CSV, TXT alebo podporovaného obrázka.",
        "Overovať príponu, MIME typ aj magic bytes. Nepoliehať sa iba na názov súboru.",
      );

    case "ATTACHMENT_DUPLICATE":
      return c(
        "Súbor už bol pridaný",
        "Rovnaká príloha sa v aktuálnom formulári už nachádza a nebude pridaná druhýkrát.",
        "Názov, veľkosť a typ súboru zodpovedajú už pridanému súboru.",
        "Pokračujte s existujúcou prílohou alebo vyberte inú verziu dokumentu.",
        "Duplicitný súbor nie je potrebné nahrávať znova.",
        "Použiť stabilné ID alebo hash obsahu a zachovať idempotentný serverový upsert.",
      );

    case "ATTACHMENT_NOT_RECEIVED":
      return c(
        "Prílohu sa nepodarilo prijať",
        "Server nedostal celý obsah priloženého súboru a súbor nebol spracovaný.",
        "Upload mohol byť prerušený, multipart pole malo nesprávny názov alebo request prekročil limit.",
        "Skontrolujte internetové pripojenie a odošlite prílohu znova.",
        "Ponechajte súbor vo formulári a zopakujte odoslanie.",
        "Skontrolovať FormData files/file polia, receivedFiles, Content-Type, body limit a serverové logy.",
      );

    case "ATTACHMENT_EXTRACTION_FAILED":
      return c(
        "Obsah prílohy sa nepodarilo načítať",
        "Súbor bol prijatý, ale jeho text alebo štruktúru nebolo možné bezpečne spracovať.",
        "Súbor môže byť poškodený, zaheslovaný, iba naskenovaný alebo má nepodporovanú vnútornú štruktúru.",
        "Nahrajte textovú verziu dokumentu, odstráňte heslo alebo použite podporovaný formát.",
        "Pri skenovanom PDF použite OCR alebo vložte text manuálne.",
        "Skontrolovať pdf-parse, mammoth, xlsx parser, OCR fallback, dekompresiu a limity extrahovaného textu.",
      );

    case "ATTACHMENT_TRACKING_UNAVAILABLE":
      return c(
        "Evidencia príloh je dočasne nedostupná",
        "Systém momentálne nevie spoľahlivo overiť spotrebu prijatých príloh.",
        "Databázová tabuľka, migrácia alebo serverové oprávnenie pre evidenciu príloh nie je dostupné.",
        "Požiadavku skúste zopakovať neskôr. ZEDPERA nebude zobrazovať neoverený údaj.",
        "Neodosielajte rovnaký súbor opakovane, kým evidencia nie je obnovená.",
        "Skontrolovať tabuľku zedpera_attachment_usage_log, unikátny index, service role klienta a migráciu.",
      );

    case "PAYLOAD_TOO_LARGE":
      return c(
        "Súbory alebo text sú príliš rozsiahle",
        "Požiadavka je príliš veľká na spracovanie v jednom serverovom volaní.",
        "Súčet binárnych súborov, extrahovaného textu, histórie a ďalších polí prekročil technický limit.",
        "Nahrajte menej súborov, skráťte históriu alebo spracujte iba jednu kapitolu.",
        maxTotalUploadMb !== null
          ? `Celková veľkosť jednej požiadavky nesmie prekročiť ${maxTotalUploadMb} MB.`
          : "Rozdeľte požiadavku na niekoľko menších krokov.",
        "Skontrolovať body size limit, multipart parser, base64 payload, clientExtractedText a chunkovanie.",
      );

    case "PROVIDER_CONTEXT_TOO_LARGE":
      return c(
        "Text je príliš dlhý pre vybraný AI model",
        `${model ? `Model ${model}` : "Vybraný AI model"} nedokáže spracovať celý rozsah textu v jednej požiadavke.`,
        "Text, prílohy alebo história konverzácie prekročili maximálne kontextové okno modelu.",
        "Skráťte zadanie, rozdeľte dokument na kapitoly alebo zvoľte model s väčším kontextom.",
        "Nahrajte iba konkrétnu kapitolu alebo časť práce potrebnú pre aktuálnu úlohu.",
        "Obmedziť prompt, históriu a extrahovaný text; zaviesť chunkovanie, sumarizáciu a token budget.",
      );

    case "MISSING_MESSAGES":
    case "EMPTY_INPUT":
      return c(
        "Chýba zadanie",
        "Napíšte požiadavku alebo priložte podporovaný súbor.",
        "Formulár neobsahuje text, súbor ani iný spracovateľný vstup.",
        "Doplňte otázku, pokyn alebo dokument a požiadavku odošlite znova.",
        "Zadajte aspoň jednu konkrétnu vetu s požadovaným výstupom.",
        "Skontrolovať klientsku aj serverovú validáciu vstupu a trimovanie textu.",
      );

    case "INVALID_REQUEST":
      return c(
        "Požiadavka nemá správny formát",
        "Odoslané údaje nie sú úplné alebo ich server nedokáže spracovať.",
        "Chýba povinné pole, JSON je neplatný alebo frontend a API používajú rozdielnu verziu kontraktu.",
        "Obnovte stránku, skontrolujte formulár a požiadavku odošlite znova.",
        "Ak sa chyba opakuje, nepokračujte opakovaným kliknutím a kontaktujte podporu.",
        "Skontrolovať request schema, FormData názvy, verziu payloadu, Content-Type a runtime validáciu.",
      );

    case "VALIDATION_ERROR":
      return c(
        "Skontrolujte zadané údaje",
        "Niektoré údaje chýbajú alebo nemajú požadovaný formát.",
        "Hodnota poľa neprešla klientskou alebo serverovou validačnou kontrolou.",
        "Opravte zvýraznené pole a požiadavku odošlite znova.",
        "Skontrolujte povinné polia, formát e-mailu, dĺžku textu a výber projektu.",
        "Zjednotiť validačnú schému frontendu a API; vrátiť fieldErrors bez interných detailov.",
      );

    case "METHOD_NOT_ALLOWED":
      return c(
        "Operácia nie je podporovaná",
        "Použitá HTTP metóda nie je pre túto službu povolená.",
        "Frontend alebo externé volanie použilo inú metódu, než API route podporuje.",
        "Vráťte sa do aplikácie a operáciu spustite štandardným tlačidlom.",
        "Neobnovujte alebo neupravujte API URL manuálne.",
        "Skontrolovať exportované GET/POST/PUT/PATCH/DELETE handlery a Allow header.",
      );

    case "NOT_FOUND":
      return c(
        "Požadovaný obsah sa nenašiel",
        "Stránka, projekt, súbor, model alebo API endpoint neexistuje alebo nie je dostupný.",
        "Zdroj mohol byť odstránený, premenovaný alebo používateľ nemá prístup k jeho aktuálnej verzii.",
        "Vráťte sa na dashboard a otvorte obsah znova.",
        "Skontrolujte, či používate aktuálny odkaz a správny účet.",
        "Skontrolovať route, dynamické parametre, databázové ID, názov AI modelu a deploy.",
      );

    case "RATE_LIMITED":
      return c(
        "Služba je dočasne vyťažená",
        retryAfter !== null
          ? `Počet požiadaviek bol dočasne obmedzený. Skúste to znova približne o ${retryAfter} sekúnd.`
          : "Počet požiadaviek bol dočasne obmedzený. Skúste to znova o chvíľu.",
        "V krátkom čase bolo odoslaných príliš veľa požiadaviek alebo bol prekročený limit poskytovateľa.",
        "Počkajte a požiadavku zopakujte. Neodosielajte ju opakovane vo viacerých oknách.",
        "Môžete dočasne zvoliť iný AI model alebo zjednodušiť vyhľadávanie zdrojov.",
        "Zaviesť exponential backoff, Retry-After, deduplikáciu, queue a obmedzenie paralelných volaní.",
      );

    case "REQUEST_TIMEOUT":
      return c(
        "Spracovanie trvalo príliš dlho",
        "Server alebo AI model nedokončil požiadavku v povolenom čase.",
        "Požiadavka je rozsiahla, extrakcia súboru trvá dlho alebo externá služba odpovedá pomaly.",
        "Zmenšite rozsah zadania alebo počet príloh a skúste to znova.",
        "Spracujte jednu kapitolu alebo jeden dátový súbor naraz.",
        "Optimalizovať spracovanie, zvýšiť maxDuration, použiť stream, queue alebo asynchrónny job.",
      );

    case "NETWORK_ERROR":
      return c(
        "Pripojenie bolo prerušené",
        "ZEDPERA sa nedokázala spojiť so serverom alebo externou službou.",
        "Internetové spojenie, DNS, socket alebo služba poskytovateľa mohli byť dočasne nedostupné.",
        "Skontrolujte pripojenie a požiadavku zopakujte.",
        "Ponechajte stránku otvorenú, aby sa neuložený text nestratil.",
        "Skontrolovať Vercel logy, externé URL, DNS, fetch timeout, proxy a stav poskytovateľa.",
      );

    case "API_UNAVAILABLE":
      return c(
        "Služba je dočasne nedostupná",
        "Požadovaná časť systému momentálne neodpovedá.",
        "API route, AI poskytovateľ alebo interná závislosť je dočasne mimo prevádzky.",
        "Vaše údaje zostali zachované. Skúste požiadavku zopakovať neskôr.",
        "Môžete použiť iný modul alebo AI model, ak je dostupný.",
        "Skontrolovať health endpointy, deploy, runtime chyby, fallback model a monitoring.",
      );

    case "PROVIDER_INVALID_API_KEY":
      return c(
        "AI služba nie je správne nakonfigurovaná",
        `${provider || "Poskytovateľ AI"} odmietol serverové overenie${model ? ` pre model ${model}` : ""}.`,
        "API kľúč chýba, je neplatný, expirovaný alebo bol uložený do nesprávneho prostredia.",
        "Použite iný dostupný AI model alebo kontaktujte podporu.",
        "Používateľ nemusí meniť svoje osobné údaje ani platobnú kartu.",
        "Skontrolovať správnu environment premennú, scope kľúča, Vercel environment a redeploy. Nikdy nevypisovať hodnotu kľúča do logu.",
      );

    case "PROVIDER_ACCESS_DENIED":
      return c(
        "AI služba odmietla prístup",
        `${model ? `Model ${model}` : "Zvolený model"} nie je dostupný pre aktuálny serverový účet alebo región.`,
        "Účet nemá povolenie používať model, projekt, organizáciu alebo konkrétnu funkciu.",
        "Zvoľte iný dostupný AI model.",
        "Ak je model povinný, kontaktujte podporu.",
        "Skontrolovať oprávnenia organizácie, projekt, región, model access a serverové hlavičky.",
      );

    case "PROVIDER_BILLING_EXHAUSTED":
      return c(
        "Kredit AI poskytovateľa bol vyčerpaný",
        `${provider || "Vybraný AI poskytovateľ"} momentálne nepovoľuje ďalšie spracovanie pre nedostatočný kredit alebo neaktívnu fakturáciu.`,
        "Na serverovom účte je nulový zostatok, prekročený hard limit alebo neaktívny billing.",
        "Dočasne zvoľte iný dostupný AI model.",
        "Požiadavku môžete zopakovať po obnovení kreditu.",
        "Doplniť kredit, skontrolovať billing, hard limit, projektový rozpočet a správny API účet.",
      );

    case "PROVIDER_QUOTA_EXCEEDED":
      return c(
        "Kapacita AI služby je dočasne vyčerpaná",
        "Poskytovateľ AI momentálne nepovoľuje ďalšie spracovanie v rámci aktuálnej kvóty.",
        "Bol dosiahnutý denný, mesačný alebo projektový limit poskytovateľa.",
        "Skúste požiadavku zopakovať neskôr alebo zvoľte iný model.",
        "Neodosielajte rovnakú požiadavku opakovane bez prestávky.",
        "Skontrolovať quota dashboard, projektové limity, Retry-After a fallback poskytovateľa.",
      );

    case "PROVIDER_MODEL_NOT_FOUND":
      return c(
        "Zvolený AI model nie je dostupný",
        `${model ? `Model ${model}` : "Model"} bol premenovaný, odstránený alebo nie je dostupný pre serverový účet.`,
        "Konfigurácia používa neplatný názov modelu alebo provider ukončil jeho podporu.",
        "Zvoľte iný dostupný AI model.",
        "Obnovte stránku, aby sa načítal aktuálny zoznam modelov.",
        "Aktualizovať názvy modelov, validačný zoznam, fallback a dokumentáciu poskytovateľa.",
      );

    case "PROVIDER_BAD_GATEWAY":
      return c(
        "AI služba neodpovedala správne",
        "Medzi ZEDPERA a poskytovateľom AI vznikla komunikačná chyba.",
        "Poskytovateľ vrátil neplatnú odpoveď, prerušil spojenie alebo je jeho gateway dočasne nedostupná.",
        "Počkajte chvíľu a požiadavku zopakujte alebo použite iný model.",
        "Vaše zadanie ponechajte otvorené.",
        "Skontrolovať status poskytovateľa, raw HTTP status, proxy, timeout a fallback model.",
      );

    case "AI_RESPONSE_INVALID":
      return c(
        "AI vrátila odpoveď v nesprávnom formáte",
        "Systém očakával štruktúrovaný výstup, ale odpoveď sa nedala bezpečne spracovať.",
        "Model nedodržal JSON schému, odpoveď bola skrátená alebo obsahovala neplatný formát.",
        "Požiadavku zopakujte alebo zvoľte iný model.",
        "Pri opakovanej chybe zjednodušte požadovanú štruktúru výstupu.",
        "Použiť schema output, JSON mode, robustný parser, validačný retry a bezpečný textový fallback.",
      );

    case "AI_CONTENT_BLOCKED":
      return c(
        "Požiadavka bola zablokovaná bezpečnostnými pravidlami",
        "AI model odmietol spracovať obsah z bezpečnostných alebo politických dôvodov.",
        "Text alebo pokyn mohol obsahovať citlivý, zakázaný alebo rizikový obsah.",
        "Preformulujte zadanie tak, aby bolo vecné, akademické a bezpečné.",
        "Odstráňte problematickú časť textu a požiadavku odošlite znova.",
        "Skontrolovať safety response poskytovateľa, moderáciu vstupu a zobraziť iba bezpečný verejný dôvod.",
      );

    case "FILE_PROCESSING_FAILED":
      return c(
        "Súbor sa nepodarilo spracovať",
        "Aplikácia nedokázala bezpečne načítať alebo extrahovať obsah súboru.",
        "Súbor môže byť poškodený, zaheslovaný, príliš veľký alebo má nepodporovanú štruktúru.",
        "Nahrajte menší alebo textový dokument, prípadne vložte text manuálne.",
        "Skontrolujte, či sa súbor dá otvoriť v pôvodnej aplikácii.",
        "Skontrolovať MIME detekciu, parser, dekompresiu, časové limity a sanitizáciu súboru.",
      );

    case "PDF_OCR_REQUIRED":
      return c(
        "PDF pravdepodobne obsahuje iba sken alebo obrázky",
        "Zo súboru sa nepodarilo získať čitateľný text.",
        "PDF nemá textovú vrstvu a obsahuje iba obrazové stránky.",
        "Použite OCR, nahrajte textovú verziu PDF alebo Word dokument.",
        "Text môžete vložiť aj manuálne do zadania.",
        "Doplniť OCR pipeline, detekciu image-only PDF a limit počtu OCR strán.",
      );

    case "DATA_FILE_REQUIRED":
      return c(
        "Nahrajte dátový súbor",
        "Analýza dát vyžaduje aspoň jeden podporovaný súbor.",
        "Vo formulári alebo FormData sa nenachádza tabuľka určená na analýzu.",
        "Nahrajte XLSX, XLS alebo CSV súbor.",
        "Skontrolujte, či bol súbor vybraný pred spustením analýzy.",
        "Overiť file/files pole, multipart parsing a serverovú validáciu.",
      );

    case "DATA_FILE_INVALID":
      return c(
        "Dátový súbor nie je možné použiť",
        "Tabuľka nemá podporovaný formát alebo neobsahuje spracovateľné údaje.",
        "Chýba hlavička, hárok je prázdny, stĺpce sú nekonzistentné alebo súbor je poškodený.",
        "Použite XLSX, XLS alebo CSV s hlavičkou stĺpcov a konzistentnými dátami.",
        "Odstráňte úplne prázdne riadky, zlúčené bunky a heslo zo súboru.",
        "Skontrolovať workbook parser, sheet selection, header inference, encoding a dátové typy.",
      );

    case "DATA_PREPARATION_FAILED":
      return c(
        "Príprava dát zlyhala",
        "Súbor bol prijatý, ale nepodarilo sa pripraviť čistú dátovú tabuľku.",
        "Pri čistení, konverzii typov, tvorbe prepared súboru alebo kontrole kvality nastala chyba.",
        "Skontrolujte štruktúru tabuľky a prípravu zopakujte.",
        "Použite jednoduchší súbor s jedným hlavným hárkom.",
        "Skontrolovať prepare route, XLSX zápis, dátovú normalizáciu, kvalitatívny report a limity pamäte.",
      );

    case "DATA_ANALYSIS_FAILED":
      return c(
        "Analýzu dát sa nepodarilo dokončiť",
        "Pri výpočte alebo interpretácii výsledkov nastala chyba.",
        "Dáta nemajú dostatok platných hodnôt, zvolený test nie je vhodný alebo výpočet zlyhal.",
        "Skontrolujte premenné, typ testu a chýbajúce hodnoty.",
        "Najprv spustite prípravu dát a deskriptívnu kontrolu.",
        "Skontrolovať matematické podmienky testu, NaN/Infinity, veľkosť vzorky a serverové logy.",
      );

    case "EXPORT_FAILED":
      return c(
        "Export sa nepodarilo vytvoriť",
        "Výsledok môže byť dostupný v aplikácii, ale súbor na stiahnutie sa nepodarilo pripraviť.",
        "Generovanie Word, PDF, PPTX alebo Excel súboru zlyhalo pri skladaní dokumentu alebo grafov.",
        "Export zopakujte alebo zvoľte iný formát.",
        "Pred ďalším pokusom ponechajte výsledok otvorený.",
        "Skontrolovať knižnicu exportu, fonty, obrázky, grafy, buffer, Content-Disposition a pamäť.",
      );

    case "DATABASE_ERROR":
      return c(
        "Údaje sa nepodarilo načítať alebo uložiť",
        "Databáza momentálne nedokončila požadovanú operáciu.",
        "Môže chýbať tabuľka, stĺpec, migrácia, RLS oprávnenie alebo nastala konfliktná zmena údajov.",
        "Požiadavku zopakujte. Ak problém pretrváva, kontaktujte podporu.",
        "Nezadávajte rovnakú platbu alebo objednávku opakovane bez overenia výsledku.",
        "Skontrolovať Supabase/Postgres log, migrácie, RLS, constraint, service role a query detail. SQL detail neukazovať používateľovi.",
      );

    case "ACADEMIC_SOURCES_ERROR":
      return c(
        "Niektorý zdroj vedeckých databáz neodpovedal",
        `${sourceProvider || "Externá akademická databáza"} momentálne nevrátila úplný výsledok.`,
        "Databáza mohla prekročiť rate limit, byť nedostupná alebo vrátiť neplatnú odpoveď.",
        "Skúste presnejšie kľúčové slová alebo vyhľadávanie zopakujte neskôr.",
        "Výsledok overte aj v ďalších dostupných databázach.",
        "Skontrolovať API kľúče, identifikačný e-mail, rate limit, timeout, parser a čiastočný fallback.",
      );

    case "PAYMENT_FAILED":
      return c(
        "Platbu alebo aktiváciu balíka sa nepodarilo dokončiť",
        "Platobná operácia nebola potvrdená alebo sa balík neaktivoval.",
        "Platba mohla byť zamietnutá, checkout relácia expirovala alebo webhook neprešiel overením.",
        "Skontrolujte stav platby a operáciu zopakujte iba vtedy, ak nebola zaúčtovaná.",
        "Pri zaúčtovanej platbe kontaktujte podporu a uveďte referenčné ID.",
        "Skontrolovať Stripe event log, checkout session, webhook signature, idempotency key a entitlement update.",
      );

    case "MISSING_ENVIRONMENT_VARIABLE":
      return c(
        "Chýba potrebné nastavenie aplikácie",
        "ZEDPERA momentálne nemá k dispozícii serverovú konfiguráciu potrebnú pre túto funkciu.",
        "Chýba environment premenná, API URL, secret alebo hodnota nebola nasadená do správneho prostredia.",
        "Použite inú dostupnú funkciu alebo kontaktujte podporu.",
        "Používateľ nemá opravovať konfiguráciu vo svojom prehliadači.",
        "Skontrolovať .env.local, Vercel Environment Variables, Production/Preview scope a po zmene vykonať redeploy. Hodnotu secretu nelogovať.",
      );

    case "PROFILE_LOAD_FAILED":
      return c(
        "Profil sa nepodarilo načítať",
        "Údaje profilu momentálne nie sú dostupné.",
        "Server, databáza alebo lokálna synchronizácia profilu zlyhala.",
        "Obnovte načítanie profilu. Neuložené zmeny si predtým skopírujte.",
        "Skontrolujte internetové pripojenie a správny používateľský účet.",
        "Skontrolovať profile API, Supabase query, RLS, localStorage fallback a mapovanie jazykov.",
      );

    case "PROFILE_SAVE_FAILED":
      return c(
        "Profil sa nepodarilo uložiť",
        "Vaše zmeny neboli potvrdené serverom.",
        "Zápis do databázy zlyhal alebo údaje neprešli validačnou kontrolou.",
        "Ponechajte stránku otvorenú, skontrolujte údaje a uloženie zopakujte.",
        "Dôležitý text si pred opakovaním skopírujte.",
        "Skontrolovať profilovú schému, upsert, RLS, povinné polia a serverové logy.",
      );

    case "PROJECT_LOAD_FAILED":
      return c(
        "Projekt sa nepodarilo načítať",
        "Rozpracovaná práca alebo jej dokumenty momentálne nie sú dostupné.",
        "Projekt bol odstránený, používateľ nemá prístup alebo zlyhalo načítanie databázy.",
        "Vráťte sa na zoznam projektov a projekt otvorte znova.",
        "Skontrolujte, či ste prihlásený v správnom účte.",
        "Skontrolovať projectId, vlastníctvo, RLS, query a migrácie projektovej tabuľky.",
      );

    case "HISTORY_SAVE_FAILED":
      return c(
        "Výstup sa neuložil do histórie",
        "Generovanie mohlo prebehnúť, ale záznam histórie sa nepodarilo uložiť.",
        "Databázový zápis, veľkosť obsahu alebo oprávnenie pre históriu zlyhalo.",
        "Skopírujte si výsledok a uloženie skúste zopakovať.",
        "Nezatvárajte stránku, kým nemáte výsledok uložený inde.",
        "Skontrolovať /api/history, veľkosť payloadu, RLS, 413 limit a sanitizáciu obsahu.",
      );

    case "INTERNAL_SERVER_ERROR":
      return c(
        "Nastala vnútorná chyba systému",
        "ZEDPERA nedokázala požiadavku bezpečne dokončiť.",
        "Pri spracovaní nastala neočakávaná serverová chyba.",
        "Vaše lokálne zadané údaje zostali zachované. Požiadavku skúste zopakovať.",
        "Ak sa chyba opakuje, kontaktujte podporu a uveďte referenčné ID.",
        "Skontrolovať serverové logy podľa requestId/errorId, stack trace, vstupné dáta a posledný deploy.",
      );

    case "UNKNOWN_ERROR":
    default:
      return c(
        "Požiadavku sa nepodarilo dokončiť",
        "ZEDPERA nedokázala požiadavku bezpečne dokončiť.",
        "Chybu sa nepodarilo zaradiť do známej kategórie bez zobrazenia interných detailov.",
        "Skúste požiadavku zopakovať alebo obnovte stránku.",
        "Ak problém pretrváva, kontaktujte podporu a uveďte referenčné ID.",
        "Vyhľadať requestId/errorId v serverových logoch a doplniť nový stabilný kód do api-error-messages.ts.",
      );
  }
}

function buildLocalizedCoreCopy(
  code: ZedperaKnownErrorCode,
  context: ZedperaErrorContext,
  language: Exclude<ZedperaLanguage, "sk">,
): ErrorCopy | null {
  const limit = safeInteger(context.attachmentLimit);
  const received = safeInteger(context.receivedAttachments);

  const translated: Partial<
    Record<
      ZedperaKnownErrorCode,
      Record<Exclude<ZedperaLanguage, "sk">, ErrorCopy>
    >
  > = {
    AUTH_REQUIRED: {
      cs: lc("Je vyžadováno přihlášení", "Pro pokračování se přihlaste ke svému účtu ZEDPERA."),
      en: lc("Sign-in required", "Please sign in to your ZEDPERA account to continue."),
      de: lc("Anmeldung erforderlich", "Bitte melden Sie sich bei Ihrem ZEDPERA-Konto an."),
      pl: lc("Wymagane logowanie", "Zaloguj się do konta ZEDPERA, aby kontynuować."),
      hu: lc("Bejelentkezés szükséges", "A folytatáshoz jelentkezzen be ZEDPERA-fiókjába."),
    },
    ATTACHMENT_LIMIT_REACHED: {
      cs: lc(
        "Limit příloh byl dosažen",
        limit !== null
          ? `Aktivní balíček umožňuje celkem nejvýše ${limit} příloh.${received !== null ? ` Tento požadavek obsahuje ${received}.` : ""}`
          : "Limit přijatých příloh byl dosažen.",
      ),
      en: lc(
        "Attachment limit reached",
        limit !== null
          ? `Your active plan allows up to ${limit} attachments in total.${received !== null ? ` This request contains ${received}.` : ""}`
          : "The accepted attachment limit has been reached.",
      ),
      de: lc(
        "Anhangslimit erreicht",
        limit !== null
          ? `Ihr aktives Paket erlaubt insgesamt höchstens ${limit} Anhänge.${received !== null ? ` Diese Anfrage enthält ${received}.` : ""}`
          : "Das Limit für angenommene Anhänge wurde erreicht.",
      ),
      pl: lc(
        "Osiągnięto limit załączników",
        limit !== null
          ? `Aktywny pakiet pozwala łącznie przyjąć maksymalnie ${limit} załączników.${received !== null ? ` To żądanie zawiera ${received}.` : ""}`
          : "Osiągnięto limit przyjętych załączników.",
      ),
      hu: lc(
        "Elérte a mellékletek korlátját",
        limit !== null
          ? `Az aktív csomag összesen legfeljebb ${limit} mellékletet engedélyez.${received !== null ? ` Ez a kérés ${received} fájlt tartalmaz.` : ""}`
          : "Elérte a fogadott mellékletek korlátját.",
      ),
    },
    PAGE_LIMIT_REACHED: {
      cs: lc("Limit stran byl vyčerpán", "Generování bylo zastaveno, protože byl využit dostupný rozsah stran."),
      en: lc("Page limit reached", "Generation stopped because the available page allowance has been used."),
      de: lc("Seitenlimit erreicht", "Die Generierung wurde gestoppt, da das verfügbare Seitenkontingent aufgebraucht ist."),
      pl: lc("Osiągnięto limit stron", "Generowanie zostało zatrzymane, ponieważ wykorzystano dostępny limit stron."),
      hu: lc("Elérte az oldalkorlátot", "A generálás leállt, mert a rendelkezésre álló oldalkeret elfogyott."),
    },
    PROMPT_LIMIT_REACHED: {
      cs: lc("Limit požadavků byl vyčerpán", "Aktivní balíček již neobsahuje další AI požadavky."),
      en: lc("AI request limit reached", "Your active plan has no additional AI requests available."),
      de: lc("KI-Anfragelimit erreicht", "Ihr aktives Paket enthält keine weiteren KI-Anfragen."),
      pl: lc("Osiągnięto limit żądań AI", "Aktywny pakiet nie zawiera już kolejnych żądań AI."),
      hu: lc("Elérte az AI-kérések korlátját", "Az aktív csomagban nincs több elérhető AI-kérés."),
    },
    NETWORK_ERROR: {
      cs: lc("Připojení bylo přerušeno", "ZEDPERA se nemohla spojit se serverem."),
      en: lc("Connection interrupted", "ZEDPERA could not connect to the server."),
      de: lc("Verbindung unterbrochen", "ZEDPERA konnte keine Verbindung zum Server herstellen."),
      pl: lc("Połączenie zostało przerwane", "ZEDPERA nie mogła połączyć się z serwerem."),
      hu: lc("A kapcsolat megszakadt", "A ZEDPERA nem tudott kapcsolódni a szerverhez."),
    },
    INTERNAL_SERVER_ERROR: {
      cs: lc("Došlo k interní chybě systému", "ZEDPERA nedokázala požadavek bezpečně dokončit."),
      en: lc("An internal system error occurred", "ZEDPERA could not complete the request safely."),
      de: lc("Ein interner Systemfehler ist aufgetreten", "ZEDPERA konnte die Anfrage nicht sicher abschließen."),
      pl: lc("Wystąpił wewnętrzny błąd systemu", "ZEDPERA nie mogła bezpiecznie zakończyć żądania."),
      hu: lc("Belső rendszerhiba történt", "A ZEDPERA nem tudta biztonságosan befejezni a kérést."),
    },
  };

  return translated[code]?.[language] || null;
}

function lc(title: string, message: string): ErrorCopy {
  return {
    title,
    message,
    reason: message,
    solution: message,
    userAction: message,
    adminAction:
      "Use the request reference ID to inspect server logs and the centralized ZEDPERA error catalog.",
  };
}

function c(
  title: string,
  message: string,
  reason: string,
  solution: string,
  userAction: string,
  adminAction: string,
): ErrorCopy {
  return {
    title,
    message,
    reason,
    solution,
    userAction,
    adminAction,
  };
}

function normalizeCodeText(value: unknown): string {
  return cleanText(value)
    .toUpperCase()
    .replace(/[\s./:-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function explicitCodeFromUnknown(error: unknown): string {
  const root = asRecord(error);
  const nested = asRecord(root?.error);

  return (
    readString(root, [
      "code",
      "errorCode",
      "error_code",
      "technicalCode",
      "technical_code",
    ]) ||
    readString(nested, [
      "code",
      "errorCode",
      "error_code",
      "technicalCode",
      "technical_code",
    ])
  );
}

function inferCodeFromText(
  error: unknown,
  status?: number | null,
  context: ZedperaErrorContext = {},
): ZedperaKnownErrorCode {
  const text = normalizeErrorText(error);
  const endpoint = cleanText(context.endpoint).toLowerCase();

  /**
   * Poradie je zámerné:
   * - špecifické chyby sa vyhodnocujú pred všeobecnými HTTP kódmi,
   * - OCR pred všeobecnou file/parse chybou,
   * - akademické zdroje pred všeobecným 500,
   * - provider billing pred aplikačným 402 limitom.
   */
  if (
    text.includes("attachment_limit_reached") ||
    text.includes("too_many_attachments") ||
    text.includes("attachment quota")
  ) return "ATTACHMENT_LIMIT_REACHED";

  if (
    text.includes("scanned pdf") ||
    text.includes("image-only") ||
    text.includes("image only") ||
    text.includes("ocr required") ||
    text.includes("no text found in pdf") ||
    text.includes("empty pdf")
  ) return "PDF_OCR_REQUIRED";

  if (
    text.includes("semantic scholar") ||
    text.includes("openalex") ||
    text.includes("crossref") ||
    text.includes("europe pmc") ||
    text.includes("unpaywall") ||
    text.includes("arxiv") ||
    text.includes("sources_failed")
  ) return "ACADEMIC_SOURCES_ERROR";

  if (
    text.includes("stripe") ||
    text.includes("checkout") ||
    text.includes("payment_intent") ||
    text.includes("webhook signature") ||
    text.includes("signature verification failed")
  ) return "PAYMENT_FAILED";

  if (
    text.includes("relation does not exist") ||
    text.includes("permission denied for table") ||
    text.includes("duplicate key") ||
    text.includes("postgres") ||
    text.includes("supabase") ||
    text.includes("database error") ||
    text.includes("sqlstate")
  ) return "DATABASE_ERROR";

  if (
    text.includes("missing environment") ||
    text.includes("environment variable") ||
    text.includes("required_environment_variable_missing") ||
    text.includes("process.env") ||
    text.includes("undefined api key")
  ) return "MISSING_ENVIRONMENT_VARIABLE";

  if (
    text.includes("invalid api key") ||
    text.includes("incorrect api key") ||
    text.includes("api key invalid") ||
    text.includes("missing api key") ||
    text.includes("provider_auth_error")
  ) return "PROVIDER_INVALID_API_KEY";

  if (
    text.includes("insufficient_quota") ||
    text.includes("billing hard limit") ||
    text.includes("account has insufficient balance") ||
    text.includes("check your plan and billing") ||
    text.includes("prepaid balance") ||
    text.includes("out of credit")
  ) return "PROVIDER_BILLING_EXHAUSTED";

  if (
    text.includes("context_length_exceeded") ||
    text.includes("context length") ||
    text.includes("maximum context") ||
    text.includes("too many tokens") ||
    text.includes("input is too long") ||
    text.includes("prompt is too long") ||
    text.includes("token limit")
  ) return "PROVIDER_CONTEXT_TOO_LARGE";

  if (
    text.includes("model not found") ||
    text.includes("unknown model") ||
    text.includes("does not exist") && text.includes("model")
  ) return "PROVIDER_MODEL_NOT_FOUND";

  if (
    text.includes("content policy") ||
    text.includes("policy violation") ||
    text.includes("safety blocked") ||
    text.includes("content blocked") ||
    text.includes("harmful content") ||
    text.includes("model refused")
  ) return "AI_CONTENT_BLOCKED";

  if (
    text.includes("invalid json") ||
    text.includes("not valid json") ||
    text.includes("unexpected token") ||
    text.includes("failed to parse response") ||
    text.includes("schema validation") ||
    text.includes("structured output")
  ) return "AI_RESPONSE_INVALID";

  if (
    text.includes("payload_too_large") ||
    text.includes("function_payload_too_large") ||
    text.includes("request entity too large") ||
    text.includes("body exceeded") ||
    text.includes("request body too large")
  ) return "PAYLOAD_TOO_LARGE";

  if (
    text.includes("unsupported file") ||
    text.includes("unsupported mime") ||
    text.includes("invalid file type")
  ) return "ATTACHMENT_UNSUPPORTED_TYPE";

  if (
    text.includes("file too large") ||
    text.includes("max file size")
  ) return "ATTACHMENT_FILE_TOO_LARGE";

  if (
    text.includes("extraction failed") ||
    text.includes("extract text") ||
    text.includes("pdf parse") ||
    text.includes("mammoth") ||
    text.includes("corrupt file") ||
    text.includes("damaged file") ||
    text.includes("password protected")
  ) return "ATTACHMENT_EXTRACTION_FAILED";

  if (
    text.includes("file processing failed") ||
    text.includes("upload failed")
  ) return "FILE_PROCESSING_FAILED";

  if (
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("requests per minute") ||
    text.includes("tokens per minute") ||
    text.includes("slow down")
  ) return "RATE_LIMITED";

  if (
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("deadline exceeded") ||
    text.includes("max duration") ||
    text.includes("aborterror")
  ) return "REQUEST_TIMEOUT";

  if (
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("networkerror") ||
    text.includes("econnreset") ||
    text.includes("enotfound") ||
    text.includes("dns") ||
    text.includes("socket hang up")
  ) return "NETWORK_ERROR";

  if (
    text.includes("bad gateway") ||
    text.includes("gateway error")
  ) return "PROVIDER_BAD_GATEWAY";

  if (
    text.includes("service unavailable") ||
    text.includes("temporarily unavailable") ||
    text.includes("model overloaded") ||
    text.includes("server overloaded")
  ) return "API_UNAVAILABLE";

  if (
    text.includes("unauthorized") ||
    text.includes("authentication required") ||
    text.includes("not authenticated") ||
    text.includes("session expired")
  ) {
    return endpoint.startsWith("/api/")
      ? "AUTH_REQUIRED"
      : "PROVIDER_INVALID_API_KEY";
  }

  if (
    text.includes("forbidden") ||
    text.includes("permission denied") ||
    text.includes("access denied")
  ) return "ACCESS_DENIED";

  if (
    text.includes("workbook") ||
    text.includes("spreadsheet") ||
    text.includes("data preparation")
  ) return "DATA_PREPARATION_FAILED";

  if (status === 401) return "AUTH_REQUIRED";
  if (status === 402) return "PROMPT_LIMIT_REACHED";
  if (status === 403) return "ACCESS_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 405) return "METHOD_NOT_ALLOWED";
  if (status === 408 || status === 504) return "REQUEST_TIMEOUT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 415) return "ATTACHMENT_UNSUPPORTED_TYPE";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status === 502) return "PROVIDER_BAD_GATEWAY";
  if (status === 503) return "API_UNAVAILABLE";
  if (status && status >= 500) return "INTERNAL_SERVER_ERROR";

  return "UNKNOWN_ERROR";
}

export function normalizeZedperaErrorCode(
  value: unknown,
  status?: number | null,
): ZedperaKnownErrorCode {
  const normalized = normalizeCodeText(value);

  if (normalized in DEFINITIONS) {
    return normalized as ZedperaKnownErrorCode;
  }

  if (CODE_ALIASES[normalized]) {
    return CODE_ALIASES[normalized];
  }

  if (normalized.startsWith("HTTP_")) {
    const embeddedStatus = Number(normalized.match(/\d{3}/)?.[0]);
    if (Number.isFinite(embeddedStatus)) {
      return inferCodeFromText(normalized, embeddedStatus);
    }
  }

  return inferCodeFromText(normalized, status);
}

function actionFor(
  definition: ErrorDefinition,
  language: ZedperaLanguage,
  context: ZedperaErrorContext,
): {
  actionLabel?: string;
  actionUrl?: string;
  secondaryActionLabel?: string;
  secondaryActionUrl?: string;
} {
  const labels = getZedperaUiLabels(language);

  switch (definition.actionKind) {
    case "login":
      return {
        actionLabel: labels.login,
        actionUrl: cleanText(context.loginUrl) || "/login",
      };
    case "pricing":
      return {
        actionLabel: labels.pricing,
        actionUrl: cleanText(context.purchaseUrl) || "/pricing",
      };
    case "capacity":
      return {
        actionLabel: labels.capacity,
        actionUrl:
          cleanText(context.purchaseUrl) ||
          "/pricing#doplnkove-sluzby",
      };
    case "back":
      return {
        actionLabel: labels.back,
        actionUrl: "/dashboard",
      };
    case "switch-model":
      return {
        actionLabel: labels.switchModel,
      };
    case "contact-support":
      return {
        actionLabel: labels.contactSupport,
        actionUrl: cleanText(context.supportUrl) || "/contact",
      };
    case "retry":
      return {
        actionLabel: labels.retry,
      };
    default:
      return {};
  }
}

export function createZedperaError(
  code: ZedperaErrorCode,
  context: ZedperaErrorContext = {},
  options: {
    language?: ZedperaLanguage | string | null;
    status?: number | null;
    title?: string | null;
    message?: string | null;
    reason?: string | null;
    solution?: string | null;
    userAction?: string | null;
    adminAction?: string | null;
    detail?: string | null;
    preserveServerMessageForUnknownCode?: boolean;
  } = {},
): ZedperaErrorInfo {
  const language = normalizeZedperaLanguage(options.language);
  const rawCode = cleanText(code) || "UNKNOWN_ERROR";
  const canonicalCode = normalizeZedperaErrorCode(
    rawCode,
    options.status ?? context.status,
  );
  const definition = DEFINITIONS[canonicalCode];
  const copy = buildCopy(canonicalCode, context, language);

  const isKnownRawCode =
    normalizeCodeText(rawCode) in DEFINITIONS ||
    Boolean(CODE_ALIASES[normalizeCodeText(rawCode)]);

  const serverMessage = cleanText(context.serverMessage);
  const serverDetail = cleanText(context.serverDetail);
  const rawMessage = cleanText(context.rawMessage);

  const status =
    safeInteger(options.status) ??
    safeInteger(context.status) ??
    definition.status;

  const title = cleanText(options.title) || copy.title;
  const message =
    cleanText(options.message) ||
    (!isKnownRawCode &&
    options.preserveServerMessageForUnknownCode === true &&
    serverMessage
      ? serverMessage
      : copy.message);

  const reason = cleanText(options.reason) || copy.reason;
  const solution = cleanText(options.solution) || copy.solution;
  const userAction = cleanText(options.userAction) || copy.userAction;
  const adminAction = cleanText(options.adminAction) || copy.adminAction;

  const detail =
    cleanText(options.detail) ||
    (!isKnownRawCode && serverDetail ? serverDetail : "");

  const requestId = cleanText(context.requestId);
  const errorId = cleanText(context.errorId);
  const endpoint = cleanText(context.endpoint);
  const module = cleanText(context.module);

  return {
    ok: false,
    code: rawCode,
    canonicalCode,
    technicalCode: canonicalCode,
    status,

    title,
    message,
    reason,
    solution,
    userAction,
    adminAction,
    ...(detail ? { detail } : {}),

    ...(rawMessage || serverDetail
      ? {
          technicalDetail: [rawMessage, serverDetail]
            .filter(Boolean)
            .join(" | "),
        }
      : {}),

    category: definition.category,
    severity: definition.severity,
    retryable: definition.retryable,
    blocking: definition.blocking,

    actionKind: definition.actionKind,
    ...actionFor(definition, language, context),

    ...(requestId ? { requestId } : {}),
    ...(errorId ? { errorId } : {}),
    ...(endpoint ? { endpoint } : {}),
    ...(module ? { module } : {}),

    attachmentLimit: safeInteger(context.attachmentLimit),
    attachmentsUsed: safeInteger(context.attachmentsUsed),
    attachmentsRemaining: safeInteger(context.attachmentsRemaining),
    receivedAttachments: safeInteger(context.receivedAttachments),
    maxRequestAttachments: safeInteger(context.maxRequestAttachments),
    maxFileSizeMb: safeInteger(context.maxFileSizeMb),
    maxTotalUploadMb: safeInteger(context.maxTotalUploadMb),

    promptLimit: safeInteger(context.promptLimit),
    promptsUsed: safeInteger(context.promptsUsed),
    promptsRemaining: safeInteger(context.promptsRemaining),

    pageLimit: safeInteger(context.pageLimit),
    pagesUsed: safeInteger(context.pagesUsed),
    pagesRemaining: safeInteger(context.pagesRemaining),

    retryAfterSeconds: safeInteger(context.retryAfterSeconds),
  };
}

function payloadContext(
  payload: unknown,
  options: {
    status?: number | null;
    endpoint?: string | null;
    module?: string | null;
    requestId?: string | null;
  },
): {
  code: string;
  context: ZedperaErrorContext;
} {
  const root = asRecord(payload);
  const nested = asRecord(root?.error);

  const code =
    readString(root, [
      "code",
      "errorCode",
      "error_code",
      "technicalCode",
      "technical_code",
    ]) ||
    readString(nested, [
      "code",
      "errorCode",
      "error_code",
      "technicalCode",
      "technical_code",
    ]) ||
    explicitCodeFromUnknown(payload) ||
    `HTTP_${options.status || 500}`;

  const serverMessage =
    readString(root, ["message", "error", "title"]) ||
    readString(nested, ["message", "error", "title"]);

  const serverDetail =
    readString(root, ["detail", "details", "description"]) ||
    readString(nested, ["detail", "details", "description"]);

  const context: ZedperaErrorContext = {
    status: options.status,
    endpoint: options.endpoint,
    module:
      readString(root, ["module"]) ||
      readString(nested, ["module"]) ||
      options.module,
    requestId:
      readString(root, ["requestId", "request_id"]) ||
      readString(nested, ["requestId", "request_id"]) ||
      options.requestId,
    errorId:
      readString(root, ["errorId", "error_id"]) ||
      readString(nested, ["errorId", "error_id"]),

    serverCode: code,
    serverMessage,
    serverDetail,
    rawMessage:
      readString(root, ["rawMessage", "raw_message"]) ||
      readString(nested, ["rawMessage", "raw_message"]),

    purchaseUrl:
      readString(root, ["purchaseUrl", "purchase_url", "actionUrl"]) ||
      readString(nested, ["purchaseUrl", "purchase_url", "actionUrl"]),
    loginUrl:
      readString(root, ["loginUrl", "login_url"]) ||
      readString(nested, ["loginUrl", "login_url"]),

    attachmentLimit:
      readNumber(root, ["attachmentLimit", "attachment_limit"]) ??
      readNumber(nested, ["attachmentLimit", "attachment_limit"]),
    attachmentsUsed:
      readNumber(root, ["attachmentsUsed", "attachments_used"]) ??
      readNumber(nested, ["attachmentsUsed", "attachments_used"]),
    attachmentsRemaining:
      readNumber(root, [
        "attachmentsRemaining",
        "attachments_remaining",
      ]) ??
      readNumber(nested, [
        "attachmentsRemaining",
        "attachments_remaining",
      ]),
    receivedAttachments:
      readNumber(root, [
        "receivedAttachments",
        "received_attachments",
        "attachmentCount",
      ]) ??
      readNumber(nested, [
        "receivedAttachments",
        "received_attachments",
        "attachmentCount",
      ]),
    maxRequestAttachments:
      readNumber(root, [
        "maxRequestAttachments",
        "max_request_attachments",
        "maxFilesCount",
      ]) ??
      readNumber(nested, [
        "maxRequestAttachments",
        "max_request_attachments",
        "maxFilesCount",
      ]),
    maxFileSizeMb:
      readNumber(root, ["maxFileSizeMb", "max_file_size_mb"]) ??
      readNumber(nested, ["maxFileSizeMb", "max_file_size_mb"]),
    maxTotalUploadMb:
      readNumber(root, ["maxTotalUploadMb", "max_total_upload_mb"]) ??
      readNumber(nested, ["maxTotalUploadMb", "max_total_upload_mb"]),
    fileName:
      readString(root, ["fileName", "file_name"]) ||
      readString(nested, ["fileName", "file_name"]),

    promptLimit:
      readNumber(root, ["promptLimit", "prompt_limit"]) ??
      readNumber(nested, ["promptLimit", "prompt_limit"]),
    promptsUsed:
      readNumber(root, ["promptsUsed", "prompts_used"]) ??
      readNumber(nested, ["promptsUsed", "prompts_used"]),
    promptsRemaining:
      readNumber(root, ["promptsRemaining", "prompts_remaining"]) ??
      readNumber(nested, ["promptsRemaining", "prompts_remaining"]),

    pageLimit:
      readNumber(root, [
        "pageLimit",
        "page_limit",
        "totalPageLimit",
      ]) ??
      readNumber(nested, [
        "pageLimit",
        "page_limit",
        "totalPageLimit",
      ]),
    pagesUsed:
      readNumber(root, ["pagesUsed", "pages_used"]) ??
      readNumber(nested, ["pagesUsed", "pages_used"]),
    pagesRemaining:
      readNumber(root, ["pagesRemaining", "pages_remaining"]) ??
      readNumber(nested, ["pagesRemaining", "pages_remaining"]),

    featureLabel:
      readString(root, ["featureLabel", "feature_label"]) ||
      readString(nested, ["featureLabel", "feature_label"]),
    planName:
      readString(root, ["planName", "plan_name"]) ||
      readString(nested, ["planName", "plan_name"]),
    provider:
      readString(root, ["provider", "providerLabel"]) ||
      readString(nested, ["provider", "providerLabel"]),
    selectedModel:
      readString(root, ["model", "selectedModel", "selected_model"]) ||
      readString(nested, ["model", "selectedModel", "selected_model"]),
    sourceProvider:
      readString(root, ["sourceProvider", "source_provider"]) ||
      readString(nested, ["sourceProvider", "source_provider"]),

    retryAfterSeconds:
      readNumber(root, ["retryAfterSeconds", "retry_after_seconds"]) ??
      readNumber(nested, [
        "retryAfterSeconds",
        "retry_after_seconds",
      ]),
  };

  return {
    code,
    context,
  };
}

export function createZedperaErrorFromPayload(
  payload: unknown,
  options: {
    status?: number | null;
    language?: ZedperaLanguage | string | null;
    endpoint?: string | null;
    module?: string | null;
    requestId?: string | null;
  } = {},
): ZedperaErrorInfo {
  const parsed = payloadContext(payload, options);
  const explicitCode = normalizeCodeText(parsed.code);
  const hasKnownCode =
    explicitCode in DEFINITIONS ||
    Boolean(CODE_ALIASES[explicitCode]);

  const inferredCode = hasKnownCode
    ? parsed.code
    : inferCodeFromText(
        payload,
        options.status,
        parsed.context,
      );

  return createZedperaError(
    inferredCode,
    parsed.context,
    {
      language: options.language,
      status: options.status,
      preserveServerMessageForUnknownCode: false,
    },
  );
}

export function createZedperaErrorFromUnknown(
  error: unknown,
  options: {
    language?: ZedperaLanguage | string | null;
    status?: number | null;
    endpoint?: string | null;
    module?: string | null;
    requestId?: string | null;
  } = {},
): ZedperaErrorInfo {
  if (error instanceof ZedperaApiError) {
    return error.descriptor;
  }

  const explicitCode = explicitCodeFromUnknown(error);
  const canonicalCode = explicitCode
    ? normalizeZedperaErrorCode(explicitCode, options.status)
    : inferCodeFromText(error, options.status, {
        endpoint: options.endpoint,
        module: options.module,
      });

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : normalizeErrorText(error).slice(0, 3000);

  return createZedperaError(
    canonicalCode,
    {
      status: options.status,
      endpoint: options.endpoint,
      module: options.module,
      requestId: options.requestId,
      rawMessage,
    },
    {
      language: options.language,
      status: options.status,
    },
  );
}

/**
 * Spätne kompatibilná funkcia z pôvodného api-error-messages.ts.
 */
export function getZedperaErrorMessage(
  error: unknown,
  options: {
    language?: ZedperaLanguage | string | null;
    status?: number | null;
    endpoint?: string | null;
    module?: string | null;
    requestId?: string | null;
    context?: ZedperaErrorContext;
  } = {},
): ZedperaErrorInfo {
  const explicitCode = explicitCodeFromUnknown(error);

  if (explicitCode) {
    return createZedperaError(
      explicitCode,
      {
        ...options.context,
        endpoint: options.endpoint || options.context?.endpoint,
        module: options.module || options.context?.module,
        requestId: options.requestId || options.context?.requestId,
        status: options.status || options.context?.status,
        rawMessage:
          error instanceof Error
            ? error.message
            : normalizeErrorText(error),
      },
      {
        language: options.language,
        status: options.status,
      },
    );
  }

  const inferredCode = inferCodeFromText(
    error,
    options.status,
    {
      ...options.context,
      endpoint: options.endpoint || options.context?.endpoint,
      module: options.module || options.context?.module,
    },
  );

  return createZedperaError(
    inferredCode,
    {
      ...options.context,
      endpoint: options.endpoint || options.context?.endpoint,
      module: options.module || options.context?.module,
      requestId: options.requestId || options.context?.requestId,
      status: options.status || options.context?.status,
      rawMessage:
        error instanceof Error
          ? error.message
          : normalizeErrorText(error),
    },
    {
      language: options.language,
      status: options.status,
    },
  );
}

export function formatZedperaErrorForUser(
  error: unknown,
  options: Parameters<typeof getZedperaErrorMessage>[1] = {},
): string {
  const info = getZedperaErrorMessage(error, options);

  return [
    `❌ ${info.title}`,
    "",
    info.message,
    "",
    `Čo sa stalo:`,
    info.reason,
    "",
    `Ako pokračovať:`,
    info.solution,
    "",
    `Odporúčaný postup:`,
    info.userAction,
    "",
    `Technický kód: ${info.technicalCode}`,
    info.requestId
      ? `Referenčné ID: ${info.requestId}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function toZedperaApiErrorBody(
  descriptor: ZedperaErrorInfo,
  options: {
    includeAdminDetail?: boolean;
    includeTechnicalDetail?: boolean;
  } = {},
): ZedperaApiErrorBody {
  return {
    ok: false,
    success: false,
    code: descriptor.code,
    technicalCode: descriptor.technicalCode,
    status: descriptor.status,

    title: descriptor.title,
    message: descriptor.message,
    reason: descriptor.reason,
    solution: descriptor.solution,
    userAction: descriptor.userAction,

    category: descriptor.category,
    severity: descriptor.severity,
    retryable: descriptor.retryable,
    blocking: descriptor.blocking,

    actionKind: descriptor.actionKind,
    ...(descriptor.actionLabel
      ? { actionLabel: descriptor.actionLabel }
      : {}),
    ...(descriptor.actionUrl
      ? { actionUrl: descriptor.actionUrl }
      : {}),

    ...(descriptor.requestId
      ? { requestId: descriptor.requestId }
      : {}),
    ...(descriptor.errorId
      ? { errorId: descriptor.errorId }
      : {}),
    ...(descriptor.endpoint
      ? { endpoint: descriptor.endpoint }
      : {}),
    ...(descriptor.module
      ? { module: descriptor.module }
      : {}),

    attachmentLimit: descriptor.attachmentLimit,
    attachmentsUsed: descriptor.attachmentsUsed,
    attachmentsRemaining: descriptor.attachmentsRemaining,
    receivedAttachments: descriptor.receivedAttachments,
    maxRequestAttachments: descriptor.maxRequestAttachments,
    maxFileSizeMb: descriptor.maxFileSizeMb,
    maxTotalUploadMb: descriptor.maxTotalUploadMb,

    promptLimit: descriptor.promptLimit,
    promptsUsed: descriptor.promptsUsed,
    promptsRemaining: descriptor.promptsRemaining,

    pageLimit: descriptor.pageLimit,
    pagesUsed: descriptor.pagesUsed,
    pagesRemaining: descriptor.pagesRemaining,

    retryAfterSeconds: descriptor.retryAfterSeconds,

    ...(options.includeAdminDetail
      ? { adminAction: descriptor.adminAction }
      : {}),
    ...(options.includeTechnicalDetail &&
    descriptor.technicalDetail
      ? {
          technicalDetail:
            descriptor.technicalDetail,
        }
      : {}),
  };
}

export class ZedperaApiError extends Error {
  readonly descriptor: ZedperaErrorInfo;
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly actionUrl?: string;
  readonly blocking: boolean;
  readonly retryable: boolean;

  constructor(descriptor: ZedperaErrorInfo) {
    super(descriptor.message);
    this.name = "ZedperaApiError";
    this.descriptor = descriptor;
    this.status = descriptor.status;
    this.code = String(descriptor.code);
    this.detail = descriptor.detail;
    this.actionUrl = descriptor.actionUrl;
    this.blocking = descriptor.blocking;
    this.retryable = descriptor.retryable;
  }
}

export function isZedperaBlockingError(
  value: unknown,
): boolean {
  if (value instanceof ZedperaApiError) {
    return value.blocking;
  }

  const record = asRecord(value);
  return record?.blocking === true;
}
