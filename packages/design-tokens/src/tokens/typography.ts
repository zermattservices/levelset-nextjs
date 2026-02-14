/**
 * Levelset Design Tokens — Typography
 *
 * Font families: Satoshi (body/UI), Mont (headings).
 * Font sizes on a modular scale from xs (0.75rem) to 4xl (2.25rem).
 * Line heights and weights for consistent vertical rhythm.
 *
 * CSS variable naming:
 *   --ls-font-body, --ls-font-heading
 *   --ls-font-size-{name}
 *   --ls-line-height-{name}
 *   --ls-font-weight-{name}
 */

// ---------------------------------------------------------------------------
// Font Families
// ---------------------------------------------------------------------------

export const fontFamily = {
  body: "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  heading: "'Mont', 'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
} as const;

// ---------------------------------------------------------------------------
// Font Sizes
// ---------------------------------------------------------------------------

export const fontSize = {
  xs: "0.75rem",     // 12px
  sm: "0.875rem",    // 14px  (antd base font size)
  base: "1rem",      // 16px
  lg: "1.125rem",    // 18px
  xl: "1.25rem",     // 20px
  "2xl": "1.5rem",   // 24px  (antd heading 4)
  "3xl": "1.875rem", // 30px
  "4xl": "2.25rem",  // 36px
} as const;

// ---------------------------------------------------------------------------
// Line Heights
// ---------------------------------------------------------------------------

export const lineHeight = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
  loose: "2",
} as const;

// ---------------------------------------------------------------------------
// Font Weights
// ---------------------------------------------------------------------------

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
} as const;

export type Typography = typeof typography;
