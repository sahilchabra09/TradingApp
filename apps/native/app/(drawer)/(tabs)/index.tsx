import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../utils/ThemeContext';
import { typography } from '../../../constants/typography';
import { spacing } from '../../../constants/spacing';
import PortfolioHeader from '../../../components/portfolio/PortfolioHeader';
import PortfolioChart from '../../../components/portfolio/PortfolioChart';
import QuickActions from '../../../components/portfolio/QuickActions';
import HoldingCard from '../../../components/portfolio/HoldingCard';
import {
  portfolioMetrics,
  portfolioChartData,
  userHoldings,
} from '../../../utils/dummyData';

export default function PortfolioScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.headerButton}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.headerButton, { marginRight: spacing.sm }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Portfolio Value Header */}
        <PortfolioHeader
          totalValue={portfolioMetrics.totalValue}
          todayChange={portfolioMetrics.todayChange}
          todayChangePercent={portfolioMetrics.todayChangePercent}
        />

        {/* Portfolio Chart */}
        <PortfolioChart data={portfolioChartData} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Holdings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Holdings</Text>
          <View style={styles.holdingsContainer}>
            {userHoldings.map((holding) => (
              <HoldingCard key={holding.id} holding={holding} />
            ))}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  section: {
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  holdingsContainer: {
    // Cards have their own margin
  },
});
