import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AIInsightsCenterScreen() {
	const theme = useTheme();

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
				<Text style={{ fontSize: 64, textAlign: 'center', marginTop: 20, marginBottom: 16 }}>💡</Text>
				<Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
					AI Insights
				</Text>
				<Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
					No fake AI insights are shown. Connect a real insights service to enable this screen.
				</Text>

				<Card>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 14, lineHeight: 22 }}>
						This feature is intentionally empty until a backend-generated insights endpoint is available.
					</Text>
				</Card>

				<Button title="Enable Premium AI" onPress={() => {}} fullWidth style={{ marginTop: 24 }} />
			</ScrollView>
		</View>
	);
}
