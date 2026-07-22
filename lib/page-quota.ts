import 'server-only';

import {
  ADDONS,
  PLANS,
  getExtraPagesForAddons,
  getTotalAttachmentLimit,
  getTotalPageLimit,
  type AddonId,
  type PlanId,
} from '@/lib/billing/catalog';
import {
  getCurrentEntitlements,
  type CurrentEntitlements,
} from '@/lib/entitlements';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Jedna normostrana = 1 800 znakov vrátane medzier.
 */
export const CHARACTERS_PER_PAGE = 1_800;

/**
 * Orientačný počet výstupných tokenov na jednu normostranu.
 *
 * Používa sa iba na predbežné obmedzenie maximálnej dĺžky AI odpovede.
 * Finálna spotreba sa vždy vypočíta zo skutočne vygenerovaného textu.
 */
export const TOKENS_PER_PAGE = 650;

/**
 * Verejné základné stránkové limity sú odvodené priamo z katalógu.
 *
 * V tomto súbore sa nesmú udržiavať samostatné obchodné hodnoty,
 * pretože katalóg je jediný autoritatívny zdroj limitov.
 */
export const PLAN_PAGE_LIMITS = {
  free: PLANS.free.pageLimit,
  'seminar-work': PLANS['seminar-work'].pageLimit,
  'bachelor-thesis': PLANS['bachelor-thesis'].pageLimit,
  'master-thesis': PLANS['master-thesis'].pageLimit,
} as const satisfies Record<
  Exclude<PlanId, 'admin'>,
  number
>;

/**
 * Stránkové navýšenia doplnkov sú odvodené z katalógu.
 * Doplnok Analýza dát má 0 extra strán.
 */
export const ADDON_PAGE_AMOUNTS = {
  'data-analysis': ADDONS['data-analysis'].extraPages,
  'extra-20': ADDONS['extra-20'].extraPages,
  'extra-40': ADDONS['extra-40'].extraPages,
  'extra-60': ADDONS['extra-60'].extraPages,
} as const satisfies Record<AddonId, number>;

export type PagePlanId = keyof typeof PLAN_PAGE_LIMITS;
export type PageAddonId = keyof typeof ADDON_PAGE_AMOUNTS;
export type PageQuotaPlanId = PlanId | string;

/**
 * Moduly a operácie sa ukladajú do logu spotreby.
 *
 * Typ zostáva otvorený aj pre ďalšie moduly, aby sa existujúce route
 * súbory nemuseli meniť pri každom novom názve operácie.
 */
export type PageUsageModule =
  | 'chat'
  | 'supervisor'
  | 'chapter'
  | 'outline'
  | 'quality'
  | 'humanizer'
  | 'translation'
  | 'defense'
  | 'defense-presentation'
  | 'committee-questions'
  | 'planning'
  | 'emails'
  | 'originality'
  | 'citations'
  | 'data'
  | 'data-analysis'
  | 'data-interpretation'
  | 'analysis-export'
  | 'unknown'
  | (string & {});

/**
 * Jednotný serverový stav stránkovej kvóty.
 *
 * Pri každom bežnom účte platí:
 *
 * pageLimit === attachmentLimit
 *
 * Hodnota null znamená neobmedzený administrátorský režim.
 */
export type PageQuota = {
  /** Identifikátor aktívneho balíka. */
  planId: PageQuotaPlanId;

  /** Čitateľný názov aktívneho balíka. */
  planName: string;

  /** Entitlement bol načítaný zo skutočného databázového záznamu. */
  hasDatabaseRecord: boolean;

  /** Databázové počítadlo je pripravené na serverové odpočítavanie. */
  trackingAvailable: boolean;

  /** Serverom potvrdený administrátorský účet. */
  isAdmin: boolean;

  /** Stránková kvóta sa na účet nevzťahuje. */
  isUnlimited: boolean;

  /** Serverom potvrdený neobmedzený prístup. */
  hasUnlimitedAccess: boolean;

  /** Základný limit strán z hlavného balíka. */
  basePageLimit: number | null;

  /** Súčet zakúpených navýšení Extra 20/40/60. */
  extraPageLimit: number;

  /** Celkový limit strán vrátane navýšení. */
  pageLimit: number | null;

  /** Počet spotrebovaných normostrán. */
  pagesUsed: number;

  /** Počet zostávajúcich normostrán. */
  pagesRemaining: number | null;

  /** Stránkový limit bol vyčerpaný. */
  pageLimitReached: boolean;

  /**
   * Celkový limit príloh.
   *
   * Je zámerne súčasťou výsledku, aby server aj profil vedeli overiť
   * pravidlo 1 strana = 1 príloha. Použité prílohy spravuje samostatný
   * modul lib/attachment-usage.ts.
   */
  attachmentLimit: number | null;

  /** Počet príloh navyše z Extra 20/40/60. */
  extraAttachmentLimit: number;
};

