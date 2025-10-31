# FSC Mauritius Compliant Trading Platform - Database Schema

Complete Drizzle ORM schema for a financial trading platform regulated by FSC Mauritius.

## 📋 Overview

This database schema provides:
- **Regulatory Compliance**: FSC Mauritius requirements for audit trails, KYC, and AML
- **Financial Precision**: All monetary values use `numeric(20, 8)` for accurate calculations
- **Complete Audit Trail**: Immutable audit logs for 7+ year retention
- **Type Safety**: Full TypeScript support with Zod validation
- **Production Ready**: Optimized indexes, constraints, and relations

## 🗂️ Schema Structure

```
src/db/schema/
├── helpers.ts           # Reusable timestamp utilities
├── users.ts             # User accounts and authentication
├── wallets.ts           # Multi-currency wallet management
├── assets.ts            # Tradable financial instruments
├── holdings.ts          # User portfolio positions
├── trades.ts            # Order management and execution
├── kyc.ts               # KYC document verification
├── audit.ts             # System audit trail (IMMUTABLE)
├── compliance.ts        # AML checks and risk limits
├── payments.ts          # Deposits and withdrawals
├── sessions.ts          # User session tracking
├── alerts.ts            # Price alerts and notifications
└── index.ts             # Schema exports
```

## 📊 Database Tables

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User accounts | KYC status, risk profiling, soft delete |
| `wallets` | Currency balances | Segregated client money, balance constraints |
| `assets` | Trading instruments | Stocks, forex, crypto, commodities |
| `holdings` | Portfolio positions | Real-time P&L tracking |
| `trades` | Orders & execution | Complete order lifecycle |

### Compliance Tables

| Table | Purpose | FSC Requirement |
|-------|---------|-----------------|
| `kyc_documents` | Identity verification | Document retention, encryption |
| `audit_logs` | Activity audit trail | 7-year retention, immutable |
| `aml_checks` | AML screening | Sanctions, PEP, adverse media |
| `risk_limits` | Position limits | User and asset level controls |

### Financial Tables

| Table | Purpose | Critical Feature |
|-------|---------|------------------|
| `withdrawal_requests` | Client withdrawals | Multi-stage approval |
| `deposit_transactions` | Client deposits | Settlement date tracking |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `session_history` | Login tracking |
| `price_alerts` | User notifications |

## 🚀 Getting Started

### 1. Install Dependencies

```bash
bun add drizzle-orm drizzle-zod @neondatabase/serverless
bun add -d drizzle-kit
```

### 2. Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=development
```

### 3. Generate Migrations

```bash
bun db:generate
```

This analyzes the schema and creates SQL migration files.

### 4. Apply Migrations

```bash
bun db:migrate
```

Applies migrations to your database.

### 5. (Optional) Drizzle Studio

```bash
bun db:studio
```

Opens a visual database browser at `https://local.drizzle.studio`

## 💻 Usage Examples

### Query with Relations

```typescript
import { db, users, eq } from './db';

const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    wallets: true,
    holdings: {
      with: {
        asset: true,
      },
    },
  },
});
```

### Insert with Validation

```typescript
import { db, users, insertUserSchema } from './db';

const userData = insertUserSchema.parse({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  // ... other fields
});

const [newUser] = await db.insert(users).values(userData).returning();
```

### Transactions

```typescript
import { db, trades, wallets, auditLogs, sql } from './db';

await db.transaction(async (tx) => {
  // Create trade
  const [trade] = await tx.insert(trades).values(orderData).returning();
  
  // Reserve funds
  await tx.update(wallets)
    .set({
      availableBalance: sql`${wallets.availableBalance} - ${amount}`,
      reservedBalance: sql`${wallets.reservedBalance} + ${amount}`,
    })
    .where(eq(wallets.id, walletId));
  
  // Create audit log
  await tx.insert(auditLogs).values(auditData);
});
```

### Complex Queries

```typescript
import { db, holdings, desc, eq, and, gte } from './db';

const profitableHoldings = await db.query.holdings.findMany({
  where: and(
    eq(holdings.userId, userId),
    gte(holdings.unrealizedPnl, '0')
  ),
  with: {
    asset: true,
  },
  orderBy: [desc(holdings.unrealizedPnl)],
  limit: 10,
});
```

