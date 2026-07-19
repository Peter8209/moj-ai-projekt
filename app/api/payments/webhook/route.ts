import Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  ADDONS,
  PLANS,
  type AddonId,
  type PlanId,
} from "@/lib/billing/catalog";
import { applySuccessfulPagePurchase } from "@/lib/page-plan-activation";
import { sendOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

let stripeClient: Stripe | null = null;

// ============================================================
// TYPES
// ============================================================

type MetadataRecord = Record<string, string>;

/**
 * Balíky, ktoré je možné reálne zakúpiť cez Stripe.
 * Free sa neplatí a admin je iba interný systémový balík.
 */
type PaidPlanId = Exclude<PlanId, "free" | "admin">;

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

type EventProcessingResult = {
  processed: boolean;
  reason: string;
  objectId?: string;
  userId?: string;
  planId?: PlanId | null;
  purchasedAddonIds?: AddonId[];
  activeAddonIds?: AddonId[];
  extraPages?: number;
  billingStatus?: string;
  orderEmailSent?: boolean;
  orderEmailSkipped?: boolean;
  orderEmailId?: string | null;
  orderEmailReason?: string | null;
  detail?: string;
};

type OrderEmailDeliveryResult = {
  sent: boolean;
  skipped: boolean;
  emailId: string | null;
  reason: string | null;
};

type InvoiceParentShape = {
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
      metadata?: Stripe.Metadata | null;
    } | null;
  } | null;
};

type LegacyInvoiceShape = {
  subscription?: string | { id?: string | null } | null;
  subscription_details?: {
    metadata?: Stripe.Metadata | null;
  } | null;
};

type SubscriptionPeriodShape = {
  current_period_end?: number | null;
};

type SubscriptionItemPeriodShape = {
  current_period_end?: number | null;
};

type LegacyInvoicePaidShape = {
  paid?: boolean | null;
};

// ============================================================
// CONSTANTS
// ============================================================

const VALID_PLAN_IDS = new Set<PlanId>(Object.keys(PLANS) as PlanId[]);
const VALID_ADDON_IDS = new Set<AddonId>(Object.keys(ADDONS) as AddonId[]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXPECTED_CURRENCY = "eur";

const FULFILLED_MARKER_KEY = "zedpera_fulfilled";
const FULFILLED_EVENT_KEY = "zedpera_fulfilled_event_id";
const FULFILLED_AT_KEY = "zedpera_fulfilled_at";

const ORDER_EMAIL_STATUS_KEY = "zedpera_order_email_status";
const ORDER_EMAIL_ID_KEY = "zedpera_order_email_id";
const ORDER_EMAIL_REASON_KEY = "zedpera_order_email_reason";
const ORDER_EMAIL_AT_KEY = "zedpera_order_email_at";

const PROCESSED_EVENTS_KEY = "zedpera_processed_event_ids";
const MAX_STORED_EVENT_IDS = 8;

const CANONICAL_USER_ID_KEY = "user_id";
const CANONICAL_PLAN_ID_KEY = "plan_id";
const CANONICAL_ADDON_IDS_KEY = "addon_ids";

const TERMINAL_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete_expired",
]);

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

function requireObjectId(
  value:
    | string
    | {
        id?: string | null;
      }
    | null
    | undefined,
  label: string,
): string {
  const objectId = getObjectId(value);

  if (!objectId) {
    throw new Error(`MISSING_${label}_ID`);
  }

  return objectId;
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

  if (!planId || planId === "free" || planId === "admin") {
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
    // Staršie metadata môžu byť uložené ako zoznam oddelený čiarkou.
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
  const unixSeconds = Number(value);

  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return null;
  }

  return new Date(unixSeconds * 1_000).toISOString();
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

function getPlanPageLimit(planId: PlanId): number | null {
  const plan = PLANS[planId] as unknown as Record<string, unknown>;
  const candidates = [
    plan.pageLimit,
    plan.basePageLimit,
    plan.pages,
    plan.maxPages,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);

    if (Number.isFinite(value) && value >= 0) {
      return Math.floor(value);
    }
  }

  return null;
}

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription | null | undefined,
): string | null {
  if (!subscription) {
    return null;
  }

  const legacyPeriodEnd = (subscription as unknown as SubscriptionPeriodShape)
    .current_period_end;

  const itemPeriodEnds = subscription.items.data
    .map(
      (item) =>
        (item as unknown as SubscriptionItemPeriodShape).current_period_end,
    )
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0,
    );

  const naturalPeriodEnd = Math.max(
    typeof legacyPeriodEnd === "number" ? legacyPeriodEnd : 0,
    ...itemPeriodEnds,
  );

  const effectivePeriodEnd =
    subscription.cancel_at &&
    (naturalPeriodEnd <= 0 || subscription.cancel_at < naturalPeriodEnd)
      ? subscription.cancel_at
      : naturalPeriodEnd;

  return unixToIso(effectivePeriodEnd);
}

function getSubscriptionBillingStatus(
  subscription: Stripe.Subscription,
): string {
  if (
    subscription.cancel_at_period_end &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    return "canceling";
  }

  return subscription.status;
}

function isInvoicePaid(invoice: Stripe.Invoice): boolean {
  const legacyPaid = (invoice as unknown as LegacyInvoicePaidShape).paid;

  return invoice.status === "paid" || legacyPaid === true;
}

function isCheckoutPaymentCompleted(session: Stripe.Checkout.Session): boolean {
  return (
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required"
  );
}

