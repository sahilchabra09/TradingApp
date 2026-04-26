/**
 * React Navigation theme colours.
 *
 * These are consumed by the <ThemeProvider> in _layout.tsx.
 * Aligned with the Obsidian (dark) and Ivory (light) palettes from theme.ts.
 */
export const NAV_THEME = {
  light: {
    background: 'hsl(40 14% 97%)',     // #FAFAF8
    border: 'hsl(40 8% 90%)',           // light warm gray border
    card: 'hsl(40 14% 97%)',            // same as bg
    notification: 'hsl(0 100% 61%)',    // error red
    primary: 'hsl(38 78% 34%)',         // #996515 — bronze gold
    text: 'hsl(0 0% 11%)',              // #1C1C1E
  },
  dark: {
    background: 'hsl(240 11% 4%)',      // #0A0A0C
    border: 'hsl(240 6% 13%)',          // subtle border
    card: 'hsl(240 11% 4%)',            // same as bg
    notification: 'hsl(0 100% 61%)',    // error red
    primary: 'hsl(41 46% 52%)',         // #C9A962 — champagne gold
    text: 'hsl(0 0% 96%)',              // #F5F5F7
  },
};
