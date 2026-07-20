import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';
import type { User } from '@supabase/supabase-js';

import { getCurrentEntitlements } from '@/lib/entitlements';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Autoritatívny endpoint oprávnení aktuálne prihláseného používateľa.
 *
 * Podporované spôsoby pridelenia administrátorského prístupu:
 * 1. používateľ je označený ako admin v lib/entitlements.ts / databáze,
 * 2. používateľ má serverové app_metadata.role === 'admin',
 * 3. jeho e-mail je uvedený v serverovej premennej ZEDPERA_ADMIN_EMAILS.
 *
 * Heslo sa v tomto súbore nikdy nekontroluje ani neukladá. Heslo overuje
 * výhradne Supabase Auth pri signInWithPassword(). Tento endpoint pracuje
 * až s už vytvorenou a serverom overenou používateľskou reláciou.
 *
 * Príklad premennej vo Verceli:
 * ZEDPERA_ADMIN_EMAILS=admin@zedpera.com,druhy.admin@zedpera.com
 *
 * Viaceré zariadenia môžu používať aj ten istý administrátorský účet.
 * Tento endpoint nevytvára žiadny globálny zámok ani obmedzenie na jednu
 * aktívnu reláciu.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Číselný fallback pre staršie časti frontendu, ktoré ešte nevedia pracovať
 * s null pri prílohách alebo stranách. Autoritatívnym údajom pre admina je
 * hasUnlimitedAccess === true.
 */
const ADMIN_UNLIMITED_NUMERIC_LIMIT = 2_147_483_647;

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

const ADMIN_EMAIL_ENV_KEYS = [
  'ZEDPERA_ADMIN_EMAILS',
  'ADMIN_EMAILS',
  'ADMIN_EMAIL',
] as const;

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

type AppMetadata = Record<string, unknown>;

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
 * Normalizuje e-mail na porovnanie bez ohľadu na veľkosť písmen.
 */
function normalizeEmail(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

/**
 * Načíta všetky administrátorské e-maily zo serverových premenných.
 * Podporuje oddelenie čiarkou, bodkočiarkou, medzerou alebo novým riadkom.
 */
function getConfiguredAdminEmails(): Set<string> {
  const result = new Set<string>();

  for (const envKey of ADMIN_EMAIL_ENV_KEYS) {
    const rawValue = process.env[envKey];

    if (!rawValue) {
      continue;
    }

    for (const value of rawValue.split(/[\s,;]+/g)) {
      const email = normalizeEmail(value);

      if (email) {
        result.add(email);
      }
    }
  }

  return result;
}

/**
 * Overí administrátorský e-mail výhradne oproti serverovej konfigurácii.
 * E-mail z query parametra, localStorage ani request body sa nepoužíva.
 */
function isConfiguredAdminEmail(
  email: string | null | undefined,
): boolean {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return getConfiguredAdminEmails().has(
    normalizedEmail,
  );
}

/**
 * app_metadata je možné bezpečne nastavovať iba zo servera/service-role.
 * user_metadata sa zámerne nepoužíva, pretože používateľ si ju môže meniť.
 */
function isAdminFromAppMetadata(
  user: User,
): boolean {
  const metadata: AppMetadata = isRecord(
    user.app_metadata,
  )
    ? user.app_metadata
    : {};

  const role =
    typeof metadata.role === 'string'
      ? metadata.role.trim().toLowerCase()
      : '';

  const roles = Array.isArray(metadata.roles)
    ? metadata.roles
        .filter(
          (value): value is string =>
            typeof value === 'string',
        )
        .map((value) =>
          value.trim().toLowerCase(),
        )
    : [];

  return (
    role === 'admin' ||
    roles.includes('admin') ||
    metadata.is_admin === true ||
    metadata.isAdmin === true
  );
}

/**
 * Vytvorí štandardizovanú chybu neprihláseného používateľa.
 */
function createUnauthenticatedError(
  message: string,
): Error & {
  code: 'UNAUTHENTICATED';
  status: 401;
} {
  const error = new Error(message) as Error & {
    code: 'UNAUTHENTICATED';
    status: 401;
  };

  error.code = 'UNAUTHENTICATED';
  error.status = 401;

  return error;
}

/**
 * Načíta a serverovo overí aktuálneho používateľa zo Supabase cookies.
 * getUser() overuje token proti Supabase Auth serveru a nespolieha sa iba
 * na lokálne dekódovanie session.
 */
async function getAuthenticatedUser(): Promise<User> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw createUnauthenticatedError(
      error?.message ||
        'Používateľská relácia neexistuje alebo už nie je platná.',
    );
  }

  return data.user;
}

