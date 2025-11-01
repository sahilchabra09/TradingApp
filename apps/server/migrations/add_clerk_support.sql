-- Database Migration for Clerk Authentication
-- This migration adds Clerk support and removes password-based authentication

-- Step 1: Add clerk_id column (temporary nullable for existing users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255);

-- Step 2: Add isAdmin column for role-based access control
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Update email constraint (keep it unique)
-- No changes needed - email remains unique

-- Step 4: Add index for clerk_id
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users(clerk_id);

-- Step 5: AFTER migrating existing users to Clerk, make clerk_id NOT NULL and UNIQUE
-- This should be done in a separate migration after user migration is complete
-- ALTER TABLE users ALTER COLUMN clerk_id SET NOT NULL;
-- ALTER TABLE users ADD CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id);

-- Step 6: Remove password_hash column
-- ⚠️ WARNING: Only execute this AFTER all users have been migrated to Clerk
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- Step 7: Update two_factor_secret to be nullable (Clerk handles 2FA)
-- Already nullable in schema

-- Rollback instructions (if needed):
-- ALTER TABLE users DROP COLUMN IF EXISTS clerk_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
-- DROP INDEX IF EXISTS users_clerk_id_idx;
