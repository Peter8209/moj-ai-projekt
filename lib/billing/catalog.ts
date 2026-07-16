/**
 * Centrálna definícia balíkov, doplnkov, cien, limitov a dostupných funkcií.
 *
 * Dôležité:
 * - Stripe Price ID sa NEUKLADAJÚ priamo do zdrojového kódu.
 * - V katalógu je uložený iba názov environment premennej.
 * - Skutočná hodnota price_... sa načíta výhradne na serveri cez process.env.
 */

// =====================================================
// IDENTIFIKÁTORY
// =====================================================

export type PlanId =
  | 'free'
  | 'seminar-work'
  | 'bachelor-thesis'
  | 'master-thesis';

export type AddonId =
  | 'data-analysis'
  | 'extra-20'
  | 'extra-40'
  | 'extra-60';

export type FeatureKey =
  | 'ai-supervisor'
  | 'chapter-generation'
  | 'outline-generation'
  | 'quality-audit'
  | 'humanizer'
  | 'citations'
  | 'planning'
  | 'emails'
  | 'translation'
  | 'originality'
  | 'data-prepare'
  | 'data-descriptive'
  | 'data-questionnaires'
  | 'data-reliability'
  | 'data-normality'
  | 'data-correlations'
  | 'data-parametric-tests'
  | 'data-nonparametric-tests'
  | 'data-charts'
  | 'defense'
  | 'defense-presentation'
  | 'committee-questions';

export type PurchasableCatalogId = Exclude<PlanId, 'free'> | AddonId;

export type CatalogItemKind = 'plan' | 'addon';
export type CheckoutMode = 'payment';
export type CurrencyCode = 'EUR';

export type StripePriceEnvironmentKey =
  | 'STRIPE_PRICE_SEMINAR_WORK'
  | 'STRIPE_PRICE_BACHELOR_THESIS'
  | 'STRIPE_PRICE_MASTER_THESIS'
  | 'STRIPE_PRICE_DATA_ANALYSIS'
  | 'STRIPE_PRICE_EXTRA_20'
  | 'STRIPE_PRICE_EXTRA_40'
  | 'STRIPE_PRICE_EXTRA_60';

// =====================================================
// DEFINÍCIE
// =====================================================

export type PlanDefinition = {
  id: PlanId;
  kind: 'plan';
  name: string;
  shortName: string;
  description: string;
  priceCents: number;
  currency: CurrencyCode;
  pageLimit: number;
  promptLimit: number | null;
  attachmentLimit: number;
  features: readonly FeatureKey[];
  purchasable: boolean;
  checkoutMode: CheckoutMode | null;
  stripePriceEnvKey: StripePriceEnvironmentKey | null;
  sortOrder: number;
};

export type AddonDefinition = {
  id: AddonId;
  kind: 'addon';
  name: string;
  shortName: string;
  description: string;
  priceCents: number;
  currency: CurrencyCode;
  extraPages: number;
  features: readonly FeatureKey[];
  purchasable: true;
  checkoutMode: CheckoutMode;
  stripePriceEnvKey: StripePriceEnvironmentKey;
  sortOrder: number;
};

export type CatalogDefinition = PlanDefinition | AddonDefinition;

// =====================================================
// ZOZNAMY FUNKCIÍ
// =====================================================

const CORE_WRITING_FEATURES = [
  'ai-supervisor',
  'chapter-generation',
  'outline-generation',
  'quality-audit',
  'humanizer',
  'citations',
  'planning',
  'emails',
] as const satisfies readonly FeatureKey[];

const BACHELOR_DATA_FEATURES = [
  'data-prepare',
  'data-descriptive',
  'data-questionnaires',
  'data-reliability',
  'data-charts',
] as const satisfies readonly FeatureKey[];

const COMPLETE_DATA_FEATURES = [
  'data-prepare',
  'data-descriptive',
  'data-questionnaires',
  'data-reliability',
  'data-normality',
  'data-correlations',
  'data-parametric-tests',
  'data-nonparametric-tests',
  'data-charts',
] as const satisfies readonly FeatureKey[];

