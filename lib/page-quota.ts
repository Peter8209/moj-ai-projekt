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
 * - isAdmin = true,
 * - isUnlimited = true,
 * - pageLimitReached = false,
 * - stránky sa neodpočítavajú,
 * - pageLimit a pagesRemaining používajú bezpečnú vysokú číselnú hodnotu,
 *   aby zostali kompatibilné s existujúcim kódom, ktorý očakáva number.
 *
 * Frontend má pri isUnlimited === true zobrazovať text
 * „Neobmedzený administrátorský prístup“ namiesto číselnej hodnoty.
 */
export type PageQuota = {
  /** Aktívny identifikátor balíka používateľa. */
  planId: string;

  /** Používateľ má administrátorské oprávnenie. */
  isAdmin: boolean;

  /** Stránkový limit sa na používateľa nevzťahuje. */
  isUnlimited: boolean;

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
  admin_access?: unknown;
  is_unlimited?: unknown;
};

type PageBalanceDatabaseRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;
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

/**
 * Vysoká bezpečná číselná hodnota používaná pre administrátora.
 *
 * Number.MAX_SAFE_INTEGER zachová spätnú kompatibilitu s existujúcimi
 * miestami aplikácie, ktoré očakávajú number a vykonávajú porovnania.
 */
const UNLIMITED_NUMERIC_PAGE_VALUE = Number.MAX_SAFE_INTEGER;

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
    basePageLimit,
    extraPageLimit: 0,
    pageLimit: basePageLimit,
    pagesUsed: 0,
    pagesRemaining: basePageLimit,
    pageLimitReached: basePageLimit <= 0,
  };
}

/**
 * Vytvorí neobmedzenú kvótu pre administrátora.
 */
function createUnlimitedPageQuota({
  planId,
  basePageLimit,
  extraPageLimit,
  pagesUsed,
}: {
  planId: string;
  basePageLimit: number;
  extraPageLimit: number;
  pagesUsed: number;
}): PageQuota {
  return {
    planId,
    isAdmin: true,
    isUnlimited: true,
    basePageLimit: toSafeInteger(
      basePageLimit,
      getDefaultBasePageLimit(planId),
    ),
    extraPageLimit: toSafeInteger(extraPageLimit, 0),
    pageLimit: UNLIMITED_NUMERIC_PAGE_VALUE,
    pagesUsed: toSafeInteger(pagesUsed, 0),
    pagesRemaining: UNLIMITED_NUMERIC_PAGE_VALUE,
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

  const databaseAdmin =
    toSafeBoolean(row.is_admin, false) ||
    toSafeBoolean(row.admin_access, false) ||
    toSafeBoolean(row.is_unlimited, false);

  const planId = normalizePlanId(row.plan_id);
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

  if (databaseAdmin) {
    return createUnlimitedPageQuota({
      planId,
      basePageLimit,
      extraPageLimit,
      pagesUsed,
    });
  }

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

  /**
   * Pri administrátorskej vysokej hodnote nie je potrebné násobiť
   * Number.MAX_SAFE_INTEGER hodnotou TOKENS_PER_PAGE.
   */
  if (safeRemainingPages >= UNLIMITED_NUMERIC_PAGE_VALUE) {
    return safeRequestedTokenLimit;
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
 * Administrátor sa identifikuje cez lib/entitlements.ts a okamžite
 * dostane neobmedzenú kvótu bez kontroly databázového zostatku.
 */
export async function getCurrentPageQuota(): Promise<PageQuota> {
  const entitlements = await getCurrentEntitlements();

  if (
    entitlements.isAdmin ||
    entitlements.hasUnlimitedAccess
  ) {
    return createUnlimitedPageQuota({
      planId: entitlements.planId,
      basePageLimit: entitlements.basePageLimit,
      extraPageLimit: entitlements.extraPageLimit,
      pagesUsed: entitlements.pagesUsed,
    });
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
    });
  }

  return mapBalance({
    plan_id: data.plan_id,
    base_page_limit: data.base_page_limit,
    extra_page_limit: data.extra_page_limit,
    used_pages: data.used_pages ?? data.pages_used,
  });
}

/**
 * Overí, či používateľ má k dispozícii aspoň jednu stranu.
 */
export async function requireAvailablePages(): Promise<PageQuota> {
  const quota = await getCurrentPageQuota();

  if (quota.isUnlimited || quota.isAdmin) {
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

  const safeModule = normalizeModule(module);
  const safeRequestId = normalizeRequestId(requestId);

  /**
   * Najskôr overíme administrátorský stav. Administrátor nesmie
   * vstúpiť do databázovej spotreby strán.
   */
  const entitlements = await getCurrentEntitlements();

  if (
    entitlements.isAdmin ||
    entitlements.hasUnlimitedAccess
  ) {
    return createUnlimitedPageQuota({
      planId: entitlements.planId,
      basePageLimit: entitlements.basePageLimit,
      extraPageLimit: entitlements.extraPageLimit,
      pagesUsed: entitlements.pagesUsed,
    });
  }

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
   * Ak novšia RPC funkcia sama vráti admin_access/is_admin,
   * výsledok sa bezpečne prevedie na neobmedzenú kvótu.
   */
  if (quota.isUnlimited || quota.isAdmin) {
    return quota;
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
