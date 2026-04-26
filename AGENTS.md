# AGENTS.md — TradingApp Coding Agent Reference

Generated from a full repository audit. Last updated: 2026-04-26.

---

## Repository Overview

**TradingApp** is an FSC Mauritius–compliant paper trading platform scaffolded with
[Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).

**Monorepo layout** (Turborepo + Bun workspaces):

```
TradingApp/
├── apps/
│   ├── server/     # Hono REST + WebSocket API (Bun runtime)
│   ├── web/        # Next.js 15 admin dashboard
│   └── native/     # Expo / React Native mobile app
├── docs/           # Architecture & flow documentation
├── turbo.json
├── package.json    # root workspace + scripts
└── bun.lock        # Bun lockfile
```

No `packages/` shared library directory exists yet, despite the workspace glob covering `packages/*`.

---

## Package Manager

**Bun 1.3.3** is the only supported package manager.

```toml
# bunfig.toml
[install]
linker = "isolated"
```

Always use `bun install`. Never use `npm`, `yarn`, or `pnpm`. The lockfile is `bun.lock`.

---

## Developer Commands (run from repo root unless noted)

| Command | What it does |
|---|---|
| `bun install` | Install all workspace dependencies |
| `bun dev` | Start **all** apps concurrently (Turborepo TUI) |
| `bun dev:server` | Start only the Hono server (hot reload) |
| `bun dev:web` | Start only Next.js (Turbopack) |
| `bun dev:native` | Start Expo dev server (clears Metro cache) |
| `bun build` | Build all apps |
| `bun check-types` | Run `tsc -b` across all apps |
| `bun db:push` | Drizzle Kit push (direct schema sync, dev only) |
| `bun db:generate` | Generate Drizzle migration SQL files |
| `bun db:migrate` | Apply pending Drizzle migrations |
| `bun db:studio` | Open Drizzle Studio UI |

### Per-app targeting (Turborepo `-F` filter)

```bash
bun turbo -F server <task>
bun turbo -F web <task>
bun turbo -F native <task>
```

### Individual app scripts (run from each app directory)

```bash
# apps/server
bun run dev          # bun --hot src/index.ts
bun run build        # tsdown bundler → dist/index.js
bun run start        # bun run dist/index.js
bun run compile      # bun build --compile --minify → standalone binary
bun run check-types  # tsc -b

# apps/web
bun run dev          # next dev --turbopack
bun run build        # next build
bun run start        # next start

# apps/native
bun run dev          # expo start --clear
bun run ios          # expo run:ios
bun run android      # expo run:android
bun run web          # expo start --web
bun run prebuild     # expo prebuild
```

---

## Tests

**There are no tests in this repository.** No test framework (`vitest`, `jest`, `bun test`) is configured anywhere. Do not attempt to run tests.

---

## CI / CD

No `.github/workflows/` files exist. There is no CI pipeline configured.

---

## Service Ports

| Service | URL |
|---|---|
| Hono API server | http://localhost:3004 |
| Next.js web admin | http://localhost:3001 |
| Expo Go (mobile) | Expo auto-assigns (use Expo Go app) |

> **Port mismatch warning:** `apps/web/.env.example` and `apps/native/.env.example` both default
> `*_SERVER_URL` to `http://localhost:3000`. The actual server port in
> `apps/server/src/index.ts` is `process.env.PORT || 3004`. Update `.env` files accordingly.

---

## Environment Variables

