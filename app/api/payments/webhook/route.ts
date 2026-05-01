import Stripe from "stripe";

export const runtime = "nodejs";

// ================= INIT =================
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

// 🔥 TS FIX – garantovaný string
const webhookSecretSafe: string = webhookSecret;

const stripe = new Stripe(stripeSecret);

// ================= TYPES =================
type CheckoutMeta = {
  plan?: string;
  addons?: string;
};

// ================= ROUTE =================
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  // ================= VERIFY =================
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecretSafe
    );
  } catch (err: any) {
    console.error("❌ WEBHOOK VERIFY ERROR:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventId = event.id;

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const email =
          session.customer_email ||
          (typeof session.customer === "string"
            ? await getCustomerEmail(session.customer)
            : "");

        const metadata = (session.metadata || {}) as CheckoutMeta;

        const plan = metadata.plan ?? "unknown";

        let addons: string[] = [];
        try {
          addons = metadata.addons ? JSON.parse(metadata.addons) : [];
        } catch {
          addons = [];
        }

        console.log("✅ PAYMENT SUCCESS:", {
          eventId,
          email,
          plan,
          addons,
        });

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        console.log("🔁 SUBSCRIPTION RENEW:", {
          eventId,
          customer: invoice.customer,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        console.log("❌ SUBSCRIPTION CANCELLED:", {
          eventId,
          subId: sub.id,
        });

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

// ================= HELPER =================
async function getCustomerEmail(customerId: string): Promise<string> {
  try {
    const customer = await stripe.customers.retrieve(customerId);

    // 🔥 FIX: type guard
    if (!customer || typeof customer === "string") return "";

    if ("deleted" in customer && customer.deleted) return "";

    if ("email" in customer && customer.email) {
      return customer.email;
    }

    return "";
  } catch (err) {
    console.error("❌ CUSTOMER FETCH ERROR:", err);
    return "";
  }
}