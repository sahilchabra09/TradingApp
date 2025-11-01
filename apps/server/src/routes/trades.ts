/**
 * Trading Routes - Example Implementation
 * Handles order placement, cancellation, and history
 * FSC Mauritius Compliance: Complete audit trail and trading hours enforcement
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { trades, wallets, assets, auditLogs } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, requireKYC } from '../middleware/clerk-auth';
import { enforceTradingHours } from '../middleware/trading-hours';
import { ResponseHelper, calculatePagination } from '../utils/response';
import { 
	orderSideSchema, 
	orderTypeSchema, 
	timeInForceSchema,
	positiveDecimalSchema,
	uuidSchema,
	paginationSchema 
} from '../utils/validators';
import { InsufficientBalanceError, NotFoundError, ValidationError } from '../types/api';

const tradeRoutes = new Hono();

// Order placement schema
const placeOrderSchema = z.object({
	assetId: uuidSchema,
	side: orderSideSchema,
	orderType: orderTypeSchema,
	quantity: positiveDecimalSchema,
	limitPrice: z.string().optional().transform(val => val ? parseFloat(val) : null),
	stopPrice: z.string().optional().transform(val => val ? parseFloat(val) : null),
	timeInForce: timeInForceSchema.default('day'),
});

/**
 * Place new order
 * Requires: Auth + KYC + Trading Hours
 * FSC Mauritius: Full audit trail
 */
tradeRoutes.post(
	'/order',
	requireAuth,
	requireKYC,
	enforceTradingHours,
	zValidator('json', placeOrderSchema),
	async (c) => {
		const user = c.get('user');
		const orderData = c.req.valid('json');

		try {
		// 1. Validate asset exists and is tradable
		const asset = await db.query.assets.findFirst({
			where: (assets, { eq }) => eq(assets.id, orderData.assetId),
		});

		if (!asset) {
			throw new NotFoundError('Asset not found or not available for trading');
		}			// 2. Validate order type specific requirements
			if (orderData.orderType === 'limit' && !orderData.limitPrice) {
				throw new ValidationError('Limit price is required for limit orders');
			}

			if (
				(orderData.orderType === 'stop' || orderData.orderType === 'stop_limit') &&
				!orderData.stopPrice
			) {
				throw new ValidationError('Stop price is required for stop orders');
			}

		// 3. Calculate order value (use a placeholder price for market orders)
		const orderValue =
			orderData.side === 'buy'
				? orderData.quantity *
				  (orderData.orderType === 'market' 
						? 100.0 // Placeholder - should fetch from market data API
						: orderData.limitPrice!)
				: 0; // For sell orders, we check holdings instead

		// 4. Check user balance (for buy orders)
		if (orderData.side === 'buy') {
			const userWallet = await db.query.wallets.findFirst({
				where: (wallets, { eq, and }) =>
					and(eq(wallets.userId, user.id), eq(wallets.currency, 'USD')),
			});				if (!userWallet) {
					throw new ValidationError('No wallet found for this currency');
				}

				const availableBalance = parseFloat(userWallet.availableBalance);
				if (availableBalance < orderValue) {
					throw new InsufficientBalanceError(
						orderValue.toFixed(2),
						availableBalance.toFixed(2),
						'Insufficient balance to place order'
					);
				}

				// Reserve funds
				await db
					.update(wallets)
					.set({
						availableBalance: (availableBalance - orderValue).toString(),
						reservedBalance: (
							parseFloat(userWallet.reservedBalance) + orderValue
						).toString(),
					})
					.where(eq(wallets.id, userWallet.id));
			}

			// 5. Check holdings (for sell orders)
			if (orderData.side === 'sell') {
				const holding = await db.query.holdings.findFirst({
					where: (holdings, { eq, and }) =>
						and(eq(holdings.userId, user.id), eq(holdings.assetId, orderData.assetId)),
				});

				if (!holding || parseFloat(holding.quantity) < orderData.quantity) {
					throw new ValidationError('Insufficient holdings to sell');
				}
			}

		// 6. Create order in database
		const [order] = await db
			.insert(trades)
			.values({
				userId: user.id,
				assetId: orderData.assetId,
				orderType: orderData.orderType === 'stop' ? 'stop_loss' : orderData.orderType as any,
				side: orderData.side,
				quantity: orderData.quantity.toString(),
				remainingQuantity: orderData.quantity.toString(),
				limitPrice: orderData.limitPrice?.toString() || null,
				stopPrice: orderData.stopPrice?.toString() || null,
				timeInForce: orderData.timeInForce,
				status: orderData.orderType === 'market' ? 'filled' : 'pending',
				filledQuantity: orderData.orderType === 'market' ? orderData.quantity.toString() : '0',
				executedAt: orderData.orderType === 'market' ? new Date() : null,
			})
			.returning();			// 7. Create audit log
			await db.insert(auditLogs).values({
				userId: user.id,
				eventType: 'order_placed',
				eventCategory: 'trading',
				description: `${orderData.side.toUpperCase()} order placed for ${orderData.quantity} ${asset.symbol}`,
				metadata: {
					orderId: order.id,
					assetSymbol: asset.symbol,
					orderType: orderData.orderType,
					side: orderData.side,
					quantity: orderData.quantity,
					limitPrice: orderData.limitPrice,
				},
				severity: 'info',
			});

			// 8. Return success response
			return ResponseHelper.created(c, order, 'Order placed successfully');
		} catch (error) {
			if (
				error instanceof InsufficientBalanceError ||
				error instanceof NotFoundError ||
				error instanceof ValidationError
			) {
				throw error;
			}
			console.error('Order placement error:', error);
			throw error;
		}
	}
);

