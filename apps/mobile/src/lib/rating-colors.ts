/**
 * Rating color system — synced with the Positional Excellence dashboard.
 *
 * Colors match the PEA RatingCell in PEAClassic.tsx:
 *   green  #249e6b
 *   yellow #ffb549
 *   red    #ad2624
 *
 * Thresholds come from the `rating_thresholds` table (per-location or per-org).
 * Defaults: green >= 2.75, yellow >= 1.75, red >= 1.0
 */

import type { RatingThresholds } from "./api";

// ── Exact dashboard colors ──────────────────────────────────────────────

export const RATING_GREEN = "#249e6b";
export const RATING_YELLOW = "#ffb549";
export const RATING_RED = "#ad2624";

/** Fallback thresholds matching the dashboard defaults */
export const DEFAULT_THRESHOLDS: RatingThresholds = {
  green_threshold: 2.75,
  yellow_threshold: 1.75,
};

// ── Color helpers ───────────────────────────────────────────────────────

/**
 * Returns the dashboard rating color for a given value + thresholds.
 * Matches `getRatingColor` from `lib/rating-thresholds.ts` on the server.
 */
export function getRatingColor(
  value: number | null | undefined,
  thresholds: RatingThresholds = DEFAULT_THRESHOLDS
): string {
  if (value == null) return RATING_GREEN; // neutral fallback
  if (value >= thresholds.green_threshold) return RATING_GREEN;
  if (value >= thresholds.yellow_threshold) return RATING_YELLOW;
  if (value >= 1.0) return RATING_RED;
  return RATING_RED;
}

/**
 * Semantic label version — useful for conditional styling.
 */
export function getRatingLevel(
  value: number | null | undefined,
  thresholds: RatingThresholds = DEFAULT_THRESHOLDS
): "green" | "yellow" | "red" | "none" {
  if (value == null) return "none";
  if (value >= thresholds.green_threshold) return "green";
  if (value >= thresholds.yellow_threshold) return "yellow";
  if (value >= 1.0) return "red";
  return "none";
}
