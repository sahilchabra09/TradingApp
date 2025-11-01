import React from 'react';
import { Text, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';

interface PriceChangeProps {
  value: number;
  percent?: number;
  showSign?: boolean;
  showPercent?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: TextStyle;
}

export default function PriceChange({
  value,
  percent,
  showSign = true,
  showPercent = true,
  size = 'medium',
  style,
}: PriceChangeProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    // Pulse animation on value change
    scale.value = withSpring(1.1, { damping: 10 }, () => {
      scale.value = withTiming(1, { duration: 300 });
    });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPositive = value > 0;
  const isNegative = value < 0;
  const color = isPositive ? colors.success : isNegative ? colors.danger : colors.textSecondary;

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return typography.small;
      case 'medium':
        return typography.caption;
      case 'large':
        return typography.body;
      default:
        return typography.caption;
    }
  };

  const sign = showSign ? (isPositive ? '+' : isNegative ? '' : '') : '';
  const arrow = isPositive ? '↑' : isNegative ? '↓' : '';
  
  const formattedValue = `${sign}$${Math.abs(value).toFixed(2)}`;
  const formattedPercent = percent !== undefined ? ` (${sign}${Math.abs(percent).toFixed(2)}%)` : '';

  return (
    <Animated.Text
      style={[
        {
          color,
          ...getFontSize(),
          fontWeight: '600',
        },
        animatedStyle,
        style,
      ]}
    >
      {arrow} {formattedValue}{showPercent && formattedPercent}
    </Animated.Text>
  );
}
