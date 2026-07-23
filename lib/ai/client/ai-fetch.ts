import {
  AI_REQUEST_TIMEOUT_MS,
  isImmediateAiError,
  waitForMinimumErrorDelay,
} from '@/lib/ai/config';

/**
 * Jednotný formát chybovej odpovede AI API.
 *
 * Typ je zámerne tolerantný, aby zostal kompatibilný so staršími aj novšími
 * API routami. Známe polia sú typované a všetky doplnkové údaje sa zachovajú.
 */
export type AiErrorPayload = {
  ok?: false;
  success?: false;
  code: string;
  technicalCode?: string;
  status?: number;
  title?: string;
  message?: string;
  detail?: string;
  requestId?: string;
  errorId?: string;
  endpoint?: string;
  module?: string;
  retryable?: boolean;
  blocking?: boolean;
  actionKind?: string;
  actionLabel?: string;
  actionUrl?: string;
  [key: string]: unknown;
};

/**
 * Rozšírené RequestInit pre AI požiadavky.
 *
 * timeoutMs je voliteľný iba pre výnimočné prípady. Ak sa neuvedie, použije sa
 * centrálna hodnota AI_REQUEST_TIMEOUT_MS z lib/ai/config.ts.
 */
export type AiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

type AiFetchErrorOptions = {
  status: number;
  response?: Response;
  cause?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeStatus(value: unknown, fallback: number): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numeric));
}

function normalizeErrorCode(
  value: unknown,
  status: number,
): string {
  const explicitCode = cleanString(value)
    .toUpperCase()
    .replace(/[\s.-]+/g, '_');

  if (explicitCode) {
    return explicitCode;
  }

  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'ACCESS_DENIED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 408 || status === 504) {
    return 'REQUEST_TIMEOUT';
  }
  if (status === 413) {
    return 'PROVIDER_CONTEXT_TOO_LARGE';
  }
  if (status === 415) {
    return 'ATTACHMENT_UNSUPPORTED_TYPE';
  }
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 502 || status === 503) {
    return 'API_UNAVAILABLE';
  }
  if (status >= 500) return 'INTERNAL_SERVER_ERROR';

  return 'INVALID_REQUEST';
}

function getRequestId(headers?: HeadersInit): string {
  try {
    return new Headers(headers).get('x-request-id')?.trim() || '';
  } catch {
    return '';
  }
}

function getEndpoint(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function defaultMessageForCode(code: string): string {
  if (code === 'REQUEST_TIMEOUT') {
    return 'Spracovanie požiadavky prekročilo povolený časový limit.';
  }

  if (code === 'NETWORK_ERROR') {
    return 'Spojenie so serverom sa nepodarilo vytvoriť alebo bolo prerušené.';
  }

  return 'AI požiadavku sa nepodarilo dokončiť.';
}

function createErrorPayload({
  code,
  status,
  message,
  requestId,
  endpoint,
  source,
}: {
  code: string;
  status: number;
  message?: string;
  requestId?: string;
  endpoint?: string;
  source?: Record<string, unknown>;
}): AiErrorPayload {
  const normalizedCode = normalizeErrorCode(code, status);

  return {
    ...(source || {}),
    ok: false,
    success: false,
    code: normalizedCode,
    technicalCode:
      cleanString(source?.technicalCode) || normalizedCode,
    status,
    message:
      cleanString(message) ||
      cleanString(source?.message) ||
      defaultMessageForCode(normalizedCode),
    ...(requestId ? { requestId } : {}),
    ...(endpoint ? { endpoint } : {}),
  };
}

/**
 * Bezpečne načíta chybový JSON bez spotrebovania pôvodného response body.
 */
export async function readAiErrorPayload(
  response: Response,
): Promise<AiErrorPayload> {
  const status = response.status;
  let parsedBody: unknown = null;
  let rawText = '';

  try {
    rawText = await response.clone().text();
  } catch {
    rawText = '';
  }

  if (rawText.trim()) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = null;
    }
  }

  const source = isRecord(parsedBody) ? parsedBody : {};
  const nestedError = isRecord(source.error) ? source.error : {};

  const code = normalizeErrorCode(
    source.code ??
      source.technicalCode ??
      nestedError.code ??
      nestedError.technicalCode,
    status,
  );

  const message =
    cleanString(source.message) ||
    cleanString(source.title) ||
    cleanString(nestedError.message) ||
    cleanString(nestedError.title) ||
    (!parsedBody ? rawText.trim() : '') ||
    response.statusText ||
    defaultMessageForCode(code);

  const requestId =
    cleanString(source.requestId) ||
    cleanString(nestedError.requestId) ||
    response.headers.get('x-request-id')?.trim() ||
    '';

  return createErrorPayload({
    code,
    status: safeStatus(source.status, status),
    message,
    requestId,
    endpoint:
      cleanString(source.endpoint) ||
      cleanString(nestedError.endpoint),
    source: {
      ...nestedError,
      ...source,
    },
  });
}