const DEFENSE_FEATURES = [
  'defense',
  'defense-presentation',
  'committee-questions',
] as const satisfies readonly FeatureKey[];

// =====================================================
// BALÍKY
// =====================================================

export const PLANS = {
  free: {
    id: 'free',
    kind: 'plan',
    name: 'FREE',
    shortName: 'FREE',
    description:
      'Bezplatná verzia na základné vyskúšanie AI školiteľa s obmedzeným počtom promptov, strán a príloh.',
    priceCents: 0,
    currency: 'EUR',
    pageLimit: 3,
    promptLimit: 3,
    attachmentLimit: 1,
    features: ['ai-supervisor'],
    purchasable: false,
    checkoutMode: null,
    stripePriceEnvKey: null,
    sortOrder: 0,
  },

  'seminar-work': {
    id: 'seminar-work',
    kind: 'plan',
    name: 'Seminárna práca',
    shortName: 'Seminárna práca',
    description:
      'Balík pre seminárne, ročníkové a zápočtové práce do 15 normostrán.',
    priceCents: 3900,
    currency: 'EUR',
    pageLimit: 15,
    promptLimit: null,
    attachmentLimit: 12,
    features: [...CORE_WRITING_FEATURES],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_SEMINAR_WORK',
    sortOrder: 10,
  },

  'bachelor-thesis': {
    id: 'bachelor-thesis',
    kind: 'plan',
    name: 'Bakalárska práca',
    shortName: 'Bakalárska práca',
    description:
      'Kompletný balík pre bakalársku prácu do 50 normostrán vrátane základnej analýzy dát a prípravy na obhajobu.',
    priceCents: 14900,
    currency: 'EUR',
    pageLimit: 50,
    promptLimit: null,
    attachmentLimit: 12,
    features: [
      ...CORE_WRITING_FEATURES,
      ...BACHELOR_DATA_FEATURES,
      ...DEFENSE_FEATURES,
    ],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_BACHELOR_THESIS',
    sortOrder: 20,
  },

  'master-thesis': {
    id: 'master-thesis',
    kind: 'plan',
    name: 'Diplomová / magisterská práca',
    shortName: 'Diplomová práca',
    description:
      'Najkomplexnejší balík pre diplomové a magisterské práce do 70 normostrán vrátane kompletnej analýzy dát a obhajoby.',
    priceCents: 18900,
    currency: 'EUR',
    pageLimit: 70,
    promptLimit: null,
    attachmentLimit: 12,
    features: [
      ...CORE_WRITING_FEATURES,
      ...COMPLETE_DATA_FEATURES,
      ...DEFENSE_FEATURES,
    ],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_MASTER_THESIS',
    sortOrder: 30,
  },
} as const satisfies Record<PlanId, PlanDefinition>;

// =====================================================
// DOPLNKY
// =====================================================

export const ADDONS = {
  'data-analysis': {
    id: 'data-analysis',
    kind: 'addon',
    name: 'Analýza dát',
    shortName: 'Analýza dát',
    description:
      'Kompletné spracovanie štatistickej časti vrátane čistenia dát, deskriptívnej štatistiky, dotazníkov, reliability, normality, korelácií, testov a grafov.',
    priceCents: 8900,
    currency: 'EUR',
    extraPages: 0,
    features: [...COMPLETE_DATA_FEATURES],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_DATA_ANALYSIS',
    sortOrder: 100,
  },

  'extra-20': {
    id: 'extra-20',
    kind: 'addon',
    name: 'Extra 20 strán',
    shortName: '+20 strán',
    description:
      'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 20 normostrán.',
    priceCents: 4900,
    currency: 'EUR',
    extraPages: 20,
    features: [],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_EXTRA_20',
    sortOrder: 110,
  },

  'extra-40': {
    id: 'extra-40',
    kind: 'addon',
    name: 'Extra 40 strán',
    shortName: '+40 strán',
    description:
      'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 40 normostrán.',
    priceCents: 8900,
    currency: 'EUR',
    extraPages: 40,
    features: [],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_EXTRA_40',
    sortOrder: 120,
  },

  'extra-60': {
    id: 'extra-60',
    kind: 'addon',
    name: 'Extra 60 strán',
    shortName: '+60 strán',
    description:
      'Rozšírenie aktuálneho projektu a používateľského balíka o ďalších 60 normostrán.',
    priceCents: 12900,
    currency: 'EUR',
    extraPages: 60,
    features: [],
    purchasable: true,
    checkoutMode: 'payment',
    stripePriceEnvKey: 'STRIPE_PRICE_EXTRA_60',
    sortOrder: 130,
  },
} as const satisfies Record<AddonId, AddonDefinition>;

