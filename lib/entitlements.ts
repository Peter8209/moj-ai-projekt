import {
  ADDONS,
  PLANS,
  getFeatureLabel as getCatalogFeatureLabel,
  getFeaturesForEntitlements,
  type AddonId,
  type FeatureKey,
  type PlanId,
} from '@/lib/billing/catalog';

import { createSupabaseServerClient } from '@/lib/supabase/server';

// ============================================================
// TYPES
// ============================================================

/**
 * Moduly používané v hlavnej chat API route.
 *
 * Hodnoty musia zodpovedať mapovaniu používanému v
 * app/api/chat/route.ts.
 */
export type AppModuleKey =
  | 'supervisor'
  | 'quality'
  | 'defense'
  | 'translation'
  | 'data'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'humanizer'
  | 'chat'
  | 'unknown';

/**
 * Podrobnejšie operácie AI školiteľa.
 */
export type SupervisorActionKey =
  | 'general'
  | 'chapter'
  | 'outline'
  | 'citations';

/**
 * Jednotlivé časti analýzy dát.
 */
export type DataAnalysisActionKey =
  | 'prepare'
  | 'descriptive'
  | 'questionnaires'
  | 'reliability'
  | 'normality'
  | 'correlations'
  | 'parametric-tests'
  | 'nonparametric-tests'
  | 'charts';

/**
 * Databázový záznam z public.zedpera_user_entitlements.
 *
 * Hodnoty sú unknown, pretože databáza je externý vstup a každá
 * hodnota sa pred použitím bezpečne normalizuje.
 */
type EntitlementDatabaseRow = {
  plan_id?: unknown;
  addon_ids?: unknown;

  base_page_limit?: unknown;
  extra_page_limit?: unknown;
  pages_used?: unknown;

  prompt_limit?: unknown;
  prompts_used?: unknown;
  attachment_limit?: unknown;

  is_admin?: unknown;
  billing_status?: unknown;

  activated_at?: unknown;
  valid_until?: unknown;
  updated_at?: unknown;
};

/**
 * Výsledok RPC funkcie public.zedpera_consume_prompt().
 *
 * Podporované sú oba názvy stĺpcov:
 * - prompt_limit / prompts_used / prompts_remaining,
 * - current_prompt_limit / current_prompts_used /
 *   current_prompts_remaining.
 */
type PromptConsumptionRow = {
  prompt_limit?: unknown;
  prompts_used?: unknown;
  prompts_remaining?: unknown;
  limit_reached?: unknown;

  current_prompt_limit?: unknown;
  current_prompts_used?: unknown;
  current_prompts_remaining?: unknown;
  prompt_limit_reached?: unknown;

  admin_access?: unknown;
  is_admin?: unknown;
};

/**
 * Kompletné serverové oprávnenia aktuálneho používateľa.
 */
export type CurrentEntitlements = {
  userId: string;
  email: string | null;

  /**
   * Administrátorský stav sa určuje iba na serveri:
   * - primárne z public.zedpera_user_entitlements.is_admin,
   * - voliteľne zo Supabase auth.users.app_metadata.
   *
   * Nikdy sa neurčuje podľa e-mailu vo frontende.
   */
  isAdmin: boolean;
  hasUnlimitedAccess: boolean;

  /**
   * Určuje, či bol entitlement skutočne načítaný z databázy.
   * false znamená, že bol použitý bezpečný FREE fallback.
   */
  hasDatabaseRecord: boolean;

  planId: PlanId;
  planName: string;
  planPriceCents: number;

  /**
   * Základný limit strán z balíka.
   *
   * Skutočný aktuálny zostatok strán spravuje lib/page-quota.ts.
   * Pri administrátorovi sa tento údaj nesmie používať na blokovanie.
   */
  pageLimit: number;

  basePageLimit: number;
  extraPageLimit: number;
  pagesUsed: number;

  addonIds: AddonId[];
  addonNames: string[];

  /**
   * Set sa používa na rýchle serverové kontroly.
   */
  features: Set<FeatureKey>;

  /**
   * Pole sa používa pri serializácii do JSON.
   */
  featureList: FeatureKey[];

  /**
   * null znamená neobmedzený počet promptov.
   */
  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  promptLimitReached: boolean;

  attachmentLimit: number;

  billingStatus: string | null;
  activatedAt: string | null;
  validUntil: string | null;
  updatedAt: string | null;
};

/**
 * JSON bezpečná verzia CurrentEntitlements.
 *
 * Set nie je vhodný na priame odoslanie cez NextResponse.json,
 * preto sa features mení na pole.
 */
export type PublicEntitlements = Omit<
  CurrentEntitlements,
  'features'
> & {
  features: FeatureKey[];
};

/**
 * Výsledok úspešného odpočítania promptu.
 */
