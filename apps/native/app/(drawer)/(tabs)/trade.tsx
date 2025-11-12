/**
 * Trade Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function TradeScreen() {
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 }}>Quick Trade</Text>

        <Card style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Select Asset</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: 'bold' }}>BTC - Bitcoin</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 17, marginTop: 4 }}>$45,320.50</Text>
        </Card>

        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <Button title="Buy" onPress={() => setTradeType('buy')} style={{ flex: 1, marginRight: 8 }} />
          <Button title="Sell" onPress={() => setTradeType('sell')} style={{ flex: 1, marginLeft: 8 }} />
        </View>

        <Input label="Amount" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />

        <Card style={{ marginTop: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: theme.colors.text.secondary }}>Est. Total</Text>
            <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>$0.00</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text.secondary }}>Fee</Text>
            <Text style={{ color: theme.colors.text.primary, fontWeight: '600' }}>$0.00</Text>
          </View>
        </Card>

        <Button title={`${tradeType === 'buy' ? 'Buy' : 'Sell'} BTC`} onPress={() => {}} fullWidth />
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
