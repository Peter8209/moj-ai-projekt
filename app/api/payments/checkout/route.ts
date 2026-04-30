import Stripe from "stripe";

export const runtime = "nodejs";

// ================= INIT =================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// ================= TYPES =================
type Plan = "monthly" | "quarterly" | "yearly";
type Addon = "supervisor" | "audit" | "defense" | "plagiarism";

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

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const plan = body.plan as Plan;
    const addons = Array.isArray(body.addons) ? (body.addons as Addon[]) : [];
    const currency = typeof body.currency === "string" ? body.currency.toLowerCase() : "eur";
    const email = typeof body.email === "string" ? body.email : undefined;

    // ================= VALIDATION =================
    if (!plan || !(plan in PLAN_PRICES)) {
      return Response.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    if (!email) {
      return Response.json({ error: "MISSING_EMAIL" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      return Response.json({ error: "MISSING_BASE_URL" }, { status: 500 });
    }

    // ================= LINE ITEMS =================
    const line_items: Stripe.Checkout.SessionCreateParams['line_items'] = [
      {
        price_data: {
          currency,
          product_data: {
            name: `Zedpera plan: ${plan}`,
          },
          unit_amount: PLAN_PRICES[plan],
          recurring: {
            interval: plan === "yearly" ? "year" : "month",
            interval_count: plan === "quarterly" ? 3 : 1,
          },
        },
        quantity: 1,
      },
    ];

    // ================= ADDONS =================
    for (const addon of addons) {
      if (!(addon in ADDON_PRICES)) continue;

      line_items.push({
        price_data: {
          currency,
          product_data: {
            name: `Addon: ${addon}`,
          },
          unit_amount: ADDON_PRICES[addon],
        },
        quantity: 1,
      });
    }

    // ================= SESSION =================
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?cancel=1`,
      metadata: {
        plan,
        addons: JSON.stringify(addons),
      },
    });

    return Response.json({
      ok: true,
      url: session.url,
    });

  } catch (err: any) {
    console.error("CHECKOUT ERROR:", err);

    return Response.json(
      {
        error: "CHECKOUT_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}