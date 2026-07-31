import Stripe from 'stripe';

import {
  getPurchasableCatalogDefinition,
  getStripePriceId,
  type PurchasableCatalogId,
} from '@/lib/billing/catalog';
import type { CheckoutCurrency } from '@/lib/currency';

type CheckoutSessionCreateMethod =
  Stripe['checkout']['sessions']['create'];

type CheckoutSessionCreateParams = NonNullable<
  Parameters<CheckoutSessionCreateMethod>[0]
>;

export type CheckoutLineItem = NonNullable<
  CheckoutSessionCreateParams['line_items']
>[number];

type CachedPrice = {
  value: Stripe.Price;
  expiresAt: number;
};

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
const priceCache = new Map<string, CachedPrice>();

function normalizeCurrency(value: string): string {
  return value.trim().toLowerCase();
}

async function retrievePriceWithCurrencies(
  stripe: Stripe,
  priceId: string,
): Promise<Stripe.Price> {
  const cached = priceCache.get(priceId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const price = await stripe.prices.retrieve(priceId, {
    expand: ['currency_options'],
  });

  priceCache.set(priceId, {
    value: price,
    expiresAt: now + PRICE_CACHE_TTL_MS,
  });

  return price;
}

function getSupportedCurrencies(price: Stripe.Price): Set<string> {
  return new Set([
    normalizeCurrency(price.currency),
    ...Object.keys(price.currency_options ?? {}).map(normalizeCurrency),
  ]);
}

function assertPriceActive(
  itemId: PurchasableCatalogId,
  price: Stripe.Price,
): void {
  if (!price.active) {
    throw new Error(`STRIPE_PRICE_INACTIVE:${itemId}:${price.id}`);
  }
}

function assertPriceBillingMode(
  itemId: PurchasableCatalogId,
  price: Stripe.Price,
): void {
  const item = getPurchasableCatalogDefinition(itemId);

  if (item.checkoutMode === 'subscription') {
    if (price.type !== 'recurring' || !price.recurring) {
      throw new Error(
        `STRIPE_PRICE_TYPE_MISMATCH:${itemId}:expected_recurring:${price.id}`,
      );
    }

    if (
      item.billingInterval === 'month' &&
      price.recurring.interval !== 'month'
    ) {
      throw new Error(
        `STRIPE_PRICE_INTERVAL_MISMATCH:${itemId}:expected_month:${price.id}`,
      );
    }

    return;
  }

  if (price.type !== 'one_time') {
    throw new Error(
      `STRIPE_PRICE_TYPE_MISMATCH:${itemId}:expected_one_time:${price.id}`,
    );
  }
}

function assertCurrencySupported(
  itemId: PurchasableCatalogId,
  price: Stripe.Price,
  checkoutCurrency: CheckoutCurrency | undefined,
): void {
  if (!checkoutCurrency) {
    return;
  }

  const requestedCurrency = normalizeCurrency(checkoutCurrency);
  const supportedCurrencies = getSupportedCurrencies(price);

  if (!supportedCurrencies.has(requestedCurrency)) {
    throw new Error(
      `STRIPE_PRICE_CURRENCY_UNSUPPORTED:${itemId}:${requestedCurrency}:${price.id}`,
    );
  }
}

export async function validateStripePrice(
  stripe: Stripe,
  itemId: PurchasableCatalogId,
  checkoutCurrency: CheckoutCurrency | undefined,
): Promise<Stripe.Price> {
  // Jediný autoritatívny zdroj Price ID je catalog.ts -> stripePriceEnvKey.
  // Žiadne názvy ENV sa neskladajú dynamicky podľa meny.
  const priceId = getStripePriceId(itemId);
  const price = await retrievePriceWithCurrencies(stripe, priceId);

  assertPriceActive(itemId, price);
  assertPriceBillingMode(itemId, price);
  assertCurrencySupported(itemId, price, checkoutCurrency);

  return price;
}

/**
 * Vytvorí Stripe line items z jedného Price ID na položku.
 *
 * Pri explicitnej mene overí currency_options všetkých Price objektov.
 * Pri AUTO režime Stripe lokalizuje menu podľa zákazníka; všetky Prices však
 * musia mať rovnakú default menu, čo kontrolujeme aj tu kvôli zrozumiteľnej
 * diagnostike ešte pred vytvorením Checkout Session.
 */
export async function createStripeLineItems(
  stripe: Stripe,
  itemIds: readonly PurchasableCatalogId[],
  checkoutCurrency: CheckoutCurrency | undefined,
): Promise<CheckoutLineItem[]> {
  const resolved = await Promise.all(
    itemIds.map(async (itemId) => ({
      itemId,
      price: await validateStripePrice(
        stripe,
        itemId,
        checkoutCurrency,
      ),
    })),
  );

  const defaultCurrencies = new Set(
    resolved.map(({ price }) => normalizeCurrency(price.currency)),
  );

  if (defaultCurrencies.size > 1) {
    throw new Error(
      `STRIPE_PRICE_DEFAULT_CURRENCY_MISMATCH:${Array.from(
        defaultCurrencies,
      ).join(',')}`,
    );
  }

  return resolved.map(({ price }) => ({
    price: price.id,
    quantity: 1,
  }));
}

export function clearStripePriceCache(): void {
  priceCache.clear();
}
