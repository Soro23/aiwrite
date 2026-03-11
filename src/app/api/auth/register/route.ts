import { NextRequest } from "next/server";
import { RegisterSchema } from "@/validators/auth.validator";
import { registerUser } from "@/services/auth.service";
import { ServiceError } from "@/lib/errors";
import { buildAuthCookie } from "@/lib/auth/middleware";
import { success, apiError } from "@/lib/api/response";
import { rateLimit, getClientIp, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

/**
 * POST /api/auth/register
 *
 * Bootstrap case (first user): creates ADMIN account, signs JWT, sets cookie.
 * Normal case: creates PENDING account, no cookie — admin must approve first.
 *
 * Request body:
 *   { name: string; email: string; password: string }
 *
 * Success (201):
 *   { success: true; data: { user, pending: boolean }; error: null }
 *   Set-Cookie: token=<jwt>  (only for bootstrap admin)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`register:${ip}`, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs);
    if (!rl.allowed) {
      return apiError("Too many requests. Please try again later.", 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      return apiError(message, 422);
    }

    const result = await registerUser(parsed.data);

    const response = success({ user: result.user, pending: result.pending }, 201);

    if (result.token) {
      response.headers.set("Set-Cookie", buildAuthCookie(result.token));
    }

    return response;
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.statusCode);
    }
    console.error("[register] Unexpected error:", err);
    return apiError("Internal server error", 500);
  }
}
