import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import type { ChartDataPoint } from '../../utils/dummyData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const CHART_HEIGHT = 200;

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface PortfolioChartProps {
  data: ChartDataPoint[];
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const { colors } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('1M');

  const timeframes: TimeFrame[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

  // Filter data based on selected timeframe
  const getFilteredData = () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    let daysBack = 30;
    switch (selectedTimeframe) {
      case '1D':
        daysBack = 1;
        break;
      case '1W':
        daysBack = 7;
        break;
      case '1M':
        daysBack = 30;
        break;
      case '3M':
        daysBack = 90;
        break;
      case '1Y':
        daysBack = 365;
        break;
      case 'ALL':
        return data;
    }

    return data.slice(-daysBack);
  };

  const chartData = getFilteredData();
  const isPositive = chartData.length > 1 && chartData[chartData.length - 1].value > chartData[0].value;

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { backgroundColor: colors.surface }]}>
        {/* Chart would go here - Victory Native or custom implementation */}
        <View style={{ height: CHART_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Chart Area</Text>
          <Text style={{ color: colors.textTertiary, ...typography.small }}>
            {chartData.length} data points
          </Text>
        </View>
      </View>
      
      <View style={styles.timeframeContainer}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            onPress={() => setSelectedTimeframe(timeframe)}
            style={[
              styles.timeframeButton,
              {
                backgroundColor:
                  selectedTimeframe === timeframe ? colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.timeframeText,
                {
                  color:
                    selectedTimeframe === timeframe ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {timeframe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  chartContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  timeframeText: {
    ...typography.small,
    fontWeight: '600',
  },
});
