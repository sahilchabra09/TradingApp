# Quick Reference Guide - Clerk Authentication API

## 🚀 Common Operations

### Authentication Patterns

#### Protect a Route (Require Login)
```typescript
import { requireAuth } from '../middleware/clerk-auth';

app.get('/protected', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});
```

#### Require KYC Approval
```typescript
import { requireAuth, requireKYC } from '../middleware/clerk-auth';

app.post('/trade', requireAuth, requireKYC, async (c) => {
  // User is authenticated AND KYC approved
  const user = c.get('user');
  // ... trading logic
});
```

#### Require Admin Role
```typescript
import { requireAuth, requireAdmin } from '../middleware/clerk-auth';

app.get('/admin/users', requireAuth, requireAdmin, async (c) => {
  // Only admins can access
  const user = c.get('user');
  // ... admin logic
});
```

#### Require 2FA for Sensitive Operations
```typescript
import { requireAuth, requireKYC, require2FA } from '../middleware/clerk-auth';

app.post('/withdraw', requireAuth, requireKYC, require2FA, async (c) => {
  // User must have 2FA enabled and verified
  const user = c.get('user');
  // ... withdrawal logic
});
```

#### Optional Authentication
```typescript
import { optionalAuth } from '../middleware/clerk-auth';

app.get('/market-data', optionalAuth, async (c) => {
  const user = c.get('user'); // May be undefined
  
  if (user) {
    // Personalized data for logged-in users
  } else {
    // Generic data for anonymous users
  }
});
```

### Accessing User Data

#### Get Current User
```typescript
app.get('/profile', requireAuth, async (c) => {
  const user = c.get('user'); // Full user object from database
  
  return c.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    accountStatus: user.accountStatus,
    kycStatus: user.kycStatus,
  });
});
```

#### Get Clerk Auth Info
```typescript
app.get('/session-info', requireAuth, async (c) => {
  const clerkAuth = c.get('clerkAuth');
  
  return c.json({
    userId: clerkAuth.userId,
    sessionId: clerkAuth.sessionId,
    orgId: clerkAuth.orgId,
    orgRole: clerkAuth.orgRole,
  });
});
```

### Response Helpers

#### Success Response
```typescript
import { ResponseHelper } from '../utils/response';

return ResponseHelper.success(c, { data: 'value' }, 'Success message');
// Returns: { success: true, data: { data: 'value' }, message: 'Success message' }
```

#### Created Response (201)
```typescript
return ResponseHelper.created(c, newOrder, 'Order created');
```

#### Paginated Response
```typescript
import { calculatePagination } from '../utils/response';

const pagination = calculatePagination(page, limit, total);
return ResponseHelper.paginated(c, items, pagination);
```

#### Error Responses
```typescript
// Unauthorized (401)
return ResponseHelper.unauthorized(c, 'Please log in');

// Forbidden (403)
return ResponseHelper.forbidden(c, 'Insufficient permissions');

// Not Found (404)
return ResponseHelper.notFound(c, 'User not found');

// Validation Error (400)
return ResponseHelper.validationError(c, { email: 'Invalid email' });

// Rate Limit (429)
return ResponseHelper.rateLimitExceeded(c, 60); // Retry after 60 seconds
```

### Custom Error Throwing

#### Throw Custom Errors
```typescript
import { 
  UnauthorizedError, 
  ForbiddenError, 
  NotFoundError,
  ValidationError,
  InsufficientBalanceError 
} from '../types/api';

// Unauthorized
throw new UnauthorizedError('Session expired');

// Forbidden
throw new ForbiddenError('Admin access required', { requiredRole: 'admin' });

// Not Found
throw new NotFoundError('Asset not found');

// Validation Error
throw new ValidationError('Invalid input', { field: 'email' });

// Insufficient Balance
throw new InsufficientBalanceError('1000', '500', 'Not enough funds');
```

### Validation with Zod

#### Validate Request Body
```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  age: z.number().min(18),
});

app.post('/user', zValidator('json', schema), async (c) => {
  const data = c.req.valid('json'); // Type-safe validated data
  return ResponseHelper.success(c, data);
});
```

#### Validate Query Parameters
```typescript
const querySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
  status: z.enum(['active', 'pending', 'closed']).optional(),
});

app.get('/orders', zValidator('query', querySchema), async (c) => {
  const { page, limit, status } = c.req.valid('query');
  // Use validated params
});
```

#### Use Built-in Validators
```typescript
import { 
  uuidSchema, 
  emailSchema,
  phoneSchema,
  positiveDecimalSchema,
  addressSchema,
  orderSideSchema,
  orderTypeSchema 
} from '../utils/validators';

const orderSchema = z.object({
  assetId: uuidSchema,
  side: orderSideSchema, // 'buy' | 'sell'
  orderType: orderTypeSchema, // 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: positiveDecimalSchema,
  limitPrice: z.string().optional(),
});
```

### Database Operations

#### Query with Drizzle
```typescript
import { db } from '../db';
import { users, trades } from '../db/schema';
import { eq, and, desc, gt, lt } from 'drizzle-orm';

// Find user by ID
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Find with multiple conditions
const activeTrades = await db.query.trades.findMany({
  where: and(
    eq(trades.userId, userId),
    eq(trades.status, 'active')
  ),
  orderBy: [desc(trades.createdAt)],
  limit: 10,
});

// With relations
const userWithTrades = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    trades: true,
    wallets: true,
  },
});
```

