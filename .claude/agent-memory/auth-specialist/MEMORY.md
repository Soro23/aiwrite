# Auth Specialist Memory — aiwrite-base

## Project: aiwrite-base

### Stack
- Next.js 15 App Router + TypeScript
- Prisma 6 + PostgreSQL 16
- Path alias: `@/*` -> `src/*`

### Authentication Strategy
- JWT stored in httpOnly cookie (no session server state)
- Two-layer verification:
  1. Edge middleware (`src/middleware.ts`) — cookie presence check only (no Node.js crypto in Edge)
  2. Route handlers — full JWT signature + expiry verification via `getAuthFromRequest()`

### JWT Configuration
- Algorithm: HS256
- Secret: `JWT_SECRET` env var, minimum 32 characters (validated at call time)
- Expiry: `JWT_EXPIRES_IN` env var, default `"7d"`
- Claims: `sub` (userId), `role` (enum string), standard `iat`/`exp`
- Library: `jsonwebtoken`

### Cookie Configuration
- Name: `auth-token` (exported as `COOKIE_NAME` from `src/lib/auth/jwt.ts`)
- Flags: `HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
- `Secure` flag added only when `NODE_ENV === "production"`

### Password Hashing
- Library: `bcryptjs`
- Cost factor: 12

### JwtPayload Shape
```typescript
interface JwtPayload {
  sub: string;   // userId
  role: string;  // "USER" | "ADMIN"
}
```
Route handlers access userId as `auth.sub` (not `auth.userId`).

### SafeUser Shape
```typescript
interface SafeUser {
  id: string; name: string; email: string;
  role: string; createdAt: Date;
}
```
`passwordHash` is never returned. `role` is cast `String(user.role)` to convert Prisma enum.

### getUserById Behavior
Returns `null` (not throw) when user not found. Callers handle 404 themselves.

### Password Policy
min 8, max 128, requires: uppercase, lowercase, digit, special character.

### Public Paths (no auth required)
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`

### Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — at least 32 chars, no "CHANGE_ME"
- `JWT_EXPIRES_IN` — optional, default "7d"
- `NODE_ENV` — controls Secure cookie flag

### Key Files
- `src/lib/auth/jwt.ts` — signToken, verifyToken, COOKIE_NAME
- `src/lib/auth/password.ts` — hashPassword, verifyPassword
- `src/lib/auth/middleware.ts` — getAuthFromRequest, buildAuthCookie, buildClearAuthCookie
- `src/services/auth.service.ts` — registerUser, loginUser, getUserById, ServiceError
- `src/validators/auth.validator.ts` — RegisterSchema, LoginSchema (+ camelCase aliases)
- `src/middleware.ts` — Edge middleware
- `src/lib/api/response.ts` — success(), error(), paginated() envelope helpers

### Validator Export Convention
PascalCase exports are canonical (`RegisterSchema`, `LoginSchema`).
camelCase aliases (`registerSchema`, `loginSchema`) kept for backwards compatibility.
