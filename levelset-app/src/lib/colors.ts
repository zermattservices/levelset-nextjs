/**
 * Levelset Color Palette
 * Light mode design system
 */

export const colors = {
  // Primary - Levelset green
  primary: "#31664a",
  primaryHover: "#264d38",
  primaryContainer: "#d1fae5",
  onPrimaryContainer: "#065f46",

  // Background tones (light palette)
  background: "#f2f5f4",
  surface: "#ffffff",
  surfaceVariant: "#f9fafb",
  surfaceDisabled: "#e5e7eb",

  // Text colors
  onPrimary: "#ffffff",
  onBackground: "#111827",
  onSurface: "#111827",
  onSurfaceVariant: "#4b5563",
  onSurfaceDisabled: "#9ca3af",

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
  outline: "#e5e7eb",
  outlineVariant: "#d1d5db",

  // Glass effect colors (light mode)
  glassBackground: "rgba(255, 255, 255, 0.8)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  glassTint: "rgba(49, 102, 74, 0.25)",
  glassTintLight: "rgba(49, 102, 74, 0.15)",

  // Transparent variations
  primaryTransparent: "rgba(49, 102, 74, 0.1)",
  blackTransparent: "rgba(0, 0, 0, 0.05)",
  whiteTransparent: "rgba(255, 255, 255, 0.9)",
} as const;

export type ColorKey = keyof typeof colors;
