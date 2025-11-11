/**
 * Deposit Flow Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function DepositFlowScreen() {
  const theme = useTheme();
  const [method, setMethod] = useState<'bank' | 'card' | 'crypto'>('bank');
  const [amount, setAmount] = useState('');

  const methods = [
    { id: 'bank', label: 'Bank Transfer', emoji: '🏦', fee: '0%' },
    { id: 'card', label: 'Debit/Credit Card', emoji: '💳', fee: '2.5%' },
    { id: 'crypto', label: 'Crypto Deposit', emoji: '₿', fee: 'Network Fee' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Deposit Funds 💸</Text>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12, fontWeight: '600' }}>SELECT METHOD</Text>
        {methods.map((m) => (
          <TouchableOpacity key={m.id} onPress={() => setMethod(m.id as any)}>
            <Card variant={method === m.id ? 'elevated' : 'outlined'} style={{ marginBottom: 12, borderWidth: method === m.id ? 2 : 1, borderColor: method === m.id ? theme.colors.accent.primary : theme.colors.surface.secondary }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginRight: 16 }}>{m.emoji}</Text>
                  <View>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 2 }}>{m.label}</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Fee: {m.fee}</Text>
                  </View>
                </View>
                {method === m.id && <Text style={{ fontSize: 24 }}>✓</Text>}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Input label="Amount" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="dollar-sign" style={{ marginTop: 24, marginBottom: 24 }} />

        <Button title="Continue" onPress={() => {}} variant="primary" fullWidth />
      </ScrollView>
    </View>
  );
}
