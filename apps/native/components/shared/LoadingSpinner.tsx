import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingSpinner({ size = 'large', color }: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
}
