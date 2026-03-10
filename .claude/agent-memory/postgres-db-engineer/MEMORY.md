# DB Engineer Memory — aiwrite-base

## Project Identity
- Project: aiwrite-base
- ORM: Prisma 6.x (package: @prisma/client ^6.4.0)
- Database: PostgreSQL 16
- Framework: Next.js 15 / React 19
- Runtime runner for scripts: tsx

## Schema Inventory

### Table: users (model User)
- PK: id UUID gen_random_uuid()
- Unique: email (index: users_email_key + users_email_idx)
- Enum: role → Role {USER, ADMIN}, default USER
- Timestamps: created_at, updated_at (TIMESTAMPTZ)
- Relation: one-to-many with files

### Table: files (model File)
- PK: id UUID gen_random_uuid()
- FK: user_id → users.id ON DELETE CASCADE (index: files_user_id_idx)
- Unique: storage_key (index: files_storage_key_key) — MinIO object key
- Columns: filename, mime_type, size (INTEGER bytes), bucket_name
- Timestamps: created_at (TIMESTAMPTZ, no updated_at — files are immutable)

## Applied Migrations
- 20240101000000_init — initial schema (users + files, Role enum, all indexes, FK)

## Design Decisions
- UUIDs over cuid: all PKs use @default(uuid()) + @db.Uuid for PostgreSQL-native gen_random_uuid()
- timestamptz everywhere: @db.Timestamptz on all DateTime fields (never bare timestamp)
- contentType renamed to mimeType: more precise terminology, mapped to mime_type
- bucketName added to File: needed because MinIO bucket is runtime-configurable via env
- users_email_idx kept alongside users_email_key: unique constraint index is used for
  enforcement; the named index is used by login query plans — both serve different roles
- No updatedAt on File: files are write-once; an updatedAt column would be misleading

## ORM Conventions
- snake_case all DB identifiers via @@map / @map
- Named constraints: {table}_{column}_fkey, {table}_{column}_idx, {table}_{column}_key
- Singleton in: src/lib/db/prisma.ts (exports `prisma` and re-exports `PrismaClient` type)
- Seed script: prisma/seed.ts — run via `npm run db:seed` (tsx)
- Seed is idempotent via upsert; bcryptjs SALT_ROUNDS = 12

## Seed Users (dev only)
- admin@example.com / Admin1234! — role ADMIN
- user@example.com  / User1234!  — role USER

## Index Registry
| Index name           | Table | Columns    | Type   | Rationale                        |
|----------------------|-------|------------|--------|----------------------------------|
| users_pkey           | users | id         | UNIQUE | PK                               |
| users_email_key      | users | email      | UNIQUE | uniqueness enforcement           |
| users_email_idx      | users | email      | BTREE  | login lookup                     |
| files_pkey           | files | id         | UNIQUE | PK                               |
| files_storage_key_key| files | storage_key| UNIQUE | one DB row per MinIO object      |
| files_user_id_idx    | files | user_id    | BTREE  | list user's files efficiently    |