/**
 * Get order history
 * Supports filtering and pagination
 */
tradeRoutes.get(
	'/orders',
	requireAuth,
	requireKYC,
	zValidator('query', paginationSchema.extend({
		status: z.enum(['pending', 'filled', 'partially_filled', 'cancelled', 'rejected']).optional(),
		side: orderSideSchema.optional(),
		assetId: uuidSchema.optional(),
	})),
	async (c) => {
		const user = c.get('user');
		const { page, limit, status, side, assetId } = c.req.valid('query');

		const offset = (page - 1) * limit;

		// Build where conditions
		const conditions = [eq(trades.userId, user.id)];
		if (status) conditions.push(eq(trades.status, status));
		if (side) conditions.push(eq(trades.side, side));
		if (assetId) conditions.push(eq(trades.assetId, assetId));

		// Get orders with pagination
		const orders = await db.query.trades.findMany({
			where: (trades) => and(...conditions),
			orderBy: [desc(trades.createdAt)],
			limit,
			offset,
			with: {
				asset: true, // Include asset details
			},
		});

		// Get total count
		const totalOrders = await db.query.trades.findMany({
			where: (trades) => and(...conditions),
		});

		const pagination = calculatePagination(page, limit, totalOrders.length);

		return ResponseHelper.paginated(c, orders, pagination);
	}
);

/**
 * Get specific order details
 */
tradeRoutes.get(
	'/orders/:id',
	requireAuth,
	requireKYC,
	async (c) => {
		const user = c.get('user');
		const orderId = c.req.param('id');

		const order = await db.query.trades.findFirst({
			where: (trades, { eq, and }) =>
				and(eq(trades.id, orderId), eq(trades.userId, user.id)),
			with: {
				asset: true,
			},
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		return ResponseHelper.success(c, order);
	}
);

/**
 * Cancel pending order
 * FSC Mauritius: Requires audit logging
 */
tradeRoutes.delete(
	'/orders/:id',
	requireAuth,
	requireKYC,
	async (c) => {
		const user = c.get('user');
		const orderId = c.req.param('id');

		// Get order
		const order = await db.query.trades.findFirst({
			where: (trades, { eq, and }) =>
				and(eq(trades.id, orderId), eq(trades.userId, user.id)),
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		// Check if order can be cancelled
		if (order.status !== 'pending' && order.status !== 'partially_filled') {
			throw new ValidationError('Only pending or partially filled orders can be cancelled');
		}

		// Update order status
		await db
			.update(trades)
			.set({
				status: 'cancelled',
				cancelledAt: new Date(),
			})
			.where(eq(trades.id, orderId));

	// Release reserved funds (for buy orders)
	if (order.side === 'buy') {
		const remainingQuantity = parseFloat(order.quantity) - parseFloat(order.filledQuantity);
		const remainingValue =
			remainingQuantity * (parseFloat(order.limitPrice || '0'));

		const wallet = await db.query.wallets.findFirst({
			where: (wallets, { eq, and }) =>
				and(eq(wallets.userId, user.id), eq(wallets.currency, 'USD')), // Adjust currency
		});			if (wallet) {
				await db
					.update(wallets)
					.set({
						availableBalance: (
							parseFloat(wallet.availableBalance) + remainingValue
						).toString(),
						reservedBalance: (
							parseFloat(wallet.reservedBalance) - remainingValue
						).toString(),
					})
					.where(eq(wallets.id, wallet.id));
			}
		}

		// Create audit log
		await db.insert(auditLogs).values({
			userId: user.id,
			eventType: 'order_cancelled',
			eventCategory: 'trading',
			description: `Order ${orderId} cancelled`,
			metadata: {
				orderId: order.id,
				side: order.side,
				quantity: order.quantity,
				filledQuantity: order.filledQuantity,
			},
			severity: 'info',
		});

		return ResponseHelper.success(c, null, 'Order cancelled successfully');
	}
);

/**
 * Get trade statistics
 */
tradeRoutes.get(
	'/stats',
	requireAuth,
	requireKYC,
	async (c) => {
		const user = c.get('user');

		// Get all user trades
		const userTrades = await db.query.trades.findMany({
			where: (trades, { eq }) => eq(trades.userId, user.id),
		});

		// Calculate statistics
		const stats = {
			totalOrders: userTrades.length,
			filledOrders: userTrades.filter((t) => t.status === 'filled').length,
			pendingOrders: userTrades.filter((t) => t.status === 'pending').length,
			cancelledOrders: userTrades.filter((t) => t.status === 'cancelled').length,
			totalBuyOrders: userTrades.filter((t) => t.side === 'buy').length,
		totalSellOrders: userTrades.filter((t) => t.side === 'sell').length,
		totalVolume: userTrades
			.filter((t) => t.status === 'filled')
			.reduce((sum, t) => sum + parseFloat(t.quantity) * parseFloat(t.averageExecutionPrice || t.limitPrice || '0'), 0)
			.toFixed(2),
	};

	return ResponseHelper.success(c, stats);
}
);export default tradeRoutes;
