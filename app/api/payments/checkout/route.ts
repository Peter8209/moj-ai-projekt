import {
  createHash,
  randomUUID,
} from 'node:crypto';

import Stripe from 'stripe';
import { NextResponse } from 'next/server';

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from '@/lib/billing/catalog';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// Stripe klient sa neinicializuje na top-level, aby build nespadol
// pri chýbajúcej STRIPE_SECRET_KEY počas zostavovania aplikácie.
let stripeClient: Stripe | null = null;

// ============================================================
// TYPES
// ============================================================

type CheckoutBody = {
  plan?: unknown;
  planId?: unknown;
  selectedPlan?: unknown;

  addons?: unknown;
  addonIds?: unknown;
  addOns?: unknown;
  selectedAddons?: unknown;

  locale?: unknown;
  language?: unknown;
  lang?: unknown;

  requestId?: unknown;
  checkoutRequestId?: unknown;

  // Zostávajú iba kvôli spätnej kompatibilite vstupného JSON.
  // Server ich zámerne nepoužíva, aby nevznikol open redirect.
  successUrl?: unknown;
  cancelUrl?: unknown;

  // userId ani e-mail sa nesmú preberať z klienta.
  userId?: unknown;
  email?: unknown;
  customerEmail?: unknown;
  userEmail?: unknown;
};

type PaidPlanId = Exclude<PlanId, 'free' | 'admin'>;

type PurchaseType = 'plan' | 'addon' | 'plan_with_addons';

type CurrentEntitlementRow = {
  plan_id: string | null;
  addon_ids: string[] | null;
  billing_status: string | null;
  stripe_customer_id: string | null;
};

type StripeMetadata = Record<string, string>;

/**
 * stripe-node v22 prestal spoľahlivo re-exportovať vstupné typy
 * cez pôvodný namespacový typ parametrov Checkout Session.
 *
 * Typ parametrov preto odvodzujeme priamo zo skutočnej metódy
 * stripe.checkout.sessions.create(). Takto zostane route typovo
 * bezpečná aj pri novších verziách stripe-node.
 */
type CheckoutSessionCreateMethod =
  Stripe['checkout']['sessions']['create'];

type CheckoutSessionCreateParams = NonNullable<
  Parameters<CheckoutSessionCreateMethod>[0]
>;

type CheckoutLineItem = NonNullable<
  CheckoutSessionCreateParams['line_items']
>[number];

// ============================================================
// CATALOG CONSTANTS
// ============================================================

const CURRENCY = 'eur' as const;

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_.:-]+$/;
const MAX_REQUEST_ID_LENGTH = 180;
const CHECKOUT_SOURCE = 'zedpera';
const CHECKOUT_CATALOG_VERSION = '2026-07';

const SUPPORTED_LOCALES = [
  'sk',
  'cs',
  'en',
  'de',
  'pl',
  'hu',
] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const VALID_PLAN_IDS = new Set<PlanId>(
  Object.keys(PLANS) as PlanId[],
);

const VALID_ADDON_IDS = new Set<AddonId>(
  Object.keys(ADDONS) as AddonId[],
);

const PURCHASABLE_PLAN_IDS = (
  Object.keys(PLANS) as PlanId[]
).filter(
  (planId): planId is PaidPlanId =>
    planId !== 'free' && planId !== 'admin',
);

// ============================================================
// GENERIC HELPERS
// ============================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

function normalizeLocale(value: unknown): SupportedLocale {
  const normalized = normalizeString(value).toLowerCase();

  return SUPPORTED_LOCALES.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : 'sk';
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function createJsonResponse<T>(
  payload: T,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);

  Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return NextResponse.json(payload, {
    ...init,
    headers,
  });
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getSafeErrorDetail(message: string): Record<string, string> {
  return isProduction() ? {} : { detail: message };
}

function isActiveEntitlement(billingStatus: string | null): boolean {
  const normalizedStatus = normalizeString(billingStatus).toLowerCase();

  // Pri starších záznamoch môže byť billing_status prázdny. Ak je používateľovi
  // uložený platený plan_id, prázdny stav neblokujeme iba kvôli migrácii dát.
  if (!normalizedStatus) {
    return true;
  }

  return !new Set([
    'canceled',
    'cancelled',
    'expired',
    'failed',
    'inactive',
    'past_due',
    'revoked',
    'unpaid',
  ]).has(normalizedStatus);
}

function normalizeCurrentPlanId(value: unknown): PlanId {
  const normalized = normalizeString(value);

  if (isKnownPlanId(normalized)) {
    return normalized;
  }

  return 'free';
}

function getBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  const withProtocol =
    rawBaseUrl.startsWith('http://') || rawBaseUrl.startsWith('https://')
      ? rawBaseUrl
      : `https://${rawBaseUrl}`;

  return withProtocol.replace(/\/+$/, '');
}

