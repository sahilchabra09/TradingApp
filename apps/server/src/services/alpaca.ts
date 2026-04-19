import Alpaca from '@alpacahq/alpaca-trade-api';
import { AppError, NotFoundError } from '../types/api';
import type { PaperMarketDataResponse } from '../types/paper';

type SymbolAlias = {
	providerSymbol: string;
	exchange?: string;
	currency?: string | null;
	instrumentName?: string | null;
	notes?: string;
};

type AlpacaAsset = {
	id?: string;
	symbol?: string;
	name?: string;
	exchange?: string;
	class?: string;
	tradable?: boolean;
	status?: string;
	currency?: string;
	[key: string]: unknown;
};

type CachedAsset = {
	asset: AlpacaAsset;
	cachedAtMs: number;
};

type CachedTrade = {
	symbol: string;
	price: number;
	asOfIso: string;
	exchange: string | null;
};

export type AlpacaTradeTick = {
	providerSymbol: string;
	lastPrice: string;
	asOf: string;
	exchange: string | null;
};

type ResolvedSymbol = {
	requestedSymbol: string;
	baseSymbol: string;
	providerSymbol: string;
	instrumentId: string;
	exchange: string;
	currency: string | null;
	instrumentName: string | null;
	aliasNotes?: string;
};

const ALPACA_API_BASE_URL =
	process.env.APCA_API_BASE_URL || 'https://paper-api.alpaca.markets';
const ALPACA_DATA_BASE_URL =
	process.env.APCA_DATA_BASE_URL || 'https://data.alpaca.markets';
const ALPACA_DATA_STREAM_URL =
	process.env.APCA_API_STREAM_URL || 'https://stream.data.alpaca.markets';
const ALPACA_DATA_FEED = (process.env.APCA_DATA_FEED || 'iex').toLowerCase();
const ASSET_CACHE_TTL_MS = 15 * 60 * 1000;
const FRESH_TRADE_WINDOW_MS = 45 * 1000;

declare global {
	var __alpacaClient: Alpaca | undefined;
	var __alpacaWsInitialized: boolean | undefined;
	var __alpacaWsSubscribedSymbols: Set<string> | undefined;
	var __alpacaLastTrades: Map<string, CachedTrade> | undefined;
	var __alpacaAssetCache: Map<string, CachedAsset> | undefined;
	var __alpacaTradeListeners: Set<(tick: AlpacaTradeTick) => void> | undefined;
	var __alpacaAssetList: { assets: AlpacaAsset[]; cachedAtMs: number } | undefined;
}

const DEFAULT_SYMBOL_ALIASES: Record<string, SymbolAlias> = {};

function normalizeSymbol(value: string) {
	return value.trim().toUpperCase();
}

function getBaseSymbol(value: string) {
	const normalized = normalizeSymbol(value);
	const [base] = normalized.split('.');
	return base || normalized;
}

function parseSymbolAliases(): Record<string, SymbolAlias> {
	const raw = process.env.ALPACA_SYMBOL_ALIASES;
	if (!raw) {
		return DEFAULT_SYMBOL_ALIASES;
	}

	try {
		const parsed = JSON.parse(raw) as Record<string, SymbolAlias>;
		return {
			...DEFAULT_SYMBOL_ALIASES,
			...Object.fromEntries(
				Object.entries(parsed).map(([symbol, mapping]) => [
					normalizeSymbol(symbol),
					{
						...mapping,
						providerSymbol: normalizeSymbol(mapping.providerSymbol),
					},
				])
			),
		};
	} catch (error) {
		console.warn('[Alpaca] Failed to parse ALPACA_SYMBOL_ALIASES JSON:', error);
		return DEFAULT_SYMBOL_ALIASES;
	}
}

function ensureCredentials() {
	if (!process.env.APCA_API_KEY_ID || !process.env.APCA_API_SECRET_KEY) {
		throw new AppError(
			'Alpaca credentials are not configured. Set APCA_API_KEY_ID and APCA_API_SECRET_KEY.',
			503,
			'ALPACA_CONFIG_ERROR'
		);
	}
}

function getAlpacaClient() {
	ensureCredentials();
	if (globalThis.__alpacaClient) {
		return globalThis.__alpacaClient;
	}

	const usePaper =
		(process.env.APCA_API_BASE_URL || '').includes('paper-api.alpaca.markets') ||
		!process.env.APCA_API_BASE_URL;

	globalThis.__alpacaClient = new Alpaca({
		keyId: process.env.APCA_API_KEY_ID,
		secretKey: process.env.APCA_API_SECRET_KEY,
		paper: usePaper,
		baseUrl: ALPACA_API_BASE_URL,
		dataBaseUrl: ALPACA_DATA_BASE_URL,
		dataStreamUrl: ALPACA_DATA_STREAM_URL,
		feed: ALPACA_DATA_FEED,
		verbose: process.env.NODE_ENV !== 'production',
	});

	return globalThis.__alpacaClient;
}

