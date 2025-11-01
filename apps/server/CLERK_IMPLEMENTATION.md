# Trading Platform API - Clerk Authentication Implementation

This is a production-ready RESTful API for an FSC Mauritius-compliant trading platform built with:
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (@hono/clerk-auth)

## 🚀 Quick Start

### Prerequisites
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL database
- Clerk account (https://clerk.com)

### Installation

```bash
cd apps/server
bun install
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/trading_platform

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Application
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

### Database Migration

Update the database schema with the new `clerkId` field:

```bash
# Generate migration
bun run db:generate

# Apply migration
bun run db:push
```

### Running the Server

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── index.ts                  # Main application entry point
├── routes/
│   ├── auth.ts              # Authentication & Clerk webhooks
│   ├── users.ts             # User profile management
│   └── admin/               # Admin routes (to be created)
├── middleware/
│   ├── clerk-auth.ts        # Clerk authentication middleware
│   ├── error-handler.ts     # Global error handling
│   ├── rate-limit.ts        # Rate limiting
│   ├── audit-logger.ts      # Audit trail logging
│   └── trading-hours.ts     # Market hours enforcement
├── services/
│   └── clerk.service.ts     # Clerk API integration
├── utils/
│   ├── response.ts          # Standardized API responses
│   └── validators.ts        # Common validation schemas
├── types/
│   ├── env.ts               # Environment variable types
│   ├── clerk.ts             # Clerk type definitions
│   └── api.ts               # API response types
└── db/
    ├── index.ts             # Database connection
    ├── operations.ts        # Database operations
    └── schema/              # Drizzle ORM schemas
```

## 🔐 Clerk Authentication Setup

### 1. Clerk Dashboard Configuration

1. Create a Clerk application at https://dashboard.clerk.com
2. Get your API keys from the Clerk dashboard
3. Configure allowed origins and redirect URLs

### 2. Webhook Configuration

Set up a webhook in Clerk Dashboard to sync user events:

**Webhook URL**: `https://your-api.com/api/v1/auth/webhooks/clerk`

**Events to subscribe to**:
- `user.created` - Creates user in your database
- `user.updated` - Updates user information
- `user.deleted` - Soft deletes user
- `session.created` - Logs session creation
- `session.ended` - Marks session as inactive

**Important**: Copy the webhook secret to your `.env` file as `CLERK_WEBHOOK_SECRET`

### 3. Frontend Integration

Install Clerk in your frontend:

```bash
# For React/Next.js
npm install @clerk/nextjs

# For React Native/Expo
npm install @clerk/clerk-expo
```

Example frontend usage:

```typescript
import { ClerkProvider, SignIn, SignUp, useUser } from '@clerk/nextjs';

function MyApp() {
  const { isSignedIn, user } = useUser();
  
  // User is automatically authenticated
  // Your backend will verify the session via Clerk middleware
}
```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/webhooks/clerk` | No | Clerk webhook handler |
| GET | `/api/v1/auth/session` | Yes | Get current session |
| POST | `/api/v1/auth/logout` | Yes | Logout user |
| GET | `/api/v1/auth/sessions` | Yes | Get user's active sessions |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/users/profile` | Yes | Get user profile |
| PATCH | `/api/v1/users/profile` | Yes | Update user profile |
| GET | `/api/v1/users/dashboard` | Yes + KYC | Get dashboard summary |
| DELETE | `/api/v1/users/account` | Yes | Delete account (soft delete) |
| GET | `/api/v1/users/activity` | Yes | Get user activity log |

## 🛡️ Middleware

### Authentication Middleware

```typescript
import { requireAuth, requireKYC, requireAdmin, require2FA } from '../middleware/clerk-auth';

// Require authentication
app.get('/protected', requireAuth, async (c) => {
  const user = c.get('user');
  // Access authenticated user
});

// Require KYC approval
app.post('/trade', requireAuth, requireKYC, async (c) => {
  // Only KYC-approved users can trade
});

// Require admin role
app.get('/admin/users', requireAuth, requireAdmin, async (c) => {
  // Only admins can access
});

// Require 2FA for sensitive operations
app.post('/withdraw', requireAuth, requireKYC, require2FA, async (c) => {
  // 2FA required for withdrawals
});
```

### Rate Limiting

Rate limits are automatically applied based on endpoint type:
- **Default**: 100 requests/minute
- **Auth endpoints**: 5 requests/15 minutes
- **Trading endpoints**: 30 requests/minute
- **Withdrawal endpoints**: 5 requests/hour
- **Admin endpoints**: 200 requests/minute

### Audit Logging

All significant actions are automatically logged for FSC Mauritius compliance:
- Authentication events
- Trading operations
- Financial transactions
- KYC submissions
- Admin actions

## 🔧 Database Schema Changes

The following changes were made to support Clerk authentication:

**users table**:
- ✅ Added `clerkId` field (unique, indexed)
- ❌ Removed `passwordHash` (Clerk handles authentication)
- ✅ Added `isAdmin` field for role-based access control

**Migration SQL**:
```sql
-- Add clerkId column
ALTER TABLE users ADD COLUMN clerk_id VARCHAR(255) UNIQUE NOT NULL;
CREATE INDEX users_clerk_id_idx ON users(clerk_id);

-- Remove passwordHash column
ALTER TABLE users DROP COLUMN password_hash;

-- Add isAdmin flag
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
```

## 🎯 Key Features

### 1. Clerk Integration
- Automatic user sync via webhooks
- Session management
- 2FA support
- Multi-organization support
- Social login support

### 2. FSC Mauritius Compliance
- Complete audit trail
- KYC verification workflow
- AML checks integration
- Data retention policies
- Secure data handling

### 3. Security Features
- Rate limiting per endpoint type
- JWT verification via Clerk
- 2FA enforcement for sensitive operations
- Role-based access control (RBAC)
- IP address logging
- User agent tracking

### 4. Error Handling
- Standardized error responses
- Detailed error logging
- Validation error details
- User-friendly error messages

## 📊 Example API Usage

### 1. User Registration (Handled by Clerk)

Users sign up through your frontend using Clerk's components. The webhook automatically creates the user in your database.

### 2. Get User Profile

```bash
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer <clerk_session_token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountStatus": "active",
    "kycStatus": "approved",
    "twoFactorEnabled": true
  }
}
```

### 3. Update Profile

```bash
curl -X PATCH http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer <clerk_session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "phoneNumber": "+23052012345"
  }'
```

## 🚨 Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `KYC_NOT_APPROVED` | 403 | KYC verification required |
| `TWO_FA_REQUIRED` | 403 | 2FA not enabled |
| `TWO_FA_NOT_VERIFIED` | 403 | 2FA verification needed |
| `ACCOUNT_SUSPENDED` | 403 | Account is suspended |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## 🧪 Testing

### Test with Clerk Test Tokens

Clerk provides test tokens in development mode. You can use them to test your API.

### Manual Testing

1. Sign up through your frontend (or use Clerk's hosted pages)
2. Get the session token from Clerk
3. Make API requests with the token in Authorization header

### Webhook Testing

Use Clerk's webhook testing feature in the dashboard to trigger events manually.

## 📦 Deployment

### AWS Lambda Deployment

This API is designed to work with AWS Lambda:

1. Build the application:
```bash
bun run build
```

2. Deploy using your preferred method (Serverless Framework, SAM, etc.)

### Environment Variables

Ensure all required environment variables are set in your deployment environment:
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `DATABASE_URL`
- `ALLOWED_ORIGINS`

## 📝 Next Steps

To complete the implementation, create the following routes:

1. **Trading Routes** (`/routes/trades.ts`)
   - Place orders
   - Cancel orders
   - Get order history
   - Get trade details

2. **Wallet Routes** (`/routes/wallets.ts`)
   - Get wallet balance
   - Get transactions
   - Transfer funds

3. **KYC Routes** (`/routes/kyc.ts`)
   - Submit KYC documents
   - Check KYC status
   - Resubmit documents

4. **Admin Routes** (`/routes/admin/*`)
   - User management
   - KYC review
   - Withdrawal approvals
   - Analytics

## 🤝 Support

For issues or questions:
- Clerk Documentation: https://clerk.com/docs
- Hono Documentation: https://hono.dev
- Drizzle ORM: https://orm.drizzle.team

## 📄 License

[Your License Here]
