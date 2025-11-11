/**
 * Trade Confirmation Modal
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/formatters';

export default function TradeConfirmationScreen() {
  const theme = useTheme();

  const tradeDetails = {
    type: 'buy',
    asset: 'BTC',
    quantity: 0.5,
    price: 45230,
    total: 22615,
    fee: 22.62,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>
          {tradeDetails.type === 'buy' ? '🟢' : '🔴'}
        </Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          Confirm {tradeDetails.type === 'buy' ? 'Buy' : 'Sell'}
        </Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 40 }}>
          Review your order details before submitting
        </Text>

        <Card variant="elevated" style={{ marginBottom: 24 }}>
          <View style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Asset</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600' }}>{tradeDetails.asset}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Quantity</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600' }}>{tradeDetails.quantity} {tradeDetails.asset}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Price</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600' }}>{formatCurrency(tradeDetails.price)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary, marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Fee (0.1%)</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{formatCurrency(tradeDetails.fee)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '700' }}>Total</Text>
              <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', fontFamily: 'RobotoMono' }}>{formatCurrency(tradeDetails.total + tradeDetails.fee)}</Text>
            </View>
          </View>
        </Card>

        <Card variant="flat" style={{ marginBottom: 32, backgroundColor: theme.colors.warning + '10' }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, textAlign: 'center' }}>
            ⚠️ This order will be executed at market price
          </Text>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button title="Cancel" onPress={() => {}} variant="outline" style={{ flex: 1 }} />
          <Button title={tradeDetails.type === 'buy' ? 'Confirm Buy' : 'Confirm Sell'} onPress={() => {}} variant={tradeDetails.type === 'buy' ? 'primary' : 'danger'} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}
