/**
 * Document Capture Screen
 */
import { View, Text } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function DocumentCaptureScreen() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 16 }}>Document Capture</Text>
      <Card variant="elevated" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 64, marginBottom: 24 }}>📸</Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 17, fontWeight: '600', marginBottom: 8 }}>Camera Preview</Text>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
          Position your ID document within the frame
        </Text>
      </Card>
      <Button title="Capture Photo" onPress={() => {}} variant="primary" fullWidth />
    </View>
  );
}
