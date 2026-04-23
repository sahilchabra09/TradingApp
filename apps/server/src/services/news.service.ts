/**
 * News Service
 *
 * Two data paths:
 *
 * 1. REAL-TIME  — Maintains a persistent WebSocket connection to Alpaca's
 *    news stream (`wss://stream.data.alpaca.markets/v1beta1/news`).
 *    Incoming articles are buffered (latest NEWS_BUFFER_SIZE) and fanned
 *    out to all registered listeners.
 *
 * 2. HISTORICAL — Direct HTTP fetch to Alpaca's REST news endpoint
 *    (`https://data.alpaca.markets/v1beta1/news`).  Supports symbol
 *    filtering, date ranges, pagination and content inclusion.
 *
 * All stateful resources are stored on globalThis so they survive hot
 * reloads (same pattern as the market-data service).
 */

import WebSocket from 'ws';
import { AppError } from '../types/api';
import type { NewsArticle, HistoricalNewsQuery, HistoricalNewsResponse } from '../types/news';
import { NewsArticleSchema } from '../types/news';

// ─── Constants ────────────────────────────────────────────────────────────────

const NEWS_BUFFER_SIZE = 200;
/** How many articles to send as catch-up history when a client first connects. */
export const NEWS_CATCHUP_SIZE = 50;

const ALPACA_DATA_BASE_URL =
	process.env.APCA_DATA_BASE_URL || 'https://data.alpaca.markets';
const ALPACA_DATA_STREAM_URL =
	process.env.APCA_API_STREAM_URL || 'https://stream.data.alpaca.markets';

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS  = 60_000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ─── GlobalThis declarations ─────────────────────────────────────────────────

