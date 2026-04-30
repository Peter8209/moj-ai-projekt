import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type Plan = "monthly" | "quarterly" | "yearly";
type Addon = "supervisor" | "audit" | "defense" | "plagiarism";

// 💰 ceny v centoch
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

export async function POST(req: Request) {
  try {
    const { plan, addons = [], currency = "eur", email } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return Response.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency,
          product_data: { name: `Zedpera plan: ${plan}` },
          unit_amount: PLAN_PRICES[plan],
          recurring: {
            interval:
              plan === "monthly"
                ? "month"
                : plan === "quarterly"
                ? "month"
                : "year",
            interval_count: plan === "quarterly" ? 3 : 1,
          },
        },
        quantity: 1,
      },
    ];

    for (const addon of addons) {
      if (!ADDON_PRICES[addon]) continue;

      line_items.push({
        price_data: {
          currency,
          product_data: { name: `Addon: ${addon}` },
          unit_amount: ADDON_PRICES[addon],
        },
        quantity: 1,
      });
    }

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
      { error: "CHECKOUT_FAILED", detail: err.message },
      { status: 500 }
    );
  }
}