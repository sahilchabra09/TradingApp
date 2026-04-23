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
import { openAPIRouteHandler } from 'hono-openapi';
import { Scalar } from '@scalar/hono-api-reference';
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
import paperTradingRoutes from './routes/paperTrading';
import newsRoutes from './routes/news';
import { ensureNewsStream } from './services/news.service';

type Bindings = {
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	DATABASE_URL: string;
	ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ── Global middleware ──────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
	origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
	credentials: true,
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', prettyJSON());

// ── Clerk auth — applied per route-group ──────────────────────────────────────
app.use('/api/v1/auth/*', clerkMiddleware());
app.use('/api/v1/users/*', clerkMiddleware());
app.use('/api/v1/kyc/*', clerkMiddleware());
app.use('/api/paper-trading/*', clerkMiddleware());
app.use('/api/news/*', clerkMiddleware());

// ── Custom middleware ──────────────────────────────────────────────────────────
app.use('*', rateLimiter);
app.use('*', auditLogger);

// ── Health check ──────────────────────────────────────────────────────────────
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

// ── API v1 routes ─────────────────────────────────────────────────────────────
// Using app.route() (not basePath) so openAPIRouteHandler can discover all routes
const apiV1 = new Hono<{ Bindings: Bindings }>();
apiV1.route('/auth', authRoutes);
apiV1.route('/users', userRoutes);
apiV1.route('/kyc', kycRoutes);
apiV1.route('/admin', adminRoutes);
app.route('/api/v1', apiV1);

app.route('/api/paper-trading', paperTradingRoutes);
app.route('/api/news', newsRoutes);

// ── Warm up Alpaca news WebSocket ─────────────────────────────────────────────
ensureNewsStream();

// ── OpenAPI spec — /openapi.json ──────────────────────────────────────────────
// All routes with describeRoute() are reflected here automatically.
// includeEmptyPaths: true also shows routes that don't yet have describeRoute().
app.get(
	'/openapi.json',
	openAPIRouteHandler(app, {
		documentation: {
			info: {
				title: 'Trading Platform API',
				version: '1.0.0',
				description:
					'REST API for the Trading Platform — FSC Mauritius compliant. ' +
					'Authenticate with a Clerk JWT via the Authorization: Bearer header.',
			},
			servers: [
				{ url: 'http://localhost:3004', description: 'Local development' },
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT',
						description: 'Clerk JWT — pass via Authorization: Bearer <token>',
					},
				},
			},
			security: [{ bearerAuth: [] }],
		},
		includeEmptyPaths: true,
	}),
);

// ── Scalar API docs — /api-docs ───────────────────────────────────────────────
app.get(
	'/api-docs',
	Scalar({
		url: '/openapi.json',
		pageTitle: 'Trading Platform API Docs',
		theme: 'saturn',
	}),
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({
	success: false,
	error: 'Route not found',
	code: 'NOT_FOUND',
	path: c.req.path,
}, 404));

// ── Global error handler ──────────────────────────────────────────────────────
app.onError(errorHandler);

export default {
	port: process.env.PORT || 3004,
	fetch: app.fetch,
	websocket,
};
