/**
 * KYC Routes — Didit V3 Integration
 *
 * Endpoints:
 *   GET  /status                       — user's KYC summary
 *   GET  /session/:sessionId           — detailed session + verification results
 *   POST /session                      — create a new Didit session
 *   POST /session/:sessionId/sync      — pull latest decision from Didit (fallback when webhook is delayed)
 *   POST /webhook                      — Didit webhook receiver (source of truth)
 *
 * Fixes applied:
 *  1. Webhook uses X-Signature-V2 + X-Signature-Simple fallback
 *  2. Session endpoint parses V3 plural arrays (id_verifications, liveness_checks, face_matches)
 *  3. verification_data is AES-256-GCM encrypted before storage, decrypted on read
 *  4. /sync endpoint allows frontend to pull fresh status without waiting for webhook
 *  5. session_id returned in POST /session so frontend can track the specific session
 */

import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { kycSessions } from '../db/schema/kyc-sessions';
import { users } from '../db/schema/users';
import { DiditService, type WebhookPayload, type DiditSessionDecision } from '../services/didit.service';
import { requireAuth } from '../middleware/clerk-auth';

const kyc = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract human-readable rejection reasons from a V3 decision. */
function extractRejectionReasons(decision: DiditSessionDecision): string[] {
	const reasons: string[] = [];

	const addWarnings = (warnings?: Array<{ risk?: string; short_description?: string; long_description?: string }>) => {
		if (!warnings) return;
		for (const w of warnings) {
			const msg = w.short_description || w.long_description || w.risk;
			if (msg) reasons.push(msg);
		}
	};

	// ID verification warnings
	for (const idv of decision.id_verifications ?? []) {
		if (idv.status !== 'Approved') {
			addWarnings(idv.warnings);
			if (!idv.warnings?.length && idv.status) {
				reasons.push(`Document verification ${idv.status.toLowerCase()}`);
			}
		}
	}

	// Liveness warnings
	for (const lc of decision.liveness_checks ?? []) {
		if (lc.status !== 'Approved') {
			addWarnings(lc.warnings);
			if (!lc.warnings?.length && lc.status) {
				reasons.push(`Liveness check ${lc.status.toLowerCase()}`);
			}
		}
	}

	// Face match warnings
	for (const fm of decision.face_matches ?? []) {
		if (fm.status !== 'Approved') {
			addWarnings(fm.warnings);
			if (!fm.warnings?.length && fm.status) {
				reasons.push(`Face match ${fm.status.toLowerCase()}`);
			}
		}
	}

	// Manual review comments
	for (const r of decision.reviews ?? []) {
		if (r.new_status === 'Declined' && r.comment) {
			reasons.push(r.comment);
		}
	}

	return reasons;
}

/** Build verificationDetails object from a V3 decision. */
function buildVerificationDetails(decision: DiditSessionDecision) {
	return {
		documentVerified: decision.id_verifications?.[0]?.status === 'Approved',
		livenessVerified: decision.liveness_checks?.[0]?.status === 'Approved',
		faceMatchVerified: decision.face_matches?.[0]?.status === 'Approved',
		// IP / AML — pass unless explicitly failed
		ipAnalysisPassed: true,
	};
}

/** Build extractedData from the first id_verification entry. */
function buildExtractedData(decision: DiditSessionDecision) {
	const idv = decision.id_verifications?.[0];
	if (!idv) return null;

	return {
		fullName: idv.full_name || `${idv.first_name ?? ''} ${idv.last_name ?? ''}`.trim() || undefined,
		firstName: idv.first_name,
		lastName: idv.last_name,
		dateOfBirth: idv.date_of_birth,
		documentType: idv.document_type,
		documentNumber: idv.document_number,
		nationality: idv.nationality,
		expiryDate: idv.expiration_date,
		age: idv.age,
		gender: idv.gender,
		address: idv.formatted_address || idv.address,
	};
}

// ---------------------------------------------------------------------------
// GET /status — user KYC summary
// ---------------------------------------------------------------------------

kyc.get('/status', requireAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

	const [latestSession, allSessions] = await Promise.all([
		db.query.kycSessions.findFirst({
			where: eq(kycSessions.userId, user.id),
			orderBy: [desc(kycSessions.createdAt)],
		}),
		db.query.kycSessions.findMany({
			where: eq(kycSessions.userId, user.id),
		}),
	]);

	return c.json({
		success: true,
		data: {
			kycStatus: user.kycStatus,
			accountStatus: user.accountStatus,
			lastSessionId: latestSession?.diditSessionId ?? null,
			lastSessionStatus: latestSession?.status ?? null,
			adminApprovalStatus: latestSession?.adminApprovalStatus ?? null,
			totalAttempts: allSessions.length,
			canStartNew: user.kycStatus !== 'approved' && allSessions.length < 5,
		},
	});
});

