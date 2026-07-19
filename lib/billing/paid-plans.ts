import type { PlanId } from '@/lib/billing/catalog';

export const PAID_PLAN_IDS = [
  'seminar-work',
  'bachelor-thesis',
  'master-thesis',
] as const;

export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return (
    typeof value === 'string' &&
    PAID_PLAN_IDS.includes(value as PaidPlanId)
  );
}

export function getStripePriceId(planId: PaidPlanId): string {
  const priceIdByPlan: Record<PaidPlanId, string | undefined> = {
    'seminar-work': process.env.STRIPE_PRICE_SEMINAR_WORK,
    'bachelor-thesis':
      process.env.STRIPE_PRICE_BACHELOR_THESIS,
    'master-thesis':
      process.env.STRIPE_PRICE_MASTER_THESIS,
  };

  const priceId = priceIdByPlan[planId];

  if (!priceId) {
    throw new Error(
      `Pre balík "${planId}" nie je nastavené Stripe Price ID.`,
    );
  }

  return priceId;
}

export function isPlanId(value: unknown): value is PlanId {
  return (
    value === 'free' ||
    value === 'seminar-work' ||
    value === 'bachelor-thesis' ||
    value === 'master-thesis' ||
    value === 'admin'
  );
}