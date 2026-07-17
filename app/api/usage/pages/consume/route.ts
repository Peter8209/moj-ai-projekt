import { randomUUID } from 'node:crypto';

import {
  NextResponse,
  type NextRequest,
} from 'next/server';

import {
  consumePagesForOutput,
  countGeneratedPages,
  PageLimitError,
  type PageQuota,
} from '@/lib/page-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Maximálna povolená dĺžka textu odoslaného na odpočítanie strán.
 *
 * Hodnota predstavuje ochranu API pred neprimerane veľkými vstupmi.
 * Pri 1 800 znakoch na stranu ide približne o viac než 2 700 strán.
 */
const MAX_TEXT_LENGTH = 5_000_000;

/**
 * Maximálna dĺžka názvu modulu.
 *
 * Musí zodpovedať limitu použitému v lib/page-quota.ts.
 */
const MAX_MODULE_LENGTH = 100;

/**
 * Maximálna dĺžka requestId.
 *
 * Identifikátor sa používa na zabezpečenie idempotentnosti spotreby.
 */
const MAX_REQUEST_ID_LENGTH = 255;

/**
 * Hlavičky zakazujúce ukladanie odpovede do cache.
 *
 * Stav kvóty sa môže meniť po každej požiadavke, preto odpoveď
 * nesmie byť uložená v prehliadači, proxy ani CDN.
 */
const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

type ConsumePagesRequestBody = {
  text?: unknown;
  module?: unknown;
  requestId?: unknown;
};

type ConsumePagesSuccessResponse = {
  ok: true;

  /**
   * Jedinečný identifikátor spotreby.
   */
  requestId: string;

  /**
   * Počet strán vypočítaný zo zaslaného textu.
   *
   * Pri administrátorovi sa hodnota vypočíta iba informatívne,
   * ale zo stránkovej kvóty sa neodpočíta.
   */
  calculatedPages: number;

  /**
   * Počet strán skutočne odpočítaný z používateľskej kvóty.
   *
   * Pre administrátora je vždy 0.
   */
  consumedPages: number;

  /**
   * true znamená, že spotreba bola preskočená, pretože používateľ
   * má administrátorský alebo iný neobmedzený prístup.
   */
  usageBypassed: boolean;
} & PageQuota;

type ConsumePagesErrorCode =
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_JSON'
  | 'INVALID_REQUEST'
  | 'TEXT_REQUIRED'
  | 'TEXT_TOO_LARGE'
  | 'MODULE_REQUIRED'
  | 'INVALID_MODULE'
  | 'REQUEST_ID_REQUIRED'
  | 'INVALID_REQUEST_ID'
  | 'REQUEST_ID_MISMATCH'
  | 'UNAUTHENTICATED'
  | 'PAGE_LIMIT_REACHED'
  | 'PAGE_QUOTA_CONSUME_FAILED'
  | 'INTERNAL_SERVER_ERROR';

type ConsumePagesErrorResponse = {
  ok: false;
  code: ConsumePagesErrorCode;
  message: string;

  /**
   * Identifikátor konkrétnej serverovej chyby.
   *
   * Používateľ ho môže poskytnúť podpore bez toho, aby API
   * sprístupnilo citlivé databázové informácie.
   */
  errorId: string;

  /**
   * Technický detail sa vracia iba vo vývojovom prostredí.
   */
  detail?: string;
};

type ConsumePagesApiResponse =
  | ConsumePagesSuccessResponse
  | ConsumePagesErrorResponse;

type ErrorWithCode = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

/**
 * Vytvorí JSON odpoveď s jednotnými no-cache hlavičkami.
 */
