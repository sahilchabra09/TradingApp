/**
 * Didit Identity Verification Service - Minimal V3 API
 * Only handles session creation and webhook verification.
 * All verification logic is handled by Didit.
 */

import crypto from 'crypto';

// Configuration
const DIDIT_CONFIG = {
	baseUrl: process.env.DIDIT_BASE_URL || 'https://verification.didit.me',
	apiKey: process.env.DIDIT_API_KEY || '',
	webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || '',
	workflowId: process.env.DIDIT_WORKFLOW_ID || '',
};

// Types
export interface CreateSessionResponse {
	session_id: string;
	session_token: string;
	verification_url: string;
	status: string;
}

export interface WebhookPayload {
	session_id: string;
	status: 'Not Started' | 'In Progress' | 'Approved' | 'Declined' | 'Expired' | 'Abandoned';
	vendor_data: string; // Our userId
	workflow_id: string;
}

export class DiditService {
	/**
	 * Create a verification session
	 */
	static async createSession(
		userId: string,
		callbackUrl: string
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

		return await response.json() as CreateSessionResponse;
	}

	/**
	 * Verify webhook signature (V3 format)
	 */
	static verifyWebhookSignature(
		payload: string,
		signature: string,
		timestamp: string
	): boolean {
		if (!DIDIT_CONFIG.webhookSecret) {
			console.error('DIDIT_WEBHOOK_SECRET not configured');
			return false;
		}

		// Check timestamp freshness (5 min window)
		const now = Math.floor(Date.now() / 1000);
		const webhookTime = parseInt(timestamp, 10);
		if (Math.abs(now - webhookTime) > 300) {
			console.error('Webhook timestamp expired');
			return false;
		}

		// Verify signature
		const expected = crypto
			.createHmac('sha256', DIDIT_CONFIG.webhookSecret)
			.update(payload)
			.digest('hex');

		try {
			return crypto.timingSafeEqual(
				Buffer.from(signature),
				Buffer.from(expected)
			);
		} catch {
			return false;
		}
	}

	/**
	 * Map Didit status to our internal status
	 */
	static mapStatus(diditStatus: string): 'pending' | 'approved' | 'declined' | 'expired' | 'abandoned' {
		switch (diditStatus) {
			case 'Approved': return 'approved';
			case 'Declined': return 'declined';
			case 'Expired': return 'expired';
			case 'Abandoned': return 'abandoned';
			default: return 'pending';
		}
	}
}
