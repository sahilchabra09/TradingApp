/**
 * Trading App Design System
 *
 * Premium theme system with three distinct palettes:
 *   - Obsidian  (default dark):  Deep black with champagne-gold accents
 *   - Ivory     (light):         Warm off-white with bronze-gold accents
 *   - Midnight  (dark blue):     Deep navy with ice-blue accents
 *
 * Every colour, spacing, radius, shadow, and typographic token lives here.
 * Screens and components should ONLY reference tokens exported from this file
 * via the `useAppTheme()` hook (see ThemeContext.tsx).
 */

// ─── Theme identifiers ───────────────────────────────────────────────────────

export type ThemeName = 'obsidian' | 'ivory' | 'midnight';

// ─── Color palettes ──────────────────────────────────────────────────────────

const obsidianColors = {
  background: {
    primary: '#0A0A0C',
    secondary: '#121216',
    tertiary: '#1A1A21',
    gradient: ['#0A0A0C', '#0F0F14', '#0A0A0C'] as string[],
  },
  surface: {
    primary: 'rgba(255, 255, 255, 0.04)',
    secondary: 'rgba(255, 255, 255, 0.07)',
    elevated: 'rgba(255, 255, 255, 0.10)',
    glass: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#8E8E93',
    tertiary: '#636366',
    disabled: '#48484A',
    inverse: '#1C1C1E',
  },
  accent: {
    primary: '#C9A962',
    secondary: '#D4B978',
    tertiary: '#A88B4A',
    glow: 'rgba(201, 169, 98, 0.25)',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.12)',
    accent: 'rgba(201, 169, 98, 0.25)',
  },
  success: '#34C759',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#0A84FF',
  chart: {
    bullish: '#34C759',
    bearish: '#FF453A',
    neutral: '#8E8E93',
    grid: 'rgba(245, 245, 247, 0.06)',
  },
} as const;

const ivoryColors = {
  background: {
    primary: '#FAFAF8',
    secondary: '#F2F1EE',
    tertiary: '#EAEAE6',
    gradient: ['#FAFAF8', '#F5F4F0', '#FAFAF8'] as string[],
  },
  surface: {
    primary: 'rgba(0, 0, 0, 0.025)',
    secondary: 'rgba(0, 0, 0, 0.045)',
    elevated: 'rgba(0, 0, 0, 0.07)',
    glass: 'rgba(0, 0, 0, 0.015)',
  },
  text: {
    primary: '#1C1C1E',
    secondary: '#636366',
    tertiary: '#8E8E93',
    disabled: '#C7C7CC',
    inverse: '#F5F5F7',
  },
  accent: {
    primary: '#996515',
    secondary: '#B87D1E',
    tertiary: '#7D5211',
    glow: 'rgba(153, 101, 21, 0.15)',
  },
  border: {
    primary: 'rgba(0, 0, 0, 0.06)',
    secondary: 'rgba(0, 0, 0, 0.10)',
    accent: 'rgba(153, 101, 21, 0.20)',
  },
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  chart: {
    bullish: '#34C759',
    bearish: '#FF3B30',
    neutral: '#8E8E93',
    grid: 'rgba(28, 28, 30, 0.06)',
  },
} as const;

const midnightColors = {
  background: {
    primary: '#080C14',
    secondary: '#0F1520',
    tertiary: '#161E2E',
    gradient: ['#080C14', '#0D1320', '#080C14'] as string[],
  },
  surface: {
    primary: 'rgba(100, 160, 255, 0.04)',
    secondary: 'rgba(100, 160, 255, 0.07)',
    elevated: 'rgba(100, 160, 255, 0.10)',
    glass: 'rgba(100, 160, 255, 0.025)',
  },
  text: {
    primary: '#E8ECF4',
    secondary: '#8892A4',
    tertiary: '#5A6478',
    disabled: '#3A4256',
    inverse: '#0A0E16',
  },
  accent: {
    primary: '#64A0FF',
    secondary: '#8AB8FF',
    tertiary: '#4A88E8',
    glow: 'rgba(100, 160, 255, 0.25)',
  },
  border: {
    primary: 'rgba(100, 160, 255, 0.08)',
    secondary: 'rgba(100, 160, 255, 0.14)',
    accent: 'rgba(100, 160, 255, 0.25)',
  },
  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',
  info: '#64D2FF',
  chart: {
    bullish: '#30D158',
    bearish: '#FF453A',
    neutral: '#8892A4',
    grid: 'rgba(232, 236, 244, 0.06)',
  },
} as const;

