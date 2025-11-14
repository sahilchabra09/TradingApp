import { Text, ActivityIndicator } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';

export default function SplashScreen() {
  const theme = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasNavigated.current) {
      return;
    }

    const timeout = setTimeout(() => {
      const target = isSignedIn ? '/(drawer)/(tabs)' : '/onboarding/welcome';
      router.replace(target as never);
      hasNavigated.current = true;
    }, 1200);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn]);

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
