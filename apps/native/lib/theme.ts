/**
 * Trading App Theme System
 * Comprehensive design tokens for dark and light themes
 */

export const Colors = {
  // Dark Theme (gradient black → green)
  dark: {
    background: {
      primary: '#050A05',
      secondary: '#001C10',
      tertiary: '#003C24',
      accent: '#00D35A',
      gradient: ['#050A05', '#001C10', '#003C24', '#00D35A'],
    },
    surface: {
      primary: 'rgba(0, 0, 0, 0.4)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      elevated: 'rgba(0, 28, 16, 0.8)',
      glass: 'rgba(0, 211, 90, 0.08)',
    },
    text: {
      primary: '#E6F8EA',
      secondary: '#A8D5B3',
      tertiary: '#6B9175',
      disabled: '#4A5F4E',
      inverse: '#0F1724',
    },
    accent: {
      primary: '#00D35A',
      secondary: '#00FF6B',
      tertiary: '#00A347',
      glow: 'rgba(0, 211, 90, 0.3)',
    },
    success: '#00D35A',
    error: '#FF3B30',
    warning: '#FFD60A',
    info: '#0A84FF',
    chart: {
      bullish: '#00D35A',
      bearish: '#FF3B30',
      neutral: '#8E8E93',
      grid: 'rgba(230, 248, 234, 0.1)',
    },
  },
  
  // Light Theme (lux white → mint green)
  light: {
    background: {
      primary: '#FFFFFF',
      secondary: '#E9FFF1',
      tertiary: '#B9FFD2',
      accent: '#00D35A',
      gradient: ['#FFFFFF', '#E9FFF1', '#B9FFD2'],
    },
    surface: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(233, 255, 241, 0.8)',
      elevated: 'rgba(185, 255, 210, 0.6)',
      glass: 'rgba(0, 211, 90, 0.05)',
    },
    text: {
      primary: '#0F1724',
      secondary: '#3A4556',
      tertiary: '#6B7684',
      disabled: '#A8ADB7',
      inverse: '#FFFFFF',
    },
    accent: {
      primary: '#00D35A',
      secondary: '#00A347',
      tertiary: '#007A35',
      glow: 'rgba(0, 211, 90, 0.2)',
    },
    success: '#00D35A',
    error: '#FF3B30',
    warning: '#FF9500',
    info: '#007AFF',
    chart: {
      bullish: '#00D35A',
      bearish: '#FF3B30',
      neutral: '#8E8E93',
      grid: 'rgba(15, 23, 36, 0.08)',
    },
  },
};

export const Typography = {
  fonts: {
    ui: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semibold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    },
    mono: {
      regular: 'RobotoMono-Regular',
      medium: 'RobotoMono-Medium',
      bold: 'RobotoMono-Bold',
    },
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeights: {
    xs: 16,
    sm: 18,
    base: 22,
    lg: 24,
    xl: 28,
    '2xl': 32,
    '3xl': 38,
    '4xl': 44,
    '5xl': 56,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  glow: (color: string = '#00D35A') => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  }),
};

export const Animations = {
  duration: {
    fastest: 80,
    fast: 160,
    normal: 240,
    slow: 360,
    slowest: 480,
  },
  easing: {
    // cubic-bezier(0.2, 0.9, 0.2, 1)
    default: [0.2, 0.9, 0.2, 1],
    // Common easing curves
    easeIn: [0.4, 0.0, 1, 1],
    easeOut: [0.0, 0.0, 0.2, 1],
    easeInOut: [0.4, 0.0, 0.2, 1],
  },
  shimmer: {
    duration: 1200,
  },
};

export const Layout = {
  screen: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  card: {
    padding: Spacing.base,
    borderRadius: Radius.base,
  },
  button: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.base,
    minHeight: 48,
  },
  input: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.base,
    height: 52,
  },
  fab: {
    size: 56,
    borderRadius: Radius.full,
  },
};

export type ThemeType = 'light' | 'dark';

export interface Theme {
  colors: typeof Colors.light;
  typography: typeof Typography;
  spacing: typeof Spacing;
  radius: typeof Radius;
  shadows: typeof Shadows;
  animations: typeof Animations;
  layout: typeof Layout;
  isDark: boolean;
}

export const createTheme = (type: ThemeType): Theme => ({
  colors: Colors[type],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadows: Shadows,
  animations: Animations,
  layout: Layout,
  isDark: type === 'dark',
});

export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Helper function to get gradient colors
export const getGradientColors = (theme: Theme): string[] => {
  return theme.colors.background.gradient;
};

// Helper function for reduced motion
export const getAnimationDuration = (
  duration: keyof typeof Animations.duration,
  respectMotion: boolean = true
): number => {
  if (respectMotion) {
    // Check if reduced motion is enabled - in a real app, use AccessibilityInfo
    // For now, return 0 for instant transitions
    // return 0;
  }
  return Animations.duration[duration];
};
