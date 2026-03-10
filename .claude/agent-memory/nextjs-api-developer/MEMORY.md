# aiwrite-base — API Developer Memory

## Project Identity
- Name: aiwrite-base
- Framework: Next.js 15, App Router, TypeScript strict
- Path alias: `@/*` -> `src/*`
- ORM: Prisma 6.x + PostgreSQL 16
- Storage: MinIO (S3-compatible)
- Auth: JWT in httpOnly cookies, signed with HS256

## Response Envelope
All routes use `src/lib/api/response.ts`. The error helper is named `apiError` (NOT `error`).
```typescript
import { success, apiError, paginated } from "@/lib/api/response";
```

## Error Classes
`ServiceError` lives in `src/lib/errors.ts` — import from there, not from any service file.
`auth.service.ts` re-exports it for backwards-compat but the canonical source is `@/lib/errors`.

## Route Handler Pattern
Every handler: try/catch, check auth, validate input, call service, return typed response.
```typescript
import { ServiceError } from "@/lib/errors";
// ...
} catch (err) {
  if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
  console.error("[route] Unexpected error:", err);
  return apiError("Internal server error", 500);
}
```

## Auth Middleware
- `src/middleware.ts` — Edge, cookie presence check only (no crypto — Edge Runtime limitation)
- `src/lib/auth/middleware.ts` — full JWT verification inside route handlers via `getAuthFromRequest()`
- `COOKIE_NAME` imported from `@/lib/auth/jwt`
- Public paths set: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/health`

## Implemented Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | No | Liveness check |
| POST | /api/auth/register | No | Register + set cookie |
| POST | /api/auth/login | No | Login + set cookie |
| POST | /api/auth/logout | No | Clear auth cookie |
| GET | /api/auth/me | Yes | Current user profile |
| GET | /api/files | Yes | List files (paginated) |
| POST | /api/files | Yes | Upload file (multipart) |
| DELETE | /api/files/[id] | Yes | Delete file (ownership enforced) |

## Validation Schemas
- `src/validators/auth.validator.ts` — `RegisterSchema`, `LoginSchema`, exported types
- `src/validators/files.validator.ts` — `uploadFileSchema`, `listFilesSchema`, constants

## Services
- `src/services/auth.service.ts` — registerUser, loginUser, getUserById; exports SafeUser
- `src/services/files.service.ts` — upload, listFiles, removeFile

## Key Files
- `src/lib/errors.ts` — ServiceError (canonical)
- `src/lib/api/response.ts` — success, apiError, paginated
- `src/lib/auth/jwt.ts` — signToken, verifyToken, COOKIE_NAME, JwtPayload
- `src/lib/auth/middleware.ts` — getAuthFromRequest, buildAuthCookie, buildClearAuthCookie
- `src/lib/db/prisma.ts` — prisma singleton
- `src/lib/storage/minio.ts` — uploadFile, deleteFile, getPresignedUrl, ensureBucket

## next.config.ts
`serverExternalPackages: ["@prisma/client", "bcryptjs", "jsonwebtoken", "minio"]`
`output: "standalone"` for Docker.

## Docker Scripts
`docker:up/down` use only `docker-compose.dev.yml` for local dev.
Full-stack production uses `docker compose up -d` (root compose file).
