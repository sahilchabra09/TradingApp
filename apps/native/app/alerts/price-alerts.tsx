/**
 * Price Alerts Management Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/formatters';

export default function PriceAlertsScreen() {
  const theme = useTheme();

  const alerts = [
    { id: 1, asset: 'BTC', targetPrice: 48000, currentPrice: 45230, condition: 'above', active: true },
    { id: 2, asset: 'ETH', targetPrice: 2500, currentPrice: 2832, condition: 'below', active: true },
    { id: 3, asset: 'SOL', targetPrice: 120, currentPrice: 98, condition: 'above', active: false },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Price Alerts 🔔</Text>
          <TouchableOpacity>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 32 }}>+</Text>
          </TouchableOpacity>
        </View>

        {alerts.map((alert) => {
          const isBelow = alert.currentPrice < alert.targetPrice;
          const percentDiff = Math.abs((alert.currentPrice - alert.targetPrice) / alert.targetPrice * 100);
          
          return (
            <Card key={alert.id} variant="elevated" style={{ marginBottom: 12, opacity: alert.active ? 1 : 0.5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{alert.asset}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                    Alert when {alert.condition} {formatCurrency(alert.targetPrice)}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Text style={{ color: theme.colors.error, fontSize: 15, fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: theme.colors.text.tertiary, fontSize: 11, marginBottom: 2 }}>Current Price</Text>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{formatCurrency(alert.currentPrice)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: isBelow ? theme.colors.error : theme.colors.success, fontSize: 13, fontWeight: '600' }}>
                    {isBelow ? '↓' : '↑'} {percentDiff.toFixed(1)}%
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: alert.active ? theme.colors.success + '20' : theme.colors.surface.secondary, marginTop: 4 }}>
                    <Text style={{ color: alert.active ? theme.colors.success : theme.colors.text.tertiary, fontSize: 10, fontWeight: '600' }}>
                      {alert.active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        <Button title="Create New Alert" onPress={() => {}} variant="outline" fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}
