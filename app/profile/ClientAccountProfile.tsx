"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Crown,
  FileText,
  Gauge,
  Loader2,
  LockKeyhole,
  Mail,
  PlusCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserCircle,
  WalletCards,
  XCircle,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type ClientProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  selectedPlan: string;
  accountStatus: string;
  packageName: string;
  packageLabel: string;
  credits: number | null;
  usedCredits: number | null;
  remainingCredits: number | null;
  pageLimit: number | null;
  basePageLimit: number | null;
  extraPageLimit: number | null;
  pagesUsed: number | null;
  pagesRemaining: number | null;
  pageLimitReached: boolean;
  isAdmin: boolean;
  hasUnlimitedAccess: boolean;
  maxProjects: number | null;
  projectsCount: number | null;
  activeServices: string[];
  activatedFeatures: string[];
  subscriptionStatus: string;
  subscriptionStartedAt: string;
  subscriptionEndsAt: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  language: string;
  source: string;
  raw: JsonRecord;
};

type EntitlementsSnapshot = {
  userId: string;
  email: string;
  planId: string;
  planName: string;
  planPriceCents: number | null;
  planPageLimit: number | null;
  addonIds: string[];
  addonNames: string[];
  featureKeys: string[];
  featureLabels: string[];
  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  promptLimitReached: boolean;
  attachmentLimit: number | null;
  isAdmin: boolean;
  hasUnlimitedAccess: boolean;
  hasDatabaseRecord: boolean;
  billingStatus: string;
  activatedAt: string;
  validUntil: string;
  updatedAt: string;
  source: string;
  raw: JsonRecord;
};

type EntitlementsLoadResult = {
  entitlements: EntitlementsSnapshot | null;
  error: string;
};

/**
 * Presný verejný kontrakt endpointu GET /api/usage/pages.
 *
 * Bežný používateľ dostane číselné hodnoty.
 * Administrátor dostane pri limitoch a spotrebe null a isUnlimited: true.
 */
type PageUsageSnapshot = {
  pageLimit: number | null;
  pagesUsed: number | null;
  pagesRemaining: number | null;
  pageLimitReached: boolean;
  isUnlimited: boolean;
};

type LoadState = "idle" | "loading" | "success" | "error";
type CancelState = "idle" | "loading" | "success" | "error";

const PROFILE_ENDPOINTS = [
  "/api/profile/me",
  "/api/profile",
  "/api/profile/get",
];
const PAGE_USAGE_ENDPOINT = "/api/usage/pages";
const ENTITLEMENTS_ENDPOINT = "/api/entitlements/me";

const FEATURE_LABELS: Record<string, string> = {
  "ai-supervisor": "AI školiteľ",
  "chapter-generation": "Tvorba kapitol",
  "outline-generation": "Návrh štruktúry a osnovy",
  "quality-audit": "Audit kvality",
  humanizer: "Humanizácia textu",
  citations: "Citácie a zdroje",
  planning: "Plánovanie práce",
  emails: "Príprava e-mailov",
  translation: "Preklad",
  originality: "Kontrola originality",
  "data-prepare": "Príprava a čistenie dát",
  "data-descriptive": "Deskriptívna štatistika",
  "data-questionnaires": "Tvorba škál, subškál a grafy",
  "data-reliability": "Reliabilita škál",
  "data-normality": "Testovanie normality",
  "data-correlations": "Korelačné analýzy",
  "data-parametric-tests": "Parametrické testy",
  "data-nonparametric-tests": "Neparametrické testy",
  "data-charts": "Grafy a tabuľky",
  defense: "Príprava na obhajobu",
  "defense-presentation": "Prezentácia na obhajobu",
  "committee-questions": "Otázky komisie",
};

const ALL_FEATURE_KEYS = Object.freeze(Object.keys(FEATURE_LABELS));

const CANCEL_SUBSCRIPTION_ENDPOINTS = [
  "/api/subscription/cancel",
  "/api/billing/cancel-subscription",
  "/api/stripe/cancel-subscription",
];

function cleanText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  return text || fallback;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim();

  if (!normalized) return null;

  const parsed = Number(normalized.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (["true", "1", "yes", "áno", "ano"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "nie", ""].includes(normalized)) {
    return false;
  }

  return fallback;
}

function asArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickRecord(data: unknown): JsonRecord {
  if (!isRecord(data)) return {};

  if (isRecord(data.profile)) return data.profile;
  if (isRecord(data.user)) return data.user;
  if (isRecord(data.account)) return data.account;
  if (isRecord(data.data)) return data.data;
  if (isRecord(data.client)) return data.client;

  return data;
}

function readFromLocalStorage(): Partial<ClientProfile> {
  if (typeof window === "undefined") return {};

  return {
    name:
      localStorage.getItem("zedpera_user_name") ||
      localStorage.getItem("user_name") ||
      "",
    email:
      localStorage.getItem("zedpera_user_email") ||
      localStorage.getItem("user_email") ||
      "",
    role:
      localStorage.getItem("zedpera_user_role") ||
      localStorage.getItem("user_role") ||
      "",
    plan:
      localStorage.getItem("zedpera_user_plan") ||
      localStorage.getItem("zedpera_selected_plan") ||
      "",
    selectedPlan:
      localStorage.getItem("zedpera_selected_plan") ||
      localStorage.getItem("zedpera_user_plan") ||
      "",
    language:
      localStorage.getItem("zedpera_language") ||
      localStorage.getItem("language") ||
      "sk",
  };
}

