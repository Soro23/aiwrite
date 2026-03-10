/**
 * In-memory rate limiter for development and small-scale deployments.
 *
 * Uses a sliding window approach per identifier (typically IP address).
 * In production with multiple instances, replace with a Redis-backed
 * implementation to share state across processes.
 *
 * Stale entries are cleaned up periodically to prevent memory leaks.
 */

interface RateLimitEntry {
  /** Timestamps (ms) of requests within the current window. */
  readonly timestamps: readonly number[];
}

/** Global store keyed by identifier (e.g., IP address). */
const store = new Map<string, RateLimitEntry>();

/** Interval (ms) between cleanup sweeps of expired entries. */
const CLEANUP_INTERVAL_MS = 60_000;

/** Periodically remove entries whose timestamps are all expired. */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer(windowMs: number): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      const active = entry.timestamps.filter((ts) => now - ts < windowMs);
      if (active.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow the Node process to exit even if the timer is pending.
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  /** Whether the request is allowed (within the limit). */
  readonly allowed: boolean;
  /** Number of remaining requests in the current window. */
  readonly remaining: number;
  /** Unix timestamp (seconds) when the window resets. */
  readonly resetAt: number;
}

/**
 * Check whether a request from `identifier` is within the rate limit.
 *
 * @param identifier  Unique key for the client (e.g., IP address).
 * @param limit       Maximum number of requests allowed in the window.
 * @param windowMs    Duration of the sliding window in milliseconds.
 * @returns           Result indicating if the request is allowed.
 *
 * @example
 * ```ts
 * const result = rateLimit(ip, 5, 60_000); // 5 requests per minute
 * if (!result.allowed) {
 *   return apiError("Too many requests", 429);
 * }
 * ```
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureCleanupTimer(windowMs);

  const now = Date.now();
  const existing = store.get(identifier);

  // Filter to only timestamps within the current window (immutable)
  const activeTimestamps = existing
    ? existing.timestamps.filter((ts) => now - ts < windowMs)
    : [];

  const resetAt = Math.ceil(
    (activeTimestamps.length > 0
      ? activeTimestamps[0] + windowMs
      : now + windowMs) / 1000
  );

  if (activeTimestamps.length >= limit) {
    // Over limit -- do NOT add this request timestamp
    store.set(identifier, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Within limit -- record this request (immutable append)
  const updatedTimestamps = [...activeTimestamps, now];
  store.set(identifier, { timestamps: updatedTimestamps });

  return {
    allowed: true,
    remaining: limit - updatedTimestamps.length,
    resetAt,
  };
}

/**
 * Get the client IP address from the request headers.
 *
 * Checks common proxy headers in order of specificity.
 * Falls back to "unknown" which effectively rate-limits all
 * unidentifiable clients as a single bucket.
 */
export function getClientIp(headers: Headers): string {
  // X-Forwarded-For may contain multiple IPs; take the first (client).
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return headers.get("x-real-ip") ?? "unknown";
}

// ---------------------------------------------------------------------------
// Preset configurations
// ---------------------------------------------------------------------------

/** Rate limit for authentication endpoints: 5 requests per minute. */
export const AUTH_RATE_LIMIT = { limit: 5, windowMs: 60_000 } as const;

/** Rate limit for general API endpoints: 100 requests per minute. */
export const GENERAL_RATE_LIMIT = { limit: 100, windowMs: 60_000 } as const;
