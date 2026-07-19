import { getCurrentEntitlements } from '@/lib/entitlements';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Priemerný počet znakov na jednu normostranu.
 *
 * Hodnota 1 800 znakov zodpovedá bežnej normostrane:
 * 30 riadkov × 60 znakov.
 */
export const CHARACTERS_PER_PAGE = 1_800;

/**
 * Orientačný maximálny počet tokenov na jednu generovanú stranu.
 *
 * Hodnota sa používa na obmedzenie výstupu AI ešte pred samotným
 * vygenerovaním textu.
 */
export const TOKENS_PER_PAGE = 650;

/**
 * Základné stránkové limity jednotlivých balíkov.
 *
 * Identifikátory musia zodpovedať hodnotám plan_id uloženým
 * v databáze a hodnotám v lib/billing/catalog.ts.
 */
export const PLAN_PAGE_LIMITS = {
  free: 3,
  'seminar-work': 15,
  'bachelor-thesis': 50,
  'master-thesis': 70,
} as const;

/**
 * Počet strán poskytovaný jednotlivými stránkovými doplnkami.
 */
export const ADDON_PAGE_AMOUNTS = {
  'extra-20': 20,
  'extra-40': 40,
  'extra-60': 60,
} as const;

export type PagePlanId = keyof typeof PLAN_PAGE_LIMITS;
export type PageAddonId = keyof typeof ADDON_PAGE_AMOUNTS;

/**
 * Jednotný serverový stav stránkovej kvóty.
 *
 * Pri administrátorovi:
 * - planId = 'admin',
 * - isAdmin = true,
 * - isUnlimited = true,
 * - hasUnlimitedAccess = true,
 * - všetky číselné hodnoty kvóty sú 0,
 * - pageLimitReached = false,
 * - stránky sa neodpočítavajú ani nezapisujú do logu spotreby.
 */
export type PageQuota = {
  /** Aktívny identifikátor balíka používateľa. */
  planId: string;

  /** Používateľ má administrátorské oprávnenie. */
  isAdmin: boolean;

  /** Stránkový limit sa na používateľa nevzťahuje. */
  isUnlimited: boolean;

  /** Používateľ má neobmedzený administrátorský prístup. */
  hasUnlimitedAccess: boolean;

  /** Počet strán zahrnutý v základnom balíku. */
  basePageLimit: number;

  /** Počet dodatočne zakúpených strán. */
  extraPageLimit: number;

  /** Celkový efektívny limit strán. */
  pageLimit: number;

  /** Počet už spotrebovaných strán. */
  pagesUsed: number;

  /** Počet zostávajúcich strán. */
  pagesRemaining: number;

  /** Informácia o tom, či bol limit vyčerpaný. */
  pageLimitReached: boolean;
};

export type ConsumePageQuotaInput = {
  /** Finálny text vygenerovaný AI. */
  text: string;

  /**
   * Modul, v ktorom bola spotreba vytvorená.
   *
   * Napríklad:
   * chat, humanizer, thesis, translation, defense, data-analysis.
   */
  module: string;

  /**
   * Jedinečný identifikátor požiadavky.
   *
   * Používa sa na ochranu proti dvojitému odpočítaniu strán
   * pri opakovanom odoslaní rovnakej požiadavky.
   */
  requestId: string;
};

/**
 * Voliteľné nastavenie výpočtu maximálneho počtu tokenov.
 */
export type OutputTokenLimitOptions = {
  /** Pri true sa vráti celý requestedTokenLimit bez stránkového obmedzenia. */
  isUnlimited?: boolean;
};

/**
 * Typ odpovede databázovej RPC funkcie zedpera_consume_pages.
 *
 * Podporované sú staršie aj novšie názvy databázových stĺpcov.
 */
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
};

type PageBalanceDatabaseRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;
  used_pages?: unknown;
  pages_used?: unknown;
  is_admin?: unknown;
};

type AdminEntitlement = {
  is_admin?: unknown;
  plan_id?: unknown;
};

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