function createJsonResponse<T>(
  body: T,
  status = 200,
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * Overí, či je hodnota obyčajný objekt.
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
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
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

  if (isRecord(error)) {
    const message =
      error.message;

    if (typeof message === 'string') {
      return (
        message.trim() ||
        'UNKNOWN_ERROR'
      );
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
 * Bezpečne získa aplikačný kód chyby.
 */
function getErrorCode(
  error: unknown,
): string {
  if (!isRecord(error)) {
    return '';
  }

  return toTrimmedString(
    (error as ErrorWithCode).code,
  ).toUpperCase();
}

/**
 * Overí, či technická správa obsahuje konkrétny aplikačný kód.
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
    normalizedMessage ===
      normalizedPrefix ||
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
  return (
    getErrorCode(error) ===
      'UNAUTHENTICATED' ||
    hasErrorPrefix(
      message,
      'UNAUTHENTICATED',
    )
  );
}

/**
 * Overí chybu vyčerpaného stránkového limitu.
 *
 * Kontroluje instanceof aj aplikačný kód pre prípad, že chyba prešla
 * cez inú serverovú vrstvu a stratila pôvodný prototyp.
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
 * Technické detaily sa klientovi zobrazia iba mimo produkcie.
 */
function getDevelopmentDetail(
  message: string,
): Pick<
  ConsumePagesErrorResponse,
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

/**
 * Vráti jednotnú validačnú chybu.
 */
function createValidationError(
  code: ConsumePagesErrorCode,
  message: string,
  errorId: string,
  status = 400,
): NextResponse<ConsumePagesErrorResponse> {
  return createJsonResponse(
    {
      ok: false,
      code,
      message,
      errorId,
    },
    status,
  );
}

/**
 * Bezpečne načíta JSON telo požiadavky.
 */
async function readJsonBody(
  request: NextRequest,
): Promise<
  | {
      ok: true;
      body: ConsumePagesRequestBody;
    }
  | {
      ok: false;
      reason: 'INVALID_JSON';
    }
> {
  try {
    const parsed: unknown =
      await request.json();

    if (!isRecord(parsed)) {
      return {
        ok: true,
        body: {},
      };
    }

    return {
      ok: true,
      body:
        parsed as ConsumePagesRequestBody,
    };
  } catch {
    return {
      ok: false,
      reason: 'INVALID_JSON',
    };
  }
}

/**
 * Získa requestId z tela požiadavky alebo z hlavičky Idempotency-Key.
 *
 * Uprednostňuje sa requestId v tele. Ak sú prítomné obe hodnoty,
 * musia byť rovnaké.
 */
function resolveRequestId(
  request: NextRequest,
  bodyRequestId: unknown,
):
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
    } {
  const requestIdFromBody =
    toTrimmedString(
      bodyRequestId,
    );

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
      code:
        'REQUEST_ID_MISMATCH',
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
      code:
        'REQUEST_ID_REQUIRED',
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
      code:
        'INVALID_REQUEST_ID',
      message:
        `requestId môže obsahovať najviac ${MAX_REQUEST_ID_LENGTH} znakov.`,
    };
  }

  return {
    ok: true,
    requestId,
  };
}

/**
 * POST /api/usage/pages/consume
 *
 * Odpočíta strany podľa skutočnej dĺžky vygenerovaného výstupu.
 *
 * Administrátorský alebo iný neobmedzený účet:
 * - text sa vyhodnotí a vypočíta sa calculatedPages,
 * - databázová spotreba sa preskočí v lib/page-quota.ts,
 * - consumedPages je 0,
 * - usageBypassed je true.
 *
 * Očakávané telo:
 *
 * {
 *   "text": "Vygenerovaný text...",
 *   "module": "chat",
 *   "requestId": "jedinečný-identifikátor"
 * }
 *
 * requestId možno poslať aj cez hlavičku:
 *
 * Idempotency-Key: jedinečný-identifikátor
 */
