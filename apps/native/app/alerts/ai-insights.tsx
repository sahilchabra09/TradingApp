/**
 * AI Insights Center Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AIInsightsCenterScreen() {
  const theme = useTheme();

  const insights = [
    {
      id: 1,
      type: 'opportunity',
      title: 'BTC Showing Strong Buy Signal',
      description: 'Technical indicators suggest potential 8-12% upside in next 7 days',
      confidence: 82,
      emoji: '📈',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Market Volatility Expected',
      description: 'Fed meeting tomorrow may cause 15-20% swings across major assets',
      confidence: 91,
      emoji: '⚠️',
    },
    {
      id: 3,
      type: 'portfolio',
      title: 'Rebalancing Recommended',
      description: 'Your portfolio has drifted 18% from target allocation',
      confidence: 75,
      emoji: '⚖️',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 20, marginBottom: 16 }}>💡</Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>AI Insights</Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
          Powered by machine learning analysis of market trends
        </Text>

        {insights.map((insight) => (
          <Card key={insight.id} variant="elevated" style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 40, marginRight: 16 }}>{insight.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{insight.title}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14, marginBottom: 12 }}>{insight.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginRight: 8 }}>Confidence:</Text>
                  <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.surface.secondary, marginRight: 8 }}>
                    <View style={{ width: `${insight.confidence}%`, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent.primary }} />
                  </View>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 13, fontWeight: '600' }}>{insight.confidence}%</Text>
                </View>
              </View>
            </View>
          </Card>
        ))}

        <Button title="Enable Premium AI" onPress={() => {}} variant="primary" fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}
