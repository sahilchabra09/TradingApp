/**
 * Settings Screen
 */
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';

export default function SettingsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const settingsSections = [
    {
      title: 'Preferences',
      items: [
        { id: 'notifications', label: 'Push Notifications', value: notifications, onChange: setNotifications },
        { id: 'darkMode', label: 'Dark Mode', value: darkMode, onChange: setDarkMode },
      ],
    },
    {
      title: 'Security',
      items: [
        { id: 'biometric', label: 'Biometric Login', value: biometric, onChange: setBiometric },
        { id: '2fa', label: 'Two-Factor Authentication', isLink: true },
        { id: 'password', label: 'Change Password', isLink: true },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help', label: 'Help Center', isLink: true },
        { id: 'contact', label: 'Contact Support', isLink: true },
        { id: 'legal', label: 'Terms & Privacy', isLink: true },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.text.primary, fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>Settings ⚙️</Text>

        {settingsSections.map((section) => (
          <View key={section.title} style={{ marginBottom: 32 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{section.title.toUpperCase()}</Text>
            <Card variant="elevated">
              {section.items.map((item, index) => (
                <View key={item.id}>
                  {item.isLink ? (
                    <TouchableOpacity style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.text.primary, fontSize: 15 }}>{item.label}</Text>
                      <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>›</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.text.primary, fontSize: 15 }}>{item.label}</Text>
                      <Switch value={item.value} onValueChange={item.onChange} trackColor={{ true: theme.colors.accent.primary, false: theme.colors.surface.secondary }} />
                    </View>
                  )}
                  {index < section.items.length - 1 && <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
