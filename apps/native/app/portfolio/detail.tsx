import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FlatList,
	Pressable,
	RefreshControl,
	Text,
	View,
} from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import {
	activatePaperAccount,
	getPaperAccount,
	getPaperHoldings,
	getPaperPortfolio,
	getPaperStatus,
	type PaperAccount,
	type PaperHolding,
	type PaperHoldingsResponse,
	type PaperPortfolioResponse,
	type PaperStatus,
} from '@/lib/paper-api';
import { formatCurrency, formatPercentage, formatRelativeTime } from '@/lib/formatters';
import { usePaperMarketStream, useStableToken, useTheme } from '@/lib/hooks';
import { Spinner } from '@/components/Spinner';

const toNumber = (value: string) => Number(value || 0);
const toDecimalString = (value: number) => (Number.isFinite(value) ? value.toFixed(8) : '0.00000000');

type PortfolioState = {
	status: PaperStatus | null;
	account: PaperAccount | null;
	holdings: PaperHoldingsResponse | null;
	portfolio: PaperPortfolioResponse | null;
};

function AnimatedPnlBadge({ pnlPercent }: { pnlPercent: number }) {
	const theme = useTheme();
	const scale = useSharedValue(1);
	const previousValue = useRef(pnlPercent);

	useEffect(() => {
		if (previousValue.current === pnlPercent) {
			return;
		}

		previousValue.current = pnlPercent;
		scale.value = withSequence(
			withTiming(1.06, { duration: 140 }),
			withTiming(1, { duration: 220 })
		);
	}, [pnlPercent, scale]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const color = pnlPercent >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish;

	return (
		<Animated.View style={animatedStyle}>
			<View
				style={{
					borderRadius: 999,
					borderWidth: 1,
					borderColor: color + '40',
					backgroundColor: color + '26',
					paddingHorizontal: 12,
					paddingVertical: 4,
				}}
			>
				<Text
					style={{
						fontSize: 12,
						fontWeight: '600',
						color: color,
					}}
				>
					{formatPercentage(pnlPercent)}
				</Text>
			</View>
		</Animated.View>
	);
}

function HoldingRow({ item }: { item: PaperHolding }) {
	const theme = useTheme();
	const pnlAmount = toNumber(item.pnlAmount);
	const pnlPercent = toNumber(item.pnlPercent);
	const pnlColor = pnlAmount >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish;

	return (
		<Pressable
			style={{
				marginBottom: 12,
				borderRadius: 24,
				borderWidth: 1,
				borderColor: theme.colors.border.primary,
				backgroundColor: theme.colors.surface.primary,
				paddingHorizontal: 16,
				paddingVertical: 16,
			}}
			onPress={() =>
				router.push({
					pathname: '/orders/order-form',
					params: { symbol: item.symbol },
				})
			}
		>
			<View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text.primary }}>
						{item.symbol} · {item.instrumentId}
					</Text>
					<Text style={{ marginTop: 4, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>
						{item.instrumentName || 'Unknown instrument'} · Qty {item.quantity}
					</Text>
				</View>
				<AnimatedPnlBadge pnlPercent={pnlPercent} />
			</View>

			<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
				<View style={{ gap: 4 }}>
					<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>Avg Price</Text>
					<Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text.primary }}>
						{formatCurrency(toNumber(item.avgPrice))}
					</Text>
				</View>
				<View style={{ gap: 4 }}>
					<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>Current</Text>
					<Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.text.primary }}>
						{formatCurrency(toNumber(item.currentPrice))}
					</Text>
				</View>
				<View style={{ alignItems: 'flex-end', gap: 4 }}>
					<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>P&L</Text>
					<Text
						style={{
							fontSize: 14,
							fontWeight: '600',
							color: pnlColor,
						}}
					>
						{formatCurrency(pnlAmount)}
					</Text>
				</View>
			</View>
		</Pressable>
	);
}

