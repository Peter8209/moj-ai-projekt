import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ================= TYPES =================

type Plan =
  | 'week-mini'
  | 'week-student'
  | 'week-pro'
  | 'monthly'
  | 'three-months'
  | 'year-pro'
  | 'year-max';

type Addon =
  | 'ai-supervisor'
  | 'quality-audit'
  | 'defense'
  | 'originality'
  | 'extra-50'
  | 'extra-100'
  | 'premium-model'
  | 'express';

type CheckoutBody = {
  plan?: unknown;
  planId?: unknown;
  selectedPlan?: unknown;

  addons?: unknown;
  addOns?: unknown;
  selectedAddons?: unknown;

  email?: unknown;
  customerEmail?: unknown;
  userEmail?: unknown;

  userId?: unknown;

  successUrl?: unknown;
  cancelUrl?: unknown;
};

type ProductPlanConfig = {
  productId: string;
  name: string;
  unitAmount: number;
  type: 'one_time' | 'recurring';
  interval?: 'month' | 'year';
  intervalCount?: number;
};

type ProductAddonConfig = {
  productId: string;
  name: string;
  unitAmount: number;
};

type CheckoutLineItem = {
  quantity: number;
  price_data: {
    currency: string;
    product: string;
    unit_amount: number;
    recurring?: {
      interval: 'month' | 'year';
      interval_count: number;
    };
  };
};

// ================= PRODUCT IDS =================
// Používame Stripe Product ID hodnoty: prod_...
// Preto v line_items používame price_data, nie price.

const PLAN_PRODUCTS: Record<Plan, ProductPlanConfig> = {
  'week-mini': {
    productId: 'prod_UU2NhFU3C6vjiG',
    name: 'Zedpera – Týždeň MINI',
    unitAmount: 1320,
    type: 'one_time',
  },

  'week-student': {
    productId: 'prod_UU2OFSpyz8BwAN',
    name: 'Zedpera – Týždeň ŠTUDENT',
    unitAmount: 2650,
    type: 'one_time',
  },

  'week-pro': {
    productId: 'prod_UU2P3e4CZ75Ium',
    name: 'Zedpera – Týždeň PRO',
    unitAmount: 3990,
    type: 'one_time',
  },

  monthly: {
    productId: 'prod_UU2QjQWpoJD9F5',
    name: 'Zedpera – Mesačný START',
    unitAmount: 5320,
    type: 'recurring',
    interval: 'month',
    intervalCount: 1,
  },

  'three-months': {
    productId: 'prod_UU2RCroeVJaxdr',
    name: 'Zedpera – 3 mesiace ŠTUDENT',
    unitAmount: 9330,
    type: 'one_time',
  },

  'year-pro': {
    productId: 'prod_UU2ShggR0Rxi7B',
    name: 'Zedpera – Ročný PRO',
    unitAmount: 32000,
    type: 'recurring',
    interval: 'year',
    intervalCount: 1,
  },

  'year-max': {
    productId: 'prod_UU2TkpMburoaBr',
    name: 'Zedpera – Ročný MAX',
    unitAmount: 53200,
    type: 'recurring',
    interval: 'year',
    intervalCount: 1,
  },
};

const ADDON_PRODUCTS: Record<Addon, ProductAddonConfig> = {
  'ai-supervisor': {
    productId: 'prod_UU2UFmP0ITPuCp',
    name: 'Zedpera – AI vedúci práce',
    unitAmount: 3990,
  },

  'quality-audit': {
    productId: 'prod_UU2UDuYjyZWjY1',
    name: 'Zedpera – Kontrola kvality práce',
    unitAmount: 3990,
  },

  defense: {
    productId: 'prod_UU2VySwbjJzt7b',
    name: 'Zedpera – Obhajoba + prezentácia',
    unitAmount: 5320,
  },

  originality: {
    productId: 'prod_UU2Wlkmh3tG6dE',
    name: 'Zedpera – Kontrola originality',
    unitAmount: 1600,
  },

  'extra-50': {
    productId: 'prod_UU2WLHgd5eDI6G',
    name: 'Zedpera – Extra 50 strán',
    unitAmount: 1320,
  },

  'extra-100': {
    productId: 'prod_UU2XcozbWEOsOd',
    name: 'Zedpera – Extra 100 strán',
    unitAmount: 2650,
  },

  'premium-model': {
    productId: 'prod_UU2XQFomb87mIO',
    name: 'Zedpera – Prémiový model Claude/Grok',
    unitAmount: 1320,
  },

  express: {
    productId: 'prod_UU2Y0ocIPC7obx',
    name: 'Zedpera – Expresné spracovanie',
    unitAmount: 2650,
  },
};

// ================= HELPERS =================

function isPlan(value: unknown): value is Plan {
  return typeof value === 'string' && value in PLAN_PRODUCTS;
}

function isAddon(value: unknown): value is Addon {
  return typeof value === 'string' && value in ADDON_PRODUCTS;
}

function safeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function safeUserId(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function safeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    return baseUrl.replace(/\/$/, '');
  }

  return `https://${baseUrl}`.replace(/\/$/, '');
}

function getStripe(): Stripe {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(stripeSecret);
}

function getPlanFromBody(body: CheckoutBody): unknown {
  return body.plan || body.planId || body.selectedPlan;
}

function getAddonsFromBody(body: CheckoutBody): unknown[] {
  const possibleAddons = body.addons || body.addOns || body.selectedAddons;

  if (!Array.isArray(possibleAddons)) {
    return [];
  }

  return possibleAddons;
}

function getEmailFromBody(body: CheckoutBody): string {
  return (
    safeEmail(body.email) ||
    safeEmail(body.customerEmail) ||
    safeEmail(body.userEmail)
  );
}