function isPermanentMetadataError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return [
    "USER_ID_METADATA_MISMATCH",
    "MISSING_OR_INVALID_USER_ID",
    "UNSUPPORTED_PLAN_ID:",
    "PAID_CHECKOUT_CANNOT_ACTIVATE_FREE_PLAN",
    "PAID_CHECKOUT_CANNOT_ACTIVATE_ADMIN_PLAN",
    "MISSING_PURCHASE_METADATA",
  ].some((code) => message.includes(code));
}

// ============================================================
// IDEMPOTENCY METADATA
// ============================================================

function parseProcessedEventIds(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): string[] {
  const rawValue = normalizeMetadata(metadata)[PROCESSED_EVENTS_KEY];

  if (!rawValue) {
    return [];
  }

  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function hasProcessedEvent(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
  eventId: string,
): boolean {
  return parseProcessedEventIds(metadata).includes(eventId);
}

function metadataWithProcessedEvent(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
  eventId: string,
): MetadataRecord {
  const currentMetadata = normalizeMetadata(metadata);
  const eventIds = Array.from(
    new Set([...parseProcessedEventIds(currentMetadata), eventId]),
  ).slice(-MAX_STORED_EVENT_IDS);

  return {
    ...currentMetadata,
    [PROCESSED_EVENTS_KEY]: eventIds.join(","),
  };
}

function hasFulfilledMarker(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): boolean {
  return normalizeMetadata(metadata)[FULFILLED_MARKER_KEY] === "true";
}

function metadataWithFulfilledMarker(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
  eventId: string,
): MetadataRecord {
  return {
    ...metadataWithProcessedEvent(metadata, eventId),
    [FULFILLED_MARKER_KEY]: "true",
    [FULFILLED_EVENT_KEY]: eventId,
    [FULFILLED_AT_KEY]: new Date().toISOString(),
  };
}

function truncateMetadataValue(value: string, maxLength = 450): string {
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxLength - 3, 0))}...`;
}

function getOrderEmailStatus(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): string {
  return normalizeMetadata(metadata)[ORDER_EMAIL_STATUS_KEY] || "";
}

function isOrderEmailFinalized(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): boolean {
  const status = getOrderEmailStatus(metadata);

  return status === "sent" || status === "skipped";
}

function metadataWithOrderEmailResult(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
  result: OrderEmailDeliveryResult,
): MetadataRecord {
  const currentMetadata = normalizeMetadata(metadata);

  const nextMetadata: MetadataRecord = {
    ...currentMetadata,
    [ORDER_EMAIL_STATUS_KEY]: result.sent ? "sent" : "skipped",
    [ORDER_EMAIL_AT_KEY]: new Date().toISOString(),
  };

  if (result.emailId) {
    nextMetadata[ORDER_EMAIL_ID_KEY] = truncateMetadataValue(result.emailId);
  }

  if (result.reason) {
    nextMetadata[ORDER_EMAIL_REASON_KEY] = truncateMetadataValue(result.reason);
  }

  return nextMetadata;
}

// ============================================================
// STRIPE OBJECT HELPERS
// ============================================================

async function retrieveCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Customer | null> {
  if (!customerId) {
    return null;
  }

  const customer = await stripe.customers.retrieve(customerId);

  if ("deleted" in customer && customer.deleted) {
    return null;
  }

  return customer as Stripe.Customer;
}

async function retrieveSubscription(
  stripe: Stripe,
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  if (!subscriptionId) {
    return null;
  }

  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["customer"],
  });
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string {
  const legacyInvoice = invoice as unknown as LegacyInvoiceShape;
  const parentInvoice = invoice as unknown as InvoiceParentShape;

  return (
    getObjectId(legacyInvoice.subscription) ||
    getObjectId(parentInvoice.parent?.subscription_details?.subscription)
  );
}

function getInvoiceSubscriptionMetadata(
  invoice: Stripe.Invoice,
): MetadataRecord {
  const legacyInvoice = invoice as unknown as LegacyInvoiceShape;
  const parentInvoice = invoice as unknown as InvoiceParentShape;

  return mergeMetadata(
    legacyInvoice.subscription_details?.metadata,
    parentInvoice.parent?.subscription_details?.metadata,
  );
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

async function getCustomerMetadataFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<MetadataRecord> {
  const customerId = getObjectId(session.customer);

  if (!customerId) {
    return {};
  }

  try {
    if (typeof session.customer !== "string" && session.customer) {
      if ("deleted" in session.customer && session.customer.deleted) {
        return {};
      }

      return normalizeMetadata((session.customer as Stripe.Customer).metadata);
    }

    const customer = await retrieveCustomer(stripe, customerId);

    return normalizeMetadata(customer?.metadata);
  } catch (error) {
    console.warn("STRIPE_WEBHOOK_CUSTOMER_METADATA_WARNING:", {
      customerId,
      message: getErrorMessage(error),
    });

    return {};
  }
}

async function getSubscriptionFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<Stripe.Subscription | null> {
  const subscriptionId = getObjectId(session.subscription);

  if (!subscriptionId) {
    return null;
  }

  if (typeof session.subscription !== "string" && session.subscription) {
    return session.subscription;
  }

  return retrieveSubscription(stripe, subscriptionId);
}

// ============================================================
// PURCHASE METADATA
// ============================================================

function resolvePurchaseFromMetadata({
  metadata,
  fallbackUserId,
}: {
  metadata: MetadataRecord;
  fallbackUserId?: string | null;
}): ResolvedPurchase {
  const metadataUserId = normalizeUserId(
    readMetadataValue(metadata, [
      "user_id",
      "userId",
      "userid",
      "supabase_user_id",
    ]),
  );

  const referenceUserId = normalizeUserId(fallbackUserId);

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

  if (normalizedPlanId === "admin") {
    throw new Error("PAID_CHECKOUT_CANNOT_ACTIVATE_ADMIN_PLAN");
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

  if (!planId && purchasedAddonIds.length === 0) {
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

async function resolveCheckoutPurchase({
  stripe,
  session,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}): Promise<ResolvedPurchase> {
  const [customerMetadata, paymentIntentMetadata, subscription] =
    await Promise.all([
      getCustomerMetadataFromSession(stripe, session),
      getPaymentIntentMetadata(stripe, session),
      getSubscriptionFromSession(stripe, session),
    ]);

  const metadata = mergeMetadata(
    customerMetadata,
    subscription?.metadata,
    paymentIntentMetadata,
    session.metadata,
  );

  return resolvePurchaseFromMetadata({
    metadata,
    fallbackUserId: session.client_reference_id,
  });
}

async function resolveSubscriptionPurchase({
  stripe,
  subscription,
  additionalMetadata,
}: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
  additionalMetadata?: MetadataRecord;
}): Promise<ResolvedPurchase> {
  const customerId = getObjectId(subscription.customer);
  const customer =
    typeof subscription.customer !== "string" && subscription.customer
      ? "deleted" in subscription.customer && subscription.customer.deleted
        ? null
        : (subscription.customer as Stripe.Customer)
      : await retrieveCustomer(stripe, customerId);

  const metadata = mergeMetadata(
    customer?.metadata,
    subscription.metadata,
    additionalMetadata,
  );

  return resolvePurchaseFromMetadata({ metadata });
}

// ============================================================
// ENTITLEMENTS
// ============================================================

async function loadCurrentEntitlement(
  userId: string,
): Promise<EntitlementRow | null> {
  const admin = createSupabaseAdminClient();

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

async function upsertEntitlementAfterPurchase({
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
  const admin = createSupabaseAdminClient();
  const current = await loadCurrentEntitlement(userId);

  const effectivePlanId = planId || normalizeExistingPlanId(current?.plan_id);
  const plan = PLANS[effectivePlanId];

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
      prompts_used:
        isNewPlanPurchase && resetPrompts
          ? 0
          : toSafeInteger(current?.prompts_used, 0),
      attachment_limit: plan.attachmentLimit,
      billing_status: billingStatus,
      activated_at: isNewPlanPurchase ? now : current?.activated_at || now,
      valid_until: validUntil ?? current?.valid_until ?? null,
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

async function applySuccessfulPurchase({
  purchase,
  paymentReference,
  billingStatus,
  validUntil,
  resetPrompts,
}: {
  purchase: ResolvedPurchase;
  paymentReference: string;
  billingStatus: string;
  validUntil: string | null;
  resetPrompts: boolean;
}): Promise<AppliedPurchase> {
  const entitlement = await upsertEntitlementAfterPurchase({
    userId: purchase.userId,
    planId: purchase.planId,
    persistentAddonIds: purchase.persistentAddonIds,
    billingStatus,
    validUntil,
    resetPrompts,
  });

  const admin = createSupabaseAdminClient();

  const pageActivation = await applySuccessfulPagePurchase({
    admin,
    userId: purchase.userId,
    planId: purchase.planId,
    addonIds: purchase.purchasedAddonIds,
    paymentReference,
    resetPlan: purchase.planId !== null,
  });

  return {
    userId: purchase.userId,
    effectivePlanId: entitlement.effectivePlanId,
    purchasedAddonIds: purchase.purchasedAddonIds,
    activeAddonIds: entitlement.activeAddonIds,
    extraPages: pageActivation.extraPages,
  };
}

async function updateBillingStatus({
  userId,
  billingStatus,
  validUntil,
}: {
  userId: string;
  billingStatus: string;
  validUntil?: string | null;
}): Promise<void> {
  const current = await loadCurrentEntitlement(userId);

  if (!current) {
    await downgradeUserToFree({
      userId,
      billingStatus,
    });
    return;
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    billing_status: billingStatus,
    updated_at: now,
  };

  if (validUntil !== undefined) {
    updatePayload.valid_until = validUntil;
  }

  const { error } = await admin
    .from("zedpera_user_entitlements")
    .update(updatePayload)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`BILLING_STATUS_UPDATE_FAILED: ${error.message}`);
  }
}

async function downgradeUserToFree({
  userId,
  billingStatus,
}: {
  userId: string;
  billingStatus: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const freePlan = PLANS.free;
  const freePageLimit = getPlanPageLimit("free");
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    user_id: userId,
    plan_id: "free",
    addon_ids: [],
    prompt_limit: freePlan.promptLimit,
    prompts_used: 0,
    attachment_limit: freePlan.attachmentLimit,
    extra_page_limit: 0,
    pages_used: 0,
    billing_status: billingStatus,
    activated_at: now,
    valid_until: null,
    updated_at: now,
  };

  if (freePageLimit !== null) {
    payload.base_page_limit = freePageLimit;
  }

  const { error } = await admin
    .from("zedpera_user_entitlements")
    .upsert(payload, {
      onConflict: "user_id",
    });

  if (error) {
    throw new Error(`FREE_PLAN_DOWNGRADE_FAILED: ${error.message}`);
  }
}

// ============================================================
// CANONICAL STRIPE METADATA
// ============================================================

function canonicalPurchaseMetadata(purchase: ResolvedPurchase): MetadataRecord {
  const metadata: MetadataRecord = {
    [CANONICAL_USER_ID_KEY]: purchase.userId,
    [CANONICAL_ADDON_IDS_KEY]: JSON.stringify(purchase.purchasedAddonIds),
  };

  if (purchase.planId) {
    metadata[CANONICAL_PLAN_ID_KEY] = purchase.planId;
  }

  return metadata;
}

async function persistCanonicalCheckoutMetadata({
  stripe,
  session,
  subscription,
  purchase,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription | null;
  purchase: ResolvedPurchase;
}): Promise<void> {
  const canonicalMetadata = canonicalPurchaseMetadata(purchase);
  const customerId = getObjectId(session.customer);
  const paymentIntentId = getObjectId(session.payment_intent);

  // Pri predplatnom sú metadata na Subscription objekte kritické, pretože
  // z nich nasledujúce invoice.* udalosti obnovujú plán a kvóty.
  if (subscription) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: {
        ...normalizeMetadata(subscription.metadata),
        ...canonicalMetadata,
      },
    });
  }

  const optionalOperations: Array<Promise<unknown>> = [];

  if (customerId) {
    const currentCustomerMetadata =
      typeof session.customer !== "string" && session.customer
        ? "deleted" in session.customer && session.customer.deleted
          ? {}
          : normalizeMetadata((session.customer as Stripe.Customer).metadata)
        : {};

    optionalOperations.push(
      stripe.customers.update(customerId, {
        metadata: {
          ...currentCustomerMetadata,
          ...canonicalMetadata,
        },
      }),
    );
  }

  if (paymentIntentId) {
    const currentPaymentIntentMetadata =
      typeof session.payment_intent !== "string" && session.payment_intent
        ? normalizeMetadata(session.payment_intent.metadata)
        : {};

    optionalOperations.push(
      stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          ...currentPaymentIntentMetadata,
          ...canonicalMetadata,
        },
      }),
    );
  }

  const results = await Promise.allSettled(optionalOperations);

  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("STRIPE_WEBHOOK_CANONICAL_METADATA_WARNING:", {
        sessionId: session.id,
        message: getErrorMessage(result.reason),
      });
    }
  }
}

// ============================================================
// EVENT MARKERS
// ============================================================

async function markCheckoutEvent({
  stripe,
  session,
  subscription,
  eventId,
  fulfilled,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription | null;
  eventId: string;
  fulfilled: boolean;
}): Promise<void> {
  // Checkout Session marker je kritický. Ak ho Stripe nezapíše, route musí
  // vrátiť chybu, aby sa udalosť zopakovala a nedošlo k strate idempotencie.
  await stripe.checkout.sessions.update(session.id, {
    metadata: fulfilled
      ? metadataWithFulfilledMarker(session.metadata, eventId)
      : metadataWithProcessedEvent(session.metadata, eventId),
  });

  const operations: Array<Promise<unknown>> = [];
  const paymentIntentId = getObjectId(session.payment_intent);
  const customerId = getObjectId(session.customer);

  if (paymentIntentId) {
    const metadata =
      typeof session.payment_intent !== "string" && session.payment_intent
        ? session.payment_intent.metadata
        : undefined;

    operations.push(
      stripe.paymentIntents.update(paymentIntentId, {
        metadata: fulfilled
          ? metadataWithFulfilledMarker(metadata, eventId)
          : metadataWithProcessedEvent(metadata, eventId),
      }),
    );
  }

  if (subscription) {
    operations.push(
      stripe.subscriptions.update(subscription.id, {
        metadata: metadataWithProcessedEvent(subscription.metadata, eventId),
      }),
    );
  }

  if (customerId) {
    const metadata =
      typeof session.customer !== "string" && session.customer
        ? "deleted" in session.customer && session.customer.deleted
          ? undefined
          : (session.customer as Stripe.Customer).metadata
        : undefined;

    operations.push(
      stripe.customers.update(customerId, {
        metadata: metadataWithProcessedEvent(metadata, eventId),
      }),
    );
  }

  await settleMarkerOperations("CHECKOUT", eventId, operations);
}

async function markCheckoutOrderEmailResult({
  stripe,
  session,
  result,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  result: OrderEmailDeliveryResult;
}): Promise<void> {
  // Po fulfillment markeri znovu načítame aktuálne metadata, aby sme pri
  // zápise výsledku e-mailu neprepísali novšie Stripe metadata starou kópiou.
  const currentSession = await stripe.checkout.sessions.retrieve(session.id);

  await stripe.checkout.sessions.update(session.id, {
    metadata: metadataWithOrderEmailResult(currentSession.metadata, result),
  });
}

async function markInvoiceEvent({
  stripe,
  invoice,
  subscription,
  customer,
  eventId,
}: {
  stripe: Stripe;
  invoice: Stripe.Invoice;
  subscription: Stripe.Subscription | null;
  customer: Stripe.Customer | null;
  eventId: string;
}): Promise<void> {
  const invoiceId = requireObjectId(invoice, "INVOICE");
  const operations: Array<Promise<unknown>> = [
    stripe.invoices.update(invoiceId, {
      metadata: metadataWithProcessedEvent(invoice.metadata, eventId),
    }),
  ];

  if (subscription) {
    operations.push(
      stripe.subscriptions.update(subscription.id, {
        metadata: metadataWithProcessedEvent(subscription.metadata, eventId),
      }),
    );
  }

  if (customer) {
    operations.push(
      stripe.customers.update(customer.id, {
        metadata: metadataWithProcessedEvent(customer.metadata, eventId),
      }),
    );
  }

  await settleMarkerOperations("INVOICE", eventId, operations);
}

async function markSubscriptionEvent({
  stripe,
  subscription,
  customer,
  eventId,
  updateSubscription,
}: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
  customer: Stripe.Customer | null;
  eventId: string;
  updateSubscription: boolean;
}): Promise<void> {
  const operations: Array<Promise<unknown>> = [];

  if (updateSubscription) {
    operations.push(
      stripe.subscriptions.update(subscription.id, {
        metadata: metadataWithProcessedEvent(subscription.metadata, eventId),
      }),
    );
  }

  if (customer) {
    operations.push(
      stripe.customers.update(customer.id, {
        metadata: metadataWithProcessedEvent(customer.metadata, eventId),
      }),
    );
  }

  await settleMarkerOperations("SUBSCRIPTION", eventId, operations);
}

async function settleMarkerOperations(
  source: string,
  eventId: string,
  operations: Array<Promise<unknown>>,
): Promise<void> {
  if (operations.length === 0) {
    return;
  }

  const results = await Promise.allSettled(operations);

  for (const result of results) {
    if (result.status === "rejected") {
      console.warn("STRIPE_WEBHOOK_EVENT_MARKER_WARNING:", {
        source,
        eventId,
        message: getErrorMessage(result.reason),
      });
    }
  }
}

// ============================================================
// CHECKOUT EVENTS
// ============================================================

async function retrieveCheckoutSession(
  stripe: Stripe,
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: [
      "payment_intent",
      "customer",
      "subscription",
      "invoice",
      "line_items.data.price.product",
    ],
  });
}

function isCheckoutAlreadyFulfilled({
  session,
  subscription,
  eventId,
}: {
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription | null;
  eventId: string;
}): boolean {
  const customerMetadata =
    typeof session.customer !== "string" && session.customer
      ? "deleted" in session.customer && session.customer.deleted
        ? undefined
        : (session.customer as Stripe.Customer).metadata
      : undefined;

  return (
    hasFulfilledMarker(session.metadata) ||
    hasProcessedEvent(session.metadata, eventId) ||
    (typeof session.payment_intent !== "string" &&
      session.payment_intent &&
      (hasFulfilledMarker(session.payment_intent.metadata) ||
        hasProcessedEvent(session.payment_intent.metadata, eventId))) ||
    hasProcessedEvent(subscription?.metadata, eventId) ||
    hasProcessedEvent(customerMetadata, eventId)
  );
}

function getRecordedOrderEmailResult(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): OrderEmailDeliveryResult | null {
  const normalizedMetadata = normalizeMetadata(metadata);
  const status = normalizedMetadata[ORDER_EMAIL_STATUS_KEY];

  if (status !== "sent" && status !== "skipped") {
    return null;
  }

  return {
    sent: status === "sent",
    skipped: status === "skipped",
    emailId: normalizedMetadata[ORDER_EMAIL_ID_KEY] || null,
    reason: normalizedMetadata[ORDER_EMAIL_REASON_KEY] || null,
  };
}

async function sendAndRecordOrderConfirmationEmail({
  stripe,
  session,
  planId,
  addonIds,
  paymentReference,
  locale,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  planId: PaidPlanId | null;
  addonIds: AddonId[];
  paymentReference: string;
  locale: string;
}): Promise<OrderEmailDeliveryResult> {
  const recordedResult = getRecordedOrderEmailResult(session.metadata);

  if (recordedResult) {
    return recordedResult;
  }

  const result = await sendOrderConfirmationEmail({
    session,
    planId,
    addonIds,
    paymentReference,
    locale,
  });

  const normalizedResult: OrderEmailDeliveryResult = {
    sent: Boolean(result.sent),
    skipped: Boolean(result.skipped),
    emailId: result.emailId || null,
    reason: result.reason || null,
  };

  if (!normalizedResult.sent && !normalizedResult.skipped) {
    throw new Error(
      normalizedResult.reason || "ORDER_CONFIRMATION_EMAIL_NOT_DELIVERED",
    );
  }

  await markCheckoutOrderEmailResult({
    stripe,
    session,
    result: normalizedResult,
  });

  return normalizedResult;
}

async function resolveOrderEmailContextForProcessedCheckout({
  stripe,
  session,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}): Promise<{
  planId: PaidPlanId | null;
  addonIds: AddonId[];
  locale: string;
}> {
  try {
    const purchase = await resolveCheckoutPurchase({ stripe, session });

    return {
      planId: purchase.planId,
      addonIds: purchase.purchasedAddonIds,
      locale:
        purchase.metadata.locale ||
        purchase.metadata.language ||
        purchase.metadata.lang ||
        "sk",
    };
  } catch (error) {
    console.warn("ZEDPERA_ORDER_EMAIL_CONTEXT_FALLBACK:", {
      sessionId: session.id,
      message: getErrorMessage(error),
    });

    return {
      planId: null,
      addonIds: [],
      locale: "sk",
    };
  }
}

async function handleCheckoutSucceeded({
  stripe,
  eventId,
  eventSession,
}: {
  stripe: Stripe;
  eventId: string;
  eventSession: Stripe.Checkout.Session;
}): Promise<EventProcessingResult> {
  const session = await retrieveCheckoutSession(stripe, eventSession.id);
  const subscription = await getSubscriptionFromSession(stripe, session);

  if (session.mode !== "payment" && session.mode !== "subscription") {
    return {
      processed: false,
      reason: "unsupported_checkout_mode",
      objectId: session.id,
      detail: `Unsupported checkout mode: ${session.mode || "unknown"}`,
    };
  }

  if (
    session.currency &&
    session.currency.toLowerCase() !== EXPECTED_CURRENCY
  ) {
    return {
      processed: false,
      reason: "unsupported_currency",
      objectId: session.id,
      detail: `Unsupported currency: ${session.currency}`,
    };
  }

  if (isCheckoutAlreadyFulfilled({ session, subscription, eventId })) {
    const recordedEmailResult = getRecordedOrderEmailResult(session.metadata);

    if (recordedEmailResult) {
      return {
        processed: false,
        reason: "already_processed",
        objectId: session.id,
        orderEmailSent: recordedEmailResult.sent,
        orderEmailSkipped: recordedEmailResult.skipped,
        orderEmailId: recordedEmailResult.emailId,
        orderEmailReason: recordedEmailResult.reason,
      };
    }

    const emailContext = await resolveOrderEmailContextForProcessedCheckout({
      stripe,
      session,
    });

    const recoveredEmailResult = await sendAndRecordOrderConfirmationEmail({
      stripe,
      session,
      planId: emailContext.planId,
      addonIds: emailContext.addonIds,
      paymentReference: getObjectId(session.invoice) || session.id,
      locale: emailContext.locale,
    });

    console.info("ZEDPERA_ORDER_CONFIRMATION_EMAIL_RECOVERED:", {
      eventId,
      sessionId: session.id,
      sent: recoveredEmailResult.sent,
      skipped: recoveredEmailResult.skipped,
      emailId: recoveredEmailResult.emailId,
      reason: recoveredEmailResult.reason,
    });

    return {
      processed: false,
      reason: "already_processed_email_recovered",
      objectId: session.id,
      orderEmailSent: recoveredEmailResult.sent,
      orderEmailSkipped: recoveredEmailResult.skipped,
      orderEmailId: recoveredEmailResult.emailId,
      orderEmailReason: recoveredEmailResult.reason,
    };
  }

  if (!isCheckoutPaymentCompleted(session)) {
    return {
      processed: false,
      reason: "payment_not_completed",
      objectId: session.id,
      detail: `Payment status: ${session.payment_status}`,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = await resolveCheckoutPurchase({ stripe, session });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: session.id,
      detail: getErrorMessage(error),
    };
  }

  await persistCanonicalCheckoutMetadata({
    stripe,
    session,
    subscription,
    purchase,
  });

  const invoiceId = getObjectId(session.invoice);
  const paymentReference = invoiceId || session.id;
  const billingStatus = subscription
    ? getSubscriptionBillingStatus(subscription)
    : "active";
  const validUntil = getSubscriptionPeriodEnd(subscription);

  const result = await applySuccessfulPurchase({
    purchase,
    paymentReference,
    billingStatus,
    validUntil,
    resetPrompts: purchase.planId !== null,
  });

  await markCheckoutEvent({
    stripe,
    session,
    subscription,
    eventId,
    fulfilled: true,
  });

  /*
   * Potvrdzujúci e-mail sa posiela až po úspešnom aktivovaní balíka
   * a po zapísaní idempotentného fulfillment markeru do Stripe.
   *
   * Ak Resend zlyhá, vyhodíme chybu a Stripe webhook zopakuje. Pri opakovaní
   * sa nákup už znovu neaktivuje; route iba dokončí chýbajúci e-mail.
   * Resend zároveň používa Idempotency-Key odvodený od Checkout Session ID.
   */
  let orderEmailResult: OrderEmailDeliveryResult;

  try {
    orderEmailResult = await sendAndRecordOrderConfirmationEmail({
      stripe,
      session,
      planId: purchase.planId,
      addonIds: result.purchasedAddonIds,
      paymentReference,
      locale:
        purchase.metadata.locale ||
        purchase.metadata.language ||
        purchase.metadata.lang ||
        "sk",
    });
  } catch (emailError) {
    const emailErrorMessage = getErrorMessage(emailError);

    console.error("ZEDPERA_ORDER_CONFIRMATION_EMAIL_ERROR:", {
      eventId,
      sessionId: session.id,
      message: emailErrorMessage,
    });

    throw new Error(`ORDER_CONFIRMATION_EMAIL_FAILED: ${emailErrorMessage}`);
  }

  if (orderEmailResult.skipped) {
    console.warn("ZEDPERA_ORDER_CONFIRMATION_EMAIL_SKIPPED:", {
      eventId,
      sessionId: session.id,
      reason: orderEmailResult.reason,
    });
  }

  console.info("STRIPE_WEBHOOK_CHECKOUT_FULFILLED:", {
    eventId,
    sessionId: session.id,
    checkoutMode: session.mode,
    paymentReference,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
    orderEmailSent: orderEmailResult.sent,
    orderEmailSkipped: orderEmailResult.skipped,
    orderEmailId: orderEmailResult.emailId,
    orderEmailReason: orderEmailResult.reason,
  });

  return {
    processed: true,
    reason: "fulfilled",
    objectId: session.id,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
    billingStatus,
    orderEmailSent: orderEmailResult.sent,
    orderEmailSkipped: orderEmailResult.skipped,
    orderEmailId: orderEmailResult.emailId,
    orderEmailReason: orderEmailResult.reason,
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
}): Promise<EventProcessingResult> {
  const session = await retrieveCheckoutSession(stripe, eventSession.id);
  const subscription = await getSubscriptionFromSession(stripe, session);

  if (isCheckoutAlreadyFulfilled({ session, subscription, eventId })) {
    return {
      processed: false,
      reason: "already_processed",
      objectId: session.id,
    };
  }

  try {
    const purchase = await resolveCheckoutPurchase({ stripe, session });

    await updateBillingStatus({
      userId: purchase.userId,
      billingStatus: "payment_failed",
      validUntil: getSubscriptionPeriodEnd(subscription),
    });

    await markCheckoutEvent({
      stripe,
      session,
      subscription,
      eventId,
      fulfilled: false,
    });

    console.warn("STRIPE_WEBHOOK_ASYNC_PAYMENT_FAILED:", {
      eventId,
      sessionId: session.id,
      userId: purchase.userId,
      paymentStatus: session.payment_status,
    });

    return {
      processed: true,
      reason: "payment_failure_recorded",
      objectId: session.id,
      userId: purchase.userId,
      billingStatus: "payment_failed",
    };
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: session.id,
      detail: getErrorMessage(error),
    };
  }
}

// ============================================================
// INVOICE EVENTS
// ============================================================

async function retrieveInvoice(
  stripe: Stripe,
  invoiceId: string,
): Promise<Stripe.Invoice> {
  return stripe.invoices.retrieve(invoiceId, {
    expand: ["customer"],
  });
}

async function getInvoiceContext({
  stripe,
  invoice,
}: {
  stripe: Stripe;
  invoice: Stripe.Invoice;
}): Promise<{
  subscription: Stripe.Subscription | null;
  customer: Stripe.Customer | null;
  metadata: MetadataRecord;
}> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  const subscription = await retrieveSubscription(stripe, subscriptionId);

  const customerId = getObjectId(invoice.customer);
  const customer =
    typeof invoice.customer !== "string" && invoice.customer
      ? "deleted" in invoice.customer && invoice.customer.deleted
        ? null
        : (invoice.customer as Stripe.Customer)
      : await retrieveCustomer(stripe, customerId);

  const metadata = mergeMetadata(
    customer?.metadata,
    getInvoiceSubscriptionMetadata(invoice),
    subscription?.metadata,
    invoice.metadata,
  );

  return {
    subscription,
    customer,
    metadata,
  };
}

function isInvoiceEventAlreadyProcessed({
  invoice,
  subscription,
  customer,
  eventId,
}: {
  invoice: Stripe.Invoice;
  subscription: Stripe.Subscription | null;
  customer: Stripe.Customer | null;
  eventId: string;
}): boolean {
  return (
    hasProcessedEvent(invoice.metadata, eventId) ||
    hasProcessedEvent(subscription?.metadata, eventId) ||
    hasProcessedEvent(customer?.metadata, eventId)
  );
}

async function handleInvoicePaid({
  stripe,
  eventId,
  eventInvoice,
}: {
  stripe: Stripe;
  eventId: string;
  eventInvoice: Stripe.Invoice;
}): Promise<EventProcessingResult> {
  const eventInvoiceId = requireObjectId(eventInvoice, "INVOICE");
  const invoice = await retrieveInvoice(stripe, eventInvoiceId);
  const invoiceId = requireObjectId(invoice, "INVOICE");
  const context = await getInvoiceContext({ stripe, invoice });

  if (!context.subscription) {
    return {
      processed: false,
      reason: "non_subscription_invoice_ignored",
      objectId: invoice.id,
    };
  }

  if (
    isInvoiceEventAlreadyProcessed({
      invoice,
      subscription: context.subscription,
      customer: context.customer,
      eventId,
    })
  ) {
    return {
      processed: false,
      reason: "already_processed",
      objectId: invoice.id,
    };
  }

  if (!isInvoicePaid(invoice)) {
    return {
      processed: false,
      reason: "invoice_not_paid",
      objectId: invoice.id,
      detail: `Invoice status: ${invoice.status || "unknown"}`,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = resolvePurchaseFromMetadata({
      metadata: context.metadata,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: invoice.id,
      detail: getErrorMessage(error),
    };
  }

  const isRecurringCycle = invoice.billing_reason === "subscription_cycle";

  if (isRecurringCycle) {
    const recurringAddonIds =
      purchase.purchasedAddonIds.filter(isPersistentAddon);

    purchase = {
      ...purchase,
      purchasedAddonIds: recurringAddonIds,
      persistentAddonIds: recurringAddonIds,
      extraPageAddonIds: [],
      extraPages: 0,
    };
  }

  const billingStatus = getSubscriptionBillingStatus(context.subscription);
  const validUntil = getSubscriptionPeriodEnd(context.subscription);

  const result = await applySuccessfulPurchase({
    purchase,
    paymentReference: invoiceId,
    billingStatus,
    validUntil,
    resetPrompts: purchase.planId !== null,
  });

  await markInvoiceEvent({
    stripe,
    invoice,
    subscription: context.subscription,
    customer: context.customer,
    eventId,
  });

  console.info("STRIPE_WEBHOOK_INVOICE_PAID:", {
    eventId,
    invoiceId: invoice.id,
    billingReason: invoice.billing_reason,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    extraPages: result.extraPages,
    validUntil,
  });

  return {
    processed: true,
    reason: isRecurringCycle ? "subscription_renewed" : "invoice_fulfilled",
    objectId: invoice.id,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
    billingStatus,
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
}): Promise<EventProcessingResult> {
  const eventInvoiceId = requireObjectId(eventInvoice, "INVOICE");
  const invoice = await retrieveInvoice(stripe, eventInvoiceId);
  const context = await getInvoiceContext({ stripe, invoice });

  if (
    isInvoiceEventAlreadyProcessed({
      invoice,
      subscription: context.subscription,
      customer: context.customer,
      eventId,
    })
  ) {
    return {
      processed: false,
      reason: "already_processed",
      objectId: invoice.id,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = resolvePurchaseFromMetadata({
      metadata: context.metadata,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: invoice.id,
      detail: getErrorMessage(error),
    };
  }

  const validUntil = getSubscriptionPeriodEnd(context.subscription);

  await updateBillingStatus({
    userId: purchase.userId,
    billingStatus: "past_due",
    validUntil,
  });

  await markInvoiceEvent({
    stripe,
    invoice,
    subscription: context.subscription,
    customer: context.customer,
    eventId,
  });

  console.warn("STRIPE_WEBHOOK_INVOICE_PAYMENT_FAILED:", {
    eventId,
    invoiceId: invoice.id,
    userId: purchase.userId,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
  });

  return {
    processed: true,
    reason: "payment_failure_recorded",
    objectId: invoice.id,
    userId: purchase.userId,
    planId: purchase.planId,
    billingStatus: "past_due",
  };
}

// ============================================================
// SUBSCRIPTION EVENTS
// ============================================================

async function getSubscriptionCustomer(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Customer | null> {
  if (typeof subscription.customer !== "string" && subscription.customer) {
    if ("deleted" in subscription.customer && subscription.customer.deleted) {
      return null;
    }

    return subscription.customer as Stripe.Customer;
  }

  return retrieveCustomer(stripe, getObjectId(subscription.customer));
}

function isSubscriptionEventAlreadyProcessed({
  subscription,
  customer,
  eventId,
}: {
  subscription: Stripe.Subscription;
  customer: Stripe.Customer | null;
  eventId: string;
}): boolean {
  return (
    hasProcessedEvent(subscription.metadata, eventId) ||
    hasProcessedEvent(customer?.metadata, eventId)
  );
}

async function handleSubscriptionUpdated({
  stripe,
  eventId,
  eventSubscription,
}: {
  stripe: Stripe;
  eventId: string;
  eventSubscription: Stripe.Subscription;
}): Promise<EventProcessingResult> {
  const subscription = await retrieveSubscription(stripe, eventSubscription.id);

  if (!subscription) {
    return {
      processed: false,
      reason: "subscription_not_found",
      objectId: eventSubscription.id,
    };
  }

  const customer = await getSubscriptionCustomer(stripe, subscription);

  if (
    isSubscriptionEventAlreadyProcessed({
      subscription,
      customer,
      eventId,
    })
  ) {
    return {
      processed: false,
      reason: "already_processed",
      objectId: subscription.id,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = await resolveSubscriptionPurchase({
      stripe,
      subscription,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: subscription.id,
      detail: getErrorMessage(error),
    };
  }

  const billingStatus = getSubscriptionBillingStatus(subscription);
  const validUntil = getSubscriptionPeriodEnd(subscription);

  if (TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    await downgradeUserToFree({
      userId: purchase.userId,
      billingStatus: subscription.status,
    });
  } else {
    await updateBillingStatus({
      userId: purchase.userId,
      billingStatus,
      validUntil,
    });
  }

  await markSubscriptionEvent({
    stripe,
    subscription,
    customer,
    eventId,
    updateSubscription: true,
  });

  console.info("STRIPE_WEBHOOK_SUBSCRIPTION_UPDATED:", {
    eventId,
    subscriptionId: subscription.id,
    userId: purchase.userId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    validUntil,
  });

  return {
    processed: true,
    reason: TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)
      ? "downgraded_to_free"
      : "subscription_status_updated",
    objectId: subscription.id,
    userId: purchase.userId,
    planId: TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)
      ? "free"
      : purchase.planId,
    billingStatus,
  };
}

async function handleSubscriptionDeleted({
  stripe,
  eventId,
  subscription,
}: {
  stripe: Stripe;
  eventId: string;
  subscription: Stripe.Subscription;
}): Promise<EventProcessingResult> {
  const customer = await getSubscriptionCustomer(stripe, subscription);

  if (
    isSubscriptionEventAlreadyProcessed({
      subscription,
      customer,
      eventId,
    })
  ) {
    return {
      processed: false,
      reason: "already_processed",
      objectId: subscription.id,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = await resolveSubscriptionPurchase({
      stripe,
      subscription,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    return {
      processed: false,
      reason: "unsupported_metadata",
      objectId: subscription.id,
      detail: getErrorMessage(error),
    };
  }

  await downgradeUserToFree({
    userId: purchase.userId,
    billingStatus: "canceled",
  });

  // Zmazané predplatné už nemusí byť možné aktualizovať. Marker preto
  // zapisujeme minimálne na Customer objekt, ktorý zostáva dostupný.
  await markSubscriptionEvent({
    stripe,
    subscription,
    customer,
    eventId,
    updateSubscription: false,
  });

  console.info("STRIPE_WEBHOOK_SUBSCRIPTION_DELETED:", {
    eventId,
    subscriptionId: subscription.id,
    userId: purchase.userId,
  });

  return {
    processed: true,
    reason: "downgraded_to_free",
    objectId: subscription.id,
    userId: purchase.userId,
    planId: "free",
    billingStatus: "canceled",
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
        resendApiKey: Boolean(process.env.RESEND_API_KEY),
        emailFrom: Boolean(process.env.EMAIL_FROM),
        emailReplyTo: Boolean(process.env.EMAIL_REPLY_TO),
        emailLogoUrl: Boolean(process.env.EMAIL_LOGO_URL),
        appUrl: Boolean(
          process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL,
        ),
        orderNotificationEmail: Boolean(process.env.ORDER_NOTIFICATION_EMAIL),
        orderEmailReady: Boolean(
          process.env.RESEND_API_KEY &&
          process.env.EMAIL_FROM &&
          process.env.EMAIL_LOGO_URL &&
          (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL),
        ),
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
    // Podpis sa musí overovať nad pôvodným raw telom požiadavky.
    // Nepoužívajte request.json().
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
    let result: EventProcessingResult | null = null;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        result = await handleCheckoutSucceeded({
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
          subscription: event.data.object as Stripe.Subscription,
        });
        break;
      }

      default: {
        console.info("STRIPE_WEBHOOK_EVENT_IGNORED:", {
          eventId: event.id,
          eventType: event.type,
        });
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
    // Pri databázovej alebo sieťovej chybe vraciame HTTP 500.
    // Stripe tak udalosť automaticky zopakuje.
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
