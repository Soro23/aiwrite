# aiwrite-base

AI-powered writing application. Self-hosted backend with Next.js 15, PostgreSQL, MinIO, and JWT auth.

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm

## Quick Start (Local Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set a strong `JWT_SECRET` (at least 32 characters).

### 3. Start infrastructure (PostgreSQL + MinIO)

```bash
npm run docker:up
```

This starts PostgreSQL on port 5432 and MinIO on ports 9000 (API) / 9001 (console).

### 4. Run database migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start the dev server

```bash
npm run dev
```

App runs at http://localhost:3000. Optionally seed demo data first with `npm run db:seed` (creates `demo@aiwrite.dev` / `Test1234!`).

## API Endpoints

All responses follow the envelope format: `{ success, data, error }`.

### Utility (public)

| Method | Path          | Description                  |
|--------|---------------|------------------------------|
| GET    | `/api/health` | Liveness check               |

### Auth (public)

| Method | Path                 | Description         |
|--------|----------------------|---------------------|
| POST   | `/api/auth/register` | Create new account  |
| POST   | `/api/auth/login`    | Login, set cookie   |
| POST   | `/api/auth/logout`   | Clear auth cookie   |

### Auth (protected)

| Method | Path           | Description      |
|--------|----------------|------------------|
| GET    | `/api/auth/me` | Get current user |

### Files (protected)

| Method | Path              | Description             |
|--------|-------------------|-------------------------|
| GET    | `/api/files`      | List files (paginated)  |
| POST   | `/api/files`      | Upload file (form-data) |
| DELETE | `/api/files/[id]` | Delete file by ID       |

## Environment Variables

| Variable         | Required | Default      | Description                                  |
|------------------|----------|--------------|----------------------------------------------|
| `DATABASE_URL`   | Yes      | —            | PostgreSQL connection string                 |
| `JWT_SECRET`     | Yes      | —            | Signing secret, minimum 32 characters        |
| `JWT_EXPIRES_IN` | No       | `7d`         | Token lifetime (e.g. `1h`, `7d`)             |
| `MINIO_ENDPOINT` | No       | `localhost`  | MinIO server hostname                        |
| `MINIO_PORT`     | No       | `9000`       | MinIO API port                               |
| `MINIO_ACCESS_KEY` | No     | `minioadmin` | MinIO access key                             |
| `MINIO_SECRET_KEY` | No     | `minioadmin` | MinIO secret key                             |
| `MINIO_BUCKET`   | No       | `aiwrite`    | Default bucket name                          |
| `MINIO_USE_SSL`  | No       | `false`      | Set to `true` in production (HTTPS)          |

## Docker (Full Stack)

To run everything in Docker (including the Next.js app):

```bash
docker compose up -d
```

## Project Structure

```
src/
  app/api/         Route handlers (thin — delegate to services)
  lib/api/         API response envelope helpers (success, apiError, paginated)
  lib/auth/        JWT, password hashing, auth helpers
  lib/db/          Prisma client singleton
  lib/errors.ts    Shared ServiceError class
  lib/storage/     MinIO client and file operations
  middleware.ts    Edge middleware — protects /api/* routes
  services/        Business logic layer
  validators/      Zod schemas for input validation
prisma/
  schema.prisma    Database schema
  seed.ts          Development seed data
docker/            Dockerfiles and init scripts
```

## Architecture Decisions

- **JWT in httpOnly cookies**: Secure against XSS, stateless, scalable
- **Two-layer auth**: Edge middleware rejects missing cookies fast; route handlers verify the JWT cryptographically
- **Layered architecture**: Routes (thin) -> Services (business logic) -> Prisma (data access)
- **Zod validation**: All inputs validated at API boundary before reaching services
- **MinIO**: S3-compatible self-hosted storage, no vendor lock-in
- **Prisma ORM**: Type-safe database access with migration CLI
