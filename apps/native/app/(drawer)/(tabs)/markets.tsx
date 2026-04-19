import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import {
	getPaperBatchMarketData,
	searchPaperAssets,
	type AssetInfo,
	type PaperMarketData,
} from '@/lib/paper-api';
import { formatCurrency } from '@/lib/formatters';
import { useStableToken } from '@/lib/hooks';

// ─── Stock universe (popular watchlist) ───────────────────────────────────────

const MARKET_SYMBOLS = [
	// Mega-cap tech
	'AAPL', 'MSFT', 'NVDA', 'META', 'AMZN', 'GOOGL', 'TSLA', 'AVGO',
	// Mid-cap tech
	'AMD', 'NFLX', 'ORCL', 'CRM', 'ADBE', 'INTC', 'CSCO', 'QCOM', 'TXN', 'IBM',
	// Finance
	'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'PYPL',
	// Healthcare
	'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE',
	// Consumer
	'WMT', 'PG', 'KO', 'PEP', 'MCD', 'SBUX', 'NKE', 'DIS', 'COST', 'HD',
	// Energy
	'XOM', 'CVX',
	// Industrials
	'CAT', 'BA', 'HON', 'UPS', 'GE',
	// Telecom
	'T', 'VZ',
	// Emerging tech
	'PLTR', 'COIN', 'UBER', 'SPOT', 'SNAP',
	// ETFs
	'SPY', 'QQQ', 'IWM', 'GLD', 'VOO',
] as const;

/** Fallback names when Alpaca instrumentName is null */
const COMPANY_NAMES: Record<string, string> = {
	AAPL: 'Apple Inc.', MSFT: 'Microsoft Corporation', NVDA: 'NVIDIA Corporation',
	META: 'Meta Platforms Inc.', AMZN: 'Amazon.com Inc.', GOOGL: 'Alphabet Inc.',
	TSLA: 'Tesla Inc.', AVGO: 'Broadcom Inc.', AMD: 'Advanced Micro Devices',
	NFLX: 'Netflix Inc.', ORCL: 'Oracle Corporation', CRM: 'Salesforce Inc.',
	ADBE: 'Adobe Inc.', INTC: 'Intel Corporation', CSCO: 'Cisco Systems',
	QCOM: 'Qualcomm Inc.', TXN: 'Texas Instruments', IBM: 'IBM',
	JPM: 'JPMorgan Chase & Co.', V: 'Visa Inc.', MA: 'Mastercard Inc.',
	BAC: 'Bank of America', WFC: 'Wells Fargo & Co.', GS: 'Goldman Sachs Group',
	MS: 'Morgan Stanley', C: 'Citigroup Inc.', PYPL: 'PayPal Holdings',
	UNH: 'UnitedHealth Group', JNJ: 'Johnson & Johnson', LLY: 'Eli Lilly and Company',
	ABBV: 'AbbVie Inc.', MRK: 'Merck & Co.', PFE: 'Pfizer Inc.',
	WMT: 'Walmart Inc.', PG: 'Procter & Gamble', KO: 'The Coca-Cola Company',
	PEP: 'PepsiCo Inc.', MCD: "McDonald's Corporation", SBUX: 'Starbucks Corporation',
	NKE: 'Nike Inc.', DIS: 'The Walt Disney Company', COST: 'Costco Wholesale',
	HD: 'The Home Depot', XOM: 'Exxon Mobil Corporation', CVX: 'Chevron Corporation',
	CAT: 'Caterpillar Inc.', BA: 'Boeing Company', HON: 'Honeywell International',
	UPS: 'United Parcel Service', GE: 'GE Vernova', T: 'AT&T Inc.',
	VZ: 'Verizon Communications', PLTR: 'Palantir Technologies', COIN: 'Coinbase Global',
	UBER: 'Uber Technologies', SPOT: 'Spotify Technology', SNAP: 'Snap Inc.',
	SPY: 'SPDR S&P 500 ETF', QQQ: 'Invesco QQQ Trust', IWM: 'iShares Russell 2000 ETF',
	GLD: 'SPDR Gold Shares', VOO: 'Vanguard S&P 500 ETF',
};

