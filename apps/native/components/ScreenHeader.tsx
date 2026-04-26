/**
 * ScreenHeader — Shared header for non-tab screens
 *
 * Provides a back button, title, and optional right action.
 * Integrates with the app theme and navigation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks';

export interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightAction,
  transparent = false,
  style,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: transparent
            ? 'transparent'
            : theme.colors.background.primary,
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: theme.colors.border.primary,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {/* Left — back button */}
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.6}
              style={[
                styles.backButton,
                {
                  backgroundColor: theme.colors.surface.primary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <ChevronLeft size={20} color={theme.colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center — title */}
        <Text
          style={[
            styles.title,
            { color: theme.colors.text.primary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Right — optional action */}
        <View style={styles.right}>
          {rightAction ?? null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
  },
  right: {
    width: 48,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
