/**
 * KYC Sessions Schema - Minimal Didit V3 Integration
 * Only stores session ID and status. Didit handles all verification logic.
 */

import { 
	pgTable, 
	uuid, 
	varchar,
	timestamp, 
	pgEnum,
	index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Session status enum (different from user kycStatus)
export const kycSessionStatusEnum = pgEnum('kyc_session_status', [
	'pending',    // Session created, awaiting verification
	'approved',   // Verification approved
	'declined',   // Verification declined
	'expired',    // Session expired
	'abandoned',  // User abandoned verification
]);

/**
 * KYC Sessions Table - Minimal
 * Links users to Didit sessions. Status updated via webhook only.
 */
export const kycSessions = pgTable('kyc_sessions', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// User reference
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	
	// Didit session ID (vendor_data in webhook)
	diditSessionId: varchar('didit_session_id', { length: 255 }).notNull().unique(),
	
	// Status (updated by webhook only)
	status: kycSessionStatusEnum('status').notNull().default('pending'),
	
	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	userIdIdx: index('kyc_sessions_user_id_idx').on(table.userId),
	diditSessionIdIdx: index('kyc_sessions_didit_session_id_idx').on(table.diditSessionId),
	statusIdx: index('kyc_sessions_status_idx').on(table.status),
}));

// Relations
export const kycSessionsRelations = relations(kycSessions, ({ one }) => ({
	user: one(users, {
		fields: [kycSessions.userId],
		references: [users.id],
	}),
}));

// Type inference
export type KycSession = typeof kycSessions.$inferSelect;
export type NewKycSession = typeof kycSessions.$inferInsert;
