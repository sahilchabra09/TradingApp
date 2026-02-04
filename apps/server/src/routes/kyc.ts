/**
 * KYC Routes - Minimal Didit V3 Integration
 * Only 2 endpoints: create session + webhook
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { kycSessions } from '../db/schema/kyc-sessions';
import { users } from '../db/schema/users';
import { DiditService, type WebhookPayload } from '../services/didit.service';
import { requireAuth } from '../middleware/clerk-auth';

const kyc = new Hono();

/**
 * POST /session
 * Create a new verification session
 */
kyc.post('/session', requireAuth, async (c) => {
	const user = c.get('user');
	
	if (!user) {
		return c.json({ success: false, error: 'Unauthorized' }, 401);
	}

	// Check if user already verified
	if (user.kycStatus === 'approved') {
		return c.json({ 
			success: false, 
			error: 'Already verified' 
		}, 400);
	}

	// Check for existing pending session
	const existingSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, user.id),
		orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
	});

	if (existingSession?.status === 'pending') {
		return c.json({ 
			success: false, 
			error: 'Verification already in progress' 
		}, 400);
	}

	try {
		// Create Didit session
		const body = await c.req.json().catch(() => ({}));
		const callbackUrl = body.callbackUrl || 'tradingapp://kyc/callback';
		
		const diditSession = await DiditService.createSession(user.id, callbackUrl);

		// Store session
		await db.insert(kycSessions).values({
			userId: user.id,
			diditSessionId: diditSession.session_id,
			status: 'pending',
		});

		// Update user status
		await db.update(users).set({
			kycStatus: 'pending',
			updatedAt: new Date(),
		}).where(eq(users.id, user.id));

		return c.json({
			success: true,
			data: {
				verification_url: diditSession.verification_url,
				session_token: diditSession.session_token,
			},
		}, 201);

	} catch (error) {
		console.error('Session creation failed:', error);
		return c.json({ 
			success: false, 
			error: 'Failed to create verification session' 
		}, 500);
	}
});

/**
 * POST /webhook
 * Webhook endpoint - source of truth for verification status
 */
kyc.post('/webhook', async (c) => {
	const signature = c.req.header('x-signature-v2') || '';
	const timestamp = c.req.header('x-timestamp') || '';
	const payload = await c.req.text();

	// Verify signature
	const isValid = DiditService.verifyWebhookSignature(payload, signature, timestamp);
	if (!isValid) {
		console.error('Invalid webhook signature');
		return c.json({ success: false, error: 'Invalid signature' }, 401);
	}

	// Parse payload
	let data: WebhookPayload;
	try {
		data = JSON.parse(payload);
	} catch {
		return c.json({ success: false, error: 'Invalid payload' }, 400);
	}

	const { session_id, status, vendor_data: userId } = data;

	// Find session
	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, session_id),
	});

	if (!session) {
		console.warn(`Session not found: ${session_id}`);
		return c.json({ success: true }); // Acknowledge anyway
	}

	// Map status
	const newStatus = DiditService.mapStatus(status);

	// Update session
	await db.update(kycSessions).set({
		status: newStatus,
		updatedAt: new Date(),
	}).where(eq(kycSessions.id, session.id));

	// Update user KYC status
	if (newStatus === 'approved') {
		await db.update(users).set({
			kycStatus: 'approved',
			accountStatus: 'active',
			updatedAt: new Date(),
		}).where(eq(users.id, session.userId));
	} else if (newStatus === 'declined') {
		await db.update(users).set({
			kycStatus: 'rejected',
			updatedAt: new Date(),
		}).where(eq(users.id, session.userId));
	}

	console.log(`Webhook processed: ${session_id} -> ${newStatus}`);
	return c.json({ success: true });
});

export default kyc;