export type PageConsumptionDetails = {
  requestId: string;
  module: string;
  characterCount: number;
  pagesConsumed: number;
};

export type PageQuotaConsumptionResult = PageQuota & {
  consumption: PageConsumptionDetails;
};

export type ConsumePageQuotaInput = {
  /** Finálny text, ktorý bol úspešne vygenerovaný. */
  text: string;

  /** Modul alebo operácia, ktorá vytvorila text. */
  module: PageUsageModule;

  /**
   * Stabilný a jedinečný identifikátor jednej generácie.
   *
   * Pri retry rovnakej serverovej požiadavky musí zostať rovnaký.
   * Databázová RPC funkcia ho používa na ochranu pred dvojitým odpočtom.
   */
  requestId: string;
};

export type ConsumeMultiplePageOutputsInput = {
  /**
   * Textové časti jedného výsledku, napríklad:
   * - sumár analýzy,
   * - interpretácia,
   * - odporúčania,
   * - záver.
   *
   * Všetky časti sa spoja a odpočítajú ako jedna generácia.
   */
  outputs: Array<string | null | undefined>;

  module: PageUsageModule;
  requestId: string;
};

export type OutputTokenLimitOptions = {
  isUnlimited?: boolean;
  hasUnlimitedAccess?: boolean;
};

export type PageCapacityCheck = {
  requestedPages: number;
  allowed: boolean;
  pagesRemaining: number | null;
  isUnlimited: boolean;
};

type RpcBalanceRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;

  used_pages?: unknown;
  pages_used?: unknown;

  total_pages?: unknown;
  page_limit?: unknown;

  remaining_pages?: unknown;
  pages_remaining?: unknown;

  limit_reached?: unknown;
  page_limit_reached?: unknown;

  is_admin?: unknown;
  admin_access?: unknown;
  has_unlimited_access?: unknown;

  consumed_pages?: unknown;
  pages_consumed?: unknown;

  already_counted?: unknown;
  was_already_counted?: unknown;
};