function normalizeClientProfile(
  profileData: unknown,
  source: string,
): ClientProfile {
  const data = pickRecord(profileData);
  const local = readFromLocalStorage();

  const plan =
    cleanText(data.plan) ||
    cleanText(data.user_plan) ||
    cleanText(data.package) ||
    cleanText(data.packageName) ||
    cleanText(data.selectedPlan) ||
    cleanText(local.plan) ||
    "free";

  const selectedPlan =
    cleanText(data.selectedPlan) ||
    cleanText(data.selected_plan) ||
    cleanText(data.package) ||
    cleanText(data.packageName) ||
    cleanText(local.selectedPlan) ||
    plan;

  const credits =
    asNumber(data.credits) ??
    asNumber(data.totalCredits) ??
    asNumber(data.creditLimit) ??
    asNumber(data.limit) ??
    null;

  const usedCredits =
    asNumber(data.usedCredits) ??
    asNumber(data.creditsUsed) ??
    asNumber(data.used_tokens) ??
    asNumber(data.usage) ??
    null;

  const remainingCredits =
    asNumber(data.remainingCredits) ??
    asNumber(data.creditsRemaining) ??
    (credits !== null && usedCredits !== null
      ? Math.max(credits - usedCredits, 0)
      : null);

  const activeServices = [
    ...asArray(data.activeServices),
    ...asArray(data.services),
    ...asArray(data.activatedServices),
  ];

  const activatedFeatures = [
    ...asArray(data.activatedFeatures),
    ...asArray(data.features),
    ...asArray(data.modules),
  ];

  return {
    id:
      cleanText(data.id) ||
      cleanText(data.profile_id) ||
      cleanText(data.uuid) ||
      "nezistené",
    userId:
      cleanText(data.userId) ||
      cleanText(data.user_id) ||
      cleanText(data.owner_id) ||
      "nezistené",
    name:
      cleanText(data.name) ||
      cleanText(data.fullName) ||
      cleanText(data.full_name) ||
      cleanText(data.displayName) ||
      cleanText(local.name) ||
      "Klient Zedpera",
    email:
      cleanText(data.email) ||
      cleanText(data.userEmail) ||
      cleanText(data.user_email) ||
      cleanText(local.email) ||
      "nezistené",
    role:
      cleanText(data.role) ||
      cleanText(data.userRole) ||
      cleanText(data.user_role) ||
      cleanText(local.role) ||
      "klient",
    plan,
    selectedPlan,
    accountStatus:
      cleanText(data.accountStatus) ||
      cleanText(data.status) ||
      cleanText(data.account_status) ||
      "aktívny",
    packageName:
      cleanText(data.packageName) ||
      cleanText(data.package_name) ||
      cleanText(data.package) ||
      selectedPlan,
    packageLabel:
      cleanText(data.packageLabel) ||
      cleanText(data.package_label) ||
      cleanText(data.planLabel) ||
      selectedPlan,
    credits,
    usedCredits,
    remainingCredits,
    pageLimit:
      asNumber(data.pageLimit) ??
      asNumber(data.page_limit) ??
      asNumber(data.totalPages) ??
      asNumber(data.total_pages) ??
      null,
    basePageLimit:
      asNumber(data.basePageLimit) ?? asNumber(data.base_page_limit) ?? null,
    extraPageLimit:
      asNumber(data.extraPageLimit) ??
      asNumber(data.extra_page_limit) ??
      asNumber(data.extraPages) ??
      asNumber(data.extra_pages) ??
      null,
    pagesUsed:
      asNumber(data.pagesUsed) ??
      asNumber(data.pages_used) ??
      asNumber(data.usedPages) ??
      asNumber(data.used_pages) ??
      null,
    pagesRemaining:
      asNumber(data.pagesRemaining) ??
      asNumber(data.pages_remaining) ??
      asNumber(data.remainingPages) ??
      asNumber(data.remaining_pages) ??
      null,
    pageLimitReached: asBoolean(
      data.pageLimitReached ?? data.page_limit_reached ?? false,
    ),
    isAdmin: asBoolean(data.isAdmin ?? data.is_admin ?? false),
    hasUnlimitedAccess: asBoolean(
      data.hasUnlimitedAccess ??
        data.has_unlimited_access ??
        data.isUnlimited ??
        data.is_unlimited ??
        false,
    ),
    maxProjects:
      asNumber(data.maxProjects) ??
      asNumber(data.projectLimit) ??
      asNumber(data.max_projects) ??
      null,
    projectsCount:
      asNumber(data.projectsCount) ??
      asNumber(data.projectCount) ??
      asNumber(data.projects_count) ??
      null,
    activeServices: Array.from(new Set(activeServices)),
    activatedFeatures: Array.from(new Set(activatedFeatures)),
    subscriptionStatus:
      cleanText(data.subscriptionStatus) ||
      cleanText(data.subscription_status) ||
      cleanText(data.billingStatus) ||
      "nezistené",
    subscriptionStartedAt:
      cleanText(data.subscriptionStartedAt) ||
      cleanText(data.subscription_started_at) ||
      cleanText(data.planStartedAt) ||
      "",
    subscriptionEndsAt:
      cleanText(data.subscriptionEndsAt) ||
      cleanText(data.subscription_ends_at) ||
      cleanText(data.planEndsAt) ||
      cleanText(data.validUntil) ||
      "",
    createdAt: cleanText(data.createdAt) || cleanText(data.created_at) || "",
    updatedAt: cleanText(data.updatedAt) || cleanText(data.updated_at) || "",
    lastLoginAt:
      cleanText(data.lastLoginAt) || cleanText(data.last_login_at) || "",
    language:
      cleanText(data.language) ||
      cleanText(data.locale) ||
      cleanText(local.language) ||
      "sk",
    source,
    raw: data,
  };
}

function formatDate(value: string) {
  if (!value) return "Nezadané";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Nezadané";

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Nezadané";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function labelPlan(plan: string) {
  const value = plan.toLowerCase();

  if (value.includes("seminar")) return "Seminárna práca";
  if (value.includes("bachelor")) return "Bakalárska práca";
  if (value.includes("master") || value.includes("diplom")) {
    return "Diplomová / magisterská práca";
  }
  if (value.includes("elite")) return "Elite Academic";
  if (value.includes("student")) return "Študent Plus";
  if (value.includes("thesis")) return "Pro Thesis";
  if (value.includes("admin")) return "Administrátorský prístup";
  if (value.includes("premium")) return "Premium balíček";
  if (value.includes("pro")) return "Pro balíček";
  if (value.includes("basic")) return "Start Basic";
  if (value.includes("free")) return "Free balíček";

  return plan || "Nezadaný balíček";
}

function normalizeSubscriptionStatus(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes("cancel") ||
    value.includes("zruš") ||
    value.includes("inactive") ||
    value.includes("neaktív")
  ) {
    return "zrušené";
  }

  if (
    value.includes("active") ||
    value.includes("aktív") ||
    value.includes("trial") ||
    value.includes("skúšob")
  ) {
    return "aktívne";
  }

  return value || "nezistené";
}

