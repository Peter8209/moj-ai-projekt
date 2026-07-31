import {
  getStripePriceId as getCatalogStripePriceId,
  isPaidPlanId as isCatalogPaidPlanId,
  isPlanId as isCatalogPlanId,
  type PaidPlanId as CatalogPaidPlanId,
  type PlanId,
} from '@/lib/billing/catalog';

/**
 * ZEDPERA – platené hlavné balíky.
 *
 * DÔLEŽITÉ:
 * - ceny, limity a Stripe Price ID ostávajú v catalog.ts,
 * - tento súbor je iba spätne kompatibilná vrstva pre staršie importy,
 * - lokalizácia Stripe Checkoutu je v checkout-locale.ts.
 */
export const PAID_PLAN_IDS = [
  'seminar-work',
  'bachelor-thesis',
  'master-thesis',
] as const satisfies readonly CatalogPaidPlanId[];

export type PaidPlanId = CatalogPaidPlanId;

/**
 * Overí, či hodnota predstavuje platený hlavný balík.
 * Autoritatívny zoznam zostáva v catalog.ts.
 */
export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return isCatalogPaidPlanId(value);
}

/**
 * Vráti Stripe Price ID definované v billing katalógu.
 *
 * Price objekt v Stripe má mať:
 * - základnú menu EUR,
 * - manuálne currency_options pre CZK / GBP / USD / PLN / HUF
 *   podľa nastavenia produktu.
 */
export function getStripePriceId(planId: PaidPlanId): string {
  return getCatalogStripePriceId(planId);
}

/**
 * Overí akýkoľvek PlanId vrátane free/admin.
 */
export function isPlanId(value: unknown): value is PlanId {
  return isCatalogPlanId(value);
}
