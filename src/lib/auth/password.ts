import bcrypt from "bcryptjs";

/**
 * Password hashing utilities using bcrypt.
 *
 * Cost factor of 12 provides a good balance between security and speed.
 * At this factor, hashing takes ~250 ms on modern hardware, which is
 * slow enough to deter brute-force attacks but fast enough for UX.
 *
 * Increase to 14 for higher-value targets if latency is acceptable.
 */

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password. Returns the bcrypt hash string.
 * The hash embeds the salt, so no separate salt storage is needed.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 * Uses a constant-time comparison internally to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
