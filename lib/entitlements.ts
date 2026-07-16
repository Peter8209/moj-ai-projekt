import {
  ADDONS,
  PLANS,
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
  prompt_limit?: unknown;
  prompts_used?: unknown;
  attachment_limit?: unknown;
  activated_at?: unknown;
  valid_until?: unknown;
  updated_at?: unknown;
};

/**
 * Výsledok RPC funkcie public.zedpera_consume_prompt().
 */
type PromptConsumptionRow = {
  prompt_limit?: unknown;
  prompts_used?: unknown;
  prompts_remaining?: unknown;
  limit_reached?: unknown;
};

/**
 * Kompletné serverové oprávnenia aktuálneho používateľa.
 */
export type CurrentEntitlements = {
  userId: string;
  email: string | null;

  planId: PlanId;
  planName: string;
  planPriceCents: number;

  /**
   * Základný limit strán z balíka.
   *
   * Skutočný aktuálny zostatok strán spravuje lib/page-quota.ts.
   */
  pageLimit: number;

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
 * Slovenské názvy funkcií používané v chybových hláškach
 * a v odpovediach API.
 */
export const FEATURE_LABELS: Record<
  FeatureKey,
  string
> = {
  'ai-supervisor':
    'AI školiteľ',
  'chapter-generation':
    'Tvorba kapitol',
  'outline-generation':
    'Návrh štruktúry a osnovy',
  'quality-audit':
    'Audit kvality',
  humanizer:
    'Humanizácia textu',
  citations:
    'Citácie a zdroje',
  planning:
    'Plánovanie práce',
  emails:
    'Príprava e-mailov',
  translation:
    'Preklad',
  originality:
    'Kontrola originality',
  'data-prepare':
    'Príprava a čistenie dát',
  'data-descriptive':
    'Deskriptívna štatistika',
  'data-questionnaires':
    'Spracovanie dotazníkov',
  'data-reliability':
    'Reliabilita škál',
  'data-normality':
    'Testovanie normality',
  'data-correlations':
    'Korelačné analýzy',
  'data-parametric-tests':
    'Parametrické testy',
  'data-nonparametric-tests':
    'Neparametrické testy',
  'data-charts':
    'Grafy a tabuľky',
  defense:
    'Príprava na obhajobu',
  'defense-presentation':
    'Prezentácia na obhajobu',
  'committee-questions':
    'Otázky komisie',
};

/**
 * Základná funkcia vyžadovaná jednotlivými modulmi aplikácie.
 */
export const MODULE_FEATURE_MAP: Record<
  Exclude<AppModuleKey, 'unknown'>,
  FeatureKey
> = {
  supervisor:
    'ai-supervisor',
  quality:
    'quality-audit',
  defense:
    'defense',
  translation:
    'translation',
  data:
    'data-prepare',
  planning:
    'planning',
  emails:
    'emails',
  originality:
    'originality',
  humanizer:
    'humanizer',
  chat:
    'ai-supervisor',
};

/**
 * Podrobné oprávnenia pre operácie AI školiteľa.
 */
export const SUPERVISOR_ACTION_FEATURE_MAP:
  Record<
    SupervisorActionKey,
    FeatureKey
  > = {
    general:
      'ai-supervisor',
    chapter:
      'chapter-generation',
    outline:
      'outline-generation',
    citations:
      'citations',
  };

/**
 * Oprávnenia pre jednotlivé kroky analýzy dát.
 */
export const DATA_ANALYSIS_FEATURE_MAP:
  Record<
    DataAnalysisActionKey,
    FeatureKey
  > = {
    prepare:
      'data-prepare',
    descriptive:
      'data-descriptive',
    questionnaires:
      'data-questionnaires',
    reliability:
      'data-reliability',
    normality:
      'data-normality',
    correlations:
      'data-correlations',
    'parametric-tests':
      'data-parametric-tests',
    'nonparametric-tests':
      'data-nonparametric-tests',
    charts:
      'data-charts',
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

    this.name =
      'EntitlementError';
    this.code = code;
    this.status = status;
    this.detail = detail;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );
  }
}

/**
 * Používateľ nemá platnú Supabase session.
 */
