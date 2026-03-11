# ============================================================
# Dockerfile — aiwrite-base Next.js application
# Build:  docker compose build app
# Run:    docker compose up app
#
# Multi-stage build strategy:
#   deps    → install all node_modules + generate Prisma client
#   builder → copy deps, copy source, run `next build` (standalone)
#   runner  → minimal runtime image with only the standalone output
#
# The runner stage runs as a non-root user (nextjs:nodejs) for security.
# Prisma client and migration files are included so the entrypoint can
# run `prisma migrate deploy` before starting the server.
# ============================================================

# ─────────────────────────────────────────────
# Stage 1: deps
# Install ALL dependencies (including devDeps needed for Prisma generate).
# Result: populated node_modules with generated Prisma client.
# ─────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy only the manifests first to exploit Docker layer caching.
# This layer is rebuilt only when package.json or package-lock.json changes.
COPY package.json package-lock.json* ./

# Copy Prisma schema before generate — the schema is needed to generate
# the client, but we don't need the rest of the source at this stage.
COPY prisma ./prisma/

# Install all dependencies (devDeps required for `prisma generate`).
RUN npm ci

# Generate the Prisma client targeting the current platform.
# The generated client ends up in node_modules/.prisma and node_modules/@prisma.
RUN npx prisma generate

# ─────────────────────────────────────────────
# Stage 2: builder
# Run `next build` to produce the `.next/standalone` output.
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Reuse the fully-populated node_modules from deps to skip reinstall.
COPY --from=deps /app/node_modules ./node_modules

# Copy the full source. Note: .dockerignore prevents .env, .git, .next,
# and node_modules from leaking into the build context.
COPY . .

# Build Next.js. `output: "standalone"` in next.config.ts means the build
# produces a self-contained server at .next/standalone/server.js.
RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: runner
# Minimal production image — only what is needed to serve the app.
# ─────────────────────────────────────────────
FROM node:22-alpine AS runner

LABEL org.opencontainers.image.title="aiwrite-base" \
      org.opencontainers.image.description="aiwrite Next.js 15 application" \
      org.opencontainers.image.source="https://github.com/your-org/aiwrite-base"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a dedicated non-root user and group.
# Running as root inside containers is a security anti-pattern.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# ── Standalone output ──────────────────────────────────────────
# The standalone build includes a minimal server.js and the necessary
# node_modules subset. Static assets and public files must be copied
# separately because Next.js does not embed them in the standalone bundle.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# ── Prisma runtime files ───────────────────────────────────────
# The entrypoint runs `prisma migrate deploy` before starting the server,
# so we need the Prisma schema, migration history, and generated client.
COPY --from=builder --chown=nextjs:nodejs /app/prisma                  ./prisma
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules            ./node_modules

# ── Entrypoint script ──────────────────────────────────────────
# Runs Prisma migrations then starts the Next.js standalone server.
COPY --chown=nextjs:nodejs docker/app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["./entrypoint.sh"]
