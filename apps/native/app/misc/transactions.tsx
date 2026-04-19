import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme, useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getPaperAccount, getPaperTradeHistory, type PaperTradeHistoryItem } from '@/lib/paper-api';

const toNumber = (value: string) => Number(value || 0);

export default function TransactionHistoryScreen() {
	const theme = useTheme();
	const { getToken, isSignedIn } = useAuth();
	const stableGetToken = useStableToken(getToken);
	const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [trades, setTrades] = useState<PaperTradeHistoryItem[]>([]);

	const filters = ['all', 'buy', 'sell'] as const;

	const loadTransactions = useCallback(async () => {
		if (!isSignedIn) {
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			const account = await getPaperAccount(stableGetToken);
			const history = await getPaperTradeHistory(account.userId, stableGetToken);
			setTrades(history.trades);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unable to load transactions.');
		} finally {
			setIsLoading(false);
		}
	}, [isSignedIn]);

	useEffect(() => {
		void loadTransactions();
	}, [loadTransactions]);

	const filteredTrades = useMemo(() => {
		if (filter === 'all') {
			return trades;
		}
		return trades.filter((trade) => trade.side === filter);
	}, [filter, trades]);

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
				<Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
					Transactions
				</Text>

				<View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
					{filters.map((nextFilter) => (
						<TouchableOpacity
							key={nextFilter}
							style={{
								paddingVertical: 8,
								paddingHorizontal: 16,
								borderRadius: 20,
								backgroundColor:
									filter === nextFilter ? theme.colors.accent.primary : theme.colors.surface.secondary,
							}}
							onPress={() => setFilter(nextFilter)}
						>
							<Text
								style={{
									color: filter === nextFilter ? '#FFFFFF' : theme.colors.text.secondary,
									fontSize: 13,
									fontWeight: '600',
									textTransform: 'capitalize',
								}}
							>
								{nextFilter}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{error ? (
					<Card style={{ marginBottom: 12 }}>
						<Text style={{ color: theme.colors.error }}>{error}</Text>
					</Card>
				) : null}

				{isLoading ? (
					<View style={{ paddingVertical: 48, alignItems: 'center' }}>
						<ActivityIndicator color={theme.colors.accent.primary} />
						<Text style={{ color: theme.colors.text.secondary, marginTop: 12 }}>
							Loading transactions...
						</Text>
					</View>
				) : filteredTrades.length === 0 ? (
					<Card>
						<Text style={{ color: theme.colors.text.secondary }}>No transactions found.</Text>
					</Card>
				) : (
					filteredTrades.map((trade) => {
						const isBuy = trade.side === 'buy';
						return (
							<Card key={trade.id} style={{ marginBottom: 12 }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center' }}>
										<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>
											{trade.symbol}
										</Text>
										<View
											style={{
												paddingHorizontal: 8,
												paddingVertical: 2,
												borderRadius: 12,
												backgroundColor: isBuy ? `${theme.colors.success}20` : `${theme.colors.error}20`,
											}}
										>
											<Text
												style={{
													color: isBuy ? theme.colors.success : theme.colors.error,
													fontSize: 11,
													fontWeight: '600',
												}}
											>
												{trade.side.toUpperCase()}
											</Text>
										</View>
									</View>
									<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600' }}>
										{formatCurrency(toNumber(trade.notional))}
									</Text>
								</View>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
									<Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
										{formatDate(trade.timestamp)}
									</Text>
									<Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
										Qty {trade.quantity} @ {formatCurrency(toNumber(trade.price))}
									</Text>
								</View>
							</Card>
						);
					})
				)}
			</ScrollView>
		</View>
	);
}
