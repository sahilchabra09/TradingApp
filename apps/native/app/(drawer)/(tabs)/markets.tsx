/**
 * Markets Screen
 */
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
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
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Search Bar */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search assets..."
              placeholderTextColor="#6B7280"
              style={{ flex: 1, color: '#FFFFFF', fontSize: 15 }}
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
          <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
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
          </View>
        )}
      />

    </SafeAreaView>
    </LinearGradient>
  );
}
