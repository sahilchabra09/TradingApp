/**
 * Profile Screen
 */
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { useUser, useClerk, useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useState } from 'react';
import { kycApi, type UserKycSummary } from '@/lib/kyc-api';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const navigation = useRouter();

  // Fetch KYC summary so we can route the KYC menu item correctly
  const [kycSummary, setKycSummary] = useState<UserKycSummary | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const load = async () => {
      try {
        const token = await getToken();
        if (token) kycApi.setAuthToken(token);
        const res = await kycApi.getUserKycStatus();
        if (res.success && res.data) setKycSummary(res.data);
      } catch { /* silent */ }
    };
    void load();
  }, [isSignedIn, getToken]);

  const displayName = useMemo(() => {
    if (!user) {
      return 'Trader';
    }
    return user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Trader';
  }, [user]);

  const emailAddress = useMemo(() => {
    if (!user) {
      return null;
    }
    return user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  }, [user]);

  const accountVerified = user?.primaryEmailAddress?.verification?.status === 'verified';

  const initials = useMemo(() => {
    if (!user) {
      return 'T';
    }
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    const fallback = user.username?.slice(0, 2) ?? user.primaryEmailAddress?.emailAddress?.slice(0, 2) ?? 'TR';
    const combined = `${first}${last}`.trim();
    return combined.length > 0 ? combined.toUpperCase() : fallback.toUpperCase();
  }, [user]);

  const handleSignOut = async () => {
    try {
  await signOut();
  navigation.replace('/sign-in');
    } catch (error) {
      console.error('Sign out failed', error);
    }
  };

  // Route to KYC status if user has already started, otherwise to start
  const handleKycPress = () => {
    const hasSession = kycSummary && kycSummary.kycStatus !== 'not_started';
    if (hasSession) {
      router.push('/kyc/status' as any);
    } else {
      router.push('/kyc/start' as any);
    }
  };

  const menuItems = [
    { id: '1', title: 'Account Settings', icon: 'person-outline', iconSet: 'Ionicons', screen: '/settings/account', onPress: null },
    { id: '2', title: 'Wallet & Payments', icon: 'wallet-outline', iconSet: 'Ionicons', screen: '/wallets/balances', onPress: null },
    { id: '3', title: 'KYC Verification', icon: 'shield-checkmark-outline', iconSet: 'Ionicons', screen: null, onPress: handleKycPress },
    { id: '4', title: 'Security', icon: 'lock-closed-outline', iconSet: 'Ionicons', screen: '/settings/security', onPress: null },
    { id: '5', title: 'Help & Support', icon: 'help-circle-outline', iconSet: 'Ionicons', screen: '/settings/support', onPress: null },
    { id: '6', title: 'Invite Friends', icon: 'gift-outline', iconSet: 'Ionicons', screen: '/settings/invite', onPress: null },
  ] as const;

  // KYC badge label for the menu item subtitle
  const kycBadge = useMemo(() => {
    if (!kycSummary) return null;
    switch (kycSummary.kycStatus) {
      case 'not_started': return null;
      case 'pending':
        return kycSummary.adminApprovalStatus === 'pending_approval'
          ? 'Pending admin approval'
          : 'In progress';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected — retry';
      default: return null;
    }
  }, [kycSummary]);

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
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 16, borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.24)' }}
              />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: theme.colors.accent.primary, marginBottom: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.16)' }}>
                <Text style={{ color: '#0B0F14', fontSize: 36, fontWeight: '700' }}>{initials}</Text>
              </View>
            )}
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{displayName}</Text>
            {emailAddress && <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>{emailAddress}</Text>}
            <View style={{ backgroundColor: `${theme.colors.success}20`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
              <Text style={{ color: theme.colors.success, fontSize: 13, fontWeight: '600' }}>
                {accountVerified ? 'Verified Account' : 'Verification Pending'}
              </Text>
            </View>
          </View>

        {/* Menu Items */}
        {menuItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={item.onPress ?? (() => router.push(item.screen as any))}
            activeOpacity={0.7}
          >
            <View style={{ marginBottom: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.colors.accent.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name={item.icon as any} size={22} color={theme.colors.accent.primary} />
                  </View>
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>{item.title}</Text>
                    {item.id === '3' && kycBadge ? (
                      <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 2 }}>{kycBadge}</Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Button title="Sign Out" onPress={handleSignOut} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}
