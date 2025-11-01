import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing, borderRadius, shadows } from '../../constants/spacing';
import { formatPercent } from '../../utils/formatters';
import type { Stock } from '../../utils/dummyData';

interface TopMoversProps {
  movers: Stock[];
}

export default function TopMovers({ movers }: TopMoversProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>🔥 Top Movers</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {movers.map((stock) => {
          const isPositive = stock.changePercent > 0;
          
          return (
            <TouchableOpacity
              key={stock.id}
              style={[
                styles.card,
                { 
                  backgroundColor: colors.surface,
                  borderColor: isPositive ? colors.success : colors.danger,
                  borderWidth: 1,
                },
                shadows.sm,
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.badge,
                { backgroundColor: isPositive ? colors.success + '20' : colors.danger + '20' }
              ]}>
                <Text style={styles.emoji}>
                  {stock.category === 'crypto' ? '🪙' : '📈'}
                </Text>
              </View>
              
              <Text style={[styles.symbol, { color: colors.text }]} numberOfLines={1}>
                {stock.symbol}
              </Text>
              
              <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
                {stock.name}
              </Text>
              
              <View style={styles.changeContainer}>
                <Text style={[
                  styles.change,
                  { color: isPositive ? colors.success : colors.danger }
                ]}>
                  {formatPercent(stock.changePercent)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  scrollContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: 120,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 24,
  },
  symbol: {
    ...typography.bodyMedium,
    fontWeight: '700',
    marginBottom: 2,
  },
  name: {
    ...typography.small,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  changeContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  change: {
    ...typography.captionMedium,
    fontWeight: '700',
  },
});