export type PromptUsageResult = {
  isAdmin: boolean;
  promptLimit: number | null;
  promptsUsed: number;
  promptsRemaining: number | null;
  promptLimitReached: boolean;
};

/**
 * Telo jednotnej API chyby pre oprávnenia.
 */
export type EntitlementErrorBody = {
  ok: false;
  code: string;
  message: string;
  purchaseUrl?: string;

  /**
   * Technický detail sa v produkcii neposiela.
   */
  detail?: string;

  feature?: FeatureKey;
  featureLabel?: string;

  promptLimit?: number | null;
  promptsUsed?: number;
  promptsRemaining?: number | null;

  attachmentLimit?: number;
  receivedAttachments?: number;
};

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_PLAN_ID: PlanId = 'free';

const DEFAULT_ATTACHMENT_LIMIT =
  PLANS.free.attachmentLimit || 1;

const PURCHASE_URL = '/pricing';

const VALID_PLAN_IDS = new Set<PlanId>(
  Object.keys(PLANS) as PlanId[],
);

const VALID_ADDON_IDS = new Set<AddonId>(
  Object.keys(ADDONS) as AddonId[],
);

// ============================================================
// LABELS AND FEATURE MAPS
// ============================================================

/**
 * Slovenské názvy modulov používané v hláškach pri prepínaní.
 *
 * Vďaka tomuto mapovaniu sa už pri Obhajobe, Preklade, Analýze dát,
 * Plánovaní, Emailoch alebo Humanizácii nezobrazí nesprávna hláška
 * „Audit kvality nie je súčasťou balíka“.
 */
export const MODULE_LABELS: Record<
  Exclude<AppModuleKey, 'unknown'>,
  string
> = {
  supervisor: 'AI školiteľ',
  quality: 'Audit kvality',
  defense: 'Obhajoba',
  translation: 'Preklad',
  data: 'Analýza dát',
  planning: 'Plánovanie',
  emails: 'Emaily',
  originality: 'Kontrola originality',
  humanizer: 'Humanizácia textu',
  chat: 'AI školiteľ',
};

/**
 * Slovenské názvy funkcií používané v chybových hláškach
 * a v odpovediach API.
 *
 * Primárny zdroj názvov je katalóg. Toto mapovanie sa ponecháva
 * kvôli spätnej kompatibilite s existujúcimi importmi.
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  'ai-supervisor': 'AI školiteľ',
  'chapter-generation': 'Tvorba kapitol',
  'outline-generation': 'Návrh štruktúry a osnovy',
  'quality-audit': 'Audit kvality',
  humanizer: 'Humanizácia textu',
  citations: 'Citácie a zdroje',
  planning: 'Plánovanie práce',
  emails: 'Príprava e-mailov',
  translation: 'Preklad',
  originality: 'Kontrola originality',
  'data-prepare': 'Príprava a čistenie dát',
  'data-descriptive': 'Deskriptívna štatistika',
  'data-questionnaires': 'Tvorba škál, subškál a grafy',
  'data-reliability': 'Reliabilita škál',
  'data-normality': 'Testovanie normality',
  'data-correlations': 'Korelačné analýzy',
  'data-parametric-tests': 'Parametrické testy',
  'data-nonparametric-tests': 'Neparametrické testy',
  'data-charts': 'Grafy a vizualizácie',
  defense: 'Príprava na obhajobu',
  'defense-presentation': 'Prezentácia na obhajobu',
  'committee-questions': 'Otázky komisie',
};

/**
 * Základná funkcia vyžadovaná jednotlivými modulmi aplikácie.
 */
export const MODULE_FEATURE_MAP: Record<
  Exclude<AppModuleKey, 'unknown'>,
  FeatureKey
> = {
  supervisor: 'ai-supervisor',
  quality: 'quality-audit',
  defense: 'defense',
  translation: 'translation',
  data: 'data-prepare',
  planning: 'planning',
  emails: 'emails',
  originality: 'originality',
  humanizer: 'humanizer',
  chat: 'ai-supervisor',
};

/**
 * Podrobné oprávnenia pre operácie AI školiteľa.
 */
export const SUPERVISOR_ACTION_FEATURE_MAP: Record<
  SupervisorActionKey,
  FeatureKey
> = {
  general: 'ai-supervisor',
  chapter: 'chapter-generation',
  outline: 'outline-generation',
  citations: 'citations',
};

/**
 * Oprávnenia pre jednotlivé kroky analýzy dát.
 */
export const DATA_ANALYSIS_FEATURE_MAP: Record<
  DataAnalysisActionKey,
  FeatureKey
> = {
  prepare: 'data-prepare',
  descriptive: 'data-descriptive',
  questionnaires: 'data-questionnaires',
  reliability: 'data-reliability',
  normality: 'data-normality',
  correlations: 'data-correlations',
  'parametric-tests': 'data-parametric-tests',
  'nonparametric-tests': 'data-nonparametric-tests',
  charts: 'data-charts',
};

