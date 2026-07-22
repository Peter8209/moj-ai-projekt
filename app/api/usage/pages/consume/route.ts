import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  consumePagesForOutput,
  countGeneratedPages as calculateGeneratedPages,
  PageLimitError,
  type PageQuota,
} from '@/lib/page-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Maximálna povolená dĺžka textu odoslaného na odpočítanie strán.
 *
 * Pri 1 800 znakoch na normostranu ide približne o 2 778 strán.
 * Limit chráni endpoint pred neprimerane veľkým JSON telom.
 */
const MAX_TEXT_LENGTH = 5_000_000;

/**
 * Maximálna dĺžka názvu modulu.
 *
 * Hodnota musí zostať kompatibilná s lib/page-quota.ts.
 */
const MAX_MODULE_LENGTH = 100;

/**
 * Maximálna dĺžka identifikátora projektu/profilu.
 */
const MAX_PROJECT_ID_LENGTH = 255;

/**
 * Maximálna dĺžka idempotentného identifikátora požiadavky.
 *
 * Hodnota musí zostať kompatibilná s lib/page-quota.ts a databázovou
 * funkciou public.zedpera_consume_pages().
 */
const MAX_REQUEST_ID_LENGTH = 255;

const PAGE_ADDON_PURCHASE_URL =
  '/pricing#doplnkove-sluzby';

type ConsumePagesRequestBody = {
  requestId?: unknown;
  module?: unknown;
  projectId?: unknown;
  generatedText?: unknown;
};

type PublicPageQuota = {
  planId: string;

  isAdmin: boolean;
  isUnlimited: boolean;
  hasUnlimitedAccess: boolean;

  basePageLimit: number | null;
  extraPageLimit: number;
  pageLimit: number | null;

  pagesUsed: number;
  pagesRemaining: number | null;
  pageLimitReached: boolean;
};

type ConsumePagesSuccessResponse =
  PublicPageQuota & {
    ok: true;
    success: true;

    /**
     * Idempotentný identifikátor spotreby.
     */
    requestId: string;

    /** Modul, ktorý vytvoril účtovaný výstup. */
    module: string;

    /** Projekt alebo profil, ku ktorému spotreba patrí. */
    projectId: string;

    /**
     * Počet normostrán vypočítaný zo zaslaného textu.
     *
     * Pri ADMIN účte je informatívny a nič sa neodpočítava.
     */
    calculatedPages: number;

    /**
     * Počet strán považovaný za spotrebovaný touto operáciou.
     *
     * Pri neobmedzenom účte je vždy 0.
     */
    consumedPages: number;

    /**
     * Nový názov príznaku obídenia spotreby.
     */
    bypassed: boolean;

    /**
     * Starší názov zostáva kvôli spätnej kompatibilite frontendu.
     */
    usageBypassed: boolean;

    /**
     * Vnorená kvóta zostáva k dispozícii pre nový frontend.
     *
     * Rovnaké polia sú súčasne aj na najvyššej úrovni odpovede.
     */
    quota: PublicPageQuota;

    meta: {
      generatedAt: string;
      cache: 'no-store';
    };
  };

type ConsumePagesErrorCode =
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'CLIENT_PAGE_COUNT_NOT_ALLOWED'
  | 'TEXT_REQUIRED'
  | 'TEXT_TOO_LARGE'
  | 'MODULE_REQUIRED'
  | 'INVALID_MODULE'
  | 'PROJECT_ID_REQUIRED'
  | 'INVALID_PROJECT_ID'
  | 'REQUEST_ID_REQUIRED'
  | 'INVALID_REQUEST_ID'
  | 'REQUEST_ID_MISMATCH'
  | 'UNAUTHENTICATED'
  | 'PAGE_LIMIT_REACHED'
  | 'INVALID_PAGE_QUOTA_RESPONSE'
  | 'PAGE_QUOTA_CONSUME_FAILED'
  | 'INTERNAL_SERVER_ERROR';

