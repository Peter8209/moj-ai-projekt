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

/**
 * Endpoint používa používateľskú Supabase session a aktuálne databázové údaje.
 * Preto sa musí vykonať dynamicky pri každej požiadavke a jeho odpoveď sa
 * nesmie ukladať do cache prehliadača, proxy ani Vercel CDN.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const PURCHASE_URL = '/pricing#doplnkove-sluzby';

/**
 * Verejný kontrakt úspešnej odpovede endpointu.
 *
 * null pri limitoch znamená neobmedzený administrátorský prístup.
 */
type SuccessResponse = PageQuota & {
  ok: true;
  success: true;

  meta: {
    requestId: string;
    generatedAt: string;
    cache: 'no-store';
  };
};

type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'PAGE_LIMIT_REACHED'
  | 'INVALID_PAGE_QUOTA_RESPONSE'
  | 'PAGE_QUOTA_LOAD_FAILED';

type ErrorResponse = {
  ok: false;
  success: false;

  code: ErrorCode;
  message: string;
  requestId: string;

  purchaseUrl?: string;
  detail?: string;

  /**
   * Vnorený objekt je zachovaný pre staršie časti frontendu.
   */
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

  const code =
    typeof error.code === 'string'
      ? error.code
      : undefined;

  const status =
    typeof error.status === 'number' &&
    Number.isFinite(error.status)
      ? error.status
      : undefined;

  const message =
    typeof error.message === 'string'
      ? error.message
      : undefined;

  const name =
    typeof error.name === 'string'
      ? error.name
      : undefined;

  return {
    code,
    status,
    message,
    name,
  };
}

