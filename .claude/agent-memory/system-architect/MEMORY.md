# System Architect Memory — aiwrite

## Architecture Decisions (2026-03)

1. **JWT in httpOnly cookies** over localStorage/sessions: stateless, XSS-safe, Edge Middleware compatible
2. **Prisma over Drizzle**: better maintained, Prisma Studio, migration CLI, stronger TypeScript types
3. **MinIO over cloud S3**: self-hosted, no vendor lock-in, S3 API compatible
4. **Layered architecture**: Route handlers (thin) -> Services -> Prisma/MinIO. Services own business logic.
5. **ServiceError pattern**: custom Error class with statusCode, caught at route handler level
6. **API envelope**: all routes return `{ success, data, error }` via `src/lib/api/response.ts`

## Docker Strategy

- Dev: postgres + minio in Docker, Next.js local (hot reload)
- Prod: multi-stage Dockerfile (deps -> build -> runner), standalone output
- `docker-compose.dev.yml` disables app service via profiles

## Next Steps (not yet built)

- Rate limiting (consider upstash/ratelimit or custom middleware)
- Redis for caching (add to docker-compose)
- Background workers for async processing
- Test infrastructure (vitest + testing-library)