#### Insert Data
```typescript
const [newUser] = await db.insert(users)
  .values({
    clerkId: 'user_xyz',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
  })
  .returning();
```

#### Update Data
```typescript
await db.update(users)
  .set({
    firstName: 'Jane',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId));
```

#### Delete Data (Soft Delete)
```typescript
await db.update(users)
  .set({
    deletedAt: new Date(),
    accountStatus: 'closed',
  })
  .where(eq(users.id, userId));
```

### Audit Logging

#### Create Audit Log
```typescript
import { db } from '../db';
import { auditLogs } from '../db/schema';

await db.insert(auditLogs).values({
  userId: user.id,
  eventType: 'order_placed',
  eventCategory: 'trading',
  description: 'User placed a buy order',
  metadata: {
    orderId: order.id,
    assetSymbol: 'AAPL',
    quantity: 10,
    price: 150.00,
  },
  ipAddress: c.req.header('x-forwarded-for'),
  severity: 'info',
});
```

#### Event Categories
- `authentication` - Login, logout, password changes
- `trading` - Order placement, execution, cancellation
- `compliance` - KYC, AML checks
- `admin_action` - Administrative actions
- `system` - System events
- `financial` - Deposits, withdrawals, transfers
- `security` - Security events

#### Severity Levels
- `info` - Normal operations
- `warning` - Important events
- `error` - Errors that need attention
- `critical` - Critical security/compliance events

### Clerk Service Usage

#### Get User from Clerk
```typescript
import { ClerkService } from '../services/clerk.service';

const clerkUser = await ClerkService.getUserById(clerkUserId);
```

#### Update User Metadata
```typescript
await ClerkService.updateUserMetadata(clerkUserId, {
  kycApproved: true,
  riskLevel: 'moderate',
});
```

#### Ban/Unban User
```typescript
// Ban user
await ClerkService.banUser(clerkUserId);

// Unban user
await ClerkService.unbanUser(clerkUserId);
```

#### Check Verification Status
```typescript
const emailVerified = await ClerkService.isEmailVerified(clerkUserId);
const phoneVerified = await ClerkService.isPhoneVerified(clerkUserId);
const has2FA = await ClerkService.has2FAEnabled(clerkUserId);
```

### Rate Limiting

Rate limits are automatically applied. Current limits:

| Endpoint Type | Rate Limit |
|--------------|------------|
| Default | 100 requests/minute |
| Auth | 5 requests/15 minutes |
| Trading | 30 requests/minute |
| Withdrawal | 5 requests/hour |
| Admin | 200 requests/minute |

To clear rate limit for a user:
```typescript
import { clearUserRateLimit } from '../middleware/rate-limit';

clearUserRateLimit(userId);
```

### Trading Hours

Enforce trading hours:
```typescript
import { enforceTradingHours, areMarketsOpen } from '../middleware/trading-hours';

// Middleware
app.post('/order', enforceTradingHours, async (c) => {
  // Only accessible during market hours
});

// Check programmatically
if (areMarketsOpen()) {
  // Markets are open
}
```

## 📝 Common Patterns

### Complete Protected Endpoint
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requireKYC } from '../middleware/clerk-auth';
import { ResponseHelper } from '../utils/response';
import { db } from '../db';
import { auditLogs } from '../db/schema';

const app = new Hono();

const schema = z.object({
  amount: z.string().transform(parseFloat),
  currency: z.enum(['USD', 'EUR', 'GBP']),
});

app.post(
  '/withdraw',
  requireAuth,
  requireKYC,
  zValidator('json', schema),
  async (c) => {
    const user = c.get('user');
    const { amount, currency } = c.req.valid('json');

    try {
      // Your business logic here
      
      // Create audit log
      await db.insert(auditLogs).values({
        userId: user.id,
        eventType: 'withdrawal_requested',
        eventCategory: 'financial',
        description: `Withdrawal of ${amount} ${currency} requested`,
        metadata: { amount, currency },
        severity: 'info',
      });

      return ResponseHelper.success(c, null, 'Withdrawal requested');
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw error;
    }
  }
);

export default app;
```

### Paginated List Endpoint
```typescript
import { paginationSchema } from '../utils/validators';
import { calculatePagination } from '../utils/response';

app.get(
  '/orders',
  requireAuth,
  zValidator('query', paginationSchema),
  async (c) => {
    const user = c.get('user');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const orders = await db.query.trades.findMany({
      where: eq(trades.userId, user.id),
      limit,
      offset,
      orderBy: [desc(trades.createdAt)],
    });

    const total = await db.query.trades.findMany({
      where: eq(trades.userId, user.id),
    });

    const pagination = calculatePagination(page, limit, total.length);

    return ResponseHelper.paginated(c, orders, pagination);
  }
);
```

## 🔧 Environment Variables

Required:
```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

Optional:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
LOG_LEVEL=info
```

## 📚 Further Reading

- [Full Implementation Guide](./CLERK_IMPLEMENTATION.md)
- [Migration Guide](./MIGRATION_GUIDE_CLERK.md)
- [Clerk Documentation](https://clerk.com/docs)
- [Hono Documentation](https://hono.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