declare global {
	var __newsWsInitialized: boolean | undefined;
	var __newsWsAuthenticated: boolean | undefined;
	var __newsWs: WebSocket | undefined;
	var __newsWsReconnectAttempt: number | undefined;
	var __newsWsReconnectTimer: ReturnType<typeof setTimeout> | undefined;
	var __newsBuffer: NewsArticle[] | undefined;
	var __newsListeners: Set<(article: NewsArticle) => void> | undefined;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getNewsBuffer(): NewsArticle[] {
	if (!globalThis.__newsBuffer) globalThis.__newsBuffer = [];
	return globalThis.__newsBuffer;
}

function getNewsListeners(): Set<(article: NewsArticle) => void> {
	if (!globalThis.__newsListeners) globalThis.__newsListeners = new Set();
	return globalThis.__newsListeners;
}

function bufferArticle(article: NewsArticle) {
	const buffer = getNewsBuffer();
	// Prepend newest first; trim to max size.
	buffer.unshift(article);
	if (buffer.length > NEWS_BUFFER_SIZE) buffer.length = NEWS_BUFFER_SIZE;
}

function fanOutArticle(article: NewsArticle) {
	const listeners = getNewsListeners();
	for (const listener of listeners) {
		try {
			listener(article);
		} catch (err) {
			console.warn('[NewsService] listener error:', err);
		}
	}
}

function parseAlpacaNewsMessage(raw: unknown): NewsArticle[] {
	// Alpaca always sends arrays on the news stream
	if (!Array.isArray(raw)) return [];
	const articles: NewsArticle[] = [];
	for (const item of raw) {
		if (typeof item !== 'object' || item === null) continue;
		// Only process news type messages (T === "n")
		const entry = item as Record<string, unknown>;
		if (entry.T !== 'n') continue;
		const parsed = NewsArticleSchema.safeParse(entry);
		if (parsed.success) articles.push(parsed.data);
	}
	return articles;
}

function getReconnectDelay(attempt: number): number {
	const base   = RECONNECT_BASE_MS * Math.pow(2, attempt);
	const jitter = Math.random() * 1_000;
	return Math.min(base + jitter, RECONNECT_MAX_MS);
}

function buildNewsStreamUrl(): string {
	// Convert https:// → wss://
	const base = ALPACA_DATA_STREAM_URL.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
	return `${base}/v1beta1/news`;
}

// ─── WebSocket connection ─────────────────────────────────────────────────────

function scheduleNewsReconnect() {
	if (globalThis.__newsWsReconnectTimer) return; // already scheduled

	const attempt = globalThis.__newsWsReconnectAttempt ?? 0;
	if (attempt >= MAX_RECONNECT_ATTEMPTS) {
		console.error('[NewsService] Max reconnect attempts reached. News stream offline.');
		return;
	}

	const delay = getReconnectDelay(attempt);
	globalThis.__newsWsReconnectAttempt = attempt + 1;

	console.log(`[NewsService] Reconnecting news stream in ${Math.round(delay / 1000)}s (attempt ${attempt + 1})`);

	globalThis.__newsWsReconnectTimer = setTimeout(() => {
		globalThis.__newsWsReconnectTimer = undefined;
		connectNewsStream();
	}, delay);
}

function connectNewsStream() {
	// Already connected or connecting
	if (
		globalThis.__newsWs &&
		(globalThis.__newsWs.readyState === WebSocket.OPEN ||
			globalThis.__newsWs.readyState === WebSocket.CONNECTING)
	) {
		return;
	}

	if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
		console.warn('[NewsService] Alpaca credentials missing — news stream disabled.');
		return;
	}

	const url = buildNewsStreamUrl();
	if (process.env.NODE_ENV !== 'production') {
		console.log(`[NewsService] Connecting to ${url}`);
	}

	const ws = new WebSocket(url);
	globalThis.__newsWs              = ws;
	globalThis.__newsWsAuthenticated = false;

	ws.on('open', () => {
		if (process.env.NODE_ENV !== 'production') {
			console.log('[NewsService] WebSocket connected — authenticating…');
		}
		// Step 1: authenticate
		ws.send(JSON.stringify({
			action: 'auth',
			key:    process.env.APCA_API_KEY_ID,
			secret: process.env.APCA_API_SECRET_KEY,
		}));
	});

	ws.on('message', (data: Buffer | string) => {
		let payload: unknown;
		try {
			payload = JSON.parse(data.toString());
		} catch {
			return;
		}

		if (!Array.isArray(payload)) return;

		for (const msg of payload) {
			const m = msg as Record<string, unknown>;

			if (m.T === 'success' && m.msg === 'connected') {
				// Connection confirmed — auth message is sent in `open`
				continue;
			}

			if (m.T === 'success' && m.msg === 'authenticated') {
				globalThis.__newsWsAuthenticated = true;
				globalThis.__newsWsReconnectAttempt = 0; // reset backoff on auth success
				if (process.env.NODE_ENV !== 'production') {
					console.log('[NewsService] Authenticated — subscribing to all news.');
				}
				// Step 2: subscribe to all news
				ws.send(JSON.stringify({ action: 'subscribe', news: ['*'] }));
				continue;
			}

			if (m.T === 'subscription') {
				if (process.env.NODE_ENV !== 'production') {
					console.log('[NewsService] Subscription confirmed:', JSON.stringify(m.news));
				}
				continue;
			}

			if (m.T === 'error') {
				console.error('[NewsService] Stream error:', m.msg);
				continue;
			}
		}

		// Process any actual news articles in this batch
		const articles = parseAlpacaNewsMessage(payload);
		for (const article of articles) {
			bufferArticle(article);
			fanOutArticle(article);
		}
	});

	ws.on('error', (err: Error) => {
		console.warn('[NewsService] WebSocket error:', err.message);
	});

	ws.on('close', (code: number) => {
		globalThis.__newsWsAuthenticated = false;
		globalThis.__newsWs = undefined;
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[NewsService] WebSocket closed (code ${code}). Scheduling reconnect…`);
		}
		scheduleNewsReconnect();
	});
}

/**
 * Ensure the news stream is connected.  Safe to call multiple times — a
 * singleton is maintained via globalThis.
 */
export function ensureNewsStream() {
	if (!globalThis.__newsWsInitialized) {
		globalThis.__newsWsInitialized = true;
		globalThis.__newsWsReconnectAttempt = 0;
		connectNewsStream();
	}
}

/** Returns whether the upstream Alpaca news WS is currently authenticated. */
export function isNewsStreamConnected(): boolean {
	return Boolean(
		globalThis.__newsWs &&
		globalThis.__newsWs.readyState === WebSocket.OPEN &&
		globalThis.__newsWsAuthenticated
	);
}

/**
 * Register a callback that fires for every new real-time article.
 * Returns an unsubscribe function.
 */
export function onNewsArticle(
	listener: (article: NewsArticle) => void
): () => void {
	const listeners = getNewsListeners();
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/**
 * Return the most recent `count` buffered articles (newest first).
 * Articles are filtered to those matching `symbols` if provided.
 * Pass `["*"]` or omit for all articles.
 */
export function getRecentNewsBuffer(
	count = NEWS_CATCHUP_SIZE,
	symbols?: string[]
): NewsArticle[] {
	const buffer = getNewsBuffer();
	const useFilter = symbols && symbols.length > 0 && !symbols.includes('*');

	const filtered = useFilter
		? buffer.filter((a) =>
				a.symbols.some((s) => symbols!.includes(s.toUpperCase()))
		  )
		: buffer;

	return filtered.slice(0, count);
}

// ─── Historical news (REST) ───────────────────────────────────────────────────

/**
 * Fetch historical news from Alpaca's REST API.
 * Maps directly to GET https://data.alpaca.markets/v1beta1/news
 */
export async function getHistoricalNews(
	query: HistoricalNewsQuery
): Promise<HistoricalNewsResponse> {
	if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
		throw new AppError(
			'Alpaca credentials not configured.',
			503,
			'ALPACA_CONFIG_ERROR'
		);
	}

	const params = new URLSearchParams();
	if (query.symbols)             params.set('symbols', query.symbols);
	if (query.start)               params.set('start', query.start);
	if (query.end)                 params.set('end', query.end);
	if (query.page_token)          params.set('page_token', query.page_token);
	params.set('limit',            String(query.limit));
	params.set('sort',             query.sort);
	params.set('include_content',  String(query.include_content));
	params.set('exclude_contentless', String(query.exclude_contentless));

	const url = `${ALPACA_DATA_BASE_URL}/v1beta1/news?${params.toString()}`;

	let res: Response;
	try {
		res = await fetch(url, {
			headers: {
				'APCA-API-KEY-ID':     process.env.APCA_API_KEY_ID!,
				'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY!,
				Accept: 'application/json',
			},
		});
	} catch (err) {
		throw new AppError(
			'Failed to reach Alpaca news endpoint.',
			502,
			'ALPACA_NEWS_FETCH_ERROR',
			{ message: err instanceof Error ? err.message : String(err) }
		);
	}

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new AppError(
			`Alpaca news API returned ${res.status}.`,
			502,
			'ALPACA_NEWS_API_ERROR',
			{ status: res.status, body: body.slice(0, 300) }
		);
	}

	const json = (await res.json()) as { news?: unknown[]; next_page_token?: string | null };

	const news: NewsArticle[] = [];
	for (const item of json.news ?? []) {
		const parsed = NewsArticleSchema.safeParse(item);
		if (parsed.success) news.push(parsed.data);
	}

	return {
		news,
		next_page_token: json.next_page_token ?? null,
	};
}
