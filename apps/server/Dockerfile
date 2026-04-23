# ============================================================
# Trading Platform — Backend Server  (Hono + Bun)
#
# Build context : monorepo root  (run from TradingApp/)
# Build command : docker build -f apps/server/Dockerfile -t trading-server .
# Run          : docker run --env-file apps/server/.env -p 3004:3004 trading-server
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

# ── Stage 2: Build (tsdown compiles TS → JS) ────────────────
FROM base AS builder
WORKDIR /app

# Reuse installed modules from the deps stage
COPY --from=deps /app/node_modules             ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Copy the server source
COPY apps/server/ ./apps/server/
COPY package.json bunfig.toml ./

WORKDIR /app/apps/server

ENV NODE_ENV=production

# tsdown transpiles src/ → dist/
# Start script: bun dist/index.js
RUN bun run build

# ── Stage 3: Production runner ──────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy compiled output and production dependencies
COPY --from=builder /app/apps/server/dist        ./dist
COPY --from=builder /app/apps/server/node_modules ./node_modules

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

CMD ["bun", "dist/index.js"]