function getSuccessUrl(body: CheckoutBody, baseUrl: string): string {
  const customSuccessUrl = safeUrl(body.successUrl);

  if (customSuccessUrl) {
    return customSuccessUrl;
  }

  return `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
}

function getCancelUrl(body: CheckoutBody, baseUrl: string): string {
  const customCancelUrl = safeUrl(body.cancelUrl);

  if (customCancelUrl) {
    return customCancelUrl;
  }

  return `${baseUrl}/pricing?payment=cancel`;
}

function createPlanLineItem(plan: Plan): CheckoutLineItem {
  const planData = PLAN_PRODUCTS[plan];

  if (planData.type === 'recurring') {
    return {
      quantity: 1,
      price_data: {
        currency: 'eur',
        product: planData.productId,
        unit_amount: planData.unitAmount,
        recurring: {
          interval: planData.interval || 'month',
          interval_count: planData.intervalCount || 1,
        },
      },
    };
  }

  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      product: planData.productId,
      unit_amount: planData.unitAmount,
    },
  };
}

function createAddonLineItem(addon: Addon): CheckoutLineItem {
  const addonData = ADDON_PRODUCTS[addon];

  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      product: addonData.productId,
      unit_amount: addonData.unitAmount,
    },
  };
}

function createIdempotencyKey({
  email,
  plan,
  addons,
}: {
  email: string;
  plan: Plan;
  addons: Addon[];
}) {
  return [
    'zedpera_checkout',
    email,
    plan,
    addons.join('_') || 'no_addons',
    Math.floor(Date.now() / 30_000).toString(),
  ]
    .join('_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 255);
}

// ================= ROUTES =================

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/payments/checkout',
    allowedPlans: Object.keys(PLAN_PRODUCTS),
    allowedAddons: Object.keys(ADDON_PRODUCTS),
  });
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const body = (await req.json().catch(() => ({}))) as CheckoutBody;

    const planInput = getPlanFromBody(body);
    const addonsInput = getAddonsFromBody(body);
    const email = getEmailFromBody(body);
    const userId = safeUserId(body.userId);

    // ================= VALIDATION: PLAN =================

    if (!isPlan(planInput)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_PLAN',
          message: 'Neplatný balík. Skontroluj plan ID na frontende.',
          received: planInput,
          receivedPlan: planInput,
          allowedPlans: Object.keys(PLAN_PRODUCTS),
          expectedFrontendValues: [
            'week-mini',
            'week-student',
            'week-pro',
            'monthly',
            'three-months',
            'year-pro',
            'year-max',
          ],
        },
        { status: 400 },
      );
    }

    const plan: Plan = planInput;
    const selectedPlan = PLAN_PRODUCTS[plan];

    // ================= VALIDATION: EMAIL =================

    if (!email) {
      return NextResponse.json(
        {
          ok: false,
          error: 'MISSING_EMAIL',
          message: 'Pre pokračovanie na platbu je potrebný e-mail.',
        },
        { status: 400 },
      );
    }

    // ================= VALIDATION: ADDONS =================

    const validAddons = addonsInput.filter(isAddon);
    const invalidAddons = addonsInput.filter((addon) => !isAddon(addon));

    if (invalidAddons.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_ADDON',
          message: 'Niektorý doplnok nie je platný.',
          invalidAddons,
          allowedAddons: Object.keys(ADDON_PRODUCTS),
        },
        { status: 400 },
      );
    }

    // ================= MODE =================

    const mode: 'payment' | 'subscription' =
      selectedPlan.type === 'recurring' ? 'subscription' : 'payment';

    // ================= CUSTOMER =================

    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const createdCustomer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          source: 'zedpera',
        },
      });

      customerId = createdCustomer.id;
    }

    // ================= LINE ITEMS =================

    const lineItems: CheckoutLineItem[] = [
      createPlanLineItem(plan),
      ...validAddons.map((addon) => createAddonLineItem(addon)),
    ];

    // ================= METADATA =================

    const addonNames = validAddons.map((addon) => ADDON_PRODUCTS[addon].name);

    const metadata: Record<string, string> = {
      userId,
      email,
      plan,
      planName: selectedPlan.name,
      addons: JSON.stringify(validAddons),
      addonNames: JSON.stringify(addonNames),
      source: 'zedpera',
    };

    // Nepoužívame Stripe.Checkout.SessionCreateParams,
    // lebo niektoré verzie stripe balíka tento typ neexportujú správne.
    const sessionParams: any = {
      mode,
      customer: customerId,
      line_items: lineItems,

      success_url: getSuccessUrl(body, baseUrl),
      cancel_url: getCancelUrl(body, baseUrl),

      metadata,

      allow_promotion_codes: true,
      billing_address_collection: 'auto',

      automatic_tax: {
        enabled: false,
      },
    };

    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata,
      };
    } else {
      sessionParams.payment_intent_data = {
        metadata,
      };
    }

    const idempotencyKey = createIdempotencyKey({
      email,
      plan,
      addons: validAddons,
    });

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey,
    });

    if (!session.url) {
      return NextResponse.json(
        {
          ok: false,
          error: 'CHECKOUT_SESSION_URL_MISSING',
          message: 'Stripe nevygeneroval checkout URL.',
          sessionId: session.id,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
      mode,
      plan,
      planName: selectedPlan.name,
      addons: validAddons,
      addonNames,
      customerId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';

    console.error('CHECKOUT ERROR:', err);

    return NextResponse.json(
      {
        ok: false,
        error: 'CHECKOUT_FAILED',
        detail: message,
      },
      { status: 500 },
    );
  }
}