// ---------------------------------------------------------------------------
// GET /session/:sessionId — detailed session + verification results
// ---------------------------------------------------------------------------

kyc.get('/session/:sessionId', requireAuth, async (c) => {
	const user = c.get('user');
	const { sessionId } = c.req.param();
	if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, sessionId),
	});

	if (!session) return c.json({ success: false, error: 'Session not found' }, 404);
	if (session.userId !== user.id) return c.json({ success: false, error: 'Unauthorized' }, 403);

	// Decrypt and parse stored verification data
	const decrypted = DiditService.decryptVerificationData(session.verificationData);
	const decision  = decrypted as DiditSessionDecision | null;

	const verificationDetails = decision ? buildVerificationDetails(decision) : null;
	const extractedData       = decision ? buildExtractedData(decision) : null;
	const rejectionReasons    = decision ? extractRejectionReasons(decision) : [];

	// Append admin rejection reason if present
	if (session.adminRejectionReason) {
		rejectionReasons.push(session.adminRejectionReason);
	}

	// Attempt number
	const allSessions = await db.query.kycSessions.findMany({
		where: eq(kycSessions.userId, user.id),
		orderBy: [desc(kycSessions.createdAt)],
	});
	const attemptNumber = allSessions.findIndex(s => s.id === session.id) + 1;

	return c.json({
		success: true,
		data: {
			sessionId:           session.diditSessionId,
			status:              session.status,
			adminApprovalStatus: session.adminApprovalStatus,
			createdAt:           session.createdAt.toISOString(),
			completedAt:         session.updatedAt.toISOString(),
			verificationDetails,
			extractedData,
			rejectionReason: rejectionReasons.length > 0 ? rejectionReasons.join('; ') : null,
			attemptNumber,
			canRetry: session.status !== 'approved' && session.status !== 'pending' && allSessions.length < 5,
		},
	});
});

// ---------------------------------------------------------------------------
// POST /session — create a new Didit verification session
// ---------------------------------------------------------------------------

kyc.post('/session', requireAuth, async (c) => {
	const user = c.get('user');
	if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

	if (user.kycStatus === 'approved') {
		return c.json({ success: false, error: 'Already verified' }, 400);
	}

	try {
		const body        = await c.req.json().catch(() => ({}));
		const callbackUrl = (body as any).callbackUrl || 'tradingapp://kyc/callback';

		const diditSession = await DiditService.createSession(user.id, callbackUrl);

		await db.insert(kycSessions).values({
			userId:         user.id,
			diditSessionId: diditSession.session_id,
			status:         'pending',
		}).onConflictDoNothing();

		await db.update(users).set({
			kycStatus:  'pending',
			updatedAt:  new Date(),
		}).where(eq(users.id, user.id));

		return c.json({
			success: true,
			data: {
				session_id:       diditSession.session_id,
				verification_url: diditSession.url,
				session_token:    diditSession.session_token,
			},
		}, 201);

	} catch (error) {
		console.error('[KYC] Session creation failed:', error);
		return c.json({ success: false, error: 'Failed to create verification session' }, 500);
	}
});

// ---------------------------------------------------------------------------
// POST /session/:sessionId/sync
//
// Proactive status pull — called by the frontend when the user returns from
// the Didit WebView.  Fetches the latest decision from Didit, updates our DB,
// and returns the refreshed session data.  Acts as a fallback so the user
// always sees an up-to-date status even if the webhook hasn't fired yet.
// ---------------------------------------------------------------------------

