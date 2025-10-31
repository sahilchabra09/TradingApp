/**
 * Audit Logs Schema - Complete System Activity Audit Trail
 * FSC Mauritius Compliance: CRITICAL - Must retain for minimum 7 years
 * IMMUTABLE: Audit logs must NEVER be updated or deleted
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
	inet,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

// Event categorization for filtering and analysis
export const eventCategoryEnum = pgEnum('event_category', [
	'authentication', // Login, logout, password changes
	'trading', // Order placement, execution, cancellation
	'compliance', // KYC, AML checks
	'admin_action', // Administrative actions
	'system', // System events
	'financial', // Deposits, withdrawals, transfers
	'security', // Security events, failed auth attempts
]);

// Severity level for alerting
export const severityEnum = pgEnum('severity', [
	'info',
	'warning',
	'error',
	'critical',
]);

export const auditLogs = pgTable('audit_logs', {
	id: uuid('id').defaultRandom().primaryKey(),
	
	// Actor identification (nullable for system events)
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }), // For admin actions
	
	// Event Details
	eventType: varchar('event_type', { length: 100 }).notNull(), // 'user.login', 'trade.placed', etc.
	eventCategory: eventCategoryEnum('event_category').notNull(),
	severity: severityEnum('severity').notNull().default('info'),
	description: text('description').notNull(),
	
	// Contextual Data - FSC Mauritius Requirement: Store complete context
	metadata: jsonb('metadata').$type<{
		action?: string;
		resource?: string;
		resourceId?: string;
		changes?: {
			before?: any;
			after?: any;
		};
		requestBody?: any;
		responseStatus?: number;
		errorMessage?: string;
		[key: string]: any;
	}>(),
	
	// Request Tracking
	requestId: uuid('request_id'), // For distributed tracing
	
	// Network Information
	ipAddress: inet('ip_address'), // PostgreSQL inet type for IP addresses
	userAgent: text('user_agent'),
	
	// Geolocation (optional)
	location: jsonb('location').$type<{
		country?: string;
		city?: string;
		latitude?: number;
		longitude?: number;
	}>(),
	
	// Timestamp - ONLY createdAt (immutable)
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	
	// FSC Mauritius Compliance Note:
	// Consider implementing monthly table partitioning for better performance:
	// CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
	//   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
}, (table) => ({
	userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
	adminIdIdx: index('audit_logs_admin_id_idx').on(table.adminId),
	eventTypeIdx: index('audit_logs_event_type_idx').on(table.eventType),
	eventCategoryIdx: index('audit_logs_event_category_idx').on(table.eventCategory),
	severityIdx: index('audit_logs_severity_idx').on(table.severity),
	createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
	ipAddressIdx: index('audit_logs_ip_address_idx').on(table.ipAddress),
	requestIdIdx: index('audit_logs_request_id_idx').on(table.requestId),
}));

// Relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id],
	}),
	admin: one(users, {
		fields: [auditLogs.adminId],
		references: [users.id],
	}),
}));

// Zod Schemas for validation
export const insertAuditLogSchema = createInsertSchema(auditLogs, {
	eventType: z.string().min(1).max(100),
	description: z.string().min(1),
	ipAddress: z.string().optional(),
	requestId: z.string().uuid().optional(),
});

export const selectAuditLogSchema = createSelectSchema(auditLogs);

// Type inference
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Helper function for creating audit logs (to be used in application code)
export type AuditLogInput = {
	userId?: string;
	adminId?: string;
	eventType: string;
	eventCategory: typeof eventCategoryEnum.enumValues[number];
	severity?: typeof severityEnum.enumValues[number];
	description: string;
	metadata?: any;
	requestId?: string;
	ipAddress?: string;
	userAgent?: string;
	location?: {
		country?: string;
		city?: string;
		latitude?: number;
		longitude?: number;
	};
};
