import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing, borderRadius, shadows } from '../../constants/spacing';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { Holding } from '../../utils/dummyData';
import PriceChange from '../shared/PriceChange';

interface HoldingCardProps {
  holding: Holding;
}

export default function HoldingCard({ holding }: HoldingCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    // router.push(`/(screens)/asset-detail?symbol=${holding.symbol}`);
  };

  if (holding.category === 'cash') {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
            <Text style={styles.iconText}>💵</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={[styles.symbol, { color: colors.text }]}>{holding.symbol}</Text>
            <Text style={[styles.name, { color: colors.textSecondary }]}>{holding.name}</Text>
          </View>
        </View>
        <View style={styles.rightContainer}>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatCurrency(holding.totalValue)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={styles.iconText}>
            {holding.category === 'crypto' ? '🪙' : '📈'}
          </Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.symbolRow}>
            <Text style={[styles.symbol, { color: colors.text }]}>{holding.symbol}</Text>
            <PriceChange value={holding.change} percent={holding.changePercent} size="small" />
          </View>
          <Text style={[styles.name, { color: colors.textSecondary }]}>{holding.name}</Text>
          <Text style={[styles.quantity, { color: colors.textTertiary }]}>
            {holding.quantity} {holding.category === 'crypto' ? holding.symbol : 'shares'} • {formatCurrency(holding.currentPrice)}
          </Text>
        </View>
      </View>
      <View style={styles.rightContainer}>
        <Text style={[styles.value, { color: colors.text }]}>
          {formatCurrency(holding.totalValue)}
        </Text>
        {/* Mini sparkline placeholder */}
        <View style={styles.sparklineContainer}>
          <Text style={{ color: colors.textTertiary, fontSize: 10 }}>▁▂▃▄▅▃▄</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  infoContainer: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  symbol: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  name: {
    ...typography.caption,
    marginBottom: 2,
  },
  quantity: {
    ...typography.small,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  value: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  sparklineContainer: {
    marginTop: 4,
  },
});