// =====================================================
// POPISY FUNKCIÍ PRE UI
// =====================================================

export const FEATURE_LABELS = {
  'ai-supervisor': 'AI školiteľ a metodické vedenie',
  'chapter-generation': 'Tvorba jednotlivých kapitol',
  'outline-generation': 'Návrh osnovy a štruktúry práce',
  'quality-audit': 'Audit kvality a logiky textu',
  humanizer: 'Humanizácia textu',
  citations: 'Citácie, zdroje a bibliografia',
  planning: 'Plánovanie spracovania práce',
  emails: 'Príprava profesionálnych e-mailov',
  translation: 'Preklad odborného textu',
  originality: 'Kontrola originality textu',
  'data-prepare': 'Príprava a čistenie dát',
  'data-descriptive': 'Deskriptívna štatistika',
  'data-questionnaires': 'Dotazníky, škály a subškály',
  'data-reliability': 'Reliabilita a Cronbachovo alfa',
  'data-normality': 'Testovanie normality',
  'data-correlations': 'Korelačná analýza',
  'data-parametric-tests': 'Parametrické testy',
  'data-nonparametric-tests': 'Neparametrické testy',
  'data-charts': 'Grafy a vizualizácie',
  defense: 'Príprava na obhajobu',
  'defense-presentation': 'Prezentácia k obhajobe',
  'committee-questions': 'Otázky komisie a návrhy odpovedí',
} as const satisfies Record<FeatureKey, string>;

// =====================================================
// ZOZNAMY ID
// =====================================================

export const PLAN_IDS = Object.freeze(
  Object.keys(PLANS) as PlanId[],
);

export const ADDON_IDS = Object.freeze(
  Object.keys(ADDONS) as AddonId[],
);

export const FEATURE_KEYS = Object.freeze(
  Object.keys(FEATURE_LABELS) as FeatureKey[],
);

export const PURCHASABLE_PLAN_IDS = Object.freeze(
  PLAN_IDS.filter(
    (planId): planId is Exclude<PlanId, 'free'> =>
      planId !== 'free',
  ),
);

export const PURCHASABLE_CATALOG_IDS = Object.freeze([
  ...PURCHASABLE_PLAN_IDS,
  ...ADDON_IDS,
] as PurchasableCatalogId[]);

// =====================================================
// TYPE GUARDS
// =====================================================

function hasOwnKey<TObject extends object>(
  object: TObject,
  key: PropertyKey,
): key is keyof TObject {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && hasOwnKey(PLANS, value);
}

export function isAddonId(value: unknown): value is AddonId {
  return typeof value === 'string' && hasOwnKey(ADDONS, value);
}

export function isFeatureKey(value: unknown): value is FeatureKey {
  return (
    typeof value === 'string' &&
    hasOwnKey(FEATURE_LABELS, value)
  );
}

export function isPurchasableCatalogId(
  value: unknown,
): value is PurchasableCatalogId {
  return (
    (isPlanId(value) && value !== 'free') ||
    isAddonId(value)
  );
}

// =====================================================
// GETTERY KATALÓGU
// =====================================================

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function getAddonDefinition(addonId: AddonId): AddonDefinition {
  return ADDONS[addonId];
}

export function getCatalogDefinition(
  itemId: PlanId | AddonId,
): CatalogDefinition {
  if (isPlanId(itemId)) {
    return PLANS[itemId];
  }

  return ADDONS[itemId];
}

export function getPurchasableCatalogDefinition(
  itemId: PurchasableCatalogId,
) {
  if (isAddonId(itemId)) {
    return ADDONS[itemId];
  }

  return PLANS[itemId];
}

