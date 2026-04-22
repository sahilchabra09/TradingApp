/**
 * Spinner Component
 *
 * A smooth, always-animated loading spinner built with Reanimated.
 * Uses ReduceMotion.Never so it keeps spinning even when the device
 * "Reduce Motion" accessibility setting is enabled — unlike the native
 * ActivityIndicator which freezes into a static rotate-cw icon.
 */

import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from 'react-native-reanimated';

export interface SpinnerProps {
	/** Matches ActivityIndicator's size prop for easy drop-in replacement */
	size?: 'small' | 'large' | number;
	color?: string;
	style?: StyleProp<ViewStyle>;
}

const SIZE_MAP = { small: 18, large: 36 } as const;
const DEFAULT_SIZE = 24;

export function Spinner({ size = DEFAULT_SIZE, color = '#10B981', style }: SpinnerProps) {
	const px = typeof size === 'number' ? size : (SIZE_MAP[size] ?? DEFAULT_SIZE);
	const strokeWidth = Math.max(2, Math.round(px * 0.11));

	const rotation = useSharedValue(0);

	useEffect(() => {
		rotation.value = withRepeat(
			withTiming(360, {
				duration: 700,
				easing: Easing.linear,
				// Always spin — never respect the system "Reduce Motion" setting.
				// Without this, ActivityIndicator freezes on a single frame that
				// looks exactly like a static retry/rotate-cw icon.
				reduceMotion: ReduceMotion.Never,
			}),
			-1, // infinite
		);
	}, [rotation]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	return (
		<Animated.View
			style={[
				{
					width: px,
					height: px,
					borderRadius: px / 2,
					borderWidth: strokeWidth,
					borderColor: color,
					// The transparent top-border creates the classic 3/4-arc spinner look
					borderTopColor: 'transparent',
				},
				animatedStyle,
				style,
			]}
		/>
	);
}
