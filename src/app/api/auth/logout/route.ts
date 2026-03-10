import { buildClearAuthCookie } from "@/lib/auth/middleware";
import { success } from "@/lib/api/response";

/**
 * POST /api/auth/logout
 *
 * Clears the auth cookie by setting Max-Age=0. No request body or
 * authentication is required — logging out is always allowed.
 *
 * Success (200):
 *   { success: true; data: { message: 'Logged out successfully' }; error: null }
 *   Set-Cookie: auth-token=; HttpOnly; Max-Age=0; ...
 *
 * Note: This endpoint is on the public path list in src/middleware.ts,
 * so it is reachable even if the cookie is already absent.
 */
export async function POST() {
  const response = success({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", buildClearAuthCookie());
  return response;
}
