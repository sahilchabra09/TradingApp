# Database Migration Guide

## Initial Setup

### 1. Environment Setup

Ensure your `.env` file is configured:

```env
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
NODE_ENV=development
```

### 2. Generate Initial Migration

```bash
bun db:generate
```

This will create a migration file in `src/db/migrations/` directory.

### 3. Review Migration SQL

Before applying, review the generated SQL:

```bash
cat src/db/migrations/0000_*.sql
```

Expected tables:
- users
- wallets
- assets
- holdings
- trades
- kyc_documents
- audit_logs
- aml_checks
- risk_limits
- withdrawal_requests
- deposit_transactions
- session_history
- price_alerts

### 4. Apply Migration

```bash
bun db:migrate
```

## Post-Migration Steps

### 1. Verify Schema

```bash
bun db:studio
```

This opens Drizzle Studio to visually inspect your database.

### 2. Create Indexes (if not auto-generated)

Most indexes are created automatically, but verify:

```sql
-- Check existing indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 3. Set Up Partitioning (Optional but Recommended)

For audit logs (high volume):

```sql
-- Convert to partitioned table (do this BEFORE inserting data)
ALTER TABLE audit_logs RENAME TO audit_logs_old;

CREATE TABLE audit_logs (LIKE audit_logs_old INCLUDING ALL)
PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

### 4. Configure Row Level Security (Optional)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Example: Users can only see their own data
CREATE POLICY user_own_data ON users
  FOR SELECT
  USING (id = current_setting('app.user_id')::uuid);
```

### 5. Create Database Functions

#### Calculate Wallet Total

```sql
CREATE OR REPLACE FUNCTION update_wallet_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_balance := NEW.available_balance + NEW.reserved_balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_balance_trigger
  BEFORE INSERT OR UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_total();
```

#### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Seed Data

### Create Admin User

```typescript
import { db, users } from './db';
import bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash('admin123', 10);

await db.insert(users).values({
  email: 'admin@tradingapp.com',
  passwordHash,
  firstName: 'Admin',
  lastName: 'User',
  accountStatus: 'active',
  kycStatus: 'approved',
  emailVerified: true,
});
```

### Create Sample Assets

```typescript
import { db, assets } from './db';

const sampleAssets = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    exchange: 'NASDAQ',
    tickSize: '0.01',
    lotSize: '1',
    isin: 'US0378331005',
  },
  {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetType: 'forex',
    exchange: 'FOREX',
    tickSize: '0.0001',
    lotSize: '100000',
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    assetType: 'crypto',
    exchange: 'CRYPTO',
    tickSize: '0.01',
    lotSize: '0.001',
  },
];

await db.insert(assets).values(sampleAssets);
```

## Common Migration Scenarios

### Adding a New Column

1. Update schema file:

```typescript
// src/db/schema/users.ts
export const users = pgTable('users', {
  // ... existing columns
  newColumn: varchar('new_column', { length: 255 }),
});
```

2. Generate migration:

```bash
bun db:generate
```

3. Apply migration:

```bash
bun db:migrate
```

### Modifying a Column

⚠️ **WARNING**: Some changes require data migration

```typescript
// Change column type
myColumn: integer('my_column').notNull() // was varchar
```

For complex changes:

1. Add new column
2. Migrate data
3. Drop old column
4. Rename new column

### Adding an Index

```typescript
}, (table) => ({
  // Add new index
  myNewIdx: index('my_table_my_column_idx').on(table.myColumn),
}));
```

## Backup & Restore

### Backup Database

```bash
pg_dump -h hostname -U username -d database_name -f backup.sql
```

### Restore Database

```bash
psql -h hostname -U username -d database_name -f backup.sql
```

## Performance Monitoring

### Check Table Sizes

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Slow Queries

```sql
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Analyze Query Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM trades 
WHERE user_id = 'some-uuid' 
  AND status = 'open';
```

## Troubleshooting

### Migration Failed

```bash
# Rollback last migration
bun db:drop

# Or manually rollback
psql -h hostname -U username -d database_name
DROP TABLE IF EXISTS [table_name] CASCADE;
```

### Constraint Violations

Check constraints:

```sql
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE conrelid = 'table_name'::regclass;
```

### Reset Database (Development Only)

```bash
# Drop all tables
psql -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
bun db:migrate
```

## FSC Mauritius Compliance Checklist

After migration, verify:

- ✅ Audit logs table exists and is immutable
- ✅ KYC documents table has proper encryption fields
- ✅ All monetary fields use numeric(20, 8)
- ✅ Foreign keys have proper cascade rules
- ✅ CHECK constraints are in place
- ✅ Indexes on frequently queried columns
- ✅ Timestamps include timezone information

## Production Deployment

1. **Backup production database**
2. **Test migration on staging**
3. **Schedule downtime window**
4. **Run migration with monitoring**
5. **Verify data integrity**
6. **Test critical user flows**
7. **Monitor error rates**

## Maintenance

### Monthly Tasks

- Vacuum tables: `VACUUM ANALYZE;`
- Reindex: `REINDEX DATABASE database_name;`
- Check partition sizes
- Archive old audit logs (>7 years)

### Quarterly Tasks

- Review slow queries
- Optimize indexes
- Update table statistics
- Review and optimize partitioning strategy
