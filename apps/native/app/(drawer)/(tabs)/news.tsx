/**
 * News Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { mockNews } from '@/lib/mockData';
import { formatRelativeTime } from '@/lib/formatters';

export default function NewsScreen() {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 }}>Market News</Text>

        {mockNews.map((article) => (
          <Card key={article.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>{article.source}</Text>
              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>{formatRelativeTime(article.publishedAt)}</Text>
            </View>
            <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 8 }}>{article.title}</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }} numberOfLines={2}>{article.summary}</Text>
            {article.sentiment && (
              <View style={{ marginTop: 8 }}>
                <View style={{ backgroundColor: `${article.sentiment === 'bullish' ? theme.colors.success : article.sentiment === 'bearish' ? theme.colors.error : theme.colors.chart.neutral}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                  <Text style={{ color: article.sentiment === 'bullish' ? theme.colors.success : article.sentiment === 'bearish' ? theme.colors.error : theme.colors.chart.neutral, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                    {article.sentiment}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