// Map for quick look-up
export const ThemeColors = {
  obsidian: obsidianColors,
  ivory: ivoryColors,
  midnight: midnightColors,
} as const;

export type ThemeColorSet =
  | typeof obsidianColors
  | typeof ivoryColors
  | typeof midnightColors;

// ─── Tab bar tokens ──────────────────────────────────────────────────────────
// Centralised so the custom tab bar component never needs hardcoded colours.

export const TabBarTokens = {
  obsidian: {
    // Legacy (kept for compat)
    background: 'rgba(16, 16, 20, 0.82)',
    backgroundGradient: ['rgba(22, 22, 28, 0.85)', 'rgba(10, 10, 14, 0.90)'] as string[],
    border: 'rgba(255, 255, 255, 0.08)',
    activeGlow: 'rgba(201, 169, 98, 0.35)',
    // Liquid glass
    /** 3-stop gradient for the 1px specular border edge (bright rim at top, fades down) */
    specularborderGradient: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)'] as string[],
    /** Semi-transparent tint layered over the blur — provides glass depth */
    glassTintGradient: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as string[],
    /** Top inner specular line (the lit rim just inside the border) */
    innerHighlight: 'rgba(255, 255, 255, 0.18)',
    shadow: '#000000',
    activeIcon: '#C9A962',
    inactiveIcon: '#555558',
    /** Active tab pill */
    pillBackground: 'rgba(201, 169, 98, 0.16)',
    pillBorder: 'rgba(201, 169, 98, 0.38)',
    pillHighlight: 'rgba(255, 255, 255, 0.30)',
    centerButton: {
      gradient: ['#D4B978', '#A88B4A'] as string[],
      shadow: 'rgba(201, 169, 98, 0.50)',
      icon: '#0A0A0C',
    },
  },
  ivory: {
    // Legacy
    background: 'rgba(250, 250, 248, 0.92)',
    backgroundGradient: ['rgba(255, 255, 253, 0.96)', 'rgba(240, 239, 236, 0.96)'] as string[],
    border: 'rgba(0, 0, 0, 0.06)',
    activeGlow: 'rgba(153, 101, 21, 0.20)',
    // Liquid glass
    specularborderGradient: ['rgba(255,255,255,0.88)', 'rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)'] as string[],
    glassTintGradient: ['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.32)'] as string[],
    innerHighlight: 'rgba(255, 255, 255, 0.95)',
    shadow: 'rgba(0, 0, 0, 0.12)',
    activeIcon: '#996515',
    inactiveIcon: '#B0B0B5',
    pillBackground: 'rgba(153, 101, 21, 0.11)',
    pillBorder: 'rgba(153, 101, 21, 0.26)',
    pillHighlight: 'rgba(255, 255, 255, 0.95)',
    centerButton: {
      gradient: ['#B07820', '#7D5211'] as string[],
      shadow: 'rgba(153, 101, 21, 0.38)',
      icon: '#FAFAF8',
    },
  },
  midnight: {
    // Legacy
    background: 'rgba(12, 16, 26, 0.85)',
    backgroundGradient: ['rgba(18, 24, 38, 0.90)', 'rgba(8, 12, 20, 0.95)'] as string[],
    border: 'rgba(100, 160, 255, 0.08)',
    activeGlow: 'rgba(100, 160, 255, 0.35)',
    // Liquid glass
    specularborderGradient: ['rgba(100,160,255,0.28)', 'rgba(100,160,255,0.09)', 'rgba(100,160,255,0.02)'] as string[],
    glassTintGradient: ['rgba(100,160,255,0.07)', 'rgba(100,160,255,0.02)'] as string[],
    innerHighlight: 'rgba(130, 180, 255, 0.22)',
    shadow: '#000000',
    activeIcon: '#64A0FF',
    inactiveIcon: '#3A4256',
    pillBackground: 'rgba(100, 160, 255, 0.16)',
    pillBorder: 'rgba(100, 160, 255, 0.38)',
    pillHighlight: 'rgba(160, 200, 255, 0.38)',
    centerButton: {
      gradient: ['#74AAFF', '#4A88E8'] as string[],
      shadow: 'rgba(100, 160, 255, 0.50)',
      icon: '#080C14',
    },
  },
} as const;

