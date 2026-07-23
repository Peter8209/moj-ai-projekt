"use client";

import { useCallback, useState } from "react";

import {
  createZedperaError,
  createZedperaErrorFromUnknown,
  type ZedperaErrorCode,
  type ZedperaErrorContext,
  type ZedperaErrorDescriptor,
  type ZedperaLanguage,
} from "@/lib/api-error-messages";
import { readZedperaApiError } from "@/lib/zedpera-fetch";

export function useZedperaError(
  language?: ZedperaLanguage | string | null,
) {
  const [error, setError] =
    useState<ZedperaErrorDescriptor | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const showError = useCallback(
    (
      code: ZedperaErrorCode,
      context: ZedperaErrorContext = {},
    ) => {
      const descriptor = createZedperaError(
        code,
        context,
        { language },
      );

      setError(descriptor);
      return descriptor;
    },
    [language],
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
      const descriptor = createZedperaErrorFromUnknown(
        unknownError,
        {
          language,
          ...context,
        },
      );

      setError(descriptor);
      return descriptor;
    },
    [language],
  );

  const captureResponse = useCallback(
    async (
      response: Response,
      context: {
        endpoint?: string | null;
        module?: string | null;
        requestId?: string | null;
      } = {},
    ) => {
      const apiError = await readZedperaApiError(
        response,
        {
          language,
          ...context,
        },
      );

      setError(apiError.descriptor);
      return apiError;
    },
    [language],
  );

  return {
    error,
    setError,
    showError,
    captureError,
    captureResponse,
    clearError,
    blocking: error?.blocking === true,
    retryable: error?.retryable === true,
  };
}
