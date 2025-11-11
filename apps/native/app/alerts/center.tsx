/**
 * Alerts Center Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { mockAlerts } from '@/lib/mockData';
import { formatRelativeTime } from '@/lib/formatters';

export default function AlertsCenterScreen() {
  const theme = useTheme();

  const typeEmojis: Record<string, string> = {
    price: '💰',
    volume: '�',
    news: '📰',
    technical: '�',
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Alerts 🔔</Text>
          <TouchableOpacity>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 15, fontWeight: '600' }}>Mark All Read</Text>
          </TouchableOpacity>
        </View>

        {mockAlerts.map((alert) => (
          <Card key={alert.id} variant={alert.read ? 'flat' : 'elevated'} style={{ marginBottom: 12, opacity: alert.read ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>{typeEmojis[alert.type] || '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>{alert.title}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>{alert.message}</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>{formatRelativeTime(alert.timestamp)}</Text>
              </View>
              {!alert.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent.primary }} />}
            </View>
          </Card>
        ))}

        <Button title="Manage Alert Settings" onPress={() => {}} variant="outline" fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}
