import 'server-only';

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
 * Orientačný počet výstupných tokenov na jednu generovanú normostranu.
 *
 * Hodnota sa používa iba na predbežné obmedzenie maximálneho výstupu AI.
 * Skutočná spotreba strán sa po úspešnom vygenerovaní určuje podľa počtu
 * znakov vo finálnom texte.
 */
export const TOKENS_PER_PAGE = 650;

/**
 * Základné stránkové limity verejných balíkov.
 *
 * Interný plán admin tu zámerne nie je. Administrátor nemá číselný limit;
 * jeho neobmedzený stav sa vyjadruje hodnotou null v PageQuota.
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
export type PageQuotaPlanId = PagePlanId | 'admin' | string;

/**
 * Jednotný serverový stav stránkovej kvóty.
 *
 * Význam hodnoty null:
 * - basePageLimit: používateľ nemá základný číselný limit,
 * - pageLimit: používateľ nemá celkový číselný limit,
 * - pagesRemaining: zostatok sa nepočíta, pretože je neobmedzený.
 *
 * Pri administrátorovi musí vždy platiť:
 * - planId = 'admin',
 * - isAdmin = true,
 * - isUnlimited = true,
 * - hasUnlimitedAccess = true,
 * - basePageLimit = null,
 * - pageLimit = null,
 * - pagesRemaining = null,
 * - pageLimitReached = false,
 * - stránky sa neodpočítavajú a RPC zedpera_consume_pages sa nevolá.
 */
export type PageQuota = {
  /** Aktívny identifikátor balíka používateľa. */
  planId: PageQuotaPlanId;

  /** Používateľ má administrátorské oprávnenie. */
  isAdmin: boolean;

  /** Stránkový limit sa na používateľa nevzťahuje. */
  isUnlimited: boolean;

  /** Používateľ má neobmedzený serverový prístup. */
  hasUnlimitedAccess: boolean;

  /** Počet strán zahrnutý v základnom balíku; null = neobmedzené. */
  basePageLimit: number | null;

  /** Počet dodatočne zakúpených strán. */
  extraPageLimit: number;

  /** Celkový efektívny limit strán; null = neobmedzené. */
  pageLimit: number | null;

  /** Počet už spotrebovaných strán. Adminovi sa vráti 0. */
  pagesUsed: number;

  /** Počet zostávajúcich strán; null = neobmedzené. */
  pagesRemaining: number | null;

  /** Informácia o tom, či bol limit vyčerpaný. */
  pageLimitReached: boolean;
};

export type ConsumePageQuotaInput = {
  /** Finálny text vygenerovaný AI. */
  text: string;

  /**
   * Modul, v ktorom bola spotreba vytvorená.
   *
   * Príklady:
   * chat, humanizer, thesis, translation, defense, data-analysis.
   */
  module: string;

  /**
   * Jedinečný identifikátor požiadavky.
   *
   * Používa sa na ochranu proti dvojitému odpočítaniu strán pri opakovanom
   * odoslaní rovnakej požiadavky.
   */
  requestId: string;
};

/**
 * Voliteľné nastavenie výpočtu maximálneho počtu tokenov.
 */
export type OutputTokenLimitOptions = {
  /** Pri true sa vráti celý requestedTokenLimit bez stránkového obmedzenia. */
  isUnlimited?: boolean;

  /** Alternatívny názov používaný v niektorých starších API routach. */
  hasUnlimitedAccess?: boolean;
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
  has_unlimited_access?: unknown;
};

type PageBalanceDatabaseRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;
  used_pages?: unknown;
  pages_used?: unknown;
  is_admin?: unknown;
  has_unlimited_access?: unknown;
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
  readonly purchaseUrl = '/pricing';

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

/** Overí, či hodnota predstavuje známy verejný identifikátor balíka. */
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
 * Administrátorský bypass sa odvodzuje iba z autoritatívnych entitlementov.
 *
 * Databázový view alebo RPC výsledok nesmie sám udeliť administrátorské
 * oprávnenie používateľovi, ktorého getCurrentEntitlements() neoznačil ako
 * administrátora alebo používateľa s neobmedzeným prístupom.
 */