### `apps/server/.env` (committed — contains real dev secrets)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `DATABASE_URL_POOLER` | Pooler variant of above |
| `CLERK_PUBLISHABLE_KEY` | Clerk public key (`pk_test_…`) |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_test_…`) |
| `CLERK_WEBHOOK_SECRET` | Svix webhook signing secret (`whsec_…`) |
| `DIDIT_API_KEY` | Didit KYC API key |
| `DIDIT_WEBHOOK_SECRET` | HMAC-SHA256 secret for Didit webhook verification |
| `DIDIT_BASE_URL` | `https://verification.didit.me` |
| `DIDIT_WORKFLOW_ID` | UUID of the Didit verification workflow |
| `ENCRYPTION_KEY` | AES-256-GCM key (64 hex chars) for PII encryption — **do not rotate without a data migration** |
| `APCA_API_KEY_ID` | Alpaca Markets API key |
| `APCA_API_SECRET_KEY` | Alpaca Markets secret |
| `APCA_API_BASE_URL` | `https://paper-api.alpaca.markets` |
| `APCA_DATA_BASE_URL` | `https://data.alpaca.markets` |
| `APCA_API_STREAM_URL` | `https://stream.data.alpaca.markets` |
| `APCA_DATA_FEED` | `iex` |
| `AUTOSAGE_BASE_URL` | AI Research RAG service |
| `AUTOSAGE_API_KEY` | AutoSage API key |
| `AUTOSAGE_TENANT_ID` | AutoSage tenant UUID |
| `AUTOSAGE_ENVIRONMENT_ID` | AutoSage environment UUID |
| `PORT` | (optional) Override default port 3004 |
| `PAPER_SLIPPAGE_PCT` | (optional) Paper trade slippage %, default `0.1` |
| `ALLOWED_ORIGINS` | (optional) Comma-separated CORS origins |

### `apps/web/.env` (create from `.env.example`)

```
NEXT_PUBLIC_SERVER_URL=http://localhost:3004   # fix: example says 3000
```

### `apps/native/.env` (create from `.env.example`)

```
EXPO_PUBLIC_SERVER_URL=http://localhost:3004       # fix: example says 3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...      # REQUIRED — app throws without this
```

---

## Toolchain & Framework Versions

| Tool | Version |
|---|---|
| Bun | 1.3.3 |
| Turborepo | ^2.5.4 |
| TypeScript | ~5.8.x (all apps) |
| Hono | ^4.8.2 |
| Next.js | 15.5.0 |
| React | 19.1.0 |
| Expo | ^54.0.1 |
| React Native | 0.81.4 |
| expo-router | ~6.0.0 |
| Drizzle ORM | ^0.44.2 |
| Drizzle Kit | ^0.31.2 |
| Zod | ^4.0.2 |
| TailwindCSS (web) | ^4.1.10 — PostCSS plugin, no `tailwind.config.js` |
| TailwindCSS (native) | ^3.4.17 + NativeWind ^4.1.23 — requires `tailwind.config.js` |
| shadcn/ui | "new-york" style, neutral base, CSS variables |
| TanStack Query | ^5.85.5 |
| tsdown | ^0.15.1 (server build tool) |

---

## `apps/server` — Hono API

### Entrypoint

`apps/server/src/index.ts` — exports Bun serve object: `{ port, fetch, websocket }`.

### Architecture

- **Runtime:** Bun with `--hot` in dev
- **Framework:** Hono 4
- **Database:** Neon PostgreSQL via `drizzle-orm/neon-http` (HTTP driver, not TCP)
- **Auth:** Clerk JWT via `@hono/clerk-auth`; Svix for webhook signature verification
- **Logging:** hono-pino
- **Validation:** Zod + `@hono/zod-validator` / `hono-openapi` validator
- **API Docs:** hono-openapi auto-discovery + Scalar UI at `/api-docs`; spec at `/openapi.json`

### Route Map

