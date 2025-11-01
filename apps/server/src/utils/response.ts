/**
 * Standardized API Response Utilities
 */

import type { Context } from 'hono';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export class ResponseHelper {
	/**
	 * Success response with data
	 */
	static success<T>(c: Context, data: T, message?: string, statusCode: number = 200) {
		return c.json<ApiResponse<T>>(
			{
				success: true,
				data,
				message,
			},
			statusCode as any
		);
	}

	/**
	 * Success response with paginated data
	 */
	static paginated<T>(
		c: Context,
		data: T[],
		pagination: PaginatedResponse<T>['pagination'],
		statusCode: number = 200
	) {
		return c.json<ApiResponse<PaginatedResponse<T>>>(
			{
				success: true,
				data: {
					data,
					pagination,
				},
			},
			statusCode as any
		);
	}

	/**
	 * Error response
	 */
	static error(
		c: Context,
		error: string,
		code: string,
		statusCode: number = 400,
		details?: Record<string, any>
	) {
		return c.json<ApiResponse>(
			{
				success: false,
				error,
				code,
				details,
			},
			statusCode as any
		);
	}

	/**
	 * Created response (201)
	 */
	static created<T>(c: Context, data: T, message?: string) {
		return ResponseHelper.success(c, data, message, 201);
	}

	/**
	 * No content response (204)
	 */
	static noContent(c: Context) {
		return c.body(null, 204);
	}

	/**
	 * Unauthorized response (401)
	 */
	static unauthorized(c: Context, message = 'Unauthorized') {
		return ResponseHelper.error(c, message, 'UNAUTHORIZED', 401);
	}

	/**
	 * Forbidden response (403)
	 */
	static forbidden(c: Context, message = 'Forbidden') {
		return ResponseHelper.error(c, message, 'FORBIDDEN', 403);
	}

	/**
	 * Not found response (404)
	 */
	static notFound(c: Context, message = 'Resource not found') {
		return ResponseHelper.error(c, message, 'NOT_FOUND', 404);
	}

	/**
	 * Validation error response (400)
	 */
	static validationError(c: Context, details: Record<string, any>) {
		return ResponseHelper.error(
			c,
			'Validation failed',
			'VALIDATION_ERROR',
			400,
			details
		);
	}

	/**
	 * Internal server error response (500)
	 */
	static internalError(c: Context, message = 'Internal server error') {
		return ResponseHelper.error(c, message, 'INTERNAL_ERROR', 500);
	}

	/**
	 * Rate limit error response (429)
	 */
	static rateLimitExceeded(c: Context, retryAfter?: number) {
		const response = ResponseHelper.error(
			c,
			'Too many requests',
			'RATE_LIMIT_EXCEEDED',
			429,
			retryAfter ? { retryAfter } : undefined
		);

		if (retryAfter) {
			c.header('Retry-After', retryAfter.toString());
		}

		return response;
	}
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
	page: number,
	limit: number,
	total: number
): PaginatedResponse<any>['pagination'] {
	const totalPages = Math.ceil(total / limit);
	const hasMore = page < totalPages;

	return {
		page,
		limit,
		total,
		totalPages,
		hasMore,
	};
}
