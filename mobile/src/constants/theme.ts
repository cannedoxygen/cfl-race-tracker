// CFL Theme Colors - matching web app

export const COLORS = {
  // Background colors
  bg: '#0d1117',
  card: '#161b22',
  border: '#30363d',

  // Accent colors
  green: '#3fb950',
  teal: '#58a6ff',
  purple: '#a855f7',
  orange: '#f97316',
  gold: '#fbbf24',
  red: '#f85149',
  pink: '#ec4899',
  cyan: '#22d3ee',

  // Text colors
  text: '#ffffff',
  textMuted: '#8b949e',
  textGold: '#fcd34d',

  // Chart line colors
  chartLines: [
    '#3fb950', '#58a6ff', '#a855f7', '#f97316', '#fbbf24',
    '#f85149', '#ec4899', '#22d3ee', '#84cc16', '#fb923c',
    '#e879f9', '#38bdf8', '#facc15', '#4ade80', '#f472b6',
  ],
} as const;

// Font sizes (matching pixel font sizes from web)
export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
} as const;

// Spacing scale
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

// Border radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;
