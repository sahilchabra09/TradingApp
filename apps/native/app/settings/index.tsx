/**
 * Settings Screen — with Theme Switcher
 */
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useAppTheme } from '@/lib/ThemeContext';
import { ALL_THEMES, type ThemeName } from '@/lib/theme';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Check } from 'lucide-react-native';

export default function SettingsScreen() {
  const { theme, themeName, setThemeName } = useAppTheme();
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  const THEME_PREVIEW_COLORS: Record<ThemeName, { bg: string; accent: string; text: string }> = {
    obsidian: { bg: '#0A0A0C', accent: '#C9A962', text: '#F5F5F7' },
    ivory: { bg: '#FAFAF8', accent: '#996515', text: '#1C1C1E' },
    midnight: { bg: '#080C14', accent: '#64A0FF', text: '#E8ECF4' },
  };

  const settingsSections = [
    {
      title: 'Security',
      items: [
        { id: 'biometric', label: 'Biometric Login', value: biometric, onChange: setBiometric },
        { id: '2fa', label: 'Two-Factor Authentication', isLink: true },
        { id: 'password', label: 'Change Password', isLink: true },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { id: 'notifications', label: 'Push Notifications', value: notifications, onChange: setNotifications },
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
    <LinearGradient
      colors={theme.colors.background.gradient as [string, string, string]}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScreenHeader title="Settings" showBack transparent />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Theme Switcher */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{
              color: theme.colors.text.secondary,
              fontSize: 13,
              fontWeight: '600',
              marginBottom: 12,
              letterSpacing: 1,
            }}>
              APPEARANCE
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {ALL_THEMES.map((t) => {
                const isActive = themeName === t.name;
                const preview = THEME_PREVIEW_COLORS[t.name];

                return (
                  <TouchableOpacity
                    key={t.name}
                    onPress={() => setThemeName(t.name)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      borderRadius: 16,
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive
                        ? theme.colors.accent.primary
                        : theme.colors.border.primary,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Preview swatch */}
                    <View
                      style={{
                        backgroundColor: preview.bg,
                        height: 64,
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* Accent dot */}
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: preview.accent,
                        }}
                      />
                      {/* Check overlay */}
                      {isActive && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: theme.colors.accent.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} color={theme.isDark ? '#000' : '#FFF'} strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    {/* Label */}
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        backgroundColor: theme.colors.surface.primary,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.text.primary,
                          fontSize: 13,
                          fontWeight: '600',
                          marginBottom: 2,
                        }}
                      >
                        {t.label}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.text.tertiary,
                          fontSize: 10,
                        }}
                        numberOfLines={1}
                      >
                        {t.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Settings sections */}
          {settingsSections.map((section) => (
            <View key={section.title} style={{ marginBottom: 32 }}>
              <Text style={{
                color: theme.colors.text.secondary,
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 12,
                letterSpacing: 1,
              }}>
                {section.title.toUpperCase()}
              </Text>
              <Card>
                {section.items.map((item, index) => (
                  <View key={item.id}>
                    {item.isLink ? (
                      <TouchableOpacity style={{
                        paddingVertical: 14,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: theme.colors.text.primary, fontSize: 15 }}>
                          {item.label}
                        </Text>
                        <Text style={{ color: theme.colors.text.tertiary, fontSize: 20 }}>›</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{
                        paddingVertical: 14,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: theme.colors.text.primary, fontSize: 15 }}>
                          {item.label}
                        </Text>
                        <Switch
                          value={item.value}
                          onValueChange={item.onChange}
                          trackColor={{
                            true: theme.colors.accent.primary,
                            false: theme.colors.surface.elevated,
                          }}
                          thumbColor={theme.colors.text.primary}
                        />
                      </View>
                    )}
                    {index < section.items.length - 1 && (
                      <View style={{ height: 1, backgroundColor: theme.colors.border.primary }} />
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
