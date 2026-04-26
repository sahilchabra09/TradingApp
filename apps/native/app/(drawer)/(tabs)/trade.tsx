import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useAppTheme } from '@/lib/ThemeContext';
import { useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { getPaperMarketData, type PaperMarketData } from '@/lib/paper-api';
import { formatCurrency } from '@/lib/formatters';

const QUICK_SYMBOLS = ['AAPL', 'TSLA', 'SPY', 'QQQ'] as const;
const toNumber = (value: string | undefined) => Number(value || 0);

export default function TradeScreen() {
	const { theme } = useAppTheme();
	const router = useRouter();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
	const [quote, setQuote] = useState<PaperMarketData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadQuote = useCallback(async () => {
		if (!isSignedIn || !selectedSymbol) return;

		try {
			setIsLoading(true);
			const nextQuote = await getPaperMarketData(selectedSymbol, stableGetToken);
			setQuote(nextQuote);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load live quote.');
			setQuote(null);
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn, selectedSymbol]);

	useEffect(() => {
		void loadQuote();
	}, [loadQuote]);

	return (
		<LinearGradient
			colors={theme.colors.background.gradient as [string, string, string]}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
					<Text style={{ fontSize: 24, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 16, letterSpacing: -0.5 }}>
						Quick Trade
					</Text>

					{/* Symbol chips */}
					<View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
						{QUICK_SYMBOLS.map((symbol) => (
							<TouchableOpacity
								key={symbol}
								onPress={() => setSelectedSymbol(symbol)}
								style={{
									paddingHorizontal: 14,
									paddingVertical: 8,
									borderRadius: 999,
									backgroundColor:
										selectedSymbol === symbol
											? theme.colors.accent.primary
											: theme.colors.surface.secondary,
									marginRight: 8,
									marginBottom: 8,
									borderWidth: 1,
									borderColor:
										selectedSymbol === symbol
											? theme.colors.accent.primary
											: theme.colors.border.primary,
								}}
							>
								<Text
									style={{
										color: selectedSymbol === symbol
											? theme.colors.text.inverse
											: theme.colors.text.primary,
										fontSize: 13,
										fontWeight: '700',
									}}
								>
									{symbol}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					{/* Quote card */}
					<Card style={{ marginBottom: 16 }}>
						{isLoading ? (
							<View style={{ alignItems: 'center', paddingVertical: 8 }}>
								<Spinner />
								<Text style={{ color: theme.colors.text.secondary, marginTop: 10 }}>Loading live quote...</Text>
							</View>
						) : error ? (
							<Text style={{ color: theme.colors.error }}>{error}</Text>
						) : (
							<>
								<Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Selected Asset</Text>
								<Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700' }}>
									{quote?.symbol || selectedSymbol} {quote?.instrumentName ? `- ${quote.instrumentName}` : ''}
								</Text>
								<Text style={{ color: theme.colors.text.primary, fontSize: 17, marginTop: 4 }}>
									{quote ? formatCurrency(toNumber(quote.lastPrice)) : '--'}
								</Text>
								<Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 8 }}>
									{quote ? `${quote.exchange} · ${quote.lastPriceSource}` : 'No quote'}
								</Text>
							</>
						)}
					</Card>

					<Button
						title={`Trade ${selectedSymbol}`}
						onPress={() =>
							router.push({
								pathname: '/orders/order-form',
								params: { symbol: selectedSymbol },
							})
						}
						fullWidth
					/>
				</ScrollView>
			</SafeAreaView>
		</LinearGradient>
	);
}
