/**
 * Trading Platform API - Main Entry Point
 * Framework: Hono with Bun runtime
 * Authentication: Clerk
 * Database: PostgreSQL with Drizzle ORM
 * FSC Mauritius Compliance: Complete regulatory compliance built-in
 */

import "dotenv/config";
import { Hono } from "hono";
import { websocket } from 'hono/bun';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import { clerkMiddleware } from '@hono/clerk-auth';
import { logger } from "./middlewares/pino-logger.js";

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limit';
import { auditLogger } from './middleware/audit-logger';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import kycRoutes from './routes/kyc';
import adminRoutes from './routes/admin';
import demoRoutes from './routes/demo';
// Import other routes when created
// import tradeRoutes from './routes/trades';
// import walletRoutes from './routes/wallets';

type Bindings = {
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	DATABASE_URL: string;
	ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({ 
	origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
	credentials: true,
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', prettyJSON());

// Clerk middleware — enabled for user-facing routes (auth, users, kyc)
// Admin routes don't use Clerk auth (POC mode)
app.use('/api/v1/auth/*', clerkMiddleware());
app.use('/api/v1/users/*', clerkMiddleware());
app.use('/api/v1/kyc/*', clerkMiddleware());
app.use('/api/demo/*', clerkMiddleware());

// Custom middleware
app.use('*', rateLimiter);
app.use('*', auditLogger);

// Health check (no auth required)
app.get('/', (c) => {
	return c.json({
		status: 'ok',
		message: 'Trading Platform API',
		version: '1.0.0',
		timestamp: new Date().toISOString(),
	});
});

app.get('/health', (c) => {
	return c.json({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || 'development',
	});
});

// API v1 routes
const api = app.basePath('/api/v1');

// Mount routes
api.route('/auth', authRoutes);
api.route('/users', userRoutes);
api.route('/kyc', kycRoutes);
api.route('/admin', adminRoutes);
app.route('/api/demo', demoRoutes);
// Add other routes when created
// api.route('/trades', tradeRoutes);
// api.route('/wallets', walletRoutes);

// 404 handler
app.notFound((c) => c.json({ 
	success: false,
	error: 'Route not found',
	code: 'NOT_FOUND',
	path: c.req.path,
}, 404));

// Global error handler (must be last)
app.onError(errorHandler);

export default {
	port: process.env.PORT || 3004,
	fetch: app.fetch,
	websocket,
};
