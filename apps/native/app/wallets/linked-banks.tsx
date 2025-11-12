/**
 * Linked Bank Accounts Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function LinkedBankAccountsScreen() {
  const theme = useTheme();

  const accounts = [
    { id: 1, bank: 'Chase Bank', account: '****1234', type: 'Checking', verified: true },
    { id: 2, bank: 'Bank of America', account: '****5678', type: 'Savings', verified: true },
  ];

  return (
    <LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="card-outline" size={28} color={theme.colors.accent.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold' }}>Payment Methods</Text>
        </View>

        {accounts.map((account) => (
          <Card key={account.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginRight: 8 }}>{account.bank}</Text>
                  {account.verified && <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />}
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

        <Button title="+ Add Bank Account" onPress={() => {}} fullWidth style={{ marginTop: 24 }} />
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
