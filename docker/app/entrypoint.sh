#!/bin/sh
# ============================================================
# entrypoint.sh — aiwrite-base container startup script
#
# Runs inside the production container as the `nextjs` user.
# Executes Prisma migrations before starting the Next.js server.
#
# Design principles:
#   - `set -e` aborts on any non-zero exit, preventing a broken
#     app from starting silently after a failed migration.
#   - All steps log with timestamps for easier debugging in
#     container log aggregators (CloudWatch, Loki, etc.).
#   - Environment variables are validated early to fail fast
#     with a clear message rather than a cryptic runtime error.
# ============================================================

set -e

timestamp() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

log() {
  echo "[$(timestamp)] $*"
}

# ─────────────────────────────────────────────
# 1. Validate required environment variables
# ─────────────────────────────────────────────
log "Validating environment..."

MISSING=""

for var in DATABASE_URL JWT_SECRET MINIO_ACCESS_KEY MINIO_SECRET_KEY; do
  eval val=\$$var
  if [ -z "$val" ]; then
    MISSING="$MISSING $var"
  fi
done

if [ -n "$MISSING" ]; then
  log "ERROR: The following required environment variables are not set:$MISSING"
  log "       Set them in your .env file or via docker compose environment block."
  exit 1
fi

log "Environment validation passed."

# ─────────────────────────────────────────────
# 2. Run Prisma migrations
# ─────────────────────────────────────────────
# `migrate deploy` applies pending migrations and is safe to run on every
# startup — it is idempotent (already-applied migrations are skipped).
# It does NOT create or reset the database, only applies SQL migration files.
log "Running database migrations (prisma migrate deploy)..."
npx prisma migrate deploy
log "Migrations complete."

# ─────────────────────────────────────────────
# 3. Start Next.js standalone server
# ─────────────────────────────────────────────
# The standalone build produces server.js in the working directory.
# PORT and HOSTNAME are set via ENV in the Dockerfile.
log "Starting Next.js on ${HOSTNAME}:${PORT}..."
exec node server.js
