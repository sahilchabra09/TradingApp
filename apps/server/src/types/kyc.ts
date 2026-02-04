/**
 * KYC Types - Minimal
 */

export interface CreateSessionRequest {
	callbackUrl?: string;
}

export interface CreateSessionResponse {
	verification_url: string;
	session_token: string;
}

export type KycStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'abandoned';
