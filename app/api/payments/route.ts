type Plan = "monthly" | "quarterly" | "yearly";

type Addon =
  | "supervisor"
  | "audit"
  | "defense"
  | "plagiarism";

const PLAN_PRICES = {
  monthly: 40,
  quarterly: 70,
  yearly: 240,
};

const ADDON_PRICES = {
  supervisor: 50,
  audit: 50,
  defense: 60,
  plagiarism: 12,
};

// =====================================================
// 🧠 MOCK USER STATE (nahradíš DB)
// =====================================================
let USER_SUBSCRIPTION: any = {
  active: false,
  plan: null,
  addons: [],
  expiresAt: null,
};

// =====================================================
// 📥 GET – stav platby
// =====================================================
export async function GET() {
  return Response.json({
    ok: true,
    subscription: USER_SUBSCRIPTION,
  });
}

// =====================================================
// 📤 POST – create payment / upgrade
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      plan,
      addons = [],
      currency = "EUR",
    } = body;

    // =====================================================
    // ❗ VALIDÁCIA
    // =====================================================
    if (!plan || !PLAN_PRICES[plan as Plan]) {
      return Response.json({ error: "INVALID_PLAN" }, { status: 400 });
    }

    // =====================================================
    // 💰 CENA
    // =====================================================
    let total = PLAN_PRICES[plan as Plan];

    // addons len ak už má plán alebo kupuje plán
    if (addons.length > 0) {
      for (const a of addons) {
        if (!ADDON_PRICES[a as Addon]) {
          return Response.json({ error: "INVALID_ADDON" }, { status: 400 });
        }
        total += ADDON_PRICES[a as Addon];
      }
    }

    // =====================================================
    // 💱 MENA (EUR / CZK)
    // =====================================================
    let finalAmount = total;

    if (currency === "CZK") {
      finalAmount = Math.round(total * 25); // jednoduchý prepočet
    }

    // =====================================================
    // 🧠 AKTIVÁCIA (SIMULÁCIA)
    // =====================================================
    const now = new Date();

    let expires = new Date();

    if (plan === "monthly") {
      expires.setMonth(now.getMonth() + 1);
    }

    if (plan === "quarterly") {
      expires.setMonth(now.getMonth() + 3);
    }

    if (plan === "yearly") {
      expires.setFullYear(now.getFullYear() + 1);
    }

    USER_SUBSCRIPTION = {
      active: true,
      plan,
      addons,
      currency,
      amount: finalAmount,
      expiresAt: expires.toISOString(),
    };

    // =====================================================
    // 🚀 RESPONSE
    // =====================================================
    return Response.json({
      ok: true,
      message: "PAYMENT_SUCCESS",
      payment: {
        plan,
        addons,
        currency,
        amount: finalAmount,
      },
      subscription: USER_SUBSCRIPTION,
    });

  } catch (err: any) {
    console.error("PAYMENT ERROR:", err);

    return Response.json(
      {
        error: "PAYMENT_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}