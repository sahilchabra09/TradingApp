/**
 * Deposit Success Screen
 */
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function DepositSuccessScreen() {
  const theme = useTheme();

  return (
    <LinearGradient colors={['#000000', '#0a3d2e', '#000000']} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 32 }} edges={['top', 'bottom']}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name="checkmark-circle" size={100} color={theme.colors.success} />
        </View>
      <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
        Deposit Initiated
      </Text>
      <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }}>
        Your deposit of $5,000 is being processed. Funds will be available within 3-5 business days.
      </Text>

      <Card style={{ marginBottom: 32 }}>
        <View style={{ paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Amount</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>$5,000.00</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Method</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>Bank Transfer</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Transaction ID</Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>TXN-2024-A3F5</Text>
          </View>
        </View>
      </Card>

      <Button title="Back to Home" onPress={() => {}} fullWidth />
      </SafeAreaView>
    </LinearGradient>
  );
}
