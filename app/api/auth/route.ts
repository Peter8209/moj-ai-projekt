import { NextResponse } from "next/server";

export const runtime = "nodejs"; // dôležité pre Vercel

// ⚠️ TEMP DB (nahradiť DB neskôr)
const users: any[] = [];

// ===============================
// 🍪 COOKIE HELPER
// ===============================
function createSessionCookie(email: string) {
  return `user=${email}; Path=/; HttpOnly; SameSite=Lax`;
}

// ===============================
// 📥 POST (LOGIN / REGISTER)
// ===============================
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password, action } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // ===============================
    // 🔐 REGISTER
    // ===============================
    if (action === "register") {
      const existing = users.find((u) => u.email === email);

      if (existing) {
        return NextResponse.json(
          { error: "USER_EXISTS" },
          { status: 400 }
        );
      }

      // 🔥 jednoduché heslo (bez bcrypt)
      const user = {
        id: Date.now(),
        email,
        password: password,
        subscription: false,
        createdAt: new Date(),
      };

      users.push(user);

      const res = NextResponse.json({
        ok: true,
        message: "REGISTERED",
      });

      res.headers.set("Set-Cookie", createSessionCookie(email));

      return res;
    }

    // ===============================
    // 🔑 LOGIN
    // ===============================
    if (action === "login") {
      const user = users.find((u) => u.email === email);

      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND" },
          { status: 404 }
        );
      }

      // 🔥 jednoduché porovnanie (bez bcrypt)
      const valid = password === user.password;

      if (!valid) {
        return NextResponse.json(
          { error: "INVALID_PASSWORD" },
          { status: 401 }
        );
      }

      const res = NextResponse.json({
        ok: true,
        message: "LOGGED_IN",
        subscription: user.subscription,
      });

      res.headers.set("Set-Cookie", createSessionCookie(email));

      return res;
    }

    // ===============================
    // 🤖 AUTO LOGIN (po Stripe)
    // ===============================
    if (action === "auto") {
      const user = users.find((u) => u.email === email);

      if (!user) {
        return NextResponse.json(
          { error: "USER_NOT_FOUND" },
          { status: 404 }
        );
      }

      user.subscription = true;

      const res = NextResponse.json({
        ok: true,
        message: "AUTO_LOGIN_SUCCESS",
      });

      res.headers.set("Set-Cookie", createSessionCookie(email));

      return res;
    }

    return NextResponse.json(
      { error: "INVALID_ACTION" },
      { status: 400 }
    );

  } catch (err: any) {
    console.error("AUTH ERROR:", err);

    return NextResponse.json(
      {
        error: "AUTH_FAILED",
        detail: err?.message || "unknown",
      },
      { status: 500 }
    );
  }
}

// ===============================
// 📤 GET (SESSION CHECK)
// ===============================
export async function GET(req: Request) {
  try {
    const cookie = req.headers.get("cookie");

    if (!cookie) {
      return NextResponse.json({ user: null });
    }

    const match = cookie.match(/user=([^;]+)/);

    if (!match) {
      return NextResponse.json({ user: null });
    }

    const email = match[1];

    const user = users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        email: user.email,
        subscription: user.subscription,
      },
    });

  } catch {
    return NextResponse.json({ user: null });
  }
}