/**
 * Database Connection - Drizzle ORM with Neon PostgreSQL
 * FSC Mauritius Compliant Trading Platform
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Validate DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set');
}

// Create Neon SQL connection
const sql = neon(process.env.DATABASE_URL);

// Initialize Drizzle with full schema
export const db = drizzle(sql, { 
	schema,
	logger: process.env.NODE_ENV === 'development',
});

// Export schema for use in queries
export * from './schema';

// Export Drizzle operators for convenience
export { eq, and, or, desc, asc, sql, gte, lte, between, like, ilike, inArray } from 'drizzle-orm';