// ============================================================
// CUSTOM ERRORS
// ============================================================

/**
 * Základná chyba všetkých kontrol oprávnení.
 *
 * API routes môžu všetky odvodené chyby spracovať jednou kontrolou:
 *
 * if (error instanceof EntitlementError) { ... }
 */
export class EntitlementError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail?: string;

  constructor({
    code,
    message,
    status,
    detail,
  }: {
    code: string;
    message: string;
    status: number;
    detail?: string;
  }) {
    super(message);

    this.name = 'EntitlementError';
    this.code = code;
    this.status = status;
    this.detail = detail;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Používateľ nemá platnú Supabase session.
 */
export class UnauthenticatedError extends EntitlementError {
  constructor(detail?: string) {
    super({
      code: 'UNAUTHENTICATED',
      message:
        'Používateľ nie je prihlásený alebo jeho relácia vypršala.',
      status: 401,
      detail,
    });

    this.name = 'UnauthenticatedError';
  }
}

/**
 * Aktivovaný balík alebo doplnky neobsahujú požadovanú funkciu.
 */
export class FeatureAccessError extends EntitlementError {
  readonly feature: FeatureKey;
  readonly displayLabel: string;

  constructor(
    feature: FeatureKey,
    displayLabel?: string,
    scope: 'feature' | 'module' = 'feature',
  ) {
    const safeLabel = displayLabel || getFeatureLabel(feature);
    const subject = scope === 'module' ? 'Modul' : 'Funkcia';

    super({
      code: 'FEATURE_NOT_INCLUDED',
      message:
        `${subject} „${safeLabel}“ nie je súčasťou aktivovaného balíka.`,
      status: 403,
      detail: feature,
    });

    this.name = 'FeatureAccessError';
    this.feature = feature;
    this.displayLabel = safeLabel;
  }
}

/**
 * Používateľ vyčerpal dostupné prompty.
 */
export class PromptLimitError extends EntitlementError {
  readonly promptLimit: number | null;
  readonly promptsUsed: number;

  constructor({
    promptLimit,
    promptsUsed,
  }: {
    promptLimit: number | null;
    promptsUsed: number;
  }) {
    super({
      code: 'PROMPT_LIMIT_REACHED',
      message:
        'Limit dostupných promptov bol vyčerpaný. Pre pokračovanie si aktivujte platený balík.',
      status: 429,
    });

    this.name = 'PromptLimitError';
    this.promptLimit = promptLimit;
    this.promptsUsed = promptsUsed;
  }
}

/**
 * Požiadavka obsahuje viac príloh než povoľuje aktívny balík.
 */
export class AttachmentLimitError extends EntitlementError {
  readonly attachmentLimit: number;
  readonly receivedAttachments: number;

  constructor({
    attachmentLimit,
    receivedAttachments,
  }: {
    attachmentLimit: number;
    receivedAttachments: number;
  }) {
    const safeLimit = Math.max(
      Math.trunc(attachmentLimit),
      0,
    );

    const safeReceived = Math.max(
      Math.trunc(receivedAttachments),
      0,
    );

    super({
      code: 'ATTACHMENT_LIMIT_REACHED',
      message:
        safeLimit === 1
          ? 'Váš balík povoľuje maximálne 1 prílohu.'
          : `Váš balík povoľuje maximálne ${safeLimit} príloh.`,
      status: 403,
    });

    this.name = 'AttachmentLimitError';
    this.attachmentLimit = safeLimit;
    this.receivedAttachments = safeReceived;
  }
}

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Bezpečne prevedie hodnotu na nezáporné celé číslo.
 *
 * Pri neplatnej hodnote vráti undefined.
 */
function toNonNegativeIntegerOrUndefined(
  value: unknown,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(
    Math.max(Math.trunc(parsed), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

function toNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  return (
    toNonNegativeIntegerOrUndefined(value) ??
    Math.max(Math.trunc(fallback), 0)
  );
}

function toSafeBoolean(
  value: unknown,
  fallback = false,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes' ||
      normalized === 'admin'
    ) {
      return true;
    }

    if (
      normalized === 'false' ||
      normalized === '0' ||
      normalized === 'no'
    ) {
      return false;
    }
  }

  return fallback;
}

function normalizeDateString(value: unknown): string | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeBillingStatus(value: unknown): string | null {
  const normalized = normalizeString(value).toLowerCase();
  return normalized || null;
}

function isPlanId(value: unknown): value is PlanId {
  return (
    typeof value === 'string' &&
    VALID_PLAN_IDS.has(value.trim() as PlanId)
  );
}

function isAddonId(value: unknown): value is AddonId {
  return (
    typeof value === 'string' &&
    VALID_ADDON_IDS.has(value.trim() as AddonId)
  );
}

function normalizePlanId(value: unknown): PlanId {
  const candidate = normalizeString(value);

  return isPlanId(candidate) ? candidate : DEFAULT_PLAN_ID;
}

/**
 * Podporuje:
 * - PostgreSQL text[],
 * - bežné JavaScript pole,
 * - JSON string,
 * - PostgreSQL textový zápis {extra-20,data-analysis},
 * - čiarkou oddelený text.
 */
function normalizeAddonIds(value: unknown): AddonId[] {
  let rawValues: unknown[] = [];

  if (Array.isArray(value)) {
    rawValues = value;
  } else if (typeof value === 'string') {
    const normalized = value.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        rawValues = parsed;
      }
    } catch {
      const withoutBraces = normalized
        .replace(/^\{/, '')
        .replace(/\}$/, '');

      rawValues = withoutBraces
        .split(',')
        .map((item) =>
          item.trim().replace(/^"|"$/g, ''),
        )
        .filter(Boolean);
    }
  }

  const validAddonIds = rawValues
    .map(normalizeString)
    .filter(isAddonId);

  return Array.from(new Set<AddonId>(validAddonIds));
}