const DEFAULT_PLAN_ID: PagePlanId = 'free';
const DEFAULT_MODULE = 'unknown';
const MAX_MODULE_LENGTH = 100;
const MAX_REQUEST_ID_LENGTH = 255;

/**
 * Chyba vyvolaná pri vyčerpaní stránkového limitu.
 */
export class PageLimitError extends Error {
  readonly code = 'PAGE_LIMIT_REACHED';
  readonly status = 402;

  constructor(
    message =
      'Stránkový limit bol vyčerpaný. Pre pokračovanie si dokúpte ďalšie strany alebo aktivujte vyšší balík.',
  ) {
    super(message);

    this.name = 'PageLimitError';

    Object.setPrototypeOf(this, PageLimitError.prototype);
  }
}

/**
 * Bezpečne prevedie ľubovoľnú hodnotu na nezáporné celé číslo.
 */
function toSafeInteger(value: unknown, fallback = 0): number {
  const safeFallback = Number.isFinite(fallback)
    ? Math.max(Math.trunc(fallback), 0)
    : 0;

  if (value === null || value === undefined) {
    return safeFallback;
  }

  if (typeof value === 'string' && value.trim() === '') {
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

/**
 * Bezpečne prevedie databázovú hodnotu na boolean.
 */
function toSafeBoolean(value: unknown, fallback = false): boolean {
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

/** Overí, či hodnota predstavuje známy identifikátor balíka. */
function isKnownPlanId(value: string): value is PagePlanId {
  return Object.prototype.hasOwnProperty.call(
    PLAN_PAGE_LIMITS,
    value,
  );
}

/** Normalizuje plan_id z databázy. */
function normalizePlanId(value: unknown): string {
  const normalized = String(value ?? '').trim();

  return normalized || DEFAULT_PLAN_ID;
}

/**
 * Administrátora určuje explicitný databázový príznak alebo plán admin.
 */
function isAdminEntitlement(
  entitlement: AdminEntitlement | null | undefined,
): boolean {
  const isAdmin =
    entitlement?.is_admin === true ||
    entitlement?.plan_id === 'admin';

  return isAdmin;
}

/** Vráti predvolený počet strán podľa plan_id. */
function getDefaultBasePageLimit(planId: string): number {
  if (isKnownPlanId(planId)) {
    return PLAN_PAGE_LIMITS[planId];
  }

  return PLAN_PAGE_LIMITS[DEFAULT_PLAN_ID];
}

/**
 * Normalizuje vygenerovaný text pred výpočtom strán.
 */
function normalizeGeneratedText(text: string): string {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Normalizuje názov modulu ukladaný do logu spotreby. */
function normalizeModule(module: string): string {
  const normalized = String(module ?? '').trim();

  if (!normalized) {
    return DEFAULT_MODULE;
  }

  return normalized.slice(0, MAX_MODULE_LENGTH);
}

/**
 * Overí a normalizuje requestId.
 */
function normalizeRequestId(requestId: string): string {
  const normalized = String(requestId ?? '').trim();

  if (!normalized) {
    throw new Error(
      'INVALID_REQUEST_ID: requestId je povinný.',
    );
  }

  if (normalized.length > MAX_REQUEST_ID_LENGTH) {
    throw new Error(
      `INVALID_REQUEST_ID: requestId môže obsahovať najviac ${MAX_REQUEST_ID_LENGTH} znakov.`,
    );
  }

  return normalized;
}

/** Overí, či je odpoveď RPC funkcie objekt. */
function isRpcBalanceRow(value: unknown): value is RpcBalanceRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Vytvorí predvolenú kvótu pre bezplatný balík.
 */
function createDefaultPageQuota(): PageQuota {
  const basePageLimit = PLAN_PAGE_LIMITS[DEFAULT_PLAN_ID];

  return {
    planId: DEFAULT_PLAN_ID,
    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,
    basePageLimit,
    extraPageLimit: 0,
    pageLimit: basePageLimit,
    pagesUsed: 0,
    pagesRemaining: basePageLimit,
    pageLimitReached: basePageLimit <= 0,
  };
}

/**
 * Vytvorí administrátorskú kvótu bez číselného limitu a spotreby.
 *
 * Nulové číselné hodnoty sú zámerné. Frontend a API majú stav
 * administrátora určovať cez isAdmin/isUnlimited/hasUnlimitedAccess,
 * nie cez porovnávanie pageLimit alebo pagesRemaining.
 */
function createAdminPageQuota(): PageQuota {
  return {
    planId: 'admin',

    isAdmin: true,
    isUnlimited: true,
    hasUnlimitedAccess: true,

    basePageLimit: 0,
    extraPageLimit: 0,
    pageLimit: 0,

    pagesUsed: 0,
    pagesRemaining: 0,
    pageLimitReached: false,
  };
}

/**
 * Prevedie databázovú odpoveď na jednotný objekt PageQuota.
 */
function mapBalance(
  row: RpcBalanceRow | null | undefined,
): PageQuota {
  if (!row) {
    return createDefaultPageQuota();
  }

  const planId = normalizePlanId(row.plan_id);

  const isAdmin = isAdminEntitlement({
    is_admin: row.is_admin,
    plan_id: planId,
  });

  if (isAdmin) {
    return createAdminPageQuota();
  }

  const defaultBasePageLimit = getDefaultBasePageLimit(planId);

  const basePageLimit = toSafeInteger(
    row.base_page_limit,
    defaultBasePageLimit,
  );

  const extraPageLimit = toSafeInteger(
    row.extra_page_limit,
    0,
  );

  const pagesUsed = toSafeInteger(
    row.used_pages ?? row.pages_used,
    0,
  );

  const calculatedPageLimit = basePageLimit + extraPageLimit;

  const rawPageLimit = row.total_pages ?? row.page_limit;

  const pageLimit =
    rawPageLimit === null || rawPageLimit === undefined
      ? calculatedPageLimit
      : toSafeInteger(rawPageLimit, calculatedPageLimit);

  const calculatedRemaining = Math.max(
    pageLimit - pagesUsed,
    0,
  );

  const rawRemaining =
    row.remaining_pages ?? row.pages_remaining;

  const databaseRemaining =
    rawRemaining === null || rawRemaining === undefined
      ? calculatedRemaining
      : toSafeInteger(rawRemaining, calculatedRemaining);

  /**
   * Databázová hodnota nesmie zvýšiť reálne dostupný zostatok.
   */
  const pagesRemaining = Math.min(
    databaseRemaining,
    calculatedRemaining,
  );

  const pageLimitReached =
    toSafeBoolean(row.limit_reached, false) ||
    toSafeBoolean(row.page_limit_reached, false) ||
    pageLimit <= 0 ||
    pagesUsed >= pageLimit ||
    pagesRemaining <= 0;

  return {
    planId,
    isAdmin: false,
    isUnlimited: false,
    hasUnlimitedAccess: false,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached,
  };
}

/**
 * Vytvorí čitateľnú správu zo Supabase/PostgreSQL chyby.
 */
function getDatabaseErrorMessage(error: {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
}): string {
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

/**
 * Rozpozná chybu chýbajúcej tabuľky, view alebo stĺpca.
 */
function isMissingDatabaseObjectError(error: {
  message?: string | null;
  code?: string | null;
}): boolean {
  const code = String(error.code || '').toUpperCase();
  const message = String(error.message || '');

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

/**
 * Načíta stránkový zostatok s podporou starej aj novej databázovej schémy.
 *
 * Poradie:
 * 1. public.zedpera_page_balances,
 * 2. public.zedpera_user_entitlements.
 */
async function loadPageBalance({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<PageBalanceDatabaseRow | null> {
  const balanceResult = await supabase
    .from('zedpera_page_balances')
    .select(
      [
        'plan_id',
        'base_page_limit',
        'extra_page_limit',
        'used_pages',
        'is_admin',
      ].join(', '),
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!balanceResult.error) {
    return balanceResult.data as PageBalanceDatabaseRow | null;
  }

  if (!isMissingDatabaseObjectError(balanceResult.error)) {
    throw new Error(
      `PAGE_QUOTA_LOAD_FAILED: ${
        getDatabaseErrorMessage(balanceResult.error) ||
        'Nepodarilo sa načítať stránkový limit.'
      }`,
    );
  }

  const entitlementResult = await supabase
    .from('zedpera_user_entitlements')
    .select(
      [
        'plan_id',
        'base_page_limit',
        'extra_page_limit',
        'pages_used',
        'is_admin',
      ].join(', '),
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (entitlementResult.error) {
    throw new Error(
      `PAGE_QUOTA_LOAD_FAILED: ${
        getDatabaseErrorMessage(entitlementResult.error) ||
        'Nepodarilo sa načítať stránkový limit.'
      }`,
    );
  }

  return entitlementResult.data as PageBalanceDatabaseRow | null;
}

/**
 * Vypočíta počet spotrebovaných strán podľa dĺžky textu.
 *
 * Príklady:
 * 0 znakov      = 0 strán
 * 1 znak        = 1 strana
 * 1 800 znakov  = 1 strana
 * 1 801 znakov  = 2 strany
 */
export function countGeneratedPages(text: string): number {
  const normalizedText = normalizeGeneratedText(text);

  if (!normalizedText) {
    return 0;
  }

  return Math.max(
    Math.ceil(
      normalizedText.length / CHARACTERS_PER_PAGE,
    ),
    1,
  );
}

/**
 * Vypočíta maximálny povolený počet výstupných tokenov.
 */
export function getOutputTokenLimit(
  remainingPages: number,
  requestedTokenLimit: number,
  options: OutputTokenLimitOptions = {},
): number {
  const safeRequestedTokenLimit = toSafeInteger(
    requestedTokenLimit,
    0,
  );

  if (safeRequestedTokenLimit <= 0) {
    return 0;
  }

  if (options.isUnlimited === true) {
    return safeRequestedTokenLimit;
  }

  const safeRemainingPages = toSafeInteger(
    remainingPages,
    0,
  );

  if (safeRemainingPages <= 0) {
    return 0;
  }

  const quotaTokenLimit = safeRemainingPages * TOKENS_PER_PAGE;

  return Math.min(
    safeRequestedTokenLimit,
    quotaTokenLimit,
  );
}

/**
 * Načíta aktuálnu stránkovú kvótu prihláseného používateľa.
 *
 * Administrátor sa identifikuje cez is_admin === true alebo
 * plan_id === 'admin' a okamžite dostane bypass bez výpočtu kvóty.
 */
export async function getCurrentPageQuota(): Promise<PageQuota> {
  const entitlements = await getCurrentEntitlements();

  const isAdmin = isAdminEntitlement({
    is_admin: entitlements.isAdmin,
    plan_id: entitlements.planId,
  });

  if (isAdmin) {
    return createAdminPageQuota();
  }

  const supabase = await createSupabaseServerClient();

  const data = await loadPageBalance({
    supabase,
    userId: entitlements.userId,
  });

  if (!data) {
    const basePageLimit = toSafeInteger(
      entitlements.basePageLimit,
      getDefaultBasePageLimit(entitlements.planId),
    );

    const extraPageLimit = toSafeInteger(
      entitlements.extraPageLimit,
      0,
    );

    const pagesUsed = toSafeInteger(
      entitlements.pagesUsed,
      0,
    );

    return mapBalance({
      plan_id: entitlements.planId,
      base_page_limit: basePageLimit,
      extra_page_limit: extraPageLimit,
      used_pages: pagesUsed,
      is_admin: entitlements.isAdmin,
    });
  }

  return mapBalance({
    plan_id: data.plan_id,
    base_page_limit: data.base_page_limit,
    extra_page_limit: data.extra_page_limit,
    used_pages: data.used_pages ?? data.pages_used,
    is_admin: data.is_admin,
  });
}

/**
 * Overí, či používateľ má k dispozícii aspoň jednu stranu.
 */
export async function requireAvailablePages(): Promise<PageQuota> {
  const quota = await getCurrentPageQuota();

  if (quota.isAdmin || quota.isUnlimited) {
    return quota;
  }

  if (
    quota.pageLimitReached ||
    quota.pagesRemaining <= 0
  ) {
    throw new PageLimitError();
  }

  return quota;
}

/**
 * Odpočíta počet strán spotrebovaných vygenerovaným výstupom.
 *
 * Administrátorovi sa RPC funkcia vôbec nevolá a stránky sa
 * neodpočítajú.
 */
export async function consumePagesForOutput({
  text,
  module,
  requestId,
}: ConsumePageQuotaInput): Promise<PageQuota> {
  const normalizedText = normalizeGeneratedText(text);

  /** Prázdny výstup nespotrebúva žiadne strany. */
  if (!normalizedText) {
    return getCurrentPageQuota();
  }

  const pages = countGeneratedPages(normalizedText);

  if (pages <= 0) {
    return getCurrentPageQuota();
  }

  /**
   * Administrátorský bypass musí prebehnúť pred normalizáciou údajov
   * pre zápis aj pred volaním RPC funkcie.
   */
  const currentQuota = await getCurrentPageQuota();

  if (currentQuota.isAdmin || currentQuota.isUnlimited) {
    return {
      ...currentQuota,
      pagesUsed: 0,
      pagesRemaining: 0,
      pageLimitReached: false,
    };
  }

  const safeModule = normalizeModule(module);
  const safeRequestId = normalizeRequestId(requestId);

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc(
    'zedpera_consume_pages',
    {
      p_pages: pages,
      p_module: safeModule,
      p_request_id: safeRequestId,
      p_character_count: normalizedText.length,
    },
  );

  if (error) {
    const databaseMessage = getDatabaseErrorMessage(error);
    const normalizedErrorMessage = databaseMessage.toUpperCase();

    if (
      normalizedErrorMessage.includes(
        'PAGE_LIMIT_REACHED',
      )
    ) {
      throw new PageLimitError();
    }

    if (
      normalizedErrorMessage.includes('UNAUTHENTICATED')
    ) {
      throw new Error(
        `UNAUTHENTICATED: ${
          databaseMessage || 'Používateľ nie je prihlásený.'
        }`,
      );
    }

    throw new Error(
      `PAGE_QUOTA_CONSUME_FAILED: ${
        databaseMessage ||
        'Nepodarilo sa odpočítať spotrebované strany.'
      }`,
    );
  }

  const rawRow = Array.isArray(data) ? data[0] : data;

  if (!isRpcBalanceRow(rawRow)) {
    throw new Error(
      'PAGE_QUOTA_CONSUME_EMPTY_RESPONSE: Funkcia zedpera_consume_pages nevrátila platný stav kvóty.',
    );
  }

  const quota = mapBalance(rawRow);

  /**
   * Ak RPC funkcia vráti is_admin === true alebo plan_id === 'admin',
   * výsledok sa bezpečne prevedie na administrátorský bypass.
   */
  if (quota.isAdmin || quota.isUnlimited) {
    return {
      ...quota,
      pagesUsed: 0,
      pagesRemaining: 0,
      pageLimitReached: false,
    };
  }

  /** Dodatočná bezpečnostná kontrola. */
  if (quota.pagesUsed > quota.pageLimit) {
    throw new PageLimitError(
      'Požadovaný výstup prekročil dostupný stránkový limit.',
    );
  }

  return quota;
}

/**
 * Spätné kompatibilné aliasy pre existujúce API route súbory.
 */
export const assertPageAvailable = requireAvailablePages;
export const consumeCurrentUserPages = consumePagesForOutput;
