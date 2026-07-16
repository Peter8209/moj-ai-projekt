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
 * Táto hodnota slúži na obmedzenie výstupu AI ešte pred samotným
 * vygenerovaním textu.
 */
export const TOKENS_PER_PAGE = 650;

/**
 * Základné stránkové limity jednotlivých balíkov.
 *
 * Názvy musia zodpovedať hodnotám plan_id uloženým v databáze.
 */
export const PLAN_PAGE_LIMITS = {
  free: 3,
  'seminar-work': 15,
  'bachelor-thesis': 50,
  'master-thesis': 70,
} as const;

/**
 * Počet strán poskytovaný jednotlivými doplnkami.
 *
 * Názvy musia zodpovedať identifikátorom doplnkov používaným
 * v Stripe, databáze a billing katalógu.
 */
export const ADDON_PAGE_AMOUNTS = {
  'extra-20': 20,
  'extra-40': 40,
  'extra-60': 60,
} as const;

export type PagePlanId =
  keyof typeof PLAN_PAGE_LIMITS;

export type PageAddonId =
  keyof typeof ADDON_PAGE_AMOUNTS;

export type PageQuota = {
  /**
   * Aktívny identifikátor balíka používateľa.
   */
  planId: string;

  /**
   * Počet strán zahrnutý v základnom balíku.
   */
  basePageLimit: number;

  /**
   * Počet dodatočne zakúpených strán.
   */
  extraPageLimit: number;

  /**
   * Celkový počet dostupných strán.
   *
   * basePageLimit + extraPageLimit
   */
  pageLimit: number;

  /**
   * Počet už spotrebovaných strán.
   */
  pagesUsed: number;

  /**
   * Počet zostávajúcich strán.
   */
  pagesRemaining: number;

  /**
   * Informácia o tom, či bol limit vyčerpaný.
   */
  pageLimitReached: boolean;
};

export type ConsumePageQuotaInput = {
  /**
   * Finálny text vygenerovaný AI.
   */
  text: string;

  /**
   * Modul, v ktorom bola spotreba vytvorená.
   *
   * Napríklad:
   * chat
   * humanizer
   * thesis
   * translation
   * defense
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
 * Typ odpovede databázovej RPC funkcie zedpera_consume_pages.
 *
 * Hodnoty sú voliteľné, pretože databázový klient môže pri chybe
 * alebo neúplnej odpovedi vrátiť iba časť objektu.
 */
type RpcBalanceRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;
  used_pages?: unknown;
  total_pages?: unknown;
  remaining_pages?: unknown;
  limit_reached?: unknown;
};

type PageBalanceDatabaseRow = {
  plan_id?: unknown;
  base_page_limit?: unknown;
  extra_page_limit?: unknown;
  used_pages?: unknown;
};

type SupabaseServerClient =
  Awaited<
    ReturnType<
      typeof createSupabaseServerClient
    >
  >;

const DEFAULT_PLAN_ID: PagePlanId =
  'free';

const DEFAULT_MODULE = 'unknown';

const MAX_MODULE_LENGTH = 100;

const MAX_REQUEST_ID_LENGTH = 255;

/**
 * Chyba vyvolaná pri vyčerpaní stránkového limitu.
 *
 * HTTP status 402 umožňuje API route rozlíšiť, že používateľ
 * potrebuje vyšší balík alebo doplnkové strany.
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

    Object.setPrototypeOf(
      this,
      PageLimitError.prototype,
    );
  }
}

/**
 * Bezpečne prevedie ľubovoľnú hodnotu na nezáporné celé číslo.
 */
function toSafeInteger(
  value: unknown,
  fallback = 0,
): number {
  const safeFallback = Number.isFinite(
    fallback,
  )
    ? Math.max(
        Math.trunc(fallback),
        0,
      )
    : 0;

  if (
    value === null ||
    value === undefined
  ) {
    return safeFallback;
  }

  if (
    typeof value === 'string' &&
    value.trim() === ''
  ) {
    return safeFallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return safeFallback;
  }

  return Math.min(
    Math.max(
      Math.trunc(parsed),
      0,
    ),
    Number.MAX_SAFE_INTEGER,
  );
}

