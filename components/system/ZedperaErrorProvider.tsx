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
  createZedperaError,
  createZedperaErrorFromUnknown,
  getZedperaErrorMessage,
  normalizeZedperaLanguage,
  type ZedperaErrorInfo,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";
import {
  readZedperaApiError,
} from "@/lib/zedpera-fetch";

type ShowErrorOptions = {
  replace?: boolean;
  autoCloseMs?: number | null;
};

type ErrorCenterContextValue = {
  error: ZedperaErrorInfo | null;
  blocked: boolean;

  showError: (
    error: ZedperaErrorInfo,
    options?: ShowErrorOptions,
  ) => void;

  captureError: (
    error: unknown,
    context?: {
      status?: number | null;
      endpoint?: string | null;
      module?: string | null;
      requestId?: string | null;
    },
  ) => ZedperaErrorInfo;

  clearError: () => void;
};

const ErrorCenterContext =
  createContext<ErrorCenterContextValue | null>(
    null,
  );

function readCurrentLanguage(): ZedperaLanguage {
  if (typeof window === "undefined") return "sk";

  return normalizeZedperaLanguage(
    window.localStorage.getItem(
      "zedpera_language",
    ) ||
      window.localStorage.getItem(
        "zedpera_system_language",
      ) ||
      window.localStorage.getItem(
        "zedpera_interface_language",
      ) ||
      document.documentElement.getAttribute(
        "data-language",
      ) ||
      document.documentElement.lang ||
      "sk",
  );
}

function apiUrl(
  input: RequestInfo | URL,
): URL | null {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    return new URL(
      raw,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://zedpera.local",
    );
  } catch {
    return null;
  }
}

function isInternalApiRequest(
  input: RequestInfo | URL,
): boolean {
  const url = apiUrl(input);

  if (!url) return false;

  return (
    typeof window !== "undefined" &&
    url.origin === window.location.origin &&
    url.pathname.startsWith("/api/")
  );
}

function endpointFromInput(
  input: RequestInfo | URL,
): string {
  const url = apiUrl(input);

  if (!url) {
    return typeof input === "string"
      ? input
      : "";
  }

  return `${url.pathname}${url.search}`;
}

