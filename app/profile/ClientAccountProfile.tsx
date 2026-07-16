'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
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
} from 'lucide-react';

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

type LoadState = 'idle' | 'loading' | 'success' | 'error';
type CancelState = 'idle' | 'loading' | 'success' | 'error';

const PROFILE_ENDPOINTS = ['/api/profile/me', '/api/profile', '/api/profile/get'];
const PAGE_USAGE_ENDPOINT = '/api/usage/pages';
const ENTITLEMENTS_ENDPOINT = '/api/entitlements/me';

const FEATURE_LABELS: Record<string, string> = {
  'ai-supervisor': 'AI školiteľ',
  'chapter-generation': 'Tvorba kapitol',
  'outline-generation': 'Návrh štruktúry a osnovy',
  'quality-audit': 'Kontrola kvality',
  humanizer: 'Humanizácia textu',
  citations: 'Citácie a zdroje',
  planning: 'Plánovanie práce',
  emails: 'Príprava e-mailov',
  translation: 'Preklad',
  originality: 'Kontrola originality',
  'data-prepare': 'Príprava a čistenie dát',
  'data-descriptive': 'Deskriptívna štatistika',
  'data-questionnaires': 'Spracovanie dotazníkov',
  'data-reliability': 'Reliabilita škál',
  'data-normality': 'Testovanie normality',
  'data-correlations': 'Korelačné analýzy',
  'data-parametric-tests': 'Parametrické testy',
  'data-nonparametric-tests': 'Neparametrické testy',
  'data-charts': 'Grafy a tabuľky',
  defense: 'Príprava na obhajobu',
  'defense-presentation': 'Prezentácia na obhajobu',
  'committee-questions': 'Otázky komisie',
};

const CANCEL_SUBSCRIPTION_ENDPOINTS = [
  '/api/subscription/cancel',
  '/api/billing/cancel-subscription',
  '/api/stripe/cancel-subscription',
];

function cleanText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  return text || fallback;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).trim();

  if (!normalized) return null;

  const parsed = Number(normalized.replace(',', '.'));

  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (['true', '1', 'yes', 'áno', 'ano'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'nie', ''].includes(normalized)) {
    return false;
  }

  return fallback;
}

function asArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  if (typeof window === 'undefined') return {};

  return {
    name:
      localStorage.getItem('zedpera_user_name') ||
      localStorage.getItem('user_name') ||
      '',
    email:
      localStorage.getItem('zedpera_user_email') ||
      localStorage.getItem('user_email') ||
      '',
    role:
      localStorage.getItem('zedpera_user_role') ||
      localStorage.getItem('user_role') ||
      '',
    plan:
      localStorage.getItem('zedpera_user_plan') ||
      localStorage.getItem('zedpera_selected_plan') ||
      '',
    selectedPlan:
      localStorage.getItem('zedpera_selected_plan') ||
      localStorage.getItem('zedpera_user_plan') ||
      '',
    language:
      localStorage.getItem('zedpera_language') ||
      localStorage.getItem('language') ||
      'sk',
  };
}

function normalizeClientProfile(profileData: unknown, source: string): ClientProfile {
  const data = pickRecord(profileData);
  const local = readFromLocalStorage();

  const plan =
    cleanText(data.plan) ||
    cleanText(data.user_plan) ||
    cleanText(data.package) ||
    cleanText(data.packageName) ||
    cleanText(data.selectedPlan) ||
    cleanText(local.plan) ||
    'free';

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
      'nezistené',
    userId:
      cleanText(data.userId) ||
      cleanText(data.user_id) ||
      cleanText(data.owner_id) ||
      'nezistené',
    name:
      cleanText(data.name) ||
      cleanText(data.fullName) ||
      cleanText(data.full_name) ||
      cleanText(data.displayName) ||
      cleanText(local.name) ||
      'Klient Zedpera',
    email:
      cleanText(data.email) ||
      cleanText(data.userEmail) ||
      cleanText(data.user_email) ||
      cleanText(local.email) ||
      'nezistené',
    role:
      cleanText(data.role) ||
      cleanText(data.userRole) ||
      cleanText(data.user_role) ||
      cleanText(local.role) ||
      'klient',
    plan,
    selectedPlan,
    accountStatus:
      cleanText(data.accountStatus) ||
      cleanText(data.status) ||
      cleanText(data.account_status) ||
      'aktívny',
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
      asNumber(data.basePageLimit) ??
      asNumber(data.base_page_limit) ??
      null,
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
    pageLimitReached:
      asBoolean(
        data.pageLimitReached ??
        data.page_limit_reached ??
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
      'nezistené',
    subscriptionStartedAt:
      cleanText(data.subscriptionStartedAt) ||
      cleanText(data.subscription_started_at) ||
      cleanText(data.planStartedAt) ||
      '',
    subscriptionEndsAt:
      cleanText(data.subscriptionEndsAt) ||
      cleanText(data.subscription_ends_at) ||
      cleanText(data.planEndsAt) ||
      cleanText(data.validUntil) ||
      '',
    createdAt: cleanText(data.createdAt) || cleanText(data.created_at) || '',
    updatedAt: cleanText(data.updatedAt) || cleanText(data.updated_at) || '',
    lastLoginAt:
      cleanText(data.lastLoginAt) || cleanText(data.last_login_at) || '',
    language:
      cleanText(data.language) ||
      cleanText(data.locale) ||
      cleanText(local.language) ||
      'sk',
    source,
    raw: data,
  };
}

