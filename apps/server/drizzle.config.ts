/**
 * Drizzle Kit Configuration
 * FSC Mauritius Compliant Trading Platform
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/db/schema/index.ts',
	out: './src/db/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL || '',
	},
	verbose: true,
	strict: true,
	migrations: {
		table: 'drizzle_migrations',
		schema: 'public',
	},
});