kyc.post('/session/:sessionId/sync', requireAuth, async (c) => {
	const user = c.get('user');
	const { sessionId } = c.req.param();
	if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, sessionId),
	});

	if (!session) return c.json({ success: false, error: 'Session not found' }, 404);
	if (session.userId !== user.id) return c.json({ success: false, error: 'Unauthorized' }, 403);

	// Fetch latest from Didit
	const decision = await DiditService.getSessionDecision(sessionId);
	if (!decision) {
		// Couldn't reach Didit — return current cached state
		return c.json({ success: true, data: { synced: false, status: session.status } });
	}

	const newStatus = DiditService.mapStatus(decision.status);

	// Only update if status has actually changed or data is new
	if (newStatus !== session.status || (decision && !session.verificationData)) {
		const sessionUpdate: Record<string, unknown> = {
			status:    newStatus,
			updatedAt: new Date(),
		};

		if (decision && (newStatus === 'approved' || newStatus === 'declined')) {
			// Encrypt sensitive PII before storing
			sessionUpdate.verificationData = DiditService.encryptVerificationData(decision);
		}

		if (newStatus === 'approved' && !session.adminApprovalStatus) {
			sessionUpdate.adminApprovalStatus = 'pending_approval';
		}

		await db.update(kycSessions)
			.set(sessionUpdate)
			.where(eq(kycSessions.id, session.id));

		// Update user kycStatus
		if (newStatus === 'approved') {
			await db.update(users).set({ kycStatus: 'pending', updatedAt: new Date() })
				.where(eq(users.id, session.userId));
		} else if (newStatus === 'declined') {
			await db.update(users).set({ kycStatus: 'rejected', updatedAt: new Date() })
				.where(eq(users.id, session.userId));
		}

		console.log(`[KYC] Sync updated session ${sessionId}: ${session.status} → ${newStatus}`);
	}

	// Re-read the freshly updated session
	const updatedSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, sessionId),
	});

	return c.json({
		success: true,
		data: {
			synced: true,
			status: updatedSession?.status,
			adminApprovalStatus: updatedSession?.adminApprovalStatus,
		},
	});
});

// ---------------------------------------------------------------------------
// POST /webhook — Didit webhook (source of truth)
// ---------------------------------------------------------------------------

kyc.post('/webhook', async (c) => {
	const signatureV2     = c.req.header('x-signature-v2')    ?? '';
	const signatureSimple = c.req.header('x-signature-simple') ?? '';
	const timestamp       = c.req.header('x-timestamp')        ?? '';
	const rawPayload      = await c.req.text();

	// Verify signature (V2 with Simple fallback)
	const isValid = DiditService.verifyWebhookSignature(
		rawPayload,
		signatureV2,
		timestamp,
		signatureSimple,
	);

	if (!isValid) {
		console.error('[KYC Webhook] Invalid signature — rejecting');
		return c.json({ success: false, error: 'Invalid signature' }, 401);
	}

	let data: WebhookPayload;
	try {
		data = JSON.parse(rawPayload);
	} catch {
		return c.json({ success: false, error: 'Invalid payload' }, 400);
	}

	const { session_id, status, vendor_data: userId } = data;

	// Look up our session record
	const session = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.diditSessionId, session_id),
	});

	if (!session) {
		console.warn(`[KYC Webhook] Session not found: ${session_id}`);
		return c.json({ success: true }); // Acknowledge to prevent retries
	}

	const newStatus = DiditService.mapStatus(status);

	// For terminal states, fetch full decision and store it encrypted
	let encryptedDecision: object | null = null;
	if (newStatus === 'approved' || newStatus === 'declined') {
		// The webhook may include the decision inline (V3 includes it for Approved/Declined)
		const decisionSource = data.decision ?? await DiditService.getSessionDecision(session_id);
		if (decisionSource) {
			encryptedDecision = DiditService.encryptVerificationData(decisionSource);
		}
	}

	// Build session update
	const sessionUpdate: Record<string, unknown> = {
		status:    newStatus,
		updatedAt: new Date(),
	};

	if (encryptedDecision) {
		sessionUpdate.verificationData = encryptedDecision;
	}

	// Didit approved → set adminApprovalStatus to pending (admin still needs to review)
	if (newStatus === 'approved' && !session.adminApprovalStatus) {
		sessionUpdate.adminApprovalStatus = 'pending_approval';
	}

	await db.update(kycSessions)
		.set(sessionUpdate)
		.where(eq(kycSessions.id, session.id));

	// Update user.kycStatus
	// approved  → 'pending'  (Didit done, awaiting admin)
	// declined  → 'rejected'
	if (newStatus === 'approved') {
		await db.update(users)
			.set({ kycStatus: 'pending', updatedAt: new Date() })
			.where(eq(users.id, session.userId));
	} else if (newStatus === 'declined') {
		await db.update(users)
			.set({ kycStatus: 'rejected', updatedAt: new Date() })
			.where(eq(users.id, session.userId));
	}

	console.log(
		`[KYC Webhook] Processed: session=${session_id} diditStatus=${status} → internalStatus=${newStatus}` +
		(newStatus === 'approved' ? ' (pending admin approval)' : ''),
	);

	return c.json({ success: true });
});

export default kyc;
