/**
 * KYC API Service - Minimal Didit V3 Integration
 * Handles session creation only. Status is updated via webhook.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://3049064aa0d3.ngrok-free.app/api/v1';

// Types
export type KycStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'abandoned';

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

// Status display configuration
export const KYC_STATUS_CONFIG: Record<KycStatus, {
	label: string;
	color: string;
	emoji: string;
	description: string;
}> = {
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
}

// Export singleton instance
export const kycApi = new KycApi();

// Export helper functions
export function getStatusConfig(status: KycStatus) {
	return KYC_STATUS_CONFIG[status] || KYC_STATUS_CONFIG.pending;
}

export function canRetryVerification(status: KycStatus): boolean {
	return ['declined', 'expired', 'abandoned'].includes(status);
}

export function isVerificationComplete(status: KycStatus): boolean {
	return status === 'approved' || status === 'declined';
}
