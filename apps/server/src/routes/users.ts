/**
 * User Routes
 * Handles user profile management and account operations
 * FSC Mauritius Compliance: Secure user data management
 */

import { Hono } from 'hono';
import { describeRoute, validator as zValidator } from 'hono-openapi';
import { z } from 'zod';
import { db } from '../db';
import {
	users,
	auditLogs,
	wallets,
	holdings,
	trades,
	kycSessions,
	sessionHistory,
	priceAlerts,
	amlChecks,
	riskLimits,
	withdrawalRequests,
	depositTransactions,
	paperWallets,
	paperHoldings,
	paperTrades,
	paperTradeAttempts,
	aiResearchChats,
} from '../db/schema';
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
userRoutes.get(
	'/profile',
	describeRoute({
		tags: ['Users'],
		summary: 'Get current user profile',
		description: 'Returns the authenticated user\'s full profile.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'User profile returned' },
			401: { description: 'Not authenticated' },
		},
	}),
	requireAuth,
	async (c) => {
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
	describeRoute({
		tags: ['Users'],
		summary: 'Update user profile',
		description: 'Partially updates the authenticated user\'s profile. Name changes are also synced to Clerk.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'Profile updated successfully' },
			400: { description: 'Validation error' },
			401: { description: 'Not authenticated' },
		},
	}),
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
userRoutes.get(
	'/dashboard',
	describeRoute({
		tags: ['Users'],
		summary: 'Dashboard summary',
		description: 'Returns the authenticated user\'s portfolio overview, wallet balances, holdings count, and recent trades. Requires completed KYC.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'Dashboard data returned' },
			401: { description: 'Not authenticated' },
			403: { description: 'KYC not approved' },
		},
	}),
	requireAuth,
	requireKYC,
	async (c) => {
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
 * Permanently delete user account (hard delete)
 *
 * Deletion order respects FK constraints:
 *  1. payment records  (FK → wallets + users, both RESTRICT)
 *  2. AML checks       (FK → users, RESTRICT)
 *  3. KYC sessions     (FK → users, RESTRICT)
 *  4. AI research chats (FK → users, CASCADE — explicit for clarity)
 *  5. trades / holdings / wallets (FK → users, RESTRICT)
 *  6. hard-delete the user row   → cascades the rest
 *     (paperWallets/Holdings/Trades/Attempts, sessionHistory,
 *      priceAlerts, riskLimits all have onDelete:cascade)
 *  7. delete from Clerk
 */
userRoutes.delete(
	'/account',
	describeRoute({
		tags: ['Users'],
		summary: 'Permanently delete account',
		description: 'Hard-deletes the user and all associated data from every table, then removes the Clerk account.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'Account permanently deleted' },
			401: { description: 'Not authenticated' },
		},
	}),
	requireAuth,
	async (c) => {
	const user = c.get('user');
	const clerkAuth = c.get('clerkAuth');

	// 1. Payment records first (FK → wallets AND users, both RESTRICT)
	await db.delete(withdrawalRequests).where(eq(withdrawalRequests.userId, user.id));
	await db.delete(depositTransactions).where(eq(depositTransactions.userId, user.id));

	// 2. AML compliance checks (FK → users, RESTRICT)
	await db.delete(amlChecks).where(eq(amlChecks.userId, user.id));

	// 3. KYC sessions (FK → users, RESTRICT)
	await db.delete(kycSessions).where(eq(kycSessions.userId, user.id));

	// 4. AI research chats (FK → users, CASCADE — explicit)
	await db.delete(aiResearchChats).where(eq(aiResearchChats.userId, user.id));

	// 5. Real-money trading tables (FK → users, RESTRICT)
	await db.delete(trades).where(eq(trades.userId, user.id));
	await db.delete(holdings).where(eq(holdings.userId, user.id));
	await db.delete(wallets).where(eq(wallets.userId, user.id));

	// 6. Hard-delete the user row.
	//    Cascades automatically handle:
	//      paperWallets, paperHoldings, paperTrades, paperTradeAttempts
	//      sessionHistory, priceAlerts, riskLimits
	//    auditLogs.userId is SET NULL (preserved for compliance trail).
	await db.delete(users).where(eq(users.id, user.id));

	// 7. Delete from Clerk (after DB so we still have clerkId if DB fails)
	await ClerkService.deleteUser(clerkAuth.userId);

	return ResponseHelper.success(c, null, 'Account permanently deleted.');
});

/**
 * Get user activity log
 */
userRoutes.get(
	'/activity',
	describeRoute({
		tags: ['Users'],
		summary: 'Get activity log',
		description: 'Returns a paginated audit log of events for the authenticated user. Query params: page (default 1), limit (default 20).',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'Activity log returned' },
			401: { description: 'Not authenticated' },
		},
	}),
	requireAuth,
	async (c) => {
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