type PageUsageDatabaseRow = {
  used_pages?: unknown;
  pages_used?: unknown;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const DEFAULT_PLAN_ID: PagePlanId = 'free';
const DEFAULT_MODULE = 'unknown';
const MAX_MODULE_LENGTH = 100;
const MAX_REQUEST_ID_LENGTH = 255;

export const PAGE_QUOTA_PURCHASE_URL =
  '/pricing#doplnkove-sluzby';

export const PAGE_QUOTA_EXHAUSTED_MESSAGE =
  'Limit dostupných strán bol vyčerpaný. ' +
  'Na pokračovanie si dokúpte Extra 20, Extra 40 alebo Extra 60 strán. ' +
  'Každá dokúpená strana zároveň pridá jednu ďalšiu prílohu.';

/**
 * Obchodná chyba pri vyčerpaní strán alebo pri výstupe, ktorý sa už
 * nezmestí do zostávajúcej kvóty.
 */
export class PageLimitError extends Error {
  readonly code = 'PAGE_LIMIT_REACHED';
  readonly quotaCode = 'PROJECT_QUOTA_EXHAUSTED';
  readonly status = 402;
  readonly purchaseUrl = PAGE_QUOTA_PURCHASE_URL;

  readonly pageLimit: number | null;
  readonly pagesUsed: number;
  readonly pagesRemaining: number | null;
  readonly requestedPages: number;

  constructor({
    message = PAGE_QUOTA_EXHAUSTED_MESSAGE,
    pageLimit = null,
    pagesUsed = 0,
    pagesRemaining = 0,
    requestedPages = 0,
  }: {
    message?: string;
    pageLimit?: number | null;
    pagesUsed?: number;
    pagesRemaining?: number | null;
    requestedPages?: number;
  } = {}) {
    super(message);

    this.name = 'PageLimitError';
    this.pageLimit =
      pageLimit === null
        ? null
        : toSafeInteger(pageLimit, 0);
    this.pagesUsed = toSafeInteger(pagesUsed, 0);
    this.pagesRemaining =
      pagesRemaining === null
        ? null
        : toSafeInteger(pagesRemaining, 0);
    this.requestedPages =
      toSafeInteger(requestedPages, 0);

    Object.setPrototypeOf(
      this,
      PageLimitError.prototype,
    );
  }
}

/**
 * Technická chyba evidencie strán.
 *
 * Pri obmedzenom účte sa generovanie nesmie vykonať bez funkčného
 * serverového počítadla, pretože by sa dala obísť kvóta.
 */
export class PageQuotaUnavailableError extends Error {
  readonly code = 'PAGE_QUOTA_UNAVAILABLE';
  readonly status = 503;

  constructor(
    message =
      'Počítadlo strán momentálne nie je dostupné. Skúste požiadavku zopakovať.',
  ) {
    super(message);

    this.name = 'PageQuotaUnavailableError';

    Object.setPrototypeOf(
      this,
      PageQuotaUnavailableError.prototype,
    );
  }
}

function toSafeInteger(
  value: unknown,
  fallback = 0,
): number {
  const safeFallback = Number.isFinite(fallback)
    ? Math.max(Math.trunc(fallback), 0)
    : 0;

  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' &&
      value.trim() === '')
  ) {
    return safeFallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }

  return Math.min(
    Math.max(Math.trunc(parsed), 0),
    Number.MAX_SAFE_INTEGER,
  );
}

function toOptionalSafeInteger(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' &&
      value.trim() === '')
  ) {
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
    const normalized =
      value.trim().toLowerCase();

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

function normalizePlanId(
  value: unknown,
): PageQuotaPlanId {
  const normalized =
    String(value ?? '').trim();

  return normalized || DEFAULT_PLAN_ID;
}

function normalizeModule(
  module: PageUsageModule,
): string {
  const normalized =
    String(module ?? '').trim();

  if (!normalized) {
    return DEFAULT_MODULE;
  }

  return normalized.slice(0, MAX_MODULE_LENGTH);
}

function normalizeRequestId(
  requestId: string,
): string {
  const normalized = String(requestId ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, MAX_REQUEST_ID_LENGTH);

  if (!normalized) {
    throw new Error(
      'INVALID_REQUEST_ID: requestId je povinný a musí obsahovať platné znaky.',
    );
  }

  return normalized;
}

/**
 * Normalizácia zachováva medzery aj odseky, pretože normostrana sa počíta
 * zo znakov vrátane medzier. Odstraňujú sa iba technické neviditeľné znaky
 * a zjednotia sa konce riadkov.
 */
export function normalizeGeneratedText(
  text: string,
): string {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .trim();
}

export function countGeneratedCharacters(
  text: string,
): number {
  return normalizeGeneratedText(text).length;
}

export function countPagesFromCharacters(
  characterCount: number,
): number {
  const safeCharacterCount =
    toSafeInteger(characterCount, 0);

  if (safeCharacterCount <= 0) {
    return 0;
  }

  return Math.max(
    Math.ceil(
      safeCharacterCount /
        CHARACTERS_PER_PAGE,
    ),
    1,
  );
}

/**
 * 0 znakov = 0 strán
 * 1 až 1 800 znakov = 1 strana
 * 1 801 až 3 600 znakov = 2 strany
 */
export function countGeneratedPages(
  text: string,
): number {
  return countPagesFromCharacters(
    countGeneratedCharacters(text),
  );
}

/**
 * Spojí viaceré textové časti jedného výsledku.
 *
 * Použitie pri analýze dát zabráni tomu, aby sa rovnaká analýza účtovala
 * osobitne za sumár, interpretáciu, odporúčania a záver.
 */
export function combineGeneratedOutputs(
  outputs: Array<
    string | null | undefined
  >,
): string {
  return outputs
    .map((value) =>
      normalizeGeneratedText(
        String(value ?? ''),
      ),
    )
    .filter(Boolean)
    .join('\n\n');
}

function isRpcBalanceRow(
  value: unknown,
): value is RpcBalanceRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getDatabaseErrorMessage(
  error: {
    message?: string | null;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  },
): string {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ]
    .filter(
      (value): value is string =>
        typeof value === 'string' &&
        value.trim().length > 0,
    )
    .join(' | ');
}

