/**
 * Clerk Authentication Type Definitions
 */

import type { User } from '../db/schema/users';

export interface ClerkAuth {
	userId: string;
	sessionId: string;
	orgId?: string;
	orgRole?: string;
	orgSlug?: string;
	sessionClaims?: {
		metadata?: {
			role?: string;
			twoFactorVerified?: boolean;
			[key: string]: any;
		};
		[key: string]: any;
	};
}

export interface AuthenticatedContext {
	userId: string;
	user: User;
	clerkAuth: ClerkAuth;
}

export interface ClerkWebhookEvent {
	data: {
		id: string;
		email_addresses?: Array<{
			email_address: string;
			verification?: {
				status: string;
			};
		}>;
		phone_numbers?: Array<{
			phone_number: string;
			verification?: {
				status: string;
			};
		}>;
		first_name?: string;
		last_name?: string;
		image_url?: string;
		user_id?: string;
		client_ip?: string;
		user_agent?: string;
		[key: string]: any;
	};
	object: string;
	type: string;
}