type ConsumePagesErrorResponse = {
  ok: false;
  success: false;

  code: ConsumePagesErrorCode;
  message: string;

  /**
   * Jedinečný identifikátor konkrétnej serverovej operácie.
   */
  errorId: string;

  /**
   * requestId je dostupný po úspešnom spracovaní idempotentného kľúča.
   */
  requestId?: string;

  retryable: boolean;
  purchaseUrl?: string;
  pageLimitReached?: boolean;

  /**
   * Technický detail sa vracia iba mimo produkcie.
   */
  detail?: string;

  /**
   * Vnorený objekt zostáva kvôli kompatibilite so spoločným API readerom.
   */
  error: {
    code: ConsumePagesErrorCode;
    message: string;
    errorId: string;
    requestId?: string;
    detail?: string;
  };
};

type ConsumePagesApiResponse =
  | ConsumePagesSuccessResponse
  | ConsumePagesErrorResponse;

type ParsedJsonBodyResult =
  | {
      ok: true;
      body: Record<string, unknown>;
    }
  | {
      ok: false;
      code: 'INVALID_JSON' | 'INVALID_REQUEST';
      message: string;
    };

type RequestIdResolution =
  | {
      ok: true;
      requestId: string;
    }
  | {
      ok: false;
      code:
        | 'REQUEST_ID_REQUIRED'
        | 'INVALID_REQUEST_ID'
        | 'REQUEST_ID_MISMATCH';
      message: string;
    };

type ErrorMetadata = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

/**
 * Overí, či hodnota predstavuje obyčajný objekt.
 */
function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Bezpečne prevedie neznámu hodnotu na orezaný text.
 */
function toTrimmedString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * Bezpečne prevedie neznámu hodnotu na nezáporné celé číslo.
 */
