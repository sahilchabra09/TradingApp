import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AlertsCenterScreen() {
	const theme = useTheme();

	return (
		<View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
			<ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
				<Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
					Alerts
				</Text>
				<Card style={{ marginBottom: 12 }}>
					<Text style={{ color: theme.colors.text.secondary, fontSize: 14, lineHeight: 22 }}>
						No hard-coded alerts are shown anymore. Connect a real alerts endpoint to display notifications here.
					</Text>
				</Card>
				<Button title="Manage Alert Settings" onPress={() => {}} fullWidth style={{ marginTop: 24 }} />
			</ScrollView>
		</View>
	);
}
