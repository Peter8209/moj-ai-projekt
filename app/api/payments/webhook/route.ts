import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 🔥 dôležité

// ❗ nič na top-level!
let stripe: Stripe | null = null;

// ================= ROUTE =================
export async function POST(req: Request) {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // 🔥 zabráni build crashu
    if (!stripeSecret || !webhookSecret) {
      return new Response("Missing config", { status: 500 });
    }

    // 🔥 init AŽ TU
    if (!stripe) {
      stripe = new Stripe(stripeSecret);
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error("❌ VERIFY ERROR:", err.message);
      return new Response("Invalid signature", { status: 400 });
    }

    // ================= EVENTS =================
    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ PAYMENT OK");
        break;

      case "invoice.paid":
        console.log("🔁 RENEW");
        break;

      case "customer.subscription.deleted":
        console.log("❌ CANCEL");
        break;

      default:
        console.log("ℹ️ EVENT:", event.type);
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return new Response("Error", { status: 500 });
  }
}