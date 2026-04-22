import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native';
import Svg, {
	Defs,
	LinearGradient as SvgGradient,
	Path,
	Stop,
	Line,
	Text as SvgText,
} from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Spinner } from '@/components/Spinner';
import type { ChartPeriod, HistoricalBar } from '@/lib/paper-api';

// ─── Re-export ────────────────────────────────────────────────────────────────

export type { ChartPeriod };

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockChartProps {
	bars: HistoricalBar[];
	isLoading: boolean;
	period: ChartPeriod;
	onPeriodChange: (p: ChartPeriod) => void;
	/** Override the chart width (defaults to window width minus padding) */
	width?: number;
}

type ChartPoint = {
	x: number;
	y: number;
	price: number;
	time: string;
};

type CursorInfo = {
	x: number;
	y: number;
	price: number;
	time: string;
} | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS: ChartPeriod[] = ['1D', '1W', '1M', '3M', '1Y'];
const CHART_H           = 200;
const V_PAD             = 16;
const H_PAD             = 44;
const COLOR_UP          = '#10B981';
const COLOR_DOWN        = '#EF4444';
const COLOR_GRID        = 'rgba(255,255,255,0.06)';
const CURSOR_CLEAR_MS   = 2500;
const TOOLTIP_W         = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPaths(
	bars: HistoricalBar[],
	chartW: number,
): {
	linePath: string;
	areaPath: string;
	isPositive: boolean;
	changePct: number;
	gridYs: number[];
	gridPrices: number[];
	points: ChartPoint[];
} {
	const prices   = bars.map((b) => b.c);
	const rawMin   = Math.min(...prices);
	const rawMax   = Math.max(...prices);
	const padding  = (rawMax - rawMin) * 0.06 || rawMin * 0.01 || 1;
	const minPrice = rawMin - padding;
	const maxPrice = rawMax + padding;
	const range    = maxPrice - minPrice;

	const firstP     = prices[0];
	const lastP      = prices[prices.length - 1];
	const isPositive = lastP >= firstP;
	const changePct  = firstP > 0 ? ((lastP - firstP) / firstP) * 100 : 0;

	const innerH = CHART_H - V_PAD * 2;
	const innerW = chartW - H_PAD;
	const count  = bars.length;

	const toX = (i: number)     => H_PAD + (i / (count - 1)) * innerW;
	const toY = (price: number) => V_PAD + innerH - ((price - minPrice) / range) * innerH;

	const pts: ChartPoint[] = bars.map((bar, i) => ({
		x: toX(i),
		y: toY(bar.c),
		price: bar.c,
		time: bar.t,
	}));

	// Smooth cubic-bezier line
	let linePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
	for (let i = 1; i < pts.length; i++) {
		const prev = pts[i - 1];
		const curr = pts[i];
		const cpx  = prev.x + (curr.x - prev.x) / 2;
		linePath  += ` C ${cpx.toFixed(2)} ${prev.y.toFixed(2)},${cpx.toFixed(2)} ${curr.y.toFixed(2)},${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
	}

	const lastPt  = pts[pts.length - 1];
	const firstPt = pts[0];
	const areaPath =
		`${linePath} L ${lastPt.x.toFixed(2)} ${CHART_H} L ${firstPt.x.toFixed(2)} ${CHART_H} Z`;

	// Three evenly-spaced horizontal grid lines
	const gridCount  = 3;
	const gridYs     = Array.from({ length: gridCount }, (_, k) =>
		V_PAD + (k / (gridCount - 1)) * innerH,
	);
	const gridPrices = gridYs.map((y) => maxPrice - ((y - V_PAD) / innerH) * range);

	return { linePath, areaPath, isPositive, changePct, gridYs, gridPrices, points: pts };
}

function formatAxisPrice(price: number): string {
	if (price >= 1000) return `$${(price / 1000).toFixed(1)}k`;
	if (price >= 100)  return `$${price.toFixed(0)}`;
	return `$${price.toFixed(2)}`;
}

function formatCursorTime(isoTime: string, period: ChartPeriod): string {
	const date = new Date(isoTime);
	if (period === '1D') {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}
	if (period === '1W' || period === '1M') {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: '2-digit',
	});
}

function findClosest(points: ChartPoint[], touchX: number): ChartPoint | null {
	if (!points.length) return null;
	let closest = points[0];
	let minDist = Math.abs(points[0].x - touchX);
	for (const p of points) {
		const d = Math.abs(p.x - touchX);
		if (d < minDist) { minDist = d; closest = p; }
	}
	return closest;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StockChart({
	bars,
	isLoading,
	period,
	onPeriodChange,
	width: propWidth,
}: StockChartProps) {
	const { width: windowW } = useWindowDimensions();
	const chartW = propWidth ?? windowW - 40;

	const gradIdRef = useRef(`cg-${Math.random().toString(36).slice(2, 7)}`);
	const gradId    = gradIdRef.current;

	const chartData = useMemo(() => {
		if (!bars || bars.length < 2) return null;
		return buildPaths(bars, chartW);
	}, [bars, chartW]);

	const lineColor = chartData?.isPositive !== false ? COLOR_UP : COLOR_DOWN;

	// ── Cursor state ───────────────────────────────────────────────────────────
	const [cursorInfo, setCursorInfo] = useState<CursorInfo>(null);
	// Shared value drives the animated vertical line (bypasses React re-renders)
	const cursorX       = useSharedValue<number>(-1);
	const pointsRef     = useRef<ChartPoint[]>([]);
	const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep pointsRef current without an effect (runs synchronously during render)
	if (chartData) pointsRef.current = chartData.points;

	const clearCursor = useCallback(() => {
		cursorX.value = -1;
		setCursorInfo(null);
	}, [cursorX]);

	const scheduleClear = useCallback(() => {
		if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
		clearTimerRef.current = setTimeout(clearCursor, CURSOR_CLEAR_MS);
	}, [clearCursor]);

	const handleCursorMove = useCallback(
		(touchX: number) => {
			const pts = pointsRef.current;
			if (!pts.length) return;
			const clamped = Math.max(H_PAD, Math.min(touchX, chartW));
			const pt = findClosest(pts, clamped);
			if (!pt) return;
			cursorX.value = pt.x;
			setCursorInfo({ x: pt.x, y: pt.y, price: pt.price, time: pt.time });
		},
		[chartW, cursorX],
	);

	// ── Gestures ───────────────────────────────────────────────────────────────
	// Pan: horizontal drag scrubs through history; fails on vertical scroll
	const panGesture = Gesture.Pan()
		.runOnJS(true)
		.activeOffsetX([-4, 4])
		.failOffsetY([-12, 12])
		.onStart((e) => {
			if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
			handleCursorMove(e.x);
		})
		.onUpdate((e) => {
			handleCursorMove(e.x);
		})
		.onEnd(() => {
			scheduleClear();
		});

	// Tap: single tap shows tooltip at the nearest data point
	const tapGesture = Gesture.Tap()
		.runOnJS(true)
		.maxDuration(500)
		.onEnd((e, success) => {
			if (!success) return;
			if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
			handleCursorMove(e.x);
			scheduleClear();
		});

	// Race: the first gesture to activate wins (pan on drag, tap on quick press)
	const gesture = Gesture.Race(panGesture, tapGesture);

	// ── Animated cursor line (runs entirely on the UI thread) ─────────────────
	const cursorLineStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: cursorX.value - 0.5 }],
		opacity: cursorX.value >= 0 ? 1 : 0,
	}));

	// Clamp tooltip so it never clips past the chart edges
	const tooltipLeft = cursorInfo
		? Math.max(4, Math.min(cursorInfo.x - TOOLTIP_W / 2, chartW - TOOLTIP_W - 4))
		: 0;

	return (
		<View>
			{/* ── Period selector ─────────────────────────────────────────── */}
			<View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
				{PERIODS.map((p) => {
					const active = p === period;
					return (
						<TouchableOpacity
							key={p}
							onPress={() => onPeriodChange(p)}
							activeOpacity={0.75}
							style={{
								flex: 1,
								alignItems: 'center',
								paddingVertical: 7,
								borderRadius: 10,
								backgroundColor: active
									? lineColor + '22'
									: 'rgba(255,255,255,0.04)',
								borderWidth: 1,
								borderColor: active ? lineColor : 'rgba(255,255,255,0.08)',
							}}
						>
							<Text
								style={{
									color: active ? lineColor : '#6B7280',
									fontSize: 12,
									fontWeight: active ? '700' : '500',
									letterSpacing: 0.3,
								}}
							>
								{p}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* ── Chart body ──────────────────────────────────────────────── */}
			{isLoading ? (
				<View
					style={{
						height: CHART_H,
						justifyContent: 'center',
						alignItems: 'center',
						backgroundColor: 'rgba(255,255,255,0.02)',
						borderRadius: 12,
					}}
				>
					<Spinner color={COLOR_UP} size="small" />
					<Text style={{ color: '#4B5563', fontSize: 12, marginTop: 8 }}>
						Loading chart data...
					</Text>
				</View>
			) : !chartData ? (
				<View
					style={{
						height: CHART_H,
						justifyContent: 'center',
						alignItems: 'center',
						backgroundColor: 'rgba(255,255,255,0.02)',
						borderRadius: 12,
					}}
				>
					<Text style={{ color: '#4B5563', fontSize: 13 }}>
						No chart data for this period
					</Text>
				</View>
			) : (
				<View>
					<GestureDetector gesture={gesture}>
						<View
							style={{
								width: chartW,
								height: CHART_H,
								borderRadius: 12,
								overflow: 'hidden',
								backgroundColor: 'rgba(255,255,255,0.02)',
							}}
						>
							{/* SVG chart ─────────────────────────────────── */}
							<Svg width={chartW} height={CHART_H}>
								<Defs>
									<SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
										<Stop offset="0%"   stopColor={lineColor} stopOpacity="0.40" />
										<Stop offset="60%"  stopColor={lineColor} stopOpacity="0.08" />
										<Stop offset="100%" stopColor={lineColor} stopOpacity="0"    />
									</SvgGradient>
								</Defs>

								{/* Grid lines + price axis labels */}
								{chartData.gridYs.map((y, idx) => (
									<React.Fragment key={idx}>
										<Line
											x1={H_PAD}
											y1={y}
											x2={chartW}
											y2={y}
											stroke={COLOR_GRID}
											strokeWidth="1"
											strokeDasharray="4,4"
										/>
										<SvgText
											x={H_PAD - 4}
											y={y + 4}
											textAnchor="end"
											fontSize="10"
											fill="#4B5563"
											fontFamily="RobotoMono"
										>
											{formatAxisPrice(chartData.gridPrices[idx])}
										</SvgText>
									</React.Fragment>
								))}

								{/* Gradient area fill */}
								<Path d={chartData.areaPath} fill={`url(#${gradId})`} />

								{/* Price line */}
								<Path
									d={chartData.linePath}
									stroke={lineColor}
									strokeWidth="2"
									fill="none"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</Svg>

							{/* Animated vertical cursor line ─────────────── */}
							<Animated.View
								style={[
									{
										position: 'absolute',
										top: V_PAD,
										bottom: 0,
										width: 1,
										left: 0,
										backgroundColor: 'rgba(255,255,255,0.45)',
									},
									cursorLineStyle,
								]}
							/>

							{/* Cursor dot at the active data point's Y ───── */}
							{cursorInfo !== null && (
								<View
									style={{
										position: 'absolute',
										left: cursorInfo.x - 6,
										top: cursorInfo.y - 6,
										width: 12,
										height: 12,
										borderRadius: 6,
										backgroundColor: lineColor,
										borderWidth: 2,
										borderColor: '#000000',
									}}
								/>
							)}

							{/* Tooltip bubble ─────────────────────────────── */}
							{cursorInfo !== null && (
								<View
									style={{
										position: 'absolute',
										top: 6,
										left: tooltipLeft,
										width: TOOLTIP_W,
										backgroundColor: 'rgba(10,20,28,0.93)',
										borderRadius: 8,
										paddingHorizontal: 10,
										paddingVertical: 7,
										borderWidth: 1,
										borderColor: 'rgba(255,255,255,0.13)',
									}}
								>
									<Text
										style={{
											color: '#FFFFFF',
											fontSize: 14,
											fontWeight: '700',
											letterSpacing: 0.2,
										}}
									>
										{formatAxisPrice(cursorInfo.price)}
									</Text>
									<Text
										style={{ color: '#6B7280', fontSize: 10, marginTop: 2 }}
									>
										{formatCursorTime(cursorInfo.time, period)}
									</Text>
								</View>
							)}
						</View>
					</GestureDetector>

					{/* Change badge ───────────────────────────────────────── */}
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							marginTop: 8,
						}}
					>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								paddingHorizontal: 10,
								paddingVertical: 4,
								borderRadius: 8,
								backgroundColor: chartData.isPositive
									? 'rgba(16,185,129,0.12)'
									: 'rgba(239,68,68,0.12)',
							}}
						>
							<Text
								style={{
									color: lineColor,
									fontSize: 13,
									fontWeight: '700',
									letterSpacing: 0.2,
								}}
							>
								{chartData.changePct >= 0 ? '▲ +' : '▼ '}
								{Math.abs(chartData.changePct).toFixed(2)}%
							</Text>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}
