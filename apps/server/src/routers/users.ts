/**
 * Example User Routes - Hono Integration with Drizzle ORM
 * Demonstrates CRUD operations and validation
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
	users, 
	insertUserSchema, 
	publicUserSchema,
	wallets,
	holdings,
	trades,
} from '../db/schema';
import { z } from 'zod';

const app = new Hono();

// ============================================================================
// User Registration
// ============================================================================

const registerSchema = insertUserSchema.pick({
	email: true,
	firstName: true,
	lastName: true,
	phoneNumber: true,
	dateOfBirth: true,
	nationality: true,
	residentialAddress: true,
}).extend({
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

app.post('/register', zValidator('json', registerSchema), async (c) => {
	const data = c.req.valid('json');
	
	// Hash password (example - use bcrypt in production)
	const passwordHash = data.password; // TODO: Hash with bcrypt
	
	try {
		const [newUser] = await db.insert(users).values({
			...data,
			passwordHash,
			accountStatus: 'pending_kyc',
			kycStatus: 'not_started',
		}).returning();
		
		// Return public user data (excludes sensitive fields)
		const safeUser = publicUserSchema.parse(newUser);
		
		return c.json({ user: safeUser }, 201);
	} catch (error: any) {
		if (error.code === '23505') { // Unique violation
			return c.json({ error: 'Email already exists' }, 409);
		}
		throw error;
	}
});

// ============================================================================
// Get User Profile with Relations
// ============================================================================

app.get('/:id', async (c) => {
	const id = c.req.param('id');
	
	// Drizzle relational query API
	const user = await db.query.users.findFirst({
		where: eq(users.id, id),
		with: {
			wallets: true,
			holdings: {
				with: {
					asset: true,
				},
			},
		},
	});
	
	if (!user) {
		return c.json({ error: 'User not found' }, 404);
	}
	
	// Remove sensitive fields
	const safeUser = publicUserSchema.parse(user);
	
	return c.json({ user: safeUser });
});

// ============================================================================
// Update User Profile
// ============================================================================

const updateUserSchema = z.object({
	firstName: z.string().min(1).max(100).optional(),
	lastName: z.string().min(1).max(100).optional(),
	phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
	residentialAddress: z.object({
		street: z.string(),
		city: z.string(),
		state: z.string().optional(),
		country: z.string(),
		postalCode: z.string(),
	}).optional(),
});

app.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
	const id = c.req.param('id');
	const data = c.req.valid('json');
	
	const [updatedUser] = await db
		.update(users)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(eq(users.id, id))
		.returning();
	
	if (!updatedUser) {
		return c.json({ error: 'User not found' }, 404);
	}
	
	const safeUser = publicUserSchema.parse(updatedUser);
	return c.json({ user: safeUser });
});

// ============================================================================
// Get User Portfolio
// ============================================================================

app.get('/:id/portfolio', async (c) => {
	const id = c.req.param('id');
	
	// Get all holdings with asset details
	const userHoldings = await db.query.holdings.findMany({
		where: eq(holdings.userId, id),
		with: {
			asset: true,
		},
		orderBy: [desc(holdings.currentValue)],
	});
	
	// Get all wallets
	const userWallets = await db.query.wallets.findMany({
		where: eq(wallets.userId, id),
	});
	
	// Calculate total portfolio value
	const totalInvested = userHoldings.reduce(
		(sum, h) => sum + parseFloat(h.totalInvested),
		0
	);
	const totalCurrentValue = userHoldings.reduce(
		(sum, h) => sum + parseFloat(h.currentValue),
		0
	);
	const totalUnrealizedPnl = userHoldings.reduce(
		(sum, h) => sum + parseFloat(h.unrealizedPnl),
		0
	);
	
	return c.json({
		holdings: userHoldings,
		wallets: userWallets,
		summary: {
			totalInvested,
			totalCurrentValue,
			totalUnrealizedPnl,
			returnPercentage: totalInvested > 0 
				? ((totalCurrentValue - totalInvested) / totalInvested) * 100 
				: 0,
		},
	});
});

// ============================================================================
// Get User Trade History
// ============================================================================

app.get('/:id/trades', async (c) => {
	const id = c.req.param('id');
	const status = c.req.query('status'); // Optional filter
	const limit = parseInt(c.req.query('limit') || '50');
	const offset = parseInt(c.req.query('offset') || '0');
	
	let whereCondition = eq(trades.userId, id);
	
	if (status) {
		whereCondition = and(
			whereCondition,
			eq(trades.status, status as any)
		)!;
	}
	
	const userTrades = await db.query.trades.findMany({
		where: whereCondition,
		with: {
			asset: true,
		},
		orderBy: [desc(trades.placedAt)],
		limit,
		offset,
	});
	
	return c.json({ trades: userTrades });
});

export default app;
