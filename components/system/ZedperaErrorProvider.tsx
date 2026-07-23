"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import {
  createZedperaErrorFromUnknown,
  normalizeZedperaLanguage,
  type ZedperaErrorDescriptor,
  type ZedperaLanguage,
} from "@/lib/zedpera-errors";
import {
  readZedperaApiError,
} from "@/lib/zedpera-fetch";
import {
  waitForMinimumErrorDelay,
} from "@/lib/ai/config";

type ShowErrorOptions = {
  /**
   * Čas začiatku AI/API operácie.
   * Hláška sa nesmie zobraziť skôr než po centrálnom 30-sekundovom limite.
   */
  startedAt?: number;
};

type ErrorCaptureContext = {
  endpoint?: string | null;
  module?: string | null;
  requestId?: string | null;
  startedAt?: number;
};

type ErrorCenterContextValue = {
  error: ZedperaErrorDescriptor | null;
  showError: (
    error: ZedperaErrorDescriptor,
    options?: ShowErrorOptions,
  ) => void;
  captureError: (
    error: unknown,
    context?: ErrorCaptureContext,
  ) => ZedperaErrorDescriptor;
  clearError: () => void;
};

const ErrorCenterContext =
  createContext<ErrorCenterContextValue | null>(null);

function isApiRequest(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    const url = new URL(
      raw,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://zedpera.local",
    );

    return (
      typeof window !== "undefined" &&
      url.origin === window.location.origin &&
      url.pathname.startsWith("/api/")
    );
  } catch {
    return raw.startsWith("/api/");
  }
}

function readCurrentLanguage(): ZedperaLanguage {
  if (typeof window === "undefined") return "sk";

  return normalizeZedperaLanguage(
    window.localStorage.getItem("zedpera_language") ||
      window.localStorage.getItem("zedpera_system_language") ||
      window.localStorage.getItem("zedpera_interface_language") ||
      document.documentElement.getAttribute("data-language") ||
      document.documentElement.lang ||
      "sk",
  );
}