function toNonNegativeIntegerOrNull(
  value: unknown,
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.min(
    Math.max(Math.trunc(value), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Bezpečne prevedie neznámu chybu na diagnostickú správu.
 */
function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message.trim() || 'UNKNOWN_ERROR';
  }

  if (typeof error === 'string') {
    return error.trim() || 'UNKNOWN_ERROR';
  }

  if (isRecord(error)) {
    const message = error.message;

    if (
      typeof message === 'string' &&
      message.trim()
    ) {
      return message.trim();
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'UNKNOWN_ERROR';
    }
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Bezpečne načíta aplikačný kód chyby.
 */
function getErrorCode(
  error: unknown,
): string {
  if (!isRecord(error)) {
    return '';
  }

  return toTrimmedString(
    (error as ErrorMetadata).code,
  ).toUpperCase();
}

/**
 * Bezpečne načíta HTTP status z neznámej chyby.
 */
function getErrorStatus(
  error: unknown,
): number | null {
  if (!isRecord(error)) {
    return null;
  }

  const status =
    (error as ErrorMetadata).status;

  return (
    typeof status === 'number' &&
    Number.isFinite(status)
      ? Math.trunc(status)
      : null
  );
}

/**
 * Overí, či technická správa začína konkrétnym aplikačným kódom.
 */
function hasErrorPrefix(
  message: string,
  prefix: string,
): boolean {
  const normalizedMessage =
    message.trim().toUpperCase();

  const normalizedPrefix =
    prefix.trim().toUpperCase();

  return (
    normalizedMessage === normalizedPrefix ||
    normalizedMessage.startsWith(
      `${normalizedPrefix}:`,
    )
  );
}

/**
 * Overí chybu neprihláseného používateľa.
 */
function isUnauthenticatedError(
  error: unknown,
  message: string,
): boolean {
  const code = getErrorCode(error);
  const status = getErrorStatus(error);

  return (
    code === 'UNAUTHENTICATED' ||
    code === 'AUTH_SESSION_MISSING' ||
    status === 401 ||
    hasErrorPrefix(
      message,
      'UNAUTHENTICATED',
    ) ||
    /auth session missing|jwt expired|invalid jwt|invalid token/i.test(
      message,
    )
  );
}

/**
 * Overí chybu vyčerpaného stránkového limitu.
 */
function isPageLimitError(
  error: unknown,
  message: string,
): boolean {
  return (
    error instanceof PageLimitError ||
    getErrorCode(error) ===
      'PAGE_LIMIT_REACHED' ||
    hasErrorPrefix(
      message,
      'PAGE_LIMIT_REACHED',
    )
  );
}

/**
 * Overí chybu neplatného výsledku stránkovej kvóty.
 */
function isInvalidQuotaError(
  error: unknown,
  message: string,
): boolean {
  return (
    getErrorCode(error) ===
      'INVALID_PAGE_QUOTA_RESPONSE' ||
    hasErrorPrefix(
      message,
      'INVALID_PAGE_QUOTA_RESPONSE',
    ) ||
    hasErrorPrefix(
      message,
      'PAGE_QUOTA_ADMIN_STATE_MISMATCH',
    )
  );
}

/**
 * Overí databázovú chybu pri spotrebovaní strán.
 */
function isQuotaConsumptionError(
  error: unknown,
  message: string,
): boolean {
  const code = getErrorCode(error);

  return (
    code === 'PAGE_QUOTA_CONSUME_FAILED' ||
    code ===
      'PAGE_QUOTA_CONSUME_EMPTY_RESPONSE' ||
    hasErrorPrefix(
      message,
      'PAGE_QUOTA_CONSUME_FAILED',
    ) ||
    hasErrorPrefix(
      message,
      'PAGE_QUOTA_CONSUME_EMPTY_RESPONSE',
    )
  );
}

/**
 * Technické detaily sa klientovi neposielajú v produkcii.
 */
function getDevelopmentDetail(
  message: string,
): string | undefined {
  return process.env.NODE_ENV === 'production'
    ? undefined
    : message;
}

/**
 * Vyčistí request ID pred vložením do hlavičky.
 */
function sanitizeHeaderValue(
  value: string,
): string {
  return value
    .replace(/[\r\n]/g, '')
    .slice(0, MAX_REQUEST_ID_LENGTH);
}

/**
 * Vytvorí hlavičky zakazujúce cache.
 */
function createResponseHeaders(
  traceId: string,
): Headers {
  const headers = new Headers();

  headers.set(
    'Cache-Control',
    [
      'private',
      'no-store',
      'no-cache',
      'max-age=0',
      'must-revalidate',
      'proxy-revalidate',
    ].join(', '),
  );

  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set(
    'Vary',
    'Cookie, Authorization',
  );
  headers.set(
    'X-Request-Id',
    sanitizeHeaderValue(traceId),
  );
  headers.set(
    'X-Content-Type-Options',
    'nosniff',
  );

  return headers;
}

/**
 * Vytvorí JSON odpoveď s jednotnými bezpečnými hlavičkami.
 */
function createJsonResponse<T>(
  body: T,
  status: number,
  traceId: string,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: createResponseHeaders(traceId),
  });
}

/**
 * Vytvorí jednotnú chybovú odpoveď.
 */
function createErrorResponse({
  code,
  message,
  status,
  errorId,
  requestId,
  retryable,
  purchaseUrl,
  pageLimitReached,
  detail,
}: {
  code: ConsumePagesErrorCode;
  message: string;
  status: number;
  errorId: string;
  requestId?: string;
  retryable: boolean;
  purchaseUrl?: string;
  pageLimitReached?: boolean;
  detail?: string;
}): NextResponse<ConsumePagesErrorResponse> {
  const publicDetail =
    detail &&
    process.env.NODE_ENV !== 'production'
      ? detail
      : undefined;

  const body: ConsumePagesErrorResponse = {
    ok: false,
    success: false,

    code,
    message,

    errorId,
    ...(requestId
      ? {
          requestId,
        }
      : {}),

    retryable,

    ...(purchaseUrl
      ? {
          purchaseUrl,
        }
      : {}),

    ...(typeof pageLimitReached === 'boolean'
      ? {
          pageLimitReached,
        }
      : {}),

    ...(publicDetail
      ? {
          detail: publicDetail,
        }
      : {}),

    error: {
      code,
      message,
      errorId,
      ...(requestId
        ? {
            requestId,
          }
        : {}),
      ...(publicDetail
        ? {
            detail: publicDetail,
          }
        : {}),
    },
  };

  return createJsonResponse(
    body,
    status,
    requestId || errorId,
  );
}

/**
 * Bezpečne načíta JSON telo požiadavky.
 */
async function readJsonBody(
  request: NextRequest,
): Promise<ParsedJsonBodyResult> {
  let parsed: unknown;

  try {
    parsed = await request.json();
  } catch {
    return {
      ok: false,
      code: 'INVALID_JSON',
      message:
        'Telo požiadavky neobsahuje platný JSON.',
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message:
        'Telo požiadavky musí byť JSON objekt.',
    };
  }

  return {
    ok: true,
    body: parsed,
  };
}

/**
 * Overí requestId a hlavičku Idempotency-Key.
 *
 * Hodnota z tela a hodnota hlavičky musia byť pri súčasnom použití rovnaké.
 */
function resolveRequestId(
  request: NextRequest,
  bodyRequestId: unknown,
): RequestIdResolution {
  const requestIdFromBody =
    toTrimmedString(bodyRequestId);

  const requestIdFromHeader =
    toTrimmedString(
      request.headers.get(
        'idempotency-key',
      ),
    );

  if (
    requestIdFromBody &&
    requestIdFromHeader &&
    requestIdFromBody !==
      requestIdFromHeader
  ) {
    return {
      ok: false,
      code: 'REQUEST_ID_MISMATCH',
      message:
        'Hodnota requestId sa nezhoduje s hlavičkou Idempotency-Key.',
    };
  }

  const requestId =
    requestIdFromBody ||
    requestIdFromHeader;

  if (!requestId) {
    return {
      ok: false,
      code: 'REQUEST_ID_REQUIRED',
      message:
        'Pole requestId alebo hlavička Idempotency-Key je povinná.',
    };
  }

  if (
    requestId.length >
    MAX_REQUEST_ID_LENGTH
  ) {
    return {
      ok: false,
      code: 'INVALID_REQUEST_ID',
      message:
        `requestId môže obsahovať najviac ${MAX_REQUEST_ID_LENGTH} znakov.`,
    };
  }

  if (/[\u0000-\u001F\u007F]/.test(requestId)) {
    return {
      ok: false,
      code: 'INVALID_REQUEST_ID',
      message:
        'requestId obsahuje nepovolené riadiace znaky.',
    };
  }

  return {
    ok: true,
    requestId,
  };
}

/**
 * Určí, či serverová kvóta predstavuje neobmedzený účet.
 */
function isUnlimitedQuota(
  quota: PageQuota,
): boolean {
  return (
    quota.isAdmin === true ||
    quota.isUnlimited === true ||
    quota.hasUnlimitedAccess === true ||
    quota.planId === 'admin'
  );
}

/**
 * Prevedie autoritatívnu kvótu z lib/page-quota.ts na bezpečnú
 * verejnú JSON štruktúru.
 *
 * ADMIN vždy dostane null limity. Route nevytvára administrátorské
 * oprávnenie; iba kanonizuje už potvrdený neobmedzený stav.
 */
function normalizeQuotaForResponse(
  quota: PageQuota,
): PublicPageQuota {
  if (isUnlimitedQuota(quota)) {
    return {
      planId: 'admin',

      isAdmin: true,
      isUnlimited: true,
      hasUnlimitedAccess: true,

      basePageLimit: null,
      extraPageLimit: 0,
      pageLimit: null,

      pagesUsed: 0,
      pagesRemaining: null,
      pageLimitReached: false,
    };
  }

  const basePageLimit =
    toNonNegativeIntegerOrNull(
      quota.basePageLimit,
    );

  const extraPageLimit =
    toNonNegativeIntegerOrNull(
      quota.extraPageLimit,
    );

  const pageLimit =
    toNonNegativeIntegerOrNull(
      quota.pageLimit,
    );

  const pagesUsed =
    toNonNegativeIntegerOrNull(
      quota.pagesUsed,
    );

  const pagesRemaining =
    toNonNegativeIntegerOrNull(
      quota.pagesRemaining,
    );

  if (
    !quota.planId ||
    basePageLimit === null ||
    extraPageLimit === null ||
    pageLimit === null ||
    pagesUsed === null ||
    pagesRemaining === null
  ) {
    throw new Error(
      'INVALID_PAGE_QUOTA_RESPONSE: Server vrátil neúplnú alebo neplatnú stránkovú kvótu.',
    );
  }

  const calculatedRemaining = Math.max(
    pageLimit - pagesUsed,
    0,
  );

  const safeRemaining = Math.min(
    pagesRemaining,
    calculatedRemaining,
  );

  return {
    planId: String(quota.planId),

    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,

    basePageLimit,
    extraPageLimit,
    pageLimit,

    pagesUsed,
    pagesRemaining: safeRemaining,

    pageLimitReached:
      quota.pageLimitReached === true ||
      pageLimit <= 0 ||
      pagesUsed >= pageLimit ||
      safeRemaining <= 0,
  };
}

/**
 * Zapíše chybu do serverového logu bez vystavenia technických údajov klientovi.
 */
function logConsumeError({
  level,
  code,
  error,
  errorId,
  requestId,
  moduleName,
  projectId,
  calculatedPages,
}: {
  level: 'warn' | 'error';
  code: ConsumePagesErrorCode;
  error: unknown;
  errorId: string;
  requestId?: string;
  moduleName?: string;
  projectId?: string;
  calculatedPages?: number;
}): void {
  const payload = {
    code,
    errorId,
    requestId,
    moduleName,
    projectId,
    calculatedPages,
    message: getErrorMessage(error),
    stack:
      process.env.NODE_ENV === 'development' &&
      error instanceof Error
        ? error.stack
        : undefined,
  };

  if (level === 'warn') {
    console.warn(
      '[POST /api/usage/pages/consume]',
      payload,
    );

    return;
  }

  console.error(
    '[POST /api/usage/pages/consume]',
    payload,
  );
}

/**
 * POST /api/usage/pages/consume
 *
 * Odpočíta stránky podľa skutočnej dĺžky úspešne vygenerovaného výstupu.
 *
 * Dôležité:
 * - endpoint musí byť volaný až po úspešnom vytvorení finálneho textu,
 * - requestId musí byť jedinečný pre jednu AI operáciu,
 * - databázová RPC funkcia zabezpečuje atómovosť a idempotentnosť,
 * - ADMIN nikdy nevstúpi do databázového odpočítania,
 * - FREE a platené účty sa kontrolujú výhradne na serveri.
 *
 * Očakávané telo:
 *
 * {
 *   "requestId": "unique-generation-id",
 *   "module": "supervisor",
 *   "projectId": "profile-id",
 *   "generatedText": "Celý vygenerovaný text..."
 * }
 *
 * Pole `pages` sa nesmie posielať. Počet strán je vždy vypočítaný
 * serverom z hodnoty `generatedText`.
 *
 * requestId možno poslať aj cez:
 *
 * Idempotency-Key: jedinečný-identifikátor
 */
export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ConsumePagesApiResponse>
> {
  const errorId = randomUUID();

  const contentType =
    request.headers.get(
      'content-type',
    ) ?? '';

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    return createErrorResponse({
      code: 'INVALID_CONTENT_TYPE',
      message:
        'Požiadavka musí používať Content-Type application/json.',
      status: 415,
      errorId,
      retryable: false,
    });
  }

  const parsedBody =
    await readJsonBody(request);

  if (!parsedBody.ok) {
    return createErrorResponse({
      code: parsedBody.code,
      message: parsedBody.message,
      status: 400,
      errorId,
      retryable: false,
    });
  }

  const { body } = parsedBody;

  /*
   * Bezpečnostné pravidlo: klient nesmie určovať počet spotrebovaných strán.
   * Aj keby hodnotu `pages` poslal, server ju nesmie použiť ani akceptovať.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      'pages',
    )
  ) {
    return createErrorResponse({
      code: 'CLIENT_PAGE_COUNT_NOT_ALLOWED',
      message:
        'Pole pages nie je povolené. Počet strán vypočíta server z generatedText.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (typeof body.generatedText !== 'string') {
    return createErrorResponse({
      code: 'TEXT_REQUIRED',
      message:
        'Pole generatedText je povinné a musí obsahovať celý vygenerovaný text.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  const generatedText = body.generatedText;

  if (!generatedText.trim()) {
    return createErrorResponse({
      code: 'TEXT_REQUIRED',
      message:
        'Nie je možné odpočítať stránky za prázdny generatedText.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (
    generatedText.length >
    MAX_TEXT_LENGTH
  ) {
    return createErrorResponse({
      code: 'TEXT_TOO_LARGE',
      message:
        `generatedText môže obsahovať najviac ${MAX_TEXT_LENGTH.toLocaleString(
          'sk-SK',
        )} znakov.`,
      status: 413,
      errorId,
      retryable: false,
    });
  }

  if (typeof body.module !== 'string') {
    return createErrorResponse({
      code: 'MODULE_REQUIRED',
      message:
        'Pole module je povinné a musí obsahovať názov modulu.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  /*
   * Názov module nepoužívame ako názov lokálnej premennej.
   * Next.js ESLint zakazuje priraďovanie do premennej `module`.
   */
  const moduleName = body.module.trim();

  if (!moduleName) {
    return createErrorResponse({
      code: 'MODULE_REQUIRED',
      message:
        'Názov modulu nesmie byť prázdny.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (
    moduleName.length >
    MAX_MODULE_LENGTH
  ) {
    return createErrorResponse({
      code: 'INVALID_MODULE',
      message:
        `Názov modulu môže obsahovať najviac ${MAX_MODULE_LENGTH} znakov.`,
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (/[\u0000-\u001F\u007F]/.test(moduleName)) {
    return createErrorResponse({
      code: 'INVALID_MODULE',
      message:
        'Názov modulu obsahuje nepovolené riadiace znaky.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (typeof body.projectId !== 'string') {
    return createErrorResponse({
      code: 'PROJECT_ID_REQUIRED',
      message:
        'Pole projectId je povinné a musí obsahovať identifikátor projektu alebo profilu.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  const projectId = body.projectId.trim();

  if (!projectId) {
    return createErrorResponse({
      code: 'PROJECT_ID_REQUIRED',
      message:
        'Identifikátor projectId nesmie byť prázdny.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (projectId.length > MAX_PROJECT_ID_LENGTH) {
    return createErrorResponse({
      code: 'INVALID_PROJECT_ID',
      message:
        `projectId môže obsahovať najviac ${MAX_PROJECT_ID_LENGTH} znakov.`,
      status: 400,
      errorId,
      retryable: false,
    });
  }

  if (/[\u0000-\u001F\u007F]/.test(projectId)) {
    return createErrorResponse({
      code: 'INVALID_PROJECT_ID',
      message:
        'projectId obsahuje nepovolené riadiace znaky.',
      status: 400,
      errorId,
      retryable: false,
    });
  }

  const requestIdResult =
    resolveRequestId(
      request,
      body.requestId,
    );

  if (!requestIdResult.ok) {
    return createErrorResponse({
      code: requestIdResult.code,
      message: requestIdResult.message,
      status: 400,
      errorId,
      retryable: false,
    });
  }

  const { requestId } =
    requestIdResult;

  const pagesToConsume =
    calculateGeneratedPages(generatedText);

  try {
    /*
     * Premenná umožní poslať projectId aj vtedy, keď staršia verzia
     * consumePagesForOutput zatiaľ typovo pozná iba text/module/requestId.
     * Extra vlastnosť je za behu dostupná novšej implementácii a staršia ju
     * bezpečne ignoruje.
     */
    const consumeInput = {
      text: generatedText,
      generatedText,
      module: moduleName,
      projectId,
      requestId,
    };

    const rawQuota =
      await consumePagesForOutput(
        consumeInput,
      );

    const quota =
      normalizeQuotaForResponse(
        rawQuota,
      );

    const bypassed =
      quota.isAdmin ||
      quota.isUnlimited ||
      quota.hasUnlimitedAccess;

    const consumedPages =
      bypassed
        ? 0
        : pagesToConsume;

    const response: ConsumePagesSuccessResponse = {
      ok: true,
      success: true,

      requestId,
      module: moduleName,
      projectId,
      calculatedPages: pagesToConsume,
      consumedPages,

      bypassed,
      usageBypassed: bypassed,

      ...quota,
      quota: {
        ...quota,
      },

      meta: {
        generatedAt:
          new Date().toISOString(),
        cache: 'no-store',
      },
    };

    return createJsonResponse(
      response,
      200,
      requestId,
    );
  } catch (error: unknown) {
    const technicalMessage =
      getErrorMessage(error);

    if (
      isUnauthenticatedError(
        error,
        technicalMessage,
      )
    ) {
      logConsumeError({
        level: 'warn',
        code: 'UNAUTHENTICATED',
        error,
        errorId,
        requestId,
        moduleName,
        projectId,
        calculatedPages: pagesToConsume,
      });

      return createErrorResponse({
        code: 'UNAUTHENTICATED',
        message:
          'Používateľ nie je prihlásený alebo jeho relácia vypršala.',
        status: 401,
        errorId,
        requestId,
        retryable: false,
        detail:
          getDevelopmentDetail(
            technicalMessage,
          ),
      });
    }

    if (
      isPageLimitError(
        error,
        technicalMessage,
      )
    ) {
      const message =
        error instanceof PageLimitError
          ? error.message
          : 'Stránkový limit bol vyčerpaný. Pre pokračovanie si dokúpte ďalšie strany alebo aktivujte vyšší balík.';

      logConsumeError({
        level: 'warn',
        code: 'PAGE_LIMIT_REACHED',
        error,
        errorId,
        requestId,
        moduleName,
        projectId,
        calculatedPages: pagesToConsume,
      });

      return createErrorResponse({
        code: 'PAGE_LIMIT_REACHED',
        message,
        status: 402,
        errorId,
        requestId,
        retryable: false,
        purchaseUrl:
          PAGE_ADDON_PURCHASE_URL,
        pageLimitReached: true,
        detail:
          getDevelopmentDetail(
            technicalMessage,
          ),
      });
    }

    if (
      hasErrorPrefix(
        technicalMessage,
        'INVALID_REQUEST_ID',
      )
    ) {
      logConsumeError({
        level: 'warn',
        code: 'INVALID_REQUEST_ID',
        error,
        errorId,
        requestId,
        moduleName,
        projectId,
        calculatedPages: pagesToConsume,
      });

      return createErrorResponse({
        code: 'INVALID_REQUEST_ID',
        message:
          'Identifikátor požiadavky nie je platný.',
        status: 400,
        errorId,
        requestId,
        retryable: false,
        detail:
          getDevelopmentDetail(
            technicalMessage,
          ),
      });
    }

    if (
      isInvalidQuotaError(
        error,
        technicalMessage,
      )
    ) {
      logConsumeError({
        level: 'error',
        code:
          'INVALID_PAGE_QUOTA_RESPONSE',
        error,
        errorId,
        requestId,
        moduleName,
        projectId,
        calculatedPages: pagesToConsume,
      });

      return createErrorResponse({
        code:
          'INVALID_PAGE_QUOTA_RESPONSE',
        message:
          'Server vrátil neplatný stav stránkovej kvóty.',
        status: 500,
        errorId,
        requestId,
        retryable: true,
        detail:
          getDevelopmentDetail(
            technicalMessage,
          ),
      });
    }

    if (
      isQuotaConsumptionError(
        error,
        technicalMessage,
      )
    ) {
      logConsumeError({
        level: 'error',
        code:
          'PAGE_QUOTA_CONSUME_FAILED',
        error,
        errorId,
        requestId,
        moduleName,
        projectId,
        calculatedPages: pagesToConsume,
      });

      return createErrorResponse({
        code:
          'PAGE_QUOTA_CONSUME_FAILED',
        message:
          'Spotrebu strán sa nepodarilo zaznamenať. Skúste požiadavku zopakovať.',
        status: 500,
        errorId,
        requestId,
        retryable: true,
        detail:
          getDevelopmentDetail(
            technicalMessage,
          ),
      });
    }

    logConsumeError({
      level: 'error',
      code:
        'INTERNAL_SERVER_ERROR',
      error,
      errorId,
      requestId,
      moduleName,
      projectId,
      calculatedPages: pagesToConsume,
    });

    return createErrorResponse({
      code:
        'INTERNAL_SERVER_ERROR',
      message:
        'Pri zaznamenávaní spotreby strán nastala neočakávaná chyba.',
      status: 500,
      errorId,
      requestId,
      retryable: true,
      detail:
        getDevelopmentDetail(
          technicalMessage,
        ),
    });
  }
}
