/**
 * Clerk Service Layer
 * Handles interactions with Clerk API
 */

import { createClerkClient } from '@clerk/backend';
import type { User } from '@clerk/backend';

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY!,
});

export class ClerkService {
	/**
	 * Get user by Clerk ID
	 */
	static async getUserById(clerkUserId: string): Promise<User> {
		return await clerkClient.users.getUser(clerkUserId);
	}

	/**
	 * Get user by email
	 */
	static async getUserByEmail(email: string) {
		return await clerkClient.users.getUserList({ emailAddress: [email] });
	}

	/**
	 * Update user metadata (for storing custom data)
	 */
	static async updateUserMetadata(
		clerkUserId: string,
		metadata: Record<string, any>
	): Promise<User> {
		return await clerkClient.users.updateUserMetadata(clerkUserId, {
			publicMetadata: metadata,
		});
	}

	/**
	 * Update user profile
	 */
	static async updateUser(
		clerkUserId: string,
		data: {
			firstName?: string;
			lastName?: string;
			username?: string;
		}
	): Promise<User> {
		return await clerkClient.users.updateUser(clerkUserId, data);
	}

	/**
	 * Ban user (suspend account)
	 */
	static async banUser(clerkUserId: string): Promise<User> {
		return await clerkClient.users.banUser(clerkUserId);
	}

	/**
	 * Unban user (reactivate account)
	 */
	static async unbanUser(clerkUserId: string): Promise<User> {
		return await clerkClient.users.unbanUser(clerkUserId);
	}

	/**
	 * Delete user (for account closure)
	 */
	static async deleteUser(clerkUserId: string): Promise<void> {
		await clerkClient.users.deleteUser(clerkUserId);
	}

	/**
	 * Get user sessions
	 */
	static async getUserSessions(clerkUserId: string) {
		return await clerkClient.users.getUserList({ userId: [clerkUserId] });
	}

	/**
	 * Revoke all user sessions (force logout)
	 */
	static async revokeUserSessions(clerkUserId: string): Promise<void> {
		const user = await this.getUserById(clerkUserId);
		// Get all sessions and revoke them
		// Note: This depends on Clerk's API - adjust as needed
	}

	/**
	 * Send verification email
	 */
	static async sendVerificationEmail(clerkUserId: string): Promise<void> {
		// Use Clerk's API to trigger verification email
		// Implementation depends on your Clerk setup
	}

	/**
	 * Check if email is verified
	 */
	static async isEmailVerified(clerkUserId: string): Promise<boolean> {
		const user = await this.getUserById(clerkUserId);
		return user.emailAddresses.some(
			email => email.verification?.status === 'verified'
		);
	}

	/**
	 * Check if phone is verified
	 */
	static async isPhoneVerified(clerkUserId: string): Promise<boolean> {
		const user = await this.getUserById(clerkUserId);
		return user.phoneNumbers.some(
			phone => phone.verification?.status === 'verified'
		);
	}

	/**
	 * Check if 2FA is enabled
	 */
	static async has2FAEnabled(clerkUserId: string): Promise<boolean> {
		const user = await this.getUserById(clerkUserId);
		return user.twoFactorEnabled;
	}

	/**
	 * List users (admin function)
	 */
	static async listUsers(params?: {
		limit?: number;
		offset?: number;
	}) {
		return await clerkClient.users.getUserList(params);
	}

	/**
	 * Get user count (admin function)
	 */
	static async getUserCount(): Promise<number> {
		const users = await clerkClient.users.getUserList({ limit: 1 });
		return users.totalCount;
	}
}
