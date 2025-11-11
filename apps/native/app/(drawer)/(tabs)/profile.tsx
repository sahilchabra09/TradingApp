/**
 * Profile Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function ProfileScreen() {
  const theme = useTheme();

  const menuItems = [
    { id: '1', title: 'Account Settings', emoji: '⚙️', screen: 'settings' },
    { id: '2', title: 'Wallet & Payments', emoji: '💰', screen: 'wallets' },
    { id: '3', title: 'KYC Verification', emoji: '✅', screen: 'kyc' },
    { id: '4', title: 'Security', emoji: '🔒', screen: 'security' },
    { id: '5', title: 'Help & Support', emoji: '❓', screen: 'support' },
    { id: '6', title: 'Invite Friends', emoji: '🎁', screen: 'invite' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card variant="glass" style={{ marginBottom: 24, padding: 24, alignItems: 'center' }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.accent.primary, marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>John Doe</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 12 }}>john.doe@example.com</Text>
          <View style={{ backgroundColor: `${theme.colors.success}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>✓ Verified</Text>
          </View>
        </Card>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id}>
            <Card variant="elevated" style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{item.emoji}</Text>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                </View>
                <Text style={{ color: theme.colors.text.tertiary }}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        <Button title="Sign Out" onPress={() => {}} variant="outline" fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>
    </View>
  );
}
