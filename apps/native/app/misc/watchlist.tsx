import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useTheme, useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { getDemoMarketData, type DemoMarketData } from '@/lib/demo-api';
import { formatCurrency } from '@/lib/formatters';

const WATCHLIST_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', 'QQQ'];
const toNumber = (value: string) => Number(value || 0);

export default function WatchlistScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [quotes, setQuotes] = useState<DemoMarketData[]>([]);

	const loadWatchlist = useCallback(async () => {
		if (!isSignedIn) {
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			const loaded = (
				await Promise.all(
					WATCHLIST_SYMBOLS.map(async (symbol) => {
						try {
							return await getDemoMarketData(symbol, stableGetToken);
						} catch {
							return null;
						}
					})
				)
			).filter((quote): quote is DemoMarketData => Boolean(quote));
			setQuotes(loaded);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load watchlist.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void loadWatchlist();
	}, [loadWatchlist]);

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
					<Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Watchlist</Text>
					<TouchableOpacity onPress={() => void loadWatchlist()}>
						<Text style={{ color: theme.colors.accent.primary, fontSize: 15, fontWeight: '600' }}>Refresh</Text>
					</TouchableOpacity>
				</View>

				{error ? (
					<Card style={{ marginBottom: 12 }}>
						<Text style={{ color: theme.colors.error, fontSize: 13 }}>{error}</Text>
					</Card>
				) : null}

				{isLoading ? (
					<View style={{ paddingVertical: 48, alignItems: 'center' }}>
						<ActivityIndicator color={theme.colors.accent.primary} />
						<Text style={{ color: theme.colors.text.secondary, marginTop: 12 }}>
							Loading live watchlist...
						</Text>
					</View>
				) : (
					quotes.map((quote) => (
						<TouchableOpacity
							key={quote.symbol}
							onPress={() =>
								router.push({ pathname: '/misc/asset-detail', params: { symbol: quote.symbol } })
							}
						>
							<Card style={{ marginBottom: 12 }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
									<View style={{ flex: 1 }}>
										<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>
											{quote.symbol}
										</Text>
										<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
											{quote.instrumentName || 'Unknown instrument'}
										</Text>
									</View>
									<View style={{ alignItems: 'flex-end' }}>
										<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono', marginBottom: 4 }}>
											{formatCurrency(toNumber(quote.lastPrice))}
										</Text>
										<Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
											{quote.lastPriceSource}
										</Text>
									</View>
								</View>
							</Card>
						</TouchableOpacity>
					))
				)}
			</ScrollView>
		</View>
	);
}
