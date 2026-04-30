import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 🔥 zatiaľ mock (nahradíš DB)
function hasSubscription(req: NextRequest) {
  const active = req.cookies.get("sub_active");
  return active?.value === "1";
}

export function middleware(req: NextRequest) {
  const protectedPaths = ["/dashboard", "/chat", "/projects"];

  if (protectedPaths.some(p => req.nextUrl.pathname.startsWith(p))) {

    if (!hasSubscription(req)) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }
  }

  return NextResponse.next();
}