function requestIdFromHeaders(
  headers?: HeadersInit,
): string {
  if (!headers) return "";

  const normalized = new Headers(headers);

  return (
    normalized.get("x-request-id") ||
    normalized.get(
      "x-zedpera-request-id",
    ) ||
    ""
  ).trim();
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

export function ZedperaErrorProvider({
  children,
  language: languageProp,
  showAdminDetails =
    process.env.NODE_ENV !== "production",
}: {
  children: ReactNode;
  language?: ZedperaLanguage | string | null;
  showAdminDetails?: boolean;
}) {
  const [language, setLanguage] =
    useState<ZedperaLanguage>(
      normalizeZedperaLanguage(languageProp),
    );

  const [error, setError] =
    useState<ZedperaErrorInfo | null>(null);

  const originalFetchRef =
    useRef<typeof window.fetch | null>(null);

  const originalAlertRef =
    useRef<typeof window.alert | null>(null);

  const autoCloseTimerRef =
    useRef<number | null>(null);

  const lastFingerprintRef = useRef<{
    value: string;
    createdAt: number;
  } | null>(null);

  const clearAutoCloseTimer =
    useCallback(() => {
      if (
        autoCloseTimerRef.current !== null
      ) {
        window.clearTimeout(
          autoCloseTimerRef.current,
        );
        autoCloseTimerRef.current = null;
      }
    }, []);

  const clearError = useCallback(() => {
    clearAutoCloseTimer();
    setError(null);

    document.documentElement.removeAttribute(
      "data-zedpera-error-code",
    );
    document.documentElement.removeAttribute(
      "data-zedpera-error-blocking",
    );
  }, [clearAutoCloseTimer]);

  const showError = useCallback(
    (
      nextError: ZedperaErrorInfo,
      options: ShowErrorOptions = {},
    ) => {
      const fingerprint = [
        nextError.technicalCode,
        nextError.requestId || "",
        nextError.endpoint || "",
        nextError.message,
      ].join("|");

      const now = Date.now();
      const previous =
        lastFingerprintRef.current;

      if (
        previous?.value === fingerprint &&
        now - previous.createdAt < 1200
      ) {
        return;
      }

      lastFingerprintRef.current = {
        value: fingerprint,
        createdAt: now,
      };

      clearAutoCloseTimer();

      setError((current) => {
        if (
          current?.blocking &&
          !nextError.blocking &&
          options.replace !== true
        ) {
          return current;
        }

        return nextError;
      });

      document.documentElement.setAttribute(
        "data-zedpera-error-code",
        nextError.technicalCode,
      );

      document.documentElement.setAttribute(
        "data-zedpera-error-blocking",
        nextError.blocking ? "true" : "false",
      );

      const autoCloseMs =
        options.autoCloseMs === undefined
          ? nextError.blocking ||
            nextError.severity === "critical"
            ? null
            : 9000
          : options.autoCloseMs;

      if (
        autoCloseMs !== null &&
        autoCloseMs > 0
      ) {
        autoCloseTimerRef.current =
          window.setTimeout(() => {
            clearError();
          }, autoCloseMs);
      }
    },
    [clearAutoCloseTimer, clearError],
  );

  const captureError = useCallback(
    (
      unknownError: unknown,
      context: {
        status?: number | null;
        endpoint?: string | null;
        module?: string | null;
        requestId?: string | null;
      } = {},
    ) => {
      const descriptor =
        createZedperaErrorFromUnknown(
          unknownError,
          {
            language,
            ...context,
          },
        );

      showError(descriptor);
      return descriptor;
    },
    [language, showError],
  );

  useEffect(() => {
    const syncLanguage = () => {
      setLanguage(
        languageProp
          ? normalizeZedperaLanguage(
              languageProp,
            )
          : readCurrentLanguage(),
      );
    };

    syncLanguage();

    const handleLanguageEvent = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          string | undefined
        >;

      setLanguage(
        normalizeZedperaLanguage(
          customEvent.detail ||
            readCurrentLanguage(),
        ),
      );
    };

    window.addEventListener(
      "storage",
      syncLanguage,
    );
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
      window.removeEventListener(
        "storage",
        syncLanguage,
      );
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
    const handleCustomError = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<
          ZedperaErrorInfo
        >;

      if (customEvent.detail) {
        showError(
          customEvent.detail,
          {
            replace: true,
          },
        );
      }
    };

    const handleClear = () => {
      clearError();
    };

    window.addEventListener(
      "zedpera:error",
      handleCustomError,
    );
    window.addEventListener(
      "zedpera:clear-error",
      handleClear,
    );

    return () => {
      window.removeEventListener(
        "zedpera:error",
        handleCustomError,
      );
      window.removeEventListener(
        "zedpera:clear-error",
        handleClear,
      );
    };
  }, [clearError, showError]);

  useEffect(() => {
    const handleUnhandledRejection = (
      event: PromiseRejectionEvent,
    ) => {
      if (
        isAbortError(event.reason)
      ) {
        return;
      }

      captureError(event.reason, {
        module: "client",
      });
    };

    const handleWindowError = (
      event: ErrorEvent,
    ) => {
      if (!event.error) return;

      captureError(event.error, {
        module: "client",
      });
    };

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection,
    );
    window.addEventListener(
      "error",
      handleWindowError,
    );

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener(
        "error",
        handleWindowError,
      );
    };
  }, [captureError]);

  useEffect(() => {
    if (originalAlertRef.current) return;

    const originalAlert =
      window.alert.bind(window);

    originalAlertRef.current =
      originalAlert;

    window.alert = (
      message?: unknown,
    ) => {
      const publicMessage =
        typeof message === "string"
          ? message.trim()
          : String(message || "").trim();

      if (!publicMessage) return;

      const looksTechnical =
        /\b(4\d\d|5\d\d)\b|api|fetch|network|timeout|quota|billing|supabase|stripe|database|json|model|token|context|upload|extract|pdf|docx/i.test(
          publicMessage,
        );

      const descriptor =
        looksTechnical
          ? getZedperaErrorMessage(
              publicMessage,
              {
                language,
                module:
                  "legacy-alert",
              },
            )
          : createZedperaError(
              "VALIDATION_ERROR",
              {
                module:
                  "legacy-alert",
              },
              {
                language,
                title:
                  "Skontrolujte zadanie",
                message:
                  publicMessage,
                reason:
                  "Formulár alebo aktuálna operácia vyžaduje doplnenie alebo opravu údajov.",
                solution:
                  publicMessage,
                userAction:
                  publicMessage,
                adminAction:
                  "Migrovať pôvodné alert() volanie na useZedperaErrorCenter() alebo lokálnu validáciu cez createZedperaError().",
              },
            );

      showError(
        descriptor,
        {
          replace: true,
        },
      );
    };

    return () => {
      if (
        originalAlertRef.current
      ) {
        window.alert =
          originalAlertRef.current;
        originalAlertRef.current =
          null;
      }
    };
  }, [language, showError]);

  useEffect(() => {
    if (originalFetchRef.current) return;

    const originalFetch =
      window.fetch.bind(window);

    originalFetchRef.current =
      originalFetch;

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const internalApi =
        isInternalApiRequest(input);

      const endpoint =
        endpointFromInput(input);

      const requestId =
        requestIdFromHeaders(
          init?.headers,
        );

      try {
        const response =
          await originalFetch(
            input,
            init,
          );

        if (
          internalApi &&
          !response.ok
        ) {
          void readZedperaApiError(
            response.clone(),
            {
              language,
              endpoint,
              requestId,
            },
          )
            .then((apiError) => {
              showError(
                apiError.descriptor,
              );
            })
            .catch((parseError) => {
              captureError(
                parseError,
                {
                  status:
                    response.status,
                  endpoint,
                  requestId,
                },
              );
            });
        }

        return response;
      } catch (networkError) {
        if (
          internalApi &&
          !isAbortError(networkError)
        ) {
          captureError(
            networkError,
            {
              endpoint,
              requestId,
            },
          );
        }

        throw networkError;
      }
    };

    return () => {
      if (
        originalFetchRef.current
      ) {
        window.fetch =
          originalFetchRef.current;
        originalFetchRef.current =
          null;
      }
    };
  }, [
    captureError,
    language,
    showError,
  ]);

  useEffect(() => {
    return () => {
      clearAutoCloseTimer();
    };
  }, [clearAutoCloseTimer]);

  const value =
    useMemo<ErrorCenterContextValue>(
      () => ({
        error,
        blocked:
          error?.blocking === true,
        showError,
        captureError,
        clearError,
      }),
      [
        captureError,
        clearError,
        error,
        showError,
      ],
    );

  const blocking =
    error?.blocking === true;

  return (
    <ErrorCenterContext.Provider
      value={value}
    >
      {children}

      {error ? (
        <div
          className={
            blocking
              ? "fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-[#02040a]/82 px-4 py-8 backdrop-blur-md"
              : "pointer-events-none fixed inset-x-0 top-4 z-[10000] mx-auto flex w-full max-w-4xl justify-center px-4"
          }
          data-zedpera-error-overlay={
            blocking
              ? "blocking"
              : "notification"
          }
        >
          <div
            className={[
              "w-full max-w-4xl",
              blocking
                ? "pointer-events-auto mt-[5vh]"
                : "pointer-events-auto",
            ].join(" ")}
          >
            <ZedperaErrorAlert
              error={error}
              language={language}
              variant={
                blocking
                  ? "modal"
                  : "toast"
              }
              compact={!blocking}
              showAdminDetails={
                showAdminDetails
              }
              onClose={
                blocking
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
              onSwitchModel={
                error.actionKind ===
                "switch-model"
                  ? () => {
                      clearError();

                      window.dispatchEvent(
                        new CustomEvent(
                          "zedpera:open-model-selector",
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
  const context =
    useContext(ErrorCenterContext);

  if (!context) {
    throw new Error(
      "useZedperaErrorCenter musí byť použitý vo vnútri ZedperaErrorProvider.",
    );
  }

  return context;
}
