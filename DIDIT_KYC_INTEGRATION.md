# Didit KYC Integration - Minimal V3 API

## Overview

Minimal Didit V3 integration with **2 endpoints** and **1 table**.

---

## Endpoints

### 1. Create Session

```http
POST /api/v1/kyc/session
Authorization: Bearer <token>

{
  "callbackUrl": "tradingapp://kyc/callback"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "verification_url": "https://verify.didit.me/session/...",
    "session_token": "eyJhbG..."
  }
}
```

### 2. Webhook

```http
POST /api/v1/kyc/webhook
x-signature-v2: <signature>
x-timestamp: <unix_timestamp>
```

Receives status updates from Didit. Updates user KYC status.

---

## Environment Variables

```bash
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_API_KEY=your_api_key
DIDIT_WEBHOOK_SECRET=your_webhook_secret
DIDIT_WORKFLOW_ID=your_workflow_id
```

---

## Database Schema

Single table: `kyc_sessions`

| Column           | Type      | Description                                 |
| ---------------- | --------- | ------------------------------------------- |
| id               | uuid      | Primary key                                 |
| user_id          | uuid      | User reference                              |
| didit_session_id | varchar   | Didit session ID                            |
| status           | enum      | pending/approved/declined/expired/abandoned |
| created_at       | timestamp | Created time                                |
| updated_at       | timestamp | Last update                                 |

---

## Flow

1. User calls `POST /kyc/session`
2. Backend creates Didit session
3. Frontend loads `verification_url` in WebView
4. User completes verification in Didit
5. Didit sends webhook to backend
6. Backend updates user status

**Webhook is the only source of truth for verification result.**
