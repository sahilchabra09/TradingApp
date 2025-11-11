/**
 * Deposit Success Screen
 */
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function DepositSuccessScreen() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 80, textAlign: 'center', marginBottom: 24 }}>✅</Text>
      <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
        Deposit Initiated
      </Text>
      <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
        Your deposit of $5,000 is being processed. Funds will be available within 3-5 business days.
      </Text>

      <Card variant="elevated" style={{ marginBottom: 32 }}>
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Amount</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>$5,000.00</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Method</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>Bank Transfer</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Transaction ID</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>TXN-2024-A3F5</Text>
          </View>
        </View>
      </Card>

      <Button title="Back to Home" onPress={() => {}} variant="primary" fullWidth />
    </View>
  );
}
