/**
 * KYC Start Screen
 */
import { View, Text, ScrollView } from 'react-native';
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>📋</Text>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
          Complete KYC
        </Text>
        <Text style={{ fontSize: 15, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
          Verify your identity to unlock all trading features and higher limits
        </Text>

        {steps.map((step) => (
          <Card key={step.id} variant="elevated" style={{ marginBottom: 16 }}>
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

        <Button title="Start Verification" onPress={() => router.push('/kyc/document-capture' as any)} variant="primary" fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>
    </View>
  );
}
