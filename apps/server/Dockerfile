# ============================================================
# Trading Platform — Backend Server (Hono + Bun)
# ============================================================

FROM oven/bun:1.3.3-alpine AS base

# ── Stage 1: Install dependencies ───────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json    ./apps/web/package.json
COPY apps/native/package.json ./apps/native/package.json

RUN bun install --frozen-lockfile

# ── Stage 2: Production runner ──────────────────────────────
FROM base AS runner
RUN apk add --no-cache libc6-compat

# Set WORKDIR to the root first to preserve the monorepo structure
WORKDIR /app

# Copy root node_modules (where the isolated linker's virtual store lives)
COPY --from=deps /app/node_modules ./node_modules

# Copy server's node_modules and source code into their correct relative paths
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY apps/server/ ./apps/server/

# Move into the server workspace for execution
WORKDIR /app/apps/server

# ── Environment variables ─────────────────────────────────────
ENV DATABASE_URL=""
ENV DATABASE_URL_POOLER=""
ENV CLERK_PUBLISHABLE_KEY=""
ENV CLERK_SECRET_KEY=""
ENV CLERK_WEBHOOK_SECRET=""
ENV DIDIT_API_KEY=""
ENV DIDIT_WEBHOOK_SECRET=""
ENV DIDIT_WORKFLOW_ID=""
ENV APCA_API_KEY_ID=""
ENV APCA_API_SECRET_KEY=""
ENV ENCRYPTION_KEY=""

ENV NODE_ENV=production
ENV PORT=3004
ENV APCA_API_BASE_URL=https://paper-api.alpaca.markets
ENV APCA_DATA_BASE_URL=https://data.alpaca.markets
ENV APCA_API_STREAM_URL=https://stream.data.alpaca.markets
ENV APCA_DATA_FEED=iex
ENV DIDIT_BASE_URL=https://verification.didit.me

EXPOSE 3004

RUN addgroup -S app && adduser -S -G app app
USER app

CMD ["bun", "src/index.ts"] 