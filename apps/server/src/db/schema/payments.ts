/**
 * Payments Schemas - Deposits and Withdrawals
 * FSC Mauritius Compliance: Client money handling and transaction tracking
 */

import { 
	pgTable, 
	uuid, 
	varchar,
	timestamp, 
	text,
	pgEnum,
	jsonb,
	numeric,
	index,
	check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';
import { users } from './users';
import { wallets } from './wallets';

// ============================================================================
// Withdrawal Requests Table
// ============================================================================

// FSC Mauritius Requirement: Multi-stage withdrawal approval process
export const withdrawalStatusEnum = pgEnum('withdrawal_status', [
	'pending',
	'admin_review', // Awaiting compliance review
	'approved',
	'processing',
	'completed',
	'rejected',
	'cancelled',
]);

export const withdrawalRequests = pgTable('withdrawal_requests', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
	
	// Amount - FSC Mauritius Requirement: Precise amount tracking
	amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
	currency: varchar('currency', { length: 3 }).notNull(),
	
	// Destination - FSC Mauritius Requirement: Must verify withdrawal destination
	// ENCRYPTED at application layer
	destinationAccount: jsonb('destination_account').$type<{
		accountType: 'bank' | 'crypto_wallet' | 'mobile_money';
		accountNumber?: string;
		accountHolderName?: string;
		bankName?: string;
		bankCode?: string;
		swiftCode?: string;
		iban?: string;
		cryptoAddress?: string;
		network?: string;
		mobileNumber?: string;
		provider?: string;
	}>(),
	
	// Status Tracking
	status: withdrawalStatusEnum('status').notNull().default('pending'),
	
	// Approval Workflow - FSC Mauritius Requirement: Documented approval
	approvedBy: uuid('approved_by').references(() => users.id), // Admin user
	approvedAt: timestamp('approved_at', { withTimezone: true }),
	
	// Completion Tracking
	completedAt: timestamp('completed_at', { withTimezone: true }),
	estimatedCompletion: timestamp('estimated_completion', { withTimezone: true }),
	
	// External References
	transactionReference: varchar('transaction_reference', { length: 255 }), // Bank/provider reference
	paymentProviderId: varchar('payment_provider_id', { length: 100 }),
	
	// Rejection Details
	rejectionReason: text('rejection_reason'),
	
	// Activity Timestamps
	requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('withdrawal_requests_user_id_idx').on(table.userId),
	walletIdIdx: index('withdrawal_requests_wallet_id_idx').on(table.walletId),
	statusIdx: index('withdrawal_requests_status_idx').on(table.status),
	requestedAtIdx: index('withdrawal_requests_requested_at_idx').on(table.requestedAt),
	
	// CHECK constraints
	amountPositive: check('withdrawal_amount_positive', sql`${table.amount} > 0`),
}));

// Relations
export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
	user: one(users, {
		fields: [withdrawalRequests.userId],
		references: [users.id],
	}),
	wallet: one(wallets, {
		fields: [withdrawalRequests.walletId],
		references: [wallets.id],
	}),
	approver: one(users, {
		fields: [withdrawalRequests.approvedBy],
		references: [users.id],
	}),
}));

// Zod Schemas
export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests, {
	amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
	currency: z.string().length(3, 'Currency must be ISO 4217 code').toUpperCase(),
	estimatedCompletion: z.date().min(new Date(), 'Estimated completion cannot be in the past').optional(),
});

export const selectWithdrawalRequestSchema = createSelectSchema(withdrawalRequests);

// Safe schema (excludes encrypted destination details)
export const safeWithdrawalRequestSchema = selectWithdrawalRequestSchema.omit({
	destinationAccount: true,
});

// ============================================================================
// Deposit Transactions Table
// ============================================================================

// Deposit status tracking
export const depositStatusEnum = pgEnum('deposit_status', [
	'pending',
	'processing',
	'cleared', // Funds available for trading
	'failed',
	'refunded',
]);

// Payment methods available
export const paymentMethodEnum = pgEnum('payment_method', [
	'bank_transfer',
	'card',
	'mcb_juice', // MCB Juice (Mauritius)
	'mips', // Mauritius Instant Payment System
	'crypto',
	'mobile_money',
	'other',
]);

export const depositTransactions = pgTable('deposit_transactions', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	walletId: uuid('wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
	
	// Amount
	amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
	currency: varchar('currency', { length: 3 }).notNull(),
	
	// Payment Details
	paymentMethod: paymentMethodEnum('payment_method').notNull(),
	paymentProviderId: varchar('payment_provider_id', { length: 100 }),
	paymentProviderReference: varchar('payment_provider_reference', { length: 255 }),
	
	// Status
	status: depositStatusEnum('status').notNull().default('pending'),
	
	// Settlement - FSC Mauritius CRITICAL: Track when funds are actually available
	settlementDate: timestamp('settlement_date', { withTimezone: true }),
	
	// Metadata
	metadata: jsonb('metadata').$type<{
		sourceAccountLast4?: string;
		cardBrand?: string;
		bankName?: string;
		transactionId?: string;
		[key: string]: any;
	}>(),
	
	// Activity Timestamps
	initiatedAt: timestamp('initiated_at', { withTimezone: true }).notNull().defaultNow(),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('deposit_transactions_user_id_idx').on(table.userId),
	walletIdIdx: index('deposit_transactions_wallet_id_idx').on(table.walletId),
	statusIdx: index('deposit_transactions_status_idx').on(table.status),
	initiatedAtIdx: index('deposit_transactions_initiated_at_idx').on(table.initiatedAt),
	settlementDateIdx: index('deposit_transactions_settlement_date_idx').on(table.settlementDate),
	
	// CHECK constraint
	amountPositive: check('deposit_amount_positive', sql`${table.amount} > 0`),
}));

// Relations
export const depositTransactionsRelations = relations(depositTransactions, ({ one }) => ({
	user: one(users, {
		fields: [depositTransactions.userId],
		references: [users.id],
	}),
	wallet: one(wallets, {
		fields: [depositTransactions.walletId],
		references: [wallets.id],
	}),
}));

// Zod Schemas
export const insertDepositTransactionSchema = createInsertSchema(depositTransactions, {
	amount: z.string().regex(/^\d+(\.\d{1,8})?$/, 'Invalid amount format'),
	currency: z.string().length(3, 'Currency must be ISO 4217 code').toUpperCase(),
	settlementDate: z.date().optional(),
});

export const selectDepositTransactionSchema = createSelectSchema(depositTransactions);

// Type inference
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequests.$inferInsert;
export type SafeWithdrawalRequest = z.infer<typeof safeWithdrawalRequestSchema>;
export type DepositTransaction = typeof depositTransactions.$inferSelect;
export type NewDepositTransaction = typeof depositTransactions.$inferInsert;
