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

// Stripe neinicializujeme na top-level. Build tak nespadne,
// keď počas zostavenia projektu nie sú dostupné ENV premenné.
let stripeClient: Stripe | null = null;

// ============================================================
// TYPES
// ============================================================

type MetadataRecord = Record<string, string>;

type EntitlementRow = {
  plan_id: string | null;
  addon_ids: string[] | null;
  prompts_used: number | null;
  activated_at: string | null;
  valid_until: string | null;
};

type ResolvedPurchase = {
  userId: string;
  planId: Exclude<PlanId, "free"> | null;
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

type CheckoutProcessingResult = {
  processed: boolean;
  reason:
    | "fulfilled"
    | "already_fulfilled"
    | "payment_not_completed"
    | "unsupported_checkout_mode"
    | "unsupported_metadata";
  sessionId: string;
  userId?: string;
  planId?: PlanId | null;
  purchasedAddonIds?: AddonId[];
  activeAddonIds?: AddonId[];
  extraPages?: number;
  detail?: string;
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

function normalizePaidPlanId(value: unknown): Exclude<PlanId, "free"> | null {
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

// ============================================================
// STRIPE METADATA HELPERS
// ============================================================

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

async function getCustomerMetadata(
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

async function resolvePurchaseMetadata({
  stripe,
  session,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}): Promise<ResolvedPurchase> {
  const [customerMetadata, paymentIntentMetadata] = await Promise.all([
    getCustomerMetadata(stripe, session),
    getPaymentIntentMetadata(stripe, session),
  ]);

  // Session metadata majú najvyššiu prioritu, preto sú posledné.
  const metadata = mergeMetadata(
    customerMetadata,
    paymentIntentMetadata,
    session.metadata,
  );

  const metadataUserId = normalizeUserId(
    readMetadataValue(metadata, [
      "user_id",
      "userId",
      "userid",
      "supabase_user_id",
    ]),
  );

  const referenceUserId = normalizeUserId(session.client_reference_id);

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
}: {
  userId: string;
  planId: Exclude<PlanId, "free"> | null;
  persistentAddonIds: AddonId[];
}): Promise<{
  effectivePlanId: PlanId;
  activeAddonIds: AddonId[];
}> {
  const admin = createAdminClient();
  const current = await loadCurrentEntitlement(userId);

  const effectivePlanId = planId || normalizeExistingPlanId(current?.plan_id);

  const plan = PLANS[effectivePlanId];

  // Staré extra-20/40/60 záznamy z addon_ids vyčistíme.
  // Extra strany sú kredit, nie trvalé funkčné oprávnenie.
  const currentPersistentAddonIds = normalizeAddonIds(
    current?.addon_ids || [],
  ).filter(isPersistentAddon);

  const activeAddonIds = Array.from(
    new Set([...currentPersistentAddonIds, ...persistentAddonIds]),
  );

  const isNewPlanPurchase = planId !== null;
  const now = new Date().toISOString();

  const { error } = await admin.from("zedpera_user_entitlements").upsert(
    {
      user_id: userId,
      plan_id: effectivePlanId,
      addon_ids: activeAddonIds,
      prompt_limit: plan.promptLimit,
      prompts_used: isNewPlanPurchase
        ? 0
        : toSafeInteger(current?.prompts_used, 0),
      attachment_limit: plan.attachmentLimit,
      activated_at: isNewPlanPurchase ? now : current?.activated_at || now,
      valid_until: isNewPlanPurchase ? null : current?.valid_until || null,
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
}: {
  purchase: ResolvedPurchase;
  paymentReference: string;
}): Promise<AppliedPurchase> {
  // Najprv zapíšeme oprávnenia. Ak následne zlyhá page RPC,
  // Stripe webhook sa zopakuje a upsert zostane bezpečne opakovateľný.
  const entitlement = await upsertEntitlementAfterPurchase({
    userId: purchase.userId,
    planId: purchase.planId,
    persistentAddonIds: purchase.persistentAddonIds,
  });

  const admin = createAdminClient();

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

// ============================================================
// FULFILLMENT MARKERS
// ============================================================

function hasFulfilledMarker(
  metadata: Stripe.Metadata | MetadataRecord | null | undefined,
): boolean {
  return normalizeMetadata(metadata)[FULFILLED_MARKER_KEY] === "true";
}

function isCheckoutAlreadyFulfilled(session: Stripe.Checkout.Session): boolean {
  if (hasFulfilledMarker(session.metadata)) {
    return true;
  }

  if (
    typeof session.payment_intent !== "string" &&
    session.payment_intent &&
    hasFulfilledMarker(session.payment_intent.metadata)
  ) {
    return true;
  }

  return false;
}

async function markCheckoutFulfilled({
  stripe,
  session,
  eventId,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
  eventId: string;
}): Promise<void> {
  const fulfilledMetadata: MetadataRecord = {
    [FULFILLED_MARKER_KEY]: "true",
    [FULFILLED_EVENT_KEY]: eventId,
    [FULFILLED_AT_KEY]: new Date().toISOString(),
  };

  const operations: Array<Promise<unknown>> = [
    stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...normalizeMetadata(session.metadata),
        ...fulfilledMetadata,
      },
    }),
  ];

  const paymentIntentId = getObjectId(session.payment_intent);

  if (paymentIntentId) {
    const paymentIntentMetadata =
      typeof session.payment_intent !== "string" && session.payment_intent
        ? normalizeMetadata(session.payment_intent.metadata)
        : {};

    operations.push(
      stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          ...paymentIntentMetadata,
          ...fulfilledMetadata,
        },
      }),
    );
  }

  const results = await Promise.allSettled(operations);
  const successfulMarkers = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  if (successfulMarkers === 0) {
    console.error("STRIPE_WEBHOOK_FULFILLMENT_MARKER_ERROR:", {
      sessionId: session.id,
      eventId,
      errors: results.map((result) =>
        result.status === "rejected" ? getErrorMessage(result.reason) : null,
      ),
    });
  }
}

