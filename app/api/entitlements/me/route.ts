import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import { getCurrentEntitlements } from '@/lib/entitlements';

/**
 * Endpoint pracuje s aktuálnou Supabase reláciou používateľa.
 *
 * Oprávnenia sa vždy načítavajú na serveri. Hodnoty z localStorage,
 * query parametrov alebo tela požiadavky sa pri rozhodovaní nepoužívajú.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const DEFAULT_ENTITLEMENTS = {
  planId: 'free',
  isAdmin: false,
  hasUnlimitedAccess: false,
  promptLimit: 3,
  promptsUsed: 0,
  attachmentLimit: 1,
  basePageLimit: 3,
  extraPageLimit: 0,
  pagesUsed: 0,
} as const;

type EntitlementsResponse = {
  planId: string;
  isAdmin: boolean;
  hasUnlimitedAccess: boolean;

  /** null = neobmedzený počet promptov */
  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  promptLimitReached: boolean;

  attachmentLimit: number;
  basePageLimit: number;
  extraPageLimit: number;
  pagesUsed: number;
};

type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'ENTITLEMENTS_LOAD_FAILED'
  | 'INVALID_ENTITLEMENTS_RESPONSE';

type ErrorResponse = {
  error: ErrorCode;
  message: string;
  requestId: string;
  details?: string;
};

type ErrorWithMetadata = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
};

/**
 * Overí, či je neznáma hodnota obyčajný objekt.
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
 * Prevedie hodnotu na nezáporné celé číslo.
 *
 * Databázové číselné hodnoty môžu byť v niektorých prípadoch
 * vrátené aj ako reťazec, preto podporujeme oba formáty.
 */
function toNonNegativeInteger(
  value: unknown,
  fallback: number,
): number {
  const parsedValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' &&
          value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.trunc(parsedValue),
  );
}

/**
 * Prevedie hodnotu na boolean bez použitia truthy/falsy skratiek.
 */
function toBoolean(
  value: unknown,
  fallback: boolean,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === 1) {
    return true;
  }

  if (value === 'false' || value === 0) {
    return false;
  }

  return fallback;
}

/**
 * Bezpečne načíta identifikátor balíka.
 */
function toPlanId(
  value: unknown,
): string {
  if (
    typeof value === 'string' &&
    value.trim().length > 0
  ) {
    return value.trim();
  }

  return DEFAULT_ENTITLEMENTS.planId;
}

/**
 * Prevedie výsledok z lib/entitlements.ts na presný verejný kontrakt API.
 *
 * Frontend dostane iba polia, ktoré potrebuje na rozhodovanie o prístupe.
 * Interné polia, Set objekt s funkciami ani databázové údaje sa nevracajú.
 */
function serializeEntitlements(
  value: unknown,
): EntitlementsResponse {
  if (!isRecord(value)) {
    throw new Error(
      'INVALID_ENTITLEMENTS_RESPONSE',
    );
  }

  const sourcePlanId = toPlanId(value.planId);

  /*
   * ADMIN sa musí rozpoznať tromi kompatibilnými spôsobmi:
   * - isAdmin z lib/entitlements.ts,
   * - hasUnlimitedAccess zo serverovej entitlement služby,
   * - interný planId === 'admin'.
   *
   * Frontend ani starší fallback už potom nemôžu zmeniť null limit
   * späť na FREE hodnotu 3.
   */
  const sourceIsAdmin = toBoolean(
    value.isAdmin,
    sourcePlanId === 'admin',
  );

  const sourceHasUnlimitedAccess = toBoolean(
    value.hasUnlimitedAccess,
    sourceIsAdmin,
  );

  const isAdmin =
    sourceIsAdmin ||
    sourceHasUnlimitedAccess ||
    sourcePlanId === 'admin';

  const hasUnlimitedAccess =
    isAdmin || sourceHasUnlimitedAccess;

  const promptsUsed = hasUnlimitedAccess
    ? 0
    : toNonNegativeInteger(
        value.promptsUsed,
        DEFAULT_ENTITLEMENTS.promptsUsed,
      );

  /*
   * null je platná obchodná hodnota a znamená neobmedzené prompty.
   * Nesmie sa poslať do toNonNegativeInteger(), pretože tá by null
   * zmenila na FREE fallback 3.
   */
  const promptLimit = hasUnlimitedAccess
    ? null
    : value.promptLimit === null
      ? null
      : toNonNegativeInteger(
          value.promptLimit,
          DEFAULT_ENTITLEMENTS.promptLimit,
        );

  const promptsRemaining =
    promptLimit === null
      ? null
      : Math.max(promptLimit - promptsUsed, 0);

  return {
    planId: isAdmin ? 'admin' : sourcePlanId,
    isAdmin,
    hasUnlimitedAccess,

    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached:
      promptLimit !== null && promptsUsed >= promptLimit,

    attachmentLimit: toNonNegativeInteger(
      value.attachmentLimit,
      DEFAULT_ENTITLEMENTS.attachmentLimit,
    ),
    basePageLimit: toNonNegativeInteger(
      value.basePageLimit,
      DEFAULT_ENTITLEMENTS.basePageLimit,
    ),
    extraPageLimit: toNonNegativeInteger(
      value.extraPageLimit,
      DEFAULT_ENTITLEMENTS.extraPageLimit,
    ),
    pagesUsed: toNonNegativeInteger(
      value.pagesUsed,
      DEFAULT_ENTITLEMENTS.pagesUsed,
    ),
  };
}

