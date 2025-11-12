/**
 * Home Dashboard Screen
 */
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { mockPortfolio, mockAssets } from '@/lib/mockData';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const theme = useTheme();
  const { totalValue, totalGain, totalGainPercentage, holdings } = mockPortfolio;

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Portfolio Card */}
          <View style={{ margin: 16, padding: 24, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 8, letterSpacing: 0.5 }}>TOTAL PORTFOLIO VALUE</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 'bold', marginBottom: 12, letterSpacing: -1 }}>
              {formatCurrency(totalValue)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: totalGain >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' }}>
              <Ionicons name={totalGain >= 0 ? "trending-up" : "trending-down"} size={18} color={totalGain >= 0 ? theme.colors.success : theme.colors.error} />
              <Text style={{ color: totalGain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 16, fontWeight: '600', marginLeft: 6 }}>
                {formatPercentage(totalGainPercentage)} ({formatCurrency(totalGain)})
              </Text>
            </View>
          </View>

          {/* Holdings */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Your Holdings</Text>
            {holdings.map((h, i) => (
              <View key={i} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{h.symbol}</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>{h.amount} {h.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{formatCurrency(h.value)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={h.gain >= 0 ? "arrow-up" : "arrow-down"} size={14} color={h.gain >= 0 ? theme.colors.success : theme.colors.error} />
                    <Text style={{ color: h.gain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>
                      {formatPercentage(h.gainPercentage)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Market Overview */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 80 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Market Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {mockAssets.slice(0, 5).map((asset) => (
              <View key={asset.id} style={{ width: width * 0.42, marginRight: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>{asset.symbol}</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: 'bold', marginBottom: 8 }}>{formatCurrency(asset.price)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={asset.changePercentage24h >= 0 ? "trending-up" : "trending-down"} size={16} color={asset.changePercentage24h >= 0 ? theme.colors.success : theme.colors.error} />
                  <Text style={{ color: asset.changePercentage24h >= 0 ? theme.colors.success : theme.colors.error, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                    {formatPercentage(asset.changePercentage24h)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

    </SafeAreaView>
    </LinearGradient>
  );
}