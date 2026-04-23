import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { StockChart } from '@/components/StockChart';
import {
	getPaperAccount,
	getPaperHoldings,
	getPaperMarketData,
	getPaperMarketHistory,
	type ChartPeriod,
	type PaperHolding,
	type PaperMarketData,
	type HistoricalBar,
} from '@/lib/paper-api';

const toNumber = (value: string | undefined) => Number(value || 0);

// ─── Company name fallback ────────────────────────────────────────────────────
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

function getCompanyName(symbol: string, quote: PaperMarketData | null): string {
	return quote?.instrumentName || COMPANY_NAMES[symbol] || symbol;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AssetDetailScreen() {
	const theme  = useTheme();
	const router = useRouter();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const params = useLocalSearchParams<{ symbol?: string; id?: string }>();
	const symbol = String(params.symbol || params.id || '').toUpperCase();

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError]         = useState<string | null>(null);
	const [quote, setQuote]         = useState<PaperMarketData | null>(null);
	const [holding, setHolding]     = useState<PaperHolding | null>(null);

	const [chartPeriod, setChartPeriod]   = useState<ChartPeriod>('1M');
	const [chartBars, setChartBars]       = useState<HistoricalBar[]>([]);
	const [chartLoading, setChartLoading] = useState(false);
	const [chartWidth, setChartWidth]     = useState(0);

	// ── Load quote + holdings ──────────────────────────────────────────────────
	const loadDetails = useCallback(async () => {
		if (!symbol || !isSignedIn) { setIsLoading(false); return; }
		try {
			setIsLoading(true);
			const marketQuote = await getPaperMarketData(symbol, stableGetToken);
			setQuote(marketQuote);
			try {
				const account  = await getPaperAccount(stableGetToken);
				const holdings = await getPaperHoldings(account.userId, stableGetToken);
				setHolding(holdings.holdings.find((item) => item.symbol === symbol) || null);
			} catch {
				setHolding(null);
			}
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load asset detail.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn, symbol]);

	useEffect(() => { void loadDetails(); }, [loadDetails]);

	// Re-fetch holdings every time this screen comes into focus (e.g. after placing a trade)
	useFocusEffect(
		useCallback(() => { void loadDetails(); }, [loadDetails])
	);

	// ── Load chart bars ────────────────────────────────────────────────────────
	const loadChart = useCallback(async (period: ChartPeriod) => {
		if (!symbol || !isSignedIn) return;
		try {
			setChartLoading(true);
			const history = await getPaperMarketHistory(symbol, period, stableGetToken);
			setChartBars(history.bars);
		} catch {
			setChartBars([]);
		} finally {
			setChartLoading(false);
		}
	}, [isSignedIn, symbol]);

	useEffect(() => { void loadChart(chartPeriod); }, [loadChart, chartPeriod]);

	const handlePeriodChange = useCallback((p: ChartPeriod) => {
		setChartPeriod(p);
	}, []);

	const isPositive  = useMemo(() => toNumber(holding?.pnlPercent) >= 0, [holding?.pnlPercent]);
	const companyName = getCompanyName(symbol, quote);

	if (!symbol) {
		return (
			<LinearGradient colors={['#000000', '#051f1a', '#000000']} style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
					<Text style={{ color: theme.colors.text.primary, fontSize: 18, marginBottom: 8 }}>
						Asset symbol is missing
					</Text>
					<Button title="Go back" onPress={() => router.back()} variant="secondary" />
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient colors={['#000000', '#041d16', '#000000']} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
					showsVerticalScrollIndicator={false}
				>
					{/* ── Back ─────────────────────────────────────────────────── */}
					<TouchableOpacity
						onPress={() => router.back()}
						style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 20 }}
					>
						<Ionicons name="chevron-back" size={20} color={theme.colors.accent.primary} />
						<Text style={{ color: theme.colors.accent.primary, fontSize: 15, fontWeight: '600', marginLeft: 2 }}>
							Markets
						</Text>
					</TouchableOpacity>

					{/* ── Header: company name + price ─────────────────────────── */}
					<View style={{ marginBottom: 20 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
							<View style={{
								paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
								backgroundColor: 'rgba(16,185,129,0.1)',
								borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
							}}>
								<Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
									{symbol}
								</Text>
							</View>
							{quote && (
								<Text style={{ color: '#4B5563', fontSize: 12 }}>
									{quote.exchange} · {quote.marketDataFeed}
								</Text>
							)}
						</View>
						<Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700', marginBottom: 6 }}>
							{companyName}
						</Text>
						<Text style={{
							color: theme.colors.text.primary,
							fontSize: 38, fontWeight: '800', fontFamily: 'RobotoMono', letterSpacing: -1,
						}}>
							{quote ? formatCurrency(toNumber(quote.lastPrice)) : (isLoading ? '...' : '--')}
						</Text>
						{error && !isLoading && (
							<View style={{
								marginTop: 8, padding: 10, borderRadius: 10,
								backgroundColor: 'rgba(239,68,68,0.12)',
							}}>
								<Text style={{ color: '#FCA5A5', fontSize: 13 }}>{error}</Text>
							</View>
						)}
					</View>

					{/* ── Chart ────────────────────────────────────────────────── */}
					<Card style={{ marginBottom: 20, paddingVertical: 16, paddingHorizontal: 10 }}>
						<View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
							<StockChart
								bars={chartBars}
								isLoading={chartLoading}
								period={chartPeriod}
								onPeriodChange={handlePeriodChange}
								width={chartWidth > 0 ? chartWidth : undefined}
							/>
						</View>
					</Card>

					{/* ── Buy / Sell buttons ───────────────────────────────────── */}
					<View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
						<TouchableOpacity
							activeOpacity={0.85}
							onPress={() => router.push({ pathname: '/orders/order-form', params: { symbol, side: 'buy' } })}
							style={{
								flex: 1, paddingVertical: 16, borderRadius: 16,
								backgroundColor: '#10B981',
								alignItems: 'center', justifyContent: 'center',
								flexDirection: 'row', gap: 8,
							}}
						>
							<Ionicons name="trending-up" size={18} color="#FFFFFF" />
							<Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
								Buy
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							activeOpacity={0.85}
							onPress={() => router.push({ pathname: '/orders/order-form', params: { symbol, side: 'sell' } })}
							style={{
								flex: 1, paddingVertical: 16, borderRadius: 16,
								backgroundColor: '#EF4444',
								alignItems: 'center', justifyContent: 'center',
								flexDirection: 'row', gap: 8,
							}}
						>
							<Ionicons name="trending-down" size={18} color="#FFFFFF" />
							<Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
								Sell
							</Text>
						</TouchableOpacity>
					</View>

					{/* ── Your position ────────────────────────────────────────── */}
					<Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
						Your Position
					</Text>
					<Card>
						{isLoading ? (
							<Text style={{ color: theme.colors.text.secondary }}>Loading...</Text>
						) : holding ? (
							<View style={{ gap: 12 }}>
							<StatRow label="Shares owned"    value={holding.quantity} />
							<StatRow label="Cost per share"  value={formatCurrency(toNumber(holding.avgPrice))} />
							<StatRow label="Current price"   value={formatCurrency(toNumber(holding.currentPrice))} />
							<StatRow label="Current value"   value={formatCurrency(toNumber(holding.marketValue))} />
							<StatRow
								label="Profit / Loss"
								value={`${formatCurrency(toNumber(holding.pnlAmount))} (${formatPercentage(toNumber(holding.pnlPercent))})`}
								valueColor={isPositive ? theme.colors.success : theme.colors.error}
								isLast
							/>
							</View>
						) : (
							<View style={{ alignItems: 'center', paddingVertical: 20 }}>
								<Text style={{ color: theme.colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 14 }}>
									You don't hold any {symbol} yet.
								</Text>
								<TouchableOpacity
									onPress={() => router.push({ pathname: '/orders/order-form', params: { symbol, side: 'buy' } })}
									style={{
										paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
										backgroundColor: 'rgba(16,185,129,0.15)',
										borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
									}}
								>
									<Text style={{ color: '#10B981', fontWeight: '600', fontSize: 14 }}>
										Buy {symbol}
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</Card>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({
	label,
	value,
	valueColor,
	isLast,
}: {
	label: string;
	value: string;
	valueColor?: string;
	isLast?: boolean;
}) {
	const theme = useTheme();
	return (
		<View>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
				<Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>{label}</Text>
				<Text style={{ color: valueColor || theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>
					{value}
				</Text>
			</View>
			{!isLast && <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />}
		</View>
	);
}
