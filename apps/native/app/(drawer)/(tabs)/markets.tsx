/**
 * Markets Screen
 */
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { mockAssets } from '@/lib/mockData';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/formatters';

export default function MarketsScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'losers'>('all');

  const filteredAssets = mockAssets
    .filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((a) => filterType === 'all' ? true : filterType === 'gainers' ? a.changePercentage24h > 0 : a.changePercentage24h < 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top', 'bottom']}>
      {/* Search Bar */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface.primary, borderRadius: 12, paddingHorizontal: 16, height: 48 }}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search assets..."
            placeholderTextColor={theme.colors.text.disabled}
            style={{ flex: 1, color: theme.colors.text.primary, fontSize: 15 }}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 }}>
        {(['all', 'gainers', 'losers'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setFilterType(filter)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: filterType === filter ? theme.colors.accent.primary : theme.colors.surface.elevated,
              marginRight: 8,
            }}
          >
            <Text style={{ color: filterType === filter ? theme.colors.text.inverse : theme.colors.text.secondary, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Assets List */}
      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card variant="elevated" style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{item.symbol}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 4 }}>{item.name}</Text>
                <Text style={{ color: theme.colors.text.tertiary, fontSize: 11 }}>Vol: {formatCompactNumber(item.volume24h)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{formatCurrency(item.price)}</Text>
                <View style={{ backgroundColor: `${item.changePercentage24h >= 0 ? theme.colors.success : theme.colors.error}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: item.changePercentage24h >= 0 ? theme.colors.success : theme.colors.error, fontSize: 13, fontWeight: '600' }}>
                    {formatPercentage(item.changePercentage24h)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      />

      <FAB icon={<Text style={{ fontSize: 24 }}>⚡</Text>} onPress={() => {}} position="bottom-right" variant="primary" />
    </SafeAreaView>
  );
}
