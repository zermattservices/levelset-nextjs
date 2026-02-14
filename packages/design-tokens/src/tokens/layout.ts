/**
 * Levelset Design Tokens — Layout
 *
 * Max widths, border radii, and breakpoints for responsive layout.
 *
 * CSS variable naming:
 *   --ls-max-content-width
 *   --ls-radius-{name}
 *   --ls-breakpoint-{name}
 */

// ---------------------------------------------------------------------------
// Max Widths
// ---------------------------------------------------------------------------

export const maxWidth = {
  content: "1200px",
  narrow: "768px",
  wide: "1440px",
} as const;

// ---------------------------------------------------------------------------
// Border Radii
// ---------------------------------------------------------------------------

export const borderRadius = {
  none: "0px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  "2xl": "16px",
  full: "9999px",
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (min-width)
// ---------------------------------------------------------------------------

export const breakpoint = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const zIndex = {
  dropdown: "1000",
  sticky: "1020",
  overlay: "1040",
  modal: "1060",
  popover: "1070",
  toast: "1080",
  tooltip: "1090",
} as const;

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const layout = {
  maxWidth,
  borderRadius,
  breakpoint,
  zIndex,
} as const;

export type Layout = typeof layout;
