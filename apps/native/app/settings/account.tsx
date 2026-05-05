/**
 * Account Details Screen
 */
import { useState, useMemo } from 'react';
import { Alert, View, Text, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useStableToken } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useUser, useAuth, useClerk } from '@clerk/clerk-expo';
import { deleteAccount } from '@/lib/user-api';

export default function AccountDetailsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const stableGetToken = useStableToken(getToken);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = () => {
    // First confirmation
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all trading history, KYC records, and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — ask to type intent
            Alert.alert(
              'Are you absolutely sure?',
              'Your account and all associated data will be erased forever.',
              [
                { text: 'No, keep my account', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: performDelete,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount(stableGetToken);
      // Sign out locally — Clerk account is already gone server-side
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setIsDeleting(false);
      Alert.alert(
        'Deletion Failed',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  };

  return (
    <LinearGradient colors={theme.colors.background.gradient as [string, string, string]} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
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
              <Text style={{ color: theme.colors.text.inverse, fontSize: 40, fontWeight: 'bold' }}>{initials}</Text>
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

        <Button title="Edit Profile" onPress={() => {}} fullWidth style={{ marginBottom: 16 }} />

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        <View style={{
          marginTop: 8,
          padding: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: `${theme.colors.error}40`,
          backgroundColor: `${theme.colors.error}08`,
        }}>
          <Text style={{
            color: theme.colors.error,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
            DANGER ZONE
          </Text>
          <Text style={{
            color: theme.colors.text.secondary,
            fontSize: 13,
            lineHeight: 19,
            marginBottom: 16,
          }}>
            Permanently delete your account and all associated data including KYC records, trade history, and holdings. This action cannot be undone.
          </Text>
          <Button
            title={isDeleting ? 'Deleting...' : 'Delete Account'}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
            fullWidth
            style={{
              backgroundColor: theme.colors.error,
              borderColor: theme.colors.error,
            }}
          />
        </View>

      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
