/**
 * Invite Friends Screen
 */
import { View, Text, ScrollView, Share } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function InviteScreen() {
  const theme = useTheme();
  const referralCode = 'TRADEX2024';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join TradeX and get $25 free! Use my referral code: ${referralCode}\n\nDownload: https://tradex.app/join`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 20, marginBottom: 16 }}>🎁</Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>Invite Friends</Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
          Give $25, Get $25 when your friends sign up and trade
        </Text>

        <Card variant="elevated" style={{ marginBottom: 24, alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12 }}>Your Referral Code</Text>
          <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, backgroundColor: theme.colors.accent.primary + '20', marginBottom: 16 }}>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 28, fontWeight: 'bold', fontFamily: 'RobotoMono', letterSpacing: 4 }}>{referralCode}</Text>
          </View>
          <Button title="Copy Code" onPress={() => {}} variant="outline" />
        </Card>

        <Card variant="flat" style={{ marginBottom: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 16 }}>How it works</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 20, marginRight: 12 }}>1️⃣</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14, flex: 1 }}>Share your referral code with friends</Text>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 20, marginRight: 12 }}>2️⃣</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14, flex: 1 }}>They sign up and complete KYC verification</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 20, marginRight: 12 }}>3️⃣</Text>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 14, flex: 1 }}>Both of you get $25 after their first trade</Text>
          </View>
        </Card>

        <Card variant="elevated" style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 4 }}>12</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Friends Invited</Text>
            </View>
            <View style={{ width: 1, backgroundColor: theme.colors.surface.secondary }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: theme.colors.success, fontSize: 28, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 4 }}>$300</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Earned</Text>
            </View>
          </View>
        </Card>

        <Button title="Share Invite" onPress={handleShare} variant="primary" fullWidth />
      </ScrollView>
    </View>
  );
}
