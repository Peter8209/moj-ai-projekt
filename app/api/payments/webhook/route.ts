import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from "@/lib/billing/catalog";
import { applySuccessfulPagePurchase } from "@/lib/page-plan-activation";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe klient sa zámerne nevytvára na top-level.
 * Build tak nespadne v prostredí, v ktorom ešte nie sú dostupné ENV premenné.
 */
let stripeClient: Stripe | null = null;

// ============================================================
// TYPES
// ============================================================

type MetadataRecord = Record<string, string>;

type PaidPlanId = Exclude<PlanId, "free">;

type EntitlementRow = {
  plan_id: string | null;
  addon_ids: string[] | null;
  prompts_used: number | null;
  activated_at: string | null;
  valid_until: string | null;
  billing_status: string | null;
};

type ResolvedPurchase = {
  userId: string;
  planId: PaidPlanId | null;
  purchasedAddonIds: AddonId[];
  persistentAddonIds: AddonId[];
  extraPageAddonIds: AddonId[];
  extraPages: number;
  metadata: MetadataRecord;
};

type AppliedPurchase = {
  userId: string;
  effectivePlanId: PlanId;
  purchasedAddonIds: AddonId[];
  activeAddonIds: AddonId[];
  extraPages: number;
};

type WebhookProcessingResult = {
  processed: boolean;
  action:
    | "checkout_fulfilled"
    | "checkout_already_fulfilled"
    | "checkout_payment_pending"
    | "checkout_payment_failed"
    | "invoice_paid"
    | "invoice_already_processed"
    | "invoice_payment_failed"
    | "subscription_updated"
    | "subscription_deleted"
    | "subscription_delete_ignored"
    | "ignored"
    | "unsupported_metadata";
  reason?: string;
  objectId?: string;
  userId?: string;
  planId?: PlanId | null;
  purchasedAddonIds?: AddonId[];
  activeAddonIds?: AddonId[];
  extraPages?: number;
  billingStatus?: string;
  validUntil?: string | null;
};

type StripeInvoiceCompatibility = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  subscription_details?: {
    metadata?: Stripe.Metadata | null;
  } | null;
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
      metadata?: Stripe.Metadata | null;
    } | null;
  } | null;
};

type StripeSubscriptionCompatibility = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  ended_at?: number | null;
  latest_invoice?: string | Stripe.Invoice | null;
  items: Stripe.Subscription["items"] & {
    data: Array<
      Stripe.SubscriptionItem & {
        current_period_start?: number | null;
        current_period_end?: number | null;
      }
    >;
  };
};

// ============================================================
// CONSTANTS
// ============================================================

const VALID_PLAN_IDS = new Set<PlanId>(Object.keys(PLANS) as PlanId[]);
const VALID_ADDON_IDS = new Set<AddonId>(Object.keys(ADDONS) as AddonId[]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXPECTED_CURRENCY = "eur";

/** Úspešná platba už bola použitá na aktiváciu oprávnení. */
const PAYMENT_APPLIED_KEY = "zedpera_payment_applied";
const PAYMENT_APPLIED_EVENT_KEY = "zedpera_payment_event_id";
const PAYMENT_APPLIED_REFERENCE_KEY = "zedpera_payment_reference";
const PAYMENT_APPLIED_AT_KEY = "zedpera_payment_applied_at";

/** Neúspešná platba už bola zaevidovaná pre konkrétnu Stripe udalosť. */
const PAYMENT_FAILED_EVENT_KEY = "zedpera_payment_failed_event_id";
const PAYMENT_FAILED_AT_KEY = "zedpera_payment_failed_at";

const SUPPORTED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

// ============================================================
// STRIPE INITIALIZATION
// ============================================================

function getStripeClient(secretKey: string): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      maxNetworkRetries: 2,
      timeout: 20_000,
      typescript: true,
    });
  }

  return stripeClient;
}

// ============================================================
// GENERIC HELPERS
// ============================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function normalizeMetadata(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): MetadataRecord {
  if (!metadata) {
    return {};
  }

  const result: MetadataRecord = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedValue = value.trim();

    if (normalizedValue) {
      result[key] = normalizedValue;
    }
  }

  return result;
}

function mergeMetadata(
  ...sources: Array<Stripe.Metadata | MetadataRecord | null | undefined>
): MetadataRecord {
  return sources.reduce<MetadataRecord>(
    (result, source) => ({
      ...result,
      ...normalizeMetadata(source),
    }),
    {},
  );
}

function readMetadataValue(metadata: MetadataRecord, keys: string[]): string {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getObjectId(
  value:
    | string
    | {
        id?: string | null;
      }
    | null
    | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value.id === "string") {
    return value.id;
  }

  return "";
}

function normalizeUserId(value: unknown): string {
  const candidate = String(value || "").trim();

  return UUID_PATTERN.test(candidate) ? candidate : "";
}

function normalizePlanId(value: unknown): PlanId | null {
  const candidate = String(value || "").trim() as PlanId;

  if (!candidate || !VALID_PLAN_IDS.has(candidate)) {
    return null;
  }

  return candidate;
}

function normalizePaidPlanId(value: unknown): PaidPlanId | null {
  const planId = normalizePlanId(value);

  if (!planId || planId === "free") {
    return null;
  }

  return planId;
}

function normalizeAddonIds(values: unknown[]): AddonId[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value): value is AddonId =>
          VALID_ADDON_IDS.has(value as AddonId),
        ),
    ),
  );
}