function isMissingDatabaseObjectError(
  error: {
    message?: string | null;
    code?: string | null;
  },
): boolean {
  const code =
    String(error.code || '').toUpperCase();
  const message =
    String(error.message || '');

  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    /does not exist|could not find|schema cache|relation|column/i.test(
      message,
    )
  );
}

function hasAuthoritativeUnlimitedAccess(
  entitlements: CurrentEntitlements,
): boolean {
  return (
    entitlements.isAdmin === true ||
    entitlements.hasUnlimitedAccess === true ||
    entitlements.planId === 'admin'
  );
}

function createAdminPageQuota(
  entitlements?: Partial<CurrentEntitlements>,
): PageQuota {
  return {
    planId: 'admin',
    planName:
      entitlements?.planName ||
      PLANS.admin.name,

    hasDatabaseRecord:
      entitlements?.hasDatabaseRecord ??
      true,
    trackingAvailable: true,

    isAdmin: true,
    isUnlimited: true,
    hasUnlimitedAccess: true,

    basePageLimit: null,
    extraPageLimit: 0,
    pageLimit: null,

    pagesUsed: 0,
    pagesRemaining: null,
    pageLimitReached: false,

    attachmentLimit: null,
    extraAttachmentLimit: 0,
  };
}

function validateCatalogParity({
  planId,
  addonIds,
  pageLimit,
  attachmentLimit,
}: {
  planId: PlanId;
  addonIds: readonly AddonId[];
  pageLimit: number | null;
  attachmentLimit: number | null;
}): void {
  const catalogPageLimit =
    getTotalPageLimit(
      planId,
      addonIds,
    );

  const catalogAttachmentLimit =
    getTotalAttachmentLimit(
      planId,
      addonIds,
    );

  if (
    catalogPageLimit !==
      catalogAttachmentLimit ||
    pageLimit !== attachmentLimit
  ) {
    throw new Error(
      [
        'PAGE_ATTACHMENT_LIMIT_MISMATCH',
        `plan=${planId}`,
        `catalogPages=${String(
          catalogPageLimit,
        )}`,
        `catalogAttachments=${String(
          catalogAttachmentLimit,
        )}`,
        `effectivePages=${String(
          pageLimit,
        )}`,
        `effectiveAttachments=${String(
          attachmentLimit,
        )}`,
      ].join(': '),
    );
  }
}

function createQuotaFromEntitlements({
  entitlements,
  pagesUsed,
  trackingAvailable,
}: {
  entitlements: CurrentEntitlements;
  pagesUsed: number;
  trackingAvailable: boolean;
}): PageQuota {
  if (
    hasAuthoritativeUnlimitedAccess(
      entitlements,
    )
  ) {
    return createAdminPageQuota(
      entitlements,
    );
  }

  const pageLimit =
    entitlements.pageLimit;

  const attachmentLimit =
    entitlements.attachmentLimit;

  if (
    pageLimit === null ||
    attachmentLimit === null
  ) {
    throw new Error(
      'PAGE_QUOTA_STATE_INVALID: Bežný používateľ má neplatný nullable limit.',
    );
  }

  validateCatalogParity({
    planId: entitlements.planId,
    addonIds: entitlements.addonIds,
    pageLimit,
    attachmentLimit,
  });

  const safePagesUsed =
    toSafeInteger(pagesUsed, 0);

  const pagesRemaining = Math.max(
    pageLimit - safePagesUsed,
    0,
  );

  return {
    planId: entitlements.planId,
    planName: entitlements.planName,

    hasDatabaseRecord:
      entitlements.hasDatabaseRecord,
    trackingAvailable,

    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,

    basePageLimit:
      entitlements.basePageLimit,
    extraPageLimit:
      entitlements.extraPageLimit,
    pageLimit,

    pagesUsed: safePagesUsed,
    pagesRemaining,
    pageLimitReached:
      pageLimit <= 0 ||
      safePagesUsed >= pageLimit ||
      pagesRemaining <= 0,

    attachmentLimit,
    extraAttachmentLimit:
      entitlements.extraAttachmentLimit,
  };
}

