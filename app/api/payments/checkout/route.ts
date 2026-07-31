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
  type PurchasableCatalogId,
} from '@/lib/billing/catalog';
import {
  CHECKOUT_LOCALIZATION,
  getCheckoutLocalization,
  normalizeLocale,
  type AppLocale,
} from '@/lib/billing/checkout-locale';
import {
  DEFAULT_CATALOG_CURRENCY,
  getCheckoutCurrencyForLocale,
  type CheckoutCurrency,
} from '@/lib/currency';
import { getStripe } from '@/lib/stripe';
import { createStripeLineItems } from '@/lib/stripe/prices';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

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


type CheckoutMode = 'payment' | 'subscription';

type StripeErrorInfo = {
  message: string;
  type: string | null;
  code: string | null;
  param: string | null;
  requestId: string | null;
  statusCode: number | null;
};

type StripePriceDiagnostic = {
  catalogItemId: PurchasableCatalogId;
  priceId: string;
  active: boolean;
  livemode: boolean;
  defaultCurrency: string;
  supportedCurrencies: string[];
  recurring: boolean;
  interval: string | null;
};

type StripeCustomerResolution = {
  customerId: string;
  source: 'stored' | 'existing' | 'created';
  staleStoredCustomerId?: string;
};

// ============================================================
// CATALOG CONSTANTS
// ============================================================

/**
 * Verzia politiky, ktorá viaže menu Stripe Checkout na jazyk rozhrania.
 * Samotné mapovanie je centralizované v lib/currency.ts.
 */
const CURRENCY_POLICY_VERSION = 'interface-v2-multicurrency-price';

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
const CHECKOUT_SESSION_EXPIRY_SECONDS = 31 * 60;
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

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


function normalizeBaseUrl(value: string): string {
  const normalized = normalizeString(value);

  if (!normalized) {
    return '';
  }

  const withProtocol =
    normalized.startsWith('http://') || normalized.startsWith('https://')
      ? normalized
      : `https://${normalized}`;

  try {
    const url = new URL(withProtocol);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    return url.origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function getBaseUrl(request?: Request): string {
  /*
   * Pri lokálnom vývoji musí Stripe po úspechu/cancel vrátiť používateľa späť
   * na localhost, aj keď .env.local obsahuje produkčný NEXT_PUBLIC_SITE_URL.
   * V produkcii sa naopak request Host nepoužíva ako zdroj redirect URL.
   */
  if (!isProduction() && request) {
    try {
      const requestUrl = new URL(request.url);

      if (LOCAL_HOSTNAMES.has(requestUrl.hostname)) {
        return requestUrl.origin.replace(/\/+$/, '');
      }
    } catch {
      // Pokračujeme na nakonfigurovanú URL nižšie.
    }
  }

  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate || '');

    if (normalized) {
      return normalized;
    }
  }

  return 'http://localhost:3000';
}

function getSuccessUrl(
  baseUrl: string,
  locale: AppLocale,
): string {
  return (
    `${baseUrl}/payment/success` +
    `?session_id={CHECKOUT_SESSION_ID}` +
    `&lang=${encodeURIComponent(locale)}`
  );
}

function getCancelUrl(
  baseUrl: string,
  locale: AppLocale,
): string {
  return (
    `${baseUrl}/pricing` +
    `?payment=cancelled` +
    `&lang=${encodeURIComponent(locale)}`
  );
}