function humanizeIdentifier(value: string) {
  const cleaned = cleanText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function labelFeature(feature: string) {
  return FEATURE_LABELS[feature] || humanizeIdentifier(feature);
}

function formatCurrencyFromCents(value: number | null) {
  if (value === null) return "Nezadané";
  if (value <= 0) return "Bezplatný";

  return `${new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100)} / mesiac`;
}

function formatLimit(value: number | null, unit = "") {
  if (value === null) return "Neobmedzené";

  return `${value}${unit ? ` ${unit}` : ""}`;
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback;

  const directMessage = cleanText(data.message) || cleanText(data.detail);

  if (directMessage) return directMessage;

  if (typeof data.error === "string") {
    return cleanText(data.error, fallback);
  }

  if (isRecord(data.error)) {
    return (
      cleanText(data.error.message) || cleanText(data.error.detail) || fallback
    );
  }

  return fallback;
}

function pickEntitlementsRecord(data: unknown): JsonRecord {
  if (!isRecord(data)) return {};

  if (isRecord(data.entitlements)) return data.entitlements;
  if (isRecord(data.data)) return data.data;
  if (isRecord(data.usage)) return data.usage;

  return data;
}

function normalizeEntitlements(
  payload: unknown,
  source: string,
): EntitlementsSnapshot {
  const data = pickEntitlementsRecord(payload);

  const isAdmin = asBoolean(
    data.isAdmin ??
      data.is_admin ??
      data.adminAccess ??
      data.admin_access ??
      false,
  );

  const hasUnlimitedAccess = asBoolean(
    data.hasUnlimitedAccess ??
      data.has_unlimited_access ??
      data.isUnlimited ??
      data.is_unlimited ??
      data.unlimitedAccess ??
      data.unlimited_access ??
      isAdmin,
    isAdmin,
  );

  const effectiveUnlimitedAccess = isAdmin || hasUnlimitedAccess;

  const storedPlanId =
    cleanText(data.planId) || cleanText(data.plan_id) || "free";

  const planId = isAdmin ? "admin" : storedPlanId;

  const rawFeatureKeys = Array.from(
    new Set([
      ...asArray(data.features),
      ...asArray(data.featureList),
      ...asArray(data.feature_list),
      ...asArray(data.featureKeys),
      ...asArray(data.feature_keys),
    ]),
  );

  const featureKeys = effectiveUnlimitedAccess
    ? Array.from(new Set([...ALL_FEATURE_KEYS, ...rawFeatureKeys]))
    : rawFeatureKeys;

  const addonIds = Array.from(
    new Set([...asArray(data.addonIds), ...asArray(data.addon_ids)]),
  );

  const addonNames = Array.from(
    new Set([...asArray(data.addonNames), ...asArray(data.addon_names)]),
  );

  const rawPromptLimit =
    asNumber(data.promptLimit) ?? asNumber(data.prompt_limit);

  const promptsUsed = effectiveUnlimitedAccess
    ? 0
    : (asNumber(data.promptsUsed) ?? asNumber(data.prompts_used) ?? 0);

  const promptLimit = effectiveUnlimitedAccess ? null : rawPromptLimit;

  const promptsRemaining = effectiveUnlimitedAccess
    ? null
    : (asNumber(data.promptsRemaining) ??
      asNumber(data.prompts_remaining) ??
      (promptLimit !== null ? Math.max(promptLimit - promptsUsed, 0) : null));

  const normalizedAddonNames = addonNames.length
    ? addonNames
    : addonIds.map(humanizeIdentifier).filter(Boolean);

  const billingStatus =
    cleanText(data.billingStatus) ||
    cleanText(data.billing_status) ||
    cleanText(data.subscriptionStatus) ||
    cleanText(data.subscription_status) ||
    (isAdmin ? "admin" : "nezistené");

  return {
    userId: cleanText(data.userId) || cleanText(data.user_id),
    email: cleanText(data.email),
    planId,
    planName: isAdmin
      ? "Administrátorský prístup"
      : cleanText(data.planName) ||
        cleanText(data.plan_name) ||
        labelPlan(storedPlanId),
    planPriceCents: isAdmin
      ? 0
      : (asNumber(data.planPriceCents) ?? asNumber(data.plan_price_cents)),
    planPageLimit: effectiveUnlimitedAccess
      ? null
      : (asNumber(data.pageLimit) ??
        asNumber(data.page_limit) ??
        asNumber(data.basePageLimit) ??
        asNumber(data.base_page_limit)),
    addonIds,
    addonNames: normalizedAddonNames,
    featureKeys,
    featureLabels: featureKeys.map(labelFeature),
    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached: effectiveUnlimitedAccess
      ? false
      : asBoolean(
          data.promptLimitReached ??
            data.prompt_limit_reached ??
            (promptLimit !== null && promptsUsed >= promptLimit),
        ),
    attachmentLimit: effectiveUnlimitedAccess
      ? null
      : (asNumber(data.attachmentLimit) ?? asNumber(data.attachment_limit)),
    isAdmin,
    hasUnlimitedAccess: effectiveUnlimitedAccess,
    hasDatabaseRecord: asBoolean(
      data.hasDatabaseRecord ?? data.has_database_record ?? true,
      true,
    ),
    billingStatus,
    activatedAt: cleanText(data.activatedAt) || cleanText(data.activated_at),
    validUntil: cleanText(data.validUntil) || cleanText(data.valid_until),
    updatedAt: cleanText(data.updatedAt) || cleanText(data.updated_at),
    source,
    raw: data,
  };
}

function getProfilePlanPriceCents(profile: ClientProfile) {
  const directCents =
    asNumber(profile.raw.planPriceCents) ??
    asNumber(profile.raw.plan_price_cents) ??
    asNumber(profile.raw.packagePriceCents) ??
    asNumber(profile.raw.package_price_cents);

  if (directCents !== null) return directCents;

  const priceInEuros =
    asNumber(profile.raw.planPrice) ??
    asNumber(profile.raw.plan_price) ??
    asNumber(profile.raw.packagePrice) ??
    asNumber(profile.raw.package_price) ??
    asNumber(profile.raw.price);

  return priceInEuros !== null ? Math.round(priceInEuros * 100) : null;
}

function getPackageStatus(
  profile: ClientProfile,
  entitlements: EntitlementsSnapshot | null,
) {
  if (
    entitlements?.isAdmin ||
    entitlements?.hasUnlimitedAccess ||
    profile.isAdmin ||
    profile.hasUnlimitedAccess
  ) {
    return "Administrátorský prístup – neobmedzený";
  }

  const subscriptionStatus = normalizeSubscriptionStatus(
    entitlements?.billingStatus || profile.subscriptionStatus,
  );

  const validUntil = entitlements?.validUntil || profile.subscriptionEndsAt;

  if (subscriptionStatus === "zrušené") {
    return validUntil ? "Zrušené – prístup do konca platnosti" : "Zrušené";
  }

  if (validUntil) {
    const expirationDate = new Date(validUntil);

    if (
      !Number.isNaN(expirationDate.getTime()) &&
      expirationDate.getTime() < Date.now()
    ) {
      return "Platnosť skončila";
    }
  }

  const plan =
    `${entitlements?.planId || ""} ${profile.plan} ${profile.selectedPlan}`.toLowerCase();

  if (plan.includes("free")) {
    return "Aktívny bezplatný balík";
  }

  if (
    profile.accountStatus.toLowerCase().includes("blok") ||
    profile.accountStatus.toLowerCase().includes("suspend")
  ) {
    return "Pozastavený";
  }

  return "Aktívny";
}
function getPackageStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("administrátorský")) {
    return "border-violet-300/35 bg-violet-500/15 text-violet-50";
  }

  if (normalized.includes("skončila") || normalized.includes("zrušené")) {
    return "border-red-300/25 bg-red-500/10 text-red-100";
  }

  if (
    normalized.includes("pozastavený") ||
    normalized.includes("konca platnosti")
  ) {
    return "border-amber-300/25 bg-amber-500/10 text-amber-100";
  }

  if (normalized.includes("aktívny")) {
    return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  }

  return "border-slate-300/20 bg-slate-500/10 text-slate-200";
}
function getPromptUsagePercent(entitlements: EntitlementsSnapshot | null) {
  if (
    !entitlements ||
    entitlements.hasUnlimitedAccess ||
    entitlements.isAdmin ||
    entitlements.promptLimit === null ||
    entitlements.promptLimit <= 0
  ) {
    return null;
  }

  return Math.min(
    Math.round((entitlements.promptsUsed / entitlements.promptLimit) * 100),
    100,
  );
}
function canCancelSubscription(
  profile: ClientProfile | null,
  entitlements: EntitlementsSnapshot | null,
) {
  if (!profile) return false;

  if (
    profile.isAdmin ||
    profile.hasUnlimitedAccess ||
    entitlements?.isAdmin ||
    entitlements?.hasUnlimitedAccess
  ) {
    return false;
  }

  const status = normalizeSubscriptionStatus(
    entitlements?.billingStatus || profile.subscriptionStatus,
  );

  const plan =
    `${entitlements?.planId || ""} ${profile.plan} ${profile.selectedPlan} ${profile.packageName}`.toLowerCase();

  if (status === "zrušené") return false;
  if (plan.includes("free")) return false;

  return true;
}
function getUsagePercent(profile: ClientProfile) {
  if (
    profile.hasUnlimitedAccess ||
    profile.isAdmin ||
    profile.credits === null ||
    profile.usedCredits === null ||
    profile.credits <= 0
  ) {
    return null;
  }

  return Math.min(
    Math.round((profile.usedCredits / profile.credits) * 100),
    100,
  );
}
function getPageUsagePercent(profile: ClientProfile) {
  if (
    profile.hasUnlimitedAccess ||
    profile.isAdmin ||
    profile.pageLimit === null ||
    profile.pagesUsed === null ||
    profile.pageLimit <= 0
  ) {
    return null;
  }

  return Math.min(
    Math.round((profile.pagesUsed / profile.pageLimit) * 100),
    100,
  );
}
function pickPageUsageRecord(data: unknown): JsonRecord {
  if (!isRecord(data)) return {};

  // Aktuálny endpoint vracia údaje priamo v koreňovom objekte.
  // Vnorené varianty ponechávame iba ako bezpečnú spätnú kompatibilitu.
  if (isRecord(data.usage)) return data.usage;
  if (isRecord(data.pageUsage)) return data.pageUsage;
  if (isRecord(data.quota)) return data.quota;
  if (isRecord(data.data)) return data.data;

  return data;
}