```
GET  /                              health check
GET  /health                        uptime/env info
GET  /openapi.json                  OpenAPI spec
GET  /api-docs                      Scalar API reference UI

/api/v1/auth/*
  POST /webhooks/clerk              Clerk webhooks (Svix-verified)
  GET  /session                     current session info
  POST /logout
  GET  /sessions

/api/v1/users/*                     user profile CRUD
/api/v1/kyc/*                       KYC session create + status + webhook
/api/v1/admin/*                     admin: user list, KYC review/approve/reject

/api/paper-trading/*
  GET  /status                      paper trading eligibility
  GET  /account                     wallet info
  POST /account                     activate paper account
  GET  /assets?q=&limit=            search Alpaca assets
  GET  /marketdata/batch?symbols=   batch quotes
  GET  /marketdata/:symbol          single quote
  GET  /marketdata/:symbol/history  OHLCV bars (?period=1D|1W|1M|3M|1Y)
  POST /trade                       execute simulated trade
  GET  /stream                      WebSocket real-time tick stream (max 100 symbols)
  GET  /holdings/:userId            live P&L snapshot
  GET  /portfolio/:userId           portfolio totals
  GET  /trades/:userId              trade history

/api/news/*                         news feed (Alpaca news stream)
/api/ai-research/*                  RAG-based AI research (AutoSage)
```

### Global Middleware Order

1. pino-logger
2. secureHeaders (Hono built-in)
3. CORS (`ALLOWED_ORIGINS` or localhost whitelist)
4. prettyJSON
5. clerkMiddleware (per route group prefix)
6. rateLimiter (`src/middleware/rate-limit.ts`)
7. auditLogger (`src/middleware/audit-logger.ts`)

### Auth Middleware (`src/middleware/clerk-auth.ts`)

| Middleware | Effect |
|---|---|
| `requireAuth` | Validates Clerk JWT; auto-creates DB user on first login; attaches `user`, `userId`, `clerkAuth` to context |
| `requireKYC` | Blocks if `kycStatus !== 'approved'` |
| `requireKycNotBlocked` | Blocks only permanently rejected users |
| `requireAdmin` | Checks `user.isAdmin` or Clerk org role |
| `require2FA` | Checks `twoFactorEnabled` + session claim |
| `requireVerified` | Requires both email and phone verified |
| `optionalAuth` | Soft-attaches user if authenticated |

### Database

- **Driver:** `drizzle-orm/neon-http` — HTTP-only, no persistent TCP
- **CRITICAL:** `db.transaction()` is **not supported** with the Neon HTTP driver. Use sequential `await` calls. See `paperTrading.ts` for the canonical pattern.
- **Schema:** `apps/server/src/db/schema/index.ts` (re-exports all tables — single import point)
- **Migrations dir:** `apps/server/src/db/migrations/`
- **Drizzle config:** `apps/server/drizzle.config.ts`

### Schema Tables

| Table | Schema file |
|---|---|
| `users` | `schema/users.ts` |
| `assets` | `schema/assets.ts` |
| `wallets` | `schema/wallets.ts` |
| `holdings` | `schema/holdings.ts` |
| `trades` | `schema/trades.ts` |
| `kyc_sessions` | `schema/kyc-sessions.ts` |
| `audit_logs` | `schema/audit.ts` |
| `session_history` | `schema/sessions.ts` |
| `price_alerts` | `schema/alerts.ts` |
| `compliance` (aml_checks) | `schema/compliance.ts` |
| `payments` | `schema/payments.ts` |
| `paper_wallets`, `paper_holdings`, `paper_trades`, `paper_instruments`, `paper_trade_attempts` | `schema/paper.ts` |
| AI research tables | `schema/ai-research.ts` |

### Key Domain Patterns

- **Monetary values:** Stored as `numeric(20,8)`. Use `decimal.js` `Decimal` for all arithmetic. Call `toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toFixed(8)` before persisting; `toString()` for API responses.
- **Soft-delete:** `deletedAt` column on users. All queries must include `isNull(users.deletedAt)`.
- **PostgreSQL enums:** `account_status`, `kyc_status`, `risk_profile`, `account_type`.
- **Error handling:** Throw `AppError` subclasses (`UnauthorizedError`, `ForbiddenError`, `ValidationError`, `InsufficientBalanceError`). Never return error JSON directly. Global `onError` in `index.ts` catches them.
- **Response format:** Use `ResponseHelper.success()`, `.created()`, `.notFound()`, `.error()`. Never use `c.json()` directly.
- **OpenAPI:** All routes use `describeRoute()` from `hono-openapi` for automatic spec generation.

