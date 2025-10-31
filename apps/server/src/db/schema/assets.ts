/**
 * Assets Schema - Tradable Financial Instruments
 * FSC Mauritius Compliance: Asset classification and trading parameters
 */

import { 
	pgTable, 
	uuid, 
	varchar, 
	timestamp, 
	boolean, 
	text,
	pgEnum,
	jsonb,
	numeric,
	index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';

// Asset classification
export const assetTypeEnum = pgEnum('asset_type', [
	'stock',
	'forex',
	'crypto',
	'commodity',
	'index',
	'etf',
	'bond',
]);

// Exchange/Market identifiers
export const exchangeEnum = pgEnum('exchange', [
	'NYSE',
	'NASDAQ',
	'LSE',
	'SEM', // Stock Exchange of Mauritius
	'FOREX',
	'CRYPTO',
	'COMMODITY',
]);

export const assets = pgTable('assets', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Asset Identification
	symbol: varchar('symbol', { length: 20 }).notNull().unique(), // AAPL, EURUSD, BTC, etc.
	name: varchar('name', { length: 255 }).notNull(),
	assetType: assetTypeEnum('asset_type').notNull(),
	exchange: exchangeEnum('exchange').notNull(),
	
	// Additional Identifiers
	isin: varchar('isin', { length: 12 }), // International Securities Identification Number
	cusip: varchar('cusip', { length: 9 }), // Committee on Uniform Securities Identification Procedures
	
	// Trading Parameters
	isTradable: boolean('is_tradable').notNull().default(true),
	minOrderQuantity: numeric('min_order_quantity', { precision: 20, scale: 8 }).notNull().default('0.00000001'),
	maxOrderQuantity: numeric('max_order_quantity', { precision: 20, scale: 8 }),
	tickSize: numeric('tick_size', { precision: 20, scale: 8 }).notNull(), // Minimum price movement
	lotSize: numeric('lot_size', { precision: 20, scale: 8 }).notNull().default('1'), // Standard trading unit
	
	// Trading Hours - FSC Mauritius Requirement: Market hours must be enforced
	tradingHours: jsonb('trading_hours').$type<{
		timezone: string;
		sessions: Array<{
			day: string; // Monday, Tuesday, etc.
			open: string; // HH:MM
			close: string; // HH:MM
		}>;
		holidays: string[]; // ISO dates
	}>(),
	
	// Market Data
	description: text('description'),
	sector: varchar('sector', { length: 100 }), // For stocks
	industry: varchar('industry', { length: 100 }), // For stocks
	
	// Additional Metadata
	metadata: jsonb('metadata').$type<{
		marketCap?: number;
		country?: string;
		website?: string;
		logoUrl?: string;
		dividendYield?: number;
		peRatio?: number;
		beta?: number;
		[key: string]: any;
	}>(),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	symbolIdx: index('assets_symbol_idx').on(table.symbol),
	assetTypeIdx: index('assets_asset_type_idx').on(table.assetType),
	exchangeIdx: index('assets_exchange_idx').on(table.exchange),
	isTradableIdx: index('assets_is_tradable_idx').on(table.isTradable),
	isinIdx: index('assets_isin_idx').on(table.isin),
}));

// Relations
export const assetsRelations = relations(assets, ({ many }) => ({
	holdings: many(holdings),
	trades: many(trades),
	priceAlerts: many(priceAlerts),
	riskLimits: many(riskLimits),
}));

// Zod Schemas for validation
export const insertAssetSchema = createInsertSchema(assets, {
	symbol: z.string().min(1).max(20).toUpperCase(),
	name: z.string().min(1).max(255),
	isin: z.string().length(12).optional(),
	cusip: z.string().length(9).optional(),
	tickSize: z.string().regex(/^\d+(\.\d{1,8})?$/),
	lotSize: z.string().regex(/^\d+(\.\d{1,8})?$/),
	minOrderQuantity: z.string().regex(/^\d+(\.\d{1,8})?$/),
	maxOrderQuantity: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
});

export const selectAssetSchema = createSelectSchema(assets);

// Type inference
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

// Forward declarations for relations
declare const holdings: any;
declare const trades: any;
declare const priceAlerts: any;
declare const riskLimits: any;
