/**
 * Common Validation Utilities
 */

import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Phone number validation (E.164 format)
 */
export const phoneSchema = z
	.string()
	.regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format');

/**
 * Pagination query params schema
 */
export const paginationSchema = z.object({
	page: z.string().optional().default('1').transform(Number),
	limit: z.string().optional().default('20').transform(Number),
});

/**
 * Date range query params schema
 */
export const dateRangeSchema = z.object({
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
});

/**
 * Decimal string to number transformation
 */
export const decimalSchema = z
	.string()
	.refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number')
	.transform((val) => parseFloat(val));

/**
 * Positive decimal validation
 */
export const positiveDecimalSchema = decimalSchema.refine(
	(val) => val > 0,
	'Must be a positive number'
);

/**
 * Currency amount validation (2 decimal places)
 */
export const currencyAmountSchema = z
	.string()
	.regex(/^\d+(\.\d{1,2})?$/, 'Invalid currency amount format')
	.transform((val) => parseFloat(val));

/**
 * ISO 8601 date string validation
 */
export const isoDateSchema = z.string().datetime();

/**
 * Validates FSC Mauritius compliant address
 */
export const addressSchema = z.object({
	street: z.string().min(1).max(255),
	city: z.string().min(1).max(100),
	state: z.string().max(100).optional(),
	country: z.string().length(3, 'Must be ISO 3166-1 alpha-3 code'),
	postalCode: z.string().min(1).max(20),
});

/**
 * Trading order side validation
 */
export const orderSideSchema = z.enum(['buy', 'sell']);

/**
 * Order type validation
 */
export const orderTypeSchema = z.enum(['market', 'limit', 'stop', 'stop_limit']);

/**
 * Time in force validation
 */
export const timeInForceSchema = z.enum(['day', 'gtc', 'ioc', 'fok']);

/**
 * Sort order validation
 */
export const sortOrderSchema = z.enum(['asc', 'desc']);

/**
 * Helper to validate enum values
 */
export function createEnumSchema<T extends readonly string[]>(
	values: T,
	errorMessage?: string
) {
	return z.enum(values as any, {
		message: errorMessage || `Must be one of: ${values.join(', ')}`,
	});
}

/**
 * Sanitize user input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
	return input
		.replace(/[<>]/g, '') // Remove < and >
		.trim()
		.slice(0, 1000); // Limit length
}

/**
 * Validate and parse JSON string
 */
export function parseJsonSafe<T = any>(jsonString: string): T | null {
	try {
		return JSON.parse(jsonString) as T;
	} catch {
		return null;
	}
}
