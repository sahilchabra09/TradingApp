/**
 * Wallet Balances Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { mockWallets } from '@/lib/mockData';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';

export default function WalletBalancesScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Modern Balance Card */}
        <View style={{ 
          backgroundColor: 'rgba(16, 185, 129, 0.1)', 
          borderRadius: 24, 
          padding: 28, 
          marginBottom: 20,
          borderWidth: 1.5,
          borderColor: 'rgba(16, 185, 129, 0.3)',
        }}>
          {/* Card Icon */}
          <View style={{ marginBottom: 24 }}>
            <Ionicons name="wallet" size={40} color={theme.colors.accent.primary} />
          </View>
          
          {/* Balance */}
          <Text style={{ color: '#9CA3AF', fontSize: 13, letterSpacing: 0.5, marginBottom: 8, fontWeight: '600' }}>Total Balance</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 42, fontWeight: 'bold', letterSpacing: -0.5, marginBottom: 8 }}>
            {formatCurrency(mockWallets.reduce((sum, w) => sum + w.balance, 0))}
          </Text>
          
          {/* Gain Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="trending-up" size={16} color={theme.colors.success} />
            <Text style={{ color: theme.colors.success, fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
              +2.4% this month
            </Text>
          </View>
        </View>

        {/* Buttons Below Card */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          <Button title="Deposit" onPress={() => {}} style={{ flex: 1 }} />
          <Button title="Withdraw" onPress={() => {}} style={{ flex: 1 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="wallet-outline" size={24} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700' }}>Your Wallets</Text>
        </View>

        {mockWallets.map((wallet) => (
          <View key={wallet.id} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>{wallet.currency}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: wallet.type === 'fiat' ? theme.colors.accent.primary + '20' : theme.colors.accent.secondary + '20' }}>
                    <Text style={{ color: wallet.type === 'fiat' ? theme.colors.accent.primary : theme.colors.accent.secondary, fontSize: 11, fontWeight: '600' }}>
                      {wallet.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                  {wallet.type === 'crypto' ? formatCryptoAmount(wallet.balance / 50000, wallet.currency) : formatCurrency(wallet.balance)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono' }}>{formatCurrency(wallet.balance)}</Text>
                {wallet.type === 'crypto' && <Text style={{ color: theme.colors.text.tertiary, fontSize: 11, marginTop: 2 }}>0x1234...5678</Text>}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