function asNonNegativeInteger(value: unknown): number | null {
  const parsed = asNumber(value);

  if (parsed === null) return null;

  return Math.min(
    Math.max(Math.trunc(parsed), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Normalizuje presný kontrakt GET /api/usage/pages:
 *
 * Používateľ:
 * {
 *   pageLimit: 70,
 *   pagesUsed: 21,
 *   pagesRemaining: 49,
 *   pageLimitReached: false,
 *   isUnlimited: false
 * }
 *
 * ADMIN:
 * {
 *   pageLimit: null,
 *   pagesUsed: null,
 *   pagesRemaining: null,
 *   pageLimitReached: false,
 *   isUnlimited: true
 * }
 */
function normalizePageUsageSnapshot(
  payload: unknown,
): PageUsageSnapshot | null {
  const usage = pickPageUsageRecord(payload);

  if (!Object.keys(usage).length) {
    return null;
  }

  const isUnlimited = asBoolean(
    usage.isUnlimited ?? usage.is_unlimited ?? false,
  );

  if (isUnlimited) {
    return {
      pageLimit: null,
      pagesUsed: null,
      pagesRemaining: null,
      pageLimitReached: false,
      isUnlimited: true,
    };
  }

  const pageLimit = asNonNegativeInteger(
    usage.pageLimit ?? usage.page_limit,
  );

  const pagesUsed = asNonNegativeInteger(
    usage.pagesUsed ?? usage.pages_used,
  );

  const receivedPagesRemaining = asNonNegativeInteger(
    usage.pagesRemaining ?? usage.pages_remaining,
  );

  if (
    pageLimit === null ||
    pagesUsed === null ||
    receivedPagesRemaining === null
  ) {
    return null;
  }

  const calculatedPagesRemaining = Math.max(
    pageLimit - pagesUsed,
    0,
  );

  // Serverový údaj rešpektujeme, ale nedovolíme zobraziť viac zostávajúcich
  // strán, než vyplýva z celkového limitu a už použitej spotreby.
  const pagesRemaining = Math.min(
    receivedPagesRemaining,
    calculatedPagesRemaining,
  );

  const pageLimitReached =
    asBoolean(
      usage.pageLimitReached ??
        usage.page_limit_reached ??
        false,
    ) ||
    pageLimit <= 0 ||
    pagesUsed >= pageLimit ||
    pagesRemaining <= 0;

  return {
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached,
    isUnlimited: false,
  };
}

function mergePageUsage(
  profile: ClientProfile,
  usageData: unknown,
): ClientProfile {
  const usage = normalizePageUsageSnapshot(usageData);

  if (!usage) {
    return profile;
  }

  if (usage.isUnlimited) {
    return {
      ...profile,

      // Verejný kontrakt endpointu používa isUnlimited ako jednoznačný
      // indikátor administrátorského stránkového prístupu.
      isAdmin: true,
      hasUnlimitedAccess: true,
      role: "administrátor",
      plan: "admin",
      selectedPlan: "admin",
      accountStatus: "aktívny – plný prístup",
      packageName: "Administrátorský prístup",
      packageLabel: "Administrátorský prístup",

      basePageLimit: null,
      extraPageLimit: null,
      pageLimit: null,
      pagesUsed: null,
      pagesRemaining: null,
      pageLimitReached: false,
    };
  }

  return {
    ...profile,
    hasUnlimitedAccess: false,

    // Endpoint /api/usage/pages je autoritatívny pre aktuálny celkový limit,
    // spotrebu, zostávajúce strany a stav vyčerpania.
    pageLimit: usage.pageLimit,
    pagesUsed: usage.pagesUsed,
    pagesRemaining: usage.pagesRemaining,
    pageLimitReached: usage.pageLimitReached,

    // basePageLimit a extraPageLimit sa v novom verejnom kontrakte neposielajú.
    // Ponechávajú sa preto z profilu/entitlementov načítaných pred týmto volaním.
    basePageLimit: profile.basePageLimit,
    extraPageLimit: profile.extraPageLimit,
  };
}

async function loadPageUsage(profile: ClientProfile): Promise<ClientProfile> {
  try {
    const response = await fetch(PAGE_USAGE_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();

    let data: unknown = null;

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      // Nedostupný odpočet strán nesmie zablokovať celý osobný profil.
      // Chyba sa spracuje ako očakávaný stav bez console.error,
      // aby Next.js v režime vývoja nezobrazil chybový overlay.
      if (process.env.NODE_ENV === "development") {
        console.info("PAGE_USAGE_UNAVAILABLE", {
          status: response.status,
          statusText: response.statusText,
          endpoint: PAGE_USAGE_ENDPOINT,
          response: isRecord(data) ? data : responseText.slice(0, 500),
        });
      }

      return profile;
    }

    if (!data || !isRecord(data)) {
      if (process.env.NODE_ENV === "development") {
        console.info("PAGE_USAGE_EMPTY_RESPONSE", {
          status: response.status,
          endpoint: PAGE_USAGE_ENDPOINT,
        });
      }

      return profile;
    }

    return mergePageUsage(profile, data);
  } catch (error) {
    // Profil zostane funkčný aj pri dočasnom výpadku API.
    if (process.env.NODE_ENV === "development") {
      console.info("PAGE_USAGE_REQUEST_SKIPPED", {
        endpoint: PAGE_USAGE_ENDPOINT,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return profile;
  }
}

async function loadEntitlementsSnapshot(): Promise<EntitlementsLoadResult> {
  try {
    const response = await fetch(ENTITLEMENTS_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    let data: unknown = null;

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      return {
        entitlements: null,
        error: getApiErrorMessage(
          data,
          "Údaje o balíku a oprávneniach sa nepodarilo načítať.",
        ),
      };
    }

    if (!data || !isRecord(data)) {
      return {
        entitlements: null,
        error: "API balíka vrátilo prázdnu alebo neplatnú odpoveď.",
      };
    }

    return {
      entitlements: normalizeEntitlements(data, ENTITLEMENTS_ENDPOINT),
      error: "",
    };
  } catch (error) {
    return {
      entitlements: null,
      error:
        error instanceof Error
          ? error.message
          : "Údaje o balíku a oprávneniach sa nepodarilo načítať.",
    };
  }
}

function mergeEntitlementsIntoProfile(
  profile: ClientProfile,
  entitlements: EntitlementsSnapshot,
): ClientProfile {
  const effectiveUnlimitedAccess =
    entitlements.isAdmin || entitlements.hasUnlimitedAccess;

  const basePageLimit = effectiveUnlimitedAccess
    ? null
    : (profile.basePageLimit ?? entitlements.planPageLimit);

  const extraPageLimit = effectiveUnlimitedAccess
    ? null
    : (profile.extraPageLimit ?? 0);

  const pageLimit = effectiveUnlimitedAccess
    ? null
    : (profile.pageLimit ??
      (basePageLimit !== null ? basePageLimit + (extraPageLimit ?? 0) : null));

  const effectivePlanId = entitlements.isAdmin
    ? "admin"
    : entitlements.planId || profile.plan;

  const effectivePlanName = entitlements.isAdmin
    ? "Administrátorský prístup"
    : entitlements.planName || profile.packageName;

  const effectiveFeatures = entitlements.hasUnlimitedAccess
    ? ALL_FEATURE_KEYS.map(labelFeature)
    : entitlements.featureLabels;

  return {
    ...profile,
    userId:
      profile.userId !== "nezistené"
        ? profile.userId
        : entitlements.userId || profile.userId,
    email:
      profile.email !== "nezistené"
        ? profile.email
        : entitlements.email || profile.email,
    role: entitlements.isAdmin ? "administrátor" : profile.role,
    isAdmin: entitlements.isAdmin,
    hasUnlimitedAccess: effectiveUnlimitedAccess,
    plan: effectivePlanId,
    selectedPlan: effectivePlanId,
    accountStatus: effectiveUnlimitedAccess
      ? "aktívny – plný prístup"
      : profile.accountStatus,
    packageName: effectivePlanName,
    packageLabel: effectivePlanName,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    pagesUsed: effectiveUnlimitedAccess ? null : profile.pagesUsed,
    pagesRemaining: effectiveUnlimitedAccess ? null : profile.pagesRemaining,
    pageLimitReached: effectiveUnlimitedAccess
      ? false
      : profile.pageLimitReached,
    activeServices: Array.from(
      new Set([
        ...profile.activeServices,
        ...entitlements.addonNames,
        ...(effectiveUnlimitedAccess
          ? ["Administrátorský prístup – všetky moduly"]
          : []),
      ]),
    ),
    activatedFeatures: Array.from(
      new Set([...profile.activatedFeatures, ...effectiveFeatures]),
    ),
    subscriptionStatus: effectiveUnlimitedAccess
      ? "administrátorský účet"
      : entitlements.billingStatus || profile.subscriptionStatus,
    subscriptionStartedAt:
      entitlements.activatedAt || profile.subscriptionStartedAt,
    subscriptionEndsAt: effectiveUnlimitedAccess
      ? ""
      : entitlements.validUntil || profile.subscriptionEndsAt,
    updatedAt: entitlements.updatedAt || profile.updatedAt,
  };
}
function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="group min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.065] p-4 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.09] sm:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-100 transition group-hover:bg-violet-600/30">
          <Icon size={22} />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>

          <div className="mt-2 max-w-full break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-xl">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 max-w-full break-words text-sm font-bold leading-5 text-slate-400 [overflow-wrap:anywhere]">
              {helper}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 border-b border-white/10 py-3 last:border-b-0">
      <div className="max-w-full break-words text-xs font-black uppercase tracking-[0.1em] text-slate-400 [overflow-wrap:anywhere]">
        {label}
      </div>

      <div className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-100 [overflow-wrap:anywhere]">
        {formatValue(value)}
      </div>
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-start gap-2 whitespace-normal rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-black leading-5 text-violet-100 transition [overflow-wrap:anywhere] hover:border-violet-300/60 hover:bg-violet-500/25">
      <CheckCircle2 size={14} />
      {children}
    </span>
  );
}

function formatPromptUsageSummary(
  entitlements: EntitlementsSnapshot | null,
): string {
  if (!entitlements) {
    return "Údaje o promptoch nie sú dostupné";
  }

  if (entitlements.isAdmin || entitlements.hasUnlimitedAccess) {
    return "Neobmedzený administrátorský prístup";
  }

  if (entitlements.promptLimit === null) {
    return "Neobmedzený počet promptov";
  }

  const remaining =
    entitlements.promptsRemaining ??
    Math.max(entitlements.promptLimit - entitlements.promptsUsed, 0);

  return `${remaining} zostáva, ${entitlements.promptsUsed} použitých z ${entitlements.promptLimit}`;
}

function formatPageUsageSummary(profile: ClientProfile | null): string {
  if (!profile) {
    return "Údaje o stranách nie sú dostupné";
  }

  if (profile.isAdmin || profile.hasUnlimitedAccess) {
    return "Neobmedzený administrátorský prístup";
  }

  if (profile.pageLimit === null) {
    return "Stránkový limit nie je uvedený";
  }

  const remaining =
    profile.pagesRemaining ??
    Math.max(profile.pageLimit - (profile.pagesUsed ?? 0), 0);

  return `${remaining} zostáva z ${profile.pageLimit}`;
}

function formatAttachmentLimit(
  entitlements: EntitlementsSnapshot | null,
): string {
  if (!entitlements) {
    return "Nezadané";
  }

  if (
    entitlements.isAdmin ||
    entitlements.hasUnlimitedAccess ||
    entitlements.attachmentLimit === null
  ) {
    return "Neobmedzené";
  }

  return String(entitlements.attachmentLimit);
}

function formatPlanPrice(
  priceCents: number | null,
  entitlements: EntitlementsSnapshot | null,
): string {
  if (entitlements?.isAdmin || entitlements?.hasUnlimitedAccess) {
    return "Interný účet";
  }

  return formatCurrencyFromCents(priceCents);
}

function formatDateOrUnlimited(
  value: string,
  hasUnlimitedAccess: boolean,
): string {
  if (hasUnlimitedAccess && !value) {
    return "Bez časového obmedzenia";
  }

  return formatDate(value);
}

export default function ClientAccountProfile() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsSnapshot | null>(
    null,
  );
  const [entitlementsError, setEntitlementsError] = useState("");
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState("");

  const [cancelState, setCancelState] = useState<CancelState>("idle");
  const [cancelMessage, setCancelMessage] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadProfile = useCallback(async () => {
    setState("loading");
    setError("");
    setEntitlementsError("");

    const entitlementResult = await loadEntitlementsSnapshot();

    setEntitlements(entitlementResult.entitlements);
    setEntitlementsError(entitlementResult.error);

    let lastError = "";

    for (const endpoint of PROFILE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          lastError =
            cleanText((data as JsonRecord | null)?.error) ||
            cleanText((data as JsonRecord | null)?.message) ||
            "Klientsky profil sa nepodarilo načítať.";
          continue;
        }

        const normalizedProfile = normalizeClientProfile(data, endpoint);
        const profileWithEntitlements = entitlementResult.entitlements
          ? mergeEntitlementsIntoProfile(
              normalizedProfile,
              entitlementResult.entitlements,
            )
          : normalizedProfile;
        const normalized = await loadPageUsage(profileWithEntitlements);

        setProfile(normalized);
        setLastLoadedAt(new Date().toISOString());
        setState("success");
        return;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : "Klientsky profil sa nepodarilo načítať.";
      }
    }

    const localFallback = normalizeClientProfile({}, "lokálne údaje");
    const localWithEntitlements = entitlementResult.entitlements
      ? mergeEntitlementsIntoProfile(
          localFallback,
          entitlementResult.entitlements,
        )
      : localFallback;
    const fallback = await loadPageUsage(localWithEntitlements);

    setProfile(fallback);
    setLastLoadedAt(new Date().toISOString());
    setError(
      lastError ||
        "Klientsky profil sa nepodarilo načítať. Zobrazujem aspoň lokálne uložené údaje.",
    );
    setState("error");
  }, []);

  const cancelSubscription = useCallback(async () => {
    if (
      !profile ||
      cancelState === "loading" ||
      profile.isAdmin ||
      profile.hasUnlimitedAccess ||
      entitlements?.isAdmin ||
      entitlements?.hasUnlimitedAccess
    ) {
      return;
    }

    setCancelState("loading");
    setCancelMessage("");

    let lastError = "";

    for (const endpoint of CANCEL_SUBSCRIPTION_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: profile.email,
            plan: profile.selectedPlan || profile.plan,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          lastError =
            cleanText((data as JsonRecord | null)?.error) ||
            cleanText((data as JsonRecord | null)?.message) ||
            "Predplatné sa nepodarilo zrušiť.";
          continue;
        }

        setProfile((current) =>
          current
            ? {
                ...current,
                subscriptionStatus: "zrušené",
                accountStatus: "aktívny do konca zaplateného obdobia",
                updatedAt: new Date().toISOString(),
              }
            : current,
        );

        setCancelState("success");
        setCancelMessage(
          "Predplatné bolo zrušené. Prístup zostáva zachovaný do konca zaplateného obdobia.",
        );
        setShowCancelConfirm(false);

        await loadProfile();

        return;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : "Predplatné sa nepodarilo zrušiť.";
      }
    }

    setCancelState("error");
    setCancelMessage(
      lastError ||
        "Predplatné sa nepodarilo zrušiť. Skúste to znova alebo kontaktujte podporu.",
    );
  }, [cancelState, entitlements, loadProfile, profile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const isAdmin = Boolean(entitlements?.isAdmin || profile?.isAdmin);

  const hasUnlimitedAccess = Boolean(
    isAdmin || entitlements?.hasUnlimitedAccess || profile?.hasUnlimitedAccess,
  );

  const usagePercent = useMemo(() => {
    return profile ? getUsagePercent(profile) : null;
  }, [profile]);

  const pageUsagePercent = useMemo(() => {
    return profile ? getPageUsagePercent(profile) : null;
  }, [profile]);

  const promptUsagePercent = useMemo(() => {
    return getPromptUsagePercent(entitlements);
  }, [entitlements]);

  const packageStatus = useMemo(() => {
    return profile ? getPackageStatus(profile, entitlements) : "Nezistené";
  }, [entitlements, profile]);

  const packageStatusClasses = useMemo(() => {
    return getPackageStatusClasses(packageStatus);
  }, [packageStatus]);

  const planPriceCents = useMemo(() => {
    if (
      entitlements?.planPriceCents !== null &&
      entitlements?.planPriceCents !== undefined
    ) {
      return entitlements.planPriceCents;
    }

    return profile ? getProfilePlanPriceCents(profile) : null;
  }, [entitlements, profile]);

  const basePages =
    profile?.basePageLimit ?? entitlements?.planPageLimit ?? null;

  const extraPages = profile?.extraPageLimit ?? 0;

  const activatedAddons = useMemo(() => {
    if (hasUnlimitedAccess) {
      return ["Administrátorský prístup – všetky moduly"];
    }

    const values = entitlements?.addonNames.length
      ? entitlements.addonNames
      : profile?.activeServices || [];

    return Array.from(new Set(values));
  }, [entitlements, hasUnlimitedAccess, profile]);

  const availableFeatures = useMemo(() => {
    const values = hasUnlimitedAccess
      ? ALL_FEATURE_KEYS.map(labelFeature)
      : entitlements?.featureLabels.length
        ? entitlements.featureLabels
        : profile?.activatedFeatures || [];

    return Array.from(new Set(values));
  }, [entitlements, hasUnlimitedAccess, profile]);

  const promptUsageSummary = formatPromptUsageSummary(entitlements);

  const pageUsageSummary = formatPageUsageSummary(profile);

  const subscriptionCanBeCancelled = canCancelSubscription(
    profile,
    entitlements,
  );

  function goToMenu() {
    router.push("/dashboard");
  }

  function goToBuyPages() {
    router.push("/pricing#doplnkove-sluzby");
  }

  return (
    <main className="client-account-profile min-h-screen w-full min-w-0 overflow-x-hidden bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-[-140px] top-40 h-[440px] w-[440px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[460px] w-[460px] rounded-full bg-fuchsia-700/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full min-w-0 max-w-7xl px-3 py-5 sm:px-5 sm:py-6 lg:px-6">
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-xl shadow-violet-950/40">
                <UserCircle size={30} />
              </div>

              <div className="min-w-0">
                <div className="inline-flex max-w-full flex-wrap items-center gap-2 whitespace-normal rounded-2xl border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[11px] font-black uppercase leading-5 tracking-[0.14em] text-violet-100 [overflow-wrap:anywhere]">
                  <ShieldCheck size={13} />
                  {isAdmin ? "Administrátorský účet" : "Účet klienta"}
                </div>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {isAdmin
                    ? "Administrátorský účet a služby"
                    : "Klientsky účet a služby"}
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                  {hasUnlimitedAccess
                    ? "Administrátorský profil má plný prístup ku všetkým modulom, funkciám, exportom, promptom, stranám a prílohám bez tarifných obmedzení."
                    : "Klientsky profil zobrazuje účet, balíček, stav služieb, kredity, projekty, odpočet strán, predplatné a dátumy prístupov."}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">
              <button
                type="button"
                onClick={goToMenu}
                className="inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-white/[0.14]"
              >
                <ArrowLeft size={18} />
                Návrat do menu
              </button>

              <button
                type="button"
                onClick={loadProfile}
                disabled={state === "loading"}
                className="inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === "loading" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                Obnoviť údaje
              </button>

              {hasUnlimitedAccess ? (
                <div className="inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl border border-violet-300/35 bg-violet-500/15 px-5 text-sm font-black text-violet-50 shadow-lg shadow-violet-950/20">
                  <ShieldCheck size={18} />
                  Plný prístup
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCancelMessage("");
                    setShowCancelConfirm(true);
                  }}
                  disabled={!subscriptionCanBeCancelled}
                  className="inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-5 text-sm font-black text-red-100 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-red-300/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={18} />
                  Zrušiť predplatné
                </button>
              )}
            </div>
          </div>
        </section>

        {error ? (
          <section className="mb-6 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm font-bold leading-6 text-amber-100 shadow-xl shadow-black/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>{error}</div>
            </div>
          </section>
        ) : null}

        {entitlementsError ? (
          <section className="mb-6 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm font-bold leading-6 text-amber-100 shadow-xl shadow-black/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                Sekciu balíka sa nepodarilo načítať úplne: {entitlementsError}{" "}
                Zvyšné údaje osobného profilu zostávajú dostupné.
              </div>
            </div>
          </section>
        ) : null}

        {hasUnlimitedAccess ? (
          <section className="mb-6 rounded-[1.6rem] border border-violet-300/30 bg-gradient-to-r from-violet-600/20 via-blue-600/15 to-fuchsia-600/15 p-5 shadow-xl shadow-black/25">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-100">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="text-xl font-black text-white">
                  Administrátorský prístup je aktívny
                </h2>

                <p className="mt-1 text-sm font-bold leading-6 text-violet-100/85">
                  Tento účet nie je obmedzený balíkom Free. Má sprístupnené
                  všetky moduly, funkcie, exporty, prompty, strany a prílohy.
                  Spotreba sa administrátorovi neodpočítava.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {cancelMessage ? (
          <section
            className={`mb-6 rounded-[1.5rem] border p-5 text-sm font-bold leading-6 shadow-xl shadow-black/20 ${
              cancelState === "success"
                ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                : "border-red-400/25 bg-red-500/10 text-red-100"
            }`}
          >
            <div className="flex items-start gap-3">
              {cancelState === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}

              <div>{cancelMessage}</div>
            </div>
          </section>
        ) : null}

        {showCancelConfirm && !hasUnlimitedAccess ? (
          <section className="mb-6 rounded-[1.6rem] border border-red-400/30 bg-red-500/10 p-5 shadow-xl shadow-black/25">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-100">
                  <XCircle size={23} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Naozaj chcete zrušiť predplatné?
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-red-100/85">
                    Po zrušení sa predplatné nebude automaticky obnovovať.
                    Prístup k službám zostane zachovaný do konca už zaplateného
                    obdobia.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelState === "loading"}
                  className="inline-flex min-h-[46px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ponechať predplatné
                </button>

                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={cancelState === "loading"}
                  className="inline-flex min-h-[46px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-xl shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelState === "loading" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <XCircle size={18} />
                  )}
                  Potvrdiť zrušenie
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {state === "loading" && !profile ? (
          <section className="rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-8 shadow-xl shadow-black/30">
            <div className="flex items-center gap-4">
              <Loader2 className="h-7 w-7 animate-spin text-violet-200" />

              <div>
                <div className="text-lg font-black text-white">
                  Načítavam klientsky profil...
                </div>

                <div className="mt-1 text-sm font-bold text-slate-400">
                  Pripravujem údaje klienta a jeho služieb.
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {profile ? (
          <div className="min-w-0 space-y-6">
            <section className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 sm:gap-5">
              <StatCard
                icon={UserCircle}
                label="Klient"
                value={profile.name}
                helper={profile.email}
              />

              <StatCard
                icon={Crown}
                label="Balíček"
                value={
                  hasUnlimitedAccess
                    ? "Administrátorský prístup"
                    : labelPlan(profile.selectedPlan || profile.plan)
                }
                helper={
                  hasUnlimitedAccess
                    ? "Plný prístup bez tarifných obmedzení"
                    : `Stav účtu: ${profile.accountStatus}`
                }
              />

              <StatCard
                icon={WalletCards}
                label="Kredity"
                value={
                  hasUnlimitedAccess
                    ? "Neobmedzené"
                    : profile.remainingCredits !== null
                      ? `${profile.remainingCredits} zostáva`
                      : "Nezadané"
                }
                helper={
                  hasUnlimitedAccess
                    ? "Administrátorovi sa spotreba neodpočítava"
                    : profile.credits !== null
                      ? `Celkom: ${profile.credits}${
                          profile.usedCredits !== null
                            ? ` · použité: ${profile.usedCredits}`
                            : ""
                        }`
                      : "Limit nie je uvedený"
                }
              />

              <StatCard
                icon={Gauge}
                label="Zostávajúce strany"
                value={
                  hasUnlimitedAccess
                    ? "Neobmedzené"
                    : profile.pagesRemaining !== null
                      ? `${profile.pagesRemaining}`
                      : "Nezadané"
                }
                helper={
                  hasUnlimitedAccess
                    ? "Administrátorovi sa strany neodpočítavajú"
                    : pageUsageSummary
                }
              />

              <StatCard
                icon={FileText}
                label="Projekty"
                value={
                  profile.projectsCount !== null
                    ? `${profile.projectsCount}`
                    : "Nezadané"
                }
                helper={
                  profile.maxProjects !== null
                    ? `Limit: ${profile.maxProjects}`
                    : "Limit projektov nie je uvedený"
                }
              />
            </section>

            <section className="min-w-0 overflow-hidden rounded-[1.8rem] border border-violet-300/20 bg-[#0b1020]/95 shadow-2xl shadow-black/30">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-600/25 via-blue-600/15 to-fuchsia-600/15 p-5 sm:p-6">
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-100 shadow-lg shadow-violet-950/30">
                      <Crown size={26} />
                    </div>

                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                        Predplatné, limity a oprávnenia
                      </div>

                      <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        Môj balík a používanie
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-300">
                        Kompletný prehľad aktivovaného balíka, dátumov
                        platnosti, strán, promptov, príloh, doplnkov a
                        dostupných funkcií.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`inline-flex max-w-full flex-wrap items-center gap-2 whitespace-normal rounded-2xl border px-4 py-2 text-sm font-black leading-5 [overflow-wrap:anywhere] ${packageStatusClasses}`}
                  >
                    <BadgeCheck size={17} />
                    {packageStatus}
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-6 p-4 sm:p-6">
                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,13.5rem),1fr))] gap-4">
                  <StatCard
                    icon={Crown}
                    label="Názov balíka"
                    value={
                      entitlements?.planName ||
                      profile.packageLabel ||
                      labelPlan(profile.selectedPlan || profile.plan)
                    }
                    helper={`ID balíka: ${entitlements?.planId || profile.selectedPlan || profile.plan}`}
                  />

                  <StatCard
                    icon={WalletCards}
                    label="Cena balíka"
                    value={formatPlanPrice(planPriceCents, entitlements)}
                    helper={
                      hasUnlimitedAccess
                        ? "Administrátorský účet nepodlieha platobnému balíku"
                        : "Cena základného balíka bez samostatných doplnkov"
                    }
                  />

                  <StatCard
                    icon={ShieldCheck}
                    label="Stav balíka"
                    value={packageStatus}
                    helper={
                      hasUnlimitedAccess
                        ? "Interný účet s neobmedzeným oprávnením"
                        : `Predplatné: ${entitlements?.billingStatus || profile.subscriptionStatus}`
                    }
                  />

                  <StatCard
                    icon={CalendarClock}
                    label="Dátum aktivácie"
                    value={formatDateOrUnlimited(
                      entitlements?.activatedAt ||
                        profile.subscriptionStartedAt,
                      hasUnlimitedAccess,
                    )}
                    helper={
                      hasUnlimitedAccess
                        ? "Administrátorské oprávnenie je aktívne bez tarifného obdobia"
                        : "Začiatok platnosti aktuálneho balíka"
                    }
                  />

                  <StatCard
                    icon={Clock3}
                    label="Platnosť balíka"
                    value={
                      hasUnlimitedAccess
                        ? "Bez časového obmedzenia"
                        : entitlements?.validUntil || profile.subscriptionEndsAt
                          ? formatDate(
                              entitlements?.validUntil ||
                                profile.subscriptionEndsAt,
                            )
                          : "Bez uvedeného konca"
                    }
                    helper={
                      hasUnlimitedAccess
                        ? "Administrátorský prístup sa neriadi platnosťou balíka"
                        : "Dátum ukončenia alebo obnovy predplatného"
                    }
                  />
                </div>

                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-5">
                  <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
                          <Gauge size={22} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-black text-white [overflow-wrap:anywhere]">
                            Strany
                          </h3>
                          <p className="text-sm font-bold text-slate-400">
                            Základné a dokúpené normostrany
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white">
                          {hasUnlimitedAccess
                            ? "∞"
                            : (profile.pagesRemaining ?? "—")}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          {hasUnlimitedAccess ? "neobmedzené" : "zostáva"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Základné strany
                        </div>
                        <div className="mt-1 max-w-full break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-xl">
                          {hasUnlimitedAccess ? "—" : (basePages ?? "—")}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Extra strany
                        </div>
                        <div className="mt-1 max-w-full break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-xl">
                          {hasUnlimitedAccess ? "—" : extraPages}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Použité strany
                        </div>
                        <div className="mt-1 max-w-full break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-xl">
                          {hasUnlimitedAccess
                            ? "—"
                            : (profile.pagesUsed ?? "—")}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Celkový limit
                        </div>
                        <div className="mt-1 max-w-full break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-xl">
                          {hasUnlimitedAccess
                            ? "Neobmedzené"
                            : (profile.pageLimit ?? "—")}
                        </div>
                      </div>
                    </div>

                    {pageUsagePercent !== null ? (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-400">
                          <span>Čerpanie strán</span>
                          <span>{pageUsagePercent} %</span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={[
                              "h-full rounded-full transition-all duration-500",
                              pageUsagePercent >= 100
                                ? "bg-red-500"
                                : pageUsagePercent >= 80
                                  ? "bg-amber-500"
                                  : "bg-gradient-to-r from-blue-500 to-violet-500",
                            ].join(" ")}
                            style={{ width: `${pageUsagePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : hasUnlimitedAccess ? (
                      <div className="mt-5 rounded-2xl border border-violet-300/25 bg-violet-500/10 p-3 text-sm font-bold leading-6 text-violet-100">
                        Stránky sú pre administrátora neobmedzené a po úspešnom
                        výstupe sa neodpočítavajú.
                      </div>
                    ) : null}
                  </article>

                  <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                          <Sparkles size={22} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-black text-white [overflow-wrap:anywhere]">
                            Prompty
                          </h3>
                          <p className="text-sm font-bold text-slate-400">
                            Použitie AI požiadaviek v balíku
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white">
                          {hasUnlimitedAccess
                            ? "∞"
                            : entitlements
                              ? formatLimit(entitlements.promptsRemaining)
                              : "—"}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          {hasUnlimitedAccess ? "neobmedzené" : "zostáva"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <DetailRow
                        label="Limit promptov"
                        value={
                          hasUnlimitedAccess
                            ? "Neobmedzené"
                            : entitlements
                              ? formatLimit(entitlements.promptLimit)
                              : "Nezadané"
                        }
                      />
                      <DetailRow
                        label="Použité prompty"
                        value={
                          hasUnlimitedAccess
                            ? "Neodpočítavajú sa"
                            : (entitlements?.promptsUsed ?? "Nezadané")
                        }
                      />
                      <DetailRow
                        label="Zostávajúce prompty"
                        value={
                          hasUnlimitedAccess
                            ? "Neobmedzené"
                            : entitlements
                              ? formatLimit(entitlements.promptsRemaining)
                              : "Nezadané"
                        }
                      />
                      <DetailRow
                        label="Súhrn promptov"
                        value={promptUsageSummary}
                      />
                    </div>

                    {promptUsagePercent !== null ? (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-400">
                          <span>Čerpanie promptov</span>
                          <span>{promptUsagePercent} %</span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={[
                              "h-full rounded-full transition-all duration-500",
                              entitlements?.promptLimitReached
                                ? "bg-red-500"
                                : promptUsagePercent >= 80
                                  ? "bg-amber-500"
                                  : "bg-gradient-to-r from-violet-500 to-fuchsia-500",
                            ].join(" ")}
                            style={{ width: `${promptUsagePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
                        {hasUnlimitedAccess
                          ? "Administrátorský účet má neobmedzený počet promptov a spotreba sa neodpočítava."
                          : entitlements?.promptLimit === null
                            ? "Balík má neobmedzený počet promptov."
                            : "Údaje o čerpaní promptov nie sú dostupné."}
                      </div>
                    )}
                  </article>

                  <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-100">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black text-white [overflow-wrap:anywhere]">
                          Prílohy
                        </h3>
                        <p className="text-sm font-bold text-slate-400">
                          Maximálny počet súborov v jednej požiadavke
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.4rem] border border-emerald-300/20 bg-emerald-500/10 p-5 text-center">
                      <div className="max-w-full break-words text-2xl font-black leading-tight text-white [overflow-wrap:anywhere] sm:text-3xl">
                        {formatAttachmentLimit(entitlements)}
                      </div>
                      <div className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-100">
                        {hasUnlimitedAccess ? "bez limitu" : "príloh naraz"}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <DetailRow
                        label="Aktivované doplnky"
                        value={activatedAddons.length}
                      />
                      <DetailRow
                        label="Dostupné funkcie"
                        value={availableFeatures.length}
                      />
                      <DetailRow
                        label="Aktualizované"
                        value={formatDate(
                          entitlements?.updatedAt || profile.updatedAt,
                        )}
                      />
                    </div>
                  </article>
                </div>

                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-5">
                  <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="mb-5 flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-100">
                        <PlusCircle size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black text-white [overflow-wrap:anywhere]">
                          Aktivované doplnky
                        </h3>
                        <p className="text-sm font-bold text-slate-400">
                          Doplnkové služby a rozšírenia priradené k účtu.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {activatedAddons.length ? (
                        activatedAddons.map((addon) => (
                          <Pill key={addon}>{addon}</Pill>
                        ))
                      ) : (
                        <div className="w-full rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-slate-300">
                          K balíku momentálne nie sú aktivované žiadne doplnky.
                        </div>
                      )}
                    </div>
                  </article>

                  <article className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5">
                    <div className="mb-5 flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                        <BadgeCheck size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-black text-white [overflow-wrap:anywhere]">
                          Dostupné funkcie
                        </h3>
                        <p className="text-sm font-bold text-slate-400">
                          Funkcie sprístupnené základným balíkom a doplnkami.
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-2">
                      {availableFeatures.length ? (
                        availableFeatures.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-2 rounded-2xl border border-violet-300/15 bg-violet-500/10 px-3 py-3 text-sm font-black text-violet-50"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{feature}</span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-slate-300 sm:col-span-2">
                          Zoznam dostupných funkcií zatiaľ nie je dostupný.
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              </div>
            </section>

            {profile.pageLimitReached && !hasUnlimitedAccess ? (
              <section className="rounded-[1.6rem] border border-red-400/30 bg-red-500/10 p-5 shadow-xl shadow-black/25">
                <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-100">
                      <LockKeyhole size={23} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Stránkový limit bol vyčerpaný
                      </h2>

                      <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-red-100/85">
                        Ďalšie generovanie obsahu je zablokované. Po dokúpení
                        ďalších strán sa prístup automaticky obnoví.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goToBuyPages}
                    className="inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-500"
                  >
                    <PlusCircle size={18} />
                    Dokúpiť ďalšie strany
                  </button>
                </div>
              </section>
            ) : null}

            {pageUsagePercent !== null ? (
              <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      Čerpanie strán
                    </h2>

                    <p className="mt-1 text-sm font-bold leading-6 text-slate-400">
                      Každá úspešne vygenerovaná normostrana sa automaticky
                      odpočíta z limitu používateľského účtu.
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-2xl font-black text-white">
                      {profile.pagesRemaining ?? 0} zostáva
                    </div>

                    <div className="mt-1 text-sm font-bold text-slate-400">
                      {profile.pagesUsed ?? 0} použitých z{" "}
                      {profile.pageLimit ?? 0}
                    </div>
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={[
                      "h-full rounded-full transition-all duration-500",
                      pageUsagePercent >= 100
                        ? "bg-red-500"
                        : pageUsagePercent >= 80
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-violet-500 to-blue-500",
                    ].join(" ")}
                    style={{ width: `${pageUsagePercent}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-bold leading-5 text-slate-500">
                    Základný limit: {profile.basePageLimit ?? 0} · Dokúpené
                    strany: {profile.extraPageLimit ?? 0} · Čerpanie:{" "}
                    {pageUsagePercent} %
                  </div>

                  <button
                    type="button"
                    onClick={goToBuyPages}
                    className="inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100 transition hover:-translate-y-0.5 hover:bg-violet-500/20"
                  >
                    <PlusCircle size={17} />
                    Dokúpiť strany
                  </button>
                </div>
              </section>
            ) : null}

            {usagePercent !== null ? (
              <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white">
                      Využitie balíčka
                    </h2>

                    <p className="mt-1 text-sm font-bold text-slate-400">
                      Prehľad čerpania kreditov v klientskom účte.
                    </p>
                  </div>

                  <div className="text-2xl font-black text-white">
                    {usagePercent} %
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </section>
            ) : null}

            <section className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-6">
              <div className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-5 flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
                    <BriefcaseBusiness size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-white">
                      Údaje klienta
                    </h2>

                    <p className="text-sm font-bold text-slate-400">
                      Základné údaje účtu, balíčka a nastavení klienta.
                    </p>
                  </div>
                </div>

                <DetailRow label="Meno" value={profile.name} />
                <DetailRow label="Email" value={profile.email} />
                <DetailRow label="Rola" value={profile.role} />
                <DetailRow
                  label="Administrátor"
                  value={isAdmin ? "Áno" : "Nie"}
                />
                <DetailRow
                  label="Plný prístup"
                  value={hasUnlimitedAccess ? "Áno – bez limitov" : "Nie"}
                />
                <DetailRow
                  label="Záznam oprávnení"
                  value={
                    entitlements
                      ? entitlements.hasDatabaseRecord
                        ? "Existuje v databáze"
                        : "Použitý predvolený stav"
                      : "Nezistené"
                  }
                />
                <DetailRow label="Jazyk" value={profile.language} />
                <DetailRow label="Stav účtu" value={profile.accountStatus} />
                <DetailRow
                  label="Balíček"
                  value={profile.packageLabel || profile.packageName}
                />
                <DetailRow
                  label="Vybraný plán"
                  value={
                    hasUnlimitedAccess
                      ? "Administrátorský prístup"
                      : profile.selectedPlan
                  }
                />
                <DetailRow
                  label="Predplatné"
                  value={
                    hasUnlimitedAccess
                      ? "Nevzťahuje sa – interný účet"
                      : entitlements?.billingStatus ||
                        profile.subscriptionStatus
                  }
                />
                <DetailRow
                  label="Limit strán"
                  value={hasUnlimitedAccess ? "Neobmedzené" : profile.pageLimit}
                />
                <DetailRow
                  label="Použité strany"
                  value={
                    hasUnlimitedAccess ? "Neodpočítavajú sa" : profile.pagesUsed
                  }
                />
                <DetailRow
                  label="Zostávajúce strany"
                  value={
                    hasUnlimitedAccess ? "Neobmedzené" : profile.pagesRemaining
                  }
                />
                <DetailRow
                  label="Dokúpené strany"
                  value={
                    hasUnlimitedAccess
                      ? "Nevzťahuje sa"
                      : profile.extraPageLimit
                  }
                />
                <DetailRow
                  label="Posledné načítanie"
                  value={formatDate(lastLoadedAt)}
                />

                {hasUnlimitedAccess ? (
                  <div className="mt-5 rounded-[1.25rem] border border-violet-300/25 bg-violet-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" />

                      <div>
                        <div className="text-sm font-black text-white">
                          Správa administrátorského prístupu
                        </div>

                        <p className="mt-1 text-sm font-bold leading-6 text-violet-100/85">
                          Administrátorský prístup nie je predplatné a nemožno
                          ho zrušiť cez klientsky profil. Oprávnenie sa spravuje
                          serverovo v databáze.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-red-400/25 bg-red-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-white">
                          Správa predplatného
                        </div>

                        <p className="mt-1 text-sm font-bold leading-6 text-red-100/85">
                          Predplatné môžete zrušiť. Automatické obnovenie sa
                          vypne a prístup ostane do konca zaplateného obdobia.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCancelMessage("");
                          setShowCancelConfirm(true);
                        }}
                        disabled={!subscriptionCanBeCancelled}
                        className="inline-flex min-h-[44px] min-w-0 max-w-full items-center justify-center whitespace-normal text-center [overflow-wrap:anywhere] gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle size={17} />
                        Zrušiť predplatné
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-6">
                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-100">
                      <BadgeCheck size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Aktivované služby
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Moduly a služby dostupné pre klienta.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.activeServices.length ? (
                      profile.activeServices.map((service) => (
                        <Pill key={service}>{service}</Pill>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-300">
                        Zoznam aktivovaných služieb zatiaľ nie je dostupný.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                      <Sparkles size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Aktivované funkcie
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Funkcie dostupné pre tento klientsky účet.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.activatedFeatures.length ? (
                      profile.activatedFeatures.map((feature) => (
                        <Pill key={feature}>{feature}</Pill>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-300">
                        Zoznam aktivovaných funkcií zatiaľ nie je dostupný.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-100">
                      <CalendarClock size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Platnosť a prístupy
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        {hasUnlimitedAccess
                          ? "Administrátorský prístup a dátumy účtu."
                          : "Dátumy predplatného a posledného prístupu."}
                      </p>
                    </div>
                  </div>

                  <DetailRow
                    label="Predplatné od"
                    value={
                      hasUnlimitedAccess
                        ? "Nevzťahuje sa"
                        : formatDate(profile.subscriptionStartedAt)
                    }
                  />
                  <DetailRow
                    label="Predplatné do"
                    value={
                      hasUnlimitedAccess
                        ? "Bez časového obmedzenia"
                        : formatDate(profile.subscriptionEndsAt)
                    }
                  />
                  <DetailRow
                    label="Vytvorené"
                    value={formatDate(profile.createdAt)}
                  />
                  <DetailRow
                    label="Upravené"
                    value={formatDate(profile.updatedAt)}
                  />
                  <DetailRow
                    label="Posledné prihlásenie"
                    value={formatDate(profile.lastLoginAt)}
                  />
                </section>
              </div>
            </section>

            <section className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-5">
              <StatCard
                icon={Mail}
                label="Kontakt"
                value={profile.email}
                helper="Email klienta"
              />

              <StatCard
                icon={ShieldCheck}
                label="Prístup"
                value={
                  hasUnlimitedAccess
                    ? "Plný administrátorský prístup"
                    : profile.role
                }
                helper={
                  hasUnlimitedAccess
                    ? "Všetky moduly a limity sú odomknuté"
                    : "Rola klienta v systéme"
                }
              />

              <StatCard
                icon={Clock3}
                label="Aktualizované"
                value={formatDate(profile.updatedAt)}
                helper={`Načítané: ${formatDate(lastLoadedAt)}`}
              />
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