function getCompanyName(quote: PaperMarketData): string {
	return quote.instrumentName || COMPANY_NAMES[quote.symbol] || quote.symbol;
}

const toNumber = (value: string) => Number(value || 0);

const SEARCH_DEBOUNCE_MS = 300;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MarketsScreen() {
	const router                   = useRouter();
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken           = useStableToken(getToken);

	const [searchQuery, setSearchQuery]         = useState('');
	const [isLoading, setIsLoading]             = useState(true);
	const [isSearchLoading, setIsSearchLoading] = useState(false);
	const [error, setError]                     = useState<string | null>(null);
	const [quotes, setQuotes]                   = useState<PaperMarketData[]>([]);
	const [searchResults, setSearchResults]     = useState<AssetInfo[]>([]);

	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Whether the search bar has content
	const isSearchMode = searchQuery.trim().length > 0;

	// ── Popular stocks (initial load) ─────────────────────────────────────────
	const loadQuotes = useCallback(async () => {
		if (!isSignedIn) { setIsLoading(false); return; }
		try {
			setIsLoading(true);
			const results = await getPaperBatchMarketData([...MARKET_SYMBOLS], stableGetToken);
			results.sort((a, b) => getCompanyName(a).localeCompare(getCompanyName(b)));
			setQuotes(results);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load market quotes.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn, stableGetToken]);

	useEffect(() => { void loadQuotes(); }, [loadQuotes]);

	// ── Debounced asset search ────────────────────────────────────────────────
	useEffect(() => {
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

		const q = searchQuery.trim();
		if (!q) {
			setSearchResults([]);
			setIsSearchLoading(false);
			return;
		}

		setIsSearchLoading(true);
		setError(null);

		searchTimerRef.current = setTimeout(async () => {
			try {
				const results = await searchPaperAssets(q, stableGetToken, 60);
				setSearchResults(results);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Search failed.');
			} finally {
				setIsSearchLoading(false);
			}
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [searchQuery, stableGetToken]);

	// Popular list is shown as-is (already sorted alphabetically)
	const visibleQuotes = useMemo(() => (isSearchMode ? [] : quotes), [quotes, isSearchMode]);

	const navigateToAsset = (symbol: string) =>
		router.push({ pathname: '/misc/asset-detail', params: { symbol } });

	return (
		<LinearGradient
			colors={['#000000', '#0a1f18', '#000000']}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				{/* ── Search bar ──────────────────────────────────────────── */}
				<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							backgroundColor: 'rgba(255,255,255,0.06)',
							borderRadius: 16,
							paddingHorizontal: 14,
							height: 50,
							borderWidth: 1,
							borderColor: 'rgba(255,255,255,0.1)',
						}}
					>
						<Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 10 }} />
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search 10,000+ US stocks..."
							placeholderTextColor="#4B5563"
							style={{ flex: 1, color: '#FFFFFF', fontSize: 15 }}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={18} color="#6B7280" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* ── Error banner ────────────────────────────────────────── */}
				{error ? (
					<View
						style={{
							marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12,
							backgroundColor: 'rgba(239,68,68,0.12)',
							borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)',
						}}
					>
						<Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
					</View>
				) : null}

				{/* ── Content ─────────────────────────────────────────────── */}
				{isSearchMode ? (
					/* ── Search results ──────────────────────────────────── */
					isSearchLoading ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
							<ActivityIndicator color="#10B981" size="large" />
							<Text style={{ color: '#6B7280', marginTop: 14, fontSize: 14 }}>
								Searching stocks...
							</Text>
						</View>
					) : (
						<FlatList
							data={searchResults}
							keyExtractor={(item) => item.symbol}
							contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 110 }}
							showsVerticalScrollIndicator={false}
							renderItem={({ item }) => (
								<AssetSearchRow
									asset={item}
									onPress={() => navigateToAsset(item.symbol)}
								/>
							)}
							ListEmptyComponent={
								<View
									style={{
										padding: 24, alignItems: 'center',
										backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
										borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
									}}
								>
									<Text style={{ color: '#6B7280' }}>
										No stocks match "{searchQuery.trim()}".
									</Text>
								</View>
							}
						/>
					)
				) : (
					/* ── Popular watchlist ───────────────────────────────── */
					isLoading ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
							<ActivityIndicator color="#10B981" size="large" />
							<Text style={{ color: '#6B7280', marginTop: 14, fontSize: 14 }}>
								Loading market data...
							</Text>
						</View>
					) : (
						<FlatList
							data={visibleQuotes}
							keyExtractor={(item) => item.symbol}
							contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 110 }}
							showsVerticalScrollIndicator={false}
							renderItem={({ item }) => (
								<StockRow
									quote={item}
									onPress={() => navigateToAsset(item.symbol)}
								/>
							)}
							ListEmptyComponent={
								<View
									style={{
										padding: 24, alignItems: 'center',
										backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
										borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
									}}
								>
									<Text style={{ color: '#6B7280' }}>No stocks found.</Text>
								</View>
							}
						/>
					)
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}

