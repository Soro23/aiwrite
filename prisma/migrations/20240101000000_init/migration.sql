-- ============================================================
-- Migration: 20240101000000_init
-- Description: Initial schema — users and files tables
-- Rollback: See down steps at the bottom of this file (commented).
--
-- Notes:
--   * gen_random_uuid() requires pgcrypto or PostgreSQL >= 13 (built-in)
--   * All timestamps use TIMESTAMPTZ (timezone-aware)
--   * Cascade delete: removing a user removes all their files
-- ============================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable: users
CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "name"          TEXT        NOT NULL,
  "email"         TEXT        NOT NULL,
  "password_hash" TEXT        NOT NULL,
  "role"          "Role"      NOT NULL DEFAULT 'USER',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: files
CREATE TABLE "files" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID        NOT NULL,
  "filename"    TEXT        NOT NULL,
  "storage_key" TEXT        NOT NULL,
  "mime_type"   TEXT        NOT NULL,
  "size"        INTEGER     NOT NULL,
  "bucket_name" TEXT        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique email per user
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex: general-purpose email lookup (used by login queries)
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex: unique storage key (one MinIO object per row)
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex: list all files for a given user efficiently
CREATE INDEX "files_user_id_idx" ON "files"("user_id");

-- AddForeignKey: files.user_id → users.id (CASCADE on delete)
ALTER TABLE "files"
  ADD CONSTRAINT "files_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================================
-- DOWN (rollback) — run manually if migration must be reverted
-- ============================================================
-- ALTER TABLE "files" DROP CONSTRAINT "files_user_id_fkey";
-- DROP INDEX IF EXISTS "files_user_id_idx";
-- DROP INDEX IF EXISTS "files_storage_key_key";
-- DROP INDEX IF EXISTS "users_email_idx";
-- DROP INDEX IF EXISTS "users_email_key";
-- DROP TABLE IF EXISTS "files";
-- DROP TABLE IF EXISTS "users";
-- DROP TYPE IF EXISTS "Role";
