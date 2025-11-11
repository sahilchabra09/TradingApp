/**
 * Security Settings Screen
 */
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function SecurityScreen() {
  const theme = useTheme();
  const [biometric, setBiometric] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Security 🔒</Text>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>AUTHENTICATION</Text>
        <Card variant="elevated" style={{ marginBottom: 32 }}>
          <View style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Face ID / Touch ID</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Use biometrics to unlock</Text>
            </View>
            <Switch value={biometric} onValueChange={setBiometric} trackColor={{ true: theme.colors.accent.primary, false: theme.colors.surface.secondary }} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Two-Factor Authentication</Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Extra security for your account</Text>
            </View>
            <Switch value={twoFactor} onValueChange={setTwoFactor} trackColor={{ true: theme.colors.accent.primary, false: theme.colors.surface.secondary }} />
          </View>
        </Card>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>PASSWORD</Text>
        <Card variant="elevated" style={{ marginBottom: 32 }}>
          <TouchableOpacity style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text.primary, fontSize: 15 }}>Change Password</Text>
            <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </Card>

        <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>DEVICES</Text>
        <Card variant="elevated" style={{ marginBottom: 32 }}>
          <View style={{ paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>iPhone 14 Pro</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: theme.colors.success + '20' }}>
                <Text style={{ color: theme.colors.success, fontSize: 11, fontWeight: '600' }}>CURRENT</Text>
              </View>
            </View>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Last active: Now</Text>
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />
          <View style={{ paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>iPad Pro</Text>
              <TouchableOpacity>
                <Text style={{ color: theme.colors.error, fontSize: 13, fontWeight: '600' }}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Last active: 2 days ago</Text>
          </View>
        </Card>

        <Button title="Sign Out All Devices" onPress={() => {}} variant="danger" fullWidth />
      </ScrollView>
    </View>
  );
}
