/**
 * News Routes
 *
 * GET  /api/news          — Paginated historical news (REST proxy to Alpaca)
 * GET  /api/news/stream   — Real-time news stream (WebSocket upgrade)
 */

import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { describeRoute, validator as zValidator } from 'hono-openapi';
import { requireAuth } from '../middleware/clerk-auth';
import {
	ensureNewsStream,
	getHistoricalNews,
	getRecentNewsBuffer,
	isNewsStreamConnected,
	onNewsArticle,
	NEWS_CATCHUP_SIZE,
} from '../services/news.service';
import { HistoricalNewsQuerySchema, NewsClientMessageSchema } from '../types/news';
import type { NewsArticle, NewsStreamMessage } from '../types/news';

const newsRoutes = new Hono();

// ─── GET /api/news ────────────────────────────────────────────────────────────
// Fetch paginated historical news from Alpaca REST.
// All query params map 1:1 to the Alpaca API.
//
// Query params:
//   symbols          — comma-separated tickers, e.g. "AAPL,TSLA"
//   limit            — 1–50, default 20
//   sort             — "asc" | "desc", default "desc"
//   start            — RFC-3339 or YYYY-MM-DD
//   end              — RFC-3339 or YYYY-MM-DD
//   include_content  — boolean, default false
//   exclude_contentless — boolean, default false
//   page_token       — pagination cursor from previous response

newsRoutes.get(
	'/',
	describeRoute({
		tags: ['News'],
		summary: 'Get historical news',
		description: 'Fetches paginated news from Alpaca REST. Supports filtering by symbols, date range, sort order, and pagination via page_token.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'News articles returned' },
			401: { description: 'Not authenticated' },
			500: { description: 'Alpaca fetch failed' },
		},
	}),
	requireAuth,
	zValidator('query', HistoricalNewsQuerySchema),
	async (c) => {
		const query = c.req.valid('query');

		try {
			const result = await getHistoricalNews(query);
			return c.json({ success: true, data: result });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'Failed to fetch news.';
			const status =
				(err as { status?: number })?.status === 502 ? 502 : 500;
			return c.json(
				{ success: false, error: message, code: 'NEWS_FETCH_ERROR' },
				status
			);
		}
	}
);

// ─── GET /api/news/status ─────────────────────────────────────────────────────
// Healthcheck: is the upstream Alpaca news stream live?

newsRoutes.get(
	'/status',
	describeRoute({
		tags: ['News'],
		summary: 'News stream status',
		description: 'Returns whether the upstream Alpaca WebSocket news stream is connected and how many articles are in the buffer.',
		security: [{ bearerAuth: [] }],
		responses: {
			200: { description: 'Stream status returned' },
			401: { description: 'Not authenticated' },
		},
	}),
	requireAuth,
	(c) => {
	return c.json({
		success: true,
		data: {
			streamConnected: isNewsStreamConnected(),
			bufferedArticles: (globalThis as any).__newsBuffer?.length ?? 0,
		},
	});
});

// ─── GET /api/news/stream (WebSocket) ────────────────────────────────────────
//
// Upgrades the connection to WebSocket.  On connect the server sends the last
// NEWS_CATCHUP_SIZE articles from the buffer, then fans out new real-time
// articles as they arrive.
//
// Query params:
//   symbols — comma-separated list or "*" (default "*" = all news)
//
// Client → Server messages:
//   { "type": "subscribe",   "symbols": ["AAPL", "TSLA"] }
//   { "type": "unsubscribe", "symbols": ["AAPL"] }
//   { "type": "ping" }
//
// Server → Client messages:
//   { "type": "ready" }
//   { "type": "history",     "articles": [...] }
//   { "type": "article",     "article": {...} }
//   { "type": "subscribed",  "symbols": [...] }
//   { "type": "unsubscribed","symbols": [...] }
//   { "type": "pong",        "asOf": "ISO..." }
//   { "type": "error",       "message": "..." }

