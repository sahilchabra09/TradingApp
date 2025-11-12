/**
 * Notification Settings Screen
 */
import { View, Text, ScrollView, Switch } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(false);
  const [marketUpdates, setMarketUpdates] = useState(true);
  const [promotional, setPromotional] = useState(false);

  const settings = [
    { id: 'price', label: 'Price Alerts', description: 'Get notified when assets hit your target prices', value: priceAlerts, onChange: setPriceAlerts },
    { id: 'orders', label: 'Order Updates', description: 'Updates on your order status and execution', value: orderUpdates, onChange: setOrderUpdates },
    { id: 'news', label: 'News Alerts', description: 'Breaking news affecting your portfolio', value: newsAlerts, onChange: setNewsAlerts },
    { id: 'market', label: 'Market Updates', description: 'Daily market summaries and insights', value: marketUpdates, onChange: setMarketUpdates },
    { id: 'promo', label: 'Promotional', description: 'Special offers and new features', value: promotional, onChange: setPromotional },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Notifications 🔔</Text>

        <Card>
          {settings.map((setting, index) => (
            <View key={setting.id}>
              <View style={{ paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>{setting.label}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{setting.description}</Text>
                </View>
                <Switch value={setting.value} onValueChange={setting.onChange} trackColor={{ true: theme.colors.accent.primary, false: theme.colors.surface.secondary }} />
              </View>
              {index < settings.length - 1 && <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />}
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
