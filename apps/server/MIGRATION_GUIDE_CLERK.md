# Clerk Authentication Migration Guide

This guide walks you through migrating your existing trading platform to use Clerk authentication.

## Prerequisites

1. ✅ Clerk account created at https://clerk.com
2. ✅ Clerk application configured
3. ✅ API keys obtained from Clerk dashboard
4. ✅ Webhook endpoint configured in Clerk dashboard
5. ✅ Database backup created

## Migration Strategy

We'll use a **phased migration approach** to ensure zero downtime:

### Phase 1: Setup (No User Impact)

**Duration**: ~1 hour

1. **Install Clerk packages** (✅ Already done)
   ```bash
   bun add @hono/clerk-auth @clerk/backend svix
   ```

2. **Configure environment variables**
   ```env
   CLERK_SECRET_KEY=sk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

3. **Deploy webhook endpoint**
   - Deploy `/api/v1/auth/webhooks/clerk` endpoint
   - Configure webhook URL in Clerk dashboard
   - Test webhook delivery

4. **Add database columns**
   ```bash
   # Apply migration
   bun run db:push
   ```

### Phase 2: Dual Authentication (Gradual Migration)

**Duration**: 1-4 weeks (depending on user base)

During this phase, both password-based and Clerk authentication work simultaneously.

#### 2.1 Update Backend

1. **Keep existing password authentication**
   - Don't remove `passwordHash` yet
   - Existing users can still login with passwords

2. **Add Clerk authentication middleware**
   ```typescript
   // Support both auth methods
   const requireAuthDual = async (c, next) => {
     // Try Clerk auth first
     const clerkAuth = getAuth(c);
     if (clerkAuth?.userId) {
       // Clerk authenticated
       return requireAuth(c, next);
     }
     
     // Fall back to password auth
     return legacyPasswordAuth(c, next);
   };
   ```

#### 2.2 Update Frontend

1. **Add Clerk components** to your frontend:
   
   **For Next.js/React:**
   ```typescript
   import { ClerkProvider, SignIn, SignUp } from '@clerk/nextjs';
   
   function App() {
     return (
       <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
         <YourApp />
       </ClerkProvider>
     );
   }
   ```

   **For React Native/Expo:**
   ```typescript
   import { ClerkProvider } from '@clerk/clerk-expo';
   
   function App() {
     return (
       <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
         <YourApp />
       </ClerkProvider>
     );
   }
   ```

2. **Add Clerk sign-in/sign-up pages**
   - Create new routes for Clerk authentication
   - Keep existing authentication pages active

3. **Prompt users to migrate**
   - Add banner: "Migrate to new secure authentication"
   - Provide migration flow in user settings

#### 2.3 User Migration Flow

**Option A: Automatic Migration on Login**

```typescript
// When user logs in with password, create Clerk account
async function loginAndMigrate(email: string, password: string) {
  // 1. Verify password with existing system
  const user = await verifyPassword(email, password);
  
  if (user) {
    // 2. Create Clerk user
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      password: password, // Clerk will hash it
      firstName: user.firstName,
      lastName: user.lastName,
    });
    
    // 3. Update user record with Clerk ID
    await db.update(users)
      .set({ clerkId: clerkUser.id })
      .where(eq(users.id, user.id));
    
    // 4. Return Clerk session
    return { clerkUserId: clerkUser.id };
  }
}
```

**Option B: Manual Migration in Settings**

```typescript
// User-initiated migration
async function migrateToClerk(userId: string) {
  const user = await getUser(userId);
  
  // Send migration invite via Clerk
  const invitation = await clerkClient.invitations.createInvitation({
    emailAddress: user.email,
    redirectUrl: 'https://yourapp.com/complete-migration',
  });
  
  // User receives email, sets up Clerk account
  // Webhook links Clerk account to existing user
}
```

#### 2.4 Monitoring

Track migration progress:

```sql
-- Check migration status
SELECT 
  COUNT(*) as total_users,
  COUNT(clerk_id) as migrated_users,
  COUNT(*) - COUNT(clerk_id) as remaining_users,
  (COUNT(clerk_id)::float / COUNT(*) * 100) as migration_percentage
FROM users
WHERE deleted_at IS NULL;
```

### Phase 3: Clerk-Only Authentication (Post-Migration)

**Duration**: After 90%+ users migrated

1. **Disable password authentication**
   ```typescript
   // Remove legacy password auth endpoints
   // app.post('/auth/login', ...) <- Remove this
   ```

2. **Force remaining users to migrate**
   - Send email notifications
   - Add forced migration on next login
   - Provide grace period (e.g., 2 weeks)

3. **Remove password column**
   ```sql
   -- After ALL users migrated
   ALTER TABLE users DROP COLUMN password_hash;
   ```

4. **Update constraints**
   ```sql
   -- Make clerk_id required
   ALTER TABLE users ALTER COLUMN clerk_id SET NOT NULL;
   ALTER TABLE users ADD CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id);
   ```

## Migration Checklist

### Pre-Migration

- [ ] Create Clerk account and application
- [ ] Configure Clerk settings (allowed domains, redirect URLs)
- [ ] Set up webhook endpoint
- [ ] Test webhook with Clerk's testing tool
- [ ] Configure environment variables
- [ ] Create database backup
- [ ] Deploy updated backend with dual auth support
- [ ] Deploy updated frontend with Clerk components

### During Migration

- [ ] Monitor webhook delivery and processing
- [ ] Track migration percentage daily
- [ ] Monitor error logs for migration issues
- [ ] Respond to user support requests
- [ ] Send reminder emails to non-migrated users

### Post-Migration

- [ ] Verify all users have `clerk_id`
- [ ] Remove password authentication code
- [ ] Drop `password_hash` column
- [ ] Update API documentation
- [ ] Clean up legacy authentication code
- [ ] Archive old authentication tests

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (Phase 2)

1. **Revert to password-only authentication**
   ```typescript
   // Disable Clerk middleware temporarily
   // app.use('*', clerkMiddleware()); // <- Comment out
   ```

2. **Keep both systems running**
   - Users with Clerk accounts can still use Clerk
   - Users without Clerk accounts use passwords
   - No data loss

### Emergency Rollback (Phase 3)

If you've already removed password authentication:

1. **Re-enable password reset flow**
   ```typescript
   // Allow users to set new passwords
   app.post('/auth/reset-password', async (c) => {
     // Send password reset email
   });
   ```

2. **Temporarily disable Clerk requirement**
   ```typescript
   // Make Clerk optional
   export const optionalAuth = async (c, next) => {
     // Try Clerk, fall back to password
   };
   ```

## Testing Checklist

- [ ] Test user creation via webhook
- [ ] Test user update via webhook
- [ ] Test user deletion via webhook
- [ ] Test session creation via webhook
- [ ] Test authentication middleware
- [ ] Test KYC flow with Clerk auth
- [ ] Test admin role assignment
- [ ] Test 2FA enforcement
- [ ] Test rate limiting per user
- [ ] Test audit logging
- [ ] Load test with concurrent users

## Support Scripts

### 1. Bulk Migration Script

```typescript
// migrate-users.ts
import { clerkClient } from '@clerk/backend';
import { db } from './db';

