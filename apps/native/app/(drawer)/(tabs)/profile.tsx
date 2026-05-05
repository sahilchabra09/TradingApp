/**
 * Profile Screen
 */
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/Button';
import { useUser, useClerk, useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useState } from 'react';
import { kycApi, type UserKycSummary } from '@/lib/kyc-api';
import { useStableToken } from '@/lib/hooks';

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn } = useAuth();
  const stableGetToken = useStableToken(getToken);
  const navigation = useRouter();

  const [kycSummary, setKycSummary] = useState<UserKycSummary | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const load = async () => {
      try {
        const token = await stableGetToken();
        if (token) kycApi.setAuthToken(token);
        const res = await kycApi.getUserKycStatus();
        if (res.success && res.data) setKycSummary(res.data);
      } catch { /* silent */ }
    };
    void load();
  }, [isSignedIn]); // stableGetToken is ref-based and never changes identity

  const displayName = useMemo(() => {
    if (!user) return 'Trader';
    return user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Trader';
  }, [user]);

  const emailAddress = useMemo(() => {
    if (!user) return null;
    return user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  }, [user]);

  const accountVerified = user?.primaryEmailAddress?.verification?.status === 'verified';

  const initials = useMemo(() => {
    if (!user) return 'T';
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

  const handleKycPress = () => {
    const hasSession = kycSummary && kycSummary.kycStatus !== 'not_started';
    if (hasSession) {
      router.push('/kyc/status' as any);
    } else {
      router.push('/kyc/start' as any);
    }
  };

  const menuItems = [
    { id: '1', title: 'Account Settings', icon: 'person-outline', screen: '/settings/account', onPress: null },
    { id: '2', title: 'Wallet & Payments', icon: 'wallet-outline', screen: '/wallets/balances', onPress: null },
    { id: '3', title: 'KYC Verification', icon: 'shield-checkmark-outline', screen: null, onPress: handleKycPress },

  ] as const;

  const kycBadge = useMemo(() => {
    if (!kycSummary) return null;
    switch (kycSummary.kycStatus) {
      case 'not_started': return null;
      case 'pending':
        return kycSummary.adminApprovalStatus === 'pending_approval'
          ? 'Pending approval for Retrading'
          : 'In progress';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected -- retry';
      default: return null;
    }
  }, [kycSummary]);

  return (
    <LinearGradient
      colors={theme.colors.background.gradient as [string, string, string]}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={{
            marginBottom: 24,
            padding: 24,
            alignItems: 'center',
            backgroundColor: theme.colors.surface.primary,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  marginBottom: 16,
                  borderWidth: 3,
                  borderColor: theme.colors.border.secondary,
                }}
              />
            ) : (
              <View style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: theme.colors.accent.primary,
                marginBottom: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: theme.colors.border.secondary,
              }}>
                <Text style={{ color: theme.colors.text.inverse, fontSize: 36, fontWeight: '700' }}>{initials}</Text>
              </View>
            )}
            <Text style={{ color: theme.colors.text.primary, fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
              {displayName}
            </Text>
            {emailAddress && (
              <Text style={{ color: theme.colors.text.secondary, fontSize: 14, marginBottom: 12 }}>
                {emailAddress}
              </Text>
            )}
            <View style={{
              backgroundColor: `${theme.colors.success}18`,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
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
              <View style={{
                marginBottom: 12,
                backgroundColor: theme.colors.surface.primary,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.colors.surface.secondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                      <Ionicons name={item.icon as any} size={22} color={theme.colors.accent.primary} />
                    </View>
                    <View>
                      <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '500' }}>
                        {item.title}
                      </Text>
                      {item.id === '3' && kycBadge ? (
                        <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginTop: 2 }}>
                          {kycBadge}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={theme.colors.text.tertiary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Button title="Sign Out" variant="secondary" onPress={handleSignOut} fullWidth style={{ marginTop: 24, marginBottom: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
