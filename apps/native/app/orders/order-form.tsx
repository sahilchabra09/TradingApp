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
import { usePaperMarketStream, useStableToken, useTheme } from '@/lib/hooks';

const DEFAULT_SLIPPAGE_PCT = 0.1;
const toNumber = (value: string | undefined | null) => Number(value || 0);

type OrderContext = {
	status: PaperStatus | null;
	account: PaperAccount | null;
	quote: PaperMarketData | null;
	quoteError: string | null;
};

export default function OrderFormScreen() {
	const theme = useTheme();
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
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
					<Text style={{ textAlign: 'center', fontSize: 16, color: theme.colors.text.secondary }}>
						Sign in to place paper trades.
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	const isLocked = data.status !== null && !canTrade;

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			{/* Order filled modal */}
			<Modal
				visible={showFillModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowFillModal(false)}
			>
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }}>
					<View style={{
						backgroundColor: theme.colors.background.secondary,
						borderRadius: 24,
						padding: 28,
						marginHorizontal: 24,
						borderWidth: 1,
						borderColor: theme.colors.border.accent,
						width: '85%',
					}}>
						<View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.success + '26', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
							<Ionicons name="checkmark-circle" size={30} color={theme.colors.success} />
						</View>
						<Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>
							Order filled
						</Text>
						{tradeResult ? (
							<>
								<Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 24 }}>
									{tradeResult.side.toUpperCase()} {tradeResult.quantity} {tradeResult.symbol}
								</Text>
								<View style={{ gap: 12, marginBottom: 28 }}>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<Text style={{ color: theme.colors.text.tertiary, fontSize: 14 }}>Execution price</Text>
										<Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }}>
											{formatCurrency(toNumber(tradeResult.executionPrice))}
										</Text>
									</View>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
										<Text style={{ color: theme.colors.text.tertiary, fontSize: 14 }}>Cash remaining</Text>
										<Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }}>
											{formatCurrency(toNumber(tradeResult.cashBalance))}
										</Text>
									</View>
								</View>
							</>
						) : null}
					<Pressable
						style={{ backgroundColor: theme.colors.accent.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center' }}
						onPress={() => { setShowFillModal(false); router.back(); }}
					>
						<Text style={{ color: theme.colors.text.inverse, fontSize: 16, fontWeight: '700' }}>Done</Text>
					</Pressable>
					</View>
				</View>
			</Modal>

			<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
				{/* Top badge row */}
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
					<View style={{ backgroundColor: theme.colors.info + '1F', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.info + '40' }}>
						<Text style={{ color: theme.colors.info, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
							PAPER TRADING
						</Text>
					</View>

					{isLoadingQuote || isLoadingContext ? (
						<View style={{ marginLeft: 'auto' }}>
							<Spinner size="small" />
						</View>
					) : null}
				</View>

				{/* Stock info */}
				<View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<View style={{ flex: 1, paddingRight: 12 }}>
							<Text style={{ color: theme.colors.text.primary, fontSize: 40, fontWeight: 'bold', letterSpacing: -1 }}>
								{normalizedSymbol}
							</Text>
							{data.quote?.instrumentName ? (
								<Text style={{ color: theme.colors.text.tertiary, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
									{data.quote.instrumentName}
								</Text>
							) : null}
						</View>
						<View style={{ alignItems: 'flex-end', paddingTop: 6 }}>
							<Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold' }}>
								{quotePrice ? formatCurrency(quotePrice) : '--'}
							</Text>
							{data.quote?.exchange ? (
								<Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 4 }}>{data.quote.exchange}</Text>
							) : null}
							{lastUpdatedAt ? (
								<Text style={{ color: theme.colors.text.disabled, fontSize: 11, marginTop: 2 }}>
									{connectionState} · {formatRelativeTime(lastUpdatedAt)}
								</Text>
							) : null}
						</View>
					</View>
				</View>

				{/* Available cash pill */}
				{data.account ? (
					<View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.colors.border.primary }}>
							<Ionicons name="wallet-outline" size={14} color={theme.colors.text.tertiary} />
							<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
								Available:{' '}
								<Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>
									{formatCurrency(availableCash)}
								</Text>
							</Text>
						</View>
					</View>
				) : null}

				<View style={{ paddingHorizontal: 16 }}>
					{/* Lock / activate banner */}
					{isLocked ? (
						<View style={{
							marginBottom: 20, borderRadius: 24, borderWidth: 1,
							borderColor: theme.colors.warning + '4D',
							backgroundColor: theme.colors.warning + '1A',
							paddingHorizontal: 16, paddingVertical: 16,
						}}>
							<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.warning }}>Trading is currently locked</Text>
							<Text style={{ marginTop: 8, fontSize: 12, lineHeight: 20, color: theme.colors.warning }}>
								Complete KYC verification and activate your paper account to start trading.
							</Text>
							<View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
								<Pressable
									style={{
										borderRadius: 999, borderWidth: 1,
										borderColor: theme.colors.border.secondary,
										backgroundColor: theme.colors.surface.primary,
										paddingHorizontal: 16, paddingVertical: 8,
									}}
									onPress={() => router.push('/kyc/start')}
								>
									<Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text.primary }}>Complete KYC</Text>
								</Pressable>
								{data.status?.canActivateDemo ? (
									<Pressable
										style={{
											borderRadius: 999,
											backgroundColor: theme.colors.accent.primary,
											paddingHorizontal: 16, paddingVertical: 8,
										}}
										onPress={() => void handleActivateDemo()}
										disabled={isActivatingDemo}
									>
										{isActivatingDemo ? (
											<Spinner size="small" />
										) : (
											<Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text.inverse }}>Activate Paper Account</Text>
										)}
									</Pressable>
								) : null}
							</View>
						</View>
					) : null}

					{/* Buy / Sell toggle */}
					<View style={{ marginBottom: 20, flexDirection: 'row', borderRadius: 999, backgroundColor: theme.colors.surface.primary, padding: 4 }}>
						{(['buy', 'sell'] as const).map((value) => {
							const active = value === side;
							return (
								<Pressable
									key={value}
									style={{
										flex: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12,
										backgroundColor: active
											? value === 'buy' ? theme.colors.chart.bullish : theme.colors.chart.bearish
											: 'transparent',
									}}
									onPress={() => setSide(value)}
								>
									<Text
										style={{
											textAlign: 'center', fontWeight: '600',
											color: active ? theme.colors.text.inverse : theme.colors.text.secondary,
										}}
									>
										{value === 'buy' ? 'Buy' : 'Sell'}
									</Text>
								</Pressable>
							);
						})}
					</View>

					{/* Quantity input */}
					<View style={{ marginBottom: 20 }}>
						<Text style={{ marginBottom: 12, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>Shares</Text>
						<TextInput
							style={{
								borderRadius: 16, borderWidth: 1,
								borderColor: theme.colors.border.primary,
								backgroundColor: theme.colors.surface.primary,
								paddingHorizontal: 20, paddingVertical: 16,
								fontSize: 24, fontWeight: '600', color: theme.colors.text.primary,
							}}
							value={quantity}
							onChangeText={setQuantity}
							placeholder="0"
							placeholderTextColor={theme.colors.text.disabled}
							keyboardType="decimal-pad"
						/>
					</View>

					{/* Cost breakdown — only show when quantity is entered */}
					{quotePrice && parsedQuantity > 0 ? (
						<View style={{
							marginBottom: 20, borderRadius: 20, borderWidth: 1,
							borderColor: theme.colors.border.primary,
							backgroundColor: theme.colors.surface.primary,
							paddingHorizontal: 16, paddingVertical: 16,
						}}>
							<View style={{ gap: 12 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
									<Text style={{ fontSize: 14, color: theme.colors.text.tertiary }}>Market price</Text>
									<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
										{formatCurrency(quotePrice)}
									</Text>
								</View>
								<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
									<Text style={{ fontSize: 14, color: theme.colors.text.tertiary }}>Est. execution</Text>
									<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>
										{formatCurrency(estimatedExecutionPrice)}
									</Text>
								</View>
								<View style={{ height: 1, backgroundColor: theme.colors.border.primary }} />
								<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
									<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.secondary }}>
										{side === 'buy' ? 'Total cost' : 'Est. proceeds'}
									</Text>
									<Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text.primary }}>
										{formatCurrency(estimatedTotal)}
									</Text>
								</View>
							</View>
						</View>
					) : null}

					{/* Error */}
					{submitError || data.quoteError ? (
						<View style={{
							marginBottom: 20, borderRadius: 16, borderWidth: 1,
							borderColor: theme.colors.error + '33',
							backgroundColor: theme.colors.error + '1A',
							paddingHorizontal: 16, paddingVertical: 12,
						}}>
							<Text style={{ fontSize: 14, color: theme.colors.error }}>{submitError || data.quoteError}</Text>
						</View>
					) : null}

					{/* Submit button */}
					<Pressable
						style={{
							alignItems: 'center', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 16,
							backgroundColor: isSubmitting || !canTrade
								? theme.colors.surface.elevated
								: side === 'buy'
									? theme.colors.chart.bullish
									: theme.colors.chart.bearish,
						}}
						onPress={() => void handleSubmit()}
						disabled={isSubmitting || !canTrade}
					>
						{isSubmitting ? (
							<Spinner size="small" />
						) : (
							<Text
								style={{
									fontSize: 16, fontWeight: '600',
									color: !canTrade
										? theme.colors.text.primary
										: theme.colors.text.inverse,
								}}
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
