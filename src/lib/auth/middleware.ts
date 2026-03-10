import { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME, type JwtPayload } from "./jwt";

/**
 * Auth helpers for API route handlers.
 *
 * Extracts and verifies the JWT from the httpOnly cookie.
 * Cookie operations are centralised here so the cookie name and
 * security attributes are never duplicated across route handlers.
 *
 * Two-layer security model:
 *   1. Edge middleware (src/middleware.ts) — fast presence check,
 *      rejects requests with no cookie before they reach handlers.
 *   2. Route handlers call getAuthFromRequest() — full cryptographic
 *      JWT verification with role extraction.
 */

/** 7 days expressed in seconds — matches the JWT TTL. */
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Extract and verify the auth JWT from the incoming request cookie.
 *
 * Returns the decoded payload { sub, role } on success, or null if
 * the cookie is absent, the token is malformed, or the token has
 * expired.
 */
export function getAuthFromRequest(request: NextRequest): JwtPayload | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

/**
 * Build the Set-Cookie header value that installs the auth token.
 *
 * Security attributes:
 *   HttpOnly  — inaccessible to JavaScript (XSS mitigation)
 *   Secure    — HTTPS only in production
 *   SameSite  — Lax prevents most CSRF vectors while allowing
 *               top-level navigations (e.g., OAuth redirects)
 *   Path=/    — cookie is sent for all routes
 *   Max-Age   — 7 days, matches JWT expiration
 */
export function buildAuthCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return (
    `${COOKIE_NAME}=${token}` +
    `; HttpOnly` +
    `; Path=/` +
    `; SameSite=Lax` +
    `; Max-Age=${COOKIE_MAX_AGE_SECONDS}` +
    secure
  );
}

/**
 * Build a Set-Cookie header that immediately expires the auth cookie.
 * Used on logout to clear the token from the browser.
 */
export function buildClearAuthCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
