/**
 * Card Component
 * Container with elevation and styling
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Shadows } from '@/lib/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'outlined' | 'glass';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  style,
}) => {
  const theme = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.radius.base,
      backgroundColor: theme.colors.surface.primary,
    };

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = theme.spacing.sm;
        break;
      case 'large':
        baseStyle.padding = theme.spacing.xl;
        break;
      default:
        baseStyle.padding = theme.spacing.base;
    }

    // Variant
    switch (variant) {
      case 'elevated':
        Object.assign(baseStyle, Shadows.md);
        break;
      case 'outlined':
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.surface.elevated;
        break;
      case 'glass':
        baseStyle.backgroundColor = theme.colors.surface.glass;
        break;
      case 'flat':
      default:
        break;
    }

    return baseStyle;
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({});
