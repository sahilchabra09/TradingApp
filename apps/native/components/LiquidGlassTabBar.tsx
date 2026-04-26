
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '@/lib/ThemeContext';
import { Layout } from '@/lib/theme';
import {
  Home,
  BarChart3,
  ArrowLeftRight,
  Newspaper,
  User,
} from 'lucide-react-native';

// ─── Icon map ────────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.FC<{ size: number; color: string }>> = {
  index:   ({ size, color }) => <Home           size={size} color={color} />,
  markets: ({ size, color }) => <BarChart3       size={size} color={color} />,
  trade:   ({ size, color }) => <ArrowLeftRight  size={size} color={color} />,
  news:    ({ size, color }) => <Newspaper       size={size} color={color} />,
  profile: ({ size, color }) => <User            size={size} color={color} />,
};

const CIRCLE = Layout.tabBar.centerButtonSize; // 52px

// ─── Single tab item ─────────────────────────────────────────────────────────

interface TabItemProps {
  routeName:   string;
  isFocused:   boolean;
  onPress:     () => void;
  onLongPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ routeName, isFocused, onPress, onLongPress }) => {
  const { theme } = useAppTheme();
  const tokens    = theme.tabBar;

  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 20,
      stiffness: 260,
      mass: 0.8,
    });
  }, [isFocused, progress]);

  // Circle: scale 0.6→1, opacity 0→1
  const circleStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  // Icon dims when inactive
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.42, 1]),
  }));

  const IconComponent = TAB_ICONS[routeName] ?? TAB_ICONS.index;
  const iconColor = isFocused ? tokens.centerButton.icon : tokens.inactiveIcon;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      hitSlop={8}
    >
      {/* Accent circle — visible only when focused */}
      <Animated.View style={[styles.circleWrap, circleStyle]}>
        <LinearGradient
          colors={tokens.centerButton.gradient as [string, string]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.circle}
        />
      </Animated.View>

      {/* Icon — always rendered */}
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <IconComponent size={22} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
};

// ─── Bar container ───────────────────────────────────────────────────────────

export const FloatingPillTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useAppTheme();
  const tokens    = theme.tabBar;
  const insets    = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.outerContainer,
        {
          bottom:          Math.max(insets.bottom + 16, 40),
          marginHorizontal: Layout.tabBar.horizontalMargin,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Drop shadow layer — separate so shadow isn't clipped */}
      <View
        style={[
          styles.shadowLayer,
          {
            borderRadius: Layout.tabBar.borderRadius,
            shadowColor:  tokens.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius:  24,
            elevation:     20,
          },
        ]}
      >
        {/* Solid pill */}
        <View
          style={[
            styles.pill,
            {
              borderRadius:    Layout.tabBar.borderRadius,
              backgroundColor: theme.colors.background.secondary,
              borderWidth:     StyleSheet.hairlineWidth,
              borderColor:     theme.colors.border.primary,
            },
          ]}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left:     0,
    right:    0,
  },
  shadowLayer: {
    width: '100%',
  },
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-around',
    height:          Layout.tabBar.height,
    paddingHorizontal: 6,
    overflow:        'hidden',
  },
  tabItem: {
    flex:           1,
    height:         '100%',
    alignItems:     'center',
    justifyContent: 'center',
  },
  circleWrap: {
    position:     'absolute',
    width:        CIRCLE,
    height:       CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow:     'hidden',
  },
  circle: {
    width:  CIRCLE,
    height: CIRCLE,
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
});
