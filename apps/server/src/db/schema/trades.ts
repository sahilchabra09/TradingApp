/**
 * Trades Schema - Order Management and Execution
 * FSC Mauritius Compliance: Complete audit trail of all trading activity
 * CRITICAL: Trades must be immutable once placed for regulatory compliance
 */

import { 
	pgTable, 
	uuid, 
	varchar,
	timestamp, 
	numeric,
	pgEnum,
	text,
	index,
	check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';
import { users } from './users';
import { assets } from './assets';

// Order type classification
export const orderTypeEnum = pgEnum('order_type', [
	'market',
	'limit',
	'stop_loss',
	'stop_limit',
	'trailing_stop',
]);

// Buy or Sell
export const sideEnum = pgEnum('side', [
	'buy',
	'sell',
]);

// Order execution status
export const orderStatusEnum = pgEnum('order_status', [
	'pending',
	'open',
	'partially_filled',
	'filled',
	'cancelled',
	'rejected',
	'expired',
]);

// Time in force
export const timeInForceEnum = pgEnum('time_in_force', [
	'day', // Good for day
	'gtc', // Good till cancelled
	'ioc', // Immediate or cancel
	'fok', // Fill or kill
]);

export const trades = pgTable('trades', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
	
	// Order Details
	orderType: orderTypeEnum('order_type').notNull(),
	side: sideEnum('side').notNull(),
	status: orderStatusEnum('status').notNull().default('pending'),
	timeInForce: timeInForceEnum('time_in_force').notNull().default('day'),
	
	// Quantity - FSC Mauritius Requirement: Precise quantity tracking
	quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
	filledQuantity: numeric('filled_quantity', { precision: 20, scale: 8 }).notNull().default('0'),
	remainingQuantity: numeric('remaining_quantity', { precision: 20, scale: 8 }).notNull(),
	
	// Pricing - All monetary values use numeric(20, 8)
	limitPrice: numeric('limit_price', { precision: 20, scale: 8 }), // For limit orders
	stopPrice: numeric('stop_price', { precision: 20, scale: 8 }), // For stop orders
	averageExecutionPrice: numeric('average_execution_price', { precision: 20, scale: 8 }), // Actual execution price
	
	// Financial Calculations
	totalValue: numeric('total_value', { precision: 20, scale: 8 }).notNull().default('0'), // Total trade value
	commission: numeric('commission', { precision: 20, scale: 8 }).notNull().default('0'),
	fees: numeric('fees', { precision: 20, scale: 8 }).notNull().default('0'), // Exchange fees, regulatory fees
	netAmount: numeric('net_amount', { precision: 20, scale: 8 }).notNull().default('0'), // Total including fees
	
	// External References
	brokerOrderId: varchar('broker_order_id', { length: 100 }), // Reference from execution broker
	exchangeOrderId: varchar('exchange_order_id', { length: 100 }), // Reference from exchange
	
	// Rejection Details
	rejectionReason: text('rejection_reason'),
	
	// Timestamps - FSC Mauritius Requirement: Complete timeline tracking
	placedAt: timestamp('placed_at', { withTimezone: true }).notNull().defaultNow(),
	executedAt: timestamp('executed_at', { withTimezone: true }),
	cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	
	// Standard timestamps
	...timestamps,
}, (table) => ({
	// Composite indexes for efficient queries
	userStatusPlacedIdx: index('trades_user_status_placed_idx').on(
		table.userId, 
		table.status, 
		table.placedAt
	),
	userAssetIdx: index('trades_user_asset_idx').on(table.userId, table.assetId),
	
	// Individual indexes
	assetIdIdx: index('trades_asset_id_idx').on(table.assetId),
	statusIdx: index('trades_status_idx').on(table.status),
	sideIdx: index('trades_side_idx').on(table.side),
	placedAtIdx: index('trades_placed_at_idx').on(table.placedAt),
	executedAtIdx: index('trades_executed_at_idx').on(table.executedAt),
	
	// CHECK constraints
	quantityPositive: check('quantity_positive', sql`${table.quantity} > 0`),
	filledQuantityValid: check(
		'filled_quantity_valid', 
		sql`${table.filledQuantity} >= 0 AND ${table.filledQuantity} <= ${table.quantity}`
	),
	remainingQuantityValid: check(
		'remaining_quantity_valid',
		sql`${table.remainingQuantity} = ${table.quantity} - ${table.filledQuantity}`
	),
	pricesPositive: check(
		'prices_positive',
		sql`(${table.limitPrice} IS NULL OR ${table.limitPrice} > 0) AND 
		     (${table.stopPrice} IS NULL OR ${table.stopPrice} > 0) AND
		     (${table.averageExecutionPrice} IS NULL OR ${table.averageExecutionPrice} > 0)`
	),
}));

// Relations
export const tradesRelations = relations(trades, ({ one }) => ({
	user: one(users, {
		fields: [trades.userId],
		references: [users.id],
	}),
	asset: one(assets, {
		fields: [trades.assetId],
		references: [assets.id],
	}),
}));

// Zod Schemas for validation
export const insertTradeSchema = createInsertSchema(trades, {
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid quantity format'),
	limitPrice: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format').optional(),
	stopPrice: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format').optional(),
	commission: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
	fees: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
}).refine(
	(data) => {
		// Market orders don't need limit price
		if (data.orderType === 'market') return true;
		// Limit and stop-limit orders require limit price
		if (data.orderType === 'limit' || data.orderType === 'stop_limit') {
			return data.limitPrice !== undefined;
		}
		// Stop loss orders require stop price
		if (data.orderType === 'stop_loss') {
			return data.stopPrice !== undefined;
		}
		return true;
	},
	{
		message: 'Invalid price configuration for order type',
	}
);

export const selectTradeSchema = createSelectSchema(trades);

// Type inference
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

// Status type for application logic
export type OrderStatus = typeof orderStatusEnum.enumValues[number];
export type OrderType = typeof orderTypeEnum.enumValues[number];
export type Side = typeof sideEnum.enumValues[number];
export type TimeInForce = typeof timeInForceEnum.enumValues[number];