function getSuccessUrl(
  baseUrl: string,
  locale: SupportedLocale,
): string {
  return (
    `${baseUrl}/payment/success` +
    `?session_id={CHECKOUT_SESSION_ID}` +
    `&lang=${encodeURIComponent(locale)}`
  );
}

function getCancelUrl(
  baseUrl: string,
  locale: SupportedLocale,
): string {
  return (
    `${baseUrl}/pricing` +
    `?payment=cancelled` +
    `&lang=${encodeURIComponent(locale)}`
  );
}

function getFreeDashboardUrl(baseUrl: string): string {
  return `${baseUrl}/dashboard?plan=free`;
}

function getStripe(): Stripe {
  const secretKey = normalizeString(process.env.STRIPE_SECRET_KEY);

  if (!secretKey) {
    throw new Error('STRIPE_CONFIG_MISSING: Missing STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }

  return stripeClient;
}

// ============================================================
// INPUT NORMALIZATION
// ============================================================

function getRawPlan(body: CheckoutBody): unknown {
  return firstDefined(body.plan, body.planId, body.selectedPlan);
}

function getRawAddons(body: CheckoutBody): unknown[] {
  const rawAddons = firstDefined(
    body.addonIds,
    body.addons,
    body.addOns,
    body.selectedAddons,
  );

  if (
    rawAddons === undefined ||
    rawAddons === null ||
    rawAddons === ''
  ) {
    return [];
  }

  if (Array.isArray(rawAddons)) {
    return rawAddons;
  }

  if (typeof rawAddons === 'string') {
    const normalized = rawAddons.trim();

    if (!normalized) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(normalized);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Spätná kompatibilita so zoznamom oddeleným čiarkou.
    }

    return normalized
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  // Neplatný objekt/typ sa následne zobrazí medzi invalidAddons.
  return [rawAddons];
}

function isKnownPlanId(value: unknown): value is PlanId {
  return (
    typeof value === 'string' &&
    VALID_PLAN_IDS.has(value.trim() as PlanId)
  );
}

function isKnownAddonId(value: unknown): value is AddonId {
  return (
    typeof value === 'string' &&
    VALID_ADDON_IDS.has(value.trim() as AddonId)
  );
}

function resolvePlanId(rawPlan: unknown): {
  planId: PlanId | null;
  invalidValue: unknown | null;
} {
  const normalized = normalizeString(rawPlan);

  if (!normalized) {
    return {
      planId: null,
      invalidValue: null,
    };
  }

  if (!isKnownPlanId(normalized)) {
    return {
      planId: null,
      invalidValue: rawPlan,
    };
  }

  // FREE nie je platená položka. Pri nákupe doplnku ho považujeme
  // za nákup bez zmeny základného balíka.
  if (normalized === 'free') {
    return {
      planId: null,
      invalidValue: null,
    };
  }

  return {
    planId: normalized,
    invalidValue: null,
  };
}

function resolveAddonIds(rawAddons: unknown[]): {
  addonIds: AddonId[];
  invalidAddons: unknown[];
} {
  const invalidAddons = rawAddons.filter(
    (value) => !isKnownAddonId(normalizeString(value)),
  );

  const addonIds = uniqueValues(
    rawAddons
      .map((value) => normalizeString(value))
      .filter(isKnownAddonId),
  );

  return {
    addonIds,
    invalidAddons,
  };
}

function resolveCheckoutRequestId(
  request: Request,
  body: CheckoutBody,
): string {
  const bodyRequestId = normalizeString(
    firstDefined(body.requestId, body.checkoutRequestId),
  );

  const headerRequestId = normalizeString(
    request.headers.get('idempotency-key'),
  );

  if (
    bodyRequestId &&
    headerRequestId &&
    bodyRequestId !== headerRequestId
  ) {
    throw new Error('REQUEST_ID_MISMATCH');
  }

  const requestId =
    bodyRequestId ||
    headerRequestId ||
    `auto-${Math.floor(Date.now() / 60_000)}`;

  if (
    requestId.length > MAX_REQUEST_ID_LENGTH ||
    !REQUEST_ID_PATTERN.test(requestId)
  ) {
    throw new Error('INVALID_REQUEST_ID');
  }

  return requestId;
}

// ============================================================
// STRIPE PRICE HELPERS
// ============================================================

function toEnvironmentSuffix(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function getStripePriceIdForPlan(planId: PlanId): string {
  const key = `STRIPE_PLAN_PRICE_${toEnvironmentSuffix(planId)}`;
  return normalizeString(process.env[key]);
}

function getStripePriceIdForAddon(addonId: AddonId): string {
  const key = `STRIPE_ADDON_PRICE_${toEnvironmentSuffix(addonId)}`;
  return normalizeString(process.env[key]);
}

function createPlanLineItem(
  planId: PlanId,
): CheckoutLineItem {
  const plan = PLANS[planId];
  const stripePriceId = getStripePriceIdForPlan(planId);

  if (stripePriceId) {
    return {
      price: stripePriceId,
      quantity: 1,
    };
  }

  return {
    quantity: 1,
    price_data: {
      currency: CURRENCY,
      unit_amount: plan.priceCents,
      product_data: {
        name: `ZEDPERA – ${plan.name}`,
        description: [
          `${plan.pageLimit} strán`,
          plan.promptLimit === null
            ? 'neobmedzené prompty'
            : `${plan.promptLimit} prompty`,
          `${plan.attachmentLimit} príloh`,
        ].join(' • '),
        metadata: {
          item_type: 'plan',
          catalog_id: plan.id,
        },
      },
    },
  };
}

function createAddonLineItem(
  addonId: AddonId,
): CheckoutLineItem {
  const addon = ADDONS[addonId];
  const stripePriceId = getStripePriceIdForAddon(addonId);

  if (stripePriceId) {
    return {
      price: stripePriceId,
      quantity: 1,
    };
  }

  const description =
    addon.extraPages > 0
      ? `Navýšenie limitu o ${addon.extraPages} strán`
      : 'Rozšírenie funkcií účtu ZEDPERA';

  return {
    quantity: 1,
    price_data: {
      currency: CURRENCY,
      unit_amount: addon.priceCents,
      product_data: {
        name: `ZEDPERA – ${addon.name}`,
        description,
        metadata: {
          item_type: 'addon',
          catalog_id: addon.id,
        },
      },
    },
  };
}

function getPurchaseType(
  planId: PlanId | null,
  addonIds: AddonId[],
): PurchaseType {
  if (planId && addonIds.length > 0) {
    return 'plan_with_addons';
  }

  return planId ? 'plan' : 'addon';
}

function getCatalogTotalCents(
  planId: PlanId | null,
  addonIds: AddonId[],
): number {
  const planPrice = planId ? PLANS[planId].priceCents : 0;
  const addonsPrice = addonIds.reduce(
    (total, addonId) => total + ADDONS[addonId].priceCents,
    0,
  );

  return planPrice + addonsPrice;
}

function getPurchasedBasePages(planId: PlanId | null): number {
  if (!planId) {
    return 0;
  }

  const pageLimit = PLANS[planId].pageLimit;

  return typeof pageLimit === 'number' && Number.isFinite(pageLimit)
    ? Math.max(0, Math.trunc(pageLimit))
    : 0;
}

function getPurchasedExtraPages(addonIds: AddonId[]): number {
  return addonIds.reduce(
    (total, addonId) => total + ADDONS[addonId].extraPages,
    0,
  );
}

function buildMetadata({
  userId,
  email,
  planId,
  addonIds,
  requestId,
  locale,
}: {
  userId: string;
  email: string;
  planId: PlanId | null;
  addonIds: AddonId[];
  requestId: string;
  locale: SupportedLocale;
}): StripeMetadata {
  const purchaseType = getPurchaseType(planId, addonIds);
  const basePages = getPurchasedBasePages(planId);
  const extraPages = getPurchasedExtraPages(addonIds);
  const totalCents = getCatalogTotalCents(planId, addonIds);

  return {
    user_id: userId,
    user_email: email,
    plan_id: planId || '',
    addons: JSON.stringify(addonIds),
    addon_ids: JSON.stringify(addonIds),
    purchase_type: purchaseType,
    base_pages: String(basePages),
    extra_pages: String(extraPages),
    catalog_total_cents: String(totalCents),
    checkout_request_id: requestId,
    catalog_version: CHECKOUT_CATALOG_VERSION,
    locale,
    guest_checkout: userId ? 'false' : 'true',
    source: CHECKOUT_SOURCE,
  };
}

function createIdempotencyKey({
  userId,
  planId,
  addonIds,
  requestId,
}: {
  userId: string;
  planId: PlanId | null;
  addonIds: AddonId[];
  requestId: string;
}): string {
  const source = [
    userId || 'guest',
    planId || 'addon-only',
    [...addonIds].sort().join(','),
    requestId,
  ].join('|');

  const digest = createHash('sha256').update(source).digest('hex');

  return `zedpera_checkout_${digest}`;
}

// ============================================================
// ENTITLEMENT HELPERS
// ============================================================

async function loadCurrentEntitlement({
  supabase,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}): Promise<CurrentEntitlementRow | null> {
  const { data, error } = await supabase
    .from('zedpera_user_entitlements')
    .select(
      'plan_id, addon_ids, billing_status, stripe_customer_id',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`ENTITLEMENT_LOAD_FAILED: ${error.message}`);
  }

  return data as CurrentEntitlementRow | null;
}

function requirePaidPlanForAddonOnlyCheckout({
  planId,
  addonIds,
  currentEntitlement,
}: {
  planId: PlanId | null;
  addonIds: AddonId[];
  currentEntitlement: CurrentEntitlementRow | null;
}): void {
  if (planId || addonIds.length === 0) {
    return;
  }

  const currentPlanId = normalizeCurrentPlanId(
    currentEntitlement?.plan_id,
  );

  if (
    currentPlanId === 'free' ||
    !isActiveEntitlement(currentEntitlement?.billing_status ?? null)
  ) {
    throw new Error('PAID_PLAN_REQUIRED');
  }
}

// ============================================================
// CUSTOMER HELPERS
// ============================================================

async function getOrCreateStripeCustomer({
  stripe,
  userId,
  email,
}: {
  stripe: Stripe;
  userId: string;
  email: string;
}): Promise<Stripe.Customer> {
  const customers = await stripe.customers.list({
    email,
    limit: 100,
  });

  const matchingCustomer = customers.data.find(
    (customer) => customer.metadata?.user_id === userId,
  );

  if (matchingCustomer) {
    return matchingCustomer;
  }

  return stripe.customers.create(
    {
      email,
      metadata: {
        user_id: userId,
        supabase_user_id: userId,
        source: CHECKOUT_SOURCE,
      },
    },
    {
      idempotencyKey: `zedpera_customer_${userId}`,
    },
  );
}

// ============================================================
// ERROR HELPERS
// ============================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return 'Unknown checkout error';
}

function getStripeErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  if (typeof error.code === 'string') {
    return error.code;
  }

  if (typeof error.type === 'string') {
    return error.type;
  }

  return null;
}

