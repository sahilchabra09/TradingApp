/**
 * Spinner Component — Reanimated loading spinner
 */

import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/ThemeContext';

export interface SpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP = { small: 18, large: 36 } as const;
const DEFAULT_SIZE = 24;

export function Spinner({ size = DEFAULT_SIZE, color, style }: SpinnerProps) {
  const { theme } = useAppTheme();
  const resolvedColor = color ?? theme.colors.accent.primary;
  const px =
    typeof size === 'number' ? size : (SIZE_MAP[size] ?? DEFAULT_SIZE);
  const strokeWidth = Math.max(2, Math.round(px * 0.11));

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 700,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          borderWidth: strokeWidth,
          borderColor: resolvedColor,
          borderTopColor: 'transparent',
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
