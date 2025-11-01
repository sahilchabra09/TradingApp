/**
 * API Response Type Definitions
 */

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
	details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

export interface ApiError {
	success: false;
	error: string;
	code: string;
	details?: Record<string, any>;
	statusCode?: number;
}

export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code: string = 'INTERNAL_ERROR',
		public details?: Record<string, any>
	) {
		super(message);
		this.name = 'AppError';
		Error.captureStackTrace(this, this.constructor);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized', details?: Record<string, any>) {
		super(message, 401, 'UNAUTHORIZED', details);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden', details?: Record<string, any>) {
		super(message, 403, 'FORBIDDEN', details);
		this.name = 'ForbiddenError';
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Not found', details?: Record<string, any>) {
		super(message, 404, 'NOT_FOUND', details);
		this.name = 'NotFoundError';
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Validation error', details?: Record<string, any>) {
		super(message, 400, 'VALIDATION_ERROR', details);
		this.name = 'ValidationError';
	}
}

export class InsufficientBalanceError extends AppError {
	constructor(
		public required: string,
		public available: string,
		message = 'Insufficient balance'
	) {
		super(message, 400, 'INSUFFICIENT_BALANCE', { required, available });
		this.name = 'InsufficientBalanceError';
	}
}

export class TradingHoursError extends AppError {
	constructor(message = 'Trading is not allowed at this time') {
		super(message, 400, 'TRADING_HOURS_CLOSED');
		this.name = 'TradingHoursError';
	}
}

export class RateLimitError extends AppError {
	constructor(message = 'Too many requests', details?: Record<string, any>) {
		super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
		this.name = 'RateLimitError';
	}
}
