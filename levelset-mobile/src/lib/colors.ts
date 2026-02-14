/**
 * Levelset Color Palette
 * Light mode design system
 *
 * Imports shared design tokens from @levelset/design-tokens via relative path
 * (levelset-mobile is outside the pnpm workspace).
 *
 * Only values with exact hex matches are mapped to shared tokens.
 * Hardcoded values have TODO comments where shared tokens should be added.
 */

import {
  brand,
  muted,
  neutral,
  basic,
  interaction,
  glass,
} from "../../../packages/design-tokens/src/native/colors";

export const colors = {
  // Primary - Levelset green
  primary: brand.base, // #31664A - exact match
  primaryHover: brand.hover, // #264D38 - exact match
  primaryContainer: "#d1fae5", // TODO: Add to shared tokens
  onPrimaryContainer: "#065f46", // TODO: Add to shared tokens

  // Background tones (light palette)
  background: "#f2f5f4", // TODO: Add to shared tokens
  surface: basic.containerBg, // #FFFFFF - exact match
  surfaceVariant: neutral.foreground, // #F9FAFB - exact match
  surfaceDisabled: neutral.soft, // #E5E7EB - exact match

  // Text colors
  onPrimary: "#ffffff", // Semantically distinct from containerBg
  onBackground: neutral.softForeground, // #111827 - exact match
  onSurface: neutral.softForeground, // #111827 - exact match
  onSurfaceVariant: "#4b5563", // Different from muted.base (#6B7280) - keep local
  onSurfaceDisabled: interaction.disabledText, // #9CA3AF - exact match

  // Status colors - shared tokens use different values, keep local
  success: "#10B981",
  successContainer: "#d1fae5",
  warning: "#F59E0B",
  warningContainer: "#fef3c7",
  error: "#EF4444",
  errorContainer: "#fee2e2",
  info: "#3B82F6",
  infoContainer: "#dbeafe",

  // Border colors
  outline: muted.border, // #E5E7EB - exact match
  outlineVariant: basic.border, // #D1D5DB - exact match

  // Glass effect colors (light mode) - all exact matches
  glassBackground: glass.background,
  glassBorder: glass.border,
  glassTint: glass.tint,
  glassTintLight: glass.tintLight,

  // Transparent variations - all exact matches
  primaryTransparent: glass.primaryTransparent,
  blackTransparent: glass.blackTransparent,
  whiteTransparent: glass.whiteTransparent,
} as const;

export type ColorKey = keyof typeof colors;
