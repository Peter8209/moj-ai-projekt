"use client";

import type { ReactNode } from "react";

import ZedperaErrorBoundary from "@/components/system/ZedperaErrorBoundary";
import { ZedperaErrorProvider } from "@/components/system/ZedperaErrorProvider";

/**
 * Vložte dovnútra existujúceho LanguageProvider:
 *
 * <LanguageProvider>
 *   <ZedperaProviders>{children}</ZedperaProviders>
 * </LanguageProvider>
 */
export default function ZedperaProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ZedperaErrorBoundary>
      <ZedperaErrorProvider>
        {children}
      </ZedperaErrorProvider>
    </ZedperaErrorBoundary>
  );
}
