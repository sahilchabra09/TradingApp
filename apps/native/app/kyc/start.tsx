/**
 * KYC Start Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function KYCStartScreen() {
  const theme = useTheme();

  const steps = [
    { id: 1, title: 'Document Upload', description: 'Upload your ID or Passport', emoji: '📸' },
    { id: 2, title: 'Face Verification', description: 'Selfie for identity confirmation', emoji: '🤳' },
    { id: 3, title: 'Review', description: 'We\'ll review your submission', emoji: '⏱️' },
  ];

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>📋</Text>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
          Complete KYC
        </Text>
        <Text style={{ fontSize: 15, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
          Verify your identity to unlock all trading features and higher limits
        </Text>

        {steps.map((step) => (
          <Card key={step.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Text style={{ fontSize: 24 }}>{step.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{step.title}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{step.description}</Text>
              </View>
            </View>
          </Card>
        ))}

        <Button title="Start Verification" onPress={() => router.push('/kyc/document-capture' as any)} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
