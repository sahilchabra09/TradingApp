/**
 * Portfolio Detail Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { mockPortfolio, generateChartData } from '@/lib/mockData';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { useRouter } from 'expo-router';

export default function PortfolioDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const chartData = generateChartData(30);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Card style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Total Portfolio Value</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 36, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 8 }}>
            {formatCurrency(mockPortfolio.totalValue)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: mockPortfolio.totalGain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 17, fontWeight: '600', marginRight: 8 }}>
              {mockPortfolio.totalGain >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(mockPortfolio.totalGain))}
            </Text>
            <Text style={{ color: mockPortfolio.totalGainPercentage >= 0 ? theme.colors.success : theme.colors.error, fontSize: 15 }}>
              ({formatPercentage(mockPortfolio.totalGainPercentage)})
            </Text>
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Performance 📊</Text>
        <Card style={{ height: 200, marginBottom: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 15 }}>📈 Chart Placeholder</Text>
          <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 4 }}>30-day performance</Text>
        </Card>

        <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Holdings Breakdown</Text>
        {mockPortfolio.holdings.map((holding) => (
          <TouchableOpacity
            key={holding.symbol}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/misc/asset-detail', params: { id: holding.assetId } })}
          >
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{holding.symbol}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                    {holding.amount} @ {formatCurrency(holding.avgBuyPrice)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono' }}>{formatCurrency(holding.value)}</Text>
                  <Text style={{ color: holding.gain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 13 }}>
                    {holding.gain >= 0 ? '+' : ''}{formatPercentage(holding.gainPercentage)}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
