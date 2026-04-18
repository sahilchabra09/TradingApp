# Demo Trading POC Walkthrough (Alpaca Cloud + Simulated Execution)

This POC uses **real Alpaca market data** and **fake order execution in our own database**.
No real broker order is sent from `/api/demo/trade`.

## 1) Architecture at a glance

- `apps/server` (Bun + Hono + Drizzle + Postgres)
  - Auth via Clerk middleware.
  - KYC/account-type gating.
  - Market data from Alpaca (REST + websocket cache).
  - Paper trading simulation (wallet/holdings/trades tables).
- `apps/native` (Expo Router + NativeWind)
  - Shows market data for all onboarded users.
  - Locks buy/sell until KYC + demo activation (with modal gate).
  - Uses websocket stream `/api/demo/stream` for live quote/P&L updates (no interval polling).

## 2) Product flow implemented

1. User signs in.
2. User sees in-app modal guidance:
   - If KYC incomplete: `Complete KYC to unlock demo trading`
   - If KYC complete: `Unlock Demo Account`
3. User can still view market data (`GET /api/demo/marketdata/:symbol`) before trading unlock.
4. Trading remains locked while:
   - `users.kyc_status !== 'approved'`, or
   - user has not activated demo account.
5. Once KYC is approved, user calls `POST /api/demo/account` from Unlock action.
6. Backend creates `demo_wallets` row (default cash `100000.00`) and sets `users.account_type='demo_trader'`.
7. User can place simulated buy/sell through `POST /api/demo/trade`.
8. Holdings/P&L are computed using latest Alpaca prices.

## 3) Data model

### Existing tables used

- `users` now includes `account_type` enum:
  - `market_data_only`
  - `demo_trader`
  - `live_trader`

### Demo tables

- `demo_wallets`: one row per user with cash balance.
- `demo_holdings`: symbol positions (qty, avg price).
- `demo_trades`: executed simulated fills.
- `demo_instruments`: symbol metadata and provider instrument id.
- `demo_trade_attempts`: blocked/failed trade attempts with reason.

## 4) Market data provider details (Alpaca)

Service file: `apps/server/src/services/alpaca.ts`

- Uses `@alpacahq/alpaca-trade-api`.
- Creates a single Alpaca client from env credentials.
- Starts `data_stream_v2` websocket for trade updates.
- Subscribes symbols on demand when quotes are requested.
- Keeps in-memory last-trade cache for low-latency price reads.
- Falls back to REST (`getLatestTrades`) when websocket data is missing/stale.

This keeps the API working even if websocket is temporarily unavailable.

## 5) API routes

Router: `apps/server/src/routes/demo.ts`

- `GET /api/demo/status`
  - Returns KYC + account-type gating state.
- `GET /api/demo/account`
  - Returns demo wallet info if activated.
- `POST /api/demo/account`
  - Activates demo wallet when KYC is approved.
- `GET /api/demo/marketdata/:symbol`
  - Returns latest quote (websocket or REST source).
- `GET /api/demo/stream` (WebSocket)
  - Pushes live quote updates and snapshots to mobile/web clients.
- `POST /api/demo/trade`
  - Simulates buy/sell with decimal math + slippage.
- `GET /api/demo/holdings/:userId`
  - Returns per-position P&L and totals.
- `GET /api/demo/portfolio/:userId`
  - Returns cash + holdings value + total value + total P&L.
- `GET /api/demo/trades/:userId`
  - Returns executed demo trades for history/transactions screens.

## 6) Mobile screens

- `apps/native/app/orders/order-form.tsx`
  - Trade UI, lock-state messaging, account activation button.
- `apps/native/app/portfolio/detail.tsx`
  - Holdings list and P&L.
- `apps/native/app/search/market.tsx`
  - Quote lookup.
- `apps/native/app/dashboard.tsx`
  - Summary totals.
- `apps/native/lib/demo-api.ts`
  - Typed client for `/api/demo` routes.
- `apps/native/lib/hooks.ts`
  - Realtime websocket hook (`useDemoMarketStream`).

## 7) Required environment variables

### Server (`apps/server/.env`)

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/trading_app
APCA_API_KEY_ID=your_alpaca_key_id
APCA_API_SECRET_KEY=your_alpaca_secret_key
APCA_API_BASE_URL=https://paper-api.alpaca.markets
APCA_DATA_BASE_URL=https://data.alpaca.markets
APCA_API_STREAM_URL=https://stream.data.alpaca.markets
APCA_DATA_FEED=iex
# optional: map custom app symbol to Alpaca symbol
# ALPACA_SYMBOL_ALIASES={"SHEL.MU":{"providerSymbol":"SHEL","exchange":"SEM","currency":"MUR"}}
DEMO_SLIPPAGE_PCT=0.1
NODE_ENV=development

CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_JWT_SECRET=
CLERK_WEBHOOK_SECRET=
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8081
```

### Native (`apps/native/.env`)

```bash
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## 8) Symbol conventions

- Default expected symbols are Alpaca symbols: `AAPL`, `TSLA`, `SPY`, etc.
- For custom user-facing symbols, define `ALPACA_SYMBOL_ALIASES` JSON.
- If a symbol is not available in Alpaca, API returns a clear 404-style error.

## 9) Local quick start

```bash
# from repo root
bun install

# run server migrations (from apps/server)
cd apps/server
bun run db:migrate

# start server
bun run dev

# in a second terminal, start native app
cd ../../apps/native
bunx expo start
```

## 10) Deploy notes

### Railway (server)

- Deploy `apps/server`.
- Set all server env vars above.
- Ensure Postgres + `DATABASE_URL` are configured.
- Run migrations during release (`bun run db:migrate`).

### Vercel (web/native companion)

- If using `apps/web`, set API URL to Railway server URL.
- For mobile builds, set `EXPO_PUBLIC_SERVER_URL` to Railway API URL.

## 11) Files touched in this implementation

- `apps/server/src/services/alpaca.ts`
- `apps/server/src/routes/demo.ts`
- `apps/server/src/index.ts` (Bun websocket handler export)
- `apps/server/src/types/demo.ts`
- `apps/server/src/types/env.ts`
- `apps/server/src/db/schema/demo.ts`
- `apps/server/.env.example`
- `apps/server/migrations/0004_alpaca_provider_ids.sql`
- `apps/server/src/db/migrations/0004_alpaca_provider_ids.sql`
- `apps/server/src/db/migrations/meta/_journal.json`
- `apps/native/lib/demo-api.ts`
- `apps/native/lib/hooks.ts`
- `apps/native/components/demo-account-gate-modal.tsx`
- `apps/native/app/orders/order-form.tsx`
- `apps/native/app/portfolio/detail.tsx`
- `apps/native/app/search/market.tsx`
- `apps/native/app/dashboard.tsx`
- `apps/native/app/(drawer)/(tabs)/index.tsx`
- `apps/native/app/(drawer)/(tabs)/markets.tsx`
- `apps/native/app/(drawer)/(tabs)/trade.tsx`
- `apps/native/app/(drawer)/(tabs)/news.tsx`
- `apps/native/app/wallets/balances.tsx`
- `apps/native/app/orders/history.tsx`
- `apps/native/app/misc/transactions.tsx`
- `apps/native/app/misc/watchlist.tsx`
- `apps/native/app/misc/asset-detail.tsx`
- `apps/native/app/misc/trade-confirm.tsx`
- `apps/native/app/alerts/center.tsx`
- `apps/native/app/alerts/ai-insights.tsx`
- `apps/native/app/alerts/price-alerts.tsx`
- `apps/native/app/kyc/status.tsx`
