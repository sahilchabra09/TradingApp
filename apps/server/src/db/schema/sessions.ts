/**
 * Session History Schema - User Session Tracking
 * FSC Mauritius Compliance: Security monitoring and audit trail
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
	index,
	inet,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

// Login method tracking
export const loginMethodEnum = pgEnum('login_method', [
	'password',
	'social_oauth', // Google, Apple, etc.
	'biometric', // Face ID, Touch ID
	'2fa', // Two-factor authentication
	'sso', // Single Sign-On
]);

export const sessionHistory = pgTable('session_history', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Key
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	
	// Session Token - FSC Mauritius Requirement: NEVER store raw tokens
	sessionTokenHash: varchar('session_token_hash', { length: 255 }).notNull().unique(), // SHA-256 hash
	
	// Authentication Details
	loginMethod: loginMethodEnum('login_method').notNull(),
	
	// Device Information
	deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
	deviceName: varchar('device_name', { length: 255 }), // iPhone 15 Pro, Samsung Galaxy S24, etc.
	deviceType: varchar('device_type', { length: 50 }), // mobile, desktop, tablet
	osName: varchar('os_name', { length: 100 }), // iOS, Android, Windows, macOS
	osVersion: varchar('os_version', { length: 50 }),
	appVersion: varchar('app_version', { length: 50 }),
	userAgent: text('user_agent'),
	
	// Network Information
	ipAddress: inet('ip_address').notNull(),
	
	// Geolocation - FSC Mauritius Requirement: Track login locations
	location: jsonb('location').$type<{
		country?: string;
		countryCode?: string;
		city?: string;
		region?: string;
		latitude?: number;
		longitude?: number;
		timezone?: string;
	}>(),
	
	// Session Status
	isActive: boolean('is_active').notNull().default(true),
	
	// Activity Tracking
	lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
	loggedInAt: timestamp('logged_in_at', { withTimezone: true }).notNull().defaultNow(),
	loggedOutAt: timestamp('logged_out_at', { withTimezone: true }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
	userIdIdx: index('session_history_user_id_idx').on(table.userId),
	isActiveIdx: index('session_history_is_active_idx').on(table.isActive),
	loggedInAtIdx: index('session_history_logged_in_at_idx').on(table.loggedInAt),
	ipAddressIdx: index('session_history_ip_address_idx').on(table.ipAddress),
	expiresAtIdx: index('session_history_expires_at_idx').on(table.expiresAt),
	sessionTokenHashIdx: index('session_history_token_hash_idx').on(table.sessionTokenHash),
}));

// Relations
export const sessionHistoryRelations = relations(sessionHistory, ({ one }) => ({
	user: one(users, {
		fields: [sessionHistory.userId],
		references: [users.id],
	}),
}));

// Zod Schemas for validation
export const insertSessionHistorySchema = createInsertSchema(sessionHistory, {
	sessionTokenHash: z.string().length(64, 'Session token hash must be SHA-256 (64 characters)'),
	deviceType: z.enum(['mobile', 'desktop', 'tablet', 'unknown']).optional(),
	appVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'App version must be in format X.Y.Z').optional(),
	expiresAt: z.date().min(new Date(), 'Expiry date must be in the future'),
});

export const selectSessionHistorySchema = createSelectSchema(sessionHistory);

// Safe schema (excludes session token hash)
export const safeSessionHistorySchema = selectSessionHistorySchema.omit({
	sessionTokenHash: true,
});

// Type inference
export type SessionHistory = typeof sessionHistory.$inferSelect;
export type NewSessionHistory = typeof sessionHistory.$inferInsert;
export type SafeSessionHistory = z.infer<typeof safeSessionHistorySchema>;