/**
 * Bezpečne prevedie databázovú hodnotu na boolean.
 *
 * Na rozdiel od Boolean('false') správne vyhodnotí aj textové
 * hodnoty "true" a "false".
 */
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

/**
 * Overí, či hodnota predstavuje známy identifikátor balíka.
 */
function isKnownPlanId(
  value: string,
): value is PagePlanId {
  return Object.prototype.hasOwnProperty.call(
    PLAN_PAGE_LIMITS,
    value,
  );
}

/**
 * Normalizuje plan_id z databázy.
 */
function normalizePlanId(
  value: unknown,
): string {
  const normalized =
    String(value ?? '').trim();

  return normalized || DEFAULT_PLAN_ID;
}

/**
 * Vráti predvolený počet strán podľa plan_id.
 */
function getDefaultBasePageLimit(
  planId: string,
): number {
  if (isKnownPlanId(planId)) {
    return PLAN_PAGE_LIMITS[planId];
  }

  return PLAN_PAGE_LIMITS[
    DEFAULT_PLAN_ID
  ];
}

/**
 * Normalizuje vygenerovaný text pred výpočtom strán.
 *
 * Zachováva odseky, ale odstraňuje nadbytočné medzery,
 * tabulátory a viacnásobné prázdne riadky.
 */
function normalizeGeneratedText(
  text: string,
): string {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalizuje názov modulu ukladaný do logu spotreby.
 */
function normalizeModule(
  module: string,
): string {
  const normalized =
    String(module ?? '').trim();

  if (!normalized) {
    return DEFAULT_MODULE;
  }

  return normalized.slice(
    0,
    MAX_MODULE_LENGTH,
  );
}

/**
 * Overí a normalizuje requestId.
 *
 * RequestId nesmie byť prázdny, pretože zabezpečuje idempotentnosť
 * databázovej RPC funkcie.
 */
function normalizeRequestId(
  requestId: string,
): string {
  const normalized =
    String(requestId ?? '').trim();

  if (!normalized) {
    throw new Error(
      'INVALID_REQUEST_ID: requestId je povinný.',
    );
  }

  if (
    normalized.length >
    MAX_REQUEST_ID_LENGTH
  ) {
    throw new Error(
      `INVALID_REQUEST_ID: requestId môže obsahovať najviac ${MAX_REQUEST_ID_LENGTH} znakov.`,
    );
  }

  return normalized;
}

/**
 * Overí, či je odpoveď RPC funkcie objekt.
 */
function isRpcBalanceRow(
  value: unknown,
): value is RpcBalanceRow {
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
  const basePageLimit =
    PLAN_PAGE_LIMITS[
      DEFAULT_PLAN_ID
    ];

  return {
    planId: DEFAULT_PLAN_ID,
    basePageLimit,
    extraPageLimit: 0,
    pageLimit: basePageLimit,
    pagesUsed: 0,
    pagesRemaining: basePageLimit,
    pageLimitReached:
      basePageLimit <= 0,
  };
}

/**
 * Prevedie databázovú odpoveď na jednotný objekt PageQuota.
 *
 * Výsledok je vždy konzistentný:
 *
 * pageLimit = základný limit + dodatočný limit
 * pagesRemaining nemôže byť záporné číslo
 * pagesRemaining nemôže byť vyššie než reálne vypočítaný zostatok
 */
function mapBalance(
  row: RpcBalanceRow | null | undefined,
): PageQuota {
  if (!row) {
    return createDefaultPageQuota();
  }

  const planId = normalizePlanId(
    row.plan_id,
  );

  const defaultBasePageLimit =
    getDefaultBasePageLimit(planId);

  const basePageLimit =
    toSafeInteger(
      row.base_page_limit,
      defaultBasePageLimit,
    );

  const extraPageLimit =
    toSafeInteger(
      row.extra_page_limit,
      0,
    );

  const calculatedPageLimit =
    basePageLimit +
    extraPageLimit;

  const pageLimit =
    row.total_pages === null ||
    row.total_pages === undefined
      ? calculatedPageLimit
      : toSafeInteger(
          row.total_pages,
          calculatedPageLimit,
        );

  const pagesUsed =
    toSafeInteger(
      row.used_pages,
      0,
    );

  const calculatedRemaining =
    Math.max(
      pageLimit - pagesUsed,
      0,
    );

  const databaseRemaining =
    row.remaining_pages === null ||
    row.remaining_pages === undefined
      ? calculatedRemaining
      : toSafeInteger(
          row.remaining_pages,
          calculatedRemaining,
        );

  /**
   * Databázová hodnota nesmie zvýšiť reálne dostupný zostatok.
   *
   * Ak by RPC omylom vrátila vyššiu hodnotu, použije sa bezpečnejší
   * vypočítaný limit.
   */
  const pagesRemaining =
    Math.min(
      databaseRemaining,
      calculatedRemaining,
    );

  const pageLimitReached =
    toSafeBoolean(
      row.limit_reached,
      false,
    ) ||
    pageLimit <= 0 ||
    pagesUsed >= pageLimit ||
    pagesRemaining <= 0;

  return {
    planId,
    basePageLimit,
    extraPageLimit,
    pageLimit,
    pagesUsed,
    pagesRemaining,
    pageLimitReached,
  };
}

/**
 * Načíta ID aktuálne prihláseného používateľa.
 */
async function getAuthenticatedUserId(
  supabase: SupabaseServerClient,
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `UNAUTHENTICATED: ${error.message}`,
    );
  }

  if (!user?.id) {
    throw new Error('UNAUTHENTICATED');
  }

  return user.id;
}

