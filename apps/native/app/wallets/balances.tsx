/**
 * Wallet Balances Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { mockWallets } from '@/lib/mockData';
import { formatCurrency, formatCryptoAmount } from '@/lib/formatters';

export default function WalletBalancesScreen() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Card variant="elevated" style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Total Balance</Text>
          <Text style={{ color: theme.colors.text.primary, fontSize: 36, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 16 }}>
            {formatCurrency(mockWallets.reduce((sum, w) => sum + w.balance, 0))}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Deposit" onPress={() => {}} variant="primary" style={{ flex: 1 }} />
            <Button title="Withdraw" onPress={() => {}} variant="outline" style={{ flex: 1 }} />
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Your Wallets 💰</Text>

        {mockWallets.map((wallet) => (
          <Card key={wallet.id} variant="elevated" style={{ marginBottom: 12 }}>
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
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
