import Stripe from "stripe";

export const runtime = "nodejs";

// ⚠️ Stripe init (SPRÁVNA VERZIA)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// ================= ROUTE =================
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  // ⚠️ MUSÍ byť raw body (text)
  const body = await req.text();

  let event: Stripe.Event;

  // ================= VERIFY =================
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ WEBHOOK VERIFY ERROR:", err.message);
    return new Response("Webhook Error", { status: 400 });
  }

  // ================= HANDLE EVENTS =================
  try {
    switch (event.type) {
      // ================= PAYMENT SUCCESS =================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const email = session.customer_email || "";
        const plan = session.metadata?.plan || "unknown";

        let addons: string[] = [];
        try {
          addons = JSON.parse(session.metadata?.addons || "[]");
        } catch {
          addons = [];
        }

        console.log("✅ PAYMENT OK:", { email, plan, addons });

        // 🔥 TODO:
        // await db.user.update(...)
        break;
      }

      // ================= SUBSCRIPTION RENEW =================
      case "invoice.paid": {
        console.log("🔁 SUBSCRIPTION RENEWED");
        break;
      }

      // ================= SUBSCRIPTION CANCEL =================
      case "customer.subscription.deleted": {
        console.log("❌ SUBSCRIPTION CANCELLED");
        break;
      }

      default:
        console.log("ℹ️ UNHANDLED EVENT:", event.type);
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("❌ WEBHOOK PROCESS ERROR:", err);
    return new Response("Processing Error", { status: 500 });
  }
}