/**
 * Typovaná chyba vyhodená funkciou aiFetch().
 */
export class AiFetchError extends Error {
  readonly name = 'AiFetchError';
  readonly code: string;
  readonly status: number;
  readonly payload: AiErrorPayload;
  readonly response?: Response;
  readonly cause?: unknown;

  constructor(
    payload: AiErrorPayload,
    options: AiFetchErrorOptions,
  ) {
    super(
      cleanString(payload.message) ||
        defaultMessageForCode(payload.code),
    );

    this.code = payload.code;
    this.status = options.status;
    this.payload = payload;
    this.response = options.response;
    this.cause = options.cause;

    Object.setPrototypeOf(this, AiFetchError.prototype);
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return (
    error instanceof Error &&
    error.name === 'AbortError'
  );
}

/**
 * Jednotný fetch klient pre všetky AI endpointy.
 *
 * Zachováva pôvodnú Response pri úspechu. Pri neúspechu vyhodí AiFetchError
 * s normalizovaným payloadom. Minimálne oneskorenie chybovej odpovede a zoznam
 * okamžitých chýb riadi výhradne lib/ai/config.ts.
 */
export async function aiFetch(
  input: RequestInfo | URL,
  options: AiFetchOptions = {},
): Promise<Response> {
  const startedAt = Date.now();
  const endpoint = getEndpoint(input);

  const {
    timeoutMs = AI_REQUEST_TIMEOUT_MS,
    signal: externalSignal,
    headers,
    ...requestOptions
  } = options;

  const controller = new AbortController();
  const requestId = getRequestId(headers);
  let abortedByTimeout = false;

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal?.aborted) {
    abortFromExternalSignal();
  } else if (externalSignal) {
    externalSignal.addEventListener(
      'abort',
      abortFromExternalSignal,
      { once: true },
    );
  }

  const safeTimeoutMs = Number.isFinite(timeoutMs)
    ? Math.max(1, Math.floor(timeoutMs))
    : AI_REQUEST_TIMEOUT_MS;

  const timeoutId = setTimeout(() => {
    abortedByTimeout = true;
    controller.abort();
  }, safeTimeoutMs);

  try {
    const response = await fetch(input, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    });

    if (response.ok) {
      return response;
    }

    const payload = await readAiErrorPayload(response);

    if (!isImmediateAiError(payload.code)) {
      await waitForMinimumErrorDelay(startedAt);
    }

    throw new AiFetchError(payload, {
      status: response.status,
      response,
    });
  } catch (error: unknown) {
    if (error instanceof AiFetchError) {
      throw error;
    }

    const code = abortedByTimeout
      ? 'REQUEST_TIMEOUT'
      : isAbortError(error)
        ? 'REQUEST_ABORTED'
        : 'NETWORK_ERROR';

    const status = abortedByTimeout ? 408 : 0;
    const payload = createErrorPayload({
      code,
      status,
      requestId,
      endpoint,
      message:
        abortedByTimeout
          ? `AI požiadavka nebola dokončená do ${safeTimeoutMs} ms.`
          : isAbortError(error)
            ? 'AI požiadavka bola prerušená.'
            : error instanceof Error
              ? error.message
              : 'Nepodarilo sa spojiť s AI službou.',
    });

    if (!isImmediateAiError(payload.code)) {
      await waitForMinimumErrorDelay(startedAt);
    }

    throw new AiFetchError(payload, {
      status,
      cause: error,
    });
  } finally {
    clearTimeout(timeoutId);

    if (externalSignal) {
      externalSignal.removeEventListener(
        'abort',
        abortFromExternalSignal,
      );
    }
  }
}

/**
 * Pomocná verzia pre endpointy, ktoré vždy vracajú JSON.
 */
export async function aiFetchJson<T>(
  input: RequestInfo | URL,
  options: AiFetchOptions = {},
): Promise<T> {
  const response = await aiFetch(input, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export default aiFetch;
