/** Shared zone color definitions for scheduling UI.
 *  BOH colors match Positional Excellence (PositionalRatings.tsx).
 *  FOH retains the existing scheduling blue. */

/** Primary zone accent colors — used for dots, borders, tinted backgrounds.
 *  Matches SchedulingPositionsTab.tsx settings colors. */
export const ZONE_COLORS: Record<string, string> = {
  BOH: '#ffcc5b',
  FOH: '#006391',
};

/** Text colors for zone badges.
 *  Matches PositionalRatings.tsx AreaPill unselected state (color = baseColor). */
export const ZONE_TEXT_COLORS: Record<string, string> = {
  BOH: '#ffcc5b',
  FOH: '#006391',
};

/** Light tint backgrounds for zone badges. Matches settings page. */
export const ZONE_BG_COLORS: Record<string, string> = {
  BOH: '#fffcf0',
  FOH: '#eaf9ff',
};
