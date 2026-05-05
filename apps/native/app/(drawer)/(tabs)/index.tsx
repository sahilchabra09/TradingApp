import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { useUser } from '@clerk/clerk-expo';
import { Spinner } from '@/components/Spinner';
import { useAppTheme } from '@/lib/ThemeContext';
import {
	getPaperAccount,
	getPaperHoldings,
	getPaperMarketData,
	getPaperPortfolio,
	getPaperStatus,
	type PaperHoldingsResponse,
	type PaperMarketData,
	type PaperPortfolioResponse,
	type PaperStatus,
} from '@/lib/paper-api';
import { fetchNews, type NewsArticle } from '@/lib/news-api';
import { CompactNewsCard } from '@/components/NewsCard';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { useStableToken } from '@/lib/hooks';

const OVERVIEW_SYMBOLS = ['AAPL', 'TSLA', 'SPY', 'QQQ'] as const;
const toNumber = (value: string | undefined) => Number(value || 0);

type HomeState = {
	status: PaperStatus | null;
	portfolio: PaperPortfolioResponse | null;
	holdings: PaperHoldingsResponse | null;
	overview: PaperMarketData[];
};

export default function HomeScreen() {
	const router = useRouter();
	const { theme } = useAppTheme();
	const { isSignedIn, getToken } = useAuth();
	const { user } = useUser();
	const stableGetToken = useStableToken(getToken);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<HomeState>({
		status: null,
		portfolio: null,
		holdings: null,
		overview: [],
	});

	// ── Trending news ──────────────────────────────────────────────────────────
	const [trendingNews, setTrendingNews] = useState<NewsArticle[]>([]);
	const [newsLoading, setNewsLoading] = useState(false);

	const loadDashboard = useCallback(async () => {
		if (!isSignedIn) {
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			const status = await getPaperStatus(stableGetToken);

			const overview = (
				await Promise.all(
					OVERVIEW_SYMBOLS.map(async (symbol) => {
						try {
							return await getPaperMarketData(symbol, stableGetToken);
						} catch {
							return null;
						}
					})
				)
			).filter((quote): quote is PaperMarketData => Boolean(quote));

			if (!status.hasDemoAccount) {
				setState({ status, portfolio: null, holdings: null, overview });
				setError(null);
				return;
			}

			const account = await getPaperAccount(stableGetToken);
			const [portfolio, holdings] = await Promise.all([
				getPaperPortfolio(account.userId, stableGetToken),
				getPaperHoldings(account.userId, stableGetToken),
			]);

			setState({ status, portfolio, holdings, overview });
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void loadDashboard();
	}, [loadDashboard]);

	useFocusEffect(
		useCallback(() => {
			void loadDashboard();
		}, [loadDashboard])
	);

	// ── Load trending news after holdings are known ────────────────────────────
	useEffect(() => {
		if (!isSignedIn || isLoading) return;

		const holdingSymbols = (state.holdings?.holdings ?? [])
			.map((h) => h.symbol)
			.slice(0, 5); // limit to top 5 held symbols

		void (async () => {
			try {
				setNewsLoading(true);
				const result = await fetchNews(
					{
						symbols: holdingSymbols.length > 0 ? holdingSymbols.join(',') : undefined,
						limit: 5,
						sort: 'desc',
					},
					stableGetToken
				);
				setTrendingNews(result.news);
			} catch {
				setTrendingNews([]);
			} finally {
				setNewsLoading(false);
			}
		})();
	}, [isSignedIn, isLoading, state.holdings]);

	const totals = useMemo(() => {
		const totalValue = toNumber(state.portfolio?.holdingsValue);
		const totalPnl = toNumber(state.portfolio?.totalPnl);
		const totalPnlPercent = toNumber(state.holdings?.totals?.totalPnlPercent);
		return { totalValue, totalPnl, totalPnlPercent };
	}, [state.holdings?.totals?.totalPnlPercent, state.portfolio?.totalPnl, state.portfolio?.holdingsValue]);

	const accountBadge = useMemo(() => {
		if (!state.status) return null;
		const { kycStatus, hasDemoAccount } = state.status;
		if (hasDemoAccount && kycStatus === 'approved') {
			return { label: 'Live Trading', color: theme.colors.success, bg: `${theme.colors.success}18` };
		}
		if (hasDemoAccount) {
			return { label: 'Paper Trading', color: theme.colors.info, bg: `${theme.colors.info}18` };
		}
		if (kycStatus === 'pending') {
			return { label: 'Pending Approval', color: theme.colors.warning, bg: `${theme.colors.warning}18` };
		}
		if (kycStatus === 'rejected') {
			return { label: 'KYC Rejected', color: theme.colors.error, bg: `${theme.colors.error}18` };
		}
		if (kycStatus === 'resubmission_required') {
			return { label: 'Resubmit Required', color: theme.colors.warning, bg: `${theme.colors.warning}18` };
		}
		return { label: 'KYC Required', color: theme.colors.text.tertiary, bg: theme.colors.surface.primary };
	}, [state.status, theme]);

	const portfolioStatusMessage = useMemo(() => {
		if (!state.status) return null;
		const { kycStatus, canActivateDemo } = state.status;
		if (kycStatus === 'rejected') {
			return { text: 'KYC was rejected. Please resubmit to continue.', color: theme.colors.error };
		}
		if (kycStatus === 'resubmission_required') {
			return { text: 'Additional documents required. Please resubmit KYC.', color: theme.colors.warning };
		}
		if (kycStatus === 'not_started') {
			return { text: 'Complete identity verification to unlock paper trading.', color: theme.colors.text.tertiary };
		}
		if (canActivateDemo) {
			return { text: 'Identity verified. Activate your paper account to start paper trading.', color: theme.colors.accent.primary };
		}
		return { text: 'Complete KYC to begin trading.', color: theme.colors.text.tertiary };
	}, [state.status, theme]);

	// Resolved display name: prefer firstName, fallback to username, then email prefix
	const displayName = useMemo(() => {
		if (!user) return 'Trader';
		return (
			user.firstName ||
			user.username ||
			user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
			'Trader'
		);
	}, [user]);

	const holdingSymbols = (state.holdings?.holdings ?? []).map((h) => h.symbol);
	const newsTitle =
		holdingSymbols.length > 0
			? `News for Your Holdings`
			: 'Trending News';

	if (!isSignedIn) {
		return (
			<LinearGradient colors={theme.colors.background.gradient as [string, string, string]} style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
					<Text style={{ color: theme.colors.text.primary, fontSize: 16, textAlign: 'center' }}>
						Sign in to view your live dashboard.
					</Text>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient
			colors={theme.colors.background.gradient as [string, string, string]}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

				{/* ── Welcome Header ───────────────────────────────────────────── */}
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						paddingHorizontal: 20,
						paddingTop: 8,
						paddingBottom: 12,
						borderBottomWidth: 1,
						borderBottomColor: theme.colors.border.primary,
					}}
				>
					{/* Greeting */}
					<View style={{ flex: 1 }}>
						<Text style={{
							color: theme.colors.text.secondary,
							fontSize: 13,
							fontWeight: '500',
							letterSpacing: 0.2,
						}}>
							Welcome back
						</Text>
						<Text style={{
							color: theme.colors.text.primary,
							fontSize: 24,
							fontWeight: '700',
							letterSpacing: -0.5,
							marginTop: 1,
						}}>
							{displayName}
						</Text>
					</View>

					{/* Circular search button */}
					<TouchableOpacity
						activeOpacity={0.75}
						onPress={() => router.push('/search/market')}
						style={{
							width: 44,
							height: 44,
							borderRadius: 22,
							backgroundColor: theme.colors.surface.secondary,
							borderWidth: 1,
							borderColor: theme.colors.border.primary,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Ionicons name="search" size={20} color={theme.colors.text.primary} />
					</TouchableOpacity>
				</View>

				{isLoading ? (
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
						<Spinner />
						<Text style={{ color: theme.colors.text.tertiary, marginTop: 12 }}>Loading live data...</Text>
					</View>
				) : (
					<ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
						{/* Portfolio Value Card */}
						<View
							style={{
								margin: 16,
								padding: 24,
								backgroundColor: theme.colors.surface.primary,
								borderRadius: 20,
								borderWidth: 1,
								borderColor: theme.colors.border.primary,
							}}
						>
							<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
								<Text style={{ color: theme.colors.text.secondary, fontSize: 13, letterSpacing: 1, fontWeight: '500' }}>
									TOTAL PORTFOLIO VALUE
								</Text>
								{accountBadge && (
									<View style={{
										backgroundColor: accountBadge.bg,
										paddingHorizontal: 8,
										paddingVertical: 4,
										borderRadius: 8,
									}}>
										<Text style={{ color: accountBadge.color, fontSize: 11, fontWeight: '600' }}>
											{accountBadge.label}
										</Text>
									</View>
								)}
							</View>
							<Text style={{ color: theme.colors.text.primary, fontSize: 40, fontWeight: '700', marginBottom: 12, letterSpacing: -1.5 }}>
								{state.portfolio ? formatCurrency(totals.totalValue) : '$0.00'}
							</Text>
							{state.portfolio ? (
								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										backgroundColor: totals.totalPnl >= 0
											? `${theme.colors.chart.bullish}18`
											: `${theme.colors.chart.bearish}18`,
										paddingHorizontal: 12,
										paddingVertical: 8,
										borderRadius: 12,
										alignSelf: 'flex-start',
									}}
								>
									<Ionicons
										name={totals.totalPnl >= 0 ? 'trending-up' : 'trending-down'}
										size={18}
										color={totals.totalPnl >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish}
									/>
									<Text
										style={{
											color: totals.totalPnl >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish,
											fontSize: 16,
											fontWeight: '600',
											marginLeft: 6,
										}}
									>
										{formatPercentage(totals.totalPnlPercent)} ({formatCurrency(totals.totalPnl)})
									</Text>
								</View>
							) : (
								portfolioStatusMessage ? (
									<Text style={{ color: portfolioStatusMessage.color, fontSize: 13 }}>
										{portfolioStatusMessage.text}
									</Text>
								) : null
							)}
						</View>

						{error ? (
							<View
								style={{
									marginHorizontal: 16,
									marginBottom: 16,
									padding: 12,
									borderRadius: 12,
									backgroundColor: `${theme.colors.error}15`,
									borderWidth: 1,
									borderColor: `${theme.colors.error}30`,
								}}
							>
								<Text style={{ color: theme.colors.error }}>{error}</Text>
							</View>
						) : null}

						{/* Holdings */}
						<View style={{ paddingHorizontal: 16 }}>
							<Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16, letterSpacing: -0.3 }}>
								Your Holdings
							</Text>
							{(state.holdings?.holdings || []).length === 0 ? (
								<View
									style={{
										backgroundColor: theme.colors.surface.primary,
										borderRadius: 16,
										padding: 16,
										borderWidth: 1,
										borderColor: theme.colors.border.primary,
									}}
								>
									<Text style={{ color: theme.colors.text.tertiary }}>No holdings yet.</Text>
								</View>
							) : (
								state.holdings?.holdings.map((holding) => (
									<TouchableOpacity
										key={holding.id}
										activeOpacity={0.85}
										onPress={() =>
											router.push({ pathname: '/misc/asset-detail', params: { symbol: holding.symbol } })
										}
										style={{
											backgroundColor: theme.colors.surface.primary,
											borderRadius: 16,
											padding: 16,
											marginBottom: 12,
											borderWidth: 1,
											borderColor: theme.colors.border.primary,
										}}
									>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
											<View>
												<Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
													{holding.symbol}
												</Text>
												<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
													Qty {holding.quantity}
												</Text>
											</View>
											<View style={{ alignItems: 'flex-end' }}>
												<Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
													{formatCurrency(toNumber(holding.marketValue))}
												</Text>
												<Text
													style={{
														color: toNumber(holding.pnlPercent) >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish,
														fontSize: 13,
														fontWeight: '600',
													}}
												>
													{formatPercentage(toNumber(holding.pnlPercent))}
												</Text>
											</View>
										</View>
									</TouchableOpacity>
								))
							)}
						</View>

						{/* Market Overview */}
						<View style={{ paddingHorizontal: 16, marginTop: 20 }}>
							<Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16, letterSpacing: -0.3 }}>
								Market Overview
							</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false}>
								{state.overview.map((quote) => (
									<TouchableOpacity
										key={quote.symbol}
										activeOpacity={0.85}
										onPress={() =>
											router.push({ pathname: '/misc/asset-detail', params: { symbol: quote.symbol } })
										}
										style={{
											width: 160,
											marginRight: 12,
											backgroundColor: theme.colors.surface.primary,
											borderRadius: 16,
											padding: 16,
											borderWidth: 1,
											borderColor: theme.colors.border.primary,
										}}
									>
										<Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
											{quote.symbol}
										</Text>
										<Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginBottom: 8 }}>
											{quote.exchange}
										</Text>
										<Text style={{ color: theme.colors.text.primary, fontSize: 19, fontWeight: '700', marginBottom: 8 }}>
											{formatCurrency(toNumber(quote.lastPrice))}
										</Text>
										<Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
											{quote.lastPriceSource}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>

						{/* ── Trending / Holdings News ─────────────────────────────── */}
						<View style={{ paddingHorizontal: 16, marginTop: 28, marginBottom: 80 }}>
							<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
								<Text style={{
									color: theme.colors.text.primary,
									fontSize: 20,
									fontWeight: '700',
									flex: 1,
									letterSpacing: -0.3,
								}}>
									{newsTitle}
								</Text>
								<TouchableOpacity
									onPress={() => router.push('/(drawer)/(tabs)/news')}
									style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
								>
									<Text style={{ color: theme.colors.accent.primary, fontSize: 13, fontWeight: '600' }}>
										View All
									</Text>
									<Ionicons name="chevron-forward" size={14} color={theme.colors.accent.primary} />
								</TouchableOpacity>
							</View>

							{newsLoading ? (
								<View style={{ alignItems: 'center', paddingVertical: 20 }}>
									<Spinner size="small" />
								</View>
							) : trendingNews.length > 0 ? (
								<View>
									{trendingNews.map((article) => (
										<CompactNewsCard
											key={article.id}
											article={article}
											onPress={() =>
												router.push({
													pathname: '/news/article',
													params: { data: JSON.stringify(article) },
												})
											}
										/>
									))}
								</View>
							) : (
								<View style={{
									padding: 20,
									borderRadius: 14,
									backgroundColor: theme.colors.surface.glass,
									borderWidth: 1,
									borderColor: theme.colors.border.primary,
									alignItems: 'center',
								}}>
									<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
										No news available right now.
									</Text>
								</View>
							)}
						</View>

					</ScrollView>
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}
