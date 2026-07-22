import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  getCurrentPageQuota,
  type PageQuota,
} from '@/lib/page-quota';

/**
 * Endpoint musí vždy načítať aktuálnu používateľskú session,
 * entitlementy a spotrebu strán zo servera/databázy.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Presný verejný kontrakt úspešnej odpovede:
 *
 * Bežný používateľ:
 * {
 *   pageLimit: 70,
 *   pagesUsed: 21,
 *   pagesRemaining: 49,
 *   pageLimitReached: false,
 *   isUnlimited: false
 * }
 *
 * ADMIN:
 * {
 *   pageLimit: null,
 *   pagesUsed: null,
 *   pagesRemaining: null,
 *   pageLimitReached: false,
 *   isUnlimited: true
 * }
 */
type PageUsageResponse = {
  pageLimit: number | null;
  pagesUsed: number | null;
  pagesRemaining: number | null;
  pageLimitReached: boolean;
  isUnlimited: boolean;
};

type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'INVALID_PAGE_QUOTA_RESPONSE'
  | 'PAGE_QUOTA_LOAD_FAILED';

type ErrorResponse = {
  ok: false;
  success: false;
  code: ErrorCode;
  message: string;
  requestId: string;
  detail?: string;
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    detail?: string;
  };
};

type ErrorMetadata = {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getErrorMetadata(
  error: unknown,
): ErrorMetadata {
  if (!isRecord(error)) {
    return {};
  }

  return {
    code:
      typeof error.code === 'string'
        ? error.code
        : undefined,
    status:
      typeof error.status === 'number' &&
      Number.isFinite(error.status)
        ? error.status
        : undefined,
    message:
      typeof error.message === 'string'
        ? error.message
        : undefined,
    name:
      typeof error.name === 'string'
        ? error.name
        : undefined,
  };
}

function resolveRequestId(
  request: NextRequest,
): string {
  const incomingRequestId =
    request.headers
      .get('x-request-id')
      ?.trim() || '';

  const sanitizedRequestId =
    incomingRequestId
      .replace(/[^a-zA-Z0-9._:-]/g, '')
      .slice(0, 128);

  return sanitizedRequestId || randomUUID();
}

/**
 * Zabráni vráteniu starej kvóty po platbe, aktivácii doplnku,
 * zmene plánu alebo pridelení administrátorského prístupu.
 */
function createResponseHeaders(
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
  headers.set('Vary', 'Cookie, Authorization');
  headers.set('X-Request-Id', requestId);
  headers.set('X-Content-Type-Options', 'nosniff');

  return headers;
}

function toNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' &&
      value.trim().length === 0)
  ) {
    throw new Error(
      `INVALID_PAGE_QUOTA_RESPONSE: Pole ${fieldName} nemá číselnú hodnotu.`,
    );
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(
      `INVALID_PAGE_QUOTA_RESPONSE: Pole ${fieldName} nie je platné číslo.`,
    );
  }

  return Math.min(
    Math.max(Math.trunc(parsedValue), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Administrátorský stav sa smie prevziať iba z autoritatívnej
 * serverovej kvóty. Endpoint nikdy neprijíma admin flag z klienta.
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

function createUnlimitedResponse(): PageUsageResponse {
  return {
    pageLimit: null,
    pagesUsed: null,
    pagesRemaining: null,
    pageLimitReached: false,
    isUnlimited: true,
  };
}

/**
 * Pre bežného používateľa sa zostávajúci počet strán počíta priamo
 * z pageLimit - pagesUsed. Klient preto nedostane nekonzistentné alebo
 * zastarané pagesRemaining.
 */
function createLimitedResponse(
  quota: PageQuota,
): PageUsageResponse {
  if (quota.pageLimit === null) {
    throw new Error(
      'INVALID_PAGE_QUOTA_RESPONSE: Bežný používateľ nemôže mať pageLimit null.',
    );
  }

  const pageLimit = toNonNegativeInteger(
    quota.pageLimit,
    'pageLimit',
  );

  const pagesUsed = toNonNegativeInteger(
    quota.pagesUsed,
    'pagesUsed',
  );

  const pagesRemaining = Math.max(
    pageLimit - pagesUsed,
    0,
  );

  const pageLimitReached =
    pageLimit <= 0 ||
    pagesUsed >= pageLimit;

  return {
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached,
    isUnlimited: false,
  };
}

function normalizePageUsageForApi(
  quota: PageQuota,
): PageUsageResponse {
  if (isUnlimitedQuota(quota)) {
    return createUnlimitedResponse();
  }

  return createLimitedResponse(quota);
}

function isUnauthenticatedError(
  error: unknown,
): boolean {
  const metadata = getErrorMetadata(error);

  const code = String(metadata.code || '')
    .trim()
    .toUpperCase();

  const name = String(metadata.name || '')
    .trim()
    .toLowerCase();

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(metadata.message || '')
          .toLowerCase();

  if (
    code === 'UNAUTHENTICATED' ||
    code === 'AUTH_SESSION_MISSING' ||
    metadata.status === 401 ||
    name.includes('unauthenticated')
  ) {
    return true;
  }

  return [
    'unauthenticated',
    'auth session missing',
    'session missing',
    'jwt expired',
    'invalid jwt',
    'invalid token',
    'user not found',
  ].some((knownMessage) =>
    message.includes(knownMessage),
  );
}

function isInvalidQuotaError(
  error: unknown,
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : getErrorMetadata(error).message || '';

  return message.includes(
    'INVALID_PAGE_QUOTA_RESPONSE',
  );
}

function getDevelopmentDetail(
  error: unknown,
): string | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logRouteError(
  error: unknown,
  requestId: string,
): void {
  const metadata = getErrorMetadata(error);

  console.error(
    '[GET /api/usage/pages] Načítanie stránkovej kvóty zlyhalo.',
    {
      requestId,
      name:
        error instanceof Error
          ? error.name
          : metadata.name,
      message:
        error instanceof Error
          ? error.message
          : metadata.message,
      code: metadata.code,
      status: metadata.status,
      stack:
        process.env.NODE_ENV === 'development' &&
        error instanceof Error
          ? error.stack
          : undefined,
    },
  );
}

function createErrorResponse({
  code,
  message,
  requestId,
  detail,
}: {
  code: ErrorCode;
  message: string;
  requestId: string;
  detail?: string;
}): ErrorResponse {
  return {
    ok: false,
    success: false,
    code,
    message,
    requestId,
    ...(detail ? { detail } : {}),
    error: {
      code,
      message,
      requestId,
      ...(detail ? { detail } : {}),
    },
  };
}

/**
 * GET /api/usage/pages
 *
 * Vráti aktuálnu stránkovú kvótu prihláseného používateľa.
 * Úspešná odpoveď obsahuje presne iba:
 * - pageLimit
 * - pagesUsed
 * - pagesRemaining
 * - pageLimitReached
 * - isUnlimited
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const headers = createResponseHeaders(requestId);

  try {
    const quota = await getCurrentPageQuota();

    const response =
      normalizePageUsageForApi(quota);

    return NextResponse.json(response, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    logRouteError(error, requestId);

    if (isUnauthenticatedError(error)) {
      const response = createErrorResponse({
        code: 'UNAUTHENTICATED',
        message:
          'Pre načítanie stránkového limitu sa musíte prihlásiť platným používateľským účtom.',
        requestId,
        detail: getDevelopmentDetail(error),
      });

      return NextResponse.json(response, {
        status: 401,
        headers,
      });
    }

    if (isInvalidQuotaError(error)) {
      const response = createErrorResponse({
        code: 'INVALID_PAGE_QUOTA_RESPONSE',
        message:
          'Server vrátil neplatné údaje o stránkovom limite.',
        requestId,
        detail: getDevelopmentDetail(error),
      });

      return NextResponse.json(response, {
        status: 500,
        headers,
      });
    }

    const response = createErrorResponse({
      code: 'PAGE_QUOTA_LOAD_FAILED',
      message:
        'Aktuálny stránkový limit sa nepodarilo načítať.',
      requestId,
      detail: getDevelopmentDetail(error),
    });

    return NextResponse.json(response, {
      status: 500,
      headers,
    });
  }
}
