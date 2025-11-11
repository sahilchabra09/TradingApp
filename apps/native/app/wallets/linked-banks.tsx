/**
 * Linked Bank Accounts Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function LinkedBankAccountsScreen() {
  const theme = useTheme();

  const accounts = [
    { id: 1, bank: 'Chase Bank', account: '****1234', type: 'Checking', verified: true },
    { id: 2, bank: 'Bank of America', account: '****5678', type: 'Savings', verified: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Payment Methods 🏦</Text>

        {accounts.map((account) => (
          <Card key={account.id} variant="elevated" style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>{account.bank}</Text>
                  {account.verified && <Text style={{ color: theme.colors.success, fontSize: 16 }}>✓</Text>}
                </View>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                  {account.type} {account.account}
                </Text>
              </View>
              <TouchableOpacity>
                <Text style={{ color: theme.colors.error, fontSize: 15, fontWeight: '600' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <Button title="+ Add Bank Account" onPress={() => {}} variant="outline" fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}
