/**
 * Referral History Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { formatCurrency, formatDate } from '@/lib/formatters';

export default function ReferralHistoryScreen() {
  const theme = useTheme();

  const referrals = [
    { id: 1, name: 'Sarah M.', status: 'completed', reward: 25, date: new Date('2024-03-15') },
    { id: 2, name: 'Mike T.', status: 'completed', reward: 25, date: new Date('2024-03-10') },
    { id: 3, name: 'Emily R.', status: 'pending', reward: 0, date: new Date('2024-03-20') },
    { id: 4, name: 'David K.', status: 'completed', reward: 25, date: new Date('2024-02-28') },
  ];

  const totalEarned = referrals.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.reward, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Referral History</Text>

        <Card style={{ marginBottom: 24 }}>
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 8 }}>Total Earned</Text>
            <Text style={{ color: theme.colors.success, fontSize: 40, fontWeight: 'bold', fontFamily: 'RobotoMono' }}>{formatCurrency(totalEarned)}</Text>
            <Text style={{ color: theme.colors.text.tertiary, fontSize: 13, marginTop: 8 }}>From {referrals.filter(r => r.status === 'completed').length} successful referrals</Text>
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>REFERRALS</Text>
        {referrals.map((referral) => (
          <Card key={referral.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{referral.name}</Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>{formatDate(referral.date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {referral.status === 'completed' ? (
                  <>
                    <Text style={{ color: theme.colors.success, fontSize: 17, fontWeight: '600', fontFamily: 'RobotoMono', marginBottom: 2 }}>+{formatCurrency(referral.reward)}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.success + '20' }}>
                      <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: '600' }}>COMPLETED</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.warning + '20' }}>
                    <Text style={{ color: theme.colors.warning, fontSize: 10, fontWeight: '600' }}>PENDING</Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
