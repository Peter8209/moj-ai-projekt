"use client";

import ZedperaErrorAlert from "@/components/system/ZedperaErrorAlert";
import { createZedperaError } from "@/lib/api-error-messages";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
    <main className="flex min-h-screen items-center justify-center bg-[#050711] p-5 text-white">
      <div className="w-full max-w-2xl">
        <ZedperaErrorAlert
          error={descriptor}
          onRetry={reset}
        />
      </div>
    </main>
  );
}