/**
 * Vytvorí alebo prevezme bezpečný identifikátor požiadavky.
 */
function resolveRequestId(
  request: NextRequest,
): string {
  const incomingRequestId =
    request.headers
      .get('x-request-id')
      ?.trim()
      .replace(
        /[^a-zA-Z0-9._:-]/g,
        '',
      )
      .slice(0, 128);

  return incomingRequestId || randomUUID();
}

/**
 * Používateľské limity ani oprávnenia sa nesmú cacheovať
 * v prehliadači, CDN, Verceli ani proxy vrstve.
 */
function createNoStoreHeaders(
  requestId: string,
): Headers {
  const headers = new Headers();

  headers.set(
    'Cache-Control',
    'private, no-store, no-cache, max-age=0, must-revalidate',
  );
  headers.set(
    'CDN-Cache-Control',
    'no-store',
  );
  headers.set(
    'Vercel-CDN-Cache-Control',
    'no-store',
  );
  headers.set(
    'Surrogate-Control',
    'no-store',
  );
  headers.set(
    'Pragma',
    'no-cache',
  );
  headers.set(
    'Expires',
    '0',
  );
  headers.set(
    'Vary',
    'Cookie, Authorization',
  );
  headers.set(
    'X-Content-Type-Options',
    'nosniff',
  );
  headers.set(
    'X-Request-Id',
    requestId,
  );

  return headers;
}

function getErrorMetadata(
  error: unknown,
): ErrorWithMetadata {
  if (!isRecord(error)) {
    return {};
  }

  return {
    code: error.code,
    status: error.status,
    message: error.message,
    name: error.name,
  };
}

/**
 * Rozpozná chyby chýbajúcej alebo neplatnej používateľskej relácie.
 */
function isUnauthenticatedError(
  error: unknown,
): boolean {
  const metadata =
    getErrorMetadata(error);

  const code =
    typeof metadata.code === 'string'
      ? metadata.code.toUpperCase()
      : '';

  const status =
    typeof metadata.status === 'number'
      ? metadata.status
      : Number.NaN;

  const name =
    typeof metadata.name === 'string'
      ? metadata.name.toLowerCase()
      : '';

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof metadata.message === 'string'
        ? metadata.message.toLowerCase()
        : '';

  if (
    code === 'UNAUTHENTICATED' ||
    code === 'AUTH_SESSION_MISSING' ||
    status === 401 ||
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

function getDevelopmentDetails(
  error: unknown,
): string | undefined {
  if (
    process.env.NODE_ENV !==
    'development'
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
  const metadata =
    getErrorMetadata(error);

  console.error(
    '[GET /api/entitlements/me] Načítanie oprávnení zlyhalo.',
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

/**
 * GET /api/entitlements/me
 *
 * Autoritatívny serverový zdroj aktuálneho stavu používateľa.
 *
 * Úspešná odpoveď:
 * {
 *   "planId": "free",
 *   "isAdmin": false,
 *   "hasUnlimitedAccess": false,
 *   "promptLimit": null,
 *   "promptsUsed": 0,
 *   "promptsRemaining": null,
 *   "promptLimitReached": false,
 *   "attachmentLimit": 1,
 *   "basePageLimit": 3,
 *   "extraPageLimit": 0,
 *   "pagesUsed": 0
 * }
 */
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    EntitlementsResponse | ErrorResponse
  >
> {
  const requestId =
    resolveRequestId(request);

  const headers =
    createNoStoreHeaders(requestId);

  try {
    /*
     * getCurrentEntitlements() musí načítať používateľa zo serverovej
     * Supabase relácie a následne overiť jeho údaje v databáze.
     *
     * Endpoint úmyselne neprijíma planId, admin flag ani limity z klienta.
     */
    const currentEntitlements =
      await getCurrentEntitlements();

    const response =
      serializeEntitlements(
        currentEntitlements,
      );

    return NextResponse.json(
      response,
      {
        status: 200,
        headers,
      },
    );
  } catch (error: unknown) {
    logRouteError(
      error,
      requestId,
    );

    if (isUnauthenticatedError(error)) {
      const response: ErrorResponse = {
        error: 'UNAUTHENTICATED',
        message:
          'Pre načítanie používateľských oprávnení sa musíte prihlásiť a mať potvrdený účet.',
        requestId,
      };

      return NextResponse.json(
        response,
        {
          status: 401,
          headers,
        },
      );
    }

    const isInvalidResponse =
      error instanceof Error &&
      error.message ===
        'INVALID_ENTITLEMENTS_RESPONSE';

    const details =
      getDevelopmentDetails(error);

    const response: ErrorResponse = {
      error: isInvalidResponse
        ? 'INVALID_ENTITLEMENTS_RESPONSE'
        : 'ENTITLEMENTS_LOAD_FAILED',
      message: isInvalidResponse
        ? 'Server vrátil neplatný formát používateľských oprávnení.'
        : 'Používateľské oprávnenia sa nepodarilo načítať.',
      requestId,
      ...(details
        ? {
            details,
          }
        : {}),
    };

    return NextResponse.json(
      response,
      {
        status: 500,
        headers,
      },
    );
  }
}
