/**
 * Account Details Screen
 */
import { View, Text, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useUser } from '@clerk/clerk-expo';
import { useMemo } from 'react';

export default function AccountDetailsScreen() {
  const theme = useTheme();
  const { user } = useUser();

  const accountType = useMemo(() => {
    const value = user?.publicMetadata?.accountType;
    return typeof value === 'string' && value.trim().length > 0 ? value : 'Standard';
  }, [user]);

  const kycStatus = useMemo(() => {
    const value = user?.publicMetadata?.kycStatus;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return user?.primaryEmailAddress?.verification?.status === 'verified' ? 'Verified' : 'Pending';
  }, [user]);

  const joinedAt = useMemo(() => {
    if (!user?.createdAt) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(user.createdAt);
    } catch (error) {
      return user.createdAt.toLocaleDateString();
    }
  }, [user]);

  const initials = useMemo(() => {
    if (!user) {
      return 'TR';
    }
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    const fallback = user.primaryEmailAddress?.emailAddress?.slice(0, 2) ?? 'TR';
    const combined = `${first}${last}`.trim();
    return (combined || fallback).toUpperCase();
  }, [user]);

  const fullName = user?.fullName || user?.username || initials;
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  const isVerified = kycStatus.toLowerCase() === 'verified';

  return (
    <LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 16, borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }}
            />
          ) : (
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.accent.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#00100B', fontSize: 40, fontWeight: 'bold' }}>{initials}</Text>
            </View>
          )}
          <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>{fullName}</Text>
          {email && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginRight: 8 }}>{email}</Text>
              {isVerified && <Text style={{ color: theme.colors.success, fontSize: 20 }}>✓</Text>}
            </View>
          )}
        </View>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>ACCOUNT INFO</Text>
        <Card style={{ marginBottom: 32 }}>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Member Since</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{joinedAt}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>Account Type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginRight: 8 }}>{accountType}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.accent.primary + '20' }}>
                <Text style={{ color: theme.colors.accent.primary, fontSize: 11, fontWeight: '600' }}>{accountType === 'Standard' ? 'BASIC' : accountType.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12, marginBottom: 4 }}>KYC Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: isVerified ? theme.colors.success : theme.colors.warning, fontSize: 15, fontWeight: '600', marginRight: 4 }}>{kycStatus}</Text>
              {isVerified && <Text style={{ color: theme.colors.success, fontSize: 16 }}>✓</Text>}
            </View>
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>TRADING LIMITS</Text>
        <Card style={{ marginBottom: 32 }}>
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

        <Button title="Edit Profile" onPress={() => {}} fullWidth />
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

