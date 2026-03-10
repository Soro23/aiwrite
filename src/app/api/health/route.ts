import { success } from "@/lib/api/response";

/**
 * GET /api/health
 *
 * Liveness check — confirms the Next.js server process is running.
 * Does not check database or storage connectivity (use a dedicated
 * readiness probe for that if needed).
 *
 * No authentication required. Listed in PUBLIC_PATHS in src/middleware.ts.
 *
 * Success (200):
 *   { success: true; data: { status: "ok"; timestamp: string }; error: null }
 */
export async function GET() {
  return success({ status: "ok", timestamp: new Date().toISOString() });
}
