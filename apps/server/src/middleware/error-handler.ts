/**
 * Global Error Handler Middleware
 * Catches and formats all application errors
 */

import type { Context } from 'hono';
import type { ApiResponse } from '../types/api';
import { AppError } from '../types/api';

export const errorHandler = (err: Error, c: Context) => {
	console.error('Error:', {
		name: err.name,
		message: err.message,
		stack: err.stack,
		path: c.req.path,
		method: c.req.method,
	});

	// Handle AppError instances
	if (err instanceof AppError) {
		return c.json<ApiResponse>(
			{
				success: false,
				error: err.message,
				code: err.code,
				details: err.details,
			},
			err.statusCode as any
		);
	}

	// Handle Zod validation errors
	if (err.name === 'ZodError') {
		const zodError = err as any;
		return c.json<ApiResponse>(
			{
				success: false,
				error: 'Validation failed',
				code: 'VALIDATION_ERROR',
				details: {
					issues: zodError.errors || zodError.issues,
				},
			},
			400 as any
		);
	}

	// Handle Clerk errors
	if (err.message?.includes('Clerk')) {
		return c.json<ApiResponse>(
			{
				success: false,
				error: 'Authentication service error',
				code: 'AUTH_SERVICE_ERROR',
			},
			500 as any
		);
	}

	// Handle database errors
	if (err.message?.includes('database') || err.name === 'PostgresError') {
		return c.json<ApiResponse>(
			{
				success: false,
				error: 'Database error',
				code: 'DATABASE_ERROR',
			},
			500 as any
		);
	}

	// Default internal server error
	return c.json<ApiResponse>(
		{
			success: false,
			error: process.env.NODE_ENV === 'production' 
				? 'Internal server error' 
				: err.message,
			code: 'INTERNAL_ERROR',
		},
		500 as any
	);
};
