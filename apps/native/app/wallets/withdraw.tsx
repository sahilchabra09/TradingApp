/**
 * Withdrawal Request Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function WithdrawalRequestScreen() {
  const theme = useTheme();
  const [amount, setAmount] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Withdraw Funds 💵</Text>

        <Card variant="elevated" style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Available Balance</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 32, fontWeight: 'bold', fontFamily: 'RobotoMono' }}>$25,430.50</Text>
        </Card>

        <Input label="Withdraw Amount" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="dollar-sign" style={{ marginBottom: 16 }} />

        <Input label="Bank Account" placeholder="Select account" value="Chase ****1234" onChangeText={() => {}} rightIcon="chevron-right" style={{ marginBottom: 24 }} />

        <Card variant="flat" style={{ marginBottom: 24, backgroundColor: theme.colors.warning + '20' }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>⚠️ Withdrawals take 3-5 business days to process</Text>
        </Card>

        <Button title="Request Withdrawal" onPress={() => {}} variant="primary" fullWidth />
      </ScrollView>
    </View>
  );
}
