import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';

type Category = 'all' | 'stock' | 'crypto' | 'forex';

interface MarketCategoryTabsProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

const categories: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'stock', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'forex', label: 'Forex' },
];

export default function MarketCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: MarketCategoryTabsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={{ marginBottom: spacing.md }}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category.key;
        
        return (
          <TouchableOpacity
            key={category.key}
            onPress={() => onSelectCategory(category.key)}
            style={[
              styles.tab,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: isSelected ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  tabText: {
    ...typography.captionMedium,
    fontWeight: '600',
  },
});
