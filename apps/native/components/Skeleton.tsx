/**
 * Skeleton Loader Component
 * Animated placeholder for loading states
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/hooks';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}) => {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: theme.animations.shimmer.duration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: theme.animations.shimmer.duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue, theme]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const containerStyle: any = {
    width,
    height,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: borderRadius ?? theme.radius.sm,
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        { opacity },
        style,
      ]}
    />
  );
};

export interface SkeletonCardProps {
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          padding: theme.spacing.base,
          backgroundColor: theme.colors.surface.primary,
          borderRadius: theme.radius.base,
        },
        style,
      ]}
    >
      <Skeleton width="60%" height={20} style={{ marginBottom: theme.spacing.sm }} />
      <Skeleton width="100%" height={16} style={{ marginBottom: theme.spacing.xs }} />
      <Skeleton width="80%" height={16} />
    </View>
  );
};

export interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = 80,
}) => {
  const theme = useTheme();

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard
          key={index}
          style={{ marginBottom: theme.spacing.md, minHeight: itemHeight }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({});
