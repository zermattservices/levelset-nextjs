/**
 * Levelset Theme Configuration
 * Combines colors, typography, and spacing into a unified theme
 */

import * as Haptics from 'expo-haptics';
import { colors, type ColorPalette } from "./colors";
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

// Shadow definitions (CSS boxShadow format)
export const shadows = {
  none: { boxShadow: "none" },
  sm: { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" },
  md: { boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)" },
  lg: { boxShadow: "0 10px 15px rgba(0, 0, 0, 0.1)" },
} as const;

export function getShadows(isDark: boolean) {
  if (!isDark) return shadows;
  return {
    none: { boxShadow: "none" },
    sm: { boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)" },
    md: { boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)" },
    lg: { boxShadow: "0 10px 15px rgba(0, 0, 0, 0.4)" },
  } as const;
}

// Rounded styles with continuous border curve (iOS squircle)
export const roundedStyles = {
  sm: { borderRadius: 6, borderCurve: 'continuous' as const },
  md: { borderRadius: 12, borderCurve: 'continuous' as const },
  lg: { borderRadius: 16, borderCurve: 'continuous' as const },
  xl: { borderRadius: 20, borderCurve: 'continuous' as const },
} as const;

// Glass effect styles (static, backward-compat)
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

// Dynamic glass styles factory for dark mode support
export function getGlassStyles(c: ColorPalette) {
  return {
    card: {
      backgroundColor: c.glassBackground,
      borderColor: c.glassBorder,
      borderWidth: 1,
      borderRadius: borderRadius.lg,
    },
    button: {
      backgroundColor: c.glassTint,
      borderColor: c.glassBorder,
      borderWidth: 1,
      borderRadius: borderRadius.full,
    },
    modal: {
      backgroundColor: c.glassBackground,
      borderColor: c.glassBorder,
      borderWidth: 1,
      borderRadius: borderRadius.md,
    },
  };
}

// Haptics utilities (iOS only)
export const haptics = {
  light: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },
  medium: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },
  heavy: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },
  success: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  warning: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
  error: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
  selection: () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync();
    }
  },
};

// Complete theme export
export const theme = {
  colors,
  typography,
  fontFamilies,
  fontSizes,
  borderRadius,
  spacing,
  shadows,
  roundedStyles,
  glassStyles,
  haptics,
} as const;

export type Theme = typeof theme;

export default theme;
