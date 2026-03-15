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
	jsonb,
	text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Session status enum — tracks Didit's verification result
export const kycSessionStatusEnum = pgEnum('kyc_session_status', [
	'pending',    // Session created, awaiting verification
	'approved',   // Didit verification approved
	'declined',   // Didit verification declined
	'expired',    // Session expired
	'abandoned',  // User abandoned verification
]);

// Admin approval status — separate from Didit's verification
export const adminApprovalStatusEnum = pgEnum('admin_approval_status', [
	'pending_approval',  // Didit approved, waiting for admin review
	'approved',          // Admin approved — user can trade
	'rejected',          // Admin rejected
]);

/**
 * KYC Sessions Table
 * Links users to Didit sessions. Stores full verification data after Didit completes.
 * Admin approval is tracked separately from Didit's verification result.
 */
export const kycSessions = pgTable('kyc_sessions', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// User reference
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	
	// Didit session ID (vendor_data in webhook)
	diditSessionId: varchar('didit_session_id', { length: 255 }).notNull().unique(),
	
	// Didit verification status (updated by webhook)
	status: kycSessionStatusEnum('status').notNull().default('pending'),
	
	// Admin approval status (updated by admin action only)
	adminApprovalStatus: adminApprovalStatusEnum('admin_approval_status'),
	
	// Full Didit verification response (stored after webhook fires)
	verificationData: jsonb('verification_data'),
	
	// Admin review metadata
	adminReviewedAt: timestamp('admin_reviewed_at', { withTimezone: true }),
	adminReviewedBy: varchar('admin_reviewed_by', { length: 255 }),
	adminRejectionReason: text('admin_rejection_reason'),
	
	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	userIdIdx: index('kyc_sessions_user_id_idx').on(table.userId),
	diditSessionIdIdx: index('kyc_sessions_didit_session_id_idx').on(table.diditSessionId),
	statusIdx: index('kyc_sessions_status_idx').on(table.status),
	adminApprovalIdx: index('kyc_sessions_admin_approval_idx').on(table.adminApprovalStatus),
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