/**
 * Databázový prompt_limit má prednosť, ak obsahuje číslo.
 *
 * Pri balíku s neobmedzenými promptmi je planValue null a chýbajúca
 * databázová hodnota sa preto vyhodnotí ako neobmedzený limit.
 *
 * Pri FREE balíku je planValue číslo. Ak by databáza omylom obsahovala
 * null, použije sa bezpečný limit z katalógu a nie neobmedzené prompty.
 */
function resolvePromptLimit(
  databaseValue: unknown,
  planValue: number | null,
): number | null {
  const databaseLimit =
    toNonNegativeIntegerOrUndefined(databaseValue);

  if (databaseLimit !== undefined) {
    return databaseLimit;
  }

  if (planValue === null) {
    return null;
  }

  return toNonNegativeInteger(planValue, 0);
}

function resolveAttachmentLimit(
  databaseValue: unknown,
  planValue: unknown,
): number {
  const databaseLimit =
    toNonNegativeIntegerOrUndefined(databaseValue);

  if (databaseLimit !== undefined) {
    return databaseLimit;
  }

  const planLimit =
    toNonNegativeIntegerOrUndefined(planValue);

  if (planLimit !== undefined) {
    return planLimit;
  }

  return DEFAULT_ATTACHMENT_LIMIT;
}

function calculatePromptsRemaining({
  promptLimit,
  promptsUsed,
}: {
  promptLimit: number | null;
  promptsUsed: number;
}): number | null {
  if (promptLimit === null) {
    return null;
  }

  return Math.max(promptLimit - promptsUsed, 0);
}

function isEntitlementExpired(
  validUntil: string | null,
): boolean {
  if (!validUntil) {
    return false;
  }

  const timestamp = Date.parse(validUntil);

  return (
    Number.isFinite(timestamp) && timestamp <= Date.now()
  );
}

function resolveAdminAccess({
  databaseValue,
  appMetadata,
}: {
  databaseValue: unknown;
  appMetadata: Record<string, unknown> | null | undefined;
}): boolean {
  if (toSafeBoolean(databaseValue, false)) {
    return true;
  }

  if (!appMetadata) {
    return false;
  }

  if (toSafeBoolean(appMetadata.is_admin, false)) {
    return true;
  }

  if (toSafeBoolean(appMetadata.isAdmin, false)) {
    return true;
  }

  const role = normalizeString(appMetadata.role).toLowerCase();
  return role === 'admin' || role === 'administrator';
}

function getDefaultEntitlements({
  userId,
  email,
  isAdmin,
}: {
  userId: string;
  email: string | null;
  isAdmin: boolean;
}): CurrentEntitlements {
  const plan = PLANS[DEFAULT_PLAN_ID];

  const features = getFeaturesForEntitlements(
    DEFAULT_PLAN_ID,
    [],
    { isAdmin },
  );

  const featureList = Array.from(features);
  const promptLimit = isAdmin ? null : plan.promptLimit;

  return {
    userId,
    email,

    isAdmin,
    hasUnlimitedAccess: isAdmin,
    hasDatabaseRecord: false,

    planId: DEFAULT_PLAN_ID,
    planName: plan.name,
    planPriceCents: plan.priceCents,
    pageLimit: plan.pageLimit,

    basePageLimit: plan.pageLimit,
    extraPageLimit: 0,
    pagesUsed: 0,

    addonIds: [],
    addonNames: [],

    features,
    featureList,

    promptLimit,
    promptsUsed: 0,
    promptsRemaining: promptLimit,
    promptLimitReached: false,

    attachmentLimit: plan.attachmentLimit,

    billingStatus: isAdmin ? 'admin' : 'active',
    activatedAt: null,
    validUntil: null,
    updatedAt: null,
  };
}

