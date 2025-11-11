/**
 * Button Component
 * Customizable button with variants and states
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Shadows } from '@/lib/theme';

export interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
}) => {
  const theme = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.base,
      paddingHorizontal: theme.spacing.lg,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingVertical = theme.spacing.sm;
        baseStyle.minHeight = 40;
        break;
      case 'large':
        baseStyle.paddingVertical = theme.spacing.base;
        baseStyle.minHeight = 56;
        break;
      default:
        baseStyle.paddingVertical = theme.spacing.md;
        baseStyle.minHeight = 48;
    }

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = disabled
          ? theme.colors.text.disabled
          : theme.colors.accent.primary;
        Object.assign(baseStyle, !disabled && Shadows.md);
        break;
      case 'secondary':
        baseStyle.backgroundColor = theme.colors.surface.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1.5;
        baseStyle.borderColor = theme.colors.accent.primary;
        break;
      case 'danger':
        baseStyle.backgroundColor = disabled
          ? theme.colors.text.disabled
          : theme.colors.error;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size text styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = theme.typography.sizes.sm;
        break;
      case 'large':
        baseTextStyle.fontSize = theme.typography.sizes.lg;
        break;
      default:
        baseTextStyle.fontSize = theme.typography.sizes.base;
    }

    // Variant text colors
    switch (variant) {
      case 'primary':
      case 'danger':
        baseTextStyle.color = theme.colors.text.inverse;
        break;
      case 'outline':
        baseTextStyle.color = theme.colors.accent.primary;
        break;
      default:
        baseTextStyle.color = theme.colors.text.primary;
    }

    if (disabled) {
      baseTextStyle.color = theme.colors.text.disabled;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'danger'
              ? theme.colors.text.inverse
              : theme.colors.accent.primary
          }
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), textStyle, icon ? { marginLeft: theme.spacing.sm } : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({});
