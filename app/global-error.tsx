"use client";

import {
  useEffect,
  useState,
} from "react";

import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import { createZedperaError } from "@/lib/zedpera-errors";
import {
  waitForMinimumErrorDelay,
} from "@/lib/ai/config";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showError, setShowError] =
    useState(false);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();

    void waitForMinimumErrorDelay(
      startedAt,
    ).then(() => {
      if (active) {
        setShowError(true);
      }
    });

    return () => {
      active = false;
    };
  }, [error]);

  const descriptor = createZedperaError(
    "INTERNAL_SERVER_ERROR",
    {
      errorId: error.digest,
      rawMessage: error.message,
    },
    {
      language: "sk",
    },
  );

  return (
    <html lang="sk">
      <body className="m-0 bg-[#050711]">
        {!showError ? (
          <main className="flex min-h-screen items-center justify-center p-5 text-white">
            <div
              className="text-center text-sm text-slate-300"
              role="status"
              aria-live="polite"
            >
              Spracovanie stále prebieha…
            </div>
          </main>
        ) : (
          <main className="flex min-h-screen items-center justify-center p-5 text-white">
            <div className="w-full max-w-2xl">
              <ZedperaErrorAlert
                error={descriptor}
                onRetry={reset}
              />
            </div>
          </main>
        )}
      </body>
    </html>
  );
}