/**
 * Vytvorí čitateľnú správu zo Supabase/PostgreSQL chyby.
 */
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
      (
        value,
      ): value is string =>
        typeof value === 'string' &&
        value.trim().length > 0,
    )
    .join(' | ');
}

/**
 * Vypočíta počet spotrebovaných strán podľa dĺžky textu.
 *
 * Príklady:
 *
 * 0 znakov      = 0 strán
 * 1 znak        = 1 strana
 * 1 800 znakov  = 1 strana
 * 1 801 znakov  = 2 strany
 */
export function countGeneratedPages(
  text: string,
): number {
  const normalizedText =
    normalizeGeneratedText(text);

  if (!normalizedText) {
    return 0;
  }

  return Math.max(
    Math.ceil(
      normalizedText.length /
        CHARACTERS_PER_PAGE,
    ),
    1,
  );
}

/**
 * Vypočíta maximálny povolený počet výstupných tokenov.
 *
 * Funkcia nikdy:
 *
 * - nevráti zápornú hodnotu,
 * - neprekročí požadovaný limit,
 * - neprekročí počet tokenov dostupný podľa zostávajúcich strán.
 */
export function getOutputTokenLimit(
  remainingPages: number,
  requestedTokenLimit: number,
): number {
  const safeRemainingPages =
    toSafeInteger(
      remainingPages,
      0,
    );

  const safeRequestedTokenLimit =
    toSafeInteger(
      requestedTokenLimit,
      0,
    );

  if (
    safeRemainingPages <= 0 ||
    safeRequestedTokenLimit <= 0
  ) {
    return 0;
  }

  const quotaTokenLimit =
    safeRemainingPages *
    TOKENS_PER_PAGE;

  return Math.min(
    safeRequestedTokenLimit,
    quotaTokenLimit,
  );
}

/**
 * Načíta aktuálnu stránkovú kvótu prihláseného používateľa.
 */
