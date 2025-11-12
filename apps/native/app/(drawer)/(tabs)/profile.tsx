/**
 * Profile Screen
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function ProfileScreen() {
  const theme = useTheme();

  const menuItems = [
    { id: '1', title: 'Account Settings', icon: 'person-outline', iconSet: 'Ionicons', screen: '/settings/account' },
    { id: '2', title: 'Wallet & Payments', icon: 'wallet-outline', iconSet: 'Ionicons', screen: '/wallets/balances' },
    { id: '3', title: 'KYC Verification', icon: 'shield-checkmark-outline', iconSet: 'Ionicons', screen: '/kyc/start' },
    { id: '4', title: 'Security', icon: 'lock-closed-outline', iconSet: 'Ionicons', screen: '/settings/security' },
    { id: '5', title: 'Help & Support', icon: 'help-circle-outline', iconSet: 'Ionicons', screen: '/settings/support' },
    { id: '6', title: 'Invite Friends', icon: 'gift-outline', iconSet: 'Ionicons', screen: '/settings/invite' },
  ] as const;

  return (
    <LinearGradient
      colors={['#000000', '#0a3d2e', '#000000']}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={{ marginBottom: 24, padding: 24, alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: theme.colors.accent.primary, marginBottom: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>John Doe</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>john.doe@example.com</Text>
            <View style={{ backgroundColor: `${theme.colors.success}20`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>Verified Account</Text>
            </View>
          </View>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => router.push(item.screen as any)}
            activeOpacity={0.7}
          >
            <View style={{ marginBottom: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.accent.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name={item.icon as any} size={22} color={theme.colors.accent.primary} />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Button title="Sign Out" onPress={() => {}} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
