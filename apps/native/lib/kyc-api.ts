/**
 * KYC API Service
 * Handles all KYC-related API calls to the backend
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Types (mirrored from backend)
export type KycSessionStatus = 
	| 'created'
	| 'in_progress'
	| 'completed'
	| 'approved'
	| 'rejected'
	| 'review'
	| 'expired'
	| 'failed';

export interface CreateKycSessionResponse {
	sessionId: string;
	providerSessionId: string;
	sessionUrl: string;
	expiresAt: string;
	status: KycSessionStatus;
}

export interface KycStatusResponse {
	sessionId: string;
	status: KycSessionStatus;
	decision: 'approved' | 'rejected' | 'review' | 'pending' | null;
	createdAt: string;
	completedAt?: string;
	expiresAt?: string;
	attemptNumber: number;
	verificationDetails?: {
		documentVerified: boolean;
		livenessVerified: boolean;
		faceMatchVerified: boolean;
		ipAnalysisPassed: boolean;
	};
	extractedData?: {
		fullName?: string;
		dateOfBirth?: string;
		nationality?: string;
		documentType?: string;
	};
	rejectionReason?: string;
	canRetry: boolean;
}

export interface UserKycSummary {
	isVerified: boolean;
	kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';
	lastSessionId?: string;
	lastAttemptAt?: string;
	totalAttempts: number;
	verifiedAt?: string;
	verifiedDocument?: {
		type: string;
		country: string;
		expiresAt?: string;
	};
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
}

// KYC Status display configuration
export const KYC_STATUS_CONFIG: Record<KycSessionStatus, {
	label: string;
	color: string;
	emoji: string;
	description: string;
}> = {
	created: {
		label: 'Not Started',
		color: '#6B7280',
		emoji: '📋',
		description: 'Start your identity verification',
	},
	in_progress: {
		label: 'In Progress',
		color: '#3B82F6',
		emoji: '⏳',
		description: 'Complete your verification',
	},
	completed: {
		label: 'Processing',
		color: '#F59E0B',
		emoji: '🔄',
		description: 'Your verification is being processed',
	},
	approved: {
		label: 'Verified',
		color: '#10B981',
		emoji: '✅',
		description: 'Your identity has been verified',
	},
	rejected: {
		label: 'Rejected',
		color: '#EF4444',
		emoji: '❌',
		description: 'Verification failed - please try again',
	},
	review: {
		label: 'Under Review',
		color: '#F59E0B',
		emoji: '🔍',
		description: 'Manual review in progress (24-48 hours)',
	},
	expired: {
		label: 'Expired',
		color: '#6B7280',
		emoji: '⏰',
		description: 'Session expired - please start again',
	},
	failed: {
		label: 'Failed',
		color: '#EF4444',
		emoji: '⚠️',
		description: 'Technical error - please try again',
	},
};

// India-specific document guidance
export const INDIA_DOCUMENT_GUIDANCE = {
	accepted: [
		{ type: 'Aadhaar Card', icon: '🪪', note: 'Most commonly accepted' },
		{ type: 'PAN Card', icon: '💳', note: 'Accepted with photo ID' },
		{ type: 'Indian Passport', icon: '📕', note: 'Valid passport required' },
		{ type: 'Driver\'s License', icon: '🚗', note: 'Valid license with photo' },
		{ type: 'Voter ID', icon: '🗳️', note: 'Election Commission ID' },
	],
	tips: [
		'Ensure document is not expired',
		'Take photos in good lighting',
		'Avoid glare and shadows',
		'Ensure all text is clearly visible',
		'Remove document from plastic covers',
	],
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
			return data;
		} catch (error) {
			console.error('API request failed:', error);
			return {
				success: false,
				error: 'Network error. Please check your connection.',
				code: 'NETWORK_ERROR',
			};
		}
	}

	/**
	 * Get device info for session creation
	 */
	private getDeviceInfo() {
		return {
			platform: Platform.OS,
			model: Device.modelName || undefined,
			osVersion: Device.osVersion || undefined,
			appVersion: Constants.expoConfig?.version || undefined,
		};
	}

	/**
	 * Create a new KYC verification session
	 */
	async createSession(locale: string = 'en'): Promise<ApiResponse<CreateKycSessionResponse>> {
		// Deep link callback URL for the app
		const callbackUrl = 'tradingapp://kyc/callback';

		return this.request<CreateKycSessionResponse>('/kyc/session/create', {
			method: 'POST',
			body: JSON.stringify({
				callbackUrl,
				locale,
				deviceInfo: this.getDeviceInfo(),
			}),
		});
	}

	/**
	 * Get status of a specific KYC session
	 */
	async getSessionStatus(sessionId: string): Promise<ApiResponse<KycStatusResponse>> {
		return this.request<KycStatusResponse>(`/kyc/session/${sessionId}/status`);
	}

	/**
	 * Get user's overall KYC status summary
	 */
	async getUserKycStatus(): Promise<ApiResponse<UserKycSummary>> {
		return this.request<UserKycSummary>('/kyc/status');
	}

	/**
	 * Manually refresh session status from provider
	 */
	async refreshSessionStatus(sessionId: string): Promise<ApiResponse<{ status: KycSessionStatus; message: string }>> {
		return this.request(`/kyc/session/${sessionId}/refresh`, {
			method: 'POST',
		});
	}
}

// Export singleton instance
export const kycApi = new KycApi();

// Export helper functions
export function getStatusConfig(status: KycSessionStatus) {
	return KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.failed;
}

export function canRetryVerification(status: KycSessionStatus): boolean {
	return ['rejected', 'expired', 'failed'].includes(status);
}

export function isVerificationComplete(status: KycSessionStatus): boolean {
	return ['approved', 'rejected', 'review'].includes(status);
}

export function isVerificationPending(status: KycSessionStatus): boolean {
	return ['created', 'in_progress', 'completed'].includes(status);
}
