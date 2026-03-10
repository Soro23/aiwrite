# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**aiwrite** — AI-powered writing application. Repository: `github.com/Soro23/aiwrite`

Self-hosted backend replacing Supabase with Next.js 15 + PostgreSQL + MinIO + JWT auth.

## Architecture

- **Framework**: Next.js 15 (App Router) — API routes + future frontend
- **Database**: PostgreSQL 16 via Prisma ORM
- **Storage**: MinIO (S3-compatible, self-hosted)
- **Auth**: JWT stored in httpOnly cookies (no NextAuth, no localStorage)
- **Validation**: Zod schemas at API boundary
- **Orchestration**: Docker Compose (postgres, minio, app)

### Layered Architecture

```
Route Handlers (thin) -> Services (business logic) -> Prisma (data access)
                                                   -> MinIO (file storage)
```

- Route handlers: parse input, call service, return response envelope
- Services: contain all business logic, throw ServiceError on failure
- Prisma/MinIO: data access only, no business logic

### API Response Envelope

All API responses use `src/lib/api/response.ts`:
```
{ success: true, data: T, error: null }
{ success: false, data: null, error: string }
{ success: true, data: T[], error: null, meta: { total, page, limit, totalPages } }
```

### Auth Flow

1. Register/Login -> service validates -> returns JWT
2. JWT set as httpOnly cookie via Set-Cookie header
3. Next.js Edge Middleware verifies JWT on all /api/* routes (except /api/auth/register, /api/auth/login, /api/auth/logout)
4. Route handlers use `getAuthFromRequest()` for userId

## Commands

```bash
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run docker:up        # Start postgres + minio (dev mode)
npm run docker:down      # Stop docker services
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run Prisma migrations (dev)
npm run db:migrate:prod  # Run Prisma migrations (production)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data
```

## Conventions

- **File organization**: Feature/domain-based, not type-based
- **Path alias**: `@/*` maps to `src/*`
- **Immutability**: Never mutate objects, always create new
- **Error handling**: Services throw `ServiceError(message, statusCode)`, routes catch and return envelope
- **Database naming**: snake_case tables/columns, Prisma `@@map` for mapping
- **Max file size**: 800 lines per file
- **No hardcoded secrets**: All config from environment variables