export async function getCurrentPageQuota(): Promise<PageQuota> {
  const supabase =
    await createSupabaseServerClient();

  const userId =
    await getAuthenticatedUserId(
      supabase,
    );

  const {
    data,
    error,
  } = await supabase
    .from('zedpera_page_balances')
    .select(
      [
        'plan_id',
        'base_page_limit',
        'extra_page_limit',
        'used_pages',
      ].join(','),
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const message =
      getDatabaseErrorMessage(error);

    throw new Error(
      `PAGE_QUOTA_LOAD_FAILED: ${
        message ||
        'Nepodarilo sa načítať stránkový limit.'
      }`,
    );
  }

  if (!data) {
    return createDefaultPageQuota();
  }

  const row =
    data as PageBalanceDatabaseRow;

  return mapBalance({
    plan_id: row.plan_id,
    base_page_limit:
      row.base_page_limit,
    extra_page_limit:
      row.extra_page_limit,
    used_pages: row.used_pages,
  });
}

/**
 * Overí, či používateľ má k dispozícii aspoň jednu stranu.
 *
 * Funkciu je vhodné volať pred spustením drahej AI požiadavky.
 */
export async function requireAvailablePages(): Promise<PageQuota> {
  const quota =
    await getCurrentPageQuota();

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
 * Samotné odpočítanie musí vykonať databázová RPC funkcia
 * zedpera_consume_pages v jednej transakcii.
 *
 * Tým sa zabráni situácii, keď dve paralelné požiadavky:
 *
 * 1. načítajú rovnaký zostatok,
 * 2. obe ho považujú za dostatočný,
 * 3. obe odpočítajú strany nad povolený limit.
 */
export async function consumePagesForOutput({
  text,
  module,
  requestId,
}: ConsumePageQuotaInput): Promise<PageQuota> {
  const normalizedText =
    normalizeGeneratedText(text);

  /**
   * Prázdny výstup nespotrebúva žiadne strany.
   */
  if (!normalizedText) {
    return getCurrentPageQuota();
  }

  const pages =
    countGeneratedPages(
      normalizedText,
    );

  if (pages <= 0) {
    return getCurrentPageQuota();
  }

  const safeModule =
    normalizeModule(module);

  const safeRequestId =
    normalizeRequestId(requestId);

  const supabase =
    await createSupabaseServerClient();

  const userId =
    await getAuthenticatedUserId(
      supabase,
    );

  const {
    data,
    error,
  } = await supabase.rpc(
    'zedpera_consume_pages',
    {
      p_pages: pages,
      p_module: safeModule,
      p_request_id:
        safeRequestId,
      p_character_count:
        normalizedText.length,
    },
  );

  if (error) {
    const databaseMessage =
      getDatabaseErrorMessage(
        error,
      );

    const normalizedErrorMessage =
      databaseMessage.toUpperCase();

    if (
      normalizedErrorMessage.includes(
        'PAGE_LIMIT_REACHED',
      )
    ) {
      throw new PageLimitError();
    }

    throw new Error(
      `PAGE_QUOTA_CONSUME_FAILED: ${
        databaseMessage ||
        'Nepodarilo sa odpočítať spotrebované strany.'
      }`,
    );
  }

  const rawRow = Array.isArray(data)
    ? data[0]
    : data;

  if (!isRpcBalanceRow(rawRow)) {
    throw new Error(
      'PAGE_QUOTA_CONSUME_EMPTY_RESPONSE: Funkcia zedpera_consume_pages nevrátila platný stav kvóty.',
    );
  }

  const quota =
    mapBalance(rawRow);

  /**
   * Dodatočná bezpečnostná kontrola.
   *
   * RPC funkcia by pri prekročení limitu mala vyvolať databázovú
   * chybu PAGE_LIMIT_REACHED. Ak namiesto toho vráti stav s prekročeným
   * limitom, aplikácia ho stále správne vyhodnotí.
   */
  if (
    quota.pagesUsed >
    quota.pageLimit
  ) {
    throw new PageLimitError(
      'Požadovaný výstup prekročil dostupný stránkový limit.',
    );
  }

  /**
   * userId sa získava aj napriek tomu, že sa neposiela do RPC.
   *
   * Databázová funkcia musí používateľa identifikovať cez auth.uid().
   * Táto kontrola zabezpečuje, že RPC nebude spustená bez platnej relácie.
   */
  void userId;

  return quota;
}