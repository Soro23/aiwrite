/**
 * Prisma seed script — aiwrite-base
 *
 * Creates baseline users required for development and testing.
 * Idempotent: uses upsert so re-running never creates duplicates.
 *
 * Run:  npm run db:seed
 *       (or: npx tsx prisma/seed.ts)
 */

import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Salt rounds: 12 is deliberately high to slow brute-force attacks.
const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  console.log("Seeding database...");

  // ----------------------------------------------------------
  // Admin user
  // ----------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash("Admin1234!", SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Upserted admin user: ${admin.email} (role: ${admin.role})`);

  // ----------------------------------------------------------
  // Regular user
  // ----------------------------------------------------------
  const userPasswordHash = await bcrypt.hash("User1234!", SALT_ROUNDS);

  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {
      passwordHash: userPasswordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "User",
      email: "user@example.com",
      passwordHash: userPasswordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`Upserted regular user: ${regularUser.email} (role: ${regularUser.role})`);

  console.log("Seeding complete.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