export function ZedperaErrorProvider({
  children,
  language: languageProp,
}: {
  children: ReactNode;
  language?: ZedperaLanguage | string | null;
}) {
  const [language, setLanguage] = useState<ZedperaLanguage>(
    normalizeZedperaLanguage(languageProp),
  );
  const [error, setError] =
    useState<ZedperaErrorDescriptor | null>(null);
  const originalFetchRef =
    useRef<typeof window.fetch | null>(null);

  /**
   * Každá nová AI/API aktivita zneplatní starú čakajúcu hlášku.
   * Vďaka tomu sa po úspešnom opakovaní nezobrazí oneskorená stará chyba.
   */
  const pendingErrorSequenceRef = useRef(0);
  const mountedRef = useRef(true);

  const commitError = useCallback(
    (nextError: ZedperaErrorDescriptor) => {
      setError((current) => {
        if (
          current?.code === nextError.code &&
          current?.requestId === nextError.requestId &&
          current?.endpoint === nextError.endpoint
        ) {
          return current;
        }

        return nextError;
      });

      if (typeof document !== "undefined") {
        document.documentElement.setAttribute(
          "data-zedpera-error-code",
          nextError.code,
        );
        document.documentElement.setAttribute(
          "data-zedpera-error-blocking",
          nextError.blocking ? "true" : "false",
        );
      }
    },
    [],
  );

  const showError = useCallback(
    (
      nextError: ZedperaErrorDescriptor,
      options: ShowErrorOptions = {},
    ) => {
      const sequence =
        ++pendingErrorSequenceRef.current;
      const startedAt =
        typeof options.startedAt === "number" &&
        Number.isFinite(options.startedAt)
          ? options.startedAt
          : Date.now();

      /**
       * Centrálny config drží jednotný 30-sekundový minimálny interval.
       * Žiadna používateľská AI/API hláška sa preto nezobrazí okamžite.
       */
      void waitForMinimumErrorDelay(startedAt)
        .then(() => {
          if (
            !mountedRef.current ||
            sequence !==
              pendingErrorSequenceRef.current
          ) {
            return;
          }

          commitError(nextError);
        })
        .catch(() => {
          // Ani pri chybe pomocného čakania nezobrazíme hlášku okamžite.
          // Nová aktivita alebo ďalšia požiadavka ju môže bezpečne nahradiť.
        });
    },
    [commitError],
  );

  const clearError = useCallback(() => {
    pendingErrorSequenceRef.current += 1;
    setError(null);

    if (typeof document !== "undefined") {
      document.documentElement.removeAttribute(
        "data-zedpera-error-code",
      );
      document.documentElement.removeAttribute(
        "data-zedpera-error-blocking",
      );
    }
  }, []);

  const captureError = useCallback(
    (
      unknownError: unknown,
      context: ErrorCaptureContext = {},
    ) => {
      const {
        startedAt,
        ...errorContext
      } = context;

      const descriptor =
        createZedperaErrorFromUnknown(
          unknownError,
          {
            language,
            ...errorContext,
          },
        );

      showError(descriptor, {
        startedAt,
      });

      return descriptor;
    },
    [language, showError],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      pendingErrorSequenceRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const syncLanguage = () => {
      setLanguage(
        languageProp
          ? normalizeZedperaLanguage(languageProp)
          : readCurrentLanguage(),
      );
    };

    syncLanguage();

    const handleLanguageEvent = (event: Event) => {
      const customEvent =
        event as CustomEvent<string | undefined>;

      setLanguage(
        normalizeZedperaLanguage(
          customEvent.detail || readCurrentLanguage(),
        ),
      );
    };

    window.addEventListener("storage", syncLanguage);
    window.addEventListener(
      "zedpera-language-change",
      handleLanguageEvent,
    );
    window.addEventListener(
      "zedpera:language-changed",
      handleLanguageEvent,
    );
    window.addEventListener(
      "zedpera:system-language-changed",
      handleLanguageEvent,
    );

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener(
        "zedpera-language-change",
        handleLanguageEvent,
      );
      window.removeEventListener(
        "zedpera:language-changed",
        handleLanguageEvent,
      );
      window.removeEventListener(
        "zedpera:system-language-changed",
        handleLanguageEvent,
      );
    };
  }, [languageProp]);

  useEffect(() => {
    const handleCustomError = (event: Event) => {
      const customEvent =
        event as CustomEvent<ZedperaErrorDescriptor>;

      if (customEvent.detail) {
        showError(customEvent.detail);
      }
    };

    window.addEventListener(
      "zedpera:error",
      handleCustomError,
    );

    return () => {
      window.removeEventListener(
        "zedpera:error",
        handleCustomError,
      );
    };
  }, [showError]);

  useEffect(() => {
    if (originalFetchRef.current) return;

    const originalFetch = window.fetch.bind(window);
    originalFetchRef.current = originalFetch;

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const apiRequest = isApiRequest(input);
      const startedAt = Date.now();
      const endpoint =
        typeof input === "string"
          ? input
          : input.toString();
      const requestId =
        new Headers(init?.headers).get(
          "x-request-id",
        );

      /**
       * Nová interná API aktivita ruší starú čakajúcu chybu.
       * Hláška môže vzniknúť až po 30 sekundách od začiatku tejto požiadavky.
       */
      if (apiRequest) {
        pendingErrorSequenceRef.current += 1;
      }

      try {
        const response =
          await originalFetch(input, init);

        if (!response.ok && apiRequest) {
          void readZedperaApiError(
            response.clone(),
            {
              language,
              endpoint,
              requestId,
            },
          )
            .then((apiError) =>
              showError(
                apiError.descriptor,
                {
                  startedAt,
                },
              ),
            )
            .catch((parseError) =>
              captureError(
                parseError,
                {
                  endpoint,
                  requestId,
                  startedAt,
                },
              ),
            );
        }

        return response;
      } catch (networkError) {
        if (apiRequest) {
          captureError(
            networkError,
            {
              endpoint,
              requestId,
              startedAt,
            },
          );
        }

        throw networkError;
      }
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [captureError, language, showError]);

  const value = useMemo<ErrorCenterContextValue>(
    () => ({
      error,
      showError,
      captureError,
      clearError,
    }),
    [captureError, clearError, error, showError],
  );

  return (
    <ErrorCenterContext.Provider value={value}>
      {children}

      {error ? (
        <div
          className={
            error.blocking
              ? "fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-[#03040a]/80 px-4 py-8 backdrop-blur-md"
              : "pointer-events-none fixed inset-x-0 top-4 z-[10000] mx-auto flex w-full max-w-3xl justify-center px-4"
          }
          data-zedpera-error-overlay={
            error.blocking ? "blocking" : "notification"
          }
        >
          <div
            className={[
              "w-full max-w-3xl",
              error.blocking
                ? "pointer-events-auto mt-[8vh]"
                : "pointer-events-auto",
            ].join(" ")}
          >
            <ZedperaErrorAlert
              error={error}
              language={language}
              onClose={
                error.blocking
                  ? undefined
                  : clearError
              }
              onRetry={
                error.retryable
                  ? () => {
                      clearError();
                      window.dispatchEvent(
                        new CustomEvent(
                          "zedpera:retry-last-action",
                        ),
                      );
                    }
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}
    </ErrorCenterContext.Provider>
  );
}

export function useZedperaErrorCenter(): ErrorCenterContextValue {
  const context = useContext(ErrorCenterContext);

  if (!context) {
    throw new Error(
      "useZedperaErrorCenter musí byť použitý vo vnútri ZedperaErrorProvider.",
    );
  }

  return context;
}
