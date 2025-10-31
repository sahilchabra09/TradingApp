/**
 * Holdings Schema - User Portfolio Positions
 * FSC Mauritius Compliance: Accurate position tracking and P&L calculation
 */

import { 
	pgTable, 
	uuid, 
	timestamp, 
	numeric,
	index,
	uniqueIndex,
	check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';
import { users } from './users';
import { assets } from './assets';

export const holdings = pgTable('holdings', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'restrict' }),
	
	// Position Details - FSC Mauritius Requirement: Precise position tracking
	// Using numeric(20, 8) for accurate decimal calculations
	quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
	averagePurchasePrice: numeric('average_purchase_price', { precision: 20, scale: 8 }).notNull(),
	
	// Financial Tracking
	totalInvested: numeric('total_invested', { precision: 20, scale: 8 }).notNull(), // Total cost basis
	currentValue: numeric('current_value', { precision: 20, scale: 8 }).notNull(), // Current market value
	unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).notNull().default('0'), // Current profit/loss
	realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).notNull().default('0'), // Total realized P&L from closed positions
	
	// Activity Tracking
	lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	// FSC Mauritius Requirement: One holding per asset per user
	userAssetUnique: uniqueIndex('holdings_user_asset_unique').on(table.userId, table.assetId),
	
	// Indexes for query optimization
	userIdIdx: index('holdings_user_id_idx').on(table.userId),
	assetIdIdx: index('holdings_asset_id_idx').on(table.assetId),
	lastUpdatedIdx: index('holdings_last_updated_idx').on(table.lastUpdatedAt),
	
	// CHECK constraints for data integrity
	// FSC Mauritius Requirement: Holdings quantity must be positive (no negative positions for retail)
	quantityPositive: check('quantity_positive', sql`${table.quantity} > 0`),
	averagePricePositive: check('average_price_positive', sql`${table.averagePurchasePrice} >= 0`),
	totalInvestedPositive: check('total_invested_positive', sql`${table.totalInvested} >= 0`),
}));

// Relations
export const holdingsRelations = relations(holdings, ({ one }) => ({
	user: one(users, {
		fields: [holdings.userId],
		references: [users.id],
	}),
	asset: one(assets, {
		fields: [holdings.assetId],
		references: [assets.id],
	}),
}));

// Zod Schemas for validation
export const insertHoldingSchema = createInsertSchema(holdings, {
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid quantity format'),
	averagePurchasePrice: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format'),
	totalInvested: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
	currentValue: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
	unrealizedPnl: z.string().regex(/^-?\d+(\.\d{1,8})?$/, 'Invalid P&L format'),
	realizedPnl: z.string().regex(/^-?\d+(\.\d{1,8})?$/, 'Invalid P&L format'),
});

export const selectHoldingSchema = createSelectSchema(holdings);

// Type inference
export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