async function migrateAllUsers() {
  const users = await db.query.users.findMany({
    where: (users, { isNull }) => isNull(users.clerkId),
  });

  for (const user of users) {
    try {
      // Create Clerk user with invitation
      const invitation = await clerkClient.invitations.createInvitation({
        emailAddress: user.email,
        redirectUrl: 'https://yourapp.com/setup',
        publicMetadata: { legacyUserId: user.id },
      });

      console.log(`Invited ${user.email}`);
      
      // Track invitation
      await db.insert(migrationTracking).values({
        userId: user.id,
        invitationId: invitation.id,
        sentAt: new Date(),
      });
      
      // Rate limit: wait between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to invite ${user.email}:`, error);
    }
  }
}
```

### 2. Migration Status Report

```typescript
// migration-report.ts
async function generateMigrationReport() {
  const stats = await db.query.users.findMany();
  
  const report = {
    total: stats.length,
    migrated: stats.filter(u => u.clerkId).length,
    pending: stats.filter(u => !u.clerkId).length,
    active: stats.filter(u => u.accountStatus === 'active').length,
    suspended: stats.filter(u => u.accountStatus === 'suspended').length,
  };

  console.log('Migration Status:', report);
  return report;
}
```

## Common Issues and Solutions

### Issue 1: Duplicate Email Addresses

**Problem**: User exists in database but Clerk creates new user

**Solution**:
```typescript
// In webhook handler, check for existing user
const existingUser = await db.query.users.findFirst({
  where: eq(users.email, data.email_addresses[0].email_address),
});

if (existingUser) {
  // Update existing user with Clerk ID
  await db.update(users)
    .set({ clerkId: data.id })
    .where(eq(users.id, existingUser.id));
} else {
  // Create new user
  await db.insert(users).values({...});
}
```

### Issue 2: Session Not Found

**Problem**: User authenticated in Clerk but not found in database

**Solution**: Ensure webhook processed `user.created` event before user tries to access API

```typescript
// Add retry logic in middleware
let retries = 3;
while (!user && retries > 0) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  user = await db.query.users.findFirst({...});
  retries--;
}
```

### Issue 3: Webhook Signature Verification Fails

**Problem**: Webhook requests return 400 Invalid Signature

**Solution**:
- Verify `CLERK_WEBHOOK_SECRET` is correct
- Check webhook secret hasn't expired
- Ensure raw body is passed to verification (not parsed JSON)

## Security Considerations

1. **Never log sensitive data**
   - Don't log full Clerk tokens
   - Don't log passwords during migration
   - Sanitize logs before storage

2. **Webhook security**
   - Always verify Svix signatures
   - Use HTTPS for webhook endpoint
   - Rate limit webhook endpoint

3. **Session management**
   - Clerk handles session tokens
   - Don't store Clerk tokens in your database
   - Trust Clerk's verification

4. **2FA enforcement**
   - Encourage users to enable 2FA
   - Require 2FA for high-value operations
   - Check 2FA status via Clerk API

## Timeline Example

**Week 1**: Setup and Testing
- Day 1-2: Clerk setup, environment config
- Day 3-4: Deploy webhook and middleware
- Day 5-7: Internal testing

**Week 2-5**: Gradual Migration
- Week 2: Deploy to 10% of users
- Week 3: Deploy to 50% of users  
- Week 4: Deploy to 90% of users
- Week 5: Force migration for remaining users

**Week 6**: Cleanup
- Remove password authentication
- Drop database columns
- Update documentation

## Success Metrics

Track these metrics during migration:

- **Migration rate**: Users migrated per day
- **Error rate**: Failed webhook deliveries
- **Support tickets**: Migration-related issues
- **User satisfaction**: Survey post-migration
- **Authentication failures**: Compare before/after
- **Session duration**: Average session length
- **2FA adoption**: Percentage of users with 2FA enabled

## Questions?

If you encounter issues during migration:
1. Check Clerk dashboard for webhook delivery status
2. Review application logs for errors
3. Consult Clerk documentation: https://clerk.com/docs
4. Contact Clerk support for assistance

---

**Remember**: Take your time with migration. It's better to migrate slowly and safely than to rush and cause user disruption.
