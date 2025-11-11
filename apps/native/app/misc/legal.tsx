/**
 * Legal Screen - Terms & Privacy
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';

export default function LegalScreen() {
  const theme = useTheme();

  const legalDocs = [
    { id: 'terms', title: 'Terms of Service', emoji: '📄', updated: 'Updated Mar 2024' },
    { id: 'privacy', title: 'Privacy Policy', emoji: '🔒', updated: 'Updated Mar 2024' },
    { id: 'risk', title: 'Risk Disclosure', emoji: '⚠️', updated: 'Updated Jan 2024' },
    { id: 'cookies', title: 'Cookie Policy', emoji: '🍪', updated: 'Updated Feb 2024' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Legal 📄</Text>

        {legalDocs.map((doc) => (
          <TouchableOpacity key={doc.id}>
            <Card variant="elevated" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginRight: 16 }}>{doc.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{doc.title}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{doc.updated}</Text>
                </View>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Card variant="flat" style={{ marginTop: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, textAlign: 'center' }}>
            By using TradeX, you agree to our Terms of Service and acknowledge that you have read our Privacy Policy
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
