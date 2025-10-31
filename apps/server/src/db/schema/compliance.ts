/**
 * Compliance Schemas - AML Checks and Risk Management
 * FSC Mauritius Compliance: Anti-Money Laundering and risk limits
 */

import { 
	pgTable, 
	uuid, 
	varchar,
	timestamp, 
	text,
	integer,
	pgEnum,
	jsonb,
	numeric,
	boolean,
	index,
	check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';
import { users } from './users';
import { assets } from './assets';

// ============================================================================
// AML Checks Table
// ============================================================================

// FSC Mauritius Requirement: Types of AML checks
export const checkTypeEnum = pgEnum('check_type', [
	'sanctions_screening', // Check against OFAC, UN, EU sanctions lists
	'pep_check', // Politically Exposed Person screening
	'adverse_media', // Negative news screening
	'transaction_monitoring', // Suspicious transaction patterns
	'source_of_funds', // Verification of fund sources
]);

// Check result classification
export const checkResultEnum = pgEnum('check_result', [
	'clear', // No issues found
	'warning', // Minor issues requiring attention
	'alert', // Significant issues requiring review
	'error', // Check failed to complete
]);

export const amlChecks = pgTable('aml_checks', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Key
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	
	// Check Details
	checkType: checkTypeEnum('check_type').notNull(),
	checkProvider: varchar('check_provider', { length: 100 }).notNull(), // ComplyAdvantage, Refinitiv, etc.
	checkResult: checkResultEnum('check_result').notNull(),
	
	// Risk Scoring - FSC Mauritius Requirement
	riskScore: integer('risk_score'), // 0-100 scale
	riskLevel: varchar('risk_level', { length: 20 }), // low, medium, high, critical
	
	// Findings
	findings: jsonb('findings').$type<{
		matches?: Array<{
			matchType: string;
			confidence: number;
			details: string;
			source: string;
		}>;
		summary?: string;
		recommendation?: string;
		[key: string]: any;
	}>(),
	
	// Provider Reference
	providerCheckId: varchar('provider_check_id', { length: 255 }),
	
	// Scheduling
	checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
	nextCheckDue: timestamp('next_check_due', { withTimezone: true }), // FSC Mauritius: Periodic re-screening required
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('aml_checks_user_id_idx').on(table.userId),
	checkResultIdx: index('aml_checks_check_result_idx').on(table.checkResult),
	checkedAtIdx: index('aml_checks_checked_at_idx').on(table.checkedAt),
	nextCheckDueIdx: index('aml_checks_next_check_due_idx').on(table.nextCheckDue),
	
	// CHECK constraint
	riskScoreRange: check('risk_score_range', sql`${table.riskScore} >= 0 AND ${table.riskScore} <= 100`),
}));

// Relations
export const amlChecksRelations = relations(amlChecks, ({ one }) => ({
	user: one(users, {
		fields: [amlChecks.userId],
		references: [users.id],
	}),
}));

// Zod Schemas
export const insertAmlCheckSchema = createInsertSchema(amlChecks, {
	checkProvider: z.string().min(1).max(100),
	riskScore: z.number().int().min(0).max(100).optional(),
	riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export const selectAmlCheckSchema = createSelectSchema(amlChecks);

// ============================================================================
// Risk Limits Table
// ============================================================================

export const riskLimits = pgTable('risk_limits', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys - Nullable for global defaults
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // User-specific limit
	assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }), // Asset-specific limit
	
	// Limit Parameters - FSC Mauritius Requirement: Position and exposure limits
	maxPositionSize: numeric('max_position_size', { precision: 20, scale: 8 }), // Max quantity of single asset
	maxDailyTradeVolume: numeric('max_daily_trade_volume', { precision: 20, scale: 8 }), // Max daily trading volume
	maxOrderValue: numeric('max_order_value', { precision: 20, scale: 8 }), // Max single order value
	leverageMultiplier: numeric('leverage_multiplier', { precision: 5, scale: 2 }), // Max leverage allowed
	
	// Status
	isActive: boolean('is_active').notNull().default(true),
	
	// Administrative
	setBy: uuid('set_by').references(() => users.id), // Admin who set the limit
	reason: text('reason'), // Reason for the limit
	
	// Validity Period
	effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
	effectiveUntil: timestamp('effective_until', { withTimezone: true }),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('risk_limits_user_id_idx').on(table.userId),
	assetIdIdx: index('risk_limits_asset_id_idx').on(table.assetId),
	isActiveIdx: index('risk_limits_is_active_idx').on(table.isActive),
	effectiveFromIdx: index('risk_limits_effective_from_idx').on(table.effectiveFrom),
	
	// CHECK constraints
	limitsPositive: check(
		'limits_positive',
		sql`(${table.maxPositionSize} IS NULL OR ${table.maxPositionSize} > 0) AND
		     (${table.maxDailyTradeVolume} IS NULL OR ${table.maxDailyTradeVolume} > 0) AND
		     (${table.maxOrderValue} IS NULL OR ${table.maxOrderValue} > 0)`
	),
	leverageValid: check(
		'leverage_valid',
		sql`${table.leverageMultiplier} IS NULL OR (${table.leverageMultiplier} >= 1 AND ${table.leverageMultiplier} <= 100)`
	),
}));

// Relations
export const riskLimitsRelations = relations(riskLimits, ({ one }) => ({
	user: one(users, {
		fields: [riskLimits.userId],
		references: [users.id],
	}),
	asset: one(assets, {
		fields: [riskLimits.assetId],
		references: [assets.id],
	}),
	admin: one(users, {
		fields: [riskLimits.setBy],
		references: [users.id],
	}),
}));

// Zod Schemas
export const insertRiskLimitSchema = createInsertSchema(riskLimits, {
	maxPositionSize: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
	maxDailyTradeVolume: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
	maxOrderValue: z.string().regex(/^\d+(\.\d{1,8})?$/).optional(),
	leverageMultiplier: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
	effectiveFrom: z.date(),
	effectiveUntil: z.date().optional(),
}).refine(
	(data) => {
		if (data.effectiveUntil) {
			return data.effectiveUntil > data.effectiveFrom;
		}
		return true;
	},
	{
		message: 'Effective until date must be after effective from date',
	}
);

export const selectRiskLimitSchema = createSelectSchema(riskLimits);

// Type inference
export type AmlCheck = typeof amlChecks.$inferSelect;
export type NewAmlCheck = typeof amlChecks.$inferInsert;
export type RiskLimit = typeof riskLimits.$inferSelect;
export type NewRiskLimit = typeof riskLimits.$inferInsert;
