import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import {
	activatePaperAccount,
	getPaperAccount,
	getPaperMarketData,
	getPaperStatus,
	placePaperTrade,
	type PaperAccount,
	type PaperMarketData,
	type PaperStatus,
	type PaperTradeResult,
} from '@/lib/paper-api';
import { formatCurrency, formatRelativeTime } from '@/lib/formatters';
import { usePaperMarketStream, useStableToken } from '@/lib/hooks';

const DEFAULT_SLIPPAGE_PCT = 0.1;
const toNumber = (value: string | undefined | null) => Number(value || 0);

type OrderContext = {
	status: PaperStatus | null;
	account: PaperAccount | null;
	quote: PaperMarketData | null;
	quoteError: string | null;
};

export default function OrderFormScreen() {
	const { symbol: prefilledSymbol } = useLocalSearchParams<{ symbol?: string }>();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [side, setSide] = useState<'buy' | 'sell'>('buy');
	const [symbol, setSymbol] = useState(prefilledSymbol?.toUpperCase() || 'AAPL');
	const [quantity, setQuantity] = useState('');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isActivatingDemo, setIsActivatingDemo] = useState(false);
	const [isLoadingContext, setIsLoadingContext] = useState(false);
	const [isLoadingQuote, setIsLoadingQuote] = useState(false);
	const [tradeResult, setTradeResult] = useState<PaperTradeResult | null>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
	const [data, setData] = useState<OrderContext>({
		status: null,
		account: null,
		quote: null,
		quoteError: null,
	});

	useEffect(() => {
		if (prefilledSymbol) {
			setSymbol(prefilledSymbol.toUpperCase());
		}
	}, [prefilledSymbol]);

	const normalizedSymbol = symbol.trim().toUpperCase();

	const loadStatusAndAccount = useCallback(async () => {
		if (!isSignedIn) {
			return;
		}

		try {
			setIsLoadingContext(true);
			const status = await getPaperStatus(stableGetToken);
			let account: PaperAccount | null = null;
			if (status.hasDemoAccount) {
				try {
					account = await getPaperAccount(stableGetToken);
				} catch {
					account = null;
				}
			}

			setData((current) => ({
				...current,
				status,
				account,
			}));
		} finally {
			setIsLoadingContext(false);
		}
	}, [isSignedIn]);

	const loadQuoteSnapshot = useCallback(async () => {
		if (!isSignedIn || !normalizedSymbol) {
			return;
		}

		try {
			setIsLoadingQuote(true);
			const quote = await getPaperMarketData(normalizedSymbol, stableGetToken);
			setData((current) => ({
				...current,
				quote,
				quoteError: null,
			}));
			setLastUpdatedAt(new Date());
		} catch (err) {
			setData((current) => ({
				...current,
				quoteError:
					err instanceof Error ? err.message : 'Unable to load a live quote for this symbol.',
			}));
		} finally {
			setIsLoadingQuote(false);
		}
	}, [isSignedIn, normalizedSymbol]);

	useEffect(() => {
		void loadStatusAndAccount();
	}, [loadStatusAndAccount]);

	useEffect(() => {
		void loadQuoteSnapshot();
	}, [loadQuoteSnapshot]);

	const { connectionState, subscribe } = usePaperMarketStream({
		enabled: isSignedIn && normalizedSymbol.length > 0,
		symbols: normalizedSymbol ? [normalizedSymbol] : [],
		getToken: stableGetToken,
		onReady: () => {
			if (normalizedSymbol) {
				subscribe([normalizedSymbol]);
			}
		},
		onSnapshot: (quote) => {
			if (quote.symbol !== normalizedSymbol) {
				return;
			}
			setData((current) => ({
				...current,
				quote,
				quoteError: null,
			}));
			setLastUpdatedAt(new Date());
		},
		onQuote: (quote) => {
			if (quote.symbol !== normalizedSymbol) {
				return;
			}
			setData((current) => ({
				...current,
				quote: current.quote
					? {
							...current.quote,
							lastPrice: quote.lastPrice,
							asOf: quote.asOf,
							lastPriceSource: quote.source || 'websocket',
							exchange: quote.exchange || current.quote.exchange,
						}
					: current.quote,
			}));
			setLastUpdatedAt(new Date());
		},
		onError: (message) => {
			setData((current) => ({
				...current,
				quoteError: message,
			}));
		},
	});

	const quotePrice = toNumber(data.quote?.lastPrice);
	const parsedQuantity = Number(quantity || 0);
	const canTrade = Boolean(data.status?.canTradeDemo);

	const estimatedExecutionPrice = useMemo(() => {
		if (!quotePrice) {
			return 0;
		}

		return side === 'buy'
			? quotePrice * (1 + DEFAULT_SLIPPAGE_PCT / 100)
			: quotePrice * (1 - DEFAULT_SLIPPAGE_PCT / 100);
	}, [quotePrice, side]);

	const estimatedTotal = estimatedExecutionPrice * (Number.isFinite(parsedQuantity) ? parsedQuantity : 0);
	const availableCash = toNumber(data.account?.balance);

	const handleActivateDemo = useCallback(async () => {
		try {
			setIsActivatingDemo(true);
			setSubmitError(null);
			await activatePaperAccount(stableGetToken);
			await loadStatusAndAccount();
			Alert.alert('Demo account activated', 'Your demo wallet is ready for paper trading.');
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Unable to activate demo account.');
		} finally {
			setIsActivatingDemo(false);
		}
	}, [loadStatusAndAccount]);

	const handleSubmit = useCallback(async () => {
		const trimmedSymbol = symbol.trim().toUpperCase();

		if (!canTrade) {
			setSubmitError('Trading is locked. Complete KYC and activate your demo account first.');
			return;
		}

		if (!trimmedSymbol) {
			setSubmitError('Enter a symbol such as AAPL, TSLA, SPY, or QQQ.');
			return;
		}

		if (!quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			setSubmitError('Enter a valid quantity greater than zero.');
			return;
		}

		try {
			setIsSubmitting(true);
			setSubmitError(null);

			const result = await placePaperTrade(
				{
					symbol: trimmedSymbol,
					side,
					quantity,
				},
				stableGetToken
			);

			setTradeResult(result);
			setQuantity('');
			await loadStatusAndAccount();
			await loadQuoteSnapshot();

			Alert.alert(
				'Demo order filled',
				`${result.side.toUpperCase()} ${result.quantity} ${result.symbol} at ${formatCurrency(
					toNumber(result.executionPrice)
				)}`
			);
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Unable to place demo order.');
		} finally {
			setIsSubmitting(false);
		}
	}, [canTrade, stableGetToken, loadQuoteSnapshot, loadStatusAndAccount, parsedQuantity, quantity, side, symbol]);

	const statusLabel = data.status
		? data.status.canTradeDemo
			? 'Trading unlocked'
			: data.status.kycStatus !== 'approved'
				? 'KYC required'
				: 'Activate demo account'
		: 'Checking eligibility';

	if (!isSignedIn) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-center text-base text-[#A8D5B3]">
						Sign in to place demo trades.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-[#050A05]">
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
				<View className="px-4 pb-6 pt-4">
					<View className="rounded-[28px] border border-emerald-400/15 bg-[#082013] px-5 py-5">
						<Text className="text-xs uppercase tracking-[1.7px] text-[#6B9175]">
							Paper Trading
						</Text>
						<Text className="mt-2 text-3xl font-bold tracking-tight text-[#E6F8EA]">
							Live market data, simulated execution
						</Text>
						<Text className="mt-3 text-sm leading-6 text-[#A8D5B3]">
							Prices are pulled from Alpaca market data. Buy/sell is enabled only after KYC
							approval and demo wallet activation.
						</Text>

						<View className="mt-5 flex-row gap-x-3">
							<View className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
								<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">
									Available Cash
								</Text>
								<Text className="mt-2 text-xl font-semibold text-[#E6F8EA]">
								{data.account ? formatCurrency(availableCash) : '--'}
								</Text>
							</View>
							<View className="flex-1 rounded-2xl bg-white/5 px-4 py-3">
								<Text className="text-xs uppercase tracking-[1.4px] text-[#6B9175]">
									Status
								</Text>
								<Text className="mt-2 text-sm font-semibold text-[#E6F8EA]">{statusLabel}</Text>
							</View>
						</View>
					</View>

					{data.status && !data.status.canTradeDemo ? (
						<View className="mt-4 rounded-[24px] border border-amber-300/30 bg-amber-500/10 px-4 py-4">
							<Text className="text-sm font-semibold text-amber-200">Trading is currently locked</Text>
							<Text className="mt-2 text-xs leading-5 text-amber-100">
								KYC status: {data.status.kycStatus}. Account type: {data.status.accountType}.
								You can still explore live market data right now.
							</Text>
							<View className="mt-4 flex-row gap-x-2">
								<Pressable
									className="rounded-full border border-white/20 bg-white/5 px-4 py-2"
									onPress={() => router.push('/kyc/start')}
								>
									<Text className="text-xs font-semibold text-[#E6F8EA]">Complete KYC</Text>
								</Pressable>
								{data.status.canActivateDemo ? (
									<Pressable
										className="rounded-full bg-[#00D35A] px-4 py-2"
										onPress={() => {
											void handleActivateDemo();
										}}
										disabled={isActivatingDemo}
									>
										{isActivatingDemo ? (
											<ActivityIndicator color="#031108" />
										) : (
											<Text className="text-xs font-semibold text-[#031108]">
												Activate Demo
											</Text>
										)}
									</Pressable>
								) : null}
							</View>
						</View>
					) : null}

					<View className="mt-5 flex-row rounded-full bg-white/5 p-1">
						{(['buy', 'sell'] as const).map((value) => {
							const active = value === side;
							return (
								<Pressable
									key={value}
									className={
										active
											? value === 'buy'
												? 'flex-1 rounded-full bg-emerald-500 px-4 py-3'
												: 'flex-1 rounded-full bg-rose-500 px-4 py-3'
											: 'flex-1 rounded-full px-4 py-3'
									}
									onPress={() => setSide(value)}
								>
									<Text
										className={
											active
												? 'text-center font-semibold text-white'
												: 'text-center font-semibold text-[#A8D5B3]'
										}
									>
										{value === 'buy' ? 'Buy' : 'Sell'}
									</Text>
								</Pressable>
							);
						})}
					</View>

					<View className="mt-5 rounded-[28px] border border-white/8 bg-[#07140b] px-4 py-4">
						<Text className="text-xs uppercase tracking-[1.5px] text-[#6B9175]">Symbol</Text>
						<TextInput
							className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-lg font-semibold text-[#E6F8EA]"
							value={symbol}
							onChangeText={(value) => setSymbol(value.toUpperCase())}
							placeholder="AAPL or TSLA"
							placeholderTextColor="#6B9175"
							autoCapitalize="characters"
							autoCorrect={false}
						/>

						<Text className="mt-5 text-xs uppercase tracking-[1.5px] text-[#6B9175]">
							Quantity
						</Text>
						<TextInput
							className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-lg font-semibold text-[#E6F8EA]"
							value={quantity}
							onChangeText={setQuantity}
							placeholder="1.00"
							placeholderTextColor="#6B9175"
							keyboardType="decimal-pad"
						/>

						<Text className="mt-4 text-xs leading-5 text-[#6B9175]">
							Use Alpaca-supported symbols (for example `AAPL`, `TSLA`, `SPY`). Instrument ID
							and stock name are persisted on the backend for your portfolio records.
						</Text>
					</View>

					<View className="mt-5 rounded-[28px] border border-white/8 bg-[#07140b] px-4 py-4">
						<View className="flex-row items-center justify-between">
							<Text className="text-sm font-semibold text-[#E6F8EA]">Quote & fill estimate</Text>
							{isLoadingQuote || isLoadingContext ? (
								<ActivityIndicator color="#00D35A" />
							) : (
								<Text className="text-xs text-[#6B9175]">
									{lastUpdatedAt
										? `${connectionState} · ${formatRelativeTime(lastUpdatedAt)}`
										: connectionState}
								</Text>
							)}
						</View>

						<View className="mt-4 gap-y-3">
							<View className="flex-row items-center justify-between">
								<Text className="text-sm text-[#A8D5B3]">Market price</Text>
								<Text className="text-base font-semibold text-[#E6F8EA]">
									{quotePrice ? formatCurrency(quotePrice) : '--'}
								</Text>
							</View>
							<View className="flex-row items-center justify-between">
								<Text className="text-sm text-[#A8D5B3]">Estimated execution</Text>
								<Text className="text-base font-semibold text-[#E6F8EA]">
									{estimatedExecutionPrice ? formatCurrency(estimatedExecutionPrice) : '--'}
								</Text>
							</View>
							<View className="flex-row items-center justify-between">
								<Text className="text-sm text-[#A8D5B3]">Estimated gross</Text>
								<Text className="text-base font-semibold text-[#E6F8EA]">
									{estimatedTotal ? formatCurrency(estimatedTotal) : '--'}
								</Text>
							</View>
						</View>

						{data.quote ? (
							<View className="mt-4 rounded-2xl bg-white/5 px-3 py-3">
								<Text className="text-xs text-[#6B9175]">
									{data.quote.symbol} ({data.quote.instrumentName || 'Unknown'}) via{' '}
									{data.quote.exchange} · ID {data.quote.instrumentId}
								</Text>
							</View>
						) : null}
					</View>

					{submitError || data.quoteError ? (
						<View className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
							<Text className="text-sm text-rose-200">
								{submitError || data.quoteError}
							</Text>
						</View>
					) : null}

					<Pressable
						className={
							isSubmitting || !canTrade
								? 'mt-5 items-center rounded-full bg-white/20 px-5 py-4'
								: side === 'buy'
									? 'mt-5 items-center rounded-full bg-[#00D35A] px-5 py-4'
									: 'mt-5 items-center rounded-full bg-rose-500 px-5 py-4'
						}
						onPress={() => {
							void handleSubmit();
						}}
						disabled={isSubmitting || !canTrade}
					>
						{isSubmitting ? (
							<ActivityIndicator color={side === 'buy' ? '#031108' : '#FFFFFF'} />
						) : (
							<Text
								className={
									!canTrade
										? 'text-base font-semibold text-[#E6F8EA]'
										: side === 'buy'
											? 'text-base font-semibold text-[#031108]'
											: 'text-base font-semibold text-white'
								}
							>
								{canTrade
									? side === 'buy'
										? 'Place demo buy'
										: 'Place demo sell'
									: 'Trading locked until KYC + demo activation'}
							</Text>
						)}
					</Pressable>

					{tradeResult ? (
						<View className="mt-5 rounded-[28px] border border-emerald-400/15 bg-[#082013] px-4 py-4">
							<Text className="text-sm font-semibold text-[#E6F8EA]">Latest fill</Text>
							<Text className="mt-3 text-lg font-semibold text-[#E6F8EA]">
								{tradeResult.side.toUpperCase()} {tradeResult.quantity} {tradeResult.symbol}
							</Text>
							<Text className="mt-2 text-sm text-[#A8D5B3]">
								Executed at {formatCurrency(toNumber(tradeResult.executionPrice))} · Cash now{' '}
								{formatCurrency(toNumber(tradeResult.cashBalance))}
							</Text>
							<Text className="mt-2 text-xs text-[#6B9175]">
								Filled {formatRelativeTime(tradeResult.timestamp)}
							</Text>
						</View>
					) : null}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