function getTradeCache() {
	if (!globalThis.__alpacaLastTrades) {
		globalThis.__alpacaLastTrades = new Map();
	}
	return globalThis.__alpacaLastTrades;
}

function getAssetCache() {
	if (!globalThis.__alpacaAssetCache) {
		globalThis.__alpacaAssetCache = new Map();
	}
	return globalThis.__alpacaAssetCache;
}

function getSubscribedSymbols() {
	if (!globalThis.__alpacaWsSubscribedSymbols) {
		globalThis.__alpacaWsSubscribedSymbols = new Set();
	}
	return globalThis.__alpacaWsSubscribedSymbols;
}

function getTradeListeners() {
	if (!globalThis.__alpacaTradeListeners) {
		globalThis.__alpacaTradeListeners = new Set();
	}
	return globalThis.__alpacaTradeListeners;
}

function extractErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown error';
}

function extractHttpStatus(error: unknown) {
	const maybeError = error as { response?: { status?: number } };
	return maybeError?.response?.status;
}

function toCachedTrade(raw: unknown): CachedTrade | null {
	const trade = raw as {
		Symbol?: string;
		Price?: number;
		Timestamp?: string;
		Exchange?: string;
	};

	if (!trade?.Symbol || typeof trade.Price !== 'number' || !Number.isFinite(trade.Price)) {
		return null;
	}

	return {
		symbol: normalizeSymbol(trade.Symbol),
		price: trade.Price,
		asOfIso: trade.Timestamp ? new Date(trade.Timestamp).toISOString() : new Date().toISOString(),
		exchange: trade.Exchange || null,
	};
}

function connectMarketDataWebsocket() {
	const client = getAlpacaClient();
	if (globalThis.__alpacaWsInitialized) {
		return;
	}

	const websocket = client.data_stream_v2;
	const cache = getTradeCache();
	const subscribedSymbols = getSubscribedSymbols();

	websocket.onStockTrade((trade: unknown) => {
		const nextTrade = toCachedTrade(trade);
		if (!nextTrade) {
			return;
		}
		cache.set(nextTrade.symbol, nextTrade);
		const listeners = getTradeListeners();
		const tick: AlpacaTradeTick = {
			providerSymbol: nextTrade.symbol,
			lastPrice: nextTrade.price.toString(),
			asOf: nextTrade.asOfIso,
			exchange: nextTrade.exchange,
		};
		for (const listener of listeners) {
			try {
				listener(tick);
			} catch (error) {
				console.warn('[Alpaca WS] listener callback failed:', extractErrorMessage(error));
			}
		}
	});

	websocket.onError((error: Error) => {
		console.warn('[Alpaca WS] market data stream error:', error.message);
	});

	websocket.onStateChange((state: string) => {
		if (process.env.NODE_ENV !== 'production') {
			console.log(`[Alpaca WS] state: ${state}`);
		}
	});

	websocket.onConnect(() => {
		const symbols = [...subscribedSymbols];
		if (!symbols.length) {
			return;
		}

		try {
			websocket.subscribeForTrades(symbols);
		} catch (error) {
			console.warn('[Alpaca WS] subscribe on connect failed:', extractErrorMessage(error));
		}
	});

	globalThis.__alpacaWsInitialized = true;

	try {
		websocket.connect();
	} catch (error) {
		console.warn('[Alpaca WS] initial connect failed:', extractErrorMessage(error));
	}
}

function subscribeSymbolsForRealtime(symbols: string[]) {
	if (!symbols.length) {
		return;
	}

	connectMarketDataWebsocket();
	const client = getAlpacaClient();
	const websocket = client.data_stream_v2;
	const subscribedSymbols = getSubscribedSymbols();
	const newSymbols: string[] = [];

	for (const symbol of symbols) {
		const normalized = normalizeSymbol(symbol);
		if (subscribedSymbols.has(normalized)) {
			continue;
		}
		subscribedSymbols.add(normalized);
		newSymbols.push(normalized);
	}

	if (!newSymbols.length) {
		return;
	}

	const currentState = String((websocket as any)?.session?.currentState || '').toLowerCase();
	if (currentState !== 'authenticated') {
		return;
	}

	try {
		websocket.subscribeForTrades(newSymbols);
	} catch (error) {
		console.warn('[Alpaca WS] subscribe failed:', extractErrorMessage(error));
	}
}