// ============================================================
// PUBLIC HELPERS
// ============================================================

export function getFeatureLabel(feature: FeatureKey): string {
  return (
    FEATURE_LABELS[feature] ||
    getCatalogFeatureLabel(feature) ||
    feature
  );
}

export function serializeEntitlements(
  entitlements: CurrentEntitlements,
): PublicEntitlements {
  const {
    features: _featureSet,
    featureList,
    ...rest
  } = entitlements;

  return {
    ...rest,
    featureList: [...featureList],
    features: [...featureList],
  };
}

/**
 * Spätná kompatibilita:
 *
 * 1. hasFeature(entitlements, feature) -> boolean
 * 2. await hasFeature(feature) -> Promise<boolean>
 */
export function hasFeature(
  entitlements: CurrentEntitlements,
  feature: FeatureKey,
): boolean;

export function hasFeature(
  feature: FeatureKey,
): Promise<boolean>;

export function hasFeature(
  first: CurrentEntitlements | FeatureKey,
  second?: FeatureKey,
): boolean | Promise<boolean> {
  if (typeof first === 'object') {
    if (!second) {
      return false;
    }

    return first.isAdmin || first.features.has(second);
  }

  return getCurrentEntitlements().then(
    (entitlements) =>
      entitlements.isAdmin ||
      entitlements.features.has(first),
  );
}

export function hasAnyFeature(
  entitlements: CurrentEntitlements,
  features: readonly FeatureKey[],
): boolean {
  if (entitlements.isAdmin) {
    return true;
  }

  return features.some((feature) =>
    entitlements.features.has(feature),
  );
}

export function hasAllFeatures(
  entitlements: CurrentEntitlements,
  features: readonly FeatureKey[],
): boolean {
  if (entitlements.isAdmin) {
    return true;
  }

  return features.every((feature) =>
    entitlements.features.has(feature),
  );
}

export function getMissingFeatures(
  entitlements: CurrentEntitlements,
  requiredFeatures: readonly FeatureKey[],
): FeatureKey[] {
  if (entitlements.isAdmin) {
    return [];
  }

  return requiredFeatures.filter(
    (feature) => !entitlements.features.has(feature),
  );
}

// ============================================================
// DATABASE LOADING
// ============================================================

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

function isMissingColumnError(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '');

  return (
    code === '42703' ||
    code === 'PGRST204' ||
    /column|schema cache|does not exist|could not find/i.test(
      message,
    )
  );
}

/**
 * Načíta entitlement z databázy.
 *
 * Funkcia postupne skúša tri kompatibilné schémy:
 * 1. úplnú aktuálnu schému vrátane is_admin,
 * 2. základnú schému vrátane is_admin,
 * 3. starú schému bez is_admin.
 *
 * V produkcii musí byť doplnený stĺpec is_admin. Posledný fallback je
 * ponechaný iba preto, aby staršia databáza nespôsobila úplný pád webu.
 */
