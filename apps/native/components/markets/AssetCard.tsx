import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing, borderRadius, shadows } from '../../constants/spacing';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import type { Stock } from '../../utils/dummyData';
import PriceChange from '../shared/PriceChange';

interface AssetCardProps {
  asset: Stock;
}

export default function AssetCard({ asset }: AssetCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    // router.push(`/(screens)/asset-detail?symbol=${asset.symbol}`);
  };

  const isPositive = asset.changePercent > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View style={styles.leftContainer}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={styles.iconText}>
            {asset.category === 'crypto' ? '🪙' : '📊'}
          </Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.symbolRow}>
            <Text style={[styles.symbol, { color: colors.text }]}>{asset.symbol}</Text>
            <View style={[styles.badge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {asset.exchange}
              </Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
            {asset.name}
          </Text>
          <Text style={[styles.volume, { color: colors.textTertiary }]}>
            Vol: {asset.volume}
          </Text>
        </View>
      </View>
      
      <View style={styles.rightContainer}>
        <Text style={[styles.price, { color: colors.text }]}>
          {formatCurrency(asset.price, asset.price < 1 ? 4 : 2)}
        </Text>
        <PriceChange value={asset.change} percent={asset.changePercent} size="small" />
        
        {/* Mini sparkline placeholder */}
        <View style={styles.sparkline}>
          <Text style={{ 
            color: isPositive ? colors.success : colors.danger,
            fontSize: 12,
          }}>
            {isPositive ? '▁▂▃▄▅▄▅' : '▅▄▅▃▂▁▂'}
          </Text>
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
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
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
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.tiny,
    fontWeight: '600',
  },
  name: {
    ...typography.caption,
    marginBottom: 2,
  },
  volume: {
    ...typography.small,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  price: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 2,
  },
  sparkline: {
    marginTop: 4,
  },
});
