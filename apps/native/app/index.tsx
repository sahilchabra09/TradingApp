/**
 * Splash Screen - App entry point
 */
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SplashScreen() {
  const theme = useTheme();

  useEffect(() => {
    setTimeout(() => {
      router.replace('/onboarding/welcome' as any);
    }, 2000);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 48, fontWeight: 'bold', color: theme.colors.accent.primary, letterSpacing: 2 }}>
        TradeX
      </Text>
      <Text style={{ color: theme.colors.text.secondary, marginTop: 16, fontSize: 15 }}>
        Your Premium Trading Platform
      </Text>
      <ActivityIndicator size="large" color={theme.colors.accent.primary} style={{ marginTop: 24 }} />
    </SafeAreaView>
  );
}
