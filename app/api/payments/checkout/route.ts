import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 🔥 FIX: odstránený apiVersion (žiadny TS konflikt)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ================= TYPES =================
type Plan = "monthly" | "quarterly" | "yearly";
type Addon = "supervisor" | "audit" | "defense" | "plagiarism";

// ================= STRIPE PRICE IDS =================
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

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      return NextResponse.json({ error: "MISSING_BASE_URL" }, { status: 500 });
    }

    // ================= CUSTOMER =================
    let customer: Stripe.Customer;

    const existing = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
      });
    }

    // ================= LINE ITEMS =================
   const line_items = [
  {
    price: PLAN_PRICE_IDS[plan],
    quantity: 1,
  },
];

    for (const addon of addons) {
      const priceId = ADDON_PRICE_IDS[addon];
      if (!priceId) continue;

      line_items.push({
        price: priceId,
        quantity: 1,
      });
    }

    // ================= SESSION =================
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customer.id,
        line_items,
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?cancel=1`,
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