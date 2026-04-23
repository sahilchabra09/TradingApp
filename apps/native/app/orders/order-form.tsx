import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Spinner } from '@/components/Spinner';
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
	// Symbol is fixed from navigation params — not editable by user
	const normalizedSymbol = (prefilledSymbol || 'AAPL').trim().toUpperCase();
	const [quantity, setQuantity] = useState('');
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isActivatingDemo, setIsActivatingDemo] = useState(false);
	const [isLoadingContext, setIsLoadingContext] = useState(false);
	const [isLoadingQuote, setIsLoadingQuote] = useState(false);
	const [tradeResult, setTradeResult] = useState<PaperTradeResult | null>(null);
	const [showFillModal, setShowFillModal] = useState(false);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
	const [data, setData] = useState<OrderContext>({
		status: null,
		account: null,
		quote: null,
		quoteError: null,
	});

	const loadStatusAndAccount = useCallback(async () => {
		if (!isSignedIn) return;
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
			setData((current) => ({ ...current, status, account }));
		} finally {
			setIsLoadingContext(false);
		}
	}, [isSignedIn]);

	const loadQuoteSnapshot = useCallback(async () => {
		if (!isSignedIn || !normalizedSymbol) return;
		try {
			setIsLoadingQuote(true);
			const quote = await getPaperMarketData(normalizedSymbol, stableGetToken);
			setData((current) => ({ ...current, quote, quoteError: null }));
			setLastUpdatedAt(new Date());
		} catch (err) {
			setData((current) => ({
				...current,
				quoteError: err instanceof Error ? err.message : 'Unable to load a live quote for this symbol.',
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
			if (normalizedSymbol) subscribe([normalizedSymbol]);
		},
		onSnapshot: (quote) => {
			if (quote.symbol !== normalizedSymbol) return;
			setData((current) => ({ ...current, quote, quoteError: null }));
			setLastUpdatedAt(new Date());
		},
		onQuote: (quote) => {
			if (quote.symbol !== normalizedSymbol) return;
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
			setData((current) => ({ ...current, quoteError: message }));
		},
	});

	const quotePrice = toNumber(data.quote?.lastPrice);
	const parsedQuantity = Number(quantity || 0);
	const canTrade = Boolean(data.status?.canTradeDemo);

	const estimatedExecutionPrice = useMemo(() => {
		if (!quotePrice) return 0;
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
			Alert.alert('Paper account activated', 'Your paper wallet is ready. You have $100,000 virtual cash to trade with.');
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Unable to activate paper account.');
		} finally {
			setIsActivatingDemo(false);
		}
	}, [loadStatusAndAccount]);

	const handleSubmit = useCallback(async () => {
		if (!canTrade) {
			setSubmitError('Trading is locked. Complete KYC and activate your paper account first.');
			return;
		}

		if (!quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
			setSubmitError('Enter a valid quantity greater than zero.');
			return;
		}

		try {
			setIsSubmitting(true);
			setSubmitError(null);
			const result = await placePaperTrade({ symbol: normalizedSymbol, side, quantity }, stableGetToken);
			setTradeResult(result);
			setQuantity('');
			setShowFillModal(true);
			await loadStatusAndAccount();
			await loadQuoteSnapshot();
		} catch (err) {
			setSubmitError(err instanceof Error ? err.message : 'Unable to place paper order.');
		} finally {
			setIsSubmitting(false);
		}
	}, [canTrade, stableGetToken, loadQuoteSnapshot, loadStatusAndAccount, parsedQuantity, quantity, side, normalizedSymbol]);

	if (!isSignedIn) {
		return (
			<SafeAreaView className="flex-1 bg-[#050A05]">
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-center text-base text-[#A8D5B3]">
						Sign in to place paper trades.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const isLocked = data.status !== null && !canTrade;

	return (
		<SafeAreaView className="flex-1 bg-[#050A05]">
			{/* Order filled modal */}
			<Modal
				visible={showFillModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowFillModal(false)}
			>
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }}>
					<View style={{
						backgroundColor: '#0D1F15',
						borderRadius: 24,
						padding: 28,
						marginHorizontal: 24,
						borderWidth: 1,
						borderColor: 'rgba(16,185,129,0.25)',
						width: '85%',
					}}>
						<View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
							<Ionicons name="checkmark-circle" size={30} color="#10B981" />
						</View>
						<Text style={{ color: '#E6F8EA', fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>
							Order filled
						</Text>
						{tradeResult ? (
							<>
								<Text style={{ color: '#A8D5B3', fontSize: 15, marginBottom: 24 }}>
									{tradeResult.side.toUpperCase()} {tradeResult.quantity} {tradeResult.symbol}
								</Text>
								<View style={{ gap: 12, marginBottom: 28 }}>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<Text style={{ color: '#6B9175', fontSize: 14 }}>Execution price</Text>
										<Text style={{ color: '#E6F8EA', fontSize: 14, fontWeight: '600' }}>
											{formatCurrency(toNumber(tradeResult.executionPrice))}
										</Text>
									</View>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<Text style={{ color: '#6B9175', fontSize: 14 }}>Cash remaining</Text>
										<Text style={{ color: '#E6F8EA', fontSize: 14, fontWeight: '600' }}>
											{formatCurrency(toNumber(tradeResult.cashBalance))}
										</Text>
									</View>
								</View>
							</>
						) : null}
						<Pressable
							style={{ backgroundColor: '#10B981', paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
							onPress={() => setShowFillModal(false)}
						>
							<Text style={{ color: '#031108', fontSize: 16, fontWeight: '700' }}>Done</Text>
						</Pressable>
					</View>
				</View>
			</Modal>

			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }}>
				{/* Top badge row */}
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
					<View style={{ backgroundColor: 'rgba(96,165,250,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)' }}>
						<Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
							PAPER TRADING
						</Text>
					</View>


					{isLoadingQuote || isLoadingContext ? (
						<View style={{ marginLeft: 'auto' }}>
							<Spinner color="#10B981" size="small" />
						</View>
					) : null}
				</View>

				{/* Stock info */}
				<View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<View style={{ flex: 1, paddingRight: 12 }}>
							<Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 'bold', letterSpacing: -1 }}>
								{normalizedSymbol}
							</Text>
							{data.quote?.instrumentName ? (
								<Text style={{ color: '#6B9175', fontSize: 13, marginTop: 4 }} numberOfLines={1}>
									{data.quote.instrumentName}
								</Text>
							) : null}
						</View>
						<View style={{ alignItems: 'flex-end', paddingTop: 6 }}>
							<Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' }}>
								{quotePrice ? formatCurrency(quotePrice) : '--'}
							</Text>
							{data.quote?.exchange ? (
								<Text style={{ color: '#6B9175', fontSize: 12, marginTop: 4 }}>{data.quote.exchange}</Text>
							) : null}
							{lastUpdatedAt ? (
								<Text style={{ color: '#3a5a45', fontSize: 11, marginTop: 2 }}>
									{connectionState} · {formatRelativeTime(lastUpdatedAt)}
								</Text>
							) : null}
						</View>
					</View>
				</View>

				{/* Available cash pill */}
				{data.account ? (
					<View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
							<Ionicons name="wallet-outline" size={14} color="#6B9175" />
							<Text style={{ color: '#9CA3AF', fontSize: 13 }}>
								Available:{' '}
								<Text style={{ color: '#E6F8EA', fontWeight: '600' }}>
									{formatCurrency(availableCash)}
								</Text>
							</Text>
						</View>
					</View>
				) : null}

				<View className="px-4">
					{/* Lock / activate banner */}
					{isLocked ? (
						<View className="mb-5 rounded-[24px] border border-amber-300/30 bg-amber-500/10 px-4 py-4">
							<Text className="text-sm font-semibold text-amber-200">Trading is currently locked</Text>
							<Text className="mt-2 text-xs leading-5 text-amber-100">
								Complete KYC verification and activate your paper account to start trading.
							</Text>
							<View className="mt-4 flex-row gap-x-2">
								<Pressable
									className="rounded-full border border-white/20 bg-white/5 px-4 py-2"
									onPress={() => router.push('/kyc/start')}
								>
									<Text className="text-xs font-semibold text-[#E6F8EA]">Complete KYC</Text>
								</Pressable>
								{data.status?.canActivateDemo ? (
									<Pressable
										className="rounded-full bg-[#00D35A] px-4 py-2"
										onPress={() => void handleActivateDemo()}
										disabled={isActivatingDemo}
									>
										{isActivatingDemo ? (
											<Spinner color="#031108" size="small" />
										) : (
											<Text className="text-xs font-semibold text-[#031108]">Activate Paper Account</Text>
										)}
									</Pressable>
								) : null}
							</View>
						</View>
					) : null}

					{/* Buy / Sell toggle */}
					<View className="mb-5 flex-row rounded-full bg-white/5 p-1">
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

					{/* Quantity input */}
					<View className="mb-5">
						<Text className="mb-3 text-xs uppercase tracking-[1.5px] text-[#6B9175]">Shares</Text>
						<TextInput
							className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-2xl font-semibold text-[#E6F8EA]"
							value={quantity}
							onChangeText={setQuantity}
							placeholder="0"
							placeholderTextColor="#3a5a45"
							keyboardType="decimal-pad"
						/>
					</View>

					{/* Cost breakdown — only show when quantity is entered */}
					{quotePrice && parsedQuantity > 0 ? (
						<View className="mb-5 rounded-[20px] border border-white/8 bg-[#07140b] px-4 py-4">
							<View className="gap-y-3">
								<View className="flex-row items-center justify-between">
									<Text className="text-sm text-[#6B9175]">Market price</Text>
									<Text className="text-sm font-semibold text-[#E6F8EA]">
										{formatCurrency(quotePrice)}
									</Text>
								</View>
								<View className="flex-row items-center justify-between">
									<Text className="text-sm text-[#6B9175]">Est. execution</Text>
									<Text className="text-sm font-semibold text-[#E6F8EA]">
										{formatCurrency(estimatedExecutionPrice)}
									</Text>
								</View>
								<View className="h-px bg-white/8" />
								<View className="flex-row items-center justify-between">
									<Text className="text-sm font-semibold text-[#A8D5B3]">
										{side === 'buy' ? 'Total cost' : 'Est. proceeds'}
									</Text>
									<Text className="text-base font-bold text-[#E6F8EA]">
										{formatCurrency(estimatedTotal)}
									</Text>
								</View>
							</View>
						</View>
					) : null}

					{/* Error */}
					{submitError || data.quoteError ? (
						<View className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
							<Text className="text-sm text-rose-200">{submitError || data.quoteError}</Text>
						</View>
					) : null}

					{/* Submit button */}
					<Pressable
						className={
							isSubmitting || !canTrade
								? 'items-center rounded-full bg-white/20 px-5 py-4'
								: side === 'buy'
									? 'items-center rounded-full bg-[#00D35A] px-5 py-4'
									: 'items-center rounded-full bg-rose-500 px-5 py-4'
						}
						onPress={() => void handleSubmit()}
						disabled={isSubmitting || !canTrade}
					>
						{isSubmitting ? (
							<Spinner color={side === 'buy' ? '#031108' : '#FFFFFF'} size="small" />
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
										? 'Place paper buy'
										: 'Place paper sell'
									: 'Trading locked until KYC + activation'}
							</Text>
						)}
					</Pressable>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
