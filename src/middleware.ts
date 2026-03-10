import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/jwt";

/**
 * Next.js Edge Middleware.
 *
 * Protects all API routes EXCEPT the public auth endpoints.
 * Runs on Vercel's Edge Runtime before any route handler is invoked.
 *
 * IMPORTANT: This middleware runs in the Edge Runtime which does NOT
 * support Node.js crypto. For this reason we only verify cookie
 * *presence* here. Full cryptographic JWT verification (signature,
 * expiration, claims) happens inside the route handlers via
 * getAuthFromRequest(). This is a deliberate two-layer approach:
 *
 *   Layer 1 — Edge middleware (this file):
 *     Fast rejection of requests that have no cookie at all.
 *     No database calls, no crypto — minimal latency overhead.
 *
 *   Layer 2 — Route handlers:
 *     Full JWT verification + database lookup.
 *     A tampered or expired token that slips past Layer 1
 *     is rejected here with a 401.
 *
 * Public paths are matched exactly (no prefix matching) to prevent
 * accidental exposure of adjacent routes.
 */

const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Only guard /api/* routes.
  // Next.js internals (_next), static assets, and page routes pass through.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Public auth endpoints are always reachable without a cookie.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for the auth cookie. We use the shared COOKIE_NAME constant
  // so the name is never out of sync between middleware and route handlers.
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Cookie is present. Forward to the route handler for full JWT verification.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all /api/* paths. The matcher uses Next.js path
  // patterns — this is NOT the same as the PUBLIC_PATHS check above.
  matcher: ["/api/:path*"],
};
