/**
 * Levelset Design Tokens — Native Colors
 *
 * Raw hex values for React Native (no CSS var() references).
 * Use these in StyleSheet.create() and inline styles.
 *
 * Usage:
 *   import { colors } from '@levelset/design-tokens/native/colors';
 *   const styles = StyleSheet.create({
 *     container: { backgroundColor: colors.brand.base },
 *   });
 */

export const brand = {
  base: "#31664A",
  hover: "#264D38",
  border: "#458461",
  foreground: "#EFF6FF",
  soft: "#DBEAFE",
  softForeground: "#1E3A8A",
} as const;

export const destructive = {
  base: "#D23230",
  border: "#E64F4D",
  foreground: "#FEF2F2",
  soft: "#F7ABAA",
  softForeground: "#7F1D1D",
} as const;

export const success = {
  base: "#16A34A",
  border: "#86EFAC",
  foreground: "#F0FDF4",
  soft: "#DCFCE7",
  softForeground: "#14532D",
} as const;

export const warning = {
  base: "#FACC15",
  border: "#FDE047",
  foreground: "#422006",
  soft: "#FEF9C3",
  softForeground: "#713F12",
} as const;

export const muted = {
  base: "#6B7280",
  border: "#E5E7EB",
  foreground: "#E5E7EB",
  soft: "#F3F4F6",
  softForeground: "#6B7280",
} as const;

export const neutral = {
  base: "#374151",
  border: "#D1D5DB",
  foreground: "#F9FAFB",
  soft: "#E5E7EB",
  softForeground: "#111827",
} as const;

export const basic = {
  textPrimary: "#181D27",
  textSecondary: "#414651",
  border: "#D1D5DB",
  containerBg: "#FFFFFF",
  inputBg: "#E5E7EB",
  overlayBg: "rgba(10, 10, 10, 0.5)",
  ring: "#9CA3AF",
} as const;

export const interaction = {
  focusRing: "rgba(49, 102, 74, 0.25)",
  hoverOverlay: "rgba(49, 102, 74, 0.04)",
  activeOverlay: "rgba(49, 102, 74, 0.08)",
  selectedBg: "#DBEAFE",
  disabledText: "#9CA3AF",
  disabledBg: "#F3F4F6",
} as const;

/**
 * Glass-morphism colors for the mobile app's liquid glass UI.
 * These are mobile-only and not part of the shared web token set.
 */
export const glass = {
  background: "rgba(255, 255, 255, 0.8)",
  border: "rgba(0, 0, 0, 0.08)",
  tint: "rgba(49, 102, 74, 0.25)",
  tintLight: "rgba(49, 102, 74, 0.15)",
  primaryTransparent: "rgba(49, 102, 74, 0.1)",
  blackTransparent: "rgba(0, 0, 0, 0.05)",
  whiteTransparent: "rgba(255, 255, 255, 0.9)",
} as const;

export const colors = {
  brand,
  destructive,
  success,
  warning,
  muted,
  neutral,
  basic,
  interaction,
  glass,
} as const;
