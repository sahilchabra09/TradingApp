import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../utils/ThemeContext';
import { spacing, borderRadius, shadows } from '../../constants/spacing';

const AnimatedView = Animated.createAnimatedComponent(View);

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  onPress?: () => void;
  gradient?: boolean;
  gradientColors?: [string, string, ...string[]];
  elevated?: boolean;
}

export default function Card({
  children,
  style,
  padding = 'md',
  onPress,
  gradient = false,
  gradientColors,
  elevated = true,
}: CardProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const defaultGradientColors: [string, string] = isDark
    ? [colors.surface, colors.surfaceLight]
    : [colors.surface, colors.surfaceLight];

  const cardStyle: ViewStyle = {
    backgroundColor: gradient ? 'transparent' : colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[padding],
    ...(elevated && shadows.md),
  };

  const content = <View style={[cardStyle, style]}>{children}</View>;

  if (gradient) {
    return (
      <AnimatedView
        style={[
          animatedStyle,
          {
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            ...(elevated && shadows.md),
          },
          style,
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
      >
        <LinearGradient
          colors={gradientColors || defaultGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: spacing[padding] }}
        >
          {children}
        </LinearGradient>
      </AnimatedView>
    );
  }

  if (onPress) {
    return (
      <AnimatedView
        style={[animatedStyle, cardStyle, style]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
      >
        {children}
      </AnimatedView>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
