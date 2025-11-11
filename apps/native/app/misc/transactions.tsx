/**
 * Transaction History Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { mockTrades } from '@/lib/mockData';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function TransactionHistoryScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  const filters = ['all', 'buy', 'sell'] as const;
  const filteredTrades = filter === 'all' ? mockTrades : mockTrades.filter((t) => t.type === filter);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Transactions 💳</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {filters.map((f) => (
            <TouchableOpacity key={f} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: filter === f ? theme.colors.accent.primary : theme.colors.surface.secondary }} onPress={() => setFilter(f)}>
              <Text style={{ color: filter === f ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTrades.map((trade) => {
          const isBuy = trade.type === 'buy';
          return (
            <Card key={trade.id} variant="elevated" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>{trade.symbol}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: isBuy ? theme.colors.success + '20' : theme.colors.error + '20' }}>
                    <Text style={{ color: isBuy ? theme.colors.success : theme.colors.error, fontSize: 11, fontWeight: '600' }}>{trade.type.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono' }}>{formatCurrency(trade.amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{formatDate(trade.timestamp)}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
                  {trade.amount} units @ {formatCurrency(trade.price)}
                </Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
