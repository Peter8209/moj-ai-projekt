/**
 * ZEDPERA – Stripe Checkout localization
 *
 * Tento súbor je jediný zdroj pravdy pre mapovanie:
 * jazyk ZEDPERA -> jazyk Stripe Checkoutu -> preferovaná mena.
 *
 * DÔLEŽITÉ:
 * - ceny sa sem NEZAPISUJÚ,
 * - konkrétne sumy sú definované v Stripe Price objektoch,
 * - pre CZ/PL/HU musí použitý Stripe Price obsahovať príslušnú menu
 *   v currency_options,
 * - pri EN menu nevynucujeme, aby Stripe mohol použiť lokálnu menu
 *   zákazníka podľa konfigurácie multi-currency Price / Adaptive Pricing.
 */

export const SUPPORTED_LOCALES = [
  'sk',
  'cs',
  'en',
  'de',
  'pl',
  'hu',
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const CHECKOUT_CURRENCIES = [
  'eur',
  'czk',
  'gbp',
  'usd',
  'pln',
  'huf',
] as const;

export type CheckoutCurrency = (typeof CHECKOUT_CURRENCIES)[number];

export type StripeCheckoutLocale = AppLocale;

export type CheckoutLocalization = Readonly<{
  locale: AppLocale;
  stripeLocale: StripeCheckoutLocale;
  /**
   * Ak je currency undefined, Checkout menu nevynúti.
   * To je zámer pre anglickú verziu.
   */
  currency?: CheckoutCurrency;
}>;

/**
 * Centrálna konfigurácia ZEDPERA -> Stripe.
 */
export const CHECKOUT_LOCALIZATION: Readonly<
  Record<AppLocale, CheckoutLocalization>
> = {
  sk: {
    locale: 'sk',
    stripeLocale: 'sk',
    currency: 'eur',
  },
  cs: {
    locale: 'cs',
    stripeLocale: 'cs',
    currency: 'czk',
  },
  en: {
    locale: 'en',
    stripeLocale: 'en',
  },
  de: {
    locale: 'de',
    stripeLocale: 'de',
    currency: 'eur',
  },
  pl: {
    locale: 'pl',
    stripeLocale: 'pl',
    currency: 'pln',
  },
  hu: {
    locale: 'hu',
    stripeLocale: 'hu',
    currency: 'huf',
  },
};

/**
 * Alias hodnoty z URL, browsera alebo staršej implementácie.
 * Správny jazykový kód češtiny je "cs"; "cz" akceptujeme iba ako alias.
 */
const LOCALE_ALIASES: Readonly<Record<string, AppLocale>> = {
  sk: 'sk',
  'sk-sk': 'sk',

  cs: 'cs',
  cz: 'cs',
  'cs-cz': 'cs',
  'cz-cz': 'cs',

  en: 'en',
  'en-gb': 'en',
  'en-us': 'en',

  de: 'de',
  'de-de': 'de',
  'de-at': 'de',
  'de-ch': 'de',

  pl: 'pl',
  'pl-pl': 'pl',

  hu: 'hu',
  'hu-hu': 'hu',
};

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Normalizuje napr.:
 * SK -> sk
 * sk-SK -> sk
 * CZ -> cs
 * cs-CZ -> cs
 * en-GB -> en
 * en_US -> en
 */
export function normalizeLocale(
  value: unknown,
  fallback: AppLocale = 'sk',
): AppLocale {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (!normalized) {
    return fallback;
  }

  const exactAlias = LOCALE_ALIASES[normalized];

  if (exactAlias) {
    return exactAlias;
  }

  const baseLanguage = normalized.split('-')[0];

  if (baseLanguage === 'cz') {
    return 'cs';
  }

  if (isAppLocale(baseLanguage)) {
    return baseLanguage;
  }

  return fallback;
}

export function getCheckoutLocalization(
  value: unknown,
): CheckoutLocalization {
  const locale = normalizeLocale(value);
  return CHECKOUT_LOCALIZATION[locale];
}

export function getStripeLocale(
  value: unknown,
): StripeCheckoutLocale {
  return getCheckoutLocalization(value).stripeLocale;
}

export function getCheckoutCurrency(
  value: unknown,
): CheckoutCurrency | undefined {
  return getCheckoutLocalization(value).currency;
}

export function shouldForceCheckoutCurrency(
  value: unknown,
): boolean {
  return getCheckoutCurrency(value) !== undefined;
}

/**
 * Pomocná funkcia pre existujúcu ZEDPERA navigáciu cez ?lang=...
 * Nevnucuje /cs/... alebo /pl/... routy, takže nemení aktuálnu štruktúru webu.
 */
export function withLocaleQuery(
  urlOrPath: string,
  localeValue: unknown,
): string {
  const locale = normalizeLocale(localeValue);

  const [beforeHash, hash = ''] = urlOrPath.split('#', 2);
  const separator = beforeHash.includes('?') ? '&' : '?';

  const localized = `${beforeHash}${separator}lang=${encodeURIComponent(locale)}`;

  return hash ? `${localized}#${hash}` : localized;
}
