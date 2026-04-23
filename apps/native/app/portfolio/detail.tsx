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
import { usePaperMarketStream, useStableToken } from '@/lib/hooks';
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

	return (
		<Animated.View style={animatedStyle}>
			<View
				className={
					pnlPercent >= 0
						? 'rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1'
						: 'rounded-full border border-rose-400/25 bg-rose-500/15 px-3 py-1'
				}
			>
				<Text
					className={
						pnlPercent >= 0
							? 'text-xs font-semibold text-emerald-300'
							: 'text-xs font-semibold text-rose-300'
					}
				>
					{formatPercentage(pnlPercent)}
				</Text>
			</View>
		</Animated.View>
	);
}

function HoldingRow({ item }: { item: PaperHolding }) {
	const pnlAmount = toNumber(item.pnlAmount);
	const pnlPercent = toNumber(item.pnlPercent);

	return (
		<Pressable
			className="mb-3 rounded-3xl border border-white/8 bg-[#07140b] px-4 py-4"
			onPress={() =>
				router.push({
					pathname: '/orders/order-form',
					params: { symbol: item.symbol },
				})
			}
		>
			<View className="mb-3 flex-row items-start justify-between">
				<View className="flex-1 pr-3">
					<Text className="text-lg font-semibold text-[#E6F8EA]">
						{item.symbol} · {item.instrumentId}
					</Text>
					<Text className="mt-1 text-xs uppercase tracking-[1.6px] text-[#6B9175]">
						{item.instrumentName || 'Unknown instrument'} · Qty {item.quantity}
					</Text>
				</View>
				<AnimatedPnlBadge pnlPercent={pnlPercent} />
			</View>

			<View className="flex-row justify-between">
				<View className="gap-y-1">
					<Text className="text-xs text-[#6B9175]">Avg Price</Text>
					<Text className="text-sm font-medium text-[#E6F8EA]">
						{formatCurrency(toNumber(item.avgPrice))}
					</Text>
				</View>
				<View className="gap-y-1">
					<Text className="text-xs text-[#6B9175]">Current</Text>
					<Text className="text-sm font-medium text-[#E6F8EA]">
						{formatCurrency(toNumber(item.currentPrice))}
					</Text>
				</View>
				<View className="items-end gap-y-1">
					<Text className="text-xs text-[#6B9175]">P&L</Text>
					<Text
						className={
							pnlAmount >= 0
								? 'text-sm font-semibold text-emerald-300'
								: 'text-sm font-semibold text-rose-300'
						}
					>
						{formatCurrency(pnlAmount)}
					</Text>
				</View>
			</View>
		</Pressable>
	);
}

export default function PortfolioDetailScreen() {
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
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-center text-base text-[#A8D5B3]">
						Sign in to view your paper portfolio.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (isLoading && !state.status) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center">
					<Spinner color="#00D35A" />
					<Text className="mt-3 text-sm text-[#A8D5B3]">Loading paper portfolio...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!state.status?.hasDemoAccount) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 px-4 py-6">
					<View className="rounded-[28px] border border-amber-300/30 bg-amber-500/10 px-5 py-5">
					<Text className="text-lg font-semibold text-amber-200">Paper portfolio locked</Text>
					<Text className="mt-2 text-sm leading-6 text-amber-100">
						You can browse live market data before trading. To unlock paper portfolio and P&L,
						complete KYC and activate your paper account.
					</Text>
						<Text className="mt-3 text-xs text-amber-100">
							KYC: {state.status?.kycStatus || 'not_started'} · Account:{' '}
							{state.status?.accountType || 'market_data_only'}
						</Text>

						<View className="mt-5 flex-row gap-x-3">
							<Pressable
								className="rounded-full border border-white/20 bg-white/5 px-4 py-2"
								onPress={() => router.push('/kyc/start')}
							>
								<Text className="text-xs font-semibold text-[#E6F8EA]">Start KYC</Text>
							</Pressable>
							{state.status?.canActivateDemo ? (
								<Pressable
									className="rounded-full bg-[#00D35A] px-4 py-2"
									onPress={() => {
										void activateDemo();
									}}
									disabled={activating}
								>
									{activating ? (
										<Spinner color="#031108" size="small" />
									) : (
										<Text className="text-xs font-semibold text-[#031108]">Activate Demo</Text>
									)}
								</Pressable>
							) : null}
						</View>
					</View>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-[#050A05]">
			<FlatList
				data={state.holdings?.holdings || []}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <HoldingRow item={item} />}
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 32 }}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={() => {
							void loadPortfolio(true);
						}}
						tintColor="#00D35A"
					/>
				}
				ListHeaderComponent={
					<View className="px-4 pb-3 pt-4">
						<View className="rounded-[28px] border border-emerald-400/15 bg-[#082013] px-5 py-5">
							<Text className="text-xs uppercase tracking-[1.7px] text-[#6B9175]">
								Demo Portfolio
							</Text>
							<Text className="mt-3 text-[34px] font-bold tracking-tight text-[#E6F8EA]">
								{formatCurrency(totals.totalValue)}
							</Text>
							<View className="mt-4 flex-row items-center gap-x-2">
								<Text
									className={
										totals.totalPnl >= 0
											? 'text-base font-semibold text-emerald-300'
											: 'text-base font-semibold text-rose-300'
									}
								>
									{formatCurrency(totals.totalPnl)}
								</Text>
								<AnimatedPnlBadge pnlPercent={totals.totalPnlPercent} />
							</View>

							<View className="mt-5 flex-row gap-x-3">
								<View className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
									<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">
										Cash
									</Text>
									<Text className="mt-2 text-lg font-semibold text-[#E6F8EA]">
										{formatCurrency(totals.cash)}
									</Text>
								</View>
								<View className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
									<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">
										Holdings
									</Text>
									<Text className="mt-2 text-lg font-semibold text-[#E6F8EA]">
										{formatCurrency(totals.holdingsValue)}
									</Text>
								</View>
							</View>
						</View>

						<View className="mt-4 flex-row items-center justify-between">
							<Text className="text-lg font-semibold text-[#E6F8EA]">Open Positions</Text>
							<Text className="text-xs text-[#6B9175]">
								{lastUpdatedAt
									? `${connectionState} · ${formatRelativeTime(lastUpdatedAt)}`
									: connectionState}
							</Text>
						</View>

						{error ? (
							<View className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
								<Text className="text-sm text-rose-200">{error}</Text>
							</View>
						) : null}
					</View>
				}
				ListEmptyComponent={
					<View className="mx-4 mt-2 rounded-3xl border border-dashed border-emerald-400/20 bg-[#07140b] px-5 py-8">
						<Text className="text-center text-lg font-semibold text-[#E6F8EA]">
							No positions yet
						</Text>
						<Text className="mt-2 text-center text-sm leading-6 text-[#A8D5B3]">
							Your paper wallet is active. Place a simulated order to see live market P&L here.
						</Text>
						<Pressable
							className="mt-5 self-center rounded-full bg-[#00D35A] px-5 py-3"
							onPress={() => router.push('/orders/order-form')}
						>
							<Text className="font-semibold text-[#031108]">Place paper order</Text>
						</Pressable>
					</View>
				}
			/>
		</SafeAreaView>
	);
}
