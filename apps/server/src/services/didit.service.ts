/**
 * Didit Identity Verification Service - V3 API
 * Handles session creation, retrieval, and webhook verification.
 */

import crypto from 'crypto';

// Configuration
const DIDIT_CONFIG = {
	baseUrl: process.env.DIDIT_BASE_URL || 'https://verification.didit.me',
	apiKey: process.env.DIDIT_API_KEY || '',
	webhookSecret: process.env.DIDIT_WEBHOOK_SECRET || '',
	workflowId: process.env.DIDIT_WORKFLOW_ID || '',
};

// Types - matches actual Didit V3 response
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
	status: 'Not Started' | 'In Progress' | 'Approved' | 'Declined' | 'Expired' | 'Abandoned';
	vendor_data: string;
	workflow_id: string;
}

// Session decision response from /v3/session/{sessionId}/decision/
export interface DiditSessionDecision {
	session_id: string;
	session_number?: number;
	session_url?: string;
	status: string;
	workflow_id?: string;
	vendor_data?: string;
	created_at?: string;
	
	// ID Verification details
	id_verification?: {
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
		address?: string;
		formatted_address?: string;
		place_of_birth?: string;
		nationality?: string;
		portrait_image?: string;
		front_image?: string;
		back_image?: string;
		warnings?: Array<{ code?: string; message?: string }>;
	};
	
	// Liveness check
	liveness?: {
		status?: string;
		method?: string;
		score?: number;
		reference_image?: string;
		video_url?: string;
		age_estimation?: number;
		warnings?: Array<{ code?: string; message?: string }>;
	};
	
	// Face match
	face_match?: {
		status?: string;
		score?: number;
		source_image?: string;
		target_image?: string;
		warnings?: Array<{ code?: string; message?: string }>;
	};
	
	// IP Analysis
	ip_analysis?: {
		status?: string;
		device_brand?: string;
		device_model?: string;
		browser_family?: string;
		os_family?: string;
		platform?: string;
		ip_country?: string;
		ip_country_code?: string;
		ip_city?: string;
		ip_address?: string;
		is_vpn_or_tor?: boolean;
		is_data_center?: boolean;
		warnings?: Array<{ code?: string; message?: string }>;
	};
	
	// AML screening
	aml?: {
		status?: string;
		total_hits?: number;
		score?: number;
	};

	// Reviews
	reviews?: Array<{
		user?: string;
		new_status?: string;
		comment?: string;
		created_at?: string;
	}>;
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

		const result = await response.json() as CreateSessionResponse;
		console.log('Didit API response:', JSON.stringify(result, null, 2));
		return result;
	}

	/**
	 * Get session decision/results from Didit API
	 * Endpoint: GET /v3/session/{sessionId}/decision/
	 */
	static async getSessionDecision(sessionId: string): Promise<DiditSessionDecision | null> {
		if (!DIDIT_CONFIG.apiKey) {
			console.error('DIDIT_API_KEY not configured');
			return null;
		}

		try {
			const response = await fetch(`${DIDIT_CONFIG.baseUrl}/v3/session/${sessionId}/decision/`, {
				method: 'GET',
				headers: {
					'x-api-key': DIDIT_CONFIG.apiKey,
				},
			});

			if (!response.ok) {
				const error = await response.text();
				console.error('Didit getSessionDecision failed:', response.status, error);
				return null;
			}

			const result = await response.json() as DiditSessionDecision;
			console.log('Didit session decision:', JSON.stringify(result, null, 2));
			return result;
		} catch (error) {
			console.error('Failed to fetch Didit session decision:', error);
			return null;
		}
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


