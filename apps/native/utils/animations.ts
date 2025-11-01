import {
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
} from 'react-native-reanimated';

// Timing configurations
export const timingConfig: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const fastTimingConfig: WithTimingConfig = {
  duration: 150,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export const slowTimingConfig: WithTimingConfig = {
  duration: 500,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

// Spring configurations
export const springConfig: WithSpringConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

export const bounceConfig: WithSpringConfig = {
  damping: 10,
  stiffness: 100,
  mass: 1,
};

export const gentleSpringConfig: WithSpringConfig = {
  damping: 20,
  stiffness: 120,
  mass: 1,
};

// Animation presets
export const fadeIn = (duration: number = 300) => {
  return withTiming(1, { duration, easing: Easing.ease });
};

export const fadeOut = (duration: number = 300) => {
  return withTiming(0, { duration, easing: Easing.ease });
};

export const scaleIn = (duration: number = 300) => {
  return withSpring(1, springConfig);
};

export const scaleOut = (duration: number = 300) => {
  return withSpring(0, springConfig);
};

export const slideInUp = (from: number = 100, duration: number = 300) => {
  return withTiming(0, { duration, easing: Easing.out(Easing.cubic) });
};

export const slideOutDown = (to: number = 100, duration: number = 300) => {
  return withTiming(to, { duration, easing: Easing.in(Easing.cubic) });
};

export const buttonPressAnimation = () => {
  return withSequence(
    withTiming(0.95, { duration: 100, easing: Easing.ease }),
    withSpring(1, bounceConfig)
  );
};

export const shakeAnimation = () => {
  return withSequence(
    withTiming(-10, { duration: 50 }),
    withRepeat(withTiming(10, { duration: 50 }), 3, true),
    withTiming(0, { duration: 50 })
  );
};

export const pulseAnimation = (duration: number = 1000) => {
  return withRepeat(
    withSequence(
      withTiming(1.05, { duration: duration / 2, easing: Easing.ease }),
      withTiming(1, { duration: duration / 2, easing: Easing.ease })
    ),
    -1,
    false
  );
};

// Stagger animation helper
export const staggerAnimation = (index: number, delay: number = 50) => {
  return withDelay(index * delay, withSpring(1, springConfig));
};

// Number counter animation
export const animateNumber = (
  from: number,
  to: number,
  duration: number = 1000
) => {
  return withTiming(to, {
    duration,
    easing: Easing.out(Easing.cubic),
  });
};

// Chart line drawing animation
export const drawLineAnimation = (duration: number = 1000) => {
  return withTiming(1, {
    duration,
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
};

// Shimmer animation for skeleton loaders
export const shimmerAnimation = () => {
  return withRepeat(
    withTiming(1, { duration: 1500, easing: Easing.ease }),
    -1,
    false
  );
};

// Tab indicator animation
export const tabIndicatorAnimation = (toValue: number, duration: number = 300) => {
  return withTiming(toValue, {
    duration,
    easing: Easing.bezier(0.4, 0.0, 0.2, 1),
  });
};

// Pull to refresh animation
export const pullToRefreshAnimation = (progress: number) => {
  return withSpring(progress, {
    damping: 15,
    stiffness: 150,
  });
};

// Success checkmark animation
export const successAnimation = () => {
  return withSequence(
    withTiming(0, { duration: 0 }),
    withDelay(100, withSpring(1, bounceConfig))
  );
};

// Entrance animations
export const entranceAnimations = {
  fadeInUp: (delay: number = 0) => ({
    opacity: withDelay(delay, fadeIn()),
    transform: [{ translateY: withDelay(delay, slideInUp(30)) }],
  }),
  fadeInDown: (delay: number = 0) => ({
    opacity: withDelay(delay, fadeIn()),
    transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 300 })) }],
  }),
  fadeInLeft: (delay: number = 0) => ({
    opacity: withDelay(delay, fadeIn()),
    transform: [{ translateX: withDelay(delay, withTiming(0, { duration: 300 })) }],
  }),
  fadeInRight: (delay: number = 0) => ({
    opacity: withDelay(delay, fadeIn()),
    transform: [{ translateX: withDelay(delay, withTiming(0, { duration: 300 })) }],
  }),
  scaleUp: (delay: number = 0) => ({
    opacity: withDelay(delay, fadeIn()),
    transform: [{ scale: withDelay(delay, scaleIn()) }],
  }),
};
