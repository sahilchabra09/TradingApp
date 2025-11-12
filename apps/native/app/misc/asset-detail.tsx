/**
 * Asset Detail Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { mockAssets } from '@/lib/mockData';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/formatters';

export default function AssetDetailScreen() {
  const theme = useTheme();
  const [timeframe, setTimeframe] = useState('1D');
  const asset = mockAssets[0]; // BTC for demo
  const isPositive = asset.change24h >= 0;

  const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold' }}>{asset.symbol}</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 15 }}>{asset.name}</Text>
          </View>
          <TouchableOpacity>
            <Text style={{ fontSize: 32 }}>⭐</Text>
          </TouchableOpacity>
        </View>

        <Card style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 40, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 8 }}>{formatCurrency(asset.price)}</Text>
          <Text style={{ color: isPositive ? theme.colors.success : theme.colors.error, fontSize: 17, fontWeight: '600' }}>
            {isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(asset.price * asset.change24h / 100))} ({formatPercentage(Math.abs(asset.change24h))})
          </Text>
        </Card>

        <Card style={{ height: 250, marginBottom: 16, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 15 }}>📈 Chart Placeholder</Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {timeframes.map((tf) => (
            <TouchableOpacity key={tf} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: timeframe === tf ? theme.colors.accent.primary : theme.colors.surface.secondary }} onPress={() => setTimeframe(tf)}>
              <Text style={{ color: timeframe === tf ? '#FFFFFF' : theme.colors.text.secondary, fontSize: 13, fontWeight: '600' }}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Stats</Text>
        <Card style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Market Cap</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }}>{formatCompactNumber(asset.volume24h * 100)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>24h Volume</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }}>{formatCompactNumber(asset.volume24h)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Circulating Supply</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: '600' }}>19.2M {asset.symbol}</Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
          <Button title="Buy" onPress={() => {}} style={{ flex: 1 }} />
          <Button title="Sell" onPress={() => {}} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}
