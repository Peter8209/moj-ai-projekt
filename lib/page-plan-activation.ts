import type { createAdminClient } from '@/lib/supabase/admin';

import {
  ADDON_PAGE_AMOUNTS,
  PLAN_PAGE_LIMITS,
} from '@/lib/page-quota';

/**
 * Používame skutočný návratový typ createAdminClient().
 *
 * Supabase rpc() nevracia obyčajný Promise, ale Postgrest builder,
 * ktorý je awaitovateľný. Ručne definovaný typ s návratom Promise
 * preto spôsoboval konflikt v Stripe webhook route.
 */
type AdminSupabaseClient = Awaited<
  ReturnType<typeof createAdminClient>
>;

type ApplyPagePurchaseInput = {
  admin: AdminSupabaseClient;
  userId: string;
  planId?: string | null;
  addonIds?: readonly string[];
  paymentReference?: string | null;
  resetPlan?: boolean;
};

export type ApplyPagePurchaseResult = {
  planId: string | null;
  extraPages: number;
  planActivated: boolean;
  extraPagesAdded: boolean;
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAddonIds(
  addonIds: readonly string[] | null | undefined,
): string[] {
  if (!Array.isArray(addonIds)) {
    return [];
  }

  return Array.from(
    new Set(
      addonIds
        .map((addonId) => normalizeString(addonId))
        .filter(Boolean),
    ),
  );
}

function getSupabaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'neznáma chyba';
  }

  const candidate = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };

  const parts = [
    typeof candidate.message === 'string'
      ? candidate.message.trim()
      : '',
    typeof candidate.details === 'string'
      ? candidate.details.trim()
      : '',
    typeof candidate.hint === 'string'
      ? candidate.hint.trim()
      : '',
    typeof candidate.code === 'string'
      ? `kód ${candidate.code.trim()}`
      : '',
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(' | ')
    : 'neznáma chyba';
}

function getExtraPageAmount(addonId: string): number {
  const value =
    ADDON_PAGE_AMOUNTS[
      addonId as keyof typeof ADDON_PAGE_AMOUNTS
    ];

  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

/**
 * Aktivuje počet strán po úspešnej Stripe platbe.
 *
 * - Pri kúpe nového balíka zavolá zedpera_activate_page_plan.
 * - Pri kúpe extra strán zavolá zedpera_add_extra_pages.
 * - Pri samostatnom nákupe doplnku bez resetu balíka nastavte
 *   resetPlan: false.
 */
export async function applySuccessfulPagePurchase({
  admin,
  userId,
  planId = null,
  addonIds = [],
  paymentReference = null,
  resetPlan = true,
}: ApplyPagePurchaseInput): Promise<ApplyPagePurchaseResult> {
  const normalizedUserId = normalizeString(userId);
  const normalizedPlanId = normalizeString(planId) || null;
  const normalizedPaymentReference =
    normalizeString(paymentReference) || null;
  const normalizedAddonIds = normalizeAddonIds(addonIds);

  if (!normalizedUserId) {
    throw new Error(
      'PAGE_PURCHASE_USER_ID_MISSING: Chýba userId používateľa.',
    );
  }

  let planActivated = false;

  if (
    resetPlan &&
    normalizedPlanId &&
    normalizedPlanId in PLAN_PAGE_LIMITS
  ) {
    const { error } = await admin.rpc(
      'zedpera_activate_page_plan',
      {
        p_user_id: normalizedUserId,
        p_plan_id: normalizedPlanId,
        p_payment_reference: normalizedPaymentReference,
      },
    );

    if (error) {
      throw new Error(
        `PAGE_PLAN_ACTIVATION_FAILED: ${getSupabaseErrorMessage(error)}`,
      );
    }

    planActivated = true;
  }

  const extraPages = normalizedAddonIds.reduce(
    (sum, addonId) => sum + getExtraPageAmount(addonId),
    0,
  );

  let extraPagesAdded = false;

  if (extraPages > 0) {
    const { error } = await admin.rpc(
      'zedpera_add_extra_pages',
      {
        p_user_id: normalizedUserId,
        p_pages: extraPages,
        p_payment_reference: normalizedPaymentReference,
      },
    );

    if (error) {
      throw new Error(
        `EXTRA_PAGES_ACTIVATION_FAILED: ${getSupabaseErrorMessage(error)}`,
      );
    }

    extraPagesAdded = true;
  }

  return {
    planId: normalizedPlanId,
    extraPages,
    planActivated,
    extraPagesAdded,
  };
}