// ============================================================
// CHECKOUT PROCESSING
// ============================================================

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
    "MISSING_PURCHASE_METADATA",
  ].some((code) => message.includes(code));
}

async function handleCheckoutCompleted({
  stripe,
  eventId,
  eventSession,
}: {
  stripe: Stripe;
  eventId: string;
  eventSession: Stripe.Checkout.Session;
}): Promise<CheckoutProcessingResult> {
  const session = await stripe.checkout.sessions.retrieve(eventSession.id, {
    expand: ["payment_intent", "customer"],
  });

  if (session.mode !== "payment") {
    console.warn("STRIPE_WEBHOOK_UNSUPPORTED_CHECKOUT_MODE:", {
      eventId,
      sessionId: session.id,
      mode: session.mode,
    });

    return {
      processed: false,
      reason: "unsupported_checkout_mode",
      sessionId: session.id,
      detail: `Unsupported checkout mode: ${session.mode || "unknown"}`,
    };
  }

  if (
    session.currency &&
    session.currency.toLowerCase() !== EXPECTED_CURRENCY
  ) {
    console.warn("STRIPE_WEBHOOK_UNSUPPORTED_CURRENCY:", {
      eventId,
      sessionId: session.id,
      currency: session.currency,
    });

    return {
      processed: false,
      reason: "unsupported_metadata",
      sessionId: session.id,
      detail: `Unsupported currency: ${session.currency}`,
    };
  }

  if (isCheckoutAlreadyFulfilled(session)) {
    console.info("STRIPE_WEBHOOK_CHECKOUT_ALREADY_FULFILLED:", {
      eventId,
      sessionId: session.id,
    });

    return {
      processed: false,
      reason: "already_fulfilled",
      sessionId: session.id,
    };
  }

  if (!isCheckoutPaymentCompleted(session)) {
    console.info("STRIPE_WEBHOOK_CHECKOUT_PAYMENT_PENDING:", {
      eventId,
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    return {
      processed: false,
      reason: "payment_not_completed",
      sessionId: session.id,
    };
  }

  let purchase: ResolvedPurchase;

  try {
    purchase = await resolvePurchaseMetadata({
      stripe,
      session,
    });
  } catch (error) {
    if (!isPermanentMetadataError(error)) {
      throw error;
    }

    const detail = getErrorMessage(error);

    // Staré alebo poškodené metadata nie je možné opraviť retry mechanizmom.
    // Udalosť preto prijmeme HTTP 200 a zaznamenáme ju do logu.
    console.error("STRIPE_WEBHOOK_UNSUPPORTED_METADATA:", {
      eventId,
      sessionId: session.id,
      detail,
      metadata: normalizeMetadata(session.metadata),
    });

    return {
      processed: false,
      reason: "unsupported_metadata",
      sessionId: session.id,
      detail,
    };
  }

  const result = await applySuccessfulPurchase({
    purchase,
    paymentReference: session.id,
  });

  // Marker zapisujeme až po úspešnej aktivácii databázy.
  await markCheckoutFulfilled({
    stripe,
    session,
    eventId,
  });

  console.info("STRIPE_WEBHOOK_CHECKOUT_FULFILLED:", {
    eventId,
    sessionId: session.id,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
  });

  return {
    processed: true,
    reason: "fulfilled",
    sessionId: session.id,
    userId: result.userId,
    planId: result.effectivePlanId,
    purchasedAddonIds: result.purchasedAddonIds,
    activeAddonIds: result.activeAddonIds,
    extraPages: result.extraPages,
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
      checkoutMode: "payment",
      configured: {
        stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
        webhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      },
      supportedEvents: [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
      ],
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
    // Webhook podpis sa musí overovať nad pôvodným raw telom.
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
    let result: CheckoutProcessingResult | null = null;

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        result = await handleCheckoutCompleted({
          stripe,
          eventId: event.id,
          eventSession: session,
        });

        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;

        console.warn("STRIPE_WEBHOOK_ASYNC_PAYMENT_FAILED:", {
          eventId: event.id,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });

        break;
      }

      default: {
        // Nový katalóg používa výhradne jednorazový checkout mode=payment.
        // Subscription a invoice udalosti preto zámerne nemenia oprávnenia.
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
      },
    );
  } catch (error) {
    // Databázové alebo sieťové chyby vracajú HTTP 500.
    // Stripe tak môže udalosť bezpečne zopakovať.
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
      },
    );
  }
}
