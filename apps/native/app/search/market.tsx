import { useCallback, useEffect, useState } from 'react';
import {
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { getPaperMarketData, type PaperMarketData } from '@/lib/paper-api';
import { formatCurrency, formatRelativeTime } from '@/lib/formatters';
import { usePaperMarketStream, useStableToken, useTheme } from '@/lib/hooks';
import { Spinner } from '@/components/Spinner';

const toNumber = (value: string | undefined) => Number(value || 0);

export default function MarketSearchScreen() {
	const theme = useTheme();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [symbol, setSymbol] = useState('AAPL');
	const [data, setData] = useState<PaperMarketData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const normalizedSymbol = symbol.trim().toUpperCase();

	const refreshSnapshot = useCallback(async () => {
		if (!isSignedIn || !normalizedSymbol) {
			return;
		}

		try {
			setIsLoading(true);
			const snapshot = await getPaperMarketData(normalizedSymbol, stableGetToken);
			setData(snapshot);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load market snapshot.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn, normalizedSymbol]);

	useEffect(() => {
		void refreshSnapshot();
	}, [refreshSnapshot]);

	const { connectionState, lastMessageAt, subscribe } = usePaperMarketStream({
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
			setData(quote);
			setError(null);
		},
		onQuote: (quote) => {
			if (quote.symbol !== normalizedSymbol) {
				return;
			}

			setData((current) => {
				if (!current) {
					return current;
				}

				return {
					...current,
					lastPrice: quote.lastPrice,
					asOf: quote.asOf,
					lastPriceSource: quote.source || 'websocket',
					exchange: quote.exchange || current.exchange,
				};
			});
		},
		onError: (message) => {
			setError(message);
		},
	});

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
				<View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 }}>
					<Text style={{ fontSize: 30, fontWeight: 'bold', letterSpacing: -0.5, color: theme.colors.text.primary }}>
						Market Search
					</Text>
					<Text style={{ marginTop: 8, fontSize: 14, lineHeight: 22, color: theme.colors.text.secondary }}>
						Look up a live Alpaca snapshot using symbols like AAPL, TSLA, SPY, and QQQ.
					</Text>

					<View style={{
						marginTop: 20, borderRadius: 28, borderWidth: 1,
						borderColor: theme.colors.border.primary,
						backgroundColor: theme.colors.surface.primary,
						paddingHorizontal: 16, paddingVertical: 16,
					}}>
						<Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: theme.colors.text.tertiary }}>
							Symbol
						</Text>
						<TextInput
							style={{
								marginTop: 12, borderRadius: 16, borderWidth: 1,
								borderColor: theme.colors.border.primary,
								backgroundColor: theme.colors.surface.glass,
								paddingHorizontal: 16, paddingVertical: 16,
								fontSize: 18, fontWeight: '600', color: theme.colors.text.primary,
							}}
							value={symbol}
							onChangeText={(value) => setSymbol(value.toUpperCase())}
							placeholder="AAPL"
							placeholderTextColor={theme.colors.text.tertiary}
							autoCapitalize="characters"
							autoCorrect={false}
						/>
					</View>

					<View style={{
						marginTop: 20, borderRadius: 28, borderWidth: 1,
						borderColor: theme.colors.border.accent,
						backgroundColor: theme.colors.background.secondary,
						paddingHorizontal: 20, paddingVertical: 20,
					}}>
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
							<Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.text.primary }}>Live snapshot</Text>
							{isLoading ? (
								<Spinner />
							) : (
								<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>
									{lastMessageAt
										? `${connectionState} · ${formatRelativeTime(lastMessageAt)}`
										: connectionState}
								</Text>
							)}
						</View>

						<Text style={{ marginTop: 16, fontSize: 36, fontWeight: 'bold', letterSpacing: -0.5, color: theme.colors.text.primary }}>
							{data ? formatCurrency(toNumber(data.lastPrice)) : '--'}
						</Text>
						<Text style={{ marginTop: 8, fontSize: 14, color: theme.colors.text.secondary }}>
							{data ? `${data.symbol} · ${data.exchange}` : 'Enter a supported symbol'}
						</Text>

						{data ? (
							<View style={{
								marginTop: 20, borderRadius: 16,
								backgroundColor: theme.colors.surface.primary,
								paddingHorizontal: 16, paddingVertical: 12,
							}}>
								<Text style={{ fontSize: 12, color: theme.colors.text.tertiary }}>
									ID {data.instrumentId} · Source {data.lastPriceSource} · Feed{' '}
									{data.marketDataFeed}
								</Text>
							</View>
						) : null}
					</View>

					{error ? (
						<View style={{
							marginTop: 20, borderRadius: 16, borderWidth: 1,
							borderColor: theme.colors.error + '33',
							backgroundColor: theme.colors.error + '1A',
							paddingHorizontal: 16, paddingVertical: 12,
						}}>
							<Text style={{ fontSize: 14, color: theme.colors.error }}>{error}</Text>
						</View>
					) : null}

					<View style={{ marginTop: 24, gap: 12 }}>
						<Pressable
							style={{
								alignItems: 'center', borderRadius: 999,
								backgroundColor: theme.colors.accent.primary,
								paddingHorizontal: 20, paddingVertical: 16,
							}}
							onPress={() =>
								router.push({
									pathname: '/orders/order-form',
									params: { symbol: symbol.trim().toUpperCase() },
								})
							}
						>
							<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.inverse }}>Trade this symbol</Text>
						</Pressable>
						<Pressable
							style={{
								alignItems: 'center', borderRadius: 999, borderWidth: 1,
								borderColor: theme.colors.border.primary,
								backgroundColor: theme.colors.surface.primary,
								paddingHorizontal: 20, paddingVertical: 16,
							}}
							onPress={() => {
								void refreshSnapshot();
							}}
						>
							<Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text.primary }}>Refresh quote</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
