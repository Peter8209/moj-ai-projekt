"use client";

import {
  useEffect,
  useState,
} from "react";

import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import { createZedperaError } from "@/lib/api-error-messages";
import {
  waitForMinimumErrorDelay,
} from "@/lib/ai/config";

export default function NotFound() {
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
  }, []);

  const descriptor = createZedperaError(
    "NOT_FOUND",
    {},
    {
      language: "sk",
    },
  );

  if (!showError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050711] p-5 text-white">
        <div
          className="text-center text-sm text-slate-300"
          role="status"
          aria-live="polite"
        >
          Načítavam požadovanú stránku…
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050711] p-5 text-white">
      <div className="w-full max-w-2xl">
        <ZedperaErrorAlert
          error={descriptor}
        />
      </div>
    </main>
  );
}
