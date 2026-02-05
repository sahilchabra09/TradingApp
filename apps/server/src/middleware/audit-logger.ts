/**
 * Audit Logger Middleware
 * Records all significant user actions for FSC Mauritius compliance
 * Regulatory Requirement: Comprehensive audit trail
 */

import type { Context, Next } from 'hono';
import { db } from '../db';
import { auditLogs } from '../db/schema';

// Sensitive paths that should be audited
const auditPaths = [
	'/auth/',
	'/users/',
	'/trades/',
	'/withdrawals/',
	'/deposits/',
	'/kyc/',
	'/admin/',
];

/**
 * Determines if a request should be audited
 */
function shouldAudit(path: string, method: string): boolean {
	// Skip GET requests for read-only operations
	if (method === 'GET' && !path.includes('/admin/')) {
		return false;
	}

	// Check if path matches audit patterns
	return auditPaths.some(auditPath => path.includes(auditPath));
}

/**
 * Get event type from path and method
 */
function getEventType(path: string, method: string): string {
	// Auth events
	if (path.includes('/auth/login')) return 'user_login';
	if (path.includes('/auth/logout')) return 'user_logout';
	if (path.includes('/auth/register')) return 'user_register';

	// Trading events
	if (path.includes('/trades/order') && method === 'POST') return 'order_placed';
	if (path.includes('/trades/order') && method === 'DELETE') return 'order_cancelled';

	// Withdrawal events
	if (path.includes('/withdrawals') && method === 'POST') return 'withdrawal_requested';
	if (path.includes('/withdrawals') && method === 'PATCH') return 'withdrawal_updated';

	// Deposit events
	if (path.includes('/deposits') && method === 'POST') return 'deposit_initiated';

	// KYC events
	if (path.includes('/kyc') && method === 'POST') return 'kyc_submitted';
	if (path.includes('/kyc') && method === 'PATCH') return 'kyc_updated';

	// Admin events
	if (path.includes('/admin/users') && method === 'PATCH') return 'user_updated';
	if (path.includes('/admin/kyc-review')) return 'kyc_reviewed';

	return `${method.toLowerCase()}_${path.split('/').pop() || 'unknown'}`;
}

/**
 * Get event category - must match eventCategoryEnum in audit.ts
 * Valid values: authentication, trading, compliance, admin_action, system, financial, security
 */
function getEventCategory(path: string): string {
	if (path.includes('/auth/')) return 'authentication';
	if (path.includes('/trades/')) return 'trading';
	if (path.includes('/withdrawals/')) return 'financial';
	if (path.includes('/deposits/')) return 'financial';
	if (path.includes('/kyc/')) return 'compliance';
	if (path.includes('/admin/')) return 'admin_action';
	return 'system';
}

/**
 * Audit logging middleware
 */
export const auditLogger = async (c: Context, next: Next) => {
	const path = c.req.path;
	const method = c.req.method;

	// Check if this request should be audited
	if (!shouldAudit(path, method)) {
		return next();
	}

	const startTime = Date.now();
	let responseStatus = 200;
	let error: Error | null = null;

	try {
		await next();
		responseStatus = c.res.status;
	} catch (err) {
		error = err as Error;
		responseStatus = 500;
		throw err; // Re-throw to be handled by error handler
	} finally {
		// Log the audit entry asynchronously (don't block response)
		const user = c.get('user');
		const userId = user?.id;
		const adminId = c.get('clerkAuth')?.sessionClaims?.metadata?.role === 'admin' ? userId : undefined;

		const duration = Date.now() - startTime;
		const eventType = getEventType(path, method);
		const eventCategory = getEventCategory(path);

		// Create audit log entry
		const auditData: any = {
			eventType,
			eventCategory,
			description: `${method} ${path}`,
			metadata: {
				method,
				path,
				duration,
				statusCode: responseStatus,
				userAgent: c.req.header('user-agent'),
				error: error?.message,
			},
			ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
			severity: responseStatus >= 500 ? 'error' : responseStatus >= 400 ? 'warning' : 'info',
		};

		if (userId) {
			auditData.user_id = userId;
		}
		if (adminId) {
			auditData.admin_id = adminId;
		}

		db.insert(auditLogs)
			.values(auditData)
			.catch((err: any) => {
				console.error('Failed to create audit log:', err);
			});
	}
};
