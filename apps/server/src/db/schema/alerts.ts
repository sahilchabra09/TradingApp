/**
 * Price Alerts Schema - User Notifications and Alerts
 * Feature: Price alerts and technical indicator notifications
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
import { users } from './users';
import { assets } from './assets';

// Alert type classification
export const alertTypeEnum = pgEnum('alert_type', [
	'price_above', // Price crosses above threshold
	'price_below', // Price crosses below threshold
	'percent_change', // Percentage change from reference
	'technical_indicator', // RSI, MACD, Moving Average, etc.
	'volume_spike', // Unusual volume activity
]);

export const priceAlerts = pgTable('price_alerts', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys - Cascade delete when user/asset is deleted
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
	
	// Alert Configuration
	alertType: alertTypeEnum('alert_type').notNull(),
	conditionValue: numeric('condition_value', { precision: 20, scale: 8 }).notNull(), // Price threshold or percentage
	
	// Technical Indicator Details (if applicable)
	technicalIndicator: varchar('technical_indicator', { length: 50 }), // RSI, MACD, SMA, EMA, etc.
	indicatorParameters: jsonb('indicator_parameters').$type<{
		period?: number;
		overbought?: number;
		oversold?: number;
		fastPeriod?: number;
		slowPeriod?: number;
		signalPeriod?: number;
		[key: string]: any;
	}>(),
	
	// Alert Message
	customMessage: text('custom_message'), // User-defined message
	
	// Status
	isActive: boolean('is_active').notNull().default(true),
	
	// Trigger History
	triggeredAt: timestamp('triggered_at', { withTimezone: true }),
	notificationSent: boolean('notification_sent').notNull().default(false),
	
	// Repeat Configuration
	repeatAlert: boolean('repeat_alert').notNull().default(false), // Re-activate after triggering
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('price_alerts_user_id_idx').on(table.userId),
	assetIdIdx: index('price_alerts_asset_id_idx').on(table.assetId),
	isActiveIdx: index('price_alerts_is_active_idx').on(table.isActive),
	triggeredAtIdx: index('price_alerts_triggered_at_idx').on(table.triggeredAt),
	userAssetActiveIdx: index('price_alerts_user_asset_active_idx').on(
		table.userId,
		table.assetId,
		table.isActive
	),
}));

// Relations
export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
	user: one(users, {
		fields: [priceAlerts.userId],
		references: [users.id],
	}),
	asset: one(assets, {
		fields: [priceAlerts.assetId],
		references: [assets.id],
	}),
}));

// Zod Schemas for validation
export const insertPriceAlertSchema = createInsertSchema(priceAlerts, {
	conditionValue: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid value format'),
	technicalIndicator: z.string().max(50).optional(),
	customMessage: z.string().max(500).optional(),
}).refine(
	(data) => {
		// Technical indicator alerts require indicator name
		if (data.alertType === 'technical_indicator') {
			return data.technicalIndicator !== undefined && data.technicalIndicator.length > 0;
		}
		return true;
	},
	{
		message: 'Technical indicator name is required for technical indicator alerts',
	}
);

export const selectPriceAlertSchema = createSelectSchema(priceAlerts);

// Type inference
export type PriceAlert = typeof priceAlerts.$inferSelect;
export type NewPriceAlert = typeof priceAlerts.$inferInsert;
