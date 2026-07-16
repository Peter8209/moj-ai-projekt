import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  getCurrentPageQuota,
  PageLimitError,
  type PageQuota,
} from '@/lib/page-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// =====================================================
// TYPES
// =====================================================

type JsonRecord = Record<string, unknown>;

type PageQuotaSuccessResponse = {
  ok: true;
} & PageQuota;

type PageQuotaErrorCode =
  | 'UNAUTHENTICATED'
  | 'PAGE_LIMIT_REACHED'
  | 'PAGE_QUOTA_LOAD_FAILED'
  | 'INTERNAL_SERVER_ERROR';

type PageQuotaErrorResponse = {
  ok: false;
  code: PageQuotaErrorCode;
  message: string;

  /**
   * Jedinečný identifikátor požiadavky/chyby.
   *
   * Rovnaká hodnota sa posiela aj v hlavičke X-Request-Id,
   * aby bolo možné chybu dohľadať v serverových logoch.
   */
  errorId: string;

  /**
   * Určuje, či má zmysel požiadavku zopakovať.
   */
  retryable: boolean;

  /**
   * Informácia pre frontend, že bol vyčerpaný stránkový limit.
   */
  pageLimitReached?: boolean;

  /**
   * Odkaz na dokúpenie strán alebo výber balíka.
   */
  purchaseUrl?: string;

  /**
   * Technický detail sa vracia iba vo vývojovom prostredí.
   */
  detail?: string;
};

type PageQuotaApiResponse =
  | PageQuotaSuccessResponse
  | PageQuotaErrorResponse;

type ErrorMetadata = {
  name: string;
  message: string;
  code?: string;
  status?: number;
  stack?: string;
};

// =====================================================
// RESPONSE HEADERS
// =====================================================

/**
 * Vytvorí hlavičky, ktoré zabránia uloženiu používateľskej
 * kvóty do cache prehliadača, CDN alebo proxy servera.
 *
 * Kvóta sa môže zmeniť po každom úspešnom výstupe,
 * preto sa musí vždy načítať nanovo.
 */
function createNoStoreHeaders(
  requestId: string,
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

  /**
   * Odpoveď závisí od prihlasovacej relácie používateľa.
   */
  headers.set(
    'Vary',
    'Cookie, Authorization',
  );

  headers.set(
    'X-Request-Id',
    requestId,
  );

  headers.set(
    'X-Content-Type-Options',
    'nosniff',
  );

  return headers;
}

/**
 * Vytvorí JSON odpoveď s jednotnými bezpečnostnými hlavičkami.
 */
function createJsonResponse<T>(
  body: T,
  status: number,
  requestId: string,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers:
      createNoStoreHeaders(requestId),
  });
}

// =====================================================
// REQUEST ID
// =====================================================

/**
 * Prevezme existujúce X-Request-Id alebo vytvorí nové.
 *
 * Hodnota sa očistí, aby sa do logov nedostali nežiaduce znaky.
 */
function resolveRequestId(
  request: NextRequest,
): string {
  const incomingRequestId =
    request.headers.get('x-request-id');

  if (incomingRequestId) {
    const sanitizedRequestId =
      incomingRequestId
        .trim()
        .replace(
          /[^a-zA-Z0-9._:-]/g,
          '',
        )
        .slice(0, 128);

    if (sanitizedRequestId) {
      return sanitizedRequestId;
    }
  }

  return randomUUID();
}

// =====================================================
// ERROR HELPERS
// =====================================================

function isRecord(
  value: unknown,
): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getStringProperty(
  value: unknown,
  property: string,
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue =
    value[property];

  if (
    typeof propertyValue !== 'string'
  ) {
    return undefined;
  }

  const normalized =
    propertyValue.trim();

  return normalized || undefined;
}

