/**
 * FAB (Floating Action Button) Component
 * Customizable floating button with icon
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { useTheme } from '@/lib/hooks';
import { Shadows } from '@/lib/theme';

export interface FABProps {
  onPress: () => void;
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export const FAB: React.FC<FABProps> = ({
  onPress,
  icon,
  position = 'bottom-right',
  size = 'medium',
  variant = 'primary',
  style,
}) => {
  const theme = useTheme();
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return 48;
      case 'large':
        return 64;
      default:
        return 56;
    }
  };

  const getFABStyle = (): ViewStyle => {
    const fabSize = getSize();
    const baseStyle: ViewStyle = {
      position: 'absolute',
      width: fabSize,
      height: fabSize,
      borderRadius: fabSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        variant === 'primary'
          ? theme.colors.accent.primary
          : theme.colors.surface.elevated,
      bottom: theme.spacing['2xl'],
      ...Shadows.lg,
      ...Shadows.glow(theme.colors.accent.primary),
    };

    // Position
    switch (position) {
      case 'bottom-left':
        baseStyle.left = theme.spacing.base;
        break;
      case 'bottom-center':
        baseStyle.alignSelf = 'center';
        break;
      default:
        baseStyle.right = theme.spacing.base;
    }

    return baseStyle;
  };

  return (
    <Animated.View
      style={[
        getFABStyle(),
        style,
        { transform: [{ scale: scaleValue }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
