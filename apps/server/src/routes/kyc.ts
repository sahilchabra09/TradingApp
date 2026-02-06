/**
 * KYC Routes - Minimal Didit V3 Integration
 * Only 2 endpoints: create session + webhook
 */

import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { kycSessions } from '../db/schema/kyc-sessions';
import { users } from '../db/schema/users';
import { DiditService, type WebhookPayload } from '../services/didit.service';
import { requireAuth } from '../middleware/clerk-auth';

const kyc = new Hono();

/**
 * GET /status
 * Get current user's KYC status and latest session info
 */
kyc.get('/status', requireAuth, async (c) => {
	const user = c.get('user');
	
	if (!user) {
		return c.json({ success: false, error: 'Unauthorized' }, 401);
	}

	// Get user's latest session
	const latestSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, user.id),
		orderBy: [desc(kycSessions.createdAt)],
	});

	// Get total attempts
	const allSessions = await db.query.kycSessions.findMany({
		where: eq(kycSessions.userId, user.id),
	});

	return c.json({
		success: true,
		data: {
			kycStatus: user.kycStatus,
			accountStatus: user.accountStatus,
			lastSessionId: latestSession?.diditSessionId || null,
			lastSessionStatus: latestSession?.status || null,
			totalAttempts: allSessions.length,
			canStartNew: user.kycStatus !== 'approved' && allSessions.length < 5,
		},
	});
});

/**
 * GET /session/:sessionId
 * Get specific session status with verification details from Didit
 */
kyc.get('/session/:sessionId', requireAuth, async (c) => {
	const user = c.get('user');
	const { sessionId } = c.req.param();
	
	if (!user) {
		return c.json({ success: false, error: 'Unauthorized' }, 401);
	}

	// Find session in our DB
	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, sessionId),
	});

	if (!session) {
		return c.json({ success: false, error: 'Session not found' }, 404);
	}

	// Verify session belongs to user
	if (session.userId !== user.id) {
		return c.json({ success: false, error: 'Unauthorized' }, 403);
	}

	// Fetch decision/results from Didit API
	const diditDecision = await DiditService.getSessionDecision(sessionId);

	// Build response with verification details from V3 API structure
	const verificationDetails = {
		documentVerified: diditDecision?.id_verification?.status === 'Approved',
		livenessVerified: diditDecision?.liveness?.status === 'Approved',
		faceMatchVerified: diditDecision?.face_match?.status === 'Approved',
		ipAnalysisPassed: diditDecision?.ip_analysis?.status !== 'Declined' && diditDecision?.ip_analysis?.is_vpn_or_tor !== true,
	};

	// Extract user data from id_verification
	const extractedData = diditDecision?.id_verification ? {
		fullName: diditDecision.id_verification.full_name || 
			`${diditDecision.id_verification.first_name || ''} ${diditDecision.id_verification.last_name || ''}`.trim(),
		firstName: diditDecision.id_verification.first_name,
		lastName: diditDecision.id_verification.last_name,
		dateOfBirth: diditDecision.id_verification.date_of_birth,
		documentType: diditDecision.id_verification.document_type,
		documentNumber: diditDecision.id_verification.document_number,
		nationality: diditDecision.id_verification.nationality,
		expiryDate: diditDecision.id_verification.expiration_date,
		age: diditDecision.id_verification.age,
		gender: diditDecision.id_verification.gender,
		address: diditDecision.id_verification.formatted_address || diditDecision.id_verification.address,
	} : null;

	// Get rejection reasons from warnings
	const rejectionReasons: string[] = [];
	if (diditDecision?.id_verification?.warnings) {
		rejectionReasons.push(...diditDecision.id_verification.warnings.map(w => w.message || w.code || '').filter(Boolean));
	}
	if (diditDecision?.liveness?.warnings) {
		rejectionReasons.push(...diditDecision.liveness.warnings.map(w => w.message || w.code || '').filter(Boolean));
	}
	if (diditDecision?.face_match?.warnings) {
		rejectionReasons.push(...diditDecision.face_match.warnings.map(w => w.message || w.code || '').filter(Boolean));
	}
	// Also check reviews for decline reasons
	if (diditDecision?.reviews) {
		const declineReview = diditDecision.reviews.find(r => r.new_status === 'Declined');
		if (declineReview?.comment) {
			rejectionReasons.push(declineReview.comment);
		}
	}

	// Get attempt number
	const allSessions = await db.query.kycSessions.findMany({
		where: eq(kycSessions.userId, user.id),
		orderBy: [desc(kycSessions.createdAt)],
	});
	const attemptNumber = allSessions.findIndex(s => s.id === session.id) + 1;

	return c.json({
		success: true,
		data: {
			sessionId: session.diditSessionId,
			status: session.status,
			createdAt: session.createdAt.toISOString(),
			completedAt: session.updatedAt.toISOString(),
			verificationDetails,
			extractedData,
			rejectionReason: rejectionReasons.length > 0 ? rejectionReasons.join('; ') : null,
			attemptNumber,
			canRetry: session.status !== 'approved' && session.status !== 'pending' && allSessions.length < 5,
		},
	});
});

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

	// Note: Not blocking on existing pending sessions to allow retries during development
	// In production, you might want to add rate limiting or return existing session info

	try {
		// Create Didit session
		const body = await c.req.json().catch(() => ({}));
		const callbackUrl = body.callbackUrl || 'tradingapp://kyc/callback';
		
		const diditSession = await DiditService.createSession(user.id, callbackUrl);

		// Store session (ignore if already exists from retry)
		await db.insert(kycSessions).values({
			userId: user.id,
			diditSessionId: diditSession.session_id,
			status: 'pending',
		}).onConflictDoNothing();

		// Update user status
		await db.update(users).set({
			kycStatus: 'pending',
			updatedAt: new Date(),
		}).where(eq(users.id, user.id));

		return c.json({
			success: true,
			data: {
				verification_url: diditSession.url, // Didit returns 'url'
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

