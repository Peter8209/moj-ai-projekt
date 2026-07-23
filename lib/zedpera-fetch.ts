import {
  ZedperaApiError,
  createZedperaErrorFromPayload,
  createZedperaErrorFromUnknown,
  normalizeZedperaLanguage,
  type ZedperaErrorInfo,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";

export type ZedperaFetchOptions = {
  language?: ZedperaLanguage | string | null;
  endpoint?: string | null;
  module?: string | null;
  requestId?: string | null;

  /**
   * Ak je true, chyba sa odošle globálnemu ZedperaErrorProvider.
   * Predvolená hodnota je true.
   */
  showGlobally?: boolean;
};

function clean(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function createZedperaRequestId(
  prefix = "zedpera",
): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return [
    prefix,
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 12),
  ].join("_");
}

export function getOrCreateZedperaRequestId(
  storageKey =
    "zedpera_request_id",
): string {
  if (
    typeof window === "undefined"
  ) {
    return createZedperaRequestId();
  }

  const currentUrl =
    new URL(window.location.href);

  const fromUrl = clean(
    currentUrl.searchParams.get(
      "requestId",
    ),
  );

  if (fromUrl) {
    window.sessionStorage.setItem(
      storageKey,
      fromUrl,
    );
    return fromUrl;
  }

  const stored = clean(
    window.sessionStorage.getItem(
      storageKey,
    ),
  );

  if (stored) return stored;

  const requestId =
    createZedperaRequestId();

  window.sessionStorage.setItem(
    storageKey,
    requestId,
  );

  return requestId;
}

function currentLanguage(): ZedperaLanguage {
  if (
    typeof window === "undefined"
  ) {
    return "sk";
  }

  return normalizeZedperaLanguage(
    window.localStorage.getItem(
      "zedpera_language",
    ) ||
      window.localStorage.getItem(
        "zedpera_system_language",
      ) ||
      document.documentElement.lang ||
      "sk",
  );
}

async function readPayload(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return response
      .json()
      .catch(() => null);
  }

  const text = await response
    .text()
    .catch(() => "");

  const trimmed = text.trim();

  if (
    !trimmed ||
    trimmed.includes("<!DOCTYPE") ||
    trimmed.includes("<html") ||
    trimmed.includes(
      "__next_error__",
    )
  ) {
    return null;
  }

  return {
    message: trimmed.slice(0, 2000),
  };
}

export function dispatchZedperaError(
  error:
    | ZedperaErrorInfo
    | ZedperaApiError,
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const descriptor =
    error instanceof ZedperaApiError
      ? error.descriptor
      : error;

  window.dispatchEvent(
    new CustomEvent<ZedperaErrorInfo>(
      "zedpera:error",
      {
        detail: descriptor,
      },
    ),
  );
}

export async function readZedperaApiError(
  response: Response,
  options: ZedperaFetchOptions = {},
): Promise<ZedperaApiError> {
  const payload = await readPayload(
    response.clone(),
  );

  const requestId =
    clean(options.requestId) ||
    clean(
      response.headers.get(
        "x-zedpera-request-id",
      ),
    ) ||
    clean(
      response.headers.get(
        "x-request-id",
      ),
    );

  const retryAfter =
    response.headers.get(
      "retry-after",
    );

  const descriptor =
    createZedperaErrorFromPayload(
      {
        ...(payload &&
        typeof payload === "object"
          ? payload
          : {}),
        ...(retryAfter
          ? {
              retryAfterSeconds:
                Number(retryAfter),
            }
          : {}),
      },
      {
        status: response.status,
        language:
          options.language ||
          currentLanguage(),
        endpoint:
          options.endpoint ||
          response.url,
        module: options.module,
        requestId,
      },
    );

  return new ZedperaApiError(
    descriptor,
  );
}

export async function zedperaFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ZedperaFetchOptions = {},
): Promise<Response> {
  const headers =
    new Headers(init.headers);

  const requestId =
    clean(options.requestId) ||
    clean(
      headers.get(
        "x-request-id",
      ),
    ) ||
    createZedperaRequestId();

  const language =
    normalizeZedperaLanguage(
      options.language ||
        currentLanguage(),
    );

  headers.set(
    "x-request-id",
    requestId,
  );
  headers.set(
    "x-zedpera-language",
    language,
  );

  if (!headers.has("accept")) {
    headers.set(
      "accept",
      "application/json, text/plain, text/event-stream",
    );
  }

  try {
    const response = await fetch(
      input,
      {
        ...init,
        headers,
        credentials:
          init.credentials ||
          "include",
        cache:
          init.cache ||
          "no-store",
      },
    );

    if (!response.ok) {
      const apiError =
        await readZedperaApiError(
          response,
          {
            ...options,
            language,
            requestId,
            endpoint:
              options.endpoint ||
              (typeof input ===
              "string"
                ? input
                : input.toString()),
          },
        );

      if (
        options.showGlobally !==
        false
      ) {
        dispatchZedperaError(
          apiError,
        );
      }

      throw apiError;
    }

    return response;
  } catch (error) {
    if (
      error instanceof
      ZedperaApiError
    ) {
      throw error;
    }

    const descriptor =
      createZedperaErrorFromUnknown(
        error,
        {
          language,
          endpoint:
            options.endpoint ||
            (typeof input ===
            "string"
              ? input
              : input.toString()),
          module: options.module,
          requestId,
        },
      );

    if (
      options.showGlobally !==
      false
    ) {
      dispatchZedperaError(
        descriptor,
      );
    }

    throw new ZedperaApiError(
      descriptor,
    );
  }
}

export async function zedperaJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ZedperaFetchOptions = {},
): Promise<T> {
  const response =
    await zedperaFetch(
      input,
      init,
      options,
    );

  return response.json() as Promise<T>;
}
