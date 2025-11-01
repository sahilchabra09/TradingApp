/**
 * User Routes
 * Handles user profile management and account operations
 * FSC Mauritius Compliance: Secure user data management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { users, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireKYC } from '../middleware/clerk-auth';
import { ClerkService } from '../services/clerk.service';
import { ResponseHelper } from '../utils/response';
import { addressSchema, phoneSchema } from '../utils/validators';
import { NotFoundError } from '../types/api';

const userRoutes = new Hono();

// Profile update schema
const updateProfileSchema = z.object({
	firstName: z.string().min(1).max(100).optional(),
	lastName: z.string().min(1).max(100).optional(),
	phoneNumber: phoneSchema.optional(),
	dateOfBirth: z.string().datetime().optional(),
	nationality: z.string().length(3).optional(),
	residentialAddress: addressSchema.optional(),
	riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
});

/**
 * Get current user profile
 */
userRoutes.get('/profile', requireAuth, async (c) => {
	const user = c.get('user');

	return ResponseHelper.success(c, {
		id: user.id,
		clerkId: user.clerkId,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		phoneNumber: user.phoneNumber,
		dateOfBirth: user.dateOfBirth,
		nationality: user.nationality,
		residentialAddress: user.residentialAddress,
		accountStatus: user.accountStatus,
		kycStatus: user.kycStatus,
		riskProfile: user.riskProfile,
		twoFactorEnabled: user.twoFactorEnabled,
		emailVerified: user.emailVerified,
		phoneVerified: user.phoneVerified,
		lastLoginAt: user.lastLoginAt,
		createdAt: user.createdAt,
	});
});

/**
 * Update user profile
 */
userRoutes.patch(
	'/profile',
	requireAuth,
	zValidator('json', updateProfileSchema),
	async (c) => {
		const user = c.get('user');
		const clerkAuth = c.get('clerkAuth');
		const updates = c.req.valid('json');

		// Update in database
		await db
			.update(users)
			.set({
				...updates,
				dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id));

		// Also update in Clerk if name changed
		if (updates.firstName || updates.lastName) {
			await ClerkService.updateUser(clerkAuth.userId, {
				firstName: updates.firstName,
				lastName: updates.lastName,
			});
		}

		// Create audit log
		await db.insert(auditLogs).values({
			userId: user.id,
			eventType: 'profile_updated',
			eventCategory: 'authentication',
			description: 'User updated their profile',
			metadata: { updates },
			severity: 'info',
		});

		return ResponseHelper.success(c, null, 'Profile updated successfully');
	}
);

/**
 * Get user dashboard summary
 */
userRoutes.get('/dashboard', requireAuth, requireKYC, async (c) => {
	const user = c.get('user');

	// Get user's wallets
	const wallets = await db.query.wallets.findMany({
		where: (wallets, { eq }) => eq(wallets.userId, user.id),
	});

	// Get user's holdings
	const holdings = await db.query.holdings.findMany({
		where: (holdings, { eq }) => eq(holdings.userId, user.id),
	});

	// Get recent trades
	const recentTrades = await db.query.trades.findMany({
		where: (trades, { eq }) => eq(trades.userId, user.id),
		orderBy: (trades, { desc }) => [desc(trades.createdAt)],
		limit: 5,
	});

	// Calculate total portfolio value
	const totalPortfolioValue = wallets.reduce(
		(sum, wallet) => sum + parseFloat(wallet.availableBalance) + parseFloat(wallet.reservedBalance),
		0
	);

	return ResponseHelper.success(c, {
		user: {
			name: `${user.firstName} ${user.lastName}`,
			accountStatus: user.accountStatus,
			kycStatus: user.kycStatus,
		},
		portfolio: {
			totalValue: totalPortfolioValue.toFixed(2),
			wallets: wallets.length,
			holdings: holdings.length,
		},
		recentActivity: {
			trades: recentTrades,
		},
	});
});

/**
 * Delete user account (soft delete)
 */
userRoutes.delete('/account', requireAuth, async (c) => {
	const user = c.get('user');
	const clerkAuth = c.get('clerkAuth');

	// Check if user has any pending withdrawals or open positions
	const hasOpenPositions = await db.query.holdings.findFirst({
		where: (holdings, { eq, and, gt }) =>
			and(eq(holdings.userId, user.id), gt(holdings.quantity, '0')),
	});

	if (hasOpenPositions) {
		return ResponseHelper.error(
			c,
			'Cannot delete account with open positions. Please close all positions first.',
			'OPEN_POSITIONS_EXIST',
			400
		);
	}

	// Soft delete in database
	await db
		.update(users)
		.set({
			deletedAt: new Date(),
			accountStatus: 'closed',
		})
		.where(eq(users.id, user.id));

	// Delete from Clerk
	await ClerkService.deleteUser(clerkAuth.userId);

	// Create audit log
	await db.insert(auditLogs).values({
		userId: user.id,
		eventType: 'account_deleted',
		eventCategory: 'authentication',
		description: 'User deleted their account',
		severity: 'warning',
	});

	return ResponseHelper.success(c, null, 'Account deleted successfully');
});

/**
 * Get user activity log
 */
userRoutes.get('/activity', requireAuth, async (c) => {
	const user = c.get('user');
	const page = parseInt(c.req.query('page') || '1');
	const limit = parseInt(c.req.query('limit') || '20');
	const offset = (page - 1) * limit;

	const activities = await db.query.auditLogs.findMany({
		where: (logs, { eq }) => eq(logs.userId, user.id),
		orderBy: (logs, { desc }) => [desc(logs.createdAt)],
		limit,
		offset,
	});

	const total = await db.query.auditLogs.findMany({
		where: (logs, { eq }) => eq(logs.userId, user.id),
	});

	return ResponseHelper.paginated(
		c,
		activities,
		{
			page,
			limit,
			total: total.length,
			totalPages: Math.ceil(total.length / limit),
			hasMore: page * limit < total.length,
		}
	);
});

export default userRoutes;