async function loadEntitlementRow({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<EntitlementDatabaseRow | null> {
  const selectVariants = [
    [
      'plan_id',
      'addon_ids',
      'base_page_limit',
      'extra_page_limit',
      'pages_used',
      'prompt_limit',
      'prompts_used',
      'attachment_limit',
      'is_admin',
      'billing_status',
      'activated_at',
      'valid_until',
      'updated_at',
    ],
    [
      'plan_id',
      'addon_ids',
      'prompt_limit',
      'prompts_used',
      'attachment_limit',
      'is_admin',
    ],
    [
      'plan_id',
      'addon_ids',
      'prompt_limit',
      'prompts_used',
      'attachment_limit',
    ],
  ] as const;

  let lastMissingColumnError = '';

  for (const columns of selectVariants) {
    const result = await supabase
      .from('zedpera_user_entitlements')
      .select(columns.join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (!result.error) {
      return result.data as EntitlementDatabaseRow | null;
    }

    if (!isMissingColumnError(result.error)) {
      throw new EntitlementError({
        code: 'ENTITLEMENTS_LOAD_FAILED',
        message:
          'Oprávnenia používateľského účtu sa nepodarilo načítať.',
        status: 500,
        detail: result.error.message,
      });
    }

    lastMissingColumnError = result.error.message;
  }

  throw new EntitlementError({
    code: 'ENTITLEMENTS_SCHEMA_INCOMPATIBLE',
    message:
      'Databázová schéma oprávnení nie je kompatibilná s aplikáciou.',
    status: 500,
    detail: lastMissingColumnError,
  });
}

/**
 * Načíta a zostaví oprávnenia aktuálne prihláseného používateľa.
 */
export async function getCurrentEntitlements(): Promise<CurrentEntitlements> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new UnauthenticatedError(authError?.message);
  }

  const appMetadata =
    user.app_metadata && typeof user.app_metadata === 'object'
      ? (user.app_metadata as Record<string, unknown>)
      : null;

  const data = await loadEntitlementRow({
    supabase,
    userId: user.id,
  });

  const isAdmin = resolveAdminAccess({
    databaseValue: data?.is_admin,
    appMetadata,
  });

  if (!data) {
    return getDefaultEntitlements({
      userId: user.id,
      email: user.email || null,
      isAdmin,
    });
  }

  const storedPlanId = normalizePlanId(data.plan_id);
  const storedAddonIds = normalizeAddonIds(data.addon_ids);

  const activatedAt = normalizeDateString(data.activated_at);
  const validUntil = normalizeDateString(data.valid_until);
  const updatedAt = normalizeDateString(data.updated_at);
  const billingStatus = normalizeBillingStatus(data.billing_status);

  /**
   * Administrátor nikdy nesmie stratiť prístup v dôsledku vypršania
   * plateného balíka. Pre bežného používateľa sa po vypršaní oprávnenia
   * bezpečne vrátia na FREE.
   */
  const expired =
    !isAdmin && isEntitlementExpired(validUntil);

  const planId = expired ? DEFAULT_PLAN_ID : storedPlanId;
  const addonIds = expired ? [] : storedAddonIds;
  const plan = PLANS[planId];

  const features = getFeaturesForEntitlements(
    planId,
    addonIds,
    { isAdmin },
  );

  const featureList = Array.from(features);

  const promptLimit = isAdmin
    ? null
    : expired
      ? plan.promptLimit
      : resolvePromptLimit(
          data.prompt_limit,
          plan.promptLimit,
        );

  const promptsUsed = expired
    ? 0
    : toNonNegativeInteger(data.prompts_used, 0);

  const promptsRemaining = isAdmin
    ? null
    : calculatePromptsRemaining({
        promptLimit,
        promptsUsed,
      });

  const attachmentLimit = expired
    ? plan.attachmentLimit
    : resolveAttachmentLimit(
        data.attachment_limit,
        plan.attachmentLimit,
      );

  const basePageLimit = expired
    ? plan.pageLimit
    : toNonNegativeInteger(
        data.base_page_limit,
        plan.pageLimit,
      );

  const extraPageLimit = expired
    ? 0
    : toNonNegativeInteger(data.extra_page_limit, 0);

  const pagesUsed = expired
    ? 0
    : toNonNegativeInteger(data.pages_used, 0);

  return {
    userId: user.id,
    email: user.email || null,

    isAdmin,
    hasUnlimitedAccess: isAdmin,
    hasDatabaseRecord: true,

    planId,
    planName: plan.name,
    planPriceCents: plan.priceCents,
    pageLimit: plan.pageLimit,

    basePageLimit,
    extraPageLimit,
    pagesUsed,

    addonIds,
    addonNames: addonIds.map(
      (addonId) => ADDONS[addonId].name,
    ),

    features,
    featureList,

    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached:
      !isAdmin &&
      promptLimit !== null &&
      promptsUsed >= promptLimit,

    attachmentLimit,

    billingStatus: isAdmin
      ? 'admin'
      : expired
        ? 'expired'
        : billingStatus,
    activatedAt: expired ? null : activatedAt,
    validUntil,
    updatedAt,
  };
}

// ============================================================
// FEATURE GUARDS
// ============================================================

/**
 * Overí jednu konkrétnu funkciu.
 */
export async function requireFeature(
  feature: FeatureKey,
): Promise<CurrentEntitlements> {
  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin) {
    return entitlements;
  }

  if (!entitlements.features.has(feature)) {
    throw new FeatureAccessError(feature);
  }

  return entitlements;
}

/**
 * Overí, či má používateľ aspoň jednu z požadovaných funkcií.
 */
export async function requireAnyFeature(
  requiredFeatures: readonly FeatureKey[],
): Promise<CurrentEntitlements> {
  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin || requiredFeatures.length === 0) {
    return entitlements;
  }

  const accessible = requiredFeatures.some((feature) =>
    entitlements.features.has(feature),
  );

  if (!accessible) {
    throw new FeatureAccessError(requiredFeatures[0]);
  }

  return entitlements;
}

/**
 * Overí, či má používateľ všetky požadované funkcie.
 */
export async function requireAllFeatures(
  requiredFeatures: readonly FeatureKey[],
): Promise<CurrentEntitlements> {
  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin) {
    return entitlements;
  }

  const missingFeatures = getMissingFeatures(
    entitlements,
    requiredFeatures,
  );

  if (missingFeatures.length > 0) {
    throw new EntitlementError({
      code: 'REQUIRED_FEATURES_MISSING',
      message:
        'Aktivovaný balík neobsahuje všetky funkcie potrebné pre túto operáciu.',
      status: 403,
      detail: missingFeatures.map(getFeatureLabel).join(', '),
    });
  }

  return entitlements;
}

