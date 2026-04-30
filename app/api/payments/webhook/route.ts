import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("WEBHOOK VERIFY ERROR:", err.message);
    return new Response("Webhook Error", { status: 400 });
  }

  try {
    switch (event.type) {

      // ✅ úspešná platba (prvé spustenie)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const email = session.customer_email;
        const plan = session.metadata?.plan;
        const addons = JSON.parse(session.metadata?.addons || "[]");

        console.log("✅ PAYMENT OK:", email, plan, addons);

        // 👉 TU ULOŽ DO DB
        // user.subscription = active
        // user.plan = plan
        // user.addons = addons

        break;
      }

      // 🔁 obnovovanie
      case "invoice.paid": {
        console.log("🔁 SUBSCRIPTION RENEWED");
        break;
      }

      // ❌ zrušenie / neplatba
      case "customer.subscription.deleted": {
        console.log("❌ SUBSCRIPTION CANCELLED");
        break;
      }
    }

    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("WEBHOOK PROCESS ERROR:", err);
    return new Response("Error", { status: 500 });
  }
}