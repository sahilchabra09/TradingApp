/**
 * Watchlist Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { mockAssets } from '@/lib/mockData';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

export default function WatchlistScreen() {
  const theme = useTheme();
  const watchlist = mockAssets.slice(0, 8);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Watchlist ⭐</Text>
          <TouchableOpacity>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 15, fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {watchlist.map((asset) => {
          const isPositive = asset.change24h >= 0;
          return (
            <TouchableOpacity key={asset.id}>
              <Card variant="elevated" style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{asset.symbol}</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{asset.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono', marginBottom: 4 }}>{formatCurrency(asset.price)}</Text>
                    <Text style={{ color: isPositive ? theme.colors.success : theme.colors.error, fontSize: 13, fontWeight: '600' }}>
                      {isPositive ? '↑' : '↓'} {formatPercentage(Math.abs(asset.change24h))}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
