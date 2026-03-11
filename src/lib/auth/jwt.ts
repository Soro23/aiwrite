import jwt from "jsonwebtoken";

/**
 * JWT token utilities.
 *
 * Tokens are signed with HS256 and contain:
 *   sub  — user ID (standard JWT subject claim)
 *   role — user role for RBAC enforcement
 *
 * The secret is validated at call time to fail fast on
 * misconfiguration rather than serving requests with no auth.
 */

export const COOKIE_NAME = "auth-token";

export interface JwtPayload {
  /** User ID (stored in the standard `sub` claim). */
  sub: string;
  /** User role, e.g. "USER" | "ADMIN". */
  role: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is not configured or is too short. " +
        "Set a strong secret of at least 32 characters in your environment."
    );
  }
  return secret;
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "7d";
}

/**
 * Create a signed JWT for a given user ID and role.
 *
 * The user ID is stored under the standard `sub` claim.
 * Both `sub` and `role` are available after verification.
 */
export function signToken(userId: string, role: string): string {
  const options: jwt.SignOptions = {
    expiresIn: getExpiresIn(),
    algorithm: "HS256",
  };
  return jwt.sign({ sub: userId, role }, getSecret(), options);
}

/**
 * Verify and decode a JWT.
 *
 * Returns the structured payload or null if the token is invalid,
 * expired, or signed with a different secret. Never throws.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;

    const sub = decoded.sub;
    const role = decoded.role;

    if (typeof sub !== "string" || typeof role !== "string") {
      return null;
    }

    return { sub, role };
  } catch {
    return null;
  }
}
