/**
 * Container Component — Gradient background wrapper
 */

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/hooks';

export const Container = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={theme.colors.background.gradient as [string, string, string]}
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
    </LinearGradient>
  );
};