export class UnauthenticatedError
  extends EntitlementError {
  constructor(
    detail?: string,
  ) {
    super({
      code:
        'UNAUTHENTICATED',
      message:
        'Používateľ nie je prihlásený alebo jeho relácia vypršala.',
      status: 401,
      detail,
    });

    this.name =
      'UnauthenticatedError';
  }
}

/**
 * Aktivovaný balík alebo doplnky neobsahujú požadovanú funkciu.
 */
export class FeatureAccessError
  extends EntitlementError {
  readonly feature: FeatureKey;

  constructor(
    feature: FeatureKey,
  ) {
    super({
      code:
        'FEATURE_NOT_INCLUDED',
      message:
        `${getFeatureLabel(feature)} nie je súčasťou aktivovaného balíka.`,
      status: 403,
      detail: feature,
    });

    this.name =
      'FeatureAccessError';
    this.feature = feature;
  }
}

/**
 * Používateľ vyčerpal dostupné prompty.
 */
export class PromptLimitError
  extends EntitlementError {
  readonly promptLimit:
    number | null;
  readonly promptsUsed: number;

  constructor({
    promptLimit,
    promptsUsed,
  }: {
    promptLimit:
      number | null;
    promptsUsed: number;
  }) {
    super({
      code:
        'PROMPT_LIMIT_REACHED',
      message:
        'Limit dostupných promptov bol vyčerpaný. Pre pokračovanie si aktivujte platený balík.',
      status: 402,
    });

    this.name =
      'PromptLimitError';
    this.promptLimit =
      promptLimit;
    this.promptsUsed =
      promptsUsed;
  }
}

/**
 * Požiadavka obsahuje viac príloh než povoľuje aktívny balík.
 */
export class AttachmentLimitError
  extends EntitlementError {
  readonly attachmentLimit:
    number;
  readonly receivedAttachments:
    number;

  constructor({
    attachmentLimit,
    receivedAttachments,
  }: {
    attachmentLimit: number;
    receivedAttachments: number;
  }) {
    const safeLimit =
      Math.max(
        Math.trunc(
          attachmentLimit,
        ),
        0,
      );

    const safeReceived =
      Math.max(
        Math.trunc(
          receivedAttachments,
        ),
        0,
      );

    super({
      code:
        'ATTACHMENT_LIMIT_REACHED',
      message:
        safeLimit === 1
          ? 'Váš balík povoľuje maximálne 1 prílohu.'
          : `Váš balík povoľuje maximálne ${safeLimit} príloh.`,
      status: 403,
    });

    this.name =
      'AttachmentLimitError';
    this.attachmentLimit =
      safeLimit;
    this.receivedAttachments =
      safeReceived;
  }
}

// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

/**
 * Bezpečne prevedie hodnotu na nezáporné celé číslo.
 *
 * Pri neplatnej hodnote vráti undefined.
 */
function toNonNegativeIntegerOrUndefined(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value === 'string' &&
    value.trim() === ''
  ) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return undefined;
  }

  return Math.min(
    Math.max(
      Math.trunc(parsed),
      0,
    ),
    Number.MAX_SAFE_INTEGER,
  );
}

function toNonNegativeInteger(
  value: unknown,
  fallback = 0,
): number {
  return (
    toNonNegativeIntegerOrUndefined(
      value,
    ) ??
    Math.max(
      Math.trunc(fallback),
      0,
    )
  );
}

