/**
 * Environment Variables Type Definitions
 * Ensures type safety for environment configuration
 */

export interface Env {
	// Database
	DATABASE_URL: string;

	// Clerk Authentication
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_WEBHOOK_SECRET: string;

	// External APIs
	POLYGON_API_KEY?: string;
	BROKER_API_KEY?: string;
	BROKER_API_SECRET?: string;
	MCB_PAYMENT_KEY?: string;
	DIDIT_API_KEY?: string;

	// Application
	PORT?: string;
	NODE_ENV: 'development' | 'production' | 'test';
	ALLOWED_ORIGINS: string;

	// AWS
	AWS_REGION?: string;
	AWS_ACCESS_KEY_ID?: string;
	AWS_SECRET_ACCESS_KEY?: string;

	// Redis
	REDIS_URL?: string;

	// Monitoring
	SENTRY_DSN?: string;
	LOG_LEVEL?: string;
}

declare global {
	namespace NodeJS {
		interface ProcessEnv extends Env {}
	}
}
