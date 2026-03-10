# aiwrite-base Docker Memory

## Project Identity
- Name: aiwrite-base
- Framework: Next.js 15 with `output: "standalone"`
- Node version: 22-alpine (pinned in Dockerfile)
- ORM: Prisma 6.x against PostgreSQL 16

## Compose File Strategy
- `docker-compose.yml` — production, ALL services (app + postgres + minio)
- `docker-compose.dev.yml` — local dev, infra ONLY (postgres + minio, no app)
- No override file pattern; dev file is standalone and explicit

## Service Inventory
| Service  | Image                                          | Container name          | Internal port |
|----------|------------------------------------------------|-------------------------|---------------|
| postgres | postgres:16-alpine                             | aiwrite_postgres[_dev]  | 5432          |
| minio    | minio/minio:RELEASE.2025-01-20T14-49-07Z       | aiwrite_minio[_dev]     | 9000, 9001    |
| app      | built from docker/app/Dockerfile               | aiwrite_app             | 3000          |

## Named Volumes
- `aiwrite_postgres_data` / `aiwrite_postgres_data_dev`
- `aiwrite_minio_data` / `aiwrite_minio_data_dev`

## Network
- Production: `aiwrite_network` (bridge, explicit). Services talk by service name.
- Dev: default bridge (no explicit network — infra only).

## Dockerfile Architecture (docker/app/Dockerfile)
Three stages:
1. `deps` — `npm ci` + `npx prisma generate` (has schema, no full source)
2. `builder` — copies node_modules from deps, copies full source, runs `npm run build`
3. `runner` — node:22-alpine, non-root user nextjs:nodejs (uid/gid 1001), copies standalone output + Prisma runtime files + entrypoint.sh

## Prisma in Container
- Schema at `./prisma/schema.prisma`
- Generated client at `node_modules/.prisma` and `node_modules/@prisma`
- Both copied with `--chown=nextjs:nodejs` into runner
- `entrypoint.sh` runs `npx prisma migrate deploy` before `exec node server.js`

## entrypoint.sh Key Points
- Located at `docker/app/entrypoint.sh`, copied to `/app/entrypoint.sh` in runner
- `set -e` — any error aborts startup
- Validates required env vars before attempting migration
- Uses `exec node server.js` (replaces shell process, clean signal handling)

## Key Env Var Notes
- `DATABASE_URL` differs by context:
  - `.env.example` (host dev): `@localhost:5432`
  - `docker-compose.yml` (container): `@postgres:5432`
- `MINIO_ENDPOINT` similarly: `localhost` for host dev, `minio` for containers
- Production vars with `:?` operator in compose (fail-fast if unset): `POSTGRES_PASSWORD`, `JWT_SECRET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`

## HEALTHCHECK
- postgres: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`
- minio: `mc ready local`
- app: `wget -qO- http://localhost:3000/api/health` (requires `/api/health` route)

## .dockerignore
Excludes: node_modules, .next, .git, .env (not .env.example), *.md, logs, IDE configs

## npm Scripts
- `docker:up/down/logs` → dev infra (docker-compose.dev.yml)
- `docker:prod:up/down/logs` → full production stack (docker-compose.yml)

## See Also
- `docker/postgres/init.sql` — runs once on first DB creation (currently a no-op placeholder)