/**
 * Overí základnú funkciu požadovaného modulu.
 *
 * Hláška používa názov skutočne zvoleného modulu, nie pevný text
 * „Audit kvality“.
 */
export async function requireModuleAccess(
  module: AppModuleKey,
): Promise<CurrentEntitlements> {
  if (module === 'unknown') {
    throw new EntitlementError({
      code: 'UNKNOWN_MODULE',
      message: 'Požadovaný modul nebol rozpoznaný.',
      status: 400,
    });
  }

  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin) {
    return entitlements;
  }

  const feature = MODULE_FEATURE_MAP[module];

  if (!entitlements.features.has(feature)) {
    throw new FeatureAccessError(
      feature,
      MODULE_LABELS[module],
      'module',
    );
  }

  return entitlements;
}

/**
 * Overí konkrétnu činnosť AI školiteľa.
 */
export async function requireSupervisorAction(
  action: SupervisorActionKey,
): Promise<CurrentEntitlements> {
  return requireFeature(
    SUPERVISOR_ACTION_FEATURE_MAP[action],
  );
}

/**
 * Overí konkrétnu časť analýzy dát.
 *
 * Príklad:
 * await requireDataAnalysisAction('prepare');
 */
export async function requireDataAnalysisAction(
  action: DataAnalysisActionKey,
): Promise<CurrentEntitlements> {
  return requireFeature(DATA_ANALYSIS_FEATURE_MAP[action]);
}

// ============================================================
// PROMPT LIMIT CONTROL
// ============================================================

/**
 * Overí dostupnosť promptu bez jeho spotrebovania.
 */
export async function requirePromptAllowance(): Promise<CurrentEntitlements> {
  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin) {
    return entitlements;
  }

  if (
    entitlements.promptLimit !== null &&
    entitlements.promptsUsed >= entitlements.promptLimit
  ) {
    throw new PromptLimitError({
      promptLimit: entitlements.promptLimit,
      promptsUsed: entitlements.promptsUsed,
    });
  }

  return entitlements;
}

/**
 * Alias pre staršie alebo alternatívne API routy.
 */
export const assertPromptAvailable = requirePromptAllowance;

/**
 * Volajte iba po úspešnom vygenerovaní AI výstupu.
 *
 * Spotreba prebieha atomicky v RPC:
 * public.zedpera_consume_prompt().
 *
 * Administrátorovi sa RPC vôbec nevolá a prompt sa mu neodpočíta.
 */
export async function consumeSuccessfulPrompt(): Promise<PromptUsageResult> {
  const current = await getCurrentEntitlements();

  if (current.isAdmin) {
    return {
      isAdmin: true,
      promptLimit: null,
      promptsUsed: current.promptsUsed,
      promptsRemaining: null,
      promptLimitReached: false,
    };
  }

  if (!current.hasDatabaseRecord) {
    throw new EntitlementError({
      code: 'ENTITLEMENTS_RECORD_MISSING',
      message:
        'Používateľský účet nemá vytvorený databázový záznam oprávnení. Skontrolujte trigger pre vytvorenie FREE balíka.',
      status: 500,
    });
  }

  if (current.promptLimitReached) {
    throw new PromptLimitError({
      promptLimit: current.promptLimit,
      promptsUsed: current.promptsUsed,
    });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.id) {
    throw new UnauthenticatedError(authError?.message);
  }

  const { data, error } = await supabase.rpc(
    'zedpera_consume_prompt',
  );

  if (error) {
    const message = String(error.message || '');
    const upperMessage = message.toUpperCase();

    if (upperMessage.includes('PROMPT_LIMIT_REACHED')) {
      const latest = await getCurrentEntitlements();

      throw new PromptLimitError({
        promptLimit: latest.promptLimit,
        promptsUsed: latest.promptsUsed,
      });
    }

    if (upperMessage.includes('UNAUTHENTICATED')) {
      throw new UnauthenticatedError(message);
    }

    if (
      upperMessage.includes('ENTITLEMENTS_NOT_FOUND') ||
      upperMessage.includes('ENTITLEMENT_NOT_FOUND')
    ) {
      throw new EntitlementError({
        code: 'ENTITLEMENTS_RECORD_MISSING',
        message:
          'Používateľský účet nemá vytvorený databázový záznam oprávnení. Skontrolujte trigger pre vytvorenie FREE balíka.',
        status: 500,
        detail: message,
      });
    }

    throw new EntitlementError({
      code: 'PROMPT_CONSUMPTION_FAILED',
      message: 'Použitie promptu sa nepodarilo zaznamenať.',
      status: 500,
      detail: message,
    });
  }

  const rawRow = Array.isArray(data) ? data[0] : data;

  if (typeof rawRow !== 'object' || rawRow === null) {
    throw new EntitlementError({
      code: 'PROMPT_CONSUMPTION_EMPTY_RESPONSE',
      message:
        'Databáza nevrátila stav spotreby promptov.',
      status: 500,
    });
  }

  const row = rawRow as PromptConsumptionRow;

  const adminAccess =
    toSafeBoolean(row.admin_access, false) ||
    toSafeBoolean(row.is_admin, false);

  if (adminAccess) {
    return {
      isAdmin: true,
      promptLimit: null,
      promptsUsed: toNonNegativeInteger(
        row.current_prompts_used ?? row.prompts_used,
        current.promptsUsed,
      ),
      promptsRemaining: null,
      promptLimitReached: false,
    };
  }

  const rawPromptLimit =
    row.current_prompt_limit ?? row.prompt_limit;

  const promptLimit =
    rawPromptLimit === null
      ? null
      : toNonNegativeIntegerOrUndefined(rawPromptLimit) ??
        current.promptLimit;

  const promptsUsed = toNonNegativeInteger(
    row.current_prompts_used ?? row.prompts_used,
    current.promptsUsed + 1,
  );

  const calculatedRemaining = calculatePromptsRemaining({
    promptLimit,
    promptsUsed,
  });

  const rawReturnedRemaining =
    row.current_prompts_remaining ?? row.prompts_remaining;

  const returnedRemaining =
    rawReturnedRemaining === null
      ? null
      : toNonNegativeIntegerOrUndefined(rawReturnedRemaining);

  const promptsRemaining =
    promptLimit === null
      ? null
      : Math.min(
          returnedRemaining ?? calculatedRemaining ?? 0,
          calculatedRemaining ?? 0,
        );

  const promptLimitReached =
    toSafeBoolean(row.limit_reached, false) ||
    toSafeBoolean(row.prompt_limit_reached, false) ||
    (promptLimit !== null && promptsUsed >= promptLimit);

  return {
    isAdmin: false,
    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached,
  };
}