function formatDate(value: string) {
  if (!value) return 'Nezadané';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Nezadané';

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Nezadané';
  }

  if (typeof value === 'object') {
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

  if (value.includes('seminar')) return 'Seminárna práca';
  if (value.includes('bachelor')) return 'Bakalárska práca';
  if (value.includes('master') || value.includes('diplom')) {
    return 'Diplomová / magisterská práca';
  }
  if (value.includes('elite')) return 'Elite Academic';
  if (value.includes('student')) return 'Študent Plus';
  if (value.includes('thesis')) return 'Pro Thesis';
  if (value.includes('admin')) return 'Administrátorský prístup';
  if (value.includes('premium')) return 'Premium balíček';
  if (value.includes('pro')) return 'Pro balíček';
  if (value.includes('basic')) return 'Start Basic';
  if (value.includes('free')) return 'Free balíček';

  return plan || 'Nezadaný balíček';
}

function normalizeSubscriptionStatus(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes('cancel') ||
    value.includes('zruš') ||
    value.includes('inactive') ||
    value.includes('neaktív')
  ) {
    return 'zrušené';
  }

  if (
    value.includes('active') ||
    value.includes('aktív') ||
    value.includes('trial') ||
    value.includes('skúšob')
  ) {
    return 'aktívne';
  }

  return value || 'nezistené';
}

