# Security Guardian Memory — aiwrite-base

## Last Audit: 2026-03-11

### Architecture Summary
- Next.js 15 App Router + TypeScript
- Auth: JWT (HS256) in httpOnly cookies via `jsonwebtoken` + `bcryptjs` (cost 12)
- DB: PostgreSQL 16 with Prisma ORM
- Storage: MinIO (S3-compatible)
- Validation: Zod schemas at all API boundaries

### Security Controls Verified
- JWT: min 32-char secret enforced, HS256 algorithm pinned, `algorithms` whitelist on verify
- Passwords: bcrypt cost 12, hash never exposed in responses (SafeUser pattern)
- Cookies: HttpOnly, SameSite=Lax, Secure in prod, Path=/
- IDOR prevention: file operations scoped by userId in service layer
- Ownership check on file deletion (403 if not owner)
- Login error messages generic ("Invalid email or password")
- Dockerfile runs as non-root user (nextjs:nodejs)
- .dockerignore excludes .env files
- No hardcoded secrets in source (all via env vars)

### Issues Fixed (2026-03-11)
1. **MEDIUM** — No rate limiting on auth endpoints -> Added `src/lib/rate-limit.ts` (in-memory sliding window)
2. **MEDIUM** — No security headers -> Added to `next.config.ts` (X-Content-Type-Options, X-Frame-Options, etc.)
3. **LOW** — Register error message revealed email existence ("A user with this email already exists") -> Made generic
4. **LOW** — File extension not sanitized against special chars -> Added regex filter in files.service.ts
5. **LOW** — Filename validator missing path traversal check -> Added refine() for `..`, `/`, `\`

### Known Patterns
- Response envelope: `{ success, data, error }` via `src/lib/api/response.ts`
- Two-layer auth: Edge middleware (cookie presence) + route handler (JWT crypto verify)
- ServiceError class for domain errors with HTTP status codes
- Prisma `select` used consistently to exclude passwordHash

### Files to Watch (High-Risk Attack Surfaces)
- `src/app/api/auth/login/route.ts` — credential brute-force target
- `src/app/api/auth/register/route.ts` — account enumeration target
- `src/app/api/files/route.ts` — file upload (MIME, size, path traversal)
- `src/services/files.service.ts` — storage key generation
- `src/lib/auth/jwt.ts` — token signing/verification
