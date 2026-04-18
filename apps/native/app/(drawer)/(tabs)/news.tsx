import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function NewsScreen() {
	return (
		<LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
			<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
				<Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginBottom: 12 }}>
					Market News
				</Text>
				<Text style={{ color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
					No fake news feed is shown anymore. Connect a real news endpoint on the backend to enable this screen.
				</Text>
			</SafeAreaView>
		</LinearGradient>
	);
}