function humanizeIdentifier(value: string) {
  const cleaned = cleanText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function labelFeature(feature: string) {
  return FEATURE_LABELS[feature] || humanizeIdentifier(feature);
}

function formatCurrencyFromCents(value: number | null) {
  if (value === null) return 'Nezadané';
  if (value <= 0) return 'Bezplatný';

  return `${new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100)} / mesiac`;
}

function formatLimit(value: number | null, unit = '') {
  if (value === null) return 'Neobmedzené';

  return `${value}${unit ? ` ${unit}` : ''}`;
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (!isRecord(data)) return fallback;

  const directMessage =
    cleanText(data.message) ||
    cleanText(data.detail);

  if (directMessage) return directMessage;

  if (typeof data.error === 'string') {
    return cleanText(data.error, fallback);
  }

  if (isRecord(data.error)) {
    return (
      cleanText(data.error.message) ||
      cleanText(data.error.detail) ||
      fallback
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

  const planId =
    cleanText(data.planId) ||
    cleanText(data.plan_id) ||
    'free';

  const featureKeys = Array.from(
    new Set([
      ...asArray(data.features),
      ...asArray(data.featureList),
      ...asArray(data.feature_list),
    ]),
  );

  const addonIds = Array.from(
    new Set([
      ...asArray(data.addonIds),
      ...asArray(data.addon_ids),
    ]),
  );

  const addonNames = Array.from(
    new Set([
      ...asArray(data.addonNames),
      ...asArray(data.addon_names),
    ]),
  );

  const promptLimit =
    asNumber(data.promptLimit) ??
    asNumber(data.prompt_limit);

  const promptsUsed =
    asNumber(data.promptsUsed) ??
    asNumber(data.prompts_used) ??
    0;

  const promptsRemaining =
    asNumber(data.promptsRemaining) ??
    asNumber(data.prompts_remaining) ??
    (
      promptLimit !== null
        ? Math.max(promptLimit - promptsUsed, 0)
        : null
    );

  const normalizedAddonNames = addonNames.length
    ? addonNames
    : addonIds.map(humanizeIdentifier).filter(Boolean);

  return {
    userId:
      cleanText(data.userId) ||
      cleanText(data.user_id),
    email: cleanText(data.email),
    planId,
    planName:
      cleanText(data.planName) ||
      cleanText(data.plan_name) ||
      labelPlan(planId),
    planPriceCents:
      asNumber(data.planPriceCents) ??
      asNumber(data.plan_price_cents),
    planPageLimit:
      asNumber(data.pageLimit) ??
      asNumber(data.page_limit),
    addonIds,
    addonNames: normalizedAddonNames,
    featureKeys,
    featureLabels: featureKeys.map(labelFeature),
    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached: asBoolean(
      data.promptLimitReached ??
        data.prompt_limit_reached ??
        (
          promptLimit !== null &&
          promptsUsed >= promptLimit
        ),
    ),
    attachmentLimit:
      asNumber(data.attachmentLimit) ??
      asNumber(data.attachment_limit),
    activatedAt:
      cleanText(data.activatedAt) ||
      cleanText(data.activated_at),
    validUntil:
      cleanText(data.validUntil) ||
      cleanText(data.valid_until),
    updatedAt:
      cleanText(data.updatedAt) ||
      cleanText(data.updated_at),
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

  return priceInEuros !== null
    ? Math.round(priceInEuros * 100)
    : null;
}

function getPackageStatus(
  profile: ClientProfile,
  entitlements: EntitlementsSnapshot | null,
) {
  const subscriptionStatus = normalizeSubscriptionStatus(
    profile.subscriptionStatus,
  );

  const validUntil =
    entitlements?.validUntil ||
    profile.subscriptionEndsAt;

  if (subscriptionStatus === 'zrušené') {
    return validUntil
      ? 'Zrušené – prístup do konca platnosti'
      : 'Zrušené';
  }

  if (validUntil) {
    const expirationDate = new Date(validUntil);

    if (
      !Number.isNaN(expirationDate.getTime()) &&
      expirationDate.getTime() < Date.now()
    ) {
      return 'Platnosť skončila';
    }
  }

  const plan = `${entitlements?.planId || ''} ${profile.plan} ${profile.selectedPlan}`.toLowerCase();

  if (plan.includes('free')) {
    return 'Aktívny bezplatný balík';
  }

  if (
    profile.accountStatus.toLowerCase().includes('blok') ||
    profile.accountStatus.toLowerCase().includes('suspend')
  ) {
    return 'Pozastavený';
  }

  return 'Aktívny';
}

function getPackageStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('skončila') ||
    normalized.includes('zrušené')
  ) {
    return 'border-red-300/25 bg-red-500/10 text-red-100';
  }

  if (
    normalized.includes('pozastavený') ||
    normalized.includes('konca platnosti')
  ) {
    return 'border-amber-300/25 bg-amber-500/10 text-amber-100';
  }

  if (normalized.includes('aktívny')) {
    return 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100';
  }

  return 'border-slate-300/20 bg-slate-500/10 text-slate-200';
}

function getPromptUsagePercent(entitlements: EntitlementsSnapshot | null) {
  if (
    !entitlements ||
    entitlements.promptLimit === null ||
    entitlements.promptLimit <= 0
  ) {
    return null;
  }

  return Math.min(
    Math.round(
      (entitlements.promptsUsed / entitlements.promptLimit) * 100,
    ),
    100,
  );
}

function canCancelSubscription(profile: ClientProfile | null) {
  if (!profile) return false;

  const status = normalizeSubscriptionStatus(profile.subscriptionStatus);
  const plan = `${profile.plan} ${profile.selectedPlan} ${profile.packageName}`.toLowerCase();

  if (status === 'zrušené') return false;
  if (plan.includes('free')) return false;

  return true;
}

function getUsagePercent(profile: ClientProfile) {
  if (
    profile.credits === null ||
    profile.usedCredits === null ||
    profile.credits <= 0
  ) {
    return null;
  }

  return Math.min(Math.round((profile.usedCredits / profile.credits) * 100), 100);
}

function getPageUsagePercent(profile: ClientProfile) {
  if (
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

  if (isRecord(data.usage)) return data.usage;
  if (isRecord(data.pageUsage)) return data.pageUsage;
  if (isRecord(data.quota)) return data.quota;
  if (isRecord(data.data)) return data.data;

  return data;
}

function mergePageUsage(
  profile: ClientProfile,
  usageData: unknown,
): ClientProfile {
  const usage = pickPageUsageRecord(usageData);

  const basePageLimit =
    asNumber(usage.basePageLimit) ??
    asNumber(usage.base_page_limit) ??
    profile.basePageLimit;

  const extraPageLimit =
    asNumber(usage.extraPageLimit) ??
    asNumber(usage.extra_page_limit) ??
    asNumber(usage.extraPages) ??
    asNumber(usage.extra_pages) ??
    profile.extraPageLimit;

  const pageLimit =
    asNumber(usage.pageLimit) ??
    asNumber(usage.page_limit) ??
    asNumber(usage.totalPages) ??
    asNumber(usage.total_pages) ??
    (
      basePageLimit !== null || extraPageLimit !== null
        ? (basePageLimit ?? 0) + (extraPageLimit ?? 0)
        : profile.pageLimit
    );

  const pagesUsed =
    asNumber(usage.pagesUsed) ??
    asNumber(usage.pages_used) ??
    asNumber(usage.usedPages) ??
    asNumber(usage.used_pages) ??
    profile.pagesUsed;

  const pagesRemaining =
    asNumber(usage.pagesRemaining) ??
    asNumber(usage.pages_remaining) ??
    asNumber(usage.remainingPages) ??
    asNumber(usage.remaining_pages) ??
    (
      pageLimit !== null && pagesUsed !== null
        ? Math.max(pageLimit - pagesUsed, 0)
        : profile.pagesRemaining
    );

  const explicitLimitReached = asBoolean(
    usage.pageLimitReached ??
      usage.page_limit_reached ??
      usage.limitReached ??
      usage.limit_reached ??
      false,
  );

  return {
    ...profile,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached:
      explicitLimitReached ||
      (
        pageLimit !== null &&
        pageLimit > 0 &&
        pagesRemaining !== null &&
        pagesRemaining <= 0
      ),
  };
}

async function loadPageUsage(
  profile: ClientProfile,
): Promise<ClientProfile> {
  try {
    const response = await fetch(PAGE_USAGE_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
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
      if (process.env.NODE_ENV === 'development') {
        console.info('PAGE_USAGE_UNAVAILABLE', {
          status: response.status,
          statusText: response.statusText,
          endpoint: PAGE_USAGE_ENDPOINT,
          response:
            isRecord(data)
              ? data
              : responseText.slice(0, 500),
        });
      }

      return profile;
    }

    if (!data || !isRecord(data)) {
      if (process.env.NODE_ENV === 'development') {
        console.info('PAGE_USAGE_EMPTY_RESPONSE', {
          status: response.status,
          endpoint: PAGE_USAGE_ENDPOINT,
        });
      }

      return profile;
    }

    return mergePageUsage(profile, data);
  } catch (error) {
    // Profil zostane funkčný aj pri dočasnom výpadku API.
    if (process.env.NODE_ENV === 'development') {
      console.info('PAGE_USAGE_REQUEST_SKIPPED', {
        endpoint: PAGE_USAGE_ENDPOINT,
        message:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }

    return profile;
  }
}

async function loadEntitlementsSnapshot(): Promise<EntitlementsLoadResult> {
  try {
    const response = await fetch(ENTITLEMENTS_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
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
          'Údaje o balíku a oprávneniach sa nepodarilo načítať.',
        ),
      };
    }

    if (!data || !isRecord(data)) {
      return {
        entitlements: null,
        error: 'API balíka vrátilo prázdnu alebo neplatnú odpoveď.',
      };
    }

    return {
      entitlements: normalizeEntitlements(
        data,
        ENTITLEMENTS_ENDPOINT,
      ),
      error: '',
    };
  } catch (error) {
    return {
      entitlements: null,
      error:
        error instanceof Error
          ? error.message
          : 'Údaje o balíku a oprávneniach sa nepodarilo načítať.',
    };
  }
}

function mergeEntitlementsIntoProfile(
  profile: ClientProfile,
  entitlements: EntitlementsSnapshot,
): ClientProfile {
  const planPageLimit = entitlements.planPageLimit;
  const basePageLimit =
    profile.basePageLimit ??
    planPageLimit;

  const extraPageLimit =
    profile.extraPageLimit ??
    0;

  const pageLimit =
    profile.pageLimit ??
    (
      basePageLimit !== null
        ? basePageLimit + extraPageLimit
        : null
    );

  return {
    ...profile,
    userId:
      profile.userId !== 'nezistené'
        ? profile.userId
        : entitlements.userId || profile.userId,
    email:
      profile.email !== 'nezistené'
        ? profile.email
        : entitlements.email || profile.email,
    plan: entitlements.planId || profile.plan,
    selectedPlan:
      entitlements.planId ||
      profile.selectedPlan,
    packageName:
      entitlements.planName ||
      profile.packageName,
    packageLabel:
      entitlements.planName ||
      profile.packageLabel,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    activeServices: Array.from(
      new Set([
        ...profile.activeServices,
        ...entitlements.addonNames,
      ]),
    ),
    activatedFeatures: Array.from(
      new Set([
        ...profile.activatedFeatures,
        ...entitlements.featureLabels,
      ]),
    ),
    subscriptionStartedAt:
      entitlements.activatedAt ||
      profile.subscriptionStartedAt,
    subscriptionEndsAt:
      entitlements.validUntil ||
      profile.subscriptionEndsAt,
    updatedAt:
      entitlements.updatedAt ||
      profile.updatedAt,
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
    <div className="group rounded-[1.6rem] border border-white/10 bg-white/[0.065] p-5 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-white/[0.09]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-100 transition group-hover:bg-violet-600/30">
          <Icon size={22} />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </div>

          <div className="mt-2 break-words text-xl font-black text-white">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 text-sm font-bold leading-5 text-slate-400">
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
    <div className="grid gap-2 border-b border-white/10 py-3 last:border-b-0 sm:grid-cols-[230px_minmax(0,1fr)]">
      <div className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>

      <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-100">
        {formatValue(value)}
      </div>
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-500/25">
      <CheckCircle2 size={14} />
      {children}
    </span>
  );
}

export default function ClientAccountProfile() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsSnapshot | null>(null);
  const [entitlementsError, setEntitlementsError] = useState('');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState('');

  const [cancelState, setCancelState] = useState<CancelState>('idle');
  const [cancelMessage, setCancelMessage] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadProfile = useCallback(async () => {
    setState('loading');
    setError('');
    setEntitlementsError('');

    const entitlementResult =
      await loadEntitlementsSnapshot();

    setEntitlements(
      entitlementResult.entitlements,
    );
    setEntitlementsError(
      entitlementResult.error,
    );

    let lastError = '';

    for (const endpoint of PROFILE_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          lastError =
            cleanText((data as JsonRecord | null)?.error) ||
            cleanText((data as JsonRecord | null)?.message) ||
            'Klientsky profil sa nepodarilo načítať.';
          continue;
        }

        const normalizedProfile = normalizeClientProfile(data, endpoint);
        const profileWithEntitlements =
          entitlementResult.entitlements
            ? mergeEntitlementsIntoProfile(
                normalizedProfile,
                entitlementResult.entitlements,
              )
            : normalizedProfile;
        const normalized = await loadPageUsage(profileWithEntitlements);

        setProfile(normalized);
        setLastLoadedAt(new Date().toISOString());
        setState('success');
        return;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : 'Klientsky profil sa nepodarilo načítať.';
      }
    }

    const localFallback = normalizeClientProfile({}, 'lokálne údaje');
    const localWithEntitlements =
      entitlementResult.entitlements
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
        'Klientsky profil sa nepodarilo načítať. Zobrazujem aspoň lokálne uložené údaje.',
    );
    setState('error');
  }, []);

  const cancelSubscription = useCallback(async () => {
    if (!profile || cancelState === 'loading') return;

    setCancelState('loading');
    setCancelMessage('');

    let lastError = '';

    for (const endpoint of CANCEL_SUBSCRIPTION_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
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
            'Predplatné sa nepodarilo zrušiť.';
          continue;
        }

        setProfile((current) =>
          current
            ? {
                ...current,
                subscriptionStatus: 'zrušené',
                accountStatus: 'aktívny do konca zaplateného obdobia',
                updatedAt: new Date().toISOString(),
              }
            : current,
        );

        setCancelState('success');
        setCancelMessage(
          'Predplatné bolo zrušené. Prístup zostáva zachovaný do konca zaplateného obdobia.',
        );
        setShowCancelConfirm(false);

        await loadProfile();

        return;
      } catch (err) {
        lastError =
          err instanceof Error
            ? err.message
            : 'Predplatné sa nepodarilo zrušiť.';
      }
    }

    setCancelState('error');
    setCancelMessage(
      lastError ||
        'Predplatné sa nepodarilo zrušiť. Skúste to znova alebo kontaktujte podporu.',
    );
  }, [cancelState, loadProfile, profile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    return profile
      ? getPackageStatus(profile, entitlements)
      : 'Nezistené';
  }, [entitlements, profile]);

  const packageStatusClasses = useMemo(() => {
    return getPackageStatusClasses(packageStatus);
  }, [packageStatus]);

  const planPriceCents = useMemo(() => {
    if (entitlements?.planPriceCents !== null && entitlements?.planPriceCents !== undefined) {
      return entitlements.planPriceCents;
    }

    return profile
      ? getProfilePlanPriceCents(profile)
      : null;
  }, [entitlements, profile]);

  const basePages =
    profile?.basePageLimit ??
    entitlements?.planPageLimit ??
    null;

  const extraPages =
    profile?.extraPageLimit ??
    0;

  const activatedAddons = useMemo(() => {
    const values = entitlements?.addonNames.length
      ? entitlements.addonNames
      : profile?.activeServices || [];

    return Array.from(new Set(values));
  }, [entitlements, profile]);

  const availableFeatures = useMemo(() => {
    const values = entitlements?.featureLabels.length
      ? entitlements.featureLabels
      : profile?.activatedFeatures || [];

    return Array.from(new Set(values));
  }, [entitlements, profile]);

  const subscriptionCanBeCancelled = canCancelSubscription(profile);

  function goToMenu() {
    router.push('/dashboard');
  }

  function goToBuyPages() {
    router.push('/pricing#doplnkove-sluzby');
  }

  return (
    <main className="client-account-profile min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-3xl" />
        <div className="absolute right-[-140px] top-40 h-[440px] w-[440px] rounded-full bg-blue-700/20 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[460px] w-[460px] rounded-full bg-fuchsia-700/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-xl shadow-violet-950/40">
                <UserCircle size={30} />
              </div>

              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-100">
                  <ShieldCheck size={13} />
                  Účet klienta
                </div>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Klientsky účet a služby
                </h1>

                <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-400">
                  Klientsky profil zobrazuje účet, balíček, stav služieb,
                  kredity, projekty, odpočet strán, predplatné a dátumy prístupov.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <button
                type="button"
                onClick={goToMenu}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-white/[0.14]"
              >
                <ArrowLeft size={18} />
                Návrat do menu
              </button>

              <button
                type="button"
                onClick={loadProfile}
                disabled={state === 'loading'}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-5 w-5" />
                )}
                Obnoviť údaje
              </button>

              <button
                type="button"
                onClick={() => {
                  setCancelMessage('');
                  setShowCancelConfirm(true);
                }}
                disabled={!subscriptionCanBeCancelled}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-5 text-sm font-black text-red-100 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-red-300/70 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={18} />
                Zrušiť predplatné
              </button>
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
                Sekciu balíka sa nepodarilo načítať úplne: {entitlementsError}
                {' '}Zvyšné údaje osobného profilu zostávajú dostupné.
              </div>
            </div>
          </section>
        ) : null}

        {cancelMessage ? (
          <section
            className={`mb-6 rounded-[1.5rem] border p-5 text-sm font-bold leading-6 shadow-xl shadow-black/20 ${
              cancelState === 'success'
                ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                : 'border-red-400/25 bg-red-500/10 text-red-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {cancelState === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              )}

              <div>{cancelMessage}</div>
            </div>
          </section>
        ) : null}

        {showCancelConfirm ? (
          <section className="mb-6 rounded-[1.6rem] border border-red-400/30 bg-red-500/10 p-5 shadow-xl shadow-black/25">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelState === 'loading'}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-5 text-sm font-black text-white transition hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ponechať predplatné
                </button>

                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={cancelState === 'loading'}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-xl shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelState === 'loading' ? (
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

        {state === 'loading' && !profile ? (
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
          <div className="space-y-6">
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                icon={UserCircle}
                label="Klient"
                value={profile.name}
                helper={profile.email}
              />

              <StatCard
                icon={Crown}
                label="Balíček"
                value={labelPlan(profile.selectedPlan || profile.plan)}
                helper={`Stav účtu: ${profile.accountStatus}`}
              />

              <StatCard
                icon={WalletCards}
                label="Kredity"
                value={
                  profile.remainingCredits !== null
                    ? `${profile.remainingCredits} zostáva`
                    : 'Nezadané'
                }
                helper={
                  profile.credits !== null
                    ? `Celkom: ${profile.credits}${
                        profile.usedCredits !== null
                          ? ` · použité: ${profile.usedCredits}`
                          : ''
                      }`
                    : 'Limit nie je uvedený'
                }
              />

              <StatCard
                icon={Gauge}
                label="Zostávajúce strany"
                value={
                  profile.pagesRemaining !== null
                    ? `${profile.pagesRemaining}`
                    : 'Nezadané'
                }
                helper={
                  profile.pageLimit !== null
                    ? `Použité: ${profile.pagesUsed ?? 0} z ${profile.pageLimit}`
                    : 'Stránkový limit nie je uvedený'
                }
              />

              <StatCard
                icon={FileText}
                label="Projekty"
                value={
                  profile.projectsCount !== null
                    ? `${profile.projectsCount}`
                    : 'Nezadané'
                }
                helper={
                  profile.maxProjects !== null
                    ? `Limit: ${profile.maxProjects}`
                    : 'Limit projektov nie je uvedený'
                }
              />
            </section>

            <section className="overflow-hidden rounded-[1.8rem] border border-violet-300/20 bg-[#0b1020]/95 shadow-2xl shadow-black/30">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-600/25 via-blue-600/15 to-fuchsia-600/15 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
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
                        Kompletný prehľad aktivovaného balíka, dátumov platnosti,
                        strán, promptov, príloh, doplnkov a dostupných funkcií.
                      </p>
                    </div>
                  </div>

                  <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${packageStatusClasses}`}>
                    <BadgeCheck size={17} />
                    {packageStatus}
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                    value={formatCurrencyFromCents(planPriceCents)}
                    helper="Cena základného balíka bez jednorazových doplnkov"
                  />

                  <StatCard
                    icon={ShieldCheck}
                    label="Stav balíka"
                    value={packageStatus}
                    helper={`Predplatné: ${profile.subscriptionStatus}`}
                  />

                  <StatCard
                    icon={CalendarClock}
                    label="Dátum aktivácie"
                    value={formatDate(
                      entitlements?.activatedAt ||
                        profile.subscriptionStartedAt,
                    )}
                    helper="Začiatok platnosti aktuálneho balíka"
                  />

                  <StatCard
                    icon={Clock3}
                    label="Platnosť balíka"
                    value={
                      entitlements?.validUntil || profile.subscriptionEndsAt
                        ? formatDate(
                            entitlements?.validUntil ||
                              profile.subscriptionEndsAt,
                          )
                        : 'Bez uvedeného konca'
                    }
                    helper="Dátum ukončenia alebo obnovy predplatného"
                  />
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
                          <Gauge size={22} />
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-white">
                            Strany
                          </h3>
                          <p className="text-sm font-bold text-slate-400">
                            Základné a dokúpené normostrany
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white">
                          {profile.pagesRemaining ?? '—'}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          zostáva
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Základné strany
                        </div>
                        <div className="mt-1 text-xl font-black text-white">
                          {basePages ?? '—'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Extra strany
                        </div>
                        <div className="mt-1 text-xl font-black text-white">
                          {extraPages}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Použité strany
                        </div>
                        <div className="mt-1 text-xl font-black text-white">
                          {profile.pagesUsed ?? '—'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Celkový limit
                        </div>
                        <div className="mt-1 text-xl font-black text-white">
                          {profile.pageLimit ?? '—'}
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
                              'h-full rounded-full transition-all duration-500',
                              pageUsagePercent >= 100
                                ? 'bg-red-500'
                                : pageUsagePercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-blue-500 to-violet-500',
                            ].join(' ')}
                            style={{ width: `${pageUsagePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </article>

                  <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                          <Sparkles size={22} />
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-white">
                            Prompty
                          </h3>
                          <p className="text-sm font-bold text-slate-400">
                            Použitie AI požiadaviek v balíku
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white">
                          {entitlements
                            ? formatLimit(entitlements.promptsRemaining)
                            : '—'}
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          zostáva
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <DetailRow
                        label="Limit promptov"
                        value={
                          entitlements
                            ? formatLimit(entitlements.promptLimit)
                            : 'Nezadané'
                        }
                      />
                      <DetailRow
                        label="Použité prompty"
                        value={entitlements?.promptsUsed ?? 'Nezadané'}
                      />
                      <DetailRow
                        label="Zostávajúce prompty"
                        value={
                          entitlements
                            ? formatLimit(entitlements.promptsRemaining)
                            : 'Nezadané'
                        }
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
                              'h-full rounded-full transition-all duration-500',
                              entitlements?.promptLimitReached
                                ? 'bg-red-500'
                                : promptUsagePercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                            ].join(' ')}
                            style={{ width: `${promptUsagePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-100">
                        {entitlements?.promptLimit === null
                          ? 'Balík má neobmedzený počet promptov.'
                          : 'Údaje o čerpaní promptov nie sú dostupné.'}
                      </div>
                    )}
                  </article>

                  <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-100">
                        <FileText size={22} />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white">
                          Prílohy
                        </h3>
                        <p className="text-sm font-bold text-slate-400">
                          Maximálny počet súborov v jednej požiadavke
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.4rem] border border-emerald-300/20 bg-emerald-500/10 p-5 text-center">
                      <div className="text-5xl font-black text-white">
                        {entitlements?.attachmentLimit ?? '—'}
                      </div>
                      <div className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-100">
                        príloh naraz
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
                          entitlements?.updatedAt ||
                            profile.updatedAt,
                        )}
                      />
                    </div>
                  </article>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-100">
                        <PlusCircle size={22} />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white">
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

                  <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
                        <BadgeCheck size={22} />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white">
                          Dostupné funkcie
                        </h3>
                        <p className="text-sm font-bold text-slate-400">
                          Funkcie sprístupnené základným balíkom a doplnkami.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableFeatures.length ? (
                        availableFeatures.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-start gap-2 rounded-2xl border border-violet-300/15 bg-violet-500/10 px-3 py-3 text-sm font-black text-violet-50"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                            <span>{feature}</span>
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

            {profile.pageLimitReached ? (
              <section className="rounded-[1.6rem] border border-red-400/30 bg-red-500/10 p-5 shadow-xl shadow-black/25">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-500"
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
                      {profile.pagesUsed ?? 0} použitých z {profile.pageLimit ?? 0}
                    </div>
                  </div>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={[
                      'h-full rounded-full transition-all duration-500',
                      pageUsagePercent >= 100
                        ? 'bg-red-500'
                        : pageUsagePercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-violet-500 to-blue-500',
                    ].join(' ')}
                    style={{ width: `${pageUsagePercent}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-bold leading-5 text-slate-500">
                    Základný limit: {profile.basePageLimit ?? 0} · Dokúpené
                    strany: {profile.extraPageLimit ?? 0} · Čerpanie:
                    {' '}{pageUsagePercent} %
                  </div>

                  <button
                    type="button"
                    onClick={goToBuyPages}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-black text-violet-100 transition hover:-translate-y-0.5 hover:bg-violet-500/20"
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

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-100">
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
                <DetailRow label="Jazyk" value={profile.language} />
                <DetailRow label="Stav účtu" value={profile.accountStatus} />
                <DetailRow
                  label="Balíček"
                  value={profile.packageLabel || profile.packageName}
                />
                <DetailRow label="Vybraný plán" value={profile.selectedPlan} />
                <DetailRow label="Predplatné" value={profile.subscriptionStatus} />
                <DetailRow label="Limit strán" value={profile.pageLimit} />
                <DetailRow label="Použité strany" value={profile.pagesUsed} />
                <DetailRow
                  label="Zostávajúce strany"
                  value={profile.pagesRemaining}
                />
                <DetailRow
                  label="Dokúpené strany"
                  value={profile.extraPageLimit}
                />
                <DetailRow
                  label="Posledné načítanie"
                  value={formatDate(lastLoadedAt)}
                />

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
                        setCancelMessage('');
                        setShowCancelConfirm(true);
                      }}
                      disabled={!subscriptionCanBeCancelled}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Zrušiť predplatné
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[1.6rem] border border-white/10 bg-[#0b1020]/95 p-5 shadow-xl shadow-black/25">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-100">
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
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-100">
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
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-100">
                      <CalendarClock size={22} />
                    </div>

                    <div>
                      <h2 className="text-xl font-black text-white">
                        Platnosť a prístupy
                      </h2>

                      <p className="text-sm font-bold text-slate-400">
                        Dátumy predplatného a posledného prístupu.
                      </p>
                    </div>
                  </div>

                  <DetailRow
                    label="Predplatné od"
                    value={formatDate(profile.subscriptionStartedAt)}
                  />
                  <DetailRow
                    label="Predplatné do"
                    value={formatDate(profile.subscriptionEndsAt)}
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

            <section className="grid gap-5 md:grid-cols-3">
              <StatCard
                icon={Mail}
                label="Kontakt"
                value={profile.email}
                helper="Email klienta"
              />

              <StatCard
                icon={ShieldCheck}
                label="Prístup"
                value={profile.role}
                helper="Rola klienta v systéme"
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