/**
 * Alias pre názov používaný v niektorých API routach.
 */
export const consumeCurrentUserPrompt = consumeSuccessfulPrompt;

// ============================================================
// ATTACHMENT LIMIT CONTROL
// ============================================================

/**
 * Overí počet príloh podľa aktívneho balíka.
 */
export async function requireAttachmentAllowance(
  receivedAttachments: number,
): Promise<CurrentEntitlements> {
  const entitlements = await getCurrentEntitlements();

  if (entitlements.isAdmin) {
    return entitlements;
  }

  const safeReceivedAttachments = toNonNegativeInteger(
    receivedAttachments,
    0,
  );

  if (safeReceivedAttachments > entitlements.attachmentLimit) {
    throw new AttachmentLimitError({
      attachmentLimit: entitlements.attachmentLimit,
      receivedAttachments: safeReceivedAttachments,
    });
  }

  return entitlements;
}

// ============================================================
// ERROR SERIALIZATION FOR API ROUTES
// ============================================================

/**
 * Prevedie EntitlementError na jednotnú API odpoveď.
 *
 * Použitie:
 *
 * const result = entitlementErrorResponse(error);
 * return NextResponse.json(result.body, { status: result.status });
 */
export function entitlementErrorResponse(
  error: unknown,
): {
  status: number;
  body: EntitlementErrorBody;
} {
  if (error instanceof FeatureAccessError) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        feature: error.feature,
        featureLabel: error.displayLabel,
        purchaseUrl: PURCHASE_URL,
        ...(process.env.NODE_ENV !== 'production'
          ? { detail: error.detail }
          : {}),
      },
    };
  }

  if (error instanceof PromptLimitError) {
    const promptsRemaining =
      error.promptLimit === null
        ? null
        : Math.max(
            error.promptLimit - error.promptsUsed,
            0,
          );

    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        promptLimit: error.promptLimit,
        promptsUsed: error.promptsUsed,
        promptsRemaining,
        purchaseUrl: PURCHASE_URL,
      },
    };
  }

  if (error instanceof AttachmentLimitError) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        attachmentLimit: error.attachmentLimit,
        receivedAttachments: error.receivedAttachments,
        purchaseUrl: PURCHASE_URL,
      },
    };
  }

  if (error instanceof EntitlementError) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
        ...(error.status === 402 ||
        error.status === 403 ||
        error.status === 429
          ? { purchaseUrl: PURCHASE_URL }
          : {}),
        ...(process.env.NODE_ENV !== 'production' && error.detail
          ? { detail: error.detail }
          : {}),
      },
    };
  }

  const technicalDetail =
    error instanceof Error ? error.message : String(error);

  return {
    status: 500,
    body: {
      ok: false,
      code: 'ENTITLEMENT_ERROR',
      message:
        'Kontrola oprávnení používateľského účtu zlyhala.',
      ...(process.env.NODE_ENV !== 'production'
        ? { detail: technicalDetail }
        : {}),
    },
  };
}
