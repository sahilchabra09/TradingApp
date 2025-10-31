/**
 * KYC Documents Schema - Identity Verification and Compliance
 * FSC Mauritius Compliance: Know Your Customer documentation and verification
 * CRITICAL: Document data must be encrypted at rest (application layer)
 */

import { 
	pgTable, 
	uuid, 
	varchar,
	timestamp, 
	text,
	pgEnum,
	jsonb,
	index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { timestamps } from './helpers';
import { users } from './users';

// FSC Mauritius Requirement: Accepted document types
export const documentTypeEnum = pgEnum('document_type', [
	'passport',
	'national_id',
	'drivers_license',
	'proof_of_address',
	'bank_statement',
	'utility_bill',
	'tax_certificate',
	'employment_letter',
]);

// Verification status
export const verificationStatusEnum = pgEnum('verification_status', [
	'pending',
	'under_review',
	'approved',
	'rejected',
	'expired',
	'resubmission_required',
]);

// Verification method
export const verificationMethodEnum = pgEnum('verification_method', [
	'manual',
	'didit_api', // Didit identity verification API
	'onfido',
	'jumio',
	'other_automated',
]);

export const kycDocuments = pgTable('kyc_documents', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Foreign Keys
	userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
	reviewedBy: uuid('reviewed_by').references(() => users.id), // Admin user who reviewed
	
	// Document Details
	documentType: documentTypeEnum('document_type').notNull(),
	documentNumber: text('document_number'), // ENCRYPTED at application layer
	
	// File Storage
	filePath: text('file_path').notNull(), // ENCRYPTED at application layer
	fileHash: varchar('file_hash', { length: 64 }).notNull(), // SHA-256 for integrity verification
	fileSize: varchar('file_size', { length: 20 }), // In bytes
	mimeType: varchar('mime_type', { length: 100 }),
	
	// Verification
	verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
	verificationMethod: verificationMethodEnum('verification_method'),
	
	// Didit API Integration (or other verification provider)
	verificationProviderId: varchar('verification_provider_id', { length: 255 }), // External verification ID
	verificationData: jsonb('verification_data').$type<{
		provider: string;
		verificationId: string;
		confidence?: number;
		extractedData?: {
			firstName?: string;
			lastName?: string;
			dateOfBirth?: string;
			documentNumber?: string;
			expiryDate?: string;
			nationality?: string;
			address?: string;
		};
		checkResults?: {
			documentAuthenticity?: boolean;
			faceMatch?: boolean;
			livenessCheck?: boolean;
		};
		[key: string]: any;
	}>(),
	
	// Document Validity
	issueDate: timestamp('issue_date', { mode: 'date' }),
	expiryDate: timestamp('expiry_date', { mode: 'date' }),
	
	// Review Details
	reviewNotes: text('review_notes'),
	rejectionReason: text('rejection_reason'),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
	
	// Timestamps
	...timestamps,
}, (table) => ({
	userIdIdx: index('kyc_documents_user_id_idx').on(table.userId),
	verificationStatusIdx: index('kyc_documents_verification_status_idx').on(table.verificationStatus),
	documentTypeIdx: index('kyc_documents_document_type_idx').on(table.documentType),
	expiryDateIdx: index('kyc_documents_expiry_date_idx').on(table.expiryDate),
}));

// Relations
export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
	user: one(users, {
		fields: [kycDocuments.userId],
		references: [users.id],
	}),
	reviewer: one(users, {
		fields: [kycDocuments.reviewedBy],
		references: [users.id],
	}),
}));

// Zod Schemas for validation
export const insertKycDocumentSchema = createInsertSchema(kycDocuments, {
	documentNumber: z.string().min(1).max(100).optional(),
	filePath: z.string().min(1),
	fileHash: z.string().length(64, 'File hash must be SHA-256 (64 characters)'),
	mimeType: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Invalid MIME type').optional(),
	issueDate: z.date().max(new Date(), 'Issue date cannot be in the future').optional(),
	expiryDate: z.date().min(new Date(), 'Document has expired').optional(),
});

export const selectKycDocumentSchema = createSelectSchema(kycDocuments);

// Safe schema (excludes sensitive encrypted fields)
export const safeKycDocumentSchema = selectKycDocumentSchema.omit({
	documentNumber: true,
	filePath: true,
});

// Type inference
export type KycDocument = typeof kycDocuments.$inferSelect;
export type NewKycDocument = typeof kycDocuments.$inferInsert;
export type SafeKycDocument = z.infer<typeof safeKycDocumentSchema>;
