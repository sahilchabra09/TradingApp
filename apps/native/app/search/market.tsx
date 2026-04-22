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
import { usePaperMarketStream, useStableToken } from '@/lib/hooks';
import { Spinner } from '@/components/Spinner';

const toNumber = (value: string | undefined) => Number(value || 0);

export default function MarketSearchScreen() {
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
		<SafeAreaView className="flex-1 bg-[#050A05]">
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
				<View className="px-4 pb-6 pt-4">
					<Text className="text-3xl font-bold tracking-tight text-[#E6F8EA]">
						Market Search
					</Text>
					<Text className="mt-2 text-sm leading-6 text-[#A8D5B3]">
						Look up a live Alpaca snapshot using symbols like AAPL, TSLA, SPY, and QQQ.
					</Text>

					<View className="mt-5 rounded-[28px] border border-white/8 bg-[#07140b] px-4 py-4">
						<Text className="text-xs uppercase tracking-[1.5px] text-[#6B9175]">Symbol</Text>
						<TextInput
							className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-lg font-semibold text-[#E6F8EA]"
							value={symbol}
							onChangeText={(value) => setSymbol(value.toUpperCase())}
							placeholder="AAPL"
							placeholderTextColor="#6B9175"
							autoCapitalize="characters"
							autoCorrect={false}
						/>
					</View>

					<View className="mt-5 rounded-[28px] border border-emerald-400/15 bg-[#082013] px-5 py-5">
						<View className="flex-row items-center justify-between">
							<Text className="text-sm font-semibold text-[#E6F8EA]">Live snapshot</Text>
							{isLoading ? (
								<Spinner color="#00D35A" />
							) : (
								<Text className="text-xs text-[#6B9175]">
									{lastMessageAt
										? `${connectionState} · ${formatRelativeTime(lastMessageAt)}`
										: connectionState}
								</Text>
							)}
						</View>

						<Text className="mt-4 text-4xl font-bold tracking-tight text-[#E6F8EA]">
							{data ? formatCurrency(toNumber(data.lastPrice)) : '--'}
						</Text>
						<Text className="mt-2 text-sm text-[#A8D5B3]">
							{data ? `${data.symbol} · ${data.exchange}` : 'Enter a supported symbol'}
						</Text>

						{data ? (
							<View className="mt-5 rounded-2xl bg-white/5 px-4 py-3">
								<Text className="text-xs text-[#6B9175]">
									ID {data.instrumentId} · Source {data.lastPriceSource} · Feed{' '}
									{data.marketDataFeed}
								</Text>
							</View>
						) : null}
					</View>

					{error ? (
						<View className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3">
							<Text className="text-sm text-rose-200">{error}</Text>
						</View>
					) : null}

					<View className="mt-6 gap-y-3">
						<Pressable
							className="items-center rounded-full bg-[#00D35A] px-5 py-4"
							onPress={() =>
								router.push({
									pathname: '/orders/order-form',
									params: { symbol: symbol.trim().toUpperCase() },
								})
							}
						>
							<Text className="text-base font-semibold text-[#031108]">Trade this symbol</Text>
						</Pressable>
						<Pressable
							className="items-center rounded-full border border-white/10 bg-white/5 px-5 py-4"
							onPress={() => {
								void refreshSnapshot();
							}}
						>
							<Text className="text-base font-semibold text-[#E6F8EA]">Refresh quote</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
