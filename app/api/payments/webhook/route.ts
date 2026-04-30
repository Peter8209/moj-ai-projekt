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

  // ⚠️ MUSÍ byť RAW body
  const body = await req.text();

  let event: Stripe.Event;

  // ================= VERIFY =================
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error("❌ WEBHOOK VERIFY ERROR:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  // ================= IDEMPOTENCY (ochrana) =================
  const eventId = event.id;

  try {
    // 🔥 TODO: DB kontrola (zabráni double processing)
    /*
    const exists = await db.webhookEvent.findUnique({ where: { id: eventId } });
    if (exists) return new Response("Already processed", { status: 200 });
    */

    switch (event.type) {

      // =====================================================
      // 💳 CHECKOUT SUCCESS
      // =====================================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const email =
          session.customer_email ||
          (typeof session.customer === "string"
            ? await getCustomerEmail(session.customer)
            : "");

        const metadata = (session.metadata || {}) as CheckoutMeta;

        const plan = metadata.plan || "unknown";

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

        // ================= DB LOGIKA =================
        /*
        await db.user.upsert({
          where: { email },
          update: {
            plan,
            addons,
            status: "active",
          },
          create: {
            email,
            plan,
            addons,
            status: "active",
          },
        });

        await db.webhookEvent.create({
          data: { id: eventId },
        });
        */

        break;
      }

      // =====================================================
      // 🔁 SUBSCRIPTION RENEW
      // =====================================================
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        console.log("🔁 SUBSCRIPTION RENEW:", {
          eventId,
          customer: invoice.customer,
        });

        // 🔥 DB: predĺženie platnosti
        break;
      }

      // =====================================================
      // ❌ SUBSCRIPTION CANCEL
      // =====================================================
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        console.log("❌ SUBSCRIPTION CANCELLED:", {
          eventId,
          subId: sub.id,
        });

        // 🔥 DB: deaktivácia usera
        break;
      }

      // =====================================================
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

    if (typeof customer === "string") return "";

    return customer.email || "";
  } catch (err) {
    console.error("❌ CUSTOMER FETCH ERROR:", err);
    return "";
  }
}