## 🔒 Security Best Practices

### 1. Encrypted Fields

These fields MUST be encrypted at application layer:
- `users.passwordHash` - Use bcrypt
- `kyc_documents.documentNumber` - Use AES-256
- `kyc_documents.filePath` - Use AES-256
- `withdrawal_requests.destinationAccount` - Use AES-256

### 2. Sensitive Field Exclusion

Never return sensitive fields in API responses:

```typescript
import { publicUserSchema } from './db/schema';

// This automatically excludes passwordHash, twoFactorSecret
const safeUser = publicUserSchema.parse(user);
```

### 3. Audit Logging

Log ALL user actions to `audit_logs`:

```typescript
await db.insert(auditLogs).values({
  userId,
  eventType: 'user.login',
  eventCategory: 'authentication',
  severity: 'info',
  description: 'User logged in successfully',
  metadata: { loginMethod: '2fa' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

## ⚖️ FSC Mauritius Compliance

### Critical Requirements Implemented

✅ **KYC Documentation**
- Document storage with encrypted file paths
- Verification status tracking
- Integration with Didit API

✅ **Audit Trail**
- Immutable logs (no `updatedAt` field)
- 7-year retention capability
- Complete event context in JSON

✅ **AML Screening**
- Sanctions list checking
- PEP (Politically Exposed Person) screening
- Risk scoring (0-100 scale)

✅ **Client Money Protection**
- Segregated wallet accounts
- Balance constraints (CHECK clauses)
- Transaction approval workflows

✅ **Position Limits**
- User-level limits
- Asset-level limits
- Global defaults

✅ **Trade Immutability**
- Orders cannot be modified once placed
- Complete status lifecycle tracking
- Cancellation audit trail

## 🔧 Migration Commands

```bash
# Generate new migration from schema changes
bun db:generate

# Apply pending migrations
bun db:migrate

# Push schema directly (dev only - no migration history)
bun db:push

# Open Drizzle Studio
bun db:studio

# Introspect existing database
drizzle-kit introspect
```

## 📈 Performance Optimization

### Indexes Created

All tables have optimized indexes for:
- Foreign key relationships
- Common query patterns
- Date range queries
- Status filtering

### Suggested Partitioning

For high-volume tables, implement monthly partitioning:

```sql
-- Example: Partition audit_logs by month
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
```

Consider partitioning:
- `audit_logs` (by created_at)
- `trades` (by placed_at)
- `session_history` (by logged_in_at)

### TimescaleDB Extension (Optional)

For time-series data (market prices, analytics):

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('market_data', 'timestamp');
```

## 🧪 Testing

### Seed Data Example

```typescript
import { db, users, wallets, assets } from './db';

// Create test user
const [testUser] = await db.insert(users).values({
  email: 'test@example.com',
  passwordHash: await bcrypt.hash('password123', 10),
  firstName: 'Test',
  lastName: 'User',
  accountStatus: 'active',
  kycStatus: 'approved',
}).returning();

// Create test wallet
await db.insert(wallets).values({
  userId: testUser.id,
  currency: 'USD',
  availableBalance: '10000.00000000',
  reservedBalance: '0.00000000',
  totalBalance: '10000.00000000',
});

// Create test asset
const [testAsset] = await db.insert(assets).values({
  symbol: 'AAPL',
  name: 'Apple Inc.',
  assetType: 'stock',
  exchange: 'NASDAQ',
  tickSize: '0.01',
  lotSize: '1',
  isTradable: true,
}).returning();
```

## 📝 Type Safety

All schemas include TypeScript types:

```typescript
import type { User, NewUser, Trade, Holding } from './db/schema';

// Inferred types from Drizzle
const user: User = { /* ... */ };
const newUser: NewUser = { /* ... */ };
```

## 🔄 Schema Updates

When modifying the schema:

1. Update the schema file
2. Generate migration: `bun db:generate`
3. Review the generated SQL in `src/db/migrations/`
4. Apply migration: `bun db:migrate`
5. Update application code
6. Test thoroughly

## 📞 Support

For issues or questions:
- Review Drizzle ORM docs: https://orm.drizzle.team
- Check FSC Mauritius guidelines
- Review generated SQL migrations

## 📄 License

Proprietary - FSC Mauritius Compliant Trading Platform
