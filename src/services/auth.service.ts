import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { ServiceError } from "@/lib/errors";
import type { RegisterInput, LoginInput } from "@/validators/auth.validator";

/**
 * Auth service — business logic for registration, login, and user retrieval.
 *
 * All functions return SafeUser objects that intentionally omit the
 * passwordHash field. The token is returned alongside the user so that
 * route handlers can set it as an httpOnly cookie.
 *
 * Error convention:
 *   ServiceError is thrown for domain-level errors (wrong credentials,
 *   duplicate email, etc.). Callers should catch and map to HTTP responses.
 *   Unexpected errors (database failures, etc.) are left to propagate so
 *   the global handler can log them and return 500.
 */

// Re-export so callers that import ServiceError from this module
// continue to work without changes.
export { ServiceError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User shape exposed outside the service layer — never includes passwordHash. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface AuthResult {
  user: SafeUser;
  token: string;
}

// ---------------------------------------------------------------------------
// Prisma select shape — reused across queries for consistency
// ---------------------------------------------------------------------------

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 *
 * Steps:
 *   1. Verify the email is not already taken (409 if it is).
 *   2. Hash the password with bcrypt (cost 12).
 *   3. Persist the new user via Prisma.
 *   4. Sign a JWT containing the user ID and role.
 *
 * Returns the safe user object and the signed JWT.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new ServiceError("Unable to create account. Please try a different email.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
    select: safeUserSelect,
  });

  const token = signToken(user.id, user.role);

  return { user: { ...user, role: String(user.role) }, token };
}

/**
 * Authenticate an existing user by email and password.
 *
 * Returns a generic 401 for both "email not found" and "wrong password"
 * to prevent user enumeration via timing or error message differences.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Generic error message — do not reveal whether the email exists.
  if (!user) {
    throw new ServiceError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ServiceError("Invalid email or password", 401);
  }

  const token = signToken(user.id, user.role);

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: String(user.role),
    createdAt: user.createdAt,
  };

  return { user: safeUser, token };
}

/**
 * Retrieve a user by ID.
 *
 * Returns null when no matching user exists so that callers can decide
 * the appropriate response (404, redirect, etc.) rather than catching
 * a thrown error.
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) {
    return null;
  }

  return { ...user, role: String(user.role) };
}