function hasAuthoritativeUnlimitedAccess(entitlements: {
  isAdmin?: unknown;
  hasUnlimitedAccess?: unknown;
  isUnlimited?: unknown;
  planId?: unknown;
}): boolean {
  return (
    toSafeBoolean(entitlements.isAdmin, false) ||
    toSafeBoolean(entitlements.hasUnlimitedAccess, false) ||
    toSafeBoolean(entitlements.isUnlimited, false) ||
    normalizePlanId(entitlements.planId) === 'admin'
  );
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
 *
 * Zachováva odseky, ale zjednotí konce riadkov a nadbytočné technické
 * medzery, aby rovnaký text nemal rozdielnu spotrebu podľa operačného systému.
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
 * Vytvorí administrátorskú kvótu bez číselného limitu a bez spotreby.
 */
function createAdminPageQuota(): PageQuota {
  return {
    planId: 'admin',

    isAdmin: true,
    isUnlimited: true,
    hasUnlimitedAccess: true,

    basePageLimit: null,
    extraPageLimit: 0,
    pageLimit: null,

    pagesUsed: 0,
    pagesRemaining: null,
    pageLimitReached: false,
  };
}

/**
 * Prevedie databázovú odpoveď na jednotný objekt PageQuota.
 *
 * Parameter authoritativeUnlimited je jediný spôsob, ktorým táto funkcia
 * vytvorí administrátorský výsledok. Hodnota is_admin z databázového view
 * alebo RPC sa používa iba na overenie konzistencie, nie na udelenie práv.
 */
function mapBalance(
  row: RpcBalanceRow | null | undefined,
  options: {
    authoritativeUnlimited?: boolean;
    fallbackPlanId?: string;
    fallbackBasePageLimit?: number;
    fallbackExtraPageLimit?: number;
    fallbackPagesUsed?: number;
  } = {},
): PageQuota {
  if (options.authoritativeUnlimited === true) {
    return createAdminPageQuota();
  }

  if (!row) {
    const fallbackPlanId = normalizePlanId(
      options.fallbackPlanId,
    );

    const basePageLimit = toSafeInteger(
      options.fallbackBasePageLimit,
      getDefaultBasePageLimit(fallbackPlanId),
    );

    const extraPageLimit = toSafeInteger(
      options.fallbackExtraPageLimit,
      0,
    );

    const pagesUsed = toSafeInteger(
      options.fallbackPagesUsed,
      0,
    );

    const pageLimit = basePageLimit + extraPageLimit;
    const pagesRemaining = Math.max(
      pageLimit - pagesUsed,
      0,
    );

    return {
      planId: fallbackPlanId,
      isAdmin: false,
      isUnlimited: false,
      hasUnlimitedAccess: false,
      basePageLimit,
      extraPageLimit,
      pageLimit,
      pagesUsed,
      pagesRemaining,
      pageLimitReached:
        pageLimit <= 0 ||
        pagesUsed >= pageLimit ||
        pagesRemaining <= 0,
    };
  }

  const planId = normalizePlanId(
    row.plan_id ?? options.fallbackPlanId,
  );

  const defaultBasePageLimit = toSafeInteger(
    options.fallbackBasePageLimit,
    getDefaultBasePageLimit(planId),
  );

  const basePageLimit = toSafeInteger(
    row.base_page_limit,
    defaultBasePageLimit,
  );

  const extraPageLimit = toSafeInteger(
    row.extra_page_limit,
    toSafeInteger(options.fallbackExtraPageLimit, 0),
  );

  const pagesUsed = toSafeInteger(
    row.used_pages ?? row.pages_used,
    toSafeInteger(options.fallbackPagesUsed, 0),
  );

  const calculatedPageLimit = basePageLimit + extraPageLimit;
  const rawPageLimit = row.total_pages ?? row.page_limit;

  const databasePageLimit =
    rawPageLimit === null || rawPageLimit === undefined
      ? calculatedPageLimit
      : toSafeInteger(rawPageLimit, calculatedPageLimit);

  /**
   * Databázový view alebo RPC nesmie znížiť súčet platného základného a
   * doplnkového limitu. Taká situácia môže vzniknúť pri oneskorenom refreshi
   * view po Stripe webhooku.
   */
  const pageLimit = Math.max(
    calculatedPageLimit,
    databasePageLimit,
  );

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
   * Databázová hodnota zostávajúcich strán nesmie zvýšiť matematicky
   * vypočítaný zostatok.
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
 *
 * Administrátorský stav sa z týchto tabuliek v tejto funkcii neurčuje.
 * Autoritatívnym zdrojom je getCurrentEntitlements().
 */
async function loadPageBalance({
  supabase,
  userId,
}: {
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<PageBalanceDatabaseRow | null> {
  const balanceSelectVariants = [
    [
      'plan_id',
      'base_page_limit',
      'extra_page_limit',
      'used_pages',
      'is_admin',
      'has_unlimited_access',
    ],
    [
      'plan_id',
      'base_page_limit',
      'extra_page_limit',
      'used_pages',
      'is_admin',
    ],
    [
      'plan_id',
      'base_page_limit',
      'extra_page_limit',
      'used_pages',
    ],
  ] as const;

  let balanceObjectMissing = false;

  for (const columns of balanceSelectVariants) {
    const balanceResult = await supabase
      .from('zedpera_page_balances')
      .select(columns.join(', '))
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

    const code = String(balanceResult.error.code || '').toUpperCase();

    if (code === '42P01' || code === 'PGRST205') {
      balanceObjectMissing = true;
      break;
    }
  }

  /**
   * Aj keď view existuje, ale nepodarilo sa načítať kompatibilný variant,
   * pokračujeme na autoritatívnu entitlement tabuľku.
   */
  void balanceObjectMissing;

  const entitlementSelectVariants = [
    [
      'plan_id',
      'base_page_limit',
      'extra_page_limit',
      'pages_used',
      'is_admin',
    ],
    [
      'plan_id',
      'base_page_limit',
      'extra_page_limit',
      'pages_used',
    ],
  ] as const;

  let lastMissingObjectMessage = '';

  for (const columns of entitlementSelectVariants) {
    const entitlementResult = await supabase
      .from('zedpera_user_entitlements')
      .select(columns.join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (!entitlementResult.error) {
      return entitlementResult.data as PageBalanceDatabaseRow | null;
    }

    if (!isMissingDatabaseObjectError(entitlementResult.error)) {
      throw new Error(
        `PAGE_QUOTA_LOAD_FAILED: ${
          getDatabaseErrorMessage(entitlementResult.error) ||
          'Nepodarilo sa načítať stránkový limit.'
        }`,
      );
    }

    lastMissingObjectMessage = getDatabaseErrorMessage(
      entitlementResult.error,
    );
  }

  throw new Error(
    `PAGE_QUOTA_SCHEMA_INCOMPATIBLE: ${
      lastMissingObjectMessage ||
      'Tabuľka zedpera_user_entitlements nemá očakávané stĺpce.'
    }`,
  );
}

/**
 * Vypočíta počet spotrebovaných strán podľa dĺžky finálneho textu.
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
 *
 * remainingPages === null znamená neobmedzený stav a preto sa vráti celý
 * requestedTokenLimit. Rovnaké správanie sa použije pri explicitnom
 * options.isUnlimited alebo options.hasUnlimitedAccess.
 */
export function getOutputTokenLimit(
  remainingPages: number | null | undefined,
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

  if (
    options.isUnlimited === true ||
    options.hasUnlimitedAccess === true ||
    remainingPages === null
  ) {
    return safeRequestedTokenLimit;
  }

  const safeRemainingPages = toSafeInteger(
    remainingPages,
    0,
  );

  if (safeRemainingPages <= 0) {
    return 0;
  }

  const quotaTokenLimit = Math.min(
    safeRemainingPages * TOKENS_PER_PAGE,
    Number.MAX_SAFE_INTEGER,
  );

  return Math.min(
    safeRequestedTokenLimit,
    quotaTokenLimit,
  );
}

/**
 * Overí, či kvóta predstavuje neobmedzený administrátorský stav.
 */
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
 *
 * Administrátorský bypass sa vykoná bezprostredne po načítaní entitlementov,
 * ešte pred databázovým view, výpočtom limitu alebo volaním RPC.
 */
export async function getCurrentPageQuota(): Promise<PageQuota> {
  const entitlements = await getCurrentEntitlements();

  const authoritativeUnlimited =
    hasAuthoritativeUnlimitedAccess(entitlements);

  if (authoritativeUnlimited) {
    return createAdminPageQuota();
  }

  const fallbackPlanId = normalizePlanId(
    entitlements.planId,
  );

  const fallbackBasePageLimit = toSafeInteger(
    entitlements.basePageLimit,
    getDefaultBasePageLimit(fallbackPlanId),
  );

  const fallbackExtraPageLimit = toSafeInteger(
    entitlements.extraPageLimit,
    0,
  );

  const fallbackPagesUsed = toSafeInteger(
    entitlements.pagesUsed,
    0,
  );

  const supabase = await createSupabaseServerClient();

  const data = await loadPageBalance({
    supabase,
    userId: entitlements.userId,
  });

  return mapBalance(
    data
      ? {
          plan_id: data.plan_id,
          base_page_limit: data.base_page_limit,
          extra_page_limit: data.extra_page_limit,
          used_pages:
            data.used_pages ?? data.pages_used,
          is_admin: data.is_admin,
          has_unlimited_access:
            data.has_unlimited_access,
        }
      : null,
    {
      authoritativeUnlimited: false,
      fallbackPlanId,
      fallbackBasePageLimit,
      fallbackExtraPageLimit,
      fallbackPagesUsed,
    },
  );
}

/**
 * Overí, či používateľ má k dispozícii aspoň jednu stranu.
 */
export async function requireAvailablePages(): Promise<PageQuota> {
  const quota = await getCurrentPageQuota();

  if (isUnlimitedPageQuota(quota)) {
    return quota;
  }

  if (
    quota.pageLimitReached ||
    quota.pagesRemaining === null ||
    quota.pagesRemaining <= 0
  ) {
    throw new PageLimitError();
  }

  return quota;
}

/**
 * Odpočíta počet strán spotrebovaných vygenerovaným výstupom.
 *
 * Administrátorovi sa RPC funkcia vôbec nevolá a stránky sa mu
 * neodpočítajú ani nezapíšu do logu spotreby.
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
   * Administrátorský bypass musí prebehnúť pred normalizáciou údajov pre
   * zápis a pred volaním RPC funkcie.
   */
  const currentQuota = await getCurrentPageQuota();

  if (isUnlimitedPageQuota(currentQuota)) {
    return createAdminPageQuota();
  }

  if (
    currentQuota.pagesRemaining === null ||
    currentQuota.pageLimit === null
  ) {
    throw new Error(
      'PAGE_QUOTA_STATE_INVALID: Bežný používateľ má neplatný nullable stránkový limit.',
    );
  }

  if (
    currentQuota.pageLimitReached ||
    pages > currentQuota.pagesRemaining
  ) {
    throw new PageLimitError(
      'Požadovaný výstup prekračuje počet zostávajúcich strán.',
    );
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

    if (
      normalizedErrorMessage.includes(
        'ENTITLEMENTS_NOT_FOUND',
      ) ||
      normalizedErrorMessage.includes(
        'ENTITLEMENT_NOT_FOUND',
      )
    ) {
      throw new Error(
        `PAGE_QUOTA_RECORD_MISSING: ${
          databaseMessage ||
          'Používateľ nemá vytvorený záznam stránkovej kvóty.'
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

  /**
   * RPC nesmie samostatne udeliť administrátorské oprávnenie. Ak tvrdí, že
   * používateľ je admin, stav sa znovu overí cez getCurrentEntitlements().
   */
  const rpcClaimsUnlimited =
    toSafeBoolean(rawRow.is_admin, false) ||
    toSafeBoolean(rawRow.admin_access, false) ||
    toSafeBoolean(
      rawRow.has_unlimited_access,
      false,
    ) ||
    normalizePlanId(rawRow.plan_id) === 'admin';

  if (rpcClaimsUnlimited) {
    const latestEntitlements =
      await getCurrentEntitlements();

    if (
      hasAuthoritativeUnlimitedAccess(
        latestEntitlements,
      )
    ) {
      return createAdminPageQuota();
    }

    throw new Error(
      'PAGE_QUOTA_ADMIN_STATE_MISMATCH: RPC vrátila administrátorský stav, ktorý nepotvrdili serverové entitlementy.',
    );
  }

  const quota = mapBalance(rawRow, {
    authoritativeUnlimited: false,
    fallbackPlanId: currentQuota.planId,
    fallbackBasePageLimit:
      currentQuota.basePageLimit ?? 0,
    fallbackExtraPageLimit:
      currentQuota.extraPageLimit,
    fallbackPagesUsed:
      currentQuota.pagesUsed + pages,
  });

  if (isUnlimitedPageQuota(quota)) {
    throw new Error(
      'PAGE_QUOTA_ADMIN_STATE_MISMATCH: Výsledok kvóty sa neočakávane zmenil na neobmedzený.',
    );
  }

  /** Dodatočná bezpečnostná kontrola. */
  if (
    quota.pageLimit === null ||
    quota.pagesRemaining === null ||
    quota.pagesUsed > quota.pageLimit
  ) {
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