### Paper Trading Business Rules

- Default starting balance: $100,000
- Default slippage: 0.1% (`PAPER_SLIPPAGE_PCT`)
- KYC gate: `kycStatus === 'pending' || kycStatus === 'approved'` (not just approved)
- Account type must be `'demo_trader'` to execute trades
- News stream auto-starts on server boot via `ensureNewsStream()`

### Services (`src/services/`)

| File | Purpose |
|---|---|
| `alpaca.ts` | Alpaca REST snapshots, historical bars, WebSocket fan-out |
| `news.service.ts` | Alpaca news WebSocket stream, auto-started on boot |
| `didit.service.ts` | Didit V3 KYC API client |
| `clerk.service.ts` | Clerk backend API client |
| `autosage.ts` | AutoSage RAG AI research client |

---

## `apps/web` — Next.js Admin Dashboard

### Entrypoint

`apps/web/src/app/layout.tsx` → `apps/web/src/app/page.tsx`

### Architecture

- **Framework:** Next.js 15, App Router, `output: "standalone"` (Docker-ready)
- **Styling:** TailwindCSS v4 via `@tailwindcss/postcss` PostCSS plugin. **No `tailwind.config.js` needed.**
- **CSS entry:** `apps/web/src/index.css`
- **UI:** shadcn/ui "new-york", `rsc: false` — all shadcn components are client components. Alias: `@/components/ui`
- **Icons:** lucide-react
- **State:** Zustand + TanStack Query v5 + TanStack Query Devtools
- **Forms:** TanStack Form v1 + React Hook Form
- **Tables:** TanStack Table v8
- **Charts:** Recharts v3
- **Notifications:** Sonner
- **Auth:** Custom — token from `localStorage["auth-state"].state.accessToken`. 401 redirect is commented out (POC mode).

### Route Groups

```
/                            public landing
/login                       public login
/(dashboard)/dashboard/      protected admin area
  page.tsx                   main dashboard
  kyc/                       KYC review, approve/reject
  users/
  transactions/
  withdrawals/
  logs/                      audit logs
  reports/
  risk/
  settings/
```

### Path Alias

`@/*` → `./src/*`

### API Client

`apps/web/src/lib/api.ts` — `ApiClient` class, exported as `api`. Reads Bearer token from `localStorage`. Base URL from `NEXT_PUBLIC_SERVER_URL`.

---

## `apps/native` — Expo / React Native Mobile

### Entrypoint

`expo-router/entry` → `apps/native/app/_layout.tsx`

### Architecture

- **Framework:** Expo 54, expo-router 6, React Native 0.81.4
- **Auth:** `@clerk/clerk-expo` with `expo-secure-store` token cache
- **Styling:** NativeWind v4 + TailwindCSS v3 (requires `tailwind.config.js`)
- **CSS entry:** `apps/native/global.css`
- **Navigation:** expo-router Stack → Drawer → Tabs
- **Features:** expo-local-authentication (biometrics), expo-camera (KYC), expo-web-browser (OAuth)
- **Flags:** New Architecture enabled, React Compiler enabled, Typed Routes enabled
- **URL scheme:** `mybettertapp://`

### Auth Guard (`_layout.tsx`)

- Unauthenticated → redirect to `/sign-in` (except `(auth)` and `onboarding`)
- Authenticated on auth screen → redirect to `/`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is **required** — app throws an `Error` without it

### Route Structure

```
app/
  _layout.tsx          ClerkProvider + ThemeProvider + GestureHandlerRootView
  (auth)/              sign-in, sign-up, verify-email
  (drawer)/            authenticated Drawer navigator
    (tabs)/            main Tab navigator
  kyc/                 KYC initiation + WebView + status
  onboarding/
  portfolio/ orders/ wallets/ alerts/ news/ settings/
  modal.tsx
  +not-found.tsx
```

