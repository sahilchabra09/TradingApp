/**
 * Didit Identity Verification Service - V3 API
 *
 * Fixes applied:
 *  1. Correct X-Signature-V2 verification (sort-keys canonical JSON, not raw body)
 *  2. X-Signature-Simple fallback (timestamp:session_id:status:webhook_type)
 *  3. Updated DiditSessionDecision to V3 plural-array structure
 *  4. AES-256-GCM encryption for PII stored in verification_data
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DIDIT_CONFIG = {
	baseUrl: process.env.DIDIT_BASE_URL || 'https://verification.didit.me',
	apiKey: process.env.DIDIT_API_KEY || '',
	webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || '',
	workflowId: process.env.DIDIT_WORKFLOW_ID || '',
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CreateSessionResponse {
	session_id: string;
	session_token: string;
	url: string;
	status: string;
	vendor_data?: string;
	workflow_id?: string;
}

export interface WebhookPayload {
	session_id: string;
	status: 'Not Started' | 'In Progress' | 'In Review' | 'Approved' | 'Declined' | 'Expired' | 'Abandoned';
	webhook_type?: string;
	vendor_data: string;
	workflow_id: string;
	timestamp?: number;
	created_at?: number;
	decision?: DiditSessionDecision;
}

// Warning shape used across all V3 feature arrays
interface DiditWarning {
	risk?: string;
	short_description?: string;
	long_description?: string;
	log_type?: string;
}

// ---------------------------------------------------------------------------
// V3 Session Decision — plural arrays
// ---------------------------------------------------------------------------

export interface DiditSessionDecision {
	session_id: string;
	session_number?: number;
	session_url?: string;
	status: string;
	workflow_id?: string;
	vendor_data?: string;
	features?: string[];

	// ID Verification (array, one entry per document checked)
	id_verifications?: Array<{
		node_id?: string;
		status?: string;
		document_type?: string;
		document_number?: string;
		personal_number?: string;
		first_name?: string;
		last_name?: string;
		full_name?: string;
		date_of_birth?: string;
		age?: number;
		expiration_date?: string;
		date_of_issue?: string;
		issuing_state?: string;
		issuing_state_name?: string;
		gender?: string;
		nationality?: string;
		address?: string;
		formatted_address?: string;
		place_of_birth?: string;
		portrait_image?: string;
		front_image?: string;
		back_image?: string;
		warnings?: DiditWarning[];
	}>;

	// Liveness checks
	liveness_checks?: Array<{
		node_id?: string;
		status?: string;
		method?: string;
		score?: number;
		reference_image?: string;
		video_url?: string;
		age_estimation?: number;
		warnings?: DiditWarning[];
	}>;

	// Face match results
	face_matches?: Array<{
		node_id?: string;
		status?: string;
		score?: number;
		source_image?: string;
		target_image?: string;
		warnings?: DiditWarning[];
	}>;

	// AML screenings
	aml_screenings?: Array<{
		node_id?: string;
		status?: string;
		total_hits?: number;
		score?: number;
		entity_type?: string;
	}>;

	// Phone verification
	phone_verifications?: Array<{
		node_id?: string;
		status?: string;
		full_number?: string;
	}>;

	// Email verification
	email_verifications?: Array<{
		node_id?: string;
		status?: string;
		email?: string;
	}>;

	// Reviews (manual review comments)
	reviews?: Array<{
		user?: string;
		new_status?: string;
		comment?: string;
		created_at?: string;
	}>;
}

// ---------------------------------------------------------------------------
// Encrypted envelope — stored in verification_data JSONB column
// ---------------------------------------------------------------------------

interface EncryptedEnvelope {
	v: 1;
	enc: true;
	iv: string;   // base64 12-byte IV
	tag: string;  // base64 16-byte GCM auth tag
	data: string; // base64 ciphertext
}

// ---------------------------------------------------------------------------
// DiditService
// ---------------------------------------------------------------------------

export class DiditService {

	// -------------------------------------------------------------------------
	// Session management
	// -------------------------------------------------------------------------

	static async createSession(
		userId: string,
		callbackUrl: string,
	): Promise<CreateSessionResponse> {
		if (!DIDIT_CONFIG.workflowId) {
			throw new Error('DIDIT_WORKFLOW_ID not configured');
		}

		const response = await fetch(`${DIDIT_CONFIG.baseUrl}/v3/session/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': DIDIT_CONFIG.apiKey,
			},
			body: JSON.stringify({
				workflow_id: DIDIT_CONFIG.workflowId,
				callback: callbackUrl,
				vendor_data: userId,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('Didit session creation failed:', error);
			throw new Error('Failed to create verification session');
		}

		const result = await response.json() as CreateSessionResponse;
		console.log('[Didit] Session created:', result.session_id);
		return result;
	}

	/**
	 * Fetch full decision from Didit — GET /v3/session/{sessionId}/decision/
	 */
	static async getSessionDecision(sessionId: string): Promise<DiditSessionDecision | null> {
		if (!DIDIT_CONFIG.apiKey) {
			console.error('[Didit] DIDIT_API_KEY not configured');
			return null;
		}

		try {
			const response = await fetch(
				`${DIDIT_CONFIG.baseUrl}/v3/session/${sessionId}/decision/`,
				{
					method: 'GET',
					headers: { 'x-api-key': DIDIT_CONFIG.apiKey },
				},
			);

			if (!response.ok) {
				const error = await response.text();
				console.error(`[Didit] getSessionDecision failed for ${sessionId}:`, response.status, error);
				return null;
			}

			const result = await response.json() as DiditSessionDecision;
			console.log(`[Didit] Decision fetched for ${sessionId}: status=${result.status}`);
			return result;
		} catch (error) {
			console.error('[Didit] Failed to fetch session decision:', error);
			return null;
		}
	}

	// -------------------------------------------------------------------------
	// Webhook signature verification
	//
	// Tries in order:
	//   1. X-Signature-V2  – canonical sorted-keys JSON (recommended by Didit)
	//   2. X-Signature-Simple – "timestamp:session_id:status:webhook_type"
	//
	// Returns true if either method passes.
	// -------------------------------------------------------------------------

	static verifyWebhookSignature(
		rawPayload: string,
		signatureV2: string,
		timestamp: string,
		signatureSimple?: string,
	): boolean {
		if (!DIDIT_CONFIG.webhookSecret) {
			console.error('[Didit] DIDIT_WEBHOOK_SECRET not configured');
			return false;
		}

		// Timestamp freshness check (5-minute window)
		const now = Math.floor(Date.now() / 1000);
		const webhookTime = parseInt(timestamp, 10);
		if (isNaN(webhookTime) || Math.abs(now - webhookTime) > 300) {
			console.error('[Didit] Webhook timestamp expired or invalid:', timestamp);
			return false;
		}

		let jsonBody: any;
		try {
			jsonBody = JSON.parse(rawPayload);
		} catch {
			console.error('[Didit] Webhook payload is not valid JSON');
			return false;
		}

		// ---- Method 1: X-Signature-V2 ----------------------------------------
		// Canonical JSON: parse → shortenFloats → sortKeys → JSON.stringify
		// Node.js / Bun: JSON.stringify keeps Unicode unescaped by default (José → "José")
		// which matches what Didit's Python backend uses with ensure_ascii=False.
		if (signatureV2) {
			const processed  = DiditService.shortenFloats(jsonBody);
			const sorted     = DiditService.sortKeysRecursive(processed);
			const canonical  = JSON.stringify(sorted);
			const expected   = crypto
				.createHmac('sha256', DIDIT_CONFIG.webhookSecret)
				.update(canonical, 'utf8')
				.digest('hex');

			if (DiditService.safeEqual(signatureV2, expected)) {
				console.log('[Didit] Webhook verified via X-Signature-V2');
				return true;
			}
			console.warn('[Didit] X-Signature-V2 mismatch — trying fallback');
		}

		// ---- Method 2: X-Signature-Simple ------------------------------------
		// Signs only: "timestamp:session_id:status:webhook_type"
		const sigSimple = signatureSimple ?? '';
		if (sigSimple) {
			const canonical = [
				String(jsonBody.timestamp  ?? ''),
				String(jsonBody.session_id ?? ''),
				String(jsonBody.status     ?? ''),
				String(jsonBody.webhook_type ?? ''),
			].join(':');

			const expected = crypto
				.createHmac('sha256', DIDIT_CONFIG.webhookSecret)
				.update(canonical)
				.digest('hex');

			if (DiditService.safeEqual(sigSimple, expected)) {
				console.log('[Didit] Webhook verified via X-Signature-Simple');
				return true;
			}
			console.warn('[Didit] X-Signature-Simple mismatch');
		}

		console.error('[Didit] All signature methods failed');
		return false;
	}

	// -------------------------------------------------------------------------
	// Status mapping
	// -------------------------------------------------------------------------

	static mapStatus(
		diditStatus: string,
	): 'pending' | 'approved' | 'declined' | 'expired' | 'abandoned' {
		switch (diditStatus) {
			case 'Approved':  return 'approved';
			case 'Declined':  return 'declined';
			case 'Expired':   return 'expired';
			case 'Abandoned': return 'abandoned';
			default:          return 'pending'; // In Progress, In Review, Not Started
		}
	}

	// -------------------------------------------------------------------------
	// AES-256-GCM encryption helpers for PII stored in verification_data
	//
	// Requires ENCRYPTION_KEY env var = 64 hex chars (32 bytes).
	// Generate with: openssl rand -hex 32
	// -------------------------------------------------------------------------

	static encryptVerificationData(plainObject: object): object {
		const hexKey = process.env.ENCRYPTION_KEY ?? '';
		if (hexKey.length !== 64) {
			// Encryption not configured — store plain (log a warning)
			console.warn('[Didit] ENCRYPTION_KEY not set or wrong length; storing verification data unencrypted');
			return plainObject;
		}

		const key = Buffer.from(hexKey, 'hex');
		const iv  = crypto.randomBytes(12);

		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
		const plaintext = JSON.stringify(plainObject);
		let ciphertext  = cipher.update(plaintext, 'utf8', 'base64');
		ciphertext     += cipher.final('base64');
		const tag = cipher.getAuthTag();

		const envelope: EncryptedEnvelope = {
			v:    1,
			enc:  true,
			iv:   iv.toString('base64'),
			tag:  tag.toString('base64'),
			data: ciphertext,
		};
		return envelope;
	}

	static decryptVerificationData(stored: unknown): object | null {
		if (!stored || typeof stored !== 'object') return null;

		const obj = stored as Record<string, unknown>;

		// Not encrypted (legacy plain data or encryption not configured)
		if (!obj.enc) {
			return obj as object;
		}

		const hexKey = process.env.ENCRYPTION_KEY ?? '';
		if (hexKey.length !== 64) {
			console.error('[Didit] ENCRYPTION_KEY missing — cannot decrypt verification data');
			return null;
		}

		try {
			const key  = Buffer.from(hexKey, 'hex');
			const iv   = Buffer.from(obj.iv as string, 'base64');
			const tag  = Buffer.from(obj.tag as string, 'base64');

			const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
			decipher.setAuthTag(tag);

			let plaintext  = decipher.update(obj.data as string, 'base64', 'utf8');
			plaintext     += decipher.final('utf8');

			return JSON.parse(plaintext) as object;
		} catch (error) {
			console.error('[Didit] Decryption failed:', error);
			return null;
		}
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Process whole-number floats → integers to match server-side behaviour.
	 * e.g.  89.0 → 89,  65.43 stays 65.43
	 */
	private static shortenFloats(data: unknown): unknown {
		if (Array.isArray(data)) return data.map(DiditService.shortenFloats);
		if (data !== null && typeof data === 'object') {
			return Object.fromEntries(
				Object.entries(data as Record<string, unknown>).map(
					([k, v]) => [k, DiditService.shortenFloats(v)],
				),
			);
		}
		if (
			typeof data === 'number' &&
			!Number.isInteger(data) &&
			data % 1 === 0
		) {
			return Math.trunc(data);
		}
		return data;
	}

	/** Recursively sort object keys (required for X-Signature-V2 canonical form). */
	private static sortKeysRecursive(data: unknown): unknown {
		if (Array.isArray(data)) return data.map(DiditService.sortKeysRecursive);
		if (data !== null && typeof data === 'object') {
			return Object.keys(data as Record<string, unknown>)
				.sort()
				.reduce(
					(acc, key) => {
						acc[key] = DiditService.sortKeysRecursive(
							(data as Record<string, unknown>)[key],
						);
						return acc;
					},
					{} as Record<string, unknown>,
				);
		}
		return data;
	}

	/** Constant-time string comparison to prevent timing attacks. */
	private static safeEqual(a: string, b: string): boolean {
		try {
			const bufA = Buffer.from(a, 'utf8');
			const bufB = Buffer.from(b, 'utf8');
			return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
		} catch {
			return false;
		}
	}
}
