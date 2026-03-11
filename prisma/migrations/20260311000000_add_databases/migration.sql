-- ============================================================
-- Migration: 20260311000000_add_databases
-- Description: Add databases table for per-user PostgreSQL schema management
-- ============================================================

-- CreateTable: databases
CREATE TABLE "databases" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID        NOT NULL,
  "name"        TEXT        NOT NULL,
  "schema_name" TEXT        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "databases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique schema_name
CREATE UNIQUE INDEX "databases_schema_name_key" ON "databases"("schema_name");

-- CreateIndex: unique name per user
CREATE UNIQUE INDEX "databases_user_id_name_key" ON "databases"("user_id", "name");

-- CreateIndex: list all databases for a given user
CREATE INDEX "databases_user_id_idx" ON "databases"("user_id");

-- AddForeignKey: databases.user_id → users.id (CASCADE on delete)
ALTER TABLE "databases"
  ADD CONSTRAINT "databases_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================================
-- DOWN (rollback)
-- ============================================================
-- ALTER TABLE "databases" DROP CONSTRAINT "databases_user_id_fkey";
-- DROP INDEX IF EXISTS "databases_user_id_idx";
-- DROP INDEX IF EXISTS "databases_user_id_name_key";
-- DROP INDEX IF EXISTS "databases_schema_name_key";
-- DROP TABLE IF EXISTS "databases";
