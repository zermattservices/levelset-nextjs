/**
 * @levelset/design-tokens
 *
 * Single source of truth for all design values across the Levelset platform.
 * Used by both the dashboard (web) and mobile app (React Native).
 *
 * Web usage:
 *   import { colors, spacing, typography, layout } from '@levelset/design-tokens';
 *   // Or import CSS variables directly:
 *   // import '@levelset/design-tokens/css/variables.css';
 *   // import '@levelset/design-tokens/css/plasmic-compat.css';
 *
 * React Native usage:
 *   import { colors, spacing } from '@levelset/design-tokens/native';
 */

// Token objects (use CSS var() references in web, raw values in native)
export { colors, brand, destructive, success, warning, muted, neutral, basic, interaction } from "./tokens/colors.js";
export { spacing } from "./tokens/spacing.js";
export { typography, fontFamily, fontSize, lineHeight, fontWeight } from "./tokens/typography.js";
export { layout, maxWidth, borderRadius, breakpoint, zIndex } from "./tokens/layout.js";

// Types
export type { Colors, ColorGroup } from "./tokens/colors.js";
export type { Spacing, SpacingKey } from "./tokens/spacing.js";
export type { Typography } from "./tokens/typography.js";
export type { Layout } from "./tokens/layout.js";
