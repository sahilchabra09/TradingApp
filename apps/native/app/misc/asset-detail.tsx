import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/lib/hooks';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { mockAssets, mockPortfolio, generateChartData } from '@/lib/mockData';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/formatters';
import { Svg, Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';

const TIMEFRAMES = ['1H', '1D', '1W', '1M', '1Y', 'ALL'] as const;

export default function AssetDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; symbol?: string }>();
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>('1D');

  const asset = useMemo(() => {
    if (params.id) {
      return mockAssets.find((a) => a.id === params.id);
    }
    if (params.symbol) {
      return mockAssets.find((a) => a.symbol.toLowerCase() === params.symbol?.toLowerCase());
    }
    return undefined;
  }, [params.id, params.symbol]);

  const holding = useMemo(() => {
    if (!asset) {
      return undefined;
    }
    return mockPortfolio.holdings.find(
      (h) => h.assetId === asset.id || h.symbol.toLowerCase() === asset.symbol.toLowerCase()
    );
  }, [asset]);

  const chartData = useMemo(() => generateChartData(30, asset?.price ?? 0), [asset?.price]);

  const [chartWidth, setChartWidth] = useState(() => Dimensions.get('window').width - 80);
  const chartHeight = 220;

  const { linePath, areaPath, points, stepX } = useMemo(() => {
    if (!chartData.length || chartWidth <= 0) {
      return { linePath: '', areaPath: '', points: [] as Array<{ x: number; y: number; data: typeof chartData[number] }>, stepX: 0 };
    }

    const closes = chartData.map((d) => d.close);
    const maxClose = Math.max(...closes);
    const minClose = Math.min(...closes);
    const range = maxClose - minClose || 1;
    const computedStepX = chartData.length === 1 ? 0 : chartWidth / (chartData.length - 1);

    let line = '';
    const computedPoints = chartData.map((point, index) => {
      const x = index * computedStepX;
      const y = chartHeight - ((point.close - minClose) / range) * chartHeight;
      line += `${index === 0 ? 'M' : ' L'} ${x} ${y}`;
      return { x, y, data: point };
    });

    const area = `${line} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return { linePath: line, areaPath: area, points: computedPoints, stepX: computedStepX };
  }, [chartData, chartWidth]);

  const [activeIndex, setActiveIndex] = useState(() => (points.length ? points.length - 1 : 0));

  useEffect(() => {
    setActiveIndex(points.length ? points.length - 1 : 0);
  }, [points.length]);

  const clampIndex = useCallback(
    (xPosition: number) => {
      if (!points.length || stepX === 0) {
        setActiveIndex(0);
        return;
      }
      const idx = Math.round(xPosition / stepX);
      const bounded = Math.max(0, Math.min(points.length - 1, idx));
      setActiveIndex(bounded);
    },
    [points, stepX]
  );

  const chartResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (evt) => {
          clampIndex(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          clampIndex(evt.nativeEvent.locationX);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: () => {
          setActiveIndex(points.length ? points.length - 1 : 0);
        },
        onPanResponderTerminate: () => {
          setActiveIndex(points.length ? points.length - 1 : 0);
        },
      }),
    [clampIndex, points.length]
  );

  const activePoint = points[activeIndex];

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  if (!asset) {
    return (
      <LinearGradient colors={['#000000', '#051f1a', '#000000']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.text.primary, fontSize: 18, marginBottom: 8 }}>
            Asset not found
          </Text>
          <Button title="Go back" onPress={() => router.back()} variant="secondary" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isPositive = asset.changePercentage24h >= 0;

  return (
    <LinearGradient colors={['#000000', '#041d16', '#000000']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.accent.primary, fontSize: 15, fontWeight: '600' }}>{'← Back'}</Text>
          </TouchableOpacity>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 15, marginBottom: 4 }}>
              {asset.name}
            </Text>
            <Text style={{ color: theme.colors.text.primary, fontSize: 36, fontWeight: '700' }}>
              {asset.symbol}
            </Text>
          </View>

          <Card style={{ marginBottom: 20, paddingVertical: 20 }}>
            <Text style={{ color: theme.colors.text.primary, fontSize: 40, fontWeight: 'bold', fontFamily: 'RobotoMono', marginBottom: 12 }}>
              {formatCurrency(asset.price)}
            </Text>
            <Text style={{ color: isPositive ? theme.colors.success : theme.colors.error, fontSize: 17, fontWeight: '600' }}>
              {isPositive ? '▲' : '▼'} {formatCurrency(Math.abs(asset.change24h))} ({formatPercentage(asset.changePercentage24h)})
            </Text>
          </Card>

          <Card style={{ marginBottom: 16, padding: 0 }}>
            <View
              style={{ height: chartHeight + 60, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.surface.secondary }}
              onLayout={({ nativeEvent }) => {
                const nextWidth = Math.max(0, nativeEvent.layout.width - 40);
                if (nextWidth > 0 && Math.abs(nextWidth - chartWidth) > 1) {
                  setChartWidth(nextWidth);
                }
              }}
              {...chartResponder.panHandlers}
            >
              <Text style={{ color: theme.colors.text.primary, fontSize: 18, fontWeight: '600', marginBottom: 6 }}>
                {activePoint ? formatCurrency(activePoint.data.close) : formatCurrency(asset.price)}
              </Text>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 13, marginBottom: 12 }}>
                {activePoint ? formatTimestamp(activePoint.data.timestamp) : 'Live price'}
              </Text>
              <Svg width={chartWidth > 0 ? chartWidth : undefined} height={chartHeight}>
                <Defs>
                  <SvgGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.colors.accent.primary} stopOpacity={0.35} />
                    <Stop offset="100%" stopColor={theme.colors.accent.primary} stopOpacity={0.05} />
                  </SvgGradient>
                </Defs>
                {areaPath ? <Path d={areaPath} fill="url(#chartGradient)" /> : null}
                {linePath ? <Path d={linePath} stroke={theme.colors.accent.primary} strokeWidth={2} fill="none" /> : null}
                {activePoint ? (
                  <>
                    <Path d={`M ${activePoint.x} 0 L ${activePoint.x} ${chartHeight}`} stroke="rgba(255,255,255,0.35)" strokeDasharray="6 6" />
                    <Circle cx={activePoint.x} cy={activePoint.y} r={6} fill={theme.colors.accent.primary} />
                    <Circle cx={activePoint.x} cy={activePoint.y} r={10} stroke={theme.colors.accent.primary} strokeOpacity={0.3} strokeWidth={2} fill="none" />
                  </>
                ) : null}
              </Svg>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 }}>
              {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                  key={tf}
                  onPress={() => setTimeframe(tf)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: timeframe === tf ? theme.colors.accent.primary : 'rgba(255,255,255,0.05)',
                    borderWidth: timeframe === tf ? 0 : 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Text style={{ color: timeframe === tf ? '#000000' : theme.colors.text.secondary, fontSize: 13, fontWeight: '600' }}>
                    {tf}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
            <Button title="Buy" onPress={() => {}} style={{ flex: 1 }} size="large" />
            <Button title="Sell" onPress={() => {}} style={{ flex: 1 }} size="large" variant="danger" />
          </View>

          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
            Market overview
          </Text>
          <Card style={{ marginBottom: 24 }}>
            <StatRow label="Market cap" value={formatCompactNumber(asset.marketCap)} />
            <StatRow label="24h volume" value={formatCompactNumber(asset.volume24h)} />
            <StatRow label="24h high" value={formatCurrency(asset.high24h)} />
            <StatRow label="24h low" value={formatCurrency(asset.low24h)} isLast />
          </Card>

          <Text style={{ color: theme.colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
            Your holdings
          </Text>
          <Card>
            {holding ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Amount owned</Text>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600' }}>
                    {holding.amount} {asset.symbol}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Current value</Text>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600' }}>
                    {formatCurrency(holding.value)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Average buy price</Text>
                  <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '600' }}>
                    {formatCurrency(holding.avgBuyPrice)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>Unrealized P/L</Text>
                  <Text style={{ color: holding.gain >= 0 ? theme.colors.success : theme.colors.error, fontSize: 16, fontWeight: '600' }}>
                    {holding.gain >= 0 ? '+' : ''}{formatCurrency(holding.gain)} ({formatPercentage(holding.gainPercentage)})
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'center', marginBottom: 12 }}>
                  You do not hold any {asset.symbol} yet. Start building a position.
                </Text>
                <Button title="Buy {asset.symbol}" onPress={() => {}} />
              </View>
            )}
          </Card>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type StatRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

const StatRow = ({ label, value, isLast }: StatRowProps) => {
  const theme = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
        <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>{value}</Text>
      </View>
      {!isLast && <View style={{ height: 1, backgroundColor: theme.colors.surface.secondary }} />}
    </View>
  );
};
