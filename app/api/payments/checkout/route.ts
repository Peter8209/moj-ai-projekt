import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ================= INIT =================
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!baseUrl) {
  throw new Error("Missing NEXT_PUBLIC_BASE_URL");
}

const stripe = new Stripe(stripeSecret);

// ================= TYPES =================
type Plan = "monthly" | "quarterly" | "yearly";
type Addon = "supervisor" | "audit" | "defense" | "plagiarism";

// ================= PRICE IDS =================
const PLAN_PRICE_IDS: Record<Plan, string> = {
  monthly: "price_monthly_xxx",
  quarterly: "price_quarterly_xxx",
  yearly: "price_yearly_xxx",
};

const ADDON_PRICE_IDS: Partial<Record<Addon, string>> = {
  supervisor: "price_supervisor_xxx",
  audit: "price_audit_xxx",
  defense: "price_defense_xxx",
  plagiarism: "price_plagiarism_xxx",
};

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const plan = body.plan as Plan;
    const addons = Array.isArray(body.addons) ? (body.addons as Addon[]) : [];
    const email = body.email as string;

    // ================= VALIDATION =================
    if (!plan || !(plan in PLAN_PRICE_IDS)) {
      return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "MISSING_EMAIL" }, { status: 400 });
    }

    // ================= CUSTOMER =================
    let customerId: string;

    const existing = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
    }

    // ================= LINE ITEMS =================
    const line_items = [
      {
        price: PLAN_PRICE_IDS[plan],
        quantity: 1,
      },
      ...addons
        .map((addon) => ADDON_PRICE_IDS[addon])
        .filter(Boolean)
        .map((priceId) => ({
          price: priceId as string,
          quantity: 1,
        })),
    ];

    // ================= SESSION =================
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items,
        success_url: `${baseUrl}/dashboard?success=1`,
        cancel_url: `${baseUrl}/pricing?cancel=1`,
        metadata: {
          plan,
          addons: JSON.stringify(addons),
        },
      },
      {
        idempotencyKey: `checkout_${email}_${Date.now()}`,
      }
    );

    return NextResponse.json({
      ok: true,
      url: session.url,
    });

  } catch (err: any) {
    console.error("CHECKOUT ERROR:", err);

    return NextResponse.json(
      {
        error: "CHECKOUT_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}