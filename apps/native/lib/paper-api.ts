type TokenGetter = () => Promise<string | null>;

/** Safely extract a human-readable message from an unknown error value.
 *  Handles the case where infrastructure (e.g. Vercel) returns `error` as an
 *  object like `{ code: "DEPLOYMENT_NOT_FOUND", message: "…" }` rather than
 *  a plain string, which would otherwise produce "[object Object]" in the UI.
 */
function extractErrorMessage(val: unknown, fallback: string): string {
	if (typeof val === 'string' && val.length > 0) return val;
	if (val !== null && typeof val === 'object') {
		const msg = (val as Record<string, unknown>).message;
		if (typeof msg === 'string' && msg.length > 0) return msg;
	}
	return fallback;
}

type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
	details?: Record<string, unknown>;
};

export type PaperAccount = {
	userId: string;
	clerkId: string | null;
	accountType: 'market_data_only' | 'demo_trader' | 'live_trader';
	kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';
	canTrade: boolean;
	balance: string;
	updatedAt: string;
};

export type PaperMarketData = {
	symbol: string;
	baseSymbol: string;
	instrumentId: string;
	exchange: string;
	currency: string | null;
	instrumentName: string | null;
	lastPrice: string;
	lastPriceSource: 'websocket' | 'rest';
	marketDataFeed: string;
	asOf: string;
};

export type PaperStatus = {
	userId: string;
	accountType: 'market_data_only' | 'demo_trader' | 'live_trader';
	kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';
	canActivateDemo: boolean;
	canTradeDemo: boolean;
	hasDemoAccount: boolean;
};

export type PaperTradePayload = {
	symbol: string;
	side: 'buy' | 'sell';
	quantity: string;
};

export type PaperTradeResult = {
	tradeId: string;
	userId: string;
	symbol: string;
	side: 'buy' | 'sell';
	quantity: string;
	marketPrice: string;
	executionPrice: string;
	slippagePct: string;
	grossAmount: string;
	cashBalance: string;
	timestamp: string;
};

export type PaperHolding = {
	id: string;
	symbol: string;
	instrumentId: string;
	instrumentName: string | null;
	quantity: string;
	avgPrice: string;
	currentPrice: string;
	marketValue: string;
	costBasis: string;
	pnlAmount: string;
	pnlPercent: string;
};

export type PaperHoldingsResponse = {
	userId: string;
	cash: string;
	holdings: PaperHolding[];
	totals: {
		holdingsValue: string;
		totalValue: string;
		totalPnl: string;
		totalPnlPercent: string;
	};
};

export type PaperPortfolioResponse = {
	userId: string;
	cash: string;
	holdingsValue: string;
	totalValue: string;
	totalPnl: string;
};

export type PaperTradeHistoryItem = {
	id: string;
	symbol: string;
	instrumentId: string;
	side: 'buy' | 'sell';
	quantity: string;
	price: string;
	notional: string;
	timestamp: string;
};

export type PaperTradeHistoryResponse = {
	userId: string;
	trades: PaperTradeHistoryItem[];
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(
	/\/+$/,
	''
);

async function paperRequest<T>(
	path: string,
	tokenGetter: TokenGetter,
	init: RequestInit = {}
): Promise<T> {
	const url = `${API_BASE_URL}${path}`;

	const token = await tokenGetter();
	if (!token) {
		throw new Error('Please sign in again to access paper trading.');
	}

	const response = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'ngrok-skip-browser-warning': '1',
			Authorization: `Bearer ${token}`,
			...(init.headers || {}),
		},
	});

	// Read as text first so we get a useful error if ngrok/proxy returns HTML
	const rawText = await response.text();

	let payload: ApiEnvelope<T>;
	try {
		payload = JSON.parse(rawText) as ApiEnvelope<T>;
	} catch {
		// Not valid JSON — likely ngrok interstitial HTML page or proxy error
		console.error(
			`[paper-api] ${url} returned non-JSON (status ${response.status}):`,
			rawText.slice(0, 200)
		);
		throw new Error(
			`Server returned invalid response (status ${response.status}). ` +
			'If using ngrok, ensure the tunnel is active.'
		);
	}

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(extractErrorMessage(payload.error, extractErrorMessage(payload.message, 'The paper trading request failed.')));
	}

	return payload.data;
}

