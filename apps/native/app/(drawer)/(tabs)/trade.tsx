import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/lib/hooks';
import { useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getPaperMarketData, type PaperMarketData } from '@/lib/paper-api';
import { formatCurrency } from '@/lib/formatters';

const QUICK_SYMBOLS = ['AAPL', 'TSLA', 'SPY', 'QQQ'] as const;
const toNumber = (value: string | undefined) => Number(value || 0);

export default function TradeScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL');
	const [quote, setQuote] = useState<PaperMarketData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadQuote = useCallback(async () => {
		if (!isSignedIn || !selectedSymbol) {
			return;
		}

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
		<LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
				<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
					<Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 }}>Quick Trade</Text>

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
										selectedSymbol === symbol ? theme.colors.accent.primary : 'rgba(255,255,255,0.08)',
									marginRight: 8,
									marginBottom: 8,
								}}
							>
								<Text
									style={{
										color: selectedSymbol === symbol ? '#031108' : '#FFFFFF',
										fontSize: 13,
										fontWeight: '700',
									}}
								>
									{symbol}
								</Text>
							</TouchableOpacity>
						))}
					</View>

					<Card style={{ marginBottom: 16 }}>
						{isLoading ? (
							<View style={{ alignItems: 'center', paddingVertical: 8 }}>
								<ActivityIndicator color={theme.colors.accent.primary} />
								<Text style={{ color: theme.colors.text.secondary, marginTop: 10 }}>Loading live quote...</Text>
							</View>
						) : error ? (
							<Text style={{ color: theme.colors.error }}>{error}</Text>
						) : (
							<>
								<Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Selected Asset</Text>
								<Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: 'bold' }}>
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
