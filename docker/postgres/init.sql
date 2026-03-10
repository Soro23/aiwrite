-- This script runs on first container creation only.
-- Prisma migrations handle schema creation, so this is for
-- any PostgreSQL-level configuration needed before Prisma runs.

-- Ensure the database exists (Docker already creates it from POSTGRES_DB env)
-- Add extensions if needed:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
