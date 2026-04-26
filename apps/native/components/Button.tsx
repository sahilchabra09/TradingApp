/**
 * Button Component — Premium multi-variant button
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Shadows } from '@/lib/theme';
import { Spinner } from '@/components/Spinner';

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
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.base,
      paddingHorizontal: theme.spacing.lg,
    };

    switch (size) {
      case 'small':
        base.paddingVertical = theme.spacing.sm;
        base.minHeight = 40;
        break;
      case 'large':
        base.paddingVertical = theme.spacing.base;
        base.minHeight = 56;
        break;
      default:
        base.paddingVertical = theme.spacing.md;
        base.minHeight = 48;
    }

    switch (variant) {
      case 'primary':
        base.backgroundColor = disabled
          ? theme.colors.text.disabled
          : theme.colors.accent.primary;
        if (!disabled) Object.assign(base, Shadows.md);
        break;
      case 'secondary':
        base.backgroundColor = theme.colors.surface.secondary;
        base.borderWidth = 1;
        base.borderColor = theme.colors.border.primary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = theme.colors.accent.primary;
        break;
      case 'danger':
        base.backgroundColor = disabled
          ? theme.colors.text.disabled
          : theme.colors.error;
        if (!disabled) Object.assign(base, Shadows.md);
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
    }

    if (fullWidth) base.width = '100%';
    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    switch (size) {
      case 'small':
        base.fontSize = theme.typography.sizes.sm;
        break;
      case 'large':
        base.fontSize = theme.typography.sizes.lg;
        break;
      default:
        base.fontSize = theme.typography.sizes.base;
    }

    switch (variant) {
      case 'primary':
        base.color = theme.isDark ? '#000000' : '#FFFFFF';
        base.fontWeight = '700';
        break;
      case 'danger':
        base.color = '#FFFFFF';
        base.fontWeight = '700';
        break;
      case 'outline':
        base.color = theme.colors.accent.primary;
        base.fontWeight = '700';
        break;
      default:
        base.color = theme.colors.text.primary;
    }

    if (disabled) base.color = theme.colors.text.disabled;
    return base;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyle(), style]}
    >
      {loading ? (
        <Spinner
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
          <Text
            style={[
              getTextStyle(),
              textStyle,
              icon ? { marginLeft: theme.spacing.sm } : null,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
