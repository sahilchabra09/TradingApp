/**
 * Account Details Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function AccountDetailsScreen() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.accent.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: 'bold' }}>JD</Text>
          </View>
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>John Doe</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginRight: 8 }}>john.doe@email.com</Text>
            <Text style={{ color: theme.colors.success, fontSize: 20 }}>✓</Text>
          </View>
        </View>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>ACCOUNT INFO</Text>
        <Card variant="elevated" style={{ marginBottom: 32 }}>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Member Since</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>January 2024</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Account Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginRight: 8 }}>Premium</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.accent.primary + '20' }}>
                <Text style={{ color: theme.colors.accent.primary, fontSize: 11, fontWeight: '600' }}>PRO</Text>
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>KYC Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.success, fontSize: 15, fontWeight: '600', marginRight: 4 }}>Verified</Text>
              <Text style={{ color: theme.colors.success, fontSize: 16 }}>✓</Text>
            </View>
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>TRADING LIMITS</Text>
        <Card variant="elevated" style={{ marginBottom: 32 }}>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Daily Limit</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>$50,000</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Monthly Limit</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>$500,000</Text>
          </View>
        </Card>

        <Button title="Edit Profile" onPress={() => {}} variant="outline" fullWidth />
      </ScrollView>
    </View>
  );
}