/**
 * Prevedie hodnotu na nezáporné celé číslo.
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
 * Prevedie hodnotu na boolean bez použitia nejednoznačného truthy/falsy.
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
function toPlanId(value: unknown): string {
  if (
    typeof value === 'string' &&
    value.trim().length > 0
  ) {
    return value.trim();
  }

  return DEFAULT_ENTITLEMENTS.planId;
}

/**
 * Kompletná odpoveď pre administrátora. Každá platná session rovnakého
 * administrátorského účtu dostane rovnaký neobmedzený prístup.
 */
function createAdminEntitlementsResponse(): EntitlementsResponse {
  return {
    planId: 'admin',
    isAdmin: true,
    hasUnlimitedAccess: true,

    promptLimit: null,
    promptsUsed: 0,
    promptsRemaining: null,
    promptLimitReached: false,

    attachmentLimit:
      ADMIN_UNLIMITED_NUMERIC_LIMIT,
    basePageLimit:
      ADMIN_UNLIMITED_NUMERIC_LIMIT,
    extraPageLimit: 0,
    pagesUsed: 0,
  };
}

/**
 * Prevedie výsledok z lib/entitlements.ts na verejný kontrakt API.
 */
function serializeEntitlements(
  value: unknown,
): EntitlementsResponse {
  if (!isRecord(value)) {
    throw new Error(
      'INVALID_ENTITLEMENTS_RESPONSE',
    );
  }

  const sourcePlanId = toPlanId(
    value.planId,
  );

  const sourceIsAdmin = toBoolean(
    value.isAdmin,
    sourcePlanId === 'admin',
  );

  const sourceHasUnlimitedAccess =
    toBoolean(
      value.hasUnlimitedAccess,
      sourceIsAdmin,
    );

  const isAdmin =
    sourceIsAdmin ||
    sourceHasUnlimitedAccess ||
    sourcePlanId === 'admin';

  if (isAdmin) {
    return createAdminEntitlementsResponse();
  }

  const promptsUsed =
    toNonNegativeInteger(
      value.promptsUsed,
      DEFAULT_ENTITLEMENTS.promptsUsed,
    );

  const promptLimit =
    value.promptLimit === null
      ? null
      : toNonNegativeInteger(
          value.promptLimit,
          DEFAULT_ENTITLEMENTS.promptLimit,
        );

  const promptsRemaining =
    promptLimit === null
      ? null
      : Math.max(
          promptLimit - promptsUsed,
          0,
        );

  return {
    planId: sourcePlanId,
    isAdmin: false,
    hasUnlimitedAccess: false,

    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached:
      promptLimit !== null &&
      promptsUsed >= promptLimit,

    attachmentLimit:
      toNonNegativeInteger(
        value.attachmentLimit,
        DEFAULT_ENTITLEMENTS.attachmentLimit,
      ),
    basePageLimit:
      toNonNegativeInteger(
        value.basePageLimit,
        DEFAULT_ENTITLEMENTS.basePageLimit,
      ),
    extraPageLimit:
      toNonNegativeInteger(
        value.extraPageLimit,
        DEFAULT_ENTITLEMENTS.extraPageLimit,
      ),
    pagesUsed:
      toNonNegativeInteger(
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
 * Používateľské limity ani oprávnenia sa nesmú cacheovať.
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
  const metadata = getErrorMetadata(error);

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
  const metadata = getErrorMetadata(error);

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
 * Postup:
 * 1. overí aktuálnu Supabase session cez auth.getUser(),
 * 2. ak je e-mail v ZEDPERA_ADMIN_EMAILS, vráti admin prístup okamžite,
 * 3. ak má používateľ admin app_metadata, vráti admin prístup,
 * 4. inak načíta jeho balík a rolu z lib/entitlements.ts.
 */
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    EntitlementsResponse | ErrorResponse
  >
> {
  const requestId = resolveRequestId(
    request,
  );

  const headers = createNoStoreHeaders(
    requestId,
  );

  try {
    const authenticatedUser =
      await getAuthenticatedUser();

    const isExplicitAdmin =
      isConfiguredAdminEmail(
        authenticatedUser.email,
      ) ||
      isAdminFromAppMetadata(
        authenticatedUser,
      );

    /*
     * Administrátor uvedený v serverovej konfigurácii nesmie byť zablokovaný
     * chýbajúcim alebo starým riadkom v entitlement tabuľke. Po úspešnom
     * overení Supabase session dostane administrátorskú odpoveď priamo.
     */
    if (isExplicitAdmin) {
      return NextResponse.json(
        createAdminEntitlementsResponse(),
        {
          status: 200,
          headers,
        },
      );
    }

    const currentEntitlements =
      await getCurrentEntitlements();

    const response = serializeEntitlements(
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
          'Pre načítanie používateľských oprávnení sa musíte prihlásiť platným e-mailom a heslom.',
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