function parseAddonMetadata(value: unknown): AddonId[] {
  if (Array.isArray(value)) {
    return normalizeAddonIds(value);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const normalizedValue = value.trim();

  try {
    const parsed = JSON.parse(normalizedValue);

    if (Array.isArray(parsed)) {
      return normalizeAddonIds(parsed);
    }
  } catch {
    // Spätná kompatibilita: addon ID môžu byť oddelené čiarkou,
    // bodkočiarkou alebo zvislou čiarou.
  }

  return normalizeAddonIds(
    normalizedValue
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function toSafeInteger(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(Math.floor(numberValue), 0);
}

function unixToIso(value: unknown): string | null {
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1_000).toISOString();
}

function isPersistentAddon(addonId: AddonId): boolean {
  return ADDONS[addonId].features.length > 0;
}

function isExtraPageAddon(addonId: AddonId): boolean {
  return ADDONS[addonId].extraPages > 0;
}

function getExtraPages(addonIds: AddonId[]): number {
  return addonIds.reduce(
    (total, addonId) => total + ADDONS[addonId].extraPages,
    0,
  );
}

function normalizeExistingPlanId(value: unknown): PlanId {
  return normalizePlanId(value) || "free";
}

function isPermanentMetadataError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return [
    "USER_ID_METADATA_MISMATCH",
    "MISSING_OR_INVALID_USER_ID",
    "UNSUPPORTED_PLAN_ID:",
    "PAID_CHECKOUT_CANNOT_ACTIVATE_FREE_PLAN",
    "MISSING_PURCHASE_METADATA",
    "MISSING_PAID_PLAN_ID",
  ].some((code) => message.includes(code));
}

function getSubscriptionBillingStatus(
  subscription: Stripe.Subscription,
): string {
  const compatible = subscription as StripeSubscriptionCompatibility;

  if (
    compatible.cancel_at_period_end &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    return "canceling";
  }

  return subscription.status;
}

function getSubscriptionPeriodEndUnix(
  subscription: Stripe.Subscription,
): number | null {
  const compatible = subscription as StripeSubscriptionCompatibility;

  if (
    compatible.cancel_at_period_end &&
    Number.isFinite(Number(compatible.cancel_at)) &&
    Number(compatible.cancel_at) > 0
  ) {
    return Number(compatible.cancel_at);
  }

  if (
    Number.isFinite(Number(compatible.current_period_end)) &&
    Number(compatible.current_period_end) > 0
  ) {
    return Number(compatible.current_period_end);
  }

  const itemPeriodEnds = compatible.items.data
    .map((item) => Number(item.current_period_end))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (itemPeriodEnds.length > 0) {
    return Math.max(...itemPeriodEnds);
  }

  if (
    Number.isFinite(Number(compatible.ended_at)) &&
    Number(compatible.ended_at) > 0
  ) {
    return Number(compatible.ended_at);
  }

  return null;
}

function getSubscriptionValidUntil(
  subscription: Stripe.Subscription,
): string | null {
  return unixToIso(getSubscriptionPeriodEndUnix(subscription));
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string {
  const compatible = invoice as StripeInvoiceCompatibility;

  const parentSubscription =
    compatible.parent?.type === "subscription_details"
      ? compatible.parent.subscription_details?.subscription
      : null;

  return (
    getObjectId(parentSubscription) || getObjectId(compatible.subscription)
  );
}

function getInvoiceSubscriptionMetadata(
  invoice: Stripe.Invoice,
): MetadataRecord {
  const compatible = invoice as StripeInvoiceCompatibility;

  return mergeMetadata(
    compatible.subscription_details?.metadata,
    compatible.parent?.type === "subscription_details"
      ? compatible.parent.subscription_details?.metadata
      : null,
  );
}

function getSubscriptionLatestInvoiceId(
  subscription: Stripe.Subscription,
): string {
  const compatible = subscription as StripeSubscriptionCompatibility;

  return getObjectId(compatible.latest_invoice);
}

function getExpandedLatestInvoice(
  subscription: Stripe.Subscription,
): Stripe.Invoice | null {
  const compatible = subscription as StripeSubscriptionCompatibility;
  const latestInvoice = compatible.latest_invoice;

  if (latestInvoice && typeof latestInvoice !== "string") {
    return latestInvoice;
  }

  return null;
}

function isPaymentApplied(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): boolean {
  return normalizeMetadata(metadata)[PAYMENT_APPLIED_KEY] === "true";
}

function isFailureEventAlreadyRecorded(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
  eventId: string,
): boolean {
  return normalizeMetadata(metadata)[PAYMENT_FAILED_EVENT_KEY] === eventId;
}

function isCheckoutPaymentCompleted(session: Stripe.Checkout.Session): boolean {
  return (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  );
}

function isSubscriptionProvisionable(
  subscription: Stripe.Subscription,
): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
}

function isSubscriptionDefinitivelyEnded(
  subscription: Stripe.Subscription,
): boolean {
  return (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  );
}

// ============================================================
// STRIPE OBJECT RETRIEVAL AND METADATA
// ============================================================

async function retrieveCustomerMetadata(
  stripe: Stripe,
  customerValue: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<MetadataRecord> {
  const customerId = getObjectId(customerValue);

  if (!customerId) {
    return {};
  }

  try {
    if (typeof customerValue !== "string" && customerValue) {
      if ("deleted" in customerValue && customerValue.deleted) {
        return {};
      }

      return normalizeMetadata((customerValue as Stripe.Customer).metadata);
    }

    const customer = await stripe.customers.retrieve(customerId);

    if ("deleted" in customer && customer.deleted) {
      return {};
    }

    return normalizeMetadata((customer as Stripe.Customer).metadata);
  } catch (error) {
    console.warn("STRIPE_WEBHOOK_CUSTOMER_METADATA_WARNING:", {
      customerId,
      message: getErrorMessage(error),
    });

    return {};
  }
}

async function getPaymentIntentMetadata(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<MetadataRecord> {
  const paymentIntentId = getObjectId(session.payment_intent);

  if (!paymentIntentId) {
    return {};
  }

  try {
    if (typeof session.payment_intent !== "string" && session.payment_intent) {
      return normalizeMetadata(session.payment_intent.metadata);
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return normalizeMetadata(paymentIntent.metadata);
  } catch (error) {
    console.warn("STRIPE_WEBHOOK_PAYMENT_INTENT_METADATA_WARNING:", {
      paymentIntentId,
      message: getErrorMessage(error),
    });

    return {};
  }
}

async function retrieveSubscription(
  stripe: Stripe,
  subscriptionValue: string | Stripe.Subscription | null,
): Promise<Stripe.Subscription | null> {
  if (!subscriptionValue) {
    return null;
  }

  if (typeof subscriptionValue !== "string") {
    return subscriptionValue;
  }

  return stripe.subscriptions.retrieve(subscriptionValue, {
    expand: ["latest_invoice"],
  });
}

async function retrieveCheckoutSession(
  stripe: Stripe,
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: [
      "customer",
      "payment_intent",
      "subscription",
      "subscription.latest_invoice",
    ],
  });
}

async function retrieveInvoiceIfNeeded(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<Stripe.Invoice> {
  if (invoice.metadata) {
    return invoice;
  }

  return stripe.invoices.retrieve(invoice.id);
}

async function resolvePurchaseMetadata({
  stripe,
  session,
  subscription,
  invoice,
  requirePurchaseMetadata = true,
}: {
  stripe: Stripe;
  session?: Stripe.Checkout.Session | null;
  subscription?: Stripe.Subscription | null;
  invoice?: Stripe.Invoice | null;
  requirePurchaseMetadata?: boolean;
}): Promise<ResolvedPurchase> {
  const [customerMetadata, paymentIntentMetadata] = await Promise.all([
    retrieveCustomerMetadata(
      stripe,
      (session?.customer ||
        subscription?.customer ||
        invoice?.customer ||
        null) as string | Stripe.Customer | Stripe.DeletedCustomer | null,
    ),
    session ? getPaymentIntentMetadata(stripe, session) : Promise.resolve({}),
  ]);

  /**
   * Priorita metadata od najvšeobecnejších po najkonkrétnejšie:
   * Customer -> PaymentIntent -> Subscription -> Invoice snapshot -> Invoice -> Session.
   */
  const metadata = mergeMetadata(
    customerMetadata,
    paymentIntentMetadata,
    subscription?.metadata,
    invoice ? getInvoiceSubscriptionMetadata(invoice) : null,
    invoice?.metadata,
    session?.metadata,
  );

  const metadataUserId = normalizeUserId(
    readMetadataValue(metadata, [
      "user_id",
      "userId",
      "userid",
      "supabase_user_id",
    ]),
  );

  const referenceUserId = normalizeUserId(session?.client_reference_id);

  if (metadataUserId && referenceUserId && metadataUserId !== referenceUserId) {
    throw new Error("USER_ID_METADATA_MISMATCH");
  }

  const userId = metadataUserId || referenceUserId;

  if (!userId) {
    throw new Error("MISSING_OR_INVALID_USER_ID");
  }

  const rawPlanId = readMetadataValue(metadata, [
    "plan_id",
    "planId",
    "plan",
    "selectedPlan",
  ]);

  const normalizedPlanId = normalizePlanId(rawPlanId);

  if (rawPlanId && !normalizedPlanId) {
    throw new Error(`UNSUPPORTED_PLAN_ID: ${rawPlanId}`);
  }

  if (normalizedPlanId === "free") {
    throw new Error("PAID_CHECKOUT_CANNOT_ACTIVATE_FREE_PLAN");
  }

  const planId = normalizePaidPlanId(normalizedPlanId);

  const rawAddons = readMetadataValue(metadata, [
    "addons",
    "addon_ids",
    "addonIds",
    "selectedAddons",
    "addOns",
  ]);

  const purchasedAddonIds = parseAddonMetadata(rawAddons);

  if (requirePurchaseMetadata && !planId && purchasedAddonIds.length === 0) {
    throw new Error("MISSING_PURCHASE_METADATA");
  }

  const persistentAddonIds = purchasedAddonIds.filter(isPersistentAddon);
  const extraPageAddonIds = purchasedAddonIds.filter(isExtraPageAddon);

  return {
    userId,
    planId,
    purchasedAddonIds,
    persistentAddonIds,
    extraPageAddonIds,
    extraPages: getExtraPages(extraPageAddonIds),
    metadata,
  };
}

// ============================================================
// ENTITLEMENTS
// ============================================================

async function loadCurrentEntitlement(
  userId: string,
): Promise<EntitlementRow | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("zedpera_user_entitlements")
    .select(
      [
        "plan_id",
        "addon_ids",
        "prompts_used",
        "activated_at",
        "valid_until",
        "billing_status",
      ].join(", "),
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`ENTITLEMENT_LOAD_FAILED: ${error.message}`);
  }

  return data as EntitlementRow | null;
}

async function upsertPaidEntitlement({
  userId,
  planId,
  persistentAddonIds,
  billingStatus,
  validUntil,
  resetPrompts,
}: {
  userId: string;
  planId: PaidPlanId | null;
  persistentAddonIds: AddonId[];
  billingStatus: string;
  validUntil: string | null;
  resetPrompts: boolean;
}): Promise<{
  effectivePlanId: PlanId;
  activeAddonIds: AddonId[];
}> {
  const admin = createAdminClient();
  const current = await loadCurrentEntitlement(userId);

  const effectivePlanId = planId || normalizeExistingPlanId(current?.plan_id);
  const plan = PLANS[effectivePlanId];

  /**
   * Extra stránky nie sú trvalé funkčné oprávnenie.
   * V addon_ids ponechávame iba addony, ktoré sprístupňujú funkcie.
   */
  const currentPersistentAddonIds = normalizeAddonIds(
    current?.addon_ids || [],
  ).filter(isPersistentAddon);

  const activeAddonIds = Array.from(
    new Set([...currentPersistentAddonIds, ...persistentAddonIds]),
  );

  const now = new Date().toISOString();
  const isNewPlanPurchase = planId !== null;

  const { error } = await admin.from("zedpera_user_entitlements").upsert(
    {
      user_id: userId,
      plan_id: effectivePlanId,
      addon_ids: activeAddonIds,
      prompt_limit: plan.promptLimit,
      prompts_used: resetPrompts ? 0 : toSafeInteger(current?.prompts_used, 0),
      attachment_limit: plan.attachmentLimit,
      activated_at: isNewPlanPurchase ? now : current?.activated_at || now,
      valid_until: validUntil,
      billing_status: billingStatus,
      updated_at: now,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw new Error(`ENTITLEMENT_UPSERT_FAILED: ${error.message}`);
  }

  return {
    effectivePlanId,
    activeAddonIds,
  };
}

async function updateBillingStatus({
  userId,
  billingStatus,
  validUntil,
}: {
  userId: string;
  billingStatus: string;
  validUntil: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const current = await loadCurrentEntitlement(userId);
  const now = new Date().toISOString();

  if (!current) {
    const freePlan = PLANS.free;

    const { error } = await admin.from("zedpera_user_entitlements").upsert(
      {
        user_id: userId,
        plan_id: "free",
        addon_ids: [],
        prompt_limit: freePlan.promptLimit,
        prompts_used: 0,
        attachment_limit: freePlan.attachmentLimit,
        activated_at: now,
        valid_until: validUntil,
        billing_status: billingStatus,
        updated_at: now,
      },
      {
        onConflict: "user_id",
      },
    );

    if (error) {
      throw new Error(`BILLING_STATUS_UPSERT_FAILED: ${error.message}`);
    }

    return;
  }

  const { error } = await admin
    .from("zedpera_user_entitlements")
    .update({
      billing_status: billingStatus,
      valid_until: validUntil,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`BILLING_STATUS_UPDATE_FAILED: ${error.message}`);
  }
}

async function applySuccessfulPurchase({
  purchase,
  paymentReference,
  billingStatus,
  validUntil,
  resetPlan,
  resetPrompts,
  addonIdsForPageActivation,
}: {
  purchase: ResolvedPurchase;
  paymentReference: string;
  billingStatus: string;
  validUntil: string | null;
  resetPlan: boolean;
  resetPrompts: boolean;
  addonIdsForPageActivation?: AddonId[];
}): Promise<AppliedPurchase> {
  const entitlement = await upsertPaidEntitlement({
    userId: purchase.userId,
    planId: purchase.planId,
    persistentAddonIds: purchase.persistentAddonIds,
    billingStatus,
    validUntil,
    resetPrompts,
  });

  const admin = createAdminClient();

  /**
   * page-plan-activation musí používať paymentReference ako idempotency kľúč.
   * Pre predplatné je týmto kľúčom ID Stripe faktúry, takže checkout webhook
   * a invoice.paid nemôžu tú istú platbu započítať dvakrát.
   */
  const pageActivation = await applySuccessfulPagePurchase({
    admin,
    userId: purchase.userId,
    planId: purchase.planId,
    addonIds: addonIdsForPageActivation || purchase.purchasedAddonIds,
    paymentReference,
    resetPlan,
  });

  return {
    userId: purchase.userId,
    effectivePlanId: entitlement.effectivePlanId,
    purchasedAddonIds: purchase.purchasedAddonIds,
    activeAddonIds: entitlement.activeAddonIds,
    extraPages: pageActivation.extraPages,
  };
}

async function downgradeUserToFree({
  userId,
  paymentReference,
}: {
  userId: string;
  paymentReference: string;
}): Promise<boolean> {
  const current = await loadCurrentEntitlement(userId);

  /** Opakovaná deleted udalosť už používateľa na Free znovu neresetuje. */
  if (
    normalizeExistingPlanId(current?.plan_id) === "free" &&
    current?.billing_status === "canceled"
  ) {
    return false;
  }

  const admin = createAdminClient();
  const freePlan = PLANS.free;
  const now = new Date().toISOString();

  const { error } = await admin.from("zedpera_user_entitlements").upsert(
    {
      user_id: userId,
      plan_id: "free",
      addon_ids: [],
      prompt_limit: freePlan.promptLimit,
      prompts_used: 0,
      attachment_limit: freePlan.attachmentLimit,
      activated_at: now,
      valid_until: null,
      billing_status: "canceled",
      updated_at: now,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw new Error(`FREE_PLAN_UPSERT_FAILED: ${error.message}`);
  }

  await applySuccessfulPagePurchase({
    admin,
    userId,
    planId: "free",
    addonIds: [],
    paymentReference,
    resetPlan: true,
  });

  return true;
}

// ============================================================
// STRIPE MARKERS / IDEMPOTENCY
// ============================================================

function buildPaymentAppliedMetadata({
  existingMetadata,
  eventId,
  paymentReference,
}: {
  existingMetadata: Stripe.Metadata | MetadataRecord | null | undefined;
  eventId: string;
  paymentReference: string;
}): MetadataRecord {
  return {
    ...normalizeMetadata(existingMetadata),
    [PAYMENT_APPLIED_KEY]: "true",
    [PAYMENT_APPLIED_EVENT_KEY]: eventId,
    [PAYMENT_APPLIED_REFERENCE_KEY]: paymentReference,
    [PAYMENT_APPLIED_AT_KEY]: new Date().toISOString(),
  };
}

async function markCheckoutPaymentApplied({
  stripe,
  session,
  eventId,
  paymentReference,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  eventId: string;
  paymentReference: string;
}): Promise<void> {
  const markerMetadata = buildPaymentAppliedMetadata({
    existingMetadata: session.metadata,
    eventId,
    paymentReference,
  });

  const operations: Array<Promise<unknown>> = [
    stripe.checkout.sessions.update(session.id, {
      metadata: markerMetadata,
    }),
  ];

  const paymentIntentId = getObjectId(session.payment_intent);

  if (paymentIntentId) {
    const paymentIntentMetadata =
      typeof session.payment_intent !== "string" && session.payment_intent
        ? session.payment_intent.metadata
        : null;

    operations.push(
      stripe.paymentIntents.update(paymentIntentId, {
        metadata: buildPaymentAppliedMetadata({
          existingMetadata: paymentIntentMetadata,
          eventId,
          paymentReference,
        }),
      }),
    );
  }

  const results = await Promise.allSettled(operations);
  const successCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  if (successCount === 0) {
    console.error("STRIPE_WEBHOOK_CHECKOUT_MARKER_ERROR:", {
      sessionId: session.id,
      eventId,
      errors: results.map((result) =>
        result.status === "rejected" ? getErrorMessage(result.reason) : null,
      ),
    });
  }
}

async function markInvoicePaymentApplied({
  stripe,
  invoice,
  eventId,
  paymentReference,
}: {
  stripe: Stripe;
  invoice: Stripe.Invoice;
  eventId: string;
  paymentReference: string;
}): Promise<void> {
  try {
    await stripe.invoices.update(invoice.id, {
      metadata: buildPaymentAppliedMetadata({
        existingMetadata: invoice.metadata,
        eventId,
        paymentReference,
      }),
    });
  } catch (error) {
    /**
     * Databázová aktivácia už prebehla. Marker je sekundárna ochrana;
     * hlavná ochrana je paymentReference v page-plan-activation.
     */
    console.error("STRIPE_WEBHOOK_INVOICE_MARKER_ERROR:", {
      invoiceId: invoice.id,
      eventId,
      message: getErrorMessage(error),
    });
  }
}

async function markCheckoutFailureRecorded({
  stripe,
  session,
  eventId,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  eventId: string;
}): Promise<void> {
  try {
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...normalizeMetadata(session.metadata),
        [PAYMENT_FAILED_EVENT_KEY]: eventId,
        [PAYMENT_FAILED_AT_KEY]: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("STRIPE_WEBHOOK_CHECKOUT_FAILURE_MARKER_WARNING:", {
      sessionId: session.id,
      eventId,
      message: getErrorMessage(error),
    });
  }
}

async function markInvoiceFailureRecorded({
  stripe,
  invoice,
  eventId,
}: {
  stripe: Stripe;
  invoice: Stripe.Invoice;
  eventId: string;
}): Promise<void> {
  try {
    await stripe.invoices.update(invoice.id, {
      metadata: {
        ...normalizeMetadata(invoice.metadata),
        [PAYMENT_FAILED_EVENT_KEY]: eventId,
        [PAYMENT_FAILED_AT_KEY]: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn("STRIPE_WEBHOOK_INVOICE_FAILURE_MARKER_WARNING:", {
      invoiceId: invoice.id,
      eventId,
      message: getErrorMessage(error),
    });
  }
}

// ============================================================
// SUBSCRIPTION SAFETY
// ============================================================

async function customerHasAnotherActiveSubscription({
  stripe,
  deletedSubscription,
}: {
  stripe: Stripe;
  deletedSubscription: Stripe.Subscription;
}): Promise<boolean> {
  const customerId = getObjectId(deletedSubscription.customer);

  if (!customerId) {
    return false;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  return subscriptions.data.some(
    (subscription) =>
      subscription.id !== deletedSubscription.id &&
      isSubscriptionProvisionable(subscription),
  );
}

// ============================================================
// EVENT HANDLERS
// ============================================================

async function handleCheckoutCompleted({
  stripe,
  eventId,
  eventSession,
}: {
  stripe: Stripe;
  eventId: string;
  eventSession: Stripe.Checkout.Session;
}): Promise<WebhookProcessingResult> {
  const session = await retrieveCheckoutSession(stripe, eventSession.id);

  if (isPaymentApplied(session.metadata)) {
    return {
      processed: false,
      action: "checkout_already_fulfilled",
      objectId: session.id,
    };
  }

  if (
    session.currency &&
    session.currency.toLowerCase() !== EXPECTED_CURRENCY
  ) {
    return {
      processed: false,
      action: "unsupported_metadata",
      objectId: session.id,
      reason: `Unsupported currency: ${session.currency}`,
    };
  }

  if (!isCheckoutPaymentCompleted(session)) {
    return {
      processed: false,
      action: "checkout_payment_pending",
      objectId: session.id,
      reason: `Payment status: ${session.payment_status}`,
    };
  }

  if (session.mode === "payment") {
    const purchase = await resolvePurchaseMetadata({
      stripe,
      session,
    });

    const result = await applySuccessfulPurchase({
      purchase,
      paymentReference: session.id,
      billingStatus: "active",
      validUntil: null,
      resetPlan: purchase.planId !== null,
      resetPrompts: purchase.planId !== null,
    });

    await markCheckoutPaymentApplied({
      stripe,
      session,
      eventId,
      paymentReference: session.id,
    });

    console.info("STRIPE_WEBHOOK_PAYMENT_CHECKOUT_FULFILLED:", {
      eventId,
      sessionId: session.id,
      userId: result.userId,
      planId: result.effectivePlanId,
      purchasedAddonIds: result.purchasedAddonIds,
      extraPages: result.extraPages,
    });

    return {
      processed: true,
      action: "checkout_fulfilled",
      objectId: session.id,
      userId: result.userId,
      planId: result.effectivePlanId,
      purchasedAddonIds: result.purchasedAddonIds,
      activeAddonIds: result.activeAddonIds,
      extraPages: result.extraPages,
      billingStatus: "active",
      validUntil: null,
    };
  }

  if (session.mode === "subscription") {
    const subscription = await retrieveSubscription(
      stripe,
      session.subscription as string | Stripe.Subscription | null,
    );

    if (!subscription) {
      throw new Error("CHECKOUT_SUBSCRIPTION_NOT_FOUND");
    }

    const latestInvoiceId = getSubscriptionLatestInvoiceId(subscription);
    const latestInvoice =
      getExpandedLatestInvoice(subscription) ||
      (latestInvoiceId
        ? await stripe.invoices.retrieve(latestInvoiceId)
        : null);

    /**
     * invoice.paid mohol prísť pred checkout.session.completed.
     * V takom prípade už mesačný limit znovu neobnovujeme.
     */
    if (latestInvoice && isPaymentApplied(latestInvoice.metadata)) {
      await markCheckoutPaymentApplied({
        stripe,
        session,
        eventId,
        paymentReference: latestInvoice.id,
      });

      return {
        processed: false,
        action: "checkout_already_fulfilled",
        objectId: session.id,
        reason: `Invoice ${latestInvoice.id} was already applied.`,
      };
    }

    if (!isSubscriptionProvisionable(subscription)) {
      const unresolvedPurchase = await resolvePurchaseMetadata({
        stripe,
        session,
        subscription,
        invoice: latestInvoice,
        requirePurchaseMetadata: false,
      });
      const billingStatus = getSubscriptionBillingStatus(subscription);
      const validUntil = getSubscriptionValidUntil(subscription);

      await updateBillingStatus({
        userId: unresolvedPurchase.userId,
        billingStatus,
        validUntil,
      });

      return {
        processed: false,
        action: "checkout_payment_pending",
        objectId: session.id,
        userId: unresolvedPurchase.userId,
        planId: unresolvedPurchase.planId,
        billingStatus,
        validUntil,
        reason: `Subscription status: ${subscription.status}`,
      };
    }

    const purchase = await resolvePurchaseMetadata({
      stripe,
      session,
      subscription,
      invoice: latestInvoice,
    });

    if (!purchase.planId) {
      throw new Error("MISSING_PAID_PLAN_ID");
    }

    const billingStatus = getSubscriptionBillingStatus(subscription);
    const validUntil = getSubscriptionValidUntil(subscription);
    const paymentReference = latestInvoice?.id || session.id;

    const result = await applySuccessfulPurchase({
      purchase,
      paymentReference,
      billingStatus,
      validUntil,
      resetPlan: true,
      resetPrompts: true,
    });

    if (latestInvoice) {
      await markInvoicePaymentApplied({
        stripe,
        invoice: latestInvoice,
        eventId,
        paymentReference,
      });
    }

    await markCheckoutPaymentApplied({
      stripe,
      session,
      eventId,
      paymentReference,
    });

    console.info("STRIPE_WEBHOOK_SUBSCRIPTION_CHECKOUT_FULFILLED:", {
      eventId,
      sessionId: session.id,
      subscriptionId: subscription.id,
      invoiceId: latestInvoice?.id || null,
      userId: result.userId,
      planId: result.effectivePlanId,
      billingStatus,
      validUntil,
    });

    return {
      processed: true,
      action: "checkout_fulfilled",
      objectId: session.id,
      userId: result.userId,
      planId: result.effectivePlanId,
      purchasedAddonIds: result.purchasedAddonIds,
      activeAddonIds: result.activeAddonIds,
      extraPages: result.extraPages,
      billingStatus,
      validUntil,
    };
  }

  return {
    processed: false,
    action: "ignored",
    objectId: session.id,
    reason: `Unsupported checkout mode: ${session.mode || "unknown"}`,
  };
}

async function handleCheckoutAsyncPaymentFailed({
  stripe,
  eventId,
  eventSession,
}: {
  stripe: Stripe;
  eventId: string;
  eventSession: Stripe.Checkout.Session;
}): Promise<WebhookProcessingResult> {
  const session = await retrieveCheckoutSession(stripe, eventSession.id);

  if (isFailureEventAlreadyRecorded(session.metadata, eventId)) {
    return {
      processed: false,
      action: "checkout_payment_failed",
      objectId: session.id,
      reason: "Failure event already recorded.",
    };
  }

  let userId = "";

  try {
    const purchase = await resolvePurchaseMetadata({
      stripe,
      session,
      requirePurchaseMetadata: false,
    });

    userId = purchase.userId;

    await updateBillingStatus({
      userId,
      billingStatus: "payment_failed",
      validUntil: null,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    console.error("STRIPE_WEBHOOK_ASYNC_PAYMENT_FAILED_METADATA_ERROR:", {
      eventId,
      sessionId: session.id,
      message: getErrorMessage(error),
    });
  }

  await markCheckoutFailureRecorded({
    stripe,
    session,
    eventId,
  });

  console.warn("STRIPE_WEBHOOK_ASYNC_PAYMENT_FAILED:", {
    eventId,
    sessionId: session.id,
    userId: userId || null,
    paymentStatus: session.payment_status,
  });

  return {
    processed: Boolean(userId),
    action: "checkout_payment_failed",
    objectId: session.id,
    userId: userId || undefined,
    billingStatus: "payment_failed",
  };
}

async function handleInvoicePaid({
  stripe,
  eventId,
  eventInvoice,
}: {
  stripe: Stripe;
  eventId: string;
  eventInvoice: Stripe.Invoice;
}): Promise<WebhookProcessingResult> {
  const invoice = await retrieveInvoiceIfNeeded(stripe, eventInvoice);

  if (isPaymentApplied(invoice.metadata)) {
    return {
      processed: false,
      action: "invoice_already_processed",
      objectId: invoice.id,
    };
  }

  if (invoice.currency.toLowerCase() !== EXPECTED_CURRENCY) {
    return {
      processed: false,
      action: "unsupported_metadata",
      objectId: invoice.id,
      reason: `Unsupported currency: ${invoice.currency}`,
    };
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  /** Jednorazové Stripe faktúry nemenia plán; rieši ich Checkout Session. */
  if (!subscriptionId) {
    return {
      processed: false,
      action: "ignored",
      objectId: invoice.id,
      reason: "Invoice is not linked to a subscription.",
    };
  }

  const subscription = await retrieveSubscription(stripe, subscriptionId);

  if (!subscription) {
    throw new Error(`SUBSCRIPTION_NOT_FOUND: ${subscriptionId}`);
  }

  if (!isSubscriptionProvisionable(subscription)) {
    await updateBillingStatus({
      userId: (
        await resolvePurchaseMetadata({
          stripe,
          subscription,
          invoice,
        })
      ).userId,
      billingStatus: getSubscriptionBillingStatus(subscription),
      validUntil: getSubscriptionValidUntil(subscription),
    });

    return {
      processed: false,
      action: "ignored",
      objectId: invoice.id,
      billingStatus: getSubscriptionBillingStatus(subscription),
      reason: `Subscription status is ${subscription.status}.`,
    };
  }

  const purchase = await resolvePurchaseMetadata({
    stripe,
    subscription,
    invoice,
  });

  if (!purchase.planId) {
    throw new Error("MISSING_PAID_PLAN_ID");
  }

  const billingStatus = getSubscriptionBillingStatus(subscription);
  const validUntil = getSubscriptionValidUntil(subscription);

  /**
   * Extra stránky sa pri bežnej mesačnej obnove nepridávajú znova.
   * Pri prvej faktúre subscription_create môžu byť súčasťou úvodného checkoutu.
   */
  const isInitialSubscriptionInvoice =
    invoice.billing_reason === "subscription_create";

  const addonIdsForPageActivation = isInitialSubscriptionInvoice
    ? purchase.purchasedAddonIds
    : purchase.persistentAddonIds;

  const result = await applySuccessfulPurchase({
    purchase,
    paymentReference: invoice.id,
    billingStatus,
    validUntil,
    resetPlan: true,
    resetPrompts: true,
    addonIdsForPageActivation,
  });

  await markInvoicePaymentApplied({
    stripe,
    invoice,
    eventId,
    paymentReference: invoice.id,
  });

  console.info("STRIPE_WEBHOOK_INVOICE_PAID:", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: subscription.id,
    billingReason: invoice.billing_reason,
    userId: result.userId,
    planId: result.effectivePlanId,
    billingStatus,
    validUntil,
    extraPages: result.extraPages,
  });

  return {
    processed: true,
    action: "invoice_paid",
    objectId: invoice.id,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
    billingStatus,
    validUntil,
  };
}

async function handleInvoicePaymentFailed({
  stripe,
  eventId,
  eventInvoice,
}: {
  stripe: Stripe;
  eventId: string;
  eventInvoice: Stripe.Invoice;
}): Promise<WebhookProcessingResult> {
  const invoice = await retrieveInvoiceIfNeeded(stripe, eventInvoice);

  if (isFailureEventAlreadyRecorded(invoice.metadata, eventId)) {
    return {
      processed: false,
      action: "invoice_payment_failed",
      objectId: invoice.id,
      reason: "Failure event already recorded.",
    };
  }

  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    await markInvoiceFailureRecorded({
      stripe,
      invoice,
      eventId,
    });

    return {
      processed: false,
      action: "invoice_payment_failed",
      objectId: invoice.id,
      reason: "Failed invoice is not linked to a subscription.",
    };
  }

  const subscription = await retrieveSubscription(stripe, subscriptionId);

  if (!subscription) {
    throw new Error(`SUBSCRIPTION_NOT_FOUND: ${subscriptionId}`);
  }

  const purchase = await resolvePurchaseMetadata({
    stripe,
    subscription,
    invoice,
    requirePurchaseMetadata: false,
  });

  const billingStatus =
    subscription.status === "active"
      ? "payment_failed"
      : getSubscriptionBillingStatus(subscription);
  const validUntil = getSubscriptionValidUntil(subscription);

  await updateBillingStatus({
    userId: purchase.userId,
    billingStatus,
    validUntil,
  });

  await markInvoiceFailureRecorded({
    stripe,
    invoice,
    eventId,
  });

  console.warn("STRIPE_WEBHOOK_INVOICE_PAYMENT_FAILED:", {
    eventId,
    invoiceId: invoice.id,
    subscriptionId: subscription.id,
    userId: purchase.userId,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
    billingStatus,
    validUntil,
  });

  return {
    processed: true,
    action: "invoice_payment_failed",
    objectId: invoice.id,
    userId: purchase.userId,
    planId: purchase.planId,
    billingStatus,
    validUntil,
  };
}

async function handleSubscriptionUpdated({
  stripe,
  eventId,
  eventSubscription,
}: {
  stripe: Stripe;
  eventId: string;
  eventSubscription: Stripe.Subscription;
}): Promise<WebhookProcessingResult> {
  const subscription = await retrieveSubscription(stripe, eventSubscription);

  if (!subscription) {
    throw new Error("SUBSCRIPTION_NOT_FOUND");
  }

  const purchase = await resolvePurchaseMetadata({
    stripe,
    subscription,
    requirePurchaseMetadata: false,
  });

  const billingStatus = getSubscriptionBillingStatus(subscription);
  const validUntil = getSubscriptionValidUntil(subscription);

  if (isSubscriptionDefinitivelyEnded(subscription)) {
    const hasReplacementSubscription =
      await customerHasAnotherActiveSubscription({
        stripe,
        deletedSubscription: subscription,
      });

    if (hasReplacementSubscription) {
      return {
        processed: false,
        action: "subscription_delete_ignored",
        objectId: subscription.id,
        userId: purchase.userId,
        reason: "Customer has another active subscription.",
      };
    }

    const downgraded = await downgradeUserToFree({
      userId: purchase.userId,
      paymentReference: `subscription-ended:${subscription.id}`,
    });

    return {
      processed: downgraded,
      action: "subscription_deleted",
      objectId: subscription.id,
      userId: purchase.userId,
      planId: "free",
      billingStatus: "canceled",
      validUntil: null,
    };
  }

  /**
   * Plán aktivujeme alebo meníme iba pri stave active/trialing.
   * Stavy incomplete, past_due, unpaid alebo paused iba evidujeme;
   * nesmú pred úspešnou platbou sprístupniť platený plán.
   */
  if (isSubscriptionProvisionable(subscription) && purchase.planId) {
    const entitlement = await upsertPaidEntitlement({
      userId: purchase.userId,
      planId: purchase.planId,
      persistentAddonIds: purchase.persistentAddonIds,
      billingStatus,
      validUntil,
      resetPrompts: false,
    });

    console.info("STRIPE_WEBHOOK_SUBSCRIPTION_UPDATED:", {
      eventId,
      subscriptionId: subscription.id,
      userId: purchase.userId,
      planId: entitlement.effectivePlanId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      validUntil,
    });

    return {
      processed: true,
      action: "subscription_updated",
      objectId: subscription.id,
      userId: purchase.userId,
      planId: entitlement.effectivePlanId,
      activeAddonIds: entitlement.activeAddonIds,
      billingStatus,
      validUntil,
    };
  }

  await updateBillingStatus({
    userId: purchase.userId,
    billingStatus,
    validUntil,
  });

  return {
    processed: true,
    action: "subscription_updated",
    objectId: subscription.id,
    userId: purchase.userId,
    planId: purchase.planId,
    billingStatus,
    validUntil,
  };
}

async function handleSubscriptionDeleted({
  stripe,
  eventId,
  eventSubscription,
}: {
  stripe: Stripe;
  eventId: string;
  eventSubscription: Stripe.Subscription;
}): Promise<WebhookProcessingResult> {
  const subscription = eventSubscription;
  const purchase = await resolvePurchaseMetadata({
    stripe,
    subscription,
    requirePurchaseMetadata: false,
  });

  /**
   * Ochrana pred starou oneskorenou deleted udalosťou:
   * ak má zákazník už iné aktívne predplatné, na Free ho nevraciame.
   */
  if (
    await customerHasAnotherActiveSubscription({
      stripe,
      deletedSubscription: subscription,
    })
  ) {
    console.warn("STRIPE_WEBHOOK_SUBSCRIPTION_DELETE_IGNORED:", {
      eventId,
      subscriptionId: subscription.id,
      userId: purchase.userId,
      reason: "Customer has another active subscription.",
    });

    return {
      processed: false,
      action: "subscription_delete_ignored",
      objectId: subscription.id,
      userId: purchase.userId,
      reason: "Customer has another active subscription.",
    };
  }

  const downgraded = await downgradeUserToFree({
    userId: purchase.userId,
    paymentReference: `subscription-deleted:${subscription.id}`,
  });

  console.info("STRIPE_WEBHOOK_SUBSCRIPTION_DELETED:", {
    eventId,
    subscriptionId: subscription.id,
    userId: purchase.userId,
    downgraded,
  });

  return {
    processed: downgraded,
    action: "subscription_deleted",
    objectId: subscription.id,
    userId: purchase.userId,
    planId: "free",
    activeAddonIds: [],
    billingStatus: "canceled",
    validUntil: null,
  };
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "/api/payments/webhook",
      runtime,
      configured: {
        stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
        webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      },
      supportedEvents: SUPPORTED_EVENTS,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

// ============================================================
// WEBHOOK ROUTE
// ============================================================

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripeSecret || !webhookSecret) {
    console.error("STRIPE_WEBHOOK_CONFIG_MISSING:", {
      hasStripeSecret: Boolean(stripeSecret),
      hasWebhookSecret: Boolean(webhookSecret),
    });

    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_STRIPE_WEBHOOK_CONFIG",
        message: "Chýba STRIPE_SECRET_KEY alebo STRIPE_WEBHOOK_SECRET.",
      },
      {
        status: 500,
      },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_STRIPE_SIGNATURE",
        message: "Chýba hlavička stripe-signature.",
      },
      {
        status: 400,
      },
    );
  }

  let rawBody: string;

  try {
    /** Podpis sa musí overovať nad pôvodným raw telom. */
    rawBody = await request.text();
  } catch (error) {
    console.error("STRIPE_WEBHOOK_BODY_READ_ERROR:", {
      message: getErrorMessage(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: "WEBHOOK_BODY_READ_FAILED",
      },
      {
        status: 400,
      },
    );
  }

  const stripe = getStripeClient(stripeSecret);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("STRIPE_WEBHOOK_SIGNATURE_ERROR:", {
      message: getErrorMessage(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_STRIPE_SIGNATURE",
        message: "Stripe podpis webhooku nie je platný.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    let result: WebhookProcessingResult;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        result = await handleCheckoutCompleted({
          stripe,
          eventId: event.id,
          eventSession: event.data.object as Stripe.Checkout.Session,
        });
        break;
      }

      case "checkout.session.async_payment_failed": {
        result = await handleCheckoutAsyncPaymentFailed({
          stripe,
          eventId: event.id,
          eventSession: event.data.object as Stripe.Checkout.Session,
        });
        break;
      }

      case "invoice.paid": {
        result = await handleInvoicePaid({
          stripe,
          eventId: event.id,
          eventInvoice: event.data.object as Stripe.Invoice,
        });
        break;
      }

      case "invoice.payment_failed": {
        result = await handleInvoicePaymentFailed({
          stripe,
          eventId: event.id,
          eventInvoice: event.data.object as Stripe.Invoice,
        });
        break;
      }

      case "customer.subscription.updated": {
        result = await handleSubscriptionUpdated({
          stripe,
          eventId: event.id,
          eventSubscription: event.data.object as Stripe.Subscription,
        });
        break;
      }

      case "customer.subscription.deleted": {
        result = await handleSubscriptionDeleted({
          stripe,
          eventId: event.id,
          eventSubscription: event.data.object as Stripe.Subscription,
        });
        break;
      }

      default: {
        console.info("STRIPE_WEBHOOK_EVENT_IGNORED:", {
          eventId: event.id,
          eventType: event.type,
        });

        result = {
          processed: false,
          action: "ignored",
          reason: `Unsupported event type: ${event.type}`,
        };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        received: true,
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
        result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (isPermanentMetadataError(error)) {
      /**
       * Opakovaný Stripe retry nedokáže opraviť chýbajúce alebo neplatné metadata.
       * Udalosť preto prijmeme HTTP 200 a chybu detailne zapíšeme do logu.
       */
      console.error("STRIPE_WEBHOOK_UNSUPPORTED_METADATA:", {
        eventId: event.id,
        eventType: event.type,
        message: getErrorMessage(error),
      });

      return NextResponse.json(
        {
          ok: true,
          received: true,
          eventId: event.id,
          eventType: event.type,
          result: {
            processed: false,
            action: "unsupported_metadata",
            reason: getErrorMessage(error),
          } satisfies WebhookProcessingResult,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    /**
     * Databázové, Stripe API alebo sieťové chyby vracajú HTTP 500.
     * Stripe tak udalosť bezpečne zopakuje.
     */
    console.error("STRIPE_WEBHOOK_PROCESSING_ERROR:", {
      eventId: event.id,
      eventType: event.type,
      message: getErrorMessage(error),
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        received: true,
        error: "STRIPE_WEBHOOK_PROCESSING_FAILED",
        eventId: event.id,
        eventType: event.type,
        detail: getErrorMessage(error),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
