/**
 * Home Dashboard Screen
 */
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { mockPortfolio, mockAssets } from '@/lib/mockData';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const theme = useTheme();
  const { totalValue, totalGain, totalGainPercentage, holdings } = mockPortfolio;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Portfolio Card */}
        <Card variant="glass" style={{ margin: 16, padding: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 4 }}>Total Portfolio Value</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 36, fontWeight: 'bold', marginBottom: 8 }}>
            {formatCurrency(totalValue)}
          </Text>
          <Text style={{ color: totalGain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 17, fontWeight: '600' }}>
            {formatPercentage(totalGainPercentage)} ({formatCurrency(totalGain)})
          </Text>
        </Card>

        {/* Holdings */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Your Holdings</Text>
          {holdings.map((h, i) => (
            <Card key={i} variant="elevated" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{h.symbol}</Text>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>{h.amount} {h.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{formatCurrency(h.value)}</Text>
                  <Text style={{ color: h.gain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 13, fontWeight: '500' }}>
                    {formatPercentage(h.gainPercentage)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Market Overview */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 80 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Market Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mockAssets.slice(0, 5).map((asset) => (
              <Card key={asset.id} variant="elevated" style={{ width: width * 0.4, marginRight: 12 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>{asset.symbol}</Text>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: 'bold', marginBottom: 4 }}>{formatCurrency(asset.price)}</Text>
                <Text style={{ color: asset.changePercentage24h >= 0 ? theme.colors.success : theme.colors.error, fontSize: 13, fontWeight: '500' }}>
                  {formatPercentage(asset.changePercentage24h)}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <FAB icon={<Text style={{ fontSize: 24 }}>💹</Text>} onPress={() => {}} position="bottom-right" variant="primary" />
    </SafeAreaView>
  );
}
