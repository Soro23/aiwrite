import { NextRequest } from "next/server";
import { LoginSchema } from "@/validators/auth.validator";
import { loginUser } from "@/services/auth.service";
import { ServiceError } from "@/lib/errors";
import { buildAuthCookie } from "@/lib/auth/middleware";
import { success, apiError } from "@/lib/api/response";
import { rateLimit, getClientIp, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password, signs a JWT, and sets
 * it as an httpOnly cookie. The token is never returned in the body.
 *
 * Request body:
 *   { email: string; password: string }
 *
 * Success (200):
 *   { success: true; data: { user: SafeUser }; error: null }
 *   Set-Cookie: auth-token=<jwt>; HttpOnly; ...
 *
 * Errors:
 *   400  — invalid JSON body
 *   422  — schema validation failure
 *   401  — invalid credentials (generic message, no enumeration)
 *   500  — unexpected server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP for auth endpoints
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`login:${ip}`, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs);
    if (!rl.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors
        .map((e) => e.message)
        .join(", ");
      return apiError(message, 422);
    }

    const result = await loginUser(parsed.data);

    const response = success({ user: result.user });
    response.headers.set("Set-Cookie", buildAuthCookie(result.token));
    return response;
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[login] Unexpected error:", err);
    return apiError("Internal server error", 500);
  }
}
