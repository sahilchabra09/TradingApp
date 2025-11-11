/**
 * Maintenance Screen
 */
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';

export default function MaintenanceScreen() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <Text style={{ fontSize: 80, marginBottom: 24 }}>🔧</Text>
      <Text style={{ color: theme.colors.text.primary, fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
        Under Maintenance
      </Text>
      <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 }}>
        We're performing scheduled maintenance to improve your experience. We'll be back shortly!
      </Text>
      <Text style={{ color: theme.colors.text.tertiary, fontSize: 13, textAlign: 'center', marginBottom: 40 }}>
        Estimated completion: 2:00 AM EST
      </Text>
      <Button title="Check Status" onPress={() => {}} variant="outline" />
    </View>
  );
}