// ─── Popular stock row (live price) ──────────────────────────────────────────

function StockRow({ quote, onPress }: { quote: PaperMarketData; onPress: () => void }) {
	const companyName = getCompanyName(quote);
	const price       = toNumber(quote.lastPrice);

	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
				paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
				borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
			}}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				{/* Ticker badge */}
				<View
					style={{
						width: 46, height: 46, borderRadius: 12,
						backgroundColor: 'rgba(16,185,129,0.08)',
						borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)',
						justifyContent: 'center', alignItems: 'center', marginRight: 14,
					}}
				>
					<Text
						style={{
							color: '#10B981',
							fontSize: quote.symbol.length > 4 ? 9 : 11,
							fontWeight: '700', letterSpacing: -0.3,
						}}
						numberOfLines={1}
					>
						{quote.symbol}
					</Text>
				</View>

				{/* Company name + exchange */}
				<View style={{ flex: 1, marginRight: 8 }}>
					<Text
						style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 3 }}
						numberOfLines={1}
					>
						{companyName}
					</Text>
					<Text style={{ color: '#4B5563', fontSize: 12 }} numberOfLines={1}>
						{quote.symbol} · {quote.exchange}
					</Text>
				</View>

				{/* Price */}
				<View style={{ alignItems: 'flex-end' }}>
					<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
						{formatCurrency(price)}
					</Text>
					<Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2 }}>
						{quote.marketDataFeed}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
}

// ─── Search result row (no price — navigate on tap) ──────────────────────────

function AssetSearchRow({ asset, onPress }: { asset: AssetInfo; onPress: () => void }) {
	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
				paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
				borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
			}}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				{/* Ticker badge */}
				<View
					style={{
						width: 46, height: 46, borderRadius: 12,
						backgroundColor: 'rgba(16,185,129,0.08)',
						borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)',
						justifyContent: 'center', alignItems: 'center', marginRight: 14,
					}}
				>
					<Text
						style={{
							color: '#10B981',
							fontSize: asset.symbol.length > 4 ? 9 : 11,
							fontWeight: '700', letterSpacing: -0.3,
						}}
						numberOfLines={1}
					>
						{asset.symbol}
					</Text>
				</View>

				{/* Company name + exchange */}
				<View style={{ flex: 1, marginRight: 8 }}>
					<Text
						style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 3 }}
						numberOfLines={1}
					>
						{asset.name}
					</Text>
					<Text style={{ color: '#4B5563', fontSize: 12 }} numberOfLines={1}>
						{asset.symbol} · {asset.exchange}
					</Text>
				</View>

				{/* Chevron */}
				<Ionicons name="chevron-forward" size={16} color="#4B5563" />
			</View>
		</TouchableOpacity>
	);
}
