/** Shared zone color definitions for scheduling UI.
 *  BOH colors match Positional Excellence (PositionalRatings.tsx).
 *  FOH retains the existing scheduling blue. */

/** Primary zone accent colors — used for dots, borders, tinted backgrounds. */
export const ZONE_COLORS: Record<string, string> = {
  BOH: '#ffcc5b',
  FOH: '#3b82f6',
};

/** Text colors for zone badges.
 *  Yellow (#ffcc5b) has poor contrast on light backgrounds, so BOH uses dark brown.
 *  This matches the Positional Excellence pattern (#92400e). */
export const ZONE_TEXT_COLORS: Record<string, string> = {
  BOH: '#92400e',
  FOH: '#3b82f6',
};

/** Light tint backgrounds for zone badges (~12% opacity equivalents). */
export const ZONE_BG_COLORS: Record<string, string> = {
  BOH: '#ffcc5b20',
  FOH: '#3b82f620',
};
