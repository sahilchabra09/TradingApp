/**
 * Clerk Authentication Middleware
 * Handles user authentication, authorization, KYC checks, and role-based access control
 * FSC Mauritius Compliance: Ensures proper identity verification and access control
 */

import type { Context, Next } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { db } from '../db';
import { users, sessionHistory } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import type { User } from '../db/schema/users';
import type { ClerkAuth } from '../types/clerk';
import { UnauthorizedError, ForbiddenError } from '../types/api';

/**
 * Extends Hono context with authentication data
 */
declare module 'hono' {
	interface ContextVariableMap {
		userId: string;
		user: User;
		clerkAuth: ClerkAuth;
	}
}

/**
 * Requires user to be authenticated via Clerk
 * Attaches user data to context
 */
export const requireAuth = async (c: Context, next: Next) => {
	const auth = getAuth(c);

	if (!auth?.userId) {
		throw new UnauthorizedError('Please sign in to access this resource');
	}

	try {
		// Get user from database using Clerk userId
		let user = await db.query.users.findFirst({
			where: and(
				eq(users.clerkId, auth.userId),
				isNull(users.deletedAt) // Not deleted
			),
		});

		// Auto-create user if not found (handles dev mode without webhook)
		if (!user) {
			console.log('Auto-creating user for clerkId:', auth.userId);
			const [newUser] = await db.insert(users).values({
				clerkId: auth.userId,
				email: '', // Will be updated from Clerk webhook later
				firstName: '',
				lastName: '',
				emailVerified: false,
				phoneVerified: false,
				accountStatus: 'pending_kyc',
				kycStatus: 'not_started',
				twoFactorEnabled: false,
			}).returning();
			user = newUser;
		}

		// Check if account is active
		if (user.accountStatus === 'suspended') {
			throw new ForbiddenError('Account suspended. Contact support.', {
				code: 'ACCOUNT_SUSPENDED',
			});
		}

		if (user.accountStatus === 'closed') {
			throw new ForbiddenError('Account closed.', {
				code: 'ACCOUNT_CLOSED',
			});
		}

		// Update last login timestamp
		await db
			.update(users)
			.set({ lastLoginAt: new Date() })
			.where(eq(users.id, user.id));

		// Attach user to context
		c.set('userId', user.id);
		c.set('user', user);
		c.set('clerkAuth', auth as ClerkAuth);

		await next();
	} catch (error) {
		if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
			throw error;
		}
		console.error('Auth middleware error:', error);
		throw new UnauthorizedError('Authentication failed');
	}
};

/**
 * Requires user to have KYC approved
 * Must be used after requireAuth middleware
 */
export const requireKYC = async (c: Context, next: Next) => {
	const user = c.get('user');

	if (!user) {
		throw new UnauthorizedError('Authentication required');
	}

	if (user.kycStatus !== 'approved') {
		const statusMessages: Record<string, string> = {
			not_started: 'Please submit KYC documents to continue',
			pending: 'Your KYC verification is under review',
			rejected: 'Your KYC verification was rejected. Please resubmit',
			resubmission_required: 'Please resubmit your KYC documents',
		};

		throw new ForbiddenError(
			'KYC verification required',
			{
				code: 'KYC_NOT_APPROVED',
				currentStatus: user.kycStatus,
				message: statusMessages[user.kycStatus] || 'KYC verification required',
			}
		);
	}

	await next();
};

/**
 * Requires user's KYC not to be blocked (rejected or in resubmission_required state)
 * Allows pending and not_started users to access KYC-related routes
 * Must be used after requireAuth middleware
 */
export const requireKycNotBlocked = async (c: Context, next: Next) => {
	const user = c.get('user');

	if (!user) {
		throw new UnauthorizedError('Authentication required');
	}

	// Block users who have been permanently rejected
	if (user.kycStatus === 'rejected') {
		throw new ForbiddenError(
			'KYC verification was rejected. Please contact support.',
			{
				code: 'KYC_BLOCKED',
				currentStatus: user.kycStatus,
				action: 'contact_support',
			}
		);
	}

	await next();
};

/**
 * Requires user to have admin role
 * Must be used after requireAuth middleware
 */
export const requireAdmin = async (c: Context, next: Next) => {
	const clerkAuth = c.get('clerkAuth');
	const user = c.get('user');

	if (!user || !clerkAuth) {
		throw new UnauthorizedError('Authentication required');
	}

	// Check Clerk's organization role or custom metadata
	const hasAdminRole =
		clerkAuth.orgRole === 'admin' ||
		clerkAuth.sessionClaims?.metadata?.role === 'admin' ||
		user.isAdmin;

	if (!hasAdminRole) {
		throw new ForbiddenError('Admin access required', {
			code: 'ADMIN_REQUIRED',
		});
	}

	await next();
};

/**
 * Requires 2FA verification for sensitive operations
 * Must be used after requireAuth middleware
 */
export const require2FA = async (c: Context, next: Next) => {
	const user = c.get('user');
	const clerkAuth = c.get('clerkAuth');

	if (!user || !clerkAuth) {
		throw new UnauthorizedError('Authentication required');
	}

	// Check if user has 2FA enabled
	if (!user.twoFactorEnabled) {
		throw new ForbiddenError(
			'2FA required for this operation. Please enable 2FA first.',
			{
				code: 'TWO_FA_REQUIRED',
				action: 'enable_2fa',
			}
		);
	}

	// Verify 2FA was completed in current session
	const twoFactorVerified = clerkAuth.sessionClaims?.metadata?.twoFactorVerified;

	if (!twoFactorVerified) {
		throw new ForbiddenError('Please complete 2FA verification', {
			code: 'TWO_FA_NOT_VERIFIED',
			action: 'verify_2fa',
		});
	}

	await next();
};

/**
 * Requires user account to be fully verified (email + phone)
 * Must be used after requireAuth middleware
 */
export const requireVerified = async (c: Context, next: Next) => {
	const user = c.get('user');

	if (!user) {
		throw new UnauthorizedError('Authentication required');
	}

	if (!user.emailVerified) {
		throw new ForbiddenError('Email verification required', {
			code: 'EMAIL_NOT_VERIFIED',
			action: 'verify_email',
		});
	}

	if (!user.phoneVerified) {
		throw new ForbiddenError('Phone verification required', {
			code: 'PHONE_NOT_VERIFIED',
			action: 'verify_phone',
		});
	}

	await next();
};

/**
 * Optional authentication - attaches user if authenticated but doesn't require it
 */
export const optionalAuth = async (c: Context, next: Next) => {
	const auth = getAuth(c);

	if (auth?.userId) {
		try {
			const user = await db.query.users.findFirst({
				where: and(eq(users.clerkId, auth.userId), isNull(users.deletedAt)),
			});

			if (user && user.accountStatus === 'active') {
				c.set('userId', user.id);
				c.set('user', user);
				c.set('clerkAuth', auth as ClerkAuth);
			}
		} catch (error) {
			// Silently fail for optional auth
			console.error('Optional auth error:', error);
		}
	}

	await next();
};