function toSafeBoolean(
  value: unknown,
  fallback = false,
): boolean {
  if (
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (
    typeof value === 'number'
  ) {
    return value !== 0;
  }

  if (
    typeof value === 'string'
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      normalized === 'true' ||
      normalized === '1' ||
      normalized === 'yes'
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

function normalizeDateString(
  value: unknown,
): string | null {
  const normalized =
    normalizeString(value);

  if (!normalized) {
    return null;
  }

  const timestamp =
    Date.parse(normalized);

  if (
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function isPlanId(
  value: unknown,
): value is PlanId {
  return (
    typeof value === 'string' &&
    VALID_PLAN_IDS.has(
      value.trim() as PlanId,
    )
  );
}

function isAddonId(
  value: unknown,
): value is AddonId {
  return (
    typeof value === 'string' &&
    VALID_ADDON_IDS.has(
      value.trim() as AddonId,
    )
  );
}

function normalizePlanId(
  value: unknown,
): PlanId {
  const candidate =
    normalizeString(value);

  return isPlanId(candidate)
    ? candidate
    : DEFAULT_PLAN_ID;
}

/**
 * Podporuje:
 * - PostgreSQL text[],
 * - bežné JavaScript pole,
 * - JSON string,
 * - PostgreSQL textový zápis {extra-20,data-analysis},
 * - čiarkou oddelený text.
 */
function normalizeAddonIds(
  value: unknown,
): AddonId[] {
  let rawValues:
    unknown[] = [];

  if (Array.isArray(value)) {
    rawValues = value;
  } else if (
    typeof value === 'string'
  ) {
    const normalized =
      value.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed: unknown =
        JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        rawValues = parsed;
      }
    } catch {
      const withoutBraces =
        normalized
          .replace(/^\{/, '')
          .replace(/\}$/, '');

      rawValues =
        withoutBraces
          .split(',')
          .map((item) =>
            item
              .trim()
              .replace(
                /^"|"$/g,
                '',
              ),
          )
          .filter(Boolean);
    }
  }

  const validAddonIds =
    rawValues
      .map(normalizeString)
      .filter(isAddonId);

  return Array.from(
    new Set<AddonId>(
      validAddonIds,
    ),
  );
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
  planValue:
    | number
    | null,
): number | null {
  const databaseLimit =
    toNonNegativeIntegerOrUndefined(
      databaseValue,
    );

  if (
    databaseLimit !==
    undefined
  ) {
    return databaseLimit;
  }

  if (planValue === null) {
    return null;
  }

  return toNonNegativeInteger(
    planValue,
    0,
  );
}

function resolveAttachmentLimit(
  databaseValue: unknown,
  planValue: unknown,
): number {
  const databaseLimit =
    toNonNegativeIntegerOrUndefined(
      databaseValue,
    );

  if (
    databaseLimit !==
    undefined
  ) {
    return databaseLimit;
  }

  const planLimit =
    toNonNegativeIntegerOrUndefined(
      planValue,
    );

  if (
    planLimit !==
    undefined
  ) {
    return planLimit;
  }

  return DEFAULT_ATTACHMENT_LIMIT;
}

function calculatePromptsRemaining({
  promptLimit,
  promptsUsed,
}: {
  promptLimit:
    number | null;
  promptsUsed: number;
}): number | null {
  if (promptLimit === null) {
    return null;
  }

  return Math.max(
    promptLimit -
      promptsUsed,
    0,
  );
}

function isEntitlementExpired(
  validUntil: string | null,
): boolean {
  if (!validUntil) {
    return false;
  }

  const timestamp =
    Date.parse(validUntil);

  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now()
  );
}

function buildFeatureSet({
  planId,
  addonIds,
}: {
  planId: PlanId;
  addonIds: AddonId[];
}): Set<FeatureKey> {
  const features =
    new Set<FeatureKey>(
      PLANS[planId]
        ?.features ??
        [],
    );

  for (
    const addonId of
    addonIds
  ) {
    const addon =
      ADDONS[addonId];

    for (
      const feature of
      addon?.features ?? []
    ) {
      features.add(feature);
    }
  }

  return features;
}

function getDefaultEntitlements({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}): CurrentEntitlements {
  const plan =
    PLANS[DEFAULT_PLAN_ID];

  const featureList =
    Array.from(
      new Set<FeatureKey>(
        plan.features,
      ),
    );

  const promptLimit =
    plan.promptLimit;

  return {
    userId,
    email,

    planId:
      DEFAULT_PLAN_ID,
    planName:
      plan.name,
    planPriceCents:
      plan.priceCents,
    pageLimit:
      plan.pageLimit,

    addonIds: [],
    addonNames: [],

    features:
      new Set<FeatureKey>(
        featureList,
      ),
    featureList,

    promptLimit,
    promptsUsed: 0,
    promptsRemaining:
      promptLimit,
    promptLimitReached:
      promptLimit !== null &&
      promptLimit <= 0,

    attachmentLimit:
      plan.attachmentLimit,

    activatedAt: null,
    validUntil: null,
    updatedAt: null,
  };
}

// ============================================================
// PUBLIC HELPERS
// ============================================================

export function getFeatureLabel(
  feature: FeatureKey,
): string {
  return (
    FEATURE_LABELS[feature] ||
    feature
  );
}

export function serializeEntitlements(
  entitlements:
    CurrentEntitlements,
): PublicEntitlements {
  const {
    features: _featureSet,
    featureList,
    ...rest
  } = entitlements;

  return {
    ...rest,
    featureList:
      [...featureList],
    features:
      [...featureList],
  };
}

/**
 * Spätná kompatibilita:
 *
 * 1. hasFeature(entitlements, feature) -> boolean
 * 2. await hasFeature(feature) -> Promise<boolean>
 */
export function hasFeature(
  entitlements:
    CurrentEntitlements,
  feature: FeatureKey,
): boolean;

export function hasFeature(
  feature: FeatureKey,
): Promise<boolean>;

export function hasFeature(
  first:
    | CurrentEntitlements
    | FeatureKey,
  second?: FeatureKey,
):
  | boolean
  | Promise<boolean> {
  if (
    typeof first ===
    'object'
  ) {
    if (!second) {
      return false;
    }

    return first.features.has(
      second,
    );
  }

  return getCurrentEntitlements()
    .then((entitlements) =>
      entitlements.features.has(
        first,
      ),
    );
}

export function hasAnyFeature(
  entitlements:
    CurrentEntitlements,
  features:
    readonly FeatureKey[],
): boolean {
  return features.some(
    (feature) =>
      entitlements.features.has(
        feature,
      ),
  );
}

export function hasAllFeatures(
  entitlements:
    CurrentEntitlements,
  features:
    readonly FeatureKey[],
): boolean {
  return features.every(
    (feature) =>
      entitlements.features.has(
        feature,
      ),
  );
}

export function getMissingFeatures(
  entitlements:
    CurrentEntitlements,
  requiredFeatures:
    readonly FeatureKey[],
): FeatureKey[] {
  return requiredFeatures.filter(
    (feature) =>
      !entitlements.features.has(
        feature,
      ),
  );
}

// ============================================================
// DATABASE LOADING
// ============================================================

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createSupabaseServerClient
    >
  >;

/**
 * Načíta entitlement z databázy.
 *
 * Najskôr sa skúsi rozšírený zoznam stĺpcov. Ak staršia databázová
 * schéma ešte neobsahuje activated_at, valid_until alebo updated_at,
 * funkcia automaticky použije základný kompatibilný select.
 */
async function loadEntitlementRow({
  supabase,
  userId,
}: {
  supabase:
    SupabaseServerClient;
  userId: string;
}): Promise<
  EntitlementDatabaseRow | null
> {
  const extendedColumns = [
    'plan_id',
    'addon_ids',
    'prompt_limit',
    'prompts_used',
    'attachment_limit',
    'activated_at',
    'valid_until',
    'updated_at',
  ].join(', ');

  const extendedResult =
    await supabase
      .from(
        'zedpera_user_entitlements',
      )
      .select(
        extendedColumns,
      )
      .eq(
        'user_id',
        userId,
      )
      .maybeSingle();

  if (!extendedResult.error) {
    return (
      extendedResult.data as
        | EntitlementDatabaseRow
        | null
    );
  }

  const extendedErrorMessage =
    String(
      extendedResult.error
        .message || '',
    );

  const missingOptionalColumn =
    /activated_at|valid_until|updated_at/i.test(
      extendedErrorMessage,
    ) ||
    String(
      extendedResult.error
        .code || '',
    ) === '42703';

  if (!missingOptionalColumn) {
    throw new EntitlementError({
      code:
        'ENTITLEMENTS_LOAD_FAILED',
      message:
        'Oprávnenia používateľského účtu sa nepodarilo načítať.',
      status: 500,
      detail:
        extendedErrorMessage,
    });
  }

  const basicResult =
    await supabase
      .from(
        'zedpera_user_entitlements',
      )
      .select(
        [
          'plan_id',
          'addon_ids',
          'prompt_limit',
          'prompts_used',
          'attachment_limit',
        ].join(', '),
      )
      .eq(
        'user_id',
        userId,
      )
      .maybeSingle();

  if (basicResult.error) {
    throw new EntitlementError({
      code:
        'ENTITLEMENTS_LOAD_FAILED',
      message:
        'Oprávnenia používateľského účtu sa nepodarilo načítať.',
      status: 500,
      detail:
        basicResult.error
          .message,
    });
  }

  return (
    basicResult.data as
      | EntitlementDatabaseRow
      | null
  );
}

/**
 * Načíta a zostaví oprávnenia aktuálne prihláseného používateľa.
 */
export async function getCurrentEntitlements():
  Promise<CurrentEntitlements> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user?.id
  ) {
    throw new UnauthenticatedError(
      authError?.message,
    );
  }

  const data =
    await loadEntitlementRow({
      supabase,
      userId: user.id,
    });

  if (!data) {
    return getDefaultEntitlements({
      userId:
        user.id,
      email:
        user.email || null,
    });
  }

  const storedPlanId =
    normalizePlanId(
      data.plan_id,
    );

  const storedAddonIds =
    normalizeAddonIds(
      data.addon_ids,
    );

  const activatedAt =
    normalizeDateString(
      data.activated_at,
    );

  const validUntil =
    normalizeDateString(
      data.valid_until,
    );

  const updatedAt =
    normalizeDateString(
      data.updated_at,
    );

  /**
   * Po vypršaní balíka sa oprávnenia okamžite vrátia na FREE.
   * Pôvodný validUntil zostáva vo výstupe pre diagnostiku/UI.
   */
  const expired =
    isEntitlementExpired(
      validUntil,
    );

  const planId =
    expired
      ? DEFAULT_PLAN_ID
      : storedPlanId;

  const addonIds =
    expired
      ? []
      : storedAddonIds;

  const plan =
    PLANS[planId];

  const features =
    buildFeatureSet({
      planId,
      addonIds,
    });

  const featureList =
    Array.from(features);

  const promptLimit =
    expired
      ? plan.promptLimit
      : resolvePromptLimit(
          data.prompt_limit,
          plan.promptLimit,
        );

  const promptsUsed =
    expired
      ? 0
      : toNonNegativeInteger(
          data.prompts_used,
          0,
        );

  const promptsRemaining =
    calculatePromptsRemaining({
      promptLimit,
      promptsUsed,
    });

  const attachmentLimit =
    expired
      ? plan.attachmentLimit
      : resolveAttachmentLimit(
          data.attachment_limit,
          plan.attachmentLimit,
        );

  return {
    userId:
      user.id,
    email:
      user.email || null,

    planId,
    planName:
      plan.name,
    planPriceCents:
      plan.priceCents,
    pageLimit:
      plan.pageLimit,

    addonIds,
    addonNames:
      addonIds.map(
        (addonId) =>
          ADDONS[addonId]
            .name,
      ),

    features,
    featureList,

    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached:
      promptLimit !== null &&
      promptsUsed >=
        promptLimit,

    attachmentLimit,

    activatedAt:
      expired
        ? null
        : activatedAt,
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
  const entitlements =
    await getCurrentEntitlements();

  if (
    !entitlements.features.has(
      feature,
    )
  ) {
    throw new FeatureAccessError(
      feature,
    );
  }

  return entitlements;
}

/**
 * Overí, či má používateľ aspoň jednu z požadovaných funkcií.
 */
export async function requireAnyFeature(
  requiredFeatures:
    readonly FeatureKey[],
): Promise<CurrentEntitlements> {
  const entitlements =
    await getCurrentEntitlements();

  if (
    requiredFeatures.length === 0
  ) {
    return entitlements;
  }

  const accessible =
    requiredFeatures.some(
      (feature) =>
        entitlements.features.has(
          feature,
        ),
    );

  if (!accessible) {
    throw new FeatureAccessError(
      requiredFeatures[0],
    );
  }

  return entitlements;
}

/**
 * Overí, či má používateľ všetky požadované funkcie.
 */
export async function requireAllFeatures(
  requiredFeatures:
    readonly FeatureKey[],
): Promise<CurrentEntitlements> {
  const entitlements =
    await getCurrentEntitlements();

  const missingFeatures =
    getMissingFeatures(
      entitlements,
      requiredFeatures,
    );

  if (
    missingFeatures.length > 0
  ) {
    throw new EntitlementError({
      code:
        'REQUIRED_FEATURES_MISSING',
      message:
        'Aktivovaný balík neobsahuje všetky funkcie potrebné pre túto operáciu.',
      status: 403,
      detail:
        missingFeatures
          .map(getFeatureLabel)
          .join(', '),
    });
  }

  return entitlements;
}

/**
 * Overí základnú funkciu požadovaného modulu.
 */
export async function requireModuleAccess(
  module: AppModuleKey,
): Promise<CurrentEntitlements> {
  if (
    module === 'unknown'
  ) {
    throw new EntitlementError({
      code:
        'UNKNOWN_MODULE',
      message:
        'Požadovaný modul nebol rozpoznaný.',
      status: 400,
    });
  }

  const feature =
    MODULE_FEATURE_MAP[module];

  return requireFeature(
    feature,
  );
}

/**
 * Overí konkrétnu činnosť AI školiteľa.
 */
export async function requireSupervisorAction(
  action:
    SupervisorActionKey,
): Promise<CurrentEntitlements> {
  return requireFeature(
    SUPERVISOR_ACTION_FEATURE_MAP[
      action
    ],
  );
}

/**
 * Overí konkrétnu časť analýzy dát.
 *
 * Príklad:
 * await requireDataAnalysisAction('prepare');
 */
export async function requireDataAnalysisAction(
  action:
    DataAnalysisActionKey,
): Promise<CurrentEntitlements> {
  return requireFeature(
    DATA_ANALYSIS_FEATURE_MAP[
      action
    ],
  );
}

// ============================================================
// PROMPT LIMIT CONTROL
// ============================================================

/**
 * Overí dostupnosť promptu bez jeho spotrebovania.
 */
export async function requirePromptAllowance():
  Promise<CurrentEntitlements> {
  const entitlements =
    await getCurrentEntitlements();

  if (
    entitlements
      .promptLimit !== null &&
    entitlements
      .promptsUsed >=
        entitlements
          .promptLimit
  ) {
    throw new PromptLimitError({
      promptLimit:
        entitlements
          .promptLimit,
      promptsUsed:
        entitlements
          .promptsUsed,
    });
  }

  return entitlements;
}

/**
 * Volajte iba po úspešnom vygenerovaní AI výstupu.
 *
 * Spotreba prebieha atomicky v RPC:
 * public.zedpera_consume_prompt().
 */
export async function consumeSuccessfulPrompt():
  Promise<PromptUsageResult> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !user?.id
  ) {
    throw new UnauthenticatedError(
      authError?.message,
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'zedpera_consume_prompt',
  );

  if (error) {
    const message =
      String(
        error.message || '',
      );

    if (
      message
        .toUpperCase()
        .includes(
          'PROMPT_LIMIT_REACHED',
        )
    ) {
      const current =
        await getCurrentEntitlements();

      throw new PromptLimitError({
        promptLimit:
          current.promptLimit,
        promptsUsed:
          current.promptsUsed,
      });
    }

    if (
      message
        .toUpperCase()
        .includes(
          'UNAUTHENTICATED',
        )
    ) {
      throw new UnauthenticatedError(
        message,
      );
    }

    throw new EntitlementError({
      code:
        'PROMPT_CONSUMPTION_FAILED',
      message:
        'Použitie promptu sa nepodarilo zaznamenať.',
      status: 500,
      detail: message,
    });
  }

  const rawRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    typeof rawRow !==
      'object' ||
    rawRow === null
  ) {
    throw new EntitlementError({
      code:
        'PROMPT_CONSUMPTION_EMPTY_RESPONSE',
      message:
        'Databáza nevrátila stav spotreby promptov.',
      status: 500,
    });
  }

  const row =
    rawRow as
      PromptConsumptionRow;

  const promptLimit =
    row.prompt_limit === null
      ? null
      : toNonNegativeIntegerOrUndefined(
          row.prompt_limit,
        ) ??
        null;

  const promptsUsed =
    toNonNegativeInteger(
      row.prompts_used,
      0,
    );

  const calculatedRemaining =
    calculatePromptsRemaining({
      promptLimit,
      promptsUsed,
    });

  const returnedRemaining =
    row.prompts_remaining ===
      null
      ? null
      : toNonNegativeIntegerOrUndefined(
          row.prompts_remaining,
        );

  const promptsRemaining =
    promptLimit === null
      ? null
      : Math.min(
          returnedRemaining ??
            calculatedRemaining ??
            0,
          calculatedRemaining ??
            0,
        );

  const promptLimitReached =
    toSafeBoolean(
      row.limit_reached,
      false,
    ) ||
    (
      promptLimit !== null &&
      promptsUsed >=
        promptLimit
    );

  return {
    promptLimit,
    promptsUsed,
    promptsRemaining,
    promptLimitReached,
  };
}