function getNumberProperty(
  value: unknown,
  property: string,
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue =
    value[property];

  if (
    typeof propertyValue === 'number' &&
    Number.isFinite(propertyValue)
  ) {
    return propertyValue;
  }

  if (
    typeof propertyValue === 'string' &&
    propertyValue.trim()
  ) {
    const parsed =
      Number(propertyValue);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

/**
 * Bezpečne prevedie neznámu chybu na text.
 */
function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return (
      error.message.trim() ||
      'UNKNOWN_ERROR'
    );
  }

  if (typeof error === 'string') {
    return (
      error.trim() ||
      'UNKNOWN_ERROR'
    );
  }

  const objectMessage =
    getStringProperty(
      error,
      'message',
    );

  if (objectMessage) {
    return objectMessage;
  }

  try {
    const serialized =
      JSON.stringify(error);

    return (
      serialized &&
      serialized !== '{}'
        ? serialized
        : 'UNKNOWN_ERROR'
    );
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

/**
 * Bezpečne načíta kód chyby.
 */
function getErrorCode(
  error: unknown,
): string | undefined {
  return getStringProperty(
    error,
    'code',
  );
}

/**
 * Bezpečne načíta HTTP stav chyby.
 */
function getErrorStatus(
  error: unknown,
): number | undefined {
  return getNumberProperty(
    error,
    'status',
  );
}

/**
 * Vytvorí bezpečné metadáta pre serverové logovanie.
 *
 * Do logu neposielame celý Error objekt. V Next.js development režime
 * môže console.error s Error objektom vyvolať rušivý červený overlay.
 */
function createErrorMetadata(
  error: unknown,
): ErrorMetadata {
  const message =
    getErrorMessage(error);

  const metadata: ErrorMetadata = {
    name:
      error instanceof Error
        ? error.name
        : getStringProperty(
            error,
            'name',
          ) || 'UnknownError',
    message,
    code: getErrorCode(error),
    status: getErrorStatus(error),
  };

  if (
    process.env.NODE_ENV ===
      'development' &&
    error instanceof Error &&
    error.stack
  ) {
    metadata.stack = error.stack;
  }

  return metadata;
}

/**
 * Zapíše chybu bez odovzdania pôvodného Error objektu.
 *
 * V development režime používame console.info, aby očakávaná
 * API chyba nespôsobila Next.js konzolový overlay.
 */
function logHandledError(
  label: string,
  requestId: string,
  error: unknown,
): void {
  const metadata =
    createErrorMetadata(error);

  const logPayload = {
    requestId,
    ...metadata,
  };

  if (
    process.env.NODE_ENV ===
    'development'
  ) {
    console.info(
      label,
      logPayload,
    );

    return;
  }

  console.error(
    label,
    logPayload,
  );
}

/**
 * Overí, či chyba vznikla z dôvodu chýbajúcej,
 * neplatnej alebo expirovanej relácie.
 */
function isUnauthenticatedError(
  error: unknown,
  message: string,
): boolean {
  const code =
    getErrorCode(error)
      ?.trim()
      .toUpperCase();

  const status =
    getErrorStatus(error);

  const normalizedMessage =
    message
      .trim()
      .toUpperCase();

  if (
    status === 401 ||
    code === 'UNAUTHENTICATED' ||
    code === 'AUTH_SESSION_MISSING' ||
    code === 'SESSION_EXPIRED'
  ) {
    return true;
  }

  return (
    normalizedMessage ===
      'UNAUTHENTICATED' ||
    normalizedMessage.startsWith(
      'UNAUTHENTICATED:',
    ) ||
    normalizedMessage.includes(
      'AUTH SESSION MISSING',
    ) ||
    normalizedMessage.includes(
      'SESSION MISSING',
    ) ||
    normalizedMessage.includes(
      'JWT EXPIRED',
    ) ||
    normalizedMessage.includes(
      'INVALID JWT',
    ) ||
    normalizedMessage.includes(
      'INVALID TOKEN',
    )
  );
}

/**
 * Overí, či chyba vznikla počas načítania stránkovej kvóty.
 */
function isPageQuotaLoadError(
  error: unknown,
  message: string,
): boolean {
  const code =
    getErrorCode(error)
      ?.trim()
      .toUpperCase();

  const normalizedMessage =
    message
      .trim()
      .toUpperCase();

  return (
    code ===
      'PAGE_QUOTA_LOAD_FAILED' ||
    normalizedMessage.startsWith(
      'PAGE_QUOTA_LOAD_FAILED',
    ) ||
    normalizedMessage.includes(
      'ZEDPERA_PAGE_BALANCES',
    ) ||
    normalizedMessage.includes(
      'BASE_PAGE_LIMIT',
    ) ||
    normalizedMessage.includes(
      'EXTRA_PAGE_LIMIT',
    ) ||
    normalizedMessage.includes(
      'USED_PAGES',
    )
  );
}

/**
 * Technický detail sa neposiela do produkčného prostredia.
 */
function getDevelopmentDetail(
  message: string,
): Pick<
  PageQuotaErrorResponse,
  'detail'
> {
  if (
    process.env.NODE_ENV ===
    'production'
  ) {
    return {};
  }

  return {
    detail: message,
  };
}

// =====================================================
// ROUTE
// =====================================================

/**
 * GET /api/usage/pages
 *
 * Vráti aktuálnu stránkovú kvótu prihláseného používateľa.
 *
 * Úspešná odpoveď:
 *
 * {
 *   ok: true,
 *   planId: "bachelor-thesis",
 *   basePageLimit: 50,
 *   extraPageLimit: 20,
 *   pageLimit: 70,
 *   pagesUsed: 15,
 *   pagesRemaining: 55,
 *   pageLimitReached: false
 * }
 */
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<PageQuotaApiResponse>
> {
  const requestId =
    resolveRequestId(request);

  try {
    const quota =
      await getCurrentPageQuota();

    return createJsonResponse<PageQuotaSuccessResponse>(
      {
        ok: true,
        ...quota,
      },
      200,
      requestId,
    );
  } catch (error: unknown) {
    const technicalMessage =
      getErrorMessage(error);

    /**
     * PageLimitError sa pri obyčajnom načítaní kvóty
     * zvyčajne neočakáva.
     *
     * Spracovanie zostáva zachované pre konzistentnosť
     * s ostatnými billing endpointmi.
     */
    if (error instanceof PageLimitError) {
      logHandledError(
        '[GET /api/usage/pages] Stránkový limit bol vyčerpaný.',
        requestId,
        error,
      );

      return createJsonResponse<PageQuotaErrorResponse>(
        {
          ok: false,
          code: 'PAGE_LIMIT_REACHED',
          message:
            error.message ||
            'Stránkový limit bol vyčerpaný.',
          errorId: requestId,
          retryable: false,
          pageLimitReached: true,
          purchaseUrl:
            '/pricing#doplnkove-sluzby',
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        error.status,
        requestId,
      );
    }

    if (
      isUnauthenticatedError(
        error,
        technicalMessage,
      )
    ) {
      logHandledError(
        '[GET /api/usage/pages] Neprihlásená požiadavka.',
        requestId,
        error,
      );

      return createJsonResponse<PageQuotaErrorResponse>(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo jeho relácia vypršala.',
          errorId: requestId,
          retryable: false,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        401,
        requestId,
      );
    }

    if (
      isPageQuotaLoadError(
        error,
        technicalMessage,
      )
    ) {
      logHandledError(
        '[GET /api/usage/pages] Načítanie stránkovej kvóty zlyhalo.',
        requestId,
        error,
      );

      return createJsonResponse<PageQuotaErrorResponse>(
        {
          ok: false,
          code:
            'PAGE_QUOTA_LOAD_FAILED',
          message:
            'Stránkový limit sa nepodarilo načítať. Skúste požiadavku zopakovať.',
          errorId: requestId,
          retryable: true,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        500,
        requestId,
      );
    }

    logHandledError(
      '[GET /api/usage/pages] Neočakávaná serverová chyba.',
      requestId,
      error,
    );

    return createJsonResponse<PageQuotaErrorResponse>(
      {
        ok: false,
        code:
          'INTERNAL_SERVER_ERROR',
        message:
          'Pri načítavaní stránkového limitu nastala neočakávaná chyba.',
        errorId: requestId,
        retryable: true,
        ...getDevelopmentDetail(
          technicalMessage,
        ),
      },
      500,
      requestId,
    );
  }
}