### Path Alias

`@/*` → root of `apps/native/` (configured in `tsconfig.json`)

---

## KYC Flow

Two-stage approval — full detail in `docs/KYC-FLOW.md`:

1. **Didit automated** — user completes doc + liveness + face match in a WebView
2. **Admin manual** — admin reviews `verification_data` JSONB on web dashboard

| Column | Meaning |
|---|---|
| `kyc_sessions.status` | Didit result: `pending / approved / declined / expired / abandoned` |
| `kyc_sessions.admin_approval_status` | Admin decision: `pending_approval / approved / rejected` |
| `users.kycStatus` | Set to `'approved'` only when **both** stages pass |

- Didit webhook: HMAC-SHA256, headers `x-signature-v2` + `x-timestamp`
- `verification_data` JSONB stores the full Didit payload; admin reads from DB, never calls Didit live
- Paper trading unlocks at `kycStatus === 'pending'` **or** `'approved'`

---

## Migrations Workflow

```bash
# 1. Edit schema in apps/server/src/db/schema/*.ts
# 2. Generate migration SQL:
bun db:generate
# 3a. Push directly (dev only):
bun db:push
# 3b. Apply via migration files (staging/prod):
bun db:migrate
# 4. Browse DB:
bun db:studio
```

Existing migrations: `0000_clammy_starbolt.sql`, `0001_fast_stature.sql`

---

## TypeScript Conventions

- `strict: true` everywhere
- `verbatimModuleSyntax: true` on server and web — use `import type` for type-only imports
- `noUnusedLocals: false`, `noUnusedParameters: false` on server — do not enable these
- Server source files may use `.js` extension in imports (ESM bundler resolution)
- Path alias `@/*` → `./src/*` on server and web; native alias maps to its own root

---

## Quirks & Gotchas

1. **No `db.transaction()` on server.** Neon HTTP driver does not support transactions. Use sequential `await` calls. Canonical pattern is in `paperTrading.ts`.

2. **Server port is 3004, not 3000.** The `.env.example` files default to 3000 — this is wrong. The server binds to `process.env.PORT || 3004`.

3. **Real API secrets are committed in `apps/server/.env`** for the demo environment. Do not expose them. Generate fresh credentials for any new environment.

4. **Web auth 401 redirect is disabled.** `apps/web/src/lib/api.ts` has the redirect to `/login` commented out with a "POC: auth disabled" note.

5. **TailwindCSS versions differ.** Web uses v4 (no config file). Native uses v3 (requires `tailwind.config.js`).

6. **`ENCRYPTION_KEY` rotation is destructive.** Existing `verification_data` rows are unreadable without the original key. Only rotate with a migration that re-encrypts all rows.

7. **Expo React Compiler is enabled.** `experiments.reactCompiler: true` in `app.json`. Be aware of its effects on hooks and memoization.

8. **shadcn/ui `rsc: false`.** All shadcn components are client components. Do not place them in Next.js Server Components without a wrapper.

9. **No shared packages directory.** `packages/*` is in the workspace glob but the folder does not exist. All code sharing is done by direct imports within each app.

10. **`bun.lock` is the authoritative lockfile.** No `package-lock.json` or `yarn.lock`. Always run `bun install`.

---

## Existing Documentation

| File | Content |
|---|---|
| `README.md` | Quick-start, scripts, project structure |
| `DIDIT_KYC_INTEGRATION.md` | Didit V3 API summary |
| `docs/KYC-FLOW.md` | Full two-stage KYC architecture, API reference, file map |
| `docs/screens-and-theme.md` | UI screen inventory and theming |
| `docs/DEMO_CLOUD_POC_WALKTHROUGH.md` | POC demo walkthrough |
| `apps/native/CLERK_SETUP.md` | Clerk configuration for the native app |
