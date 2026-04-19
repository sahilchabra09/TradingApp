import {
	check,
	index,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	uniqueIndex,
	varchar,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

export const paperTradeSideEnum = pgEnum('demo_trade_side', ['buy', 'sell']);
export const paperTradeAttemptReasonEnum = pgEnum('demo_trade_attempt_reason', [
	'kyc_not_approved',
	'demo_account_missing',
	'insufficient_balance',
	'insufficient_quantity',
	'validation_failed',
]);

export const paperInstruments = pgTable(
	'demo_instruments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		symbol: varchar('symbol', { length: 32 }).notNull().unique(),
		providerId: varchar('conid', { length: 64 }).notNull(),
		name: varchar('name', { length: 255 }),
		exchange: varchar('exchange', { length: 64 }).notNull(),
		currency: varchar('currency', { length: 8 }),
		lastPrice: numeric('last_price', { precision: 20, scale: 8 }),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		symbolIdx: index('demo_instruments_symbol_idx').on(table.symbol),
		conidIdx: index('demo_instruments_conid_idx').on(table.providerId),
	})
);

export const paperWallets = pgTable(
	'demo_wallets',
	{
		userId: uuid('user_id')
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),
		balance: numeric('balance', { precision: 20, scale: 8 })
			.notNull()
			.default('100000.00'),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		balancePositive: check('demo_wallets_balance_positive', sql`${table.balance} >= 0`),
		updatedAtIdx: index('demo_wallets_updated_at_idx').on(table.updatedAt),
	})
);

export const paperHoldings = pgTable(
	'demo_holdings',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		symbol: varchar('symbol', { length: 32 }).notNull(),
		instrumentId: uuid('instrument_id')
			.notNull()
			.references(() => paperInstruments.id, { onDelete: 'restrict' }),
		quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
		avgPrice: numeric('avg_price', { precision: 20, scale: 8 }).notNull(),
	},
	(table) => ({
		userSymbolUnique: uniqueIndex('demo_holdings_user_symbol_unique').on(
			table.userId,
			table.symbol
		),
		userIdIdx: index('demo_holdings_user_id_idx').on(table.userId),
		symbolIdx: index('demo_holdings_symbol_idx').on(table.symbol),
		instrumentIdx: index('demo_holdings_instrument_id_idx').on(table.instrumentId),
		quantityPositive: check('demo_holdings_quantity_positive', sql`${table.quantity} > 0`),
		avgPricePositive: check('demo_holdings_avg_price_positive', sql`${table.avgPrice} >= 0`),
	})
);

export const paperTrades = pgTable(
	'demo_trades',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		symbol: varchar('symbol', { length: 32 }).notNull(),
		instrumentId: uuid('instrument_id')
			.notNull()
			.references(() => paperInstruments.id, { onDelete: 'restrict' }),
		side: paperTradeSideEnum('side').notNull(),
		quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
		price: numeric('price', { precision: 20, scale: 8 }).notNull(),
		timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userTimestampIdx: index('demo_trades_user_timestamp_idx').on(table.userId, table.timestamp),
		symbolIdx: index('demo_trades_symbol_idx').on(table.symbol),
		instrumentIdx: index('demo_trades_instrument_id_idx').on(table.instrumentId),
		quantityPositive: check('demo_trades_quantity_positive', sql`${table.quantity} > 0`),
		pricePositive: check('demo_trades_price_positive', sql`${table.price} > 0`),
	})
);

export const paperTradeAttempts = pgTable(
	'demo_trade_attempts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		symbol: varchar('symbol', { length: 32 }).notNull(),
		side: paperTradeSideEnum('side').notNull(),
		quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
		reason: paperTradeAttemptReasonEnum('reason').notNull(),
		details: text('details'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		userCreatedAtIdx: index('demo_trade_attempts_user_created_at_idx').on(
			table.userId,
			table.createdAt
		),
		reasonIdx: index('demo_trade_attempts_reason_idx').on(table.reason),
		quantityPositive: check('demo_trade_attempts_quantity_positive', sql`${table.quantity} > 0`),
	})
);

export const paperInstrumentsRelations = relations(paperInstruments, ({ many }) => ({
	holdings: many(paperHoldings),
	trades: many(paperTrades),
}));

export const paperWalletsRelations = relations(paperWallets, ({ one }) => ({
	user: one(users, {
		fields: [paperWallets.userId],
		references: [users.id],
	}),
}));

export const paperHoldingsRelations = relations(paperHoldings, ({ one }) => ({
	user: one(users, {
		fields: [paperHoldings.userId],
		references: [users.id],
	}),
	instrument: one(paperInstruments, {
		fields: [paperHoldings.instrumentId],
		references: [paperInstruments.id],
	}),
}));

export const paperTradesRelations = relations(paperTrades, ({ one }) => ({
	user: one(users, {
		fields: [paperTrades.userId],
		references: [users.id],
	}),
	instrument: one(paperInstruments, {
		fields: [paperTrades.instrumentId],
		references: [paperInstruments.id],
	}),
}));

export const paperTradeAttemptsRelations = relations(paperTradeAttempts, ({ one }) => ({
	user: one(users, {
		fields: [paperTradeAttempts.userId],
		references: [users.id],
	}),
}));

export const insertPaperWalletSchema = createInsertSchema(paperWallets, {
	balance: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid balance format'),
});
export const selectPaperWalletSchema = createSelectSchema(paperWallets);

export const insertPaperInstrumentSchema = createInsertSchema(paperInstruments, {
	symbol: z.string().min(1).max(32),
	providerId: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
	exchange: z.string().min(1).max(64),
	currency: z.string().max(8).optional(),
	lastPrice: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format').optional(),
});
export const selectPaperInstrumentSchema = createSelectSchema(paperInstruments);

export const insertPaperHoldingSchema = createInsertSchema(paperHoldings, {
	symbol: z.string().min(1).max(32),
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid quantity format'),
	avgPrice: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format'),
});
export const selectPaperHoldingSchema = createSelectSchema(paperHoldings);

export const insertPaperTradeSchema = createInsertSchema(paperTrades, {
	symbol: z.string().min(1).max(32),
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid quantity format'),
	price: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid price format'),
});
export const selectPaperTradeSchema = createSelectSchema(paperTrades);

export const insertPaperTradeAttemptSchema = createInsertSchema(paperTradeAttempts, {
	symbol: z.string().min(1).max(32),
	quantity: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid quantity format'),
	details: z.string().max(1000).optional(),
});
export const selectPaperTradeAttemptSchema = createSelectSchema(paperTradeAttempts);

export type PaperWallet = typeof paperWallets.$inferSelect;
export type NewPaperWallet = typeof paperWallets.$inferInsert;
export type PaperInstrument = typeof paperInstruments.$inferSelect;
export type NewPaperInstrument = typeof paperInstruments.$inferInsert;
export type PaperHolding = typeof paperHoldings.$inferSelect;
export type NewPaperHolding = typeof paperHoldings.$inferInsert;
export type PaperTrade = typeof paperTrades.$inferSelect;
export type NewPaperTrade = typeof paperTrades.$inferInsert;
export type PaperTradeAttempt = typeof paperTradeAttempts.$inferSelect;
export type NewPaperTradeAttempt = typeof paperTradeAttempts.$inferInsert;
