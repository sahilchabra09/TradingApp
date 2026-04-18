import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/formatters';

const toNumber = (value: string | undefined) => Number(value || 0);

export default function TradeConfirmationScreen() {
	const theme = useTheme();
	const router = useRouter();
	const params = useLocalSearchParams<{
		side?: string;
		symbol?: string;
		quantity?: string;
		price?: string;
		total?: string;
	}>();

	const side = String(params.side || '').toLowerCase() === 'sell' ? 'sell' : 'buy';
	const symbol = String(params.symbol || '').toUpperCase();
	const quantity = String(params.quantity || '');
	const price = toNumber(params.price);
	const total = toNumber(params.total);

	const hasPayload = Boolean(symbol && quantity && Number.isFinite(price) && Number.isFinite(total));

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
				<Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>
					{side === 'buy' ? '🟢' : '🔴'}
				</Text>
				<Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
					Trade Confirmation
				</Text>
				<Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 40 }}>
					No hard-coded trade values are shown anymore.
				</Text>

				{hasPayload ? (
					<Card style={{ marginBottom: 24 }}>
						<View style={{ paddingVertical: 8 }}>
							<Row label="Side" value={side.toUpperCase()} />
							<Row label="Symbol" value={symbol} />
							<Row label="Quantity" value={quantity} />
							<Row label="Price" value={formatCurrency(price)} />
							<Row label="Total" value={formatCurrency(total)} />
						</View>
					</Card>
				) : (
					<Card style={{ marginBottom: 24 }}>
						<Text style={{ color: theme.colors.text.secondary, fontSize: 14, lineHeight: 22 }}>
							No confirmed trade payload was passed to this screen. Use the order form flow to populate confirmation data.
						</Text>
					</Card>
				)}

				<View style={{ flexDirection: 'row', gap: 12 }}>
					<Button title="Back" onPress={() => router.back()} style={{ flex: 1 }} />
					<Button title="Go to Orders" onPress={() => router.push('/orders/order-form')} style={{ flex: 1 }} />
				</View>
			</ScrollView>
		</View>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	const theme = useTheme();
	return (
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
			<Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{label}</Text>
			<Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600' }}>{value}</Text>
		</View>
	);
}
