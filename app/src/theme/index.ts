export const Colors = {
  // Primary palette
  primary: '#1a2b4a',
  primaryLight: '#2d4270',
  primaryDark: '#111111',

  // Accent — liturgical gold
  accent: '#c9a84c',
  accentLight: '#e8c97a',
  accentDark: '#9e7c2e',

  // Backgrounds
  background: '#faf7f3',
  surface: '#ffffff',
  surfaceAlt: '#f0ebe3',

  // Text
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  textInverse: '#ffffff',

  // Semantic
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',

  // Reaction
  heart: '#8b1d2e',

  // UI elements
  border: '#e5e0d8',
  borderLight: '#f0ebe3',
  cardBorder: '#d8d3cb',
  divider: '#e5e7eb',
  overlay: 'rgba(26, 43, 74, 0.6)',

  // Liturgical season accents (optional theming)
  advent: '#4b0082',
  lent: '#6b21a8',
  ordinary: '#15803d',
  easter: '#fbbf24',
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  fontSerif: 'Playfair-Display',
  fontSans: 'Inter',

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// Caps for Dynamic Type scaling. Applied by the project Text/TextInput
// wrapper in components/ui/Text.tsx. Use `tight` for nav chrome and `hero`
// for width-constrained display type — the bigger the design footprint, the
// more headroom the clamp can give before layout breaks.
export const FontScale = {
  default: 1.6,
  tight: 1.15,
  hero: 1.1,
} as const;

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#1a2b4a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1a2b4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1a2b4a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

import { StyleSheet } from 'react-native';

/** Shared card-list container styles for grouped row lists. */
export const CardList = StyleSheet.create({
  item: {
    backgroundColor: '#ffffff',
    marginHorizontal: Spacing[3],
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
  },
  itemFirst: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  itemLast: {
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
