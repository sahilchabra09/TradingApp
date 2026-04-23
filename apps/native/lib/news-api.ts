/**
 * News API client
 * Mirrors the server's /api/news routes.
 */

type TokenGetter = () => Promise<string | null>;

const API_BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3004').replace(
	/\/+$/,
	''
);

// ─── Shared types ─────────────────────────────────────────────────────────────

export type NewsArticle = {
	id: number;
	headline: string;
	summary: string;
	author: string;
	created_at: string; // RFC-3339
	updated_at: string; // RFC-3339
	url: string | null;
	content: string;    // HTML — only populated when include_content=true
	symbols: string[];
	source: string;
};

export type HistoricalNewsResponse = {
	news: NewsArticle[];
	next_page_token: string | null;
};

export type NewsStreamStatus = {
	streamConnected: boolean;
	bufferedArticles: number;
};

// ─── REST client ──────────────────────────────────────────────────────────────

type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
};

async function newsRequest<T>(
	path: string,
	tokenGetter: TokenGetter,
	init: RequestInit = {}
): Promise<T> {
	const url   = `${API_BASE_URL}${path}`;
	const token = await tokenGetter();

	if (!token) throw new Error('Please sign in to read news.');

	const res  = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			'ngrok-skip-browser-warning': '1',
			Authorization: `Bearer ${token}`,
			...(init.headers || {}),
		},
	});

	const rawText = await res.text();
	let payload: ApiEnvelope<T>;
	try {
		payload = JSON.parse(rawText) as ApiEnvelope<T>;
	} catch {
		throw new Error(
			`Server returned invalid response (status ${res.status}). ` +
			'If using ngrok, ensure the tunnel is active.'
		);
	}

	if (!res.ok || !payload.success || payload.data === undefined) {
		throw new Error(payload.error || payload.message || 'News request failed.');
	}

	return payload.data;
}

// ─── Exported functions ───────────────────────────────────────────────────────

export type FetchNewsOptions = {
	/** Comma-separated symbols, e.g. "AAPL,TSLA". Omit for all. */
	symbols?: string;
	limit?: number;
	sort?: 'asc' | 'desc';
	/** RFC-3339 or YYYY-MM-DD */
	start?: string;
	end?: string;
	includeContent?: boolean;
	excludeContentless?: boolean;
	pageToken?: string;
};

/**
 * Fetch historical news.  Returns the latest articles by default.
 */
export function fetchNews(
	options: FetchNewsOptions,
	tokenGetter: TokenGetter
): Promise<HistoricalNewsResponse> {
	const params = new URLSearchParams();
	if (options.symbols)            params.set('symbols', options.symbols);
	if (options.start)              params.set('start', options.start);
	if (options.end)                params.set('end', options.end);
	if (options.pageToken)          params.set('page_token', options.pageToken);
	params.set('limit',             String(options.limit ?? 20));
	params.set('sort',              options.sort ?? 'desc');
	params.set('include_content',   String(options.includeContent ?? false));
	params.set('exclude_contentless', String(options.excludeContentless ?? false));

	return newsRequest<HistoricalNewsResponse>(
		`/api/news?${params.toString()}`,
		tokenGetter
	);
}

/**
 * Convenience wrapper: fetch recent news for a single symbol.
 * Used by the asset-detail screen's "Latest News" section.
 */
export function fetchNewsForSymbol(
	symbol: string,
	limit: number,
	tokenGetter: TokenGetter
): Promise<HistoricalNewsResponse> {
	return fetchNews(
		{ symbols: symbol.trim().toUpperCase(), limit, sort: 'desc' },
		tokenGetter
	);
}

/**
 * Fetch a single article with full HTML content.
 */
export function fetchArticleWithContent(
	options: FetchNewsOptions,
	tokenGetter: TokenGetter
): Promise<HistoricalNewsResponse> {
	return fetchNews({ ...options, includeContent: true, limit: 1 }, tokenGetter);
}

/** Check whether the upstream Alpaca news stream is live. */
export function fetchNewsStreamStatus(
	tokenGetter: TokenGetter
): Promise<NewsStreamStatus> {
	return newsRequest<NewsStreamStatus>('/api/news/status', tokenGetter);
}