/**
 * Prevezme bezpečné request ID alebo vytvorí nové UUID.
 */
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
 * Hlavičky zabraňujú použitiu starého FREE alebo starého plateného limitu
 * po platbe, aktivácii doplnku alebo pridelení administrátorského prístupu.
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
  fallback = 0,
): number {
  const safeFallback =
    Number.isFinite(fallback)
      ? Math.max(Math.trunc(fallback), 0)
      : 0;

  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' &&
      value.trim().length === 0)
  ) {
    return safeFallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }

  return Math.min(
    Math.max(Math.trunc(parsed), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Rozpozná kanonický neobmedzený stav, ktorý už autoritatívne pripravil
 * lib/page-quota.ts na základe serverových entitlementov.
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
 * Vytvorí konzistentnú administrátorskú odpoveď.
 *
 * ADMIN sa nikdy nesmie serializovať ako FREE ani s limitom 0. Hodnota null
 * je verejným kontraktom pre neobmedzený limit.
 */
function createAdminQuota(): PageQuota {
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

/**
 * Obranná normalizácia verejnej odpovede.
 *
 * Funkcia neudeľuje administrátorské práva. Iba zachová a kanonizuje stav,
 * ktorý vrátil autoritatívny serverový modul lib/page-quota.ts.
 */
function normalizePageQuotaForApi(
  quota: PageQuota,
): PageQuota {
  if (isUnlimitedQuota(quota)) {
    return createAdminQuota();
  }

  const planId = String(
    quota.planId ?? '',
  ).trim();

  if (!planId || planId === 'admin') {
    throw new Error(
      'INVALID_PAGE_QUOTA_RESPONSE: Chýba platný planId.',
    );
  }

  if (
    quota.basePageLimit === null ||
    quota.pageLimit === null ||
    quota.pagesRemaining === null
  ) {
    throw new Error(
      'INVALID_PAGE_QUOTA_RESPONSE: Bežný používateľ nemôže mať null stránkový limit.',
    );
  }

  const basePageLimit =
    toNonNegativeInteger(
      quota.basePageLimit,
      0,
    );

  const extraPageLimit =
    toNonNegativeInteger(
      quota.extraPageLimit,
      0,
    );

  const calculatedPageLimit =
    Math.min(
      basePageLimit + extraPageLimit,
      Number.MAX_SAFE_INTEGER,
    );

  const pageLimit =
    toNonNegativeInteger(
      quota.pageLimit,
      calculatedPageLimit,
    );

  const pagesUsed =
    toNonNegativeInteger(
      quota.pagesUsed,
      0,
    );

  const calculatedRemaining =
    Math.max(pageLimit - pagesUsed, 0);

  const pagesRemaining =
    Math.min(
      toNonNegativeInteger(
        quota.pagesRemaining,
        calculatedRemaining,
      ),
      calculatedRemaining,
    );

  const pageLimitReached =
    quota.pageLimitReached === true ||
    pageLimit <= 0 ||
    pagesUsed >= pageLimit ||
    pagesRemaining <= 0;

  return {
    planId,

    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,

    basePageLimit,
    extraPageLimit,
    pageLimit,

    pagesUsed,
    pagesRemaining,
    pageLimitReached,
  };
}

function isUnauthenticatedError(
  error: unknown,
): boolean {
  const metadata = getErrorMetadata(error);

  const code =
    String(metadata.code || '')
      .trim()
      .toUpperCase();

  const name =
    String(metadata.name || '')
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
  if (
    process.env.NODE_ENV !== 'development'
  ) {
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
        process.env.NODE_ENV ===
          'development' &&
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
  purchaseUrl,
  detail,
}: {
  code: ErrorCode;
  message: string;
  requestId: string;
  purchaseUrl?: string;
  detail?: string;
}): ErrorResponse {
  return {
    ok: false,
    success: false,

    code,
    message,
    requestId,

    ...(purchaseUrl
      ? { purchaseUrl }
      : {}),

    ...(detail
      ? { detail }
      : {}),

    error: {
      code,
      message,
      requestId,
      ...(detail
        ? { detail }
        : {}),
    },
  };
}

/**
 * GET /api/usage/pages
 *
 * Vráti aktuálnu stránkovú kvótu prihláseného používateľa.
 * Endpoint neprijíma planId, admin flag, spotrebu ani limity z klienta.
 * Všetky údaje pochádzajú zo serverovej session a databázy.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const headers = createResponseHeaders(requestId);

  try {
    const quota =
      await getCurrentPageQuota();

    const publicQuota =
      normalizePageQuotaForApi(quota);

    const response: SuccessResponse = {
      ok: true,
      success: true,
      ...publicQuota,

      meta: {
        requestId,
        generatedAt:
          new Date().toISOString(),
        cache: 'no-store',
      },
    };

    return NextResponse.json(
      response,
      {
        status: 200,
        headers,
      },
    );
  } catch (error: unknown) {
    logRouteError(error, requestId);

    if (error instanceof PageLimitError) {
      const response = createErrorResponse({
        code: 'PAGE_LIMIT_REACHED',
        message: error.message,
        requestId,
        purchaseUrl:
          error.purchaseUrl || PURCHASE_URL,
      });

      return NextResponse.json(
        response,
        {
          status: error.status,
          headers,
        },
      );
    }

    if (isUnauthenticatedError(error)) {
      const response = createErrorResponse({
        code: 'UNAUTHENTICATED',
        message:
          'Pre načítanie stránkového limitu sa musíte prihlásiť platným používateľským účtom.',
        requestId,
        detail:
          getDevelopmentDetail(error),
      });

      return NextResponse.json(
        response,
        {
          status: 401,
          headers,
        },
      );
    }

    if (isInvalidQuotaError(error)) {
      const response = createErrorResponse({
        code: 'INVALID_PAGE_QUOTA_RESPONSE',
        message:
          'Server vrátil neplatný formát údajov o stránkovom limite.',
        requestId,
        detail:
          getDevelopmentDetail(error),
      });

      return NextResponse.json(
        response,
        {
          status: 500,
          headers,
        },
      );
    }

    const response = createErrorResponse({
      code: 'PAGE_QUOTA_LOAD_FAILED',
      message:
        'Aktuálny stránkový limit sa nepodarilo načítať.',
      requestId,
      detail:
        getDevelopmentDetail(error),
    });

    return NextResponse.json(
      response,
      {
        status: 500,
        headers,
      },
    );
  }
}