// ============================================================
// ATTACHMENT LIMIT CONTROL
// ============================================================

/**
 * Overí počet príloh podľa aktívneho balíka.
 */
export async function requireAttachmentAllowance(
  receivedAttachments: number,
): Promise<CurrentEntitlements> {
  const entitlements =
    await getCurrentEntitlements();

  const safeReceivedAttachments =
    toNonNegativeInteger(
      receivedAttachments,
      0,
    );

  if (
    safeReceivedAttachments >
    entitlements
      .attachmentLimit
  ) {
    throw new AttachmentLimitError({
      attachmentLimit:
        entitlements
          .attachmentLimit,
      receivedAttachments:
        safeReceivedAttachments,
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
  if (
    error instanceof
    FeatureAccessError
  ) {
    return {
      status:
        error.status,
      body: {
        ok: false,
        code:
          error.code,
        message:
          error.message,
        feature:
          error.feature,
        featureLabel:
          getFeatureLabel(
            error.feature,
          ),
        purchaseUrl:
          PURCHASE_URL,
        ...(process.env
          .NODE_ENV !==
        'production'
          ? {
              detail:
                error.detail,
            }
          : {}),
      },
    };
  }

  if (
    error instanceof
    PromptLimitError
  ) {
    const promptsRemaining =
      error.promptLimit === null
        ? null
        : Math.max(
            error.promptLimit -
              error.promptsUsed,
            0,
          );

    return {
      status:
        error.status,
      body: {
        ok: false,
        code:
          error.code,
        message:
          error.message,
        promptLimit:
          error.promptLimit,
        promptsUsed:
          error.promptsUsed,
        promptsRemaining,
        purchaseUrl:
          PURCHASE_URL,
      },
    };
  }

  if (
    error instanceof
    AttachmentLimitError
  ) {
    return {
      status:
        error.status,
      body: {
        ok: false,
        code:
          error.code,
        message:
          error.message,
        attachmentLimit:
          error.attachmentLimit,
        receivedAttachments:
          error.receivedAttachments,
        purchaseUrl:
          PURCHASE_URL,
      },
    };
  }

  if (
    error instanceof
    EntitlementError
  ) {
    return {
      status:
        error.status,
      body: {
        ok: false,
        code:
          error.code,
        message:
          error.message,
        ...(
          error.status === 402 ||
          error.status === 403
            ? {
                purchaseUrl:
                  PURCHASE_URL,
              }
            : {}
        ),
        ...(process.env
          .NODE_ENV !==
        'production' &&
        error.detail
          ? {
              detail:
                error.detail,
            }
          : {}),
      },
    };
  }

  const technicalDetail =
    error instanceof Error
      ? error.message
      : String(error);

  return {
    status: 500,
    body: {
      ok: false,
      code:
        'ENTITLEMENT_ERROR',
      message:
        'Kontrola oprávnení používateľského účtu zlyhala.',
      ...(process.env
        .NODE_ENV !==
      'production'
        ? {
            detail:
              technicalDetail,
          }
        : {}),
    },
  };
}