// ============================================================
// ROUTES
// ============================================================

export async function GET() {
  return createJsonResponse({
    ok: true,
    route: '/api/payments/checkout',
    message: 'ZEDPERA checkout endpoint is running.',
    mode: 'payment',
    freeRedirect: '/dashboard?plan=free',
    successRedirect: '/payment/success?session_id={CHECKOUT_SESSION_ID}',
    cancelRedirect: '/pricing?canceled=1',
    plans: (Object.keys(PLANS) as PlanId[])
      .filter((planId) => planId !== 'admin')
      .map((planId) => ({
        id: planId,
        name: PLANS[planId].name,
        priceCents: PLANS[planId].priceCents,
        pageLimit: PLANS[planId].pageLimit,
        promptLimit: PLANS[planId].promptLimit,
        attachmentLimit: PLANS[planId].attachmentLimit,
        checkoutRequired: planId !== 'free',
      })),
    addons: (Object.keys(ADDONS) as AddonId[]).map((addonId) => ({
      id: addonId,
      name: ADDONS[addonId].name,
      priceCents: ADDONS[addonId].priceCents,
      extraPages: ADDONS[addonId].extraPages,
    })),
  });
}

export async function POST(request: Request) {
  const errorId = randomUUID();
  let requestId = '';

  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_CONTENT_TYPE',
          code: 'INVALID_CONTENT_TYPE',
          message: 'Požiadavka musí používať Content-Type application/json.',
          errorId,
        },
        { status: 415 },
      );
    }

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_JSON',
          code: 'INVALID_JSON',
          message: 'Telo požiadavky neobsahuje platný JSON.',
          errorId,
        },
        { status: 400 },
      );
    }

    if (!isRecord(parsedBody)) {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_JSON',
          code: 'INVALID_JSON',
          message: 'Telo požiadavky musí byť JSON objekt.',
          errorId,
        },
        { status: 400 },
      );
    }

    const body = parsedBody as CheckoutBody;
    const rawPlan = getRawPlan(body);
    const rawAddons = getRawAddons(body);
    const normalizedRequestedPlan = normalizeString(rawPlan);

    // ADMIN je interný systémový balík. Nesmie sa vytvoriť Stripe Checkout
    // ani Stripe metadata, ktoré by ho mohli priradiť používateľovi nákupom.
    if (normalizedRequestedPlan === 'admin') {
      return createJsonResponse(
        {
          ok: false,
          error: 'ADMIN_PLAN_NOT_PURCHASABLE',
          code: 'ADMIN_PLAN_NOT_PURCHASABLE',
          message: 'Administrátorský balík nie je možné zakúpiť.',
          errorId,
        },
        { status: 403 },
      );
    }

    const {
      planId,
      invalidValue: invalidPlan,
    } = resolvePlanId(rawPlan);

    if (invalidPlan !== null) {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_PLAN',
          code: 'INVALID_PLAN',
          errorId,
          receivedPlan: invalidPlan,
          message:
            'Neplatné ID balíka. Checkout prijíma iba balíky z lib/billing/catalog.ts.',
          received: invalidPlan,
          allowedPlans: PURCHASABLE_PLAN_IDS,
        },
        { status: 400 },
      );
    }

    const {
      addonIds,
      invalidAddons,
    } = resolveAddonIds(rawAddons);

    if (invalidAddons.length > 0) {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_ADDON',
          code: 'INVALID_ADDON',
          errorId,
          message:
            'Niektorý doplnok nemá platné ID podľa lib/billing/catalog.ts.',
          invalidAddons,
          allowedAddons: Object.keys(ADDONS),
        },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl();
    const isFreeSelection = normalizedRequestedPlan === 'free';

    // Free balík nevytvára Stripe Checkout a nevyžaduje prihlásenie.
    // Samotný dashboard musí pre anonymného používateľa uplatniť free limity.
    if (isFreeSelection && addonIds.length === 0) {
      const redirectUrl = getFreeDashboardUrl(baseUrl);

      return createJsonResponse({
        ok: true,
        action: 'redirect',
        checkoutRequired: false,
        mode: 'free',
        planId: 'free' as const,
        url: redirectUrl,
        redirectUrl,
        redirectPath: '/dashboard?plan=free',
        message:
          'Free balík nevyžaduje Stripe platbu. Používateľ môže pokračovať priamo do dashboardu.',
      });
    }

    if (!planId && addonIds.length === 0) {
      return createJsonResponse(
        {
          ok: false,
          error: 'EMPTY_CHECKOUT',
          code: 'EMPTY_CHECKOUT',
          errorId,
          message:
            'Vyberte platený balík alebo aspoň jeden doplnok.',
          allowedPlans: PURCHASABLE_PLAN_IDS,
          allowedAddons: Object.keys(ADDONS),
        },
        { status: 400 },
      );
    }

    /*
     * Hlavný platený balík môže kúpiť aj neprihlásený návštevník.
     * Stripe si v takom prípade vyžiada e-mail priamo na platobnej stránke.
     * Doplnok bez základného balíka naďalej vyžaduje prihlásený účet,
     * pretože sa musí pripojiť ku konkrétnemu existujúcemu entitlementu.
     */
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError && user?.id) {
      throw new Error(`AUTH_CHECK_FAILED: ${authError.message}`);
    }

    const userId = normalizeString(user?.id);
    const email = normalizeEmail(user?.email);
    const isAuthenticated = Boolean(userId && email);

    requestId = resolveCheckoutRequestId(request, body);

    let currentEntitlement: CurrentEntitlementRow | null = null;

    if (isAuthenticated) {
      currentEntitlement = await loadCurrentEntitlement({
        supabase,
        userId,
      });
    }

    if (!planId && addonIds.length > 0 && !isAuthenticated) {
      return createJsonResponse(
        {
          ok: false,
          error: 'ADDON_AUTHENTICATION_REQUIRED',
          code: 'ADDON_AUTHENTICATION_REQUIRED',
          errorId,
          requestId,
          message:
            'Samostatný doplnok je možné pripojiť iba k prihlásenému účtu s aktívnym plateným balíkom.',
          loginUrl: `/login?next=${encodeURIComponent('/pricing#doplnkove-sluzby')}`,
        },
        { status: 401 },
      );
    }

    requirePaidPlanForAddonOnlyCheckout({
      planId,
      addonIds,
      currentEntitlement,
    });

    const stripe = getStripe();
    const locale = normalizeLocale(
      firstDefined(body.locale, body.language, body.lang),
    );

    let stripeCustomerId = normalizeString(
      currentEntitlement?.stripe_customer_id,
    );

    if (isAuthenticated && !stripeCustomerId) {
      const customer = await getOrCreateStripeCustomer({
        stripe,
        userId,
        email,
      });

      stripeCustomerId = customer.id;
    }

    const lineItems: CheckoutLineItem[] = [
      ...(planId ? [createPlanLineItem(planId)] : []),
      ...addonIds.map(createAddonLineItem),
    ];

    const metadata = buildMetadata({
      userId,
      email,
      planId,
      addonIds,
      requestId,
      locale,
    });

    const successUrl = getSuccessUrl(baseUrl, locale);
    const cancelUrl = getCancelUrl(baseUrl, locale);

    const sessionParams: CheckoutSessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: {
        metadata,
        ...(email ? { receipt_email: email } : {}),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: {
        enabled: false,
      },
      locale: 'auto',
      submit_type: 'pay',
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    };

    if (userId) {
      sessionParams.client_reference_id = userId;
    }

    if (stripeCustomerId) {
      sessionParams.customer = stripeCustomerId;
      sessionParams.customer_update = {
        address: 'auto',
        name: 'auto',
      };
    } else {
      // Bez zákazníka Stripe zobrazí e-mailové pole priamo v Checkout.
      sessionParams.customer_creation = 'always';

      if (email) {
        sessionParams.customer_email = email;
      }
    }

    const idempotencyKey = createIdempotencyKey({
      userId,
      planId,
      addonIds,
      requestId,
    });

    const session = await stripe.checkout.sessions.create(
      sessionParams,
      {
        idempotencyKey,
      },
    );

    if (!session.url) {
      return createJsonResponse(
        {
          ok: false,
          error: 'CHECKOUT_SESSION_URL_MISSING',
          code: 'CHECKOUT_SESSION_URL_MISSING',
          errorId,
          requestId,
          message: 'Stripe nevygeneroval URL platobnej stránky.',
          sessionId: session.id,
        },
        { status: 502 },
      );
    }

    const purchaseType = getPurchaseType(planId, addonIds);
    const totalCents = getCatalogTotalCents(planId, addonIds);

    return createJsonResponse({
      ok: true,
      action: 'redirect',
      checkoutRequired: true,
      url: session.url,
      redirectUrl: session.url,
      sessionId: session.id,
      requestId,
      mode: 'payment',
      purchaseType,

      planId,
      planName: planId ? PLANS[planId].name : null,
      addonIds,
      addonNames: addonIds.map((addonId) => ADDONS[addonId].name),

      currency: CURRENCY.toUpperCase(),
      catalogTotalCents: totalCents,
      basePages: getPurchasedBasePages(planId),
      extraPages: getPurchasedExtraPages(addonIds),

      successUrl,
      cancelUrl,
      locale,
      authenticated: isAuthenticated,
    });
  } catch (error: unknown) {
    const detail = getErrorMessage(error);
    const stripeCode = getStripeErrorCode(error);

    console.error('ZEDPERA_CHECKOUT_ERROR', {
      errorId,
      requestId: requestId || null,
      detail,
      stripeCode,
      error,
    });

    if (detail.includes('REQUEST_ID_MISMATCH')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'REQUEST_ID_MISMATCH',
          code: 'REQUEST_ID_MISMATCH',
          message:
            'requestId sa nezhoduje s hlavičkou Idempotency-Key.',
          errorId,
          ...(requestId ? { requestId } : {}),
        },
        { status: 400 },
      );
    }

    if (detail.includes('INVALID_REQUEST_ID')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'INVALID_REQUEST_ID',
          code: 'INVALID_REQUEST_ID',
          message:
            'requestId obsahuje nepovolené znaky alebo je príliš dlhý.',
          errorId,
          ...(requestId ? { requestId } : {}),
        },
        { status: 400 },
      );
    }

    if (detail.includes('PAID_PLAN_REQUIRED')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'PAID_PLAN_REQUIRED',
          code: 'PAID_PLAN_REQUIRED',
          message:
            'Doplnok je možné kúpiť iba spolu s plateným balíkom alebo k aktívnemu platenému balíku.',
          errorId,
          allowedPlans: PURCHASABLE_PLAN_IDS,
          allowedAddons: Object.keys(ADDONS),
          ...(requestId ? { requestId } : {}),
        },
        { status: 400 },
      );
    }

    if (detail.includes('ENTITLEMENT_LOAD_FAILED')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'ENTITLEMENT_LOAD_FAILED',
          code: 'ENTITLEMENT_LOAD_FAILED',
          message:
            'Nepodarilo sa overiť aktuálny používateľský balík.',
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getSafeErrorDetail(detail),
        },
        { status: 500 },
      );
    }

    if (detail.includes('AUTH_CHECK_FAILED')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'AUTH_CHECK_FAILED',
          code: 'AUTH_CHECK_FAILED',
          message: 'Nepodarilo sa bezpečne overiť aktuálne prihlásenie.',
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getSafeErrorDetail(detail),
        },
        { status: 500 },
      );
    }

    if (detail.includes('STRIPE_CONFIG_MISSING')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_CONFIG_MISSING',
          code: 'STRIPE_CONFIG_MISSING',
          message:
            'Platobná brána nie je správne nakonfigurovaná.',
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getSafeErrorDetail(detail),
        },
        { status: 500 },
      );
    }

    const unavailable =
      stripeCode === 'StripeConnectionError' ||
      stripeCode === 'StripeAPIError' ||
      stripeCode === 'StripeRateLimitError';

    return createJsonResponse(
      {
        ok: false,
        error: unavailable ? 'STRIPE_UNAVAILABLE' : 'CHECKOUT_FAILED',
        code: unavailable ? 'STRIPE_UNAVAILABLE' : 'CHECKOUT_FAILED',
        message: unavailable
          ? 'Platobná brána je dočasne nedostupná. Skúste požiadavku zopakovať.'
          : 'Stripe Checkout sa nepodarilo vytvoriť.',
        errorId,
        ...(requestId ? { requestId } : {}),
        ...getSafeErrorDetail(detail),
        ...(!isProduction() && stripeCode ? { stripeCode } : {}),
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
