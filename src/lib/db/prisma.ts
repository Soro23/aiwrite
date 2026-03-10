/**
 * Prisma Client singleton — aiwrite-base
 *
 * Problem: Next.js hot-reload creates a new module scope on every change,
 * which would instantiate a fresh PrismaClient each time and exhaust the
 * PostgreSQL connection pool in development.
 *
 * Solution: Store the single instance on `globalThis`. In production the
 * module cache is stable, so the guard branch is never entered.
 */

import { PrismaClient } from "@prisma/client";

// Re-export PrismaClient so callers can type-annotate (e.g. tx: PrismaClient)
// without reaching into @prisma/client themselves.
export type { PrismaClient };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
