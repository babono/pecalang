import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth";

/**
 * Optimistic auth gate. The signature is verified here (no DB needed), but the
 * real check — that the signed user still exists — happens in `currentUser()`
 * on the server. We deliberately do NOT bounce cookie-holders away from
 * /login: a present-but-stale cookie (valid signature, deleted user) would
 * otherwise ping-pong /login ⇄ /dashboard forever.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const validSignature = Boolean(readSession(token));
  const { pathname } = request.nextUrl;

  if (!validSignature && pathname.startsWith("/dashboard")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    // Drop a tampered / wrong-secret cookie so it stops being sent.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