export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ConsumePagesApiResponse>
> {
  const errorId = randomUUID();

  /**
   * Endpoint prijíma iba JSON požiadavky.
   */
  const contentType =
    request.headers.get(
      'content-type',
    ) ?? '';

  if (
    !contentType
      .toLowerCase()
      .includes(
        'application/json',
      )
  ) {
    return createValidationError(
      'INVALID_CONTENT_TYPE',
      'Požiadavka musí používať Content-Type application/json.',
      errorId,
      415,
    );
  }

  const parsedBody =
    await readJsonBody(request);

  if (!parsedBody.ok) {
    return createValidationError(
      'INVALID_JSON',
      'Telo požiadavky neobsahuje platný JSON.',
      errorId,
    );
  }

  const { body } = parsedBody;

  if (!isRecord(body)) {
    return createValidationError(
      'INVALID_REQUEST',
      'Telo požiadavky musí byť JSON objekt.',
      errorId,
    );
  }

  /**
   * Validácia textu.
   */
  if (
    typeof body.text !==
    'string'
  ) {
    return createValidationError(
      'TEXT_REQUIRED',
      'Pole text je povinné a musí obsahovať textovú hodnotu.',
      errorId,
    );
  }

  const text = body.text;

  if (!text.trim()) {
    return createValidationError(
      'TEXT_REQUIRED',
      'Nie je možné odpočítať strany za prázdny text.',
      errorId,
    );
  }

  if (
    text.length >
    MAX_TEXT_LENGTH
  ) {
    return createValidationError(
      'TEXT_TOO_LARGE',
      `Text môže obsahovať najviac ${MAX_TEXT_LENGTH.toLocaleString(
        'sk-SK',
      )} znakov.`,
      errorId,
      413,
    );
  }

  /**
   * Validácia modulu.
   */
  if (
    typeof body.module !==
    'string'
  ) {
    return createValidationError(
      'MODULE_REQUIRED',
      'Pole module je povinné a musí obsahovať názov modulu.',
      errorId,
    );
  }

  const module =
    body.module.trim();

  if (!module) {
    return createValidationError(
      'MODULE_REQUIRED',
      'Názov modulu nesmie byť prázdny.',
      errorId,
    );
  }

  if (
    module.length >
    MAX_MODULE_LENGTH
  ) {
    return createValidationError(
      'INVALID_MODULE',
      `Názov modulu môže obsahovať najviac ${MAX_MODULE_LENGTH} znakov.`,
      errorId,
    );
  }

  /**
   * Validácia requestId a hlavičky Idempotency-Key.
   */
  const requestIdResult =
    resolveRequestId(
      request,
      body.requestId,
    );

  if (!requestIdResult.ok) {
    return createValidationError(
      requestIdResult.code,
      requestIdResult.message,
      errorId,
    );
  }

  const { requestId } =
    requestIdResult;

  const calculatedPages =
    countGeneratedPages(text);

  try {
    const quota =
      await consumePagesForOutput({
        text,
        module,
        requestId,
      });

    /**
     * Administrátorovi ani inému neobmedzenému účtu sa stránky
     * neodpočítavajú. Výpočet calculatedPages zostáva vo výstupe
     * iba ako informatívny údaj pre diagnostiku a frontend.
     */
    const usageBypassed =
      quota.isAdmin ||
      quota.isUnlimited;

    const consumedPages =
      usageBypassed
        ? 0
        : calculatedPages;

    return createJsonResponse<ConsumePagesSuccessResponse>(
      {
        ok: true,
        requestId,
        calculatedPages,
        consumedPages,
        usageBypassed,
        ...quota,
      },
      200,
    );
  } catch (error: unknown) {
    const technicalMessage =
      getErrorMessage(error);

    /**
     * Používateľ nie je prihlásený alebo jeho relácia vypršala.
     */
    if (
      isUnauthenticatedError(
        error,
        technicalMessage,
      )
    ) {
      console.warn(
        '[POST /api/usage/pages/consume] Unauthenticated request.',
        {
          errorId,
          requestId,
          module,
          message:
            technicalMessage,
        },
      );

      return createJsonResponse<ConsumePagesErrorResponse>(
        {
          ok: false,
          code:
            'UNAUTHENTICATED',
          message:
            'Používateľ nie je prihlásený alebo jeho relácia vypršala.',
          errorId,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        401,
      );
    }

    /**
     * Používateľ nemá dostatok strán.
     */
    if (
      isPageLimitError(
        error,
        technicalMessage,
      )
    ) {
      const message =
        error instanceof
        PageLimitError
          ? error.message
          : 'Stránkový limit bol vyčerpaný. Pre pokračovanie si dokúpte ďalšie strany alebo aktivujte vyšší balík.';

      console.warn(
        '[POST /api/usage/pages/consume] Page limit reached.',
        {
          errorId,
          requestId,
          module,
          requestedPages:
            calculatedPages,
          message:
            technicalMessage,
        },
      );

      return createJsonResponse<ConsumePagesErrorResponse>(
        {
          ok: false,
          code:
            'PAGE_LIMIT_REACHED',
          message,
          errorId,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        402,
      );
    }

    /**
     * Neplatný requestId zachytený v knižnici.
     *
     * Bežne by k tejto chybe nemalo dôjsť, pretože requestId
     * sa kontroluje ešte pred volaním consumePagesForOutput.
     */
    if (
      hasErrorPrefix(
        technicalMessage,
        'INVALID_REQUEST_ID',
      )
    ) {
      console.warn(
        '[POST /api/usage/pages/consume] Invalid request ID.',
        {
          errorId,
          requestId,
          module,
          message:
            technicalMessage,
        },
      );

      return createJsonResponse<ConsumePagesErrorResponse>(
        {
          ok: false,
          code:
            'INVALID_REQUEST_ID',
          message:
            'Identifikátor požiadavky nie je platný.',
          errorId,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        400,
      );
    }

    /**
     * Databázová chyba pri odpočítaní strán.
     */
    if (
      hasErrorPrefix(
        technicalMessage,
        'PAGE_QUOTA_CONSUME_FAILED',
      ) ||
      hasErrorPrefix(
        technicalMessage,
        'PAGE_QUOTA_CONSUME_EMPTY_RESPONSE',
      )
    ) {
      console.error(
        '[POST /api/usage/pages/consume] Page quota consumption failed.',
        {
          errorId,
          requestId,
          module,
          requestedPages:
            calculatedPages,
          message:
            technicalMessage,
          error,
        },
      );

      return createJsonResponse<ConsumePagesErrorResponse>(
        {
          ok: false,
          code:
            'PAGE_QUOTA_CONSUME_FAILED',
          message:
            'Spotrebu strán sa nepodarilo zaznamenať. Skúste požiadavku zopakovať.',
          errorId,
          ...getDevelopmentDetail(
            technicalMessage,
          ),
        },
        500,
      );
    }

    /**
     * Neočakávaná serverová chyba.
     */
    console.error(
      '[POST /api/usage/pages/consume] Unexpected server error.',
      {
        errorId,
        requestId,
        module,
        requestedPages:
          calculatedPages,
        message:
          technicalMessage,
        error,
      },
    );

    return createJsonResponse<ConsumePagesErrorResponse>(
      {
        ok: false,
        code:
          'INTERNAL_SERVER_ERROR',
        message:
          'Pri zaznamenávaní spotreby strán nastala neočakávaná chyba.',
        errorId,
        ...getDevelopmentDetail(
          technicalMessage,
        ),
      },
      500,
    );
  }
}