export default function PortfolioDetailScreen() {
	const theme = useTheme();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [activating, setActivating] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
	const [state, setState] = useState<PortfolioState>({
		status: null,
		account: null,
		holdings: null,
		portfolio: null,
	});

	const loadPortfolio = useCallback(
		async (background = false) => {
			if (!isSignedIn) {
				setIsLoading(false);
				return;
			}

			try {
				if (background) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}

				const status = await getPaperStatus(stableGetToken);
				if (!status.hasDemoAccount) {
					setState({
						status,
						account: null,
						holdings: null,
						portfolio: null,
					});
					setError(null);
					setLastUpdatedAt(new Date());
					return;
				}

				const account = await getPaperAccount(stableGetToken);
				const [holdings, portfolio] = await Promise.all([
					getPaperHoldings(account.userId, stableGetToken),
					getPaperPortfolio(account.userId, stableGetToken),
				]);

				setState({
					status,
					account,
					holdings,
					portfolio,
				});
				setError(null);
				setLastUpdatedAt(new Date());
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Unable to load portfolio.');
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[isSignedIn]
	);

	useEffect(() => {
		void loadPortfolio(false);
	}, [loadPortfolio]);

	const applyLivePrice = useCallback((symbol: string, lastPrice: string, asOf: string) => {
		const normalizedSymbol = symbol.trim().toUpperCase();
		const nextPrice = Number(lastPrice);
		if (!Number.isFinite(nextPrice)) {
			return;
		}

		setState((current) => {
			if (!current.holdings || !current.portfolio) {
				return current;
			}

			let didChange = false;
			const holdings = current.holdings.holdings.map((holding) => {
				if (holding.symbol !== normalizedSymbol) {
					return holding;
				}

				didChange = true;
				const qty = toNumber(holding.quantity);
				const avg = toNumber(holding.avgPrice);
				const costBasis = avg * qty;
				const marketValue = nextPrice * qty;
				const pnlAmount = marketValue - costBasis;
				const pnlPercent = costBasis === 0 ? 0 : (pnlAmount / costBasis) * 100;

				return {
					...holding,
					currentPrice: toDecimalString(nextPrice),
					marketValue: toDecimalString(marketValue),
					costBasis: toDecimalString(costBasis),
					pnlAmount: toDecimalString(pnlAmount),
					pnlPercent: toDecimalString(pnlPercent),
				};
			});

			if (!didChange) {
				return current;
			}

			holdings.sort((a, b) => toNumber(b.pnlPercent) - toNumber(a.pnlPercent));

			const holdingsValue = holdings.reduce((sum, item) => sum + toNumber(item.marketValue), 0);
			const totalPnl = holdings.reduce((sum, item) => sum + toNumber(item.pnlAmount), 0);
			const totalCostBasis = holdings.reduce((sum, item) => sum + toNumber(item.costBasis), 0);
			const cash = toNumber(current.holdings.cash);
			const totalValue = cash + holdingsValue;
			const totalPnlPercent = totalCostBasis === 0 ? 0 : (totalPnl / totalCostBasis) * 100;

			setLastUpdatedAt(new Date(asOf));

			return {
				...current,
				holdings: {
					...current.holdings,
					holdings,
					totals: {
						holdingsValue: toDecimalString(holdingsValue),
						totalValue: toDecimalString(totalValue),
						totalPnl: toDecimalString(totalPnl),
						totalPnlPercent: toDecimalString(totalPnlPercent),
					},
				},
				portfolio: {
					...current.portfolio,
					holdingsValue: toDecimalString(holdingsValue),
					totalValue: toDecimalString(totalValue),
					totalPnl: toDecimalString(totalPnl),
				},
			};
		});
	}, []);

	const holdingsSymbols = useMemo(
		() => (state.holdings?.holdings || []).map((holding) => holding.symbol),
		[state.holdings?.holdings]
	);

	const { connectionState, subscribe } = usePaperMarketStream({
		enabled: isSignedIn && holdingsSymbols.length > 0,
		symbols: holdingsSymbols,
		getToken: stableGetToken,
		onReady: () => {
			if (holdingsSymbols.length > 0) {
				subscribe(holdingsSymbols);
			}
		},
		onSnapshot: (quote) => {
			applyLivePrice(quote.symbol, quote.lastPrice, quote.asOf);
		},
		onQuote: (quote) => {
			applyLivePrice(quote.symbol, quote.lastPrice, quote.asOf);
		},
		onError: (message) => {
			setError(message);
		},
	});

	const totals = useMemo(() => {
		return {
			totalValue: toNumber(state.portfolio?.totalValue || '0'),
			totalPnl: toNumber(state.portfolio?.totalPnl || '0'),
			holdingsValue: toNumber(state.portfolio?.holdingsValue || '0'),
			cash: toNumber(state.portfolio?.cash || '0'),
			totalPnlPercent: toNumber(state.holdings?.totals?.totalPnlPercent || '0'),
		};
	}, [state.holdings?.totals?.totalPnlPercent, state.portfolio?.cash, state.portfolio?.holdingsValue, state.portfolio?.totalPnl, state.portfolio?.totalValue]);

	const activateDemo = useCallback(async () => {
		try {
			setActivating(true);
			await activatePaperAccount(stableGetToken);
			await loadPortfolio(false);
		} finally {
			setActivating(false);
		}
	}, [loadPortfolio]);

	if (!isSignedIn) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
					<Text style={{ textAlign: 'center', fontSize: 16, color: theme.colors.text.secondary }}>
						Sign in to view your paper portfolio.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (isLoading && !state.status) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
					<Spinner />
					<Text style={{ marginTop: 12, fontSize: 14, color: theme.colors.text.secondary }}>Loading paper portfolio...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!state.status?.hasDemoAccount) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}>
					<View style={{
						borderRadius: 28, borderWidth: 1,
						borderColor: theme.colors.warning + '4D',
						backgroundColor: theme.colors.warning + '1A',
						paddingHorizontal: 20, paddingVertical: 20,
					}}>
						<Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.warning }}>Paper portfolio locked</Text>
						<Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: theme.colors.warning }}>
							You can browse live market data before trading. To unlock paper portfolio and P&L,
							complete KYC and activate your paper account.
						</Text>
						<Text style={{ marginTop: 12, fontSize: 12, color: theme.colors.warning }}>
							KYC: {state.status?.kycStatus || 'not_started'} · Account:{' '}
							{state.status?.accountType || 'market_data_only'}
						</Text>

						<View style={{ marginTop: 20, flexDirection: 'row', gap: 12 }}>
							<Pressable
								style={{
									borderRadius: 999, borderWidth: 1,
									borderColor: theme.colors.border.secondary,
									backgroundColor: theme.colors.surface.primary,
									paddingHorizontal: 16, paddingVertical: 8,
								}}
								onPress={() => router.push('/kyc/start')}
							>
								<Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text.primary }}>Start KYC</Text>
							</Pressable>
							{state.status?.canActivateDemo ? (
								<Pressable
									style={{
										borderRadius: 999,
										backgroundColor: theme.colors.accent.primary,
										paddingHorizontal: 16, paddingVertical: 8,
									}}
									onPress={() => {
										void activateDemo();
									}}
									disabled={activating}
								>
									{activating ? (
										<Spinner size="small" />
									) : (
										<Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text.inverse }}>Activate Demo</Text>
									)}
								</Pressable>
							) : null}
						</View>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	const pnlColor = totals.totalPnl >= 0 ? theme.colors.chart.bullish : theme.colors.chart.bearish;

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<FlatList
				data={state.holdings?.holdings || []}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <HoldingRow item={item} />}
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingBottom: 32 }}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => {
							void loadPortfolio(true);
						}}
						tintColor={theme.colors.accent.primary}
					/>
				}
				ListHeaderComponent={
					<View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 16 }}>
						<View style={{
							borderRadius: 28, borderWidth: 1,
							borderColor: theme.colors.border.accent,
							backgroundColor: theme.colors.background.secondary,
							paddingHorizontal: 20, paddingVertical: 20,
						}}>
							<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>
								Demo Portfolio
							</Text>
							<Text style={{ marginTop: 12, fontSize: 34, fontWeight: 'bold', letterSpacing: -0.5, color: theme.colors.text.primary }}>
								{formatCurrency(totals.totalValue)}
							</Text>
							<View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<Text
									style={{
										fontSize: 16,
										fontWeight: '600',
										color: pnlColor,
									}}
								>
									{formatCurrency(totals.totalPnl)}
								</Text>
								<AnimatedPnlBadge pnlPercent={totals.totalPnlPercent} />
							</View>

							<View style={{ marginTop: 20, flexDirection: 'row', gap: 12 }}>
								<View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.colors.surface.primary, paddingHorizontal: 16, paddingVertical: 12 }}>
									<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>
										Cash
									</Text>
									<Text style={{ marginTop: 8, fontSize: 18, fontWeight: '600', color: theme.colors.text.primary }}>
										{formatCurrency(totals.cash)}
									</Text>
								</View>
								<View style={{ flex: 1, borderRadius: 16, backgroundColor: theme.colors.surface.primary, paddingHorizontal: 16, paddingVertical: 12 }}>
									<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>
										Holdings
									</Text>
									<Text style={{ marginTop: 8, fontSize: 18, fontWeight: '600', color: theme.colors.text.primary }}>
										{formatCurrency(totals.holdingsValue)}
									</Text>
								</View>
							</View>
						</View>

						<View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text.primary }}>Open Positions</Text>
							<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>
								{lastUpdatedAt
									? `${connectionState} · ${formatRelativeTime(lastUpdatedAt)}`
									: connectionState}
							</Text>
						</View>

						{error ? (
							<View style={{
								marginTop: 12, borderRadius: 16, borderWidth: 1,
								borderColor: theme.colors.error + '33',
								backgroundColor: theme.colors.error + '1A',
								paddingHorizontal: 16, paddingVertical: 12,
							}}>
								<Text style={{ fontSize: 14, color: theme.colors.error }}>{error}</Text>
							</View>
						) : null}
					</View>
				}
				ListEmptyComponent={
					<View style={{
						marginHorizontal: 16, marginTop: 8, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed',
						borderColor: theme.colors.border.accent,
						backgroundColor: theme.colors.surface.primary,
						paddingHorizontal: 20, paddingVertical: 32,
					}}>
						<Text style={{ textAlign: 'center', fontSize: 18, fontWeight: '600', color: theme.colors.text.primary }}>
							No positions yet
						</Text>
						<Text style={{ marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 22, color: theme.colors.text.secondary }}>
							Your paper wallet is active. Place a simulated order to see live market P&L here.
						</Text>
						<Pressable
							style={{
								marginTop: 20, alignSelf: 'center', borderRadius: 999,
								backgroundColor: theme.colors.accent.primary,
								paddingHorizontal: 20, paddingVertical: 12,
							}}
							onPress={() => router.push('/orders/order-form')}
						>
							<Text style={{ fontWeight: '600', color: theme.colors.text.inverse }}>Place paper order</Text>
						</Pressable>
					</View>
				}
			/>
		</SafeAreaView>
	);
}
