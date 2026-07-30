import {
  getStripePriceId as getCatalogStripePriceId,
  isPaidPlanId as isCatalogPaidPlanId,
  isPlanId as isCatalogPlanId,
  type PaidPlanId as CatalogPaidPlanId,
  type PlanId,
} from '@/lib/billing/catalog';

/**
 * Spätne kompatibilný zoznam platených hlavných plánov.
 * Limity, ceny a Stripe konfigurácia majú jediný zdroj pravdy v catalog.ts.
 */
export const PAID_PLAN_IDS = [
  'seminar-work',
  'bachelor-thesis',
  'master-thesis',
] as const satisfies readonly CatalogPaidPlanId[];

export type PaidPlanId = CatalogPaidPlanId;

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return isCatalogPaidPlanId(value);
}

export function getStripePriceId(planId: PaidPlanId): string {
  return getCatalogStripePriceId(planId);
}

export function isPlanId(value: unknown): value is PlanId {
  return isCatalogPlanId(value);
}
