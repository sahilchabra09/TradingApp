/**
 * Deposit Flow Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function DepositFlowScreen() {
  const theme = useTheme();
  const [method, setMethod] = useState<'bank' | 'card' | 'crypto'>('bank');
  const [amount, setAmount] = useState('');

  const methods = [
    { id: 'bank', label: 'Bank Transfer', icon: 'business-outline' as const, fee: '0%' },
    { id: 'card', label: 'Debit/Credit Card', icon: 'card-outline' as const, fee: '2.5%' },
    { id: 'crypto', label: 'Crypto Deposit', icon: 'logo-bitcoin' as const, fee: 'Network Fee' },
  ];

  return (
    <LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="arrow-down-circle-outline" size={28} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Deposit Funds</Text>
        </View>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12, fontWeight: '600' }}>SELECT METHOD</Text>
        {methods.map((m) => (
          <TouchableOpacity key={m.id} onPress={() => setMethod(m.id as any)}>
            <Card style={{ marginBottom: 12, borderWidth: method === m.id ? 2 : 1, borderColor: method === m.id ? theme.colors.accent.primary : theme.colors.surface.secondary }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.accent.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <Ionicons name={m.icon} size={24} color={theme.colors.accent.primary} />
                  </View>
                  <View>
                    <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 2 }}>{m.label}</Text>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Fee: {m.fee}</Text>
                  </View>
                </View>
                {method === m.id && <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent.primary} />}
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Input label="Amount" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="dollar-sign" style={{ marginTop: 24, marginBottom: 24 }} />

        <Button title="Continue" onPress={() => {}} fullWidth />
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
