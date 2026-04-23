import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import { Spinner } from '@/components/Spinner';
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
	const { isSignedIn, getToken } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<HomeState>({
		status: null,
		portfolio: null,
		holdings: null,
		overview: [],
	});

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
				setState({
					status,
					portfolio: null,
					holdings: null,
					overview,
				});
				setError(null);
				return;
			}

			const account = await getPaperAccount(stableGetToken);
			const [portfolio, holdings] = await Promise.all([
				getPaperPortfolio(account.userId, stableGetToken),
				getPaperHoldings(account.userId, stableGetToken),
			]);

			setState({
				status,
				portfolio,
				holdings,
				overview,
			});
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

	// Re-fetch every time the tab comes into focus (e.g. after placing a trade)
	useFocusEffect(
		useCallback(() => {
			void loadDashboard();
		}, [loadDashboard])
	);

	const totals = useMemo(() => {
		// Use holdingsValue (market value of open positions only) — wallet cash is excluded
		const totalValue = toNumber(state.portfolio?.holdingsValue);
		const totalPnl = toNumber(state.portfolio?.totalPnl);
		const totalPnlPercent = toNumber(state.holdings?.totals?.totalPnlPercent);
		return {
			totalValue,
			totalPnl,
			totalPnlPercent,
		};
	}, [state.holdings?.totals?.totalPnlPercent, state.portfolio?.totalPnl, state.portfolio?.holdingsValue]);

	const accountBadge = useMemo(() => {
		if (!state.status) return null;
		const { kycStatus, hasDemoAccount } = state.status;
		if (hasDemoAccount && kycStatus === 'approved') {
			return { label: 'Live Trading', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
		}
		if (hasDemoAccount) {
			return { label: 'Paper Trading', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
		}
		if (kycStatus === 'pending') {
			return { label: 'Pending Approval', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
		}
		if (kycStatus === 'rejected') {
			return { label: 'KYC Rejected', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
		}
		if (kycStatus === 'resubmission_required') {
			return { label: 'Resubmit Required', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
		}
		return { label: 'KYC Required', color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)' };
	}, [state.status]);

	const portfolioStatusMessage = useMemo(() => {
		if (!state.status) return null;
		const { kycStatus, canActivateDemo } = state.status;
		if (kycStatus === 'rejected') {
			return { text: 'KYC was rejected. Please resubmit to continue.', color: '#EF4444' };
		}
		if (kycStatus === 'resubmission_required') {
			return { text: 'Additional documents required. Please resubmit KYC.', color: '#F59E0B' };
		}
		if (kycStatus === 'not_started') {
			return { text: 'Complete identity verification to unlock paper trading.', color: '#9CA3AF' };
		}
		if (canActivateDemo) {
			return { text: 'Identity verified. Activate your paper account to start paper trading.', color: '#10B981' };
		}
		return { text: 'Complete KYC to begin trading.', color: '#9CA3AF' };
	}, [state.status]);

	if (!isSignedIn) {
		return (
			<LinearGradient colors={['#000000', '#0a3d2e', '#000000']} style={{ flex: 1 }}>
				<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
					<Text style={{ color: '#FFFFFF', fontSize: 16, textAlign: 'center' }}>
						Sign in to view your live dashboard.
					</Text>
				</SafeAreaView>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient
			colors={['#000000', '#0a3d2e', '#000000']}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				{isLoading ? (
					<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
						<Spinner color="#10B981" />
						<Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading live data...</Text>
					</View>
				) : (
					<ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
						<View
							style={{
								margin: 16,
								padding: 24,
								backgroundColor: 'rgba(16, 185, 129, 0.08)',
								borderRadius: 20,
								borderWidth: 1,
								borderColor: 'rgba(16, 185, 129, 0.2)',
							}}
						>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
							<Text style={{ color: '#9CA3AF', fontSize: 13, letterSpacing: 0.5 }}>
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
							<Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 'bold', marginBottom: 12, letterSpacing: -1 }}>
								{state.portfolio ? formatCurrency(totals.totalValue) : '$0.00'}
							</Text>
							{state.portfolio ? (
								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										backgroundColor:
											totals.totalPnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
										paddingHorizontal: 12,
										paddingVertical: 8,
										borderRadius: 12,
										alignSelf: 'flex-start',
									}}
								>
									<Ionicons
										name={totals.totalPnl >= 0 ? 'trending-up' : 'trending-down'}
										size={18}
										color={totals.totalPnl >= 0 ? '#10B981' : '#EF4444'}
									/>
									<Text
										style={{
											color: totals.totalPnl >= 0 ? '#10B981' : '#EF4444',
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
									backgroundColor: 'rgba(239, 68, 68, 0.15)',
									borderWidth: 1,
									borderColor: 'rgba(239, 68, 68, 0.25)',
								}}
							>
								<Text style={{ color: '#FCA5A5' }}>{error}</Text>
							</View>
						) : null}

						<View style={{ paddingHorizontal: 16 }}>
							<Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
								Your Holdings
							</Text>
							{(state.holdings?.holdings || []).length === 0 ? (
								<View
									style={{
										backgroundColor: 'rgba(255,255,255,0.05)',
										borderRadius: 16,
										padding: 16,
										borderWidth: 1,
										borderColor: 'rgba(255,255,255,0.1)',
									}}
								>
									<Text style={{ color: '#9CA3AF' }}>No holdings yet.</Text>
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
											backgroundColor: 'rgba(255, 255, 255, 0.05)',
											borderRadius: 16,
											padding: 16,
											marginBottom: 12,
											borderWidth: 1,
											borderColor: 'rgba(255, 255, 255, 0.1)',
										}}
									>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
											<View>
												<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
													{holding.symbol}
												</Text>
												<Text style={{ color: '#9CA3AF', fontSize: 13 }}>
													Qty {holding.quantity}
												</Text>
											</View>
											<View style={{ alignItems: 'flex-end' }}>
												<Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
													{formatCurrency(toNumber(holding.marketValue))}
												</Text>
												<Text
													style={{
														color: toNumber(holding.pnlPercent) >= 0 ? '#10B981' : '#EF4444',
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

						<View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 80 }}>
							<Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
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
											backgroundColor: 'rgba(255, 255, 255, 0.05)',
											borderRadius: 16,
											padding: 16,
											borderWidth: 1,
											borderColor: 'rgba(255, 255, 255, 0.1)',
										}}
									>
										<Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
											{quote.symbol}
										</Text>
										<Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>
											{quote.exchange}
										</Text>
										<Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: 'bold', marginBottom: 8 }}>
											{formatCurrency(toNumber(quote.lastPrice))}
										</Text>
										<Text style={{ color: '#9CA3AF', fontSize: 12 }}>
											{quote.lastPriceSource}
										</Text>
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					</ScrollView>
				)}
			</SafeAreaView>
		</LinearGradient>
	);
}