/**
 * Načíta iba aktuálny počet použitých strán.
 *
 * Obchodné limity sa nikdy nepreberajú z view alebo RPC. Autoritatívnym
 * zdrojom je aktuálny katalóg a getCurrentEntitlements().
 */
async function loadLatestPagesUsed({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<number | null> {
  const balanceVariants = [
    ['used_pages'],
    ['pages_used'],
    ['used_pages', 'pages_used'],
  ] as const;

  for (const columns of balanceVariants) {
    const result = await supabase
      .from('zedpera_page_balances')
      .select(columns.join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (!result.error) {
      const row =
        result.data as PageUsageDatabaseRow | null;

      if (!row) {
        break;
      }

      return toOptionalSafeInteger(
        row.used_pages ??
          row.pages_used,
      ) ?? 0;
    }

    if (
      !isMissingDatabaseObjectError(
        result.error,
      )
    ) {
      throw new PageQuotaUnavailableError(
        getDatabaseErrorMessage(
          result.error,
        ) ||
          'Počet použitých strán sa nepodarilo načítať.',
      );
    }

    const errorCode =
      String(
        result.error.code || '',
      ).toUpperCase();

    if (
      errorCode === '42P01' ||
      errorCode === 'PGRST205'
    ) {
      break;
    }
  }

  const entitlementVariants = [
    ['pages_used'],
    ['used_pages'],
  ] as const;

  for (
    const columns of entitlementVariants
  ) {
    const result = await supabase
      .from('zedpera_user_entitlements')
      .select(columns.join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (!result.error) {
      const row =
        result.data as PageUsageDatabaseRow | null;

      return toOptionalSafeInteger(
        row?.pages_used ??
          row?.used_pages,
      ) ?? 0;
    }

    if (
      !isMissingDatabaseObjectError(
        result.error,
      )
    ) {
      throw new PageQuotaUnavailableError(
        getDatabaseErrorMessage(
          result.error,
        ) ||
          'Počet použitých strán sa nepodarilo načítať.',
      );
    }
  }

  return null;
}

/**
 * Maximálny počet tokenov, ktorý smie model vygenerovať pri aktuálnom
 * zostatku strán.
 */
export function getOutputTokenLimit(
  remainingPages:
    | number
    | null
    | undefined,
  requestedTokenLimit: number,
  options: OutputTokenLimitOptions = {},
): number {
  const safeRequestedTokenLimit =
    toSafeInteger(
      requestedTokenLimit,
      0,
    );

  if (
    safeRequestedTokenLimit <= 0
  ) {
    return 0;
  }

  if (
    options.isUnlimited === true ||
    options.hasUnlimitedAccess === true ||
    remainingPages === null
  ) {
    return safeRequestedTokenLimit;
  }

  const safeRemainingPages =
    toSafeInteger(
      remainingPages,
      0,
    );

  if (safeRemainingPages <= 0) {
    return 0;
  }

  const quotaTokenLimit = Math.min(
    safeRemainingPages *
      TOKENS_PER_PAGE,
    Number.MAX_SAFE_INTEGER,
  );

  return Math.min(
    safeRequestedTokenLimit,
    quotaTokenLimit,
  );
}

export function getOutputTokenLimitForQuota(
  quota: PageQuota,
  requestedTokenLimit: number,
): number {
  return getOutputTokenLimit(
    quota.pagesRemaining,
    requestedTokenLimit,
    {
      isUnlimited:
        isUnlimitedPageQuota(quota),
    },
  );
}

export function isUnlimitedPageQuota(
  quota: Pick<
    PageQuota,
    | 'planId'
    | 'isAdmin'
    | 'isUnlimited'
    | 'hasUnlimitedAccess'
  >,
): boolean {
  return (
    quota.isAdmin === true ||
    quota.isUnlimited === true ||
    quota.hasUnlimitedAccess === true ||
    quota.planId === 'admin'
  );
}

/**
 * Načíta aktuálnu stránkovú kvótu prihláseného používateľa.
 */
export async function getCurrentPageQuota(): Promise<PageQuota> {
  const entitlements =
    await getCurrentEntitlements();

  if (
    hasAuthoritativeUnlimitedAccess(
      entitlements,
    )
  ) {
    return createAdminPageQuota(
      entitlements,
    );
  }

  const supabase =
    await createSupabaseServerClient();

  let latestPagesUsed:
    | number
    | null = null;

  try {
    latestPagesUsed =
      await loadLatestPagesUsed({
        supabase,
        userId: entitlements.userId,
      });
  } catch (error) {
    if (
      error instanceof
      PageQuotaUnavailableError
    ) {
      /**
       * Entitlement už obsahuje pagesUsed. Pri zobrazení profilu preto
       * môžeme vrátiť posledný známy stav, ale označíme ho ako nedostupné
       * live počítadlo. Spotreba strán sa pri trackingAvailable=false
       * neskôr zablokuje.
       */
      return createQuotaFromEntitlements({
        entitlements,
        pagesUsed:
          entitlements.pagesUsed,
        trackingAvailable: false,
      });
    }

    throw error;
  }

  const pagesUsed = Math.max(
    entitlements.pagesUsed,
    latestPagesUsed ?? 0,
  );

  return createQuotaFromEntitlements({
    entitlements,
    pagesUsed,
    trackingAvailable:
      entitlements.hasDatabaseRecord &&
      latestPagesUsed !== null,
  });
}

/**
 * Overí dostupnosť aspoň jednej ďalšej strany.
 */
export async function requireAvailablePages(): Promise<PageQuota> {
  const quota =
    await getCurrentPageQuota();

  if (
    isUnlimitedPageQuota(quota)
  ) {
    return quota;
  }

  if (!quota.trackingAvailable) {
    throw new PageQuotaUnavailableError();
  }

  if (
    quota.pageLimitReached ||
    quota.pagesRemaining === null ||
    quota.pagesRemaining <= 0
  ) {
    throw new PageLimitError({
      pageLimit: quota.pageLimit,
      pagesUsed: quota.pagesUsed,
      pagesRemaining:
        quota.pagesRemaining,
    });
  }

  return quota;
}

/**
 * Overí, či sa plánovaný počet strán zmestí do aktuálneho zostatku.
 */
export async function requirePageCapacity(
  requestedPages: number,
): Promise<PageQuota> {
  const quota =
    await requireAvailablePages();

  if (
    isUnlimitedPageQuota(quota)
  ) {
    return quota;
  }

  const safeRequestedPages =
    toSafeInteger(
      requestedPages,
      0,
    );

  if (safeRequestedPages <= 0) {
    return quota;
  }

  const remaining =
    quota.pagesRemaining ?? 0;

  if (
    safeRequestedPages > remaining
  ) {
    throw new PageLimitError({
      message:
        `Požadovaný výstup potrebuje približne ${safeRequestedPages} strán, ` +
        `ale v balíku zostáva ${remaining}. ` +
        'Na pokračovanie si dokúpte Extra 20, Extra 40 alebo Extra 60 strán. ' +
        'Každá dokúpená strana zároveň pridá jednu ďalšiu prílohu.',
      pageLimit: quota.pageLimit,
      pagesUsed: quota.pagesUsed,
      pagesRemaining: remaining,
      requestedPages:
        safeRequestedPages,
    });
  }

  return quota;
}

export async function checkPageCapacity(
  requestedPages: number,
): Promise<PageCapacityCheck> {
  const quota =
    await getCurrentPageQuota();

  const isUnlimited =
    isUnlimitedPageQuota(quota);

  const safeRequestedPages =
    toSafeInteger(
      requestedPages,
      0,
    );

  return {
    requestedPages:
      safeRequestedPages,
    allowed:
      isUnlimited ||
      (
        quota.trackingAvailable &&
        (quota.pagesRemaining ?? 0) >=
          safeRequestedPages
      ),
    pagesRemaining:
      quota.pagesRemaining,
    isUnlimited,
  };
}

async function consumeNormalizedOutput({
  normalizedText,
  module,
  requestId,
}: {
  normalizedText: string;
  module: PageUsageModule;
  requestId: string;
}): Promise<PageQuotaConsumptionResult> {
  const characterCount =
    normalizedText.length;
  const pages =
    countPagesFromCharacters(
      characterCount,
    );

  const currentQuota =
    await getCurrentPageQuota();

  const safeModule =
    normalizeModule(module);
  const safeRequestId =
    normalizeRequestId(requestId);

  if (
    pages <= 0
  ) {
    return {
      ...currentQuota,
      consumption: {
        requestId: safeRequestId,
        module: safeModule,
        characterCount: 0,
        pagesConsumed: 0,
      },
    };
  }

  if (
    isUnlimitedPageQuota(
      currentQuota,
    )
  ) {
    return {
      ...createAdminPageQuota(),
      consumption: {
        requestId: safeRequestId,
        module: safeModule,
        characterCount,
        pagesConsumed: 0,
      },
    };
  }

  if (
    !currentQuota.trackingAvailable ||
    !currentQuota.hasDatabaseRecord
  ) {
    throw new PageQuotaUnavailableError(
      'Používateľský účet nemá pripravené spoľahlivé databázové počítadlo strán.',
    );
  }

  if (
    currentQuota.pageLimit === null ||
    currentQuota.pagesRemaining === null
  ) {
    throw new PageQuotaUnavailableError(
      'Bežný používateľ má neplatný stav stránkovej kvóty.',
    );
  }

  if (
    currentQuota.pageLimitReached ||
    pages >
      currentQuota.pagesRemaining
  ) {
    throw new PageLimitError({
      message:
        pages >
        currentQuota.pagesRemaining
          ? `Vygenerovaný výstup má ${pages} strán, ale zostáva iba ${currentQuota.pagesRemaining}. ` +
            'Na pokračovanie si dokúpte Extra 20, Extra 40 alebo Extra 60 strán. ' +
            'Každá dokúpená strana zároveň pridá jednu ďalšiu prílohu.'
          : PAGE_QUOTA_EXHAUSTED_MESSAGE,
      pageLimit:
        currentQuota.pageLimit,
      pagesUsed:
        currentQuota.pagesUsed,
      pagesRemaining:
        currentQuota.pagesRemaining,
      requestedPages: pages,
    });
  }

  const supabase =
    await createSupabaseServerClient();

  const { data, error } =
    await supabase.rpc(
      'zedpera_consume_pages',
      {
        p_pages: pages,
        p_module: safeModule,
        p_request_id:
          safeRequestId,
        p_character_count:
          characterCount,
      },
    );

  if (error) {
    const databaseMessage =
      getDatabaseErrorMessage(error);
    const normalizedMessage =
      databaseMessage.toUpperCase();

    if (
      normalizedMessage.includes(
        'PAGE_LIMIT_REACHED',
      ) ||
      normalizedMessage.includes(
        'PROJECT_QUOTA_EXHAUSTED',
      )
    ) {
      const latest =
        await getCurrentPageQuota();

      throw new PageLimitError({
        pageLimit:
          latest.pageLimit,
        pagesUsed:
          latest.pagesUsed,
        pagesRemaining:
          latest.pagesRemaining,
        requestedPages: pages,
      });
    }

    if (
      normalizedMessage.includes(
        'UNAUTHENTICATED',
      )
    ) {
      throw new Error(
        `UNAUTHENTICATED: ${
          databaseMessage ||
          'Používateľ nie je prihlásený.'
        }`,
      );
    }

    if (
      normalizedMessage.includes(
        'ENTITLEMENTS_NOT_FOUND',
      ) ||
      normalizedMessage.includes(
        'ENTITLEMENT_NOT_FOUND',
      )
    ) {
      throw new PageQuotaUnavailableError(
        databaseMessage ||
          'Používateľ nemá vytvorený databázový záznam oprávnení.',
      );
    }

    throw new PageQuotaUnavailableError(
      databaseMessage ||
        'Nepodarilo sa odpočítať spotrebované strany.',
    );
  }

  const rawRow =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    rawRow !== null &&
    rawRow !== undefined &&
    !isRpcBalanceRow(rawRow)
  ) {
    throw new PageQuotaUnavailableError(
      'Funkcia zedpera_consume_pages nevrátila platný stav kvóty.',
    );
  }

  if (
    rawRow &&
    (
      toSafeBoolean(
        rawRow.is_admin,
        false,
      ) ||
      toSafeBoolean(
        rawRow.admin_access,
        false,
      ) ||
      toSafeBoolean(
        rawRow.has_unlimited_access,
        false,
      ) ||
      normalizePlanId(
        rawRow.plan_id,
      ) === 'admin'
    )
  ) {
    const latestEntitlements =
      await getCurrentEntitlements();

    if (
      hasAuthoritativeUnlimitedAccess(
        latestEntitlements,
      )
    ) {
      return {
        ...createAdminPageQuota(
          latestEntitlements,
        ),
        consumption: {
          requestId:
            safeRequestId,
          module: safeModule,
          characterCount,
          pagesConsumed: 0,
        },
      };
    }

    throw new PageQuotaUnavailableError(
      'RPC vrátila administrátorský stav, ktorý nepotvrdili serverové oprávnenia.',
    );
  }

  /**
   * Po úspešnom RPC sa stav znovu načíta z autoritatívneho serverového
   * počítadla. Tým sa správne spracuje aj opakovaný requestId, ktorý RPC
   * vďaka idempotencii nesmie odpočítať druhýkrát.
   */
  const refreshedQuota =
    await getCurrentPageQuota();

  if (
    !isUnlimitedPageQuota(
      refreshedQuota,
    ) &&
    (
      refreshedQuota.pageLimit ===
        null ||
      refreshedQuota.pagesRemaining ===
        null ||
      refreshedQuota.pagesUsed >
        refreshedQuota.pageLimit
    )
  ) {
    throw new PageQuotaUnavailableError(
      'Databáza po odpočítaní vrátila nekonzistentný stav stránkovej kvóty.',
    );
  }

  return {
    ...refreshedQuota,
    consumption: {
      requestId: safeRequestId,
      module: safeModule,
      characterCount,
      pagesConsumed: pages,
    },
  };
}

/**
 * Odpočíta počet strán za jeden úspešne vygenerovaný text.
 *
 * Funkciu volajte iba raz po dokončení celej generácie. Pri streamovaní
 * sa nesmie volať pre jednotlivé chunky.
 */
export async function consumePagesForOutput({
  text,
  module,
  requestId,
}: ConsumePageQuotaInput): Promise<PageQuotaConsumptionResult> {
  const normalizedText =
    normalizeGeneratedText(text);

  return consumeNormalizedOutput({
    normalizedText,
    module,
    requestId,
  });
}

/**
 * Odpočíta viac textových častí jedného výsledku ako jednu generáciu.
 *
 * Určené najmä pre Analýzu dát.
 */
export async function consumePagesForOutputs({
  outputs,
  module,
  requestId,
}: ConsumeMultiplePageOutputsInput): Promise<PageQuotaConsumptionResult> {
  return consumeNormalizedOutput({
    normalizedText:
      combineGeneratedOutputs(
        outputs,
      ),
    module,
    requestId,
  });
}

/**
 * JSON bezpečné telo chyby pre API route.
 */
export function pageQuotaErrorResponse(
  error: unknown,
): {
  status: number;
  body: Record<string, unknown>;
} {
  if (
    error instanceof PageLimitError
  ) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        quotaCode:
          error.quotaCode,
        message: error.message,
        purchaseUrl:
          error.purchaseUrl,
        pageLimit:
          error.pageLimit,
        pagesUsed:
          error.pagesUsed,
        pagesRemaining:
          error.pagesRemaining,
        requestedPages:
          error.requestedPages,
      },
    };
  }

  if (
    error instanceof
    PageQuotaUnavailableError
  ) {
    return {
      status: error.status,
      body: {
        ok: false,
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      ok: false,
      code: 'PAGE_QUOTA_ERROR',
      message:
        'Kontrola stránkovej kvóty zlyhala.',
      ...(process.env.NODE_ENV !==
        'production'
        ? {
            detail:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : {}),
    },
  };
}

/**
 * Spätne kompatibilné aliasy používané existujúcimi API route súbormi.
 */
export const assertPageAvailable =
  requireAvailablePages;

export const consumeCurrentUserPages =
  consumePagesForOutput;

/**
 * Alternatívne explicitné názvy pre nové route súbory.
 */
export const getCurrentUserPageQuota =
  getCurrentPageQuota;

export const calculateGeneratedPages =
  countGeneratedPages;

export const consumeGeneratedTextPages =
  consumePagesForOutput;
