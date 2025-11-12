import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/lib/use-color-scheme';

export const Container = ({ children }: { children: React.ReactNode }) => {
	const { colorScheme } = useColorScheme();
	const isDark = colorScheme === 'dark';
	
	return (
		<LinearGradient
			colors={isDark ? ['#000000', '#0a3d2e', '#000000'] : ['#f5f5f5', '#e8f5e9', '#f5f5f5']}
			locations={[0, 0.5, 1]}
			style={{ flex: 1 }}
		>
			<SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
		</LinearGradient>
	);
};
