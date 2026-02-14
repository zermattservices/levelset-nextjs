/**
 * Levelset Design Tokens — Colors
 *
 * Semantic color palette extracted from plasmic-tokens.theo.json.
 * Each group has: base, border, foreground, soft, softForeground.
 *
 * CSS variable naming: --ls-color-{group}-{variant}
 */

// ---------------------------------------------------------------------------
// Color Groups (semantic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Basic / Utility Colors
// ---------------------------------------------------------------------------

export const basic = {
  textPrimary: "#181D27",
  textSecondary: "#414651",
  border: "#D1D5DB",
  containerBg: "#FFFFFF",
  inputBg: "#E5E7EB",
  overlayBg: "#0A0A0A80",
  ring: "#9CA3AF",
} as const;

// ---------------------------------------------------------------------------
// Interaction Colors
// ---------------------------------------------------------------------------

export const interaction = {
  focusRing: "#31664A40",
  hoverOverlay: "#31664A0A",
  activeOverlay: "#31664A14",
  selectedBg: "#DBEAFE",
  disabledText: "#9CA3AF",
  disabledBg: "#F3F4F6",
} as const;

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const colors = {
  brand,
  destructive,
  success,
  warning,
  muted,
  neutral,
  basic,
  interaction,
} as const;

export type ColorGroup = typeof brand;
export type Colors = typeof colors;
