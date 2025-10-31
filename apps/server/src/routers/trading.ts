/**
 * Example Trading Routes - Order Placement and Management
 * FSC Mauritius Compliance: Complete audit trail and validation
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
	trades,
	insertTradeSchema,
	users,
	assets,
	wallets,
	holdings,
	auditLogs,
} from '../db/schema';
import { z } from 'zod';

const app = new Hono();

// ============================================================================
// Place New Order
// ============================================================================

const placeOrderSchema = z.object({
	userId: z.string().uuid(),
	assetId: z.string().uuid(),
	orderType: z.enum(['market', 'limit', 'stop_loss', 'stop_limit', 'trailing_stop']),
	side: z.enum(['buy', 'sell']),
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/),
	limitPrice: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
	stopPrice: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
	timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']).default('day'),
});

app.post('/orders', zValidator('json', placeOrderSchema), async (c) => {
	const orderData = c.req.valid('json');
	
	// Start transaction for order placement
	const result = await db.transaction(async (tx) => {
		// 1. Verify user exists and account is active
		const user = await tx.query.users.findFirst({
			where: eq(users.id, orderData.userId),
		});
		
		if (!user) {
			throw new Error('User not found');
		}
		
		if (user.accountStatus !== 'active') {
			throw new Error('Account is not active');
		}
		
		// 2. Verify asset exists and is tradable
		const asset = await tx.query.assets.findFirst({
			where: eq(assets.id, orderData.assetId),
		});
		
		if (!asset) {
			throw new Error('Asset not found');
		}
		
		if (!asset.isTradable) {
			throw new Error('Asset is not tradable');
		}
		
		// 3. For sell orders, verify holdings
		if (orderData.side === 'sell') {
			const holding = await tx.query.holdings.findFirst({
				where: and(
					eq(holdings.userId, orderData.userId),
					eq(holdings.assetId, orderData.assetId)
				),
			});
			
			if (!holding || parseFloat(holding.quantity) < parseFloat(orderData.quantity)) {
				throw new Error('Insufficient holdings for sell order');
			}
		}
		
		// 4. For buy orders, check wallet balance (simplified - use actual currency conversion)
		if (orderData.side === 'buy') {
			const wallet = await tx.query.wallets.findFirst({
				where: and(
					eq(wallets.userId, orderData.userId),
					eq(wallets.currency, 'USD') // Assuming USD for now
				),
			});
			
			if (!wallet) {
				throw new Error('Wallet not found');
			}
			
			// Estimate order value
			const price = orderData.limitPrice || '0'; // For market orders, use current price
			const estimatedValue = parseFloat(orderData.quantity) * parseFloat(price);
			
			if (parseFloat(wallet.availableBalance) < estimatedValue) {
				throw new Error('Insufficient funds');
			}
			
			// Reserve funds
			await tx
				.update(wallets)
				.set({
					availableBalance: sql`${wallets.availableBalance} - ${estimatedValue}`,
					reservedBalance: sql`${wallets.reservedBalance} + ${estimatedValue}`,
					updatedAt: new Date(),
				})
				.where(eq(wallets.id, wallet.id));
		}
		
		// 5. Create the trade
		const [newTrade] = await tx.insert(trades).values({
			userId: orderData.userId,
			assetId: orderData.assetId,
			orderType: orderData.orderType,
			side: orderData.side,
			quantity: orderData.quantity,
			remainingQuantity: orderData.quantity,
			filledQuantity: '0',
			limitPrice: orderData.limitPrice,
			stopPrice: orderData.stopPrice,
			timeInForce: orderData.timeInForce,
			status: 'pending',
			placedAt: new Date(),
			expiresAt: orderData.timeInForce === 'day' 
				? new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
				: undefined,
		}).returning();
		
		// 6. Create audit log - FSC Mauritius Requirement
		await tx.insert(auditLogs).values({
			userId: orderData.userId,
			eventType: 'trade.placed',
			eventCategory: 'trading',
			severity: 'info',
			description: `${orderData.side.toUpperCase()} order placed for ${asset.symbol}`,
			metadata: {
				tradeId: newTrade.id,
				assetSymbol: asset.symbol,
				orderType: orderData.orderType,
				quantity: orderData.quantity,
				limitPrice: orderData.limitPrice,
				stopPrice: orderData.stopPrice,
			},
			ipAddress: c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
			userAgent: c.req.header('user-agent'),
		});
		
		return newTrade;
	});
	
	return c.json({ trade: result }, 201);
});

// ============================================================================
// Cancel Order
// ============================================================================

app.post('/orders/:orderId/cancel', async (c) => {
	const orderId = c.req.param('orderId');
	const userId = c.req.query('userId'); // In production, get from auth token
	
	const result = await db.transaction(async (tx) => {
		// Get the order
		const trade = await tx.query.trades.findFirst({
			where: eq(trades.id, orderId),
		});
		
		if (!trade) {
			throw new Error('Order not found');
		}
		
		if (trade.userId !== userId) {
			throw new Error('Unauthorized');
		}
		
		if (!['pending', 'open', 'partially_filled'].includes(trade.status)) {
			throw new Error('Order cannot be cancelled');
		}
		
		// Update order status
		const [cancelledTrade] = await tx
			.update(trades)
			.set({
				status: 'cancelled',
				cancelledAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(trades.id, orderId))
			.returning();
		
		// Release reserved funds if buy order
		if (trade.side === 'buy') {
			const wallet = await tx.query.wallets.findFirst({
				where: and(
					eq(wallets.userId, trade.userId),
					eq(wallets.currency, 'USD')
				),
			});
			
			if (wallet) {
				const reservedAmount = parseFloat(trade.quantity) * 
					(trade.limitPrice ? parseFloat(trade.limitPrice) : 0);
				
				await tx
					.update(wallets)
					.set({
						availableBalance: sql`${wallets.availableBalance} + ${reservedAmount}`,
						reservedBalance: sql`${wallets.reservedBalance} - ${reservedAmount}`,
						updatedAt: new Date(),
					})
					.where(eq(wallets.id, wallet.id));
			}
		}
		
		// Create audit log
		await tx.insert(auditLogs).values({
			userId: trade.userId,
			eventType: 'trade.cancelled',
			eventCategory: 'trading',
			severity: 'info',
			description: `Order cancelled`,
			metadata: {
				tradeId: orderId,
				originalStatus: trade.status,
			},
		});
		
		return cancelledTrade;
	});
	
	return c.json({ trade: result });
});

// ============================================================================
// Get Order Status
// ============================================================================

app.get('/orders/:orderId', async (c) => {
	const orderId = c.req.param('orderId');
	
	const trade = await db.query.trades.findFirst({
		where: eq(trades.id, orderId),
		with: {
			asset: true,
			user: {
				columns: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
				},
			},
		},
	});
	
	if (!trade) {
		return c.json({ error: 'Order not found' }, 404);
	}
	
	return c.json({ trade });
});

// ============================================================================
// Get Active Orders
// ============================================================================

app.get('/orders/active', async (c) => {
	const userId = c.req.query('userId'); // In production, get from auth token
	
	if (!userId) {
		return c.json({ error: 'User ID required' }, 400);
	}
	
	const activeTrades = await db.query.trades.findMany({
		where: and(
			eq(trades.userId, userId),
			sql`${trades.status} IN ('pending', 'open', 'partially_filled')`
		),
		with: {
			asset: true,
		},
		orderBy: [desc(trades.placedAt)],
	});
	
	return c.json({ trades: activeTrades });
});

export default app;
