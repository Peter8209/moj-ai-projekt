import { NextRequest, NextResponse } from 'next/server';

import { getCurrentEntitlements } from '@/lib/entitlements';

/**
 * Endpoint pracuje s používateľskou reláciou a Supabase klientom,
 * preto nesmie byť staticky generovaný ani cacheovaný.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Výstup funkcie getCurrentEntitlements().
 *
 * Typ sa odvodzuje automaticky, takže route zostane synchronizovaná
 * s lib/entitlements.ts aj po doplnení ďalších entitlement polí.
 */
type CurrentEntitlementsResult = Awaited<
  ReturnType<typeof getCurrentEntitlements>
>;

/**
 * Objekt Set nie je možné priamo serializovať do JSON.
 * Preto sa pole features mení na klasické zoradené pole.
 */
type SerializedEntitlements = Omit<
  CurrentEntitlementsResult,
  'features' | 'addonIds'
> & {
  addonIds: CurrentEntitlementsResult['addonIds'];
  features: Array<
    CurrentEntitlementsResult['features'] extends Set<infer T>
      ? T
      : never
  >;
};

type SuccessResponse = SerializedEntitlements & {
  success: true;
  meta: {
    requestId: string;
    generatedAt: string;
  };
};

type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'ENTITLEMENTS_LOAD_FAILED'
  | 'INTERNAL_SERVER_ERROR';

type ErrorResponse = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: string;
  };
};

type ErrorDescriptor = {
  status: number;
  code: ErrorCode;
  message: string;
};

/**
 * Overenie, či je hodnota objekt.
 */
function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null
  );
}

/**
 * Bezpečné načítanie textovej vlastnosti z neznámeho objektu.
 */
function getStringProperty(
  value: unknown,
  property: string,
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[property];

  return typeof propertyValue === 'string'
    ? propertyValue
    : undefined;
}

/**
 * Bezpečné načítanie číselnej vlastnosti z neznámeho objektu.
 */
function getNumberProperty(
  value: unknown,
  property: string,
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[property];

  return typeof propertyValue === 'number' &&
    Number.isFinite(propertyValue)
    ? propertyValue
    : undefined;
}

/**
 * Vytvorenie alebo prevzatie identifikátora požiadavky.
 *
 * Request ID umožňuje:
 * - dohľadať chybu v serverových logoch,
 * - prepojiť frontendovú chybu so serverovou chybou,
 * - jednoduchšie diagnostikovať produkčné problémy.
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

    if (sanitizedRequestId.length > 0) {
      return sanitizedRequestId;
    }
  }

  return crypto.randomUUID();
}

/**
 * Hlavičky zabraňujúce uloženiu používateľských oprávnení
 * do cache prehliadača, CDN alebo proxy servera.
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
    requestId,
  );

  return headers;
}

/**
 * Prevedenie entitlement objektu na JSON kompatibilnú štruktúru.
 *
 * Set<FeatureKey> sa prevedie na zoradené pole.
 */
function serializeEntitlements(
  entitlements: CurrentEntitlementsResult,
): SerializedEntitlements {
  const {
    features,
    addonIds,
    ...remainingEntitlements
  } = entitlements;

  return {
    ...remainingEntitlements,
    addonIds: [...addonIds],
    features: Array.from(features).sort(
      (firstFeature, secondFeature) =>
        String(firstFeature).localeCompare(
          String(secondFeature),
        ),
    ),
  };
}

/**
 * Overenie, či chyba súvisí s neprihláseným používateľom.
 *
 * Podporuje:
 * - UnauthenticatedError z lib/entitlements.ts,
 * - pôvodnú chybu Error('UNAUTHENTICATED'),
 * - bežné Supabase autentifikačné chyby.
 */
function isUnauthenticatedError(
  error: unknown,
): boolean {
  const errorCode =
    getStringProperty(error, 'code');

  const errorMessage =
    error instanceof Error
      ? error.message
      : getStringProperty(
          error,
          'message',
        );

  const errorStatus =
    getNumberProperty(error, 'status');

  if (
    errorCode === 'UNAUTHENTICATED' ||
    errorStatus === 401
  ) {
    return true;
  }

  if (!errorMessage) {
    return false;
  }

  const normalizedMessage =
    errorMessage
      .trim()
      .toLowerCase();

  return [
    'unauthenticated',
    'auth session missing',
    'session missing',
    'jwt expired',
    'invalid jwt',
    'invalid token',
    'user not found',
  ].some((knownMessage) =>
    normalizedMessage.includes(
      knownMessage,
    ),
  );
}

/**
 * Prevod chyby na bezpečnú HTTP odpoveď.
 */
function describeError(
  error: unknown,
): ErrorDescriptor {
  if (isUnauthenticatedError(error)) {
    return {
      status: 401,
      code: 'UNAUTHENTICATED',
      message:
        'Pre načítanie oprávnení sa musíte prihlásiť.',
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      code: 'ENTITLEMENTS_LOAD_FAILED',
      message:
        'Používateľské oprávnenia sa nepodarilo načítať.',
    };
  }

  return {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message:
      'Pri spracovaní požiadavky nastala neočakávaná chyba.',
  };
}

/**
 * Detail chyby sa vracia klientovi iba vo vývojovom prostredí.
 *
 * V produkcii sa interné databázové a autentifikačné správy
 * nesmú zobrazovať používateľovi.
 */
function getDevelopmentErrorDetails(
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

/**
 * Bezpečné zapísanie chyby do serverových logov.
 */
function logRouteError(
  error: unknown,
  requestId: string,
): void {
  if (error instanceof Error) {
    console.error(
      '[GET /api/entitlements/me] Načítanie oprávnení zlyhalo.',
      {
        requestId,
        name: error.name,
        message: error.message,
        code: getStringProperty(
          error,
          'code',
        ),
        status: getNumberProperty(
          error,
          'status',
        ),
        stack:
          process.env.NODE_ENV ===
          'development'
            ? error.stack
            : undefined,
      },
    );

    return;
  }

  console.error(
    '[GET /api/entitlements/me] Nastala neznáma chyba.',
    {
      requestId,
      error,
    },
  );
}

/**
 * GET /api/entitlements/me
 *
 * Vráti oprávnenia aktuálne prihláseného používateľa:
 *
 * - identifikátor používateľa,
 * - aktivovaný balík,
 * - aktivované doplnky,
 * - dostupné funkcie,
 * - limit promptov,
 * - spotrebované prompty,
 * - zostávajúce prompty,
 * - limit príloh.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<
  SuccessResponse | ErrorResponse
>> {
  const requestId =
    resolveRequestId(request);

  const headers =
    createResponseHeaders(requestId);

  try {
    const entitlements =
      await getCurrentEntitlements();

    const serializedEntitlements =
      serializeEntitlements(
        entitlements,
      );

    const response: SuccessResponse = {
      success: true,
      ...serializedEntitlements,
      meta: {
        requestId,
        generatedAt:
          new Date().toISOString(),
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
    logRouteError(
      error,
      requestId,
    );

    const errorDescriptor =
      describeError(error);

    const details =
      getDevelopmentErrorDetails(
        error,
      );

    const response: ErrorResponse = {
      success: false,
      error: {
        code:
          errorDescriptor.code,
        message:
          errorDescriptor.message,
        requestId,
        ...(details
          ? {
              details,
            }
          : {}),
      },
    };

    return NextResponse.json(
      response,
      {
        status:
          errorDescriptor.status,
        headers,
      },
    );
  }
}