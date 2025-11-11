/**
 * Support Screen
 */
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function SupportScreen() {
  const theme = useTheme();

  const supportOptions = [
    { id: 'email', title: 'Email Support', subtitle: 'support@tradex.com', emoji: '📧', action: () => Linking.openURL('mailto:support@tradex.com') },
    { id: 'chat', title: 'Live Chat', subtitle: 'Chat with our support team', emoji: '💬', action: () => {} },
    { id: 'phone', title: 'Phone Support', subtitle: '1-800-TRADEX', emoji: '📞', action: () => Linking.openURL('tel:18008723339') },
    { id: 'faq', title: 'FAQ', subtitle: 'Find answers to common questions', emoji: '❓', action: () => {} },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 20, marginBottom: 16 }}>❓</Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>How can we help?</Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
          Our support team is available 24/7 to assist you
        </Text>

        {supportOptions.map((option) => (
          <TouchableOpacity key={option.id} onPress={option.action}>
            <Card variant="elevated" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24 }}>{option.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{option.title}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{option.subtitle}</Text>
                </View>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Card variant="flat" style={{ marginTop: 32, backgroundColor: theme.colors.accent.primary + '10' }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 8 }}>Need urgent help?</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 16 }}>For account security issues or urgent matters, contact us immediately</Text>
          <Button title="Emergency Contact" onPress={() => {}} variant="primary" fullWidth />
        </Card>
      </ScrollView>
    </View>
  );
}