export type TabBarTokenSet = (typeof TabBarTokens)[ThemeName];

// ─── Typography ──────────────────────────────────────────────────────────────
// Using system fonts for maximum reliability + clean fintech feel.

export const Typography = {
  fonts: {
    display: {
      regular: undefined, // system default — SF Pro Display on iOS
      medium: undefined,
      semibold: undefined,
      bold: undefined,
    },
    body: {
      regular: undefined,
      medium: undefined,
      semibold: undefined,
      bold: undefined,
    },
    mono: {
      regular: 'SpaceMono-Regular',
      medium: 'RobotoMono-Medium',
      bold: 'RobotoMono-Bold',
    },
  },
  sizes: {
    '2xs': 10,
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
    '2xs': 14,
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
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.0,
    widest: 1.5,
  },
};

// ─── Spacing scale ───────────────────────────────────────────────────────────

export const Spacing = {
  '2xs': 2,
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

// ─── Border radii ────────────────────────────────────────────────────────────

export const Radius = {
  xs: 4,
  sm: 6,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  pill: 9999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.20,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 16,
  },
  /** Accent-coloured glow — pass any colour string */
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// ─── Animation tokens ────────────────────────────────────────────────────────

export const Animations = {
  duration: {
    fastest: 80,
    fast: 150,
    normal: 250,
    slow: 350,
    slowest: 500,
  },
  spring: {
    gentle: { damping: 20, stiffness: 180, mass: 1 },
    snappy: { damping: 15, stiffness: 300, mass: 0.8 },
    bouncy: { damping: 10, stiffness: 200, mass: 1 },
  },
  shimmer: {
    duration: 1200,
  },
};

// ─── Layout presets ──────────────────────────────────────────────────────────

export const Layout = {
  screen: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  card: {
    padding: Spacing.base,
    borderRadius: Radius.lg,
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
    borderRadius: Radius.pill,
  },
  tabBar: {
    height: 64,
    bottomOffset: 24,
    horizontalMargin: 20,
    borderRadius: 35,
    centerButtonSize: 52,
  },
};

// ─── Composed Theme type ─────────────────────────────────────────────────────

export interface Theme {
  name: ThemeName;
  colors: ThemeColorSet;
  tabBar: TabBarTokenSet;
  typography: typeof Typography;
  spacing: typeof Spacing;
  radius: typeof Radius;
  shadows: typeof Shadows;
  animations: typeof Animations;
  layout: typeof Layout;
  isDark: boolean;
}

export const createTheme = (name: ThemeName): Theme => ({
  name,
  colors: ThemeColors[name],
  tabBar: TabBarTokens[name],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadows: Shadows,
  animations: Animations,
  layout: Layout,
  isDark: name !== 'ivory',
});

// Pre-built theme instances
export const obsidianTheme = createTheme('obsidian');
export const ivoryTheme = createTheme('ivory');
export const midnightTheme = createTheme('midnight');

// All available themes (for the theme picker UI)
export const ALL_THEMES: { name: ThemeName; label: string; description: string }[] = [
  { name: 'obsidian', label: 'Obsidian', description: 'Deep black with warm gold accents' },
  { name: 'ivory', label: 'Ivory', description: 'Warm off-white with bronze tones' },
  { name: 'midnight', label: 'Midnight', description: 'Deep navy with ice-blue accents' },
];

// ─── Backward-compat aliases (keep old imports working during migration) ─────

/** @deprecated Use ThemeColors.obsidian / ThemeColors.ivory instead */
export const Colors = {
  dark: obsidianColors,
  light: ivoryColors,
};

/** @deprecated Use createTheme('obsidian') instead */
export const darkTheme = obsidianTheme;

/** @deprecated Use createTheme('ivory') instead */
export const lightTheme = ivoryTheme;

export type ThemeType = 'light' | 'dark';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const getGradientColors = (theme: Theme): string[] =>
  theme.colors.background.gradient;
