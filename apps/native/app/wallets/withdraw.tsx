/**
 * Withdrawal Request Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function WithdrawalRequestScreen() {
  const theme = useTheme();
  const [amount, setAmount] = useState('');

  return (
    <LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="arrow-up-circle-outline" size={28} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Withdraw Funds</Text>
        </View>

        <Card style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Available Balance</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 32, fontWeight: 'bold', fontFamily: 'RobotoMono' }}>$25,430.50</Text>
        </Card>

        <Input label="Withdraw Amount" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" leftIcon="dollar-sign" style={{ marginBottom: 16 }} />

        <Input label="Bank Account" placeholder="Select account" value="Chase ****1234" onChangeText={() => {}} rightIcon="chevron-right" style={{ marginBottom: 24 }} />

        <Card style={{ marginBottom: 24, backgroundColor: theme.colors.warning + '20' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={16} color={theme.colors.warning} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13, flex: 1 }}>Withdrawals take 3-5 business days to process</Text>
          </View>
        </Card>

        <Button title="Request Withdrawal" onPress={() => {}} fullWidth />
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
