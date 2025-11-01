import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import PriceChange from '../shared/PriceChange';

const AnimatedText = Animated.createAnimatedComponent(Text);

interface PortfolioHeaderProps {
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
}

export default function PortfolioHeader({
  totalValue,
  todayChange,
  todayChangePercent,
}: PortfolioHeaderProps) {
  const { colors } = useTheme();
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(totalValue, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [totalValue]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `$${animatedValue.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
    } as any;
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Portfolio Value</Text>
      <AnimatedText
        style={[styles.value, { color: colors.text }]}
        animatedProps={animatedProps}
      />
      <View style={styles.changeContainer}>
        <PriceChange
          value={todayChange}
          percent={todayChangePercent}
          size="medium"
          showPercent
        />
        <Text style={[styles.todayLabel, { color: colors.textSecondary }]}> Today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.large,
    marginBottom: spacing.xs,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayLabel: {
    ...typography.caption,
  },
});
