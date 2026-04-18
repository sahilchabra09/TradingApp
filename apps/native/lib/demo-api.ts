type TokenGetter = () => Promise<string | null>;

type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	code?: string;
	details?: Record<string, unknown>;
};

export type DemoAccount = {
	userId: string;
	clerkId: string | null;
	accountType: 'market_data_only' | 'demo_trader' | 'live_trader';
	kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';
	canTrade: boolean;
	balance: string;
	updatedAt: string;
};

export type DemoMarketData = {
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

export type DemoStatus = {
	userId: string;
	accountType: 'market_data_only' | 'demo_trader' | 'live_trader';
	kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected' | 'resubmission_required';
	canActivateDemo: boolean;
	canTradeDemo: boolean;
	hasDemoAccount: boolean;
};

export type DemoTradePayload = {
	symbol: string;
	side: 'buy' | 'sell';
	quantity: string;
};

export type DemoTradeResult = {
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

export type DemoHolding = {
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

export type DemoHoldingsResponse = {
	userId: string;
	cash: string;
	holdings: DemoHolding[];
	totals: {
		holdingsValue: string;
		totalValue: string;
		totalPnl: string;
		totalPnlPercent: string;
	};
};

export type DemoPortfolioResponse = {
	userId: string;
	cash: string;
	holdingsValue: string;
	totalValue: string;
	totalPnl: string;
};

export type DemoTradeHistoryItem = {
	id: string;
	symbol: string;
	instrumentId: string;
	side: 'buy' | 'sell';
	quantity: string;
	price: string;
	notional: string;
	timestamp: string;
};

export type DemoTradeHistoryResponse = {
	userId: string;
	trades: DemoTradeHistoryItem[];
};

const API_BASE_URL = (process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(
	/\/+$/,
	''
);

async function demoRequest<T>(
	path: string,
	tokenGetter: TokenGetter,
	init: RequestInit = {}
): Promise<T> {
	const url = `${API_BASE_URL}${path}`;

	const token = await tokenGetter();
	if (!token) {
		throw new Error('Please sign in again to access demo trading.');
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
			`[demo-api] ${url} returned non-JSON (status ${response.status}):`,
			rawText.slice(0, 200)
		);
		throw new Error(
			`Server returned invalid response (status ${response.status}). ` +
			'If using ngrok, ensure the tunnel is active.'
		);
	}

	if (!response.ok || !payload.success || !payload.data) {
		throw new Error(payload.error || payload.message || 'The demo trading request failed.');
	}

	return payload.data;
}

export function getDemoAccount(tokenGetter: TokenGetter) {
	return demoRequest<DemoAccount>('/api/demo/account', tokenGetter);
}

export function activateDemoAccount(tokenGetter: TokenGetter) {
	return demoRequest<DemoAccount>('/api/demo/account', tokenGetter, {
		method: 'POST',
	});
}

export function getDemoStatus(tokenGetter: TokenGetter) {
	return demoRequest<DemoStatus>('/api/demo/status', tokenGetter);
}

export function getDemoMarketData(symbol: string, tokenGetter: TokenGetter) {
	return demoRequest<DemoMarketData>(
		`/api/demo/marketdata/${encodeURIComponent(symbol.trim().toUpperCase())}`,
		tokenGetter
	);
}

export function placeDemoTrade(payload: DemoTradePayload, tokenGetter: TokenGetter) {
	return demoRequest<DemoTradeResult>('/api/demo/trade', tokenGetter, {
		method: 'POST',
		body: JSON.stringify({
			...payload,
			symbol: payload.symbol.trim().toUpperCase(),
		}),
	});
}

export function getDemoHoldings(userId: string, tokenGetter: TokenGetter) {
	return demoRequest<DemoHoldingsResponse>(
		`/api/demo/holdings/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

export function getDemoPortfolio(userId: string, tokenGetter: TokenGetter) {
	return demoRequest<DemoPortfolioResponse>(
		`/api/demo/portfolio/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

export function getDemoTradeHistory(userId: string, tokenGetter: TokenGetter) {
	return demoRequest<DemoTradeHistoryResponse>(
		`/api/demo/trades/${encodeURIComponent(userId)}`,
		tokenGetter
	);
}

// ─── Batch market data ────────────────────────────────────────────────────────

/**
 * Fetch live quotes for multiple symbols in one HTTP round-trip.
 * Calls GET /api/demo/marketdata/batch?symbols=AAPL,MSFT,...
 */
export function getDemoBatchMarketData(symbols: string[], tokenGetter: TokenGetter) {
	const symbolsParam = symbols.map((s) => s.trim().toUpperCase()).join(',');
	return demoRequest<DemoMarketData[]>(
		`/api/demo/marketdata/batch?symbols=${encodeURIComponent(symbolsParam)}`,
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

export type DemoMarketHistoryResponse = {
	symbol: string;
	period: ChartPeriod;
	bars: HistoricalBar[];
};

/**
 * Fetch OHLCV bar history for a single symbol.
 * Calls GET /api/demo/marketdata/:symbol/history?period=1D|1W|1M|3M|1Y
 */
export function getDemoMarketHistory(
	symbol: string,
	period: ChartPeriod,
	tokenGetter: TokenGetter
) {
	return demoRequest<DemoMarketHistoryResponse>(
		`/api/demo/marketdata/${encodeURIComponent(symbol.trim().toUpperCase())}/history?period=${encodeURIComponent(period)}`,
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

export type DemoAssetsResponse = AssetInfo[];

/**
 * Search US equity assets by symbol or company name.
 * Calls GET /api/demo/assets?q=<query>&limit=<n>
 *
 * Results are ranked: exact symbol match → symbol prefix → name contains.
 */
export function searchDemoAssets(
	query: string,
	tokenGetter: TokenGetter,
	limit = 50,
) {
	const params = new URLSearchParams();
	const q = query.trim();
	if (q) params.set('q', q);
	params.set('limit', String(limit));
	return demoRequest<DemoAssetsResponse>(
		`/api/demo/assets?${params.toString()}`,
		tokenGetter,
	);
}
