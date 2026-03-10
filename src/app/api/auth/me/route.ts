import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { getUserById } from "@/services/auth.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile. Requires a valid auth cookie.
 *
 * The Edge middleware (src/middleware.ts) ensures the cookie is present
 * before this handler runs. Full JWT verification and DB lookup happen here.
 *
 * Success (200):
 *   { success: true; data: { user: SafeUser }; error: null }
 *
 * Errors:
 *   401  — missing or invalid JWT (should be caught by middleware first)
 *   404  — user referenced by the JWT no longer exists in the database
 *   500  — unexpected server error
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const user = await getUserById(auth.sub);
    if (!user) {
      return apiError("User not found", 404);
    }

    return success({ user });
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[me] Unexpected error:", err);
    return apiError("Internal server error", 500);
  }
}
