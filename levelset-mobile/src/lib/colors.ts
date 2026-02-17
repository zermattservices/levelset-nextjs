/**
 * Levelset Color Palette
 * Light and dark mode design system
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

// ─── Light Palette ──────────────────────────────────────────────────────

export const lightColors = {
  // Primary - Levelset green
  primary: brand.base, // #31664A
  primaryHover: brand.hover, // #264D38
  primaryContainer: "#d1fae5",
  onPrimaryContainer: "#065f46",

  // Background tones
  background: "#f2f5f4",
  surface: basic.containerBg, // #FFFFFF
  surfaceVariant: neutral.foreground, // #F9FAFB
  surfaceDisabled: neutral.soft, // #E5E7EB

  // Text colors
  onPrimary: "#ffffff",
  onBackground: neutral.softForeground, // #111827
  onSurface: neutral.softForeground, // #111827
  onSurfaceVariant: "#4b5563",
  onSurfaceDisabled: interaction.disabledText, // #9CA3AF

  // Status colors
  success: "#10B981",
  successContainer: "#d1fae5",
  warning: "#F59E0B",
  warningContainer: "#fef3c7",
  error: "#EF4444",
  errorContainer: "#fee2e2",
  info: "#3B82F6",
  infoContainer: "#dbeafe",

  // Border colors
  outline: muted.border, // #E5E7EB
  outlineVariant: basic.border, // #D1D5DB

  // Glass effect colors
  glassBackground: glass.background,
  glassBorder: glass.border,
  glassTint: glass.tint,
  glassTintLight: glass.tintLight,

  // Scrim (modal/menu backdrop overlay)
  scrim: "rgba(0, 0, 0, 0.4)",

  // Transparent variations
  primaryTransparent: glass.primaryTransparent,
  blackTransparent: glass.blackTransparent,
  whiteTransparent: glass.whiteTransparent,

  // Status transparent backgrounds
  warningTransparent: "rgba(245, 158, 11, 0.12)",
  errorTransparent: "rgba(239, 68, 68, 0.12)",
  infoTransparent: "rgba(59, 130, 246, 0.12)",
  successTransparent: "rgba(16, 185, 129, 0.12)",
  mutedTransparent: "rgba(107, 114, 128, 0.1)",

  // Overlay
  overlay: basic.overlayBg, // rgba(10, 10, 10, 0.5)
} as const;

// ─── Dark Palette ───────────────────────────────────────────────────────

export const darkColors = {
  // Primary - Levelset green (works well on dark)
  primary: "#3d8060",
  primaryHover: "#2d6048",
  primaryContainer: "#0d2d1a",
  onPrimaryContainer: "#4ade80",

  // Background tones (dark hierarchy)
  background: "#0d1117",
  surface: "#161b22",
  surfaceVariant: "#21262d",
  surfaceDisabled: "#30363d",

  // Text colors (light on dark)
  onPrimary: "#ffffff",
  onBackground: "#e6edf3",
  onSurface: "#e6edf3",
  onSurfaceVariant: "#8b949e",
  onSurfaceDisabled: "#484f58",

  // Status colors (brighter for dark bg contrast)
  success: "#3fb950",
  successContainer: "#0d2d1a",
  warning: "#d29922",
  warningContainer: "#2d1a00",
  error: "#f85149",
  errorContainer: "#2d0d0d",
  info: "#58a6ff",
  infoContainer: "#0d1b2d",

  // Border colors (subtle on dark)
  outline: "#30363d",
  outlineVariant: "#21262d",

  // Glass effect colors (dark glass)
  glassBackground: "rgba(22, 27, 34, 0.85)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassTint: "rgba(61, 128, 96, 0.3)",
  glassTintLight: "rgba(61, 128, 96, 0.18)",

  // Scrim
  scrim: "rgba(0, 0, 0, 0.6)",

  // Transparent variations
  primaryTransparent: "rgba(61, 128, 96, 0.15)",
  blackTransparent: "rgba(0, 0, 0, 0.15)",
  whiteTransparent: "rgba(255, 255, 255, 0.07)",

  // Status transparent backgrounds
  warningTransparent: "rgba(210, 153, 34, 0.18)",
  errorTransparent: "rgba(248, 81, 73, 0.18)",
  infoTransparent: "rgba(88, 166, 255, 0.18)",
  successTransparent: "rgba(63, 185, 80, 0.18)",
  mutedTransparent: "rgba(139, 148, 158, 0.12)",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",
} as const;

// ─── Types ──────────────────────────────────────────────────────────────

export type ColorPalette = { [K in keyof typeof lightColors]: string };
export type ColorKey = keyof typeof lightColors;

// Backward-compat alias (used by non-component code like theme.ts)
export const colors = lightColors;
