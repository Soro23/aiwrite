-- Migration: add UserStatus enum, status column to users, create api_keys table
-- Existing users are set to ACTIVE so no one loses access on upgrade.

-- 1. Create the new enum type
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- 2. Add status column; default ACTIVE for migration (new code defaults to PENDING)
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- 3. From this point forward, new registrations default to PENDING.
--    Alter the column default so Prisma's @default(PENDING) is reflected in schema.
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 4. Create api_keys table
CREATE TABLE "api_keys" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      UUID        NOT NULL,
  "name"         TEXT        NOT NULL,
  "key_hash"     TEXT        NOT NULL,
  "key_prefix"   TEXT        NOT NULL,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_used_at" TIMESTAMPTZ,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "api_keys_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
