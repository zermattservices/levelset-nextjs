/**
 * Levelset Theme Configuration
 * Combines colors, typography, and spacing into a unified theme
 */

import { colors } from "./colors";
import { fontFamilies, typography, fontSizes } from "./fonts";

// Border radius standards
export const borderRadius = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Spacing scale
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// Shadow definitions
export const shadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Glass effect styles
export const glassStyles = {
  card: {
    backgroundColor: colors.glassBackground,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  button: {
    backgroundColor: colors.glassTint,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  modal: {
    backgroundColor: colors.glassBackground,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
} as const;

// Complete theme export
export const theme = {
  colors,
  typography,
  fontFamilies,
  fontSizes,
  borderRadius,
  spacing,
  shadows,
  glassStyles,
} as const;

export type Theme = typeof theme;

export default theme;
