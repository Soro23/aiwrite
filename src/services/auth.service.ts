import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { ServiceError } from "@/lib/errors";
import type { RegisterInput, LoginInput } from "@/validators/auth.validator";

/**
 * Auth service — business logic for registration, login, and user retrieval.
 *
 * Registration flow:
 *   - If no users exist yet, the registrant becomes ADMIN + ACTIVE (bootstrap).
 *   - Otherwise the account is created as USER + PENDING and no token is issued.
 *     An admin must approve via the Users panel before the user can log in.
 *
 * Login flow:
 *   - Verifies password then checks status. PENDING → 403, SUSPENDED → 403.
 *
 * All functions return SafeUser objects (passwordHash excluded).
 */

export { ServiceError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

interface AuthResult {
  user: SafeUser;
  token: string;
}

export interface RegisterResult {
  user: SafeUser;
  /** Present only when the first user bootstraps as admin (auto-approved). */
  token?: string;
  pending: boolean;
}

// ---------------------------------------------------------------------------
// Prisma select shape
// ---------------------------------------------------------------------------

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 *
 * Bootstrap case (zero users in DB):
 *   Creates the account as ADMIN + ACTIVE and returns a signed JWT for
 *   immediate login — this is the initial admin setup.
 *
 * Normal case:
 *   Creates the account as USER + PENDING. No token is issued; the user
 *   must wait for an admin to approve the account before logging in.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new ServiceError("Unable to create account. Please try a different email.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  // Bootstrap: if no users exist, make the first one admin + active.
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: isFirstUser ? "ADMIN" : "USER",
      status: isFirstUser ? "ACTIVE" : "PENDING",
    },
    select: safeUserSelect,
  });

  const safeUser: SafeUser = {
    ...user,
    role: String(user.role),
    status: String(user.status),
  };

  if (isFirstUser) {
    const token = signToken(user.id, user.role);
    return { user: safeUser, token, pending: false };
  }

  return { user: safeUser, pending: true };
}

/**
 * Authenticate an existing user.
 *
 * Returns a generic 401 for both "email not found" and "wrong password"
 * to prevent user enumeration. Returns 403 for PENDING or SUSPENDED accounts.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new ServiceError("Invalid email or password", 401);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new ServiceError("Invalid email or password", 401);
  }

  if (user.status === "PENDING") {
    throw new ServiceError("Your account is pending admin approval.", 403);
  }

  if (user.status === "SUSPENDED") {
    throw new ServiceError("Your account has been suspended. Contact an admin.", 403);
  }

  const token = signToken(user.id, user.role);

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: String(user.role),
    status: String(user.status),
    createdAt: user.createdAt,
  };

  return { user: safeUser, token };
}

/**
 * Retrieve a user by ID.
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  if (!user) return null;

  return { ...user, role: String(user.role), status: String(user.status) };
}