newsRoutes.get(
	'/stream',
	describeRoute({
		tags: ['News'],
		summary: 'Real-time news stream (WebSocket)',
		description: 'Upgrades to WebSocket. On connect the server pushes the last 50 articles, then fans out new articles in real time. Subscribe/unsubscribe to specific tickers via JSON messages.',
		security: [{ bearerAuth: [] }],
		responses: {
			101: { description: 'WebSocket upgrade successful' },
			401: { description: 'Not authenticated' },
		},
	}),
	requireAuth,
	upgradeWebSocket((c) => {
		// Parse initial symbol filter from query param
		const rawSymbols = c.req.query('symbols') || '*';
		let subscribedSymbols: Set<string> = new Set(
			rawSymbols === '*'
				? ['*']
				: rawSymbols
						.split(',')
						.map((s) => s.trim().toUpperCase())
						.filter(Boolean)
		);

		let unsubscribeNewsListener: (() => void) | null = null;

		function sendJson(ws: { send: (data: string) => void }, msg: NewsStreamMessage) {
			try {
				ws.send(JSON.stringify(msg));
			} catch {
				// WS already closed
			}
		}

		function isArticleRelevant(article: NewsArticle): boolean {
			if (subscribedSymbols.has('*')) return true;
			return article.symbols.some((s) =>
				subscribedSymbols.has(s.toUpperCase())
			);
		}

		return {
			onOpen(_event, ws) {
				// Ensure the upstream Alpaca news stream is active
				ensureNewsStream();

				// 1. Tell the client we're ready
				sendJson(ws, { type: 'ready' });

				// 2. Send catch-up articles from the buffer
				const symbolFilter = subscribedSymbols.has('*')
					? undefined
					: [...subscribedSymbols];
				const catchup = getRecentNewsBuffer(NEWS_CATCHUP_SIZE, symbolFilter);
				if (catchup.length > 0) {
					sendJson(ws, { type: 'history', articles: catchup });
				}

				// 3. Register real-time listener
				unsubscribeNewsListener = onNewsArticle((article) => {
					if (!isArticleRelevant(article)) return;
					sendJson(ws, { type: 'article', article });
				});
			},

			onMessage(event, ws) {
				if (typeof event.data !== 'string') return;

				let raw: unknown;
				try {
					raw = JSON.parse(event.data);
				} catch {
					sendJson(ws, { type: 'error', message: 'Invalid JSON payload.' });
					return;
				}

				const parsed = NewsClientMessageSchema.safeParse(raw);
				if (!parsed.success) {
					sendJson(ws, {
						type: 'error',
						message: 'Invalid message format.',
					});
					return;
				}

				const msg = parsed.data;

				switch (msg.type) {
					case 'subscribe': {
						const normalised = msg.symbols.map((s) => s.trim().toUpperCase());
						if (normalised.includes('*')) {
							subscribedSymbols = new Set(['*']);
						} else {
							for (const s of normalised) subscribedSymbols.add(s);
						}
						sendJson(ws, {
							type: 'subscribed',
							symbols: [...subscribedSymbols],
						});

						// Send catch-up for newly subscribed symbols
						const filter = subscribedSymbols.has('*') ? undefined : normalised;
						const catchup = getRecentNewsBuffer(20, filter);
						if (catchup.length > 0) {
							sendJson(ws, { type: 'history', articles: catchup });
						}
						break;
					}

					case 'unsubscribe': {
						const normalised = msg.symbols.map((s) => s.trim().toUpperCase());
						for (const s of normalised) subscribedSymbols.delete(s);
						// Always keep at least '*' if nothing else is left
						if (subscribedSymbols.size === 0) subscribedSymbols.add('*');
						sendJson(ws, {
							type: 'unsubscribed',
							symbols: normalised,
						});
						break;
					}

					case 'ping':
						sendJson(ws, { type: 'pong', asOf: new Date().toISOString() });
						break;
				}
			},

			onClose() {
				unsubscribeNewsListener?.();
				unsubscribeNewsListener = null;
			},

			onError() {
				unsubscribeNewsListener?.();
				unsubscribeNewsListener = null;
			},
		};
	})
);

export default newsRoutes;
