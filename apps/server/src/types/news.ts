/**
 * News Types & Zod Schemas
 * Covers both real-time Alpaca news stream and historical news REST API.
 */

import { z } from 'zod';

// ─── Article (shared by WS stream and REST response) ─────────────────────────

export const NewsArticleSchema = z.object({
	/** "n" on the WS stream, absent on REST */
	T: z.string().optional(),
	id: z.number(),
	headline: z.string(),
	summary: z.string().default(''),
	author: z.string().default(''),
	created_at: z.string(), // RFC-3339
	updated_at: z.string(), // RFC-3339
	url: z.string().nullable().optional(),
	/** HTML content — only present when include_content=true */
	content: z.string().default(''),
	symbols: z.array(z.string()).default([]),
	source: z.string().default(''),
});

export type NewsArticle = z.infer<typeof NewsArticleSchema>;

// ─── Historical news query params ─────────────────────────────────────────────

export const HistoricalNewsQuerySchema = z.object({
	/** Comma-separated ticker symbols, e.g. "AAPL,TSLA". Omit for all symbols. */
	symbols: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
	sort: z.enum(['asc', 'desc']).default('desc'),
	/** RFC-3339 or YYYY-MM-DD inclusive start */
	start: z.string().optional(),
	/** RFC-3339 or YYYY-MM-DD inclusive end */
	end: z.string().optional(),
	/** Include full HTML article body in the response */
	include_content: z.coerce.boolean().default(false),
	/** Exclude articles that have no content */
	exclude_contentless: z.coerce.boolean().default(false),
	/** Pagination cursor returned by the previous response */
	page_token: z.string().optional(),
});

export type HistoricalNewsQuery = z.infer<typeof HistoricalNewsQuerySchema>;

// ─── Historical news response (Alpaca REST envelope) ─────────────────────────

export type HistoricalNewsResponse = {
	news: NewsArticle[];
	next_page_token: string | null;
};

// ─── WebSocket server-to-client message types ─────────────────────────────────

export type NewsStreamMessage =
	| { type: 'ready' }
	| { type: 'history'; articles: NewsArticle[] }
	| { type: 'article'; article: NewsArticle }
	| { type: 'subscribed'; symbols: string[] }
	| { type: 'unsubscribed'; symbols: string[] }
	| { type: 'pong'; asOf: string }
	| { type: 'error'; message: string };

// ─── WebSocket client-to-server message schema ────────────────────────────────

export const NewsClientMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('subscribe'),
		/** Use ["*"] to subscribe to all news */
		symbols: z.array(z.string()).min(1),
	}),
	z.object({
		type: z.literal('unsubscribe'),
		symbols: z.array(z.string()).min(1),
	}),
	z.object({ type: z.literal('ping') }),
]);

export type NewsClientMessage = z.infer<typeof NewsClientMessageSchema>;
