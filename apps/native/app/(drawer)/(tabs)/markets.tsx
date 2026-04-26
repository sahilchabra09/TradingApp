import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { Spinner } from '@/components/Spinner';
import { useAppTheme } from '@/lib/ThemeContext';
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
	'AAPL', 'MSFT', 'NVDA', 'META', 'AMZN', 'GOOGL', 'TSLA', 'AVGO',
	'AMD', 'NFLX', 'ORCL', 'CRM', 'ADBE', 'INTC', 'CSCO', 'QCOM', 'TXN', 'IBM',
	'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'PYPL',
	'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE',
	'WMT', 'PG', 'KO', 'PEP', 'MCD', 'SBUX', 'NKE', 'DIS', 'COST', 'HD',
	'XOM', 'CVX',
	'CAT', 'BA', 'HON', 'UPS', 'GE',
	'T', 'VZ',
	'PLTR', 'COIN', 'UBER', 'SPOT', 'SNAP',
	'SPY', 'QQQ', 'IWM', 'GLD', 'VOO',
] as const;

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
	const { theme }                = useAppTheme();
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken           = useStableToken(getToken);

	const [searchQuery, setSearchQuery]         = useState('');
	const [isLoading, setIsLoading]             = useState(true);
	const [isSearchLoading, setIsSearchLoading] = useState(false);
	const [error, setError]                     = useState<string | null>(null);
	const [quotes, setQuotes]                   = useState<PaperMarketData[]>([]);
	const [searchResults, setSearchResults]     = useState<AssetInfo[]>([]);

	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isSearchMode = searchQuery.trim().length > 0;

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

	const visibleQuotes = useMemo(() => (isSearchMode ? [] : quotes), [quotes, isSearchMode]);

	const navigateToAsset = (symbol: string) =>
		router.push({ pathname: '/misc/asset-detail', params: { symbol } });

	return (
		<LinearGradient
			colors={theme.colors.background.gradient as [string, string, string]}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				{/* Search bar */}
				<View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							backgroundColor: theme.colors.surface.secondary,
							borderRadius: 16,
							paddingHorizontal: 14,
							height: 50,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
						}}
					>
						<Ionicons name="search" size={18} color={theme.colors.text.tertiary} style={{ marginRight: 10 }} />
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search 10,000+ US stocks..."
							placeholderTextColor={theme.colors.text.disabled}
							style={{ flex: 1, color: theme.colors.text.primary, fontSize: 15 }}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{searchQuery.length > 0 && (
							<TouchableOpacity onPress={() => setSearchQuery('')}>
								<Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} />
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Error banner */}
				{error ? (
					<View
						style={{
							marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12,
							backgroundColor: `${theme.colors.error}15`,
							borderWidth: 1, borderColor: `${theme.colors.error}30`,
						}}
					>
						<Text style={{ color: theme.colors.error, fontSize: 13 }}>{error}</Text>
					</View>
				) : null}

				{/* Content */}
				{isSearchMode ? (
					isSearchLoading ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
							<Spinner size="large" />
							<Text style={{ color: theme.colors.text.tertiary, marginTop: 14, fontSize: 14 }}>
								Searching stocks...
							</Text>
						</View>
					) : (
						<FlatList
							data={searchResults}
							keyExtractor={(item) => item.symbol}
							contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
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
										backgroundColor: theme.colors.surface.primary, borderRadius: 16,
										borderWidth: 1, borderColor: theme.colors.border.primary,
									}}
								>
									<Text style={{ color: theme.colors.text.tertiary }}>
										No stocks match "{searchQuery.trim()}".
									</Text>
								</View>
							}
						/>
					)
				) : (
					isLoading ? (
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
							<Spinner size="large" />
							<Text style={{ color: theme.colors.text.tertiary, marginTop: 14, fontSize: 14 }}>
								Loading market data...
							</Text>
						</View>
					) : (
						<FlatList
							data={visibleQuotes}
							keyExtractor={(item) => item.symbol}
							contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
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
										backgroundColor: theme.colors.surface.primary, borderRadius: 16,
										borderWidth: 1, borderColor: theme.colors.border.primary,
									}}
								>
									<Text style={{ color: theme.colors.text.tertiary }}>No stocks found.</Text>
								</View>
							}
						/>
					)
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}

// ─── Stock row ───────────────────────────────────────────────────────────────

function StockRow({ quote, onPress }: { quote: PaperMarketData; onPress: () => void }) {
	const { theme } = useAppTheme();
	const companyName = getCompanyName(quote);
	const price       = toNumber(quote.lastPrice);

	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: theme.colors.surface.primary, borderRadius: 16,
				paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
				borderWidth: 1, borderColor: theme.colors.border.primary,
			}}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				{/* Ticker badge */}
				<View
					style={{
						width: 46, height: 46, borderRadius: 12,
						backgroundColor: theme.colors.surface.secondary,
						borderWidth: 1, borderColor: theme.colors.border.primary,
						justifyContent: 'center', alignItems: 'center', marginRight: 14,
					}}
				>
					<Text
						style={{
							color: theme.colors.accent.primary,
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
						style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 3 }}
						numberOfLines={1}
					>
						{companyName}
					</Text>
					<Text style={{ color: theme.colors.text.disabled, fontSize: 12 }} numberOfLines={1}>
						{quote.symbol} · {quote.exchange}
					</Text>
				</View>

				{/* Price */}
				<View style={{ alignItems: 'flex-end' }}>
					<Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' }}>
						{formatCurrency(price)}
					</Text>
					<Text style={{ color: theme.colors.text.disabled, fontSize: 11, marginTop: 2 }}>
						{quote.marketDataFeed}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
}

// ─── Search result row ───────────────────────────────────────────────────────

function AssetSearchRow({ asset, onPress }: { asset: AssetInfo; onPress: () => void }) {
	const { theme } = useAppTheme();

	return (
		<TouchableOpacity
			activeOpacity={0.82}
			onPress={onPress}
			style={{
				backgroundColor: theme.colors.surface.primary, borderRadius: 16,
				paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
				borderWidth: 1, borderColor: theme.colors.border.primary,
			}}
		>
			<View style={{ flexDirection: 'row', alignItems: 'center' }}>
				<View
					style={{
						width: 46, height: 46, borderRadius: 12,
						backgroundColor: theme.colors.surface.secondary,
						borderWidth: 1, borderColor: theme.colors.border.primary,
						justifyContent: 'center', alignItems: 'center', marginRight: 14,
					}}
				>
					<Text
						style={{
							color: theme.colors.accent.primary,
							fontSize: asset.symbol.length > 4 ? 9 : 11,
							fontWeight: '700', letterSpacing: -0.3,
						}}
						numberOfLines={1}
					>
						{asset.symbol}
					</Text>
				</View>

				<View style={{ flex: 1, marginRight: 8 }}>
					<Text
						style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 3 }}
						numberOfLines={1}
					>
						{asset.name}
					</Text>
					<Text style={{ color: theme.colors.text.disabled, fontSize: 12 }} numberOfLines={1}>
						{asset.symbol} · {asset.exchange}
					</Text>
				</View>

				<Ionicons name="chevron-forward" size={16} color={theme.colors.text.disabled} />
			</View>
		</TouchableOpacity>
	);
}