function getFreeDashboardUrl(
  baseUrl: string,
  locale: AppLocale,
): string {
  return (
    `${baseUrl}/dashboard?plan=free` +
    `&lang=${encodeURIComponent(locale)}`
  );
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
    `auto-${randomUUID()}`;

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

/**
 * Price ID sa vyberá výhradne podľa položky katalógu. Menu nemení Price ID;
 * podporu konkrétnej meny overuje lib/stripe/prices.ts cez currency_options.
 */
function getCheckoutCatalogItemIds(
  planId: PlanId | null,
  addonIds: AddonId[],
): PurchasableCatalogId[] {
  const itemIds: PurchasableCatalogId[] = [];

  if (planId && planId !== 'free' && planId !== 'admin') {
    itemIds.push(planId);
  }

  itemIds.push(...addonIds);

  return itemIds;
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


function getLineItemPriceId(lineItem: CheckoutLineItem): string {
  if (
    isRecord(lineItem) &&
    typeof lineItem.price === 'string' &&
    lineItem.price.trim()
  ) {
    return lineItem.price.trim();
  }

  throw new Error(
    'STRIPE_LINE_ITEM_PRICE_MISSING: Checkout line item neobsahuje Price ID.',
  );
}

function getPriceSupportedCurrencies(price: Stripe.Price): string[] {
  return uniqueValues([
    normalizeString(price.currency).toLowerCase(),
    ...Object.keys(price.currency_options || {}).map((currency) =>
      currency.toLowerCase(),
    ),
  ]).filter(Boolean);
}

function isPaidPlanCatalogItem(
  itemId: PurchasableCatalogId,
): boolean {
  return VALID_PLAN_IDS.has(itemId as PlanId);
}

async function validateStripeCheckoutPrices({
  stripe,
  checkoutItemIds,
  lineItems,
  checkoutCurrency,
  checkoutMode,
}: {
  stripe: Stripe;
  checkoutItemIds: PurchasableCatalogId[];
  lineItems: CheckoutLineItem[];
  checkoutCurrency: CheckoutCurrency | undefined;
  checkoutMode: CheckoutMode;
}): Promise<StripePriceDiagnostic[]> {
  if (checkoutItemIds.length !== lineItems.length) {
    throw new Error(
      `STRIPE_LINE_ITEM_COUNT_MISMATCH: catalog=${checkoutItemIds.length}; stripe=${lineItems.length}`,
    );
  }

  const diagnostics = await Promise.all(
    lineItems.map(async (lineItem, index): Promise<StripePriceDiagnostic> => {
      const catalogItemId = checkoutItemIds[index];
      const priceId = getLineItemPriceId(lineItem);

      let price: Stripe.Price;

      try {
        price = await stripe.prices.retrieve(priceId, {
          expand: ['currency_options'],
        });
      } catch (error: unknown) {
        const info = getStripeErrorInfo(error);

        if (info.code === 'resource_missing') {
          throw new Error(
            `STRIPE_PRICE_NOT_FOUND: ${catalogItemId} -> ${priceId}. ` +
              'Price ID neexistuje v aktuálnom Stripe TEST/LIVE režime.',
          );
        }

        throw error;
      }

      if (!price.active) {
        throw new Error(
          `STRIPE_PRICE_INACTIVE: ${catalogItemId} -> ${price.id}`,
        );
      }

      const supportedCurrencies = getPriceSupportedCurrencies(price);
      const expectedRecurring = isPaidPlanCatalogItem(catalogItemId);
      const recurring = Boolean(price.recurring);

      if (expectedRecurring && !recurring) {
        throw new Error(
          `STRIPE_PRICE_TYPE_MISMATCH: ${catalogItemId} -> ${price.id} ` +
            'musí byť recurring Price, ale Stripe ho eviduje ako one-time.',
        );
      }

      if (!expectedRecurring && recurring) {
        throw new Error(
          `STRIPE_PRICE_TYPE_MISMATCH: ${catalogItemId} -> ${price.id} ` +
            'musí byť one-time Price, ale Stripe ho eviduje ako recurring.',
        );
      }

      /*
       * ZEDPERA platené plány sú mesačné subscriptions. One-time doplnky
       * nemajú recurring.interval. Ak by sa interval v katalógu neskôr zmenil,
       * zmeňte toto pravidlo spolu s lib/billing/catalog.ts a Stripe Price.
       */
      if (
        expectedRecurring &&
        price.recurring &&
        price.recurring.interval !== 'month'
      ) {
        throw new Error(
          `STRIPE_PRICE_INTERVAL_MISMATCH: ${catalogItemId} -> ${price.id}; ` +
            `očakávané=month; stripe=${price.recurring.interval}`,
        );
      }

      if (
        checkoutCurrency &&
        !supportedCurrencies.includes(checkoutCurrency.toLowerCase())
      ) {
        throw new Error(
          `STRIPE_PRICE_CURRENCY_UNSUPPORTED: ${catalogItemId} -> ${price.id}; ` +
            `požadovaná=${checkoutCurrency}; dostupné=${supportedCurrencies.join(',') || 'none'}`,
        );
      }

      return {
        catalogItemId,
        priceId: price.id,
        active: price.active,
        livemode: price.livemode,
        defaultCurrency: price.currency.toLowerCase(),
        supportedCurrencies,
        recurring,
        interval: price.recurring?.interval || null,
      };
    }),
  );

  const defaultCurrencies = uniqueValues(
    diagnostics.map((item) => item.defaultCurrency),
  );

  if (defaultCurrencies.length > 1) {
    throw new Error(
      `STRIPE_PRICE_DEFAULT_CURRENCY_MISMATCH: ${diagnostics
        .map((item) => `${item.catalogItemId}=${item.defaultCurrency}`)
        .join('; ')}`,
    );
  }

  const recurringCount = diagnostics.filter((item) => item.recurring).length;

  if (checkoutMode === 'subscription' && recurringCount < 1) {
    throw new Error(
      'STRIPE_PRICE_TYPE_MISMATCH: subscription checkout neobsahuje žiadny recurring Price.',
    );
  }

  if (checkoutMode === 'payment' && recurringCount > 0) {
    throw new Error(
      'STRIPE_PRICE_TYPE_MISMATCH: payment checkout nesmie obsahovať recurring Price.',
    );
  }

  return diagnostics;
}

function buildMetadata({
  userId,
  email,
  planId,
  addonIds,
  requestId,
  locale,
  checkoutCurrency,
}: {
  userId: string;
  email: string;
  planId: PlanId | null;
  addonIds: AddonId[];
  requestId: string;
  locale: AppLocale;
  checkoutCurrency: CheckoutCurrency | undefined;
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
    catalog_currency: DEFAULT_CATALOG_CURRENCY,
    checkout_currency: checkoutCurrency || 'auto',
    currency_policy_version: CURRENCY_POLICY_VERSION,
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
  locale,
  checkoutCurrency,
}: {
  userId: string;
  planId: PlanId | null;
  addonIds: AddonId[];
  requestId: string;
  locale: AppLocale;
  checkoutCurrency: CheckoutCurrency | undefined;
}): string {
  const source = [
    userId || 'guest',
    planId || 'addon-only',
    [...addonIds].sort().join(','),
    locale,
    checkoutCurrency || 'auto',
    CURRENCY_POLICY_VERSION,
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
}): Promise<{
  customer: Stripe.Customer;
  source: 'existing' | 'created';
}> {
  const customers = await stripe.customers.list({
    email,
    limit: 100,
  });

  const matchingCustomer = customers.data.find(
    (customer) =>
      customer.metadata?.user_id === userId ||
      customer.metadata?.supabase_user_id === userId,
  );

  if (matchingCustomer) {
    return {
      customer: matchingCustomer,
      source: 'existing',
    };
  }

  const customer = await stripe.customers.create(
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

  return {
    customer,
    source: 'created',
  };
}

async function resolveStripeCustomerForCheckout({
  stripe,
  userId,
  email,
  storedCustomerId,
}: {
  stripe: Stripe;
  userId: string;
  email: string;
  storedCustomerId: string;
}): Promise<StripeCustomerResolution> {
  if (storedCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(storedCustomerId);

      if (!customer.deleted) {
        return {
          customerId: customer.id,
          source: 'stored',
        };
      }
    } catch (error: unknown) {
      const info = getStripeErrorInfo(error);

      /*
       * Typický prípad pri prepnutí sk_test_ <-> sk_live_: Supabase má uložené
       * cus_ ID z druhého Stripe režimu. Checkout preto nesmie slepo použiť
       * staré ID, ale vytvorí/nájde zákazníka v aktuálnom režime.
       */
      if (info.code !== 'resource_missing') {
        throw error;
      }

      console.warn('ZEDPERA_STALE_STRIPE_CUSTOMER', {
        userId,
        storedCustomerId,
        stripeRequestId: info.requestId,
      });
    }
  }

  const {
    customer,
    source,
  } = await getOrCreateStripeCustomer({
    stripe,
    userId,
    email,
  });

  return {
    customerId: customer.id,
    source,
    ...(storedCustomerId
      ? { staleStoredCustomerId: storedCustomerId }
      : {}),
  };
}

// ============================================================
// ERROR HELPERS
// ============================================================

function readNestedErrorRecord(error: unknown): Record<string, unknown> {
  if (!isRecord(error)) {
    return {};
  }

  if (isRecord(error.raw)) {
    return {
      ...error.raw,
      ...error,
    };
  }

  return error;
}

function getStripeErrorInfo(error: unknown): StripeErrorInfo {
  const record = readNestedErrorRecord(error);

  const message =
    error instanceof Error
      ? error.message
      : typeof record.message === 'string'
        ? record.message
        : 'Unknown checkout error';

  const statusCode =
    typeof record.statusCode === 'number'
      ? record.statusCode
      : typeof record.status === 'number'
        ? record.status
        : null;

  return {
    message,
    type:
      typeof record.type === 'string'
        ? record.type
        : null,
    code:
      typeof record.code === 'string'
        ? record.code
        : null,
    param:
      typeof record.param === 'string'
        ? record.param
        : null,
    requestId:
      typeof record.requestId === 'string'
        ? record.requestId
        : typeof record.request_id === 'string'
          ? record.request_id
          : null,
    statusCode,
  };
}

function getErrorMessage(error: unknown): string {
  return getStripeErrorInfo(error).message;
}

function getStripeErrorCode(error: unknown): string | null {
  const info = getStripeErrorInfo(error);
  return info.code || info.type;
}

function getDevelopmentErrorPayload(
  error: unknown,
): Record<string, string | number | null> {
  if (isProduction()) {
    return {};
  }

  const info = getStripeErrorInfo(error);

  return {
    detail: info.message,
    stripeType: info.type,
    stripeCode: info.code,
    stripeParam: info.param,
    stripeRequestId: info.requestId,
    stripeStatusCode: info.statusCode,
  };
}

function getCheckoutFailureMessage(error: unknown): string {
  const info = getStripeErrorInfo(error);
  const detail = info.message;

  if (isProduction()) {
    return 'Stripe Checkout sa nepodarilo vytvoriť.';
  }

  if (info.param) {
    return `Stripe Checkout sa nepodarilo vytvoriť: ${detail} [${info.param}]`;
  }

  return `Stripe Checkout sa nepodarilo vytvoriť: ${detail}`;
}

function withDevelopmentDetail(
  productionMessage: string,
  detail: string,
): string {
  if (isProduction() || !detail) {
    return productionMessage;
  }

  return `${productionMessage} Detail: ${detail}`;
}

// ============================================================
// ROUTES
// ============================================================

export async function GET() {
  return createJsonResponse({
    ok: true,
    route: '/api/payments/checkout',
    message: 'ZEDPERA checkout endpoint is running.',
    modes: ['payment', 'subscription'],
    currencyPolicyVersion: CURRENCY_POLICY_VERSION,
    catalogCurrency: DEFAULT_CATALOG_CURRENCY.toUpperCase(),
    environment: isProduction() ? 'production' : 'development',
    freeRedirect: '/dashboard?plan=free',
    successRedirect: '/payment/success?session_id={CHECKOUT_SESSION_ID}',
    cancelRedirect: '/pricing?payment=cancelled&lang={locale}',
    localization: CHECKOUT_LOCALIZATION,
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

    const locale = normalizeLocale(
      firstDefined(body.locale, body.language, body.lang),
    );
    const checkoutLocalization = getCheckoutLocalization(locale);

    /**
     * Menu platby sa určuje výhradne podľa aktuálnej jazykovej mutácie ZEDPERA.
     * Nepreberá sa z klienta ani z predchádzajúcej Stripe session.
     */
    const checkoutCurrency = getCheckoutCurrencyForLocale(locale);

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

    const baseUrl = getBaseUrl(request);
    const isFreeSelection = normalizedRequestedPlan === 'free';

    // Free balík nevytvára Stripe Checkout a nevyžaduje prihlásenie.
    // Samotný dashboard musí pre anonymného používateľa uplatniť free limity.
    if (isFreeSelection && addonIds.length === 0) {
      const redirectUrl = getFreeDashboardUrl(baseUrl, locale);

      return createJsonResponse({
        ok: true,
        action: 'redirect',
        checkoutRequired: false,
        mode: 'free',
        planId: 'free' as const,
        url: redirectUrl,
        redirectUrl,
        redirectPath:
          `/dashboard?plan=free&lang=${encodeURIComponent(locale)}`,
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
     * Všetky platené položky môžu otvoriť Stripe Checkout aj bez aktívnej
     * prihlasovacej relácie. Stripe si pri anonymnom nákupe vyžiada e-mail
     * priamo na svojej zabezpečenej platobnej stránke.
     *
     * Webhook následne priradí objednávku k existujúcemu ZEDPERA účtu podľa
     * Supabase user_id alebo podľa e-mailu z Stripe Checkout Session.
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

    const stripe = getStripe();

    let stripeCustomerId = '';
    let customerResolution: StripeCustomerResolution | null = null;

    if (isAuthenticated) {
      customerResolution = await resolveStripeCustomerForCheckout({
        stripe,
        userId,
        email,
        storedCustomerId: normalizeString(
          currentEntitlement?.stripe_customer_id,
        ),
      });

      stripeCustomerId = customerResolution.customerId;
    }

    const checkoutItemIds = getCheckoutCatalogItemIds(
      planId,
      addonIds,
    );

    // Platený hlavný balík je recurring subscription. Doplnky sú one-time.
    // Stripe oficiálne podporuje mixed cart v subscription mode:
    // recurring plán + one-time doplnky sa vyúčtujú na prvej faktúre.
    const checkoutMode: CheckoutMode = planId
      ? 'subscription'
      : 'payment';

    const lineItems: CheckoutLineItem[] = await createStripeLineItems(
      stripe,
      checkoutItemIds,
      checkoutCurrency,
    );

    const priceDiagnostics = await validateStripeCheckoutPrices({
      stripe,
      checkoutItemIds,
      lineItems,
      checkoutCurrency,
      checkoutMode,
    });

    if (!isProduction()) {
      console.info('ZEDPERA_CHECKOUT_PREFLIGHT_OK', {
        errorId,
        requestId,
        locale,
        checkoutCurrency: checkoutCurrency || 'auto',
        checkoutMode,
        checkoutItemIds,
        priceDiagnostics,
        customerResolution,
      });
    }

    const metadata = buildMetadata({
      userId,
      email,
      planId,
      addonIds,
      requestId,
      locale,
      checkoutCurrency: checkoutCurrency,
    });

    const successUrl = getSuccessUrl(baseUrl, locale);
    const cancelUrl = getCancelUrl(baseUrl, locale);

    const sessionParams: CheckoutSessionCreateParams = {
      mode: checkoutMode,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: {
        enabled: false,
      },
      locale: checkoutLocalization.stripeLocale,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_EXPIRY_SECONDS,
    };

    if (checkoutMode === 'subscription') {
      sessionParams.subscription_data = {
        metadata,
      };
    } else {
      sessionParams.payment_intent_data = {
        metadata,
        ...(email ? { receipt_email: email } : {}),
      };
      sessionParams.submit_type = 'pay';
    }

    /**
     * Jazyk rozhrania určuje menu platby:
     * SK -> EUR, CS/CZ -> CZK, DE -> EUR, PL -> PLN, HU -> HUF.
     * EN zostáva v režime AUTO a Stripe môže použiť lokálnu menu zákazníka.
     *
     * Pri explicitnej mene musia všetky použité Stripe Price objekty
     * obsahovať danú menu v currency_options.
     */
    if (checkoutCurrency) {
      sessionParams.currency = checkoutCurrency;
    }

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
      // Pri subscription mode Stripe zákazníka vytvorí automaticky. Parameter
      // customer_creation je preto nastavovaný iba pre jednorazovú platbu.
      if (checkoutMode === 'payment') {
        sessionParams.customer_creation = 'always';
      }

      if (email) {
        sessionParams.customer_email = email;
      }
    }

    const idempotencyKey = createIdempotencyKey({
      userId,
      planId,
      addonIds,
      requestId,
      locale,
      checkoutCurrency,
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
      mode: checkoutMode,
      purchaseType,

      planId,
      planName: planId ? PLANS[planId].name : null,
      addonIds,
      addonNames: addonIds.map((addonId) => ADDONS[addonId].name),

      currency:
        (
          session.currency ||
          checkoutCurrency ||
          DEFAULT_CATALOG_CURRENCY
        ).toUpperCase(),
      catalogCurrency: DEFAULT_CATALOG_CURRENCY.toUpperCase(),
      currencyPolicyVersion: CURRENCY_POLICY_VERSION,
      requestedCheckoutCurrency: checkoutCurrency?.toUpperCase() || 'AUTO',
      catalogTotalCents: totalCents,
      stripeAmountTotal: session.amount_total,
      basePages: getPurchasedBasePages(planId),
      extraPages: getPurchasedExtraPages(addonIds),

      successUrl,
      cancelUrl,
      locale,
      authenticated: isAuthenticated,
      ...(!isProduction()
        ? {
            priceDiagnostics,
            customerResolution,
          }
        : {}),
    });
  } catch (error: unknown) {
    const detail = getErrorMessage(error);
    const stripeInfo = getStripeErrorInfo(error);
    const stripeCode = getStripeErrorCode(error);

    console.error('ZEDPERA_CHECKOUT_ERROR', {
      errorId,
      requestId: requestId || null,
      detail,
      stripeType: stripeInfo.type,
      stripeCode,
      stripeParam: stripeInfo.param,
      stripeRequestId: stripeInfo.requestId,
      stripeStatusCode: stripeInfo.statusCode,
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
          ...getDevelopmentErrorPayload(error),
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
          ...getDevelopmentErrorPayload(error),
        },
        { status: 500 },
      );
    }

    if (detail.includes('STRIPE_PRICE_NOT_FOUND')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_PRICE_NOT_FOUND',
          code: 'STRIPE_PRICE_NOT_FOUND',
          message: withDevelopmentDetail(
            'Stripe Price ID neexistuje v aktuálnom Stripe režime. Skontrolujte, či nepoužívate LIVE Price ID so sk_test_ kľúčom alebo TEST Price ID so sk_live_ kľúčom.',
            detail,
          ),
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
        },
        { status: 500 },
      );
    }

    if (
      detail.includes('STRIPE_LINE_ITEM_PRICE_MISSING') ||
      detail.includes('STRIPE_LINE_ITEM_COUNT_MISMATCH')
    ) {
      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_LINE_ITEM_CONFIGURATION_INVALID',
          code: 'STRIPE_LINE_ITEM_CONFIGURATION_INVALID',
          message: withDevelopmentDetail(
            'Interné mapovanie katalógu na Stripe line items je neplatné. Skontrolujte lib/stripe/prices.ts a Price ID pre všetky kupované položky.',
            detail,
          ),
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
        },
        { status: 500 },
      );
    }

    if (detail.includes('STRIPE_PRICE_CURRENCY_UNSUPPORTED')) {
      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_PRICE_CURRENCY_UNSUPPORTED',
          code: 'STRIPE_PRICE_CURRENCY_UNSUPPORTED',
          message: withDevelopmentDetail(
            'Stripe Price existuje, ale nepodporuje menu vybranú pre aktuálny jazyk. Doplňte túto menu do currency_options na tom istom Price objekte.',
            detail,
          ),
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
        },
        { status: 400 },
      );
    }

    if (
      detail.includes('STRIPE_PRICE_TYPE_MISMATCH') ||
      detail.includes('STRIPE_PRICE_INTERVAL_MISMATCH') ||
      detail.includes('STRIPE_PRICE_INACTIVE') ||
      detail.includes('STRIPE_PRICE_DEFAULT_CURRENCY_MISMATCH')
    ) {
      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_PRICE_CONFIGURATION_INVALID',
          code: 'STRIPE_PRICE_CONFIGURATION_INVALID',
          message: withDevelopmentDetail(
            'Stripe Price konfigurácia nezodpovedá katalógu ZEDPERA. Skontrolujte aktivitu Price, recurring/one-time typ, mesačný interval a rovnakú default menu všetkých položiek.',
            detail,
          ),
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
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
          message: withDevelopmentDetail(
            'Platobná brána nie je správne nakonfigurovaná.',
            detail,
          ),
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
        },
        { status: 500 },
      );
    }

    if (stripeInfo.code === 'resource_missing') {
      const missingParam = stripeInfo.param || '';

      return createJsonResponse(
        {
          ok: false,
          error: 'STRIPE_RESOURCE_MISSING',
          code: 'STRIPE_RESOURCE_MISSING',
          message: missingParam.includes('customer')
            ? 'Stripe Customer neexistuje v aktuálnom TEST/LIVE režime. Route sa ho pokúsila obnoviť; skontrolujte Stripe kľúč a uložené stripe_customer_id.'
            : missingParam.includes('price')
              ? 'Stripe Price neexistuje v aktuálnom TEST/LIVE režime. Skontrolujte Price ID a Stripe Secret Key.'
              : 'Stripe nenašiel požadovaný objekt. Skontrolujte, či všetky Stripe ID patria do rovnakého TEST/LIVE režimu ako použitý Secret Key.',
          errorId,
          ...(requestId ? { requestId } : {}),
          ...getDevelopmentErrorPayload(error),
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
          : getCheckoutFailureMessage(error),
        errorId,
        ...(requestId ? { requestId } : {}),
        ...getDevelopmentErrorPayload(error),
      },
      { status: unavailable ? 503 : 500 },
    );
  }
}
