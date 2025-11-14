/**
 * Welcome Screen - Onboarding carousel
 */
import { View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', title: 'Trade with Confidence', description: 'Access real-time market data and advanced trading tools', emoji: '📈' },
  { id: '2', title: 'Secure & Protected', description: 'Bank-level security with multi-factor authentication', emoji: '🔒' },
  { id: '3', title: 'Start Investing Today', description: 'Begin your journey with as little as $10', emoji: '💰' },
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
  <TouchableOpacity onPress={() => router.replace('/sign-in' as never)} style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 16 }}>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 15, fontWeight: '600' }}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 80 }}>{item.emoji}</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginTop: 40 }}>
              {item.title}
            </Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 17, textAlign: 'center', marginTop: 16, paddingHorizontal: 20 }}>
              {item.description}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 20 }}>
        {slides.map((_, i) => (
          <View key={i} style={{ height: 8, width: currentIndex === i ? 24 : 8, borderRadius: 4, backgroundColor: currentIndex === i ? theme.colors.accent.primary : theme.colors.surface.elevated, marginHorizontal: 4 }} />
        ))}
      </View>

      <View style={{ padding: 16, paddingBottom: 40 }}>
                <Button title={currentIndex === 2 ? 'Get Started' : 'Next'} onPress={() => currentIndex === 2 ? router.replace('/sign-in' as never) : flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })} fullWidth style={{ marginBottom: 40 }} />
      </View>
    </SafeAreaView>
  );
}