export function getPaperAccount(tokenGetter: TokenGetter) {
	return paperRequest<PaperAccount>('/api/paper-trading/account', tokenGetter);
}

export function activatePaperAccount(tokenGetter: TokenGetter) {
	return paperRequest<PaperAccount>('/api/paper-trading/account', tokenGetter, {
		method: 'POST',
	});
}

export function getPaperStatus(tokenGetter: TokenGetter) {
	return paperRequest<PaperStatus>('/api/paper-trading/status', tokenGetter);
}

export function getPaperMarketData(symbol: string, tokenGetter: TokenGetter) {
	return paperRequest<PaperMarketData>(
		`/api/paper-trading/marketdata/${encodeURIComponent(symbol.trim().toUpperCase())}`,
		tokenGetter
	);
}

export function placePaperTrade(payload: PaperTradePayload, tokenGetter: TokenGetter) {
	return paperRequest<PaperTradeResult>('/api/paper-trading/trade', tokenGetter, {
		method: 'POST',
		body: JSON.stringify({
			...payload,
			symbol: payload.symbol.trim().toUpperCase(),
		}),
	});
}

export function getPaperHoldings(userId: string, tokenGetter: TokenGetter) {
	return paperRequest<PaperHoldingsResponse>(
		`/api/paper-trading/holdings/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

export function getPaperPortfolio(userId: string, tokenGetter: TokenGetter) {
	return paperRequest<PaperPortfolioResponse>(
		`/api/paper-trading/portfolio/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

export function getPaperTradeHistory(userId: string, tokenGetter: TokenGetter) {
	return paperRequest<PaperTradeHistoryResponse>(
		`/api/paper-trading/trades/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

// ─── Batch market data ────────────────────────────────────────────────────────

/**
 * Fetch live quotes for multiple symbols in one HTTP round-trip.
 * Calls GET /api/paper-trading/marketdata/batch?symbols=AAPL,MSFT,...
 */
export function getPaperBatchMarketData(symbols: string[], tokenGetter: TokenGetter) {
	const symbolsParam = symbols.map((s) => s.trim().toUpperCase()).join(',');
	return paperRequest<PaperMarketData[]>(
		`/api/paper-trading/marketdata/batch?symbols=${encodeURIComponent(symbolsParam)}`,
		tokenGetter
	);
}

// ─── Historical bars ──────────────────────────────────────────────────────────

export type HistoricalBar = {
	t: string;  // ISO timestamp
	o: number;  // open
	h: number;  // high
	l: number;  // low
	c: number;  // close
	v: number;  // volume
};

export type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y';

export type PaperMarketHistoryResponse = {
	symbol: string;
	period: ChartPeriod;
	bars: HistoricalBar[];
};

/**
 * Fetch OHLCV bar history for a single symbol.
 * Calls GET /api/paper-trading/marketdata/:symbol/history?period=1D|1W|1M|3M|1Y
 */
export function getPaperMarketHistory(
	symbol: string,
	period: ChartPeriod,
	tokenGetter: TokenGetter
) {
	return paperRequest<PaperMarketHistoryResponse>(
		`/api/paper-trading/marketdata/${encodeURIComponent(symbol.trim().toUpperCase())}/history?period=${encodeURIComponent(period)}`,
		tokenGetter
	);
}

// ─── Asset search ─────────────────────────────────────────────────────────────

export type AssetInfo = {
	symbol: string;
	name: string;
	exchange: string;
	tradable: boolean;
};

export type PaperAssetsResponse = AssetInfo[];

/**
 * Search US equity assets by symbol or company name.
 * Calls GET /api/paper-trading/assets?q=<query>&limit=<n>
 *
 * Results are ranked: exact symbol match → symbol prefix → name contains.
 */
export function searchPaperAssets(
	query: string,
	tokenGetter: TokenGetter,
	limit = 50,
) {
	const params = new URLSearchParams();
	const q = query.trim();
	if (q) params.set('q', q);
	params.set('limit', String(limit));
	return paperRequest<PaperAssetsResponse>(
		`/api/paper-trading/assets?${params.toString()}`,
		tokenGetter,
	);
}
