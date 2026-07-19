/**
 * Centrálna definícia balíkov, doplnkov, cien, limitov a dostupných funkcií.
 *
 * Dôležité:
 * - Stripe Price ID sa NEUKLADAJÚ priamo do zdrojového kódu.
 * - V katalógu je uložený iba názov environment premennej.
 * - Skutočná hodnota price_... sa načíta výhradne na serveri cez process.env.
 * - Platené hlavné balíky sú mesačné predplatné.
 * - Doplnky zostávajú samostatné platby, pretože predstavujú jednorazové
 *   rozšírenie aktuálneho projektu alebo balíka.
 * - Administrátorský prístup sa nesmie určovať podľa e-mailu vo frontende.
 *   Hodnota isAdmin musí pochádzať zo servera/databázy a následne sa odovzdá
 *   pomocným funkciám v tomto katalógu.
 */

// =====================================================
// IDENTIFIKÁTORY
// =====================================================

export type PlanId =
  | 'free'
  | 'seminar-work'
  | 'bachelor-thesis'
  | 'master-thesis'
  | 'admin';

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

export type FeatureModuleId =
  | 'ai-supervisor'
  | 'quality-audit'
  | 'humanizer'
  | 'citations'
  | 'planning'
  | 'emails'
  | 'translation'
  | 'originality'
  | 'data-analysis'
  | 'defense';

export type PaidPlanId = Exclude<PlanId, 'free' | 'admin'>;
export type PurchasableCatalogId = PaidPlanId | AddonId;

export type CatalogItemKind = 'plan' | 'addon';
export type CheckoutMode = 'payment' | 'subscription';
export type BillingInterval = 'month';
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

type PlanDefinitionBase = {
  kind: 'plan';
  name: string;
  shortName: string;
  description: string;
  priceCents: number;
  currency: CurrencyCode;
  pageLimit: number | null;
  promptLimit: number | null;
  attachmentLimit: number | null;
  features: readonly FeatureKey[];
  sortOrder: number;

  /**
   * Určuje, či sa má plán zobrazovať vo verejnom cenníku.
   * Ak hodnota nie je uvedená, plán sa považuje za verejný.
   */
  isPublic?: boolean;

  /**
   * Doplnkový explicitný príznak nákupu pre UI.
   * Autoritatívnym serverovým príznakom zostáva `purchasable`.
   */
  isPurchasable?: boolean;
};

export type FreePlanDefinition = PlanDefinitionBase & {
  id: 'free';
  priceCents: 0;
  purchasable: false;
  checkoutMode: null;
  billingInterval: null;
  stripePriceEnvKey: null;
};

export type PaidPlanDefinition = PlanDefinitionBase & {
  id: PaidPlanId;
  purchasable: true;
  checkoutMode: 'subscription';
  billingInterval: 'month';
  stripePriceEnvKey: StripePriceEnvironmentKey;
};

export type AdminPlanDefinition = PlanDefinitionBase & {
  id: 'admin';
  priceCents: 0;
  pageLimit: null;
  promptLimit: null;
  attachmentLimit: null;
  purchasable: false;
  checkoutMode: null;
  billingInterval: null;
  stripePriceEnvKey: null;
  isPublic: false;
  isPurchasable: false;
};

export type PlanDefinition =
  | FreePlanDefinition
  | PaidPlanDefinition
  | AdminPlanDefinition;

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
  checkoutMode: 'payment';
  billingInterval: null;
  stripePriceEnvKey: StripePriceEnvironmentKey;
  sortOrder: number;
};

export type CatalogDefinition = PlanDefinition | AddonDefinition;

export type EntitlementAccessOptions = {
  /**
   * Musí byť určené na serveri podľa databázového oprávnenia používateľa.
   * Nikdy nenastavujte túto hodnotu iba podľa e-mailu vo frontende.
   */
  isAdmin?: boolean;
};

export type EffectiveEntitlementLimits = {
  isAdmin: boolean;
  isUnlimited: boolean;
  pageLimit: number | null;
  promptLimit: number | null;
  attachmentLimit: number | null;
};

export type FeatureModuleDefinition = {
  id: FeatureModuleId;
  label: string;
  unavailableMessage: string;
};

// =====================================================
// ZOZNAMY FUNKCIÍ
// =====================================================

