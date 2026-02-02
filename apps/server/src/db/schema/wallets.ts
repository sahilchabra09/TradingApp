/**
 * Wallets Schema - Multi-Currency Wallet Management
 * FSC Mauritius Compliance: Segregated client money accounts and balance tracking
 */

import { 
	pgTable, 
	uuid, 
	varchar, 
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
import { withdrawalRequests, depositTransactions } from './payments';

export const wallets = pgTable('wallets', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Key
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	
	// Currency - ISO 4217
	currency: varchar('currency', { length: 3 }).notNull(), // USD, EUR, MUR, etc.
	
	// Balance Tracking - FSC Mauritius Requirement: Accurate client money tracking
	// Using numeric(20, 8) for precise decimal arithmetic (no floating point errors)
	availableBalance: numeric('available_balance', { precision: 20, scale: 8 }).notNull().default('0'),
	reservedBalance: numeric('reserved_balance', { precision: 20, scale: 8 }).notNull().default('0'), // Locked for pending orders
	totalBalance: numeric('total_balance', { precision: 20, scale: 8 }).notNull().default('0'), // available + reserved
	
	// Activity Tracking
	lastTransactionAt: timestamp('last_transaction_at', { withTimezone: true }),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	// FSC Mauritius Requirement: One wallet per currency per user
	userCurrencyUnique: uniqueIndex('wallets_user_currency_unique').on(table.userId, table.currency),
	
	// Indexes for query optimization
	userIdIdx: index('wallets_user_id_idx').on(table.userId),
	currencyIdx: index('wallets_currency_idx').on(table.currency),
	
	// CHECK constraints for data integrity
	availableBalanceCheck: check('available_balance_positive', sql`${table.availableBalance} >= 0`),
	reservedBalanceCheck: check('reserved_balance_positive', sql`${table.reservedBalance} >= 0`),
	totalBalanceCheck: check('total_balance_positive', sql`${table.totalBalance} >= 0`),
	// Ensure total = available + reserved
	totalBalanceConsistency: check(
		'total_balance_consistency',
		sql`${table.totalBalance} = ${table.availableBalance} + ${table.reservedBalance}`
	),
}));

// Relations
export const walletsRelations = relations(wallets, ({ one, many }) => ({
	user: one(users, {
		fields: [wallets.userId],
		references: [users.id],
	}),
	withdrawalRequests: many(withdrawalRequests),
	depositTransactions: many(depositTransactions),
}));

// Zod Schemas for validation
export const insertWalletSchema = createInsertSchema(wallets, {
	currency: z.string().length(3, 'Currency must be ISO 4217 code').toUpperCase(),
	availableBalance: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid balance format'),
	reservedBalance: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid balance format'),
	totalBalance: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid balance format'),
});

export const selectWalletSchema = createSelectSchema(wallets);

// Type inference
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

// Forward declarations for relations
declare const withdrawalRequests: any;
declare const depositTransactions: any;
