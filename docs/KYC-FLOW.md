# KYC Verification Flow

Complete documentation of the Know Your Customer (KYC) verification flow in the Trading App platform.

---

## Overview

The KYC flow uses a **two-stage approval process**:

1. **Didit Verification** — Automated identity verification via [Didit Identity](https://didit.me) (document check, liveness, face match)
2. **Admin Approval** — Manual review by a platform admin before the user can trade

This ensures that even after automated verification passes, a human reviews the results before granting trading access.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile App  │────▶│  Backend API │────▶│  Didit V3    │────▶│  Webhook     │
│  (React      │     │  (Hono)      │     │  API         │     │  Callback    │
│   Native)    │◀────│              │◀────│              │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │  PostgreSQL  │◀─────────────────────────│  Store full  │
                     │  (Neon)      │                          │  decision    │
                     └──────────────┘                          └──────────────┘
                            ▲
                            │
                     ┌──────────────┐
                     │  Admin       │
                     │  Dashboard   │
                     │  (Next.js)   │
                     └──────────────┘
```

---

## Database Schema

### `kyc_sessions` Table

| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Internal session ID |
| `user_id` | UUID (FK → users) | Reference to the user |
| `didit_session_id` | VARCHAR(255) | Didit's session ID (unique) |
| `status` | ENUM | Didit verification result: `pending`, `approved`, `declined`, `expired`, `abandoned` |
| `admin_approval_status` | ENUM | Admin decision: `pending_approval`, `approved`, `rejected` (nullable) |
| `verification_data` | JSONB | Full Didit session decision response (stored by webhook) |
| `admin_reviewed_at` | TIMESTAMP | When admin reviewed |
| `admin_reviewed_by` | VARCHAR(255) | Admin ID who reviewed |
| `admin_rejection_reason` | TEXT | Reason if admin rejected |
| `created_at` | TIMESTAMP | Session creation time |
| `updated_at` | TIMESTAMP | Last update time |

### Key Design Decisions

- **`status`** reflects Didit's automated verification result only
- **`admin_approval_status`** is a separate column for the admin's manual decision
- **`verification_data`** stores the full Didit API response as JSONB so the admin dashboard reads from DB, not live API calls
- A user's `kycStatus` on the `users` table is only set to `approved` when **both** Didit approves AND admin approves

---

## Step-by-Step Flow

### 1. User Initiates KYC

**Mobile App** → `POST /api/v1/kyc/session`

- Backend calls Didit V3 API to create a verification session
- Stores a new row in `kyc_sessions` with `status = 'pending'`
- Returns a `verification_url` to the mobile app
- Mobile app opens the URL in a WebView

**File:** `apps/server/src/routes/kyc.ts` — `POST /session`

### 2. User Completes Verification in WebView

The user completes the Didit verification flow (document upload, liveness check, face match) entirely within the Didit-hosted WebView. No backend interaction during this step.

### 3. Webhook Receives Didit Result

**Didit** → `POST /api/v1/kyc/webhook`

When Didit finishes processing, it sends a webhook to our backend:

1. **Verify signature** — HMAC-SHA256 using `DIDIT_WEBHOOK_SECRET`
2. **Parse payload** — Extract `session_id` and `status` from webhook body
3. **If Didit approved:**
   - Call `GET https://verification.didit.me/v3/session/{sessionId}/decision/` to fetch the full decision data
   - Store the entire response in `verification_data` (JSONB column)
   - Set `status = 'approved'` and `admin_approval_status = 'pending_approval'`
   - **Do NOT** update the user's `kycStatus` to `approved` yet
4. **If Didit declined/expired/abandoned:**
   - Set `status` to the corresponding value
   - No admin approval needed

**File:** `apps/server/src/routes/kyc.ts` — `POST /webhook`

### 4. Mobile App Shows Status

**Mobile App** → `GET /api/v1/kyc/status`

The status endpoint returns both `lastSessionStatus` (Didit result) and `adminApprovalStatus`:

| Didit Status | Admin Approval | What User Sees |
|---|---|---|
| `pending` | `null` | "Verification in progress" |
| `approved` | `pending_approval` | "Verification complete — pending admin approval" + popup alert |
| `approved` | `approved` | "KYC Approved — you can trade" |
| `approved` | `rejected` | "KYC Rejected by admin" with reason |
| `declined` | `null` | "Verification failed" with retry option |
| `expired` | `null` | "Session expired" with retry option |

When the user returns from the WebView and the status is `approved` + `pending_approval`, a popup alert informs them:
> "Your identity verification is complete! Your account is now pending admin review. You'll be able to start trading once approved."

**Files:**
- `apps/server/src/routes/kyc.ts` — `GET /status`
- `apps/native/app/kyc/status.tsx` — Status screen component
- `apps/native/lib/kyc-api.ts` — API types and service

### 5. Admin Reviews on Dashboard

**Admin Dashboard** → `GET /api/v1/admin/kyc`

The KYC list page shows two status columns:
- **Didit Status** — The automated verification result
- **Admin Approval** — `Pending Admin Review`, `Admin Approved`, or `Admin Rejected`

Clicking a session opens a detail dialog with tabs:
- **Verification** — Document/liveness/face match pass/fail badges with scores, extracted identity data (name, DOB, nationality, document number, etc.), and any warnings
- **Documents** — Front/back document images, portrait
- **Biometrics** — Liveness selfie, face match score
- **Details** — Session metadata, IP analysis, VPN/Tor detection, device info, admin review history

All data is read from the `verification_data` JSONB column — **no live Didit API calls** from the admin dashboard.

**Files:**
- `apps/server/src/routes/admin.ts` — `GET /kyc`, `GET /kyc/:sessionId`
- `apps/web/src/app/(dashboard)/dashboard/kyc/page.tsx` — KYC page component
- `apps/web/src/services/admin.service.ts` — Admin API service
- `apps/web/src/types/index.ts` — TypeScript types

### 6. Admin Approves or Rejects

#### Approve: `POST /api/v1/admin/kyc/:sessionId/approve`

1. Sets `admin_approval_status = 'approved'` on the KYC session
2. Sets `admin_reviewed_at` and `admin_reviewed_by`
3. Updates user: `kycStatus = 'approved'`, `accountStatus = 'active'`
4. Creates audit log entry
5. **User can now trade**

#### Reject: `POST /api/v1/admin/kyc/:sessionId/reject`

1. Sets `admin_approval_status = 'rejected'` with rejection reason
2. Sets `admin_reviewed_at` and `admin_reviewed_by`
3. Updates user: `kycStatus = 'rejected'`
4. Creates audit log entry
5. User sees rejection reason on mobile app

**File:** `apps/server/src/routes/admin.ts` — `POST /kyc/:sessionId/approve`, `POST /kyc/:sessionId/reject`

---

## Environment Variables

| Variable | Description |
|---|---|
| `DIDIT_API_KEY` | API key for Didit V3 (used for session creation and fetching decisions) |
| `DIDIT_WORKFLOW_ID` | Didit workflow ID for verification sessions |
| `DIDIT_WEBHOOK_SECRET` | Secret for verifying webhook HMAC signatures |
| `DATABASE_URL` | PostgreSQL connection string (Neon) |

---

## API Endpoints Summary

### User-Facing (requires auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/kyc/status` | Get user's KYC status + admin approval status |
| `POST` | `/api/v1/kyc/session` | Create new Didit verification session |
| `GET` | `/api/v1/kyc/session/:id` | Get specific session details |

### Webhook (no auth, signature verified)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/kyc/webhook` | Didit webhook callback |

### Admin Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/kyc` | List all KYC sessions (paginated, filterable) |
| `GET` | `/api/v1/admin/kyc/:id` | Get full session detail with stored verification data |
| `POST` | `/api/v1/admin/kyc/:id/approve` | Admin approves — user can trade |
| `POST` | `/api/v1/admin/kyc/:id/reject` | Admin rejects — requires reason |

---

## Didit V3 API Reference

### Create Session
`POST https://verification.didit.me/v3/session/`

### Retrieve Session Decision
`GET https://verification.didit.me/v3/session/{sessionId}/decision/`

Returns full verification data including:
- `id_verification` — Document data, extracted fields, images
- `liveness` — Liveness check result, score, reference image
- `face_match` — Face comparison result, score, images
- `ip_analysis` — IP country, VPN/Tor detection, device info
- `aml` — Anti-money laundering check results

### Webhook Payload
```json
{
  "session_id": "uuid",
  "status": "Approved" | "Declined",
  "vendor_data": "internal-session-id"
}
```

Signature verification: HMAC-SHA256 of raw body using `DIDIT_WEBHOOK_SECRET`, compared against `x-signature` header.

---

## File Map

```
apps/
├── server/
│   ├── src/
│   │   ├── db/schema/kyc-sessions.ts    # DB schema + enums
│   │   ├── routes/kyc.ts                # User KYC routes + webhook
│   │   ├── routes/admin.ts              # Admin KYC routes
│   │   └── services/didit.service.ts    # Didit API client
│   └── drizzle.config.ts               # Migration config
├── native/
│   ├── app/kyc/status.tsx               # Mobile KYC status screen
│   └── lib/kyc-api.ts                   # Mobile API types + service
└── web/
    ├── src/
    │   ├── app/(dashboard)/dashboard/kyc/page.tsx  # Admin KYC page
    │   ├── services/admin.service.ts               # Admin API service
    │   └── types/index.ts                          # TypeScript types
    └── ...
```

---

## Migration

After schema changes, generate and run the Drizzle migration:

```bash
cd apps/server
npx drizzle-kit generate   # Generate migration SQL
npx drizzle-kit push        # Apply to database (or use migrate for production)
```