const FREE_FEATURES = [
  'ai-supervisor',
] as const satisfies readonly FeatureKey[];

const CORE_WRITING_FEATURES = [
  'ai-supervisor',
  'chapter-generation',
  'outline-generation',
  'quality-audit',
  'humanizer',
  'citations',
  'planning',
  'emails',
  'translation',
  'originality',
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

export const ALL_FEATURES: FeatureKey[] = [
  'ai-supervisor',
  'chapter-generation',
  'outline-generation',
  'quality-audit',
  'humanizer',
  'citations',
  'planning',
  'emails',
  'translation',
  'originality',
  'data-prepare',
  'data-descriptive',
  'data-questionnaires',
  'data-reliability',
  'data-normality',
  'data-correlations',
  'data-parametric-tests',
  'data-nonparametric-tests',
  'data-charts',
  'defense',
  'defense-presentation',
  'committee-questions',
];

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
      'Bezplatná verzia na základné vyskúšanie AI školiteľa s limitom 3 promptov, 3 normostrán a 1 prílohy.',
    priceCents: 0,
    currency: 'EUR',
    pageLimit: 3,
    promptLimit: 3,
    attachmentLimit: 1,
    features: [...FREE_FEATURES],
    isPublic: true,
    isPurchasable: false,
    purchasable: false,
    checkoutMode: null,
    billingInterval: null,
    stripePriceEnvKey: null,
    sortOrder: 0,
  },

  'seminar-work': {
    id: 'seminar-work',
    kind: 'plan',
    name: 'Seminárna práca',
    shortName: 'Seminárna práca',
    description:
      'Mesačné predplatné pre seminárne, ročníkové a zápočtové práce do 15 normostrán.',
    priceCents: 3900,
    currency: 'EUR',
    pageLimit: 15,
    promptLimit: null,
    attachmentLimit: 12,
    features: [...CORE_WRITING_FEATURES],
    isPublic: true,
    isPurchasable: true,
    purchasable: true,
    checkoutMode: 'subscription',
    billingInterval: 'month',
    stripePriceEnvKey: 'STRIPE_PRICE_SEMINAR_WORK',
    sortOrder: 10,
  },

  'bachelor-thesis': {
    id: 'bachelor-thesis',
    kind: 'plan',
    name: 'Bakalárska práca',
    shortName: 'Bakalárska práca',
    description:
      'Mesačné predplatné pre bakalársku prácu do 50 normostrán vrátane základnej analýzy dát a prípravy na obhajobu.',
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
    isPublic: true,
    isPurchasable: true,
    purchasable: true,
    checkoutMode: 'subscription',
    billingInterval: 'month',
    stripePriceEnvKey: 'STRIPE_PRICE_BACHELOR_THESIS',
    sortOrder: 20,
  },

  'master-thesis': {
    id: 'master-thesis',
    kind: 'plan',
    name: 'Diplomová / magisterská práca',
    shortName: 'Diplomová práca',
    description:
      'Mesačné predplatné pre diplomové a magisterské práce do 70 normostrán vrátane kompletnej analýzy dát a obhajoby.',
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
    isPublic: true,
    isPurchasable: true,
    purchasable: true,
    checkoutMode: 'subscription',
    billingInterval: 'month',
    stripePriceEnvKey: 'STRIPE_PRICE_MASTER_THESIS',
    sortOrder: 30,
  },

  admin: {
    id: 'admin',
    kind: 'plan',
    name: 'ADMIN',
    shortName: 'ADMIN',
    description:
      'Interný administrátorský balík s neobmedzeným prístupom ku všetkým funkciám.',
    priceCents: 0,
    currency: 'EUR',

    pageLimit: null,
    promptLimit: null,
    attachmentLimit: null,

    features: [...ALL_FEATURES],

    // Nezobrazovať vo verejnom cenníku.
    isPublic: false,

    // Nesmie sa dať kúpiť cez Stripe.
    isPurchasable: false,
    purchasable: false,
    checkoutMode: null,
    billingInterval: null,
    stripePriceEnvKey: null,
    sortOrder: 999,
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
      'Kompletné spracovanie štatistickej časti vrátane čistenia dát, deskriptívnej štatistiky, tvorby škál, subškál, reliability, normality, korelácií, testov a grafov.',
    priceCents: 8900,
    currency: 'EUR',
    extraPages: 0,
    features: [...COMPLETE_DATA_FEATURES],
    purchasable: true,
    checkoutMode: 'payment',
    billingInterval: null,
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
    billingInterval: null,
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
    billingInterval: null,
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
    billingInterval: null,
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
  'data-questionnaires': 'Tvorba škál, subškál a grafy',
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

export const FEATURE_MODULES = {
  'ai-supervisor': {
    id: 'ai-supervisor',
    label: 'AI školiteľ',
    unavailableMessage:
      'AI školiteľ nie je súčasťou aktuálneho balíka.',
  },
  'quality-audit': {
    id: 'quality-audit',
    label: 'Audit kvality',
    unavailableMessage:
      'Audit kvality nie je súčasťou aktuálneho balíka.',
  },
  humanizer: {
    id: 'humanizer',
    label: 'Humanizácia textu',
    unavailableMessage:
      'Humanizácia textu nie je súčasťou aktuálneho balíka.',
  },
  citations: {
    id: 'citations',
    label: 'Zdroje a citácie',
    unavailableMessage:
      'Zdroje a citácie nie sú súčasťou aktuálneho balíka.',
  },
  planning: {
    id: 'planning',
    label: 'Plánovanie',
    unavailableMessage:
      'Plánovanie nie je súčasťou aktuálneho balíka.',
  },
  emails: {
    id: 'emails',
    label: 'Emaily',
    unavailableMessage:
      'Emaily nie sú súčasťou aktuálneho balíka.',
  },
  translation: {
    id: 'translation',
    label: 'Preklad',
    unavailableMessage:
      'Preklad nie je súčasťou aktuálneho balíka.',
  },
  originality: {
    id: 'originality',
    label: 'Kontrola originality',
    unavailableMessage:
      'Kontrola originality nie je súčasťou aktuálneho balíka.',
  },
  'data-analysis': {
    id: 'data-analysis',
    label: 'Analýza dát',
    unavailableMessage:
      'Analýza dát nie je súčasťou aktuálneho balíka.',
  },
  defense: {
    id: 'defense',
    label: 'Obhajoba',
    unavailableMessage:
      'Obhajoba nie je súčasťou aktuálneho balíka.',
  },
} as const satisfies Record<FeatureModuleId, FeatureModuleDefinition>;

export const FEATURE_TO_MODULE = {
  'ai-supervisor': 'ai-supervisor',
  'chapter-generation': 'ai-supervisor',
  'outline-generation': 'ai-supervisor',
  'quality-audit': 'quality-audit',
  humanizer: 'humanizer',
  citations: 'citations',
  planning: 'planning',
  emails: 'emails',
  translation: 'translation',
  originality: 'originality',
  'data-prepare': 'data-analysis',
  'data-descriptive': 'data-analysis',
  'data-questionnaires': 'data-analysis',
  'data-reliability': 'data-analysis',
  'data-normality': 'data-analysis',
  'data-correlations': 'data-analysis',
  'data-parametric-tests': 'data-analysis',
  'data-nonparametric-tests': 'data-analysis',
  'data-charts': 'data-analysis',
  defense: 'defense',
  'defense-presentation': 'defense',
  'committee-questions': 'defense',
} as const satisfies Record<FeatureKey, FeatureModuleId>;

// =====================================================
// ZOZNAMY ID
// =====================================================

/**
 * Všetky identifikátory vrátane interných plánov.
 */
export const ALL_PLAN_IDS = Object.freeze(
  Object.keys(PLANS) as PlanId[],
);

/**
 * Verejné plány určené pre pricing a výber balíka.
 * ADMIN sa sem zámerne nedostane.
 */
export const PLAN_IDS = Object.freeze(
  ALL_PLAN_IDS.filter(
    (planId) => PLANS[planId].isPublic !== false,
  ),
);

export const ADDON_IDS = Object.freeze(
  Object.keys(ADDONS) as AddonId[],
);

export const FEATURE_KEYS = Object.freeze(
  Object.keys(FEATURE_LABELS) as FeatureKey[],
);

export const PURCHASABLE_PLAN_IDS = Object.freeze(
  ALL_PLAN_IDS.filter(
    (planId): planId is PaidPlanId =>
      PLANS[planId].purchasable === true,
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

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return (
    isPlanId(value) &&
    PLANS[value].purchasable === true
  );
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

export function isFeatureModuleId(
  value: unknown,
): value is FeatureModuleId {
  return (
    typeof value === 'string' &&
    hasOwnKey(FEATURE_MODULES, value)
  );
}

export function isPurchasableCatalogId(
  value: unknown,
): value is PurchasableCatalogId {
  return (
    isPaidPlanId(value) ||
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
): PaidPlanDefinition | AddonDefinition {
  if (isAddonId(itemId)) {
    return ADDONS[itemId];
  }

  return PLANS[itemId];
}

export function getFeatureLabel(feature: FeatureKey): string {
  return FEATURE_LABELS[feature];
}

export function getFeatureModuleId(
  feature: FeatureKey,
): FeatureModuleId {
  return FEATURE_TO_MODULE[feature];
}

export function getFeatureModuleDefinition(
  feature: FeatureKey,
): FeatureModuleDefinition {
  const moduleId = getFeatureModuleId(feature);

  return FEATURE_MODULES[moduleId];
}

export function getFeatureModuleLabel(
  feature: FeatureKey,
): string {
  return getFeatureModuleDefinition(feature).label;
}

export function getFeatureNotIncludedMessage(
  feature: FeatureKey,
): string {
  return getFeatureModuleDefinition(feature).unavailableMessage;
}

// =====================================================
// CENY A FAKTURÁCIA
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

/**
 * Použite na pricing stránke, aby sa pri platených balíkoch zobrazovalo
 * napríklad „39 € / mesiac“ a nie text o jednorazovej platbe.
 */
export function getCatalogBillingPriceLabel(
  itemId: PlanId | AddonId,
  locale = 'sk-SK',
): string {
  const item = getCatalogDefinition(itemId);
  const priceLabel = getCatalogPriceLabel(itemId, locale);

  if (item.checkoutMode === 'subscription') {
    return `${priceLabel} / mesiac`;
  }

  return priceLabel;
}

export function isSubscriptionCatalogItem(
  itemId: PlanId | AddonId,
): boolean {
  return (
    getCatalogDefinition(itemId).checkoutMode === 'subscription'
  );
}

export function isOneTimeCatalogItem(
  itemId: PlanId | AddonId,
): boolean {
  return getCatalogDefinition(itemId).checkoutMode === 'payment';
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
 *
 * Upozornenie:
 * - Price ID pre seminar-work, bachelor-thesis a master-thesis musí byť
 *   v Stripe vytvorené ako recurring monthly price.
 * - Price ID pre doplnky môže zostať jednorazové.
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
): number | null {
  const basePageLimit = PLANS[planId].pageLimit;

  if (basePageLimit === null) {
    return null;
  }

  return basePageLimit + getExtraPagesForAddons(addonIds);
}

/**
 * Vráti efektívne limity používateľa.
 *
 * Pri administrátorovi sú všetky hodnoty null, čo znamená neobmedzený
 * prístup. Samotné odpočítavanie promptov, strán a príloh však musí túto
 * hodnotu rešpektovať aj v serverových API routach.
 */
export function getEffectiveEntitlementLimits(
  planId: PlanId,
  addonIds: readonly AddonId[] = [],
  options: EntitlementAccessOptions = {},
): EffectiveEntitlementLimits {
  const isAdmin =
    options.isAdmin === true ||
    planId === 'admin';

  if (isAdmin) {
    return {
      isAdmin: true,
      isUnlimited: true,
      pageLimit: null,
      promptLimit: null,
      attachmentLimit: null,
    };
  }

  return {
    isAdmin: false,
    isUnlimited: false,
    pageLimit: getTotalPageLimit(planId, addonIds),
    promptLimit: PLANS[planId].promptLimit,
    attachmentLimit: PLANS[planId].attachmentLimit,
  };
}

export function getAllFeatures(): Set<FeatureKey> {
  return new Set<FeatureKey>(ALL_FEATURES);
}

export function getFeaturesForEntitlements(
  planId: PlanId,
  addonIds: readonly AddonId[] = [],
  options: EntitlementAccessOptions = {},
): Set<FeatureKey> {
  if (
    options.isAdmin === true ||
    planId === 'admin'
  ) {
    return getAllFeatures();
  }

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
  options: EntitlementAccessOptions = {},
): boolean {
  if (
    options.isAdmin === true ||
    planId === 'admin'
  ) {
    return true;
  }

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
