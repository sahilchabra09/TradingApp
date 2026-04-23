# ============================================================
# Trading Platform — Backend Server  (Hono + Bun)
#
# Build context : monorepo root  (run from TradingApp/)
# Build command : docker build -f apps/server/Dockerfile -t trading-server .
# Run          : docker run --env-file apps/server/.env -p 3004:3004 trading-server
#
# No compile step — Bun runs TypeScript natively, which avoids
# bundler issues with runtime-specific subpath exports (hono/bun).
# ============================================================

FROM oven/bun:1.3.3-alpine AS base

# ── Stage 1: Install dependencies ───────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace manifests so Bun can resolve the full graph.
# bunfig.toml sets linker=isolated → each workspace keeps its
# own node_modules instead of hoisting everything to the root.
COPY package.json bun.lock bunfig.toml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json    ./apps/web/package.json
COPY apps/native/package.json ./apps/native/package.json

RUN bun install --frozen-lockfile

# ── Stage 2: Production runner ──────────────────────────────
FROM base AS runner
RUN apk add --no-cache libc6-compat

# Work directly inside the server package — Bun resolves modules
# from ./node_modules here, no root node_modules needed.
WORKDIR /app/apps/server

# Only copy server's own node_modules (not the full monorepo root)
COPY --from=deps /app/apps/server/node_modules ./node_modules

# Copy server source
COPY apps/server/ ./

# ── WebSocket note ────────────────────────────────────────────
# Client-facing WS endpoint: ws://<host>:3004/api/paper-trading/stream
#   Powered by hono/bun upgradeWebSocket + Bun's native WS runtime.
#   The `websocket` export in src/index.ts activates it automatically.
#   Requires Clerk auth. Protocol: subscribe | unsubscribe | ping ↔
#                                  ready | snapshot | quote | pong | error
#
# Upstream WS: server → Alpaca (wss://stream.data.alpaca.markets)
#   Managed internally by alpaca.ts via APCA_API_STREAM_URL below.
# ─────────────────────────────────────────────────────────────

# ── Environment variables ─────────────────────────────────────
# Secrets (no default — must be supplied via --env-file or -e at runtime):
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

# AES-256-GCM key for KYC PII encryption (64 hex chars / 32 bytes).
# Generate with: openssl rand -hex 32
ENV ENCRYPTION_KEY=""

# Defaults (override at runtime if needed):
ENV NODE_ENV=production
ENV PORT=3004
ENV APCA_API_BASE_URL=https://paper-api.alpaca.markets
ENV APCA_DATA_BASE_URL=https://data.alpaca.markets
ENV APCA_API_STREAM_URL=https://stream.data.alpaca.markets
ENV APCA_DATA_FEED=iex
ENV DIDIT_BASE_URL=https://verification.didit.me

# Optional:
ENV ALLOWED_ORIGINS=""
ENV PAPER_SLIPPAGE_PCT=0.1
ENV ALPACA_SYMBOL_ALIASES=""

# ── Network ──────────────────────────────────────────────────
EXPOSE 3004

# Run as non-root
RUN addgroup -S app && adduser -S -G app app
USER app

# Bun runs TypeScript natively — no compile step needed.
CMD ["bun", "src/index.ts"]
