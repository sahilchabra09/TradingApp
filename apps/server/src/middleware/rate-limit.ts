/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair usage
 * FSC Mauritius Compliance: Protects against suspicious automated activity
 */

import type { Context, Next } from 'hono';
import { RateLimitError } from '../types/api';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Max requests per window
}

// Different rate limits for different endpoint types
const rateLimitConfigs: Record<string, RateLimitConfig> = {
	default: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
	auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
	trading: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
	withdrawal: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 requests per hour
	admin: { windowMs: 60 * 1000, maxRequests: 200 }, // 200 requests per minute
};

/**
 * Get rate limit configuration based on path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
	if (path.includes('/auth/')) return rateLimitConfigs.auth;
	if (path.includes('/trades/') || path.includes('/orders/'))
		return rateLimitConfigs.trading;
	if (path.includes('/withdrawals/')) return rateLimitConfigs.withdrawal;
	if (path.includes('/admin/')) return rateLimitConfigs.admin;
	return rateLimitConfigs.default;
}

/**
 * Rate limiting middleware
 */
export const rateLimiter = async (c: Context, next: Next) => {
	// Skip rate limiting for health checks
	if (c.req.path === '/health' || c.req.path === '/') {
		return next();
	}

	// Get identifier (user ID or IP address)
	const userId = c.get('userId');
	const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
	const identifier = userId || ip;

	// Get rate limit config for this path
	const config = getRateLimitConfig(c.req.path);
	const key = `${identifier}:${c.req.path}`;

	// Clean up expired entries periodically
	const now = Date.now();
	if (Math.random() < 0.01) {
		// 1% chance to clean up
		for (const [k, v] of rateLimitStore.entries()) {
			if (v.resetAt < now) {
				rateLimitStore.delete(k);
			}
		}
	}

	// Get or create rate limit record
	let record = rateLimitStore.get(key);

	if (!record || record.resetAt < now) {
		// Create new window
		record = {
			count: 0,
			resetAt: now + config.windowMs,
		};
		rateLimitStore.set(key, record);
	}

	// Increment count
	record.count++;

	// Set rate limit headers
	c.header('X-RateLimit-Limit', config.maxRequests.toString());
	c.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - record.count).toString());
	c.header('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

	// Check if limit exceeded
	if (record.count > config.maxRequests) {
		const retryAfter = Math.ceil((record.resetAt - now) / 1000);
		c.header('Retry-After', retryAfter.toString());

		throw new RateLimitError('Too many requests. Please try again later.', {
			retryAfter,
			limit: config.maxRequests,
			windowMs: config.windowMs,
		});
	}

	await next();
};

/**
 * Clear rate limit for a specific user (useful after login/logout)
 */
export function clearUserRateLimit(userId: string): void {
	const keysToDelete: string[] = [];
	for (const key of rateLimitStore.keys()) {
		if (key.startsWith(`${userId}:`)) {
			keysToDelete.push(key);
		}
	}
	keysToDelete.forEach(key => rateLimitStore.delete(key));
}