export function getFeatureLabel(feature: FeatureKey): string {
  return FEATURE_LABELS[feature];
}

// =====================================================
// CENY
// =====================================================

export function formatPriceCents(
  priceCents: number,
  locale = 'sk-SK',
  currency: CurrencyCode = 'EUR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
}

export function getCatalogPriceLabel(
  itemId: PlanId | AddonId,
  locale = 'sk-SK',
): string {
  const item = getCatalogDefinition(itemId);

  return formatPriceCents(
    item.priceCents,
    locale,
    item.currency,
  );
}

// =====================================================
// STRIPE
// =====================================================

export function getStripePriceEnvironmentKey(
  itemId: PurchasableCatalogId,
): StripePriceEnvironmentKey {
  const item = getPurchasableCatalogDefinition(itemId);

  return item.stripePriceEnvKey;
}

/**
 * Funkciu volajte iba na serveri, napríklad v:
 * app/api/payments/checkout/route.ts
 */
export function getStripePriceId(
  itemId: PurchasableCatalogId,
): string {
  const environmentKey =
    getStripePriceEnvironmentKey(itemId);

  const stripePriceId =
    process.env[environmentKey]?.trim();

  if (!stripePriceId) {
    throw new Error(
      `Chýba Stripe Price ID. Doplňte environment premennú ${environmentKey}.`,
    );
  }

  if (!stripePriceId.startsWith('price_')) {
    throw new Error(
      `Environment premenná ${environmentKey} musí obsahovať Stripe Price ID začínajúce na "price_".`,
    );
  }

  return stripePriceId;
}

export function getConfiguredStripePrices(): Partial<
  Record<PurchasableCatalogId, string>
> {
  const configuredPrices: Partial<
    Record<PurchasableCatalogId, string>
  > = {};

  for (const itemId of PURCHASABLE_CATALOG_IDS) {
    const environmentKey =
      getStripePriceEnvironmentKey(itemId);

    const value = process.env[environmentKey]?.trim();

    if (value?.startsWith('price_')) {
      configuredPrices[itemId] = value;
    }
  }

  return configuredPrices;
}

// =====================================================
// LIMITY A OPRÁVNENIA
// =====================================================

export function getExtraPagesForAddons(
  addonIds: readonly AddonId[],
): number {
  return addonIds.reduce(
    (total, addonId) =>
      total + ADDONS[addonId].extraPages,
    0,
  );
}

export function getTotalPageLimit(
  planId: PlanId,
  addonIds: readonly AddonId[] = [],
): number {
  return (
    PLANS[planId].pageLimit +
    getExtraPagesForAddons(addonIds)
  );
}

export function getFeaturesForEntitlements(
  planId: PlanId,
  addonIds: readonly AddonId[] = [],
): Set<FeatureKey> {
  const features = new Set<FeatureKey>(
    PLANS[planId].features,
  );

  for (const addonId of addonIds) {
    for (const feature of ADDONS[addonId].features) {
      features.add(feature);
    }
  }

  return features;
}

export function planIncludesFeature(
  planId: PlanId,
  feature: FeatureKey,
): boolean {
  return (PLANS[planId].features as readonly FeatureKey[]).includes(
    feature,
  );
}

export function addonIncludesFeature(
  addonId: AddonId,
  feature: FeatureKey,
): boolean {
  return (ADDONS[addonId].features as readonly FeatureKey[]).includes(
    feature,
  );
}

export function entitlementsIncludeFeature(
  planId: PlanId,
  addonIds: readonly AddonId[],
  feature: FeatureKey,
): boolean {
  if (planIncludesFeature(planId, feature)) {
    return true;
  }

  return addonIds.some((addonId) =>
    addonIncludesFeature(addonId, feature),
  );
}

export function normalizePlanId(
  value: unknown,
  fallback: PlanId = 'free',
): PlanId {
  return isPlanId(value) ? value : fallback;
}

export function normalizeAddonIds(
  value: unknown,
): AddonId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter(isAddonId)),
  );
}
