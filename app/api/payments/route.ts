import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ❗ SAFE INIT (bez crashu pri build-e)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// ================= TYPES =================
type Plan = "monthly" | "quarterly" | "yearly";

type Addon =
  | "supervisor"
  | "audit"
  | "defense"
  | "plagiarism";

// ================= PRICES =================
const PLAN_PRICES: Record<Plan, number> = {
  monthly: 4000,
  quarterly: 7000,
  yearly: 24000,
};

const ADDON_PRICES: Record<Addon, number> = {
  supervisor: 5000,
  audit: 5000,
  defense: 6000,
  plagiarism: 1200,
};

// ================= GET =================
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Stripe payments endpoint OK",
  });
}

// ================= POST =================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const plan = body.plan as Plan;
    const addons = Array.isArray(body.addons) ? (body.addons as Addon[]) : [];
    const currency = body.currency === "CZK" ? "czk" : "eur";
    const email = body.email as string;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    // ================= VALIDATION =================
    if (!plan || !(plan in PLAN_PRICES)) {
      return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "MISSING_EMAIL" }, { status: 400 });
    }

    if (!baseUrl || !stripeSecret) {
      return NextResponse.json(
        { error: "SERVER_CONFIG_ERROR" },
        { status: 500 }
      );
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
        price_data: {
          currency,
          product_data: {
            name: `Zedpera plan: ${plan}`,
          },
          unit_amount:
            currency === "czk"
              ? Math.round(PLAN_PRICES[plan] * 25)
              : PLAN_PRICES[plan],
        },
        quantity: 1,
      },
      ...addons
        .filter((a) => a in ADDON_PRICES)
        .map((addon) => ({
          price_data: {
            currency,
            product_data: {
              name: `Addon: ${addon}`,
            },
            unit_amount:
              currency === "czk"
                ? Math.round(ADDON_PRICES[addon] * 25)
                : ADDON_PRICES[addon],
          },
          quantity: 1,
        })),
    ];

    // ================= SESSION =================
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items,
      success_url: `${baseUrl}/dashboard?success=1`,
      cancel_url: `${baseUrl}/pricing?cancel=1`,
      metadata: {
        plan,
        addons: JSON.stringify(addons),
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });

  } catch (err: any) {
    console.error("PAYMENT ERROR:", err);

    return NextResponse.json(
      {
        error: "PAYMENT_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}