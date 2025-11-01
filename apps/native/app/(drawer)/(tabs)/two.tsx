import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../utils/ThemeContext';
import { typography } from '../../../constants/typography';
import { spacing } from '../../../constants/spacing';
import SearchBar from '../../../components/markets/SearchBar';
import MarketCategoryTabs from '../../../components/markets/MarketCategoryTabs';
import TopMovers from '../../../components/markets/TopMovers';
import AssetCard from '../../../components/markets/AssetCard';
import { stocks, getTopMovers, getStocksByCategory } from '../../../utils/dummyData';

type Category = 'all' | 'stock' | 'crypto' | 'forex';

export default function MarketsScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  // Get top movers (gainers)
  const topMovers = useMemo(() => getTopMovers('gainers'), []);

  // Filter assets based on search and category
  const filteredAssets = useMemo(() => {
    let assets = getStocksByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      assets = assets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query)
      );
    }

    return assets;
  }, [searchQuery, selectedCategory]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Markets</Text>
      </View>

      <FlatList
        data={filteredAssets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetCard asset={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search stocks, crypto..."
              />
            </View>

            {/* Category Tabs */}
            <MarketCategoryTabs
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Top Movers - Only show when not searching and on 'all' category */}
            {!searchQuery && selectedCategory === 'all' && (
              <TopMovers movers={topMovers.slice(0, 8)} />
            )}

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {searchQuery ? 'Search Results' : 'All Assets'}
              </Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {filteredAssets.length} {filteredAssets.length === 1 ? 'asset' : 'assets'}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No assets found
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  sectionCount: {
    ...typography.caption,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.caption,
  },
});
