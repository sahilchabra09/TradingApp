/**
 * Orders History Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { mockOrders } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function OrdersHistoryScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<'all' | 'open' | 'filled' | 'cancelled'>('all');

  const filters = ['all', 'open', 'filled', 'cancelled'] as const;
  const filteredOrders = filter === 'all' ? mockOrders : mockOrders.filter((o) => o.status === filter);

  const statusColors: Record<string, string> = {
    open: theme.colors.warning,
    'partially-filled': theme.colors.warning,
    filled: theme.colors.success,
    cancelled: theme.colors.error,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Order History 📜</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {filters.map((f) => (
            <TouchableOpacity key={f} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: filter === f ? theme.colors.accent.primary : theme.colors.surface.secondary }} onPress={() => setFilter(f)}>
              <Text style={{ color: filter === f ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredOrders.map((order) => (
          <Card key={order.id} variant="elevated" style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>{order.symbol}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: order.side === 'buy' ? theme.colors.success + '20' : theme.colors.error + '20' }}>
                  <Text style={{ color: order.side === 'buy' ? theme.colors.success : theme.colors.error, fontSize: 11, fontWeight: '600' }}>{order.side.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={{ color: statusColors[order.status] || theme.colors.text.secondary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{order.status}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Amount: {order.amount}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{formatDate(order.timestamp)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{order.price ? formatCurrency(order.price) : 'Market'}</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>{order.type}</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
