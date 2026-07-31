/**
 * Centrálna politika meny pre Stripe Checkout.
 *
 * Jeden Stripe Price ID môže obsahovať viac mien cez currency_options.
 * Tento súbor preto iba rozhoduje, ktorú menu má Checkout použiť podľa
 * jazykovej mutácie aplikácie. Price ID sa podľa meny nemení.
 */

export type CheckoutCurrency = 'eur' | 'czk' | 'pln' | 'huf';

export const DEFAULT_CATALOG_CURRENCY: CheckoutCurrency = 'eur';

export const CHECKOUT_CURRENCY_BY_LOCALE = Object.freeze({
  sk: 'eur',
  cs: 'czk',
  cz: 'czk',
  de: 'eur',
  pl: 'pln',
  hu: 'huf',
} as const satisfies Record<string, CheckoutCurrency>);

/**
 * EN zámerne vracia undefined: Checkout môže automaticky použiť lokálnu
 * menu zákazníka, ak ju všetky použité multi-currency Prices podporujú.
 */
export function getCheckoutCurrencyForLocale(
  locale: string | null | undefined,
): CheckoutCurrency | undefined {
  const normalized = String(locale ?? '')
    .trim()
    .toLowerCase()
    .replace('_', '-');

  if (!normalized || normalized === 'en' || normalized.startsWith('en-')) {
    return undefined;
  }

  const language = normalized.split('-')[0];

  return CHECKOUT_CURRENCY_BY_LOCALE[
    language as keyof typeof CHECKOUT_CURRENCY_BY_LOCALE
  ];
}

export function normalizeCheckoutCurrency(
  value: unknown,
): CheckoutCurrency | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'eur' ||
    normalized === 'czk' ||
    normalized === 'pln' ||
    normalized === 'huf'
  ) {
    return normalized;
  }

  return undefined;
}

export function formatCheckoutCurrency(
  currency: CheckoutCurrency | undefined,
): string {
  return currency?.toUpperCase() ?? 'AUTO';
}
