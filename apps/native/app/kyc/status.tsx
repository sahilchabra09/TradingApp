/**
 * KYC Status Screen
 */
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function KYCStatusScreen() {
  const theme = useTheme();
  // In production, this would come from API/props
  const status = 'pending' as 'pending' | 'approved' | 'rejected';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 64, textAlign: 'center', marginTop: 40, marginBottom: 24 }}>
          {status === 'pending' ? '⏱️' : status === 'approved' ? '✅' : '❌'}
        </Text>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.colors.text.primary, textAlign: 'center', marginBottom: 12 }}>
          {status === 'pending' ? 'Under Review' : status === 'approved' ? 'Verified!' : 'Review Failed'}
        </Text>
        <Text style={{ fontSize: 15, color: theme.colors.text.secondary, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
          {status === 'pending' 
            ? 'Your KYC submission is being reviewed. This usually takes 24-48 hours.' 
            : status === 'approved' 
            ? 'Your identity has been verified. You now have full access to all features!'
            : 'We couldn\'t verify your identity. Please try again with different documents.'}
        </Text>

        <Card style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: theme.colors.text.secondary }}>Document Upload</Text>
            <Text style={{ color: theme.colors.success }}>✓</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: theme.colors.text.secondary }}>Face Verification</Text>
            <Text style={{ color: theme.colors.success }}>✓</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text.secondary }}>Final Review</Text>
            <Text style={{ color: theme.colors.warning }}>⏱</Text>
          </View>
        </Card>

        {status === 'rejected' && (
          <Button title="Try Again" onPress={() => {}} fullWidth style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </View>
  );
}