export function onAlpacaTradeTick(listener: (tick: AlpacaTradeTick) => void) {
	const listeners = getTradeListeners();
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

function getFreshCachedTrade(symbol: string) {
	const normalized = normalizeSymbol(symbol);
	const cached = getTradeCache().get(normalized);
	if (!cached) {
		return null;
	}

	const ageMs = Date.now() - new Date(cached.asOfIso).getTime();
	if (!Number.isFinite(ageMs) || ageMs > FRESH_TRADE_WINDOW_MS) {
		return null;
	}

	return cached;
}

async function fetchLatestTrades(symbols: string[]) {
	if (!symbols.length) {
		return new Map<string, CachedTrade>();
	}

	const normalizedSymbols = symbols.map((symbol) => normalizeSymbol(symbol));
	const client = getAlpacaClient();
	const cache = getTradeCache();
	const result = new Map<string, CachedTrade>();

	try {
		const response = (await client.getLatestTrades(normalizedSymbols)) as Map<string, unknown>;
		for (const symbol of normalizedSymbols) {
			const trade = toCachedTrade(response.get(symbol));
			if (!trade) {
				continue;
			}
			cache.set(symbol, trade);
			result.set(symbol, trade);
		}
		return result;
	} catch (error) {
		const message = extractErrorMessage(error);
		const status = extractHttpStatus(error);
		throw new AppError('Failed to fetch latest Alpaca trades', 502, 'ALPACA_MARKETDATA_ERROR', {
			status: status || null,
			symbols: normalizedSymbols,
			message,
		});
	}
}

async function getAssetFromAlpaca(providerSymbol: string) {
	const normalizedSymbol = normalizeSymbol(providerSymbol);
	const cache = getAssetCache();
	const now = Date.now();
	const cached = cache.get(normalizedSymbol);

	if (cached && now - cached.cachedAtMs < ASSET_CACHE_TTL_MS) {
		return cached.asset;
	}

	const client = getAlpacaClient();
	try {
		const asset = (await client.getAsset(normalizedSymbol)) as AlpacaAsset;
		if (!asset || typeof asset !== 'object') {
			throw new NotFoundError(`No Alpaca asset found for ${normalizedSymbol}`);
		}

		cache.set(normalizedSymbol, {
			asset,
			cachedAtMs: now,
		});
		return asset;
	} catch (error) {
		const status = extractHttpStatus(error);
		if (status === 404) {
			throw new NotFoundError(`Symbol ${normalizedSymbol} is not available from Alpaca`, {
				symbol: normalizedSymbol,
				hint: 'Use Alpaca-supported symbols (for example AAPL, TSLA, SPY) or define ALPACA_SYMBOL_ALIASES for custom mapping.',
			});
		}

		throw new AppError('Failed to load symbol metadata from Alpaca', 502, 'ALPACA_ASSET_LOOKUP_ERROR', {
			symbol: normalizedSymbol,
			status: status || null,
			message: extractErrorMessage(error),
		});
	}
}

async function resolveSymbol(symbol: string): Promise<ResolvedSymbol> {
	const requestedSymbol = normalizeSymbol(symbol);
	const alias = parseSymbolAliases()[requestedSymbol];
	const providerSymbol = alias?.providerSymbol || requestedSymbol;
	const asset = await getAssetFromAlpaca(providerSymbol);

	return {
		requestedSymbol,
		baseSymbol: getBaseSymbol(requestedSymbol),
		providerSymbol,
		instrumentId: String(asset.id || providerSymbol),
		exchange: alias?.exchange || String(asset.exchange || 'ALPACA'),
		currency: alias?.currency || (typeof asset.currency === 'string' ? asset.currency : 'USD'),
		instrumentName: alias?.instrumentName || (asset.name ? String(asset.name) : null),
		aliasNotes: alias?.notes,
	};
}

export async function resolveAlpacaSymbols(symbols: string[]) {
	const uniqueSymbols = [...new Set(symbols.map((symbol) => normalizeSymbol(symbol)).filter(Boolean))];
	return Promise.all(uniqueSymbols.map((symbol) => resolveSymbol(symbol)));
}

export function ensureAlpacaRealtimeSubscriptions(providerSymbols: string[]) {
	subscribeSymbolsForRealtime(providerSymbols.map((symbol) => normalizeSymbol(symbol)));
}

function buildSnapshot(
	resolved: ResolvedSymbol,
	trade: CachedTrade,
	source: 'websocket' | 'rest'
): PaperMarketDataResponse {
	return {
		symbol: resolved.requestedSymbol,
		baseSymbol: resolved.baseSymbol,
		instrumentId: resolved.instrumentId,
		exchange: resolved.exchange,
		currency: resolved.currency,
		instrumentName: resolved.instrumentName,
		lastPrice: trade.price.toString(),
		lastPriceSource: source,
		marketDataFeed: ALPACA_DATA_FEED,
		asOf: trade.asOfIso,
	};
}

export async function getAlpacaSnapshot(symbol: string): Promise<PaperMarketDataResponse> {
	const resolved = await resolveSymbol(symbol);
	subscribeSymbolsForRealtime([resolved.providerSymbol]);

	const cachedTrade = getFreshCachedTrade(resolved.providerSymbol);
	if (cachedTrade) {
		return buildSnapshot(resolved, cachedTrade, 'websocket');
	}

	const latestTrades = await fetchLatestTrades([resolved.providerSymbol]);
	const fetchedTrade = latestTrades.get(resolved.providerSymbol);

	if (!fetchedTrade) {
		throw new AppError(`No latest trade returned for ${resolved.requestedSymbol}`, 502, 'ALPACA_PRICE_UNAVAILABLE', {
			symbol: resolved.requestedSymbol,
			providerSymbol: resolved.providerSymbol,
		});
	}

	return buildSnapshot(resolved, fetchedTrade, 'rest');
}

export async function getAlpacaSnapshots(symbols: string[]) {
	const resolvedSymbols = await resolveAlpacaSymbols(symbols);

	subscribeSymbolsForRealtime(resolvedSymbols.map((item) => item.providerSymbol));

	const freshByProvider = new Map<string, CachedTrade>();
	const missingProviderSymbols: string[] = [];

	for (const item of resolvedSymbols) {
		const cached = getFreshCachedTrade(item.providerSymbol);
		if (cached) {
			freshByProvider.set(item.providerSymbol, cached);
		} else {
			missingProviderSymbols.push(item.providerSymbol);
		}
	}

	const fetchedByProvider = await fetchLatestTrades([...new Set(missingProviderSymbols)]);

	return Object.fromEntries(
		resolvedSymbols.map((item) => {
			const cached = freshByProvider.get(item.providerSymbol);
			if (cached) {
				return [item.requestedSymbol, buildSnapshot(item, cached, 'websocket')] as const;
			}

			const fetched = fetchedByProvider.get(item.providerSymbol);
			if (!fetched) {
				throw new AppError(
					`No latest trade returned for ${item.requestedSymbol}`,
					502,
					'ALPACA_PRICE_UNAVAILABLE',
					{
						symbol: item.requestedSymbol,
						providerSymbol: item.providerSymbol,
					}
				);
			}

			return [item.requestedSymbol, buildSnapshot(item, fetched, 'rest')] as const;
		})
	);
}

export const ALPACA_MARKET_DATA_CONFIG = {
	apiBaseUrl: ALPACA_API_BASE_URL,
	dataBaseUrl: ALPACA_DATA_BASE_URL,
	dataStreamUrl: ALPACA_DATA_STREAM_URL,
	dataFeed: ALPACA_DATA_FEED,
	defaultSymbolAliases: DEFAULT_SYMBOL_ALIASES,
};

// ─── Historical bars ──────────────────────────────────────────────────────────

export type HistoricalBar = {
	t: string; // ISO timestamp
	o: number; // open
	h: number; // high
	l: number; // low
	c: number; // close
	v: number; // volume
};

export type HistoryPeriod = '1D' | '1W' | '1M' | '3M' | '1Y';

type AlpacaRawBar = {
	// lowercase (direct API JSON)
	t?: string;
	o?: number;
	h?: number;
	l?: number;
	c?: number;
	v?: number;
	// uppercase (some SDK versions / WebSocket feed)
	Timestamp?: string;
	OpenPrice?: number;
	HighPrice?: number;
	LowPrice?: number;
	ClosePrice?: number;
	Volume?: number;
};

function parseRawBar(raw: unknown): HistoricalBar | null {
	const bar = raw as AlpacaRawBar;
	const timestamp = bar.t || bar.Timestamp;
	const close = bar.c ?? bar.ClosePrice;
	if (!timestamp || typeof close !== 'number' || !Number.isFinite(close)) {
		return null;
	}
	const open  = (typeof bar.o === 'number' ? bar.o : bar.OpenPrice)  ?? close;
	const high  = (typeof bar.h === 'number' ? bar.h : bar.HighPrice)  ?? close;
	const low   = (typeof bar.l === 'number' ? bar.l : bar.LowPrice)   ?? close;
	const vol   = (typeof bar.v === 'number' ? bar.v : bar.Volume)     ?? 0;
	return {
		t: new Date(timestamp).toISOString(),
		o: typeof open === 'number' ? open : close,
		h: typeof high === 'number' ? high : close,
		l: typeof low  === 'number' ? low  : close,
		c: close,
		v: typeof vol  === 'number' ? vol  : 0,
	};
}

function getHistoryTimeframe(period: HistoryPeriod): {
	timeframe: string;
	startMs: number;
	limit: number;
} {
	const DAY = 24 * 60 * 60 * 1000;
	switch (period) {
		case '1D': return { timeframe: '5Min',  startMs:   2 * DAY, limit: 100 };
		case '1W': return { timeframe: '15Min', startMs:  10 * DAY, limit: 150 };
		case '1M': return { timeframe: '1Hour', startMs:  35 * DAY, limit: 200 };
		case '3M': return { timeframe: '1Day',  startMs:  95 * DAY, limit: 100 };
		case '1Y': return { timeframe: '1Day',  startMs: 370 * DAY, limit: 365 };
	}
}

export async function getAlpacaHistoricalBars(
	symbol: string,
	period: HistoryPeriod
): Promise<HistoricalBar[]> {
	const resolved = await resolveSymbol(symbol);
	const client = getAlpacaClient();
	const { timeframe, startMs, limit } = getHistoryTimeframe(period);
	const now   = new Date();
	const start = new Date(now.getTime() - startMs);
	const bars: HistoricalBar[] = [];

	try {
		const generator = client.getBarsV2(resolved.providerSymbol, {
			start: start.toISOString(),
			end:   now.toISOString(),
			limit,
			timeframe,
			feed: ALPACA_DATA_FEED,
		});

		for await (const rawBar of generator) {
			const bar = parseRawBar(rawBar);
			if (bar) bars.push(bar);
		}
	} catch (error) {
		throw new AppError(
			'Failed to fetch historical bars from Alpaca',
			502,
			'ALPACA_HISTORY_ERROR',
			{
				symbol:    resolved.requestedSymbol,
				period,
				timeframe,
				status:    extractHttpStatus(error) || null,
				message:   extractErrorMessage(error),
			}
		);
	}

	return bars;
}

// ─── Asset search ─────────────────────────────────────────────────────────────

const ASSET_LIST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export type SearchedAsset = {
	symbol: string;
	name: string;
	exchange: string;
	tradable: boolean;
};

async function getFullAssetList(): Promise<AlpacaAsset[]> {
	const now = Date.now();
	if (
		globalThis.__alpacaAssetList &&
		now - globalThis.__alpacaAssetList.cachedAtMs < ASSET_LIST_CACHE_TTL_MS
	) {
		return globalThis.__alpacaAssetList.assets;
	}

	const client = getAlpacaClient();
	const assets = (await client.getAssets({
		status: 'active',
		asset_class: 'us_equity',
	})) as AlpacaAsset[];

	globalThis.__alpacaAssetList = { assets, cachedAtMs: now };
	return assets;
}

export async function searchAlpacaAssets(
	query: string,
	limit = 50,
): Promise<SearchedAsset[]> {
	const assets = await getFullAssetList();
	const q = query.trim().toUpperCase();

	if (!q) {
		// No query — return the first tradable assets as a default listing
		return assets
			.filter((a) => a.tradable && a.symbol)
			.slice(0, limit)
			.map((a) => ({
				symbol: String(a.symbol),
				name: String(a.name || a.symbol),
				exchange: String(a.exchange || 'UNKNOWN'),
				tradable: Boolean(a.tradable),
			}));
	}

	const exactSymbol: SearchedAsset[] = [];
	const prefixSymbol: SearchedAsset[] = [];
	const nameContains: SearchedAsset[] = [];

	for (const asset of assets) {
		if (!asset.tradable || !asset.symbol) continue;

		const sym  = String(asset.symbol).toUpperCase();
		const name = String(asset.name || '').toUpperCase();

		const item: SearchedAsset = {
			symbol: sym,
			name: String(asset.name || sym),
			exchange: String(asset.exchange || 'UNKNOWN'),
			tradable: Boolean(asset.tradable),
		};

		if (sym === q) {
			exactSymbol.push(item);
		} else if (sym.startsWith(q)) {
			prefixSymbol.push(item);
		} else if (name.includes(q)) {
			nameContains.push(item);
		}
	}

	return [...exactSymbol, ...prefixSymbol, ...nameContains].slice(0, limit);
}
