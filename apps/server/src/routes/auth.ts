/**
 * Authentication Routes
 * Handles Clerk webhooks and session management
 * FSC Mauritius Compliance: Audit trail of authentication events
 */

import { Hono } from 'hono';
import { Webhook } from 'svix';
import { db } from '../db';
import { users, sessionHistory, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/clerk-auth';
import type { ClerkWebhookEvent } from '../types/clerk';
import { ResponseHelper } from '../utils/response';

const auth = new Hono();

/**
 * Clerk Webhook Handler
 * Syncs Clerk user events to your database
 * 
 * Events handled:
 * - user.created: Creates user in database
 * - user.updated: Updates user information
 * - user.deleted: Soft deletes user
 * - session.created: Logs session creation
 * - session.ended: Marks session as inactive
 */
auth.post('/webhooks/clerk', async (c) => {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		console.error('CLERK_WEBHOOK_SECRET not configured');
		return ResponseHelper.error(c, 'Webhook secret not configured', 'CONFIG_ERROR', 500);
	}

	// Get Svix headers for verification
	const svix_id = c.req.header('svix-id');
	const svix_timestamp = c.req.header('svix-timestamp');
	const svix_signature = c.req.header('svix-signature');

	if (!svix_id || !svix_timestamp || !svix_signature) {
		return ResponseHelper.error(c, 'Missing Svix headers', 'INVALID_WEBHOOK', 400);
	}

	// Get raw body
	const payload = await c.req.text();

	// Verify webhook signature
	const wh = new Webhook(WEBHOOK_SECRET);
	let evt: ClerkWebhookEvent;

	try {
		evt = wh.verify(payload, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as ClerkWebhookEvent;
	} catch (err) {
		console.error('Webhook verification failed:', err);
		return ResponseHelper.error(c, 'Invalid signature', 'INVALID_SIGNATURE', 400);
	}

	const { type, data } = evt;

	try {
		// Handle different webhook events
		switch (type) {
			case 'user.created':
				await handleUserCreated(data);
				break;

			case 'user.updated':
				await handleUserUpdated(data);
				break;

			case 'user.deleted':
				await handleUserDeleted(data);
				break;

			case 'session.created':
				await handleSessionCreated(data);
				break;

			case 'session.ended':
				await handleSessionEnded(data);
				break;

			default:
				console.log('Unhandled webhook type:', type);
		}

		return ResponseHelper.success(c, { received: true });
	} catch (error) {
		console.error('Webhook handler error:', error);
		return ResponseHelper.error(c, 'Webhook processing failed', 'WEBHOOK_ERROR', 500);
	}
});

/**
 * Handle user.created webhook
 */
async function handleUserCreated(data: any) {
	const primaryEmail = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
	const primaryPhone = data.phone_numbers?.find((p: any) => p.id === data.primary_phone_number_id);

	await db.insert(users).values({
		clerkId: data.id,
		email: primaryEmail?.email_address || '',
		firstName: data.first_name || '',
		lastName: data.last_name || '',
		emailVerified: primaryEmail?.verification?.status === 'verified',
		phoneNumber: primaryPhone?.phone_number || null,
		phoneVerified: primaryPhone?.verification?.status === 'verified',
		accountStatus: 'pending_kyc',
		kycStatus: 'not_started',
		twoFactorEnabled: false,
	});

	// Create audit log
	await db.insert(auditLogs).values({
		eventType: 'user_registered',
		eventCategory: 'authentication',
		description: `New user registered: ${primaryEmail?.email_address}`,
		metadata: { clerkId: data.id },
		severity: 'info',
	});

	console.log('User created:', data.id);
}

/**
 * Handle user.updated webhook
 */
async function handleUserUpdated(data: any) {
	const primaryEmail = data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
	const primaryPhone = data.phone_numbers?.find((p: any) => p.id === data.primary_phone_number_id);

	await db.update(users)
		.set({
			email: primaryEmail?.email_address || undefined,
			firstName: data.first_name || undefined,
			lastName: data.last_name || undefined,
			emailVerified: primaryEmail?.verification?.status === 'verified',
			phoneNumber: primaryPhone?.phone_number || null,
			phoneVerified: primaryPhone?.verification?.status === 'verified',
			twoFactorEnabled: data.two_factor_enabled || false,
			updatedAt: new Date(),
		})
		.where(eq(users.clerkId, data.id));

	console.log('User updated:', data.id);
}

/**
 * Handle user.deleted webhook
 */
async function handleUserDeleted(data: any) {
	await db.update(users)
		.set({
			deletedAt: new Date(),
			accountStatus: 'closed',
		})
		.where(eq(users.clerkId, data.id));

	// Create audit log
	await db.insert(auditLogs).values({
		eventType: 'user_deleted',
		eventCategory: 'authentication',
		description: `User account deleted: ${data.id}`,
		metadata: { clerkId: data.id },
		severity: 'warning',
	});

	console.log('User deleted:', data.id);
}

/**
 * Handle session.created webhook
 */
async function handleSessionCreated(data: any) {
	const user = await db.query.users.findFirst({
		where: eq(users.clerkId, data.user_id),
	});

	if (user) {
		await db.insert(sessionHistory).values({
			userId: user.id,
			sessionTokenHash: data.id,
			expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
			ipAddress: data.client_ip || '0.0.0.0',
			userAgent: data.user_agent || null,
			loginMethod: 'password',
			isActive: true,
			loggedInAt: new Date(),
		});

		console.log('Session created for user:', user.id);
	}
}

/**
 * Handle session.ended webhook
 */
async function handleSessionEnded(data: any) {
	await db.update(sessionHistory)
		.set({
			isActive: false,
			loggedOutAt: new Date(),
		})
		.where(eq(sessionHistory.sessionTokenHash, data.id));

	console.log('Session ended:', data.id);
}

/**
 * Get current session info
 * Protected endpoint
 */
auth.get('/session', requireAuth, async (c) => {
	const user = c.get('user');
	const clerkAuth = c.get('clerkAuth');

	return ResponseHelper.success(c, {
		user: {
			id: user.id,
			clerkId: user.clerkId,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			accountStatus: user.accountStatus,
			kycStatus: user.kycStatus,
			twoFactorEnabled: user.twoFactorEnabled,
			emailVerified: user.emailVerified,
			phoneVerified: user.phoneVerified,
			lastLoginAt: user.lastLoginAt,
		},
		session: {
			sessionId: clerkAuth.sessionId,
			orgId: clerkAuth.orgId,
			orgRole: clerkAuth.orgRole,
		},
	});
});

/**
 * Logout endpoint
 * Marks all active sessions as inactive in your DB
 * (Frontend should call Clerk's signOut() as well)
 */
auth.post('/logout', requireAuth, async (c) => {
	const user = c.get('user');
	const clerkAuth = c.get('clerkAuth');

	// Mark all active sessions as inactive
	await db.update(sessionHistory)
		.set({
			isActive: false,
			loggedOutAt: new Date(),
		})
		.where(eq(sessionHistory.userId, user.id));

	// Create audit log
	await db.insert(auditLogs).values({
		userId: user.id,
		eventType: 'user_logout',
		eventCategory: 'authentication',
		description: 'User logged out',
		metadata: { sessionId: clerkAuth.sessionId },
		severity: 'info',
	});

	return ResponseHelper.success(c, null, 'Logged out successfully');
});

/**
 * Get user's active sessions
 */
auth.get('/sessions', requireAuth, async (c) => {
	const user = c.get('user');

	const sessions = await db.query.sessionHistory.findMany({
		where: eq(sessionHistory.userId, user.id),
		orderBy: (sessions, { desc }) => [desc(sessions.loggedInAt)],
		limit: 10,
	});

	return ResponseHelper.success(c, sessions);
});

export default auth;
