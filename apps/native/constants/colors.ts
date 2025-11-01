export const colors = {
  dark: {
    background: '#0A0E27',
    surface: '#151B3D',
    surfaceLight: '#1E2749',
    primary: '#5B7FFF',
    primaryLight: '#7A97FF',
    secondary: '#00D4AA',
    danger: '#FF5370',
    warning: '#FFB547',
    text: '#FFFFFF',
    textSecondary: '#8A92B2',
    textTertiary: '#5A6180',
    success: '#00E676',
    divider: '#252D51',
    chartGrid: '#1A2140',
    backdrop: 'rgba(10, 14, 39, 0.8)',
  },
  light: {
    background: '#F8F9FE',
    surface: '#FFFFFF',
    surfaceLight: '#F3F4F8',
    primary: '#5B7FFF',
    primaryLight: '#7A97FF',
    secondary: '#00D4AA',
    danger: '#FF5370',
    warning: '#FFB547',
    text: '#0A0E27',
    textSecondary: '#5A6180',
    textTertiary: '#8A92B2',
    success: '#00C853',
    divider: '#E8EAF0',
    chartGrid: '#F0F1F5',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

export type ColorScheme = keyof typeof colors;
export type ThemeColors = typeof colors.dark;
