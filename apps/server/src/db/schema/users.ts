/**
 * Users Schema - Core User Management
 * FSC Mauritius Compliance: KYC, AML, and identity verification requirements
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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps, softDelete } from './helpers';
import { wallets } from './wallets';
import { holdings } from './holdings';
import { trades } from './trades';
import { sessionHistory } from './sessions';
import { priceAlerts } from './alerts';
import { withdrawalRequests, depositTransactions } from './payments';
import { amlChecks } from './compliance';

// FSC Mauritius Requirement: Account status tracking for regulatory compliance
export const accountStatusEnum = pgEnum('account_status', [
	'pending_kyc',
	'active',
	'suspended',
	'closed',
]);

// FSC Mauritius Requirement: KYC verification status
export const kycStatusEnum = pgEnum('kyc_status', [
	'not_started',
	'pending',
	'approved',
	'rejected',
	'resubmission_required',
]);

// Risk profiling for investment suitability assessment
export const riskProfileEnum = pgEnum('risk_profile', [
	'conservative',
	'moderate',
	'aggressive',
]);

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Authentication - Clerk Integration
	clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	
	// Personal Information - FSC Mauritius Requirement
	firstName: varchar('first_name', { length: 100 }).notNull(),
	lastName: varchar('last_name', { length: 100 }).notNull(),
	phoneNumber: varchar('phone_number', { length: 20 }),
	dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
	nationality: varchar('nationality', { length: 3 }), // ISO 3166-1 alpha-3
	
	// Address - FSC Mauritius Requirement: Must store residential address
	residentialAddress: jsonb('residential_address').$type<{
		street: string;
		city: string;
		state?: string;
		country: string;
		postalCode: string;
	}>(),
	
	// Account Status - FSC Mauritius Compliance
	accountStatus: accountStatusEnum('account_status').notNull().default('pending_kyc'),
	kycStatus: kycStatusEnum('kyc_status').notNull().default('not_started'),
	
	// Security
	twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
	twoFactorSecret: varchar('two_factor_secret', { length: 255 }), // Encrypted
	emailVerified: boolean('email_verified').notNull().default(false),
	phoneVerified: boolean('phone_verified').notNull().default(false),
	
	// Risk Assessment
	riskProfile: riskProfileEnum('risk_profile').default('moderate'),
	
	// Admin flag
	isAdmin: boolean('is_admin').notNull().default(false),
	
	// Activity Tracking
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
	
	// Timestamps
	...timestamps,
	...softDelete, // FSC Mauritius: Soft delete for data retention
}, (table) => ({
	clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
	emailIdx: index('users_email_idx').on(table.email),
	accountStatusIdx: index('users_account_status_idx').on(table.accountStatus),
	kycStatusIdx: index('users_kyc_status_idx').on(table.kycStatus),
	createdAtIdx: index('users_created_at_idx').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	wallets: many(wallets),
	holdings: many(holdings),
	trades: many(trades),
	sessions: many(sessionHistory),
	alerts: many(priceAlerts),
	withdrawalRequests: many(withdrawalRequests),
	depositTransactions: many(depositTransactions),
	amlChecks: many(amlChecks),
}));

// Zod Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
	clerkId: z.string().min(1, 'Clerk ID is required'),
	email: z.string().email('Invalid email address'),
	phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format').optional(),
	dateOfBirth: z.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
	nationality: z.string().length(3, 'Nationality must be ISO 3166-1 alpha-3 code').optional(),
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
});

export const selectUserSchema = createSelectSchema(users);

// Safe user schema (excludes sensitive fields)
export const publicUserSchema = selectUserSchema.omit({
	twoFactorSecret: true,
	isAdmin: true,
});

// Type inference
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PublicUser = z.infer<typeof publicUserSchema>;

