"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AcademicModuleFrontendProps,
  AcademicModuleProfile,
} from "@/components/dashboard/modules";

type EntitlementsPayload = {
  ok?: boolean;
  isAdmin?: boolean;
  isUnlimited?: boolean;
  hasUnlimitedAccess?: boolean;
  attachmentLimit?: number | null;
  features?: string[];
  promptLimitReached?: boolean;
  pageLimitReached?: boolean;
  pagesRemaining?: number | null;
  promptsRemaining?: number | null;
  [key: string]: unknown;
};

type ModuleRuntime = {
  frontendProps: AcademicModuleFrontendProps;
  loading: boolean;
  warning: string;
  accessBlocked: boolean;
  refresh: () => Promise<void>;
};

function safeParseProfile(value: string | null): AcademicModuleProfile | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as AcademicModuleProfile)
      : null;
  } catch {
    return null;
  }
}

function readStoredProfile(): AcademicModuleProfile | null {
  return (
    safeParseProfile(localStorage.getItem("active_profile")) ||
    safeParseProfile(localStorage.getItem("profile")) ||
    null
  );
}

function readStoredLanguage(): string {
  const value =
    localStorage.getItem("zedpera_language") ||
    localStorage.getItem("zedpera_system_language") ||
    "sk";

  return ["sk", "cs", "en", "de", "pl", "hu"].includes(value)
    ? value
    : "sk";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function useModuleRuntime(requiredFeature: string): ModuleRuntime {
  const [profile, setProfile] = useState<AcademicModuleProfile | null>(null);
  const [language, setLanguage] = useState("sk");
  const [entitlements, setEntitlements] =
    useState<EntitlementsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  const mergeEntitlements = useCallback((value: unknown) => {
    const record = asRecord(value);
    if (!record) return;

    setEntitlements((current) => ({
      ...(current || {}),
      ...(record as EntitlementsPayload),
    }));
  }, []);

  const mergePageQuota = useCallback((value: unknown) => {
    const record = asRecord(value);
    if (!record) return;

    setEntitlements((current) => ({
      ...(current || {}),
      pageLimitReached:
        typeof record.pageLimitReached === "boolean"
          ? record.pageLimitReached
          : current?.pageLimitReached,
      pagesRemaining:
        typeof record.pagesRemaining === "number" ||
        record.pagesRemaining === null
          ? (record.pagesRemaining as number | null)
          : current?.pagesRemaining,
    }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/entitlements/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const data = (await response.json().catch(() => null)) as
        | EntitlementsPayload
        | null;

      if (!response.ok || !data) {
        setWarning(
          "Serverové limity sa nepodarilo načítať. Modul zostáva dostupný, ale konečné oprávnenie overí jeho API endpoint.",
        );
        return;
      }

      setEntitlements(data);
      setWarning("");
    } catch {
      setWarning(
        "Serverové limity sa nepodarilo načítať. Modul zostáva dostupný, ale konečné oprávnenie overí jeho API endpoint.",
      );
    }
  }, []);

  useEffect(() => {
    const syncLocalContext = () => {
      setProfile(readStoredProfile());
      setLanguage(readStoredLanguage());
    };

    syncLocalContext();
    void refresh().finally(() => setLoading(false));

    window.addEventListener("storage", syncLocalContext);
    window.addEventListener("zedpera:active-profile-changed", syncLocalContext);
    window.addEventListener("zedpera:language-changed", syncLocalContext);
    window.addEventListener("zedpera:system-language-changed", syncLocalContext);

    return () => {
      window.removeEventListener("storage", syncLocalContext);
      window.removeEventListener(
        "zedpera:active-profile-changed",
        syncLocalContext,
      );
      window.removeEventListener("zedpera:language-changed", syncLocalContext);
      window.removeEventListener(
        "zedpera:system-language-changed",
        syncLocalContext,
      );
    };
  }, [refresh]);

  const unlimited = Boolean(
    entitlements?.isAdmin ||
      entitlements?.isUnlimited ||
      entitlements?.hasUnlimitedAccess,
  );

  const features = Array.isArray(entitlements?.features)
    ? entitlements.features
    : [];
  const featureKnown = features.length > 0;
  const featureAllowed =
    unlimited || !featureKnown || features.includes(requiredFeature);

  const limitBlocked = Boolean(
    !unlimited &&
      (entitlements?.promptLimitReached || entitlements?.pageLimitReached),
  );
  const accessBlocked = Boolean(entitlements && (!featureAllowed || limitBlocked));

  const attachmentLimit = unlimited
    ? 24
    : Math.max(0, Number(entitlements?.attachmentLimit ?? 1));

  const frontendProps = useMemo<AcademicModuleFrontendProps>(
    () => ({
      profile,
      language,
      attachmentLimit,
      unlimited,
      disabled: loading || accessBlocked,
      onEntitlements: mergeEntitlements,
      onPageQuota: mergePageQuota,
      onUsageChanged: refresh,
    }),
    [
      accessBlocked,
      attachmentLimit,
      language,
      loading,
      mergeEntitlements,
      mergePageQuota,
      profile,
      refresh,
      unlimited,
    ],
  );

  return {
    frontendProps,
    loading,
    warning:
      warning ||
      (!featureAllowed
        ? "Tento modul nie je súčasťou aktívneho balíka."
        : limitBlocked
          ? "Bol dosiahnutý limit aktívneho balíka."
          : ""),
    accessBlocked,
    refresh,
  };
}
