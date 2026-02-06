/**
 * KYC API Service - Didit V3 Integration
 * Handles session creation and status fetching
 */

import { Platform } from 'react-native';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://3049064aa0d3.ngrok-free.app/api/v1';

// Session status types
export type KycSessionStatus = 
	| 'created' 
	| 'in_progress' 
	| 'pending' 
	| 'approved' 
	| 'declined' 
	| 'rejected' 
	| 'expired' 
	| 'abandoned';

// User KYC status (from user table)
export type UserKycStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';

export interface CreateSessionResponse {
	verification_url: string;
	session_token: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

// User KYC summary from GET /status
export interface UserKycSummary {
	kycStatus: UserKycStatus;
	accountStatus: string;
	lastSessionId: string | null;
	lastSessionStatus: KycSessionStatus | null;
	totalAttempts: number;
	canStartNew: boolean;
}

// Verification details
export interface VerificationDetails {
	documentVerified: boolean;
	livenessVerified: boolean;
	faceMatchVerified: boolean;
	ipAnalysisPassed: boolean;
}

// Extracted document data
export interface ExtractedData {
	fullName?: string;
	firstName?: string;
	lastName?: string;
	dateOfBirth?: string;
	documentType?: string;
	documentNumber?: string;
	nationality?: string;
	expiryDate?: string;
	age?: number;
	gender?: string;
	address?: string;
}

// Session status response from GET /session/:id
export interface KycStatusResponse {
	sessionId: string;
	status: KycSessionStatus;
	createdAt: string;
	completedAt?: string;
	verificationDetails?: VerificationDetails;
	extractedData?: ExtractedData;
	rejectionReason?: string;
	attemptNumber: number;
	canRetry: boolean;
}

// Status display configuration
export const KYC_STATUS_CONFIG: Record<KycSessionStatus, {
	label: string;
	color: string;
	emoji: string;
	description: string;
}> = {
	created: {
		label: 'Not Started',
		color: '#6B7280',
		emoji: '📝',
		description: 'Verification not yet started',
	},
	in_progress: {
		label: 'In Progress',
		color: '#F59E0B',
		emoji: '⏳',
		description: 'Verification in progress',
	},
	pending: {
		label: 'Pending',
		color: '#F59E0B',
		emoji: '⏳',
		description: 'Verification in progress',
	},
	approved: {
		label: 'Verified',
		color: '#10B981',
		emoji: '✅',
		description: 'Your identity has been verified',
	},
	declined: {
		label: 'Declined',
		color: '#EF4444',
		emoji: '❌',
		description: 'Verification failed - please try again',
	},
	rejected: {
		label: 'Rejected',
		color: '#EF4444',
		emoji: '❌',
		description: 'Verification failed - please try again',
	},
	expired: {
		label: 'Expired',
		color: '#6B7280',
		emoji: '⏰',
		description: 'Session expired - please start again',
	},
	abandoned: {
		label: 'Abandoned',
		color: '#6B7280',
		emoji: '🚪',
		description: 'Verification was not completed',
	},
};

class KycApi {
	private authToken: string | null = null;

	/**
	 * Set the authentication token for API calls
	 */
	setAuthToken(token: string) {
		this.authToken = token;
	}

	/**
	 * Clear the authentication token
	 */
	clearAuthToken() {
		this.authToken = null;
	}

	/**
	 * Make an authenticated API request
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		const url = `${API_BASE_URL}${endpoint}`;
		
		console.log('[KYC API] Request:', url);
		
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		if (this.authToken) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers,
			});

			const data = await response.json();
			console.log('[KYC API] Response:', data);
			return data;
		} catch (error) {
			console.error('[KYC API] Request failed:', error);
			return {
				success: false,
				error: 'Network error. Please check your connection and try again.',
			};
		}
	}

	/**
	 * Create a new KYC verification session
	 * Returns verification_url to open in WebView
	 */
	async createSession(callbackUrl: string = 'tradingapp://kyc/callback'): Promise<ApiResponse<CreateSessionResponse>> {
		return this.request<CreateSessionResponse>('/kyc/session', {
			method: 'POST',
			body: JSON.stringify({ callbackUrl }),
		});
	}

	/**
	 * Get user's KYC status summary
	 */
	async getUserKycStatus(): Promise<ApiResponse<UserKycSummary>> {
		return this.request<UserKycSummary>('/kyc/status', {
			method: 'GET',
		});
	}

	/**
	 * Get specific session status with verification details
	 */
	async getSessionStatus(sessionId: string): Promise<ApiResponse<KycStatusResponse>> {
		return this.request<KycStatusResponse>(`/kyc/session/${sessionId}`, {
			method: 'GET',
		});
	}

	/**
	 * Refresh session status (same as getSessionStatus, but indicates intent to refresh)
	 */
	async refreshSessionStatus(sessionId: string): Promise<ApiResponse<KycStatusResponse>> {
		return this.getSessionStatus(sessionId);
	}
}

// Export singleton instance
export const kycApi = new KycApi();

// Export helper functions
export function getStatusConfig(status: KycSessionStatus) {
	return KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.pending;
}

export function canRetryVerification(status: KycSessionStatus): boolean {
	return ['declined', 'rejected', 'expired', 'abandoned'].includes(status);
}

export function isVerificationComplete(status: KycSessionStatus): boolean {
	return status === 'approved' || status === 'declined' || status === 'rejected';
}

export function isVerificationPending(status: KycSessionStatus): boolean {
	return status === 'pending' || status === 'in_progress' || status === 'created';
}

